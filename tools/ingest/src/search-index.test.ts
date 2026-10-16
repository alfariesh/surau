import { resolve } from "node:path";

import type { PassageRow } from "@surau/db";
import { buildFtsMatch, normalizeArabic, stemText } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { COMMON_TERM_RATIO, ftsRows, termStats } from "./search-index.ts";

const migrations = resolve(import.meta.dirname, "../../../packages/db/migrations/corpus");

// Kalimat buatan (bukan teks kitab).
function passage(id: number, kind: "body" | "foot", text: string): PassageRow {
  return { id, edition_id: 1, page_id: 100_001, toc_node_id: null, kind, ord: id, text_raw: text };
}

describe("ftsRows", () => {
  test("stem dari bentuk normal; kolom sesuai kind; body/foot kosong", () => {
    const rows = ftsRows([
      passage(10_000_001, "body", "وَالصَّبْرُ ضِيَاءٌ (١)"),
      passage(10_000_002, "foot", "(١) أخرجه مسلم"),
    ]);
    expect(rows).toEqual([
      { rowid: 10_000_001, body: "", foot: "", sbody: "صبر ضياء", sfoot: "" },
      { rowid: 10_000_002, body: "", foot: "", sbody: "", sfoot: "اخرجه مسلم" },
    ]);
    // Identik dengan sisi kueri: stem token yang dicari ada di kolom stem.
    expect(stemText(normalizeArabic("والصبر").text)).toBe("صبر");
    expect(buildFtsMatch("والصبر")).toContain('"صبر"');
  });
});

describe("termStats", () => {
  test("hanya stem dengan df > rasio × jumlah paragraf, dari fts5vocab (badan + catatan kaki)", () => {
    // 10 paragraf: "الله" di 9 (badan dan catatan kaki), "قال" di 2, "صبر" di 1.
    const passages = Array.from({ length: 10 }, (_, i) =>
      passage(10_000_001 + i, i % 3 === 0 ? "foot" : "body", i === 0 ? "صبر" : "والله أعلم"),
    );
    passages.push(passage(10_000_011, "body", "قال قال الله"));
    passages.push(passage(10_000_012, "body", "قال"));
    const stats = termStats(ftsRows(passages), migrations, 0.5);
    // 12 paragraf × 0,5 = 6: الله (10) dan اعلم (9) lolos; قال (2) dan صبر (1) tidak. df dihitung
    // per paragraf, bukan per kemunculan (قال قال = 1).
    expect(stats).toEqual([
      { term: "اعلم", df: 9 },
      { term: "الله", df: 10 },
    ]);
  });

  test("tanpa paragraf → kosong; rasio di luar (0, 1) ditolak", () => {
    expect(termStats([], migrations)).toEqual([]);
    expect(() => termStats([], migrations, 0)).toThrow(RangeError);
    expect(() => termStats([], migrations, 1)).toThrow(RangeError);
    expect(COMMON_TERM_RATIO).toBe(0.1);
  });
});
