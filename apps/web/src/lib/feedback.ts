// Konstanta laporan kesalahan yang dipakai bersama formulir (klien) dan /api/feedback (server).
// Sengaja tanpa Zod supaya tidak ikut ke bundel klien; skemanya di `feedback-schema.ts`.

/** Jenis laporan dari pembaca kitab (subset `feedback.kind` di DB app). */
export const FEEDBACK_KINDS = ["text", "translation", "citation", "toc", "other"] as const;
export type ReaderFeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** Sama dengan CHECK `feedback.message` (DB app, ADR-029). */
export const FEEDBACK_MESSAGE_MAX = 2000;

/** Batas ukuran body JSON. Pesan 2.000 karakter Arab ±6 KB UTF-8 + field lain. */
export const FEEDBACK_BODY_MAX_BYTES = 8192;
