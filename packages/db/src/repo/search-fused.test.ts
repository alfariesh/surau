import {
  ftsMatchExpression,
  latinIndexText,
  latinMatchExpression,
  normalizeArabic,
  planFtsQuery,
  planLatinQuery,
  stemText,
} from "@surau/text";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import {
  ED,
  P1,
  P2,
  P3,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_ROOT,
  seedCorpus,
} from "../../test/fixture.ts";
import { passageIdRange, tocNodeId, tocNodeIdRange } from "../ids.ts";
import { CORPUS_SCHEMA_VERSION } from "../schema/corpus.ts";
import { RRF_K, searchCorpusFused, searchSummaryNodes } from "./search.ts";
import type { FusedSearchRequest, FusedSearchResult } from "./search.ts";

const db = env.CORPUS;
const ALL = { min: 1, max: Number.MAX_SAFE_INTEGER };

// Terjemahan dan ringkasan BUATAN (kalimat contoh, bukan terjemahan kitab).
const TR = {
  [PASSAGES.body1]: "Kesabaran adalah cahaya bagi murid yang menuntut ilmu.",
  [PASSAGES.body2]: "Guru yang sabar mengajarkan adab ⟦QS 1:2-3⟧ kepada muridnya.",
  [PASSAGES.body3]: "Niat yang ikhlas menjadi dasar amal.",
};
const SUM = {
  [T_ROOT]: "Bab ini membahas niat dan adab.",
  [T_CHILD_A]: "Pasal tentang sabar dan syukur.",
};

function req(q: string, over: Partial<FusedSearchRequest> = {}): FusedSearchRequest {
  const latin = planLatinQuery(q.replace(/\p{Script=Arabic}/gu, " "));
  if (latin === null) throw new Error(`kueri Indonesia kosong: ${q}`);
  const ar = planFtsQuery(q.replace(/\p{Script=Latin}/gu, " "));
  return {
    arabic: ar === null ? null : { plan: ar, match: ftsMatchExpression(ar) },
    latin: {
      all: latinMatchExpression(latin, "all"),
      any: latin.stems.length > 1 ? latinMatchExpression(latin, "any") : null,
    },
    editionId: null,
    span: ALL,
    tocSpan: ALL,
    limit: 10,
    offset: 0,
    ...over,
  };
}

async function ready(
  r: Promise<FusedSearchResult>,
): Promise<Extract<FusedSearchResult, { ready: true }>> {
  const result = await r;
  if (!result.ready) throw new Error("korpus tidak siap");
  return result;
}

beforeAll(async () => {
  await seedCorpus(db);
  const { results } = await db
    .prepare("SELECT id, kind, text_raw FROM passage ORDER BY id")
    .all<{ id: number; kind: string; text_raw: string }>();
  const meta = (k: string, v: string) =>
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").bind(k, v);
  await db.batch([
    db.prepare("INSERT INTO passage_fts (passage_fts) VALUES ('delete-all')"),
    db.prepare("INSERT INTO translation_fts (translation_fts) VALUES ('delete-all')"),
    db.prepare("INSERT INTO summary_fts (summary_fts) VALUES ('delete-all')"),
    db.prepare("DELETE FROM term_stat"),
    db.prepare("INSERT INTO term_stat (term, df) VALUES ('نص', 3)"),
    meta("norm_version", "1"),
    meta("latin_norm_version", "1"),
    ...results.map((r) => {
      const stem = stemText(normalizeArabic(r.text_raw).text);
      return db
        .prepare(
          "INSERT INTO passage_fts (rowid, body, foot, sbody, sfoot) VALUES (?, '', '', ?, ?)",
        )
        .bind(r.id, r.kind === "body" ? stem : "", r.kind === "foot" ? stem : "");
    }),
    ...Object.entries(TR).flatMap(([id, text]) => [
      db
        .prepare(
          `INSERT INTO translation (passage_id, lang, text, model, prompt_version, created_at)
           VALUES (?, 'id', ?, 'model-uji', 'translate-passage@2', '2026-10-17')`,
        )
        .bind(Number(id), text),
      db
        .prepare("INSERT INTO translation_fts (rowid, terms) VALUES (?, ?)")
        .bind(Number(id), latinIndexText(text.replace(/⟦[^⟧]*⟧/g, " "))),
    ]),
    ...Object.entries(SUM).flatMap(([id, text]) => [
      db
        .prepare(
          `INSERT INTO summary (toc_node_id, lang, text, model, prompt_version, created_at)
           VALUES (?, 'id', ?, 'model-uji', 'summarize-section@2', '2026-10-17'),
                  (?, 'en', 'English summary', 'model-uji', 'summarize-section@2', '2026-10-17')`,
        )
        .bind(Number(id), text, Number(id)),
      db
        .prepare("INSERT INTO summary_fts (rowid, terms) VALUES (?, ?)")
        .bind(Number(id), latinIndexText(text)),
    ]),
  ]);
});

