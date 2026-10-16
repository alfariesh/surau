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
