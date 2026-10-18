// S13 langkah 5: uji kecil lewat Messages API biasa (bukan batch, harga penuh, ±$0,05): 20 paragraf
// (7 berisi ayat) + 5 bagian daun (ringkasan ID dan EN). Hasil mentah + halaman nilai untuk pemilik
// (T-17 tahap 1) di data/build/llm/sample/; angka dipakai `plan` untuk estimasi keluaran batch.
import { join } from "node:path";

import {
  MODELS,
  SUMMARY_PROMPT,
  TRANSLATE_PROMPT,
  buildSummaryRequest,
  buildTranslateRequest,
  checkSummary,
  checkTranslation,
  contentLength,
  costUsd,
  messageText,
  passageCustomId,
  stopProblem,
  tocCustomId,
} from "@surau/llm";
import type { SummaryLang } from "@surau/llm";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";

import { samplePages } from "../qa-sample.ts";
import type { LlmContext } from "./cli.ts";
import { mapPool } from "./pool.ts";
import { SITE } from "./report.ts";
import { kemenagLookup, reviewHtml } from "./review.ts";
import type { ReviewItem } from "./review.ts";
import { llmDir, writeJsonl, writeText } from "./store.ts";
import { MEASURED_TOKENS_PER_CHAR, summaryPlan, translationUnits } from "./units.ts";
import { links } from "./work.ts";

export const SAMPLE_SEED = 9472;
export const SAMPLE_PASSAGES = { withAyah: 7, other: 13 } as const;
export const SAMPLE_SECTIONS = 5;

/** Satu baris hasil uji kecil (data/build/llm/sample/results-<prompt>.jsonl). */
export interface SampleResult {
  custom_id: string;
  kind: "translation" | "summary";
  model: string;
  prompt_version: string;
  stop_reason: string | null;
  text: string;
  problems: string[];
  details: string[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number | null;
    cache_creation_input_tokens: number | null;
  };
  cost_usd: number;
  /** Panjang teks Arab masukan (karakter, tanpa placeholder): dasar rasio keluaran/masukan. */
  source_chars: number;
}

