// Request dan validasi terjemahan per paragraf (S13; prompt aktif `translate-passage@5`, X21). Teks yang dikirim
// sudah bertanda: kutipan ayat diganti placeholder `⟦QS s:a⟧` (`maskAyat`, @surau/core), sehingga
// model tidak pernah melihat atau menerjemahkan ayat (ADR-020, ADR-040).
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { TRANSLATION_LENGTH_RATIO, checkPassageTranslation } from "@surau/core";
import type { TranslationCheck } from "@surau/core";
import type { MaskedPassage } from "@surau/core";

import { TRANSLATE_PASSAGE_V4 } from "../prompts/translate-passage-v4.ts";
import { TRANSLATE_PASSAGE_V5 } from "../prompts/translate-passage-v5.ts";
import { TRANSLATE_PASSAGE_V6 } from "../prompts/translate-passage-v6.ts";
import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";

// Aktif sejak X21 (ADR-109): v5 + Sonnet 5.5 terpilih lewat uji buta atas sampel baru (88% vs 46% Benar);
// v6 (= v5 + "Keluaran bersih") sejak sisa 72 paragraf yang ditolak validator tiga kali.
export const TRANSLATE_PROMPT = TRANSLATE_PASSAGE_V6;
/** Prompt yang bisa dipilih (`buildTranslateRequest(..., { prompt })`); bawaan = `TRANSLATE_PROMPT`. */
export const TRANSLATE_PROMPTS = {
  [TRANSLATE_PASSAGE_V4.id]: TRANSLATE_PASSAGE_V4,
  [TRANSLATE_PASSAGE_V5.id]: TRANSLATE_PASSAGE_V5,
  [TRANSLATE_PASSAGE_V6.id]: TRANSLATE_PASSAGE_V6,
} as const;
export type TranslatePrompt = (typeof TRANSLATE_PROMPTS)[keyof typeof TRANSLATE_PROMPTS];
export type TranslateEffort = "low" | "medium" | "high";
export const TRANSLATION_LANG = "id";

/** Ruang untuk thinking (effort low) + terjemahan paragraf terpanjang Ihya (±4,2 ribu karakter). */
export const TRANSLATE_MAX_TOKENS = 16_000;

export interface TranslateInput {
  passageId: number;
  /** Jalur judul daftar isi (teks Arab dari DB), konteks saja. */
  heading: string;
  /** Paragraf badan sebelumnya di bagian yang sama, sudah bertanda; konteks saja. */
  previous: string | null;
  masked: MaskedPassage;
  /** Digit penanda catatan kaki paragraf ini (dari `footnote_ref`), mis. ["١", "٢"]. */
  markers: readonly string[];
}

export function translateUserText(input: TranslateInput): string {
  const parts = [`<bagian>${input.heading}</bagian>`];
  if (input.previous !== null) parts.push(`<sebelumnya>\n${input.previous}\n</sebelumnya>`);
  parts.push(
    `<teks>\n${input.masked.text}\n</teks>`,
    "Terjemahkan isi <teks> ke bahasa Indonesia.",
  );
  return parts.join("\n");
}

/**
 * Parameter request (Messages API biasa atau satu entri Message Batches). Aturan ADR-013: effort
 * `low` eksplisit, tanpa temperature/top_p/top_k, tanpa prefill, thinking adaptif bawaan.
 * `cache_control` 1 jam pada prompt sistem: prefix yang sama untuk semua paragraf, dan batch bisa
 * berjalan lebih lama dari 5 menit.
 */
export function buildTranslateRequest(
  input: TranslateInput,
  model: ModelId = MODELS.haiku,
  opts: { prompt?: TranslatePrompt; effort?: TranslateEffort } = {},
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: TRANSLATE_MAX_TOKENS,
    output_config: { effort: opts.effort ?? "low" },
    system: [
      {
        type: "text",
        text: (opts.prompt ?? TRANSLATE_PROMPT).system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: translateUserText(input) }],
  };
}

export { LENGTH_RATIO_MIN_CHARS } from "@surau/core";
export type { TranslationCheck, TranslationProblem } from "@surau/core";

/** Rasio panjang terjemahan Indonesia ÷ teks Arab yang dianggap wajar (di luar ini ditolak). */
export const LENGTH_RATIO = TRANSLATION_LENGTH_RATIO.id;

/** Pemeriksa keluaran batch Indonesia (aturan di @surau/core `checkPassageTranslation`). */
export function checkTranslation(output: string, input: TranslateInput): TranslationCheck {
  return checkPassageTranslation(output, input, "id");
}
