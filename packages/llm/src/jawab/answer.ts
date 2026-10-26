// Request jawaban Jawab (S19): prompt `answer@7` (di-cache 1 jam), dokumen custom content
// bercitations (dikelompokkan per bagian, X05), lalu pertanyaan. Aturan ADR-013: effort `low`
// eksplisit, thinking adaptif bawaan, tanpa parameter sampling, tanpa prefill, tanpa
// `output_config.format` (tidak bisa bersama Citations).
import type { MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/messages";
import type { AnswerPassage } from "@surau/core";

import { ANSWER_V7 } from "../../prompts/answer-v7.ts";
import { MODELS } from "../client.ts";
import type { ModelId } from "../client.ts";
import { estimateTextTokens, toDocumentBlock } from "./documents.ts";
import type { AnswerDoc } from "./documents.ts";

export const ANSWER_PROMPT = ANSWER_V7;
/** Ruang thinking (effort low) + jawaban beberapa paragraf. */
export const ANSWER_MAX_TOKENS = 8000;
/** Batas keras prompt Jawab (ADR-013; harga Haiku naik 5× di atas 100k). */
export const JAWAB_MAX_PROMPT_TOKENS = 40_000;
/**
 * Anggaran perkiraan dokumen (S19, eval publik): 20 ribu token + terjemahan AI hanya di 12
 * dokumen teratas memberi cakupan lokasi gold lebih tinggi (29/34) daripada 27 ribu token dengan
 * terjemahan di semua dokumen (28/34), dengan prompt ±22 ribu token (biaya ±US$0,003/jawaban).
 */
export const DOC_BUDGET_TOKENS = 20_000;
/** Dokumen teratas yang membawa terjemahan AI di konteksnya; sisanya teks Arab saja. */
export const TRANSLATED_DOCS = 12;

/** Pertanyaan sebagai data: tanda `<`/`>` dibuang supaya tidak bisa menutup tag pembungkus. */
export function questionData(question: string): string {
  return question.replaceAll(/[<>]/gu, " ");
}

export function answerUserText(question: string): string {
  return `<pertanyaan>${questionData(question)}</pertanyaan>`;
}

/**
 * Perkiraan token prompt di luar dokumen: sistem + pertanyaan + tambahan Citations (terukur
 * ±2.360 token untuk `answer@1` dengan satu pertanyaan pendek, 2026-10-20).
 */
export function fixedPromptTokens(question: string): number {
  return estimateTextTokens(ANSWER_PROMPT.system) + estimateTextTokens(question) + 650;
}

/** Ambil dokumen berurutan selama total perkiraan ≤ anggaran (dokumen pertama selalu ikut). */
export function fitDocs(docs: readonly AnswerDoc[], budget = DOC_BUDGET_TOKENS): AnswerDoc[] {
  const out: AnswerDoc[] = [];
  let used = 0;
  for (const d of docs) {
    if (out.length > 0 && used + d.tokens > budget) continue;
    out.push(d);
    used += d.tokens;
  }
  return out;
}

/** Urutan kitab (ADR-029: tidak pernah dari ID): halaman, badan teks sebelum catatan kaki, `ord`. */
function bookOrder(a: AnswerPassage, b: AnswerPassage): number {
  return (
    a.location.juz - b.location.juz ||
    a.location.page_no - b.location.page_no ||
    Number(a.kind === "foot") - Number(b.kind === "foot") ||
    a.ord - b.ord
  );
}

/**
 * Urutan dokumen di prompt (X05): dikelompokkan per bagian daftar isi, kelompok diurutkan menurut
 * dokumen berperingkat tertinggi di dalamnya, dan di dalam kelompok menurut urutan kitab
 * (`bookOrder`). Catatan kaki ikut kelompok paragraf badan pertama yang merujuknya bila paragraf
 * itu juga dokumen. Paragraf tanpa bagian dikelompokkan per halaman. Himpunan dokumen (dan
 * terjemahan 12 teratas, yang dipilih menurut peringkat) tidak berubah, hanya urutannya: v5
 * menerima dokumen urut RRF, sehingga paragraf satu bagian tercecer di antara bagian lain (bedah
 * X03: argumen bantahan j014 di peringkat 4, 15, 19, 21 dari 34).
 */
export function orderBySection(docs: readonly AnswerDoc[]): AnswerDoc[] {
  const present = new Map(docs.map((d) => [d.passage.id, d.passage]));
  const groupKey = (d: AnswerDoc): string => {
    const p =
      d.passage.kind === "foot"
        ? (d.passage.referenced_by.map((id) => present.get(id)).find((b) => b !== undefined) ??
          d.passage)
        : d.passage;
    return p.toc_node_id === null ? `h${p.page_id}` : `b${p.toc_node_id}`;
  };
  const groups = new Map<string, AnswerDoc[]>();
  for (const d of docs) {
    const key = groupKey(d);
    const group = groups.get(key);
    if (group) group.push(d);
    else groups.set(key, [d]);
  }
  return [...groups.values()].flatMap((g) => g.sort((a, b) => bookOrder(a.passage, b.passage)));
}

export function buildAnswerRequest(
  docs: readonly AnswerDoc[],
  question: string,
  model: ModelId = MODELS.haiku,
): MessageCreateParamsBase {
  return {
    model,
    max_tokens: ANSWER_MAX_TOKENS,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: ANSWER_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [...docs.map(toDocumentBlock), { type: "text", text: answerUserText(question) }],
      },
    ],
  };
}
