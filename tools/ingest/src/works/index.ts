// Daftar kitab yang dibangun ke satu korpus D1 (X31a, ADR-137). Urutan = urutan build; ID karya,
// edisi, dan slug wajib unik (dicek ingest). Kitab yang belum lolos "Definisi selesai" (X31) tidak
// boleh ikut promote ke produksi: bangun dengan `--kitab ihya` bila promote dilakukan lebih dulu.
import { BIDAYAH } from "./bidayah.ts";
import type { CorpusConfig, WorkConfig } from "./config.ts";
import { IHYA } from "./ihya.ts";

export type { CorpusConfig, WorkConfig } from "./config.ts";

export const WORKS: readonly WorkConfig[] = [IHYA, BIDAYAH];

export const CORPUS: CorpusConfig = {
  version: "kitab-v10",
  output: "surau-corpus-kitab-v10.sqlite",
  works: WORKS,
};

/** Konfigurasi kitab menurut slug karya; galat yang menyebut slug yang tersedia. */
export function workBySlug(slug: string): WorkConfig {
  const found = WORKS.find((w) => w.work.slug === slug);
  if (found === undefined) {
    throw new Error(
      `Kitab "${slug}" tidak dikenal. Pilihan: ${WORKS.map((w) => w.work.slug).join(", ")}`,
    );
  }
  return found;
}

/** Korpus berisi sebagian kitab (`--kitab a,b`), versi dan nama berkas tetap. */
export function corpusWith(slugs: readonly string[] | undefined): CorpusConfig {
  if (slugs === undefined || slugs.length === 0) return CORPUS;
  return { ...CORPUS, works: slugs.map(workBySlug) };
}
