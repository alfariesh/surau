// Memuat korpus hasil `pnpm ingest ihya` ke D1 (binding CORPUS di packages/db/wrangler.jsonc).
//   node tools/ingest/src/load.ts local     → D1 lokal di <root>/.wrangler/state (ARSITEKTUR §7)
//   node tools/ingest/src/load.ts staging   → surau-corpus-staging (remote; minta izin pemilik dulu)
// Urutan: migrasi korpus, lalu data/build/sql/*.sql satu per satu (tiap file atomik; file pertama
// mengosongkan korpus, jadi pemuatan bisa diulang), lalu smoke query. Korpus PRODUKSI tidak pernah
// dimuat dari sini: pakai `pnpm run corpus:promote` (blue-green, ADR-005).
import { LOCAL, STAGING, formatCounts, smoke } from "./d1.ts";
import type { D1Target } from "./d1.ts";
import { buildInfo, isProtected, loadBuild, protectedCorpora, stagingCorpus } from "./corpus.ts";

function main(mode: string | undefined): number {
  if (mode !== "local" && mode !== "staging") {
    console.error("Pakai: pnpm corpus:load:local | pnpm corpus:load:staging");
    return 2;
  }
  // Remote: file pertama mengosongkan korpus dan DB tidak melayani kueri selama impor. Penanda
  // eksplisit bahwa pemilik sudah mengizinkan (CLAUDE.md, langkah 8 S07).
  if (mode === "staging" && !process.argv.includes("--confirm")) {
    console.error(
      "Memuat ke surau-corpus-staging menimpa isinya. Minta izin pemilik, lalu jalankan:\n  pnpm corpus:load:staging --confirm",
    );
    return 2;
  }
  // Staging tidak boleh sedang melayani produksi: file pertama mengosongkan seluruh korpus.
  if (mode === "staging") {
    const guard = protectedCorpora();
    for (const note of guard.notes) console.warn(`Peringatan: ${note}`);
    if (isProtected(guard, stagingCorpus())) {
      console.error(
        "surau-corpus-staging tercatat sebagai korpus produksi (apps/web/wrangler.jsonc di working tree/origin/main, atau data/SOURCES.md). Pemuatan ditolak.",
      );
      return 1;
    }
  }
  const target: D1Target = mode === "local" ? LOCAL : STAGING;
  const build = buildInfo();
  loadBuild(target);

  const s = smoke(target, build);
  console.info(`Jumlah baris: ${formatCounts(s.counts)}`);
  // Build selalu dibuat kode ini, jadi skemanya terbaru: batasan skema = kegagalan.
  const failed = [...s.problems, ...s.limitations];
  if (failed.length > 0) {
    for (const p of failed) console.error(`Smoke GAGAL: ${p}`);
    return 1;
  }
  console.info(`Korpus ${target.label} siap (${s.meta.corpus_version ?? "?"}).`);
  return 0;
}

process.exitCode = main(process.argv[2]);
