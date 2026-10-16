// Kontrak core tools: skema Zod untuk masukan dan keluaran. Bentuk keluaran ini akan menjadi
// kontrak MCP (S16), jadi perubahannya hanya boleh menambah field. Nama field snake_case
// (sama dengan kolom DB dan JSON MCP); deskripsi field berbahasa Inggris karena ikut ke JSON
// Schema tool MCP, sedangkan penjelasan berbahasa Indonesia ada di README paket.
//
// Prinsip: setiap teks adalah `text_raw` persis dari DB, dan setiap keluaran yang memuat teks
// atau letak membawa `Citation` lengkap (karya, edisi, juz, halaman, permalink, lisensi,
// atribusi). Paragraf membawa `location` (juz, halaman, permalink paragraf); sitasi penuh satu
// paragraf = `citation.source` keluaran itu + `location` paragraf (atau `buildCitation`).
import {
  EDITION_ID_MAX,
  attributionStatus,
  editionRow,
  needsReviewReason,
  passageKind,
} from "@surau/db";
import { z } from "zod";

const id = z.number().int().positive();
const juz = z.number().int().positive().describe("Printed volume (juz); single-volume works use 1");
const pageNo = z.number().int().nonnegative().describe("Printed page number in that volume");
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(64);

// ── Sitasi ───────────────────────────────────────────────────────────────────────────────

export const authorView = z.strictObject({
  name_ar: z.string(),
  name_id: z.string().nullable(),
  death_hijri: z.number().int().nullable(),
});
export type AuthorView = z.infer<typeof authorView>;

/** Sumber sebuah sitasi: karya, edisi, lisensi, dan atribusi (sama untuk satu edisi). */
export const citationSource = z
  .strictObject({
    work: z.strictObject({
      slug,
      title_ar: z.string(),
      title_id: z.string().nullable(),
      author: authorView.nullable(),
      attribution_status: attributionStatus,
    }),
    edition: z.strictObject({
      id,
      slug,
      is_default: z.boolean(),
      publisher: z.string().nullable(),
      city: z.string().nullable(),
    }),
    license: z.string().describe("License of the digital text, e.g. CC BY-NC-SA 4.0"),
    attribution: z.string().describe("Required attribution for the digital text and edition"),
  })
  .describe("Work, edition, license and attribution of a citation");
export type CitationSource = z.infer<typeof citationSource>;

/** Letak cetak + permalink + label ringkas. */
export const location = z
  .strictObject({
    juz,
    page_no: pageNo,
    permalink: z
      .string()
      .describe("Public permalink path (no origin), e.g. /kitab/ihya/1/200#p2824"),
    label: z.string().describe("Short citation label, e.g. \"Ihya' 'Ulum ad-Din, j. 1, h. 200\""),
  })
  .describe("Printed location of a page or passage");
export type Location = z.infer<typeof location>;

/** Sitasi lengkap = sumber + letak. */
export const citation = z
  .strictObject({ source: citationSource, ...location.shape })
  .describe("Full citation: work, edition, volume, page, permalink, license and attribution");
export type Citation = z.infer<typeof citation>;

// ── Paragraf ─────────────────────────────────────────────────────────────────────────────

/** Penanda catatan kaki `(١)` di `text_raw` paragraf badan, tertaut ke paragraf catatan kaki. */
export const footnoteRef = z.strictObject({
  marker: z.string().describe("Marker digit as printed, e.g. ١"),
  char_start: z
    .number()
    .int()
    .nonnegative()
    .describe("Start offset of the marker in text_raw (JS string index, inclusive)"),
  char_end: z.number().int().positive().describe("End offset (exclusive)"),
  footnote_id: id.describe("Passage id of the linked footnote (kind = foot, same page)"),
});
export type FootnoteRef = z.infer<typeof footnoteRef>;

export const passage = z.strictObject({
  id: id.describe("Stable passage id"),
  anchor: z.string().describe("Stable fragment anchor, e.g. p2824"),
  kind: passageKind.describe("body = main text, foot = footnote (takhrij for Ihya)"),
  ord: id.describe("Display order within the page and kind (not an anchor)"),
  toc_node_id: id.nullable(),
  text_raw: z.string().describe("Raw source text, verbatim from the database"),
  footnote_refs: z.array(footnoteRef).describe("Footnote markers in this passage (body only)"),
  needs_review: z
    .array(needsReviewReason)
    .describe("Ingest flags that this passage needs human review; not a review result"),
  location,
});
export type Passage = z.infer<typeof passage>;

// ── Halaman ──────────────────────────────────────────────────────────────────────────────

