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
  ayahMatch,
  editionRow,
  needsReviewReason,
  passageKind,
  quranSourceKind,
  reviewStatus,
  searchPathName,
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

// ── Bagian daftar isi (rujukan) ─────────────────────────────────────────────────────────

export const tocNodeRef = z.strictObject({
  id: id.describe("Stable table-of-contents node id"),
  title_ar: z.string(),
  level: id,
  permalink: z.string().describe("Section permalink path, e.g. /kitab/ihya/bab/100074"),
});
export type TocNodeRef = z.infer<typeof tocNodeRef>;

// ── Terjemahan dan ringkasan AI (S13, S14) ─────────────────────────────────────────────────

/** Metadata teks buatan model: selalu berlabel, dengan model, versi prompt, dan status tinjauan. */
const aiTextMeta = {
  lang: z.string().describe('Language of the AI text, e.g. "id" (Indonesian)'),
  model: z.string().describe("Model that wrote the text, e.g. claude-haiku-5-5"),
  prompt_version: z.string().describe("Versioned prompt used, e.g. translate-passage@2"),
  created_at: z.string(),
  review_status: reviewStatus.describe(
    "ai_generated = not reviewed by a human; reviewed / ustadz_verified / rejected after review",
  ),
};

export const translationView = z
  .strictObject({
    label: z.literal("ai_translation").describe('Always shown as "AI translation"'),
    ...aiTextMeta,
    text: z
      .string()
      .describe(
        "AI translation of text_raw. Placeholders ⟦QS s:a⟧ / ⟦QS s:a-b⟧ mark Quran quotations: render them from the official Kemenag translation (`quran`), never as model text",
      ),
  })
  .describe("Machine translation of a passage, labelled as AI (never a verified translation)");
export type TranslationView = z.infer<typeof translationView>;

export const summaryView = z
  .strictObject({
    label: z.literal("ai_summary").describe('Always shown as "AI summary"'),
    section: tocNodeRef.describe("The table-of-contents section summarized"),
    ...aiTextMeta,
    text: z.string().describe("AI summary of the section and its subsections"),
  })
  .describe("Machine summary of a table-of-contents section, labelled as AI");
export type SummaryView = z.infer<typeof summaryView>;

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

const surahNo = z.number().int().min(1).max(114).describe("Surah number (1–114)");
const ayahNo = z.number().int().positive();

/**
 * Kutipan ayat di `text_raw` (S12): dikenali deterministik dengan pencocokan ke teks Tanzil, bukan
 * oleh model. `text_raw.slice(char_start, char_end)` = kutipan persis di kitab.
 */
export const ayahRef = z.strictObject({
  char_start: z
    .number()
    .int()
    .nonnegative()
    .describe("Start offset of the quotation in text_raw (JS string index, inclusive)"),
  char_end: z.number().int().positive().describe("End offset (exclusive)"),
  surah: surahNo,
  ayah_from: ayahNo,
  ayah_to: ayahNo,
  match: ayahMatch.describe(
    "exact = identical to the Tanzil text after normalization; similar = minor spelling differences",
  ),
  partial: z.boolean().describe("The quotation covers only part of ayah_from..ayah_to"),
  bracketed: z
    .boolean()
    .describe(
      "Marked {…} in the source; false = recognized after an introducing phrase such as قال تعالى",
    ),
  alt_count: z
    .number()
    .int()
    .nonnegative()
    .describe("Other places in the Quran with the identical wording (reference picks one)"),
  label: z.string().describe('Reference label, e.g. "QS Al-Baqarah [2]: 255"'),
});
export type AyahRef = z.infer<typeof ayahRef>;

export const passage = z.strictObject({
  id: id.describe("Stable passage id"),
  anchor: z.string().describe("Stable fragment anchor, e.g. p2824"),
  kind: passageKind.describe("body = main text, foot = footnote (takhrij for Ihya)"),
  ord: id.describe("Display order within the page and kind (not an anchor)"),
  toc_node_id: id.nullable(),
  text_raw: z.string().describe("Raw source text, verbatim from the database"),
  footnote_refs: z.array(footnoteRef).describe("Footnote markers in this passage (body only)"),
  ayah_refs: z
    .array(ayahRef)
    .describe(
      "Quran quotations in this passage, in text order; empty when none or the corpus predates them",
    ),
  needs_review: z
    .array(needsReviewReason)
    .describe("Ingest flags that this passage needs human review; not a review result"),
  location,
  translation: translationView
    .nullable()
    .optional()
    .describe(
      "AI translation (Indonesian) of this passage; present in read_page (null when none), absent elsewhere",
    ),
});
export type Passage = z.infer<typeof passage>;

