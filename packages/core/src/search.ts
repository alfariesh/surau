// search_text (S11, ADR-039): pencarian Arab di indeks FTS5 `passage_fts`. Kueri disusun
// @surau/text (normalisasi + stem + ekspansi klitik/kunyah) dan dikirim sebagai satu parameter
// terikat. Hasil dikelompokkan per halaman cetak; setiap paragraf membawa sorotan dan potongan
// yang dipetakan ke `text_raw` (substring persis teks sumber, bukan teks normal atau buatan).
// Satu bolak-balik D1 (`searchCorpus`): konteks + hasil + teks dalam satu batch (ADR-039).
import { passageAnchor, passageIdRange, searchCorpus } from "@surau/db";
import type { D1Db, SearchPassageRow } from "@surau/db";
import {
  FTS_MAX_TOKENS,
  NORM_VERSION,
  findPlanSpans,
  ftsMatchExpression,
  planFtsQuery,
  snippetSpan,
} from "@surau/text";
import type { FtsQueryPlan } from "@surau/text";

import { citeContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { InvalidQuery, NotFound, Unavailable, parseInput } from "./errors.ts";
import { sectionPermalink } from "./permalink.ts";
import { searchTextInput } from "./schema.ts";
import type { SearchHit, SearchPage, SearchTextInput, SearchView } from "./schema.ts";

/** Batas sorotan per paragraf (paragraf panjang bisa memuat kata yang sama puluhan kali). */
export const SEARCH_MAX_HIGHLIGHTS = 50;

/** Seluruh korpus: semua rowid paragraf (filter edisi memakai `passageIdRange`). */
const ALL_PASSAGES = { min: 1, max: Number.MAX_SAFE_INTEGER };

function hitFrom(
  row: SearchPassageRow,
  cite: CiteContext,
  plan: FtsQueryPlan,
  score: number | null,
): SearchHit {
  const spans = findPlanSpans(row.text_raw, plan, SEARCH_MAX_HIGHLIGHTS);
  const snip = snippetSpan(row.text_raw, spans[0]);
  return {
    id: row.id,
    anchor: passageAnchor(row.id),
    kind: row.kind,
    ord: row.ord,
    toc_node_id: row.toc_node_id,
    section:
      row.toc_node_id === null || row.toc_title === null || row.toc_level === null
        ? null
        : {
            id: row.toc_node_id,
            title_ar: row.toc_title,
            level: row.toc_level,
            permalink: sectionPermalink(cite.path, row.toc_node_id),
          },
    location: cite.location(row.juz, row.page_no, row.id),
    score,
    highlights: spans.map((s) => ({ char_start: s.start, char_end: s.end })),
    snippet: {
      char_start: snip.start,
      char_end: snip.end,
      text: row.text_raw.slice(snip.start, snip.end),
    },
  };
}

/** Rencana kueri @surau/text; kueri lebih dari `FTS_MAX_TOKENS` kata → `InvalidQuery`. */
function queryPlan(query: string, suffix: boolean): FtsQueryPlan | null {
  try {
    return planFtsQuery(query, { suffix });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidQuery(`Invalid query: at most ${FTS_MAX_TOKENS} words`);
    }
    throw error;
  }
}

/** Kelompokkan baris (sudah urut) per halaman, mempertahankan urutan kemunculan halaman. */
function groupByPage<R extends SearchPassageRow>(
  rows: readonly R[],
  cites: ReadonlyMap<number, CiteContext>,
  toHit: (row: R, cite: CiteContext) => SearchHit,
  pageScore: (row: R) => number | null,
): SearchPage[] {
  const pages = new Map<number, SearchPage>();
  for (const row of rows) {
    const cite = cites.get(row.edition_id);
    if (cite === undefined) throw new Error(`konteks sitasi edisi ${row.edition_id} tidak dimuat`);
    let page = pages.get(row.page_id);
    if (page === undefined) {
      page = {
        citation: cite.citation(row.juz, row.page_no),
        score: pageScore(row),
        hit_count: 0,
        hits: [],
      };
      pages.set(row.page_id, page);
    }
    page.hits.push(toHit(row, cite));
    page.hit_count = page.hits.length;
  }
  return [...pages.values()];
}

