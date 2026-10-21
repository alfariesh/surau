// Tinjauan label status hadits (X07, ADR-070; migrasi app 0005). Kode jenis istilah divalidasi
// terhadap kosakata aturan di @surau/core (`takhrijReviewInput`); di sini cukup bentuknya.
import { z } from "zod";

export const TAKHRIJ_REVIEW_DECISIONS = ["approved", "corrected", "unsure"] as const;
export type TakhrijReviewDecision = (typeof TAKHRIJ_REVIEW_DECISIONS)[number];

const hex64 = z.string().regex(/^[a-f0-9]{64}$/u);
/** Kode jenis istilah (`TakhrijTermKind`), unik, paling banyak 20. */
export const takhrijKindCodes = z
  .array(z.string().regex(/^[a-z][a-z_]{1,19}$/u))
  .max(20)
  .refine((kinds) => new Set(kinds).size === kinds.length);

export const takhrijReviewRow = z.strictObject({
  passage_id: z.number().int().positive(),
  rules_version: z.number().int().positive(),
  label_hash: hex64,
  reviewer_key: hex64,
  reviewer_name: z.string().min(1).max(80),
  decision: z.enum(TAKHRIJ_REVIEW_DECISIONS),
  kinds_json: z.string().nullable(),
  note: z.string().max(2000),
  corpus_version: z.string().min(1).max(80),
  updated_at: z.string(),
});
export type TakhrijReviewRow = z.infer<typeof takhrijReviewRow>;

/** Baris yang sudah diurai: `kinds` = jenis istilah koreksi (null selain koreksi). */
export interface TakhrijReview extends Omit<TakhrijReviewRow, "kinds_json"> {
  kinds: string[] | null;
}

/** Bentuk tulis (sesudah validasi input + identitas Access di route). */
export const takhrijReviewWrite = takhrijReviewRow
  .omit({ kinds_json: true })
  .extend({ kinds: takhrijKindCodes.nullable() })
  .refine((r) => (r.decision === "corrected") === (r.kinds !== null));
export type TakhrijReviewWrite = z.infer<typeof takhrijReviewWrite>;
