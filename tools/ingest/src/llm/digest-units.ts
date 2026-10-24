// Unit kerja Intisari (X15b, ADR-097, ADR-098) dari baris korpus. Fungsi yang sama dipakai saat
// menyusun request, menilai hasil, dan memuat hasil ke korpus, sehingga sidik sumbernya bisa
// dibandingkan di setiap langkah.
//
// - Blok: `text_raw` paragraf badan dipecah `segmentText` (sasaran ±220 karakter), TIDAK PERNAH di
//   dalam rentang `passage_ayah_ref` atau penanda catatan kaki, dan dipotong di batas subjudul.
//   Gabungan blok = `text_raw` persis. Ayat diganti placeholder per blok (`maskAyat`); paragraf yang
//   rujukan ayatnya tidak bisa ditandai tidak dikirim sama sekali (aturan yang sama dengan S13).
// - Request tahap leaf: satu bagian (atau satu potongan, pola `CHUNK_MAX_TOKENS`), blok berlabel
//   b1…bn; petanya ke `{passage_id, char_start, char_end}` ikut disimpan di catatan request.
// - Tahap merge/book: Intisari node dari Intisari anaknya (`n<seq>`) dan teks node itu sendiri
//   (`n<seq>p<k>`), satu tingkat, tidak pernah meratakan subpohon.
// - Sidik berjenjang: sha node = sha bagian-bagian dirinya + sha anak-anaknya, jadi perubahan teks di
//   mana pun di subpohon menandai Intisari induknya basi.
import { maskAyat, takhrijLabel, verseBounds } from "@surau/core";
import { findQuote, normalizeArabic } from "@surau/text";
import type { QuoteInspection, QuoteRange } from "@surau/llm";
import { PAGE_STRIDE, PASSAGE_STRIDE } from "@surau/db";
import type {
  DigestTier,
  FootnoteRefRow,
  PageRow,
  PassageAyahRefRow,
  PassageRow,
  TocNodeRow,
  TocTitleTranslationRow,
} from "@surau/db";
import { contentLength, leafPointRange, letterLength, segmentText } from "@surau/llm";
import type { CountRange, DigestStage, LeafBlock } from "@surau/llm";

import type { SubheadingEntries } from "./titles.ts";
import {
  PARENT_OWN_MIN_LETTERS,
  TOKENS_PER_CHAR,
  bodyInReadingOrder,
  headingPaths,
  sha256,
  toAyahRef,
  toFootnoteRef,
} from "./units.ts";
import type { UnitIssue } from "./units.ts";

/** Baris korpus yang dibutuhkan Intisari (dari build lokal T-28, atau SELECT staging). */
export interface DigestCorpus {
  page: readonly PageRow[];
  toc_node: readonly TocNodeRow[];
  /** Paragraf badan bagian yang direncanakan + catatan kaki yang dirujuknya. */
  passage: readonly PassageRow[];
  footnote_ref: readonly FootnoteRefRow[];
  passage_ayah_ref: readonly PassageAyahRefRow[];
  toc_title_translation: readonly TocTitleTranslationRow[];
}

/** Sasaran panjang blok (karakter); paragraf ≤ `DIGEST_BLOCK_SINGLE_MAX` tetap satu blok. */
export const DIGEST_BLOCK_TARGET = 220;
export const DIGEST_BLOCK_SINGLE_MAX = 330;
/**
 * Potongan teks satu request leaf (token perkiraan). Lebih kecil dari ringkasan (50 ribu): Intisari
 * meminta 3–7 gagasan per request, jadi bagian panjang (mis. 67 ribu karakter) dipecah dulu lalu
 * digabung tahap merge, supaya gagasannya tidak terlalu umum.
 */
export const DIGEST_CHUNK_MAX_TOKENS = 24_000;
/** Token per label blok dan tanda paragraf (perkiraan pemecahan; jumlah pasti dari count_tokens). */
const BLOCK_TOKEN_OVERHEAD = 6;

/**
 * Riwayat yang tidak boleh menjadi kutipan pilihan menurut istilah takhrijnya (docs/05 §12): sangat
 * lemah, palsu/batil, tidak ada asalnya, dan tidak ditemukan penakhrij (lam ajid, setara "tidak
 * diketahui asalnya").
 */
