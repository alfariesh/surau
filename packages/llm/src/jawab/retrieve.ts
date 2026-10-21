// Kandidat dokumen Jawab (S19, sisipan X03): `searchText` (BM25 Arab + RRF Indonesia, S11/S14) atas
// pertanyaan dan kueri routing, global dan di bagian pilihan routing, plus pertanyaan di bagian yang
// ringkasan AI-nya cocok (routing kedua, tanpa LLM), lalu digabung Reciprocal Rank Fusion berbobot.
// Catatan kaki takhrij yang dirujuk paragraf terpilih ikut, dan paragraf badan yang dirujuk
// catatan kaki terpilih ikut, supaya hadits dan takhrijnya selalu berpasangan.
import {
  InvalidQuery,
  isCoreError,
  queryWordOverflow,
  searchSummarySections,
  searchText,
} from "@surau/core";
import type { AnswerPassage, SearchView } from "@surau/core";
import type { D1Db } from "@surau/db";

import { QUERY_MAX_CHARS, ROUTE_MAX_SECTIONS } from "./route.ts";
import type { Route } from "./route.ts";

export const RRF_K = 60;
/** Halaman per pencarian global / per bagian. */
const GLOBAL_LIMIT = 10;
/**
 * X03 (ADR-067): 3 halaman, bukan 5. Daftar bagian pilihan routing yang keliru tidak lagi
 * membanjiri gabungan, dan cakupan gold di dokumen naik (uji gratis atas rute tersimpan).
 */
export const SECTION_LIMIT = 3;
/**
 * Bobot RRF daftar pertanyaan global (X03, ADR-067). Satu daftar pertanyaan melawan hingga 19
 * daftar routing; dengan bobot 1, paragraf yang hanya ditemukan pertanyaan (peringkat 2–8) jatuh ke
 * peringkat 30–54 gabungan dan terpangkas anggaran dokumen.
 */
export const QUESTION_WEIGHT = 3;
/**
 * Bagian tambahan dari ringkasan AI bagian (routing kedua, X03): dicari dengan pertanyaan saja,
 * hanya bila sisa jatah pencarian masih ada sesudah rencana routing.
 */
export const SUMMARY_SECTIONS = 3;
/** Kandidat paragraf maksimal sebelum dipangkas anggaran token. */
export const MAX_CANDIDATES = 60;
/** Batas pencarian per pertanyaan (beban D1). */
export const MAX_SEARCHES = 20;

export interface SearchList {
  query: string;
  section_id: number | null;
  passage_ids: number[];
  /** Bobot RRF (bawaan 1). */
  weight?: number;
}

/** Satu pencarian yang direncanakan (`weight` 1 kecuali daftar pertanyaan global). */
export interface PlannedSearch {
  query: string;
  section_id: number | null;
  limit: number;
  weight: number;
}

const SCRIPT = { arabic: /\p{Script=Arabic}/u, latin: /[\p{Script=Latin}0-9]/u } as const;

/**
 * Kueri dipotong di batas kata supaya lolos batas `searchText`: panjang (200 karakter), lalu jumlah
 * kata per aksara (`queryWordOverflow`: 16 kata Indonesia sesudah kata fungsi dibuang, 32 token
 * Arab). Yang dibuang kata terakhir dari aksara yang meluap, jadi kutipan Arab panjang tidak
 * menghabiskan kata Indonesia. Tanpa ini pertanyaan panjang ditolak `InvalidQuery` dan semua
 * daftar pertanyaan hilang diam-diam (X03).
 */
export function questionQuery(question: string): string {
  let q = question.replaceAll(/\s+/gu, " ").trim();
  if (q.length > QUERY_MAX_CHARS) {
    const cut = q.lastIndexOf(" ", QUERY_MAX_CHARS);
    q = q.slice(0, cut > 0 ? cut : QUERY_MAX_CHARS);
  }
  for (let over = queryWordOverflow(q); over !== null; over = queryWordOverflow(q)) {
    const words = q.split(" ");
    const script = SCRIPT[over];
    const last = words.findLastIndex((w) => script.test(w));
    if (last < 0) return "";
    words.splice(last, 1);
    q = words.join(" ");
  }
  return q;
}

