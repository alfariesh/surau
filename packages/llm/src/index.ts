// @surau/llm: pembungkus tipis Anthropic (ADR-013). S13: prompt berversi, request batch terjemahan dan
// ringkasan, validasi keluaran, harga token. S19 menambah pipeline Jawab. Tanpa node:* atau
// cloudflare:*: kunci API selalu diberikan pemanggil.

export { MAX_PROMPT_TOKENS, MODELS, createAnthropic, isModelId } from "./client.ts";
export type { ModelId } from "./client.ts";

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
  contentLength,
  footnoteMarkerDigits,
  hasArabicLetters,
  longestArabicRun,
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
