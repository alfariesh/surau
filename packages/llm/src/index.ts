// @surau/llm: pembungkus tipis Anthropic (ADR-013). S13: prompt berversi, request batch terjemahan dan
// ringkasan, validasi keluaran, harga token. S19 menambah pipeline Jawab. Tanpa node:* atau
// cloudflare:*: kunci API selalu diberikan pemanggil.

export {
  MAX_PROMPT_TOKENS,
  MODELS,
  createAnthropic,
  createGatewayAnthropic,
  isModelId,
} from "./client.ts";
export type { ClientOptions, ModelId } from "./client.ts";

export {
  CUSTOM_ID_PATTERN,
  SUMMARY_LANGS,
  parseCustomId,
  passageCustomId,
  tocCustomId,
  tocRound2CustomId,
} from "./custom-id.ts";
export type { CustomIdParts, SummaryLang } from "./custom-id.ts";

export {
  HAIKU_SHORT_PROMPT_MAX,
  addUsage,
  costUsd,
  emptyTotals,
  promptTokens,
  ratesFor,
} from "./pricing.ts";
export type { Rates, UsageLike, UsageTotals } from "./pricing.ts";

export {
  MAX_ARABIC_RUN_WORDS,
  addressesReader,
  contentLength,
  footnoteMarkerDigits,
  hasArabicLetters,
  hasFatwaLanguage,
  hasFirstPerson,
  hasHadithStatus,
  hasMetaCommentary,
  letterLength,
  longestArabicRun,
  paraphrasesAyah,
  refillsAyah,
  restoreFootnoteMarkers,
  stripMarkers,
} from "./check.ts";

export { messageText, stopProblem } from "./response.ts";
export type { StopProblem } from "./response.ts";

export {
  LENGTH_RATIO,
  LENGTH_RATIO_MIN_CHARS,
  TRANSLATE_MAX_TOKENS,
  TRANSLATE_PROMPT,
  TRANSLATION_LANG,
  buildTranslateRequest,
  checkTranslation,
  translateUserText,
} from "./translate.ts";
export type { TranslateInput, TranslationCheck, TranslationProblem } from "./translate.ts";

export {
  SUMMARY_LENGTH,
  SUMMARY_MAX_TOKENS,
  SUMMARY_PROMPT,
  buildSummaryRequest,
  buildSummaryRound2Request,
  checkSummary,
  summaryChunkUserText,
  summaryRound2UserText,
} from "./summarize.ts";
export type {
  SummaryCheck,
  SummaryChunkInput,
  SummaryProblem,
  SummaryRound2Input,
} from "./summarize.ts";

export {
  TOC_TITLE_LANG,
  TOC_TITLE_MAX_CHARS,
  TOC_TITLE_MAX_TOKENS,
  TOC_TITLE_PROMPT,
  buildTocTitleRequest,
  checkTocTitle,
  judgeTocTitles,
  tocTitleUserText,
} from "./toc-title.ts";
export type { TocTitleItem, TocTitleProblem, TocTitleResult } from "./toc-title.ts";

