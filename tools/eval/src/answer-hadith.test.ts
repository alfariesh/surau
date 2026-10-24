import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evalQuestion } from "@surau/core";
import type { AnswerPassage, Citation } from "@surau/core";
import type { D1Db } from "@surau/db";
import { describe, expect, onTestFinished, test, vi } from "vite-plus/test";

import { replayHadith } from "./answer-hadith.ts";
import { buildCorpusIndex } from "./corpus.ts";

// Takhrij BUATAN (bukan teks kitab): body 10 merujuk catatan kaki 11.
const FOOT = "حديث تجريبي رواه فلان بإسناد ضعيف";
const passage = (over: Partial<AnswerPassage>): AnswerPassage =>
  ({
    edition_id: 1,
    page_id: 1,
    toc_node_id: null,
    location: { juz: 1, page_no: 1, permalink: "/x", label: "Ihya, j. 1, h. 1" },
    translation: null,
    footnote_ids: [],
    referenced_by: [],
    ayah_labels: [],
    ...over,
  }) as AnswerPassage;
vi.mock("@surau/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@surau/core")>();
  return {
    ...actual,
    answerPassages: vi.fn<typeof actual.answerPassages>(async (_db, ids) =>
      ids.flatMap((id) =>
        id === 10
          ? [passage({ id: 10, kind: "body", text_raw: "نص", footnote_ids: [11] })]
          : id === 11
            ? [passage({ id: 11, kind: "foot", text_raw: FOOT, referenced_by: [10] })]
            : [],
      ),
    ),
    resolveEvalSource: vi.fn<typeof actual.resolveEvalSource>(async (_db, p) => ({
      pointer: p,
      text: "fixture",
      page_id: 1,
      toc_node_id: null,
      citation: { label: "Fixture", permalink: "/fixture" } as Citation,
    })),
  };
});
vi.mock("@surau/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@surau/db")>();
  return {
    ...actual,
    getPassageById: vi.fn<typeof actual.getPassageById>(async (_db, id) =>
      id === 11 ? ({ text_raw: FOOT } as never) : null,
    ),
  };
});

const db = {} as D1Db;
const index = buildCorpusIndex(
  [{ key: "corpus_version", value: "uji" }],
  [{ id: 1, edition_id: 1, juz: 1, page_no: 1 }],
  [],
);
const foot = { passage_id: 11, char_start: 0, char_end: FOOT.length };
const question = (id: string) =>
  evalQuestion.parse({
    id,
    pertanyaan: "Pertanyaan buatan",
    kueri: "buatan",
    jenis: "status hadits",
    lokasi_benar: [{ page_id: 1, label: "j1 h1" }],
    poin_kunci: ["Kunci buatan"],
    sumber: [foot],
    wajib_ditolak: false,
    hadits: [{ passage_id: 10, footnote: foot, status: "Sanad lemah" }],
    catatan: "",
    disetujui_oleh: null,
  });

function files(rows: { diag: unknown; archive: unknown }[]) {
  const dir = mkdtempSync(join(tmpdir(), "surau-hadits-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const d = join(dir, "d.jsonl");
  const a = join(dir, "a.jsonl");
  writeFileSync(d, rows.map((r) => JSON.stringify(r.diag)).join("\n"));
  writeFileSync(a, rows.map((r) => JSON.stringify(r.archive)).join("\n"));
  return [d, a] as const;
}

describe("replayHadith", () => {
  test("blok arsip → klaim struktur berlabel → metrik Takhrij; hasil fallback dilewati", async () => {
    const [d, a] = files([
      {
        diag: {
          id: "j024",
          outcome: "answer",
          blocks: [
            { text: "Status hadits: sahih", citations: [1] },
            { text: ".", citations: [] },
          ],
          citations: [{ n: 1, passage_id: 11, kind: "foot" }],
        },
        archive: { private: false, question: { id: "j024" }, answer: { citations: [foot] } },
      },
      {
        // Hasil yang turun ke Cari: sitasi arsip = hasil Cari, tidak dinilai.
        diag: { id: "j025", outcome: "fallback", blocks: [], citations: [] },
        archive: {
          private: false,
          question: { id: "j025" },
          answer: { citations: [{ passage_id: 99, char_start: 0, char_end: 5 }] },
        },
      },
    ]);
    const questions = new Map([
      ["j024", question("j024")],
      ["j025", question("j025")],
    ]);
    const rows = await replayHadith(db, index, questions, d, a);
    expect(rows).toEqual([
      {
        id: "j024",
        passed: 1,
        total: 1,
        claims: 1,
        extra: 0,
        labeled: 1,
        unresolved: false,
        changed: true,
      },
    ]);
  });

  test("urutan atau jumlah sitasi arsip yang tidak selaras ditolak", async () => {
    const [d, a] = files([
      {
        diag: {
          id: "j024",
          outcome: "answer",
          blocks: [{ text: "Status hadits: sahih.", citations: [1] }],
          citations: [{ n: 1, passage_id: 11, kind: "foot" }],
        },
        archive: { private: false, question: { id: "j024" }, answer: { citations: [] } },
      },
    ]);
    await expect(
      replayHadith(db, index, new Map([["j024", question("j024")]]), d, a),
    ).rejects.toThrow(/jumlah sitasi berbeda/u);
  });
});
