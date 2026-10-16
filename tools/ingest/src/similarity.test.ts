import { describe, expect, test } from "vite-plus/test";

import { bigramContainment, tokenRatio } from "./similarity.ts";

describe("tokenRatio (2·LCS / jumlah token, Myers)", () => {
  test("identik = 1, kosong = 1, tanpa token sama = 0", () => {
    expect(tokenRatio(["ا", "ب"], ["ا", "ب"])).toBe(1);
    expect(tokenRatio([], [])).toBe(1);
    expect(tokenRatio(["ا"], ["ب"])).toBe(0);
  });

  test("sisipan dan hapusan dihitung sebagai jarak sunting", () => {
    // LCS = 3 dari 4 + 3 token → 6/7.
    expect(tokenRatio(["ا", "ب", "ج", "د"], ["ا", "ج", "د"])).toBeCloseTo(6 / 7);
    expect(tokenRatio(["ا", "ب"], ["ب", "ا"])).toBeCloseTo(0.5);
  });

  test("maxD menghentikan perhitungan dengan batas atas", () => {
    const a = ["ا", "ب", "ج", "د"];
    const b = ["ه", "و", "ز", "ح"];
    expect(tokenRatio(a, b, 2)).toBeCloseTo(1 - 3 / 8);
    expect(tokenRatio(a, b, 2)).toBeGreaterThanOrEqual(tokenRatio(a, b));
  });
});

describe("bigramContainment", () => {
  test("bagian bigram jarum yang ada di tumpukan", () => {
    expect(bigramContainment(["ا", "ب", "ج"], ["س", "ا", "ب", "ج", "ص"])).toBe(1);
    expect(bigramContainment(["ا", "ب", "ج"], ["ا", "ب"])).toBe(0.5);
    expect(bigramContainment(["ا"], ["ا", "ب"])).toBe(0);
  });
});
