import { describe, expect, it } from "vite-plus/test";

import { hitParts } from "./hit-parts";

const lane = (...paths: ("arabic" | "translation" | "summary")[]) =>
  paths.map((path) => ({ path, rank: 1, all_terms: true }));

describe("hitParts: kartu Cari menurut mode baca (X11)", () => {
  it("Keduanya: Arab + terjemahan + ringkasan bila ada", () => {
    expect(
      hitParts({ matched_by: lane("arabic"), hasTranslation: true, hasSummary: false }, "both"),
    ).toEqual(["arabic", "translation"]);
    expect(
      hitParts({ matched_by: lane("summary"), hasTranslation: true, hasSummary: true }, "both"),
    ).toEqual(["arabic", "translation", "summary"]);
  });

  it("Arab: terjemahan disembunyikan bila hanya jalur Arab yang cocok", () => {
    expect(
      hitParts({ matched_by: lane("arabic"), hasTranslation: true, hasSummary: false }, "ar"),
    ).toEqual(["arabic"]);
  });

  it("Arab: terjemahan tetap tampil bila jalur terjemahan yang cocok (bukti kecocokan)", () => {
    expect(
      hitParts({ matched_by: lane("translation"), hasTranslation: true, hasSummary: false }, "ar"),
    ).toEqual(["arabic", "translation"]);
  });

  it("Arab: ringkasan (hanya ada bila jalurnya cocok) tetap tampil; Arab selalu ada", () => {
    expect(
      hitParts({ matched_by: lane("summary"), hasTranslation: true, hasSummary: true }, "ar"),
    ).toEqual(["arabic", "summary"]);
    expect(
      hitParts({ matched_by: lane("translation"), hasTranslation: false, hasSummary: false }, "ar"),
    ).toEqual(["arabic"]);
  });

  it("Terjemahan: terjemahan lebih dulu, Arab tetap tampil; tanpa terjemahan hanya Arab", () => {
    expect(
      hitParts({ matched_by: lane("arabic"), hasTranslation: true, hasSummary: true }, "tr"),
    ).toEqual(["translation", "arabic", "summary"]);
    expect(
      hitParts({ matched_by: lane("arabic"), hasTranslation: false, hasSummary: false }, "tr"),
    ).toEqual(["arabic"]);
  });
});
