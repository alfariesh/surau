// Ekspor revisi terjemahan (X08 tahap 2, ADR-082), dari root: `pnpm review:export-terjemahan`.
//   (bawaan)   DB app PRODUKSI `surau-app` (hanya BACA) → berkas lokal + salinan R2 privat + metadata git
//   --staging  DB app staging (`surau-app-staging`), tanpa R2 (uji)
//   --lokal    DB app lokal (.wrangler/state), tanpa R2 (uji)
//   --tanpa-r2 lewati salinan R2 (mis. belum ada koneksi); metadata mencatat r2_key null
// Berkas ekspor (teks perbaikan) hanya di data/build/reviews/ (git-ignored) dan R2 privat; git hanya
// menerima metadata (ID, hash, jenis, nama tampil, tanggal). Nama berkas = cap waktu + awal sha256
// isi, jadi objek R2 lama tidak pernah ditimpa isi lain. Tidak pernah menulis ke DB app. Ekspor uji
// (--staging/--lokal) hanya dimuat ingest dengan SURAU_REVISI_UJI=1 dan tidak boleh di-commit.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { translationRevisionRow } from "@surau/db";

import { DB_CONFIG, query, repo, wrangler } from "../d1.ts";
import type { D1Target } from "../d1.ts";
import { assertWritable } from "../sqlite.ts";
import {
  REVISION_EXPORT_DIR,
  REVISION_META_FILE,
  REVISION_R2_BUCKET,
  exportContent,
  exportLines,
  metaItemOf,
  revisionMetaFile,
} from "./revisions.ts";

const COLS =
  "id, passage_id, lang, kind, text, reason, restores_id, supersedes_id, base_sha256, draft_sha256, source_sha256, author_key, author_name, author_short, author_role, author_public, status, corpus_version, created_at";

const TARGETS = {
  "surau-app": { label: "surau-app", config: DB_CONFIG, database: "APP", location: ["--remote"] },
  "surau-app-staging": {
    label: "surau-app-staging",
    config: DB_CONFIG,
    database: "APP",
    location: ["--remote", "--env", "staging"],
  },
  lokal: {
    label: "lokal (.wrangler/state)",
    config: DB_CONFIG,
    database: "APP",
    location: ["--local", "--persist-to", ".wrangler/state"],
  },
} as const satisfies Record<string, D1Target>;

function main(): number {
  const { values } = parseArgs({
    options: {
      staging: { type: "boolean", default: false },
      lokal: { type: "boolean", default: false },
      "tanpa-r2": { type: "boolean", default: false },
    },
  });
  const source = values.lokal ? "lokal" : values.staging ? "surau-app-staging" : "surau-app";
  const target = TARGETS[source];
  // Semua baris (bukan hanya yang aktif): pembatalan perlu revisi yang dipulihkannya.
  const rows = query(target, `SELECT ${COLS} FROM translation_revision ORDER BY id`).map((r) =>
    translationRevisionRow.parse(r),
  );
  const lines = exportLines(rows);
  const content = exportContent(lines);
  const digest = createHash("sha256").update(content).digest("hex");
  const now = new Date();
  const stamp = now
    .toISOString()
    .replaceAll(/[-:]/gu, "")
    .replace(/\.\d+Z$/u, "z")
    .toLowerCase();
  // Cap waktu + awal sha256 isi: objek R2 dengan nama yang sama pasti berisi sama (tidak ada
  // penimpaan isi berbeda), jadi salinan lama tidak pernah hilang.
  const prefix = source === "surau-app" ? "" : `${source.replace("surau-app-", "")}-`;
  const name = `ihya-9472-revisi-${prefix}${stamp}-${digest.slice(0, 12)}.jsonl`;
  const dir = join(repo, REVISION_EXPORT_DIR);
  mkdirSync(assertWritable(dir), { recursive: true });
  const file = join(dir, name);
  writeFileSync(assertWritable(file), content);
  const r2 = source === "surau-app" && !values["tanpa-r2"] ? `terjemahan/${name}` : null;
  if (r2 !== null)
    wrangler([
      "r2",
      "object",
      "put",
      `${REVISION_R2_BUCKET}/${r2}`,
      "--file",
      file,
      "--content-type",
      "application/x-ndjson",
      "--remote",
    ]);
  const meta = revisionMetaFile.parse({
    format: 1,
    edition: "ihya-9472",
    exported_at: now.toISOString(),
    source,
    export_file: name,
    export_sha256: digest,
    r2_key: r2,
    items: lines.map(metaItemOf),
  });
  writeFileSync(
    assertWritable(join(repo, REVISION_META_FILE)),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  const confirmed = lines.filter((l) => l.kind === "confirmed").length;
  console.info(
    `Ekspor ${target.label}: ${rows.length} baris riwayat → ${lines.length} revisi berlaku (${confirmed} sudah benar, ${lines.length - confirmed} perbaikan)`,
  );
  console.info(
    `Berkas: ${REVISION_EXPORT_DIR}/${name}${r2 === null ? " (tanpa R2)" : ` + R2 ${REVISION_R2_BUCKET}/${r2}`}`,
  );
  if (source === "surau-app") console.info(`Metadata (commit): ${REVISION_META_FILE}`);
  else
    console.warn(
      `Metadata UJI di ${REVISION_META_FILE}: JANGAN di-commit (tes repo menolaknya). Ingest memuatnya hanya dengan SURAU_REVISI_UJI=1; kembalikan dengan git checkout/rm sesudah uji.`,
    );
  return 0;
}

process.exitCode = main();
