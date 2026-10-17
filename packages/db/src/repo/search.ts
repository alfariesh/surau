// Kueri pencarian korpus (S11, ADR-039): indeks FTS5 `passage_fts` (kolom stem) + `term_stat`.
// Ekspresi MATCH disusun @surau/text (`ftsMatchExpression`) dan dikirim sebagai SATU parameter
// terikat; repository ini tidak pernah menyusun sintaks FTS dari masukan pengguna. Filter per edisi
// memakai rentang rowid (`passageIdRange`, ADR-005), bukan kolom.
//
// SATU bolak-balik ke D1 per pencarian (`batch`): konteks (meta + kata umum + edisi) dan dua
// kueri hasil. Pengaman kata umum dihitung di dalam ekspresi MATCH, jadi tepat satu dari kedua
// kueri yang benar-benar memindai indeks (ADR-039). Diukur di staging: tiap bolak-balik Worker →
// primary D1 ±85 ms (SIN → NRT), sedangkan SQL-nya sendiri ±5 ms.
import { z } from "zod";

import type { D1Db } from "../d1.ts";
import {
  LATIN_SEARCH_SCHEMA_VERSION,
  SEARCH_SCHEMA_VERSION,
  authorRow,
  corpusMeta,
  editionRow,
  metaRow,
  passageKind,
  reviewStatus,
  termStatRow,
  workRow,
} from "../schema/corpus.ts";
import type { CorpusMeta, TermStatRow } from "../schema/corpus.ts";
import { AUTHOR_COLS, EDITION_COLS, WORK_COLS, getCorpusMeta } from "./corpus.ts";
import type { EditionContext } from "./corpus.ts";

const id = z.number().int().positive();

/**
 * Bobot bm25 per kolom `passage_fts` (body, foot, sbody, sfoot). Kolom normal tidak diisi (ADR-039);
 * catatan kaki (takhrij) diberi bobot separuh badan teks. Skor bm25 negatif: makin kecil makin cocok.
 */
export const BM25_WEIGHTS = "0.0, 0.0, 1.0, 0.5";

/** Rentang rowid paragraf yang dicari, inklusif (`passageIdRange` atau seluruh korpus). */
export interface PassageIdSpan {
  min: number;
  max: number;
}

/** Paragraf yang cocok beserta letak cetak dan judul bagian daftar isinya. */
export const searchPassageRow = z.strictObject({
  id,
  edition_id: id,
  page_id: id,
  toc_node_id: id.nullable(),
  kind: passageKind,
  ord: id,
  text_raw: z.string(),
  juz: id,
  page_no: z.number().int().nonnegative(),
  toc_title: z.string().nullable(),
  toc_level: id.nullable(),
  // Terjemahan AI paragraf ini (bahasa `id`, S13/S14); null bila belum ada.
  tr_text: z.string().nullable(),
  tr_model: z.string().nullable(),
  tr_prompt: z.string().nullable(),
  tr_created: z.string().nullable(),
  tr_review: reviewStatus.nullable(),
});
export type SearchPassageRow = z.infer<typeof searchPassageRow>;

/** Baris hasil berperingkat: paragraf cocok + peringkat halamannya + total seluruh hasil. */
export const rankedSearchRow = searchPassageRow.extend({
  /** bm25 terbaik (terkecil) di antara paragraf cocok di halaman itu. */
  page_best: z.number(),
  page_hits: id,
  total_pages: id,
  total_hits: id,
  /** bm25 paragraf ini. */
  score: z.number(),
  /** Peringkat paragraf ini di antara semua paragraf cocok (1 = terbaik). */
  passage_rank: id,
});
export type RankedSearchRow = z.infer<typeof rankedSearchRow>;

/**
 * Rencana kueri dari @surau/text (`FtsQueryPlan`, struktural supaya @surau/db tidak bergantung
 * pada paket teks): frasa alternatif di kolom stem; `prefix` = token terakhir dicocokkan sebagai awalan.
 */
export interface SearchPlan {
  phrases: readonly (readonly string[])[];
  prefix: boolean;
}

/** Permintaan pencarian: rencana + ekspresi MATCH (@surau/text), filter edisi, jendela halaman. */
export interface SearchRequest {
  /** Dasar pengaman kata umum: semua token yang benar-benar dicari, per posisi frasa. */
  plan: SearchPlan;
  /**
   * WAJIB `ftsMatchExpression(plan)` dari rencana yang sama: pengaman kata umum memeriksa token
   * `plan`, sedangkan indeks dipindai dengan `match`. Dikirim sebagai satu parameter terikat.
   */
  match: string;
  /** Edisi untuk konteks sitasi; `null` = semua edisi. */
  editionId: number | null;
  span: PassageIdSpan;
  /** Hanya paragraf di bagian daftar isi ini dan turunannya (mis. satu rub'/kitab); `null` = semua. */
  sectionId?: number | null;
  /** Halaman (berperingkat) atau paragraf (urutan kitab) yang dikembalikan. */
  limit: number;
  /** Halaman yang dilewati (berperingkat saja). */
  offset: number;
}

