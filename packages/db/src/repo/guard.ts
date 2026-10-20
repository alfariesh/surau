// Repo pengaman biaya Jawab (S20, ADR-014, ADR-065): kuota harian, anggaran bulanan + ledger, dan
// pembersihan fisik (P-7). Setiap operasi yang harus atomik ditulis sebagai satu statement atau satu
// `batch`: D1 menjalankan batch sebagai transaksi, berurutan, tanpa diselingi request lain.
// Tidak ada teks pertanyaan, IP mentah, atau ID cookie di tabel-tabel ini.
import { z } from "zod";

import type { D1Db, D1Result } from "../d1.ts";
import { feedbackRow, feedbackStatus, llmBudgetRow, settingsInput } from "../schema/app.ts";
import type {
  FeedbackRow,
  LedgerKind,
  LedgerOutcome,
  LlmBudgetRow,
  QuotaScope,
  SettingKey,
} from "../schema/app.ts";
import { allRows, firstRow } from "./rows.ts";

/** 1 USD dalam mikro-USD (satuan uang di DB). */
export const MICRO = 1_000_000;

/** USD → mikro-USD bulat ke atas (biaya tidak pernah dibulatkan ke bawah). */
export function toMicro(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) throw new RangeError(`biaya tidak sah: ${usd}`);
  // Dibulatkan dulu ke 1/1000 mikro supaya galat floating point (0,002 × 1e6 = 2000,0000000002)
  // tidak menambah satu mikro-USD.
  return Math.ceil(Number((usd * MICRO).toFixed(3)));
}

/** Periode anggaran = bulan kalender UTC (`YYYY-MM`), sama dengan reset spend cap Anthropic. */
export function budgetPeriod(at: Date): string {
  return at.toISOString().slice(0, 7);
}

/** Hari kuota = tanggal UTC (`YYYY-MM-DD`). */
export function quotaDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

const changes = (r: D1Result | undefined): number => r?.meta?.changes ?? 0;

// ── Kuota harian ────────────────────────────────────────────────────────────────────────────

export interface QuotaSubjects {
  /** HMAC hex anon-id dengan kunci hari itu. */
  anon: string;
  /** HMAC hex jaringan IP dengan kunci hari itu. */
  ip: string;
}
export interface QuotaLimits {
  anon: number;
  ip: number;
}
export type QuotaResult =
  | { ok: true; anon: number; ip: number }
  | { ok: false; scope: QuotaScope; anon: number; ip: number };

const usedRow = z.strictObject({ scope: z.enum(["anon", "ip"]), used: z.number().int() });

/** Pemakaian hari ini untuk dua subjek (0 bila belum ada baris). */
export async function quotaUsed(
  db: D1Db,
  day: string,
  s: QuotaSubjects,
): Promise<{ anon: number; ip: number }> {
  const rows = await allRows(
    db
      .prepare(
        `SELECT scope, used FROM quota_daily
         WHERE day = ?1 AND ((scope = 'anon' AND subject = ?2) OR (scope = 'ip' AND subject = ?3))`,
      )
      .bind(day, s.anon, s.ip),
    usedRow,
  );
  return {
    anon: rows.find((r) => r.scope === "anon")?.used ?? 0,
    ip: rows.find((r) => r.scope === "ip")?.used ?? 0,
  };
}

/**
 * Pakai satu kuota: penghitung anon DAN IP naik bersama dalam satu statement, hanya bila keduanya
 * masih di bawah batas. Bila salah satu habis, tidak ada yang berubah (pengunjung tidak kehilangan
 * kuota anon karena jaringan IP-nya penuh, dan sebaliknya).
 */
