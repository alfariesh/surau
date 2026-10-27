// Laporan label status hadits (X06, ADR-069): sebaran istilah takhrij di semua catatan kaki korpus
// (gratis, tanpa LLM). Membaca salinan D1 lokal (`openCorpus`, `SURAU_EVAL_STATE`) dan menulis
// `data/reports/<kitab>-takhrij-label.md`. Laporan hanya memuat angka, tanpa teks kitab.
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { TAKHRIJ_TERM_GLOSS, takhrijLabel } from "@surau/core";
import { z } from "zod";

import { loadCorpusIndex } from "./corpus.ts";
import { openCorpus } from "./open-corpus.ts";

const repo = resolve(import.meta.dirname, "../../..");
const row = z.object({ id: z.number(), text_raw: z.string() });
type TakhrijTermKind = keyof typeof TAKHRIJ_TERM_GLOSS;

export interface TakhrijSummary {
  total: number;
  byKind: Record<string, number>;
  /** Catatan kaki yang memuat istilah itu (sekali per catatan kaki). */
  byTerm: Partial<Record<TakhrijTermKind, number>>;
  mixed: number;
  /** Bertanda kelemahan (`weak`, tanda di kartu kutipan). */
  weak: number;
}

export function summarizeLabels(texts: readonly string[]): TakhrijSummary {
  const byKind: Record<string, number> = {};
  const byTerm: Partial<Record<TakhrijTermKind, number>> = {};
  let mixed = 0;
  let weak = 0;
  for (const text of texts) {
    const label = takhrijLabel(text);
    byKind[label.kind] = (byKind[label.kind] ?? 0) + 1;
    if (label.mixed) mixed++;
    if (label.weak) weak++;
    for (const k of new Set(label.terms.map((t) => t.kind))) byTerm[k] = (byTerm[k] ?? 0) + 1;
  }
  return { total: texts.length, byKind, byTerm, mixed, weak };
}

const pct = (n: number, total: number) => `${((100 * n) / total).toFixed(1).replace(".", ",")}%`;

export function labelReport(corpus: string, s: TakhrijSummary): string {
  const kinds: [string, string][] = [
    ["terms", "Memuat istilah penilaian/sumber utama"],
    ["sources_only", "Hanya menyebut sumber riwayat"],
    ["refers_back", "Hanya merujuk takhrij di tempat lain"],
    ["not_takhrij", "Bukan takhrij / tidak dikenali"],
  ];
  const terms = Object.entries(s.byTerm).sort((a, b) => b[1] - a[1]) as [TakhrijTermKind, number][];
  return [
    `# Label status hadits dari istilah takhrij · ${corpus}`,
    "",
    `Dibuat \`pnpm run eval:takhrij\` (aturan istilah versi ${takhrijLabel("").version}, ADR-069, ADR-108, ADR-113). Hanya angka, tanpa teks kitab. Label dibuat kode dari frasa baku di teks catatan kaki; belum ditinjau ustadz (T-24).`,
    "",
    `Catatan kaki: ${s.total}. Penilaian positif dan negatif sekaligus (ditandai "berbeda per jalur"): ${s.mixed} (${pct(s.mixed, s.total)}). Bertanda "memuat istilah kelemahan": ${s.weak} (${pct(s.weak, s.total)}).`,
    "",
    "| Jenis label | Catatan kaki | Porsi |",
    "|---|---:|---:|",
    ...kinds.map(
      ([k, name]) => `| ${name} | ${s.byKind[k] ?? 0} | ${pct(s.byKind[k] ?? 0, s.total)} |`,
    ),
    "",
    "| Istilah (arti baku) | Catatan kaki yang memuatnya |",
    "|---|---:|",
    ...terms.map(([k, n]) => `| ${TAKHRIJ_TERM_GLOSS[k]} (\`${k}\`) | ${n} |`),
    "",
  ].join("\n");
}

async function main() {
  const corpus = await openCorpus(repo, process.argv.includes("--remote"));
  try {
    const index = await loadCorpusIndex(corpus.db);
    const { results } = await corpus.db
      .prepare("SELECT id, text_raw FROM passage WHERE kind = 'foot' ORDER BY id")
      .all();
    const texts = z
      .array(row)
      .parse(results)
      .map((r) => r.text_raw);
    const version = index.meta.corpus_version ?? "unknown";
    const out = join(repo, "data/reports/ihya-9472-takhrij-label.md");
    writeFileSync(out, labelReport(version, summarizeLabels(texts)));
    console.log(`${texts.length} catatan kaki; laporan ${out}`);
  } finally {
    await corpus.dispose();
  }
}

if (import.meta.main) await main();
