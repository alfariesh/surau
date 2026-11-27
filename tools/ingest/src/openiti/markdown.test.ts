import { describe, expect, test } from "vite-plus/test";

import { parseOpenitiPages, stripMarkdown } from "./markdown.ts";

// mARkdown buatan (bukan teks OpenITI): judul, paragraf, baris lanjutan, milestone, tag ayat.
const SOURCE = [
  "######OpenITI#",
  "#META# 000.SortField\t:: buatan",
  "#META#Header#End#",
  "### | باب اول",
  "# سطر اول",
  "~~يكمل هنا ms0001 ثم @QB@ اية @QE@ PageV01P001 بقية على",
  "~~الصفحة الثانية PageV01P002",
  "# ذيل بلا رقم صفحة",
].join("\n");

describe("parseOpenitiPages", () => {
  test("penanda halaman di AKHIR halaman; markup dibuang; ekor tanpa penanda diabaikan", () => {
    expect(parseOpenitiPages(SOURCE)).toEqual([
      { volume: 1, page: 1, text: "باب اول\nسطر اول يكمل هنا ثم اية" },
      { volume: 1, page: 2, text: "بقية على الصفحة الثانية" },
    ]);
  });

  test("tanpa header: seluruh teks dibaca", () => {
    expect(parseOpenitiPages("# كلام PageV02P010")).toEqual([{ volume: 2, page: 10, text: "كلام" }]);
  });
});

describe("stripMarkdown", () => {
  test("CRLF, baris kosong, dan spasi ganda dirapikan", () => {
    expect(stripMarkdown("# ا  ب\r\n~~ج\r\n\r\n### || د")).toBe("ا ب ج\nد");
  });
});

describe("fillZeroPageMarkers (ADR-152)", () => {
  const p = (volume: number, page: number) => ({ volume, page, text: `${volume}:${page}` });
  test("mengisi deret awal, tengah, dan akhir dari urutan", async () => {
    const { fillZeroPageMarkers } = await import("./markdown.ts");
    const out = fillZeroPageMarkers([p(0, 0), p(1, 7), p(0, 0), p(0, 0), p(1, 10), p(0, 0)]);
    expect(out.map((x) => x.page)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(out.every((x) => x.volume === 1)).toBe(true);
    expect(out[2]?.text).toBe("0:0");
  });
  test("celah yang tidak pas = galat", async () => {
    const { fillZeroPageMarkers } = await import("./markdown.ts");
    expect(() => fillZeroPageMarkers([p(1, 7), p(0, 0), p(1, 10)])).toThrow(/tidak mengisi celah/);
    expect(() => fillZeroPageMarkers([p(0, 0)])).toThrow(/bernomor/);
  });
});
