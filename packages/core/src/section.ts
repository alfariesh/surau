// read_section: paragraf sebuah bagian daftar isi beserta semua sub-bagiannya, dipaginasi per
// ±3,5–5 ribu token `passages` (perkiraan terkalibrasi, tokens.ts; ADR-033, ADR-049), sehingga
// seluruh hasil tool MCP ≤ ±6 ribu token.
//
// Satuan potong = BLOK: satu paragraf badan + catatan kaki di halaman yang sama yang pertama kali
// dirujuknya. Catatan kaki yang tidak dirujuk paragraf badan mana pun di bagian ini (catatan yatim,
// takhrij yang dipotong dari matan) ikut blok terakhir halamannya; halaman tanpa paragraf badan
// menjadi satu blok catatan kaki. Jadi paragraf tidak pernah dipotong, dan penanda selalu satu
// potongan dengan catatan kakinya. Batas halaman cetak didahulukan bila jatuh di rentang
// 3,5–5 ribu token; bila tidak ada, potongan diisi sampai mendekati 5 ribu dan halaman terbelah di
// antara blok. Di dalam satu potongan, setiap halaman tampil badan dulu, lalu catatan kakinya.
import { getSectionPassages, getTocNode } from "@surau/db";
import type { D1Db, PassageWithPageRow } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import { decodeCursor, encodeCursor } from "./cursor.ts";
import { NotFound, parseInput } from "./errors.ts";
import { toPassages } from "./passages.ts";
import { readSectionInput } from "./schema.ts";
import type { Passage, SectionView } from "./schema.ts";
import { tocAncestors, tocNodeRef, tocTree } from "./toc.ts";
import { tocNodesOf } from "./toc-memo.ts";
import {
  SECTION_MAX_TOKENS,
  SECTION_MIN_TOKENS,
  SECTION_ROW_LIMIT,
  estimateTokens,
} from "./tokens.ts";

/** Satuan potong: paragraf badan (bila ada) + catatan kaki miliknya, di satu halaman. */
export interface SectionBlock {
  juz: number;
  page_no: number;
  /** `ord` paragraf badannya; 0 untuk blok catatan kaki saja (halaman tanpa paragraf badan). */
  key: number;
  /** Blok terakhir halamannya (di antara paragraf bagian ini). */
  endsPage: boolean;
  body: Passage | null;
  foots: Passage[];
  tokens: number;
}

/** Butir berurutan → kelompok butir berurutan dengan halaman cetak yang sama. */
function groupByPage<T>(
  items: readonly T[],
  at: (item: T) => { juz: number; page_no: number },
): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const last = groups.at(-1);
    const head = last?.[0];
    const here = at(item);
    if (last !== undefined && head !== undefined) {
      const prev = at(head);
      if (prev.juz === here.juz && prev.page_no === here.page_no) {
        last.push(item);
        continue;
      }
    }
    groups.push([item]);
  }
  return groups;
}

const rowPage = (r: PassageWithPageRow) => r;
const passagePage = (p: Passage) => p.location;
const blockPage = (b: SectionBlock) => b;

/** Blok satu halaman dari paragrafnya dalam urutan tampil (badan urut ord, lalu catatan kaki). */
export function pageBlocks(page: readonly Passage[]): SectionBlock[] {
  const first = page[0];
  if (first === undefined) return [];
  const { juz, page_no } = first.location;
  const bodies = page.filter((p) => p.kind === "body");
  const foots = page.filter((p) => p.kind === "foot");
  const owner = new Map<number, number>(); // footnote id → indeks paragraf badan pemiliknya
  for (const [i, b] of bodies.entries()) {
    for (const r of b.footnote_refs) if (!owner.has(r.footnote_id)) owner.set(r.footnote_id, i);
  }
  const groups: Passage[][] = bodies.map(() => []);
  const loose: Passage[] = [];
  for (const f of foots) {
    const i = owner.get(f.id);
    (i === undefined ? loose : (groups[i] ?? loose)).push(f);
  }
  const blocks =
    bodies.length === 0
      ? [{ key: 0, body: null, foots: loose }]
      : bodies.map((b, i) => ({
          key: b.ord,
          body: b,
          foots: i === bodies.length - 1 ? [...(groups[i] ?? []), ...loose] : (groups[i] ?? []),
        }));
  return blocks.map((b, i) => ({
    juz,
    page_no,
    key: b.key,
    endsPage: i === blocks.length - 1,
    body: b.body,
    foots: b.foots.toSorted((x, y) => x.ord - y.ord),
    tokens: [b.body, ...b.foots].reduce((n, p) => n + (p === null ? 0 : estimateTokens(p)), 0),
  }));
}

/**
 * Jumlah blok dari depan untuk satu potongan: diisi selama ≤ `SECTION_MAX_TOKENS` (blok pertama
 * selalu ikut, sebesar apa pun), lalu dipotong di batas halaman TERAKHIR yang sudah ≥
 * `SECTION_MIN_TOKENS`; bila tidak ada, sebanyak yang muat.
 */
