// Blue-green korpus PRODUKSI (ADR-005, ARSITEKTUR-TEKNIS §7 aturan 4). Dari root repo:
//   pnpm run corpus:promote <versi>                 rencana saja: cek build + keadaan remote, tanpa perubahan
//   pnpm run corpus:promote <versi> --confirm       1 buat surau-corpus-<versi> (apac) · 2 migrasi ·
//                                                   3 muat SQL + smoke (= hitungan build) ·
//                                                   4 arahkan CORPUS_DB produksi di apps/web/wrangler.jsonc
//   pnpm run corpus:promote <versi> --switch-only   rollback: arahkan produksi ke versi lama yang sudah ada
//   --reload   muat ulang DB versi ini bila sudah ada (menimpa isinya). DITOLAK untuk DB yang melayani
//              atau pernah melayani produksi: binding di working tree, di origin/main, atau tercatat di
//              data/SOURCES.md. Korpus staging tidak pernah menjadi produksi (isinya dimuat ulang tiap sesi).
// Langkah 5 (deploy) = PR berisi wrangler.jsonc → merge → deploy.yml. Langkah 6: DB lama TIDAK
// dihapus; catat di data/SOURCES.md sebagai target rollback. Prosedur lengkap: tools/ingest/README.md.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { CORPUS_SCHEMA_VERSION } from "@surau/db";

import {
  buildInfo,
  isProtected,
  loadBuild,
  protectedCorpora,
  readProductionCorpus,
  setProductionCorpus,
  stagingCorpus,
} from "./corpus.ts";
import type { CorpusBinding } from "./corpus.ts";
import { WEB_CONFIG, formatCounts, remoteByName, repo, smoke, wrangler } from "./d1.ts";

interface RemoteDb {
  uuid: string;
  name: string;
}

function listDatabases(): RemoteDb[] {
  return JSON.parse(wrangler(["d1", "list", "--json"])) as RemoteDb[];
}

function info(name: string): { running_in_region?: string; database_size?: number } {
  return JSON.parse(wrangler(["d1", "info", name, "--json"])) as {
    running_in_region?: string;
    database_size?: number;
  };
}

function switchProduction(next: CorpusBinding): CorpusBinding {
  const path = join(repo, WEB_CONFIG);
  const text = readFileSync(path, "utf8");
  const previous = readProductionCorpus(text);
  writeFileSync(path, setProductionCorpus(text, next));
  return previous;
}

function nextSteps(previous: CorpusBinding, next: CorpusBinding): void {
  console.info(
    [
      "",
      `Langkah 4 selesai di lokal: ${WEB_CONFIG} CORPUS_DB ${previous.name} → ${next.name}.`,
      "Berikutnya:",
      "  5. Commit + PR. Setelah CI hijau dan merge, deploy.yml men-deploy Worker dengan binding baru.",
      `  6. JANGAN hapus ${previous.name}. Catat ${next.name} (${next.id}) di data/SOURCES.md (bagian Korpus D1 produksi).`,
      previous.id === stagingCorpus().id
        ? "Sebelumnya produksi menunjuk staging, jadi versi ini belum punya target rollback: bila bermasalah, tutup darurat (README)."
        : `Rollback: pnpm run corpus:promote <versi ${previous.name}> --switch-only, lalu PR + merge yang sama.`,
    ].join("\n"),
  );
}

