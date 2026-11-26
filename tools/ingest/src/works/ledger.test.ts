// Ledger kitab (X31a): setiap kitab yang dibangun ingest punya baris ledger yang sama ID-nya.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";
import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { WORKS } from "./index.ts";

const repo = join(import.meta.dirname, "../../../..");

const ledger = z.strictObject({
  kitab: z.array(
    z.strictObject({
      slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
      shamela: z.number().int().positive(),
      openiti: z.strictObject({
        uri: z.string().min(1),
        takhrij: z.string().optional(),
        rilis: z.string(),
        repo: z.string().regex(/^OpenITI\/\d{4}AH$/),
      }),
      edisi: z.string().min(1),
      wafat_h: z.number().int().positive(),
      lisensi: z.string().min(1),
      catatan_kaki: z.enum(["classical", "modern_editor", "none", "unknown"]),
      status: z.enum(["tayang", "staging", "rencana"]),
      intisari_bab: z.array(z.number().int().positive()).optional(),
    }),
  ),
});

describe("data/kitab/ledger.yaml", () => {
  const file = ledger.parse(parse(readFileSync(join(repo, "data/kitab/ledger.yaml"), "utf8")));

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
