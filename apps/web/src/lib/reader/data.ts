import type { DigestView, EditionView, PageView, WorkView } from "@surau/core";

import { getToc, getWork, isCoreError, readDigest, readPage, uintSegment } from "@surau/core";
import { AI_TEXT_LANG, getTocNode } from "@surau/db";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { getEnv, readerEnabled } from "../cloudflare";

import type { DigestTeaser } from "./digest";
import type { TitleSource } from "./reader-toc";
import type { TocItem } from "./toc";

import { digestTeasers } from "./digest";
import { readerToc, readerTocExtras } from "./reader-toc";
import { slimToc } from "./toc";
import { editionSegment, parseWorkSegment, resolveEdition } from "./work-segment";

// Pemuat data rute /kitab/* (server saja). Semua baca lewat @surau/core; error core dipetakan ke
// 404 (`NotFound` = alamat sah tapi tidak ada, `InvalidCitation` = alamat salah bentuk). Error lain
// (D1 gagal, baris rusak) dibiarkan naik ke error.tsx. `cache` menyatukan panggilan yang sama dari
// generateMetadata dan halaman dalam satu render.

/** Kedalaman penuh pohon daftar isi Ihya (level terdalam 4–5); batas core = 10. */
const TOC_DEPTH = 10;

export interface WorkContext {
  env: CloudflareEnv;
  work: WorkView;
  edition: EditionView;
  /** Segmen URL kanonis (`ihya` / `ihya@<edisi>`). */
  segment: string;
}

async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (error) {
    if (isCoreError(error)) notFound();
    throw error;
  }
}

type WorkResolution = { kind: "ok"; ctx: WorkContext } | { kind: "redirect"; segment: string };

/** Karya + edisi dari segmen URL. 404 bila pembaca tertutup atau karya/edisi tidak ada. */
const resolveWork = cache(async (rawSegment: string): Promise<WorkResolution> => {
  const env = await getEnv();
  if (!readerEnabled(env)) notFound();
  const parsed = parseWorkSegment(rawSegment);
  if (parsed === null) notFound();
  const work = await orNotFound(getWork(env.CORPUS_DB, parsed.workSlug));
  const resolved = resolveEdition(work, parsed.editionSlug);
  if (resolved.kind === "not_found") notFound();
  if (resolved.kind === "redirect") return resolved;
  const segment = editionSegment(work, resolved.edition);
  return { kind: "ok", ctx: { env, work, edition: resolved.edition, segment } };
});

/**
 * Karya + edisi; `ihya@<edisi default>` dialihkan permanen (308) ke URL kanonis dengan sisa path
 * yang sama (`suffix`, mis. `/1/200`), supaya satu halaman hanya punya satu URL (ADR-029).
 */
export async function loadWork(rawSegment: string, suffix = ""): Promise<WorkContext> {
  const r = await resolveWork(rawSegment);
  if (r.kind === "redirect") permanentRedirect(`/kitab/${r.segment}${suffix}`);
  return r.ctx;
}

/** Pohon daftar isi penuh. Tidak pernah mengalihkan (itu tugas loadWork/loadPage); `[]` bila alias. */
export const loadToc = cache(async (rawSegment: string): Promise<TocItem[]> => {
  const r = await resolveWork(rawSegment);
  if (r.kind === "redirect") return [];
  const { env, edition } = r.ctx;
  const toc = await orNotFound(getToc(env.CORPUS_DB, edition.id, { depth: TOC_DEPTH }));
  return slimToc(toc.nodes);
});

/**
 * Pohon daftar isi untuk TAMPILAN (sidebar, sheet ponsel, halaman karya): `loadToc` + subjudul
 * kurasi + judul Indonesia terjemahan AI (X04 bagian B). Jangan dipakai untuk breadcrumb, <title>,
 * OG, bagian aktif, atau model halaman: di sana tetap `loadToc` (judul Arab, node korpus saja).
 */
export const loadReaderToc = cache(
  async (rawSegment: string): Promise<{ items: TocItem[]; titleSource: TitleSource | null }> => {
    const r = await resolveWork(rawSegment);
    if (r.kind === "redirect") return { items: [], titleSource: null };
    const toc = await loadToc(rawSegment);
    const extras = await readerTocExtras(r.ctx.env.CORPUS_DB, r.ctx.edition.id);
    return {
      items: readerToc(toc, extras, r.ctx.segment),
      titleSource: extras.titles?.source ?? null,
    };
  },
);

