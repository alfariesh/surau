// @surau/db: skema data Surau tanpa ORM (ADR-009). Migrasi SQL ada di migrations/{corpus,app};
// modul ini mengekspor skema Zod baris, formula ID (ADR-029), dan repository bertipe.

export { D1_MAX_PARAMS, chunk, placeholders } from "./d1.ts";
export type { D1Db, D1Statement, D1Value } from "./d1.ts";

export {
  EDITION_ID_MAX,
  PAGE_STRIDE,
  PASSAGE_STRIDE,
  editionOfPageId,
  editionOfPassageId,
  pageId,
  passageId,
  passageAnchor,
  passageIdRange,
  tocNodeId,
  tocNodeIdRange,
} from "./ids.ts";

export * from "./schema/corpus.ts";
export * from "./schema/app.ts";
export * from "./schema/review.ts";
export {
  insertAnswerLog,
  listAnswerLogs,
  getAnswerLog,
  getReviews,
  saveReview,
} from "./repo/review.ts";

export {
  getAdjacentPages,
  getCorpusMeta,
  getEdition,
  getEditionContext,
  getFootnoteRefs,
  getFootnoteRefsTo,
  getNeedsReview,
  getPageByCitation,
  getPageById,
  getPassageById,
  getPassagesByIds,
  getPassagesByPage,
  getSectionPassages,
  getTocChildren,
  getTocNode,
  getWorkBySlug,
  listEditions,
  listPages,
  listTocNodes,
  listWorkAuthors,
  listWorks,
  passageWithPageRow,
  tocNodeWithStartRow,
} from "./repo/corpus.ts";
export type { EditionContext, PassageWithPageRow, TocNodeWithStartRow } from "./repo/corpus.ts";
export {
  AI_TEXT_LANG,
  ANY_TERMS_BELOW,
  BM25_WEIGHTS,
  FUSION_DEPTH,
  RRF_K,
  SUMMARY_DEPTH,
  fusedSearchRow,
  rankedSearchRow,
  searchCorpus,
  searchCorpusFused,
  searchPassageRow,
  searchPathName,
} from "./repo/search.ts";
export type {
  FusedSearchRequest,
  FusedSearchResult,
  FusedSearchRow,
  LatinMatch,
  PassageIdSpan,
  RankedSearchRow,
  SearchPassageRow,
  SearchPathName,
  SearchRequest,
  SearchResult,
} from "./repo/search.ts";
export { getSummariesStartingOn, getTranslations, sectionSummaryRow } from "./repo/translation.ts";
export type { SectionSummaryRow } from "./repo/translation.ts";
export { QURAN_AYAT_MAX, ayahRefWithSurahRow, getAyahRefs, getQuranAyat } from "./repo/quran.ts";
export type { AyahRange, AyahRefWithSurahRow, QuranAyat } from "./repo/quran.ts";
export { createFeedback, getSettings } from "./repo/app.ts";
