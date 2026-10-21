import type {
  AyahRef,
  Location,
  PageView,
  Passage,
  QuranView,
  SummaryView,
  TranslationSegment,
} from "@surau/core";
import type { NeedsReviewReason } from "@surau/db";

import { ayahPlaceholderPattern, maskAyat, translationSegments } from "@surau/core";

import type { Block, SubSpan } from "./blocks";
import type { SubheadingEntry } from "./subheadings";

import { shortAyahLabel } from "./ayah";
import { passageBlocks } from "./blocks";
import { splitPassage } from "./segments";
import { SUBHEADING_DIGEST, sha16, subheadingOf } from "./subheadings";

// Model halaman baca siap render (X04): satu bentuk untuk halaman cetak yang dirender server (ISR)
// dan halaman berikutnya yang dimuat gulir bersambung (W6, lewat JSON). Disusun di server dari
// `PageView` + node daftar isi yang mulai di halaman ini + daftar kurasi subjudul, sehingga
// komponen render tidak butuh pohon daftar isi, `@surau/core`, maupun hash. Teks tetap `text_raw`
// dan terjemahan dari DB; model hanya menambah batas potong dan peran tampil.

/**
 * Versi bentuk `PageModel` + sidik daftar kurasi subjudul: ikut kunci cache /api/halaman, jadi
 * salinan model lama tidak dipakai komponen baru dan perubahan daftar kurasi langsung berlaku.
 * Naikkan angka depan bila bentuk model **atau logika isinya** berubah (blok, segmen terjemahan,
 * syair, subjudul): tanpa itu, halaman sambungan di produksi memakai model lama sampai 7 hari per
 * data center. Model tidak memuat teks UI (i18n).
 */
export const PAGE_MODEL_VERSION = `3.${SUBHEADING_DIGEST}`;

/** Node daftar isi yang mulai di halaman ini (urut baca), dengan induknya. */
export interface SectionNode {
  id: number;
  parentId: number | null;
  level: number;
  /** Judul Arab persis dari DB. */
  title: string;
}

/**
 * Segmen terjemahan siap render: sama dengan `TranslationSegment` core, tetapi placeholder ayat yang
 * tidak bisa dirender membawa label rujukannya ("QS 2:255"), supaya komponen tidak perlu pola core.
 */
export type TranslationSegmentView =
  | Exclude<TranslationSegment, { kind: "invalid" }>
  | { kind: "invalid"; placeholder: string; label: string };

export interface TranslationModel {
  segments: TranslationSegmentView[];
  /** Rentang tebal di teks terjemahan lengkap (padanan subjudul awal/akhir), atau `null`. */
  bold: { start: number; end: number } | null;
}

export interface PassageModel {
  id: number;
  anchor: string;
  /** Permalink paragraf (path + `#pN`). */
  permalink: string;
  needsReview: NeedsReviewReason[];
  /**
   * Peran paragraf utuh: judul node daftar isi (`toc`, h2), subjudul kurasi (`sub`), atau teks.
   */
  heading: { kind: "toc"; level: number } | { kind: "sub" } | null;
  /**
   * Subjudul di akhir paragraf ini adalah judul node daftar isi (kurasi `node_tail`, X04 bagian B):
   * dirender h2, dan jangkar `#bab-<id>` + ringkasan node itu dipindah ke paragraf ini.
   */
  nodeHeading: { id: number; level: number } | null;
  blocks: Block[];
  /** Rujukan ayat yang dirender (indeks `ayah` di segmen). */
  ayat: AyahRef[];
  /** Paragraf lanjutan judul ini (kurasi), dirender menyatu dengannya. */
  continuations: PassageModel[];
  translation: TranslationModel | null;
  /** Jangkar `#bab-<id>` yang diletakkan sebelum paragraf ini. */
  sectionAnchors: number[];
  /** Ringkasan AI bagian yang mulai di paragraf ini (sesudahnya). */
  summaries: SummaryView[];
}

