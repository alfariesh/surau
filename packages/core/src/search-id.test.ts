import { CORPUS_SCHEMA_VERSION } from "@surau/db";
import type { FusedSearchRequest, FusedSearchResult } from "@surau/db";
import { LATIN_NORM_VERSION, latinIndexText, planLatinQuery } from "@surau/text";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import {
  AI_SUMMARIES,
  AI_TRANSLATIONS,
  BODY_2,
  ED,
  PASSAGES,
  T_CHILD_A,
  T_ROOT,
  seedAiText,
  seedCore,
  seedDigest,
  seedHumanReview,
  seedSearchIndex,
} from "../test/fixture.ts";
import { InvalidQuery, NotFound, Unavailable } from "./errors.ts";
import { searchView } from "./schema.ts";
import type { SearchHit, SearchView } from "./schema.ts";
import {
  AI_SNIPPET_CHARS,
  aiExcerpt,
  fusedWithDigest,
  queryWordOverflow,
  resetDigestIndexMemo,
  searchCacheKey,
  searchSummarySections,
  searchText,
  splitQueryScripts,
} from "./search.ts";

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
  test("tinjauan manusia ikut di potongan terjemahan hasil (X08); yang lain null", async () => {
    await seedHumanReview(db, { passage_id: PASSAGES.body1, revised: false });
    onTestFinished(() => seedAiText(db));
    const view = await searchText(db, "Kesabaran");
    expect(searchView.parse(view)).toEqual(view);
    expect(hitOf(view, PASSAGES.body1)?.translation).toMatchObject({
      label: "ai_translation",
      review_status: "ustadz_verified",
      human_review: { revised: false, reviewer_role: "ustadz", reviewer_short: "Ust. Uji" },
    });
    expect(hitOf(view, PASSAGES.body2)?.translation?.human_review).toBeNull();
  });

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

describe("searchText: filter bagian", () => {
  test("section_id membatasi hasil; bagian tidak ada / edisi lain → NotFound", async () => {
    const view = await searchText(db, "sabar", { section_id: T_CHILD_A });
    expect(view.section_id).toBe(T_CHILD_A);
    expect(hits(view).map((h) => h.id)).toEqual([PASSAGES.body2]);
    const ar = await searchText(db, "الثانية", { section_id: T_ROOT });
    expect(hits(ar).map((h) => h.id)).toContain(PASSAGES.body2);
    await expect(searchText(db, "sabar", { section_id: 999_999 })).rejects.toBeInstanceOf(NotFound);
    await expect(
      searchText(db, "الثانية", { section_id: T_ROOT, edition_id: ED + 1 }),
    ).rejects.toThrow(/Section not found/);
  });
});

