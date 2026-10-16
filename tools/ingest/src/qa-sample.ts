// QA sampel halaman korpus (S10, FASE.md syarat rilis R1): pilih halaman acak dengan seed tetap,
// lalu bandingkan baris D1 dengan baris yang dibangun ulang dari sumber Shamela, byte demi byte.
// Modul ini murni (tanpa wrangler/fs), supaya bisa diuji dengan baris buatan.
import { createHash } from "node:crypto";

import type { FootnoteRefRow, PageRow, PassageNeedsReviewRow, PassageRow } from "@surau/db";

import type { WorkConfig } from "./works/ihya.ts";

/** PRNG mulberry32: deterministik di semua platform, cukup untuk memilih sampel. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` ID berbeda dari `ids` (Fisher–Yates parsial dengan seed), dikembalikan terurut naik. */
export function samplePages(ids: readonly number[], n: number, seed: number): number[] {
  if (n > ids.length) throw new Error(`sampel ${n} > ${ids.length} halaman`);
  const pool = [...ids].sort((a, b) => a - b);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j] as number, pool[i] as number];
  }
  return pool.slice(0, n).sort((a, b) => a - b);
}

/** Semua baris korpus milik satu halaman. */
export interface PageBundle {
  page: PageRow;
  passages: PassageRow[];
  refs: FootnoteRefRow[];
  review: PassageNeedsReviewRow[];
}

export interface RowSet {
  page: readonly PageRow[];
  passage: readonly PassageRow[];
  footnote_ref: readonly FootnoteRefRow[];
  passage_needs_review: readonly PassageNeedsReviewRow[];
}

const KIND_ORDER = { body: 0, foot: 1 } as const;

/** Kelompokkan baris per halaman, terurut kanonis (jenis, urutan / paragraf, offset / alasan). */
export function bundlePages(rows: RowSet, pageIds: readonly number[]): Map<number, PageBundle> {
  const wanted = new Set(pageIds);
  const out = new Map<number, PageBundle>();
  for (const page of rows.page) {
    if (wanted.has(page.id)) out.set(page.id, { page, passages: [], refs: [], review: [] });
  }
  const pageOf = new Map<number, PageBundle>();
  for (const p of rows.passage) {
    const b = out.get(p.page_id);
    if (b === undefined) continue;
    b.passages.push(p);
    pageOf.set(p.id, b);
  }
  for (const r of rows.footnote_ref) pageOf.get(r.passage_id)?.refs.push(r);
  for (const r of rows.passage_needs_review) pageOf.get(r.passage_id)?.review.push(r);
  for (const b of out.values()) {
    b.passages.sort((x, y) => KIND_ORDER[x.kind] - KIND_ORDER[y.kind] || x.ord - y.ord);
    b.refs.sort((x, y) => x.passage_id - y.passage_id || x.char_start - y.char_start);
    b.review.sort((x, y) => x.passage_id - y.passage_id || x.reason.localeCompare(y.reason));
  }
  return out;
}

/** Posisi byte UTF-8 pertama yang berbeda (atau panjang yang lebih pendek bila satu awalan lainnya). */
function firstDiff(a: Buffer, b: Buffer): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

function sameFields(a: object, b: object): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return (
    ka.length === kb.length &&
    ka.every(
      (k, i) =>
        k === kb[i] && (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k],
    )
  );
}

/**
 * Perbedaan antara baris harapan (dari sumber) dan baris D1 untuk satu halaman. Pesan hanya memuat
 * ID, offset, dan jumlah byte: teks kitab tidak pernah ditulis ke laporan.
 */
export function comparePage(expected: PageBundle, actual: PageBundle | undefined): string[] {
  if (actual === undefined) return ["halaman tidak ada di D1"];
  const diffs: string[] = [];
  if (!sameFields(expected.page, actual.page)) diffs.push("baris page berbeda");
  if (expected.passages.length !== actual.passages.length) {
    diffs.push(`jumlah paragraf ${actual.passages.length}, harapan ${expected.passages.length}`);
  }
  const n = Math.min(expected.passages.length, actual.passages.length);
  for (let i = 0; i < n; i++) {
    const e = expected.passages[i] as PassageRow;
    const a = actual.passages[i] as PassageRow;
    const { text_raw: et, ...eMeta } = e;
    const { text_raw: at, ...aMeta } = a;
    if (!sameFields(eMeta, aMeta))
      diffs.push(`paragraf #${i + 1} (${e.id}): kolom selain teks berbeda`);
    const eb = Buffer.from(et, "utf8");
    const ab = Buffer.from(at, "utf8");
    if (!eb.equals(ab)) {
      diffs.push(
        `paragraf ${e.id}: text_raw beda mulai byte ${firstDiff(eb, ab)} (harapan ${eb.length} byte, D1 ${ab.length})`,
      );
    }
  }
  const refKey = (r: FootnoteRefRow): string =>
    `${r.passage_id}:${r.char_start}-${r.char_end}→${r.footnote_passage_id}:${Buffer.from(r.marker).toString("hex")}`;
  const er = expected.refs.map(refKey).join("|");
  const ar = actual.refs.map(refKey).join("|");
  if (er !== ar) {
    diffs.push(
      `tautan penanda berbeda (${actual.refs.length} di D1, harapan ${expected.refs.length})`,
    );
  }
  const revKey = (r: PassageNeedsReviewRow): string => `${r.passage_id}:${r.reason}`;
  if (expected.review.map(revKey).join("|") !== actual.review.map(revKey).join("|")) {
    diffs.push(
      `tanda perlu ditinjau berbeda (${actual.review.length} di D1, harapan ${expected.review.length})`,
    );
  }
  return diffs;
}

