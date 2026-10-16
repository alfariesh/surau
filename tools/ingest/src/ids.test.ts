import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { createAllocator, formatIdMap, readIdMap, writeIdMap } from "./ids.ts";

const dir = () => mkdtempSync(join(tmpdir(), "surau-ids-"));

describe("peta ID (ADR-029)", () => {
  test("kunci lama tetap, kunci baru mendapat seq setelah yang terbesar", () => {
    const ids = createAllocator({
      format: 1,
      edition: 3,
      page: { "10": 4, "11": 2 },
      toc: {},
      passage: {},
    });
    expect(ids.seq("page", "11")).toBe(2);
    expect(ids.seq("page", "12")).toBe(5);
    expect(ids.seq("toc", "t1")).toBe(1);
    expect(ids.added).toEqual({ page: 1, toc: 1, passage: 0 });
    expect(ids.snapshot().page).toEqual({ "10": 4, "11": 2, "12": 5 });
  });

  test("tulis lalu baca kembali; format satu entri per baris, urut seq", () => {
    const path = join(dir(), "peta.json");
    const map = {
      format: 1 as const,
      edition: 3,
      page: { b: 2, a: 1 },
      toc: {},
      passage: { "1:b0": 1 },
    };
    writeIdMap(path, map);
    expect(readIdMap(path, 3)).toEqual(map);
    expect(formatIdMap(map)).toBe(
      '{\n  "format": 1,\n  "edition": 3,\n  "page": {\n    "a": 1,\n    "b": 2\n  },\n  "toc": {},\n  "passage": {\n    "1:b0": 1\n  }\n}\n',
    );
  });

  test("file belum ada → peta kosong; edisi lain atau seq ganda → error", () => {
    const d = dir();
    expect(readIdMap(join(d, "tidak-ada.json"), 3)).toEqual({
      format: 1,
      edition: 3,
      page: {},
      toc: {},
      passage: {},
    });
    const other = join(d, "lain.json");
    writeIdMap(other, { format: 1, edition: 4, page: {}, toc: {}, passage: {} });
    expect(() => readIdMap(other, 3)).toThrow(/edisi 4/);
    const dup = join(d, "ganda.json");
    writeFileSync(
      dup,
      JSON.stringify({ format: 1, edition: 3, page: { a: 1, b: 1 }, toc: {}, passage: {} }),
    );
    expect(() => readIdMap(dup, 3)).toThrow(/dipakai dua kali/);
  });
});
