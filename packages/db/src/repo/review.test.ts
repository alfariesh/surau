import { env } from "cloudflare:workers";
import { beforeEach, expect, test } from "vite-plus/test";
import { getAnswerLog, getReviews, insertAnswerLog, listAnswerLogs, saveReview } from "./review.ts";
import { reviewInput } from "../schema/review.ts";
const db = env.APP;
const now = "2026-10-18T00:00:00.000Z";
const answer = {
  id: "test_j001",
  run_id: "test",
  question_id: "j001",
  question_hash: "a".repeat(64),
  answer_hash: "b".repeat(64),
  corpus_version: "fixture",
  prompt_version: "fixture",
  model: "none",
  private: 1 as const,
  question_json: "{}",
  answer_json: "{}",
  created_at: now,
  expires_at: "2027-10-18T00:00:00.000Z",
};
const input = {
  answer_id: answer.id,
  answer_hash: answer.answer_hash,
  reviewer_name: "Agent QA",
  question_verdict: "approved" as const,
  verdict: null,
  language_score: null,
  faithfulness: null,
  attribution: null,
  reason: "Fixture buatan",
};
beforeEach(async () => {
  await db.prepare("DELETE FROM answer_log").run();
  await insertAnswerLog(db, answer);
});
test("arsip tidak di-upsert; versi lama/kedaluwarsa tidak menerima penilaian", async () => {
  await expect(insertAnswerLog(db, answer)).rejects.toThrow(/UNIQUE/u);
  expect(await saveReview(db, { ...input, answer_hash: "c".repeat(64) }, "d".repeat(64), now)).toBe(
    false,
  );
  expect(await saveReview(db, input, "d".repeat(64), answer.expires_at)).toBe(false);
  expect(await getAnswerLog(db, answer.id, answer.expires_at)).toBeNull();
  expect(await listAnswerLogs(db, answer.expires_at)).toEqual([]);
});
test("penilaian dapat dibuka dan diperbarui tanpa menggandakan; terpisah menurut identitas", async () => {
  expect(await saveReview(db, input, "d".repeat(64), now)).toBe(true);
  expect(
    await saveReview(
      db,
      { ...input, verdict: "kurang", language_score: 3, faithfulness: 0, attribution: 1 },
      "d".repeat(64),
      now,
    ),
  ).toBe(true);
  expect(await getReviews(db, answer.id)).toMatchObject([
    {
      reviewer_name: "Agent QA",
      verdict: "kurang",
      language_score: 3,
      faithfulness: 0,
      attribution: 1,
    },
  ]);
  await saveReview(db, { ...input, reviewer_name: "QA kedua" }, "e".repeat(64), now);
  expect(await getReviews(db, answer.id)).toHaveLength(2);
  await db.prepare("DELETE FROM answer_log WHERE id=?").bind(answer.id).run();
  expect(await getReviews(db, answer.id)).toEqual([]);
});
test("batas dan konsistensi input dipertahankan", async () => {
  for (const bad of [
    { reason: " " },
    { reason: "x".repeat(2001) },
    { reviewer_name: "x\u202ey" },
    { verdict: "benar" },
    { language_score: 4 },
  ])
    expect(reviewInput.safeParse({ ...input, ...bad }).success).toBe(false);
  await expect(listAnswerLogs(db, now, -1)).rejects.toThrow(/Too small/u);
  await expect(db.prepare("UPDATE answer_log SET private=2").run()).rejects.toThrow(/CHECK/u);
});
