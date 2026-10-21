// Pemetaan sitasi Jawab (S19): `content_block_location` → `{passage_id, char_start, char_end}`
// lewat segmen dokumen yang dikirim, dan pembersihan teks model. Model hanya MENUNJUK blok; teks
// Arab yang tampil selalu disalin kode dari DB (aturan teks-arab no. 1). Huruf Arab yang ditulis
// model di luar sitasi dibuang dan dihitung.
import type { TextCitation } from "@anthropic-ai/sdk/resources/messages";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
import { ANSWER_FALSE_PREMISE } from "../../prompts/answer-v3.ts";
import type { AnswerDoc } from "./documents.ts";

/** Batas bentang kutipan eval/tampilan (sourceSpan @surau/core). */
export const SPAN_MAX_CHARS = 2000;

export interface CitedSpan {
  passage_id: number;
  char_start: number;
  char_end: number;
  kind: "body" | "foot";
  /** `cited_text` dari API dibandingkan dengan teks DB di bentang ini (integritas pemetaan). */
  matches_cited_text: boolean;
}

/**
 * Bentang DB untuk satu sitasi. `null` bila bukan `content_block_location` atau indeks di luar
 * dokumen yang dikirim (sitasi ini dibuang). Bentang dipangkas dari spasi tepi dan dipecah di batas
 * segmen bila lebih dari 2.000 karakter.
 */
export function citationSpans(
  citation: TextCitation,
  docs: readonly AnswerDoc[],
): CitedSpan[] | null {
  if (citation.type !== "content_block_location") return null;
  const doc = docs[citation.document_index];
  if (doc === undefined) return null;
  const { start_block_index: from, end_block_index: to } = citation;
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to <= from ||
    to > doc.segments.length
  )
    return null;
  const text = doc.passage.text_raw;
  const segs = doc.segments.slice(from, to);
  const cited = text.slice(segs[0]!.start, segs.at(-1)!.end);
  const matches = cited.trim() === citation.cited_text.trim();
  const out: CitedSpan[] = [];
  let group: { start: number; end: number } | null = null;
  const flush = () => {
    if (group === null) return;
    const raw = text.slice(group.start, group.end);
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    if (raw.trim() !== "")
      out.push({
        passage_id: doc.passage.id,
        char_start: group.start + lead,
        char_end: group.end - trail,
        kind: doc.passage.kind,
        matches_cited_text: matches,
      });
    group = null;
  };
  for (const s of segs) {
    if (group !== null && s.end - group.start > SPAN_MAX_CHARS) flush();
    group = group === null ? { start: s.start, end: s.end } : { start: group.start, end: s.end };
  }
  flush();
  return out;
}

// Huruf Arab (termasuk angka Arab-India) beserta tanda yang menempel (harakat, tatweel, dan tanda
// gabung lain: harakat ber-Script=Inherited, bukan Arabic), dalam satu rentang yang boleh dipisah
// spasi. Tanda gabung yang berdiri sendiri sesudah huruf Arab yang sudah dibuang ikut terbuang.
const ARABIC_RUN =
  /(?:[\p{Script=Arabic}\u0660-\u0669][\p{M}\u0640]*)+(?:\s+(?:[\p{Script=Arabic}\u0660-\u0669][\p{M}\u0640]*)+)*/gu;

/**
 * Buang tag `<cite …>`/`</cite>` yang kadang ditiru model di teksnya (arsip eval S21 j021); isi di
 * antaranya tetap. Sitasi yang sah hanya datang dari field `citations` API, bukan dari teks.
 */
export function stripCiteTags(text: string): string {
  return text.replaceAll(/<\/?cite\b[^<>]*>/giu, "");
}

