// search_text (S11, S14; ADR-039, ADR-044). Bahasa kueri dideteksi dari hurufnya:
// - huruf Arab saja → jalur Arab: indeks `passage_fts` (S11), kueri disusun @surau/text
//   (normalisasi + stem + ekspansi klitik/kunyah) dan dikirim sebagai satu parameter terikat;
// - huruf Latin saja → jalur Indonesia: indeks terjemahan AI (`translation_fts`) dan ringkasan AI
//   (`summary_fts`), digabung dengan Reciprocal Rank Fusion (k = 60);
// - keduanya → ketiga jalur, digabung RRF.
// Hasil dikelompokkan per halaman cetak; setiap paragraf membawa sorotan dan potongan yang
// dipetakan ke `text_raw` (substring persis teks sumber), terjemahan AI-nya (berlabel), dan asal
// kecocokannya (`matched_by`). Satu bolak-balik D1 per pencarian.
import {
  FUSION_DEPTH,
  RRF_K,
  SUMMARY_DEPTH,
  passageAnchor,
  passageIdRange,
  searchCorpus,
  searchCorpusFused,
  tocNodeIdRange,
} from "@surau/db";
import type { D1Db, FusedSearchRow, SearchPassageRow } from "@surau/db";
import {
  FTS_MAX_TOKENS,
  LATIN_NORM_VERSION,
  NORM_VERSION,
  findLatinSpans,
  findPlanSpans,
  ftsMatchExpression,
  latinMatchExpression,
  planFtsQuery,
  planLatinQuery,
  snippetSpan,
} from "@surau/text";
import type { FtsQueryPlan, LatinQueryPlan } from "@surau/text";

import { ayahPlaceholderPattern } from "./ayah-placeholder.ts";
import { citeContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { InvalidQuery, NotFound, Unavailable, parseInput } from "./errors.ts";
import { sectionPermalink } from "./permalink.ts";
import { searchTextInput } from "./schema.ts";
import type {
  SearchHit,
  SearchMatch,
  SearchPage,
  SearchPath,
  SearchSummary,
  SearchTextInput,
  SearchTranslation,
  SearchView,
} from "./schema.ts";

/** Batas sorotan per paragraf (paragraf panjang bisa memuat kata yang sama puluhan kali). */
export const SEARCH_MAX_HIGHLIGHTS = 50;

/** Panjang potongan teks AI (terjemahan/ringkasan) di hasil pencarian. */
export const AI_SNIPPET_CHARS = 240;

/** Seluruh korpus: semua rowid paragraf/node (filter edisi memakai `passageIdRange`). */
const ALL_IDS = { min: 1, max: Number.MAX_SAFE_INTEGER };

const ARABIC_LETTERS = /\p{Script=Arabic}/gu;
const LATIN_LETTERS = /[\p{Script=Latin}0-9]/gu;

/**
 * Bagian Arab dan bagian Latin kueri. Huruf yang bukan miliknya diganti spasi, jadi
 * "الصبر sabar" → ("الصبر", "sabar"); tanda baca dibiarkan (keduanya membuangnya sendiri).
 */
export function splitQueryScripts(query: string): { arabic: string; latin: string } {
  return {
    arabic: query.replace(LATIN_LETTERS, " "),
    latin: query.replace(ARABIC_LETTERS, " "),
  };
}

// ── Sorotan dan potongan ───────────────────────────────────────────────────────────────────

interface Span {
  start: number;
  end: number;
}

/** Rentang placeholder ayat `⟦QS s:a⟧` di teks terjemahan. */
function placeholderSpans(text: string): Span[] {
  return [...text.matchAll(ayahPlaceholderPattern())].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
  }));
}

/**
 * Sorotan + potongan teks AI. Sorotan di dalam placeholder ayat dibuang (bukan teks model), dan
 * batas potongan yang jatuh di tengah placeholder digeser keluar supaya placeholder tetap utuh.
 */
