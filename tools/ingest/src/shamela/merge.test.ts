import { describe, expect, test } from "vite-plus/test";

import { mergeSamePageMarkers, parseOpenitiPages } from "../openiti/markdown.ts";
import { buildToc } from "../toc.ts";
import { mergeSamePrintPages, parsePage } from "./page.ts";

// Halaman BUATAN yang meniru struktur Shamela; isinya kalimat karangan.
const at = (id: number, pageNo: number, content: string) =>
  parsePage({ id, juz: 1, pageNo, content });

describe("mergeSamePrintPages (ADR-139)", () => {
  test("halaman berurutan bernomor sama digabung; kunci ID tetap per halaman sumber", () => {
    const pages = [
      at(1, 5, '<span data-type="title" id=toc-1>باب اول</span>\rكلام اول'),
      at(
        2,
        6,
        '<span data-type="title" id=toc-2>باب ثان</span>\rكلام ثان (١)\r_________\r(١) حاشية',
      ),
      at(3, 6, '<span data-type="title" id=toc-3>باب ثالث</span>\rكلام ثالث'),
      at(4, 7, "كلام رابع"),
    ];
    const merged = mergeSamePrintPages(pages);
    expect(merged.map((p) => [p.source.pageNo, p.source.id, p.sourcePageIds])).toEqual([
      [5, 1, [1]],
      [6, 2, [2, 3]],
      [7, 4, [4]],
    ]);
    // Halaman tunggal tidak disentuh.
    expect(merged[0]).toBe(pages[0]);
    const six = merged[1] as (typeof merged)[number];
    // Paragraf urut sumber; kunci + halaman asal tetap (peta ID `<page.id>:<key>`).
    expect(six.body.map((d) => [d.sourcePageId, d.key, d.text])).toEqual([
      [2, "b0", "باب ثان"],
      [2, "b1", "كلام ثان (١)"],
      [3, "b0", "باب ثالث"],
      [3, "b1", "كلام ثالث"],
    ]);
    expect(six.foot.map((d) => [d.sourcePageId, d.key])).toEqual([[2, "f0"]]);
    // Offset badan dan judul menunjuk teks badan gabungan.
    for (const d of six.body) expect(six.bodyText.slice(d.start, d.end)).toBe(d.text);
    expect(six.titles.map((t) => [t.tocId, six.bodyText.slice(t.offset, t.offset + 7)])).toEqual([
      [2, "باب ثان"],
      [3, "باب ثال"],
    ]);
    expect(six.links.map((l) => [l.body, l.foot, l.label])).toEqual([[1, 0, "١"]]);
    expect(six.markers).toEqual({ total: 1, body: 1, inline: 0 });
  });

  test("tautan catatan halaman kedua bergeser ke indeks gabungan", () => {
    const [p] = mergeSamePrintPages([
      at(1, 6, "كلام اول"),
      at(2, 6, "كلام ثان (١)\r_________\r(١) حاشية"),
    ]);
    expect(p?.links.map((l) => [l.body, l.foot])).toEqual([[1, 0]]);
    expect(p?.foot.map((f) => f.sourcePageId)).toEqual([2]);
  });

  test("nomor cetak sama yang tidak berurutan ditolak", () => {
    expect(() => mergeSamePrintPages([at(1, 6, "أ"), at(2, 7, "ب"), at(3, 6, "ج")])).toThrow(
      /tidak berurutan/,
    );
  });

  test("juz berbeda dengan nomor cetak sama tidak digabung", () => {
    const merged = mergeSamePrintPages([
      at(1, 6, "أ"),
      parsePage({ id: 2, juz: 2, pageNo: 6, content: "ب" }),
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe("halaman gabungan di daftar isi dan pengaman (ADR-139)", () => {
  test("judul tanpa span di halaman sumber kedua mulai di awal halaman sumber itu", () => {
    const merged = mergeSamePrintPages([
      at(1, 6, '<span data-type="title" id=toc-1>باب اول</span>\rكلام اول'),
      at(2, 6, "كلام ثان\rكلام ثالث"),
    ]);
    const titles = [
      { id: 1, content: "باب اول", page: 1, parent: 0 },
      { id: 2, content: "باب ثان", page: 2, parent: 0 },
    ];
    const toc = buildToc(titles, merged, { shamela_book: 1, add: [], move: [] });
    expect(toc.spanless).toEqual([2]);
    // Paragraf halaman sumber pertama tetap di bab 1; halaman sumber kedua di bab 2.
    expect(toc.body[0]).toEqual(["t1", "t1", "t2", "t2"]);
    expect(merged[0]?.sourceOffsets).toEqual([0, "باب اول\nكلام اول\n".length]);
  });

  test("takhrij menempel (//) di halaman gabungan ditolak", () => {
    expect(() =>
      mergeSamePrintPages([at(1, 6, "متن اول // حديث كذا أخرجه فلان"), at(2, 6, "ب")]),
    ).toThrow(/takhrij menempel/);
  });

  test("penanda OpenITI bernomor sama yang tidak berurutan ditolak", () => {
    const pages = parseOpenitiPages(
      "#META#Header#End#\n# أ PageV01P006\n# ب PageV01P007\n# ج PageV01P006",
    );
    expect(() => mergeSamePageMarkers(pages)).toThrow(/tidak berurutan/);
  });
});

describe("mergeSamePageMarkers (ADR-139)", () => {
  test("penanda OpenITI berurutan bernomor sama digabung; yang lain tetap", () => {
    // mARkdown buatan (bukan teks OpenITI).
    const pages = parseOpenitiPages(
      "#META#Header#End#\n# أ PageV01P006\n# ب PageV01P006\n# ج PageV01P007\n# د PageV02P007",
    );
    expect(mergeSamePageMarkers(pages)).toEqual([
      { volume: 1, page: 6, text: "أ\nب" },
      { volume: 1, page: 7, text: "ج" },
      { volume: 2, page: 7, text: "د" },
    ]);
  });
});
