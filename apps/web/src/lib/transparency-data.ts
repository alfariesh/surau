// Data /transparansi (S21): biaya AI per bulan dari ledger (S20, ADR-065), tanpa data pengguna.
// Biaya "perkiraan" = baris yang biaya aktualnya tidak diketahui dan dihitung konservatif.
import type { D1Db } from "@surau/db";
import { MICRO, budgetPeriod, getBudget, getSettings, ledgerSummary } from "@surau/db";

export interface TransparencyMonth {
  period: string;
  questions: number;
  cost_usd: number;
  estimated_usd: number;
  cap_usd: number;
}

/** `YYYY-MM` sebelumnya. */
export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export async function transparencyMonths(
  db: D1Db,
  at = new Date(),
  count = 3,
): Promise<TransparencyMonth[]> {
  const settings = await getSettings(db);
  const periods: string[] = [budgetPeriod(at)];
  while (periods.length < count) periods.push(previousPeriod(periods.at(-1)!));
  return Promise.all(
    periods.map(async (period) => {
      const [budget, rows] = await Promise.all([getBudget(db, period), ledgerSummary(db, period)]);
      const cost = rows.reduce((n, r) => n + r.cost_micro, 0);
      const estimated = rows
        .filter((r) => r.estimated > 0 || r.status !== "committed")
        .reduce((n, r) => n + r.cost_micro, 0);
      return {
        period,
        questions: rows.filter((r) => r.kind === "jawab").reduce((n, r) => n + r.calls, 0),
        cost_usd: cost / MICRO,
        estimated_usd: estimated / MICRO,
        cap_usd: (budget?.cap_micro ?? settings.budget_monthly_usd * MICRO) / MICRO,
      };
    }),
  );
}