// ── Al-Qur'an (S12) ──────────────────────────────────────────────────────────────────────

export const quranFootnoteView = z.strictObject({
  marker: z.string().describe('Marker as printed in the translation text, e.g. "4)"'),
  text: z.string(),
});

export const quranAyahView = z.strictObject({
  surah: surahNo,
  ayah: ayahNo,
  juz: z.number().int().min(1).max(30),
  text: z.string().describe("Ayah text, Tanzil Uthmani, verbatim (never written by a model)"),
  translation: z
    .strictObject({
      text: z
        .string()
        .describe("Official Kemenag (Ministry of Religious Affairs RI) translation, verbatim"),
      footnotes: z.array(quranFootnoteView).describe("Footnotes of the translation, verbatim"),
    })
    .nullable(),
  transliteration: z.string().nullable().describe("Kemenag Latin transliteration, verbatim"),
});
export type QuranAyahView = z.infer<typeof quranAyahView>;

export const quranSurahView = z.strictObject({
  surah: surahNo,
  name_ar: z.string(),
  name_latin: z.string(),
  revelation: z.enum(["makkah", "madinah"]),
  ayah_count: ayahNo,
});
export type QuranSurahView = z.infer<typeof quranSurahView>;

export const quranSourceView = z.strictObject({
  id: z.string(),
  kind: quranSourceKind,
  name: z.string(),
  version: z.string(),
  license: z.string(),
  attribution: z.string().describe("Required attribution"),
  url: z.string(),
});
export type QuranSourceView = z.infer<typeof quranSourceView>;

export const quranView = z
  .strictObject({
    surahs: z.array(quranSurahView),
    ayat: z.array(quranAyahView).describe("Ayat in mushaf order"),
    sources: z.array(quranSourceView).describe("Text, translation and transliteration sources"),
  })
  .describe("Quran ayat with official translation and their sources (verbatim, never by a model)");
export type QuranView = z.infer<typeof quranView>;

export const ayahRefsView = z.strictObject({
  passage_id: id,
  refs: z.array(ayahRef),
  quran: quranView.describe("The referenced ayat (full ayat, also for partial quotations)"),
});
export type AyahRefsView = z.infer<typeof ayahRefsView>;

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
  quran: quranView
    .nullable()
    .describe("Ayat quoted on this page (see ayah_refs); null when none or unavailable"),
  summaries: z
    .array(summaryView)
    .optional()
    .describe(
      "AI summaries (Indonesian) of the sections that start on this page, in table-of-contents order",
    ),
});
export type PageView = z.infer<typeof pageView>;

// ── Daftar isi ───────────────────────────────────────────────────────────────────────────

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

// ── Pencarian (S11, S14) ─────────────────────────────────────────────────────────────────

/** Rentang di `text_raw`: indeks string JS, akhir eksklusif (sama dengan `footnote_refs`). */
export const textSpan = z
  .strictObject({
    char_start: z.number().int().nonnegative(),
    char_end: z.number().int().nonnegative(),
  })
  .describe("Span in the passage's text_raw (JS string index, end exclusive)");
export type TextSpan = z.infer<typeof textSpan>;

/** Rentang di teks AI (terjemahan/ringkasan), bukan di `text_raw`. */
const aiTextSpan = z
  .strictObject({
    char_start: z.number().int().nonnegative(),
    char_end: z.number().int().nonnegative(),
  })
  .describe("Span in the AI text (JS string index, end exclusive)");

const aiSnippet = z
  .strictObject({ ...aiTextSpan.shape, text: z.string() })
  .describe(
    "Excerpt of the AI text (~240 characters) around the first match (or from the start), cut at word boundaries and never inside a ⟦QS s:a⟧ placeholder",
  );

