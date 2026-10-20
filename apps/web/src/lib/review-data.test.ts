// reviewItem (#79): penanda usang, ulasan sendiri, dan janji privasi ADR-052 (reviewer_key, hash akun
// Access, tidak pernah sampai ke klien atau ekspor). Skema soal/jawaban dan sumber korpus dipalsukan:
// yang diuji logika reviewItem, bukan skema core.
import type { AnswerLogRow, D1Db, ReviewRow } from "@surau/db";

import { getCorpusMeta, getReviews } from "@surau/db";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { reviewItem } from "./review-data";

vi.mock("@surau/core", () => ({
  evalQuestion: { parse: (v: unknown) => v },
  evalAnswer: { parse: (v: unknown) => v },
  evalHash: async (v: unknown) => `hash:${JSON.stringify(v)}`,
  resolveEvalSource: async (_db: D1Db, p: { passage_id: number }) =>
    p.passage_id === 999 ? null : { pointer: p, text: "sumber" },
}));
vi.mock("@surau/db", () => ({
  getCorpusMeta: vi.fn<typeof getCorpusMeta>(),
  getReviews: vi.fn<typeof getReviews>(),
}));

const question = { id: "j001", sumber: [{ passage_id: 1 }] };
const answer = { citations: [{ passage_id: 2 }, { passage_id: 999 }] };
const row = (over: Partial<AnswerLogRow> = {}): AnswerLogRow =>
  ({
    id: "run_j001",
    run_id: "run",
    corpus_version: "ihya-v6",
    private: 0,
    question_json: JSON.stringify(question),
    answer_json: JSON.stringify(answer),
    question_hash: `hash:${JSON.stringify(question)}`,
    answer_hash: `hash:${JSON.stringify(answer)}`,
    ...over,
  }) as AnswerLogRow;
const review = (key: string, name: string): ReviewRow => ({
  answer_id: "run_j001",
  reviewer_key: key,
  reviewer_name: name,
  question_verdict: "approved",
  verdict: "benar",
  language_score: 5,
  faithfulness: 1,
  attribution: 1,
  reason: "",
  updated_at: "2026-10-20",
});
const db = {} as D1Db;

beforeEach(() => {
  vi.mocked(getCorpusMeta).mockResolvedValue({ corpus_version: "ihya-v6" } as Awaited<
    ReturnType<typeof getCorpusMeta>
  >);
  vi.mocked(getReviews).mockResolvedValue([
    review("kunci-saya", "Saya"),
    review("kunci-lain", "Peninjau lain"),
  ]);
});

describe("reviewItem", () => {
  test("reviewer_key tidak pernah ikut keluar; ulasan sendiri dikenali dari identitas", async () => {
    const item = await reviewItem(row(), db, db, "kunci-saya");
    expect(JSON.stringify(item)).not.toContain("kunci-");
    expect(item.reviews.map((r) => r.reviewer_name)).toEqual(["Saya", "Peninjau lain"]);
    expect(item.ownReview?.reviewer_name).toBe("Saya");
    expect(item.stale).toBe(false);
    expect(item.citations).toHaveLength(1);
    expect(item.invalidCitations).toBe(1);
  });

  test("tanpa ulasan sendiri → ownReview null", async () => {
    const item = await reviewItem(row(), db, db, "kunci-asing");
    expect(item.ownReview).toBeNull();
  });

  test("versi korpus atau hash berbeda → usang, sumber tidak dibaca", async () => {
    for (const over of [
      { corpus_version: "ihya-v5" },
      { question_hash: "hash:lain" },
      { answer_hash: "hash:lain" },
    ]) {
      const item = await reviewItem(row(over), db, db, "kunci-saya");
      expect(item.stale, JSON.stringify(over)).toBe(true);
      expect(item.sources).toEqual([]);
    }
  });

  test("sumber soal yang tidak ditemukan di korpus → usang", async () => {
    const hilang = { ...question, sumber: [{ passage_id: 999 }] };
    const item = await reviewItem(
      row({
        question_json: JSON.stringify(hilang),
        question_hash: `hash:${JSON.stringify(hilang)}`,
      }),
      db,
      db,
      "kunci-saya",
    );
    expect(item.stale).toBe(true);
  });
});
