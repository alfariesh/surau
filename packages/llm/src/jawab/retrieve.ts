// Kandidat dokumen Jawab (S19): `searchText` (BM25 Arab + RRF Indonesia, S11/S14) atas pertanyaan
// dan kueri routing, global dan di bagian pilihan routing, lalu digabung Reciprocal Rank Fusion.
// Catatan kaki takhrij yang dirujuk paragraf terpilih ikut, dan paragraf badan yang dirujuk
// catatan kaki terpilih ikut, supaya hadits dan takhrijnya selalu berpasangan.
import { InvalidQuery, isCoreError, searchText } from "@surau/core";
import type { AnswerPassage, SearchView } from "@surau/core";
import type { D1Db } from "@surau/db";

import { QUERY_MAX_CHARS } from "./route.ts";
import type { Route } from "./route.ts";

export const RRF_K = 60;
/** Halaman per pencarian global / per bagian. */
const GLOBAL_LIMIT = 10;
const SECTION_LIMIT = 5;
/** Kandidat paragraf maksimal sebelum dipangkas anggaran token. */
export const MAX_CANDIDATES = 60;

export interface SearchList {
  query: string;
  section_id: number | null;
  passage_ids: number[];
}

/** Pertanyaan dipotong di batas kata supaya lolos batas panjang `searchText`. */
export function questionQuery(question: string): string {
  const q = question.replaceAll(/\s+/gu, " ").trim();
  if (q.length <= QUERY_MAX_CHARS) return q;
  const cut = q.lastIndexOf(" ", QUERY_MAX_CHARS);
  return q.slice(0, cut > 0 ? cut : QUERY_MAX_CHARS);
}

function rankedIds(view: SearchView): number[] {
  const hits = view.results.flatMap((p) => p.hits);
  // Peringkat per paragraf (skor tertinggi dulu); tanpa skor (hasil tak berperingkat) = urutan kitab.
  return hits
    .map((h, i) => ({ id: h.id, score: h.score ?? -i }))
    .sort((a, b) => b.score - a.score)
    .map((h) => h.id);
}

async function safeSearch(
  db: D1Db,
  query: string,
  opts: { section_id?: number; limit: number },
): Promise<SearchView | null> {
  try {
    return await searchText(db, query, opts);
  } catch (error) {
    // Kueri buatan model yang salah bentuk, atau bagian yang hilang, tidak menggagalkan jawaban.
    if (error instanceof InvalidQuery || (isCoreError(error) && error.code === "not_found"))
      return null;
    throw error;
  }
}

/** Jalankan semua pencarian (paralel). Kueri routing Arab maupun Indonesia diperlakukan sama. */
export async function searchLists(
  db: D1Db,
  question: string,
  route: Route | null,
): Promise<SearchList[]> {
  const plans: { query: string; section_id: number | null; limit: number }[] = [
    { query: questionQuery(question), section_id: null, limit: GLOBAL_LIMIT },
  ];
  for (const q of route?.queries ?? [])
    plans.push({ query: q, section_id: null, limit: GLOBAL_LIMIT });
  for (const s of route?.sections ?? [])
    for (const q of (route?.queries ?? []).slice(0, 2))
      plans.push({ query: q, section_id: s, limit: SECTION_LIMIT });
  const views = await Promise.all(
    plans.map((p) =>
      safeSearch(db, p.query, {
        limit: p.limit,
        ...(p.section_id === null ? {} : { section_id: p.section_id }),
      }),
    ),
  );
  return plans.flatMap((p, i) => {
    const view = views[i];
    return view ? [{ query: p.query, section_id: p.section_id, passage_ids: rankedIds(view) }] : [];
  });
}

/** Gabungan RRF: skor paragraf = Σ 1/(k + peringkat) atas semua daftar. */
export function fuse(lists: readonly SearchList[], k = RRF_K): number[] {
  const score = new Map<number, number>();
  for (const list of lists)
    list.passage_ids.forEach((id, rank) =>
      score.set(id, (score.get(id) ?? 0) + 1 / (k + rank + 1)),
    );
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, MAX_CANDIDATES)
    .map(([id]) => id);
}

/**
 * Susun urutan dokumen: setiap paragraf diikuti pasangannya (catatan kaki takhrij untuk paragraf
 * badan; paragraf badan yang merujuk untuk catatan kaki), tanpa duplikat.
 */
export function withPairs(
  ranked: readonly number[],
  passages: ReadonlyMap<number, AnswerPassage>,
): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const add = (id: number) => {
    if (!seen.has(id) && passages.has(id)) {
      seen.add(id);
      out.push(id);
    }
  };
  for (const id of ranked) {
    const p = passages.get(id);
    if (p === undefined) continue;
    if (p.kind === "foot") {
      for (const body of p.referenced_by) add(body);
      add(id);
    } else {
      add(id);
      for (const f of p.footnote_ids) add(f);
    }
  }
  return out;
}

/** ID pasangan yang perlu dimuat tambahan untuk `withPairs`. */
export function pairIds(passages: readonly AnswerPassage[]): number[] {
  return passages.flatMap((p) => (p.kind === "foot" ? p.referenced_by : p.footnote_ids));
}