export const searchPath = searchPathName.describe(
  "arabic = Arabic text index; translation = AI translation index; summary = AI section summary index",
);
export type SearchPath = z.infer<typeof searchPath>;

export const searchMatch = z.strictObject({
  path: searchPath,
  rank: id
    .nullable()
    .describe("Rank of this passage (or its section) in that path, 1 = best; null when unranked"),
  all_terms: z
    .boolean()
    .describe(
      "Every query word matched; false = only some words (fallback when few passages match them all)",
    ),
});
export type SearchMatch = z.infer<typeof searchMatch>;

export const searchTranslation = z
  .strictObject({
    label: z.literal("ai_translation").describe('Always shown as "AI translation"'),
    ...aiTextMeta,
    highlights: z
      .array(aiTextSpan)
      .describe("Matches of the Indonesian query words in the translation text (at most 50)"),
    snippet: aiSnippet,
  })
  .describe("The passage's AI translation (excerpt), labelled as AI");
export type SearchTranslation = z.infer<typeof searchTranslation>;

export const searchSummary = z
  .strictObject({
    label: z.literal("ai_summary").describe('Always shown as "AI summary"'),
    section: tocNodeRef.describe("Section whose AI summary matched; this passage starts it"),
    ...aiTextMeta,
    highlights: z.array(aiTextSpan).describe("Matches in the summary text (at most 50)"),
    snippet: aiSnippet,
  })
  .describe("AI summary of the section this passage starts, when the summary matched");
