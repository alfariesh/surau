// Skema Zod baris DB app (migrations/app). Kolom dijaga sama dengan migrasi oleh schema.test.ts.
import { z } from "zod";
import { answerLogRow, reviewRow } from "./review.ts";
import { takhrijReviewRow } from "./takhrij-review.ts";
import { translationRevisionRow } from "./translation-revision.ts";

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

// Minat pada kitab kandidat "Segera hadir" (ADR-115): hanya pilihan tetap, tanpa data pribadi.
export const kitabInterestPurpose = z.enum(["self_study", "teaching", "research", "other"]);
export type KitabInterestPurpose = z.infer<typeof kitabInterestPurpose>;

export const kitabInterestArabic = z.enum(["beginner", "with_help", "fluent"]);
export type KitabInterestArabic = z.infer<typeof kitabInterestArabic>;

export const kitabInterestRow = z.strictObject({
  day: z.string(),
  candidate: z.string(),
  purpose: kitabInterestPurpose,
  arabic: kitabInterestArabic,
  votes: z.number().int().positive(),
});
export type KitabInterestRow = z.infer<typeof kitabInterestRow>;

/** Satu suara minat (batas sistem). Slug kandidat sama dengan CHECK migrasi: huruf kecil, angka, `-`. */
export const kitabInterestInput = z.strictObject({
  candidate: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  purpose: kitabInterestPurpose,
  arabic: kitabInterestArabic,
});
export type KitabInterestInput = z.input<typeof kitabInterestInput>;

/** Bilangan bulat non-negatif dalam teks (`"10"`), maksimal `max`. */
const intText = (max: number) =>
  z
    .string()
    .regex(/^(0|[1-9][0-9]{0,6})$/u)
    .transform(Number)
    .pipe(z.number().int().min(0).max(max));

/** Sakelar yang dikenal beserta tipe nilainya. Nilai di DB selalu teks. */
export const settingsValues = z.object({
  jawab_enabled: z.enum(["0", "1"]).transform((v) => v === "1"),
  // S20 (migrasi 0004, P-4): plafon bulanan dalam USD utuh dan kuota harian Jawab.
  budget_monthly_usd: intText(1000),
  quota_anon_daily: intText(1000),
  quota_ip_daily: intText(10_000),
});
export type Settings = z.infer<typeof settingsValues>;

/** Nilai yang boleh ditulis /admin untuk setiap kunci (teks seperti di DB). */
export const settingsInput = {
  jawab_enabled: z.enum(["0", "1"]),
  budget_monthly_usd: intText(1000).transform(String),
  quota_anon_daily: intText(1000).transform(String),
  quota_ip_daily: intText(10_000).transform(String),
} as const;
export type SettingKey = keyof typeof settingsInput;

/** Kuota harian Jawab (S20). `subject` = HMAC hex dengan kunci harian, bukan ID/IP mentah. */
export const quotaScope = z.enum(["anon", "ip"]);
export type QuotaScope = z.infer<typeof quotaScope>;
export const quotaDailyRow = z.strictObject({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  scope: quotaScope,
  subject: z.string().regex(/^[a-f0-9]{64}$/u),
  used: z.number().int().nonnegative(),
});
export type QuotaDailyRow = z.infer<typeof quotaDailyRow>;

/** Anggaran LLM per bulan kalender UTC, mikro-USD bulat (S20). */
export const llmBudgetRow = z.strictObject({
  period: z.string().regex(/^\d{4}-\d{2}$/u),
  cap_micro: z.number().int().nonnegative(),
  spent_micro: z.number().int().nonnegative(),
  reserved_micro: z.number().int().nonnegative(),
  warned_at: z.string().nullable(),
  updated_at: z.string(),
});
export type LlmBudgetRow = z.infer<typeof llmBudgetRow>;

export const ledgerKind = z.enum(["jawab", "retry"]);
export type LedgerKind = z.infer<typeof ledgerKind>;
export const ledgerStatus = z.enum(["reserved", "committed", "expired"]);
export const ledgerOutcome = z.enum(["answer", "not_found", "fallback", "error"]);
export type LedgerOutcome = z.infer<typeof ledgerOutcome>;

/** Satu panggilan berbiaya Jawab (S20). Tanpa teks pertanyaan atau jawaban. */
export const llmLedgerRow = z.strictObject({
  id: z.uuid(),
  kind: ledgerKind,
  period: z.string().regex(/^\d{4}-\d{2}$/u),
  created_at: z.string(),
  settled_at: z.string().nullable(),
  status: ledgerStatus,
  outcome: ledgerOutcome.nullable(),
  reason: z.string().max(32).nullable(),
  model: z.string().max(64).nullable(),
  reserved_micro: z.number().int().nonnegative(),
  cost_micro: z.number().int().nonnegative().nullable(),
  estimated: z.literal([0, 1]),
  requests: z.number().int().nonnegative(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_read_tokens: z.number().int().nonnegative(),
  cache_write_tokens: z.number().int().nonnegative(),
});
export type LlmLedgerRow = z.infer<typeof llmLedgerRow>;

/** Cache jawaban Jawab (S19, migrasi 0003). Tanpa teks pertanyaan: kunci = hash. */
export const answerCacheRow = z.strictObject({
  key: z.string().regex(/^[a-f0-9]{64}$/u),
  corpus_version: z.string().min(1),
  prompt_version: z.string().min(1),
  model: z.string().min(1),
  outcome: z.enum(["answer", "not_found"]),
  result_json: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  hits: z.number().int().nonnegative(),
});
export type AnswerCacheRow = z.infer<typeof answerCacheRow>;

export const appTables = {
  settings: settingRow,
  feedback: feedbackRow,
  answer_log: answerLogRow,
  review: reviewRow,
  answer_cache: answerCacheRow,
  quota_daily: quotaDailyRow,
  llm_budget: llmBudgetRow,
  llm_ledger: llmLedgerRow,
  takhrij_review: takhrijReviewRow,
  translation_revision: translationRevisionRow,
  kitab_interest: kitabInterestRow,
} as const;
