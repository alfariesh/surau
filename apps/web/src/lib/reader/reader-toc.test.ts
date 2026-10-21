import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vite-plus/test";

import type { SubheadingEntry } from "./subheadings";
import type { TocItem } from "./toc";

import { readerToc, subheadingItems } from "./reader-toc";
import { subheadingEntries } from "./subheadings";

vi.mock("./subheadings", async (original) => ({
  ...(await original<typeof import("./subheadings")>()),
  subheadingEntries: vi.fn<typeof subheadingEntries>(),
}));

// Teks buatan (bukan teks kitab).
const sha16 = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const BASE = 10_000_000;
const row = (
  seq: number,
  text: string,
  over: Partial<{ toc_node_id: number; ord: number }> = {},
) => ({
  id: BASE + seq,
  toc_node_id: 5,
  ord: seq,
  juz: 2,
  page_no: 40,
  text_raw: text,
  ...over,
});

describe("subheadingItems", () => {
  it("judul utuh + lanjutan, awal, akhir; plain/judul node/sidik usang dilewati; penanda dibuang", async () => {
    const head = row(1, "بيان فضل");
    const cont = row(2, "الصبر (١)");
    const lead = row(3, "ليلة الخميس قال أنس");
    const tail = row(4, "قال أنس بيان الشكر");
    const plain = row(5, "بيان حقيقة");
    const nodeTail = row(6, "وبيان فضل بيان حقيقة");
    const stale = row(7, "بيان آخر");
    const entries = new Map<number, SubheadingEntry>([
      [1, { kind: "heading", src: "bayan", sha: sha16(head.text_raw) }],
      [2, { kind: "heading", src: "kurasi", sha: sha16(cont.text_raw), of: 1 }],
      [3, { kind: "lead", end: "ليلة الخميس".length, sha: sha16(lead.text_raw) }],
      [4, { kind: "tail", start: "قال أنس ".length, sha: sha16(tail.text_raw) }],
      [5, { kind: "plain", sha: sha16(plain.text_raw) }],
      [6, { kind: "tail", start: 10, sha: sha16(nodeTail.text_raw), node: 5 }],
      [7, { kind: "heading", src: "bayan", sha: "0".repeat(16) }],
    ]);
    vi.mocked(subheadingEntries).mockReturnValue(entries);
    const marker = { passage_id: cont.id, char_start: 6, char_end: 9 };
    const items = await subheadingItems(
      1,
      [head, cont, lead, tail, plain, nodeTail, stale],
      [marker],
    );
    expect(items.map((i) => [i.seq, i.title, i.parentId])).toEqual([
      [1, "بيان فضل الصبر", 5],
      [3, "ليلة الخميس", 5],
      [4, "بيان الشكر", 5],
    ]);
    expect(items[0]).toMatchObject({ id: BASE + 1, juz: 2, page: 40 });
  });
});

describe("readerToc", () => {
  const node = (id: number, children: TocItem[] = [], level = 2): TocItem => ({
    id,
    kind: "node",
    title: `عنوان ${id}`,
    level,
    href: `/kitab/uji/2/${id}`,
    juz: 2,
    page: id,
    children,
  });

  it("subjudul = anak node pemiliknya, sebelum anak node, urut baca; judul Indonesia dipasang", () => {
    const toc = [node(5, [node(6, [], 3)])];
    const sub = (seq: number, page: number, ord: number) => ({
      id: BASE + seq,
      seq,
      parentId: 5,
      title: `فرع ${seq}`,
      juz: 2,
      page,
      ord,
    });
    const shown = readerToc(
      toc,
      {
        subs: [sub(9, 41, 1), sub(8, 40, 3)],
        titles: {
          node: new Map([[6, "Pasal Keenam"]]),
          sub: new Map([[BASE + 8, "Penjelasan kedelapan"]]),
          source: null,
        },
      },
      "uji",
    );
    const kids = shown[0]!.children;
    expect(kids.map((k) => [k.kind, k.id, k.level])).toEqual([
      ["sub", BASE + 8, 3],
      ["sub", BASE + 9, 3],
      ["node", 6, 3],
    ]);
    expect(kids[0]).toMatchObject({ href: "/kitab/uji/2/40#p8", titleId: "Penjelasan kedelapan" });
    expect(kids[1]!.titleId).toBeUndefined();
    expect(kids[2]!.titleId).toBe("Pasal Keenam");
    expect(shown[0]!.titleId).toBeUndefined();
    // Pohon asli tidak berubah (dipakai breadcrumb dan bagian aktif).
    expect(toc[0]!.children.map((k) => k.id)).toEqual([6]);
  });

  it("korpus tanpa judul Indonesia (skema < 7): pohon + subjudul saja", () => {
    const shown = readerToc([node(5)], { subs: [], titles: null }, "uji");
    expect(shown).toEqual([node(5)]);
  });
});
