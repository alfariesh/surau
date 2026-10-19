import { z } from "zod";

export const answerLogRow = z.strictObject({
  id: z.string(),
  run_id: z.string(),
  question_id: z.string(),
  question_hash: z.string(),
  answer_hash: z.string(),
  corpus_version: z.string(),
  prompt_version: z.string(),
  model: z.string(),
  private: z.literal([0, 1]),
  question_json: z.string(),
  answer_json: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
});
export type AnswerLogRow = z.infer<typeof answerLogRow>;

export const reviewRow = z.strictObject({
  answer_id: z.string(),
  reviewer_key: z.string(),
  reviewer_name: z.string(),
  question_verdict: z.enum(["approved", "revise", "rejected"]).nullable(),
  verdict: z.enum(["benar", "kurang", "salah"]).nullable(),
  language_score: z.number().int().min(1).max(5).nullable(),
  faithfulness: z.literal([0, 1]).nullable(),
  attribution: z.literal([0, 1]).nullable(),
  reason: z.string(),
  updated_at: z.string(),
});
export type ReviewRow = z.infer<typeof reviewRow>;

const clean = (s: string) => !/[\p{Cc}\p{Cf}]/u.test(s.replaceAll(/[\n\t]/g, " "));
export const reviewInput = z
  .strictObject({
    answer_id: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/u),
    // Hash wajib dikirim kembali: tab lama tidak boleh menilai versi jawaban yang lain.
    answer_hash: z.string().regex(/^[a-f0-9]{64}$/u),
    reviewer_name: z.string().trim().min(1).max(80).refine(clean),
    question_verdict: reviewRow.shape.question_verdict,
    verdict: reviewRow.shape.verdict,
    language_score: reviewRow.shape.language_score,
    faithfulness: reviewRow.shape.faithfulness,
    attribution: reviewRow.shape.attribution,
    reason: z.string().trim().min(1).max(2000).refine(clean),
  })
  .refine((v) => v.question_verdict !== null || v.verdict !== null)
  .refine((v) =>
    v.verdict !== null
      ? v.language_score !== null
      : v.language_score === null && v.faithfulness === null && v.attribution === null,
  );
export type ReviewInput = z.infer<typeof reviewInput>;
