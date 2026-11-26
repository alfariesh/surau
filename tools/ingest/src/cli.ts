// CLI ingest (dipanggil dari root: `pnpm ingest korpus`, `pnpm ingest:verify`).
//   korpus           bangun korpus semua kitab (X31a, ADR-137): SQL + .sqlite di data/build, peta ID
//                    dan laporan per kitab. `ihya` = nama lama, tetap diterima.
//   verify-openiti   hanya gerbang QA OpenITI (laporan data/reports/…-openiti.md per kitab)
// Opsi: --kitab <slug,…> (sebagian kitab, mis. `--kitab ihya` bila promote mendahului kitab baru),
//       --shamela <dir> (bawaan /Volumes/Elfariesh/database atau $SURAU_SHAMELA_ROOT),
//       --openiti <dir> (bawaan data/raw/openiti), --quran <dir> (bawaan data/raw: tanzil/ +
//       kemenag/), --reset-ids (HANYA sebelum rilis; ditolak bila data/ids/…teks.json ada),
//       --terima-teks-berubah <id,…> (passage.id lama yang teksnya boleh berubah, satu per satu;
//       ID hilang tetap ditolak, ADR-059).
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import type { AudioTrackRow } from "@surau/db";

import { audioReport, selectBuildAudio } from "./audio.ts";
import { runIngest, runVerifyOpenIti } from "./pipeline.ts";
import type { IngestOptions, PipelinePaths } from "./pipeline.ts";
import { QURAN_EXPECT, QURAN_FILES } from "./quran/source.ts";
import { corpusWith } from "./works/index.ts";

const repo = resolve(import.meta.dirname, "../../..");

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      kitab: { type: "string" },
      shamela: { type: "string" },
      openiti: { type: "string" },
      quran: { type: "string" },
      "reset-ids": { type: "boolean", default: false },
      "terima-teks-berubah": { type: "string" },
    },
  });
  const command = positionals[0];
  if (command !== "korpus" && command !== "ihya" && command !== "verify-openiti") {
    console.error(
      "Pakai: pnpm ingest korpus | pnpm ingest:verify  [--kitab <slug,…>] [--shamela <dir>] [--openiti <dir>] [--quran <dir>] [--reset-ids] [--terima-teks-berubah <id,…>]",
    );
    return 2;
  }
  const corpus = corpusWith(
    values.kitab
      ?.split(",")
      .map((s) => s.trim())
      .filter((s) => s !== ""),
  );
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
    let allOk = true;
    for (const config of corpus.works) {
      const { ok, prepared } = runVerifyOpenIti(config, paths, corpus.version);
      allOk &&= ok;
      const t = prepared.takhrij;
      console.info(
        `${config.work.slug} verify-openiti: matan ${prepared.matan.passed}/${prepared.pages.length} halaman ≥0,95 (${ok ? "LOLOS" : "GAGAL"}); ` +
          (t.compared
            ? `takhrij tidak cocok ${t.unmatched}/${t.total}`
            : "tanpa pembanding takhrij") +
          ` · laporan ${config.reportPrefix}-openiti.md`,
      );
    }
    console.info(`${seconds()} dtk`);
    return allOk ? 0 : 1;
  }
  if (command === "ihya")
    console.info("Catatan: `pnpm ingest ihya` kini membangun korpus semua kitab (= `korpus`).");

  const opts: IngestOptions = {
    resetIds: values["reset-ids"],
    acceptTextChanges: values["terima-teks-berubah"]?.split(",").map((id) => {
      const n = Number(id.trim());
      if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`ID paragraf tidak sah: ${id}`);
      return n;
    }),
  };
  let result = runIngest(corpus, paths, opts);
  // Audio Intisari (X17): sha skrip dicocokkan dengan Intisari build ini; bila ada track yang cocok,
  // build diulang sekali dengan baris `audio_track` (deterministik: peta ID dan sidik teks sudah
  // ditulis putaran pertama, jadi hasilnya sama ditambah audio, dan `meta` tetap file terakhir).
  if (result.output !== undefined) {
    const tracks: AudioTrackRow[] = [];
    for (const config of corpus.works) {
      if (config.audioManifest === undefined) continue;
      const audio = await selectBuildAudio(result.output.sqlite, join(repo, config.audioManifest));
      console.info(`${config.work.slug}: ${audioReport(audio)}`);
      tracks.push(...audio.rows);
    }
    if (tracks.length > 0) {
      const added = result.output.idsAdded;
      const works = result.works;
      result = runIngest(corpus, paths, { ...opts, audioTracks: tracks });
      // ID baru tercatat di putaran pertama (peta ID wajib di-commit, ADR-059), bukan di putaran kedua.
      if (result.output !== undefined)
        result = { ...result, works, output: { ...result.output, idsAdded: added } };
    }
  }
  for (const i of result.validation.invariants)
    console.info(`${i.ok ? "✓" : "✗"} ${i.name}: ${i.detail}`);
  for (const w of result.works) {
    const a = w.ayat;
    console.info(
      `${w.config.work.slug} · Ayat: {…} tervalidasi ${a.validated} → persis ${a.exact}, mirip ${a.similar}, tidak cocok ${a.unmatched}; ` +
        `tanpa kurung ${a.cueExact + a.cueSimilar}; ${a.partial} sebagian ayat`,
    );
    console.info(
      `${w.config.work.slug} · Laporan: ${w.config.reportPrefix}-validasi.md, -openiti.md, -ayat.md`,
    );
  }
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
    `SQL: ${o.files.length} file di data/build/sql · ${o.sqlite.slice(repo.length + 1)} (korpus ${corpus.version})`,
  );
  for (const w of result.works) {
    const n = w.idsAdded;
    console.info(
      `Peta ID: ${w.config.ids} (baru: halaman ${n.page ?? 0}, node ${n.toc ?? 0}, paragraf ${n.passage ?? 0})`,
    );
  }
  console.info(`sha256 build: ${o.hash}`);
  console.info(`Selesai dalam ${seconds()} dtk`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
