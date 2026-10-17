import { describe, expect, it } from "vite-plus/test";

import {
  aiSegments,
  markSegments,
  parseSection,
  readerHref,
  searchApiUrl,
  searchPageHref,
} from "./segments";

const join = (s: { text: string }[]) => s.map((x) => x.text).join("");

describe("markSegments", () => {
  it("sorotan berkoordinat teks utuh dipetakan ke potongan; teks tidak berubah", () => {
    const full = "قال الصبر ضياء والصبر نور";
    const offset = 4;
    const snippet = full.slice(offset);
    const segs = markSegments(snippet, offset, [
      { char_start: 4, char_end: 9 },
      { char_start: 15, char_end: 21 },
      { char_start: 0, char_end: 3 }, // di luar potongan
    ]);
    expect(segs).toEqual([
      { kind: "mark", text: "الصبر" },
      { kind: "text", text: " ضياء " },
      { kind: "mark", text: "والصبر" },
      { kind: "text", text: " نور" },
    ]);
    expect(join(segs)).toBe(snippet);
  });

  it("tumpang tindih/terbalik dilewati, tanpa sorotan = satu segmen", () => {
    expect(
      markSegments("abcdef", 0, [
        { char_start: 1, char_end: 3 },
        { char_start: 2, char_end: 4 },
        { char_start: 5, char_end: 5 },
      ]),
    ).toEqual([
      { kind: "text", text: "a" },
      { kind: "mark", text: "bc" },
      { kind: "mark", text: "d" },
      { kind: "text", text: "ef" },
    ]);
    expect(markSegments("abc", 0, [])).toEqual([{ kind: "text", text: "abc" }]);
  });
});

describe("aiSegments", () => {
  it("placeholder ayat menjadi segmen ayah; sorotan tetap", () => {
    const text = "Allah berfirman, ⟦QS 2:153-154⟧ maka bersabarlah.";
    const at = text.indexOf("bersabarlah");
    const segs = aiSegments(text, 0, [{ char_start: at, char_end: at + 11 }]);
    expect(segs).toEqual([
      { kind: "text", text: "Allah berfirman, " },
      { kind: "ayah", ref: "2:153–154", text: "⟦QS 2:153-154⟧" },
      { kind: "text", text: " maka " },
      { kind: "mark", text: "bersabarlah" },
      { kind: "text", text: "." },
    ]);
    expect(join(segs)).toBe(text);
  });
});

describe("URL", () => {
  it("readerHref menyisipkan ?q= sebelum jangkar", () => {
    expect(readerHref("/kitab/ihya/1/200#p2824", "الصبر sabar")).toBe(
      "/kitab/ihya/1/200?q=%D8%A7%D9%84%D8%B5%D8%A8%D8%B1+sabar#p2824",
    );
    expect(readerHref("/kitab/ihya/1/200", "x")).toBe("/kitab/ihya/1/200?q=x");
  });

  it("halaman Cari dan API", () => {
    expect(searchPageHref("  sabar ", null)).toBe("/cari?q=sabar");
    expect(searchPageHref("sabar", 100002)).toBe("/cari?q=sabar&bagian=100002");
    expect(searchPageHref("", null)).toBe("/cari");
    expect(searchApiUrl("sabar", null, 0, 20)).toBe("/api/search?q=sabar&limit=20");
    expect(searchApiUrl("sabar", 7, 20, 20)).toBe(
      "/api/search?q=sabar&limit=20&section=7&offset=20",
    );
  });

  it("parseSection menolak yang bukan bilangan bulat positif", () => {
    expect(parseSection("100002")).toBe(100002);
    for (const bad of [null, "", "0", "-1", "1e3", "01", "abc"])
      expect(parseSection(bad)).toBeNull();
  });
});
