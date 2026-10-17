// Pemeriksaan umum keluaran LLM (S13). Aturan teks-arab: teks Arab buatan model tidak pernah tampil
// sebagai kutipan, jadi keluaran yang menyalin teks Arab panjang ditolak (istilah ditulis Latin).
import { FOOTNOTE_MARKER_SOURCE } from "@surau/text";
import { ayahPlaceholderPattern } from "@surau/core";

/** Kata berhuruf Arab berturut-turut yang sudah dianggap "menyalin teks", bukan istilah. */
export const MAX_ARABIC_RUN_WORDS = 2;

const ARABIC_LETTER = /(?=\p{L})\p{Script=Arabic}/u;

/** Buang placeholder ayat dan penanda catatan kaki (angka Arab dalam kurung) dari teks. */
export function stripMarkers(text: string): string {
  return text
    .replace(ayahPlaceholderPattern(), " ")
    .replace(new RegExp(FOOTNOTE_MARKER_SOURCE, "g"), " ");
}

/** Jumlah kata berhuruf Arab berturut-turut terpanjang (placeholder dan penanda tidak dihitung). */
export function longestArabicRun(text: string): number {
  let best = 0;
  let run = 0;
  for (const token of stripMarkers(text).split(/\s+/)) {
    if (token === "") continue;
    run = ARABIC_LETTER.test(token) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Ada huruf Arab sama sekali (dicatat sebagai peringatan, bukan penolakan). */
export function hasArabicLetters(text: string): boolean {
  return ARABIC_LETTER.test(stripMarkers(text));
}

/** Panjang teks tanpa placeholder, penanda, dan spasi berlebih (dasar rasio panjang). */
export function contentLength(text: string): number {
  return stripMarkers(text).replace(/\s+/g, " ").trim().length;
}

/** Digit setiap penanda catatan kaki di teks, mis. "(١)" → "١". */
export function footnoteMarkerDigits(text: string): string[] {
  return [...text.matchAll(new RegExp(FOOTNOTE_MARKER_SOURCE, "g"))].map((m) => m[1] ?? "");
}

/** Markdown yang dilarang prompt (tebal, judul). */
export function hasMarkdown(text: string): boolean {
  return /\*\*|__|^\s{0,3}#{1,6}\s/m.test(text);
}

/** Kalimat pembuka/penutup basa-basi yang dilarang prompt. */
export function hasPreamble(text: string): boolean {
  return /^\s*(?:berikut(?: ini)?(?: adalah)? (?:terjemah|ringkas)|terjemahan\s*:|ringkasan\s*:|here is)/i.test(
    text,
  );
}