export function aiExcerpt(text: string, plan: LatinQueryPlan | null) {
  const holders = placeholderSpans(text);
  const inside = (pos: number) => holders.find((h) => pos > h.start && pos < h.end);
  const spans =
    plan === null
      ? []
      : findLatinSpans(text, plan, SEARCH_MAX_HIGHLIGHTS).filter(
          (s) => !holders.some((h) => s.start >= h.start && s.end <= h.end),
        );
  const snip = snippetSpan(text, spans[0], AI_SNIPPET_CHARS);
  const start = inside(snip.start)?.start ?? snip.start;
  const end = inside(snip.end)?.end ?? snip.end;
  return {
    highlights: spans.map((s) => ({ char_start: s.start, char_end: s.end })),
    snippet: { char_start: start, char_end: end, text: text.slice(start, end) },
  };
}

function translationOf(
  row: SearchPassageRow,
  plan: LatinQueryPlan | null,
): SearchTranslation | null {
  if (
    row.tr_text === null ||
    row.tr_model === null ||
    row.tr_prompt === null ||
    row.tr_created === null ||
    row.tr_review === null
  ) {
    return null;
  }
  return {
    label: "ai_translation",
    lang: "id",
    model: row.tr_model,
    prompt_version: row.tr_prompt,
    created_at: row.tr_created,
    review_status: row.tr_review,
    ...aiExcerpt(row.tr_text, plan),
  };
}

function summaryOf(
  row: FusedSearchRow,
  cite: CiteContext,
  plan: LatinQueryPlan,
): SearchSummary | null {
  if (
    row.sm_node === null ||
    row.sm_title === null ||
    row.sm_level === null ||
    row.sm_text === null ||
    row.sm_model === null ||
    row.sm_prompt === null ||
    row.sm_created === null ||
    row.sm_review === null
  ) {
    return null;
  }
  return {
    label: "ai_summary",
    section: {
      id: row.sm_node,
      title_ar: row.sm_title,
      level: row.sm_level,
      permalink: sectionPermalink(cite.path, row.sm_node),
    },
    lang: "id",
    model: row.sm_model,
    prompt_version: row.sm_prompt,
    created_at: row.sm_created,
    review_status: row.sm_review,
    ...aiExcerpt(row.sm_text, plan),
  };
}

interface HitPlans {
  arabic: FtsQueryPlan | null;
  latin: LatinQueryPlan | null;
}

function hitFrom(
  row: SearchPassageRow,
  cite: CiteContext,
  plans: HitPlans,
  extra: Pick<SearchHit, "score" | "matched_by" | "summary">,
): SearchHit {
  const spans =
    plans.arabic === null ? [] : findPlanSpans(row.text_raw, plans.arabic, SEARCH_MAX_HIGHLIGHTS);
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
    score: extra.score,
    highlights: spans.map((s) => ({ char_start: s.start, char_end: s.end })),
    snippet: {
      char_start: snip.start,
      char_end: snip.end,
      text: row.text_raw.slice(snip.start, snip.end),
    },
    matched_by: extra.matched_by,
    translation: translationOf(row, plans.latin),
    summary: extra.summary,
  };
}

/** Rencana kueri Arab @surau/text; kueri lebih dari `FTS_MAX_TOKENS` kata → `InvalidQuery`. */
function arabicPlan(query: string, suffix: boolean): FtsQueryPlan | null {
  try {
    return planFtsQuery(query, { suffix });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidQuery(`Invalid query: at most ${FTS_MAX_TOKENS} words`);
    }
    throw error;
  }
}

/** Rencana kueri Indonesia; terlalu banyak kata → `InvalidQuery`. */
function latinPlan(query: string): LatinQueryPlan | null {
  try {
    return planLatinQuery(query);
  } catch (error) {
    if (error instanceof RangeError) throw new InvalidQuery(`Invalid query: ${error.message}`);
    throw error;
  }
}