export interface PageModel {
  juz: number;
  pageNo: number;
  /** Permalink halaman cetak. */
  permalink: string;
  prev: Location | null;
  next: Location | null;
  body: PassageModel[];
  footnotes: PassageModel[];
  quran: QuranView | null;
  /** Jangkar bagian yang tidak punya paragraf di halaman ini (di awal teks) + ringkasannya. */
  unplaced: number[];
  unplacedSummaries: SummaryView[];
  /** Catatan kaki → id penanda pertama yang dirender (tujuan "kembali ke teks"). */
  markerIds: Record<number, string>;
  /** Digit penanda (١) → jangkar catatan kaki (tautan di terjemahan AI). */
  footAnchor: Record<string, string>;
  anyAi: boolean;
  anyReview: boolean;
}

/** Urutan baca node: induk sebelum anak, saudara menurut urutan masukan (level, ord). */
function preorder(nodes: readonly SectionNode[]): SectionNode[] {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<number | null, SectionNode[]>();
  for (const n of nodes) {
    const parent = n.parentId !== null && ids.has(n.parentId) ? n.parentId : null;
    kids.set(parent, [...(kids.get(parent) ?? []), n]);
  }
  const out: SectionNode[] = [];
  const visit = (parent: number | null) => {
    for (const n of kids.get(parent) ?? []) {
      out.push(n);
      visit(n.id);
    }
  };
  visit(null);
  return out;
}

/**
 * Judul node (h2): paragraf PERTAMA milik node di halaman awalnya yang teksnya sama dengan judul
 * node (aturan yang sama dengan `isTocHeading` ingest). Biasanya paragraf pertama node, tetapi di 8
 * node Ihya jangkar Shamela jatuh satu-dua paragraf lebih awal (kolofon kitab sebelumnya, kalimat
 * pengantar daftar; X04 bagian B). `plain` = paragraf kurasi yang teksnya sama dengan judul node
 * tetapi butir daftar pembuka (bukan judul).
 */
export function tocHeadings(
  sections: readonly SectionNode[],
  body: readonly Pick<Passage, "id" | "toc_node_id" | "text_raw">[],
  plain: ReadonlySet<number> = new Set(),
): Map<number, SectionNode> {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const out = new Map<number, SectionNode>();
  const done = new Set<number>();
  for (const p of body) {
    if (plain.has(p.id) || p.toc_node_id === null || done.has(p.toc_node_id)) continue;
    const node = byId.get(p.toc_node_id);
    if (node && p.text_raw.trim() === node.title.trim()) {
      out.set(p.id, node);
      done.add(node.id);
    }
  }
  return out;
}

/**
 * Jangkar `#bab-<id>` tiap node yang mulai di halaman ini: sebelum paragraf badan pertama milik node
 * itu atau turunannya; node tanpa paragraf di halaman ini masuk `unplaced`.
 */
export function sectionStarts(
  sections: readonly SectionNode[],
  body: readonly Pick<Passage, "id" | "toc_node_id">[],
): { byPassage: Map<number, number[]>; unplaced: number[] } {
  const ordered = preorder(sections);
  const children = new Map<number, number[]>();
  for (const n of ordered) {
    if (n.parentId !== null) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n.id]);
  }
  const subtree = (id: number): Set<number> => {
    const out = new Set([id]);
    for (const c of children.get(id) ?? []) for (const x of subtree(c)) out.add(x);
    return out;
  };
  const byPassage = new Map<number, number[]>();
  const unplaced: number[] = [];
  for (const node of ordered) {
    const ids = subtree(node.id);
    const first = body.find((p) => p.toc_node_id !== null && ids.has(p.toc_node_id));
    if (first === undefined) unplaced.push(node.id);
    else byPassage.set(first.id, [...(byPassage.get(first.id) ?? []), node.id]);
  }
  return { byPassage, unplaced };
}

