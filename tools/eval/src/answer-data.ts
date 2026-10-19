import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { evalAnswer, evalHash, evalQuestion, judgeScores } from "@surau/core";
import type { EvalQuestion } from "@surau/core";
import { z } from "zod";

export interface AnswerQuestion {
  question: EvalQuestion;
  private: boolean;
}
export const answerRecord = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/u),
  run_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/u),
  private: z.boolean(),
  corpus_version: z.string().min(1),
  question: evalQuestion,
  answer: evalAnswer,
  question_hash: z.string().regex(/^[a-f0-9]{64}$/u),
  answer_hash: z.string().regex(/^[a-f0-9]{64}$/u),
  created_at: z.iso.datetime(),
});
export type AnswerRecord = z.infer<typeof answerRecord>;
export const judgeRecord = z.strictObject({
  id: z.string(),
  answer_hash: z.string(),
  question_hash: z.string(),
  corpus_version: z.string(),
  judge_version: z.string(),
  scores: judgeScores.nullable(),
  error: z.string().nullable(),
});
export type JudgeRecord = z.infer<typeof judgeRecord>;

/** Jangan bocorkan input/Zod issue: berkas dapat memuat soal privat. */
export function readJsonl<T>(file: string, schema: z.ZodType<T>): T[] {
  return readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .map((s, i) => {
      try {
        return schema.parse(JSON.parse(s));
      } catch {
        throw new Error(`JSONL tidak valid pada baris ${i + 1}; rincian input disembunyikan.`);
      }
    });
}
export function loadAnswerQuestions(repo: string, publicOnly: boolean): AnswerQuestion[] {
  const dir = join(repo, "evals/jawab");
  const rows: AnswerQuestion[] = readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .flatMap((f) =>
      readJsonl(join(dir, f), evalQuestion).map((question) => ({ question, private: false })),
    );
  const holdout = join(repo, "evals/private/jawab.jsonl");
  if (!publicOnly) {
    if (!existsSync(holdout))
      throw new Error(
        "Set privat tidak ada; pulihkan dari R2 atau gunakan --publik-saja secara eksplisit.",
      );
    rows.push(...readJsonl(holdout, evalQuestion).map((question) => ({ question, private: true })));
  }
  const ids = new Set<string>();
  for (const r of rows) {
    if (ids.has(r.question.id) || !r.question.id.startsWith(r.private ? "p" : "j"))
      throw new Error("ID soal ganda atau salah pemisahan publik/privat.");
    ids.add(r.question.id);
  }
  if (!rows.length) throw new Error("Set soal kosong.");
  return rows;
}
export async function verifyRecord(r: AnswerRecord): Promise<void> {
  if (
    (await evalHash(r.question)) !== r.question_hash ||
    (await evalHash(r.answer)) !== r.answer_hash
  )
    throw new Error(`${r.id}: hash soal/jawaban tidak cocok.`);
}
