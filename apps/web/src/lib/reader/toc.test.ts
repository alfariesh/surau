import type { TocNode } from "@surau/core";

import type { TocItem } from "./toc";

import { describe, expect, it } from "vite-plus/test";

import {
  activeRowId,
  activeTocIds,
  flattenToc,
  pageSections,
  pruneToc,
  slimToc,
  tocHref,
  tocPath,
  tocRows,
} from "./toc";

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

  it("node yang mulai di halaman ini (urut baca) beserta induknya", () => {
    expect(pageSections(TREE, 1, 1)).toEqual([
      { id: 1, parentId: null, level: 1, title: "باب" },
      { id: 2, parentId: 1, level: 1, title: "فصل أول" },
    ]);
    expect(pageSections(TREE, 1, 7)).toEqual([{ id: 4, parentId: 3, level: 1, title: "مسألة" }]);
    expect(pageSections(TREE, 1, 2)).toEqual([]);
  });

  it("baris aktif (X10): subjudul terakhir node aktif sampai halaman ini, selain itu node", () => {
    const sub = (id: number, juz: number, page: number): TocItem => ({
      id,
      kind: "sub",
      title: "عنوان",
      level: 3,
      href: `/kitab/uji/${juz}/${page}#p${id}`,
      juz,
      page,
      children: [],
    });
    // Node 3 (j1 h5): subjudul di h5 dan h6, sebelum anak node 4 (j1 h7).
    const tree = TREE.map((root) => ({
      ...root,
      children: root.children.map((c) =>
        c.id === 3 ? { ...c, children: [sub(901, 1, 5), sub(902, 1, 6), ...c.children] } : c,
      ),
    }));
    expect(activeRowId(tree, 3, 1, 5)).toBe(901);
    expect(activeRowId(tree, 3, 1, 6)).toBe(902);
    // Halaman sesudahnya yang masih milik node 3 (subjudul terakhir tetap berjalan).
    expect(activeRowId(tree, 3, 1, 8)).toBe(902);
    // Sebelum subjudul pertama, node tanpa subjudul, node tak dikenal: node itu sendiri.
    expect(activeRowId(tree, 3, 1, 4)).toBe(3);
    expect(activeRowId(tree, 4, 1, 7)).toBe(4);
    expect(activeRowId(tree, 99, 1, 7)).toBe(99);
    // Pohon ringkas tanpa anak node 3: node.
    expect(activeRowId(pruneToc(tree, new Set([1])), 3, 1, 6)).toBe(3);
  });

  it("tautan daftar isi unik per bagian: halaman awal + jangkar judul", () => {
    expect(tocHref(TREE[0]!.children[1]!)).toBe("/kitab/uji/1/5#bab-3");
  });

  it("garis pemandu: tegak bila masih ada saudara, siku di anak terakhir, aksen hanya jalur induk → aktif", () => {
    const guides = (rows: ReturnType<typeof tocRows>, id: number) =>
      rows.get(id)!.guides.map((g) => `${g.kind}:${g.accent}`);

    const deep = tocRows(TREE, 4);
    expect(guides(deep, 1)).toEqual([]);
    expect(guides(deep, 2)).toEqual(["line:none"]);
    expect(guides(deep, 3)).toEqual(["end:none"]);
    expect(guides(deep, 4)).toEqual(["none:none", "end:elbow"]);
    expect(deep.get(2)!.chevronSlot).toBe(true);
    expect(deep.get(4)!.chevronSlot).toBe(false);

    const mid = tocRows(TREE, 3);
    expect(guides(mid, 2)).toEqual(["line:line"]);
    expect(guides(mid, 3)).toEqual(["end:elbow"]);
    expect(guides(mid, 4)).toEqual(["none:none", "end:none"]);

    // Bagian aktif di akar: tidak ada induk, jadi tidak ada garis beraksen.
    const flat = [...tocRows(TREE, 5).values()].flatMap((r) => r.guides);
    expect(flat.every((g) => g.accent === "none")).toBe(true);
  });

  it("pohon ringkas (X09): akar utuh, anak hanya dari node terbuka, `more` hanya di node beranak", () => {
    // Bagian aktif = 2; TocTree membuka leluhurnya (1).
    const open = new Set(
      tocPath(TREE, 2)
        .slice(0, -1)
        .map((n) => n.id),
    );
    const pruned = pruneToc(TREE, open);
    expect(pruned.map((n) => n.id)).toEqual([1, 5]);
    expect(pruned[0]!.children.map((n) => n.id)).toEqual([2, 3]);
    const [two, three] = pruned[0]!.children;
    expect(two!.more).toBeUndefined();
    expect(three!.children).toEqual([]);
    expect(three!.more).toBe(true);
    expect(pruned[1]!.more).toBeUndefined();
    // Tanpa bagian aktif: hanya akar.
    expect(pruneToc(TREE, new Set()).every((n) => n.children.length === 0)).toBe(true);
    // Pohon asli tidak berubah.
    expect(TREE[0]!.children[1]!.children).toHaveLength(1);
  });

  it("pohon ringkas: garis pemandu dan ruang chevron baris yang tampil sama dengan pohon lengkap", () => {
    const open = new Set(
      tocPath(TREE, 2)
        .slice(0, -1)
        .map((n) => n.id),
    );
    const full = tocRows(TREE, 2);
    const shell = tocRows(pruneToc(TREE, open), 2);
    for (const id of [1, 2, 3, 5]) expect(shell.get(id), String(id)).toEqual(full.get(id));
  });
});