export const pageView = z.strictObject({
  citation,
  body: z.array(passage).describe("Main-text passages in display order"),
  footnotes: z.array(passage).describe("Footnote passages in display order"),
  prev: location.nullable().describe("Previous printed page in this edition"),
  next: location.nullable().describe("Next printed page in this edition"),
  source_url: z
    .string()
    .nullable()
    .describe(
      "The same page in the original digitization (e.g. shamela.ws), for attribution; null when unknown",
    ),
});
export type PageView = z.infer<typeof pageView>;

// ── Daftar isi ───────────────────────────────────────────────────────────────────────────

export const tocNodeRef = z.strictObject({
  id: id.describe("Stable table-of-contents node id"),
  title_ar: z.string(),
  level: id,
  permalink: z.string().describe("Section permalink path, e.g. /kitab/ihya/bab/100074"),
});
export type TocNodeRef = z.infer<typeof tocNodeRef>;

export type TocNode = TocNodeRef & {
  ord: number;
  start: Location;
  patched: boolean;
  child_count: number;
  children: TocNode[];
};

export const tocNode: z.ZodType<TocNode> = z.strictObject({
  ...tocNodeRef.shape,
  ord: z.number().int(),
  start: location.describe("Where the section starts"),
  patched: z.boolean().describe("Added or moved by an audited patch file, not by the source"),
  child_count: z.number().int().nonnegative(),
  get children() {
    return z
      .array(tocNode)
      .describe("Child nodes; empty when child_count = 0 or the depth limit was reached");
  },
});

export const tocView = z.strictObject({
  citation: citation.describe("Citation of where the first returned node starts"),
  ancestors: z.array(tocNodeRef).describe("Path from the root to the requested node's parent"),
  depth: z.number().int().positive(),
  nodes: z.array(tocNode),
});
export type TocView = z.infer<typeof tocView>;

// ── Bagian ───────────────────────────────────────────────────────────────────────────────

export const sectionView = z.strictObject({
  citation: citation.describe("Citation of the first page in this chunk"),
  node: z.strictObject({ ...tocNodeRef.shape, start: location }),
  ancestors: z.array(tocNodeRef),
  passages: z
    .array(passage)
    .describe(
      "Passages of the section and its subsections in reading order; per page, main text before footnotes. A printed page may span two chunks (split between paragraphs, never inside one), and each footnote stays in the chunk of the passage that first references it",
    ),
  estimated_tokens: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Estimated tokens of `passages` only (1 token ≈ 2 JSON characters); excludes citation, node and ancestors",
    ),
  next_cursor: z.string().nullable().describe("Pass to read the next chunk; null at the end"),
});
export type SectionView = z.infer<typeof sectionView>;

// ── Karya ────────────────────────────────────────────────────────────────────────────────

export const editionView = z.strictObject({
  id,
  slug,
  is_default: z.boolean(),
  source: editionRow.shape.source,
  source_ref: z.string(),
  publisher: z.string().nullable(),
  city: z.string().nullable(),
  volumes: z.number().int().nullable(),
  license: z.string(),
  attribution: z.string(),
  permalink: z.string(),
});
export type EditionView = z.infer<typeof editionView>;

export const workView = z.strictObject({
  slug,
  title_ar: z.string(),
  title_id: z.string().nullable(),
  author: authorView.nullable(),
  attribution_status: attributionStatus,
  original_language: z.string(),
  period: z.string().nullable(),
  openiti_uri: z.string().nullable(),
  editions: z.array(editionView).describe("Default edition first"),
});
export type WorkView = z.infer<typeof workView>;

export const workList = z.strictObject({ works: z.array(workView) });
export type WorkList = z.infer<typeof workList>;

// ── Pencarian (S11) ──────────────────────────────────────────────────────────────────────

/** Rentang di `text_raw`: indeks string JS, akhir eksklusif (sama dengan `footnote_refs`). */
export const textSpan = z
  .strictObject({
    char_start: z.number().int().nonnegative(),
    char_end: z.number().int().nonnegative(),
  })
  .describe("Span in the passage's text_raw (JS string index, end exclusive)");
export type TextSpan = z.infer<typeof textSpan>;

export const searchHit = z.strictObject({
  id: id.describe("Stable passage id"),
  anchor: z.string().describe("Stable fragment anchor, e.g. p2824"),
  kind: passageKind.describe("body = main text, foot = footnote (takhrij for Ihya)"),
  ord: id.describe("Display order within the page and kind (not an anchor)"),
  toc_node_id: id.nullable(),
  section: tocNodeRef.nullable().describe("Table-of-contents section of this passage"),
  location,
  score: z
    .number()
    .nullable()
    .describe("BM25 relevance of this passage (higher = better); null when results are unranked"),
  highlights: z
    .array(textSpan)
    .describe(
      "Matches in text_raw in order (at most 50); text_raw.slice(char_start, char_end) is verbatim source text with its diacritics",
    ),
  snippet: z
    .strictObject({ ...textSpan.shape, text: z.string() })
    .describe(
      "Excerpt of text_raw (~160 characters) around the first match, cut at word boundaries; text = text_raw.slice(char_start, char_end), verbatim",
    ),
});
export type SearchHit = z.infer<typeof searchHit>;

