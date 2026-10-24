// S18: baseline gratis; judge berbayar hanya lewat submit --confirm --budget-usd setelah izin.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { answerToc, evalAnswer, evalHash, resolveEvalSource, searchText } from "@surau/core";
import { JAWAB_EDITION_ID, createAnthropic, createGatewayAnthropic } from "@surau/llm";
import type { Route } from "@surau/llm";
import { z } from "zod";
import { loadCorpusIndex } from "./corpus.ts";
import { openCorpus } from "./open-corpus.ts";
import {
  answerRecord,
  judgeRecord,
  loadAnswerQuestions,
  readJsonl,
  verifyRecord,
} from "./answer-data.ts";
import type { AnswerRecord } from "./answer-data.ts";
import { scoreAnswer, validateQuestion } from "./answer-metrics.ts";
import {
  JUDGE_VERSION,
  assertJudgeBudget,
  assertJudgePublic,
  collectJudge,
  estimateJudge,
  judgePlanHash,
  judgeRequest,
} from "./answer-judge.ts";
import {
  emptyRoutes,
  isComplete,
  readSavedRoutes,
  readSemantic,
  replayCandidates,
  summarize,
} from "./answer-candidates.ts";
import type { SemanticOptions } from "./answer-candidates.ts";
import { replayHadith } from "./answer-hadith.ts";
import { answerReport } from "./answer-report.ts";
import { questionCeilingUsd, runQuestions, savedRoutesFor } from "./answer-run.ts";
import { approvedQuestions, reviewExport, seedSql } from "./answer-review.ts";

