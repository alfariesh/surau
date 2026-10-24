// Ulang status hadits gratis (X06, ADR-069): `hadithCheck` versi kode sekarang dijalankan atas blok
// akhir + sitasi yang tersimpan di arsip run berbayar (soal publik saja, tanpa LLM), lalu dinilai
// dengan metrik "Takhrij" yang sama dengan `scoreAnswer`. Mengukur dampak pascaproses status hadits
// atas keluaran model yang sama; blok arsip sudah melewati pascaproses versi run itu.
import { readFileSync } from "node:fs";
import { answerPassages, evalAnswer } from "@surau/core";
import type { EvalQuestion } from "@surau/core";
import type { D1Db } from "@surau/db";
import { hadithCheck } from "@surau/llm";
import type { JawabBlock, JawabCitation } from "@surau/llm";
import { z } from "zod";

import type { CorpusIndex } from "./corpus.ts";
import { scoreAnswer } from "./answer-metrics.ts";

const diagnosticRow = z.object({
  id: z.string().regex(/^j[0-9]{3}$/u),
  outcome: z.string(),
  blocks: z.array(z.object({ text: z.string(), citations: z.array(z.number()) })),
  citations: z.array(
    z.object({ n: z.number(), passage_id: z.number(), kind: z.enum(["body", "foot"]) }),
  ),
});
const archiveRow = z.object({
  private: z.boolean(),
  question: z.object({ id: z.string() }).passthrough(),
  answer: z
    .object({
      citations: z.array(
        z.object({ passage_id: z.number(), char_start: z.number(), char_end: z.number() }),
      ),
    })
    .passthrough(),
});

const readRows = <T>(file: string, schema: z.ZodType<T>): T[] =>
  readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .map((s, i) => {
      const parsed = schema.safeParse(JSON.parse(s));
      if (!parsed.success) throw new Error(`Baris ${i + 1} tidak sesuai (arsip tanpa blok?).`);
      return parsed.data;
    });

export interface HadithReplay {
  id: string;
  /** Hadits gold yang lolos / jumlah hadits gold. */
  passed: number;
  total: number;
  claims: number;
  extra: number;
  labeled: number;
  unresolved: boolean;
  /** Teks jawaban berubah oleh pascaproses versi sekarang. */
  changed: boolean;
}

/** Ulang `hadithCheck` atas arsip run (diagnostik publik + arsip jawaban). */
export async function replayHadith(
  db: D1Db,
  index: CorpusIndex,
  questions: ReadonlyMap<string, EvalQuestion>,
  diagnosticFile: string,
  archiveFile: string,
): Promise<HadithReplay[]> {
  const archive = new Map(
    readRows(archiveFile, archiveRow)
      .filter((r) => !r.private)
      .map((r) => [r.question.id, r]),
  );
  const out: HadithReplay[] = [];
  for (const d of readRows(diagnosticFile, diagnosticRow)) {
    const q = questions.get(d.id);
    const rec = archive.get(d.id);
    if (q === undefined || rec === undefined) throw new Error(`${d.id}: soal/arsip tidak ada.`);
    // Hasil yang turun ke Cari menyimpan hasil Cari sebagai sitasi arsip: tidak ada klaim status.
    if (d.outcome === "fallback") continue;
    // Arsip menyimpan sitasi berurutan nomor; rentangnya ada di arsip jawaban (urutan sama).
    const spans = rec.answer.citations;
    if (spans.length !== d.citations.length) throw new Error(`${d.id}: jumlah sitasi berbeda.`);
    const citations: JawabCitation[] = d.citations.map((c, i) => {
      const s = spans[i]!;
      if (s.passage_id !== c.passage_id) throw new Error(`${d.id}: urutan sitasi berbeda.`);
      return { ...c, char_start: s.char_start, char_end: s.char_end, label: "", permalink: "" };
    });
    const cited = await answerPassages(db, [...new Set(citations.map((c) => c.passage_id))]);
    const owners = await answerPassages(
      db,
      cited.flatMap((p) => p.referenced_by),
    );
    const passages = new Map([...cited, ...owners].map((p) => [p.id, p]));
    const blocks: JawabBlock[] = d.blocks;
    const checked = hadithCheck(blocks, citations, passages);
    const answer = evalAnswer.parse({
      mode: "answer",
      text:
        checked.blocks
          .map((b) => b.text)
          .join("")
          .trim()
          .slice(0, 20_000) || "-",
      refused: false,
      citations: checked.citations.map(({ passage_id, char_start, char_end }) => ({
        passage_id,
        char_start,
        char_end,
      })),
      hadith: checked.claims.slice(0, 20).map(({ passage_id, footnote, status }) => ({
        passage_id,
        footnote,
        status,
      })),
      model: "ulang",
      prompt_version: "ulang-hadits",
      latency_ms: 0,
      cost_usd: 0,
    });
    const scores = await scoreAnswer(db, index, q, answer, false);
    out.push({
      id: d.id,
      passed: scores.hadith.passed,
      total: scores.hadith.total,
      claims: checked.claims.length,
      extra: scores.hadithExtra,
      labeled: checked.labeled,
      unresolved: checked.unresolved,
      changed: checked.blocks.map((b) => b.text).join("") !== blocks.map((b) => b.text).join(""),
    });
  }
  return out;
}
