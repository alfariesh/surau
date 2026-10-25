import { describe, expect, test } from "vite-plus/test";

import { charTokens, layoutSentences, monotonic, sentenceTimes } from "./align.ts";

describe("waktu per kalimat (X18)", () => {
  const sentences = ["Gagasan pertama.", "Niat menentukan amal.", "Lalu ikhlas."];
  const { text, ranges } = layoutSentences(sentences);

  test("tata letak: kalimat dipisah spasi, rentang persis", () => {
    expect(text).toBe("Gagasan pertama. Niat menentukan amal. Lalu ikhlas.");
    expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(sentences);
  });

  test("dari waktu per karakter (with-timestamps), digeser ke awal potongan", () => {
    const chars = text.split("");
    const tokens = charTokens({
      characters: chars,
      character_start_times_seconds: chars.map((_, i) => i * 0.05),
      character_end_times_seconds: chars.map((_, i) => i * 0.05 + 0.05),
    });
    const spans = sentenceTimes(text, ranges, tokens, 1000);
    expect(spans[0]).toEqual([1000, 1000 + 16 * 50]);
    expect(spans[1]).toEqual([1000 + 17 * 50, 1000 + 38 * 50]);
    expect(spans[2]![0]).toBe(1000 + 39 * 50);
  });

  test("dari kata (forced alignment): spasi/tanda baca terpisah dan kata asing dilewati", () => {
    const words = [
      { text: "Gagasan", start: 0.2, end: 0.6 },
      { text: " ", start: 0.6, end: 0.65 },
      { text: "pertama", start: 0.65, end: 1.1 },
      { text: ".", start: 1.1, end: 1.2 },
      { text: "xyzzy", start: 1.3, end: 1.4 }, // tidak ada di teks: dilewati
      { text: "Niat", start: 1.5, end: 1.8 },
      { text: "menentukan", start: 1.8, end: 2.4 },
      { text: "amal.", start: 2.4, end: 2.9 },
    ];
    expect(sentenceTimes(text, ranges, words)).toEqual([[200, 1200], [1500, 2900], null]);
  });

  test("kata yang sama di kalimat berikut tidak ditarik ke kalimat sebelumnya", () => {
    const s = layoutSentences(["Amal.", "Amal itu niat."]);
    const words = [
      { text: "Amal", start: 0, end: 0.3 },
      { text: "Amal", start: 1, end: 1.3 },
      { text: "itu", start: 1.3, end: 1.5 },
      { text: "niat", start: 1.5, end: 1.9 },
    ];
    expect(sentenceTimes(s.text, s.ranges, words)).toEqual([
      [0, 300],
      [1000, 1900],
    ]);
  });

  test("waktu mulai yang mundur dibuang (objek menolaknya)", () => {
    expect(monotonic([[0, 10], [5, 20], null, [3, 4], [30, 40]])).toEqual([
      [0, 10],
      [5, 20],
      null,
      null,
      [30, 40],
    ]);
  });
});