/** Buang huruf Arab buatan model dari teks (bukan dari kutipan DB). */
export function stripArabic(text: string): { text: string; removed: number } {
  let removed = 0;
  const cleaned = text.replace(ARABIC_RUN, (m) => {
    removed += m.length;
    return "…";
  });
  // Tanda kurung/kutip yang kini hanya membungkus elipsis ikut dirapikan.
  return {
    text: removed
      ? cleaned.replace(/[("“'‘]\s*…\s*[)"”'’]/gu, "…").replace(/…(?:\s*…)+/gu, "…")
      : text,
    removed,
  };
}

/**
 * Jenis penolakan baku: `not_found` (prompt `answer@1`+) atau `false_premise` (`answer@3`+), bila
 * kalimat bakunya ada di paragraf pertama (model kadang menulis satu kalimat pengantar dulu);
 * `null` bila jawaban biasa. Kalimat baku di paragraf berikutnya tidak dihitung.
 */
export function refusalKind(text: string): "not_found" | "false_premise" | null {
  const first = text.trimStart().split(/\n\s*\n/u)[0] ?? "";
  const flat = first.replaceAll(/[*_#>]/gu, "");
  if (flat.includes(ANSWER_NOT_FOUND.slice(0, -1))) return "not_found";
  if (flat.includes(ANSWER_FALSE_PREMISE.slice(0, -1))) return "false_premise";
  return null;
}

/** Jawaban diawali salah satu kalimat penolakan baku. */
export function isNotFound(text: string): boolean {
  return refusalKind(text) !== null;
}

/** Pengganti kalimat status hadits yang tidak didukung takhrij tersitasi (aturan teks-arab no. 6). */
export const HADITH_UNKNOWN = `${ANSWER_HADITH_PREFIX} belum diketahui (tidak ada takhrij al-'Iraqi yang tersitasi untuk kalimat ini).`;

/**
 * Pengganti NETRAL (peninjau S21 putaran 3–4): dipakai bila jawaban menyitasi takhrij di tempat
 * lain, karena "belum diketahui" bisa keliru (takhrijnya ada) dan "lihat takhrij pada kutipan" bisa
 * menunjuk takhrij hadits lain; juga untuk pernyataan yang takhrijnya ambigu atau diklaim kelompok
 * lain. Tanpa takhrij tersitasi sama sekali, `hadithCheck` memakai `HADITH_UNKNOWN`.
 */
export const HADITH_NOT_CITED = `${ANSWER_HADITH_PREFIX} tidak ditampilkan (takhrij al-'Iraqi untuk kalimat ini tidak dapat dipastikan).`;

const NOTICES = [HADITH_UNKNOWN, HADITH_NOT_CITED] as const;
/** Pemberitahuan pengganti dimulai di `pos`: bukan label dan bukan pernyataan (tidak diperiksa ulang). */
const noticeAt = (text: string, pos: number) => NOTICES.some((n) => text.startsWith(n, pos));
const withoutNotices = (line: string) =>
  NOTICES.reduce((acc, n) => acc.replaceAll(n, " ".repeat(n.length)), line);

export interface HadithStatement {
  /**
   * Isi KALIMAT itu saja, ringkas (≤120 karakter). Sejak X06 tidak lagi menjadi status yang tampil:
   * status klaim dibuat kode dari istilah takhrij (`takhrijLabel`), kalimatnya diganti teks label.
   */
  status: string;
  /**
   * Awal rentang penggantian: awalan "Status hadits:" (termasuk penanda Markdown yang menempel)
   * untuk kalimat label, atau awal kalimat untuk kalimat lain/butir (penanda daftar tetap tampil).
   */
  start: number;
  /** Akhir rentang penggantian (eksklusif, termasuk tanda baca): akhir kalimat yang sadar singkatan. */
  end: number;
  /**
   * Akhir rentang KEPEMILIKAN sitasi (eksklusif): akhir kalimat terdekat (`nearestEnd`), sehingga
   * sitasi kalimat sesudahnya tidak ikut dihitung milik pernyataan ini.
   */
  ownEnd: number;
  /**
   * Kelompok: kalimat-kalimat dari satu baris label atau satu butir (dianggap satu hadits). Satu
   * takhrij boleh disitasi beberapa kalimat dalam SATU kelompok; dua kelompok = konflik.
   */
  group: number;
  /** Pernyataan model sendiri berbunyi "belum/tidak diketahui": penggantinya tetap "belum diketahui". */
  unknown: boolean;
  /** Rentang penggantian dimulai di awalan "Status hadits:" (bukan kalimat butir/lanjutan). */
  prefixed: boolean;
}

const SP = "[ \\t\\u00A0]";
const HADITH_WORD = "[hḥ]ad[iī](?:ts|th|st|s|t)";
const WORD = "[\\p{L}'’ʻ-]+";
const LABEL_HEAD = "(?<![\\p{L}\\p{N}])(?:status|derajat|kualitas)";

/**
 * Label status hadits yang toleran (S21, ADR-064 butir 7, tiga putaran peninjau S21):
 * - "Status/Derajat/Kualitas", ≤2 kata sisipan ("Status masing-masing hadits"), "hadits/hadis/
 *   hadist/hadith/ḥadīts", bentuk ulang ("hadits-hadits"), akhiran "-nya", lalu ≤8 kata, koma, satu
 *   kurung, atau kutipan sebelum pemisah ("tersebut adalah sebagai berikut", "(menurut al-'Iraqi)");
 *   pemisah titik dua (biasa/lebar), "—", "–", atau "-" berspasi;
 * - baris label tanpa pemisah ("**Status hadits**", "Status hadits ini"): hanya di awal baris dan
 *   ≤2 kata sesudah kata hadits, supaya kalimat biasa yang kebetulan berakhir di "… derajat hadits
 *   tersebut dalam catatan kaki" tidak menjadi label;
 * - "Status:"/"Statusnya:" tanpa kata hadits (wajib titik dua). "Derajat:"/"Kualitas:" tanpa kata
 *   hadits TIDAK, karena lazim untuk tingkatan amal ("tiga derajat: puasa umum, …").
 * Penanda tebal/miring hanya ikut bila menempel pada label ("**Status"), supaya penanda daftar "* "
 * tidak ikut terganti. Batas kata Unicode (garis bawah dianggap huruf oleh `\b`).
 */
const HEAD_HADITH = `${LABEL_HEAD}(?:${SP}+${WORD}){0,2}?${SP}+${HADITH_WORD}(?:-${HADITH_WORD})?(?:nya)?(?![\\p{L}\\p{N}])`;
/** Tepat sesudah awal baris (+ penanda daftar/tebal opsional): syarat label tanpa pemisah. */
const AT_LINE_START = `(?<=(?:^|\\n)${SP}*(?:(?:[-*•·–]|\\d{1,2}[.)]|[a-z][.)])${SP}+)?(?:[*_]{1,3})?)`;
const PREFIX_SOURCE =
  `(?:[*_]{1,3}(?=\\p{L}))?(?:` +
  `${HEAD_HADITH}(?:${SP}*,?${SP}+(?:\\([^()\\n]{0,80}\\)|"[^"\\n]{0,80}"|“[^”\\n]{0,80}”|${WORD})){0,8}?` +
  `${SP}*(?:[*_]{1,3}${SP}*)?(?:[:\\uFF1A]|[—–]|-(?=${SP}))` +
  `|${AT_LINE_START}${HEAD_HADITH}(?:${SP}+${WORD}){0,2}?${SP}*(?:[*_]{1,3})?(?=${SP}*\\r?(?:\\n|$))` +
  `|(?<![\\p{L}\\p{N}])status(?:nya)?(?![\\p{L}\\p{N}])${SP}*(?:[*_]{1,3}${SP}*)?[:\\uFF1A]` +
  `)(?:${SP}*[*_]{1,3})?`;
const prefixRe = (flags: string) => new RegExp(PREFIX_SOURCE, flags);

/** Ada awalan status hadits (untuk menahan pratinjau sejak awalan muncul, juga bila terbelah). */
export function hasHadithPrefix(text: string): boolean {
  return prefixRe("iu").test(text);
}

/** Singkatan yang titiknya bukan akhir kalimat (HR. Bukhari, w. 505 H, saw., dkk., no. 12). */
const ABBREVIATIONS = new Set([
  "al",
  "ibn",
  "bin",
  "hr",
  "r",
  "ra",
  "w",
  "saw",
  "swt",
  "as",
  "dkk",
  "dll",
  "dsb",
  "no",
  "h",
  "hlm",
  "j",
  "jil",
  "juz",
  "cet",
]);

/**
 * Indeks akhir kalimat (posisi tanda baca) atau `limit`, versi KONSERVATIF (rentang terpanjang,
 * untuk penggantian). Titik sesudah angka atau ")" ADALAH akhir kalimat (format lokasi
 * "(j. 1, h. 5)." wajib di prompt), kecuali tepat sesudah singkatan yang dikenal atau rangkaian
 * huruf bertitik ("r.a", "s.a.w").
 */
function sentenceEnd(text: string, from: number, limit: number): number {
  const re = /[.!?](?=\s|$)/gu;
  re.lastIndex = from;
  for (let m = re.exec(text); m !== null && m.index < limit; m = re.exec(text)) {
    if (text[m.index] !== ".") return m.index;
    const before = text.slice(from, m.index);
    const word = /(\p{L}+)$/u.exec(before)?.[1]?.toLowerCase();
    if (word !== undefined && ABBREVIATIONS.has(word)) continue;
    if (/(?:^|[\s(])(?:\p{L}\.)+\p{L}$/u.test(before)) continue;
    return m.index;
  }
  return limit;
}

/** Singkatan rujukan yang biasanya diikuti nama/angka berhuruf besar ("HR. Muslim", "QS. Al-…"). */
const CITE_ABBREVIATIONS = new Set(["hr", "no", "h", "hlm", "j", "jil", "juz", "w", "cet", "qs"]);

/**
 * Akhir kalimat TERDEKAT (untuk kepemilikan sitasi dan pemenggalan kalimat): tanda baca yang
 * diikuti akhir baris/teks, atau spasi + huruf besar/penanda tebal/kutip pembuka — juga sesudah
 * singkatan seperti "saw." atau "dkk." — kecuali singkatan rujukan ("HR. Muslim"). Kurung sesudah
 * titik ("r.a. (w. 59 H)") bukan awal kalimat baru. Tidak pernah melewati akhir konservatif.
 */
function nearestEnd(text: string, from: number, limit: number): number {
  const conservative = sentenceEnd(text, from, limit);
  const re = /[.!?]/gu;
  re.lastIndex = from;
  for (let m = re.exec(text); m !== null && m.index < conservative; m = re.exec(text)) {
    if (/^[ \t\u00A0\r]*$/u.test(text.slice(m.index + 1, limit))) return m.index;
    if (!/^[ \t\u00A0]+[\p{Lu}*_"“‘]/u.test(text.slice(m.index + 1, m.index + 4))) continue;
    const word = /(\p{L}+)$/u.exec(text.slice(from, m.index))?.[1]?.toLowerCase();
    if (text[m.index] === "." && word !== undefined && CITE_ABBREVIATIONS.has(word)) continue;
    return m.index;
  }
  return conservative;
}

interface Sentence {
  start: number;
  ownEnd: number;
  end: number;
}

/** Kalimat-kalimat dalam [from, to), dipenggal di akhir kalimat terdekat. */
function sentencesIn(text: string, from: number, to: number): Sentence[] {
  const out: Sentence[] = [];
  let at = from;
  while (at < to) {
    while (at < to && /\s/u.test(text[at]!)) at++;
    if (at >= to) break;
    const ownEnd = Math.min(nearestEnd(text, at, to) + 1, to);
    const end = Math.max(ownEnd, Math.min(sentenceEnd(text, at, to) + 1, to));
    out.push({ start: at, ownEnd, end });
    at = ownEnd;
  }
  return out;
}

const cleanStatus = (raw: string) =>
  raw
    .replace(/^\s*(?:[-*•·–]|\d{1,2}[.)]|[a-z][.)])\s+/u, "")
    .replace(/[*_]/gu, "")
    .trim()
    .replace(/[.;,:!?]+$/u, "")
    .trim();

/** Potong ±120 karakter di batas kata, dengan elipsis bila terpotong. */
function shortStatus(status: string): string {
  if (status.length <= 120) return status;
  const cut = status.slice(0, 120);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Penanda butir daftar di awal baris ("- ", "* ", "• ", "1. ", "a) "). */
const LIST_MARKER = /^[ \t\u00A0]*(?:[-*•·–]|\d{1,2}[.)]|[a-z][.)])[ \t\u00A0]+/u;
/** Isi baris sebelum label: hanya spasi dan (opsional) penanda daftar. */
const LINE_LEAD = /^[ \t\u00A0]*(?:(?:[-*•·–]|\d{1,2}[.)]|[a-z][.)])[ \t\u00A0]+)?$/u;
const isBlank = (s: string) => /^[ \t\u00A0\r*_]*$/u.test(s);

/**
 * Istilah penilaian hadits (Latin/Indonesia), juga kata ingkar umum ("tidak ditemukan sanadnya").
 * Dipakai untuk kalimat tambahan di baris/butir status dan paragraf di bagian status.
 */
const GRADING =
  /(?<!\p{L})(?:s[h]?[aoā]h[iī]h|ṣaḥīḥ|[hḥ]asan|[dḍ][hl]?[aoā]['ʿ’‘ʻ]?[iīy]f|lemah|palsu|dusta|ma[uw][dḍ]h?[uū]|mun(?:g)?kar|matr[uū]k|munq[aā][tṭ]h?[iī]|majh[uū]l|b[aā][tṭ]h?il|mursal|ma[uw]q[uū]f|marf[uū]|muttafaq|mu['ʿ’‘ʻ]?allaq|gharib|jayyid|kuat|hujjah|tidak|tanpa|belum)(?!\p{L})/iu;

/** Pernyataan model yang sendiri menyatakan statusnya belum/tidak diketahui atau tidak bisa ditentukan. */
const UNKNOWN_STATEMENT =
  /^(?:masih\s+)?(?:belum|tidak)\s+(?:diketahui|dapat\s+(?:ditentukan|dipastikan|diketahui))(?!\p{L})/iu;

/** Kata yang boleh ada di kalimat pengantar daftar ("sebagai berikut", "menurut al-'Iraqi:"). */
const INTRO_WORDS = new Set([
  "sebagai",
  "berikut",
  "berikutnya",
  "rincian",
  "rinciannya",
  "ringkasan",
  "ringkasnya",
  "menurut",
  "adalah",
  "ialah",
  "yaitu",
  "yakni",
  "ini",
  "itu",
  "tersebut",
  "dari",
  "dalam",
  "di",
  "bawah",
  "takhrij",
  "catatan",
  "kaki",
  "al-'iraqi",
  "al-’iraqi",
  "al-‘iraqi",
  "al-ʻiraqi",
  "al-iraqi",
  "masing-masing",
  "tiap",
  "tiap-tiap",
  "setiap",
  "semua",
  "para",
  "hadits",
  "hadis",
  "sbb",
]);

/** Kalimat pengantar daftar: hanya berisi kata pengantar (daftar putih, peninjau S21). */
function isIntro(inline: string): boolean {
  const words = inline
    .toLowerCase()
    .replaceAll(/[*_\r:：.,;()"“”]/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
  return words.length > 0 && words.every((w) => INTRO_WORDS.has(w));
}

interface Item {
  start: number;
  end: number;
}

/**
 * Butir sesudah baris label (sampai `limit` = awalan berikutnya; baris yang memuat awalan lain
 * menghentikan pencarian):
 * - "first" (baris label kosong): baris isi pertama selalu butir (juga sesudah baris kosong);
 * - "first"/"section" (baris label pengantar): baris berpenanda daftar, baris tanpa penanda tepat
 *   sesudah butir = lanjutan butir, dan paragraf sesudah baris kosong yang memuat istilah penilaian;
 * - "tight" (baris label sudah berisi status): hanya baris berpenanda daftar yang rapat (tanpa baris
 *   kosong) dan memuat istilah penilaian, supaya daftar biasa sesudahnya tidak ikut.
 */
function itemsAfter(
  text: string,
  from: number,
  limit: number,
  mode: "first" | "section" | "tight",
): Item[] {
  const items: Item[] = [];
  let at = from;
  let afterBlank = false;
  let expectFirst = mode === "first";
  while (at < limit && text[at] === "\n") {
    const lineStart = at + 1;
    const nl = text.indexOf("\n", lineStart);
    const lineEnd = nl < 0 ? text.length : nl;
    const line = text.slice(lineStart, lineEnd);
    if (lineStart >= limit || lineEnd > limit || prefixRe("iu").test(withoutNotices(line))) break;
    at = lineEnd;
    if (isBlank(line)) {
      if (mode === "tight") break;
      afterBlank = true;
      continue;
    }
    const marker = LIST_MARKER.exec(line);
    // Baris pemberitahuan pengganti (putaran ulang) tetap bagian dari bagian status, tetapi kata
    // "belum/tidak" di dalamnya tidak dihitung istilah penilaian.
    const grading = NOTICES.some((n) => line.includes(n)) || GRADING.test(withoutNotices(line));
    if (marker !== null && (mode !== "tight" || grading))
      items.push({ start: lineStart + marker[0].length, end: lineEnd });
    else if (expectFirst) items.push({ start: lineStart, end: lineEnd });
    else if (mode !== "tight" && !afterBlank && items.length > 0) items.at(-1)!.end = lineEnd;
    else if (mode !== "tight" && afterBlank && grading)
      items.push({ start: lineStart, end: lineEnd });
    else break;
    expectFirst = false;
    afterBlank = false;
  }
  return items;
}

/**
 * Pernyataan status hadits di teks gabungan, satu per KALIMAT:
 * - kalimat sesudah label "Status hadits: …" (status = isi kalimat itu saja), ditambah kalimat
 *   berikutnya di baris yang sama yang memuat istilah penilaian;
 * - butir/paragraf sesudah label yang mengakhiri baris atau berupa pengantar, atau sesudah label di
 *   awal baris (lihat `itemsAfter`): kalimat pertama tiap butir selalu pernyataan, kalimat
 *   berikutnya bila memuat istilah penilaian. Kalimat pengantar ("sebagai berikut:") sebelum butir
 *   bukan pernyataan.
 * Setiap pernyataan wajib menyitasi takhrijnya sendiri (`hadithCheck`).
 */
export function hadithStatements(text: string): HadithStatement[] {
  const out: HadithStatement[] = [];
  let groups = 0;
  const push = (start: number, from: number, s: Sentence, group: number) => {
    if (noticeAt(text, s.start) || noticeAt(text, start)) return;
    const status = cleanStatus(text.slice(from, s.ownEnd));
    if (status !== "")
      out.push({
        status: shortStatus(status),
        start,
        end: s.end,
        ownEnd: s.ownEnd,
        group,
        unknown: UNKNOWN_STATEMENT.test(status),
        prefixed: start !== from,
      });
  };
  const prefixes = [...text.matchAll(prefixRe("giu"))]
    .filter((m) => !noticeAt(text, m.index))
    .map((m) => ({ start: m.index, bodyStart: m.index + m[0].length }));
  prefixes.forEach((p, i) => {
    const nextPrefix = prefixes[i + 1]?.start ?? text.length;
    const nl = text.indexOf("\n", p.bodyStart);
    const lineEnd = Math.min(nl < 0 ? text.length : nl, nextPrefix);
    const inline = withoutNotices(text.slice(p.bodyStart, lineEnd));
    const blank = isBlank(inline);
    const atLineStart = LINE_LEAD.test(
      text.slice(text.lastIndexOf("\n", p.start - 1) + 1, p.start),
    );
    const intro = !blank && isIntro(inline);
    // Label yang mengakhiri baris atau berupa pengantar selalu membuka butir di bawahnya (juga
    // "Adapun status hadits-hadits …:"); mode rapat hanya untuk label di awal baris, supaya awalan
    // di dalam butir daftar tidak menelan butir saudaranya.
    const items =
      blank || intro
        ? itemsAfter(text, lineEnd, nextPrefix, blank ? "first" : "section")
        : atLineStart
          ? itemsAfter(text, lineEnd, nextPrefix, "tight")
          : [];
    if (!blank && !(intro && items.length > 0)) {
      const group = groups++;
      sentencesIn(text, p.bodyStart, lineEnd).forEach((s, k) => {
        if (k === 0) push(p.start, p.bodyStart, s, group);
        else if (GRADING.test(text.slice(s.start, s.ownEnd))) push(s.start, s.start, s, group);
      });
    }
    for (const it of items) {
      const group = groups++;
      sentencesIn(text, it.start, it.end).forEach((s, k) => {
        if (k === 0 || GRADING.test(text.slice(s.start, s.ownEnd)))
          push(s.start, s.start, s, group);
      });
    }
  });
  return out;
}
