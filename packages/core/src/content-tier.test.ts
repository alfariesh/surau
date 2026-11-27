// Tingkat Intisari konten chat per edisi (X31b, ADR-147).
import { describe, expect, test } from "vite-plus/test";

import { contentTierOf, digestTierOf } from "./digest.ts";

describe("contentTierOf", () => {
  test("Ihya dan edisi lain: aturan X15 (tingkat 2 dan tingkat 1 tanpa anak = Kitab)", () => {
    for (const [level, kids] of [
      [1, false],
      [1, true],
      [2, true],
      [3, false],
    ] as const) {
      expect(contentTierOf(1, level, kids)).toBe(digestTierOf(level, kids));
    }
  });

  test("kitab Gelombang 1: setiap judul = Intisari Bab, termasuk tingkat teratas berisi anak", () => {
    expect(contentTierOf(2, 1, false)).toBe("section");
    expect(contentTierOf(2, 1, true)).toBe("section");
    expect(contentTierOf(3, 2, false)).toBe("section");
  });
});
