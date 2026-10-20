// get_table_of_contents: pohon daftar isi satu edisi, dipotong pada kedalaman tertentu supaya
// keluaran MCP tetap kecil (Ihya utuh = 313 node). `child_count` memberi tahu bahwa ada anak
// yang tidak ikut dikirim, sehingga pemanggil bisa turun lewat `nodeId`.
import type { D1Db, TocNodeWithStartRow } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { sectionPermalink } from "./permalink.ts";
import { getTocInput } from "./schema.ts";
import type { TocNode, TocNodeRef, TocView } from "./schema.ts";
import { tocNodesOf } from "./toc-memo.ts";

/** Pohon daftar isi sebuah edisi dalam memori (anak urut `ord`). */
export interface TocTree {
  byId: Map<number, TocNodeWithStartRow>;
  children(parentId: number | null): TocNodeWithStartRow[];
}

export function tocTree(rows: readonly TocNodeWithStartRow[]): TocTree {
  const byId = new Map<number, TocNodeWithStartRow>();
  const kids = new Map<number | null, TocNodeWithStartRow[]>();
  for (const r of rows) {
    byId.set(r.id, r);
    const list = kids.get(r.parent_id) ?? [];
    list.push(r);
    kids.set(r.parent_id, list);
  }
  for (const list of kids.values()) list.sort((a, b) => a.ord - b.ord);
  return { byId, children: (parentId) => kids.get(parentId) ?? [] };
}

export function tocNodeRef(cite: CiteContext, n: TocNodeWithStartRow): TocNodeRef {
  return {
    id: n.id,
    title_ar: n.title_ar,
    level: n.level,
    permalink: sectionPermalink(cite.path, n.id),
  };
}

/** Leluhur sebuah node, dari akar sampai induknya (tanpa node itu sendiri). */
export function tocAncestors(
  cite: CiteContext,
  tree: TocTree,
  node: TocNodeWithStartRow,
): TocNodeRef[] {
  const out: TocNodeRef[] = [];
  const seen = new Set<number>([node.id]);
  let parentId = node.parent_id;
  while (parentId !== null) {
    const parent = tree.byId.get(parentId);
    // Induk hilang atau siklus = data rusak; berhenti daripada berputar tanpa akhir.
    if (parent === undefined || seen.has(parent.id)) break;
    seen.add(parent.id);
    out.push(tocNodeRef(cite, parent));
    parentId = parent.parent_id;
  }
  return out.reverse();
}

/**
 * Daftar isi edisi. Tanpa `nodeId`: node akar; dengan `nodeId`: node itu beserta subpohonnya.
 * `depth` (bawaan 2, maks. 10) menghitung tingkat yang dikirim, termasuk tingkat awal.
 * `NotFound` bila edisi atau node (di edisi itu) tidak ada.
 */
export async function getToc(
  db: D1Db,
  editionId: number,
  options: { nodeId?: number; depth?: number } = {},
): Promise<TocView> {
  const input = parseInput(getTocInput, {
    edition_id: editionId,
    node_id: options.nodeId,
    depth: options.depth,
  });
  const [cite, rows] = await Promise.all([
    loadCiteContext(db, input.edition_id),
    tocNodesOf(db, input.edition_id),
  ]);
  const tree = tocTree(rows);
  let start: TocNodeWithStartRow[];
  let ancestors: TocNodeRef[] = [];
  if (input.node_id === undefined) {
    start = tree.children(null);
  } else {
    const node = tree.byId.get(input.node_id);
    if (node === undefined)
      throw new NotFound(`Table of contents node not found: ${input.node_id}`);
    start = [node];
    ancestors = tocAncestors(cite, tree, node);
  }
  const first = start[0];
  if (first === undefined) throw new NotFound(`Table of contents not found: ${input.edition_id}`);

  // `visited` menjaga dari siklus parent_id (data rusak): setiap node dikirim paling banyak sekali.
  const visited = new Set<number>(start.map((n) => n.id));
  const build = (n: TocNodeWithStartRow, depth: number): TocNode => {
    const kids = tree.children(n.id).filter((k) => !visited.has(k.id));
    if (depth > 1) for (const k of kids) visited.add(k.id);
    return {
      ...tocNodeRef(cite, n),
      ord: n.ord,
      start: cite.location(n.start_juz, n.start_page_no),
      patched: n.patched === 1,
      child_count: kids.length,
      children: depth > 1 ? kids.map((k) => build(k, depth - 1)) : [],
    };
  };
  return {
    citation: cite.citation(first.start_juz, first.start_page_no),
    ancestors,
    depth: input.depth,
    nodes: start.map((n) => build(n, input.depth)),
  };
}
