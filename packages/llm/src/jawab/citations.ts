// Pemetaan sitasi Jawab (S19): `content_block_location` → `{passage_id, char_start, char_end}`
// lewat segmen dokumen yang dikirim, dan pembersihan teks model. Model hanya MENUNJUK blok; teks
// Arab yang tampil selalu disalin kode dari DB (aturan teks-arab no. 1). Huruf Arab yang ditulis
// model di luar sitasi dibuang dan dihitung.
import type { TextCitation } from "@anthropic-ai/sdk/resources/messages";

import { ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
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

export interface HadithStatement {
  /** Status ringkas berbahasa Latin, ≤120 karakter (label AI, `ai_extracted`). */
  status: string;
  /** Rentang kalimat [start, end) di teks gabungan blok (`start` termasuk penanda Markdown). */
  start: number;
  end: number;
  /** Akhir baris tempat status berakhir: batas penggantian bila status tidak didukung takhrij. */
  lineEnd: number;
}

/**
 * Awalan "Status hadits:" yang toleran (S21, ADR-064 butir 7): huruf besar/kecil, "hadits"/"hadis",
 * penanda tebal/miring di dalam atau di luar ("**Status hadits**:", "**Status hadits:**"), spasi
 * sebelum titik dua, dan titik dua lebar.
 */
const HADITH_PREFIX =
  /(?:[*_]{1,3}[ \t]*)?(?<![\p{L}\p{N}])status[ \t]+hadi(?:t)?s(?![\p{L}\p{N}])[ \t]*(?:[*_]{1,3}[ \t]*)?[:\uFF1A](?:[ \t]*[*_]{1,3})?/giu;

/** Ada awalan status hadits (untuk menahan pratinjau sejak awalan muncul, juga bila terbelah). */
export function hasHadithPrefix(text: string): boolean {
  HADITH_PREFIX.lastIndex = 0;
  const found = HADITH_PREFIX.test(text);
  HADITH_PREFIX.lastIndex = 0;
  return found;
}

/** Singkatan yang titiknya bukan akhir kalimat (HR. Bukhari, w. 505 H, r.a., saw., dkk.). */
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
  "m",
]);

/** Indeks akhir kalimat (posisi tanda baca, eksklusif sebelum), atau akhir baris. */
function sentenceEnd(text: string, from: number, lineEnd: number): number {
  const re = /[.!?](?=\s|$)/gu;
  re.lastIndex = from;
  for (let m = re.exec(text); m !== null && m.index < lineEnd; m = re.exec(text)) {
    if (text[m.index] !== ".") return m.index;
    // Kata tepat sebelum titik (mis. "HR", "w", "r.a" → "a"): singkatan = bukan akhir kalimat.
    const word = /(\p{L}+)['’"”)\]]*$/u.exec(text.slice(from, m.index))?.[1]?.toLowerCase() ?? "";
    if (word === "" || ABBREVIATIONS.has(word) || word.length === 1) continue;
    return m.index;
  }
  return lineEnd;
}

/**
 * Kalimat "Status hadits: …" di teks gabungan. Status = sisa kalimat sesudah awalan (bila awalan
 * diikuti baris baru, baris berikutnya yang tidak kosong), sampai akhir kalimat yang sadar
 * singkatan, atau akhir baris.
 */
export function hadithStatements(text: string): HadithStatement[] {
  const out: HadithStatement[] = [];
  HADITH_PREFIX.lastIndex = 0;
  for (let m = HADITH_PREFIX.exec(text); m !== null; m = HADITH_PREFIX.exec(text)) {
    const start = m.index;
    let bodyStart = m.index + m[0].length;
    // Awalan di akhir baris: status ada di baris berikutnya yang tidak kosong.
    const sameLine = /^[ \t*_]*(?=\r?\n|$)/u.exec(text.slice(bodyStart));
    if (sameLine !== null) {
      const next = /\S/u.exec(text.slice(bodyStart + sameLine[0].length));
      if (next === null) break;
      bodyStart += sameLine[0].length + next.index;
    }
    const nl = text.indexOf("\n", bodyStart);
    const lineEnd = nl < 0 ? text.length : nl;
    const end = sentenceEnd(text, bodyStart, lineEnd);
    const status = text
      .slice(bodyStart, end)
      .replace(/[*_]/gu, "")
      .trim()
      .replace(/[.;,]+$/u, "")
      .slice(0, 120)
      .trim();
    if (status !== "") out.push({ status, start, end, lineEnd });
    HADITH_PREFIX.lastIndex = Math.max(HADITH_PREFIX.lastIndex, end);
  }
  HADITH_PREFIX.lastIndex = 0;
  return out;
}
