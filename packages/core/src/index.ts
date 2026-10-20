// @surau/core: core tools baca (ARSITEKTUR-TEKNIS §4). Satu-satunya pintu ke data untuk membaca,
// dipakai bersama web (S09), MCP (S16), dan Jawab (S19). Semua fungsi menerima D1 (tipe
// struktural `D1Db`) dan mengembalikan `text_raw` persis dari DB beserta sitasi lengkap.
// Tanpa next/*, cloudflare:*, atau node:* (KONVENSI §Struktur).

export { listWorks, getWork } from "./works.ts";
export { getToc } from "./toc.ts";
export { readPage } from "./page.ts";
export { readSection } from "./section.ts";
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
export { answerPassages, answerToc } from "./answer-context.ts";
export type { AnswerPassage, AnswerTocNode } from "./answer-context.ts";
export {
  AI_SNIPPET_CHARS,
  SEARCH_MAX_HIGHLIGHTS,
  SEARCH_RESULT_VERSION,
  searchCacheKey,
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
