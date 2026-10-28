// Tes regresi label status hadits (X06, ADR-069; versi 2, ADR-108; versi 3, ADR-113) atas takhrij Ihya di D1 lokal: jenis istilah untuk
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
  [10000058, "j028 mauquf, lemah, marfu' tidak ditemukan", ["mawquf", "daif", "lam_ajid_marfu"]],
  [10000070, "j029 mu'allaq, sanad tidak ditemukan", ["muallaq", "lam_ajid"]],
];

/**
 * Aturan versi 2 (ADR-108): jenis istilah (himpunan) per catatan kaki yang dikoreksi atau ditandai
 * menyesatkan oleh tinjauan agent 2026-10-26 (`data/reviews/ihya-9472-takhrij-agent-2026-10-26.jsonl`)
 * dan kini cocok dengan keputusannya. Jenis baru versi 2 (`tsiqat`, `mukhtalaf`, `dibantah`,
 * `lam_ajid_marfu`) ikut dicatat. Empat koreksi yang belum cocok (salah cetak edisi, catatan kaki
 * gabungan) dilaporkan di `data/reports/ihya-9472-takhrij-v2.md`.
 */
const AGENT_REVIEWED: readonly [number, string[]][] = [
  [10000058, ["daif", "lam_ajid_marfu", "mawquf"]],
  [10000686, ["lam_ajid_marfu", "mawquf"]],
  [10001658, ["daif", "sahih"]],
  [10003118, ["sahih", "sebagian"]],
  [10004183, ["gharib"]],
  [10004349, ["daif", "hasan", "jayyid", "sahih"]],
  [10004548, ["daif", "hasan"]],
  [10005761, ["daif"]],
  [10005830, ["muttafaq"]],
  [10005994, ["daif"]],
  [10007657, ["mursal"]],
  [10007805, ["daif", "sahih"]],
  [10008836, ["daif", "tsiqat"]],
  [10009884, ["bukhari", "daif", "muallaq", "mursal", "sangat_lemah"]],
  [10010245, ["gharib", "mukhtalaf"]],
  [10011214, ["daif"]],
  [10011388, ["mursal"]],
  [10011412, ["daif", "gharib", "hasan", "muslim", "muttafaq", "sahih"]],
  [10011514, ["la_asl", "muslim"]],
  [10011552, ["muttafaq", "rujukan"]],
  [10011553, ["mawquf", "muttafaq"]],
  [10011581, ["bukhari", "muttafaq"]],
  [10011993, ["daif", "dibantah", "sangat_lemah"]],
  [10012837, ["daif", "mursal"]],
  [10013881, ["daif", "muslim", "sebagian"]],
  [10013966, ["daif", "mawquf", "sangat_lemah", "sebagian", "tsiqat"]],
  [10014245, ["lam_ajid_lafaz", "mukhtalaf", "muttafaq", "rujukan", "sebagian"]],
  [10014268, ["lam_ajid"]],
  [10014350, ["daif", "muslim"]],
  [10016409, ["gharib", "hasan_sahih", "rujukan"]],
  [10016535, ["jayyid", "sangat_lemah", "sebagian"]],
  [10016551, ["daif", "mursal"]],
  [10016642, ["daif", "rujukan", "sebagian"]],
  [10016662, ["muslim", "muttafaq", "sangat_lemah", "sebagian"]],
  [10016795, ["daif", "dibantah"]],
  [10017400, ["bukhari", "daif", "hasan", "lam_ajid_lafaz", "muttafaq", "rujukan", "sangat_lemah"]],
  [10017880, ["daif", "gharib", "hasan", "mawquf", "sebagian"]],
  [10018659, ["lam_ajid", "mursal"]],
  [10019889, ["rujukan"]],
  [10020462, ["daif", "la_bas"]],
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
    const ids = [...GOLD.map(([id]) => id), ...AGENT_REVIEWED.map(([id]) => id)];
    try {
      const { results } = await db
        .prepare(`SELECT id, text_raw FROM passage WHERE id IN (${ids.map(() => "?").join(",")})`)
        .bind(...ids)
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
    if (!GOLD.every(([id]) => texts.has(id))) skip("Ihya belum dimuat di D1 lokal");
    for (const [id, name, kinds] of GOLD) {
      const label = takhrijLabel(texts.get(id)!);
      expect(
        label.terms.map((t) => t.kind),
        name,
      ).toEqual(kinds);
      expect(label.kind, name).toBe("terms");
    }
  });

  test("versi 2: jenis istilah cocok dengan koreksi tinjauan agent", ({ skip }) => {
    if (!AGENT_REVIEWED.every(([id]) => texts.has(id))) skip("Ihya belum dimuat di D1 lokal");
    for (const [id, kinds] of AGENT_REVIEWED) {
      const got = [...new Set(takhrijLabel(texts.get(id)!).terms.map((t) => t.kind))].sort();
      expect(got, String(id)).toEqual(kinds);
    }
  });
});
