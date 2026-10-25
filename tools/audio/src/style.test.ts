import { describe, expect, test } from "vite-plus/test";

import { STYLES, STYLE_TAGS, styleDemo, styledSentences, withoutStyleTags } from "./style.ts";

describe("gaya narator (ADR-101)", () => {
  const sentences = [
    "Narasi satu.",
    "Pengantar:",
    "Kutipan.",
    "Kutipan lanjut.",
    "Syair.",
    "Narasi lagi.",
  ];
  const roles = ["narration", "narration", "quote", "quote", "poetry", "narration"] as const;

  test("polos = tanpa tag; khidmat = tag hanya saat peran berubah, dari daftar tetap", () => {
    expect(styledSentences(sentences, roles, STYLES.polos!)).toEqual(sentences);
    expect(styledSentences(sentences, roles, STYLES.khidmat!)).toEqual([
      "Narasi satu.",
      "Pengantar:",
      "[thoughtful] Kutipan.",
      "Kutipan lanjut.",
      "[softly] Syair.",
      "[calm] Narasi lagi.",
    ]);
    expect([...STYLE_TAGS].sort()).toEqual(["[calm]", "[softly]", "[thoughtful]"]);
  });

  test("pemeriksaan teks akhir hanya melewatkan tag gaya yang terdaftar", () => {
    expect(withoutStyleTags("[thoughtful] Kutipan.")).toBe("  Kutipan.");
    expect(withoutStyleTags("[whispers] halo")).toBe("[whispers] halo");
  });

  test("demo A/B memuat versi tanpa gaya lalu versi khidmat, tanpa huruf Arab", () => {
    const demo = styleDemo("Pembuka.");
    expect(demo.indexOf("Versi A")).toBeLessThan(demo.indexOf("Versi B"));
    expect(demo).toContain("[thoughtful] Contoh kutipan");
    expect(demo).not.toMatch(/\p{Script=Arabic}/u);
  });
});