describe("searchText: jalur gagasan Intisari (X16)", () => {
  test("hanya bila diminta: gagasan cocok → paragraf jangkar pertamanya, berlabel AI + tautan Intisari", async () => {
    // Intisari Kitab buatan T_ROOT (seedDigest): gagasan 1 berjangkar ke body1 utuh.
    await seedDigest(db);
    const rowid = T_ROOT * 100 + 1;
    await db
      .prepare("INSERT INTO digest_point_fts (rowid, terms) VALUES (?, ?)")
      .bind(rowid, latinIndexText("Gagasan contoh. Isi gagasan contoh."))
      .run();
    onTestFinished(async () => {
      await db.prepare("DELETE FROM digest_point_fts WHERE rowid = ?").bind(rowid).run();
    });
    const off = await searchText(db, "gagasan contoh");
    expect(off.paths).not.toContain("digest");
    expect(off.fusion?.digest_depth).toBeNull();
    expect(hits(off).every((h) => h.digest_point === null)).toBe(true);

    const on = await searchText(db, "gagasan contoh", {}, { digest: true });
    expect(searchView.parse(on)).toEqual(on);
    expect(on.paths).toContain("digest");
    expect(on.fusion?.digest_depth).toBe(30);
    const hit = hits(on).find((h) => h.digest_point !== null);
    expect(hit?.id).toBe(PASSAGES.body1);
    expect(hit?.matched_by).toContainEqual({ path: "digest", rank: 1, all_terms: true });
    expect(hit?.digest_point).toMatchObject({
      label: "ai_digest",
      section: { id: T_ROOT, permalink: `/kitab/uji/bab/${T_ROOT}` },
      ord: 1,
      title: "Gagasan contoh",
      model: "model-uji",
      prompt_version: "digest-book@1",
      review_status: "ai_generated",
      permalink: `/kitab/uji/bab/${T_ROOT}/intisari`,
    });
    expect(hit?.digest_point?.title_highlights.length).toBeGreaterThan(0);
  });

  test("gagasan di daftar tarik (ADR-127) tidak dikirim; paragrafnya tetap hasil", async () => {
    await seedDigest(db);
    const rowid = T_ROOT * 100 + 1;
    await db
      .prepare("INSERT INTO digest_point_fts (rowid, terms) VALUES (?, ?)")
      .bind(rowid, latinIndexText("Gagasan contoh. Isi gagasan contoh."))
      .run();
    onTestFinished(async () => {
      await db.prepare("DELETE FROM digest_point_fts WHERE rowid = ?").bind(rowid).run();
    });
    const pull = (createdAt: string) => [
      {
        toc_node_id: T_ROOT,
        lang: "id",
        ord: 1,
        digest_created_at: createdAt,
        digest_prompt_version: "digest-book@1",
        verdict: "salah" as const,
        reason: "Alasan uji.",
        reviewer: "tes",
        source: "tes",
        assessed: "2026-10-25",
        date: "2026-10-28",
        audio_r2_key: null,
      },
    ];
    const pulled = await searchText(
      db,
      "gagasan contoh",
      {},
      { digest: true, withdrawals: pull("2026-10-24") },
    );
    expect(hits(pulled).every((h) => h.digest_point === null)).toBe(true);
    // Jalur gagasan tidak disebut sebagai alasan cocok bila gagasannya ditarik.
    expect(hits(pulled).some((h) => h.matched_by.some((m) => m.path === "digest"))).toBe(false);
    expect(hits(pulled).map((h) => h.id)).toContain(PASSAGES.body1);
    // Intisari dibangun ulang (versi lain): entri tidak berlaku.
    const rebuilt = await searchText(
      db,
      "gagasan contoh",
      {},
      { digest: true, withdrawals: pull("2026-11-01") },
    );
    expect(hits(rebuilt).some((h) => h.digest_point?.ord === 1)).toBe(true);
    expect(hits(rebuilt).some((h) => h.matched_by.some((m) => m.path === "digest"))).toBe(true);
  });

  test("D1 sungguhan tanpa tabel digest_point_fts (korpus skema < 9): Cari jalan tanpa jalur gagasan, kueri gagal tidak diulang", async () => {
    resetDigestIndexMemo();
    await db.batch([
      db.prepare("DROP TABLE digest_point_fts"),
      db.prepare("UPDATE meta SET value = '8' WHERE key = 'schema_version'"),
    ]);
    onTestFinished(async () => {
      // DDL sama dengan migrasi korpus 0009.
      await db.batch([
        db.prepare(
          `CREATE VIRTUAL TABLE digest_point_fts USING fts5 (terms, content = '',
             contentless_delete = 1, tokenize = 'unicode61 remove_diacritics 2')`,
        ),
        db
          .prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'")
          .bind(String(CORPUS_SCHEMA_VERSION)),
      ]);
      resetDigestIndexMemo();
    });
    let digestQueries = 0;
    const counted = {
      prepare: (sql: string) => {
        if (sql.includes("digest_point_fts")) digestQueries++;
        return db.prepare(sql);
      },
      batch: db.batch.bind(db),
    } as typeof db;
    const first = await searchText(counted, "sabar", {}, { digest: true });
    expect(first.paths).not.toContain("digest");
    expect(hits(first).length).toBeGreaterThan(0);
    expect(digestQueries).toBe(1);
    const second = await searchText(counted, "sabar", {}, { digest: true });
    expect(second.paths).not.toContain("digest");
    expect(digestQueries).toBe(1);
  });

  test("korpus tanpa indeks gagasan: sekali gagal lalu diingat; pulih saat skema ≥ 9", async () => {
    resetDigestIndexMemo();
    onTestFinished(resetDigestIndexMemo);
    const calls: boolean[] = [];
    let schema = 8;
    const result = (): FusedSearchResult =>
      ({ ready: false, meta: { schema_version: schema } }) as unknown as FusedSearchResult;
    const search = async (req: FusedSearchRequest) => {
      calls.push(req.digest === true);
      if (req.digest === true && schema < 9) {
        throw new Error("D1_ERROR: no such table: digest_point_fts: SQLITE_ERROR");
      }
      return result();
    };
    const req = {} as FusedSearchRequest;
    expect((await fusedWithDigest(search, req, true)).digest).toBe(false);
    expect((await fusedWithDigest(search, req, true)).digest).toBe(false);
    // Percobaan kedua tidak mengulang kueri gagal.
    expect(calls).toEqual([true, false, false]);
    // Tidak diminta: tidak pernah mencoba.
    await fusedWithDigest(search, req, false);
    expect(calls.at(-1)).toBe(false);
    // Galat lain tidak ditelan.
    const broken = async () => {
      throw new Error("D1_ERROR: network");
    };
    resetDigestIndexMemo();
    await expect(fusedWithDigest(broken, req, true)).rejects.toThrow(/network/);
    // Staging naik ke skema 9 tanpa isolate baru: sesudah satu pencarian, jalur dicoba lagi.
    await fusedWithDigest(search, req, true);
    schema = 9;
    calls.length = 0;
    await fusedWithDigest(search, req, true);
    expect((await fusedWithDigest(search, req, true)).digest).toBe(true);
    expect(calls).toEqual([false, true]);
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

describe("searchCacheKey", () => {
  test("rencana ternormalisasi: ejaan/harakat/huruf besar berbeda = kunci sama", () => {
    expect(searchCacheKey("Sabar")).toBe(searchCacheKey("sabar"));
    expect(searchCacheKey("kesabaran")).toBe(searchCacheKey("sabar"));
    expect(searchCacheKey("الصَّبْرُ")).toBe(searchCacheKey("الصبر"));
    expect(searchCacheKey("taubat")).toBe(searchCacheKey("tobat"));
  });

  test("opsi dan aksara membedakan kunci; kueri kosong/tidak sah = null", () => {
    const base = searchCacheKey("sabar");
    expect(searchCacheKey("sabar", { offset: 20 })).not.toBe(base);
    expect(searchCacheKey("sabar", { limit: 5 })).not.toBe(base);
    expect(searchCacheKey("sabar", { edition_id: 7 })).not.toBe(base);
    expect(searchCacheKey("الصبر", { expand: true })).not.toBe(searchCacheKey("الصبر"));
    expect(searchCacheKey("الصبر sabar")).not.toBe(base);
    expect(searchCacheKey("")).toBeNull();
    expect(searchCacheKey("yang dan")).toBeNull();
    expect(searchCacheKey("sabar", { limit: 0 })).toBeNull();
    expect(searchCacheKey(Array.from({ length: 17 }, (_, i) => `k${i}`).join(" "))).toBeNull();
    expect(searchCacheKey(Array(33).fill("علم").join(" "))).toBeNull();
  });
});

describe("queryWordOverflow", () => {
  test("aksara yang melebihi batas kata searchText, sama dengan validasinya", async () => {
    const latin = Array.from({ length: 17 }, (_, i) => `k${i}`).join(" ");
    const arabic = Array(33).fill("علم").join(" ");
    expect(queryWordOverflow("sabar الصبر")).toBeNull();
    expect(queryWordOverflow(latin)).toBe("latin");
    expect(queryWordOverflow(`${arabic} sabar`)).toBe("arabic");
    await expect(searchText(db, latin)).rejects.toBeInstanceOf(InvalidQuery);
    await expect(searchText(db, arabic)).rejects.toBeInstanceOf(InvalidQuery);
    expect(queryWordOverflow(Array(16).fill("sabar").join(" "))).toBeNull();
  });
});

describe("searchSummarySections", () => {
  test("bagian yang ringkasannya cocok, terbaik dulu; kata Arab dan edisi menyaring", async () => {
    // AI_SUMMARIES: T_ROOT "niat dan adab", T_CHILD_A "sabar dan syukur".
    expect(await searchSummarySections(db, "kesabaran dan syukur", { limit: 3 })).toEqual([
      T_CHILD_A,
    ]);
    const any = await searchSummarySections(db, "adab orang sabar", { limit: 3 });
    const byId = (a: number, b: number) => a - b;
    expect(any.toSorted(byId)).toEqual([T_ROOT, T_CHILD_A].toSorted(byId));
    expect(await searchSummarySections(db, "الصبر sabar", { edition_id: ED, limit: 3 })).toEqual([
      T_CHILD_A,
    ]);
    expect(await searchSummarySections(db, "sabar", { edition_id: ED + 1, limit: 3 })).toEqual([]);
    expect(await searchSummarySections(db, "الصبر", { limit: 3 })).toEqual([]);
    expect(await searchSummarySections(db, "zuhud", { limit: 3 })).toEqual([]);
  });

  test("kueri tidak sah → InvalidQuery; indeks lama/versi lain → kosong, bukan galat", async () => {
    const long = Array.from({ length: 17 }, (_, i) => `k${i}`).join(" ");
    await expect(searchSummarySections(db, long, { limit: 3 })).rejects.toBeInstanceOf(
      InvalidQuery,
    );
    await expect(searchSummarySections(db, "sabar", { limit: 0 })).rejects.toBeInstanceOf(
      InvalidQuery,
    );
    onTestFinished(async () => {
      await db
        .prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'")
        .bind(String(CORPUS_SCHEMA_VERSION))
        .run();
      await db
        .prepare("UPDATE meta SET value = ? WHERE key = 'latin_norm_version'")
        .bind(String(LATIN_NORM_VERSION))
        .run();
    });
    await db.prepare("UPDATE meta SET value = '999' WHERE key = 'latin_norm_version'").run();
    expect(await searchSummarySections(db, "sabar", { limit: 3 })).toEqual([]);
    await db.prepare("UPDATE meta SET value = '5' WHERE key = 'schema_version'").run();
    expect(await searchSummarySections(db, "sabar", { limit: 3 })).toEqual([]);
  });
});
