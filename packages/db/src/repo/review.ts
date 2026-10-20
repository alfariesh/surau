import { z } from "zod";
import type { D1Db } from "../d1.ts";
import { answerLogRow, reviewInput, reviewRow } from "../schema/review.ts";
import type { AnswerLogRow, ReviewInput, ReviewRow } from "../schema/review.ts";
import { allRows, firstRow } from "./rows.ts";

// Daftar kolom eksplisit, bukan SELECT *: skema Zod-nya strictObject, jadi kolom baru dari migrasi app
// tidak boleh langsung membuat parse gagal (500) sebelum skemanya ikut diubah (#77).
const ANSWER_LOG_COLS =
  "id, run_id, question_id, question_hash, answer_hash, corpus_version, prompt_version, model, private, question_json, answer_json, created_at, expires_at";
const REVIEW_COLS =
  "answer_id, reviewer_key, reviewer_name, question_verdict, verdict, language_score, faithfulness, attribution, reason, updated_at";

/** Hanya pemuat eval terkurasi (CLI), tidak pernah endpoint tulis publik. Tidak ada upsert. */
export async function insertAnswerLog(db: D1Db, row: AnswerLogRow): Promise<void> {
  const r = answerLogRow.parse(row);
  await db
    .prepare(`INSERT INTO answer_log
    (id,run_id,question_id,question_hash,answer_hash,corpus_version,prompt_version,model,private,
     question_json,answer_json,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      r.id,
      r.run_id,
      r.question_id,
      r.question_hash,
      r.answer_hash,
      r.corpus_version,
      r.prompt_version,
      r.model,
      r.private,
      r.question_json,
      r.answer_json,
      r.created_at,
      r.expires_at,
    )
    .all();
}

/** Pagination dibatasi; data kedaluwarsa tidak pernah ditampilkan/ekspor. */
export async function listAnswerLogs(db: D1Db, now: string, offset = 0): Promise<AnswerLogRow[]> {
  z.number().int().min(0).max(100000).parse(offset);
  return allRows(
    db
      .prepare(`SELECT ${ANSWER_LOG_COLS} FROM answer_log WHERE expires_at > ?
    ORDER BY created_at DESC, id LIMIT 50 OFFSET ?`)
      .bind(now, offset),
    answerLogRow,
  );
}
export async function getAnswerLog(
  db: D1Db,
  id: string,
  now: string,
): Promise<AnswerLogRow | null> {
  return firstRow(
    db
      .prepare(`SELECT ${ANSWER_LOG_COLS} FROM answer_log WHERE id = ? AND expires_at > ?`)
      .bind(id, now),
    answerLogRow,
  );
}
export async function getReviews(db: D1Db, id: string): Promise<ReviewRow[]> {
  return allRows(
    db
      .prepare(`SELECT ${REVIEW_COLS} FROM review WHERE answer_id = ? ORDER BY updated_at DESC`)
      .bind(id),
    reviewRow,
  );
}

/** INSERT SELECT mengikat versi dan retensi secara atomik, termasuk saat tab lama mengirim. */
export async function saveReview(
  db: D1Db,
  input: ReviewInput,
  reviewerKey: string,
  now: string,
): Promise<boolean> {
  const v = reviewInput.parse(input);
  z.string()
    .regex(/^[a-f0-9]{64}$/u)
    .parse(reviewerKey);
  const row = await db
    .prepare(`INSERT INTO review
    (answer_id,reviewer_key,reviewer_name,question_verdict,verdict,language_score,faithfulness,attribution,reason,updated_at)
    SELECT id,?,?,?,?,?,?,?,?,? FROM answer_log WHERE id = ? AND answer_hash = ? AND expires_at > ?
    ON CONFLICT(answer_id,reviewer_key) DO UPDATE SET
      reviewer_name=excluded.reviewer_name,question_verdict=excluded.question_verdict,
      verdict=excluded.verdict,language_score=excluded.language_score,faithfulness=excluded.faithfulness,
      attribution=excluded.attribution,reason=excluded.reason,updated_at=excluded.updated_at
    RETURNING answer_id`)
    .bind(
      reviewerKey,
      v.reviewer_name,
      v.question_verdict,
      v.verdict,
      v.language_score,
      v.faithfulness,
      v.attribution,
      v.reason,
      now,
      v.answer_id,
      v.answer_hash,
      now,
    )
    .first();
  return row !== null;
}
