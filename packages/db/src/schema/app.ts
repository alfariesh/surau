// Skema Zod baris DB app (migrations/app). Kolom dijaga sama dengan migrasi oleh schema.test.ts.
import { z } from "zod";
import { answerLogRow, reviewRow } from "./review.ts";

export const settingRow = z.strictObject({
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
});
export type SettingRow = z.infer<typeof settingRow>;

export const feedbackKind = z.enum(["text", "citation", "toc", "translation", "answer", "other"]);
export type FeedbackKind = z.infer<typeof feedbackKind>;

export const feedbackStatus = z.enum(["new", "triaged", "fixed", "rejected"]);
export type FeedbackStatus = z.infer<typeof feedbackStatus>;

export const feedbackRow = z.strictObject({
  id: z.number().int().positive(),
  created_at: z.string(),
  kind: feedbackKind,
  passage_id: z.number().int().positive().nullable(),
  page_id: z.number().int().positive().nullable(),
  path: z.string().nullable(),
  message: z.string(),
  corpus_version: z.string().nullable(),
  status: feedbackStatus,
  resolved_at: z.string().nullable(),
});
export type FeedbackRow = z.infer<typeof feedbackRow>;

// Karakter kontrol (termasuk NUL, yang memotong length() SQLite) ditolak di sini supaya input
// buruk berakhir sebagai ZodError (400), bukan error CHECK D1 (500).
const noControl = (v: string) => !/\p{Cc}/u.test(v.replaceAll(/[\n\t]/g, " "));

/**
 * Input laporan dari pengguna (batas sistem). Sama dengan CHECK di migrasi: path tanpa query
 * string/fragmen (pertanyaan pengguna tidak boleh tersimpan, P-7), pesan 1–2000 karakter.
 */
export const feedbackInput = z.strictObject({
  kind: feedbackKind,
  passage_id: z.number().int().positive().nullable().default(null),
  page_id: z.number().int().positive().nullable().default(null),
  path: z
    .string()
    .max(300)
    .regex(/^\/[^?#]*$/, "path harus diawali / dan tanpa ? atau #")
    .refine((v) => !/[\p{Cc}\s]/u.test(v), "path tanpa spasi/karakter kontrol")
    .nullable()
    .default(null),
  message: z.string().trim().min(1).max(2000).refine(noControl, "pesan memuat karakter kontrol"),
  corpus_version: z.string().max(64).nullable().default(null),
});
export type FeedbackInput = z.input<typeof feedbackInput>;

/** Sakelar yang dikenal beserta tipe nilainya. Nilai di DB selalu teks. */
export const settingsValues = z.object({
  jawab_enabled: z.enum(["0", "1"]).transform((v) => v === "1"),
});
export type Settings = z.infer<typeof settingsValues>;

export const appTables = {
  settings: settingRow,
  feedback: feedbackRow,
  answer_log: answerLogRow,
  review: reviewRow,
} as const;
