import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AnswerPassage, EvalQuestion } from "@surau/core";
import type { AnswerDoc } from "@surau/llm";
import { describe, expect, onTestFinished, test } from "vite-plus/test";

import { docCoverage, readSavedRoutes, summarize } from "./answer-candidates.ts";
import type { CandidateRow } from "./answer-candidates.ts";
import { buildCorpusIndex } from "./corpus.ts";

// Korpus buatan: jilid 1 halaman 1–3; bagian 10 (h1) dengan turunan 11 (h2).
const index = buildCorpusIndex(
  [{ key: "corpus_version", value: "uji-v1" }],
  [
    { id: 100001, edition_id: 1, juz: 1, page_no: 1 },
    { id: 100002, edition_id: 1, juz: 1, page_no: 2 },
    { id: 100003, edition_id: 1, juz: 1, page_no: 3 },
  ],
  [
    { id: 10, parent_id: null, start_page_id: 100001 },
    { id: 11, parent_id: 10, start_page_id: 100002 },
  ],
);

const doc = (page_id: number, toc_node_id: number | null): AnswerDoc => ({
  passage: { page_id, toc_node_id } as AnswerPassage,
  segments: [],
  context: "",
  tokens: 100,
});
const question = (lokasi: EvalQuestion["lokasi_benar"]): EvalQuestion =>
  ({ id: "j001", jenis: "topik tersebar", lokasi_benar: lokasi }) as EvalQuestion;

describe("docCoverage", () => {
  test("setiap lokasi gold dihitung sekali: halaman, atau bagian beserta turunannya", () => {
    const q = question([
      { page_id: 100003, label: "j1 h3" },
      { toc_node_id: 10, label: "j1 h1" },
    ]);
    expect(docCoverage(index, q, [doc(100002, 11)])).toEqual({ found: 1, total: 2 });
    expect(docCoverage(index, q, [doc(100002, 11), doc(100003, null)])).toEqual({
      found: 2,
      total: 2,
    });
    expect(docCoverage(index, q, [])).toEqual({ found: 0, total: 2 });
  });
});

describe("readSavedRoutes / summarize", () => {
  test("hanya diagnostik soal publik; rute null tetap dipakai", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-kandidat-"));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const ok = join(dir, "ok.jsonl");
    const route = { sections: [10], queries: ["sabar"], hadith: false };
    writeFileSync(
      ok,
      [
        JSON.stringify({ id: "j001", diagnostics: { route } }),
        JSON.stringify({ id: "j002", diagnostics: { route: null, provider_error: null } }),
        // Routing gagal karena galat penyedia: ditandai (X05: --rute menolaknya).
        JSON.stringify({
          id: "j003",
          diagnostics: { route: null, provider_error: { stage: "route", status: 529 } },
        }),
        JSON.stringify({
          id: "j004",
          diagnostics: { route, provider_error: { stage: "answer", status: null } },
        }),
      ].join("\n"),
    );
    expect(readSavedRoutes(ok)).toEqual([
      { id: "j001", route, routeFailed: false },
      { id: "j002", route: null, routeFailed: false },
      { id: "j003", route: null, routeFailed: true },
      { id: "j004", route, routeFailed: false },
    ]);
    const privat = join(dir, "privat.jsonl");
    writeFileSync(privat, JSON.stringify({ id: "p001", diagnostics: { route } }));
    expect(() => readSavedRoutes(privat)).toThrow(/bukan diagnostik soal publik/);
  });

  test("ringkasan: lengkap = semua lokasi gold ada, total dan per jenis", () => {
    const row = (id: string, jenis: string, found: number, total: number): CandidateRow => ({
      id,
      jenis,
      found,
      total,
      docs: 40,
      doc_tokens: 20_000,
      searches: 20,
    });
    expect(
      summarize([row("j001", "lokasi+isi", 1, 1), row("j018", "topik tersebar", 1, 2)]),
    ).toMatchObject({
      complete: 1,
      n: 2,
      by_jenis: { "lokasi+isi": { complete: 1, n: 1 }, "topik tersebar": { complete: 0, n: 1 } },
      avg_docs: 40,
      max_searches: 20,
    });
  });
});
