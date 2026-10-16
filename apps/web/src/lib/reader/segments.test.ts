import type { FootnoteRef } from "@surau/core";

import { describe, expect, it } from "vite-plus/test";

import { splitByFootnotes } from "./segments";

// Teks buatan (bukan teks kitab, KONVENSI §Tes).
const TEXT = "قال الشيخ كلاما (١) ثم قال آخر (٢)";

function ref(start: number, marker: string, footnoteId: number): FootnoteRef {
  return { marker, char_start: start, char_end: start + 3, footnote_id: footnoteId };
}

const R1 = ref(TEXT.indexOf("(١)"), "١", 11);
const R2 = ref(TEXT.indexOf("(٢)"), "٢", 12);

describe("splitByFootnotes", () => {
  it("memotong tepat di offset penanda dan menautkan catatan kaki", () => {
    const segments = splitByFootnotes(TEXT, [R1, R2]);

    expect(segments).toEqual([
      { kind: "text", text: "قال الشيخ كلاما " },
      { kind: "marker", text: "(١)", marker: "١", footnoteId: 11, charStart: R1.char_start },
      { kind: "text", text: " ثم قال آخر " },
      { kind: "marker", text: "(٢)", marker: "٢", footnoteId: 12, charStart: R2.char_start },
    ]);
  });

  it("gabungan potongan sama persis dengan text_raw, apa pun urutan ref", () => {
    for (const refs of [[], [R1], [R2], [R2, R1]]) {
      const joined = splitByFootnotes(TEXT, refs)
        .map((s) => s.text)
        .join("");
      expect(joined).toBe(TEXT);
    }
  });

  it("ref rusak (di luar teks, tumpang tindih, kosong) dibiarkan sebagai teks", () => {
    const outside = { ...R2, char_start: TEXT.length, char_end: TEXT.length + 3 };
    const overlap = { ...R1, char_start: R1.char_start + 1, char_end: R1.char_end + 1 };
    const empty = { ...R2, char_end: R2.char_start };
    const segments = splitByFootnotes(TEXT, [R1, overlap, outside, empty]);

    expect(segments.filter((s) => s.kind === "marker")).toHaveLength(1);
    expect(segments.map((s) => s.text).join("")).toBe(TEXT);
  });
});
