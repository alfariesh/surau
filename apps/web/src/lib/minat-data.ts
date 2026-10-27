// Rekap /admin untuk suara minat kitab kandidat (ADR-115): jumlah per kandidat, dipecah menurut
// tujuan membaca dan kemampuan baca Arab. Semua kandidat yang tampil ikut, termasuk yang 0 suara.
import type { KitabInterestArabic, KitabInterestCount, KitabInterestPurpose } from "@surau/db";

import type { UpcomingKitab } from "../content/kitab-mendatang";

export interface MinatSummary {
  slug: string;
  title_id: string;
  total: number;
  purposes: Record<KitabInterestPurpose, number>;
  arabic: Record<KitabInterestArabic, number>;
}

export function minatSummary(
  items: readonly UpcomingKitab[],
  counts: readonly KitabInterestCount[],
): MinatSummary[] {
  const rows = new Map<string, MinatSummary>(
    items.map((k) => [
      k.slug,
      {
        slug: k.slug,
        title_id: k.title_id,
        total: 0,
        purposes: { self_study: 0, teaching: 0, research: 0, other: 0 },
        arabic: { beginner: 0, with_help: 0, fluent: 0 },
      },
    ]),
  );
  for (const c of counts) {
    // Suara untuk kandidat yang sudah tidak tampil tidak dihitung di rekap ini.
    const row = rows.get(c.candidate);
    if (!row) continue;
    row.total += c.votes;
    row.purposes[c.purpose] += c.votes;
    row.arabic[c.arabic] += c.votes;
  }
  // Urutan stabil: suara terbanyak dulu, seri mengikuti urutan tampil di /kitab.
  return [...rows.values()]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.total - a.r.total || a.i - b.i)
    .map(({ r }) => r);
}