function main(argv: string[]): number {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      confirm: { type: "boolean", default: false },
      "switch-only": { type: "boolean", default: false },
      reload: { type: "boolean", default: false },
    },
  });
  const version = positionals[0] ?? "";
  if (!/^[a-z][a-z0-9]*-v\d+$/.test(version)) {
    console.error(
      "Pakai: pnpm run corpus:promote <versi> [--confirm | --switch-only] [--reload]   (versi mis. ihya-v1)",
    );
    return 2;
  }
  const name = `surau-corpus-${version}`;
  const guard = protectedCorpora();
  for (const note of guard.notes) console.warn(`Peringatan: ${note}`);
  const [active] = guard.production;
  console.info(
    `Produksi sekarang: ${active?.name ?? "?"} (${active?.id ?? "?"}); origin/main: ${guard.production[1]?.name ?? "?"}`,
  );
  const existing = listDatabases().find((d) => d.name === name);
  if (existing !== undefined && existing.uuid === stagingCorpus().id) {
    console.error(`${name} adalah korpus staging: tidak pernah dijadikan produksi.`);
    return 1;
  }

  // Rollback (atau maju ke DB yang sudah dimuat): hanya baca remote + ubah wrangler.jsonc.
  if (values["switch-only"]) {
    if (existing === undefined) {
      console.error(`${name} tidak ada di akun Cloudflare: tidak bisa dijadikan produksi.`);
      return 1;
    }
    const target = remoteByName(name, existing.uuid);
    try {
      const s = smoke(target);
      console.info(`${name}: ${formatCounts(s.counts)} · korpus ${s.meta.corpus_version ?? "?"}`);
      // Kode di main mengharapkan skema terbaru (ARSITEKTUR-TEKNIS §7 aturan 5).
      if (s.meta.schema_version !== String(CORPUS_SCHEMA_VERSION)) {
        s.problems.push(
          `meta.schema_version ${s.meta.schema_version ?? "–"}, kode mengharapkan ${CORPUS_SCHEMA_VERSION}`,
        );
      }
      if (s.problems.length > 0) {
        for (const p of s.problems) console.error(`Smoke GAGAL: ${p}`);
        return 1;
      }
    } finally {
      target.dispose();
    }
    const next = { name, id: existing.uuid };
    nextSteps(switchProduction(next), next);
    return 0;
  }

  const build = buildInfo(version);
  console.info(
    `Build ${version}: sha256 ${build.hash}\n  ${formatCounts(build.counts)}\n  built_at ${build.meta.built_at ?? "?"} · schema ${build.meta.schema_version ?? "?"} · norm ${build.meta.norm_version ?? "?"}`,
  );
  if (existing !== undefined && isProtected(guard, { name, id: existing.uuid })) {
    console.error(
      `${name} sedang atau pernah melayani produksi (working tree, origin/main, atau data/SOURCES.md): tidak boleh dimuat ulang. Korpus baru = versi baru (mis. ${version.replace(/\d+$/, (n) => String(Number(n) + 1))}).`,
    );
    return 1;
  }
  if (existing !== undefined && !values.reload) {
    console.error(
      `${name} sudah ada (${existing.uuid}). Pakai --reload untuk memuat ulang (menimpa isinya), atau --switch-only untuk langsung memakainya.`,
    );
    return 1;
  }
  if (!values.confirm) {
    console.info(
      [
        "",
        "Rencana (belum ada yang diubah). Dengan --confirm, langkah remote berikut dijalankan:",
        existing === undefined
          ? `  1. wrangler d1 create ${name} --location apac`
          : `  1. (lewati) ${name} sudah ada; --reload memuat ulang isinya`,
        "  2. migrasi korpus (packages/db/migrations/corpus)",
        "  3. muat data/build/sql/*.sql, lalu smoke: hitungan setiap tabel + meta = build, j1 h200",
        `  4. ${WEB_CONFIG}: CORPUS_DB produksi → ${name} (file lokal; deploy lewat PR)`,
        "Minta izin pemilik dulu (CLAUDE.md aturan keras 4 bila menimpa DB yang sudah ada).",
      ].join("\n"),
    );
    return 0;
  }

  if (existing === undefined) {
    console.info(`1. Membuat ${name} (apac)…`);
    wrangler(["d1", "create", name, "--location", "apac", "--update-config=false"]);
  }
  const created = listDatabases().find((d) => d.name === name);
  if (created === undefined) throw new Error(`${name} tidak muncul di wrangler d1 list`);
  const target = remoteByName(name, created.uuid);
  try {
    console.info(`2–3. Migrasi dan muat ${name} (${created.uuid})…`);
    loadBuild(target, (line) => console.info(`   ${line}`));
    const s = smoke(target, build);
    console.info(`Smoke: ${formatCounts(s.counts)}`);
    if (s.problems.length > 0) {
      for (const p of s.problems) console.error(`Smoke GAGAL: ${p}`);
      console.error("Binding produksi TIDAK diubah.");
      return 1;
    }
  } finally {
    target.dispose();
  }
  const i = info(name);
  console.info(
    `${name}: wilayah ${i.running_in_region ?? "?"}, ukuran ${i.database_size ?? "?"} byte`,
  );
  const next = { name, id: created.uuid };
  nextSteps(switchProduction(next), next);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
