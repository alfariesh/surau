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
  SEARCH_SCHEMA_VERSION,
  authorRow,
  corpusMeta,
  editionRow,
  metaRow,
  passageKind,
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
  /** Ekspresi MATCH dari `ftsMatchExpression(plan)`, dikirim sebagai satu parameter terikat. */
  match: string;
  /** Edisi untuk konteks sitasi; `null` = semua edisi. */
  editionId: number | null;
  span: PassageIdSpan;
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

/** Kata umum `s.term` dikenai token pengaman `v` (json_each): sama persis, atau berawalan token. */
const GUARD_HIT = `(s.term = json_extract(v.value, '$[1]') OR (json_extract(v.value, '$[2]') = 1
  AND substr(s.term, 1, length(json_extract(v.value, '$[1]'))) = json_extract(v.value, '$[1]')))`;

/**
 * Ekspresi MATCH yang pasti kosong: U+E000 (private use) dibuang `normalizeArabic` (bukan
 * huruf/angka) sehingga tidak pernah ada di indeks, tetapi tetap token bagi unicode61, jadi kueri
 * FTS5 sah dan murah (staging: 3–4 baris dibaca). `MATCH NULL`/`''` ditolak FTS5 (syntax error).
 */
const NO_MATCH = `'"' || char(57344) || '"'`;

/**
 * MATCH berpengaman: `match` bila jumlah POSISI kueri yang mengenai kata umum memenuhi `op`
 * terhadap jumlah posisi, selain itu `NO_MATCH`. Subkueri konstan dievaluasi sebelum indeks
 * dipindai (`term_stat` hanya puluhan baris).
 */
function guardedMatch(op: "<" | "=", match: number, guard: number, positions: number): string {
  return `(CASE WHEN (
      SELECT count(DISTINCT json_extract(v.value, '$[0]')) FROM json_each(?${guard}) v
      WHERE EXISTS (SELECT 1 FROM term_stat s WHERE ${GUARD_HIT})
    ) ${op} ?${positions} THEN ?${match} ELSE ${NO_MATCH} END)`;
}

const PASSAGE_SELECT = `p.id, p.edition_id, p.page_id, p.toc_node_id, p.kind, p.ord, p.text_raw,
  pg.juz, pg.page_no, t.title_ar AS toc_title, t.level AS toc_level`;

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
  const positions = req.plan.phrases[0]?.length ?? 0;
  if (positions === 0 || req.plan.phrases.some((p) => p.length !== positions)) {
    throw new RangeError("rencana kueri tanpa frasa atau panjang frasa berbeda");
  }
  const guard = guardTokens(req.plan);
  const guardJson = JSON.stringify(guard);
  let results: { results: unknown[] }[];
  try {
    results = await db.batch([
      db.prepare("SELECT key, value FROM meta"),
      db
        .prepare(
          `SELECT s.term, s.df FROM term_stat s
           WHERE EXISTS (SELECT 1 FROM json_each(?) v WHERE ${GUARD_HIT}) ORDER BY s.term`,
        )
        .bind(guardJson),
      db
        .prepare(
          `SELECT ${EDITION_COLS} FROM edition e WHERE ?1 IS NULL OR e.id = ?1 ORDER BY e.id`,
        )
        .bind(req.editionId),
      db
        .prepare(
          `SELECT ${WORK_COLS} FROM work
           WHERE id IN (SELECT work_id FROM edition WHERE ?1 IS NULL OR id = ?1) ORDER BY id`,
        )
        .bind(req.editionId),
      db
        .prepare(
          `SELECT ${AUTHOR_COLS} FROM author WHERE id IN (
             SELECT w.author_id FROM work w JOIN edition e ON e.work_id = w.id
             WHERE ?1 IS NULL OR e.id = ?1) ORDER BY id`,
        )
        .bind(req.editionId),
      db
        .prepare(
          `WITH h AS MATERIALIZED (
             SELECT rowid AS id, bm25(passage_fts, ${BM25_WEIGHTS}) AS score FROM passage_fts
             WHERE passage_fts MATCH ${guardedMatch("<", 1, 6, 7)} AND rowid BETWEEN ?2 AND ?3
           ),
           hp AS MATERIALIZED (SELECT h.id, h.score, p.page_id FROM h JOIN passage p ON p.id = h.id),
           g AS (SELECT page_id, min(score) AS best, count(*) AS hits FROM hp GROUP BY page_id),
           top AS (
             SELECT page_id, best, hits, count(*) OVER () AS total_pages, sum(hits) OVER () AS total_hits
             FROM g ORDER BY best, hits DESC, page_id LIMIT ?4 OFFSET ?5
           )
           SELECT ${PASSAGE_SELECT}, top.best AS page_best, top.hits AS page_hits,
                  top.total_pages, top.total_hits, hp.score
           FROM top
           JOIN hp ON hp.page_id = top.page_id
           JOIN passage p ON p.id = hp.id
           JOIN page pg ON pg.id = top.page_id
           LEFT JOIN toc_node t ON t.id = p.toc_node_id
           ORDER BY top.best, top.hits DESC, top.page_id, p.kind = 'foot', p.ord`,
        )
        .bind(req.match, req.span.min, req.span.max, req.limit, req.offset, guardJson, positions),
      db
        .prepare(
          `WITH h AS MATERIALIZED (
             SELECT rowid AS id FROM passage_fts
             WHERE passage_fts MATCH ${guardedMatch("=", 1, 5, 6)} AND rowid BETWEEN ?2 AND ?3
             ORDER BY rowid LIMIT ?4
           )
           SELECT ${PASSAGE_SELECT}
           FROM h
           JOIN passage p ON p.id = h.id
           JOIN page pg ON pg.id = p.page_id
           LEFT JOIN toc_node t ON t.id = p.toc_node_id
           ORDER BY p.id`,
        )
        .bind(req.match, req.span.min, req.span.max, req.limit, guardJson, positions),
    ]);
  } catch (error) {
    // Korpus lama belum punya `term_stat` ("no such table"): cek skemanya untuk membedakan dari
    // kegagalan D1 sungguhan, yang tetap dilempar.
    const meta = await getCorpusMeta(db).catch(() => null);
    if (meta !== null && meta.schema_version < SEARCH_SCHEMA_VERSION) return { ready: false, meta };
    throw error;
  }
  const [metaRows, termRows, editionRows, workRows, authorRows, rankedRows, inOrderRows] =
    results.map((r) => r.results);
  const meta = corpusMeta.parse(
    Object.fromEntries((metaRows ?? []).map((r) => metaRow.parse(r)).map((r) => [r.key, r.value])),
  );
  if (meta.schema_version < SEARCH_SCHEMA_VERSION) return { ready: false, meta };
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
  // Aturan yang sama dengan `guardedMatch`, jadi tepat satu dari `ranked`/`inOrder` yang terisi.
  const hit = ([, token, prefix]: GuardToken): boolean =>
    common.some((c) => c.term === token || (prefix === 1 && c.term.startsWith(token)));
  const commonPositions = new Set(guard.filter(hit).map(([k]) => k));
  return {
    ready: true,
    meta,
    common,
    allCommon: commonPositions.size === positions,
    editions,
    ranked: (rankedRows ?? []).map((r) => rankedSearchRow.parse(r)),
    inOrder: (inOrderRows ?? []).map((r) => searchPassageRow.parse(r)),
  };
}