/** Edisi dan bagian filter harus ada (dan bagian milik edisi itu bila keduanya diberikan). */
function assertScope(
  found: { editions: readonly unknown[]; section: { id: number; edition_id: number } | null },
  editionId: number | null,
  sectionId: number | null,
): void {
  if (editionId !== null && found.editions.length === 0) {
    throw new NotFound(`Edition not found: ${editionId}`);
  }
  if (
    sectionId !== null &&
    (found.section === null || (editionId !== null && found.section.edition_id !== editionId))
  ) {
    throw new NotFound(`Section not found: ${sectionId}`);
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

function fusedMatches(row: FusedSearchRow): SearchMatch[] {
  const out: SearchMatch[] = [];
  if (row.ar_rank !== null) out.push({ path: "arabic", rank: row.ar_rank, all_terms: true });
  if (row.tr_rank !== null) {
    out.push({ path: "translation", rank: row.tr_rank, all_terms: row.tr_all === 1 });
  }
  if (row.sm_rank !== null) {
    out.push({ path: "summary", rank: row.sm_rank, all_terms: row.sm_all === 1 });
  }
  return out;
}

/**
 * Cari di korpus. Kueri Arab boleh bervokal; satu kata Arab dicari beserta bentuk berklitiknya
 * (الصبر = صبر, والصبر, بالصبر …), lebih dari satu kata sebagai frasa berurutan. Kata Indonesia
 * dicari di terjemahan AI dan ringkasan AI: semua kata (setelah kata fungsi dibuang dan stem
 * ringan: kesabaran = sabar); bila hampir tidak ada yang memuat semuanya, yang memuat sebagian
 * kata menyusul (`matched_by[].all_terms = false`). Hasil = halaman cetak (terbaik dulu) dengan
 * paragraf cocok di halaman itu.
 *
 * - Kueri kosong setelah normalisasi (hanya tanda baca/harakat/kata fungsi) → hasil kosong, tanpa
 *   kueri DB.
 * - Kueri Arab saja yang setiap katanya sangat umum (`term_stat`, mis. الله) →
 *   `warning: "common_terms"`, `ranked: false`, dan hanya `limit` paragraf pertama dalam urutan
 *   kitab (pengaman beban, ADR-039). Pada kueri campuran, bagian Arab itu tidak dicari
 *   (`common_terms_ignored`).
 * - `InvalidQuery`: kueri/opsi salah bentuk; `NotFound`: edisi tidak ada; `Unavailable`: korpus
 *   tanpa indeks yang dibutuhkan (Arab: skema < 4; Indonesia: skema < 6) atau indeks dengan versi
 *   normalisasi lain.
 */
export async function searchText(
  db: D1Db,
  query: string,
  opts: Omit<SearchTextInput, "query"> = {},
): Promise<SearchView> {
  const input = parseInput(searchTextInput, { ...opts, query }, InvalidQuery);
  const parts = splitQueryScripts(input.query);
  const arabic = arabicPlan(parts.arabic, input.expand);
  const latin = latinPlan(parts.latin);
  const editionId = input.edition_id ?? null;
  const sectionId = input.section_id ?? null;
  const base = {
    query: input.query,
    edition_id: editionId,
    section_id: sectionId,
    limit: input.limit,
    terms: arabic?.stems ?? [],
    latin_terms: latin?.stems ?? [],
  };
  const span = editionId === null ? ALL_IDS : passageIdRange(editionId);
  if (latin === null) {
    if (arabic !== null) return arabicOnly(db, input, arabic, base, span);
    return {
      ...base,
      paths: [],
      fusion: null,
      ranked: true,
      warning: null,
      common_terms: [],
      total_pages: 0,
      total_hits: 0,
      offset: input.offset,
      results: [],
    };
  }

  const found = await searchCorpusFused(db, {
    arabic: arabic === null ? null : { plan: arabic, match: ftsMatchExpression(arabic) },
    latin: {
      all: latinMatchExpression(latin, "all"),
      any: latin.stems.length > 1 ? latinMatchExpression(latin, "any") : null,
    },
    editionId,
    span,
    tocSpan: editionId === null ? ALL_IDS : tocNodeIdRange(editionId),
    sectionId,
    limit: input.limit,
    offset: input.offset,
  });
  if (!found.ready) {
    throw new Unavailable("Indonesian search is not available for this corpus version");
  }
  if (found.meta.latin_norm_version !== LATIN_NORM_VERSION) {
    throw new Unavailable(
      "Indonesian search index was built with a different normalization version",
    );
  }
  if (arabic !== null && found.meta.norm_version !== NORM_VERSION) {
    throw new Unavailable("Search index was built with a different normalization version");
  }
  assertScope(found, editionId, sectionId);
  const cites = new Map(found.editions.map((e) => [e.edition.id, citeContext(e)]));
  const paths: SearchPath[] =
    arabic === null ? ["translation", "summary"] : ["arabic", "translation", "summary"];
  const [first] = found.rows;
  const plans = { arabic: found.allCommon ? null : arabic, latin };
  return {
    ...base,
    paths,
    fusion: { method: "rrf", k: RRF_K, depth: FUSION_DEPTH, summary_depth: SUMMARY_DEPTH },
    ranked: true,
    warning: arabic !== null && found.allCommon ? "common_terms_ignored" : null,
    common_terms: found.common.map((t) => ({ term: t.term, passage_count: t.df })),
    total_pages: first?.total_pages ?? (input.offset === 0 ? 0 : null),
    total_hits: first?.total_hits ?? (input.offset === 0 ? 0 : null),
    offset: input.offset,
    results: groupByPage(
      found.rows,
      cites,
      (row, cite) =>
        hitFrom(row, cite, plans, {
          score: row.score,
          matched_by: fusedMatches(row),
          summary: summaryOf(row, cite, latin),
        }),
      (row) => row.page_best,
    ),
  };
}

/** Jalur Arab saja (S11): bm25 di `passage_fts`, pengaman kata umum. */
async function arabicOnly(
  db: D1Db,
  input: {
    query: string;
    offset: number;
    limit: number;
    edition_id?: number | undefined;
    section_id?: number | undefined;
  },
  plan: FtsQueryPlan,
  base: Pick<SearchView, "query" | "edition_id" | "section_id" | "limit" | "terms" | "latin_terms">,
  span: { min: number; max: number },
): Promise<SearchView> {
  const editionId = input.edition_id ?? null;
  const sectionId = input.section_id ?? null;
  const found = await searchCorpus(db, {
    plan,
    match: ftsMatchExpression(plan),
    editionId,
    span,
    sectionId,
    limit: input.limit,
    offset: input.offset,
  });
  if (!found.ready) throw new Unavailable("Search is not available for this corpus version");
  if (found.meta.norm_version !== NORM_VERSION) {
    throw new Unavailable("Search index was built with a different normalization version");
  }
  assertScope(found, editionId, sectionId);
  const cites = new Map(found.editions.map((e) => [e.edition.id, citeContext(e)]));
  const shared = {
    ...base,
    paths: ["arabic"] satisfies SearchPath[],
    fusion: null,
    common_terms: found.common.map((t) => ({ term: t.term, passage_count: t.df })),
  };
  const plans = { arabic: plan, latin: null };

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
              (row, cite) =>
                hitFrom(row, cite, plans, {
                  score: null,
                  matched_by: [{ path: "arabic", rank: null, all_terms: true }],
                  summary: null,
                }),
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
      (row, cite) =>
        hitFrom(row, cite, plans, {
          score: -row.score,
          matched_by: [{ path: "arabic", rank: row.passage_rank, all_terms: true }],
          summary: null,
        }),
      (row) => -row.page_best,
    ),
  };
}

