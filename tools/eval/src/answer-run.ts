// S19: menjalankan pipeline Jawab (`runJawab`, sama dengan Worker surau-api) atas soal eval, dengan
// pagu biaya yang dicek SEBELUM setiap soal. Berbayar: hanya lewat `eval:jawab answer --confirm
// --budget-usd` setelah izin pemilik. Holdout hanya dengan --termasuk-privat (izin + catatan salinan).
import { evalAnswer } from "@surau/core";
import type { EvalAnswer, EvalQuestion } from "@surau/core";
import type { D1Db } from "@surau/db";
import {
  ANSWER_MAX_TOKENS,
  JAWAB_MAX_PROMPT_TOKENS,
  JAWAB_PIPELINE_VERSION,
  MODELS,
  ROUTE_MAX_TOKENS,
  costUsd,
  runJawab,
  stripArabic,
} from "@surau/llm";
import type { JawabResult } from "@surau/llm";
import type Anthropic from "@anthropic-ai/sdk";

/** Teks hasil yang turun ke Cari (ARSITEKTUR-TEKNIS §5 butir 7). */
export const FALLBACK_TEXT = "Surau tidak dapat memverifikasi kutipan untuk pertanyaan ini.";
/** Prompt routing terukur ±11,9 ribu token (daftar isi Ihya, S19). */
const ROUTE_PROMPT_TOKENS = 12_500;

/**
 * Biaya terburuk satu soal: routing (prefix ditulis ke cache 1 jam) + jawaban Haiku pada batas
 * prompt dan keluaran. Ulangan Sonnet (refusal) disisihkan terpisah sebagai cadangan satu kali.
 */
export function questionCeilingUsd(): { haiku: number; sonnetReserve: number } {
  const route = costUsd(
    MODELS.haiku,
    {
      input_tokens: 100,
      cache_creation_input_tokens: ROUTE_PROMPT_TOKENS,
      output_tokens: ROUTE_MAX_TOKENS,
    },
    { batch: false },
  );
  const answer = (model: typeof MODELS.haiku | typeof MODELS.sonnet) =>
    costUsd(
      model,
      { input_tokens: JAWAB_MAX_PROMPT_TOKENS, output_tokens: ANSWER_MAX_TOKENS },
      { batch: false },
    );
  return { haiku: route + answer(MODELS.haiku), sonnetReserve: answer(MODELS.sonnet) };
}

/**
 * Pagu: soal berikutnya hanya dijalankan bila biaya terpakai + biaya terburuk SETIAP soal yang
 * sedang berjalan (termasuk ulangan Sonnet masing-masing) ≤ pagu.
 */
export function canRun(spent: number, inflight: number, budget: number): boolean {
  const c = questionCeilingUsd();
  return spent + (inflight + 1) * (c.haiku + c.sonnetReserve) <= budget;
}

/** Hasil pipeline → kontrak eval S18 (Latin saja, kutipan = pointer DB). */
export function toEvalAnswer(r: JawabResult): EvalAnswer {
  const fallback = r.outcome === "fallback";
  const spans = (fallback ? r.search : r.citations).slice(0, 20).map((c) => ({
    passage_id: c.passage_id,
    char_start: c.char_start,
    char_end: c.char_end,
  }));
  return evalAnswer.parse({
    mode: "answer",
    text: fallback ? FALLBACK_TEXT : stripArabic(r.text).text.slice(0, 20_000),
    refused: r.outcome === "not_found",
    citations: spans,
    hadith: r.hadith
      .slice(0, 5)
      .map((h) => ({ passage_id: h.passage_id, footnote: h.footnote, status: h.status })),
    model: r.model ?? "none",
    // Sama dengan kunci cache Worker: versi pipeline (kandidat + pascaproses, X03) ikut tercatat,
    // supaya arsip dan laporan membedakan kode yang berbeda dengan prompt yang sama.
    prompt_version: `${r.prompt_version}+pipeline@${JAWAB_PIPELINE_VERSION}`,
    latency_ms: r.latency_ms,
    cost_usd: r.cost_usd,
  });
}

export interface RunItem {
  question: EvalQuestion;
  private: boolean;
}
export interface RunOutput {
  item: RunItem;
  result: JawabResult;
  answer: EvalAnswer;
}

/** Jalankan soal dengan `concurrency` paralel; berhenti mengambil soal baru saat pagu tercapai. */
export async function runQuestions(
  db: D1Db,
  client: Anthropic,
  items: readonly RunItem[],
  opts: {
    budgetUsd: number;
    concurrency: number;
    onDone?: (o: RunOutput, spent: number) => void;
    /** Galat non-API (mis. D1 putus) pada satu soal: dicatat, soal lain tetap jalan. */
    onError?: (item: RunItem, error: unknown) => void;
    /** Pengganti `runJawab` (tes). */
    run?: (question: string) => Promise<JawabResult>;
  },
): Promise<{ outputs: RunOutput[]; spent: number; skipped: number; failed: number }> {
  const run = opts.run ?? ((q: string) => runJawab({ corpus: db, anthropic: client }, q));
  const outputs: RunOutput[] = [];
  let spent = 0;
  let inflight = 0;
  let next = 0;
  let failed = 0;
  let stopped = false;
  const waiters: (() => void)[] = [];
  const worker = async () => {
    for (;;) {
      if (stopped || next >= items.length) return;
      if (!canRun(spent, inflight, opts.budgetUsd)) {
        // Masih ada soal berjalan: tunggu salah satunya selesai (cadangannya kembali).
        if (inflight > 0) {
          await new Promise<void>((resolve) => waiters.push(resolve));
          continue;
        }
        stopped = true;
        return;
      }
      const item = items[next++]!;
      inflight++;
      let out: RunOutput | null = null;
      try {
        const result = await run(item.question.pertanyaan);
        spent += result.cost_usd;
        out = { item, result, answer: toEvalAnswer(result) };
        outputs.push(out);
      } catch (error) {
        // Soal yang gagal di tengah bisa sudah memakai panggilan berbayar yang biayanya tidak
        // diketahui di sini: dihitung biaya terburuknya supaya pagu izin tidak terlampaui.
        const c = questionCeilingUsd();
        spent += c.haiku + c.sonnetReserve;
        failed++;
        opts.onError?.(item, error);
      } finally {
        inflight--;
        for (const w of waiters.splice(0)) w();
      }
      if (out !== null) opts.onDone?.(out, spent);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, () => worker()));
  return { outputs, spent, skipped: items.length - outputs.length - failed, failed };
}
