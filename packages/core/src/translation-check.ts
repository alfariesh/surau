// Pemeriksa keluaran terjemahan per paragraf (S13; dipindah dari @surau/llm di X27, ADR-132) supaya
// batch API dan plugin redaksi (MCP `/redaksi`, CLI `terjemah`) memakai satu aturan yang sama:
// placeholder ayat utuh, penanda catatan kaki, tanpa huruf Arab, tanpa Markdown atau komentar model,
// dan rasio panjang yang wajar. Hanya teks; tidak membaca DB dan tidak memanggil LLM.
import { checkPlaceholders } from "./ayah-placeholder.ts";
import type { MaskedPassage } from "./ayah-placeholder.ts";
import { hasMetaCommentary, hasPreamble } from "./narrative-check.ts";
import { footnoteMarkerDigits, hasMarkdown, stripMarkers } from "./translation-text.ts";

/**
 * Kata berhuruf Arab berturut-turut yang masih diterima: 0. Prompt melarang huruf Arab sama sekali
 * dan aturan teks-arab 1 melarang teks Arab buatan model tampil, jadi satu kata pun ditolak (ulangan
 * murah). Placeholder ayat dan penanda catatan kaki tidak dihitung.
 */
export const MAX_ARABIC_RUN_WORDS = 0;

const ARABIC_LETTER = /(?=\p{L})\p{Script=Arabic}/u;

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
    const sup = ascii.replace(/[0-9]/g, (c) => SUPERSCRIPT[Number(c)] ?? c);
    const latin = new RegExp(String.raw`\(\s*(?:${ascii}|${sup})\s*\)`);
    if (latin.test(out)) out = out.replace(latin, `(${d})`);
  }
  return out;
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
  /**
   * Penanda catatan kaki yang tidak ada di terjemahan (diterima, dicatat): takhrij tetap tertaut di
   * teks Arab di sebelahnya. Uji batch S13: model sering membuangnya (±4% paragraf).
   */
  markersMissing: string[];
}

/** Bahasa terjemahan yang diperiksa. */
export type TranslationCheckLang = "id" | "en";

/**
 * Rasio panjang terjemahan ÷ teks Arab yang dianggap wajar (di luar ini ditolak).
 * Indonesia: batas atas 4 (S13): rasio p99 hasil batch = 3,1 dan p99,9 = 5,7; di atas 4 hampir
 * selalu dua versi terjemahan atau catatan model. Inggris: belum dikalibrasi (X27); kalimat Inggris
 * ±15% lebih pendek daripada Indonesia, jadi batas bawah diturunkan. Pemeriksa plugin memakainya
 * sebagai peringatan sampai ada data.
 */
export const TRANSLATION_LENGTH_RATIO = {
  id: { min: 0.8, max: 4 },
  en: { min: 0.65, max: 3.5 },
} as const;
/** Teks Arab sependek ini (judul, frasa) tidak diperiksa rasionya. */
export const LENGTH_RATIO_MIN_CHARS = 40;

/** Masukan pemeriksa: paragraf bertanda ayat dan digit penanda catatan kakinya. */
export interface TranslationCheckInput {
  masked: MaskedPassage;
  markers: readonly string[];
}

/** Catatan penerjemah dalam bahasa Inggris (padanan "Catatan:" yang ditangkap pola Indonesia). */
const META_EN = /\b(?:translator'?s?\s+note|note\s*:)|\[(?:sic|note)\b/i;

/** Kata tugas di keluaran yang hampir selalu label/komentar model, per bahasa. */
const ECHOES_TASK: Readonly<Record<TranslationCheckLang, RegExp>> = {
  id: /terjemah/i,
  en: /\btranslat(?:e|ed|ion|or)\b/i,
};

export function checkPassageTranslation(
  output: string,
  input: TranslationCheckInput,
  lang: TranslationCheckLang,
): TranslationCheck {
  const problems: TranslationProblem[] = [];
  const details: string[] = [];
  const text = restoreFootnoteMarkers(output.trim(), input.markers);
  if (text === "") {
    return {
      ok: false,
      text,
      problems: ["empty"],
      details,
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
    const range = TRANSLATION_LENGTH_RATIO[lang];
    if (ratio < range.min || ratio > range.max) {
      problems.push("length_ratio");
      details.push(`rasio panjang ${ratio.toFixed(2)}`);
    }
  }
  if (hasMarkdown(text)) problems.push("markdown");
  if (hasPreamble(text)) problems.push("preamble");
  // Kata "terjemah…"/"translat…" di terjemahan hampir selalu label/komentar model ("Terjemahan:",
  // "mari terjemahkan", "bukan terjemahan"); sah hanya bila sumbernya memang membahas ترجمة (ترجم).
  const echoesTask =
    ECHOES_TASK[lang].test(text) && !/\u062A\u0631\u062C\u0645/.test(input.masked.text);
  // Kurung kurawal tidak pernah ada di terjemahan yang sah (prompt melarangnya; {⟦QS …⟧} = rusak).
  if (
    hasMetaCommentary(text, lang) ||
    (lang === "en" && META_EN.test(text)) ||
    echoesTask ||
    /[{}]/.test(text)
  )
    problems.push("meta");
  return {
    ok: problems.length === 0,
    text,
    problems,
    details,
    markersMissing: missing,
  };
}
