import { describe, expect, test, vi } from "vite-plus/test";
import { evalAnswer, evalQuestion } from "@surau/core";
import type { Citation } from "@surau/core";
import type { D1Db } from "@surau/db";
import { aggregateAnswers, hasFatwaLanguage, metric, scoreAnswer } from "./answer-metrics.ts";
import { buildCorpusIndex } from "./corpus.ts";
import {
  assertJudgeBudget,
  assertJudgePublic,
  judgeRequest,
  JUDGE_VERSION,
} from "./answer-judge.ts";
import { answerReport } from "./answer-report.ts";
import { approvedQuestions, calibration, seedSql } from "./answer-review.ts";
import type { AnswerRecord } from "./answer-data.ts";
import { evalHash } from "@surau/core";
vi.mock("@surau/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@surau/core")>();
  return {
    ...actual,
    resolveEvalSource: vi.fn<typeof actual.resolveEvalSource>(async (_db, p) =>
      p.passage_id === 999
        ? null
        : {
            pointer: p,
            text: "fixture",
            page_id: p.passage_id,
            toc_node_id: null,
            citation: { label: "Fixture", permalink: "/fixture" } as Citation,
          },
    ),
  };
});
const db = {} as D1Db;
const index = buildCorpusIndex(
  [{ key: "corpus_version", value: "test" }],
  [
    { id: 1, edition_id: 1, juz: 1, page_no: 1 },
    { id: 2, edition_id: 1, juz: 1, page_no: 2 },
  ],
  [],
);
const span = { passage_id: 1, char_start: 0, char_end: 5 };
const q = evalQuestion.parse({
  id: "j001",
  pertanyaan: "Pertanyaan buatan",
  kueri: "buatan",
  jenis: "lokasi+isi",
  lokasi_benar: [{ page_id: 1, label: "j1 h1" }],
  poin_kunci: ["Kunci buatan"],
  sumber: [span],
  wajib_ditolak: false,
  hadits: [],
  catatan: "",
  disetujui_oleh: null,
});
const a = evalAnswer.parse({
  mode: "empty",
  text: "",
  refused: false,
  citations: [],
  hadith: [],
  model: "none",
  prompt_version: "test",
  latency_ms: 0,
  cost_usd: 0,
});
const record = (privateSet = false): AnswerRecord => ({
  id: "test_j001",
  run_id: "test",
  private: privateSet,
  corpus_version: "test",
  question: q,
  answer: a,
  answer_hash: "a".repeat(64),
  question_hash: "b".repeat(64),
  created_at: "2026-10-18T00:00:00.000Z",
});
describe("metrik Jawab", () => {
  test("tanpa sampel tetap null; kosong gagal lokasi dan penolakan", async () => {
    const scored = await scoreAnswer(db, index, q, a, false);
    expect(scored.quotes).toEqual(metric(0, 0));
    expect(scored.location.rate).toBe(0);
    expect(
      (await scoreAnswer(db, index, { ...q, wajib_ditolak: true }, a, false)).refusal.rate,
    ).toBe(0);
    expect(aggregateAnswers([]).quotes.rate).toBeNull();
  });
  test("kutipan tak ada gagal; semua lokasi topik tersebar wajib terwakili", async () => {
    const scores = await scoreAnswer(
      db,
      index,
      { ...q, lokasi_benar: [...q.lokasi_benar, { page_id: 2, label: "j1 h2" }] },
      { ...a, citations: [span, { ...span, passage_id: 999 }] },
      false,
    );
    expect(scores.quotes.rate).toBe(0.5);
    expect(scores.location.rate).toBe(0);
    expect(
      (await scoreAnswer(db, index, q, { ...a, citations: [span] }, false)).location.rate,
    ).toBe(1);
  });
  test("hadits wajib status dan pointer takhrij yang sesuai serta dikutip", async () => {
    const h = { passage_id: 3, footnote: span, status: "Sanad lemah" };
    const question = { ...q, hadits: [h] };
    expect((await scoreAnswer(db, index, question, { ...a, hadith: [h] }, false)).hadith.rate).toBe(
      0,
    );
    expect(
      (await scoreAnswer(db, index, question, { ...a, citations: [span], hadith: [h] }, false))
        .hadith.rate,
    ).toBe(1);
    expect(
      (
        await scoreAnswer(
          db,
          index,
          question,
          { ...a, citations: [span], hadith: [{ ...h, status: "Sahih" }] },
          false,
        )
      ).hadith.rate,
    ).toBe(0);
  });
  test("penolakan salah dan pola fatwa terdeteksi", async () => {
    expect(
      (await scoreAnswer(db, index, q, { ...a, text: "Tidak ditemukan.", refused: true }, false))
        .falseRefusal.rate,
    ).toBe(0);
    expect(hasFatwaLanguage("Hukumnya adalah wajib.")).toBe(true);
    expect(hasFatwaLanguage("Aku, al-Ghazali, mengatakan ini.")).toBe(true);
    expect(hasFatwaLanguage("Menurut al-Ghazali, bagian ini membahas ilmu.")).toBe(false);
  });
});
test("pagu wajib eksplisit dan tidak boleh melebihi izin", () => {
  for (const args of [
    [1, 2, false],
    [1, 0.5, true],
    [1, NaN, true],
  ] as const)
    expect(() => assertJudgeBudget(args[0], args[1], args[2])).toThrow(/Batch tidak dikirim/u);
  expect(() => assertJudgeBudget(1, 2, true)).not.toThrow();
});
test("judge tidak menerima identitas atau penilaian manusia", () => {
  const req = judgeRequest(
    { ...record(), question: { ...q, disetujui_oleh: "NAMA_RAHASIA" } },
    [],
    [],
  );
  expect(JSON.stringify(req)).not.toContain("NAMA_RAHASIA");
  expect(req.params.output_config.format.schema.additionalProperties).toBe(false);
});
test("laporan privat hanya agregat, judge lama ditolak, kalibrasi kosong jujur", async () => {
  const r = {
    ...record(true),
    question: { ...q, pertanyaan: "RAHASIA_PERTANYAAN", catatan: "RAHASIA_CATATAN" },
  };
  const rows = [{ record: r, scores: await scoreAnswer(db, index, q, a, true) }];
  const report = answerReport(rows, [], [], "Anas");
  expect(report).not.toContain("RAHASIA");
  expect(report).toContain("Belum terkalibrasi");
  expect(calibration([r], [], [], "Anas").faithfulness.rate).toBeNull();
  expect(() =>
    answerReport(
      rows,
      [
        {
          id: r.id,
          answer_hash: "wrong",
          question_hash: r.question_hash,
          corpus_version: "test",
          judge_version: JUDGE_VERSION,
          scores: null,
          error: "missing",
        },
      ],
      [],
      "Anas",
    ),
  ).toThrow(/Judge/u);
});
test("seed mengikat hash dan escaping SQL; arsip yang berubah ditolak", async () => {
  const r = { ...record(), question: { ...q, pertanyaan: "Pertanyaan 'buatan'" } };
  r.question_hash = await evalHash(r.question);
  r.answer_hash = await evalHash(r.answer);
  expect(await seedSql([r])).toContain("''buatan''");
  await expect(seedSql([{ ...r, answer: { ...a, text: "berubah" } }])).rejects.toThrow(/Hash/u);
});

