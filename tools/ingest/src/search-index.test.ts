import { resolve } from "node:path";

import type { PassageRow, SummaryRow, TranslationRow } from "@surau/db";
import { buildFtsMatch, normalizeArabic, stemText } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import {
  COMMON_TERM_RATIO,
  aiIndexText,
  ftsOptimizeSql,
  ftsRows,
  latinFtsRows,
  termStats,
} from "./search-index.ts";

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

describe("indeks Indonesia (S14)", () => {
  const meta = {
    model: "model-uji",
    prompt_version: "p@1",
    created_at: "2026-10-17",
    review_status: "ai_generated",
  } as const;
  const tr = (passage_id: number, lang: string, text: string): TranslationRow => ({
    passage_id,
    lang,
    text,
    ...meta,
  });
  const sm = (toc_node_id: number, lang: string, text: string): SummaryRow => ({
    toc_node_id,
    lang,
    text,
    ...meta,
  });

  test("placeholder ayat dan penanda catatan kaki tidak diindeks; stem ringan", () => {
    expect(aiIndexText("Allah berfirman, ⟦QS 2:153⟧ dan orang yang bersabar (١).")).toBe(
      "allah firman orang sabar",
    );
  });

  test("hanya bahasa id dan bukan rejected, urut rowid", () => {
    const rows = latinFtsRows(
      [
        tr(10_000_002, "id", "Kesabaran"),
        tr(10_000_001, "id", "Niat"),
        tr(10_000_001, "en", "Intention"),
        // Ditolak peninjau: tidak boleh ditemukan lewat pencarian.
        { ...tr(10_000_003, "id", "Zuhud"), review_status: "rejected" },
      ],
      [
        sm(100_002, "en", "Patience"),
        sm(100_001, "id", "Ringkasan tentang syukur"),
        { ...sm(100_003, "id", "Zuhud"), review_status: "rejected" },
      ],
    );
    expect(rows).toEqual({
      translation: [
        { rowid: 10_000_001, terms: "niat" },
        { rowid: 10_000_002, terms: "sabar" },
      ],
      summary: [{ rowid: 100_001, terms: "ringkas syukur" }],
    });
    expect(ftsOptimizeSql("summary_fts")).toBe(
      "INSERT INTO summary_fts (summary_fts) VALUES ('optimize');\n",
    );
  });
});
