import { describe, expect, it } from "vite-plus/test";

import { UPCOMING_KITAB } from "../content/kitab-mendatang";
import { minatSummary } from "./minat-data";

describe("minatSummary (ADR-115)", () => {
  it("menjumlah per kandidat, memecah per pilihan, dan mengurutkan dari suara terbanyak", () => {
    const rows = minatSummary(UPCOMING_KITAB, [
      { candidate: "al-waraqat", purpose: "teaching", arabic: "fluent", votes: 2 },
      { candidate: "al-waraqat", purpose: "self_study", arabic: "beginner", votes: 1 },
      { candidate: "at-tarifat", purpose: "research", arabic: "with_help", votes: 1 },
      { candidate: "sudah-dihapus", purpose: "other", arabic: "fluent", votes: 9 },
    ]);
    expect(rows).toHaveLength(UPCOMING_KITAB.length);
    expect(rows[0]).toMatchObject({
      slug: "al-waraqat",
      total: 3,
      purposes: { teaching: 2, self_study: 1, research: 0, other: 0 },
      arabic: { fluent: 2, beginner: 1, with_help: 0 },
    });
    expect(rows[1]?.slug).toBe("at-tarifat");
    expect(rows[2]?.slug).toBe(UPCOMING_KITAB[0]?.slug);
    expect(rows.reduce((n, r) => n + r.total, 0)).toBe(4);
  });
});