export async function runSample(ctx: LlmContext): Promise<number> {
  const rows = ctx.rows();
  const client = ctx.client();
  const { units } = translationUnits(rows);
  const withAyah = units.filter((u) => u.masked.slots.length > 0);
  const other = units.filter((u) => u.masked.slots.length === 0);
  const pick = <T extends { passageId: number }>(list: T[], n: number, seed: number) => {
    const ids = new Set(
      samplePages(
        list.map((u) => u.passageId),
        n,
        seed,
      ),
    );
    return list.filter((u) => ids.has(u.passageId));
  };
  const passages = [
    ...pick(withAyah, SAMPLE_PASSAGES.withAyah, SAMPLE_SEED),
    ...pick(other, SAMPLE_PASSAGES.other, SAMPLE_SEED + 1),
  ];
  const plan = summaryPlan(rows, { tokensPerChar: MEASURED_TOKENS_PER_CHAR });
  const finals = plan.chunks.filter((c) => c.final);
  const sectionIds = new Set(
    samplePages(
      finals.map((c) => c.tocNodeId),
      SAMPLE_SECTIONS,
      SAMPLE_SEED,
    ),
  );
  const sections = finals.filter((c) => sectionIds.has(c.tocNodeId));

  type Job = {
    id: string;
    kind: SampleResult["kind"];
    params: MessageCreateParamsNonStreaming;
    check: (text: string) => { text: string; problems: string[]; details: string[] };
    sourceChars: number;
  };
  const jobs: Job[] = [
    ...passages.map((u): Job => ({
      id: passageCustomId(u.passageId),
      kind: "translation",
      params: buildTranslateRequest(u),
      check: (t) => {
        const c = checkTranslation(t, u);
        return { text: c.text, problems: c.problems, details: c.details };
      },
      sourceChars: contentLength(u.masked.text),
    })),
    ...sections.flatMap((c) =>
      (["id", "en"] as SummaryLang[]).map((lang): Job => ({
        id: tocCustomId(c.tocNodeId, lang),
        kind: "summary",
        params: buildSummaryRequest({ ...c, lang }),
        check: (t) => ({ text: t, problems: checkSummary(t, lang).problems, details: [] }),
        sourceChars: contentLength(c.text),
      })),
    ),
  ];

  console.info(
    `Uji kecil: ${passages.length} paragraf + ${sections.length} bagian × 2 bahasa (${jobs.length} request, API biasa)`,
  );
  const results = await mapPool(
    jobs,
    4,
    async (job): Promise<SampleResult> => {
      const message = await client.messages.create(job.params);
      const text = messageText(message);
      const stop = stopProblem(message);
      const checked = stop === null ? job.check(text) : { text, problems: [stop], details: [] };
      return {
        custom_id: job.id,
        kind: job.kind,
        model: message.model,
        prompt_version: job.kind === "translation" ? TRANSLATE_PROMPT.id : SUMMARY_PROMPT.id,
        stop_reason: message.stop_reason,
        text: checked.text,
        problems: checked.problems,
        details: checked.details,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          cache_read_input_tokens: message.usage.cache_read_input_tokens,
          cache_creation_input_tokens: message.usage.cache_creation_input_tokens,
        },
        cost_usd: costUsd(MODELS.haiku, message.usage, { batch: false }),
        source_chars: job.sourceChars,
      };
    },
    (done) => process.stdout.write(`\r${done}/${jobs.length}`),
  );
  process.stdout.write("\n");

  const dir = join(llmDir(ctx.repo), "sample");
  writeJsonl(join(dir, `results-${TRANSLATE_PROMPT.id.replace("@", "-v")}.jsonl`), results);

  const link = links(rows);
  const byId = new Map(results.map((r) => [r.custom_id, r]));
  const items: ReviewItem[] = [
    ...passages.map((u, i): ReviewItem => {
      const r = byId.get(passageCustomId(u.passageId));
      const passage = rows.passage.find((p) => p.id === u.passageId);
      return {
        kind: "passage",
        no: i + 1,
        passageId: u.passageId,
        permalink: link.passage(u.passageId),
        heading: u.heading,
        arabic: passage?.text_raw ?? "",
        translation: r?.text ?? "",
        model: r?.model ?? "",
        problems: r?.problems ?? [],
        note: u.masked.slots.length > 0 ? `${u.masked.slots.length} kutipan ayat` : "",
      };
    }),
    ...sections.map((c, i): ReviewItem => {
      const id = byId.get(tocCustomId(c.tocNodeId, "id"));
      const en = byId.get(tocCustomId(c.tocNodeId, "en"));
      return {
        kind: "summary",
        no: passages.length + i + 1,
        tocNodeId: c.tocNodeId,
        permalink: link.section(c.tocNodeId),
        heading: c.heading,
        chars: c.text.length,
        id: id?.text ?? "",
        en: en?.text ?? "",
        problems: [
          ...(id?.problems ?? []).map((p) => `ID ${p}`),
          ...(en?.problems ?? []).map((p) => `EN ${p}`),
        ],
      };
    }),
  ];
  const html = reviewHtml(
    `Uji terjemahan AI (T-17 tahap 1) · ${TRANSLATE_PROMPT.id}`,
    `${passages.length} paragraf acak Ihya (${SAMPLE_PASSAGES.withAyah} berisi ayat) dan ${sections.length} ringkasan bagian, dibuat Claude Haiku 5.5 lewat API biasa. Kotak hijau = terjemahan ayat Kemenag yang disisipkan sistem (bukan buatan AI). Beri nilai tiap nomor: <b>Benar</b>, <b>Kurang</b> (makna benar tapi ada yang janggal/hilang), atau <b>Salah</b> (makna keliru), dengan catatan singkat.`,
    items,
    kemenagLookup(rows.quran_translation),
    SITE,
  );
  const reviewPath = join(dir, `review-${TRANSLATE_PROMPT.id.replace("@", "-v")}.html`);
  writeText(reviewPath, html);

  const tr = results.filter((r) => r.kind === "translation");
  const sm = results.filter((r) => r.kind === "summary");
  const sum = (list: SampleResult[], f: (r: SampleResult) => number) =>
    list.reduce((a, r) => a + f(r), 0);
  console.info(
    `Biaya uji: $${sum(results, (r) => r.cost_usd).toFixed(4)} · ditolak validasi: ${
      results
        .filter((r) => r.problems.length > 0)
        .map((r) => `${r.custom_id} (${r.problems.join(",")})`)
        .join("; ") || "tidak ada"
    }`,
  );
  console.info(
    `Terjemahan: keluaran ${sum(tr, (r) => r.usage.output_tokens)} token untuk ${sum(tr, (r) => r.source_chars)} karakter Arab (${(sum(tr, (r) => r.usage.output_tokens) / sum(tr, (r) => r.source_chars)).toFixed(3)} token/karakter); masukan tanpa cache ${sum(tr, (r) => r.usage.input_tokens)}, baca cache ${sum(tr, (r) => r.usage.cache_read_input_tokens ?? 0)}, tulis cache ${sum(tr, (r) => r.usage.cache_creation_input_tokens ?? 0)}`,
  );
  console.info(
    `Ringkasan: keluaran ${sum(sm, (r) => r.usage.output_tokens)} token (${(sum(sm, (r) => r.usage.output_tokens) / Math.max(1, sm.length)).toFixed(0)}/request)`,
  );
  console.info(`Halaman nilai: ${reviewPath.slice(ctx.repo.length + 1)}`);
  return 0;
}
