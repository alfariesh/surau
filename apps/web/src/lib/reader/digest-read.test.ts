import { describe, expect, it } from "vite-plus/test";

import { DIGEST_READ_MAX, parseReadIds, withRead } from "./digest-read";

describe("tanda sudah dibaca Intisari (X16)", () => {
  it("isi rusak, bukan array, atau entri tidak sah = diabaikan", () => {
    expect(parseReadIds(null)).toEqual([]);
    expect(parseReadIds("{rusak")).toEqual([]);
    expect(parseReadIds('{"a":1}')).toEqual([]);
    expect(parseReadIds('[3, "4", -1, 0, 2.5, 7]')).toEqual([3, 7]);
  });

  it("menandai memindahkan ID ke akhir tanpa duplikat; entri terlama dibuang di batas", () => {
    expect(withRead([3, 7], 3)).toEqual([7, 3]);
    const full = Array.from({ length: DIGEST_READ_MAX }, (_, i) => i + 1);
    const next = withRead(full, 9999);
    expect(next).toHaveLength(DIGEST_READ_MAX);
    expect(next[0]).toBe(2);
    expect(next.at(-1)).toBe(9999);
  });
});