export async function consumeQuota(
  db: D1Db,
  day: string,
  s: QuotaSubjects,
  limits: QuotaLimits,
): Promise<QuotaResult> {
  const rows = await allRows(
    db
      .prepare(
        `INSERT INTO quota_daily (day, scope, subject, used)
         SELECT ?1, column1, column2, 1 FROM (VALUES ('anon', ?2), ('ip', ?3))
         WHERE coalesce((SELECT used FROM quota_daily
                         WHERE day = ?1 AND scope = 'anon' AND subject = ?2), 0) < ?4
           AND coalesce((SELECT used FROM quota_daily
                         WHERE day = ?1 AND scope = 'ip' AND subject = ?3), 0) < ?5
         ON CONFLICT (day, scope, subject) DO UPDATE SET used = used + 1
         RETURNING scope, used`,
      )
      .bind(day, s.anon, s.ip, limits.anon, limits.ip),
    usedRow,
  );
  if (rows.length === 2) {
    return {
      ok: true,
      anon: rows.find((r) => r.scope === "anon")?.used ?? 0,
      ip: rows.find((r) => r.scope === "ip")?.used ?? 0,
    };
  }
  const used = await quotaUsed(db, day, s);
  return { ok: false, scope: used.anon >= limits.anon ? "anon" : "ip", ...used };
}

const quotaStatsRow = z.strictObject({
  scope: z.enum(["anon", "ip"]),
  subjects: z.number().int(),
  exhausted: z.number().int(),
  used: z.number().int(),
});

/** Ringkasan kuota satu hari untuk /admin (agregat saja, tanpa subjek). */
export async function quotaStats(
  db: D1Db,
  day: string,
  limits: QuotaLimits,
): Promise<Record<QuotaScope, { subjects: number; exhausted: number; used: number }>> {
  const rows = await allRows(
    db
      .prepare(
        `SELECT scope, count(*) AS subjects,
                sum(CASE WHEN (scope = 'anon' AND used >= ?2) OR (scope = 'ip' AND used >= ?3)
                         THEN 1 ELSE 0 END) AS exhausted,
                sum(used) AS used
         FROM quota_daily WHERE day = ?1 GROUP BY scope`,
      )
      .bind(day, limits.anon, limits.ip),
    quotaStatsRow,
  );
  const pick = (scope: QuotaScope) => {
    const r = rows.find((x) => x.scope === scope);
    return { subjects: r?.subjects ?? 0, exhausted: r?.exhausted ?? 0, used: r?.used ?? 0 };
  };
  return { anon: pick("anon"), ip: pick("ip") };
}

// ── Anggaran dan ledger ─────────────────────────────────────────────────────────────────────

const BUDGET_COLS = "period, cap_micro, spent_micro, reserved_micro, warned_at, updated_at";

export function getBudget(db: D1Db, period: string): Promise<LlmBudgetRow | null> {
  return firstRow(
    db.prepare(`SELECT ${BUDGET_COLS} FROM llm_budget WHERE period = ?`).bind(period),
    llmBudgetRow,
  );
}

