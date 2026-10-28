// Pemeriksaan umum keluaran LLM (S13). Aturan teks-arab: teks Arab buatan model tidak pernah tampil
// sebagai kutipan, jadi keluaran yang menyalin teks Arab panjang ditolak (istilah ditulis Latin).

// Pemeriksa teks murni dipindah ke @surau/core (X08, ADR-081) supaya web memakainya tanpa
// menarik @surau/llm; diekspor ulang di sini untuk pemanggil batch.
export { footnoteMarkerDigits, hasArabicLetters, hasMarkdown, stripMarkers } from "@surau/core";

// Pemeriksa keluaran terjemahan dipindah ke @surau/core (X27, ADR-132) supaya plugin redaksi memakai
// aturan yang sama; diekspor ulang di sini untuk pemanggil batch.
export {
  MAX_ARABIC_RUN_WORDS,
  REFILL_WINDOW,
  contentLength,
  letterLength,
  longestArabicRun,
  refillsAyah,
  restoreFootnoteMarkers,
} from "@surau/core";

// Pemeriksa narasi (komentar model, basa-basi, bahasa atribusi) dipindah ke @surau/core (X23) supaya
// pemeriksa draf konten di MCP memakainya; diekspor ulang di sini untuk pemanggil batch.
export {
  addressesReader,
  hasFatwaLanguage,
  hasFirstPerson,
  hasHadithStatus,
  hasMetaCommentary,
  hasPreamble,
  paraphrasesAyah,
} from "@surau/core";
