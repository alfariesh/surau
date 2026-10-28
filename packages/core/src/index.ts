// @surau/core: core tools baca (ARSITEKTUR-TEKNIS §4). Satu-satunya pintu ke data untuk membaca,
// dipakai bersama web (S09), MCP (S16), dan Jawab (S19). Semua fungsi menerima D1 (tipe
// struktural `D1Db`) dan mengembalikan `text_raw` persis dari DB beserta sitasi lengkap.
// Tanpa next/*, cloudflare:*, atau node:* (KONVENSI §Struktur).

export { listWorks, getWork } from "./works.ts";
export { getToc } from "./toc.ts";
export { subheadingPartText, subheadingTitle, subheadingTocTargets } from "./subheading-title.ts";
export type { SubheadingSpanEntry, SubheadingTocTarget } from "./subheading-title.ts";
export { humanReviewOf, readPage, reviewersFor, translationView } from "./page.ts";
export { readSection } from "./section.ts";
export {
  DIGEST_READ_CHARS_PER_MINUTE,
  digestTierOf,
  leafPointRange,
  readDigest,
  readingMinutes,
} from "./digest.ts";
export {
  FAEDAH_PROBLEM_MESSAGE,
  CONTENT_LANG,
  canonicalJson,
  checkContentDraft,
  faedahProblems,
  contentDraftSha256,
  listFaedahCandidates,
  loadFaedahFacts,
  readinessIssues,
} from "./content-check.ts";
export type { FaedahFacts } from "./content-check.ts";
export { lintContent, wordCount } from "./content-lint.ts";
export { BAN_LOOKAHEAD_CHARS, REPORT_LOOKAHEAD_CHARS, quoteInspector } from "./quote-inspect.ts";
export type { QuoteCorpus, QuoteInspection, QuoteRange } from "./quote-inspect.ts";
export type { ContentLint } from "./content-lint.ts";
export {
  CONTENT_FORMAT,
  CONTENT_KINDS,
  CONTENT_LIMITS,
  CONTENT_RULES,
  FAEDAH_CANDIDATES_MAX,
  faedahCandidates,
  faedahCandidatesInput,
  faedahContent,
  intisariBabContent,
  intisariKitabContent,
  jalurContent,
  contentCheck,
  contentDraft,
  contentIssue,
  contentOrigin,
  contentQuote,
  contentReview,
  contentStamp,
  contentStatus,
} from "./content-schema.ts";
export type {
  FaedahCandidates,
  FaedahCandidatesInput,
  FaedahContent,
  IntisariBabContent,
  IntisariKitabContent,
  JalurContent,
  ContentCheck,
  ContentDraft,
  ContentIssue,
  ContentKind,
  ContentStamp,
} from "./content-schema.ts";
export {
  DIGEST_WITHDRAWAL_DIGEST,
  DIGEST_WITHDRAWALS,
  digestWithdrawal,
  digestWithdrawalFile,
  getShownDigestHeaders,
  getShownDigestHeadersOnPath,
  listShownDigestHeaders,
  withdrawFromHeaders,
  withdrawalDigest,
  withdrawnOrds,
} from "./digest-withdrawal.ts";
export type { DigestWithdrawal } from "./digest-withdrawal.ts";
export {
  SCRIPT_DOOR,
  SCRIPT_LABEL,
  SCRIPT_VERSION,
  ScriptError,
  digestScript,
  loadDigestScript,
  segmentText,
  unspeakableChar,
} from "./digest-script.ts";
export type {
  DigestScript,
  ScriptSegment,
  ScriptSegmentKind,
  ScriptSource,
  ScriptSourceField,
  SentenceRole,
} from "./digest-script.ts";
export {
  ALIGNMENT_KEY,
  ALIGNMENT_MIME,
  AUDIO_ALIGNMENT_FORMAT,
  alignmentFits,
  alignmentJson,
  alignmentMethod,
  alignmentObjectKey,
  audioAlignment,
  audioManifestAlignment,
  sentenceSpan,
} from "./audio-alignment.ts";
export type { AlignmentMethod, AudioAlignment, AudioManifestAlignment } from "./audio-alignment.ts";
export {
  AUDIO_CACHE_CONTROL,
  AUDIO_MANIFEST_FORMAT,
  AUDIO_MIME,
  audioManifest,
  audioManifestTrack,
  audioObjectKey,
  audioReport,
  audioTrackRowOf,
  emptyAudioManifest,
  selectAudioTracks,
  selectAudioTracksIn,
} from "./audio-manifest.ts";
export type { AudioManifest, AudioManifestTrack, AudioSelection } from "./audio-manifest.ts";
export { buildCitation, loadCiteContext } from "./citation.ts";
export { SYATR_MAX_CHARS, VERSE_SEPARATOR, verseBounds } from "./verse.ts";
export { verifyQuote } from "./verify-quote.ts";
export { ipKey, ipNetwork } from "./client-key.ts";
export { redactPii } from "./pii.ts";
export type { RedactResult } from "./pii.ts";
export {
  JAWAB_BODY_MAX_BYTES,
  JAWAB_QUESTION_MAX,
  JAWAB_QUESTION_MIN,
  TURNSTILE_TOKEN_MAX,
  jawabRequest,
  jawabStatus,
} from "./jawab-request.ts";
export type { JawabErrorCode, JawabRequest, JawabStatus } from "./jawab-request.ts";
export { getHadithTakhrij } from "./takhrij.ts";
export {
  TAKHRIJ_RANGE_WITHOUT_TERMS,
  TAKHRIJ_STATUS_MAX,
  TAKHRIJ_TERM_GLOSS,
  TAKHRIJ_TERM_KINDS,
  QUOTE_BANNED_TAKHRIJ_KINDS,
  VERY_WEAK_TAKHRIJ_KINDS,
  isWeakTakhrijKind,
  takhrijLabel,
  takhrijStatus,
} from "./takhrij-label.ts";
export type { TakhrijLabel, TakhrijLabelTerm } from "./takhrij-label.ts";
/** Versi aturan istilah takhrij (label dan tinjauannya terikat versi ini). */
export { TAKHRIJ_TERMS_VERSION } from "@surau/text";
export {
  TAKHRIJ_USTADZ_REVIEWERS,
  effectiveTakhrijReview,
  isUstadzReviewer,
  parseUstadzKeys,
  reviewedTakhrijLabel,
  takhrijCitedWeak,
  takhrijLabelHash,
  takhrijReviewInput,
  takhrijReviewsFor,
} from "./takhrij-review.ts";
export type {
  EffectiveTakhrijReview,
  ReviewedTakhrijLabel,
  TakhrijReviewInput,
} from "./takhrij-review.ts";
export { answerPassages, answerToc } from "./answer-context.ts";
export { reviewPassages } from "./review-passage.ts";
export type { ReviewPassage } from "./review-passage.ts";
export type { AnswerPassage, AnswerTocNode } from "./answer-context.ts";
export {
  AI_SNIPPET_CHARS,
  SEARCH_MAX_HIGHLIGHTS,
  SEARCH_RESULT_VERSION,
  queryWordOverflow,
  searchCacheKey,
  searchSummarySections,
  searchText,
  splitQueryScripts,
} from "./search.ts";
export { ayahLabel, getAyahRefs, quranForRefs } from "./quran.ts";
export {
  ayahPlaceholder,
  ayahPlaceholderPattern,
  checkPlaceholders,
  maskAyat,
  translationSegments,
  unmaskAyat,
} from "./ayah-placeholder.ts";
export type {
  AyahSlot,
  MaskedPassage,
  PlaceholderCheck,
  TranslationLabel,
  TranslationSegment,
} from "./ayah-placeholder.ts";
export {
  TRANSLATION_TEXT_MAX,
  footnoteMarkerDigits,
  hasArabicLetters,
  hasMarkdown,
  stripMarkers,
  validateTranslationText,
} from "./translation-text.ts";
export type {
  TranslationIssue,
  TranslationIssueCode,
  TranslationTextCheck,
  TranslationTextContext,
} from "./translation-text.ts";
export {
  addressesReader,
  hasFatwaLanguage,
  hasFirstPerson,
  hasHadithStatus,
  hasMetaCommentary,
  hasPreamble,
  narrativeProblems,
  paraphrasesAyah,
  quoteTranslationTextProblems,
} from "./narrative-check.ts";
export {
  LENGTH_RATIO_MIN_CHARS,
  MAX_ARABIC_RUN_WORDS,
  REFILL_WINDOW,
  TRANSLATION_LENGTH_RATIO,
  checkPassageTranslation,
  contentLength,
  letterLength,
  longestArabicRun,
  refillsAyah,
  restoreFootnoteMarkers,
} from "./translation-check.ts";
export type {
  TranslationCheck,
  TranslationCheckInput,
  TranslationCheckLang,
  TranslationProblem,
} from "./translation-check.ts";
export {
  TRANSLATION_DRAFT_LANG,
  TRANSLATION_DRAFT_MAX_ITEMS,
  TRANSLATION_FORMAT,
  TRANSLATION_RULES,
  TRANSLATION_UNITS_MAX,
  translationDraft,
  translationDraftCheck,
  translationUnits,
  translationUnitsInput,
} from "./translation-schema.ts";
export type {
  TranslationDraft,
  TranslationDraftCheck,
  TranslationUnits,
  TranslationUnitsInput,
} from "./translation-schema.ts";
export {
  checkTranslationDraft,
  listTranslationUnits,
  translationDraftSha256,
  translationReadinessIssues,
} from "./translation-draft.ts";
export {
  TINJAU_ROOMS,
  canRevert,
  canUseTinjauRoom,
  parseTranslationEditors,
  previousState,
  referencedRevisionIds,
  stateOf,
  textSha256,
  translationRevisionInput,
  underlyingRevision,
} from "./translation-revision.ts";
export type {
  CorpusTranslation,
  TinjauRoom,
  TranslationEditor,
  TranslationRevisionInput,
  TranslationState,
} from "./translation-revision.ts";

export {
  CoreError,
  InvalidCitation,
  InvalidQuery,
  NotFound,
  Unavailable,
  isCoreError,
} from "./errors.ts";
export type { CoreErrorCode } from "./errors.ts";

export {
  digestPermalink,
  editionPermalink,
  pagePermalink,
  passagePermalink,
  sectionPermalink,
} from "./permalink.ts";
export type { EditionPath } from "./permalink.ts";

export {
  CHARS_PER_TOKEN,
  SECTION_MAX_TOKENS,
  SECTION_MIN_TOKENS,
  SECTION_ROW_LIMIT,
  estimateTokens,
} from "./tokens.ts";

export * from "./schema.ts";
export * from "./eval-schema.ts";
export { resolveEvalSource, evalHash } from "./eval-source.ts";
export type { EvalSource } from "./eval-source.ts";