function rankedIds(view: SearchView): number[] {
  // Hasil tak berperingkat (semua kata sangat umum) = urutan kitab, bukan relevansi: dilewati.
  if (!view.ranked) return [];
  const hits = view.results.flatMap((p) => p.hits);
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

/**
 * Rencana routing (murni, urut prioritas, unik, ≤ `MAX_SEARCHES`): pertanyaan global berbobot
 * `QUESTION_WEIGHT`, kueri routing global, lalu di setiap bagian pilihan routing pertanyaan + 3
 * kueri pertama. `q` = hasil `questionQuery`; kueri kosong dilewati.
 */
export function routePlans(q: string, route: Route | null): PlannedSearch[] {
  const queries = (route?.queries ?? []).map(questionQuery);
  const planned = new Map<string, PlannedSearch>();
  const add = (query: string, section_id: number | null, limit: number, weight = 1) => {
    const key = `${section_id ?? ""}|${query}`;
    if (query !== "" && !planned.has(key) && planned.size < MAX_SEARCHES)
      planned.set(key, { query, section_id, limit, weight });
  };
  add(q, null, GLOBAL_LIMIT, QUESTION_WEIGHT);
  for (const rq of queries) add(rq, null, GLOBAL_LIMIT);
  for (const s of route?.sections ?? []) {
    add(q, s, SECTION_LIMIT);
    for (const rq of queries.slice(0, 3)) add(rq, s, SECTION_LIMIT);
  }
  return [...planned.values()];
}

/**
 * Rencana bagian dari ringkasan (murni): pertanyaan saja di ≤ `SUMMARY_SECTIONS` bagian teratas
 * yang bukan pilihan routing, sebanyak sisa jatah sesudah `used` pencarian routing.
 */
export function summaryPlans(
  q: string,
  sections: readonly number[],
  route: Route | null,
  used: number,
): PlannedSearch[] {
  if (q === "") return [];
  const chosen = new Set(route?.sections ?? []);
  return [...new Set(sections)]
    .filter((id) => !chosen.has(id))
    .slice(0, Math.max(0, Math.min(SUMMARY_SECTIONS, MAX_SEARCHES - used)))
    .map((s) => ({ query: q, section_id: s, limit: SECTION_LIMIT, weight: 1 }));
}

async function safeSections(db: D1Db, query: string, editionId: number): Promise<number[]> {
  try {
    // Cukup banyak supaya tetap ada `SUMMARY_SECTIONS` sesudah bagian routing disaring.
    return await searchSummarySections(db, query, {
      edition_id: editionId,
      limit: SUMMARY_SECTIONS + ROUTE_MAX_SECTIONS,
    });
  } catch (error) {
    if (error instanceof InvalidQuery) return [];
    throw error;
  }
}

/**
 * Jalankan semua pencarian (paralel). Kueri routing Arab maupun Indonesia diperlakukan sama.
 * Bagian dari ringkasan AI dicari bersamaan dengan rencana routing, lalu pencarian di bagian itu
 * langsung menyusul tanpa menunggu pencarian routing selesai. Bila rencana routing sudah memakai
 * seluruh jatah, ringkasan tidak dicari sama sekali.
 */
export async function searchLists(
  db: D1Db,
  question: string,
  route: Route | null,
  editionId: number,
): Promise<SearchList[]> {
  const q = questionQuery(question);
  const run = (plans: readonly PlannedSearch[]) =>
    Promise.all(
      plans.map((p) =>
        safeSearch(db, p.query, {
          limit: p.limit,
          ...(p.section_id === null ? {} : { section_id: p.section_id }),
        }),
      ),
    );
  const first = routePlans(q, route);
  const more =
    q === "" || first.length >= MAX_SEARCHES
      ? Promise.resolve({ plans: [] as PlannedSearch[], views: [] as (SearchView | null)[] })
      : safeSections(db, q, editionId).then(async (sections) => {
          const plans = summaryPlans(q, sections, route, first.length);
          return { plans, views: await run(plans) };
        });
  const [firstViews, extra] = await Promise.all([run(first), more]);
  const plans = [...first, ...extra.plans];
  const views = [...firstViews, ...extra.views];
  return plans.flatMap((p, i) => {
    const view = views[i];
    return view
      ? [
          {
            query: p.query,
            section_id: p.section_id,
            passage_ids: rankedIds(view),
            ...(p.weight === 1 ? {} : { weight: p.weight }),
          },
        ]
      : [];
  });
}

/** Gabungan RRF berbobot: skor paragraf = Σ bobot/(k + peringkat) atas semua daftar. */
export function fuse(lists: readonly SearchList[], k = RRF_K): number[] {
  const score = new Map<number, number>();
  for (const list of lists) {
    const weight = list.weight ?? 1;
    list.passage_ids.forEach((id, rank) =>
      score.set(id, (score.get(id) ?? 0) + weight / (k + rank + 1)),
    );
  }
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
