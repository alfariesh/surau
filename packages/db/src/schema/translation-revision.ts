// Revisi terjemahan oleh editor terdaftar (X08, ADR-081; migrasi app 0006). Validasi isi teks
// (placeholder ayat, penanda, huruf Arab) ada di @surau/core (`validateTranslationText`); di sini
// cukup bentuk baris.
import { z } from "zod";

export const TRANSLATION_REVISION_KINDS = ["confirmed", "revised", "reverted"] as const;
export type TranslationRevisionKind = (typeof TRANSLATION_REVISION_KINDS)[number];
export const TRANSLATION_REVISION_STATUSES = [
  "active",
  "superseded",
  "proposed",
  "approved",
  "rejected",
] as const;
export type TranslationRevisionStatus = (typeof TRANSLATION_REVISION_STATUSES)[number];
export const TRANSLATION_AUTHOR_ROLES = ["ustadz", "editor", "admin"] as const;
export type TranslationAuthorRole = (typeof TRANSLATION_AUTHOR_ROLES)[number];

/** Panjang alasan koreksi (wajib untuk perbaikan). */
export const TRANSLATION_REASON_MAX = 500;
/** Sama dengan `TRANSLATION_TEXT_MAX` @surau/core. */
export const TRANSLATION_REVISION_TEXT_MAX = 8000;

const hex64 = z.string().regex(/^[a-f0-9]{64}$/u);
const revId = z.number().int().positive();

export const translationRevisionRow = z.strictObject({
  id: revId,
  passage_id: z.number().int().positive(),
  lang: z.literal("id"),
  kind: z.enum(TRANSLATION_REVISION_KINDS),
  text: z.string().min(1).max(TRANSLATION_REVISION_TEXT_MAX).nullable(),
  reason: z.string().max(TRANSLATION_REASON_MAX),
  restores_id: revId.nullable(),
  supersedes_id: revId.nullable(),
  base_sha256: hex64,
  draft_sha256: hex64,
  source_sha256: hex64,
  author_key: hex64,
  author_name: z.string().min(1).max(120),
  author_short: z.string().min(1).max(80),
  author_role: z.enum(TRANSLATION_AUTHOR_ROLES),
  author_public: z.union([z.literal(0), z.literal(1)]),
  status: z.enum(TRANSLATION_REVISION_STATUSES),
  corpus_version: z.string().min(1).max(80),
  created_at: z.string(),
});
export type TranslationRevisionRow = z.infer<typeof translationRevisionRow>;

/** Bentuk tulis (route sudah memvalidasi teks, identitas Access, dan peran editor). */
export const translationRevisionWrite = translationRevisionRow
  .omit({ id: true, status: true, supersedes_id: true })
  .refine((r) => (r.kind === "revised") === (r.text !== null), "text hanya untuk perbaikan")
  .refine((r) => r.kind === "reverted" || r.restores_id === null, "restores_id hanya untuk batal")
  .refine((r) => r.kind !== "revised" || r.reason.trim() !== "", "alasan wajib untuk perbaikan")
  .refine((r) => r.author_role !== "admin" || r.kind === "reverted", "admin hanya membatalkan");
export type TranslationRevisionWrite = z.infer<typeof translationRevisionWrite>;
