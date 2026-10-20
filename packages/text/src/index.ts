// @surau/text: satu-satunya tempat logika teks Arab Surau (KONVENSI, `.claude/rules/teks-arab.md`),
// ditambah teks Latin bahasa Indonesia untuk pencarian terjemahan AI (`latin.ts`, S14).
// TypeScript murni tanpa dependensi runtime; dipakai Node (tools/ingest, lewat type stripping),
// Worker, dan Next.

export {
  FOOTNOTE_MARKER_SOURCE,
  NORM_VERSION,
  isDroppedChar,
  normalizeArabic,
  toRawSpan,
} from "./normalize.ts";
export type { NormalizeOptions, Normalized } from "./normalize.ts";

export {
  expandQueryToken,
  isProtectedToken,
  kunyaVariants,
  lamMergedVariant,
  queryProclitics,
  stemText,
  stemToken,
} from "./stem.ts";

export { findQuote } from "./quote.ts";
export type { FindQuoteOptions, QuoteMatch } from "./quote.ts";

export {
  FTS_MAX_PHRASES,
  FTS_MAX_TOKENS,
  buildFtsMatch,
  ftsMatchExpression,
  ftsQuote,
  planFtsQuery,
} from "./fts.ts";
export type { FtsColumn, FtsMatchOptions, FtsQueryPlan } from "./fts.ts";

export { SNIPPET_CHARS, findPlanSpans, snippetSpan } from "./highlight.ts";

export {
  ID_QUERY_FRAMING,
  ID_STOPWORDS,
  ID_VARIANTS,
  LATIN_MAX_TERMS,
  LATIN_NORM_VERSION,
  findLatinSpans,
  latinIndexText,
  latinMatchExpression,
  latinTerm,
  latinTokens,
  normalizeLatinWord,
  planLatinQuery,
  stemIndonesian,
} from "./latin.ts";
export type { LatinQueryPlan, LatinToken } from "./latin.ts";
export type { RawSpan } from "./highlight.ts";

export {
  cleanShamelaHtml,
  extractTitles,
  findFootnoteMarkers,
  linkFootnoteMarkers,
  linkFootnotes,
  splitFootnoteEntries,
  splitFootnotes,
  splitInlineTakhrij,
  splitParagraphs,
} from "./shamela.ts";
export type {
  CleanedHtml,
  Footnote,
  FootnoteLinks,
  FootnoteMarker,
  FootnoteSplit,
  InlineTakhrijDirection,
  InlineTakhrijSplit,
  Paragraph,
  Span,
  TitleSpan,
} from "./shamela.ts";
