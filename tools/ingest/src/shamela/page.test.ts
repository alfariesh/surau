import { describe, expect, test } from "vite-plus/test";

import { parsePage } from "./page.ts";

// Halaman BUATAN yang meniru struktur Shamela; isinya kalimat karangan.
const page = (content: string) => parsePage({ id: 9, juz: 1, pageNo: 9, content });

describe("parsePage", () => {
  test("judul, paragraf, catatan kaki, dan tautan penanda", () => {
    const p = page(
      '<span data-type="title" id=toc-4>باب</span>\rكلام اول (١) ثم (٢)\r<span data-type="title">بلا رقم</span> <x>\r_________\r(١) حديث كذا أخرجه فلان\rتتمة\r(٣) حاشية',
    );
    expect(p.body.map((d) => [d.key, d.text])).toEqual([
      ["b0", "باب"],
      ["b1", "كلام اول (١) ثم (٢)"],
      ["b2", "بلا رقم <x>"],
    ]);
    expect(p.titles).toEqual([{ tocId: 4, offset: 0 }]);
    expect(p.untitledSpans).toBe(1);
    expect(p.unknownTags).toEqual(["x"]);
    expect(p.foot.map((d) => [d.key, d.noteNumber, d.text])).toEqual([
      ["f0", 1, "(١) حديث كذا أخرجه فلان\nتتمة"],
      ["f1", 3, "(٣) حاشية"],
    ]);
    expect(p.links).toEqual([
      { body: 1, marker: { number: 1, start: 9, end: 12 }, label: "١", foot: 0 },
    ]);
    expect(p.orphanRefs.map((m) => m.number)).toEqual([2]);
    expect(p.orphanNotes).toBe(1);
  });

  test("takhrij menempel: sesudah, sebelum, dan tidak dikenali", () => {
    const p = page(
      "متن اول // حديث كذا أخرجه فلان\rمتن ثان (٢) حديث كذا رواه فلان // متن يستمر\rمتن ثالث // بلا تخريج",
    );
    expect(p.inline).toEqual([
      { direction: "after", line: 0 },
      { direction: "before", line: 1 },
      { direction: null, line: 2 },
    ]);
    expect(p.body.map((d) => [d.key, d.text, d.reasons])).toEqual([
      ["b0", "متن اول", []],
      ["b1", "متن ثان", []],
      ["b1.1", "متن يستمر", []],
      ["b2", "متن ثالث // بلا تخريج", ["inline_unsplit"]],
    ]);
    expect(p.foot.map((d) => [d.key, d.kind, d.text, d.reasons, d.line])).toEqual([
      ["t0", "foot", "حديث كذا أخرجه فلان", ["takhrij_inline"], 0],
      ["t1", "foot", "(٢) حديث كذا رواه فلان", ["takhrij_inline"], 1],
    ]);
    // Offset potongan menunjuk teks badan bersih yang utuh.
    for (const d of [...p.body, ...p.foot]) expect(p.bodyText.slice(d.start, d.end)).toBe(d.text);
  });

  test("halaman kosong", () => {
    const p = page("");
    expect([p.body, p.foot, p.titles, p.links]).toEqual([[], [], [], []]);
  });
});
