// Skema masukan Jawab bersama web (`POST /api/jawab`) dan Worker `surau-api` (`POST /jawab`), supaya
// batas yang sama dicek di kedua sisi (utang S19, ADR-064 Konsekuensi). Pertanyaan selalu di body,
// tidak pernah di URL (P-7). Token Turnstile hanya dikirim saat server memintanya (S20, ADR-065).
import { z } from "zod";

export const JAWAB_QUESTION_MIN = 3;
export const JAWAB_QUESTION_MAX = 1000;
/** Batas panjang token Turnstile (docs siteverify). */
export const TURNSTILE_TOKEN_MAX = 2048;
/** Batas body JSON Jawab (web dan Worker). */
export const JAWAB_BODY_MAX_BYTES = 8 * 1024;

export const jawabRequest = z.strictObject({
  question: z
    .string()
    .trim()
    .min(JAWAB_QUESTION_MIN)
    .max(JAWAB_QUESTION_MAX)
    .refine((s) => !/\p{Cc}/u.test(s.replaceAll(/[\n\t]/gu, " ")), "karakter kontrol"),
  turnstile: z
    .string()
    .min(1)
    .max(TURNSTILE_TOKEN_MAX)
    .regex(/^[\x21-\x7e]+$/u, "token Turnstile tidak sah")
    .optional(),
});
export type JawabRequest = z.infer<typeof jawabRequest>;

/** Kode galat JSON Jawab sebelum stream dimulai (UI S21 memetakan ke pesan + mode Cari). */
export type JawabErrorCode =
  | "not_found"
  | "forbidden_origin"
  | "unsupported_media_type"
  | "too_large"
  | "invalid_json"
  | "invalid"
  | "rate_limited"
  | "unavailable"
  | "disabled"
  | "not_configured"
  | "challenge_required"
  | "challenge_failed"
  | "challenge_unavailable"
  | "quota_exceeded"
  | "budget";

/** Status Jawab untuk UI (`GET /api/jawab`), tanpa biaya LLM. */
export const jawabStatus = z.strictObject({
  available: z.boolean(),
  reason: z.enum(["disabled", "not_configured", "budget", "quota"]).nullable(),
  /** `true` = belum punya cookie anon yang sah: UI menyiapkan Turnstile sebelum bertanya. */
  challenge: z.boolean(),
  sitekey: z.string().nullable(),
  quota: z.strictObject({ used: z.number().int(), limit: z.number().int() }).nullable(),
});
export type JawabStatus = z.infer<typeof jawabStatus>;
