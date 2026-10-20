import { describe, expect, test } from "vite-plus/test";

import { FTS_MAX_PHRASES, FTS_MAX_TOKENS, buildFtsMatch, ftsQuote } from "./fts.ts";

describe("buildFtsMatch", () => {
  test("kata tunggal, frasa, kunyah, sufiks (port prototipe)", () => {
    expect(buildFtsMatch("الصَّبْرُ")).toBe(buildFtsMatch("والصبر"));
    expect(buildFtsMatch("الصبر")).toMatch(/^\{sbody sfoot\} : \("صبر" OR "وصبر" OR /);
    expect(buildFtsMatch("أبو هريرة")?.split(" OR ")).toHaveLength(33);
    expect(buildFtsMatch("طلب العلم")).toMatch(/"لطلب علم"/);
    expect(buildFtsMatch("النية", { suffix: true })).toMatch(/"نيت"\*/);
  });

  test("kata tunggal kunyah dan kata dilindungi", () => {
    expect(buildFtsMatch("أبي")).toBe('{sbody sfoot} : ("ابو" OR "ابي" OR "ابا")');
    expect(buildFtsMatch("والله")).toBe('{sbody sfoot} : ("الله")');
  });

  test("sufiks: semua varian diberi *, stem pendek tanpa *", () => {
    expect(buildFtsMatch("صبر", { suffix: true })).toBe(
      '{sbody sfoot} : ("صبر"* OR "وصبر"* OR "فصبر"* OR "بصبر"* OR "كصبر"* OR "لصبر"* OR "وبصبر"* OR "فبصبر"* OR "ولصبر"* OR "فلصبر"* OR "وكصبر"*)',
    );
    expect(buildFtsMatch("في", { suffix: true })).toBe('{sbody sfoot} : ("في")');
  });

  test("sisa dua huruf tidak bertabrakan dengan kata ganti; lam melebur ikut dicari (#61)", () => {
    expect(buildFtsMatch("الهم")).toBe('{sbody sfoot} : ("الهم")');
    expect(buildFtsMatch("بالهم")).toBe(buildFtsMatch("الهم"));
    expect(buildFtsMatch("الليل")).toMatch(/ OR "يل"\)$/);
    expect(buildFtsMatch("نصف الليل")).toMatch(/"نصف يل"/);
    // Kata benda dua huruf tetap seperti dulu; kata fungsi tanpa artikel tidak diberi varian lam.
    expect(buildFtsMatch("الحق")).toBe(buildFtsMatch("حق"));
    expect(buildFtsMatch("لان")).not.toMatch(/"الان"/);
    // Stem kanonis di awal frasa tidak diberi proklitik (bentuk itu tidak ada di indeks).
    expect(buildFtsMatch("الهم والحزن")).toBe('{sbody sfoot} : ("الهم حزن")');
  });

  test("frasa: token pertama dilindungi tidak diberi varian proklitik", () => {
    expect(buildFtsMatch("الله اكبر")).toBe('{sbody sfoot} : ("الله اكبر")');
  });

  test("kueri lebih dari FTS_MAX_TOKENS token ditolak", () => {
    expect(
      buildFtsMatch(Array.from({ length: FTS_MAX_TOKENS }, () => "علم").join(" ")),
    ).not.toBeNull();
    expect(() =>
      buildFtsMatch(Array.from({ length: FTS_MAX_TOKENS + 1 }, () => "علم").join(" ")),
    ).toThrow(RangeError);
  });

  test("sufiks: kata dilindungi tidak diberi varian ه→ت", () => {
    expect(buildFtsMatch("الله", { suffix: true })).toBe('{sbody sfoot} : ("الله"*)');
  });

  test("frasa dibatasi FTS_MAX_PHRASES", () => {
    const match = buildFtsMatch("ابو ابو ابو ابو") ?? "";
    expect(match.split(" OR ")).toHaveLength(FTS_MAX_PHRASES);
  });

  test("kolom bisa dipilih dari daftar tetap; selain itu ditolak", () => {
    expect(buildFtsMatch("صبر", { columns: ["body"] })).toMatch(/^\{body\} : \(/);
    expect(() => buildFtsMatch("صبر", { columns: [] })).toThrow(TypeError);
    // Kolom dari input tak tepercaya tidak boleh menembus ke sintaks MATCH.
    const evil = ["sbody} OR {foot"] as unknown as ["sbody"];
    expect(() => buildFtsMatch("صبر", { columns: evil })).toThrow(TypeError);
  });

  test("injeksi: operator dan tanda kutip pengguna menjadi literal ter-quote", () => {
    expect(buildFtsMatch('"(*)" ،')).toBeNull();
    expect(buildFtsMatch('" OR NEAR(')).toMatch(/^\{sbody sfoot\} : \("or near" OR /);
    expect(buildFtsMatch("AND OR")).toMatch(/^\{sbody sfoot\} : \("and or" OR "وand or"/);
    for (const q of [
      'صبر" OR "x',
      "صبر*",
      "^صبر",
      "sbody:صبر",
      "NOT صبر",
      "{body}: صبر",
      "صبر AND",
    ]) {
      const m = buildFtsMatch(q) ?? "";
      // Setelah prefiks filter kolom, tidak ada karakter sintaks FTS di luar literal ber-quote.
      const outside = m
        .replace(/^\{sbody sfoot\} : \(/, "")
        .replace(/\)$/, "")
        .replace(/"(?:[^"]|"")*"/g, "")
        .replaceAll(" OR ", "");
      expect(outside, q).toBe("");
    }
  });

  test("kueri kosong setelah normalisasi → null (jangan dijalankan)", () => {
    expect(buildFtsMatch("")).toBeNull();
    expect(buildFtsMatch("  ،؛ (١) ")).toBeNull();
    expect(buildFtsMatch("\u064E\u0651")).toBeNull();
  });
});

describe("ftsQuote", () => {
  test("membungkus dengan kutip ganda dan menggandakan kutip di dalamnya", () => {
    expect(ftsQuote("صبر")).toBe('"صبر"');
    expect(ftsQuote('a"b')).toBe('"a""b"');
  });
});
