import { ftsMatchExpression, normalizeArabic, planFtsQuery, stemText } from "@surau/text";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import { ED, P1, P2, P3, PASSAGES, seedCorpus } from "../../test/fixture.ts";
import { passageIdRange } from "../ids.ts";
import { searchCorpus } from "./search.ts";
import type { SearchRequest, SearchResult } from "./search.ts";

const db = env.CORPUS;
const ALL = { min: 1, max: Number.MAX_SAFE_INTEGER };

/** Permintaan dari rencana kueri @surau/text, sama dengan yang dikirim searchText. */
function req(q: string, over: Partial<SearchRequest> & { expand?: boolean } = {}): SearchRequest {
  const { expand = false, ...rest } = over;
  const plan = planFtsQuery(q, { suffix: expand });
  if (plan === null) throw new Error(`kueri kosong: ${q}`);
  return {
    plan,
    match: ftsMatchExpression(plan),
    editionId: null,
    span: ALL,
    limit: 10,
    offset: 0,
    ...rest,
  };
}

async function ready(r: Promise<SearchResult>): Promise<Extract<SearchResult, { ready: true }>> {
  const result = await r;
  if (!result.ready) throw new Error("korpus tidak siap");
  return result;
}

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

describe("searchCorpus: konteks", () => {
  test("meta, kata umum yang dicari, dan konteks sitasi semua edisi atau satu edisi", async () => {
    const all = await ready(searchCorpus(db, req("نص الصفحة")));
    expect(all.common).toEqual([{ term: "نص", df: 3 }]);
    expect(all.allCommon).toBe(false);
    expect(all.editions.map((e) => e.edition.id)).toEqual([ED, ED + 1]);
    expect(all.editions[0]?.work.slug).toBe("uji");
    expect(all.editions[0]?.author?.name_id).toBe("Penulis Uji");

    const one = await ready(searchCorpus(db, req("صبر", { editionId: ED + 1 })));
    expect(one.editions.map((e) => e.edition.slug)).toEqual(["openiti"]);
    const none = await ready(searchCorpus(db, req("صبر", { editionId: 999 })));
    expect([none.common, none.editions, none.ranked, none.inOrder]).toEqual([[], [], [], []]);
  });

  test("korpus lama (skema < 4, tanpa term_stat) → ready: false, bukan error", async () => {
    await db.prepare("ALTER TABLE term_stat RENAME TO term_stat_lama").run();
    await db.prepare("UPDATE meta SET value = '3' WHERE key = 'schema_version'").run();
    onTestFinished(async () => {
      await db.prepare("ALTER TABLE term_stat_lama RENAME TO term_stat").run();
      await db.prepare("UPDATE meta SET value = '4' WHERE key = 'schema_version'").run();
    });
    expect(await searchCorpus(db, req("نص"))).toEqual({
      ready: false,
      meta: { schema_version: 3 },
    });
  });

  test("skema < 4 walau term_stat ada → ready: false", async () => {
    await db.prepare("UPDATE meta SET value = '3' WHERE key = 'schema_version'").run();
    onTestFinished(async () => {
      await db.prepare("UPDATE meta SET value = '4' WHERE key = 'schema_version'").run();
    });
    expect((await searchCorpus(db, req("نص"))).ready).toBe(false);
  });

  test("permintaan tidak sah ditolak sebelum menyentuh DB", async () => {
    await expect(searchCorpus(db, req("نص", { limit: 0 }))).rejects.toThrow(RangeError);
    await expect(searchCorpus(db, req("نص", { offset: -1 }))).rejects.toThrow(RangeError);
    const empty = { phrases: [], prefix: false };
    await expect(searchCorpus(db, req("نص", { plan: empty }))).rejects.toThrow(RangeError);
    const ragged = { phrases: [["نص"], ["نص", "صفحه"]], prefix: false };
    await expect(searchCorpus(db, req("نص", { plan: ragged }))).rejects.toThrow(RangeError);
  });
});

