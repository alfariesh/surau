// Request jawaban Jawab (S19): prompt `answer@1` (di-cache 1 jam), dokumen custom content
// bercitations, lalu pertanyaan. Aturan ADR-013: effort `low` eksplisit, thinking adaptif bawaan,
// tanpa parameter sampling, tanpa prefill, tanpa `output_config.format` (tidak bisa bersama
// Citations).
import type { MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/messages";

import { ANSWER_V1 } from "../../prompts/answer-v1.ts";
import { MODELS } from "../client.ts";
import type { ModelId } from "../client.ts";
import { estimateTextTokens, toDocumentBlock } from "./documents.ts";
import type { AnswerDoc } from "./documents.ts";

export const ANSWER_PROMPT = ANSWER_V1;
/** Ruang thinking (effort low) + jawaban beberapa paragraf. */
export const ANSWER_MAX_TOKENS = 8000;
/** Batas keras prompt Jawab (ADR-013; harga Haiku naik 5× di atas 100k). */
export const JAWAB_MAX_PROMPT_TOKENS = 40_000;
/** Anggaran perkiraan dokumen; sisanya untuk prompt sistem, pertanyaan, dan galat perkiraan. */
export const DOC_BUDGET_TOKENS = 30_000;

export function answerUserText(question: string): string {
  return `<pertanyaan>${question}</pertanyaan>`;
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
