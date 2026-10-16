import { buildFtsMatch, normalizeArabic, stemText } from "@surau/text";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import { ED, P1, P2, P3, PASSAGES, seedCorpus } from "../../test/fixture.ts";
import { passageIdRange } from "../ids.ts";
import { getSearchContext, searchInOrder, searchRankedPages } from "./search.ts";

const db = env.CORPUS;
const ALL = { min: 1, max: Number.MAX_SAFE_INTEGER };
const match = (q: string): string => buildFtsMatch(q) ?? "";

// Indeks fixture dibangun dengan aturan yang sama dengan ingest (stem dari bentuk normal, kolom
// sesuai kind; body/foot kosong, ADR-039). "نص" dicatat sebagai kata umum.
beforeAll(async () => {
  await seedCorpus(db);
  const { results } = await db
    .prepare("SELECT id, kind, text_raw FROM passage ORDER BY id")
    .all<{ id: number; kind: string; text_raw: string }>();
  await db.batch([
    db.prepare("INSERT INTO passage_fts (passage_fts) VALUES ('delete-all')"),
    db.prepare("DELETE FROM term_stat"),
    db.prepare("INSERT INTO term_stat (term, df) VALUES ('نص', 3)"),
    ...results.map((r) => {
      const stem = stemText(normalizeArabic(r.text_raw).text);
      return db
        .prepare(
          "INSERT INTO passage_fts (rowid, body, foot, sbody, sfoot) VALUES (?, '', '', ?, ?)",
        )
        .bind(r.id, r.kind === "body" ? stem : "", r.kind === "foot" ? stem : "");
    }),
  ]);
});

describe("getSearchContext", () => {
  test("meta, kata umum yang dicari, dan konteks sitasi semua edisi atau satu edisi", async () => {
    const all = await getSearchContext(db, ["نص", "صفحه", "نص"], null);
    expect(all.ready).toBe(true);
    if (!all.ready) return;
    expect(all.common).toEqual([{ term: "نص", df: 3 }]);
    expect(all.editions.map((e) => e.edition.id)).toEqual([ED, ED + 1]);
    expect(all.editions[0]?.work.slug).toBe("uji");
    expect(all.editions[0]?.author?.name_id).toBe("Penulis Uji");

    const one = await getSearchContext(db, [], ED + 1);
    expect(one.ready && one.editions.map((e) => e.edition.slug)).toEqual(["openiti"]);
    const none = await getSearchContext(db, ["صبر"], 999);
    expect(none.ready && [none.common, none.editions]).toEqual([[], []]);
  });

  test("korpus lama (skema < 4, tanpa term_stat) → ready: false, bukan error", async () => {
    await db.prepare("ALTER TABLE term_stat RENAME TO term_stat_lama").run();
    await db.prepare("UPDATE meta SET value = '3' WHERE key = 'schema_version'").run();
    onTestFinished(async () => {
      await db.prepare("ALTER TABLE term_stat_lama RENAME TO term_stat").run();
      await db.prepare("UPDATE meta SET value = '4' WHERE key = 'schema_version'").run();
    });
    const ctx = await getSearchContext(db, ["نص"], null);
    expect(ctx).toEqual({ ready: false, meta: { schema_version: 3 } });
  });

  test("skema < 4 walau term_stat ada → ready: false", async () => {
    await db.prepare("UPDATE meta SET value = '3' WHERE key = 'schema_version'").run();
    onTestFinished(async () => {
      await db.prepare("UPDATE meta SET value = '4' WHERE key = 'schema_version'").run();
    });
    expect((await getSearchContext(db, ["نص"], null)).ready).toBe(false);
  });
});

describe("searchRankedPages", () => {
  test("dikelompokkan per halaman; semua paragraf cocok di halaman itu, urut baca; total", async () => {
    const rows = await searchRankedPages(db, match("حاشية"), ALL, 10);
    expect(rows.map((r) => [r.page_id, r.kind, r.ord, r.page_hits])).toEqual([
      [P1, "foot", 1, 2],
      [P1, "foot", 2, 2],
    ]);
    expect(rows[0]).toMatchObject({
      id: PASSAGES.foot1,
      juz: 1,
      page_no: 1,
      total_pages: 1,
      total_hits: 2,
      toc_title: "فصل أول",
      toc_level: 2,
    });
    expect(rows[0]?.score).toBeLessThan(0);
    expect(rows[0]?.page_best).toBe(Math.min(...rows.map((r) => r.score)));
  });

  test("limit/offset per halaman; total tetap seluruh hasil", async () => {
    const first = await searchRankedPages(db, match("نص"), ALL, 2);
    expect(new Set(first.map((r) => r.page_id)).size).toBe(2);
    expect(first[0]).toMatchObject({ total_pages: 3, total_hits: 3 });
    const rest = await searchRankedPages(db, match("نص"), ALL, 2, 2);
    expect(rest.map((r) => r.page_id)).toHaveLength(1);
    const pages = new Set([...first, ...rest].map((r) => r.page_id));
    expect(pages).toEqual(new Set([P1, P2, P3]));
  });

  test("filter edisi lewat rentang rowid; kueri tanpa hasil → kosong", async () => {
    expect(await searchRankedPages(db, match("نص"), passageIdRange(ED + 1), 10)).toEqual([]);
    expect(await searchRankedPages(db, match("نص"), passageIdRange(ED), 10)).toHaveLength(3);
    expect(await searchRankedPages(db, match("صبر"), ALL, 10)).toEqual([]);
  });

  test("limit/offset tidak sah ditolak sebelum menyentuh DB", () => {
    expect(() => searchRankedPages(db, match("نص"), ALL, 0)).toThrow(RangeError);
    expect(() => searchRankedPages(db, match("نص"), ALL, 1, -1)).toThrow(RangeError);
  });
});

describe("searchInOrder", () => {
  test("paragraf cocok pertama dalam urutan korpus, tanpa peringkat", async () => {
    const rows = await searchInOrder(db, match("نص"), ALL, 2);
    expect(rows.map((r) => r.id)).toEqual([PASSAGES.body1, PASSAGES.body2]);
    expect(rows.map((r) => [r.juz, r.page_no])).toEqual([
      [1, 1],
      [1, 2],
    ]);
    expect(rows[1]).not.toHaveProperty("score");
    expect(() => searchInOrder(db, match("نص"), ALL, 0)).toThrow(RangeError);
  });
});