export const BANNED_TAKHRIJ_KINDS: ReadonlySet<string> = new Set([
  "sangat_lemah",
  "palsu",
  "la_asl",
  "lam_ajid",
]);

export interface DigestBlock extends LeafBlock {
  label: string;
  /** Nomor paragraf di request ini (1…). */
  paragraph: number;
  /** Teks blok bertanda ayat. */
  text: string;
}

export type DigestIdKind = "leaf" | "part" | "merge" | "book" | "book-compare";

export interface DigestIdParts {
  tocNodeId: number;
  lang: "id";
  kind: DigestIdKind;
  part: number | null;
}

const SUFFIX: Record<Exclude<DigestIdKind, "leaf" | "part">, string> = {
  merge: "-m",
  book: "-b",
  "book-compare": "-bh",
};

/**
 * custom_id Message Batches Intisari (^[a-zA-Z0-9_-]{1,64}$):
 *   dg-<toc>-id        Intisari final dari satu request leaf (bagian pendek tanpa subbagian)
 *   dg-<toc>-id-p<k>   potongan ke-k teks node itu sendiri (bagian panjang, atau teks pembuka induk)
 *   dg-<toc>-id-m      Intisari Bab dari Intisari anak/potongan (tahap merge)
 *   dg-<toc>-id-b      Intisari Kitab (tahap book, Sonnet 5.5)
 *   dg-<toc>-id-bh     Intisari Kitab pembanding Haiku 5.5 (pilot; tidak dimuat ke korpus)
 */
export function digestCustomId(tocNodeId: number, kind: DigestIdKind, part?: number): string {
  if (!Number.isSafeInteger(tocNodeId) || tocNodeId < 1) throw new Error(`toc ${tocNodeId}`);
  const base = `dg-${tocNodeId}-id`;
  if (kind === "leaf") return base;
  if (kind === "part") {
    if (part === undefined || !Number.isSafeInteger(part) || part < 1) throw new Error("potongan");
    return `${base}-p${part}`;
  }
  return `${base}${SUFFIX[kind]}`;
}

const DG = /^dg-([1-9]\d*)-(id)(?:-p([1-9]\d*)|(-m|-b|-bh))?$/u;

export function parseDigestCustomId(id: string): DigestIdParts | null {
  const m = DG.exec(id);
  if (m === null) return null;
  const tocNodeId = Number(m[1]);
  if (m[3] !== undefined) return { tocNodeId, lang: "id", kind: "part", part: Number(m[3]) };
  const kind: DigestIdKind =
    m[4] === "-m" ? "merge" : m[4] === "-b" ? "book" : m[4] === "-bh" ? "book-compare" : "leaf";
  return { tocNodeId, lang: "id", kind, part: null };
}

export function stageOf(kind: DigestIdKind): DigestStage {
  return kind === "leaf" || kind === "part" ? "leaf" : kind === "merge" ? "merge" : "book";
}

/** Kunci sumber di prompt merge: `n<seq>` (Intisari final) atau `n<seq>p<k>` (potongan). */
export function digestKey(tocNodeId: number, part: number | null = null): string {
  return `n${tocNodeId % PAGE_STRIDE}${part === null ? "" : `p${part}`}`;
}

/**
 * Tingkat Intisari (Ihya): muqaddimah (akar tanpa anak) dan kitab (tingkat 2) = Intisari Kitab;
 * selebihnya, termasuk rub' yang dibuat dari kitab-kitabnya, Intisari Bab.
 */
export function digestTier(node: Pick<TocNodeRow, "level">, hasChildNodes: boolean): DigestTier {
  return node.level === 2 || (node.level === 1 && !hasChildNodes) ? "book" : "section";
}

/** Satu request tahap leaf. */
export interface DigestLeafUnit {
  customId: string;
  tocNodeId: number;
  /** null = Intisari final node (satu request). */
  part: number | null;
  parts: number;
  /** Teks milik node INDUK sebelum subbagiannya. */
  intro: boolean;
  heading: string;
  titleId: string | null;
  blocks: DigestBlock[];
  /** Karakter `text_raw` yang dikirim. */
  chars: number;
  points: CountRange;
  sourceSha256: string;
}

