// @surau/db: skema data Surau tanpa ORM (ADR-009). Migrasi SQL ada di migrations/{corpus,app};
// modul ini mengekspor skema Zod baris, formula ID (ADR-029), dan repository bertipe.

export { D1_MAX_PARAMS, chunk, placeholders } from "./d1.ts";
export type { D1Db, D1Result, D1Statement, D1Value } from "./d1.ts";

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
export * from "./schema/takhrij-review.ts";
export * from "./schema/translation-revision.ts";
export {
  ayahSpanRow,
  digestAnchorWithPageRow,
  digestHeaderRow,
  digestQuoteWithPassageRow,
  getDigest,
  getDigestHeaders,
  getDigestHeadersOnPath,
  listDigestHeaders,
} from "./repo/digest.ts";
export type {
  AyahSpanRow,
  DigestAnchorWithPageRow,
  DigestHeaderRow,
  DigestQuoteWithPassageRow,
  DigestRows,
} from "./repo/digest.ts";
export {
  insertAnswerLog,
  listAnswerLogs,
  getAnswerLog,
  getReviews,
  saveReview,
} from "./repo/review.ts";
export {
  getTakhrijReviews,
  listTakhrijReviews,
  saveTakhrijReview,
  takhrijCitedCounts,
  takhrijReviewsChangedSince,
} from "./repo/takhrij-review.ts";
export {
  countTranslationRevisionsSince,
  getActiveTranslationRevisions,
  getTranslationRevisionHistories,
  getTranslationRevisionHistory,
  getTranslationRevisionsByIds,
  listActiveTranslationRevisions,
  listRecentTranslationRevisions,
  listTranslationRevisionAuthors,
  listTranslationRevisionsByAuthorSince,
  saveTranslationRevision,
  translationQueueSignals,
} from "./repo/translation-revision.ts";
export type {
  SaveTranslationRevisionOptions,
  SaveTranslationRevisionResult,
  TranslationEditorSeen,
  TranslationQueueSignals,
} from "./repo/translation-revision.ts";

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
  listFootnoteTexts,
  listPages,
  listTocNodes,
  listTocNodesStartingAt,
  listWorkAuthors,
  listWorks,
  passageWithPageRow,
  tocNodeWithStartRow,
} from "./repo/corpus.ts";
export type {
  EditionContext,
  FootnoteTextRow,
  PassageWithPageRow,
  TocNodeWithStartRow,
} from "./repo/corpus.ts";
export {
  AI_TEXT_LANG,
  ANY_TERMS_BELOW,
  BM25_WEIGHTS,
  FUSION_DEPTH,
  RRF_K,
  SUMMARY_DEPTH,
  DIGEST_DEPTH,
  fusedSearchRow,
  rankedSearchRow,
  searchCorpus,
  searchCorpusFused,
  searchPassageRow,
  searchPathName,
  searchSummaryNodes,
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
  SummaryNodesResult,
  SearchRequest,
  SearchResult,
} from "./repo/search.ts";
export {
  getSummariesStartingOn,
  getTranslationReviewers,
  getTranslationReviewsWithDraft,
  getTranslations,
  isHumanReviewed,
  listTitleTranslations,
  listTranslatedPassages,
  sectionSummaryRow,
} from "./repo/translation.ts";
export type {
  SectionSummaryRow,
  TitleTranslations,
  TranslatedPassage,
} from "./repo/translation.ts";
export { QURAN_AYAT_MAX, ayahRefWithSurahRow, getAyahRefs, getQuranAyat } from "./repo/quran.ts";
export type { AyahRange, AyahRefWithSurahRow, QuranAyat } from "./repo/quran.ts";
export {
  createFeedback,
  getAnswerCache,
  getSettings,
  putAnswerCache,
  touchAnswerCache,
} from "./repo/app.ts";
export {
  EMPTY_LEDGER_USAGE,
  MICRO,
  RETENTION_DAYS,
  budgetPeriod,
  consumeQuota,
  ensureBudgetPeriod,
  expireStaleReservations,
  getBudget,
  lastPurgeDay,
  ledgerSummary,
  listRecentFeedback,
  markBudgetWarning,
  markPurged,
  purgeExpired,
  quotaDay,
  quotaStats,
  quotaUsed,
  reserveBudget,
  setBudgetCap,
  setFeedbackStatus,
  setQuotaLimits,
  setSetting,
  settleLedger,
  toMicro,
} from "./repo/guard.ts";
export type {
  LedgerSummaryRow,
  LedgerUsage,
  PurgeResult,
  QuotaLimits,
  QuotaResult,
  QuotaSubjects,
  Reservation,
  Settlement,
} from "./repo/guard.ts";