/** Buat baris periode bila belum ada (plafon diambil saat dibuat); baris yang ada tidak diubah. */
export async function ensureBudgetPeriod(
  db: D1Db,
  period: string,
  capMicro: number,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO llm_budget (period, cap_micro, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (period) DO NOTHING`,
    )
    .bind(period, capMicro, now)
    .all();
}

export interface Reservation {
  /** UUID baris ledger. */
  id: string;
  kind: LedgerKind;
  period: string;
  /** Plafon bila periode belum ada (dari `settings.budget_monthly_usd`). */
  capMicro: number;
  amountMicro: number;
  now: string;
}

/**
 * Reservasi atomik: baris ledger `reserved` dibuat dan `reserved_micro` periode naik HANYA bila
 * `spent + reserved + jumlah <= cap`. Satu batch = satu transaksi, jadi permintaan bersamaan tidak
 * bisa bersama-sama melewati plafon. Mengembalikan `false` bila anggaran tidak cukup.
 */
export async function reserveBudget(db: D1Db, r: Reservation): Promise<boolean> {
  if (!Number.isInteger(r.amountMicro) || r.amountMicro <= 0)
    throw new RangeError(`jumlah reservasi tidak sah: ${r.amountMicro}`);
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO llm_budget (period, cap_micro, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT (period) DO NOTHING`,
      )
      .bind(r.period, r.capMicro, r.now),
    db
      .prepare(
        `INSERT INTO llm_ledger (id, kind, period, created_at, status, reserved_micro)
         SELECT ?1, ?2, period, ?3, 'reserved', ?4 FROM llm_budget
         WHERE period = ?5 AND spent_micro + reserved_micro + ?4 <= cap_micro`,
      )
      .bind(r.id, r.kind, r.now, r.amountMicro, r.period),
    db
      .prepare(
        `UPDATE llm_budget SET reserved_micro = reserved_micro + ?2, updated_at = ?3
         WHERE period = ?4
           AND EXISTS (SELECT 1 FROM llm_ledger WHERE id = ?1 AND status = 'reserved')
         RETURNING period`,
      )
      .bind(r.id, r.amountMicro, r.now, r.period),
  ]);
  return (results[2]?.results.length ?? 0) === 1;
}

export interface LedgerUsage {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}
export const EMPTY_LEDGER_USAGE: LedgerUsage = {
  requests: 0,
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_write_tokens: 0,
};

export interface Settlement {
  id: string;
  outcome: LedgerOutcome;
  reason: string | null;
  model: string | null;
  /** Biaya yang dihitung terpakai. `estimated` = biaya aktual tidak diketahui (= reservasi). */
  costMicro: number;
  estimated: boolean;
  usage: LedgerUsage;
  now: string;
}

/**
 * Komit biaya satu reservasi: `reserved` periode turun sebesar reservasi baris itu dan `spent` naik
 * sebesar biaya. Idempoten: baris yang sudah diselesaikan (komit lain atau cron) tidak diubah lagi.
 * Mengembalikan `false` bila baris tidak lagi `reserved`.
 */
export async function settleLedger(db: D1Db, s: Settlement): Promise<boolean> {
  if (!Number.isInteger(s.costMicro) || s.costMicro < 0)
    throw new RangeError(`biaya tidak sah: ${s.costMicro}`);
  const results = await db.batch([
    db
      .prepare(
        `UPDATE llm_budget
         SET reserved_micro = llm_budget.reserved_micro - l.reserved_micro,
             spent_micro = llm_budget.spent_micro + ?2, updated_at = ?3
         FROM (SELECT period, reserved_micro FROM llm_ledger
               WHERE id = ?1 AND status = 'reserved') AS l
         WHERE llm_budget.period = l.period`,
      )
      .bind(s.id, s.costMicro, s.now),
    db
      .prepare(
        `UPDATE llm_ledger
         SET status = 'committed', settled_at = ?2, outcome = ?3, reason = ?4, model = ?5,
             cost_micro = ?6, estimated = ?7, requests = ?8, input_tokens = ?9,
             output_tokens = ?10, cache_read_tokens = ?11, cache_write_tokens = ?12
         WHERE id = ?1 AND status = 'reserved'
         RETURNING id`,
      )
      .bind(
        s.id,
        s.now,
        s.outcome,
        s.reason === null ? null : s.reason.slice(0, 32),
        s.model === null ? null : s.model.slice(0, 64),
        s.costMicro,
        s.estimated ? 1 : 0,
        s.usage.requests,
        s.usage.input_tokens,
        s.usage.output_tokens,
        s.usage.cache_read_tokens,
        s.usage.cache_write_tokens,
      ),
  ]);
  return (results[1]?.results.length ?? 0) === 1;
}

/**
 * Reservasi basi (worker mati sebelum komit): dihitung terpakai sebesar reservasinya (biaya aktual
 * tidak diketahui, perkiraan konservatif supaya plafon tidak terlewati) lalu ditandai `expired`.
 * Mengembalikan jumlah baris yang dibereskan.
 */