/** Ringkasan satu halaman untuk laporan (tanpa teks): jumlah, byte, dan sha256 isi. */
export interface PageSummary {
  body: number;
  foot: number;
  refs: number;
  review: number;
  bytes: number;
  sha256: string;
}

export function summarize(b: PageBundle): PageSummary {
  const hash = createHash("sha256");
  let bytes = 0;
  for (const p of b.passages) {
    const t = Buffer.from(p.text_raw, "utf8");
    bytes += t.length;
    hash.update(`${p.id}\0${p.kind}\0${p.ord}\0`).update(t).update("\0");
  }
  for (const r of b.refs)
    hash.update(
      `${r.passage_id}:${r.char_start}:${r.char_end}:${r.footnote_passage_id}:${r.marker}\0`,
    );
  return {
    body: b.passages.filter((p) => p.kind === "body").length,
    foot: b.passages.filter((p) => p.kind === "foot").length,
    refs: b.refs.length,
    review: new Set(b.review.map((r) => r.passage_id)).size,
    bytes,
    sha256: hash.digest("hex"),
  };
}

/**
 * Pilih `n` halaman untuk dicocokkan manusia dengan edisi cetak: hanya yang punya catatan kaki
 * (takhrij ikut diperiksa), bergiliran per juz supaya keempat jilid terwakili.
 */
export function pickForHuman(
  pages: readonly { page: PageRow; summary: PageSummary }[],
  n: number,
): PageRow[] {
  const byJuz = new Map<number, PageRow[]>();
  for (const { page, summary } of pages) {
    if (summary.foot === 0) continue;
    byJuz.set(page.juz, [...(byJuz.get(page.juz) ?? []), page]);
  }
  const queues = [...byJuz.entries()].sort(([a], [b]) => a - b).map(([, q]) => [...q]);
  const out: PageRow[] = [];
  while (out.length < n && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next !== undefined && out.length < n) out.push(next);
    }
  }
  return out.sort((a, b) => a.id - b.id);
}

/** Tautan pindaian edisi cetak untuk satu halaman, atau null bila kitab tidak punya data pindaian. */
export function scanUrl(config: WorkConfig, juz: number, pageNo: number): string | null {
  const v = config.scan?.volumes[juz - 1];
  if (config.scan === undefined || v === undefined) return null;
  return `${config.scan.details}/${v.file}/page/n${pageNo + v.leafOffset}/mode/1up`;
}

/**
 * Bandingkan dua kumpulan baris (mis. edition, toc_node, meta) per kunci: baris hilang, baris
 * lebih, atau kolom berbeda. Pesan hanya menyebut tabel, kunci, dan nama kolom (tanpa isi teks).
 */
export function compareRows<T extends object>(
  table: string,
  expected: readonly T[],
  actual: readonly T[],
  key: (row: T) => string,
  ignore: readonly string[] = [],
): string[] {
  const strip = (row: T): Record<string, unknown> =>
    Object.fromEntries(Object.entries(row).filter(([k]) => !ignore.includes(k)));
  const act = new Map(actual.map((r) => [key(r), strip(r)]));
  const diffs: string[] = [];
  for (const e of expected) {
    const k = key(e);
    const a = act.get(k);
    act.delete(k);
    if (a === undefined) {
      diffs.push(`${table} ${k}: tidak ada di D1`);
      continue;
    }
    const want = strip(e);
    const cols = [...new Set([...Object.keys(want), ...Object.keys(a)])].filter(
      (c) => want[c] !== a[c],
    );
    if (cols.length > 0) diffs.push(`${table} ${k}: kolom ${cols.sort().join(", ")} berbeda`);
  }
  for (const k of act.keys()) diffs.push(`${table} ${k}: ada di D1, tidak ada di sumber`);
  return diffs;
}