/** Rentang subjudul awal/akhir yang masih berlaku untuk teks ini (sidik cocok), atau `null`. */
async function verified(
  entry: SubheadingEntry | undefined,
  p: Passage,
): Promise<{ entry: SubheadingEntry; trOk: boolean } | null> {
  if (entry === undefined || (await sha16(p.text_raw)) !== entry.sha) return null;
  const tr = entry.kind === "lead" || entry.kind === "tail" ? entry.tr : undefined;
  const text = p.translation?.text;
  const trOk = tr !== undefined && text !== undefined && (await sha16(text)) === tr.sha;
  return { entry, trOk };
}

function translationModel(
  p: Passage,
  quran: QuranView | null,
  bold: TranslationModel["bold"],
): TranslationModel | null {
  const tr = p.translation;
  if (tr === null || tr === undefined || tr.review_status === "rejected") return null;
  const { slots } = maskAyat(p.text_raw, p.ayah_refs, p.footnote_refs);
  const segments = translationSegments(tr.text, slots, quran).map((seg): TranslationSegmentView => {
    if (seg.kind !== "invalid") return seg;
    const m = ayahPlaceholderPattern("").exec(seg.placeholder);
    const label =
      m === null
        ? seg.placeholder
        : shortAyahLabel({
            surah: Number(m[1]),
            ayah_from: Number(m[2]),
            ayah_to: Number(m[3] ?? m[2]),
          });
    return { ...seg, label };
  });
  return { segments, bold };
}

export interface ModelContext {
  editionId: number;
  /** Bagian daftar isi yang mulai di halaman ini (dari pohon lengkap atau kueri per halaman). */
  sections: readonly SectionNode[];
}

