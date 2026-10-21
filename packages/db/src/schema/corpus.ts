// Skema Zod baris DB korpus: satu skema per tabel, kolom persis sama dengan
// migrations/corpus (dijaga tes schema.test.ts lewat PRAGMA table_info). Baris D1 berisi
// number | string | null; kolom 0/1 tetap angka di sini (`flag`), bukan boolean.
import { z } from "zod";

const id = z.number().int().positive();
const int = z.number().int();
const flag = z.literal([0, 1]);

export const reviewStatus = z.enum(["ai_generated", "reviewed", "ustadz_verified", "rejected"]);
export type ReviewStatus = z.infer<typeof reviewStatus>;

export const attributionStatus = z.enum(["authentic", "disputed", "spurious"]);
export type AttributionStatus = z.infer<typeof attributionStatus>;

export const passageKind = z.enum(["body", "foot"]);
export type PassageKind = z.infer<typeof passageKind>;

export const authorRow = z.strictObject({
  id,
  name_ar: z.string(),
  name_id: z.string().nullable(),
  death_hijri: int.nullable(),
  shamela_author_id: int.nullable(),
  wikidata_id: z.string().nullable(),
});
export type AuthorRow = z.infer<typeof authorRow>;

export const workRow = z.strictObject({
  id,
  slug: z.string(),
  openiti_uri: z.string().nullable(),
  title_ar: z.string(),
  title_id: z.string().nullable(),
  author_id: id.nullable(),
  attribution_status: attributionStatus,
  original_language: z.string(),
  period: z.string().nullable(),
});
export type WorkRow = z.infer<typeof workRow>;

export const editionRow = z.strictObject({
  id,
  work_id: id,
  slug: z.string(),
  is_default: flag,
  source: z.enum(["shamela", "openiti"]),
  source_ref: z.string(),
  publisher: z.string().nullable(),
  city: z.string().nullable(),
  volumes: int.nullable(),
  license: z.string(),
  attribution: z.string(),
});
export type EditionRow = z.infer<typeof editionRow>;

export const pageRow = z.strictObject({
  id,
  edition_id: id,
  seq: id,
  juz: id,
  page_no: int.nonnegative(),
  source_page_id: int.nullable(),
});
export type PageRow = z.infer<typeof pageRow>;

export const tocNodeRow = z.strictObject({
  id,
  edition_id: id,
  parent_id: id.nullable(),
  ord: int,
  level: id,
  title_ar: z.string(),
  start_page_id: id,
  source_title_id: int.nullable(),
  patched: flag,
});
export type TocNodeRow = z.infer<typeof tocNodeRow>;

export const passageRow = z.strictObject({
  id,
  edition_id: id,
  page_id: id,
  toc_node_id: id.nullable(),
  kind: passageKind,
  ord: id,
  text_raw: z.string(),
});
export type PassageRow = z.infer<typeof passageRow>;

export const footnoteRefRow = z.strictObject({
  passage_id: id,
  char_start: int.nonnegative(),
  char_end: int.positive(),
  marker: z.string(),
  footnote_passage_id: id,
});
export type FootnoteRefRow = z.infer<typeof footnoteRefRow>;

/** Alasan sebuah paragraf ditandai perlu ditinjau oleh ingest (migrasi 0002 + 0003, ADR-032). */
export const needsReviewReason = z.enum([
  "takhrij_inline",
  "takhrij_boundary",
  "takhrij_unmatched",
  "inline_unsplit",
  "footnote_orphan",
]);
export type NeedsReviewReason = z.infer<typeof needsReviewReason>;

export const passageNeedsReviewRow = z.strictObject({
  passage_id: id,
  reason: needsReviewReason,
});
export type PassageNeedsReviewRow = z.infer<typeof passageNeedsReviewRow>;

