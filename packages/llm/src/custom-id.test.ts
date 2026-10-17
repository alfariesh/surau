import { describe, expect, test } from "vite-plus/test";

import {
  CUSTOM_ID_PATTERN,
  parseCustomId,
  passageCustomId,
  tocCustomId,
  tocRound2CustomId,
} from "./custom-id.ts";

describe("custom_id batch", () => {
  test("format sesuai rencana S13 dan lolos pola API", () => {
    const ids = [
      passageCustomId(10_000_123),
      tocCustomId(100_161, "id"),
      tocCustomId(100_161, "en", 3),
      tocRound2CustomId(100_002, "id"),
    ];
    expect(ids).toEqual([
      "passage-10000123",
      "toc-100161-id",
      "toc-100161-en-p3",
      "toc-100002-id-r2",
    ]);
    for (const id of ids) expect(id).toMatch(CUSTOM_ID_PATTERN);
  });

  test("ID terpanjang yang mungkin tetap ≤64 karakter", () => {
    const id = tocCustomId(Number.MAX_SAFE_INTEGER, "en", Number.MAX_SAFE_INTEGER);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(CUSTOM_ID_PATTERN);
  });

  test("bilangan tidak sah ditolak", () => {
    expect(() => passageCustomId(0)).toThrow(/positif/);
    expect(() => passageCustomId(1.5)).toThrow(/positif/);
    expect(() => tocCustomId(1, "id", 0)).toThrow(/positif/);
    expect(() => tocRound2CustomId(-3, "en")).toThrow(/positif/);
  });

  test("parse = kebalikan pembuat", () => {
    expect(parseCustomId(passageCustomId(42))).toEqual({ kind: "passage", passageId: 42 });
    expect(parseCustomId(tocCustomId(7, "en"))).toEqual({
      kind: "toc",
      tocNodeId: 7,
      lang: "en",
      part: null,
      round: 1,
    });
    expect(parseCustomId(tocCustomId(7, "id", 2))).toMatchObject({ part: 2, round: 1 });
    expect(parseCustomId(tocRound2CustomId(7, "id"))).toMatchObject({ part: null, round: 2 });
  });

  test("ID asing → null", () => {
    for (const id of ["passage-0", "passage-01", "toc-1-ar", "toc-1-id-p0", "toc-1-id-r3", "x"]) {
      expect(parseCustomId(id), id).toBeNull();
    }
  });
});
