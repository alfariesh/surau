// Pemeriksaan umum keluaran LLM (S13). Aturan teks-arab: teks Arab buatan model tidak pernah tampil
// sebagai kutipan, jadi keluaran yang menyalin teks Arab panjang ditolak (istilah ditulis Latin).
import { FOOTNOTE_MARKER_SOURCE } from "@surau/text";
import { ayahPlaceholderPattern } from "@surau/core";

/**
 * Kata berhuruf Arab berturut-turut yang masih diterima: 0. Prompt melarang huruf Arab sama sekali
 * dan aturan teks-arab 1 melarang teks Arab buatan model tampil, jadi satu kata pun ditolak (ulangan
 * murah). Placeholder ayat dan penanda catatan kaki tidak dihitung.
 */
export const MAX_ARABIC_RUN_WORDS = 0;

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

/** Panjang teks tanpa placeholder, penanda, dan spasi berlebih (perkiraan token, pemecahan). */
export function contentLength(text: string): number {
  return stripMarkers(text).replace(/\s+/g, " ").trim().length;
}

/**
 * Panjang tanpa placeholder, penanda, harakat, dan spasi berlebih: dasar rasio panjang terjemahan.
 * Harakat tidak dihitung supaya judul berharakat penuh tidak tampak "dua kali lebih panjang".
 */
export function letterLength(text: string): number {
  return stripMarkers(text).replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().length;
}

/** Digit setiap penanda catatan kaki di teks, mis. "(١)" → "١". */
export function footnoteMarkerDigits(text: string): string[] {
  return [...text.matchAll(new RegExp(FOOTNOTE_MARKER_SOURCE, "g"))].map((m) => m[1] ?? "");
}

/** Jarak (karakter) dari placeholder ayat yang diperiksa untuk transliterasi berdiakritik. */
export const REFILL_WINDOW = 80;
const DIACRITIC_TRANSLIT = /[āīūḥṣṭẓḍĀĪŪḤṢṬẒḌ]/;

/**
 * Tanda model menulis ulang isi kutipan ayat yang sudah diganti placeholder: transliterasi
 * berdiakritik (ā ī ū ḥ …) dekat placeholder (`wa huwa 'alā … qadīr ⟦QS …⟧`). Prompt memakai
 * transliterasi tanpa diakritik, jadi diakritik di situ = lafaz Arab yang dialihaksarakan utuh.
 * Tidak ditolak (uji batch S13, semuanya sah): "yakni/maksudnya …" sesudah placeholder (tafsiran
 * al-Ghazali sendiri, أي … di sumber), kutipan sesudah placeholder (ucapan berikutnya atau doa
 * sesudah ayat), dan transliterasi berdiakritik jauh dari placeholder (soal gaya).
 */
export function refillsAyah(text: string): boolean {
  for (const m of text.matchAll(/⟦QS [^⟧]*⟧/g)) {
    const at = m.index ?? 0;
    const near = text.slice(Math.max(0, at - REFILL_WINDOW), at + m[0].length + REFILL_WINDOW);
    if (DIACRITIC_TRANSLIT.test(near)) return true;
  }
  return false;
}

/** Markdown yang dilarang prompt (tebal, judul). */
export function hasMarkdown(text: string): boolean {
  return /\*\*|__|^\s{0,3}#{1,6}\s/m.test(text);
}

/**
 * Komentar model tentang pekerjaannya sendiri di dalam keluaran ("Let me write carefully",
 * "Wait — I must…", "Maaf, saya ulangi"): tanda keluaran rusak, ditolak. Untuk keluaran bahasa
 * Indonesia, frasa Inggris semacam ini di mana pun mencurigakan; untuk bahasa Inggris hanya di awal
 * kalimat ("here is" juga muncul wajar: "the text available here is only the heading").
 */
export function hasMetaCommentary(text: string, lang: "id" | "en" = "id"): boolean {
  if (/\b(?:maaf, saya|saya ulangi|saya akan menerjemahkan|terjemahan saya)\b/i.test(text))
    return true;
  if (lang === "id") {
    return /\b(?:let me|i will|i'll|i need to|i must|here is|here's|sorry)\b|\bwait\s*[—–-]/i.test(
      text,
    );
  }
  return /(?:^|[.!?]\s+)(?:let me|sorry|wait\s*[—–-]|here is (?:the|a|my) (?:summary|translation))/i.test(
    text,
  );
}

/** Kalimat pembuka/penutup basa-basi yang dilarang prompt. */
export function hasPreamble(text: string): boolean {
  return /^\s*(?:berikut(?: ini)?(?: adalah)? (?:terjemah|ringkas)|terjemahan\s*:|ringkasan\s*:|here is)/i.test(
    text,
  );
}

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
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
    const sup = [...ascii].map((c) => SUPERSCRIPT[Number(c)] ?? c).join("");
    const latin = new RegExp(String.raw`\(\s*(?:${ascii}|${sup})\s*\)`);
    if (latin.test(out)) out = out.replace(latin, `(${d})`);
  }
  return out;
}
