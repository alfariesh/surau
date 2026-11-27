import { describe, expect, test } from "vite-plus/test";

import { applyEditorExclusion, editorTextFile, planEditorExclusion } from "./editor-text.ts";
import type { EditorTextFile } from "./editor-text.ts";
import { createAllocator } from "./ids.ts";
import type { IdAllocator } from "./ids.ts";
import type { CorpusRows } from "./rows.ts";
import { parsePage } from "./shamela/page.ts";
import type { ShamelaTitle } from "./shamela/source.ts";
import { buildToc } from "./toc.ts";

// Kitab buatan empat halaman (kalimat karangan, bukan teks kitab): halaman 1 = judul + pengantar
// penyunting, halaman 2–3 = teks penulis, halaman 4 = tambahan penyunting dengan judul sendiri.
const pages = [
  [1, '<span data-type="title" id=toc-1>مقدمة</span>\rكلام المحقق\rتوقيع المحقق'],
  [2, "كلام المؤلف الاول\rكلام المؤلف الثاني"],
  [3, "كلام المؤلف الثالث\rانتهى الكتاب"],
  [
    4,
    '<span data-type="title" id=toc-2>فوائد</span>\r<span data-type="title" id=toc-3>لطيفة</span>\rزيادة المحقق',
  ],
].map(([id, content], i) =>
  parsePage({ id: id as number, juz: 1, pageNo: i + 1, content: content as string }),
);
const title = (id: number, page: number, parent: number): ShamelaTitle => ({
  id,
  content: `عنوان ${id}`,
  page,
  parent,
});
const toc = buildToc([title(1, 1, 0), title(2, 4, 0), title(3, 4, 2)], pages, {
  shamela_book: 9,
  add: [],
  move: [],
});
const ED = 5;

/** Alokasi seperti buildRows: halaman, node, lalu paragraf dalam urutan sumber. */
function allocate(): IdAllocator {
  const ids = createAllocator({ format: 1, edition: ED, page: {}, toc: {}, passage: {} });
  for (const p of pages) ids.seq("page", String(p.source.id));
  for (const n of toc.nodes) ids.seq("toc", n.key);
  for (const p of pages) for (const d of p.body) ids.seq("passage", `${p.source.id}:${d.key}`);
  return ids;
}

const FILE: EditorTextFile = editorTextFile.parse({
  shamela_book: 9,
  bagian: [
    {
      nama: "pengantar",
      alasan: "x",
      kunci: ["1:b1", "1:b2"],
      paragraf_id: [[50000002, 50000003]],
    },
    { nama: "penanda akhir", alasan: "x", kunci: ["3:b1"], paragraf_id: [50000007] },
    {
      nama: "tambahan",
      alasan: "x",
      judul: [2, 3],
      halaman: [4],
      paragraf_id: [[50000008, 50000010]],
    },
  ],
});

const plan = (file: EditorTextFile, ids = allocate()) =>
  planEditorExclusion(file, { shamelaBook: 9, editionId: ED, pages, toc, ids, where: "tes" });
const one = (bagian: unknown) => editorTextFile.parse({ shamela_book: 9, bagian: [bagian] });
const byNumber = (a: number, b: number) => a - b;