export function pickBlocks(blocks: readonly Pick<SectionBlock, "tokens" | "endsPage">[]): number {
  let total = 0;
  let fill = 0;
  let pageEnd = 0;
  for (const b of blocks) {
    if (fill > 0 && total + b.tokens > SECTION_MAX_TOKENS) break;
    total += b.tokens;
    fill += 1;
    if (b.endsPage && total >= SECTION_MIN_TOKENS) pageEnd = fill;
  }
  return pageEnd > 0 ? pageEnd : fill;
}

/** Blok terpilih → paragraf dalam urutan tampil: per halaman, badan dulu lalu catatan kaki. */
function blocksToPassages(blocks: readonly SectionBlock[]): Passage[] {
  return groupByPage(blocks, blockPage).flatMap((page) => [
    ...page.flatMap((b) => (b.body === null ? [] : [b.body])),
    ...page.flatMap((b) => b.foots).toSorted((x, y) => x.ord - y.ord),
  ]);
}

/**
 * Satu potongan bagian `nodeId`. Tanpa `cursor`: dari awal; dengan `cursor`: `next_cursor`
 * potongan sebelumnya. `NotFound` bila node tidak ada; `InvalidCitation` bila cursor rusak
 * atau milik node lain.
 */
export function readSection(db: D1Db, nodeId: number, cursor?: string): Promise<SectionView> {
  return readSectionWithLimit(db, nodeId, cursor, SECTION_ROW_LIMIT);
}

/**
 * `readSection` dengan batas baris per panggilan yang bisa diatur. Hanya untuk tes jalur
 * pemotongan baris (dengan 200 baris, jalur itu praktis tidak pernah tercapai di Ihya); tidak
 * diekspor dari index.
 */
export async function readSectionWithLimit(
  db: D1Db,
  nodeId: number,
  cursor: string | undefined,
  rowLimit: number,
): Promise<SectionView> {
  const input = parseInput(readSectionInput, { node_id: nodeId, cursor });
  const from = input.cursor === undefined ? null : decodeCursor(input.cursor, input.node_id);
  const node = await getTocNode(db, input.node_id);
  if (node === null) throw new NotFound(`Table of contents node not found: ${input.node_id}`);

  const [cite, tocRows, rows] = await Promise.all([
    loadCiteContext(db, node.edition_id),
    tocNodesOf(db, node.edition_id),
    getSectionPassages(
      db,
      node.id,
      from === null ? null : { juz: from.juz, page_no: from.pageNo },
      rowLimit + 1,
    ),
  ]);
  const tree = tocTree(tocRows);
  const nodeRow = tree.byId.get(node.id);
  if (nodeRow === undefined)
    throw new Error("toc_node tanpa halaman awal (korpus tidak konsisten)");

  // Lebih dari rowLimit baris → halaman terakhir mungkin terpotong: jangan dikirim, jadikan awal
  // potongan berikutnya (dari awal halaman).
  const pages = groupByPage(rows.slice(0, rowLimit), rowPage);
  const truncated = rows.length > rowLimit ? pages.pop()?.[0] : undefined;
  if (truncated !== undefined && pages.length === 0) {
    throw new Error(`satu halaman bagian ${node.id} melebihi ${rowLimit} paragraf`);
  }

  const assembled = await toPassages(db, cite, pages.flat());
  let blocks = groupByPage(assembled, passagePage).flatMap((page) => pageBlocks(page));
  // Lanjutan di tengah halaman: lewati blok halaman cursor yang sudah terkirim.
  if (from !== null) {
    blocks = blocks.filter(
      (b) => !(b.juz === from.juz && b.page_no === from.pageNo && b.key < from.bodyOrd),
    );
  }
  const taken = pickBlocks(blocks);
  const chosen = blocks.slice(0, taken);
  const passages = blocksToPassages(chosen);
  const next = blocks[taken];
  const nextCursor =
    next !== undefined
      ? encodeCursor({ nodeId: node.id, juz: next.juz, pageNo: next.page_no, bodyOrd: next.key })
      : truncated !== undefined
        ? encodeCursor({
            nodeId: node.id,
            juz: truncated.juz,
            pageNo: truncated.page_no,
            bodyOrd: 0,
          })
        : null;

  const firstPage = chosen[0];
  return {
    citation:
      firstPage === undefined
        ? cite.citation(nodeRow.start_juz, nodeRow.start_page_no)
        : cite.citation(firstPage.juz, firstPage.page_no),
    node: {
      ...tocNodeRef(cite, nodeRow),
      start: cite.location(nodeRow.start_juz, nodeRow.start_page_no),
    },
    ancestors: tocAncestors(cite, tree, nodeRow),
    passages,
    estimated_tokens: chosen.reduce((n, b) => n + b.tokens, 0),
    next_cursor: nextCursor,
  };
}