export type SearchSummary = z.infer<typeof searchSummary>;

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
    .describe(
      "Relevance of this passage (higher = better): BM25 for Arabic-only queries, Reciprocal Rank Fusion over the paths otherwise; null when results are unranked",
    ),
  highlights: z
    .array(textSpan)
    .describe(
      "Arabic matches in text_raw in order (at most 50); text_raw.slice(char_start, char_end) is verbatim source text with its diacritics. Empty when only the Indonesian paths matched",
    ),
  snippet: z
    .strictObject({ ...textSpan.shape, text: z.string() })
    .describe(
      "Excerpt of text_raw (~160 characters) around the first Arabic match (or from the start), cut at word boundaries; text = text_raw.slice(char_start, char_end), verbatim",
    ),
  matched_by: z
    .array(searchMatch)
    .describe("Which search paths found this passage, with its rank in each (explains the score)"),
  translation: searchTranslation
    .nullable()
    .describe("AI translation of the passage (excerpt); null when the passage has none"),
  summary: searchSummary
    .nullable()
    .describe("AI summary of the section this passage starts, when the summary path matched"),
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
      "Normalized Arabic query words as searched (article and the conjunction/preposition attached to it removed); clitic variants are matched too",
    ),
  latin_terms: z
    .array(z.string())
    .describe(
      "Indonesian query words as searched: normalized, common function words removed, lightly stemmed (kesabaran → sabar)",
    ),
  paths: z
    .array(searchPath)
    .describe(
      "Paths searched: Arabic letters → arabic; Latin letters → translation + summary; both → all three",
    ),
  fusion: z
    .strictObject({
      method: z.literal("rrf"),
      k: id,
      depth: id.describe("Top passages per passage path that are fused"),
      summary_depth: id.describe("Top sections of the summary path that are fused"),
    })
    .nullable()
    .describe(
      "Reciprocal Rank Fusion settings when Indonesian paths ran (totals count only these candidates); null for Arabic-only queries",
    ),
  edition_id: id.nullable().describe("Edition searched; null = all editions"),
  section_id: id
    .nullable()
    .describe("Section searched (with its subsections); null = whole editions"),
  ranked: z
    .boolean()
    .describe("False when the query has only very common words: first matches in book order"),
  warning: z
    .enum(["common_terms", "common_terms_ignored"])
    .nullable()
    .describe(
      "common_terms = every query word matches a very common word (e.g. الله), so results are unranked; add a more specific word. common_terms_ignored = the Arabic words of a mixed query were all very common and were not searched; results come from the Indonesian words",
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
    .describe(
      "Matching pages in total (within the fused candidates when `fusion` is set); null when unranked or past the last page",
    ),
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

// ── Verifikasi kutipan dan takhrij (S16) ───────────────────────────────────────────────

export const quoteMatch = z
  .strictObject({
    char_start: z
      .number()
      .int()
      .nonnegative()
      .describe("Start offset in the passage text_raw (JS string index, inclusive)"),
    char_end: z.number().int().positive().describe("End offset (exclusive)"),
    text: z
      .string()
      .describe(
        "text_raw.slice(char_start, char_end): the verbatim source text with its own diacritics; quote this, not your input",
      ),
  })
  .describe("Where the quote occurs in the passage");
export type QuoteMatch = z.infer<typeof quoteMatch>;

export const quoteVerification = z.strictObject({
  citation: citation.describe("Citation of the passage checked"),
  passage_id: id,
  verified: z
    .boolean()
    .describe(
      "true = the quote occurs in this passage at word boundaries, after normalizing diacritics, letter variants (alif/ya/ta marbuta) and punctuation; false = not found: do not present it as a quotation",
    ),
  exact: z
    .boolean()
    .describe("true = the quote is character-for-character identical to match.text"),
  match: quoteMatch.nullable().describe("First occurrence; null when not verified"),
});
export type QuoteVerification = z.infer<typeof quoteVerification>;

export const takhrijLink = z.strictObject({
  marker: z.string().describe("Footnote marker digit as printed, e.g. ١"),
  char_start: z
    .number()
    .int()
    .nonnegative()
    .describe("Start offset of the marker in the passage text_raw (inclusive)"),
  char_end: z.number().int().positive().describe("End offset (exclusive)"),
  footnote: passage.describe("The linked footnote: takhrij text verbatim (kind = foot)"),
  review_status: z
    .literal("unreviewed")
    .describe(
      "The marker → footnote link and the footnote split were made by ingest code, not yet checked by a human reviewer",
    ),
});
export type TakhrijLink = z.infer<typeof takhrijLink>;

export const takhrijView = z.strictObject({
  citation: citation.describe("Citation of the requested passage"),
  passage: passage.describe("The requested passage, verbatim"),
  status: z
    .enum(["linked", "none", "is_footnote"])
    .describe(
      "linked = takhrij footnotes are linked to markers in this passage; none = no linked takhrij, so the hadith status is unknown (never guess it); is_footnote = the passage itself is a footnote (takhrij text)",
    ),
  takhrij: z
    .array(takhrijLink)
    .describe("Linked footnotes in marker order; the grading is whatever the takhrij text says"),
  unlinked_footnote_ids: z
    .array(id)
    .describe(
      "Footnotes on the same page not linked to any marker (e.g. takhrij cut from the main text); they may or may not concern this passage: read them with read_page",
    ),
});
export type TakhrijView = z.infer<typeof takhrijView>;

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

export const getAyahRefsInput = z.strictObject({ passage_id: id });
export type GetAyahRefsInput = z.infer<typeof getAyahRefsInput>;

/** Batas panjang kutipan yang diverifikasi (karakter); paragraf Ihya terpanjang ±10 ribu. */
export const QUOTE_MAX = 2_000;

export const verifyQuoteInput = z.strictObject({
  passage_id: id.describe("Passage to check, e.g. an id from read_page or search_text"),
  quote: z
    .string()
    .min(1)
    .max(QUOTE_MAX)
    .describe("Arabic text claimed to be in the passage (with or without diacritics)"),
});
export type VerifyQuoteInput = z.infer<typeof verifyQuoteInput>;

export const getHadithTakhrijInput = z.strictObject({
  passage_id: id.describe("Main-text passage containing the hadith (or a footnote passage)"),
});
export type GetHadithTakhrijInput = z.infer<typeof getHadithTakhrijInput>;

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
    .describe(
      "Arabic query (with or without diacritics; a word or an exact phrase) and/or Indonesian words (searched in the AI translations and summaries)",
    ),
  edition_id: id
    .max(EDITION_ID_MAX)
    .optional()
    .describe("Search only this edition; default: all editions"),
  section_id: id
    .optional()
    .describe(
      "Search only this table-of-contents section and its subsections (e.g. one rub' or kitab of Ihya)",
    ),
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
    .describe("One-word Arabic queries: also match suffixed forms (صبره, صبرهم, نيته)"),
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
