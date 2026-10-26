// Dokumen Citations untuk Jawab (S19). Satu dokumen *custom content* per paragraf atau catatan
// kaki: blok-bloknya adalah potongan `text_raw` yang bersambung persis (offset UTF-16), sehingga
// indeks blok yang dikutip model selalu bisa dipetakan balik ke `{passage_id, char_start,
// char_end}` tanpa membaca `cited_text` (docs Citations: indeks blok 0-based, akhir eksklusif).
import type { DocumentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import type { AnswerPassage, AnswerTocNode } from "@surau/core";

export interface DocSegment {
  start: number;
  end: number;
}

export interface AnswerDoc {
  passage: AnswerPassage;
  segments: DocSegment[];
  /** Konteks dokumen (tidak bisa dikutip). */
  context: string;
  /** Perkiraan token dokumen ini (`estimateTextTokens` + overhead). */
  tokens: number;
}

/** Paragraf sependek ini (karakter) dikirim sebagai satu blok. */
export const SEGMENT_SINGLE_MAX = 600;
/** Panjang sasaran satu blok bila paragraf dipecah. */
export const SEGMENT_TARGET = 400;
const SEGMENT_MIN = 120;

// Akhir kalimat: titik, tanda tanya/seru (Latin dan Arab ؟), titik dua, titik koma Arab (؛),
// lalu spasi. Koma Arab (،) hanya dipakai bila tidak ada akhir kalimat dalam jangkauan.
const SENTENCE_END = /[.!?:؟؛]\s+/gu;
const CLAUSE_END = /[،,]\s+/gu;

function boundaries(text: string, pattern: RegExp): number[] {
  return [...text.matchAll(pattern)].map((m) => m.index + m[0].length);
}

/**
 * Pecah teks menjadi potongan bersambung yang menutup seluruh teks (`[0, length)`), masing-masing
 * berisi huruf (bukan hanya spasi). Potongan dipotong sesudah akhir kalimat bila ada; bila tidak,
 * sesudah koma; bila tidak juga, di spasi terakhir. Teks tidak pernah diubah. Teks sepanjang
 * `singleMax` atau kurang menjadi satu potongan (Intisari memakai sasaran lebih kecil, X15b).
 */
export function segmentText(
  text: string,
  target = SEGMENT_TARGET,
  singleMax = SEGMENT_SINGLE_MAX,
): DocSegment[] {
  if (text.length <= Math.max(singleMax, target)) return [{ start: 0, end: text.length }];
  const sentence = boundaries(text, SENTENCE_END);
  const clause = boundaries(text, CLAUSE_END);
  const out: DocSegment[] = [];
  let start = 0;
  while (text.length - start > target * 1.5) {
    const lo = start + SEGMENT_MIN;
    const hi = start + target;
    const last = (list: number[], max: number) => list.filter((b) => b >= lo && b <= max).at(-1);
    const wide = start + target * 1.5;
    let cut = last(sentence, hi) ?? last(sentence, wide) ?? last(clause, hi) ?? last(clause, wide);
    if (cut === undefined) {
      const space = text.lastIndexOf(" ", hi);
      cut = space > lo ? space + 1 : hi;
    }
    // Jangan memotong surrogate pair.
    const code = text.charCodeAt(cut);
    if (code >= 0xdc00 && code <= 0xdfff) cut += 1;
    out.push({ start, end: cut });
    start = cut;
  }
  out.push({ start, end: text.length });
  // Gabungkan potongan tanpa huruf ke potongan sebelumnya (API menolak blok teks kosong).
  const merged: DocSegment[] = [];
  for (const seg of out) {
    const last = merged.at(-1);
    if (last !== undefined && text.slice(seg.start, seg.end).trim() === "") last.end = seg.end;
    else merged.push({ ...seg });
  }
  if (merged.length > 1 && text.slice(merged[0]!.start, merged[0]!.end).trim() === "") {
    merged[1]!.start = 0;
    merged.shift();
  }
  return merged;
}

// Perkiraan token, dikalibrasi 2026-10-20 dengan count_tokens Haiku 5.5 atas 1–19 dokumen Ihya
// (`pnpm run jawab:gateway-check`, regresi linear, galat ≤9 token): huruf Arab 0,7 token/karakter
// (sama dengan ARSITEKTUR §8), huruf lain (Indonesia/Latin) ±0,51, ±93 token per dokumen
// (judul, konteks, pembungkus Citations), dan ±2.360 token tetap (sistem + pertanyaan + tambahan
// Citations). Faktor dibulatkan ke atas supaya anggaran tidak terlampaui.
const ARABIC = /\p{Script=Arabic}/u;
export function estimateTextTokens(text: string): number {
  let arabic = 0;
  let other = 0;
  for (const ch of text) {
    if (ARABIC.test(ch)) arabic++;
    else other++;
  }
  return Math.ceil(arabic * 0.7 + other * 0.53);
}
const DOC_OVERHEAD = 95;
const BLOCK_OVERHEAD = 8;

/**
 * Kitab Ihya = node tingkat 2 berjudul "كتاب …" (tingkat 1 = rub' atau muqaddimah; anak
 * muqaddimah bukan kitab).
 */
const isKitab = (n: AnswerTocNode) => n.level === 2 && n.title_ar.trimStart().startsWith("كتاب");

/**
 * Jalur bagian: dua judul terdekat, didahului judul kitab bila kitab tidak termasuk di dalamnya
 * (paragraf di bab/pasal yang dalam). Tanpa judul kitab, model menebak nama kitab dari isi
 * paragraf (penilaian agent 2026-10-26, j022: Kitab Dzamm al-Jah wa ar-Riya' disebut "bab riya
 * pada puasa").
 */
export function sectionPath(
  tocId: number | null,
  toc: ReadonlyMap<number, AnswerTocNode>,
  depth = 2,
): string {
  const chain: AnswerTocNode[] = [];
  let node = tocId === null ? undefined : toc.get(tocId);
  while (node !== undefined && chain.length < 32) {
    chain.unshift(node);
    node = node.parent_id === null ? undefined : toc.get(node.parent_id);
  }
  const near = chain.slice(-depth);
  const kitab = chain.find(isKitab);
  const titles = near.map((n) => n.title_ar);
  if (kitab !== undefined && !near.includes(kitab)) {
    const gap = chain.indexOf(kitab) < chain.length - depth - 1;
    titles.unshift(gap ? `${kitab.title_ar} › …` : kitab.title_ar);
  }
  return titles.join(" › ");
}

/**
 * Konteks dokumen (tidak bisa dikutip): jenis, bagian, ayat, terjemahan AI berlabel. `echoes` =
 * pasangan gema (ADR-112, paragraf → takhrij kemunculan pertama hadits yang sama).
 */
export function docContext(
  p: AnswerPassage,
  toc: ReadonlyMap<number, AnswerTocNode>,
  labelOf: ReadonlyMap<number, string>,
  echoes: ReadonlyMap<number, readonly number[]> = new Map(),
): string {
  const lines: string[] = [];
  const labels = (ids: Iterable<number>) =>
    [...new Set([...ids].map((id) => labelOf.get(id)).filter((l) => l !== undefined))].join("; ");
  const echoedBy = [...echoes].filter(([, feet]) => feet.includes(p.id)).map(([id]) => id);
  if (p.kind === "foot") {
    const refs = labels(p.referenced_by);
    lines.push(
      `Jenis: catatan kaki, takhrij hadits oleh al-'Iraqi${refs ? ` untuk hadits di paragraf ${refs}` : ""}.`,
    );
    const again = labels(echoedBy);
    if (again)
      lines.push(
        `Lafaz hadits yang sama muncul lagi di ${again}; al-'Iraqi hanya menakhrijnya di sini, pada kemunculan pertamanya (dicocokkan sistem dari lafaznya).`,
      );
  } else {
    lines.push("Jenis: matan Ihya (perkataan al-Ghazali, termasuk yang ia nukil).");
    if (p.footnote_ids.length > 0) lines.push("Paragraf ini punya catatan kaki takhrij.");
    const first = labels(echoes.get(p.id) ?? []);
    if (first)
      lines.push(
        `Hadits di paragraf ini yang tanpa takhrij sendiri ditakhrij al-'Iraqi di kemunculan pertamanya: ${first}.`,
      );
  }
  const path = sectionPath(p.toc_node_id, toc);
  if (path !== "") lines.push(`Bagian: ${path}`);
  // Keterangan (bukan perintah: isi dokumen adalah data) bahwa ayat ditampilkan sistem dari
  // rujukannya (j019: Haiku memparafrasekan ayat yang dipakai berdalil); aturannya di prompt.
  if (p.ayah_labels.length > 0)
    lines.push(
      `Ayat yang dikutip: ${p.ayah_labels.join(", ")} (bunyi dan terjemahan resminya ditampilkan sistem dari rujukan ini).`,
    );
  if (p.translation !== null)
    lines.push(`Terjemahan AI (bisa keliru; ⟦QS⟧ = ayat): ${p.translation.text}`);
  return lines.join("\n");
}

/**
 * Label lokasi untuk judul dokumen dan rujukan antar dokumen, mis. "Ihya j. 1, h. 55". Tanpa
 * nomor paragraf: model menyalinnya ke jawaban (eval S19), padahal pembaca merujuk halaman cetak.
 */
export function docLabel(p: AnswerPassage): string {
  return `Ihya j. ${p.location.juz}, h. ${p.location.page_no}${p.kind === "foot" ? " (catatan kaki)" : ""}`;
}

export function buildDoc(passage: AnswerPassage, context: string): AnswerDoc {
  // Catatan kaki dikirim utuh (satu blok bila ≤2.000 karakter) supaya sitasi takhrij = seluruh
  // catatan kaki, sama dengan bentang gold eval.
  const segments =
    passage.kind === "foot" && passage.text_raw.length <= 2000
      ? [{ start: 0, end: passage.text_raw.length }]
      : segmentText(passage.text_raw);
  const tokens =
    DOC_OVERHEAD +
    segments.length * BLOCK_OVERHEAD +
    estimateTextTokens(passage.text_raw) +
    estimateTextTokens(context);
  return { passage, segments, context, tokens };
}

export function toDocumentBlock(doc: AnswerDoc): DocumentBlockParam {
  const text = doc.passage.text_raw;
  return {
    type: "document",
    source: {
      type: "content",
      content: doc.segments.map((s) => ({
        type: "text" as const,
        text: text.slice(s.start, s.end),
      })),
    },
    title: docLabel(doc.passage),
    context: doc.context,
    citations: { enabled: true },
  };
}
