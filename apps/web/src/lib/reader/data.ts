import type { EditionView, PageView, WorkView } from "@surau/core";

import { getToc, getWork, isCoreError, readPage, uintSegment } from "@surau/core";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { getEnv, readerEnabled } from "../cloudflare";

import type { TocItem } from "./toc";

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

/** Karya + edisi dari segmen URL. 404 bila pembaca tertutup, karya/edisi tidak ada; 308 ke kanonis. */
export const loadWork = cache(async (rawSegment: string): Promise<WorkContext> => {
  const env = await getEnv();
  if (!readerEnabled(env)) notFound();
  const parsed = parseWorkSegment(rawSegment);
  if (parsed === null) notFound();
  const work = await orNotFound(getWork(env.CORPUS_DB, parsed.workSlug));
  const resolved = resolveEdition(work, parsed.editionSlug);
  if (resolved.kind === "not_found") notFound();
  if (resolved.kind === "redirect") permanentRedirect(`/kitab/${resolved.segment}`);
  return { env, work, edition: resolved.edition, segment: editionSegment(work, resolved.edition) };
});

export const loadToc = cache(async (rawSegment: string): Promise<TocItem[]> => {
  const { env, edition } = await loadWork(rawSegment);
  const toc = await orNotFound(getToc(env.CORPUS_DB, edition.id, { depth: TOC_DEPTH }));
  return slimToc(toc.nodes);
});

export interface PageContext extends WorkContext {
  page: PageView;
}

/** Halaman cetak dari segmen `[juz]/[page]`; angka yang tidak kanonis (`01`, `1e2`) = 404. */
export const loadPage = cache(
  async (rawSegment: string, rawJuz: string, rawPage: string): Promise<PageContext> => {
    const ctx = await loadWork(rawSegment);
    const juz = uintSegment.safeParse(rawJuz);
    const pageNo = uintSegment.safeParse(rawPage);
    if (!juz.success || !pageNo.success) notFound();
    const page = await orNotFound(
      readPage(ctx.env.CORPUS_DB, ctx.edition.id, juz.data, pageNo.data),
    );
    return { ...ctx, page };
  },
);

/** Node daftar isi milik edisi ini (validasi kepemilikan lewat getToc); 404 bila bukan. */
export const loadTocNode = cache(async (rawSegment: string, rawId: string) => {
  const ctx = await loadWork(rawSegment);
  const id = uintSegment.safeParse(rawId);
  if (!id.success || id.data === 0) notFound();
  const toc = await orNotFound(
    getToc(ctx.env.CORPUS_DB, ctx.edition.id, { nodeId: id.data, depth: 1 }),
  );
  const node = toc.nodes[0];
  if (node === undefined) notFound();
  return { ...ctx, node };
});
