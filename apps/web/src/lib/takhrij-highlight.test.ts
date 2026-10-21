import { describe, expect, it } from "vite-plus/test";

import { highlightPieces } from "./takhrij-highlight";

// Teks BUATAN (bukan teks kitab).
const TEXT = "رواه فلان بإسناد ضعيف وهو موقوف";

describe("highlightPieces", () => {
  it("potongan menyusun ulang teks persis; istilah = rentang DB", () => {
    const start = TEXT.indexOf("بإسناد");
    const end = start + "بإسناد ضعيف".length;
    const pieces = highlightPieces(TEXT, [
      { char_start: TEXT.indexOf("موقوف"), char_end: TEXT.length, gloss: "mauquf" },
      { char_start: start, char_end: end, gloss: "lemah" },
      // Tumpang tindih dan di luar teks dilewati.
      { char_start: start + 2, char_end: end, gloss: "x" },
      { char_start: 5, char_end: 999, gloss: "y" },
    ]);
    expect(pieces.map((p) => p.text).join("")).toBe(TEXT);
    expect(pieces.filter((p) => p.term !== null).map((p) => [p.text, p.term?.gloss])).toEqual([
      ["بإسناد ضعيف", "lemah"],
      ["موقوف", "mauquf"],
    ]);
    expect(highlightPieces(TEXT, [])).toEqual([{ text: TEXT, term: null }]);
  });
});
