// Request dan validasi terjemahan per paragraf (S13; prompt aktif `translate-passage@5`, X21). Teks yang dikirim
// sudah bertanda: kutipan ayat diganti placeholder `⟦QS s:a⟧` (`maskAyat`, @surau/core), sehingga
// model tidak pernah melihat atau menerjemahkan ayat (ADR-020, ADR-040).
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { TRANSLATION_LENGTH_RATIO, checkPassageTranslation } from "@surau/core";
import type { TranslationCheck, TranslationCheckOptions } from "@surau/core";
import type { MaskedPassage } from "@surau/core";

import { TRANSLATE_NOTE_AJURRUMIYYAH_V1 } from "../prompts/translate-note-ajurrumiyyah-v1.ts";
import { TRANSLATE_NOTE_TARIFAT_V1 } from "../prompts/translate-note-tarifat-v1.ts";
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
/** Petunjuk terjemahan per kitab yang tersedia (ADR-149); dipilih lewat `WorkConfig.llm.translateNote`. */
export const TRANSLATE_NOTES = {
  ajurrumiyyah: TRANSLATE_NOTE_AJURRUMIYYAH_V1,
  tarifat: TRANSLATE_NOTE_TARIFAT_V1,
} as const;
export type TranslatePrompt = (typeof TRANSLATE_PROMPTS)[keyof typeof TRANSLATE_PROMPTS];
export type TranslateEffort = "low" | "medium" | "high";

/**
 * Petunjuk terjemahan per kitab (ADR-149; `WorkConfig.llm.translateNote`), mis. contoh Arab kitab
 * nahwu ditulis sebagai transliterasi. `id` = `<nama>@<versi>`; mengubah teks = versi baru.
 */
export interface TranslateWorkNote {
  id: string;
  text: string;
  /**
   * Batas atas rasio panjang terjemahan ÷ Arab untuk kitab ini (ADR-149 tambahan); bukan bagian
   * prompt (id dan teks sistem tidak berubah). Tanpa entri = `LENGTH_RATIO.max`.
   */
  maxLengthRatio?: number;
}

/** Prompt yang benar-benar dikirim: `id` dicatat sebagai `prompt_version` (aturan teks-arab 8). */
export interface ResolvedTranslatePrompt {
  id: string;
  system: string;
}

const NOTE_ID = /^[a-z0-9-]+@\d+$/;

/**
 * Prompt terjemahan untuk satu kitab: tanpa petunjuk = prompt itu sendiri (id dan teks sistem sama
 * persis, jadi versi, sidik, dan cache kitab lain tidak berubah); dengan petunjuk = teks sistem +
 * petunjuk di ujung, id `<prompt>+<petunjuk>`.
 */
export function translatePromptFor(
  prompt: ResolvedTranslatePrompt,
  note?: TranslateWorkNote,
): ResolvedTranslatePrompt {
  if (note === undefined) return prompt;
  if (!NOTE_ID.test(note.id)) throw new Error(`id petunjuk kitab tidak sah: ${note.id}`);
  if (note.text.trim() === "") throw new Error(`petunjuk kitab ${note.id} kosong`);
  return { id: `${prompt.id}+${note.id}`, system: `${prompt.system}\n\n${note.text}` };
}
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
  opts: { prompt?: ResolvedTranslatePrompt; effort?: TranslateEffort } = {},
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

/**
 * Pemeriksa keluaran batch Indonesia (aturan di @surau/core `checkPassageTranslation`).
 * `maxLengthRatio` = batas atas rasio per kitab (`TranslateWorkNote.maxLengthRatio`).
 */
export function checkTranslation(
  output: string,
  input: TranslateInput,
  opts: TranslationCheckOptions = {},
): TranslationCheck {
  return checkPassageTranslation(output, input, "id", opts);
}