const repo = resolve(import.meta.dirname, "../../..");
const privateDir = join(repo, "evals/private/jawab-runs");
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: "string", default: "empty" },
    run: { type: "string" },
    input: { type: "string" },
    reviews: { type: "string" },
    judge: { type: "string" },
    reviewer: { type: "string", default: "Anas" },
    "publik-saja": { type: "boolean", default: false },
    "termasuk-privat": { type: "boolean", default: false },
    remote: { type: "boolean", default: false },
    "budget-usd": { type: "string" },
    confirm: { type: "boolean", default: false },
    gateway: { type: "boolean", default: false },
    concurrency: { type: "string", default: "3" },
    only: { type: "string" },
    "privat-saja": { type: "boolean", default: false },
    rute: { type: "string" },
    "tanpa-rute": { type: "boolean", default: false },
    semantik: { type: "string" },
    "makna-k": { type: "string" },
    "makna-bobot": { type: "string" },
  },
});
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/u);
const required = (s: string | undefined, label: string) => {
  if (!s) throw new Error(`${label} wajib diberikan.`);
  return s;
};
const output = (file: string, content: string) => {
  writeFileSync(file, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return file;
};
const jsonl = (rows: unknown[]) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
function client() {
  if (existsSync(join(repo, ".env"))) process.loadEnvFile(join(repo, ".env"));
  return createAnthropic(required(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"), {
    maxRetries: 0,
  });
}
async function records() {
  const result = readJsonl(resolve(required(values.input, "--input")), answerRecord);
  if (
    !result.length ||
    result.length > 100 ||
    new Set(result.map((r) => r.id)).size !== result.length
  )
    throw new Error("Arsip kosong, lebih dari 100 jawaban, atau ID ganda.");
  for (const r of result) await verifyRecord(r);
  return result;
}
async function withCorpus<T>(
  fn: (
    corpus: Awaited<ReturnType<typeof openCorpus>>,
    index: Awaited<ReturnType<typeof loadCorpusIndex>>,
  ) => Promise<T>,
) {
  const corpus = await openCorpus(repo, values.remote);
  try {
    return await fn(corpus, await loadCorpusIndex(corpus.db));
  } finally {
    await corpus.dispose();
  }
}
async function main() {
  const command = positionals[0];
  mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  if (command === "baseline") {
    const mode = z.enum(["empty", "search"]).parse(values.mode);
    const run = id.parse(values.run ?? `${new Date().toISOString().slice(0, 10)}-${mode}`);
    const out = join(privateDir, `${run}.jsonl`);
    if (existsSync(out)) throw new Error("Run sudah ada; pilih --run baru agar arsip tetap utuh.");
    await withCorpus(async (corpus, index) => {
      const all: AnswerRecord[] = [];
      const scored = [];
      for (const { question, private: privateSet } of loadAnswerQuestions(
        repo,
        values["publik-saja"],
      )) {
        await validateQuestion(corpus.db, index, question, privateSet);
        const started = performance.now();
        const hits =
          mode === "search"
            ? (await searchText(corpus.db, question.kueri, { limit: 10 })).results
                .flatMap((p) => p.hits.slice(0, 1))
                .slice(0, 10)
            : [];
        const answer = evalAnswer.parse({
          mode,
          text:
            mode === "empty"
              ? ""
              : "Hasil pencarian saja; belum ada jawaban yang merangkum sumber.",
          refused: false,
          citations: hits.map((h) => ({
            passage_id: h.id,
            char_start: h.snippet.char_start,
            char_end: h.snippet.char_end,
          })),
          hadith: [],
          model: "none",
          prompt_version: `baseline-${mode}-v1`,
          latency_ms: performance.now() - started,
          cost_usd: 0,
        });
        const record = answerRecord.parse({
          id: `${run}_${question.id}`,
          run_id: run,
          private: privateSet,
          corpus_version: index.meta.corpus_version,
          question,
          answer,
          question_hash: await evalHash(question),
          answer_hash: await evalHash(answer),
          created_at: new Date().toISOString(),
        });
        all.push(record);
        scored.push({
          record,
          scores: await scoreAnswer(corpus.db, index, question, answer, privateSet),
        });
      }
      output(out, jsonl(all));
      const report = join(repo, "evals/reports", `jawab-${run}.md`);
      output(report, answerReport(scored, [], [], values.reviewer));
      console.log(
        `Baseline ${mode}: ${all.length} soal; biaya $0. Laporan ${report}. Arsip privat ${out}.`,
      );
      const holdout = all.filter((r) => r.private).length;
      if (holdout > 0)
        console.warn(
          `Arsip ini memuat ${holdout} soal holdout privat: judge-plan menolaknya. Untuk judge, buat arsip dengan --publik-saja.`,
        );
    });
    return;
  }
  if (command === "answer") {
    // Berbayar (S19): pipeline Jawab yang sama dengan Worker surau-api. Bawaan hanya soal publik;
    // holdout hanya dengan --termasuk-privat (izin pemilik + catatan salinan di evals/README.md).
    const run = id.parse(required(values.run, "--run"));
    const out = join(privateDir, `${run}.jsonl`);
    if (existsSync(out)) throw new Error("Run sudah ada; pilih --run baru agar arsip tetap utuh.");
    const budget = Number(values["budget-usd"]);
    if (!Number.isFinite(budget) || budget <= 0 || budget > 3)
      throw new Error("--budget-usd wajib (0 < pagu ≤ 3, izin pemilik S19).");
    const ceiling = questionCeilingUsd();
    if (values["privat-saja"] && !values["termasuk-privat"])
      throw new Error("--privat-saja hanya bersama --termasuk-privat (izin pemilik).");
    // X13: set privat hanya dimuat bila diminta, jadi run publik tidak butuh salinan holdout lokal.
    let items = loadAnswerQuestions(repo, !values["termasuk-privat"])
      .filter((q) => !q.private || values["termasuk-privat"])
      .filter((q) => q.private || !values["privat-saja"]);
    if (values.only) {
      const wanted = new Set(values.only.split(","));
      items = items.filter((q) => wanted.has(q.question.id));
    }
    // X05: `--rute <diagnostik>` memakai ulang rute routing arsip publik (tanpa panggilan
    // routing), jadi dokumen sama dengan run itu dan selisih hasil hanya dari tahap jawaban.
    let routes: Map<string, Route | null> | undefined;
    if (values.rute) {
      if (values["termasuk-privat"])
        throw new Error("--rute hanya untuk soal publik (arsip diagnostik tanpa holdout).");
      routes = savedRoutesFor(items, readSavedRoutes(resolve(values.rute)));
    }
    // X13: `--semantik <peringkat>` = daftar makna dari berkas (arsip berakhiran +makna-berkas).
    const semantic = values.semantik
      ? readSemantic(resolve(values.semantik), { allowPrivate: values["termasuk-privat"] })
      : undefined;
    if (!values.confirm) {
      console.log(
        JSON.stringify({
          run,
          questions: items.length,
          private: items.filter((q) => q.private).length,
          saved_routes: routes !== undefined,
          semantic_file: semantic !== undefined,
          ceiling_per_question_usd: Number(ceiling.haiku.toFixed(4)),
          sonnet_reserve_usd: Number(ceiling.sonnetReserve.toFixed(4)),
          note: "Belum ada panggilan berbayar; tambahkan --confirm setelah izin pemilik.",
        }),
      );
      return;
    }
    if (existsSync(join(repo, ".env"))) process.loadEnvFile(join(repo, ".env"));
    const api = values.gateway
      ? createGatewayAnthropic(
          process.env.SURAU_AI_GATEWAY_URL ??
            "https://gateway.ai.cloudflare.com/v1/8be116534f7237b451f28adec91fbbbd/surau-gw/anthropic",
          required(process.env.CF_AIG_TOKEN, "CF_AIG_TOKEN"),
          { maxRetries: 1 },
        )
      : createAnthropic(required(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"), {
          maxRetries: 1,
        });
    await withCorpus(async (corpus, index) => {
      for (const q of items) await validateQuestion(corpus.db, index, q.question, q.private);
      // Setiap jawaban langsung disimpan (privat) supaya biaya tidak hilang bila run terputus.
      const partial = join(privateDir, `${run}-sebagian.jsonl`);
      if (existsSync(partial))
        throw new Error("Berkas sebagian run ini sudah ada; pilih --run baru.");
      const { outputs, spent, skipped, failed } = await runQuestions(corpus.db, api, items, {
        budgetUsd: budget,
        concurrency: Math.min(6, Math.max(1, Number(values.concurrency) || 1)),
        ...(routes ? { routes } : {}),
        ...(semantic ? { semantic } : {}),
        onError: (item, error) =>
          console.error(
            `${item.private ? "(privat)" : item.question.id} GAGAL: ${error instanceof Error ? error.name : "galat"}`,
          ),
        onDone: (o, total) => {
          appendFileSync(
            partial,
            `${JSON.stringify({ id: o.item.question.id, private: o.item.private, answer: o.answer, cost_usd: o.result.cost_usd })}\n`,
            { mode: 0o600 },
          );
          // Soal privat tidak dicetak per soal (aturan holdout).
          if (!o.item.private)
            console.log(
              `${o.item.question.id} ${o.result.outcome}${o.result.reason ? `/${o.result.reason}` : ""} sitasi ${o.result.citations.length} $${o.result.cost_usd.toFixed(5)} (total $${total.toFixed(4)})`,
            );
        },
      });
      const order = new Map(items.map((q, i) => [q.question.id, i]));
      outputs.sort((a, b) => order.get(a.item.question.id)! - order.get(b.item.question.id)!);
      const all: AnswerRecord[] = [];
      const scored = [];
      const diagnostics = [];
      for (const o of outputs) {
        const record = answerRecord.parse({
          id: `${run}_${o.item.question.id}`,
          run_id: run,
          private: o.item.private,
          corpus_version: index.meta.corpus_version,
          question: o.item.question,
          answer: o.answer,
          question_hash: await evalHash(o.item.question),
          answer_hash: await evalHash(o.answer),
          created_at: new Date().toISOString(),
        });
        all.push(record);
        const scores = await scoreAnswer(
          corpus.db,
          index,
          o.item.question,
          o.answer,
          o.item.private,
        );
        scored.push({ record, scores });
        if (!o.item.private)
          diagnostics.push({
            id: o.item.question.id,
            jenis: o.item.question.jenis,
            outcome: o.result.outcome,
            reason: o.result.reason,
            model: o.result.model,
            cost_usd: o.result.cost_usd,
            latency_ms: Math.round(o.result.latency_ms),
            usage: o.result.usage,
            diagnostics: o.result.diagnostics,
            // Blok + sitasinya (privat, soal publik saja): audit klaim status hadits yang ditulis
            // bebas (bersitasi matan atau takhrij), yang tidak terlihat dari teks gabungan (S21).
            blocks: o.result.blocks,
            citations: o.result.citations.map((c) => ({
              n: c.n,
              passage_id: c.passage_id,
              kind: c.kind,
            })),
            scores,
          });
      }
      output(out, jsonl(all));
      output(join(privateDir, `${run}-diagnostik-publik.jsonl`), jsonl(diagnostics));
      const report = join(repo, "evals/reports", `jawab-${run}.md`);
      output(report, answerReport(scored, [], [], values.reviewer));
      const n = outputs.length;
      console.log(
        JSON.stringify({
          run,
          answered: n,
          skipped_budget: skipped,
          failed,
          private: outputs.filter((o) => o.item.private).length,
          saved_routes: values.rute ?? null,
          semantic_file: values.semantik ?? null,
          spent_usd: Number(spent.toFixed(6)),
          avg_usd: n ? Number((spent / n).toFixed(6)) : null,
          report,
          archive: out,
        }),
      );
    });
    return;
  }
  if (command === "kandidat") {
    // Gratis (tanpa LLM): ulang pencarian kandidat atas rute tersimpan satu run atau lebih, atau
    // tanpa rute (`--tanpa-rute`: pertanyaan + ringkasan saja, untuk mesin tanpa arsip). X13:
    // `--semantik` menambah daftar makna dari berkas peringkat (`--makna-k`, `--makna-bobot`).
    if (values["tanpa-rute"] === (values.input !== undefined))
      throw new Error("Pilih salah satu: --input DIAGNOSTIK atau --tanpa-rute.");
    const files = values["tanpa-rute"] ? ["(tanpa rute)"] : values.input!.split(",");
    const questions = new Map(
      loadAnswerQuestions(repo, true).map(({ question }) => [question.id, question]),
    );
    const positive = (s: string | undefined, label: string) => {
      if (s === undefined) return undefined;
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} harus angka > 0.`);
      return n;
    };
    const limit = positive(values["makna-k"], "--makna-k");
    if (limit !== undefined && !Number.isInteger(limit))
      throw new Error("--makna-k harus bilangan bulat ≥ 1.");
    const weight = positive(values["makna-bobot"], "--makna-bobot");
    if (!values.semantik && (limit !== undefined || weight !== undefined))
      throw new Error("--makna-k/--makna-bobot butuh --semantik.");
    const semantic: SemanticOptions | undefined = values.semantik
      ? {
          ranks: readSemantic(resolve(values.semantik)),
          ...(limit === undefined ? {} : { limit }),
          ...(weight === undefined ? {} : { weight }),
        }
      : undefined;
    await withCorpus(async (corpus, index) => {
      const toc = new Map(
        (await answerToc(corpus.db, JAWAB_EDITION_ID)).map((n) => [n.id, n] as const),
      );
      const perQuestion = new Map<string, { complete: number; runs: number }>();
      for (const file of files) {
        const rows = await replayCandidates(
          corpus.db,
          index,
          toc,
          questions,
          values["tanpa-rute"] ? emptyRoutes(questions.values()) : readSavedRoutes(resolve(file)),
          semantic,
        );
        for (const r of rows) {
          const q = perQuestion.get(r.id) ?? { complete: 0, runs: 0 };
          q.runs++;
          if (isComplete(r)) q.complete++;
          perQuestion.set(r.id, q);
        }
        console.log(
          JSON.stringify({
            input: file,
            corpus: index.meta.corpus_version,
            semantik: semantic
              ? { k: semantic.limit ?? null, bobot: semantic.weight ?? null }
              : null,
            ...summarize(rows),
          }),
        );
      }
      // Soal yang lokasi gold-nya tidak lengkap di dokumen pada minimal satu rute.
      const misses = [...perQuestion]
        .filter(([, q]) => q.complete < q.runs)
        .map(([id, q]) => `${id} ${q.complete}/${q.runs}`);
      console.log(`Belum lengkap: ${misses.join(", ") || "tidak ada"}`);
    });
    return;
  }
  if (command === "hadits") {
    // Gratis (tanpa LLM): ulang pascaproses status hadits atas arsip run publik (X06).
    const run = id.parse(required(values.run, "--run"));
    const questions = new Map(
      loadAnswerQuestions(repo, true).map(({ question }) => [question.id, question]),
    );
    await withCorpus(async (corpus, index) => {
      const rows = await replayHadith(
        corpus.db,
        index,
        questions,
        join(privateDir, `${run}-diagnostik-publik.jsonl`),
        join(privateDir, `${run}.jsonl`),
      );
      const sum = (k: "passed" | "total" | "claims" | "extra" | "labeled") =>
        rows.reduce((n, r) => n + r[k], 0);
      for (const r of rows.filter((x) => x.total > 0))
        console.log(`${r.id} takhrij ${r.passed}/${r.total} klaim ${r.claims}`);
      console.log(
        JSON.stringify({
          run,
          takhrij: `${sum("passed")}/${sum("total")}`,
          claims: sum("claims"),
          claims_outside_gold: sum("extra"),
          statements_labeled: sum("labeled"),
          unresolved: rows.filter((r) => r.unresolved).length,
          answers_changed: rows.filter((r) => r.changed).length,
        }),
      );
    });
    return;
  }
  if (command === "golden") {
    const exports = readJsonl(resolve(required(values.reviews, "--reviews")), reviewExport);
    const selected = await approvedQuestions(exports, values.reviewer);
    const name = id.parse(required(values.run, "--run"));
    for (const privateSet of [false, true])
      output(
        join(privateDir, `${name}-golden-${privateSet ? "privat" : "publik"}.jsonl`),
        jsonl(selected.filter((r) => r.private === privateSet).map((r) => r.question)),
      );
    console.log(
      `Golden: ${selected.length} soal disetujui. Kedua file berada di folder privat; tinjau sebelum menyalin set publik ke evals/jawab.`,
    );
    return;
  }
  if (command === "seed") {
    const rows = await records();
    const file = join(privateDir, `${id.parse(required(values.run, "--run"))}-seed.sql`);
    output(file, await seedSql(rows));
    console.log(`SQL aditif: ${rows.length} jawaban; ${file}. Belum dieksekusi.`);
    return;
  }
  if (command === "score") {
    const rows = await records();
    const judges = values.judge ? readJsonl(resolve(values.judge), judgeRecord) : [];
    const reviews = values.reviews ? readJsonl(resolve(values.reviews), reviewExport) : [];
    await withCorpus(async (corpus, index) => {
      const scored = [];
      for (const record of rows) {
        if (index.meta.corpus_version !== record.corpus_version)
          throw new Error("Versi korpus arsip berbeda.");
        await validateQuestion(corpus.db, index, record.question, record.private);
        scored.push({
          record,
          scores: await scoreAnswer(
            corpus.db,
            index,
            record.question,
            record.answer,
            record.private,
          ),
        });
      }
      const file = join(
        repo,
        "evals/reports",
        `jawab-${id.parse(required(values.run, "--run"))}.md`,
      );
      output(file, answerReport(scored, judges, reviews, values.reviewer));
      console.log(`Laporan: ${file}`);
    });
    return;
  }
  if (command === "judge-plan") {
    const rows = await records();
    assertJudgePublic(rows, values["termasuk-privat"]);
    const run = id.parse(required(values.run, "--run"));
    await withCorpus(async (corpus, index) => {
      const requests = [];
      for (const r of rows) {
        if (index.meta.corpus_version !== r.corpus_version)
          throw new Error("Versi korpus arsip berbeda.");
        const sources = await validateQuestion(corpus.db, index, r.question, r.private);
        const citations = await Promise.all(
          r.answer.citations.map((s) => resolveEvalSource(corpus.db, s)),
        );
        requests.push(
          judgeRequest(
            r,
            sources,
            citations.filter((s) => s !== null),
          ),
        );
      }
      const estimate = await estimateJudge(client(), requests);
      const plan = {
        version: JUDGE_VERSION,
        records: rows,
        requests,
        hash: await judgePlanHash(requests),
        estimate,
      };
      output(join(privateDir, `${run}-plan.json`), JSON.stringify(plan));
      console.log(
        JSON.stringify({
          run,
          requests: requests.length,
          ...estimate,
          note: "countTokens gratis; belum mengirim batch berbayar",
        }),
      );
    });
    return;
  }
  if (command === "judge-submit" || command === "judge-collect") {
    const run = id.parse(required(values.run, "--run"));
    const plan = JSON.parse(readFileSync(join(privateDir, `${run}-plan.json`), "utf8")) as {
      version: string;
      records: AnswerRecord[];
      requests: ReturnType<typeof judgeRequest>[];
      hash: string;
      estimate: { ceiling_usd: number };
    };
    if (plan.version !== JUDGE_VERSION || (await judgePlanHash(plan.requests)) !== plan.hash)
      throw new Error("Plan berubah atau versinya lama; buat plan baru.");
    for (const r of plan.records) await verifyRecord(answerRecord.parse(r));
    if (command === "judge-submit") assertJudgePublic(plan.records, values["termasuk-privat"]);
    const receiptFile = join(privateDir, `${run}-batch.json`);
    if (command === "judge-submit") {
      const rebuilt = await withCorpus(async (corpus, index) => {
        const requests = [];
        for (const r of plan.records) {
          if (index.meta.corpus_version !== r.corpus_version)
            throw new Error("Versi korpus plan berubah.");
          const sources = await validateQuestion(corpus.db, index, r.question, r.private);
          const citations = await Promise.all(
            r.answer.citations.map((s) => resolveEvalSource(corpus.db, s)),
          );
          requests.push(
            judgeRequest(
              r,
              sources,
              citations.filter((s) => s !== null),
            ),
          );
        }
        return requests;
      });
      if ((await judgePlanHash(rebuilt)) !== plan.hash)
        throw new Error("Request tidak cocok dengan record dan sumber saat ini; buat plan baru.");
      if (existsSync(receiptFile))
        throw new Error(
          "Ada catatan pengiriman; jangan kirim ulang. Periksa status batch di Anthropic.",
        );
      const api = client();
      const estimate = await estimateJudge(api, plan.requests);
      assertJudgeBudget(estimate.ceiling_usd, Number(values["budget-usd"]), values.confirm);
      const records_hash = await evalHash(plan.records);
      // Simpan sebelum request: timeout/putus jaringan tidak boleh memicu tagihan duplikat otomatis.
      output(
        receiptFile,
        JSON.stringify({ status: "submitting", plan_hash: plan.hash, records_hash, estimate }),
      );
      const batch = await api.messages.batches.create({ requests: plan.requests });
      writeFileSync(
        receiptFile,
        JSON.stringify({
          status: "submitted",
          batch_id: batch.id,
          plan_hash: plan.hash,
          records_hash,
          estimate,
        }),
        { mode: 0o600 },
      );
      console.log(
        `Batch dikirim: ${batch.id}; batas estimasi $${estimate.ceiling_usd.toFixed(4)}. Jalankan judge-collect setelah selesai.`,
      );
    } else {
      const receipt = JSON.parse(readFileSync(receiptFile, "utf8")) as {
        batch_id?: string;
        plan_hash: string;
        records_hash: string;
      };
      if (
        receipt.plan_hash !== plan.hash ||
        receipt.records_hash !== (await evalHash(plan.records))
      )
        throw new Error("Manifest batch atau snapshot jawaban berbeda.");
      const collected = await collectJudge(
        client(),
        required(receipt.batch_id, "batch_id (rekonsiliasi pengiriman)"),
        plan.records,
      );
      output(join(privateDir, `${run}-judge.jsonl`), jsonl(collected.results));
      output(
        join(privateDir, `${run}-cost.json`),
        JSON.stringify({ cost_usd: collected.cost_usd }),
      );
      console.log(
        `Judge: ${collected.results.filter((r) => r.scores !== null).length}/${collected.results.length} valid; biaya $${collected.cost_usd.toFixed(6)}.`,
      );
    }
    return;
  }
  console.log(
    "eval:jawab baseline --mode empty|search [--run ID] [--publik-saja]\nkandidat --input DIAGNOSTIK[,DIAGNOSTIK…] | --tanpa-rute [--semantik PERINGKAT [--makna-k N] [--makna-bobot W]] (gratis; soal publik)\nhadits --run ID (gratis; ulang status hadits atas arsip publik)\nanswer --run ID --budget-usd USD [--confirm] [--termasuk-privat [--privat-saja]] [--gateway] [--only j001,j002] [--rute DIAGNOSTIK] [--semantik PERINGKAT] (berbayar, izin pemilik)\nscore --input ARSIP --run ID [--judge HASIL --reviews EKSPOR --reviewer NAMA]\nseed --input ARSIP --run ID\ngolden --reviews EKSPOR --reviewer NAMA --run ID\njudge-plan --input ARSIP --run ID [--termasuk-privat] (gratis; arsip privat ditolak)\njudge-submit --run ID --budget-usd USD --confirm [--termasuk-privat] (berbayar, perlu izin pemilik)\njudge-collect --run ID",
  );
}
try {
  await main();
} catch (error) {
  // Jangan cetak body API, input Zod, source stack, atau isi soal privat.
  console.error(
    error instanceof z.ZodError
      ? "Input tidak valid; rincian disembunyikan."
      : error instanceof Error && error.constructor === Error
        ? error.message
        : "Eval gagal; rincian privat tidak dicetak. Periksa konfigurasi atau manifest lokal.",
  );
  process.exitCode = 1;
}
