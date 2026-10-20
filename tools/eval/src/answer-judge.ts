import { evalHash, judgeScores } from "@surau/core";
import type { EvalSource } from "@surau/core";
import {
  MODELS,
  costUsd,
  messageText,
  stopProblem,
  JUDGE_VERSION,
  JUDGE_MAX_TOKENS,
  JUDGE_PROMPT,
} from "@surau/llm";
export { JUDGE_VERSION, JUDGE_MAX_TOKENS, JUDGE_PROMPT } from "@surau/llm";
import type { createAnthropic } from "@surau/llm";
import type { AnswerRecord, JudgeRecord } from "./answer-data.ts";

const OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    faithfulness: { type: "boolean" },
    attribution: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["faithfulness", "attribution", "reason"],
  additionalProperties: false,
};

/** Human review, nama penilai, dan hasil deterministik sengaja tidak ikut prompt. */
export function judgeRequest(r: AnswerRecord, sources: EvalSource[], citations: EvalSource[]) {
  return {
    custom_id: r.id,
    params: {
      model: MODELS.sonnet,
      max_tokens: JUDGE_MAX_TOKENS,
      system: JUDGE_PROMPT,
      output_config: {
        effort: "low" as const,
        format: { type: "json_schema" as const, schema: OUTPUT_SCHEMA },
      },
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            question: r.question.pertanyaan,
            key: r.question.poin_kunci,
            refusal_expected: r.question.wajib_ditolak,
            answer: r.answer,
            sources: sources.map((s) => ({
              pointer: s.pointer,
              text: s.text,
              label: s.citation.label,
            })),
            citations: citations.map((s) => ({
              pointer: s.pointer,
              text: s.text,
              label: s.citation.label,
            })),
          }),
        },
      ],
    },
  };
}
export type JudgeRequest = ReturnType<typeof judgeRequest>;
type Client = ReturnType<typeof createAnthropic>;
export async function estimateJudge(client: Client, requests: JudgeRequest[]) {
  if (
    requests.length < 1 ||
    requests.length > 100 ||
    new Set(requests.map((r) => r.custom_id)).size !== requests.length
  )
    throw new Error("Batch harus berisi 1–100 ID unik.");
  let tokens = 0;
  for (const { custom_id, params } of requests) {
    // Plan berada di disk: annotation TypeScript bukan validasi runtime.
    if (
      !/^[a-zA-Z0-9_-]{1,120}$/u.test(custom_id) ||
      params.model !== MODELS.sonnet ||
      params.max_tokens !== JUDGE_MAX_TOKENS ||
      params.system !== JUDGE_PROMPT ||
      Object.keys(params).sort().join(",") !== "max_tokens,messages,model,output_config,system" ||
      JSON.stringify(params.output_config) !==
        JSON.stringify({ effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } }) ||
      params.messages.length !== 1 ||
      params.messages[0]?.role !== "user" ||
      typeof params.messages[0]?.content !== "string" ||
      params.messages[0].content.length > 100000
    )
      throw new Error(
        "Parameter plan judge berubah; susun ulang plan dengan versi prompt saat ini.",
      );
    const counted = await client.messages.countTokens({
      model: params.model,
      system: params.system,
      messages: params.messages,
      output_config: params.output_config,
    });
    if (counted.input_tokens > 50000) throw new Error("Prompt judge melewati batas 50.000 token.");
    tokens += counted.input_tokens;
  }
  return {
    input_tokens: tokens,
    max_output_tokens: requests.length * JUDGE_MAX_TOKENS,
    // Buffer 10% untuk perbedaan hitungan token, tanpa cache.
    ceiling_usd: costUsd(
      MODELS.sonnet,
      { input_tokens: Math.ceil(tokens * 1.1), output_tokens: requests.length * JUDGE_MAX_TOKENS },
      { batch: true },
    ),
  };
}
/**
 * Holdout privat tidak dikirim ke Anthropic (evals/README "Penyimpanan privat S18", #69): bukan hanya
 * batch judge, `countTokens` di judge-plan pun mengirim isinya. Tanpa `includePrivate` (opsi eksplisit
 * `--termasuk-privat`, yang wajib dicatat sebagai salinan baru di evals/README dengan izin pemilik),
 * arsip yang memuat satu saja jawaban privat ditolak sebelum ada panggilan API.
 */
export function assertJudgePublic(
  records: readonly { private: boolean; question: { id: string } }[],
  includePrivate: boolean,
): void {
  // Flag `private` tidak ikut di-hash arsip: soal ber-ID `p…` (konvensi holdout, answer-data.ts)
  // tetap dianggap privat walau flag-nya tersunting/keliru.
  const count = records.filter((r) => r.private || r.question.id.startsWith("p")).length;
  if (count === 0 || includePrivate) return;
  throw new Error(
    `Arsip memuat ${count} jawaban holdout privat; judge tidak mengirimnya ke Anthropic. ` +
      "Pakai arsip dari baseline --publik-saja. Mengirim holdout butuh izin pemilik, --termasuk-privat, " +
      "dan catatan salinan baru di evals/README.md.",
  );
}

export function assertJudgeBudget(ceiling: number, budget: number, confirmed: boolean) {
  if (!confirmed || !Number.isFinite(budget) || budget <= 0 || ceiling > budget)
    throw new Error(
      "Batch tidak dikirim: perlu --confirm dan --budget-usd yang mencakup batas biaya setelah izin pemilik.",
    );
}
export async function collectJudge(
  client: Client,
  batchId: string,
  records: AnswerRecord[],
): Promise<{ results: JudgeRecord[]; cost_usd: number }> {
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended")
    throw new Error("Batch belum selesai; ulangi collect nanti.");
  const byId = new Map(records.map((r) => [r.id, r]));
  const found = new Map<string, JudgeRecord>();
  let cost = 0;
  for await (const entry of await client.messages.batches.results(batchId)) {
    const r = byId.get(entry.custom_id);
    if (!r || found.has(r.id))
      throw new Error("Hasil batch tidak cocok dengan manifest atau ID ganda.");
    const base = {
      id: r.id,
      answer_hash: r.answer_hash,
      question_hash: r.question_hash,
      corpus_version: r.corpus_version,
      judge_version: JUDGE_VERSION,
    };
    let parsed: JudgeRecord = { ...base, scores: null, error: entry.result.type };
    if (entry.result.type === "succeeded") {
      const message = entry.result.message;
      cost += costUsd(MODELS.sonnet, message.usage, { batch: true });
      const problem = stopProblem(message);
      if (problem) parsed.error = problem;
      else {
        try {
          parsed = {
            ...base,
            scores: judgeScores.parse(JSON.parse(messageText(message))),
            error: null,
          };
        } catch {
          parsed.error = "invalid_json_or_scores";
        }
      }
    }
    found.set(r.id, parsed);
  }
  for (const r of records)
    if (!found.has(r.id))
      found.set(r.id, {
        id: r.id,
        answer_hash: r.answer_hash,
        question_hash: r.question_hash,
        corpus_version: r.corpus_version,
        judge_version: JUDGE_VERSION,
        scores: null,
        error: "missing_result",
      });
  return { results: [...found.values()], cost_usd: cost };
}
export const judgePlanHash = (requests: JudgeRequest[]) => evalHash(requests);
