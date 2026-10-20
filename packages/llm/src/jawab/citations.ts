// Pemetaan sitasi Jawab (S19): `content_block_location` → `{passage_id, char_start, char_end}`
// lewat segmen dokumen yang dikirim, dan pembersihan teks model. Model hanya MENUNJUK blok; teks
// Arab yang tampil selalu disalin kode dari DB (aturan teks-arab no. 1). Huruf Arab yang ditulis
// model di luar sitasi dibuang dan dihitung.
import type { TextCitation } from "@anthropic-ai/sdk/resources/messages";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
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

// Huruf Arab (termasuk angka Arab-India, harakat, dan bentuk presentasi) dalam satu rentang.
const ARABIC_RUN = /[\p{Script=Arabic}٠-٩]+(?:[\sـ]+[\p{Script=Arabic}٠-٩]+)*/gu;

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

/** Jawaban penolakan baku (prompt `answer@1`). */
export function isNotFound(text: string): boolean {
  const head = text.trimStart().replace(/^[*_#>\s]+/u, "");
  return head.startsWith(ANSWER_NOT_FOUND.slice(0, -1));
}

export interface HadithStatement {
  /** Status ringkas berbahasa Latin, ≤120 karakter (label AI, `ai_extracted`). */
  status: string;
  /** Rentang [start, end) di teks gabungan blok. */
  start: number;
  end: number;
}

/** Kalimat "Status hadits: …" di teks gabungan, sampai akhir kalimat atau baris. */
export function hadithStatements(text: string): HadithStatement[] {
  const out: HadithStatement[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(ANSWER_HADITH_PREFIX, from);
    if (at < 0) return out;
    const bodyStart = at + ANSWER_HADITH_PREFIX.length;
    const rest = text.slice(bodyStart);
    const stop = rest.search(/(?<!\b(?:al|ibn|Ibn|no|h|j))\.(?:\s|$)|\n/u);
    const end = stop < 0 ? text.length : bodyStart + stop;
    const status = text
      .slice(bodyStart, end)
      .replace(/[*_]/gu, "")
      .trim()
      .replace(/[.;,]+$/u, "")
      .slice(0, 120)
      .trim();
    if (status !== "") out.push({ status, start: at, end });
    from = end + 1;
  }
}
