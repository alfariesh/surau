// @surau/text: satu-satunya tempat logika teks Arab Surau (KONVENSI, `.claude/rules/teks-arab.md`).
// TypeScript murni tanpa dependensi runtime; dipakai Node (tools/ingest, lewat type stripping),
// Worker, dan Next.

export { NORM_VERSION, isDroppedChar, normalizeArabic, toRawSpan } from "./normalize.ts";
export type { NormalizeOptions, Normalized } from "./normalize.ts";

export {
  expandQueryToken,
  isProtectedToken,
  kunyaVariants,
  queryProclitics,
  stemText,
  stemToken,
} from "./stem.ts";

export { findQuote } from "./quote.ts";
export type { FindQuoteOptions, QuoteMatch } from "./quote.ts";

export { FTS_MAX_PHRASES, buildFtsMatch, ftsQuote } from "./fts.ts";
export type { FtsColumn, FtsMatchOptions } from "./fts.ts";

export {
  cleanShamelaHtml,
  extractTitles,
  findFootnoteMarkers,
  linkFootnotes,
  splitFootnoteEntries,
  splitFootnotes,
  splitParagraphs,
} from "./shamela.ts";
export type {
  CleanedHtml,
  Footnote,
  FootnoteLinks,
  FootnoteMarker,
  FootnoteSplit,
  Paragraph,
  Span,
  TitleSpan,
} from "./shamela.ts";
