// Pemeriksa teks terjemahan Indonesia (X08, ADR-081). Satu modul murni untuk dua pemakai:
// - batch AI (`@surau/llm`): `stripMarkers`, `hasArabicLetters`, `footnoteMarkerDigits`, `hasMarkdown`
//   (dipindah dari packages/llm/src/check.ts supaya web tidak menarik @surau/llm + SDK Anthropic);
// - teks koreksi manusia (`/tinjau/terjemahan` dan ingest): `validateTranslationText`. Yang di batch
//   AI hanya peringatan (huruf Arab) menjadi PENOLAKAN untuk teks manusia.
// Teks tetap polos: placeholder ayat ⟦QS s:a⟧, penanda catatan kaki (١), tanda petik, dan kurung siku
// [...] untuk kata tambahan penerjemah. Tanpa HTML, Markdown, atau tautan.
import { FOOTNOTE_MARKER_SOURCE } from "@surau/text";

import { TRANSLATION_REVISION_TEXT_MAX } from "@surau/db";

import { ayahPlaceholderPattern, maskAyat } from "./ayah-placeholder.ts";
import type { AyahRef, FootnoteRef } from "./schema.ts";

const ARABIC_LETTER = /(?=\p{L})\p{Script=Arabic}/u;

/** Buang placeholder ayat dan penanda catatan kaki (angka dalam kurung) dari teks. */
export function stripMarkers(text: string): string {
  return text
    .replace(ayahPlaceholderPattern(), " ")
    .replace(new RegExp(FOOTNOTE_MARKER_SOURCE, "g"), " ");
}

/** Ada huruf Arab sama sekali (placeholder dan penanda tidak dihitung). */
export function hasArabicLetters(text: string): boolean {
  return ARABIC_LETTER.test(stripMarkers(text));
}

/** Digit setiap penanda catatan kaki di teks, mis. "(١)" → "١". */
export function footnoteMarkerDigits(text: string): string[] {
  return [...text.matchAll(new RegExp(FOOTNOTE_MARKER_SOURCE, "g"))].map((m) => m[1] ?? "");
}

/** Markdown yang dilarang prompt (tebal, judul). */
export function hasMarkdown(text: string): boolean {
  return /\*\*|__|^\s{0,3}#{1,6}\s/m.test(text);
}

/** Panjang terpanjang teks terjemahan manusia (terjemahan AI terpanjang Ihya 7.966 karakter). */
export const TRANSLATION_TEXT_MAX = TRANSLATION_REVISION_TEXT_MAX;

/**
 * Teks manusia: SEMUA karakter berskrip Arab ditolak (bukan hanya huruf), termasuk ligatur hormat
 * dan simbol (U+FDFD basmalah, U+FD40–U+FD4F, U+06DE …), kecuali angka Arab-India (penanda catatan
 * kaki sudah dibuang lebih dulu). `hasArabicLetters` batch AI tetap hanya huruf (perilaku S13).
 */
const ARABIC_SCRIPT = /(?![\u0660-\u0669\u06F0-\u06F9])\p{Script=Arabic}/u;

/** Penanda catatan kaki berangka Arab-India (penanda sumber); "(2)" berangka Latin = teks biasa. */
const ARABIC_DIGITS = /^[\u0660-\u0669\u06F0-\u06F9]+$/u;
const arabicMarkers = (text: string) =>
  footnoteMarkerDigits(text).filter((d) => ARABIC_DIGITS.test(d));

