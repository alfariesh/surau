import { describe, expect, test } from "vite-plus/test";

import { aggregate, judge, matchesLocation, passesR2Gate } from "./metrics.ts";
import type { GoldMatcher, ResultPage } from "./metrics.ts";

const page = (pageId: number, ...tocNodeIds: number[]): ResultPage => ({ pageId, tocNodeIds });
const gold = (label: string, pageIds: number[], tocNodeIds: number[] = []): GoldMatcher => ({
  label,
  pageIds: new Set(pageIds),
  tocNodeIds: new Set(tocNodeIds),
});

describe("matchesLocation", () => {
  test("halaman dalam rentang, atau paragraf cocok di bagian lokasi benar", () => {
    expect(matchesLocation(page(5), gold("a", [4, 5, 6]))).toBe(true);
    expect(matchesLocation(page(7), gold("a", [4, 5, 6]))).toBe(false);
    expect(matchesLocation(page(9, 30, 31), gold("b", [], [31, 32]))).toBe(true);
    expect(matchesLocation(page(9, 30), gold("b", [], [31, 32]))).toBe(false);
  });
});

describe("judge", () => {
  test("peringkat = halaman cocok pertama (mulai 1); tidak ada → null", () => {
    const golds = [gold("a", [3]), gold("b", [], [50])];
    expect(judge([page(1), page(2, 50), page(3)], golds)).toEqual({ rank: 2, foundAt10: 2 });
    expect(judge([page(1), page(2)], golds)).toEqual({ rank: null, foundAt10: 0 });
    expect(judge([], golds).rank).toBeNull();
  });

  test("foundAt10 hanya menghitung 10 halaman teratas", () => {
    const pages = Array.from({ length: 12 }, (_, i) => page(i + 1));
    expect(judge(pages, [gold("a", [11]), gold("b", [12])])).toEqual({ rank: 11, foundAt10: 0 });
    expect(judge(pages, [gold("a", [10]), gold("b", [12])])).toEqual({ rank: 10, foundAt10: 1 });
  });
});

describe("aggregate", () => {
  test("hit@k dan MRR", () => {
    const s = aggregate([1, 2, 6, 11, null]);
    expect(s.n).toBe(5);
    expect(s.hit1).toBeCloseTo(1 / 5);
    expect(s.hit5).toBeCloseTo(2 / 5);
    expect(s.hit10).toBeCloseTo(3 / 5);
    expect(s.mrr).toBeCloseTo((1 + 1 / 2 + 1 / 6 + 1 / 11) / 5);
  });

  test("set kosong → n 0 dan tidak lolos gerbang", () => {
    expect(aggregate([])).toEqual({ n: 0, hit1: 0, hit5: 0, hit10: 0, mrr: 0 });
    expect(passesR2Gate(aggregate([]))).toBe(false);
  });

  test("gerbang R2: minimal 20 soal dan hit@10 ≥ 90%", () => {
    const ok18 = Array.from({ length: 18 }, () => 1);
    expect(passesR2Gate(aggregate([...ok18, 3, null]))).toBe(true); // 19/20 = 95%
    expect(passesR2Gate(aggregate([...ok18, null, null]))).toBe(true); // 18/20 = 90%
    expect(passesR2Gate(aggregate([...ok18, null, null, null]))).toBe(false); // 18/21
    expect(passesR2Gate(aggregate(Array.from({ length: 19 }, () => 1)))).toBe(false); // < 20 soal
  });
});
