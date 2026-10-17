import { planLatinQuery } from "@surau/text";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import {
  AI_SUMMARIES,
  AI_TRANSLATIONS,
  BODY_2,
  PASSAGES,
  T_CHILD_A,
  T_ROOT,
  seedAiText,
  seedCore,
  seedSearchIndex,
} from "../test/fixture.ts";
import { InvalidQuery, Unavailable } from "./errors.ts";
import { searchView } from "./schema.ts";
import type { SearchHit, SearchView } from "./schema.ts";
import { AI_SNIPPET_CHARS, aiExcerpt, searchText, splitQueryScripts } from "./search.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
  await seedSearchIndex(db, ["جمله"]);
  await seedAiText(db);
});

const hits = (v: SearchView): SearchHit[] => v.results.flatMap((p) => p.hits);
const hitOf = (v: SearchView, id: number): SearchHit | undefined =>
  hits(v).find((h) => h.id === id);

describe("splitQueryScripts", () => {
  test("huruf Arab dan Latin dipisah (digit Arab-India ikut aksara Arab)", () => {
    expect(splitQueryScripts("الصبر sabar")).toEqual({
      arabic: "الصبر      ",
      latin: "      sabar",
    });
    expect(splitQueryScripts("ṣabr ١٢")).toEqual({ arabic: "     ١٢", latin: "ṣabr   " });
  });
});

