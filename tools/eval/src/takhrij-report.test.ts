import { describe, expect, it } from "vite-plus/test";

import { labelReport, summarizeLabels } from "./takhrij-report.ts";

// Takhrij BUATAN (bukan teks kitab).
describe("laporan label takhrij", () => {
  it("ringkasan per jenis, per istilah, campuran, dan tanda kelemahan; laporan tanpa teks Arab", () => {
    const s = summarizeLabels([
      "حديث تجريبي رواه فلان بإسناد ضعيف",
      "حديث تجريبي رواه فلان بإسناد صحيح ورواه فلان بإسناد ضعيف",
      "حديث تجريبي أخرجه فلان",
      "حديث تجريبي تقدم",
      "(٤) وقال فلان كلاما تجريبيا",
    ]);
    expect(s).toMatchObject({
      total: 5,
      byKind: { terms: 2, sources_only: 1, refers_back: 1, not_takhrij: 1 },
      byTerm: { daif: 2, sahih: 1, rujukan: 1 },
      mixed: 1,
      weak: 2,
    });
    const md = labelReport("uji-v1", s);
    expect(md).toContain("· uji-v1");
    expect(md).toContain("| Hanya menyebut sumber riwayat | 1 | 20,0% |");
    expect(md).toContain("| lemah (`daif`) | 2 |");
    expect(md).not.toMatch(/\p{Script=Arabic}/u);
  });
});
