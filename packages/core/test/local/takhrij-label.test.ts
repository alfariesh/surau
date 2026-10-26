// Tes regresi label status hadits (X06, ADR-069) atas takhrij Ihya di D1 lokal: jenis istilah untuk
// enam catatan kaki gold soal Jawab PUBLIK (`evals/jawab/ihya-draf-v2.jsonl`), yang cocok dengan
// kategori status gold-nya (dibandingkan manual di ADR-069). Mencegah perubahan aturan istilah
// diam-diam mengubah label kunci. Teks kitab tidak disalin ke sini; hanya ID dan jenis istilah.
// Dilewati bila state D1 lokal tidak ada (CI) atau Ihya belum dimuat. State disalin ke folder
// sementara (ARSITEKTUR §7).
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { D1Db } from "@surau/db";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { takhrijLabel } from "../../src/index.ts";

const repo = resolve(import.meta.dirname, "../../../..");
const state = join(repo, ".wrangler/state/v3");
const hasState = existsSync(join(state, "d1"));

/** Jenis istilah per catatan kaki gold publik (j024–j029). */
const GOLD: readonly [number, string, string[]][] = [
  [10000010, "j024 sanad lemah", ["daif"]],
  [10000011, "j025 dilemahkan", ["daif"]],
  [10000053, "j026 muttafaq 'alaih tanpa tambahan", ["muttafaq", "sebagian"]],
  [10000056, "j027 sanad lemah", ["daif"]],
  [10000058, "j028 mauquf, lemah, marfu' tidak ditemukan", ["mawquf", "daif", "lam_ajid"]],
  [10000070, "j029 mu'allaq, sanad tidak ditemukan", ["muallaq", "lam_ajid"]],
];

describe.skipIf(!hasState)("label takhrij gold publik di D1 lokal", () => {
  let db: D1Db;
  let dispose: (() => Promise<void>) | undefined;
  let tmp: string | undefined;
  const texts = new Map<number, string>();

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), "surau-core-takhrij-"));
    cpSync(join(state, "d1"), join(tmp, "v3", "d1"), { recursive: true });
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
      configPath: join(repo, "packages/db/wrangler.jsonc"),
      remoteBindings: false,
      persist: { path: join(tmp, "v3") },
    });
    dispose = proxy.dispose;
    db = proxy.env.CORPUS;
    const row = z.object({ id: z.number(), text_raw: z.string() });
    try {
      const { results } = await db
        .prepare(`SELECT id, text_raw FROM passage WHERE id IN (${GOLD.map(() => "?").join(",")})`)
        .bind(...GOLD.map(([id]) => id))
        .all();
      for (const r of results.map((x) => row.parse(x))) texts.set(r.id, r.text_raw);
    } catch (e) {
      if (!(e instanceof Error && /no such table/.test(e.message))) throw e;
    }
  }, 120_000);

  afterAll(async () => {
    await dispose?.();
    if (tmp !== undefined) rmSync(tmp, { recursive: true, force: true });
  });

  test("jenis istilah label = kategori status gold", ({ skip }) => {
    if (texts.size < GOLD.length) skip("Ihya belum dimuat di D1 lokal");
    for (const [id, name, kinds] of GOLD) {
      const label = takhrijLabel(texts.get(id)!);
      expect(
        label.terms.map((t) => t.kind),
        name,
      ).toEqual(kinds);
      expect(label.kind, name).toBe("terms");
    }
  });
});
