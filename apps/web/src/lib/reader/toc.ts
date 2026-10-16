import type { Passage, TocNode } from "@surau/core";

// Daftar isi untuk UI pembaca: pohon ramping (dikirim ke komponen klien di setiap halaman baca,
// jadi tanpa sitasi/lisensi per node), pencarian jalur untuk breadcrumb, dan bagian aktif.

export interface TocItem {
  id: number;
  /** Judul Arab persis dari DB (`toc_node.title_ar`). */
  title: string;
  level: number;
  /** Permalink halaman awal bagian, mis. `/kitab/ihya/1/197`. */
  href: string;
  juz: number;
  page: number;
  children: TocItem[];
}

export function slimToc(nodes: readonly TocNode[]): TocItem[] {
  return nodes.map((n) => ({
    id: n.id,
    title: n.title_ar,
    level: n.level,
    href: n.start.permalink,
    juz: n.start.juz,
    page: n.start.page_no,
    children: slimToc(n.children),
  }));
}

/** Semua node dalam urutan baca (pre-order). */
export function flattenToc(items: readonly TocItem[]): TocItem[] {
  return items.flatMap((i) => [i, ...flattenToc(i.children)]);
}

/** Jalur akar → node (termasuk node itu), atau `[]` bila tidak ada. */
export function tocPath(items: readonly TocItem[], id: number): TocItem[] {
  for (const item of items) {
    if (item.id === id) return [item];
    const sub = tocPath(item.children, id);
    if (sub.length > 0) return [item, ...sub];
  }
  return [];
}

function startsAtOrBefore(item: TocItem, juz: number, page: number): boolean {
  return item.juz < juz || (item.juz === juz && item.page <= page);
}

/**
 * Bagian yang tampil di halaman ini, urut kemunculan: node paragraf badan (`toc_node_id`).
 * Halaman tanpa paragraf bernode (mis. hanya catatan kaki) memakai node terakhir dalam urutan
 * baca yang mulai di halaman ini atau sebelumnya.
 */
export function activeTocIds(
  items: readonly TocItem[],
  juz: number,
  page: number,
  body: readonly Pick<Passage, "toc_node_id">[],
): number[] {
  const ids = [
    ...new Set(body.map((p) => p.toc_node_id).filter((id): id is number => id !== null)),
  ];
  if (ids.length > 0) return ids;
  const before = flattenToc(items).filter((i) => startsAtOrBefore(i, juz, page));
  const last = before.at(-1);
  return last === undefined ? [] : [last.id];
}

/**
 * Paragraf badan yang merupakan judul bagian: teksnya sama persis dengan judul node-nya dan node
 * itu mulai di halaman ini. Hanya memengaruhi tampilan (elemen heading); teksnya tetap `text_raw`.
 */
export function headingPassages(
  items: readonly TocItem[],
  juz: number,
  page: number,
  body: readonly Pick<Passage, "id" | "toc_node_id" | "text_raw">[],
): Map<number, TocItem> {
  const byId = new Map(flattenToc(items).map((i) => [i.id, i]));
  const headings = new Map<number, TocItem>();
  const seen = new Set<number>();
  for (const p of body) {
    if (p.toc_node_id === null || seen.has(p.toc_node_id)) continue;
    seen.add(p.toc_node_id);
    const node = byId.get(p.toc_node_id);
    if (node && node.juz === juz && node.page === page && p.text_raw.trim() === node.title.trim()) {
      headings.set(p.id, node);
    }
  }
  return headings;
}

/**
 * Jangkar `#bab-<id>` untuk node yang mulai di halaman ini (tujuan `/kitab/<karya>/bab/<id>`):
 * diletakkan sebelum paragraf badan pertama milik node itu atau turunannya. Node yang tidak punya
 * paragraf di halaman ini masuk `unplaced` (jangkar di awal teks).
 */
export function sectionStarts(
  items: readonly TocItem[],
  juz: number,
  page: number,
  body: readonly Pick<Passage, "id" | "toc_node_id">[],
): { byPassage: Map<number, number[]>; unplaced: number[] } {
  const byPassage = new Map<number, number[]>();
  const unplaced: number[] = [];
  for (const node of flattenToc(items)) {
    if (node.juz !== juz || node.page !== page) continue;
    const subtree = new Set(flattenToc([node]).map((i) => i.id));
    const first = body.find((p) => p.toc_node_id !== null && subtree.has(p.toc_node_id));
    if (first === undefined) unplaced.push(node.id);
    else byPassage.set(first.id, [...(byPassage.get(first.id) ?? []), node.id]);
  }
  return { byPassage, unplaced };
}
