import { indonesianSentences } from "@surau/text";

// Penyajian teks Indonesia di pembaca (X04 W1): kutipan langsung, bagian yang ditebalkan (padanan
// subjudul), paragraf ringkasan, dan label saat menyalin. Semuanya deterministik dari teks DB; isi
// kata tidak pernah berubah. Satu-satunya karakter yang diganti adalah tanda petik lurus `"` yang
// berpasangan → “ ”.

/** Satu potongan teks AI yang dirender dengan gaya tertentu. */
export interface TextRun {
  text: string;
  /** Di dalam kutipan langsung "…" (berpasangan). */
  quote: boolean;
  /** Ditebalkan (padanan subjudul). */
  bold: boolean;
}

const QUOTE = '"';

/**
 * Pasangan petik lurus dalam `text`: posisi pembuka dan penutup, berurutan (ke-1 dengan ke-2, dst.).
 * Jumlah petik ganjil = tidak berpasangan = `[]` (teks dibiarkan apa adanya).
 */
export function quotePairs(text: string): [open: number, close: number][] {
  const at: number[] = [];
  for (let i = text.indexOf(QUOTE); i !== -1; i = text.indexOf(QUOTE, i + 1)) at.push(i);
  if (at.length === 0 || at.length % 2 === 1) return [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < at.length; i += 2) pairs.push([at[i] as number, at[i + 1] as number]);
  return pairs;
}

/**
 * Potongan bergaya untuk satu segmen terjemahan AI. `offset` = posisi segmen di teks terjemahan
 * lengkap; `bold` = rentang tebal di teks lengkap (atau `null`). Gabungan `text` sama dengan
 * `text` masukan, kecuali petik berpasangan yang menjadi “ dan ”.
 */
export function aiRuns(
  text: string,
  offset = 0,
  bold: { start: number; end: number } | null = null,
): TextRun[] {
  const pairs = quotePairs(text);
  const cuts = new Set<number>([0, text.length]);
  for (const [open, close] of pairs) {
    cuts.add(open);
    cuts.add(close + 1);
  }
  if (bold !== null) {
    for (const b of [bold.start - offset, bold.end - offset]) {
      if (b > 0 && b < text.length) cuts.add(b);
    }
  }
  const points = [...cuts].sort((a, b) => a - b);
  const runs: TextRun[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i] as number;
    const end = points[i + 1] as number;
    const quote = pairs.some(([open, close]) => start >= open && end <= close + 1);
    const isBold = bold !== null && start + offset >= bold.start && end + offset <= bold.end;
    let piece = text.slice(start, end);
    if (quote) {
      const pair = pairs.find(([open, close]) => start >= open && end <= close + 1)!;
      if (start === pair[0]) piece = `“${piece.slice(1)}`;
      if (end === pair[1] + 1) piece = `${piece.slice(0, -1)}”`;
    }
    const last = runs.at(-1);
    if (last !== undefined && last.quote === quote && last.bold === isBold) last.text += piece;
    else runs.push({ text: piece, quote, bold: isBold });
  }
  return runs;
}

/**
 * Ringkasan AI dibagi menjadi paragraf 2–3 kalimat (saat dibuka penuh). ≤ 3 kalimat = satu paragraf.
 * Setiap paragraf adalah potongan teks asli dari kalimat pertama sampai terakhirnya.
 */
export function summaryParagraphs(text: string): string[] {
  const sentences = indonesianSentences(text);
  if (sentences.length <= 3) return text.trim() === "" ? [] : [text.trim()];
  const groups = Math.ceil(sentences.length / 3);
  const base = Math.floor(sentences.length / groups);
  const extra = sentences.length % groups;
  const out: string[] = [];
  let at = 0;
  for (let g = 0; g < groups; g++) {
    const size = base + (g < extra ? 1 : 0);
    const first = sentences[at]!;
    const last = sentences[at + size - 1]!;
    out.push(text.slice(first.start, last.end));
    at += size;
  }
  return out;
}

/** Potongan teks yang disalin, beserta asalnya (untuk label salinan). */
export interface CopyPiece {
  text: string;
  /**
   * "ai" = terjemahan AI, "summary" = ringkasan AI, "ayah" = terjemahan Kemenag, "plain" = teks
   * lain (mis. Arab).
   */
  kind: "ai" | "summary" | "ayah" | "plain";
  /** Identitas segmen: label ditambahkan setiap kali satu segmen AI/ayat selesai. */
  group: string;
  /** Blok asal (paragraf, terjemahan): antarblok dipisah baris baru. */
  block: string;
  /** Permalink lengkap paragraf (segmen AI). */
  url?: string;
  /** Label ayat, mis. "QS 2:255 · Terjemahan Kemenag" (segmen ayat). */
  label?: string;
  /** Label ayat sudah ikut terseleksi (tidak perlu ditambahkan lagi). */
  labelIncluded?: boolean;
}

/**
 * Teks salinan dengan label per segmen (teks-arab.md aturan 8–9): sesudah setiap potongan
 * terjemahan AI ditambahkan "(Terjemahan AI, <permalink>)", sesudah ringkasan AI "(Ringkasan AI, …)",
 * sesudah terjemahan ayat "(QS s:a · Terjemahan Kemenag)" bila labelnya belum ikut terseleksi. Teks
 * lain apa adanya.
 */
export function labelledCopy(
  pieces: readonly CopyPiece[],
  labels: { ai: string; summary: string },
): string {
  let out = "";
  let prev: CopyPiece | undefined;
  // Label disisipkan sebelum spasi penutup segmen, supaya jarak ke teks berikutnya tetap.
  const insert = (label: string) => {
    const trailing = /\s*$/u.exec(out)?.index ?? out.length;
    out = `${out.slice(0, trailing)} (${label})${out.slice(trailing)}`;
  };
  const close = (p: CopyPiece | undefined) => {
    if (p === undefined) return;
    if (p.kind === "ai") insert(`${labels.ai}${p.url ? `, ${p.url}` : ""}`);
    if (p.kind === "summary") insert(`${labels.summary}${p.url ? `, ${p.url}` : ""}`);
    if (p.kind === "ayah" && !p.labelIncluded && p.label) insert(p.label);
  };
  for (const p of pieces) {
    if (p.text === "") continue;
    if (prev !== undefined && prev.group !== p.group) close(prev);
    if (prev !== undefined && prev.block !== p.block) out = `${out.trimEnd()}\n`;
    out += prev !== undefined && prev.block !== p.block ? p.text.trimStart() : p.text;
    prev = p;
  }
  close(prev);
  return out.trim();
}