export const translationRow = z.strictObject({
  passage_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type TranslationRow = z.infer<typeof translationRow>;

export const summaryRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type SummaryRow = z.infer<typeof summaryRow>;

/** Judul node daftar isi berbahasa Indonesia, terjemahan AI (migrasi 0007, X04 bagian B). */
export const tocTitleTranslationRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type TocTitleTranslationRow = z.infer<typeof tocTitleTranslationRow>;

/** Subjudul kurasi pembaca berbahasa Indonesia, terjemahan AI; kunci = paragraf yang memuatnya. */
export const subheadingTranslationRow = z.strictObject({
  passage_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type SubheadingTranslationRow = z.infer<typeof subheadingTranslationRow>;

/** Stem sangat umum di `passage_fts` (migrasi 0004, S11): pengaman pencarian kata umum. */
export const termStatRow = z.strictObject({
  term: z.string().min(1),
  df: id,
});
export type TermStatRow = z.infer<typeof termStatRow>;

// ── Al-Qur'an (migrasi 0005, S12, ADR-040) ─────────────────────────────────────────────

const surahNo = z.number().int().min(1).max(114);
const ayahNo = z.number().int().positive();

export const quranSourceKind = z.enum(["text", "translation", "transliteration"]);
export type QuranSourceKind = z.infer<typeof quranSourceKind>;

/** ID baris `quran_source` yang diisi ingest (S12); dipakai juga core untuk memilih teks tampilan. */
export const QURAN_SOURCE = {
  uthmani: "tanzil-uthmani",
  simpleClean: "tanzil-simple-clean",
  translation: "kemenag-id",
  transliteration: "kemenag-latin",
} as const;

export const quranSourceRow = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  kind: quranSourceKind,
  lang: z.string(),
  name: z.string(),
  version: z.string(),
  license: z.string(),
  attribution: z.string(),
  url: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type QuranSourceRow = z.infer<typeof quranSourceRow>;

export const quranSurahRow = z.strictObject({
  surah: surahNo,
  name_ar: z.string(),
  name_latin: z.string(),
  revelation: z.enum(["makkah", "madinah"]),
  ayah_count: ayahNo,
});
export type QuranSurahRow = z.infer<typeof quranSurahRow>;

export const quranAyahRow = z.strictObject({
  surah: surahNo,
  ayah: ayahNo,
  juz: z.number().int().min(1).max(30),
  text_uthmani: z.string(),
  text_index: z.string(),
});
export type QuranAyahRow = z.infer<typeof quranAyahRow>;

export const quranTranslationRow = z.strictObject({
  surah: surahNo,
  ayah: ayahNo,
  source_id: z.string(),
  text: z.string(),
  /** JSON `[{ marker, text }]` (catatan kaki terjemahan, verbatim) atau null. */
  footnotes: z.string().nullable(),
});
export type QuranTranslationRow = z.infer<typeof quranTranslationRow>;

/** Isi kolom `quran_translation.footnotes` setelah di-parse. */
export const quranFootnotes = z.array(z.strictObject({ marker: z.string(), text: z.string() }));
export type QuranFootnotes = z.infer<typeof quranFootnotes>;

export const ayahMatch = z.enum(["exact", "similar"]);
export type AyahMatch = z.infer<typeof ayahMatch>;

export const passageAyahRefRow = z.strictObject({
  passage_id: id,
  char_start: int.nonnegative(),
  char_end: int.positive(),
  surah: surahNo,
  ayah_from: ayahNo,
  ayah_to: ayahNo,
  match: ayahMatch,
  partial: flag,
  bracketed: flag,
  alt_count: int.nonnegative(),
});
export type PassageAyahRefRow = z.infer<typeof passageAyahRefRow>;

export const metaRow = z.strictObject({
  key: z.string(),
  value: z.string(),
});
export type MetaRow = z.infer<typeof metaRow>;

/**
 * Isi tabel `meta` setelah ingest. `schema_version` diisi migrasi; sisanya diisi ingest (S07):
 * `norm_version` = `NORM_VERSION` @surau/text saat indeks dibangun.
 */
export const corpusMeta = z.object({
  schema_version: z.coerce.number().int().positive(),
  norm_version: z.coerce.number().int().positive().optional(),
  corpus_version: z.string().optional(),
  built_at: z.string().optional(),
  source_hash: z.string().optional(),
  /** `LATIN_NORM_VERSION` @surau/text saat indeks Indonesia dibangun (skema ≥ 6, S14). */
  latin_norm_version: z.coerce.number().int().positive().optional(),
});
export type CorpusMeta = z.infer<typeof corpusMeta>;

/** Versi skema korpus yang dibuat migrasi di repo ini (= nilai `meta.schema_version` terbaru). */
export const CORPUS_SCHEMA_VERSION = 7;

/** Skema korpus pertama yang punya indeks `passage_fts` terisi dan `term_stat` (S11, migrasi 0004). */
export const SEARCH_SCHEMA_VERSION = 4;

/** Skema korpus pertama yang punya tabel Qur'an dan `passage_ayah_ref` (S12, migrasi 0005). */
export const QURAN_SCHEMA_VERSION = 5;

/**
 * Skema korpus pertama yang punya indeks Indonesia `translation_fts`/`summary_fts` dan indeks
 * `toc_node_start` (S14, migrasi 0006).
 */
export const LATIN_SEARCH_SCHEMA_VERSION = 6;

/**
 * Skema korpus pertama yang punya judul daftar isi Indonesia `toc_title_translation` +
 * `subheading_translation` (X04 bagian B, migrasi 0007).
 */
export const TITLE_SCHEMA_VERSION = 7;

/** Tabel biasa korpus → skema barisnya (passage_fts tidak termasuk: tabel virtual turunan). */
export const corpusTables = {
  author: authorRow,
  work: workRow,
  edition: editionRow,
  page: pageRow,
  toc_node: tocNodeRow,
  passage: passageRow,
  footnote_ref: footnoteRefRow,
  passage_needs_review: passageNeedsReviewRow,
  translation: translationRow,
  summary: summaryRow,
  toc_title_translation: tocTitleTranslationRow,
  subheading_translation: subheadingTranslationRow,
  term_stat: termStatRow,
  quran_source: quranSourceRow,
  quran_surah: quranSurahRow,
  quran_ayah: quranAyahRow,
  quran_translation: quranTranslationRow,
  passage_ayah_ref: passageAyahRefRow,
  meta: metaRow,
} as const;