describe("searchCorpusFused", () => {
  test("satu kata: terjemahan + ringkasan digabung RRF; ringkasan → paragraf awal bagian", async () => {
    const r = await ready(searchCorpusFused(db, req("sabar")));
    expect(r.allCommon).toBe(false);
    expect(r.rows.map((x) => x.id)).toEqual([PASSAGES.body2, PASSAGES.body1]);
    const [b2, b1] = r.rows;
    // body2: terjemahan peringkat 2 (bm25) + ringkasan T_CHILD_A peringkat 1.
    expect(b2).toMatchObject({
      page_id: P2,
      tr_rank: expect.any(Number),
      tr_all: 1,
      sm_rank: 1,
      sm_all: 1,
      sm_node: T_CHILD_A,
      sm_title: "فصل ثان",
      sm_level: 2,
      sm_text: SUM[T_CHILD_A],
      sm_model: "model-uji",
      sm_review: "ai_generated",
      tr_text: TR[PASSAGES.body2],
      tr_prompt: "translate-passage@2",
      ar_rank: null,
      total_pages: 2,
      total_hits: 2,
      page_hits: 1,
    });
    expect(b2?.score).toBeCloseTo(1 / (RRF_K + (b2?.tr_rank ?? 0)) + 1 / (RRF_K + 1));
    expect(b1).toMatchObject({ page_id: P1, sm_rank: null, sm_node: null, tr_all: 1 });
    expect(b1?.score).toBeCloseTo(1 / (RRF_K + (b1?.tr_rank ?? 0)));
    expect(b1?.page_best).toBe(b1?.score);
  });

  test("semua kata dulu; bila < 5 kecocokan, sebagian kata menyusul (all_terms 0)", async () => {
    const r = await ready(searchCorpusFused(db, req("adab murid")));
    const by = new Map(r.rows.map((x) => [x.id, x]));
    // Semua kata: hanya terjemahan body2. Sebagian: body1 (murid) dan ringkasan T_ROOT (adab).
    expect(by.get(PASSAGES.body2)).toMatchObject({ tr_rank: 1, tr_all: 1, sm_rank: null });
    // T_ROOT tidak punya paragraf sendiri: dipetakan ke paragraf pertama turunannya di halaman awal.
    expect(by.get(PASSAGES.body1)).toMatchObject({
      tr_rank: 2,
      tr_all: 0,
      sm_rank: 1,
      sm_all: 0,
      sm_node: T_ROOT,
    });
    expect(r.rows[0]?.id).toBe(PASSAGES.body1);
  });

  test("kueri campuran: jalur Arab ikut; kata Arab umum = jalur Arab kosong", async () => {
    const mixed = await ready(searchCorpusFused(db, req("الثانية sabar")));
    const b2 = mixed.rows.find((x) => x.id === PASSAGES.body2);
    expect(b2?.ar_rank).toBe(1);
    expect(b2?.score).toBeCloseTo(
      1 / (RRF_K + 1) + 1 / (RRF_K + (b2?.tr_rank ?? 0)) + 1 / (RRF_K + 1),
    );
    const common = await ready(searchCorpusFused(db, req("نص sabar")));
    expect(common.allCommon).toBe(true);
    expect(common.common).toEqual([{ term: "نص", df: 3 }]);
    expect(common.rows.every((x) => x.ar_rank === null)).toBe(true);
  });

  test("filter edisi, jendela halaman, dan tanpa kecocokan", async () => {
    const other = await ready(
      searchCorpusFused(
        db,
        req("sabar", {
          editionId: ED + 1,
          span: passageIdRange(ED + 1),
          tocSpan: tocNodeIdRange(ED + 1),
        }),
      ),
    );
    expect(other.rows).toEqual([]);
    expect(other.editions.map((e) => e.edition.id)).toEqual([ED + 1]);
    const second = await ready(searchCorpusFused(db, req("sabar", { limit: 1, offset: 1 })));
    expect(second.rows.map((x) => x.id)).toEqual([PASSAGES.body1]);
    expect(second.rows[0]).toMatchObject({ total_pages: 2 });
    const none = await ready(searchCorpusFused(db, req("zuhud")));
    expect(none.rows).toEqual([]);
    await expect(searchCorpusFused(db, req("sabar", { limit: 0 }))).rejects.toThrow(RangeError);
  });

  test("filter bagian: hanya node itu dan turunannya (paragraf dan ringkasan)", async () => {
    const a = await ready(searchCorpusFused(db, req("sabar", { sectionId: T_CHILD_A })));
    expect(a.section).toEqual({ id: T_CHILD_A, edition_id: ED });
    expect(a.rows.map((x) => [x.id, x.sm_node])).toEqual([[PASSAGES.body2, T_CHILD_A]]);
    // Akar mencakup semua anak.
    const root = await ready(searchCorpusFused(db, req("sabar", { sectionId: T_ROOT })));
    expect(root.rows.map((x) => x.id)).toEqual([PASSAGES.body2, PASSAGES.body1]);
    // Node yang tidak ada: section null, tanpa hasil.
    const none = await ready(searchCorpusFused(db, req("sabar", { sectionId: 999_999 })));
    expect([none.section, none.rows]).toEqual([null, []]);
  });

  test("ringkasan node tanpa paragraf sendiri → paragraf pertama turunannya, walau ID turunan lebih kecil", async () => {
    // Node induk ber-ID LEBIH BESAR dari anaknya (seperti node patch Ihya, seq dialokasikan
    // sesudah yang terbesar): pemetaan tidak boleh bergantung pada urutan ID.
    const HIGH = tocNodeId(ED, 90);
    const LOW = tocNodeId(ED, 80);
    await db.batch([
      db
        .prepare(
          `INSERT INTO toc_node (id, edition_id, parent_id, ord, level, title_ar, start_page_id, source_title_id)
           VALUES (?, ?, NULL, 9, 1, 'باب أعلى', ?, 90), (?, ?, ?, 1, 2, 'فصل أدنى', ?, 80)`,
        )
        .bind(HIGH, ED, P3, LOW, ED, HIGH, P3),
      db.prepare("UPDATE passage SET toc_node_id = ? WHERE id = ?").bind(LOW, PASSAGES.body3),
      db
        .prepare(
          `INSERT INTO summary (toc_node_id, lang, text, model, prompt_version, created_at)
           VALUES (?, 'id', 'Ringkasan tentang zuhud.', 'model-uji', 'p@2', '2026-10-17')`,
        )
        .bind(HIGH),
      db.prepare("INSERT INTO summary_fts (rowid, terms) VALUES (?, 'ringkas zuhud')").bind(HIGH),
    ]);
    onTestFinished(async () => {
      await db.batch([
        db.prepare("DELETE FROM summary_fts WHERE rowid = ?").bind(HIGH),
        db.prepare("DELETE FROM summary WHERE toc_node_id = ?").bind(HIGH),
        db
          .prepare("UPDATE passage SET toc_node_id = ? WHERE id = ?")
          .bind(T_CHILD_A, PASSAGES.body3),
        db.prepare("DELETE FROM toc_node WHERE id IN (?, ?)").bind(LOW, HIGH),
      ]);
    });
    const r = await ready(searchCorpusFused(db, req("zuhud")));
    expect(r.rows.map((x) => [x.id, x.sm_node, x.sm_title])).toEqual([
      [PASSAGES.body3, HIGH, "باب أعلى"],
    ]);
  });

  test("jalur gagasan Intisari (X16): hanya bila diminta; gagasan → jangkar seq terkecilnya", async () => {
    // Intisari BUATAN di T_CHILD_A: gagasan 1 berjangkar ke body3 (seq 1) dan body2 (seq 2);
    // gagasan 2 ditolak peninjau (tetap di indeks di sini untuk menguji lapis kedua).
    const point = (ord: number) => T_CHILD_A * 100 + ord;
    await db.batch([
      db
        .prepare(
          `INSERT INTO digest (toc_node_id, lang, tier, basis, abstract, source_sha256, model,
             prompt_version, created_at)
           VALUES (?1, 'id', 'section', 'text', 'Abstrak uji.', ?2, 'model-uji', 'digest-section@1',
             '2026-10-24')`,
        )
        .bind(T_CHILD_A, "a".repeat(64)),
      db
        .prepare(
          `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body, review_status)
           VALUES (?1, 'id', 1, 'idea', 'author', 'Zuhud terhadap dunia', 'Isi gagasan uji.',
                   'ai_generated'),
                  (?1, 'id', 2, 'idea', 'author', 'Zuhud yang ditolak', 'Isi.', 'rejected')`,
        )
        .bind(T_CHILD_A),
      db
        .prepare(
          `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
           VALUES (?1, 'id', 1, 2, ?2, 0, 3), (?1, 'id', 1, 1, ?3, 0, 3), (?1, 'id', 2, 1, ?2, 0, 3)`,
        )
        .bind(T_CHILD_A, PASSAGES.body2, PASSAGES.body3),
      db
        .prepare("INSERT INTO digest_point_fts (rowid, terms) VALUES (?, ?), (?, ?)")
        .bind(
          point(1),
          latinIndexText("Zuhud terhadap dunia. Isi gagasan uji."),
          point(2),
          latinIndexText("Zuhud yang ditolak. Isi."),
        ),
    ]);
    onTestFinished(async () => {
      await db.batch([
        db.prepare("DELETE FROM digest_point_fts WHERE rowid IN (?, ?)").bind(point(1), point(2)),
        db.prepare("DELETE FROM digest_anchor WHERE toc_node_id = ?").bind(T_CHILD_A),
        db.prepare("DELETE FROM digest_point WHERE toc_node_id = ?").bind(T_CHILD_A),
        db.prepare("DELETE FROM digest WHERE toc_node_id = ?").bind(T_CHILD_A),
      ]);
    });
    // Tanpa `digest`: jalur tidak berjalan, kolomnya null.
    expect((await ready(searchCorpusFused(db, req("zuhud")))).rows).toEqual([]);
    const sabar = await ready(searchCorpusFused(db, req("sabar")));
    expect(sabar.rows.every((x) => x.dp_rank === null && x.dp_node === null)).toBe(true);

    const r = await ready(searchCorpusFused(db, req("zuhud", { digest: true })));
    expect(r.rows.map((x) => [x.id, x.dp_rank, x.dp_node, x.dp_ord, x.dp_title])).toEqual([
      [PASSAGES.body3, 1, T_CHILD_A, 1, "Zuhud terhadap dunia"],
    ]);
    expect(r.rows[0]).toMatchObject({
      dp_all: 1,
      dp_body: "Isi gagasan uji.",
      dp_model: "model-uji",
      dp_prompt: "digest-section@1",
      dp_created: "2026-10-24",
      dp_review: "ai_generated",
      tr_rank: null,
      sm_rank: null,
      page_id: P3,
    });
    expect(r.rows[0]?.score).toBeCloseTo(1 / (RRF_K + 1));
    // Filter bagian: Intisari T_CHILD_A di luar T_CHILD_B; edisi lain di luar rentang node.
    const b = await ready(
      searchCorpusFused(db, req("zuhud", { digest: true, sectionId: T_CHILD_B })),
    );
    expect(b.rows).toEqual([]);
    const other = await ready(
      searchCorpusFused(
        db,
        req("zuhud", {
          digest: true,
          span: passageIdRange(ED + 1),
          tocSpan: tocNodeIdRange(ED + 1),
        }),
      ),
    );
    expect(other.rows).toEqual([]);
  });

  test("korpus tanpa indeks Indonesia (skema < 6) → ready false", async () => {
    await db.prepare("UPDATE meta SET value = '5' WHERE key = 'schema_version'").run();
    onTestFinished(async () => {
      await db.prepare("UPDATE meta SET value = '6' WHERE key = 'schema_version'").run();
    });
    const r = await searchCorpusFused(db, req("sabar"));
    expect(r).toMatchObject({ ready: false, meta: { schema_version: 5 } });
  });
});