export type SearchResult =
  | { ready: false; meta: CorpusMeta }
  | {
      ready: true;
      meta: CorpusMeta;
      /** Kata di `term_stat` yang dikenai kueri (persis, atau berawalan token bila `prefix`). */
      common: TermStatRow[];
      /** Setiap posisi kueri mengenai kata umum: hasil = `inOrder`, bukan `ranked`. */
      allCommon: boolean;
      editions: EditionContext[];
      /** Node filter bagian (`sectionId`) bila ada; `null` bila tidak diminta atau tidak ada. */
      section: { id: number; edition_id: number } | null;
      ranked: RankedSearchRow[];
      inOrder: SearchPassageRow[];
    };

/** Token pengaman: [posisi frasa, token, 1 bila dicocokkan sebagai awalan]. */
type GuardToken = [position: number, token: string, prefix: 0 | 1];

/**
 * Semua token yang dicari, per posisi: varian proklitik/kunyah di setiap frasa alternatif, dan
 * awalan bila `prefix`. Pengaman harus melihat SEMUA varian: kueri سلم juga membaca daftar dokumen
 * وسلم, dan الل+expand membaca الله (temuan peninjau S11).
 */
function guardTokens(plan: SearchPlan): GuardToken[] {
  const seen = new Map<string, GuardToken>();
  for (const phrase of plan.phrases) {
    phrase.forEach((token, k) => {
      const g: GuardToken = [k, token, plan.prefix && k === phrase.length - 1 ? 1 : 0];
      seen.set(JSON.stringify(g), g);
    });
  }
  return [...seen.values()];
}

// Kata umum `s.term` dikenai token pengaman `v` (json_each): sama persis, atau (awalan) berada di
// rentang [token, token || U+10FFFF). Keduanya pencarian indeks PRIMARY KEY `term_stat`, bukan
// pemindaian (CROSS JOIN menjaga json_each di luar): versi `substr(...)` pertama membaca ±1.400
// baris tambahan per kueri di staging.
// U+10FFFF dibuang `normalizeArabic`, jadi tidak pernah muncul di stem.
const TOKEN = "json_extract(v.value, '$[1]')";
const EXACT = `s.term = ${TOKEN}`;
const PREFIX = `json_extract(v.value, '$[2]') = 1 AND s.term >= ${TOKEN}
  AND s.term < ${TOKEN} || char(1114111)`;

/**
 * Ekspresi MATCH yang pasti kosong: U+E000 (private use) dibuang `normalizeArabic` (bukan
 * huruf/angka) sehingga tidak pernah ada di indeks, tetapi tetap token bagi unicode61, jadi kueri
 * FTS5 sah dan murah (staging: 3–4 baris dibaca). `MATCH NULL`/`''` ditolak FTS5 (syntax error).
 */
const NO_MATCH = `'"' || char(57344) || '"'`;

/**
 * MATCH berpengaman: `match` bila jumlah POSISI kueri yang mengenai kata umum memenuhi `op`
 * terhadap jumlah posisi, selain itu `NO_MATCH`. Subkueri konstan dievaluasi sebelum indeks
 * dipindai; `term_stat` dicari lewat indeks PRIMARY KEY (sama persis atau rentang awalan).
 */
function guardedMatch(op: "<" | "=", match: number, guard: number, positions: number): string {
  return `(CASE WHEN (
      SELECT count(DISTINCT json_extract(v.value, '$[0]')) FROM json_each(?${guard}) v
      WHERE EXISTS (SELECT 1 FROM term_stat s WHERE ${EXACT})
         OR EXISTS (SELECT 1 FROM term_stat s WHERE ${PREFIX})
    ) ${op} ?${positions} THEN ?${match} ELSE ${NO_MATCH} END)`;
}

/** Bahasa terjemahan/ringkasan yang ditampilkan dan dicari (indeks Indonesia, S14). */
export const AI_TEXT_LANG = "id";

