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
});
export type CorpusMeta = z.infer<typeof corpusMeta>;

/** Versi skema korpus yang dibuat migrasi di repo ini (= nilai `meta.schema_version` terbaru). */
export const CORPUS_SCHEMA_VERSION = 3;

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
  meta: metaRow,
} as const;