/** Satu node yang mendapat Intisari. */
export interface DigestNodeUnit {
  tocNodeId: number;
  tier: DigestTier;
  basis: "text" | "children" | "mixed";
  /** Tahap request finalnya. */
  stage: DigestStage;
  customId: string;
  /** custom_id potongan teks node ini (masukan merge/book), urut. */
  parts: string[];
  /** Anak yang punya Intisari, urut `ord`. */
  children: number[];
  heading: string;
  titleId: string | null;
  /** Sidik berjenjang (lihat kepala berkas). */
  sourceSha256: string;
}

export interface DigestPlan {
  leaves: DigestLeafUnit[];
  leafById: Map<string, DigestLeafUnit>;
  /** Pascaurut (anak sebelum induk). */
  nodes: DigestNodeUnit[];
  nodeById: Map<number, DigestNodeUnit>;
  blocked: UnitIssue[];
  /** Node dalam cakupan (`--kitab`), termasuk yang tanpa Intisari. */
  scope: Set<number>;
}

export interface DigestPlanOptions {
  /** Hanya subpohon node ini (`--kitab`). */
  scope?: number;
  subheadings?: SubheadingEntries;
  maxTokens?: number;
  tokensPerChar?: number;
}

interface Span {
  start: number;
  end: number;
}

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

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

/**
 * Batas blok internal (0 < b < panjang): hasil `segmentText` + batas subjudul, tanpa batas di dalam
 * rentang `keep` (ayat, penanda catatan kaki), dan tanpa blok yang hanya spasi.
 */
export function blockCuts(
  text: string,
  keep: readonly Span[],
  forced: readonly number[],
): number[] {
  const cuts = new Set(
    segmentText(text, DIGEST_BLOCK_TARGET, DIGEST_BLOCK_SINGLE_MAX)
      .slice(1)
      .map((s) => s.start),
  );
  for (const f of forced) if (f > 0 && f < text.length) cuts.add(f);
  const out: number[] = [];
  let prev = 0;
  for (const b of [...cuts].sort((x, y) => x - y)) {
    if (keep.some((s) => s.start < b && b < s.end)) continue;
    if (text.slice(prev, b).trim() === "") continue;
    out.push(b);
    prev = b;
  }
  while (out.length > 0 && text.slice(out.at(-1) ?? 0).trim() === "") out.pop();
  return out;
}

const sameText = (a: string, b: string) =>
  normalizeArabic(a).text.trim() === normalizeArabic(b).text.trim();

/** Rentang judul/subjudul di satu paragraf (judul node + daftar kurasi yang sidiknya masih cocok). */
function headingSpans(
  p: PassageRow,
  node: TocNodeRow | undefined,
  subheadings: SubheadingEntries,
): Span[] {
  const len = p.text_raw.length;
  // Judul node: paragraf yang sama dengan judul daftar isinya. Dibandingkan sesudah normalisasi
  // (judul daftar isi Shamela tanpa harakat, paragraf judul sering berharakat).
  if (node !== undefined && sameText(p.text_raw, node.title_ar)) return [{ start: 0, end: len }];
  const e = subheadings.get(p.id % PASSAGE_STRIDE);
  if (e === undefined || sha256(p.text_raw).slice(0, 16) !== e.sha) return [];
  if (e.kind === "heading") return [{ start: 0, end: len }];
  if (e.kind === "lead") return [{ start: 0, end: Math.min(e.end, len) }];
  if (e.kind === "tail") return [{ start: Math.max(0, e.start), end: len }];
  return [];
}

interface PassageBlocks {
  passage: PassageRow;
  blocks: Omit<DigestBlock, "label" | "paragraph">[];
}

