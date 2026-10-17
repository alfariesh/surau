// Unit kerja LLM (S13) dari baris korpus: satu unit terjemahan per paragraf badan dan unit ringkasan
// per simpul daftar isi. Fungsi yang sama dipakai saat membuat request batch DAN saat ingest memuat
// hasilnya, sehingga hash sumber (`sourceSha256`) bisa dibandingkan: bila teks atau rujukan ayat
// berubah sesudah batch dibuat, hasil lama dianggap usang dan tidak dimuat (terjemahannya bisa saja
// memuat ayat yang kini dikenali, atau kehilangan placeholder).
import { createHash } from "node:crypto";

import { maskAyat } from "@surau/core";
import type { AyahRef, FootnoteRef, MaskedPassage } from "@surau/core";
import type { FootnoteRefRow, PageRow, PassageAyahRefRow, PassageRow, TocNodeRow } from "@surau/db";
import { contentLength, letterLength } from "@surau/llm";
import type { TranslateInput } from "@surau/llm";

export interface UnitRows {
  page: readonly PageRow[];
  toc_node: readonly TocNodeRow[];
  passage: readonly PassageRow[];
  footnote_ref: readonly FootnoteRefRow[];
  passage_ayah_ref: readonly PassageAyahRefRow[];
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Pemisah jalur judul daftar isi di konteks prompt. */
export const HEADING_SEPARATOR = " › ";

export interface TranslationUnit extends TranslateInput {
  tocNodeId: number | null;
  /** sha256 teks bertanda yang diterjemahkan (deteksi hasil usang). */
  sourceSha256: string;
}

export interface UnitIssue {
  passageId: number;
  detail: string;
}

export interface TranslationUnits {
  units: TranslationUnit[];
  /**
   * Paragraf yang rujukan ayatnya dilewati `maskAyat` (offset rusak/tumpang tindih): teks ayatnya
   * masih ada di teks bertanda, jadi paragraf ini TIDAK boleh dikirim ke LLM.
   */
  blocked: UnitIssue[];
}

function groupBy<T>(rows: readonly T[], key: (r: T) => number): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list === undefined) out.set(k, [r]);
    else list.push(r);
  }
  return out;
}

function toAyahRef(r: PassageAyahRefRow): AyahRef {
  return {
    char_start: r.char_start,
    char_end: r.char_end,
    surah: r.surah,
    ayah_from: r.ayah_from,
    ayah_to: r.ayah_to,
    match: r.match,
    partial: r.partial === 1,
    bracketed: r.bracketed === 1,
    alt_count: r.alt_count,
    label: "",
  };
}

function toFootnoteRef(r: FootnoteRefRow): FootnoteRef {
  return {
    marker: r.marker,
    char_start: r.char_start,
    char_end: r.char_end,
    footnote_id: r.footnote_passage_id,
  };
}

/** Paragraf badan dalam urutan baca (juz, halaman cetak, ord); tidak pernah menurut id. */
export function bodyInReadingOrder(rows: UnitRows): PassageRow[] {
  const page = new Map(rows.page.map((p) => [p.id, p]));
  const key = (p: PassageRow): [number, number, number] => {
    const pg = page.get(p.page_id);
    if (pg === undefined) throw new Error(`paragraf ${p.id}: halaman ${p.page_id} tidak ada`);
    return [pg.juz, pg.page_no, p.ord];
  };
  return rows.passage
    .filter((p) => p.kind === "body")
    .map((p) => ({ p, k: key(p) }))
    .toSorted((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2])
    .map((x) => x.p);
}

/** Jalur judul dari akar sampai simpul (teks Arab persis dari DB). */
export function headingPaths(nodes: readonly TocNodeRow[]): Map<number, string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<number, string>();
  const path = (id: number): string => {
    const known = out.get(id);
    if (known !== undefined) return known;
    const n = byId.get(id);
    if (n === undefined) throw new Error(`simpul daftar isi ${id} tidak ada`);
    const p =
      n.parent_id === null ? n.title_ar : `${path(n.parent_id)}${HEADING_SEPARATOR}${n.title_ar}`;
    out.set(id, p);
    return p;
  };
  for (const n of nodes) path(n.id);
  return out;
}

export interface MaskedBody {
  passage: PassageRow;
  masked: MaskedPassage;
  markers: string[];
  /** Jumlah rujukan ayat paragraf ini di `passage_ayah_ref`. */
  refCount: number;
}

