import { describe, expect, test } from "vite-plus/test";

import {
  expandQueryToken,
  isProtectedToken,
  kunyaVariants,
  lamMergedVariant,
  queryProclitics,
  stemText,
  stemToken,
} from "./stem.ts";

describe("stemToken (konservatif)", () => {
  test("kasus prototipe: artikel dan klitik artikel dibuang, kata dasar utuh", () => {
    const cases: [string, string][] = [
      ["الصبر", "صبر"],
      ["والصبر", "صبر"],
      ["بالصبر", "صبر"],
      ["للصبر", "صبر"],
      ["فالصبر", "صبر"],
      ["كالصبر", "صبر"],
      ["وبالصبر", "صبر"],
      ["صبر", "صبر"],
      ["وصبر", "وصبر"],
      ["فضيله", "فضيله"],
      ["الفضيله", "فضيله"],
      ["الله", "الله"],
      ["والله", "الله"],
      ["لله", "الله"],
      ["الذين", "الذين"],
      ["الا", "الا"],
      ["وجوب", "وجوب"],
      ["الوجوب", "وجوب"],
    ];
    for (const [input, want] of cases) expect(stemToken(input), input).toBe(want);
  });

  test("kata dilindungi tetap utuh walau berklitik (perbaikan atas prototipe)", () => {
    // Prototipe: والذين → الذين → ذين (artikel ikut terpotong setelah و dibuang).
    expect(stemToken("والذين")).toBe("الذين");
    expect(stemToken("فالتي")).toBe("التي");
    expect(stemToken("بالذي")).toBe("الذي");
    expect(stemToken("كالذي")).toBe("الذي");
    expect(stemToken("للذين")).toBe("الذين");
    expect(stemToken("وبالله")).toBe("الله");
    expect(stemToken("وللذين")).toBe("الذين");
    expect(stemToken("تالله")).toBe("الله");
    expect(stemToken("اللهم")).toBe("اللهم");
  });

  test("sisa dua huruf: kata fungsi tidak terpotong (diseragamkan ke ال), kata benda tetap terpotong (#61)", () => {
    const cases: [string, string][] = [
      ["الهم", "الهم"],
      ["بالهم", "الهم"],
      ["والهم", "الهم"],
      ["للهم", "الهم"],
      ["الان", "الان"],
      ["للام", "الام"],
      ["المن", "المن"],
      ["هم", "هم"],
      // Kata benda dua huruf: sama seperti NORM_VERSION 1, jadi الحق dan حق tetap saling ditemukan.
      ["الحق", "حق"],
      ["بالحق", "حق"],
      ["الحج", "حج"],
      ["الشك", "شك"],
      ["اليه", "يه"],
    ];
    for (const [input, want] of cases) expect(stemToken(input), input).toBe(want);
  });

  test("sisa minimal dua huruf; token kosong aman", () => {
    expect(stemToken("الي")).toBe("الي");
    expect(stemToken("ال")).toBe("ال");
    expect(stemToken("")).toBe("");
  });

  test("و/ف tanpa artikel sesudahnya tidak dibuang", () => {
    expect(stemToken("وقال")).toBe("وقال");
    expect(stemToken("فعل")).toBe("فعل");
  });
});

describe("stemText", () => {
  test("stem setiap token; spasi ganda dan tepi diabaikan", () => {
    expect(stemText("والصبر ضياء")).toBe("صبر ضياء");
    expect(stemText(" العلم  والعمل ")).toBe("علم عمل");
    expect(stemText("")).toBe("");
  });
});

describe("expandQueryToken", () => {
  test("stem → varian proklitik, urutan tetap", () => {
    expect(expandQueryToken("صبر")).toEqual([
      "صبر",
      "وصبر",
      "فصبر",
      "بصبر",
      "كصبر",
      "لصبر",
      "وبصبر",
      "فبصبر",
      "ولصبر",
      "فلصبر",
      "وكصبر",
    ]);
    expect(queryProclitics[0]).toBe("");
  });

  test("kata dilindungi dan stem pendek tidak diekspansi", () => {
    expect(expandQueryToken("الله")).toEqual(["الله"]);
    expect(expandQueryToken("في")).toEqual(["في"]);
  });

  test("stem kanonis ال + kata fungsi tidak diekspansi; varian lam melebur hanya untuk token berartikel (#61)", () => {
    expect(expandQueryToken("الهم")).toEqual(["الهم"]);
    expect(lamMergedVariant("الليل")).toBe("يل");
    expect(lamMergedVariant("اللسان")).toBe("سان");
    expect(lamMergedVariant("الصبر")).toBeNull();
    // Tanpa artikel: tidak ada varian (لان → الان, لهم → الهم akan membuka tabrakan lagi).
    for (const token of ["لان", "لهم", "ليس", "ليل"])
      expect(lamMergedVariant(token), token).toBeNull();
  });
});

describe("isProtectedToken dan kunyaVariants", () => {
  test("lafaz Allah dan isim maushul dilindungi", () => {
    expect(isProtectedToken("الله")).toBe(true);
    expect(isProtectedToken("الذين")).toBe(true);
    expect(isProtectedToken("صبر")).toBe(false);
  });

  test("tiga bentuk kunyah saling menggantikan", () => {
    expect(kunyaVariants("ابو")).toEqual(["ابو", "ابي", "ابا"]);
    expect(kunyaVariants("ابي")).toEqual(["ابو", "ابي", "ابا"]);
    expect(kunyaVariants("هريره")).toEqual(["هريره"]);
  });
});
