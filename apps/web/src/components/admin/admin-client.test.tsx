import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import type { AdminOverview } from "../../lib/admin-data";
import { AdminClient } from "./admin-client";

// Tampilan berlogin /admin tidak bisa dibuka tanpa Cloudflare Access; render server memastikan panel
// tidak galat dan menampilkan angka serta laporan (pesan sudah disamarkan oleh admin-data).
const overview: AdminOverview = {
  generated_at: "2026-10-21T01:00:00.000Z",
  settings: {
    jawab_enabled: false,
    budget_monthly_usd: 20,
    quota_anon_daily: 10,
    quota_ip_daily: 30,
  },
  budget: {
    period: "2026-10",
    cap_usd: 20,
    spent_usd: 0.0123,
    reserved_usd: 0.0162,
    used_pct: 0.1,
    warned_at: null,
  },
  questions: 4,
  outcomes: [
    { outcome: "answer", calls: 3, cost_usd: 0.0099, estimated: 0 },
    { outcome: "error", calls: 1, cost_usd: 0.0162, estimated: 1 },
  ],
  quota: {
    day: "2026-10-21",
    anon: { subjects: 2, exhausted: 0, used: 4 },
    ip: { subjects: 2, exhausted: 0, used: 4 },
  },
  feedback: [
    {
      id: 7,
      created_at: "2026-10-20T10:00:00Z",
      kind: "citation",
      passage_id: null,
      page_id: null,
      path: "/kitab/ihya/1/200",
      message: "Nomor halaman salah. Hubungi [email].",
      corpus_version: "ihya-v7",
      status: "new",
      resolved_at: null,
    },
  ],
};

describe("AdminClient", () => {
  it("merender sakelar, biaya, kuota, dan laporan tanpa galat", () => {
    const html = renderToStaticMarkup(<AdminClient initial={overview} routeEnabled={false} />);
    expect(html).toContain("Jawab aktif");
    expect(html).toContain("2026-10");
    expect(html).toContain("Galat");
    expect(html).toContain("perkiraan");
    expect(html).toContain("Nomor halaman salah. Hubungi [email].");
    expect(html).toContain('href="/kitab/ihya/1/200"');
    expect(html).toContain("masih tertutup");
  });

  it("tanpa laporan dan biaya: pesan kosong", () => {
    const html = renderToStaticMarkup(
      <AdminClient initial={{ ...overview, outcomes: [], feedback: [] }} routeEnabled />,
    );
    expect(html).toContain("Belum ada biaya bulan ini.");
    expect(html).toContain("Belum ada laporan.");
    expect(html).toContain("terbuka");
  });
});
