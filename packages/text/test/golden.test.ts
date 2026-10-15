import { describe, expect, test } from "vite-plus/test";

import { NORM_VERSION, normalizeArabic, stemText } from "../src/index.ts";
import type { NormalizeOptions } from "../src/index.ts";
import golden from "./golden.json" with { type: "json" };

interface GoldenCase {
  id: string;
  input: string;
  norm: string;
  stem: string;
  opts?: NormalizeOptions;
}

const cases: GoldenCase[] = golden.cases;

describe("golden vectors normalisasi + stem", () => {
  test("versi golden = NORM_VERSION (perubahan aturan harus disadari)", () => {
    expect(golden.normVersion).toBe(NORM_VERSION);
  });

  test("minimal 40 kasus dengan id unik", () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  test.each(cases)("$id", (c) => {
    const n = normalizeArabic(c.input, c.opts);
    expect(n.text).toBe(c.norm);
    expect(stemText(n.text)).toBe(c.stem);
    expect(n.map.length).toBe(n.text.length);
  });
});
