// Pengukuran gratis kandidat Jawab (sisipan X03): langkah 2 pipeline (`jawabCandidates`, tanpa
// LLM) diulang atas rute routing yang tersimpan di arsip `*-diagnostik-publik.jsonl`, lalu dihitung
// "semua lokasi gold ada di dokumen". Rute yang sama dipakai ulang, jadi selisih antar-versi kode
// hanya berasal dari pencarian/penggabungan, bukan dari variasi routing antar-run.
import { readFileSync } from "node:fs";
import type { AnswerTocNode, EvalQuestion } from "@surau/core";
import type { D1Db } from "@surau/db";
import { jawabCandidates } from "@surau/llm";
import type { AnswerDoc, Route } from "@surau/llm";
import { z } from "zod";

import type { CorpusIndex } from "./corpus.ts";
import { resolveLocation } from "./corpus.ts";
import { matchesLocation } from "./metrics.ts";

const savedRoute = z
  .object({
    sections: z.array(z.number().int()),
    queries: z.array(z.string()),
    hadith: z.boolean(),
  })
  .nullable();
const diagnosticRow = z.object({
  id: z.string().regex(/^j[0-9]{3}$/u),
  diagnostics: z.object({ route: savedRoute }),
});

export interface SavedRoute {
  id: string;
  route: Route | null;
}

/** Rute tersimpan satu run. Hanya soal publik (`j…`): arsip diagnostik tidak memuat holdout. */
export function readSavedRoutes(file: string): SavedRoute[] {
  return readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .map((s, i) => {
      const parsed = diagnosticRow.safeParse(JSON.parse(s));
      if (!parsed.success) throw new Error(`Baris ${i + 1} bukan diagnostik soal publik.`);
      return { id: parsed.data.id, route: parsed.data.diagnostics.route };
    });
}

export interface DocCoverage {
  /** Lokasi gold yang terwakili minimal satu dokumen. */
  found: number;
  total: number;
}

/** Lokasi gold yang muncul di dokumen (halaman, atau bagian beserta turunannya). */
export function docCoverage(
  index: CorpusIndex,
  q: EvalQuestion,
  docs: readonly AnswerDoc[],
): DocCoverage {
  const golds = q.lokasi_benar.map((l) => resolveLocation(index, l, { id: q.id, set: "publik" }));
  const found = golds.filter((g) =>
    docs.some((d) =>
      matchesLocation(
        {
          pageId: d.passage.page_id,
          tocNodeIds: d.passage.toc_node_id === null ? [] : [d.passage.toc_node_id],
        },
        g,
      ),
    ),
  ).length;
  return { found, total: golds.length };
}

export interface CandidateRow {
  id: string;
  jenis: string;
  found: number;
  total: number;
  docs: number;
  doc_tokens: number;
  searches: number;
}

/** Ulang kandidat untuk setiap rute tersimpan yang soalnya tidak wajib ditolak. */
export async function replayCandidates(
  db: D1Db,
  index: CorpusIndex,
  toc: ReadonlyMap<number, AnswerTocNode>,
  questions: ReadonlyMap<string, EvalQuestion>,
  routes: readonly SavedRoute[],
): Promise<CandidateRow[]> {
  const out: CandidateRow[] = [];
  for (const saved of routes) {
    const q = questions.get(saved.id);
    if (q === undefined) throw new Error(`${saved.id}: soal publik tidak ada di evals/jawab.`);
    if (q.wajib_ditolak) continue;
    const found = await jawabCandidates(db, q.pertanyaan, saved.route, toc);
    const cov = docCoverage(index, q, found.docs);
    out.push({
      id: q.id,
      jenis: q.jenis,
      ...cov,
      docs: found.docs.length,
      doc_tokens: found.docs.reduce((n, d) => n + d.tokens, 0),
      searches: found.lists.length,
    });
  }
  return out;
}

/** Lengkap = soal punya lokasi gold dan semuanya ada di dokumen. */
export const isComplete = (r: Pick<CandidateRow, "found" | "total">) =>
  r.total > 0 && r.found === r.total;

/** Ringkasan satu run: soal yang semua lokasi gold-nya ada di dokumen, total dan per jenis. */
export function summarize(rows: readonly CandidateRow[]) {
  const byJenis: Record<string, { complete: number; n: number }> = {};
  for (const r of rows) {
    const j = (byJenis[r.jenis] ??= { complete: 0, n: 0 });
    j.n++;
    if (isComplete(r)) j.complete++;
  }
  return {
    complete: rows.filter(isComplete).length,
    n: rows.length,
    by_jenis: byJenis,
    avg_docs: rows.length ? rows.reduce((s, r) => s + r.docs, 0) / rows.length : 0,
    avg_doc_tokens: rows.length ? rows.reduce((s, r) => s + r.doc_tokens, 0) / rows.length : 0,
    max_searches: Math.max(0, ...rows.map((r) => r.searches)),
  };
}
