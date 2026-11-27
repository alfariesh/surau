// Ledger kitab (X31a): setiap kitab yang dibangun ingest punya baris ledger yang sama ID-nya.
import { join } from "node:path";

import { buildFtsMatch } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { CORPUS, WORKS } from "./index.ts";
import { droppedReleasedWorks, readLedger, unreleasedWorks } from "./ledger.ts";

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
      expect(row?.openiti.repo).toBe(w.openiti.repo);
      expect(row?.openiti.takhrij).toBe(w.openiti.takhrij?.file);
      expect(row?.status).not.toBe("rencana");
    }
  });

  test("smoke: cek catatan kaki hanya untuk kitab berkelas classical (ADR-138, X31a 8a)", () => {
    for (const w of WORKS) {
      const row = file.kitab.find((k) => k.slug === w.work.slug);
      expect(w.footnotes, w.work.slug).toBe(row?.catatan_kaki);
      expect(w.smoke.footnotes, w.work.slug).toBe(w.footnotes === "classical");
      // Kata contoh harus tetap menjadi kueri FTS sesudah normalisasi (bukan MATCH kosong).
      expect(buildFtsMatch(w.smoke.search), w.work.slug).not.toBeNull();
    }
  });

  test("korpus bawaan tidak memuat kitab arsip (ADR-142)", () => {
    for (const w of CORPUS.works) {
      expect(file.kitab.find((k) => k.slug === w.work.slug)?.status, w.work.slug).not.toBe("arsip");
    }
    expect(CORPUS.works.map((w) => w.work.slug)).not.toContain("ihya");
  });
});

describe("unreleasedWorks (pengaman promote, ADR-137)", () => {
  const ledger = readLedger(repo);
  test("arsip dan staging belum tayang; slug tak dikenal dianggap belum", () => {
    expect(unreleasedWorks(ledger, ["ihya", "bidayat-al-hidayah", "at-tibyan", "x"])).toEqual([
      "ihya",
      "bidayat-al-hidayah",
      "at-tibyan",
      "x",
    ]);
  });
});

describe("droppedReleasedWorks (pengaman promote, ADR-142)", () => {
  // Ledger sintetis: tidak ikut berubah saat status kitab asli berubah.
  const row = readLedger(repo).kitab[0]!;
  const ledger = (rows: [string, "tayang" | "arsip" | "staging"][]) => ({
    kitab: rows.map(([slug, status]) => ({ ...row, slug, status })),
  });
  test("kitab tayang yang hilang dari build ditolak; kitab arsip dan staging boleh hilang", () => {
    const l = ledger([
      ["a", "tayang"],
      ["b", "arsip"],
      ["c", "staging"],
    ]);
    expect(droppedReleasedWorks(l, ["c"])).toEqual(["a"]);
    expect(droppedReleasedWorks(l, ["a"])).toEqual([]);
  });

  test("korpus bawaan memuat setiap kitab yang tayang di ledger asli", () => {
    const slugs = CORPUS.works.map((w) => w.work.slug);
    expect(droppedReleasedWorks(readLedger(repo), slugs)).toEqual([]);
  });
});