const PASSAGE_SELECT = `p.id, p.edition_id, p.page_id, p.toc_node_id, p.kind, p.ord, p.text_raw,
  pg.juz, pg.page_no, t.title_ar AS toc_title, t.level AS toc_level,
  tl.text AS tr_text, tl.model AS tr_model, tl.prompt_version AS tr_prompt,
  tl.created_at AS tr_created, tl.review_status AS tr_review`;

/** Terjemahan AI paragraf `p` (alias `tl`), untuk setiap kueri yang memakai `PASSAGE_SELECT`. */
const TRANSLATION_JOIN = `LEFT JOIN translation tl ON tl.passage_id = p.id AND tl.lang = '${AI_TEXT_LANG}'`;

/**
 * Filter bagian daftar isi (S14): CTE rekursif `sub` = node `?n` dan semua turunannya (kosong bila
 * `?n` NULL). Langkah rekursif membawa `edition_id` supaya memakai indeks `toc_node_children`
 * (edition_id, parent_id, ord), bukan memindai seluruh daftar isi per langkah. Dipakai bersama
 * `IN_SECTION`/`NODE_IN_SECTION`; subkueri tidak berkorelasi, jadi dievaluasi sekali, lalu setiap
 * kecocokan FTS cukup dicek keanggotaannya.
 */
const sectionCte = (n: string) => `sub(id, ed) AS (
    SELECT id, edition_id FROM toc_node WHERE id = ${n}
    UNION ALL
    SELECT t.id, t.edition_id FROM sub JOIN toc_node t ON t.edition_id = sub.ed AND t.parent_id = sub.id
  )`;
const IN_SECTION = (n: string) =>
  `(${n} IS NULL OR rowid IN (SELECT id FROM passage WHERE toc_node_id IN (SELECT id FROM sub)))`;
const NODE_IN_SECTION = (n: string) => `(${n} IS NULL OR rowid IN (SELECT id FROM sub))`;