export async function expireStaleReservations(
  db: D1Db,
  cutoff: string,
  now: string,
): Promise<number> {
  const results = await db.batch([
    db
      .prepare(
        `UPDATE llm_budget
         SET reserved_micro = llm_budget.reserved_micro - s.amount,
             spent_micro = llm_budget.spent_micro + s.amount, updated_at = ?2
         FROM (SELECT period, sum(reserved_micro) AS amount FROM llm_ledger
               WHERE status = 'reserved' AND created_at < ?1 GROUP BY period) AS s
         WHERE llm_budget.period = s.period`,
      )
      .bind(cutoff, now),
    db
      .prepare(
        `UPDATE llm_ledger
         SET status = 'expired', settled_at = ?2, cost_micro = reserved_micro, estimated = 1
         WHERE status = 'reserved' AND created_at < ?1
         RETURNING id`,
      )
      .bind(cutoff, now),
  ]);
  return results[1]?.results.length ?? 0;
}

/**
 * Tandai peringatan 80% sekali per periode. Mengembalikan baris periode bila baru saja melewati
 * ambang (pemanggil mencatat event peringatan), selain itu `null`.
 */
export function markBudgetWarning(
  db: D1Db,
  period: string,
  now: string,
): Promise<LlmBudgetRow | null> {
  return firstRow(
    db
      .prepare(
        `UPDATE llm_budget SET warned_at = ?2
         WHERE period = ?1 AND warned_at IS NULL AND cap_micro > 0
           AND (spent_micro + reserved_micro) * 5 >= cap_micro * 4
         RETURNING ${BUDGET_COLS}`,
      )
      .bind(period, now),
    llmBudgetRow,
  );
}

const summaryRow = z.strictObject({
  kind: z.enum(["jawab", "retry"]),
  outcome: z.string().nullable(),
  status: z.enum(["reserved", "committed", "expired"]),
  calls: z.number().int(),
  cost_micro: z.number().int(),
  estimated: z.number().int(),
});
export type LedgerSummaryRow = z.infer<typeof summaryRow>;

/** Jumlah panggilan dan biaya per jenis/hasil dalam satu periode (/admin, /transparansi). */
export function ledgerSummary(db: D1Db, period: string): Promise<LedgerSummaryRow[]> {
  return allRows(
    db
      .prepare(
        `SELECT kind, outcome, status, count(*) AS calls,
                coalesce(sum(coalesce(cost_micro, reserved_micro)), 0) AS cost_micro,
                sum(estimated) AS estimated
         FROM llm_ledger WHERE period = ? GROUP BY kind, outcome, status
         ORDER BY kind, outcome, status`,
      )
      .bind(period),
    summaryRow,
  );
}

// ── Pengaturan dan laporan (/admin) ─────────────────────────────────────────────────────────

/** Ubah satu pengaturan; nilai divalidasi skema per kunci (ZodError bila tidak sah). */
export async function setSetting(
  db: D1Db,
  key: SettingKey,
  value: string,
  now: string,
): Promise<void> {
  const v = settingsInput[key].parse(value);
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, v, now)
    .all();
}

