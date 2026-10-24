// Pratinjau huruf di panel Tampilan: awal teks paragraf, disalin apa adanya dari `text_raw` (DB) dan
// dipotong hanya di spasi, supaya tidak ada huruf yang terpisah dari harakatnya (teks-arab.md:
// kode menyalin, tidak mengubah huruf). Tanpa spasi di awal paragraf → tanpa pratinjau.

import { FOOTNOTE_MARKER_SOURCE } from "@surau/text";

import type { TranslationModel } from "./page-model";

export const PREVIEW_CHARS = 90;

export function previewSample(text: string | undefined, max = PREVIEW_CHARS): string | null {
  if (text === undefined) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.lastIndexOf(" ", max);
  return cut > 0 ? trimmed.slice(0, cut).trimEnd() : null;
}

/**
 * Contoh panel Tampilan (X11): awal paragraf Arab + awal terjemahan AI-nya, supaya pratinjau
 * memperlihatkan mode baca terpilih. `hasTranslation` = halaman ini punya terjemahan yang tampil
 * (keterangan "belum punya terjemahan" di panel).
 */
export interface ReaderSample {
  arabic: string | null;
  translation: { text: string; lang: string } | null;
  hasTranslation: boolean;
}

export const PREVIEW_TR_CHARS = 120;

const MARKERS = new RegExp(`\\s*${FOOTNOTE_MARKER_SOURCE}`, "g");

/**
 * Awal terjemahan untuk pratinjau: hanya segmen AI (segmen ayat adalah terjemahan Kemenag, bukan
 * teks berlabel "Terjemahan AI"), tanpa penanda catatan kaki, dipotong di batas kata + "…".
 */
export function previewTranslation(
  tr: TranslationModel | null,
  max = PREVIEW_TR_CHARS,
): ReaderSample["translation"] {
  const seg = tr?.segments.find((s) => s.kind === "ai" && s.text.trim().length >= 20);
  if (tr === null || tr === undefined || seg === undefined || seg.kind !== "ai") return null;
  const text = seg.text.replace(MARKERS, "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return { text, lang: tr.lang };
  const cut = text.lastIndexOf(" ", max);
  return { text: `${text.slice(0, cut > 0 ? cut : max).trimEnd()}…`, lang: tr.lang };
}