describe("searchSummaryNodes", () => {
  const nodes = async (q: string, tocSpan = ALL, limit = 5) => {
    const r = await searchSummaryNodes(db, { latin: req(q).latin, tocSpan, limit });
    if (!r.ready) throw new Error("korpus tidak siap");
    return r.nodes;
  };

  test("semua kata dulu, lalu sebagian kata yang belum ada; batas dan rentang node", async () => {
    // Ringkasan buatan: T_ROOT "niat dan adab", T_CHILD_A "sabar dan syukur", dan node X
    // sementara (hanya di indeks) yang memuat kedua kata kueri.
    const x = tocNodeId(ED, 9);
    await db
      .prepare("INSERT INTO summary_fts (rowid, terms) VALUES (?, ?)")
      .bind(x, latinIndexText("Niat orang yang sabar."))
      .run();
    onTestFinished(async () => {
      await db.prepare("DELETE FROM summary_fts WHERE rowid = ?").bind(x).run();
    });
    const both = await nodes("sabar niat");
    expect(both[0]).toBe(x);
    const byId = (a: number, b: number) => a - b;
    expect(both.slice(1).toSorted(byId)).toEqual([T_ROOT, T_CHILD_A].toSorted(byId));
    // Kecocokan semua kata (T_CHILD_A) mendahului kecocokan sebagian kata (X: "sabar" saja).
    expect(await nodes("sabar syukur")).toEqual([T_CHILD_A, x]);
    expect(await nodes("sabar niat", ALL, 2)).toHaveLength(2);
    expect(await nodes("sabar", tocNodeIdRange(ED + 1))).toEqual([]);
    expect(await nodes("zuhud")).toEqual([]);
    await expect(
      searchSummaryNodes(db, { latin: req("sabar").latin, tocSpan: ALL, limit: 0 }),
    ).rejects.toThrow(RangeError);
  });

  test("korpus tanpa indeks Indonesia (skema < 6) → ready false", async () => {
    await db.prepare("UPDATE meta SET value = '5' WHERE key = 'schema_version'").run();
    onTestFinished(async () => {
      await db
        .prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'")
        .bind(String(CORPUS_SCHEMA_VERSION))
        .run();
    });
    const r = await searchSummaryNodes(db, { latin: req("sabar").latin, tocSpan: ALL, limit: 3 });
    expect(r).toMatchObject({ ready: false, meta: { schema_version: 5 } });
  });
});