/** Ubah plafon bulanan: pengaturan + periode berjalan (bila sudah ada) dalam satu transaksi. */
export async function setBudgetCap(
  db: D1Db,
  usd: number,
  period: string,
  now: string,
): Promise<void> {
  const value = settingsInput.budget_monthly_usd.parse(String(usd));
  await db.batch([
    db
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES ('budget_monthly_usd', ?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .bind(value, now),
    db
      .prepare(
        `INSERT INTO llm_budget (period, cap_micro, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT (period) DO UPDATE SET cap_micro = excluded.cap_micro,
           updated_at = excluded.updated_at,
           warned_at = CASE WHEN (spent_micro + reserved_micro) * 5 >= excluded.cap_micro * 4
                            THEN warned_at ELSE NULL END`,
      )
      .bind(period, Number(value) * MICRO, now),
  ]);
}

const FEEDBACK_COLS =
  "id, created_at, kind, passage_id, page_id, path, message, corpus_version, status, resolved_at";

/** Laporan terbaru (status apa pun), paling baru dulu. */
export function listRecentFeedback(db: D1Db, limit = 20): Promise<FeedbackRow[]> {
  const n = Math.min(Math.max(Math.trunc(limit), 1), 100);
  return allRows(
    db
      .prepare(`SELECT ${FEEDBACK_COLS} FROM feedback ORDER BY created_at DESC, id DESC LIMIT ?`)
      .bind(n),
    feedbackRow,
  );
}

/** Ubah status laporan; `resolved_at` diisi saat `fixed`/`rejected` (dasar retensi 12 bulan). */
export async function setFeedbackStatus(
  db: D1Db,
  id: number,
  status: z.infer<typeof feedbackStatus>,
  now: string,
): Promise<boolean> {
  const s = feedbackStatus.parse(status);
  const resolved = s === "fixed" || s === "rejected" ? now : null;
  const { results } = await db
    .prepare("UPDATE feedback SET status = ?2, resolved_at = ?3 WHERE id = ?1 RETURNING id")
    .bind(id, s, resolved)
    .all();
  return results.length === 1;
}

// ── Pembersihan fisik (P-7) ─────────────────────────────────────────────────────────────────

/** Lama simpan (hari) yang ditegakkan cron; sama dengan tabel retensi docs/05 §8. */
export const RETENTION_DAYS = {
  quota_daily: 7,
  feedback_after_resolved: 365,
  llm_ledger: 730,
} as const;

export interface PurgeResult {
  answer_cache: number;
  answer_log: number;
  review: number;
  quota_daily: number;
  feedback: number;
  llm_ledger: number;
}

const daysBefore = (at: Date, days: number) => new Date(at.getTime() - days * 86_400_000);

/**
 * Hapus fisik semua data yang lewat masa simpan, dalam satu batch. `answer_cache`/`answer_log`
 * memakai `expires_at` masing-masing (tinjauan atas jawaban yang dihapus ikut dihapus lebih dulu).
 * Laporan kesalahan hanya dihapus setelah selesai ditangani + 12 bulan; yang belum ditangani tetap.
 */
export async function purgeExpired(db: D1Db, at: Date): Promise<PurgeResult> {
  const now = at.toISOString();
  const results = await db.batch([
    db.prepare("DELETE FROM answer_cache WHERE expires_at <= ?").bind(now),
    db
      .prepare(
        "DELETE FROM review WHERE answer_id IN (SELECT id FROM answer_log WHERE expires_at <= ?)",
      )
      .bind(now),
    db.prepare("DELETE FROM answer_log WHERE expires_at <= ?").bind(now),
    db
      .prepare("DELETE FROM quota_daily WHERE day < ?")
      .bind(quotaDay(daysBefore(at, RETENTION_DAYS.quota_daily))),
    db
      .prepare(
        `DELETE FROM feedback
         WHERE status IN ('fixed', 'rejected') AND resolved_at IS NOT NULL AND resolved_at < ?`,
      )
      .bind(daysBefore(at, RETENTION_DAYS.feedback_after_resolved).toISOString()),
    db
      .prepare("DELETE FROM llm_ledger WHERE status <> 'reserved' AND created_at < ?")
      .bind(daysBefore(at, RETENTION_DAYS.llm_ledger).toISOString()),
  ]);
  return {
    answer_cache: changes(results[0]),
    review: changes(results[1]),
    answer_log: changes(results[2]),
    quota_daily: changes(results[3]),
    feedback: changes(results[4]),
    llm_ledger: changes(results[5]),
  };
}
