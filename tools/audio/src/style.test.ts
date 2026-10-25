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
    expect([...STYLE_TAGS].sort()).toEqual(["[calm]", "[softly]", "[thoughtful]", "[warm]"]);
  });

  test("variatif: kepala dan judul gagasan hangat, kalimat baku tetap tenang", () => {
    expect(
      styledSentences(
        [
          "Gagasan pertama.",
          "Judul.",
          "Isi.",
          "Teks kitab di jilid satu:",
          "Kutipan.",
          "Untuk kasus pribadi, tanyakan.",
        ],
        ["narration", "narration", "narration", "narration", "quote", "narration"],
        STYLES.variatif!,
        "point",
      ),
    ).toEqual([
      "[warm] Gagasan pertama.",
      "Judul.",
      "[calm] Isi.",
      "Teks kitab di jilid satu:",
      "[thoughtful] Kutipan.",
      "[calm] Untuk kasus pribadi, tanyakan.",
    ]);
    expect(
      styledSentences(["Intisari ini dibuat AI."], ["narration"], STYLES.variatif!, "label"),
    ).toEqual(["Intisari ini dibuat AI."]);
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
