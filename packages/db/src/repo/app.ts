// Query DB app: sakelar dan laporan kesalahan. Input pengguna divalidasi Zod sebelum ditulis.
import type { D1Db } from "../d1.ts";
import {
  answerCacheRow,
  feedbackInput,
  kitabInterestArabic,
  kitabInterestInput,
  kitabInterestPurpose,
  settingRow,
  settingsValues,
} from "../schema/app.ts";
import type { AnswerCacheRow, FeedbackInput, KitabInterestInput, Settings } from "../schema/app.ts";
import { allRows, firstRow } from "./rows.ts";
import { z } from "zod";

/** Semua sakelar yang dikenal, dengan tipe nilainya. Kunci yang hilang = error (migrasi rusak). */
export async function getSettings(db: D1Db): Promise<Settings> {
  const rows = await allRows(db.prepare("SELECT key, value, updated_at FROM settings"), settingRow);
  return settingsValues.parse(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** Simpan laporan kesalahan; mengembalikan ID-nya. Melempar ZodError bila input tidak sah. */
export async function createFeedback(db: D1Db, input: FeedbackInput): Promise<number> {
  const f = feedbackInput.parse(input);
  const row = await firstRow(
    db
      .prepare(
        `INSERT INTO feedback (kind, passage_id, page_id, path, message, corpus_version)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(f.kind, f.passage_id, f.page_id, f.path, f.message, f.corpus_version),
    z.strictObject({ id: z.number().int().positive() }),
  );
  if (row === null) throw new Error("INSERT feedback tidak mengembalikan id");
  return row.id;
}

const ANSWER_CACHE_COLS =
  "key, corpus_version, prompt_version, model, outcome, result_json, created_at, expires_at, hits";

/** Entri cache Jawab yang belum kedaluwarsa (`now` = ISO), atau null. */
export function getAnswerCache(db: D1Db, key: string, now: string): Promise<AnswerCacheRow | null> {
  return firstRow(
    db
      .prepare(`SELECT ${ANSWER_CACHE_COLS} FROM answer_cache WHERE key = ? AND expires_at > ?`)
      .bind(key, now),
    answerCacheRow,
  );
}

/** Simpan (atau ganti) entri cache; `hits` mulai 0. */
export async function putAnswerCache(db: D1Db, row: Omit<AnswerCacheRow, "hits">): Promise<void> {
  const r = answerCacheRow.parse({ ...row, hits: 0 });
  await db
    .prepare(
      `INSERT OR REPLACE INTO answer_cache (${ANSWER_CACHE_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .bind(
      r.key,
      r.corpus_version,
      r.prompt_version,
      r.model,
      r.outcome,
      r.result_json,
      r.created_at,
      r.expires_at,
    )
    .all();
}

/** Tambah hitungan pemakaian cache (statistik; tanpa data pengguna). */
export async function touchAnswerCache(db: D1Db, key: string): Promise<void> {
  await db.prepare("UPDATE answer_cache SET hits = hits + 1 WHERE key = ?").bind(key).all();
}

/**
 * Tambah satu suara minat kitab kandidat (ADR-115) ke hitungan hari ini (UTC). Hanya agregat:
 * tidak ada baris per suara. Melempar ZodError bila input tidak sah.
 */
export async function createKitabInterest(db: D1Db, input: KitabInterestInput): Promise<void> {
  const f = kitabInterestInput.parse(input);
  await db
    .prepare(
      `INSERT INTO kitab_interest (day, candidate, purpose, arabic, votes)
       VALUES (strftime('%Y-%m-%d', 'now'), ?, ?, ?, 1)
       ON CONFLICT (day, candidate, purpose, arabic) DO UPDATE SET votes = votes + 1`,
    )
    .bind(f.candidate, f.purpose, f.arabic)
    .all();
}

const interestCount = z.strictObject({
  candidate: z.string(),
  purpose: kitabInterestPurpose,
  arabic: kitabInterestArabic,
  votes: z.number().int().nonnegative(),
});
export type KitabInterestCount = z.infer<typeof interestCount>;

/** Jumlah suara per kandidat, tujuan, dan kemampuan baca Arab (agregat untuk /admin). */
export function countKitabInterest(db: D1Db): Promise<KitabInterestCount[]> {
  return allRows(
    db.prepare(
      `SELECT candidate, purpose, arabic, SUM(votes) AS votes FROM kitab_interest
       GROUP BY candidate, purpose, arabic ORDER BY candidate, purpose, arabic`,
    ),
    interestCount,
  );
}
