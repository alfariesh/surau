import { describe, expect, it } from "vite-plus/test";

import { UPCOMING_KITAB } from "./kitab-mendatang";
import data from "./kitab-mendatang.data.json";

describe("kitab kandidat Segera hadir (ADR-115)", () => {
  it("setiap kandidat punya data Shamela, dan setiap data Shamela dipakai", () => {
    const used = UPCOMING_KITAB.map((k) => data.find((d) => d.title_ar === k.title_ar)?.shamela_id);
    expect(new Set(used)).toEqual(new Set(data.map((d) => d.shamela_id)));
    expect(UPCOMING_KITAB).toHaveLength(data.length);
    expect(new Set(UPCOMING_KITAB.map((k) => k.slug)).size).toBe(UPCOMING_KITAB.length);
  });

  it("judul Arab dari JSON salinan Shamela, bukan teks Latin", () => {
    for (const k of UPCOMING_KITAB) {
      expect(k.title_ar, k.slug).toMatch(/^[\u0600-\u06FF\s\u060C-]+$/);
      expect(k.slug).toMatch(/^[a-z0-9-]{1,64}$/);
      for (const a of k.authors) expect(a.death_hijri, k.slug).toBeGreaterThan(0);
    }
  });

  it("tahun wafat mengikuti urutan pengarang (Jalalayn: al-Mahalli lalu as-Suyuthi)", () => {
    const jalalayn = UPCOMING_KITAB.find((k) => k.slug === "tafsir-al-jalalayn");
    expect(jalalayn?.authors).toEqual([
      { name: "Jalaluddin al-Mahalli", death_hijri: 864 },
      { name: "Jalaluddin as-Suyuthi", death_hijri: 911 },
    ]);
  });
});