/** Model siap render untuk satu halaman cetak. */
export async function buildPageModel(page: PageView, ctx: ModelContext): Promise<PageModel> {
  const { juz, page_no: pageNo, permalink } = page.citation;
  const seqOf = (p: Passage) => Number(p.anchor.slice(1));
  // Entri kurasi yang sidiknya cocok dengan teks halaman ini (paragraf badan).
  const checked = await Promise.all(
    page.body.map((p) => verified(subheadingOf(ctx.editionId, seqOf(p)), p)),
  );
  const checks = new Map(
    page.body.flatMap((p, i) => (checked[i] ? [[p.id, checked[i]] as const] : [])),
  );
  const plain = new Set([...checks].filter(([, c]) => c.entry.kind === "plain").map(([id]) => id));
  const headings = tocHeadings(ctx.sections, page.body, plain);
  const starts = sectionStarts(ctx.sections, page.body);
  const sectionById = new Map(ctx.sections.map((s) => [s.id, s]));
  const summaryOf = new Map((page.summaries ?? []).map((s) => [s.section.id, s]));
  const summariesAt = (ids: readonly number[]) =>
    ids.flatMap((nodeId) => {
      const s = summaryOf.get(nodeId);
      return s === undefined || s.review_status === "rejected" ? [] : [s];
    });

  function model(p: Passage, kind: "body" | "foot"): PassageModel {
    const split = splitPassage(p.text_raw, p.footnote_refs, p.ayah_refs);
    const check = kind === "body" && !headings.has(p.id) ? checks.get(p.id) : undefined;
    const entry = check?.entry;
    let sub: SubSpan | null = null;
    let bold: TranslationModel["bold"] = null;
    if (entry?.kind === "lead") {
      sub = { kind: "lead", end: entry.end };
      if (check?.trOk && entry.tr) bold = { start: entry.tr.start, end: entry.tr.end };
    } else if (entry?.kind === "tail") {
      sub = { kind: "tail", start: entry.start };
      if (check?.trOk && entry.tr) bold = { start: entry.tr.start, end: entry.tr.end };
    }
    const toc = headings.get(p.id);
    const node =
      entry?.kind === "tail" && entry.node !== undefined ? sectionById.get(entry.node) : undefined;
    return {
      id: p.id,
      anchor: p.anchor,
      permalink: p.location.permalink,
      needsReview: p.needs_review,
      heading:
        toc !== undefined
          ? { kind: "toc", level: toc.level }
          : entry?.kind === "heading"
            ? { kind: "sub" }
            : null,
      nodeHeading: node === undefined ? null : { id: node.id, level: node.level },
      // Syair hanya di teks badan (ADR-074): elipsis ` ... ` di takhrij bukan pemisah bait.
      blocks:
        kind === "body"
          ? passageBlocks(p.text_raw, split.segments, sub)
          : [{ kind: "text", segments: split.segments }],
      ayat: split.ayat,
      continuations: [],
      translation: translationModel(p, page.quran, bold),
      sectionAnchors: kind === "body" ? (starts.byPassage.get(p.id) ?? []) : [],
      summaries: kind === "body" ? summariesAt(starts.byPassage.get(p.id) ?? []) : [],
    };
  }

  const models = page.body.map((p) => model(p, "body"));
  // Jangkar `#bab-<id>` dan ringkasan node pindah dari paragraf pertama node (sectionStarts) ke
  // paragraf yang memuat judulnya: judul node yang bukan paragraf pertamanya (lihat tocHeadings) dan
  // judul node di akhir paragraf (node_tail).
  for (const [i, m] of models.entries()) {
    const nodeId = m.nodeHeading?.id ?? headings.get(page.body[i]!.id)?.id;
    if (nodeId === undefined) continue;
    for (const o of models) {
      if (o === m || !o.sectionAnchors.includes(nodeId)) continue;
      o.sectionAnchors = o.sectionAnchors.filter((id) => id !== nodeId);
      m.sectionAnchors = [...m.sectionAnchors, nodeId];
      const moved = o.summaries.filter((s) => s.section.id === nodeId);
      o.summaries = o.summaries.filter((s) => s.section.id !== nodeId);
      m.summaries = [...m.summaries, ...moved];
    }
  }
  // Lanjutan judul (kurasi `of`): digabung ke subjudul tepat sebelumnya di halaman yang sama. Bila
  // judulnya ada di halaman lain (tidak terjadi di Ihya), lanjutan tampil sebagai subjudul sendiri.
  const body: PassageModel[] = [];
  for (const [i, m] of models.entries()) {
    const p = page.body[i]!;
    const entry = subheadingOf(ctx.editionId, seqOf(p));
    const prev = body.at(-1);
    if (
      m.heading?.kind === "sub" &&
      entry?.kind === "heading" &&
      entry.of !== undefined &&
      prev !== undefined &&
      prev.heading?.kind === "sub" &&
      (prev.continuations.at(-1)?.anchor ?? prev.anchor) === `p${entry.of}` &&
      m.sectionAnchors.length === 0
    ) {
      prev.continuations.push(m);
      continue;
    }
    body.push(m);
  }
  const footnotes = page.footnotes.map((p) => model(p, "foot"));

  const footIds = new Set(page.footnotes.map((f) => f.id));
  const markerIds: Record<number, string> = {};
  for (const m of models) {
    for (const s of m.blocks.flatMap((b) => b.segments)) {
      if (s.kind === "marker" && footIds.has(s.footnoteId) && !(s.footnoteId in markerIds)) {
        markerIds[s.footnoteId] = `ref-${m.anchor}-${s.charStart}`;
      }
    }
  }
  const footAnchor: Record<string, string> = {};
  const footById = new Map(page.footnotes.map((f) => [f.id, f]));
  for (const p of page.body) {
    for (const r of p.footnote_refs) {
      const foot = footById.get(r.footnote_id);
      if (foot !== undefined && !(r.marker in footAnchor)) footAnchor[r.marker] = foot.anchor;
    }
  }

  return {
    juz,
    pageNo,
    permalink,
    prev: page.prev,
    next: page.next,
    body,
    footnotes,
    quran: page.quran,
    unplaced: starts.unplaced,
    unplacedSummaries: summariesAt(starts.unplaced),
    markerIds,
    footAnchor,
    anyAi:
      (page.summaries ?? []).length > 0 ||
      page.body.some((p) => p.translation !== null && p.translation !== undefined),
    anyReview: [...page.body, ...page.footnotes].some((p) => p.needs_review.length > 0),
  };
}