test("klaim takhrij ganda tidak menutupi status salah", async () => {
  const h = { passage_id: 3, footnote: span, status: "Sanad lemah" };
  const score = await scoreAnswer(
    db,
    index,
    { ...q, hadits: [h] },
    { ...a, citations: [span], hadith: [h, { ...h, status: "Sahih" }] },
    false,
  );
  expect(score.hadith.rate).toBe(0);
});

test("golden menolak persetujuan lama yang bertentangan dan menjaga set privat", async () => {
  const r = record(true);
  r.question_hash = await evalHash(r.question);
  const exported = {
    id: r.id,
    run_id: r.run_id,
    question_id: q.id,
    question_hash: r.question_hash,
    answer_hash: r.answer_hash,
    corpus_version: r.corpus_version,
    prompt_version: a.prompt_version,
    model: a.model,
    private: 1 as const,
    question_json: JSON.stringify(q),
    answer_json: JSON.stringify(a),
    created_at: r.created_at,
    expires_at: "2027-10-18T00:00:00.000Z",
    reviews: [
      {
        answer_id: r.id,
        reviewer_name: "Anas",
        question_verdict: "approved" as const,
        verdict: null,
        language_score: null,
        faithfulness: null,
        attribution: null,
        reason: "Fixture",
        updated_at: r.created_at,
      },
    ],
  };
  expect(await approvedQuestions([exported], "Anas")).toMatchObject([
    { private: true, question: { disetujui_oleh: "Anas" } },
  ]);
  await expect(
    approvedQuestions(
      [
        exported,
        {
          ...exported,
          id: "next",
          reviews: [{ ...exported.reviews[0]!, question_verdict: "revise" }],
        },
      ],
      "Anas",
    ),
  ).rejects.toThrow(/bertentangan/u);
  expect(await approvedQuestions([exported], "Agent QA")).toEqual([]);
});

describe("judge tidak mengirim holdout privat (#69)", () => {
  test("arsip campur ditolak tanpa --termasuk-privat; arsip publik lolos", () => {
    const publik = [
      { private: false, question: { id: "j001" } },
      { private: false, question: { id: "j002" } },
    ];
    const campur = [...publik, { private: true, question: { id: "p001" } }];
    expect(() => assertJudgePublic(publik, false)).not.toThrow();
    expect(() => assertJudgePublic(campur, false)).toThrow(/1 jawaban holdout privat/);
    expect(() => assertJudgePublic(campur, true)).not.toThrow();
    // Flag tersunting: ID holdout tetap dikenali.
    const tersunting = [...publik, { private: false, question: { id: "p002" } }];
    expect(() => assertJudgePublic(tersunting, false)).toThrow(/1 jawaban holdout privat/);
  });
});
