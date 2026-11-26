// Ledger kitab (X31a): setiap kitab yang dibangun ingest punya baris ledger yang sama ID-nya.
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { WORKS } from "./index.ts";
import { readLedger, unreleasedWorks } from "./ledger.ts";

const repo = join(import.meta.dirname, "../../../..");

describe("data/kitab/ledger.yaml", () => {
  const file = readLedger(repo);

  test("slug dan ID Shamela unik", () => {
    const slugs = file.kitab.map((k) => k.slug);
    const ids = file.kitab.map((k) => k.shamela);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("setiap kitab di build punya baris ledger yang cocok", () => {
    for (const w of WORKS) {
      const row = file.kitab.find((k) => k.slug === w.work.slug);
      expect(row, w.work.slug).toBeDefined();
      expect(row?.shamela).toBe(w.shamelaBook);
      expect(row?.openiti.uri).toBe(w.openiti.matan.file);
      expect(row?.openiti.rilis).toBe(w.openiti.release);
      expect(row?.openiti.takhrij).toBe(w.openiti.takhrij?.file);
      expect(row?.status).not.toBe("rencana");
    }
  });
});

describe("unreleasedWorks (pengaman promote, ADR-137)", () => {
  const ledger = readLedger(repo);
  test("Ihya tayang; Bidayah belum; slug tak dikenal dianggap belum", () => {
    expect(unreleasedWorks(ledger, ["ihya"])).toEqual([]);
    expect(unreleasedWorks(ledger, ["ihya", "bidayat-al-hidayah", "x"])).toEqual([
      "bidayat-al-hidayah",
      "x",
    ]);
  });
});
