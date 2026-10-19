import { evalHash, evalQuestion } from "@surau/core";
import type { EvalQuestion } from "@surau/core";
import { answerLogRow, reviewRow } from "@surau/db";
import { z } from "zod";
import type { AnswerRecord, JudgeRecord } from "./answer-data.ts";
import { metric } from "./answer-metrics.ts";

export const reviewExport = answerLogRow.extend({
  reviews: z.array(reviewRow.omit({ reviewer_key: true })),
});
export type ReviewExport = z.infer<typeof reviewExport>;

/** Semua keputusan atas versi soal yang sama harus sepakat; tidak memakai any-approved. */
export async function approvedQuestions(exports: ReviewExport[], reviewer: string) {
  const byVersion = new Map<
    string,
    { question: EvalQuestion; private: boolean; decision: string }
  >();
  for (const r of exports) {
    const question = evalQuestion.parse(JSON.parse(r.question_json));
    if ((await evalHash(question)) !== r.question_hash)
      throw new Error("Hash soal ekspor tidak cocok.");
    const humans = r.reviews.filter((v) => v.reviewer_name === reviewer);
    if (humans.length > 1) throw new Error("Nama penilai ambigu.");
    const decision = humans[0]?.question_verdict;
    if (!decision) continue;
    const key = `${question.id}:${r.question_hash}`;
    const old = byVersion.get(key);
    if (old && (old.decision !== decision || old.private !== (r.private === 1)))
      throw new Error(
        "Keputusan atau pemisahan privat bertentangan untuk versi soal yang sama; rekonsiliasi dahulu.",
      );
    byVersion.set(key, { question, private: r.private === 1, decision });
  }
  const result = [...byVersion.values()].filter((r) => r.decision === "approved");
  if (new Set(result.map((r) => r.question.id)).size !== result.length)
    throw new Error("Dua versi soal disetujui; rekonsiliasi dahulu.");
  return result.map((r) => ({
    question: { ...r.question, disetujui_oleh: reviewer },
    private: r.private,
  }));
}

/** Nama dipilih eksplisit, bukan setiap pengguna Access dianggap ustadz. */
export function calibration(
  records: AnswerRecord[],
  judge: JudgeRecord[],
  reviews: ReviewExport[],
  reviewer: string,
) {
  const result = {
    faithfulness: metric(0, 0),
    attribution: metric(0, 0),
    language: { n: 0, mean: null as number | null },
    paired_answers: 0,
  };
  let language = 0;
  for (const r of records) {
    const matches = reviews.filter(
      (v) =>
        v.id === r.id &&
        v.answer_hash === r.answer_hash &&
        v.question_hash === r.question_hash &&
        v.corpus_version === r.corpus_version,
    );
    if (matches.length > 1) throw new Error("Ekspor memuat ID jawaban ganda.");
    const human = matches[0]?.reviews.filter((v) => v.reviewer_name === reviewer);
    if (!human?.length) continue;
    if (human.length > 1) throw new Error("Nama penilai ambigu pada ekspor.");
    const h = human[0]!;
    if (h.language_score !== null && h.verdict !== null) {
      language += h.language_score;
      result.language.n++;
    }
    const j = judge.find(
      (v) =>
        v.id === r.id &&
        v.answer_hash === r.answer_hash &&
        v.question_hash === r.question_hash &&
        v.corpus_version === r.corpus_version,
    );
    if (!j?.scores || h.verdict === null) continue;
    if (h.faithfulness !== null && h.attribution !== null) result.paired_answers++;
    for (const key of ["faithfulness", "attribution"] as const)
      if (h[key] !== null) {
        result[key].total++;
        result[key].passed += Number(Boolean(h[key]) === j.scores[key]);
      }
  }
  result.faithfulness = metric(result.faithfulness.passed, result.faithfulness.total);
  result.attribution = metric(result.attribution.passed, result.attribution.total);
  result.language.mean = result.language.n ? language / result.language.n : null;
  return result;
}

/** Bentuk SQL hanya dari record tervalidasi; tidak ada eksekusi remote implisit. */
export async function seedSql(records: AnswerRecord[]) {
  const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
  const statements = [];
  for (const r of records) {
    if (
      (await evalHash(r.question)) !== r.question_hash ||
      (await evalHash(r.answer)) !== r.answer_hash
    )
      throw new Error("Hash arsip tidak cocok.");
    const expires = new Date(r.created_at);
    expires.setUTCFullYear(expires.getUTCFullYear() + 1);
    const values = [
      r.id,
      r.run_id,
      r.question.id,
      r.question_hash,
      r.answer_hash,
      r.corpus_version,
      r.answer.prompt_version,
      r.answer.model,
      r.private ? 1 : 0,
      JSON.stringify(r.question),
      JSON.stringify(r.answer),
      r.created_at,
      expires.toISOString(),
    ];
    statements.push(
      `INSERT INTO answer_log (id,run_id,question_id,question_hash,answer_hash,corpus_version,prompt_version,model,private,question_json,answer_json,created_at,expires_at) VALUES (${values.map((v) => (typeof v === "number" ? v : quote(v))).join(",")});`,
    );
  }
  return statements.join("\n") + "\n";
}