export const searchPage = z.strictObject({
  citation: citation.describe("Citation of the printed page"),
  score: z
    .number()
    .nullable()
    .describe("Relevance of the page = its best passage (higher = better); null when unranked"),
  hit_count: id.describe(
    "Matching passages on this page; when unranked, only those within the first `limit` matches",
  ),
  hits: z
    .array(searchHit)
    .describe(
      "Matching passages on this page in reading order (all of them when ranked; when unranked, only those within the first `limit` matches)",
    ),
});
export type SearchPage = z.infer<typeof searchPage>;

export const searchView = z.strictObject({
  query: z.string().describe("The query as given"),
  terms: z
    .array(z.string())
    .describe(
      "Normalized query words as searched (article and the conjunction/preposition attached to it removed); clitic variants are matched too",
    ),
  edition_id: id.nullable().describe("Edition searched; null = all editions"),
  ranked: z
    .boolean()
    .describe("False when the query has only very common words: first matches in book order"),
  warning: z
    .enum(["common_terms"])
    .nullable()
    .describe(
      "common_terms = every query word matches a very common word (e.g. الله), so results are unranked; add a more specific word",
    ),
  common_terms: z
    .array(z.strictObject({ term: z.string(), passage_count: id }))
    .describe(
      "Very common words matched by the query (exactly, as a clitic variant, or by `expand` prefix), with how many passages contain them",
    ),
  total_pages: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Matching pages in total; null when unranked or past the last page"),
  total_hits: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Matching passages in total; null when unranked or past the last page"),
  limit: z
    .number()
    .int()
    .positive()
    .describe("Pages when ranked; passages (first matches in book order) when unranked"),
  offset: z.number().int().nonnegative(),
  results: z.array(searchPage).describe("Pages, best first (or book order when unranked)"),
});
export type SearchView = z.infer<typeof searchView>;

// ── Masukan (dibagikan ke route, tool MCP, CLI; KONVENSI §TypeScript) ──────────────────────

export const TOC_DEFAULT_DEPTH = 2;
export const TOC_MAX_DEPTH = 10;

export const getWorkInput = z.strictObject({ slug });
export type GetWorkInput = z.infer<typeof getWorkInput>;

export const getTocInput = z.strictObject({
  edition_id: id,
  node_id: id.optional().describe("Start from this node instead of the roots"),
  depth: z
    .number()
    .int()
    .min(1)
    .max(TOC_MAX_DEPTH)
    .default(TOC_DEFAULT_DEPTH)
    .describe("Levels to return, counting the starting level"),
});
export type GetTocInput = z.input<typeof getTocInput>;

export const readPageInput = z.strictObject({ edition_id: id, juz, page_no: pageNo });
export type ReadPageInput = z.infer<typeof readPageInput>;

export const readSectionInput = z.strictObject({
  node_id: id,
  cursor: z.string().min(1).max(256).optional().describe("next_cursor from the previous chunk"),
});
export type ReadSectionInput = z.infer<typeof readSectionInput>;

export const buildCitationInput = z.strictObject({ passage_id: id });
export type BuildCitationInput = z.infer<typeof buildCitationInput>;

/** Batas panjang kueri pencarian (karakter), juga batas di API web (S11). */
export const SEARCH_QUERY_MAX = 200;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_MAX_OFFSET = 1000;

export const searchTextInput = z.strictObject({
  query: z
    .string()
    .min(1)
    .max(SEARCH_QUERY_MAX)
    .describe("Arabic query, with or without diacritics; a word or an exact phrase"),
  edition_id: id
    .max(EDITION_ID_MAX)
    .optional()
    .describe("Search only this edition; default: all editions"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SEARCH_MAX_LIMIT)
    .default(SEARCH_DEFAULT_LIMIT)
    .describe("Pages to return (passages when the query has only very common words)"),
  offset: z
    .number()
    .int()
    .min(0)
    .max(SEARCH_MAX_OFFSET)
    .default(0)
    .describe("Pages to skip (ranked results only)"),
  expand: z
    .boolean()
    .default(false)
    .describe("One-word queries: also match suffixed forms (صبره, صبرهم, نيته)"),
});
export type SearchTextInput = z.input<typeof searchTextInput>;

/**
 * Segmen angka dari path URL (`/kitab/ihya/1/200`): hanya digit desimal tanpa nol di depan,
 * lalu angka. Lebih ketat daripada `z.coerce.number()`, yang menerima `""`, `" 1"`, atau `1e2`.
 */
export const uintSegment = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,8})$/)
  .transform(Number);
