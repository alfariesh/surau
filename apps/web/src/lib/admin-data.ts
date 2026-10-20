// Data /admin (S20, ADR-065): ringkasan biaya bulan berjalan, kuota hari ini (agregat), pengaturan,
// dan laporan kesalahan terbaru. Hanya dipanggil setelah identitas Access admin terverifikasi.
// Tanpa teks pertanyaan, IP, atau ID anon (tabel S20 memang tidak menyimpannya).
import { redactPii } from "@surau/core";
import type { D1Db, FeedbackRow } from "@surau/db";
import {
  MICRO,
  budgetPeriod,
  getBudget,
  getSettings,
  ledgerSummary,
  listRecentFeedback,
  quotaDay,
  quotaStats,
} from "@surau/db";

export interface AdminOverview {
  generated_at: string;
  settings: {
    jawab_enabled: boolean;
    budget_monthly_usd: number;
    quota_anon_daily: number;
    quota_ip_daily: number;
  };
  budget: {
    period: string;
    cap_usd: number;
    spent_usd: number;
    reserved_usd: number;
    /** Terpakai + tereservasi terhadap plafon (0–100+). */
    used_pct: number;
    warned_at: string | null;
  };
  /** Pertanyaan berbiaya bulan ini (baris ledger `jawab`, tanpa jawaban dari cache). */
  questions: number;
  outcomes: { outcome: string; calls: number; cost_usd: number; estimated: number }[];
  quota: {
    day: string;
    anon: { subjects: number; exhausted: number; used: number };
    ip: { subjects: number; exhausted: number; used: number };
  };
  feedback: FeedbackRow[];
}

const usd = (micro: number) => micro / MICRO;

export async function adminOverview(db: D1Db, at = new Date()): Promise<AdminOverview> {
  const settings = await getSettings(db);
  const period = budgetPeriod(at);
  const day = quotaDay(at);
  const [budget, summary, quota, feedback] = await Promise.all([
    getBudget(db, period),
    ledgerSummary(db, period),
    quotaStats(db, day, { anon: settings.quota_anon_daily, ip: settings.quota_ip_daily }),
    listRecentFeedback(db, 20),
  ]);
  const cap = budget?.cap_micro ?? settings.budget_monthly_usd * MICRO;
  const spent = budget?.spent_micro ?? 0;
  const reserved = budget?.reserved_micro ?? 0;
  const byOutcome = new Map<string, { calls: number; cost: number; estimated: number }>();
  for (const row of summary) {
    const key = row.status === "reserved" ? "berjalan" : (row.outcome ?? "basi");
    const cur = byOutcome.get(key) ?? { calls: 0, cost: 0, estimated: 0 };
    // Ulangan Sonnet dihitung biayanya, tetapi bukan pertanyaan tersendiri.
    if (row.kind === "jawab") cur.calls += row.calls;
    cur.cost += row.cost_micro;
    cur.estimated += row.estimated;
    byOutcome.set(key, cur);
  }
  return {
    generated_at: at.toISOString(),
    settings,
    budget: {
      period,
      cap_usd: usd(cap),
      spent_usd: usd(spent),
      reserved_usd: usd(reserved),
      used_pct: cap > 0 ? Math.round(((spent + reserved) / cap) * 1000) / 10 : 100,
      warned_at: budget?.warned_at ?? null,
    },
    questions: summary.filter((r) => r.kind === "jawab").reduce((n, r) => n + r.calls, 0),
    outcomes: [...byOutcome.entries()].map(([outcome, v]) => ({
      outcome,
      calls: v.calls,
      cost_usd: usd(v.cost),
      estimated: v.estimated,
    })),
    quota: { day, ...quota },
    // Laporan sebelum S20 belum disamarkan saat disimpan: samarkan lagi saat ditampilkan.
    feedback: feedback.map((f) => ({ ...f, message: redactPii(f.message).text })),
  };
}
