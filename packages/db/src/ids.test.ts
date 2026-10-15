import { describe, expect, test } from "vite-plus/test";

import {
  EDITION_ID_MAX,
  editionOfPageId,
  editionOfPassageId,
  pageId,
  passageId,
  passageAnchor,
  passageIdRange,
  tocNodeId,
} from "./ids.ts";

describe("formula ID (ADR-029)", () => {
  test("halaman/daftar isi = edisi·10⁵ + seq, paragraf = edisi·10⁷ + seq", () => {
    expect(pageId(1, 200)).toBe(100_200);
    expect(tocNodeId(1, 3)).toBe(100_003);
    expect(passageId(1, 42)).toBe(10_000_042);
    expect(editionOfPageId(pageId(37, 99_999))).toBe(37);
    expect(editionOfPassageId(passageId(37, 9_999_999))).toBe(37);
  });

  test("jangkar publik = #p<seq>, tidak bergantung pada ord", () => {
    expect(passageAnchor(passageId(3, 1234))).toBe("p1234");
  });

  test("rentang rowid per edisi tidak bertumpuk", () => {
    const a = passageIdRange(1);
    const b = passageIdRange(2);
    expect(a).toEqual({ min: 10_000_001, max: 19_999_999 });
    expect(b.min).toBe(a.max + 2);
  });

  test("ID terbesar tetap bilangan bulat aman JS", () => {
    expect(Number.isSafeInteger(passageId(EDITION_ID_MAX, 9_999_999))).toBe(true);
  });

  test("di luar rentang ditolak", () => {
    expect(() => pageId(0, 1)).toThrow(RangeError);
    expect(() => pageId(EDITION_ID_MAX + 1, 1)).toThrow(RangeError);
    expect(() => pageId(1, 0)).toThrow(RangeError);
    expect(() => pageId(1, 100_000)).toThrow(RangeError);
    expect(() => passageId(1, 10_000_000)).toThrow(RangeError);
    expect(() => passageId(1.5, 1)).toThrow(RangeError);
    expect(() => passageIdRange(-1)).toThrow(RangeError);
  });
});