// X15b: Intisari (ADR-097, ADR-098) dan glosarium berkunci.
export {
  DIGEST_LANG,
  DIGEST_LIMITS,
  DIGEST_MAX_TOKENS,
  DIGEST_MERGE_PROMPT,
  DIGEST_SECTION_PROMPT,
  buildDigestLeafRequest,
  buildDigestMergeRequest,
  digestLeafUserText,
  digestMergeUserText,
  judgeDigest,
  leafPointRange,
  mergePointRange,
  narrativeProblems,
  quoteTranslationProblems,
} from "./digest.ts";
export type {
  CountRange,
  DigestBlockInput,
  DigestJudgeContext,
  DigestLeafInput,
  DigestMergeInput,
  DigestSource,
  DigestSourcePoint,
  DigestSourceQuote,
  DigestStage,
  DigestVerdict,
  DroppedItem,
  JudgedDigest,
  JudgedPoint,
  JudgedQuote,
  LeafBlock,
  QuoteInspection,
  QuoteRange,
} from "./digest.ts";
export {
  GLOSSARY_GROUPS,
  GLOSSARY_TERMS,
  GLOSSARY_TERM_KEYS,
  GLOSSARY_V2,
  glossarySpoken,
  glossaryWritten,
} from "../prompts/glossary-v2.ts";
export type { GlossaryEntry, GlossaryGroup } from "../prompts/glossary-v2.ts";
export {
  GLOSSARY_GLOSS_GROUP,
  GLOSSARY_GLOSS_MAX_TOKENS,
  GLOSSARY_GLOSS_PROMPT,
  buildGlossaryGlossRequest,
  glossProblems,
  glossaryGlossUserText,
  glossaryTargets,
  judgeGlossaryGlosses,
} from "./glossary.ts";
export type { GlossaryGlossResult } from "./glossary.ts";

export { JUDGE_VERSION, JUDGE_MAX_TOKENS, JUDGE_PROMPT } from "../prompts/jawab-judge-v1.ts";

// S19: pipeline Jawab (routing + Citations + verifikasi sitasi ke DB).
export {
  JAWAB_EDITION_ID,
  JAWAB_PIPELINE_VERSION,
  JAWAB_PROMPT_VERSION,
  QUESTION_MAX_CHARS,
  HADITH_NOT_CITED,
  HADITH_UNKNOWN,
  hadithCheck,
  hadithClaims,
  jawabCandidates,
  runJawab,
} from "./jawab/pipeline.ts";
export type {
  FallbackReason,
  JawabCandidates,
  JawabReason,
  JawabBlock,
  JawabCitation,
  JawabDeps,
  JawabDiagnostics,
  JawabEvent,
  JawabHadith,
  JawabRefusal,
  JawabResult,
  JawabSearchHit,
  JawabStage,
} from "./jawab/pipeline.ts";
export {
  ANSWER_MAX_TOKENS,
  ANSWER_PROMPT,
  DOC_BUDGET_TOKENS,
  JAWAB_MAX_PROMPT_TOKENS,
  buildAnswerRequest,
  fitDocs,
} from "./jawab/answer.ts";
export {
  ROUTE_PROMPT_TOKENS_MAX,
  answerWorstUsd,
  jawabReserveUsd,
  retryReserveUsd,
  routeWorstUsd,
} from "./jawab/budget.ts";
export {
  ROUTE_MAX_TOKENS,
  ROUTE_PROMPT,
  buildRouteRequest,
  parseRoute,
  tocText,
} from "./jawab/route.ts";
export type { Route } from "./jawab/route.ts";
export {
  SEGMENT_SINGLE_MAX,
  buildDoc,
  docContext,
  docLabel,
  estimateTextTokens,
  segmentText,
  toDocumentBlock,
} from "./jawab/documents.ts";
export type { AnswerDoc, DocSegment } from "./jawab/documents.ts";
export {
  SPAN_MAX_CHARS,
  citationSpans,
  hadithStatements,
  isNotFound,
  stripArabic,
} from "./jawab/citations.ts";
export type { CitedSpan } from "./jawab/citations.ts";
export {
  MAX_SEARCHES,
  SEMANTIC_FOOTNOTE_LIMIT,
  SEMANTIC_LIMIT,
  SEMANTIC_WEIGHT,
  fuse,
  questionQuery,
  searchLists,
  semanticList,
  semanticLists,
  withPairs,
} from "./jawab/retrieve.ts";
export type { SearchList } from "./jawab/retrieve.ts";
export { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../prompts/answer-v1.ts";
export { ANSWER_FALSE_PREMISE } from "../prompts/answer-v3.ts";
export { answerCacheKey, tidyQuestion } from "./jawab/cache-key.ts";
