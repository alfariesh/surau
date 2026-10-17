import type { AyahRef, FootnoteRef } from "@surau/core";

import { describe, expect, it } from "vite-plus/test";

import { splitByFootnotes, splitPassage } from "./segments";

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

describe("splitPassage (kutipan ayat)", () => {
  // Teks buatan: dua "kutipan" berkurung, penanda (١) di dalam kutipan kedua.
  const RAW = "قال {كلمة أولى} ثم {جملة (١) ثانية} انتهى";
  const at = (s: string) => RAW.indexOf(s);
  const ayah = (text: string, surah: number): AyahRef => ({
    char_start: at(text),
    char_end: at(text) + text.length,
    surah,
    ayah_from: 1,
    ayah_to: 1,
    match: "exact",
    partial: false,
    bracketed: true,
    alt_count: 0,
    label: `QS Uji [${surah}]: 1`,
  });
  const A1 = ayah("كلمة أولى", 1);
  const A2 = ayah("جملة (١) ثانية", 2);
  const F = ref(at("(١)"), "١", 21);

  it("potongan di dalam kutipan diberi indeks rujukan; label rujukan tepat sesudah akhir kutipan", () => {
    const { segments, ayat } = splitPassage(RAW, [F], [A2, A1]);
    expect(ayat).toEqual([A1, A2]);
    expect(segments).toEqual([
      { kind: "text", text: "قال {", ayah: null },
      { kind: "text", text: "كلمة أولى", ayah: 0 },
      { kind: "ayah-end", ayah: 0 },
      { kind: "text", text: "} ثم {", ayah: null },
      { kind: "text", text: "جملة ", ayah: 1 },
      {
        kind: "marker",
        text: "(١)",
        marker: "١",
        footnoteId: 21,
        charStart: F.char_start,
        ayah: 1,
      },
      { kind: "text", text: " ثانية", ayah: 1 },
      { kind: "ayah-end", ayah: 1 },
      { kind: "text", text: "} انتهى", ayah: null },
    ]);
  });

  it("gabungan teks = text_raw; rujukan rusak atau memotong penanda diabaikan", () => {
    const broken = [
      { ...A1, char_start: A1.char_start + 1 }, // tumpang tindih A1
      { ...A2, char_end: RAW.length + 1 }, // di luar teks
      { ...A2, char_start: F.char_start + 1, char_end: A2.char_end }, // mulai di tengah (١)
    ];
    for (const refs of [[], [A1], [A2, A1], [A1, ...broken]]) {
      const { segments, ayat } = splitPassage(RAW, [F], refs);
      const text = segments.map((s) => (s.kind === "ayah-end" ? "" : s.text)).join("");
      expect(text).toBe(RAW);
      expect(segments.filter((s) => s.kind === "ayah-end")).toHaveLength(ayat.length);
    }
    expect(splitPassage(RAW, [F], [A1, ...broken]).ayat).toEqual([A1]);
  });
});