/** Semua paragraf badan dalam urutan baca, sudah bertanda ayat. */
export function maskedBodies(rows: UnitRows): MaskedBody[] {
  const refs = groupBy(rows.passage_ayah_ref, (r) => r.passage_id);
  const notes = groupBy(rows.footnote_ref, (r) => r.passage_id);
  return bodyInReadingOrder(rows).map((p) => {
    const ayah = (refs.get(p.id) ?? []).map(toAyahRef);
    const foot = (notes.get(p.id) ?? []).toSorted((a, b) => a.char_start - b.char_start);
    return {
      passage: p,
      masked: maskAyat(p.text_raw, ayah, foot.map(toFootnoteRef)),
      markers: foot.map((f) => f.marker),
      refCount: ayah.length,
    };
  });
}

export function translationUnits(rows: UnitRows): TranslationUnits {
  const headings = headingPaths(rows.toc_node);
  const units: TranslationUnit[] = [];
  const blocked: UnitIssue[] = [];
  let prev: MaskedBody | null = null;
  for (const b of maskedBodies(rows)) {
    const p = b.passage;
    if (b.masked.slots.length !== b.refCount) {
      blocked.push({
        passageId: p.id,
        detail: `${b.refCount - b.masked.slots.length} dari ${b.refCount} rujukan ayat tidak bisa ditandai`,
      });
      // Teksnya masih memuat ayat: tidak boleh ikut terkirim sebagai konteks paragraf berikutnya.
      prev = null;
      continue;
    } else {
      const sameSection = prev !== null && prev.passage.toc_node_id === p.toc_node_id;
      units.push({
        passageId: p.id,
        tocNodeId: p.toc_node_id,
        heading: p.toc_node_id === null ? "" : (headings.get(p.toc_node_id) ?? ""),
        previous: sameSection && prev !== null ? prev.masked.text : null,
        masked: b.masked,
        markers: b.markers,
        sourceSha256: sha256(b.masked.text),
      });
    }
    prev = b;
  }
  return { units, blocked };
}

// ── Ringkasan ────────────────────────────────────────────────────────────────────────────────

/** Satu request ringkasan putaran 1 (simpul utuh, atau satu potongan paragraf milik simpul). */
export interface SummaryChunk {
  tocNodeId: number;
  heading: string;
  /** 1..parts */
  part: number;
  parts: number;
  /** `true` = ringkasan final simpul daun (custom_id tanpa -p<k>). */
  final: boolean;
  text: string;
  /** Perkiraan token dari jumlah karakter (pemecahan); jumlah pasti dari count_tokens. */
  estTokens: number;
  sourceSha256: string;
}

export interface SummaryNode {
  tocNodeId: number;
  heading: string;
  /** Ringkasan finalnya dibuat di putaran 2 (simpul induk, atau daun yang terpecah). */
  round2: boolean;
  /** Potongan putaran 1 di subpohon simpul ini, urut baca (masukan putaran 2). */
  subtree: SummaryChunk[];
  /** sha256 gabungan hash potongan subpohon (deteksi ringkasan usang). */
  sourceSha256: string;
}

export interface SummaryPlan {
  chunks: SummaryChunk[];
  nodes: SummaryNode[];
}

/**
 * Batas potongan (token perkiraan). Jauh di bawah batas 100k request Haiku 5.5 (prompt sistem
 * ±3 ribu token ikut dihitung), dan cukup kecil supaya model tidak kehilangan detail.
 */
export const CHUNK_MAX_TOKENS = 50_000;
/**
 * Paragraf milik simpul INDUK sependek ini (huruf, tanpa harakat) biasanya hanya judulnya sendiri:
 * tidak diringkas (17 simpul di Ihya), ringkasan induk dibuat dari subbagiannya saja.
 */
export const PARENT_OWN_MIN_LETTERS = 80;

/**
 * Token per karakter teks Arab Ihya di tokenizer Claude Haiku 5.5: 0,716 diukur S13 dengan
 * count_tokens pada 200 paragraf acak (`pnpm llm tokens`, data/reports/ihya-9472-token.md),
 * dibulatkan ke atas. Hanya untuk perkiraan pemecahan; setiap request tetap dicek pasti.
 */
export const MEASURED_TOKENS_PER_CHAR = 0.72;
export const TOKENS_PER_CHAR = MEASURED_TOKENS_PER_CHAR;

function pageLabel(pg: PageRow): string {
  return `[${pg.juz}/${pg.page_no}]`;
}

/** Teks satu halaman milik satu simpul: penanda halaman lalu paragraf-paragrafnya. */
interface PageBlock {
  text: string;
  chars: number;
}

