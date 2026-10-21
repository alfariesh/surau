// Query tinjauan label status hadits (X07, ADR-070). Satu baris per (catatan kaki, versi aturan,
// penilai); penilai yang sama memperbarui barisnya sendiri. Tidak ada teks Arab dari penilai.
import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import type { D1Db } from "../d1.ts";
import { z } from "zod";

import {
  takhrijKindCodes,
  takhrijReviewRow,
  takhrijReviewWrite,
} from "../schema/takhrij-review.ts";
import type {
  TakhrijReview,
  TakhrijReviewRow,
  TakhrijReviewWrite,
} from "../schema/takhrij-review.ts";
import { allRows } from "./rows.ts";

const COLS =
  "passage_id, rules_version, label_hash, reviewer_key, reviewer_name, decision, kinds_json, note, corpus_version, updated_at";

function parsed({ kinds_json, ...row }: TakhrijReviewRow): TakhrijReview {
  return {
    ...row,
    kinds: kinds_json === null ? null : takhrijKindCodes.parse(JSON.parse(kinds_json)),
  };
}

/** Simpan atau perbarui tinjauan penilai ini untuk (catatan kaki, versi aturan). */
export async function saveTakhrijReview(db: D1Db, input: TakhrijReviewWrite): Promise<void> {
  const r = takhrijReviewWrite.parse(input);
  await db
    .prepare(
      `INSERT INTO takhrij_review (${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (passage_id, rules_version, reviewer_key) DO UPDATE SET
         label_hash = excluded.label_hash, reviewer_name = excluded.reviewer_name,
         decision = excluded.decision, kinds_json = excluded.kinds_json, note = excluded.note,
         corpus_version = excluded.corpus_version, updated_at = excluded.updated_at`,
    )
    .bind(
      r.passage_id,
      r.rules_version,
      r.label_hash,
      r.reviewer_key,
      r.reviewer_name,
      r.decision,
      r.kinds === null ? null : JSON.stringify(r.kinds),
      r.note,
      r.corpus_version,
      r.updated_at,
    )
    .all();
}

/** Tinjauan untuk sekumpulan catatan kaki (satu versi aturan), dipecah per ≤100 parameter. */
export async function getTakhrijReviews(
  db: D1Db,
  passageIds: readonly number[],
  rulesVersion: number,
): Promise<TakhrijReview[]> {
  const unique = [...new Set(passageIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const results = await db.batch(
    chunk(unique, D1_MAX_PARAMS - 1).map((part) =>
      db
        .prepare(
          `SELECT ${COLS} FROM takhrij_review
           WHERE rules_version = ? AND passage_id IN (${placeholders(part.length)})
           ORDER BY passage_id, updated_at`,
        )
        .bind(rulesVersion, ...part),
    ),
  );
  return results.flatMap((r) => r.results.map((row) => parsed(takhrijReviewRow.parse(row))));
}

/** Semua tinjauan satu versi aturan (antrean /tinjau/takhrij). */
export async function listTakhrijReviews(db: D1Db, rulesVersion: number): Promise<TakhrijReview[]> {
  const rows = await allRows(
    db
      .prepare(
        `SELECT ${COLS} FROM takhrij_review WHERE rules_version = ? ORDER BY passage_id, updated_at`,
      )
      .bind(rulesVersion),
    takhrijReviewRow,
  );
  return rows.map(parsed);
}

/**
 * Ada tinjauan (versi aturan mana pun) untuk catatan kaki ini yang berubah sesudah `since` (ISO)?
 * Dipakai surau-api: jawaban cache yang label takhrijnya ditinjau sesudah di-cache tidak disajikan.
 */
export async function takhrijReviewsChangedSince(
  db: D1Db,
  passageIds: readonly number[],
  since: string,
): Promise<boolean> {
  const unique = [...new Set(passageIds)];
  if (unique.length === 0) return false;
  const results = await db.batch(
    chunk(unique, D1_MAX_PARAMS - 1).map((part) =>
      db
        .prepare(
          `SELECT 1 AS x FROM takhrij_review
           WHERE passage_id IN (${placeholders(part.length)}) AND updated_at > ? LIMIT 1`,
        )
        .bind(...part, since),
    ),
  );
  return results.some((r) => r.results.length > 0);
}

const citedRow = z.strictObject({ passage_id: z.number().int().positive(), n: z.number().int() });

/**
 * Seberapa sering setiap catatan kaki takhrij dikutip Jawab sebagai klaim status (`hadith[]`):
 * jawaban eval di `answer_log` (bukan contoh buatan agent, `agent-draft`) dihitung satu per jawaban,
 * jawaban `answer_cache` satu + jumlah sajian ulangnya. Hanya baris yang belum kedaluwarsa. Prioritas
 * antrean tinjauan label; tanpa teks pertanyaan.
 */
export async function takhrijCitedCounts(db: D1Db, now: string): Promise<Map<number, number>> {
  const rows = await allRows(
    db
      .prepare(
        `SELECT pid AS passage_id, SUM(w) AS n FROM (
           SELECT DISTINCT 'l:' || a.id AS src,
             json_extract(h.value, '$.footnote.passage_id') AS pid, 1 AS w
           FROM answer_log a, json_each(a.answer_json, '$.hadith') h
           WHERE a.expires_at > ?1 AND a.model <> 'agent-draft'
           UNION
           SELECT DISTINCT 'c:' || c.key, json_extract(h.value, '$.footnote.passage_id'), 1 + c.hits
           FROM answer_cache c, json_each(c.result_json, '$.hadith') h
           WHERE c.expires_at > ?1
         ) WHERE typeof(pid) = 'integer' AND pid > 0 GROUP BY pid`,
      )
      .bind(now),
    citedRow,
  );
  return new Map(rows.map((r) => [r.passage_id, r.n]));
}