describe("teks badan penyunting (ADR-150)", () => {
  test("rencana: paragraf, node, dan halaman yang dibuang tanpa mengalokasikan ID baru", () => {
    const ids = allocate();
    const before = ids.snapshot();
    const p = plan(FILE, ids);
    expect([...p.passages].sort(byNumber)).toEqual([
      50000002, 50000003, 50000007, 50000008, 50000009, 50000010,
    ]);
    expect([...p.tocNodes].sort(byNumber)).toEqual([500002, 500003]);
    expect([...p.pages]).toEqual([500004]);
    // Peta ID sama persis: ID paragraf lain tidak bergeser.
    expect(ids.snapshot()).toEqual(before);
    expect(ids.added).toEqual({ page: 4, toc: 3, passage: 10 });
  });

  test("applyEditorExclusion: baris yang dibuang hilang, sisanya utuh", () => {
    const rows = {
      page: [{ id: 500001 }, { id: 500004 }],
      toc_node: [{ id: 500001 }, { id: 500002 }],
      passage: [{ id: 50000001 }, { id: 50000002 }, { id: 50000004 }],
      footnote_ref: [
        { passage_id: 50000004, footnote_passage_id: 50000002 },
        { passage_id: 50000004, footnote_passage_id: 50000005 },
      ],
      passage_needs_review: [{ passage_id: 50000002 }, { passage_id: 50000004 }],
    };
    type Rows = Pick<
      CorpusRows,
      "page" | "toc_node" | "passage" | "footnote_ref" | "passage_needs_review"
    >;
    const out = applyEditorExclusion(rows as unknown as Rows, plan(FILE)) as unknown as typeof rows;
    expect(out.page).toEqual([{ id: 500001 }]);
    expect(out.toc_node).toEqual([{ id: 500001 }]);
    expect(out.passage).toEqual([{ id: 50000001 }, { id: 50000004 }]);
    expect(out.footnote_ref).toEqual([{ passage_id: 50000004, footnote_passage_id: 50000005 }]);
    expect(out.passage_needs_review).toEqual([{ passage_id: 50000004 }]);
  });

  test("entri yang tidak ditemukan = galat", () => {
    expect(() =>
      plan(one({ nama: "a", alasan: "x", kunci: ["1:b9"], paragraf_id: [50000002] })),
    ).toThrow(/1:b9 tidak ada/);
    expect(() =>
      plan(one({ nama: "a", alasan: "x", judul: [99], paragraf_id: [50000002] })),
    ).toThrow(/judul 99 tidak ada/);
    expect(() =>
      plan(
        one({ nama: "a", alasan: "x", kunci: ["1:b1"], halaman: [77], paragraf_id: [50000002] }),
      ),
    ).toThrow(/halaman 77 tidak ada/);
    expect(() =>
      planEditorExclusion(FILE, {
        shamelaBook: 8,
        editionId: ED,
        pages,
        toc,
        ids: allocate(),
        where: "tes",
      }),
    ).toThrow(/kitab 9, bukan 8/);
  });

  test("paragraf_id wajib sama persis dengan hitungan kode", () => {
    expect(() =>
      plan(one({ nama: "a", alasan: "x", kunci: ["1:b1", "1:b2"], paragraf_id: [50000002] })),
    ).toThrow(/dibuang tetapi tidak tercantum: 50000003/);
    expect(() =>
      plan(one({ nama: "a", alasan: "x", kunci: ["1:b1"], paragraf_id: [50000002, 50000004] })),
    ).toThrow(/tercantum tetapi tidak dibuang: 50000004/);
  });

  test("anak node dan halaman yang masih berisi tidak boleh tertinggal", () => {
    expect(() =>
      plan(one({ nama: "a", alasan: "x", judul: [2], paragraf_id: [50000008] })),
    ).toThrow(/t3 anak dari t2/);
    expect(() =>
      plan(one({ nama: "a", alasan: "x", kunci: ["3:b1"], halaman: [3], paragraf_id: [50000007] })),
    ).toThrow(/halaman 3 dibuang tetapi 1 paragrafnya tidak/);
    // Semua paragraf halaman 2 dibuang tanpa menyebut halamannya: halaman kosong di pembaca.
    expect(() =>
      plan(
        one({
          nama: "a",
          alasan: "x",
          kunci: ["2:b0", "2:b1"],
          paragraf_id: [[50000004, 50000005]],
        }),
      ),
    ).toThrow(/halaman 2: semua paragrafnya dibuang/);
  });

  test("badan dan catatan kaki yang bertaut dibuang bersama", () => {
    // Kitab buatan satu halaman: dua paragraf badan, yang kedua bertanda (١) ke satu catatan.
    const fnPages = [
      parsePage({
        id: 1,
        juz: 1,
        pageNo: 1,
        content:
          '<span data-type="title" id=toc-1>باب</span>\rكلام المؤلف (١)\r_________\r(١) تعليق المحقق',
      }),
    ];
    const fnToc = buildToc([title(1, 1, 0)], fnPages, { shamela_book: 9, add: [], move: [] });
    const ids = createAllocator({ format: 1, edition: ED, page: {}, toc: {}, passage: {} });
    ids.seq("page", "1");
    ids.seq("toc", "t1");
    for (const d of [...fnPages[0]!.body, ...fnPages[0]!.foot]) ids.seq("passage", `1:${d.key}`);
    expect(fnPages[0]!.links).toHaveLength(1);
    const run = (kunci: string[], paragraf_id: number[]) =>
      planEditorExclusion(one({ nama: "a", alasan: "x", kunci, paragraf_id }), {
        shamelaBook: 9,
        editionId: ED,
        pages: fnPages,
        toc: fnToc,
        ids,
        where: "tes",
      });
    // b1 = badan bertanda, f0 = catatannya (seq 2 dan 3).
    expect(() => run(["1:b1"], [50000002])).toThrow(/b1 dan catatannya f0 harus dibuang bersama/);
    expect(() => run(["1:f0"], [50000003])).toThrow(/b1 dan catatannya f0 harus dibuang bersama/);
    expect([...run(["1:b1", "1:f0"], [50000002, 50000003]).passages]).toEqual([50000002, 50000003]);
  });
});