function assertWindow(limit: number, offset: number): void {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit tidak sah: ${limit}`);
  if (!Number.isInteger(offset) || offset < 0) throw new RangeError(`offset tidak sah: ${offset}`);
}

/**
 * Cari di indeks `passage_fts` dalam satu `batch`:
 * - `meta`, kata `term_stat` yang dikenai kueri, dan konteks sitasi edisi (semua edisi bila
 *   `editionId` null);
 * - **berperingkat** (bila ada posisi kueri yang tidak mengenai kata umum): semua paragraf cocok diranking bm25,
 *   dikelompokkan per halaman (peringkat halaman = paragraf terbaiknya, lalu jumlah paragraf cocok),
 *   halaman ke `offset+1 … offset+limit` dikembalikan bersama SEMUA paragraf cocoknya (urut baca:
 *   badan dulu, lalu catatan kaki). `total_pages`/`total_hits` = seluruh hasil. bm25 harus dihitung
 *   di kueri yang memindai tabel FTS, jadi CTE pertama `MATERIALIZED` (D1 menolak bm25 di CTE yang
 *   diratakan ke join);
 * - **urutan kitab** (bila SETIAP posisi kueri mengenai kata umum, pengaman ADR-039): `limit` paragraf cocok PERTAMA
 *   (rowid), tanpa bm25. FTS5 berhenti setelah `limit` kecocokan (الله: ±30 vs ±42 ribu baris).
 *
 * `ready: false` bila korpus belum punya indeks pencarian (skema < `SEARCH_SCHEMA_VERSION`, mis.
 * `ihya-v1`): pemanggil menyembunyikan fitur, bukan menampilkan "tidak ditemukan" (ARSITEKTUR §7
 * aturan 5).
 */
export async function searchCorpus(db: D1Db, req: SearchRequest): Promise<SearchResult> {
  assertWindow(req.limit, req.offset);
  const guard = guardOf(req.plan);
  let results: { results: unknown[] }[];
  try {
    results = await db.batch([
      ...contextStatements(db, req.editionId, guard.json, req.sectionId ?? null),
      db
        .prepare(
          `WITH RECURSIVE ${sectionCte("?8")},
           h AS MATERIALIZED (
             SELECT rowid AS id, bm25(passage_fts, ${BM25_WEIGHTS}) AS score FROM passage_fts
             WHERE passage_fts MATCH ${guardedMatch("<", 1, 6, 7)} AND rowid BETWEEN ?2 AND ?3
               AND ${IN_SECTION("?8")}
           ),
           hp AS MATERIALIZED (
             SELECT h.id, h.score, p.page_id, row_number() OVER (ORDER BY h.score, h.id) AS passage_rank
             FROM h JOIN passage p ON p.id = h.id
           ),
           g AS (SELECT page_id, min(score) AS best, count(*) AS hits FROM hp GROUP BY page_id),
           top AS (
             SELECT page_id, best, hits, count(*) OVER () AS total_pages, sum(hits) OVER () AS total_hits
             FROM g ORDER BY best, hits DESC, page_id LIMIT ?4 OFFSET ?5
           )
           SELECT ${PASSAGE_SELECT}, top.best AS page_best, top.hits AS page_hits,
                  top.total_pages, top.total_hits, hp.score, hp.passage_rank
           FROM top
           JOIN hp ON hp.page_id = top.page_id
           JOIN passage p ON p.id = hp.id
           JOIN page pg ON pg.id = top.page_id
           LEFT JOIN toc_node t ON t.id = p.toc_node_id
           ${TRANSLATION_JOIN}
           ORDER BY top.best, top.hits DESC, top.page_id, p.kind = 'foot', p.ord`,
        )
        .bind(
          req.match,
          req.span.min,
          req.span.max,
          req.limit,
          req.offset,
          guard.json,
          guard.positions,
          req.sectionId ?? null,
        ),
      db
        .prepare(
          `WITH RECURSIVE ${sectionCte("?7")},
           h AS MATERIALIZED (
             SELECT rowid AS id FROM passage_fts
             WHERE passage_fts MATCH ${guardedMatch("=", 1, 5, 6)} AND rowid BETWEEN ?2 AND ?3
               AND ${IN_SECTION("?7")}
             ORDER BY rowid LIMIT ?4
           )
           SELECT ${PASSAGE_SELECT}
           FROM h
           JOIN passage p ON p.id = h.id
           JOIN page pg ON pg.id = p.page_id
           LEFT JOIN toc_node t ON t.id = p.toc_node_id
           ${TRANSLATION_JOIN}
           ORDER BY p.id`,
        )
        .bind(
          req.match,
          req.span.min,
          req.span.max,
          req.limit,
          guard.json,
          guard.positions,
          req.sectionId ?? null,
        ),
    ]);
  } catch (error) {
    return notReady(db, error, SEARCH_SCHEMA_VERSION);
  }
  const ctx = parseContext(results, guard);
  if (ctx.meta.schema_version < SEARCH_SCHEMA_VERSION) return { ready: false, meta: ctx.meta };
  const [rankedRows, inOrderRows] = results.slice(CONTEXT_STATEMENTS).map((r) => r.results);
  return {
    ready: true,
    ...ctx,
    ranked: (rankedRows ?? []).map((r) => rankedSearchRow.parse(r)),
    inOrder: (inOrderRows ?? []).map((r) => searchPassageRow.parse(r)),
  };
}

// ── Konteks bersama (meta, kata umum, sitasi) ───────────────────────────────────────────────

interface Guard {
  tokens: GuardToken[];
  json: string;
  positions: number;
}

function guardOf(plan: SearchPlan): Guard {
  const positions = plan.phrases[0]?.length ?? 0;
  if (positions === 0 || plan.phrases.some((p) => p.length !== positions)) {
    throw new RangeError("rencana kueri tanpa frasa atau panjang frasa berbeda");
  }
  const tokens = guardTokens(plan);
  return { tokens, json: JSON.stringify(tokens), positions };
}

/** Jumlah statement `contextStatements` di awal setiap batch pencarian. */
const CONTEXT_STATEMENTS = 6;

/**
 * meta, kata `term_stat` yang dikenai token pengaman (`[]` bila `guardJson` = `"[]"`, mis. kueri
 * tanpa bagian Arab), lalu edisi, karya, dan penulis untuk sitasi (semua edisi bila `editionId` null).
 */
function contextStatements(
  db: D1Db,
  editionId: number | null,
  guardJson: string,
  sectionId: number | null,
) {
  return [
    db.prepare("SELECT key, value FROM meta"),
    db
      .prepare(
        `SELECT s.term, s.df FROM json_each(?1) v CROSS JOIN term_stat s ON ${EXACT}
         UNION
         SELECT s.term, s.df FROM json_each(?1) v CROSS JOIN term_stat s ON ${PREFIX}
         ORDER BY 1`,
      )
      .bind(guardJson),
    db
      .prepare(`SELECT ${EDITION_COLS} FROM edition e WHERE ?1 IS NULL OR e.id = ?1 ORDER BY e.id`)
      .bind(editionId),
    db
      .prepare(
        `SELECT ${WORK_COLS} FROM work
         WHERE id IN (SELECT work_id FROM edition WHERE ?1 IS NULL OR id = ?1) ORDER BY id`,
      )
      .bind(editionId),
    db
      .prepare(
        `SELECT ${AUTHOR_COLS} FROM author WHERE id IN (
           SELECT w.author_id FROM work w JOIN edition e ON e.work_id = w.id
           WHERE ?1 IS NULL OR e.id = ?1) ORDER BY id`,
      )
      .bind(editionId),
    db.prepare("SELECT id, edition_id FROM toc_node WHERE id = ?1").bind(sectionId),
  ];
}

const sectionRow = z.strictObject({ id, edition_id: id });

interface SearchContext {
  meta: CorpusMeta;
  common: TermStatRow[];
  allCommon: boolean;
  editions: EditionContext[];
  /** Node filter bagian bila diminta dan ada; `null` bila tidak diminta atau tidak ada. */
  section: z.infer<typeof sectionRow> | null;
}

function parseContext(
  results: readonly { results: unknown[] }[],
  guard: Guard | null,
): SearchContext {
  const [metaRows, termRows, editionRows, workRows, authorRows, sectionRows] = results.map(
    (r) => r.results,
  );
  const [sectionFound] = (sectionRows ?? []).map((r) => sectionRow.parse(r));
  const section = sectionFound ?? null;
  const meta = corpusMeta.parse(
    Object.fromEntries((metaRows ?? []).map((r) => metaRow.parse(r)).map((r) => [r.key, r.value])),
  );
  const works = new Map((workRows ?? []).map((r) => workRow.parse(r)).map((w) => [w.id, w]));
  const authors = new Map((authorRows ?? []).map((r) => authorRow.parse(r)).map((a) => [a.id, a]));
  const editions = (editionRows ?? []).flatMap((r): EditionContext[] => {
    const edition = editionRow.parse(r);
    const work = works.get(edition.work_id);
    if (work === undefined) return [];
    const author = work.author_id === null ? null : (authors.get(work.author_id) ?? null);
    return [{ edition, work, author }];
  });
  const common = (termRows ?? []).map((r) => termStatRow.parse(r));
  if (guard === null) return { meta, common, allCommon: false, editions, section };
  // Aturan yang sama dengan `guardedMatch`, jadi tepat satu dari `ranked`/`inOrder` yang terisi.
  const hit = ([, token, prefix]: GuardToken): boolean =>
    common.some((c) => c.term === token || (prefix === 1 && c.term.startsWith(token)));
  const commonPositions = new Set(guard.tokens.filter(hit).map(([k]) => k));
  return {
    meta,
    common,
    allCommon: commonPositions.size === guard.positions,
    editions,
    section,
  };
}

/**
 * Batch gagal: korpus lama belum punya tabelnya ("no such table") → `ready: false` (cek skema untuk
 * membedakan dari kegagalan D1 sungguhan, yang tetap dilempar).
 */
async function notReady(
  db: D1Db,
  error: unknown,
  minSchema: number,
): Promise<{ ready: false; meta: CorpusMeta }> {
  const meta = await getCorpusMeta(db).catch(() => null);
  if (meta !== null && meta.schema_version < minSchema) return { ready: false, meta };
  throw error;
}

// ── Pencarian gabungan Arab + Indonesia (S14, ADR-044) ─────────────────────────────────────

/** Jalur pencarian gabungan. */
export const searchPathName = z.enum(["arabic", "translation", "summary"]);
export type SearchPathName = z.infer<typeof searchPathName>;

/** Konstanta Reciprocal Rank Fusion (Cormack, Clarke & Büttcher 2009): skor = Σ 1/(k + peringkat). */
export const RRF_K = 60;
/** Paragraf teratas (bm25) per jalur paragraf yang ikut digabung. */
export const FUSION_DEPTH = 100;
/** Bagian teratas (bm25) jalur ringkasan yang ikut digabung. */
export const SUMMARY_DEPTH = 30;
/**
 * Bila jalur terjemahan + ringkasan bersama-sama punya kecocokan SEMUA kata kurang dari ini,
 * kecocokan SEBAGIAN kata menyusul sesudahnya.
 */
export const ANY_TERMS_BELOW = 5;

/** Ekspresi MATCH Indonesia dari @surau/text (`latinMatchExpression`), satu parameter terikat. */
export interface LatinMatch {
  /** Semua stem (AND). */
  all: string;
  /** Salah satu stem (OR); null bila kueri hanya satu stem. */
  any: string | null;
}

export interface FusedSearchRequest {
  /** Bagian Arab kueri (rencana + MATCH dari rencana yang sama), atau null. */
  arabic: { plan: SearchPlan; match: string } | null;
  /** Bagian Indonesia kueri. */
  latin: LatinMatch;
  editionId: number | null;
  /** Rentang rowid paragraf (`passageIdRange`). */
  span: PassageIdSpan;
  /** Rentang ID node daftar isi (`tocNodeIdRange`), untuk `summary_fts`. */
  tocSpan: PassageIdSpan;
  /** Hanya bagian daftar isi ini dan turunannya; `null` = semua. */
  sectionId?: number | null;
  /** Halaman yang dikembalikan / dilewati, di atas himpunan kandidat gabungan. */
  limit: number;
  offset: number;
}

const flag = z.union([z.literal(0), z.literal(1)]);

/** Baris hasil gabungan: paragraf + peringkat halaman + asal kecocokan per jalur. */
export const fusedSearchRow = searchPassageRow.extend({
  /** Skor RRF terbaik di halaman ini (makin besar makin cocok). */
  page_best: z.number(),
  page_hits: id,
  total_pages: id,
  total_hits: id,
  /** Skor RRF paragraf ini. */
  score: z.number(),
  ar_rank: id.nullable(),
  tr_rank: id.nullable(),
  /** 1 = terjemahan memuat semua kata kueri; 0 = sebagian (kecocokan OR susulan). */
  tr_all: flag.nullable(),
  sm_rank: id.nullable(),
  sm_all: flag.nullable(),
  /** Bagian daftar isi yang ringkasannya cocok (paragraf ini = awal bagian itu). */
  sm_node: id.nullable(),
  sm_title: z.string().nullable(),
  sm_level: id.nullable(),
  sm_text: z.string().nullable(),
  sm_model: z.string().nullable(),
  sm_prompt: z.string().nullable(),
  sm_created: z.string().nullable(),
  sm_review: reviewStatus.nullable(),
});
export type FusedSearchRow = z.infer<typeof fusedSearchRow>;

export type FusedSearchResult =
  | { ready: false; meta: CorpusMeta }
  | (SearchContext & { ready: true; rows: FusedSearchRow[] });

/** Pengikat parameter bernomor untuk SQL yang disusun dari potongan konstan. */
class Params {
  values: (string | number | null)[] = [];
  add(value: string | number | null): string {
    this.values.push(value);
    return `?${this.values.length}`;
  }
}

interface LatinPathSpec {
  name: "tr" | "sm";
  table: "translation_fts" | "summary_fts";
  span: PassageIdSpan;
  depth: number;
  /** Filter bagian untuk rowid tabel ini (paragraf atau node). */
  section: string;
}

/**
 * Dua jalur Indonesia (terjemahan, ringkasan) dari indeks FTS-nya: kecocokan SEMUA kata (bm25)
 * lalu, hanya bila kedua jalur bersama-sama punya kurang dari `ANY_TERMS_BELOW` kecocokan semua
 * kata, kecocokan SEBAGIAN kata yang belum ada menyusul di belakangnya; paling banyak `depth` baris
 * per jalur. CTE `<name>`: (key, r, all_terms).
 */
function latinPaths(specs: readonly LatinPathSpec[], match: LatinMatch, q: Params): string[] {
  const refs = specs.map((p) => ({
    ...p,
    min: q.add(p.span.min),
    max: q.add(p.span.max),
    limit: q.add(p.depth),
  }));
  const all = q.add(match.all);
  const allCount = refs.map((p) => `(SELECT count(*) FROM ${p.name}_all)`).join(" + ");
  const any =
    match.any === null
      ? NO_MATCH
      : `(CASE WHEN ${allCount} < ${q.add(ANY_TERMS_BELOW)} THEN ${q.add(match.any)}
           ELSE ${NO_MATCH} END)`;
  const scan = (p: (typeof refs)[number], expr: string) =>
    `SELECT rowid AS key, bm25(${p.table}) AS s FROM ${p.table}
      WHERE ${p.table} MATCH ${expr} AND rowid BETWEEN ${p.min} AND ${p.max} AND ${p.section}
      ORDER BY s, rowid LIMIT ${p.limit}`;
  return [
    ...refs.map((p) => `${p.name}_all AS MATERIALIZED (${scan(p, all)})`),
    ...refs.map((p) => `${p.name}_any AS MATERIALIZED (${scan(p, any)})`),
    ...refs.map(
      (p) => `${p.name} AS (
      SELECT key, r, all_terms FROM (
        SELECT key, row_number() OVER (ORDER BY grp, s, key) AS r, 1 - grp AS all_terms FROM (
          SELECT key, s, 0 AS grp FROM ${p.name}_all
          UNION ALL
          SELECT key, s, 1 AS grp FROM ${p.name}_any WHERE key NOT IN (SELECT key FROM ${p.name}_all)
        )
      ) ORDER BY r LIMIT ${p.limit}
    )`,
    ),
  ];
}

/**
 * Pencarian gabungan dalam satu `batch` (S14, ADR-044). Jalur paragraf: bagian Arab kueri di
 * `passage_fts` (pengaman kata umum yang sama dengan S11: bila setiap posisi kata umum, jalur Arab
 * kosong) dan bagian Indonesia di `translation_fts`; jalur bagian: bagian Indonesia di
 * `summary_fts`, dipetakan ke paragraf awal bagian itu (paragraf badan pertama milik node di
 * halaman awalnya; node tanpa paragraf sendiri → paragraf pertama turunannya di halaman itu).
 * Setiap jalur menyumbang `FUSION_DEPTH`/`SUMMARY_DEPTH` kandidat teratas; skor paragraf = RRF
 * (k = `RRF_K`) atas peringkatnya di setiap jalur. Halaman diurutkan menurut skor paragraf
 * terbaiknya (lalu jumlah paragraf cocok), dan halaman `offset+1 … offset+limit` dikembalikan
 * bersama semua paragraf kandidatnya, terjemahan AI-nya, dan ringkasan bagian yang cocok.
 * `total_pages`/`total_hits` dihitung di atas himpunan kandidat itu.
 *
 * `ready: false` bila korpus belum punya indeks Indonesia (skema < `LATIN_SEARCH_SCHEMA_VERSION`).
 */
export async function searchCorpusFused(
  db: D1Db,
  req: FusedSearchRequest,
): Promise<FusedSearchResult> {
  assertWindow(req.limit, req.offset);
  const guard = req.arabic === null ? null : guardOf(req.arabic.plan);
  const q = new Params();
  const section = q.add(req.sectionId ?? null);
  const ctes: string[] = [sectionCte(section)];
  const lists: string[] = [];
  const joins: string[] = [];
  let arCols = "NULL AS ar_rank";
  if (req.arabic !== null && guard !== null) {
    const [match, guardJson, positions] = [
      q.add(req.arabic.match),
      q.add(guard.json),
      q.add(guard.positions),
    ];
    const n = (ref: string) => Number(ref.slice(1));
    ctes.push(`ar_all AS MATERIALIZED (
        SELECT rowid AS key, bm25(passage_fts, ${BM25_WEIGHTS}) AS s FROM passage_fts
        WHERE passage_fts MATCH ${guardedMatch("<", n(match), n(guardJson), n(positions))}
          AND rowid BETWEEN ${q.add(req.span.min)} AND ${q.add(req.span.max)}
          AND ${IN_SECTION(section)}
        ORDER BY s, rowid LIMIT ${q.add(FUSION_DEPTH)}
      ),
      ar AS (SELECT key, row_number() OVER (ORDER BY s, key) AS r FROM ar_all)`);
    lists.push("SELECT key AS id, r FROM ar");
    joins.push("LEFT JOIN ar ON ar.key = p.id");
    arCols = "ar.r AS ar_rank";
  }
  ctes.push(
    ...latinPaths(
      [
        {
          name: "tr",
          table: "translation_fts",
          span: req.span,
          depth: FUSION_DEPTH,
          section: IN_SECTION(section),
        },
        {
          name: "sm",
          table: "summary_fts",
          span: req.tocSpan,
          depth: SUMMARY_DEPTH,
          section: NODE_IN_SECTION(section),
        },
      ],
      req.latin,
      q,
    ),
  );
  lists.push("SELECT key AS id, r FROM tr");
  // Ringkasan → paragraf awal bagiannya: paragraf badan pertama (urut tampil) di halaman awal node
  // yang milik node itu, atau, bila node tidak punya paragraf sendiri di sana (mis. rub' yang
  // langsung dibuka judul kitab pertamanya), milik turunannya; sama dengan jangkar #bab-<id> di
  // pembaca (`sectionStarts`). Turunan lewat CTE rekursif (ID tidak menentukan urutan, ADR-029),
  // hanya untuk node tanpa paragraf sendiri, dan hanya turunan yang MULAI di halaman yang sama:
  // turunan yang mulai lebih belakang (beserta turunannya) tidak punya paragraf di halaman itu.
  // Bila dua bagian berawal di paragraf yang sama, yang peringkatnya lebih baik dipakai.
  // `+p.toc_node_id`: cari lewat indeks halaman (page_id, kind, ord; belasan baris), bukan lewat
  // indeks `passage_toc`, yang membaca SEMUA paragraf bagian itu (ratusan untuk satu kitab).
  const OWN = `SELECT p.id FROM toc_node n
        JOIN passage p ON p.page_id = n.start_page_id AND p.kind = 'body' AND +p.toc_node_id = n.id`;
  ctes.push(`smsub(root, id, ed, pg) AS (
      SELECT n.id, n.id, n.edition_id, n.start_page_id FROM sm JOIN toc_node n ON n.id = sm.key
      WHERE NOT EXISTS (${OWN} WHERE n.id = sm.key)
      UNION ALL
      SELECT smsub.root, t.id, t.edition_id, t.start_page_id FROM smsub
      JOIN toc_node t ON t.edition_id = smsub.ed AND t.parent_id = smsub.id
        AND t.start_page_id = smsub.pg
    ),
    smp AS (
      SELECT sm.key AS node, sm.r, sm.all_terms, coalesce(
        (${OWN} WHERE n.id = sm.key ORDER BY p.ord LIMIT 1),
        (SELECT p.id FROM toc_node n
         JOIN passage p ON p.page_id = n.start_page_id AND p.kind = 'body'
         WHERE n.id = sm.key AND p.toc_node_id IN (SELECT id FROM smsub WHERE root = sm.key)
         ORDER BY p.ord LIMIT 1)
      ) AS id FROM sm
    ),
    smb AS (
      SELECT id, node, r, all_terms FROM (
        SELECT id, node, r, all_terms, row_number() OVER (PARTITION BY id ORDER BY r) AS k
        FROM smp WHERE id IS NOT NULL
      ) WHERE k = 1
    )`);
  lists.push("SELECT id, r FROM smb");
  const k = q.add(RRF_K);
  const limit = q.add(req.limit);
  const offset = q.add(req.offset);
  const sql = `WITH RECURSIVE ${ctes.join(",\n")},
    fused AS (
      SELECT id, sum(1.0 / (${k} + r)) AS rrf FROM (${lists.join(" UNION ALL ")}) GROUP BY id
    ),
    fp AS MATERIALIZED (SELECT f.id, f.rrf, p.page_id FROM fused f JOIN passage p ON p.id = f.id),
    g AS (SELECT page_id, max(rrf) AS best, count(*) AS hits FROM fp GROUP BY page_id),
    top AS (
      SELECT page_id, best, hits, count(*) OVER () AS total_pages, sum(hits) OVER () AS total_hits
      FROM g ORDER BY best DESC, hits DESC, page_id LIMIT ${limit} OFFSET ${offset}
    )
    SELECT ${PASSAGE_SELECT}, top.best AS page_best, top.hits AS page_hits,
           top.total_pages, top.total_hits, fp.rrf AS score, ${arCols},
           tr.r AS tr_rank, tr.all_terms AS tr_all,
           smb.r AS sm_rank, smb.all_terms AS sm_all, smb.node AS sm_node,
           sn.title_ar AS sm_title, sn.level AS sm_level,
           su.text AS sm_text, su.model AS sm_model, su.prompt_version AS sm_prompt,
           su.created_at AS sm_created, su.review_status AS sm_review
    FROM top
    JOIN fp ON fp.page_id = top.page_id
    JOIN passage p ON p.id = fp.id
    JOIN page pg ON pg.id = top.page_id
    LEFT JOIN toc_node t ON t.id = p.toc_node_id
    ${TRANSLATION_JOIN}
    ${joins.join("\n    ")}
    LEFT JOIN tr ON tr.key = p.id
    LEFT JOIN smb ON smb.id = p.id
    LEFT JOIN toc_node sn ON sn.id = smb.node
    LEFT JOIN summary su ON su.toc_node_id = smb.node AND su.lang = '${AI_TEXT_LANG}'
    ORDER BY top.best DESC, top.hits DESC, top.page_id, p.kind = 'foot', p.ord`;
  let results: { results: unknown[] }[];
  try {
    results = await db.batch([
      ...contextStatements(db, req.editionId, guard?.json ?? "[]", req.sectionId ?? null),
      db.prepare(sql).bind(...q.values),
    ]);
  } catch (error) {
    return notReady(db, error, LATIN_SEARCH_SCHEMA_VERSION);
  }
  const ctx = parseContext(results, guard);
  if (ctx.meta.schema_version < LATIN_SEARCH_SCHEMA_VERSION)
    return { ready: false, meta: ctx.meta };
  const rows = results[CONTEXT_STATEMENTS]?.results ?? [];
  return { ready: true, ...ctx, rows: rows.map((r) => fusedSearchRow.parse(r)) };
}
