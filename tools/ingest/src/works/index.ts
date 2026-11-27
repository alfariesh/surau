// Kitab yang dikenal ingest (X31a, ADR-137) dan korpus bawaan. ID karya, edisi, dan slug wajib unik
// (dicek ingest). Ihya diarsipkan (ADR-142): konfigurasi, peta ID, dan sidik teksnya tetap di repo
// supaya ID-nya beku bila kembali (`--kitab ihya` + ADR baru), tetapi tidak ikut korpus bawaan.
// Kitab yang belum lolos "Definisi selesai" (X31) tidak boleh ikut promote (pengaman di promote.ts).
import { BIDAYAH } from "./bidayah.ts";
import type { CorpusConfig, WorkConfig } from "./config.ts";
import { IHYA } from "./ihya.ts";
import { TIBYAN } from "./tibyan.ts";

export type { CorpusConfig, WorkConfig } from "./config.ts";

export const WORKS: readonly WorkConfig[] = [IHYA, BIDAYAH, TIBYAN];

/** Korpus bawaan Gelombang 1 (ADR-142): tanpa Ihya, jadi bisa dibangun di mesin mana pun. */
export const CORPUS: CorpusConfig = {
  version: "kitab-v10",
  output: "surau-corpus-kitab-v10.sqlite",
  works: [BIDAYAH, TIBYAN],
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
