import { describe, expect, test } from "vite-plus/test";

import {
  T17_PER_STRATUM,
  drawT17Sample,
  parseT17Grades,
  stratumOf,
  t17Agreement,
  t17Report,
  wilson,
  type T17GradeRow,
} from "./t17.ts";

const population = Array.from({ length: 300 }, (_, i) => ({
  passage: 10_000_001 + i,
  length: (i * 7) % 900,
}));

describe("sampel T-17 tahap 3", () => {
  test("strata menurut panjang Arab: < 100, 100–499, ≥ 500", () => {
    expect([stratumOf(0), stratumOf(99), stratumOf(100), stratumOf(499), stratumOf(500)]).toEqual([
      "pendek",
      "pendek",
      "sedang",
      "sedang",
      "panjang",
    ]);
    expect(() => stratumOf(-1)).toThrow(RangeError);
  });

  test("20 per strata, unik, nomor tampil 1…60, deterministik dan tidak bergantung urutan masukan", () => {
    const a = drawT17Sample(population);
    const b = drawT17Sample([...population].reverse());
    expect(a).toEqual(b);
    expect(a.items).toHaveLength(3 * T17_PER_STRATUM);
    expect(new Set(a.items.map((i) => i.passage)).size).toBe(60);
    expect(a.items.map((i) => i.no)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    for (const s of ["pendek", "sedang", "panjang"]) {
      expect(a.items.filter((i) => i.stratum === s)).toHaveLength(20);
    }
    // Urutan tampil diacak (bukan urut strata).
    expect(a.items.slice(0, 20).every((i) => i.stratum === "pendek")).toBe(false);
    expect(drawT17Sample(population, 1).items).not.toEqual(a.items);
  });
});

describe("analisis", () => {
  test("Wilson 95%: nilai baku", () => {
    const [lo, hi] = wilson(0.8, 20);
    expect(lo).toBeCloseTo(0.584, 2);
    expect(hi).toBeCloseTo(0.919, 2);
    expect(wilson(0, 0)).toEqual([0, 1]);
  });

  test("estimasi tertimbang bobot populasi dan aturan keputusan pra-registrasi", () => {
    const { items } = drawT17Sample(population);
    const pop = { pendek: 5617, sedang: 8132, panjang: 2343 };
    const grade = (pick: (stratum: string, k: number) => T17GradeRow["grade"]) => {
      const counter: Record<string, number> = {};
      return items.map((i) => {
        counter[i.stratum] = (counter[i.stratum] ?? 0) + 1;
        return { no: i.no, grade: pick(i.stratum, counter[i.stratum]!), categories: [], note: "" };
      });
    };
    const allGood = t17Report(
      items,
      pop,
      grade(() => "B"),
    );
    expect(allGood.weighted.benar.p).toBe(1);
    expect(allGood.decision).toBe("lolos");
    // Salah 1/20 per strata (5%): lolos, tetapi batas atas interval > 10% = belum pasti.
    const unsure = t17Report(
      items,
      pop,
      grade((_, k) => (k === 1 ? "S" : "B")),
    );
    expect(unsure.weighted.salah.p).toBeCloseTo(0.05, 5);
    expect(unsure.decision).toBe("lolos-belum-pasti");
    // Kurang banyak, Salah rendah: terarah.
    expect(
      t17Report(
        items,
        pop,
        grade((_, k) => (k <= 6 ? "K" : "B")),
      ).decision,
    ).toBe("terarah");
    // Salah 4/20 (20%): luas.
    expect(
      t17Report(
        items,
        pop,
        grade((_, k) => (k <= 4 ? "S" : "B")),
      ).decision,
    ).toBe("luas");
    // Pendek semua Salah, lain Benar: tertimbang = bobot pendek.
    const short = t17Report(
      items,
      pop,
      grade((s) => (s === "pendek" ? "S" : "B")),
    );
    expect(short.weighted.salah.p).toBeCloseTo(5617 / 16092, 5);
    expect(t17Report(items, pop, grade(() => "B").slice(0, 10)).decision).toBe("belum-lengkap");
  });

  test("hasil penilai dari teks 'Salin hasil' atau JSON 'Unduh hasil'", () => {
    const text = parseT17Grades(
      "T-17 tahap 3 · sampel abc · penilai: Salman\n1 B\n2 K istilah,hilang — kata kunci kurang tepat\n3 salah negasi\nbaris lain",
    );
    expect(text.rater).toBe("Salman");
    expect(text.grades).toEqual([
      { no: 1, grade: "B", categories: [], note: "" },
      { no: 2, grade: "K", categories: ["istilah", "hilang"], note: "kata kunci kurang tepat" },
      { no: 3, grade: "S", categories: ["negasi"], note: "" },
    ]);
    const json = parseT17Grades(
      JSON.stringify({
        sample: "344d2b8f695d",
        rater: "Anas",
        grades: [{ no: 4, grade: "S", categories: ["dalil"], note: "x" }],
      }),
    );
    expect(json).toEqual({
      rater: "Anas",
      sample: "344d2b8f695d",
      grades: [{ no: 4, grade: "S", categories: ["dalil"], note: "x" }],
    });
  });

  test("kesepakatan dua penilai: persentase sama dan kappa Cohen", () => {
    const g = (no: number, grade: "B" | "K" | "S") => ({ no, grade, categories: [], note: "" });
    const a = [g(1, "B"), g(2, "B"), g(3, "K"), g(4, "S"), g(5, "B")];
    const b = [g(1, "B"), g(2, "K"), g(3, "K"), g(4, "S"), g(6, "B")];
    const r = t17Agreement(a, b)!;
    expect(r.n).toBe(4);
    expect(r.agree).toBeCloseTo(0.75, 5);
    // Kesepakatan harapan: (2/4·1/4) + (1/4·2/4) + (1/4·1/4) = 5/16 → kappa = (0,75 − 0,3125)/(1 − 0,3125).
    expect(r.kappa).toBeCloseTo((0.75 - 0.3125) / 0.6875, 5);
    expect(t17Agreement(a, [g(9, "B")])).toBeNull();
  });

  test("berkas JSON hasil divalidasi (nilai/kategori tidak dikenal = galat) dan membawa sidik sampel", () => {
    expect(
      parseT17Grades(
        JSON.stringify({
          sample: "344d2b8f695d",
          rater: "A",
          grades: [{ no: 1, grade: "B", categories: [], note: "" }],
        }),
      ).sample,
    ).toBe("344d2b8f695d");
    expect(() =>
      parseT17Grades(
        JSON.stringify({
          sample: "344d2b8f695d",
          rater: "A",
          grades: [{ no: 1, grade: "X", categories: [], note: "" }],
        }),
      ),
    ).toThrow(/invalid_value/);
    expect(parseT17Grades("T-17 tahap 3 · sampel 344d2b8f695d · penilai: A\n1 B").sample).toBe(
      "344d2b8f695d",
    );
  });
});