/**
 * Kunci cache hasil pencarian (S14 langkah 8): rencana kueri TERNORMALISASI (bukan teks kueri),
 * opsi, dan versi aturan normalisasi. Dua kueri dengan rencana sama ("Sabar" dan "sabar",
 * "الصبر" dan "الصَّبْرُ") memberi hasil yang sama kecuali field `query`, yang diisi ulang
 * pemanggil. `null` bila kueri tidak sah atau kosong (tidak di-cache). Pemanggil menambahkan versi
 * korpus.
 */
export function searchCacheKey(
  query: string,
  opts: Omit<SearchTextInput, "query"> = {},
): string | null {
  const input = searchTextInput.safeParse({ ...opts, query });
  if (!input.success) return null;
  const parts = splitQueryScripts(input.data.query);
  let arabic: FtsQueryPlan | null;
  let latin: LatinQueryPlan | null;
  try {
    arabic = planFtsQuery(parts.arabic, { suffix: input.data.expand });
    latin = planLatinQuery(parts.latin);
  } catch {
    return null;
  }
  if (arabic === null && latin === null) return null;
  return JSON.stringify({
    v: [NORM_VERSION, LATIN_NORM_VERSION],
    ar: arabic === null ? null : [arabic.phrases, arabic.prefix],
    la: latin?.stems ?? null,
    e: input.data.edition_id ?? null,
    s: input.data.section_id ?? null,
    l: input.data.limit,
    o: input.data.offset,
  });
}