describe("searchText: jalur Indonesia", () => {
  test("terjemahan + ringkasan digabung RRF, berlabel AI, sorotan di teks AI", async () => {
    const view = await searchText(db, "Kesabaran");
    expect(searchView.parse(view)).toEqual(view);
    expect(view).toMatchObject({
      terms: [],
      latin_terms: ["sabar"],
      paths: ["translation", "summary"],
      fusion: { method: "rrf", k: 60, depth: 100, summary_depth: 30 },
      ranked: true,
      warning: null,
      total_pages: 2,
      total_hits: 2,
    });
    // Halaman 2: terjemahan + ringkasan bagian T_CHILD_A (yang dimulai paragraf body2).
    expect(hits(view).map((h) => h.id)).toEqual([PASSAGES.body2, PASSAGES.body1]);
    const b2 = hitOf(view, PASSAGES.body2);
    expect(b2?.matched_by).toEqual([
      { path: "translation", rank: 2, all_terms: true },
      { path: "summary", rank: 1, all_terms: true },
    ]);
    expect(b2?.score).toBeCloseTo(1 / 62 + 1 / 61);
    expect(view.results[0]?.score).toBe(b2?.score);
    // Teks Arab: tanpa sorotan (hanya jalur Indonesia), potongan dari awal text_raw.
    expect(b2?.highlights).toEqual([]);
    expect(b2?.snippet).toEqual({ char_start: 0, char_end: BODY_2.length, text: BODY_2 });
    const tr = AI_TRANSLATIONS[PASSAGES.body2] ?? "";
    expect(b2?.translation).toMatchObject({
      label: "ai_translation",
      lang: "id",
      model: "model-uji",
      prompt_version: "translate-passage@2",
      review_status: "ai_generated",
    });
    for (const h of b2?.translation?.highlights ?? []) {
      expect(tr.slice(h.char_start, h.char_end)).toBe("sabar");
    }
    expect(b2?.translation?.snippet.text).toBe(
      tr.slice(b2?.translation?.snippet.char_start, b2?.translation?.snippet.char_end),
    );
    expect(b2?.summary).toMatchObject({
      label: "ai_summary",
      section: {
        id: T_CHILD_A,
        title_ar: "فصل ثان",
        level: 2,
        permalink: `/kitab/uji/bab/${T_CHILD_A}`,
      },
      prompt_version: "summarize-section@2",
      snippet: { text: AI_SUMMARIES[T_CHILD_A] },
    });
    const sm = b2?.summary;
    expect(sm?.highlights.map((h) => sm.snippet.text.slice(h.char_start, h.char_end))).toEqual([
      "sabar",
    ]);
    const b1 = hitOf(view, PASSAGES.body1);
    expect(b1?.summary).toBeNull();
    expect(
      b1?.translation?.highlights.map((h) =>
        (AI_TRANSLATIONS[PASSAGES.body1] ?? "").slice(h.char_start, h.char_end),
      ),
    ).toEqual(["Kesabaran"]);
  });

  test("sebagian kata menyusul bila hampir tidak ada yang memuat semuanya", async () => {
    const view = await searchText(db, "adab murid kepada guru");
    expect(view.latin_terms).toEqual(["adab", "murid", "guru"]);
    // Semua kata: hanya body2. Sebagian: body1 (adab, murid) dan ringkasan T_ROOT (adab).
    expect(hitOf(view, PASSAGES.body2)?.matched_by).toEqual([
      { path: "translation", rank: 1, all_terms: true },
    ]);
    expect(hitOf(view, PASSAGES.body1)?.matched_by).toEqual([
      { path: "translation", rank: 2, all_terms: false },
      { path: "summary", rank: 1, all_terms: false },
    ]);
    expect(hitOf(view, PASSAGES.body1)?.summary?.section.id).toBe(T_ROOT);
  });

  test("ejaan lain dan stopword; kueri hanya kata fungsi = kosong tanpa kueri DB", async () => {
    const view = await searchText(db, "niyyah");
    expect(view.latin_terms).toEqual(["niat"]);
    expect(hitOf(view, PASSAGES.body3)?.matched_by[0]?.path).toBe("translation");
    const empty = await searchText(db, "yang dan di");
    expect(empty).toMatchObject({ paths: [], results: [], total_pages: 0, latin_terms: [] });
  });

  test("kueri campuran: jalur Arab ikut dan disorot di text_raw", async () => {
    const view = await searchText(db, "الثانية sabar");
    expect(view.paths).toEqual(["arabic", "translation", "summary"]);
    const b2 = hitOf(view, PASSAGES.body2);
    expect(b2?.matched_by.map((m) => m.path)).toEqual(["arabic", "translation", "summary"]);
    expect(b2?.highlights.map((h) => BODY_2.slice(h.char_start, h.char_end))).toEqual(["الثانية"]);
    // Kata Arab umum: jalur Arab tidak dicari, hasil dari kata Indonesia.
    const common = await searchText(db, "جملة sabar");
    expect(common).toMatchObject({ warning: "common_terms_ignored", ranked: true });
    expect(hits(common).every((h) => h.highlights.length === 0)).toBe(true);
  });

  test("kueri Arab saja: jalur S11, terjemahan ikut tanpa sorotan", async () => {
    const view = await searchText(db, "الثانية");
    expect(view).toMatchObject({ paths: ["arabic"], fusion: null, latin_terms: [] });
    const b2 = hitOf(view, PASSAGES.body2);
    expect(b2?.matched_by).toEqual([{ path: "arabic", rank: 1, all_terms: true }]);
    expect(b2?.translation?.highlights).toEqual([]);
    expect(b2?.translation?.snippet.char_start).toBe(0);
    expect(b2?.summary).toBeNull();
  });

  test("terlalu banyak kata → InvalidQuery; indeks lama/versi lain → Unavailable", async () => {
    const words = Array.from({ length: 17 }, (_, i) => `kata${i}`).join(" ");
    await expect(searchText(db, words)).rejects.toBeInstanceOf(InvalidQuery);
    onTestFinished(async () => {
      await db.prepare("UPDATE meta SET value = '6' WHERE key = 'schema_version'").run();
      await seedAiText(db);
    });
    await db.prepare("UPDATE meta SET value = '999' WHERE key = 'latin_norm_version'").run();
    await expect(searchText(db, "sabar")).rejects.toThrow(/different normalization/);
    await db.prepare("UPDATE meta SET value = '5' WHERE key = 'schema_version'").run();
    await expect(searchText(db, "sabar")).rejects.toBeInstanceOf(Unavailable);
    // Jalur Arab tetap jalan di skema 5.
    expect((await searchText(db, "الثانية")).total_hits).toBeGreaterThan(0);
  });
});

describe("aiExcerpt", () => {
  test("potongan tidak pernah memotong placeholder ayat; sorotan di placeholder dibuang", () => {
    const plan = planLatinQuery("sabar qs");
    if (plan === null) throw new Error("rencana kosong");
    for (let n = 60; n < 160; n++) {
      const text = `${"kata ".repeat(40)}⟦QS 1:2-3⟧ ${"x".repeat(n)} sabar ${"akhir ".repeat(60)}`;
      const { highlights, snippet } = aiExcerpt(text, plan);
      expect(highlights.map((h) => text.slice(h.char_start, h.char_end))).toEqual(["sabar"]);
      expect(snippet.text).toBe(text.slice(snippet.char_start, snippet.char_end));
      const holder = { start: text.indexOf("⟦"), end: text.indexOf("⟧") + 1 };
      for (const at of [snippet.char_start, snippet.char_end]) {
        expect(at > holder.start && at < holder.end).toBe(false);
      }
      expect(snippet.char_end - snippet.char_start).toBeLessThanOrEqual(AI_SNIPPET_CHARS + 12);
    }
    expect(aiExcerpt("Teks pendek.", null)).toEqual({
      highlights: [],
      snippet: { char_start: 0, char_end: 12, text: "Teks pendek." },
    });
  });
});
