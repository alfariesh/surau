import { describe, expect, test } from "vite-plus/test";

import { findQuote, isDroppedChar, normalizeArabic, stemText, toRawSpan } from "../src/index.ts";

// Property test sederhana: string acak dari alfabet "nakal" dengan seed tetap (deterministik,
// tanpa dependensi). Invarian yang diuji berlaku untuk input APA PUN.

/** mulberry32: PRNG kecil dan deterministik. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PIECES = [
  ..."ابتثجحخدذرسشصضطظعغفقكلمنهوي".split(""),
  ..."ءآأإؤئىةٱ".split(""),
  "\u064E",
  "\u064F",
  "\u0650",
  "\u0651",
  "\u0652",
  "\u064B",
  "\u0670",
  "\u0640",
  "\u06D6",
  "\u06DD",
  "\u06DE",
  "\u06E9",
  "\u200C",
  "\u200F",
  "\uFEFF",
  "\uFDFA",
  "\uFDFB",
  "\uFD41",
  "\uFDFD",
  "\uFEFB",
  "\uFE8D",
  "\uFE70",
  "\uFE77",
  "\uFD3E",
  ..."٠١٢٣٤٥٦٧٨٩۱۲".split(""),
  ..."0123456789".split(""),
  ..." \r\n\t،؛؟.:«»(){}[]_<>&\"'".split(""),
  "(١)",
  "(١٢)",
  "_________",
  '<span data-type="title" id=toc-1>',
  "</span>",
  "<hr>",
  "Ab",
  "e\u0301",
  "😀",
];

function randomRaw(next: () => number, maxLen: number): string {
  const len = Math.floor(next() * maxLen);
  let s = "";
  for (let i = 0; i < len; i++) s += PIECES[Math.floor(next() * PIECES.length)] as string;
  return s;
}

const RUNS = 2000;

/** Jalankan `check` untuk RUNS input acak; kumpulkan pelanggaran supaya pesan gagalnya jelas. */
function violations(
  seed: number,
  maxLen: number,
  check: (raw: string, next: () => number) => string[],
): string[] {
  const next = rng(seed);
  const out: string[] = [];
  for (let r = 0; r < RUNS && out.length < 5; r++) {
    const raw = randomRaw(next, maxLen);
    for (const v of check(raw, next)) out.push(`${v} :: ${JSON.stringify(raw)}`);
  }
  return out;
}

describe("invarian normalizeArabic (2000 string acak, seed tetap)", () => {
  test("peta: panjang = teks, tidak menurun, di dalam batas; teks tanpa spasi tepi/ganda", () => {
    const found = violations(20261015, 60, (raw) => {
      const v: string[] = [];
      for (const opts of [{}, { hamzaSeats: false, dropFootnoteRefs: false }]) {
        const { text, map } = normalizeArabic(raw, opts);
        if (map.length !== text.length) v.push("panjang peta ≠ panjang teks");
        if (text !== text.trim() || text.includes("  ")) v.push("spasi tepi/ganda");
        for (let j = 0; j < map.length; j++) {
          const at = map[j] as number;
          if (at < 0 || at >= raw.length) v.push(`peta di luar batas pada ${j}`);
          if (j > 0 && at < (map[j - 1] as number)) v.push(`peta menurun pada ${j}`);
          // Karakter mentah yang dibuang tanpa jejak tidak pernah menjadi asal karakter normal.
          if (text[j] !== " " && isDroppedChar(raw[at] as string)) v.push(`asal dibuang pada ${j}`);
        }
      }
      return v;
    });
    expect(found).toEqual([]);
  });

  test("idempoten: normalisasi bentuk normal tidak mengubahnya (indeks = kueri)", () => {
    const found = violations(1402, 60, (raw) => {
      const { text } = normalizeArabic(raw);
      const v: string[] = [];
      if (normalizeArabic(text).text !== text) v.push("normalize tidak idempoten");
      if (stemText(stemText(text)) !== stemText(text)) v.push("stemText tidak idempoten");
      return v;
    });
    expect(found).toEqual([]);
  });

  test("round-trip: rentang token acak dipetakan balik ke substring mentah yang menormal sama", () => {
    const found = violations(505, 40, (raw, next) => {
      const n = normalizeArabic(raw);
      if (n.text === "") return [];
      const tokens = n.text.split(" ");
      const a = Math.floor(next() * tokens.length);
      const b = a + Math.floor(next() * (tokens.length - a));
      const start = tokens.slice(0, a).join(" ").length + (a > 0 ? 1 : 0);
      const quote = tokens.slice(a, b + 1).join(" ");
      const [rs, re] = toRawSpan(raw, n, start, start + quote.length);
      const v: string[] = [];
      // Substring mentah memuat kutipan itu (bisa lebih bila ujungnya ekspansi multi-kata).
      if (!normalizeArabic(raw.slice(rs, re)).text.includes(quote)) v.push(`toRawSpan ${quote}`);
      const hit = findQuote(raw, quote);
      if (hit !== null && normalizeArabic(hit.rawText).text !== quote) v.push(`findQuote ${quote}`);
      if (hit !== null && raw.slice(hit.rawStart, hit.rawEnd) !== hit.rawText)
        v.push("rawText ≠ slice");
      return v;
    });
    expect(found).toEqual([]);
  });
});
