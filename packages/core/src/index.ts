// @surau/core: core tools baca (ARSITEKTUR-TEKNIS §4). Satu-satunya pintu ke data untuk membaca,
// dipakai bersama web (S09), MCP (S16), dan Jawab (S19). Semua fungsi menerima D1 (tipe
// struktural `D1Db`) dan mengembalikan `text_raw` persis dari DB beserta sitasi lengkap.
// Tanpa next/*, cloudflare:*, atau node:* (KONVENSI §Struktur).

export { listWorks, getWork } from "./works.ts";
export { getToc } from "./toc.ts";
export { readPage } from "./page.ts";
export { readSection } from "./section.ts";
export { buildCitation } from "./citation.ts";
export { SEARCH_MAX_HIGHLIGHTS, searchText } from "./search.ts";
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
