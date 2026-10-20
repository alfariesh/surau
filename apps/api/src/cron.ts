// Cron Worker `surau-api` (S20, ADR-065): `*/10 * * * *` (UTC). `surau-api-staging` mewarisinya
// (data staging). Tiap putaran: reservasi basi dibereskan, periode bulan berjalan dipastikan ada,
// dan peringatan 80% dicatat sekali per bulan. Putaran pertama setelah 00.00 UTC: hapus fisik data
// yang lewat masa simpan (P-7). Semua langkah idempoten, jadi putaran ganda tidak merusak.
import {
  MICRO,
  budgetPeriod,
  ensureBudgetPeriod,
  expireStaleReservations,
  getSettings,
  markBudgetWarning,
  purgeExpired,
} from "@surau/db";
import type { PurgeResult } from "@surau/db";

/** Reservasi yang belum dikomit setelah selang ini dianggap basi (Jawab terlama ±1 menit). */
export const STALE_RESERVATION_MS = 10 * 60_000;

export interface CronReport {
  event: "jawab_cron";
  environment: string;
  expired: number;
  budget_warning: boolean;
  purged: PurgeResult | null;
}

/** Putaran harian = putaran cron pertama hari itu (00.00–00.09 UTC). */
export function isDailyRun(at: Date): boolean {
  return at.getUTCHours() === 0 && at.getUTCMinutes() < 10;
}

export async function runCron(env: Cloudflare.Env, at: Date): Promise<CronReport> {
  const now = at.toISOString();
  const db = env.APP_DB;
  const expired = await expireStaleReservations(
    db,
    new Date(at.getTime() - STALE_RESERVATION_MS).toISOString(),
    now,
  );
  const period = budgetPeriod(at);
  const settings = await getSettings(db);
  await ensureBudgetPeriod(db, period, settings.budget_monthly_usd * MICRO, now);
  const warned = await markBudgetWarning(db, period, now);
  const purged = isDailyRun(at) ? await purgeExpired(db, at) : null;
  const report: CronReport = {
    event: "jawab_cron",
    environment: env.ENVIRONMENT,
    expired,
    budget_warning: warned !== null,
    purged,
  };
  console.info(JSON.stringify(report));
  if (warned !== null)
    console.warn(
      JSON.stringify({
        event: "jawab_budget_warning",
        environment: env.ENVIRONMENT,
        period,
        used_pct: Math.round(
          ((warned.spent_micro + warned.reserved_micro) / Math.max(warned.cap_micro, 1)) * 100,
        ),
      }),
    );
  return report;
}