describe("searchCorpus: berperingkat", () => {
  test("dikelompokkan per halaman; semua paragraf cocok di halaman itu, urut baca; total", async () => {
    const r = await ready(searchCorpus(db, req("حاشية")));
    expect(r.inOrder).toEqual([]);
    expect(r.ranked.map((x) => [x.page_id, x.kind, x.ord, x.page_hits])).toEqual([
      [P1, "foot", 1, 2],
      [P1, "foot", 2, 2],
    ]);
    expect(r.ranked[0]).toMatchObject({
      id: PASSAGES.foot1,
      juz: 1,
      page_no: 1,
      total_pages: 1,
      total_hits: 2,
      toc_title: "فصل أول",
      toc_level: 2,
    });
    expect(r.ranked[0]?.score).toBeLessThan(0);
    expect(r.ranked[0]?.page_best).toBe(Math.min(...r.ranked.map((x) => x.score)));
  });

  test("limit/offset per halaman; total tetap seluruh hasil", async () => {
    // "الصفحة": badan halaman 1 dan 2 (tidak umum, jadi diranking).
    const first = await ready(searchCorpus(db, req("الصفحة", { limit: 1 })));
    expect(first.ranked.map((x) => x.page_id)).toHaveLength(1);
    expect(first.ranked[0]).toMatchObject({ total_pages: 2, total_hits: 2 });
    const rest = await ready(searchCorpus(db, req("الصفحة", { limit: 1, offset: 1 })));
    const pages = new Set([...first.ranked, ...rest.ranked].map((x) => x.page_id));
    expect(pages).toEqual(new Set([P1, P2]));
  });

  test("filter edisi lewat rentang rowid; kueri tanpa hasil → kosong", async () => {
    const other = await ready(searchCorpus(db, req("الصفحة", { span: passageIdRange(ED + 1) })));
    expect(other.ranked).toEqual([]);
    const own = await ready(searchCorpus(db, req("الصفحة", { span: passageIdRange(ED) })));
    expect(own.ranked).toHaveLength(2);
    expect((await ready(searchCorpus(db, req("صبر")))).ranked).toEqual([]);
  });
});

describe("searchCorpus: pengaman kata umum", () => {
  test("semua stem umum → paragraf pertama urutan korpus, kueri berperingkat tidak memindai", async () => {
    const r = await ready(searchCorpus(db, req("نص", { limit: 2 })));
    expect(r.allCommon).toBe(true);
    expect(r.ranked).toEqual([]);
    expect(r.inOrder.map((x) => x.id)).toEqual([PASSAGES.body1, PASSAGES.body2]);
    expect(r.inOrder.map((x) => [x.juz, x.page_no])).toEqual([
      [1, 1],
      [1, 2],
    ]);
    expect(r.inOrder[1]).not.toHaveProperty("score");
    // Frasa yang SETIAP posisinya kata umum juga dijaga.
    expect((await ready(searchCorpus(db, req("نص نص")))).allCommon).toBe(true);
  });

  test("awalan expand ikut dijaga (temuan peninjau S11: الل + expand → الله)", async () => {
    await db.prepare("INSERT INTO term_stat (term, df) VALUES ('حاشيه', 2)").run();
    onTestFinished(async () => {
      await db.prepare("DELETE FROM term_stat WHERE term = 'حاشيه'").run();
    });
    const prefix = await ready(searchCorpus(db, req("حاشي", { expand: true })));
    expect(prefix.allCommon).toBe(true);
    expect(prefix.common).toEqual([{ term: "حاشيه", df: 2 }]);
    expect(prefix.ranked).toEqual([]);
    expect(prefix.inOrder.map((x) => x.id)).toEqual([PASSAGES.foot1, PASSAGES.foot2]);
    // Tanpa expand, "حاشي" bukan kata umum dan tidak cocok apa pun (berperingkat, kosong).
    const plain = await ready(searchCorpus(db, req("حاشي")));
    expect([plain.allCommon, plain.common, plain.ranked]).toEqual([false, [], []]);
  });

  test("varian proklitik kata umum ikut dijaga (سلم → وسلم)", async () => {
    // "وصفحه" dicatat umum; kueri "صفحة" ikut mencari varian "وصفحه" (expandQueryToken).
    await db.prepare("INSERT INTO term_stat (term, df) VALUES ('وصفحه', 9)").run();
    onTestFinished(async () => {
      await db.prepare("DELETE FROM term_stat WHERE term = 'وصفحه'").run();
    });
    const r = await ready(searchCorpus(db, req("صفحة")));
    expect([r.allCommon, r.common.map((c) => c.term), r.ranked]).toEqual([true, ["وصفحه"], []]);
  });

  test("frasa campuran (satu stem umum) → berperingkat, urutan kitab kosong", async () => {
    const r = await ready(searchCorpus(db, req("نص الصفحة")));
    expect(r.allCommon).toBe(false);
    expect(r.inOrder).toEqual([]);
    // Frasa persis: hanya "نص الصفحة الثانية" (P2); P1 memuat "نص تجريبي … الصفحة".
    expect(r.ranked.map((x) => x.page_id)).toEqual([P2]);
  });

  test("P3 tetap terjangkau lewat kata tidak umum", async () => {
    const r = await ready(searchCorpus(db, req("الجزء")));
    expect(r.ranked.map((x) => x.page_id)).toEqual([P3]);
  });
});
