import { getBudget, getSettings, ledgerSummary } from "@surau/db";
import type { D1Db } from "@surau/db";
import { describe, expect, it, vi } from "vite-plus/test";

import { previousPeriod, transparencyMonths } from "./transparency-data";

vi.mock("@surau/db", async (original) => ({
  ...(await original<typeof import("@surau/db")>()),
  getSettings: vi.fn<typeof getSettings>(async () => ({
    jawab_enabled: false,
    budget_monthly_usd: 20,
    quota_anon_daily: 10,
    quota_ip_daily: 30,
  })),
  getBudget: vi.fn<typeof getBudget>(async () => null),
  ledgerSummary: vi.fn<typeof ledgerSummary>(async (_db, period) =>
    period === "2026-10"
      ? [
          {
            kind: "jawab",
            outcome: "answer",
            status: "committed",
            calls: 3,
            cost_micro: 9000,
            estimated: 0,
          },
          {
            kind: "retry",
            outcome: "answer",
            status: "committed",
            calls: 1,
            cost_micro: 3200,
            estimated: 0,
          },
          {
            kind: "jawab",
            outcome: "error",
            status: "committed",
            calls: 1,
            cost_micro: 16224,
            estimated: 1,
          },
          {
            kind: "jawab",
            outcome: null,
            status: "reserved",
            calls: 1,
            cost_micro: 16224,
            estimated: 0,
          },
        ]
      : [],
  ),
}));

describe("transparansi", () => {
  it("periode sebelumnya melewati pergantian tahun", () => {
    expect(previousPeriod("2026-10")).toBe("2026-09");
    expect(previousPeriod("2027-01")).toBe("2026-12");
  });

  it("biaya, perkiraan, pertanyaan (ulangan Sonnet bukan pertanyaan baru), plafon dari pengaturan", async () => {
    const months = await transparencyMonths({} as D1Db, new Date("2026-10-21T00:00:00Z"));
    expect(months.map((m) => m.period)).toEqual(["2026-10", "2026-09", "2026-08"]);
    expect(months[0]).toEqual({
      period: "2026-10",
      questions: 5,
      cost_usd: (9000 + 3200 + 16224 + 16224) / 1_000_000,
      estimated_usd: (16224 + 16224) / 1_000_000,
      cap_usd: 20,
    });
    expect(months[1]).toMatchObject({ questions: 0, cost_usd: 0, estimated_usd: 0 });
  });
});
