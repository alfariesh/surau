// Kueri pencarian korpus (S11, ADR-039): indeks FTS5 `passage_fts` (kolom stem) + `term_stat`.
// Ekspresi MATCH disusun @surau/text (`ftsMatchExpression`) dan dikirim sebagai SATU parameter
// terikat; repository ini tidak pernah menyusun sintaks FTS dari masukan pengguna. Filter per edisi
// memakai rentang rowid (`passageIdRange`, ADR-005), bukan kolom.
//
// Hemat bolak-balik ke D1: konteks (meta + kata umum + edisi) satu `batch`, lalu satu kueri yang
// sekaligus meranking, mengelompokkan per halaman, dan mengambil teks paragraf yang cocok.
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
import { allRows } from "./rows.ts";

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

export type SearchContext =
  | { ready: false; meta: CorpusMeta }
  | { ready: true; meta: CorpusMeta; common: TermStatRow[]; editions: EditionContext[] };

/**
 * Satu `batch`: `meta`, stem kueri yang tercatat di `term_stat` (kata sangat umum), dan konteks
 * sitasi edisi yang dicari (semua edisi bila `editionId` null). `ready: false` bila korpus belum
 * punya indeks pencarian (skema < `SEARCH_SCHEMA_VERSION`, mis. `ihya-v1`): pemanggil
 * menyembunyikan fitur, bukan menampilkan "tidak ditemukan" (ARSITEKTUR-TEKNIS §7 aturan 5).
 */
export async function getSearchContext(
  db: D1Db,
  stems: readonly string[],
  editionId: number | null,
): Promise<SearchContext> {
  let results: { results: unknown[] }[];
  try {
    results = await db.batch([
      db.prepare("SELECT key, value FROM meta"),
      db
        .prepare(
          "SELECT term, df FROM term_stat WHERE term IN (SELECT value FROM json_each(?)) ORDER BY term",
        )
        .bind(JSON.stringify([...new Set(stems)])),
      db
        .prepare(
          `SELECT ${EDITION_COLS} FROM edition e WHERE ?1 IS NULL OR e.id = ?1 ORDER BY e.id`,
        )
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
    ]);
  } catch (error) {
    // Korpus lama belum punya `term_stat` ("no such table"): cek skemanya untuk membedakan dari
    // kegagalan D1 sungguhan, yang tetap dilempar.
    const meta = await getCorpusMeta(db).catch(() => null);
    if (meta !== null && meta.schema_version < SEARCH_SCHEMA_VERSION) return { ready: false, meta };
    throw error;
  }
  const [metaRows, termRows, editionRows, workRows, authorRows] = results.map((r) => r.results);
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
  return {
    ready: true,
    meta,
    common: (termRows ?? []).map((r) => termStatRow.parse(r)),
    editions,
  };
}

function assertWindow(limit: number, offset: number): void {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit tidak sah: ${limit}`);
  if (!Number.isInteger(offset) || offset < 0) throw new RangeError(`offset tidak sah: ${offset}`);
}

const PASSAGE_SELECT = `p.id, p.edition_id, p.page_id, p.toc_node_id, p.kind, p.ord, p.text_raw,
  pg.juz, pg.page_no, t.title_ar AS toc_title, t.level AS toc_level`;

/**
 * Hasil berperingkat per HALAMAN: semua paragraf cocok diranking bm25, dikelompokkan per halaman
 * (peringkat halaman = paragraf terbaiknya, lalu jumlah paragraf cocok), lalu halaman ke
 * `offset+1 … offset+limit` dikembalikan bersama SEMUA paragraf cocok di halaman itu (urut baca:
 * badan dulu, lalu catatan kaki). `total_pages`/`total_hits` = seluruh hasil sebelum dipotong.
 * bm25 harus dihitung di kueri yang memindai tabel FTS, jadi CTE pertama `MATERIALIZED`
 * (D1 menolak bm25 di CTE yang diratakan ke dalam join).
 */
export function searchRankedPages(
  db: D1Db,
  match: string,
  span: PassageIdSpan,
  limit: number,
  offset = 0,
): Promise<RankedSearchRow[]> {
  assertWindow(limit, offset);
  return allRows(
    db
      .prepare(
        `WITH h AS MATERIALIZED (
           SELECT rowid AS id, bm25(passage_fts, ${BM25_WEIGHTS}) AS score
           FROM passage_fts WHERE passage_fts MATCH ?1 AND rowid BETWEEN ?2 AND ?3
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
      .bind(match, span.min, span.max, limit, offset),
    rankedSearchRow,
  );
}

/**
 * Pengaman kata umum: `limit` paragraf cocok PERTAMA dalam urutan korpus (rowid), tanpa bm25.
 * FTS5 berhenti setelah `limit` kecocokan, jadi biayanya ±`limit` baris, bukan seluruh daftar
 * dokumen kata itu (الله: 20 vs ±42 ribu baris dibaca di staging, S11).
 */
export function searchInOrder(
  db: D1Db,
  match: string,
  span: PassageIdSpan,
  limit: number,
): Promise<SearchPassageRow[]> {
  assertWindow(limit, 0);
  return allRows(
    db
      .prepare(
        `WITH h AS MATERIALIZED (
           SELECT rowid AS id FROM passage_fts
           WHERE passage_fts MATCH ?1 AND rowid BETWEEN ?2 AND ?3 ORDER BY rowid LIMIT ?4
         )
         SELECT ${PASSAGE_SELECT}
         FROM h
         JOIN passage p ON p.id = h.id
         JOIN page pg ON pg.id = p.page_id
         LEFT JOIN toc_node t ON t.id = p.toc_node_id
         ORDER BY p.id`,
      )
      .bind(match, span.min, span.max, limit),
    searchPassageRow,
  );
}