/** Tag `<...>`, Markdown miring/tebal/judul, dan tautan `[teks](url)`. */
function hasMarkup(text: string): boolean {
  return (
    /<\/?[A-Za-z!][^>]*>/u.test(text) ||
    hasMarkdown(text) ||
    /(?:^|[\s(])\*[^\s*][^*\n]*\*(?=$|[\s.,;:!?)])/mu.test(text) ||
    /(?:^|[\s(])_[^\s_][^_\n]*_(?=$|[\s.,;:!?)])/mu.test(text) ||
    /\[[^\]\n]*\]\([^)\n]*\)/u.test(text) ||
    /^\s{0,3}(?:[-*+]|\d+\.)\s/mu.test(text) ||
    /`/u.test(text)
  );
}

/** Karakter kontrol/format (arah teks U+202E, lebar-nol) selain baris baru dan tab. */
const CONTROL = /[\p{Cc}\p{Cf}]/u;
const hasControl = (text: string) => CONTROL.test(text.replaceAll(/[\n\t]/g, ""));

/** Kurung siku berpasangan dan tidak bersarang. */
function bracketsBalanced(text: string): boolean {
  let open = false;
  for (const ch of text) {
    if (ch === "[") {
      if (open) return false;
      open = true;
    } else if (ch === "]") {
      if (!open) return false;
      open = false;
    }
  }
  return !open;
}

/** Petik ganda berpasangan: lurus `"` genap, lengkung “ ” seimbang dan berurutan. Petik tunggal (') tidak diperiksa: dipakai untuk 'ain/hamzah (Mu'adz). */
function quotesBalanced(text: string): boolean {
  if ((text.match(/"/gu)?.length ?? 0) % 2 !== 0) return false;
  let depth = 0;
  for (const ch of text) {
    if (ch === "\u201C") depth++;
    else if (ch === "\u201D" && --depth < 0) return false;
  }
  return depth === 0;
}

export type TranslationIssueCode =
  | "empty"
  | "too_long"
  | "control_chars"
  | "markup"
  | "arabic_letters"
  | "placeholder_missing"
  | "placeholder_unexpected"
  | "marker_unknown"
  | "marker_missing"
  | "brackets_unbalanced"
  | "quotes_unbalanced";

export interface TranslationIssue {
  code: TranslationIssueCode;
  /** Placeholder atau penanda yang bermasalah (bila ada). */
  detail?: string;
}

export interface TranslationTextCheck {
  /** Tanpa galat (peringatan boleh ada). */
  ok: boolean;
  errors: TranslationIssue[];
  warnings: TranslationIssue[];
}

export interface TranslationTextContext {
  /** `text_raw` paragraf (teks Arab DB). */
  arabic: string;
  ayahRefs: readonly AyahRef[];
  footnoteRefs?: readonly FootnoteRef[];
  /**
   * Teks dasar yang diperbaiki (revisi aktif atau teks korpus). Bila dasarnya sendiri tidak
   * berpasangan (kutipan lintas paragraf), petik/kurung yang tidak berpasangan cukup peringatan.
   */
  base?: string;
}

const count = (items: readonly string[]) => {
  const m = new Map<string, number>();
  for (const x of items) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};

/**
 * Validasi teks terjemahan yang ditulis manusia. Placeholder ayat dibandingkan dengan teks ARAB
 * paragraf (`maskAyat`): setiap placeholder wajib ada persis sebanyak di sumber, tanpa placeholder
 * lain. Penanda catatan kaki (angka Arab-India) hanya boleh yang ada di teks Arab (paling banyak
 * sebanyak di sumber); penanda yang belum ada boleh dilengkapi editor (peringatan bila masih hilang).
 */
export function validateTranslationText(
  text: string,
  ctx: TranslationTextContext,
): TranslationTextCheck {
  const errors: TranslationIssue[] = [];
  const warnings: TranslationIssue[] = [];
  if (text.trim() === "") return { ok: false, errors: [{ code: "empty" }], warnings };
  if (text.length > TRANSLATION_TEXT_MAX) errors.push({ code: "too_long" });
  if (hasControl(text)) errors.push({ code: "control_chars" });
  if (hasMarkup(text)) errors.push({ code: "markup" });
  if (ARABIC_SCRIPT.test(stripMarkers(text))) errors.push({ code: "arabic_letters" });

  const masked = maskAyat(ctx.arabic, ctx.ayahRefs, ctx.footnoteRefs ?? []);
  const want = count([...masked.text.matchAll(ayahPlaceholderPattern())].map((m) => m[0]));
  const got = count([...text.matchAll(ayahPlaceholderPattern())].map((m) => m[0]));
  for (const [p, n] of want)
    for (let i = got.get(p) ?? 0; i < n; i++)
      errors.push({ code: "placeholder_missing", detail: p });
  for (const [p, n] of got)
    for (let i = want.get(p) ?? 0; i < n; i++)
      errors.push({ code: "placeholder_unexpected", detail: p });

  const source = count(arabicMarkers(masked.text));
  const used = count(arabicMarkers(stripAyah(text)));
  for (const [d, n] of used)
    if (n > (source.get(d) ?? 0)) errors.push({ code: "marker_unknown", detail: `(${d})` });
  for (const [d, n] of source)
    if ((used.get(d) ?? 0) < n) warnings.push({ code: "marker_missing", detail: `(${d})` });

  const plain = stripAyah(text);
  const base = ctx.base === undefined ? undefined : stripAyah(ctx.base);
  if (!bracketsBalanced(plain))
    (base !== undefined && !bracketsBalanced(base) ? warnings : errors).push({
      code: "brackets_unbalanced",
    });
  if (!quotesBalanced(plain))
    (base !== undefined && !quotesBalanced(base) ? warnings : errors).push({
      code: "quotes_unbalanced",
    });
  return { ok: errors.length === 0, errors, warnings };
}

/** Placeholder ayat diganti spasi (kurung siku dan petik di dalamnya tidak ikut dihitung). */
const stripAyah = (text: string) => text.replace(ayahPlaceholderPattern(), " ");
