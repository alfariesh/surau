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

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_INDIC = "۰۱۲۳۴۵۶۷۸۹";

function toAsciiDigits(d: string): string {
  // Digit Arab satu unit UTF-16 per karakter, jadi penggantian per karakter aman.
  return d.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) =>
    String(Math.max(ARABIC_INDIC.indexOf(c), EXTENDED_INDIC.indexOf(c))),
  );
}

/**
 * Model kadang menulis penanda catatan kaki "(٢)" sebagai "(2)". Untuk setiap penanda yang
 * diharapkan tetapi tidak ada dalam angka Arab, kemunculan pertama versi angka Latinnya dikembalikan
 * ke bentuk asli. Hanya penanda yang diharapkan yang disentuh; angka lain (tahun, nomor) dibiarkan.
 */
export function restoreFootnoteMarkers(text: string, expected: readonly string[]): string {
  const have = footnoteMarkerDigits(text);
  let out = text;
  for (const d of expected) {
    const i = have.indexOf(d);
    if (i !== -1) {
      have.splice(i, 1);
      continue;
    }
    const ascii = toAsciiDigits(d);
    if (ascii === d) continue;
    const latin = new RegExp(String.raw`\(\s*${ascii}\s*\)`);
    if (latin.test(out)) out = out.replace(latin, `(${d})`);
  }
  return out;
}
