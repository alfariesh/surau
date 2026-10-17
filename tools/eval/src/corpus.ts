// Indeks korpus untuk menilai hasil: peta halaman dan pohon daftar isi dari D1 (lokal atau
// staging), lalu `lokasi_benar` setiap soal diubah menjadi pencocok. Label di dataset dicek di sini
// supaya salah ketik ID (lokasi benar menunjuk tempat lain) gagal keras, bukan diam-diam.
import type { D1Db } from "@surau/db";
import { z } from "zod";

import { DatasetError, parseLabel } from "./dataset.ts";
import type { Location, Question } from "./dataset.ts";
import type { GoldMatcher } from "./metrics.ts";

export interface PageRow {
  id: number;
  edition_id: number;
  juz: number;
  page_no: number;
}

export interface TocRow {
  id: number;
  parent_id: number | null;
  start_page_id: number;
}

export interface CorpusIndex {
  meta: Record<string, string>;
  pageById: Map<number, PageRow>;
  /** Kunci `edisi:juz:halaman` → halaman (sitasi hasil pencarian → page_id). */
  pageByCitation: Map<string, PageRow>;
  tocById: Map<number, TocRow>;
  childrenOf: Map<number, number[]>;
}

const metaRow = z.object({ key: z.string(), value: z.string() });
const pageRow = z.object({
  id: z.number(),
  edition_id: z.number(),
  juz: z.number(),
  page_no: z.number(),
});
const tocRow = z.object({
  id: z.number(),
  parent_id: z.number().nullable(),
  start_page_id: z.number(),
});

export const citationKey = (editionId: number, juz: number, pageNo: number) =>
  `${editionId}:${juz}:${pageNo}`;

/** Satu bolak-balik D1 (batch tiga SELECT): meta, halaman, dan daftar isi. */
export async function loadCorpusIndex(db: D1Db): Promise<CorpusIndex> {
  const [meta, pages, toc] = await db.batch([
    db.prepare("SELECT key, value FROM meta"),
    db.prepare("SELECT id, edition_id, juz, page_no FROM page"),
    db.prepare("SELECT id, parent_id, start_page_id FROM toc_node"),
  ]);
  if (meta === undefined || pages === undefined || toc === undefined) {
    throw new Error("batch D1 tidak mengembalikan tiga hasil");
  }
  return buildCorpusIndex(
    z.array(metaRow).parse(meta.results),
    z.array(pageRow).parse(pages.results),
    z.array(tocRow).parse(toc.results),
  );
}

export function buildCorpusIndex(
  meta: { key: string; value: string }[],
  pages: PageRow[],
  toc: TocRow[],
): CorpusIndex {
  const childrenOf = new Map<number, number[]>();
  for (const n of toc) {
    if (n.parent_id === null) continue;
    const list = childrenOf.get(n.parent_id) ?? [];
    list.push(n.id);
    childrenOf.set(n.parent_id, list);
  }
  return {
    meta: Object.fromEntries(meta.map((m) => [m.key, m.value])),
    pageById: new Map(pages.map((p) => [p.id, p])),
    pageByCitation: new Map(pages.map((p) => [citationKey(p.edition_id, p.juz, p.page_no), p])),
    tocById: new Map(toc.map((n) => [n.id, n])),
    childrenOf,
  };
}

/** Node beserta seluruh turunannya. */
export function subtree(index: CorpusIndex, rootId: number): Set<number> {
  const out = new Set<number>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || out.has(id)) continue;
    out.add(id);
    stack.push(...(index.childrenOf.get(id) ?? []));
  }
  return out;
}

const pageLabel = (p: PageRow) => `j${p.juz} h${p.page_no}`;

/** Satu lokasi → pencocok. Label wajib sama dengan letak di DB. */
export function resolveLocation(index: CorpusIndex, loc: Location, qid: string): GoldMatcher {
  if ("toc_node_id" in loc) {
    const node = index.tocById.get(loc.toc_node_id);
    if (node === undefined)
      throw new DatasetError(`${qid}: toc_node_id ${loc.toc_node_id} tidak ada`);
    const start = index.pageById.get(node.start_page_id);
    if (start === undefined)
      throw new DatasetError(`${qid}: halaman awal node ${node.id} tidak ada`);
    if (pageLabel(start) !== loc.label) {
      throw new DatasetError(
        `${qid}: label "${loc.label}" ≠ letak node ${node.id} di DB (${pageLabel(start)})`,
      );
    }
    return { label: loc.label, pageIds: new Set(), tocNodeIds: subtree(index, node.id) };
  }
  const first = index.pageById.get(loc.page_id);
  const last = index.pageById.get(loc.sampai_page_id ?? loc.page_id);
  if (first === undefined || last === undefined) {
    throw new DatasetError(`${qid}: page_id ${loc.page_id}/${loc.sampai_page_id} tidak ada`);
  }
  const want = parseLabel(loc.label);
  if (
    first.edition_id !== last.edition_id ||
    first.juz !== want.juz ||
    last.juz !== want.juz ||
    first.page_no !== want.from ||
    last.page_no !== want.to
  ) {
    throw new DatasetError(
      `${qid}: label "${loc.label}" ≠ letak di DB (${pageLabel(first)}…${pageLabel(last)})`,
    );
  }
  // Rentang menurut (jilid, halaman cetak), bukan urutan ID (ADR-029 butir 2).
  const pageIds = new Set<number>();
  for (const p of index.pageById.values()) {
    if (
      p.edition_id === first.edition_id &&
      p.juz === want.juz &&
      p.page_no >= want.from &&
      p.page_no <= want.to
    ) {
      pageIds.add(p.id);
    }
  }
  return { label: loc.label, pageIds, tocNodeIds: new Set() };
}

export function resolveGold(index: CorpusIndex, q: Question): GoldMatcher[] {
  return q.lokasi_benar.map((loc) => resolveLocation(index, loc, q.id));
}