/** Blok satu paragraf, atau alasan paragraf itu tidak boleh dikirim. */
export function passageBlocks(
  p: PassageRow,
  ayah: readonly PassageAyahRefRow[],
  foot: readonly FootnoteRefRow[],
  headings: readonly Span[],
): PassageBlocks | string {
  const text = p.text_raw;
  const refs = ayah.map(toAyahRef);
  const notes = foot.map(toFootnoteRef);
  if (maskAyat(text, refs, notes).slots.length !== refs.length) {
    return "rujukan ayat tidak bisa ditandai";
  }
  const ayahSpans = ayah.map((r) => ({ start: r.char_start, end: r.char_end }));
  const keep = [...ayahSpans, ...foot.map((f) => ({ start: f.char_start, end: f.char_end }))];
  const forced = headings.flatMap((h) => [h.start, h.end]);
  const bounds = [0, ...blockCuts(text, keep, forced), text.length];
  const blocks: PassageBlocks["blocks"] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const span = { start: bounds[i] ?? 0, end: bounds[i + 1] ?? 0 };
    const inside = <T extends { char_start: number; char_end: number }>(r: T) =>
      r.char_start >= span.start && r.char_end <= span.end;
    const shift = <T extends { char_start: number; char_end: number }>(r: T): T => ({
      ...r,
      char_start: r.char_start - span.start,
      char_end: r.char_end - span.start,
    });
    const blockRefs = refs.filter(inside).map(shift);
    const masked = maskAyat(
      text.slice(span.start, span.end),
      blockRefs,
      notes.filter(inside).map(shift),
    );
    if (masked.slots.length !== blockRefs.length) return "rujukan ayat terpotong blok";
    blocks.push({
      passageId: p.id,
      start: span.start,
      end: span.end,
      heading: headings.some((h) => overlaps(h, span)),
      ayah: ayahSpans.some((a) => overlaps(a, span)),
      text: masked.text,
    });
  }
  return { passage: p, blocks };
}