function pageBlocks(bodies: readonly MaskedBody[], page: Map<number, PageRow>): PageBlock[] {
  const blocks: PageBlock[] = [];
  let current: { pageId: number; lines: string[] } | null = null;
  const flush = () => {
    if (current === null) return;
    const pg = page.get(current.pageId);
    if (pg === undefined) throw new Error(`halaman ${current.pageId} tidak ada`);
    const text = `${pageLabel(pg)} ${current.lines.join("\n")}`;
    blocks.push({ text, chars: contentLength(text) });
  };
  for (const b of bodies) {
    if (current === null || current.pageId !== b.passage.page_id) {
      flush();
      current = { pageId: b.passage.page_id, lines: [] };
    }
    current.lines.push(b.masked.text);
  }
  flush();
  return blocks;
}

/** Pecah blok halaman menjadi potongan ≤ `maxTokens` perkiraan (halaman tidak pernah dibelah). */
export function splitPages(
  blocks: readonly PageBlock[],
  maxTokens = CHUNK_MAX_TOKENS,
  tokensPerChar = TOKENS_PER_CHAR,
): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let tokens = 0;
  for (const b of blocks) {
    const t = b.chars * tokensPerChar;
    if (current.length > 0 && tokens + t > maxTokens) {
      chunks.push(current);
      current = [];
      tokens = 0;
    }
    current.push(b.text);
    tokens += t;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function summaryPlan(
  rows: UnitRows,
  opts: { maxTokens?: number; tokensPerChar?: number } = {},
): SummaryPlan {
  const tokensPerChar = opts.tokensPerChar ?? TOKENS_PER_CHAR;
  const headings = headingPaths(rows.toc_node);
  const page = new Map(rows.page.map((p) => [p.id, p]));
  // Paragraf terblokir (rujukan ayat tak bisa ditandai) tidak ikut diringkas: teksnya memuat ayat.
  const bySection = groupBy(
    maskedBodies(rows).filter(
      (b) => b.passage.toc_node_id !== null && b.masked.slots.length === b.refCount,
    ),
    (b) => b.passage.toc_node_id ?? 0,
  );
  const children = groupBy(
    rows.toc_node.filter((n) => n.parent_id !== null),
    (n) => n.parent_id ?? 0,
  );
  for (const list of children.values()) list.sort((a, b) => a.ord - b.ord);
  const roots = rows.toc_node.filter((n) => n.parent_id === null).toSorted((a, b) => a.ord - b.ord);

  const chunks: SummaryChunk[] = [];
  const nodes: SummaryNode[] = [];
  const own = new Map<number, SummaryChunk[]>();
  for (const n of rows.toc_node) {
    const bodies = bySection.get(n.id) ?? [];
    if (bodies.length === 0) continue;
    const isLeaf = (children.get(n.id) ?? []).length === 0;
    const blocks = pageBlocks(bodies, page);
    const letters = bodies.reduce((a, b) => a + letterLength(b.masked.text), 0);
    if (!isLeaf && letters < PARENT_OWN_MIN_LETTERS) continue;
    const split = splitPages(blocks, opts.maxTokens, tokensPerChar);
    const list = split.map((pages, i): SummaryChunk => {
      const text = pages.join("\n");
      return {
        tocNodeId: n.id,
        heading: headings.get(n.id) ?? n.title_ar,
        part: i + 1,
        parts: split.length,
        final: isLeaf && split.length === 1,
        text,
        estTokens: Math.ceil(contentLength(text) * tokensPerChar),
        sourceSha256: sha256(text),
      };
    });
    own.set(n.id, list);
  }

  // Urut baca subpohon: potongan milik simpul sendiri (pengantar) lalu anak-anaknya menurut `ord`.
  const subtree = (id: number): SummaryChunk[] => [
    ...(own.get(id) ?? []),
    ...(children.get(id) ?? []).flatMap((c) => subtree(c.id)),
  ];
  const visit = (n: TocNodeRow) => {
    const mine = own.get(n.id) ?? [];
    chunks.push(...mine);
    const sub = subtree(n.id);
    const isLeaf = (children.get(n.id) ?? []).length === 0;
    if (sub.length > 0) {
      nodes.push({
        tocNodeId: n.id,
        heading: headings.get(n.id) ?? n.title_ar,
        round2: !(isLeaf && mine.length === 1),
        subtree: sub,
        sourceSha256: sha256(sub.map((c) => c.sourceSha256).join("\n")),
      });
    }
    for (const c of children.get(n.id) ?? []) visit(c);
  };
  for (const r of roots) visit(r);
  return { chunks, nodes };
}
