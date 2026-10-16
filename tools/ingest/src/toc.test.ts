import { describe, expect, test } from "vite-plus/test";

import type { TocPatch } from "./patch.ts";
import { parsePage } from "./shamela/page.ts";
import type { ShamelaTitle } from "./shamela/source.ts";
import { buildToc } from "./toc.ts";

// Kitab buatan tiga halaman (isi karangan). Span judul meniru Shamela.
const pages = [
  [1, '<span data-type="title" id=toc-2>باب اول</span>\rكلام'],
  [2, 'كلام ثان\r<span data-type="title" id=toc-3>باب ثان</span>\rكتاب جديد وهو الثاني\rكلام'],
  [3, 'بقية\r<span data-type="title" id=toc-4>فصل</span>'],
].map(([id, content], i) =>
  parsePage({ id: id as number, juz: 1, pageNo: i + 1, content: content as string }),
);

const title = (id: number, page: number, parent: number): ShamelaTitle => ({
  id,
  content: ` عنوان ${id} `,
  page,
  parent,
});
const TITLES = [title(1, 1, 0), title(2, 1, 1), title(3, 2, 1), title(4, 3, 3)];
const none: TocPatch = { shamela_book: 1, add: [], move: [] };

describe("buildToc", () => {
  test("pohon, level, urutan, dan node tiap paragraf", () => {
    const toc = buildToc(TITLES, pages, none);
    expect(toc.issues).toEqual([]);
    expect(toc.spanless).toEqual([1]);
    expect(toc.nodes.map((n) => [n.key, n.level, n.ord, n.titleAr])).toEqual([
      ["t1", 1, 1, "عنوان 1"],
      ["t2", 2, 1, "عنوان 2"],
      ["t3", 2, 2, "عنوان 3"],
      ["t4", 3, 1, "عنوان 4"],
    ]);
    expect(toc.body).toEqual([
      ["t2", "t2"],
      ["t2", "t3", "t3", "t3"],
      ["t3", "t4"],
    ]);
  });

  test("patch: tambah node dengan judul yang disalin dari halaman, pindahkan judul", () => {
    const patch: TocPatch = {
      shamela_book: 1,
      add: [{ id: "baru", parent: 1, page: 2, heading: "كتاب جديد" }],
      move: [{ titles: [4], parent: "baru" }],
    };
    const toc = buildToc(TITLES, pages, patch);
    expect(toc.issues).toEqual([]);
    const baru = toc.nodes.find((n) => n.key === "patch:baru");
    expect(baru).toMatchObject({
      titleAr: "كتاب جديد",
      parentKey: "t1",
      level: 2,
      ord: 3,
      patched: true,
    });
    expect(toc.nodes.find((n) => n.key === "t4")).toMatchObject({
      parentKey: "patch:baru",
      level: 3,
      patched: true,
    });
    expect(toc.body[1]).toEqual(["t2", "t3", "patch:baru", "patch:baru"]);
    // Catatan kaki tanpa rujukan ikut paragraf badan terakhir di halaman.
    expect(toc.foot).toEqual([[], [], []]);
  });

  test("pelanggaran struktur dilaporkan", () => {
    const patch: TocPatch = {
      shamela_book: 1,
      add: [
        { id: "x", parent: 1, page: 99, heading: "كلام" },
        { id: "y", parent: 1, page: 3, heading: "غير موجود" },
      ],
      move: [
        { titles: [42], parent: 1 },
        { titles: [2], parent: "tidak-ada" },
      ],
    };
    const titles = [...TITLES, title(5, 77, 0), title(6, 3, 66)];
    const toc = buildToc(titles, pages, patch);
    expect(toc.issues).toEqual([
      "judul 5 yatim: page.id 77 tidak ada",
      "judul 6 yatim: induk 66 tidak ada",
      "patch x: page.id 99 tidak ada",
      'patch y: tidak ada paragraf yang dibuka "غير موجود" di page.id 3',
      "patch move: judul 42 tidak ada",
      "patch move: induk patch:tidak-ada tidak ada",
      "node t2 yatim: induk patch:tidak-ada tidak ada",
      "node t6 yatim: induk t66 tidak ada",
      // t2 yang induknya hilang menjadi akar, sesudah subpohon t1 yang berakhir di halaman 3.
      "urutan halaman tidak monoton: t4 → t2",
    ]);
  });

  test("siklus induk, span ganda, span tak dikenal, halaman tak monoton", () => {
    const dup = [
      ...pages,
      parsePage({
        id: 4,
        juz: 1,
        pageNo: 4,
        content:
          '<span data-type="title" id=toc-2>lagi</span>\r<span data-type="title" id=toc-9>?</span>',
      }),
    ];
    const cyc: TocPatch = { shamela_book: 1, add: [], move: [{ titles: [1], parent: 4 }] };
    const toc = buildToc(TITLES, dup, cyc);
    expect(toc.unknownSpans).toEqual([9]);
    expect(toc.issues).toContain("judul 2: span muncul 2 kali");
    expect(toc.issues).toContain("4 node tidak terjangkau dari akar (siklus induk)");

    // t4 (halaman 1) adalah anak t2 (halaman 3): mulai sebelum induknya.
    const back: ShamelaTitle[] = [title(1, 1, 0), title(2, 3, 1), title(3, 2, 1), title(4, 1, 2)];
    const p = [1, 2, 3].map((id, i) => parsePage({ id, juz: 1, pageNo: i + 1, content: "كلام" }));
    expect(buildToc(back, p, none).issues).toEqual(["urutan halaman tidak monoton: t2 → t4"]);
  });
});