/** Pecah paragraf-paragraf (urut baca) per halaman menjadi potongan ≤ `maxTokens` perkiraan. */
function chunkByPage(
  bodies: readonly PassageBlocks[],
  maxTokens: number,
  tokensPerChar: number,
): PassageBlocks[][] {
  const pages: PassageBlocks[][] = [];
  for (const b of bodies) {
    const last = pages.at(-1);
    if (last !== undefined && last[0]?.passage.page_id === b.passage.page_id) last.push(b);
    else pages.push([b]);
  }
  const tokens = (list: readonly PassageBlocks[]) =>
    list.reduce(
      (a, b) =>
        a +
        b.blocks.reduce(
          (x, k) => x + contentLength(k.text) * tokensPerChar + BLOCK_TOKEN_OVERHEAD,
          0,
        ),
      0,
    );
  const chunks: PassageBlocks[][] = [];
  let current: PassageBlocks[] = [];
  let size = 0;
  for (const page of pages) {
    const t = tokens(page);
    if (current.length > 0 && size + t > maxTokens) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(...page);
    size += t;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function labelled(bodies: readonly PassageBlocks[]): DigestBlock[] {
  const out: DigestBlock[] = [];
  bodies.forEach((b, i) => {
    for (const k of b.blocks) out.push({ ...k, label: `b${out.length + 1}`, paragraph: i + 1 });
  });
  return out;
}

/** sha256 isi request leaf yang menentukan keluaran (judul Indonesia hanya konteks, tidak ikut). */
export function leafSha(
  u: Pick<DigestLeafUnit, "heading" | "intro" | "part" | "parts" | "blocks">,
) {
  return sha256(
    JSON.stringify([
      u.heading,
      u.intro,
      u.part,
      u.parts,
      u.blocks.map((b) => [b.label, b.passageId, b.start, b.end, b.heading, b.text]),
    ]),
  );
}

export function digestPlan(rows: DigestCorpus, opts: DigestPlanOptions = {}): DigestPlan {
  const maxTokens = opts.maxTokens ?? DIGEST_CHUNK_MAX_TOKENS;
  const tokensPerChar = opts.tokensPerChar ?? TOKENS_PER_CHAR;
  const subheadings = opts.subheadings ?? new Map();
  const nodeById = new Map(rows.toc_node.map((n) => [n.id, n]));
  const children = groupBy(
    rows.toc_node.filter((n) => n.parent_id !== null),
    (n) => n.parent_id ?? 0,
  );
  for (const list of children.values()) list.sort((a, b) => a.ord - b.ord || a.id - b.id);
  const scope = new Set<number>();
  const addScope = (id: number) => {
    scope.add(id);
    for (const c of children.get(id) ?? []) addScope(c.id);
  };
  const roots =
    opts.scope === undefined
      ? rows.toc_node.filter((n) => n.parent_id === null).toSorted((a, b) => a.ord - b.ord)
      : [nodeById.get(opts.scope)].filter((n) => n !== undefined);
  if (opts.scope !== undefined && roots.length === 0) {
    throw new Error(`node ${opts.scope} tidak ada di daftar isi`);
  }
  for (const r of roots) addScope(r.id);

  const headings = headingPaths(rows.toc_node);
  const titleId = new Map(
    rows.toc_title_translation
      .filter((t) => t.lang === "id" && t.review_status !== "rejected")
      .map((t) => [t.toc_node_id, t.text]),
  );
  const ayahBy = groupBy(rows.passage_ayah_ref, (r) => r.passage_id);
  const footBy = groupBy(rows.footnote_ref, (r) => r.passage_id);
  const blocked: UnitIssue[] = [];
  const own = new Map<number, PassageBlocks[]>();
  const inScope = rows.passage.filter(
    (p) => p.kind === "body" && p.toc_node_id !== null && scope.has(p.toc_node_id),
  );
  for (const p of bodyInReadingOrder({ ...rows, passage: inScope })) {
    const node = nodeById.get(p.toc_node_id ?? 0);
    const foot = (footBy.get(p.id) ?? []).toSorted((a, b) => a.char_start - b.char_start);
    const r = passageBlocks(p, ayahBy.get(p.id) ?? [], foot, headingSpans(p, node, subheadings));
    if (typeof r === "string") {
      blocked.push({ passageId: p.id, detail: r });
      continue;
    }
    const list = own.get(p.toc_node_id ?? 0);
    if (list === undefined) own.set(p.toc_node_id ?? 0, [r]);
    else list.push(r);
  }

  const leaves: DigestLeafUnit[] = [];
  const nodes: DigestNodeUnit[] = [];
  const visit = (n: TocNodeRow): DigestNodeUnit | null => {
    const kids = (children.get(n.id) ?? []).map(visit).filter((u) => u !== null);
    const bodies = own.get(n.id) ?? [];
    const letters = bodies.reduce(
      (a, b) => a + b.blocks.reduce((x, k) => x + letterLength(k.text), 0),
      0,
    );
    const hasOwn = letters >= PARENT_OWN_MIN_LETTERS;
    if (!hasOwn && kids.length === 0) return null;
    const tier = digestTier(n, (children.get(n.id) ?? []).length > 0);
    const heading = headings.get(n.id) ?? n.title_ar;
    const title = titleId.get(n.id) ?? null;
    const chunks = hasOwn ? chunkByPage(bodies, maxTokens, tokensPerChar) : [];
    const leafUnit = (list: readonly PassageBlocks[], part: number | null): DigestLeafUnit => {
      const blocks = labelled(list);
      const chars = blocks.reduce((a, b) => a + (b.end - b.start), 0);
      const base = {
        customId: part === null ? digestCustomId(n.id, "leaf") : digestCustomId(n.id, "part", part),
        tocNodeId: n.id,
        part,
        parts: part === null ? 1 : chunks.length,
        intro: kids.length > 0,
        heading,
        titleId: title,
        blocks,
        chars,
        points: leafPointRange(chars),
      };
      return { ...base, sourceSha256: leafSha(base) };
    };
    let unit: DigestNodeUnit;
    if (tier === "section" && kids.length === 0 && chunks.length === 1) {
      const leaf = leafUnit(chunks[0] ?? [], null);
      leaves.push(leaf);
      unit = {
        tocNodeId: n.id,
        tier,
        basis: "text",
        stage: "leaf",
        customId: leaf.customId,
        parts: [],
        children: [],
        heading,
        titleId: title,
        sourceSha256: leaf.sourceSha256,
      };
    } else {
      const parts = chunks.map((c, i) => leafUnit(c, i + 1));
      leaves.push(...parts);
      unit = {
        tocNodeId: n.id,
        tier,
        basis:
          parts.length > 0 && kids.length > 0 ? "mixed" : parts.length > 0 ? "text" : "children",
        stage: tier === "book" ? "book" : "merge",
        customId: digestCustomId(n.id, tier === "book" ? "book" : "merge"),
        parts: parts.map((p) => p.customId),
        children: kids.map((k) => k.tocNodeId),
        heading,
        titleId: title,
        sourceSha256: sha256(
          JSON.stringify([
            tier,
            parts.map((p) => p.sourceSha256),
            kids.map((k) => [k.tocNodeId, k.sourceSha256]),
          ]),
        ),
      };
    }
    nodes.push(unit);
    return unit;
  };
  for (const r of roots) visit(r);
  return {
    leaves,
    leafById: new Map(leaves.map((l) => [l.customId, l])),
    nodes,
    nodeById: new Map(nodes.map((n) => [n.tocNodeId, n])),
    blocked,
    scope,
  };
}

/** Jarak terjauh (karakter) penanda takhrij sesudah akhir kutipan yang masih dianggap riwayat yang sama. */
export const REPORT_LOOKAHEAD_CHARS = 600;

/**
 * Jenis kutipan dan larangannya, ditentukan kode dari baris korpus (ADR-097): `report` bila ada
 * penanda takhrij di dalam rentang, atau penanda pertama sesudahnya (≤ 600 karakter, tanpa akhir
 * kalimat di antaranya: kutipan bisa potongan awal riwayat panjang),
 * `poetry` bila paragrafnya bait syair (`verseBounds`), selain itu `text`. Riwayat yang istilah
 * takhrijnya termasuk `BANNED_TAKHRIJ_KINDS` dilarang.
 */
export function quoteInspector(
  rows: Pick<DigestCorpus, "passage" | "footnote_ref">,
): (range: QuoteRange) => QuoteInspection {
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const footBy = groupBy(rows.footnote_ref, (r) => r.passage_id);
  return (range) => {
    const p = passages.get(range.passageId);
    if (p === undefined) throw new Error(`paragraf ${range.passageId} tidak ada`);
    const notes = (footBy.get(p.id) ?? []).toSorted((a, b) => a.char_start - b.char_start);
    // Penanda di dalam rentang, atau penanda PERTAMA sesudahnya selama belum ada akhir kalimat di
    // antaranya: kutipan bisa berupa potongan awal sebuah riwayat panjang yang penanda takhrijnya
    // baru muncul beberapa blok kemudian (peninjau X15b). Lebih baik keliru menandai perkataan
    // sebagai riwayat (dan menerapkan larangan takhrij) daripada sebaliknya.
    const next = notes.find((m) => m.char_start >= range.end);
    const markers = notes.filter(
      (m) =>
        (m.char_start >= range.start && m.char_start < range.end) ||
        (m === next &&
          m.char_start - range.end <= REPORT_LOOKAHEAD_CHARS &&
          !/[.!?؟]/u.test(p.text_raw.slice(range.end, m.char_start))),
    );
    if (markers.length > 0) {
      for (const m of markers) {
        const note = passages.get(m.footnote_passage_id);
        if (note === undefined) return { kind: "report", banned: "takhrij tidak ditemukan" };
        const kinds = takhrijLabel(note.text_raw).terms.map((t) => t.kind);
        const bad = kinds.find((k) => BANNED_TAKHRIJ_KINDS.has(k));
        if (bad !== undefined) return { kind: "report", banned: `takhrij ${bad}` };
      }
      return { kind: "report", banned: null };
    }
    return { kind: verseBounds(p.text_raw) === null ? "text" : "poetry", banned: null };
  };
}

/**
 * Penunjuk kutipan digest-section@2 (ADR-098): cari kata awal lalu kata akhir (sesudah awal) di
 * rentang blok yang ditunjuk model, dengan `findQuote` (normalisasi `@surau/text`, batas kata,
 * kembali ke offset `text_raw` persis). Teks penunjuk dari model tidak pernah disimpan atau
 * ditampilkan; yang dipakai hanya rentang mentah hasil pencarian.
 */
export function quoteLocator(
  rows: Pick<DigestCorpus, "passage">,
): (range: QuoteRange, start: string, end: string) => QuoteRange | string {
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  return (range, start, end) => {
    const p = passages.get(range.passageId);
    if (p === undefined) return "pointer_passage_missing";
    const span = p.text_raw.slice(range.start, range.end);
    const a = findQuote(span, start);
    if (a === null) return "pointer_start_not_found";
    const rest = span.slice(a.rawStart);
    const b = findQuote(rest, end);
    if (b === null) return "pointer_end_not_found";
    return {
      passageId: range.passageId,
      start: range.start + a.rawStart,
      end: range.start + a.rawStart + b.rawEnd,
    };
  };
}
