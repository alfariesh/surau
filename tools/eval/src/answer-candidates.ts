// Pengukuran gratis kandidat Jawab (sisipan X03): langkah 2 pipeline (`jawabCandidates`, tanpa
// LLM) diulang atas rute routing yang tersimpan di arsip `*-diagnostik-publik.jsonl`, lalu dihitung
// "semua lokasi gold ada di dokumen". Rute yang sama dipakai ulang, jadi selisih antar-versi kode
// hanya berasal dari pencarian/penggabungan, bukan dari variasi routing antar-run.
import { readFileSync } from "node:fs";
import type { AnswerTocNode, EvalQuestion } from "@surau/core";
import type { D1Db } from "@surau/db";
import { JAWAB_EDITION_ID, jawabCandidates } from "@surau/llm";
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
  diagnostics: z.object({
    route: savedRoute,
    provider_error: z.object({ stage: z.string() }).nullable().optional(),
  }),
});

export interface SavedRoute {
  id: string;
  route: Route | null;
  /** Routing run itu gagal karena galat penyedia (rute `null` bukan keluaran routing). */
  routeFailed: boolean;
}

/** Rute tersimpan satu run. Hanya soal publik (`j…`): arsip diagnostik tidak memuat holdout. */
export function readSavedRoutes(file: string): SavedRoute[] {
  return readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .map((s, i) => {
      const parsed = diagnosticRow.safeParse(JSON.parse(s));
      if (!parsed.success) throw new Error(`Baris ${i + 1} bukan diagnostik soal publik.`);
      return {
        id: parsed.data.id,
        route: parsed.data.diagnostics.route,
        routeFailed: parsed.data.diagnostics.provider_error?.stage === "route",
      };
    });
}

export interface DocCoverage {
  /** Lokasi gold yang terwakili minimal satu dokumen. */
  found: number;
  total: number;
}

/**
 * Lokasi gold yang muncul di dokumen (halaman, atau bagian beserta turunannya). Untuk soal status
 * hadits, catatan kaki takhrij gold juga harus ada di dokumen sebagai paragraf itu sendiri
 * (X13): cakupan tingkat halaman melebihkan j024, yang halamannya terwakili takhrij hadits lain.
 */
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
  const footnotes = [...new Set(q.hadits.map((h) => h.footnote.passage_id))];
  const footFound = footnotes.filter((id) => docs.some((d) => d.passage.id === id)).length;
  return { found: found + footFound, total: golds.length + footnotes.length };
}

/** Rute kosong untuk setiap soal publik (tanpa arsip diagnostik: pertanyaan + ringkasan saja). */
export function emptyRoutes(questions: Iterable<EvalQuestion>): SavedRoute[] {
  return [...questions]
    .filter((q) => /^j[0-9]{3}$/u.test(q.id))
    .map((q) => ({ id: q.id, route: null, routeFailed: false }));
}

const semanticRow = z.object({
  id: z.string().regex(/^[jp][0-9]{3}$/u),
  passage_ids: z.array(z.number().int().positive()).max(200),
});

/**
 * Peringkat pencarian makna per soal (X13): JSONL `{id, passage_ids}`, dihasilkan di luar pipeline
 * (embedding lokal atau indeks vektor). Soal privat (`p…`) hanya diterima dengan
 * `allowPrivate` (run holdout berbayar atas izin pemilik); `kandidat` hanya soal publik.
 */
export function readSemantic(
  file: string,
  opts: { allowPrivate?: boolean } = {},
): Map<string, number[]> {
  const out = new Map<string, number[]>();
  readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .forEach((s, i) => {
      let row: unknown;
      try {
        row = JSON.parse(s);
      } catch {
        // Galat bawaan JSON.parse mencetak potongan baris (bisa berisi ID soal privat).
        throw new Error(`Baris ${i + 1} bukan peringkat makna soal publik.`);
      }
      const parsed = semanticRow.safeParse(row);
      if (!parsed.success || (!opts.allowPrivate && parsed.data.id.startsWith("p")))
        throw new Error(`Baris ${i + 1} bukan peringkat makna soal publik.`);
      out.set(parsed.data.id, parsed.data.passage_ids);
    });
  return out;
}

export interface SemanticOptions {
  ranks: ReadonlyMap<string, readonly number[]>;
  limit?: number;
  weight?: number;
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
  semantic?: SemanticOptions,
): Promise<CandidateRow[]> {
  const out: CandidateRow[] = [];
  for (const saved of routes) {
    const q = questions.get(saved.id);
    if (q === undefined) throw new Error(`${saved.id}: soal publik tidak ada di evals/jawab.`);
    if (q.wajib_ditolak) continue;
    const ids = semantic?.ranks.get(q.id);
    if (semantic && ids === undefined) throw new Error(`${q.id}: tidak ada peringkat makna.`);
    const found = await jawabCandidates(db, q.pertanyaan, saved.route, toc, JAWAB_EDITION_ID, {
      ids: ids ?? [],
      ...(semantic?.limit === undefined ? {} : { limit: semantic.limit }),
      ...(semantic?.weight === undefined ? {} : { weight: semantic.weight }),
    });
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
