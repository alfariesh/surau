import type { TocNode } from "@surau/core";

import { describe, expect, it } from "vite-plus/test";

import { activeTocIds, flattenToc, headingPassages, sectionStarts, slimToc, tocPath } from "./toc";

function node(id: number, title: string, juz: number, page: number, children: TocNode[] = []) {
  const n: TocNode = {
    id,
    title_ar: title,
    level: 1,
    permalink: `/kitab/uji/bab/${id}`,
    ord: id,
    start: { juz, page_no: page, permalink: `/kitab/uji/${juz}/${page}`, label: "" },
    patched: false,
    child_count: children.length,
    children,
  };
  return n;
}

// Pohon buatan: 1 (j1 h1) › 2 (j1 h1), 3 (j1 h5) › 4 (j1 h7); 5 (j2 h1).
const TREE = slimToc([
  node(1, "باب", 1, 1, [
    node(2, "فصل أول", 1, 1),
    node(3, "فصل ثان", 1, 5, [node(4, "مسألة", 1, 7)]),
  ]),
  node(5, "باب آخر", 2, 1),
]);

describe("toc", () => {
  it("pohon ramping: judul DB, permalink halaman awal, urutan baca", () => {
    expect(TREE[0]).toMatchObject({ id: 1, title: "باب", href: "/kitab/uji/1/1", juz: 1, page: 1 });
    expect(flattenToc(TREE).map((i) => i.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("jalur breadcrumb akar → node", () => {
    expect(tocPath(TREE, 4).map((i) => i.id)).toEqual([1, 3, 4]);
    expect(tocPath(TREE, 99)).toEqual([]);
  });

  it("bagian aktif dari paragraf badan (unik, urut), atau node terakhir sebelum halaman", () => {
    expect(
      activeTocIds(TREE, 1, 7, [{ toc_node_id: 3 }, { toc_node_id: 4 }, { toc_node_id: 4 }]),
    ).toEqual([3, 4]);
    expect(activeTocIds(TREE, 1, 6, [{ toc_node_id: null }])).toEqual([3]);
    expect(activeTocIds(TREE, 3, 1, [])).toEqual([5]);
    expect(activeTocIds([], 1, 1, [])).toEqual([]);
  });

  it("judul bagian dikenali hanya bila teksnya sama persis dan node mulai di halaman ini", () => {
    const body = [
      { id: 10, toc_node_id: 3, text_raw: "فصل ثان" },
      { id: 11, toc_node_id: 3, text_raw: "فصل ثان" },
      { id: 12, toc_node_id: 2, text_raw: "فصل أول" },
    ];
    const at5 = headingPassages(TREE, 1, 5, body);
    expect([...at5.keys()]).toEqual([10]);
    // Node 2 mulai di h.1, bukan h.5: paragrafnya tidak dijadikan judul.
    expect(
      headingPassages(TREE, 1, 5, [{ id: 12, toc_node_id: 2, text_raw: "فصل أول" }]).size,
    ).toBe(0);
    expect(headingPassages(TREE, 1, 5, [{ id: 13, toc_node_id: 3, text_raw: "نص آخر" }]).size).toBe(
      0,
    );
  });

  it("jangkar bab: sebelum paragraf pertama node atau turunannya; tanpa paragraf = di awal", () => {
    // j1 h1: node 1 dan 2 mulai di sini; paragraf pertama milik node 2 (turunan 1).
    const h1 = sectionStarts(TREE, 1, 1, [
      { id: 20, toc_node_id: 2 },
      { id: 21, toc_node_id: 2 },
    ]);
    expect([...h1.byPassage.entries()]).toEqual([[20, [1, 2]]]);
    expect(h1.unplaced).toEqual([]);
    const h7 = sectionStarts(TREE, 1, 7, [{ id: 30, toc_node_id: 3 }]);
    expect([...h7.byPassage.entries()]).toEqual([]);
    expect(h7.unplaced).toEqual([4]);
  });
});
