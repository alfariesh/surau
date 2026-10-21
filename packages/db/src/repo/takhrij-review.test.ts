import { env } from "cloudflare:workers";
import { beforeEach, expect, test } from "vite-plus/test";
import { ZodError } from "zod";

import { ED, PASSAGES, seedCorpus } from "../../test/fixture.ts";
import { listFootnoteTexts } from "./corpus.ts";
import { putAnswerCache } from "./app.ts";
import { insertAnswerLog } from "./review.ts";
import {
  getTakhrijReviews,
  listTakhrijReviews,
  saveTakhrijReview,
  takhrijCitedCounts,
  takhrijReviewsChangedSince,
} from "./takhrij-review.ts";

const db = env.APP;
const now = "2026-10-21T00:00:00.000Z";
const later = "2026-10-21T01:00:00.000Z";
const base = {
  passage_id: 1000002,
  rules_version: 1,
  label_hash: "a".repeat(64),
  reviewer_key: "b".repeat(64),
  reviewer_name: "Penilai uji",
  decision: "approved" as const,
  kinds: null,
  note: "",
  corpus_version: "fixture",
  updated_at: now,
};

beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM takhrij_review"),
    db.prepare("DELETE FROM answer_log"),
    db.prepare("DELETE FROM answer_cache"),
  ]);
});

test("simpan, perbarui per penilai, dan baca per versi aturan", async () => {
  await saveTakhrijReview(db, base);
  await saveTakhrijReview(db, {
    ...base,
    decision: "corrected",
    kinds: ["daif", "mursal"],
    note: "Istilah di lafaz",
    updated_at: later,
  });
  await saveTakhrijReview(db, { ...base, reviewer_key: "c".repeat(64), reviewer_name: "Lain" });
  await saveTakhrijReview(db, { ...base, rules_version: 2 });
  const v1 = await getTakhrijReviews(db, [base.passage_id, 999], 1);
  expect(v1).toHaveLength(2);
  expect(v1.find((r) => r.reviewer_key === base.reviewer_key)).toMatchObject({
    decision: "corrected",
    kinds: ["daif", "mursal"],
    note: "Istilah di lafaz",
    updated_at: later,
  });
  expect(await listTakhrijReviews(db, 2)).toHaveLength(1);
  expect(await getTakhrijReviews(db, [], 1)).toEqual([]);
});

test("koreksi wajib berisi jenis istilah; jenis lain tidak boleh", async () => {
  await expect(saveTakhrijReview(db, { ...base, decision: "corrected" })).rejects.toThrow(ZodError);
  await expect(saveTakhrijReview(db, { ...base, kinds: ["daif"] })).rejects.toThrow(ZodError);
  await expect(
    saveTakhrijReview(db, { ...base, decision: "corrected", kinds: ["daif", "daif"] }),
  ).rejects.toThrow(ZodError);
  // CHECK SQL tetap menjaga bila skema Zod dilewati.
  await expect(
    db
      .prepare(`INSERT INTO takhrij_review VALUES (1, 1, ?, ?, 'x', 'corrected', NULL, '', 'v', ?)`)
      .bind("a".repeat(64), "b".repeat(64), now)
      .run(),
  ).rejects.toThrow(/CHECK/u);
});

test("perubahan tinjauan sesudah waktu cache terdeteksi", async () => {
  await saveTakhrijReview(db, { ...base, updated_at: later });
  expect(await takhrijReviewsChangedSince(db, [base.passage_id], now)).toBe(true);
  expect(await takhrijReviewsChangedSince(db, [base.passage_id], later)).toBe(false);
  expect(await takhrijReviewsChangedSince(db, [123], now)).toBe(false);
  expect(await takhrijReviewsChangedSince(db, [], now)).toBe(false);
});

test("hitungan kutipan takhrij dari answer_log dan answer_cache (tanpa contoh agent)", async () => {
  const hadith = (ids: number[]) =>
    ids.map((id) => ({
      passage_id: 1,
      footnote: { passage_id: id, char_start: 0, char_end: 5 },
      status: "x",
    }));
  const row = (id: string, model: string, ids: number[], expires = "2027-10-21T00:00:00.000Z") => ({
    id,
    run_id: "uji",
    question_id: id.slice(-4),
    question_hash: "a".repeat(64),
    answer_hash: "b".repeat(64),
    corpus_version: "fixture",
    prompt_version: "p",
    model,
    private: 0 as const,
    question_json: "{}",
    // Takhrij yang sama dua kali dalam satu jawaban dihitung sekali.
    answer_json: JSON.stringify({ hadith: hadith(ids) }),
    created_at: "2026-10-01T00:00:00.000Z",
    expires_at: expires,
  });
  await insertAnswerLog(db, row("uji_j001", "claude-haiku-5-5", [11, 12, 11]));
  await insertAnswerLog(db, row("uji_j002", "claude-haiku-5-5", [11]));
  await insertAnswerLog(db, row("uji_j003", "agent-draft", [11, 13]));
  await insertAnswerLog(db, row("uji_j004", "claude-haiku-5-5", [14], "2026-10-20T00:00:00.000Z"));
  await putAnswerCache(db, {
    key: "d".repeat(64),
    corpus_version: "fixture",
    prompt_version: "p",
    model: "m",
    outcome: "answer",
    result_json: JSON.stringify({ hadith: hadith([12]) }),
    created_at: now,
    expires_at: "2026-11-21T00:00:00.000Z",
  });
  await db.prepare("UPDATE answer_cache SET hits = 3").run();
  expect(Object.fromEntries(await takhrijCitedCounts(db, now))).toEqual({ 11: 2, 12: 5 });
});

test("teks catatan kaki satu edisi per halaman keyset", async () => {
  await seedCorpus(env.CORPUS);
  const all = await listFootnoteTexts(env.CORPUS, ED);
  expect(all.map((r) => r.id)).toEqual([PASSAGES.foot1, PASSAGES.foot2]);
  expect((await listFootnoteTexts(env.CORPUS, ED, PASSAGES.foot1)).map((r) => r.id)).toEqual([
    PASSAGES.foot2,
  ]);
  expect(await listFootnoteTexts(env.CORPUS, ED + 1)).toEqual([]);
});
