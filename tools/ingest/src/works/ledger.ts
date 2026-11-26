// Ledger kitab (`data/kitab/ledger.yaml`, X31a): ID sumber, versi, edisi, kelas catatan kaki (ADR-138),
// dan status tayang per kitab. Dipakai tes konsistensi dan pengaman promote (ADR-137 butir 6).
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

export const LEDGER_FILE = "data/kitab/ledger.yaml";

export const ledgerFile = z.strictObject({
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
export type Ledger = z.infer<typeof ledgerFile>;

export function readLedger(repo: string): Ledger {
  return ledgerFile.parse(parse(readFileSync(join(repo, LEDGER_FILE), "utf8")));
}

/**
 * Kitab di build yang belum berstatus `tayang` di ledger (atau tidak ada di ledger). Promote produksi
 * menolak build berisi kitab seperti ini kecuali diizinkan eksplisit (`--kitab-baru`, ADR-137).
 */
export function unreleasedWorks(ledger: Ledger, slugs: readonly string[]): string[] {
  return slugs.filter((s) => ledger.kitab.find((k) => k.slug === s)?.status !== "tayang");
}
