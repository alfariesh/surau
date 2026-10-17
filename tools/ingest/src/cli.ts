// CLI ingest (dipanggil dari root: `pnpm ingest ihya`, `pnpm ingest:verify`).
//   ihya             bangun korpus Ihya: SQL + .sqlite di data/build, peta ID, dan laporan
//   verify-openiti   hanya gerbang QA OpenITI (laporan data/reports/…-openiti.md)
// Opsi: --shamela <dir> (bawaan /Volumes/Elfariesh/database atau $SURAU_SHAMELA_ROOT),
//       --openiti <dir> (bawaan data/raw/openiti), --quran <dir> (bawaan data/raw: tanzil/ +
//       kemenag/), --reset-ids (HANYA sebelum rilis Fase 1).
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { runIngest, runVerifyOpenIti } from "./pipeline.ts";
import type { PipelinePaths } from "./pipeline.ts";
import { QURAN_EXPECT, QURAN_FILES } from "./quran/source.ts";
import { IHYA } from "./works/ihya.ts";

const repo = resolve(import.meta.dirname, "../../..");

function main(argv: string[]): number {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      shamela: { type: "string" },
      openiti: { type: "string" },
      quran: { type: "string" },
      "reset-ids": { type: "boolean", default: false },
    },
  });
  const command = positionals[0];
  if (command !== "ihya" && command !== "verify-openiti") {
    console.error(
      "Pakai: pnpm ingest ihya | pnpm ingest:verify  [--shamela <dir>] [--openiti <dir>] [--quran <dir>] [--reset-ids]",
    );
    return 2;
  }
  const paths: PipelinePaths = {
    repo,
    shamela: resolve(
      values.shamela ?? process.env.SURAU_SHAMELA_ROOT ?? "/Volumes/Elfariesh/database",
    ),
    openiti: resolve(values.openiti ?? join(repo, "data/raw/openiti")),
    build: join(repo, "data/build"),
    migrations: join(repo, "packages/db/migrations/corpus"),
    llm: join(repo, "data/build/llm"),
    quran: {
      root: resolve(values.quran ?? join(repo, "data/raw")),
      files: QURAN_FILES,
      expect: QURAN_EXPECT,
    },
  };
  if (!existsSync(join(paths.shamela, "book"))) {
    console.error(
      `Data Shamela tidak ditemukan di ${paths.shamela}. Pasang drive Shamela (T-09) lalu ulangi.`,
    );
    return 1;
  }

  const started = performance.now();
  const seconds = (): string => ((performance.now() - started) / 1000).toFixed(1);
  if (command === "verify-openiti") {
    const { ok, prepared } = runVerifyOpenIti(IHYA, paths);
    console.info(
      `verify-openiti: matan ${prepared.matan.passed}/${prepared.pages.length} halaman ≥0,95 (${ok ? "LOLOS" : "GAGAL"}); ` +
        `takhrij tidak cocok ${prepared.takhrij.unmatched}/${prepared.takhrij.total}; ${seconds()} dtk`,
    );
    console.info(`Laporan: ${IHYA.reportPrefix}-openiti.md`);
    return ok ? 0 : 1;
  }

  const result = runIngest(IHYA, paths, { resetIds: values["reset-ids"] });
  for (const i of result.validation.invariants)
    console.info(`${i.ok ? "✓" : "✗"} ${i.name}: ${i.detail}`);
  const a = result.ayat;
  console.info(
    `Ayat: {…} tervalidasi ${a.validated} → persis ${a.exact}, mirip ${a.similar}, tidak cocok ${a.unmatched}; ` +
      `tanpa kurung ${a.cueExact + a.cueSimilar}; ${a.partial} sebagian ayat`,
  );
  console.info(
    `Laporan: ${IHYA.reportPrefix}-validasi.md, ${IHYA.reportPrefix}-openiti.md, ${IHYA.reportPrefix}-ayat.md`,
  );
  if (result.output === undefined) {
    console.error(`Ingest GAGAL: invarian dilanggar (${seconds()} dtk). Keluaran tidak ditulis.`);
    return 1;
  }
  const o = result.output;
  console.info(
    `Baris: ${Object.entries(o.counts)
      .map(([t, n]) => `${t} ${n}`)
      .join(", ")}`,
  );
  console.info(
    `SQL: ${o.files.length} file di data/build/sql · ${o.sqlite.slice(repo.length + 1)}`,
  );
  console.info(
    `Peta ID: ${IHYA.ids} (baru: halaman ${o.idsAdded.page}, node ${o.idsAdded.toc}, paragraf ${o.idsAdded.passage})`,
  );
  console.info(`sha256 build: ${o.hash}`);
  console.info(`Selesai dalam ${seconds()} dtk`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
