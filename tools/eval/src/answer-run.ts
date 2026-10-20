// S19: menjalankan pipeline Jawab (`runJawab`, sama dengan Worker surau-api) atas soal eval, dengan
// pagu biaya yang dicek SEBELUM setiap soal. Berbayar: hanya lewat `eval:jawab answer --confirm
// --budget-usd` setelah izin pemilik. Holdout hanya dengan --termasuk-privat (izin + catatan salinan).
import { evalAnswer } from "@surau/core";
import type { EvalAnswer, EvalQuestion } from "@surau/core";
import type { D1Db } from "@surau/db";
import {
  ANSWER_MAX_TOKENS,
  JAWAB_MAX_PROMPT_TOKENS,
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

/** Pagu: soal berikutnya hanya dijalankan bila biaya terpakai + terburuknya + cadangan ≤ pagu. */
export function canRun(spent: number, inflight: number, budget: number): boolean {
  const c = questionCeilingUsd();
  return spent + (inflight + 1) * c.haiku + c.sonnetReserve <= budget;
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
    prompt_version: r.prompt_version,
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
  opts: { budgetUsd: number; concurrency: number; onDone?: (o: RunOutput, spent: number) => void },
): Promise<{ outputs: RunOutput[]; spent: number; skipped: number }> {
  const outputs: RunOutput[] = [];
  let spent = 0;
  let inflight = 0;
  let next = 0;
  let stopped = false;
  const worker = async () => {
    for (;;) {
      if (stopped || next >= items.length) return;
      if (!canRun(spent, inflight, opts.budgetUsd)) {
        stopped = true;
        return;
      }
      const item = items[next++]!;
      inflight++;
      try {
        const result = await runJawab({ corpus: db, anthropic: client }, item.question.pertanyaan);
        spent += result.cost_usd;
        const out = { item, result, answer: toEvalAnswer(result) };
        outputs.push(out);
        opts.onDone?.(out, spent);
      } finally {
        inflight--;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, () => worker()));
  return { outputs, spent, skipped: items.length - outputs.length };
}
