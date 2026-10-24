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
export { DIGEST_READ_CHARS_PER_MINUTE, readDigest, readingMinutes } from "./digest.ts";
export {
  SCRIPT_DOOR,
  SCRIPT_LABEL,
  SCRIPT_VERSION,
  ScriptError,
  digestScript,
  loadDigestScript,
  segmentText,
} from "./digest-script.ts";
export type { DigestScript, ScriptSegment, ScriptSegmentKind } from "./digest-script.ts";
export {
  AUDIO_CACHE_CONTROL,
  AUDIO_MANIFEST_FORMAT,
  AUDIO_MIME,
  audioManifest,
  audioManifestTrack,
  audioObjectKey,
  audioTrackRowOf,
  emptyAudioManifest,
  selectAudioTracks,
} from "./audio-manifest.ts";
export type { AudioManifest, AudioManifestTrack, AudioSelection } from "./audio-manifest.ts";
export { buildCitation } from "./citation.ts";
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