export interface PageContext extends WorkContext {
  page: PageView;
}

/** Halaman cetak dari segmen `[juz]/[page]`; angka yang tidak kanonis (`01`, `1e2`) = 404. */
export const loadPage = cache(
  async (rawSegment: string, rawJuz: string, rawPage: string): Promise<PageContext> => {
    // Angka divalidasi dulu: hanya bentuk kanonis yang boleh ikut ke URL pengalihan.
    const juz = uintSegment.safeParse(rawJuz);
    const pageNo = uintSegment.safeParse(rawPage);
    if (!juz.success || !pageNo.success) notFound();
    const ctx = await loadWork(rawSegment, `/${juz.data}/${pageNo.data}`);
    // Juz di luar jumlah jilid edisi = 404 tanpa kueri lagi: path acak (pemindai, ISR tanpa batas,
    // ADR-034) tidak boleh memicu baca D1 yang tidak perlu (temuan peninjau rilis Fase 1).
    const volumes = ctx.edition.volumes;
    if (juz.data < 1 || (volumes !== null && juz.data > volumes)) notFound();
    const page = await orNotFound(
      readPage(ctx.env.CORPUS_DB, ctx.edition.id, juz.data, pageNo.data),
    );
    return { ...ctx, page };
  },
);

/** Node daftar isi milik edisi ini (validasi kepemilikan lewat getToc); 404 bila bukan. */
export const loadTocNode = cache(async (rawSegment: string, rawId: string) => {
  const id = uintSegment.safeParse(rawId);
  if (!id.success || id.data === 0) notFound();
  const ctx = await loadWork(rawSegment, `/bab/${id.data}`);
  // Cek satu baris dulu: ID acak tidak boleh memuat seluruh pohon daftar isi (±940 baris D1).
  const row = await getTocNode(ctx.env.CORPUS_DB, id.data);
  if (row === null || row.edition_id !== ctx.edition.id) notFound();
  const toc = await orNotFound(
    getToc(ctx.env.CORPUS_DB, ctx.edition.id, { nodeId: id.data, depth: 1 }),
  );
  const node = toc.nodes[0];
  if (node === undefined) notFound();
  return { ...ctx, node };
});

/**
 * Kepala Intisari seluruh edisi (X16), urut `toc_node_id`: hub, lencana daftar isi, tautan dari
 * halaman karya. Kosong di korpus skema < 9 atau bila belum ada Intisari; `[]` bila alias.
 */
export const loadDigestHeaders = cache(async (rawSegment: string): Promise<DigestTeaser[]> => {
  const r = await resolveWork(rawSegment);
  if (r.kind === "redirect") return [];
  // Dari ekstra daftar isi (memo per isolate, dimuat bersama judul dan subjudul): lencana daftar
  // isi, kartu ringkasan, menu ⋮, dan hub memakai satu daftar yang sama.
  const extras = await readerTocExtras(r.ctx.env.CORPUS_DB, r.ctx.edition.id);
  return digestTeasers(extras.digests, r.ctx.segment);
});

export interface DigestContext extends WorkContext {
  digest: DigestView;
}

/**
 * Intisari satu node daftar isi (X16). 404 bila ID tidak sah, node tidak ada atau milik edisi
 * lain, korpus berskema < 9, node belum punya Intisari, atau Intisari-nya tanpa gagasan tampil.
 */
export const loadDigest = cache(
  async (rawSegment: string, rawId: string): Promise<DigestContext> => {
    const id = uintSegment.safeParse(rawId);
    if (!id.success || id.data === 0) notFound();
    const ctx = await loadWork(rawSegment, `/bab/${id.data}/intisari`);
    const digest = await orNotFound(readDigest(ctx.env.CORPUS_DB, id.data, AI_TEXT_LANG));
    if (digest === null || digest.source.edition.id !== ctx.edition.id) notFound();
    if (digest.points.length === 0) notFound();
    return { ...ctx, digest };
  },
);