/**
 * Cari teks Arab di korpus. Kueri boleh bervokal; satu kata dicari beserta bentuk berklitiknya
 * (الصبر = صبر, والصبر, بالصبر, وصبر …), lebih dari satu kata dicari sebagai frasa berurutan.
 * Hasil = halaman cetak (terbaik dulu) dengan semua paragraf cocok di halaman itu.
 *
 * - Kueri kosong setelah normalisasi (hanya tanda baca/harakat) → hasil kosong, tanpa kueri DB.
 * - Setiap kata kueri (termasuk bentuk berklitik dan awalan `expand`) mengenai kata sangat umum
 *   (`term_stat`, mis. الله) → `warning: "common_terms"`, `ranked: false`, dan hanya `limit`
 *   paragraf pertama dalam urutan kitab (pengaman beban, ADR-039).
 * - `InvalidQuery`: kueri/opsi salah bentuk; `NotFound`: edisi tidak ada; `Unavailable`: korpus
 *   tanpa indeks pencarian (skema < 4) atau indeks dengan `NORM_VERSION` lain.
 */
export async function searchText(
  db: D1Db,
  query: string,
  opts: Omit<SearchTextInput, "query"> = {},
): Promise<SearchView> {
  const input = parseInput(searchTextInput, { ...opts, query }, InvalidQuery);
  const plan = queryPlan(input.query, input.expand);
  const editionId = input.edition_id ?? null;
  const base = { query: input.query, edition_id: editionId, limit: input.limit };
  if (plan === null) {
    return {
      ...base,
      terms: [],
      ranked: true,
      warning: null,
      common_terms: [],
      total_pages: 0,
      total_hits: 0,
      offset: input.offset,
      results: [],
    };
  }

  const span = editionId === null ? ALL_PASSAGES : passageIdRange(editionId);
  const found = await searchCorpus(db, {
    plan,
    match: ftsMatchExpression(plan),
    editionId,
    span,
    limit: input.limit,
    offset: input.offset,
  });
  if (!found.ready) throw new Unavailable("Search is not available for this corpus version");
  if (found.meta.norm_version !== NORM_VERSION) {
    throw new Unavailable("Search index was built with a different normalization version");
  }
  if (editionId !== null && found.editions.length === 0) {
    throw new NotFound(`Edition not found: ${editionId}`);
  }
  const cites = new Map(found.editions.map((e) => [e.edition.id, citeContext(e)]));
  const shared = {
    ...base,
    terms: plan.stems,
    common_terms: found.common.map((t) => ({ term: t.term, passage_count: t.df })),
  };

  if (found.allCommon) {
    // Pengaman: tanpa bm25 (yang membaca seluruh daftar dokumen kata itu) dan tanpa halaman lanjut.
    return {
      ...shared,
      ranked: false,
      warning: "common_terms",
      total_pages: null,
      total_hits: null,
      offset: input.offset,
      results:
        input.offset > 0
          ? []
          : groupByPage(
              found.inOrder,
              cites,
              (row, cite) => hitFrom(row, cite, plan, null),
              () => null,
            ),
    };
  }

  const rows = found.ranked;
  const [first] = rows;
  return {
    ...shared,
    ranked: true,
    warning: null,
    // Halaman lewat akhir hasil: total tidak diketahui tanpa kueri tambahan (null), kecuali offset 0.
    total_pages: first?.total_pages ?? (input.offset === 0 ? 0 : null),
    total_hits: first?.total_hits ?? (input.offset === 0 ? 0 : null),
    offset: input.offset,
    results: groupByPage(
      rows,
      cites,
      // bm25 negatif (makin kecil makin cocok); keluaran memakai kebalikannya: makin besar makin cocok.
      (row, cite) => hitFrom(row, cite, plan, -row.score),
      (row) => -row.page_best,
    ),
  };
}
