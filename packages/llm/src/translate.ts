// Request dan validasi terjemahan per paragraf (S13, prompt `translate-passage@1`). Teks yang dikirim
// sudah bertanda: kutipan ayat diganti placeholder `⟦QS s:a⟧` (`maskAyat`, @surau/core), sehingga
// model tidak pernah melihat atau menerjemahkan ayat (ADR-020, ADR-040).
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { checkPlaceholders } from "@surau/core";
import type { MaskedPassage } from "@surau/core";

import { TRANSLATE_PASSAGE_V2 } from "../prompts/translate-passage-v2.ts";
import {
  MAX_ARABIC_RUN_WORDS,
  footnoteMarkerDigits,
  hasArabicLetters,
  hasMarkdown,
  hasMetaCommentary,
  hasPreamble,
  letterLength,
  longestArabicRun,
  refillsAyah,
  restoreFootnoteMarkers,
} from "./check.ts";
import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";

export const TRANSLATE_PROMPT = TRANSLATE_PASSAGE_V2;
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
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: TRANSLATE_MAX_TOKENS,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: TRANSLATE_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: translateUserText(input) }],
  };
}

export type TranslationProblem =
  | "empty"
  | "placeholders"
  | "markers_extra"
  | "ayah_refill"
  | "arabic"
  | "length_ratio"
  | "markdown"
  | "preamble"
  | "meta";

export interface TranslationCheck {
  ok: boolean;
  /** Teks yang disimpan: keluaran di-trim, penanda berangka Latin dikembalikan ke angka Arab. */
  text: string;
  problems: TranslationProblem[];
  /** Keterangan untuk laporan (placeholder yang hilang/berlebih, rasio, dll.). */
  details: string[];
  /** Ada huruf Arab pendek (≤ MAX_ARABIC_RUN_WORDS kata): diterima, dicatat. */
  arabicWarning: boolean;
  /**
   * Penanda catatan kaki yang tidak ada di terjemahan (diterima, dicatat): takhrij tetap tertaut di
   * teks Arab di sebelahnya. Uji batch S13: model sering membuangnya (±4% paragraf).
   */
  markersMissing: string[];
}

/** Rasio panjang terjemahan Indonesia ÷ teks Arab yang dianggap wajar (di luar ini ditolak). */
export const LENGTH_RATIO = { min: 0.8, max: 8 } as const;
/** Teks Arab sependek ini (judul, frasa) tidak diperiksa rasionya. */
export const LENGTH_RATIO_MIN_CHARS = 40;

export function checkTranslation(output: string, input: TranslateInput): TranslationCheck {
  const problems: TranslationProblem[] = [];
  const details: string[] = [];
  const text = restoreFootnoteMarkers(output.trim(), input.markers);
  if (text === "") {
    return {
      ok: false,
      text,
      problems: ["empty"],
      details,
      arabicWarning: false,
      markersMissing: [],
    };
  }

  const ph = checkPlaceholders(text, input.masked);
  if (!ph.ok) {
    problems.push("placeholders");
    details.push(
      `placeholder hilang [${ph.missing.join(" ")}] berlebih [${ph.unexpected.join(" ")}]`,
    );
  }
  const got = footnoteMarkerDigits(text);
  const missing = [...input.markers];
  for (const d of got) {
    const i = missing.indexOf(d);
    if (i !== -1) missing.splice(i, 1);
  }
  if (missing.length > 0) details.push(`penanda catatan kaki hilang (${missing.join(" ")})`);
  // Penanda berangka Arab yang tidak ada di sumber = karangan model (akan tertaut ke takhrij salah).
  const extra = [...input.markers];
  const invented = got.filter((d) => {
    if (!/^[\u0660-\u0669\u06F0-\u06F9]+$/.test(d)) return false;
    const i = extra.indexOf(d);
    if (i === -1) return true;
    extra.splice(i, 1);
    return false;
  });
  if (invented.length > 0) {
    problems.push("markers_extra");
    details.push(`penanda catatan kaki karangan (${invented.join(" ")})`);
  }
  if (refillsAyah(text)) problems.push("ayah_refill");
  const run = longestArabicRun(text);
  if (run > MAX_ARABIC_RUN_WORDS) {
    problems.push("arabic");
    details.push(`${run} kata Arab berturut-turut`);
  }
  const source = letterLength(input.masked.text);
  if (source >= LENGTH_RATIO_MIN_CHARS) {
    const ratio = letterLength(text) / source;
    if (ratio < LENGTH_RATIO.min || ratio > LENGTH_RATIO.max) {
      problems.push("length_ratio");
      details.push(`rasio panjang ${ratio.toFixed(2)}`);
    }
  }
  if (hasMarkdown(text)) problems.push("markdown");
  if (hasPreamble(text)) problems.push("preamble");
  if (hasMetaCommentary(text)) problems.push("meta");
  return {
    ok: problems.length === 0,
    text,
    problems,
    details,
    arabicWarning: run > 0 && run <= MAX_ARABIC_RUN_WORDS && hasArabicLetters(text),
    markersMissing: missing,
  };
}
