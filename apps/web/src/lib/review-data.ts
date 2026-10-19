import { evalAnswer, evalHash, evalQuestion, resolveEvalSource } from "@surau/core";
import type { EvalAnswer, EvalQuestion, EvalSource } from "@surau/core";
import { getCorpusMeta, getReviews } from "@surau/db";
import type { AnswerLogRow, D1Db, ReviewRow } from "@surau/db";

export interface ReviewItem {
  id: string;
  question: EvalQuestion;
  answer: EvalAnswer;
  answerHash: string;
  runId: string;
  corpusVersion: string;
  private: boolean;
  stale: boolean;
  sources: EvalSource[];
  citations: EvalSource[];
  invalidCitations: number;
  reviews: Omit<ReviewRow, "reviewer_key">[];
  ownReview: Omit<ReviewRow, "reviewer_key"> | null;
}
/** Dipanggil HANYA sesudah auth. Sumber selalu dibaca kembali dari korpus yang versinya sama. */
export async function reviewItem(
  row: AnswerLogRow,
  corpus: D1Db,
  app: D1Db,
  identity: string,
): Promise<ReviewItem> {
  const question = evalQuestion.parse(JSON.parse(row.question_json));
  const answer = evalAnswer.parse(JSON.parse(row.answer_json));
  const meta = await getCorpusMeta(corpus);
  const stale =
    meta.corpus_version !== row.corpus_version ||
    (await evalHash(question)) !== row.question_hash ||
    (await evalHash(answer)) !== row.answer_hash;
  const sources = stale
    ? []
    : await Promise.all(question.sumber.map((s) => resolveEvalSource(corpus, s)));
  const citations = stale
    ? []
    : await Promise.all(answer.citations.map((s) => resolveEvalSource(corpus, s)));
  const reviews = await getReviews(app, row.id);
  const publicReview = ({ reviewer_key: _key, ...review }: ReviewRow) => review;
  const ownReview = reviews.find((r) => r.reviewer_key === identity);
  return {
    id: row.id,
    question,
    answer,
    answerHash: row.answer_hash,
    runId: row.run_id,
    corpusVersion: row.corpus_version,
    private: row.private === 1,
    stale: stale || sources.some((s) => s === null),
    sources: sources.filter((s) => s !== null),
    citations: citations.filter((s) => s !== null),
    invalidCitations: citations.filter((s) => s === null).length,
    reviews: reviews.map(publicReview),
    ownReview: ownReview ? publicReview(ownReview) : null,
  };
}
