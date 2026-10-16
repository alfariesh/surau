// Alur ingest satu kitab (ARSITEKTUR-TEKNIS §6): baca → bersih/pecah → daftar isi + patch →
// QA OpenITI → validasi → baris → SQL + .sqlite + peta ID + laporan. Semua keluaran deterministik:
// `built_at` diambil dari SOURCE_DATE_EPOCH atau tanggal commit HEAD, bukan jam sekarang.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { NORM_VERSION } from "@surau/text";

import { buildSqlite } from "./build-sqlite.ts";
import { buildDigest } from "./corpus.ts";
import { createAllocator, readIdMap, writeIdMap } from "./ids.ts";
import type { IdAllocator } from "./ids.ts";
import { parseOpenitiPages } from "./openiti/markdown.ts";
import { checkMatan, checkTakhrij } from "./openiti/verify.ts";
import type { MatanCheck, TakhrijCheck } from "./openiti/verify.ts";
import { readTocPatch } from "./patch.ts";
import { openitiReport, validationReport } from "./report.ts";
import type { ReportContext } from "./report.ts";
import { TABLE_ORDER, buildRows } from "./rows.ts";
import type { CorpusRows } from "./rows.ts";
import { ftsRows, termStats } from "./search-index.ts";
import type { FtsRow } from "./search-index.ts";
import { parsePage } from "./shamela/page.ts";
import type { ParsedPage } from "./shamela/page.ts";
import { readShamelaBook } from "./shamela/source.ts";
import type { ShamelaSource } from "./shamela/source.ts";
import { emitSql } from "./sql.ts";
import { assertWritable } from "./sqlite.ts";
import { buildToc } from "./toc.ts";
import type { TocBuild } from "./toc.ts";
import { validate } from "./validate.ts";
import type { Validation } from "./validate.ts";
import type { WorkConfig } from "./works/ihya.ts";

export interface PipelinePaths {
  /** Root repo (semua path di WorkConfig relatif ke sini). */
  repo: string;
  /** Root data Shamela (berisi `book/` dan `update/master/`). */
  shamela: string;
  /** Folder unduhan OpenITI (git-ignored). */
  openiti: string;
  /** Folder keluaran build (git-ignored). */
  build: string;
  /** Migrasi korpus D1 (packages/db/migrations/corpus) untuk membangun .sqlite. */
  migrations: string;
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Waktu build deterministik: SOURCE_DATE_EPOCH (detik) atau tanggal commit HEAD, dalam ISO UTC. */
export function buildTimestamp(repo: string, env: NodeJS.ProcessEnv = process.env): string {
  const epoch = env.SOURCE_DATE_EPOCH;
  if (epoch !== undefined && epoch !== "") {
    if (!/^\d+$/.test(epoch)) throw new Error(`SOURCE_DATE_EPOCH bukan angka detik: ${epoch}`);
    return new Date(Number(epoch) * 1000).toISOString();
  }
  const iso = execFileSync("git", ["log", "-1", "--format=%cI", "HEAD"], {
    cwd: repo,
    encoding: "utf8",
  });
  return new Date(iso.trim()).toISOString();
}

function readOpenitiFile(dir: string, file: { file: string; sha256: string }): string {
  const path = join(dir, file.file);
  if (!existsSync(path)) {
    throw new Error(`${path} tidak ada. Unduh dari OpenITI (commit dipin, lihat data/SOURCES.md).`);
  }
  const raw = readFileSync(path);
  const actual = sha256(raw);
  if (actual !== file.sha256) {
    throw new Error(`${path}: sha256 ${actual} ≠ ${file.sha256} yang dipin di data/SOURCES.md`);
  }
  return raw.toString("utf8");
}

export interface Prepared {
  source: ShamelaSource;
  pages: ParsedPage[];
  matan: MatanCheck;
  takhrij: TakhrijCheck;
  ctx: ReportContext;
}

/** Baca sumber, pecah halaman, dan jalankan QA OpenITI (dipakai `ihya` dan `verify-openiti`). */
export function prepare(config: WorkConfig, paths: PipelinePaths): Prepared {
  const source = readShamelaBook(paths.shamela, config.shamelaBook);
  const pages = source.pages.map(parsePage);
  const matan = checkMatan(
    pages,
    parseOpenitiPages(readOpenitiFile(paths.openiti, config.openiti.matan)),
  );
  const takhrij = checkTakhrij(
    pages,
    parseOpenitiPages(readOpenitiFile(paths.openiti, config.openiti.takhrij)),
  );
  return {
    source,
    pages,
    matan,
    takhrij,
    ctx: { config, sourceSha256: source.sha256, normVersion: NORM_VERSION },
  };
}

function writeText(path: string, content: string): void {
  mkdirSync(dirname(assertWritable(path)), { recursive: true });
  writeFileSync(path, content);
}

/** Tulis laporan verify-openiti dan kembalikan apakah gerbang matan lolos. */
export function runVerifyOpenIti(
  config: WorkConfig,
  paths: PipelinePaths,
): { ok: boolean; prepared: Prepared } {
  const prepared = prepare(config, paths);
  const { pages, matan, takhrij, ctx } = prepared;
  writeText(
    join(paths.repo, `${config.reportPrefix}-openiti.md`),
    openitiReport(ctx, pages, matan, takhrij),
  );
  return {
    ok: matan.passed >= config.expect.matanMinPages && matan.missing.length === 0,
    prepared,
  };
}

function readToc(config: WorkConfig, paths: PipelinePaths, prepared: Prepared): TocBuild {
  const patch = readTocPatch(join(paths.repo, config.patch));
  if (patch.shamela_book !== config.shamelaBook) {
    throw new Error(
      `${config.patch} untuk kitab ${patch.shamela_book}, bukan ${config.shamelaBook}`,
    );
  }
  return buildToc(prepared.source.titles, prepared.pages, patch);
}

/** Baris korpus + baris indeks FTS; `term_stat` dihitung dari indeks itu (S11). */
function rowsFor(
  config: WorkConfig,
  paths: PipelinePaths,
  prepared: Prepared,
  toc: TocBuild,
  ids: IdAllocator,
  env?: NodeJS.ProcessEnv,
): { rows: CorpusRows; fts: FtsRow[] } {
  const { source, pages, takhrij } = prepared;
  const base = buildRows({
    config,
    source,
    pages,
    toc,
    takhrij,
    ids,
    meta: {
      normVersion: NORM_VERSION,
      builtAt: buildTimestamp(paths.repo, env),
      sourceHash: `sha256:${source.sha256}`,
    },
  });
  const fts = ftsRows(base.passage);
  return { rows: { ...base, term_stat: termStats(fts, paths.migrations) }, fts };
}

/**
 * Baris korpus yang SEHARUSNYA ada, dibangun ulang di memori dari sumber Shamela dengan peta ID
 * yang di-commit (tanpa menulis apa pun). Dipakai QA sampel halaman (`qa.ts`, S10).
 */
export function expectedRows(config: WorkConfig, paths: PipelinePaths): CorpusRows {
  const prepared = prepare(config, paths);
  const toc = readToc(config, paths, prepared);
  const ids = createAllocator(readIdMap(join(paths.repo, config.ids), config.edition.id));
  const { rows } = rowsFor(config, paths, prepared, toc, ids);
  const added = Object.values(ids.added).reduce((a, b) => a + b, 0);
  if (added > 0) {
    throw new Error(
      `Peta ID ${config.ids} belum memuat ${added} baris sumber: build korpus tidak sesuai sumber, jalankan \`pnpm ingest ihya\``,
    );
  }
  return rows;
}

export interface IngestResult {
  validation: Validation;
  /** Diisi bila validasi lolos dan keluaran ditulis. */
  output?: {
    files: string[];
    sqlite: string;
    counts: Record<string, number>;
    /** sha256 gabungan file SQL (terurut) + .sqlite. */
    hash: string;
    idsAdded: Record<string, number>;
  };
}

export interface IngestOptions {
  /** Abaikan peta ID yang ada dan bangun dari nol (HANYA sebelum rilis Fase 1, ADR-029). */
  resetIds?: boolean;
  env?: NodeJS.ProcessEnv;
}

export function runIngest(
  config: WorkConfig,
  paths: PipelinePaths,
  opts: IngestOptions = {},
): IngestResult {
  const prepared = prepare(config, paths);
  const { source, pages, matan, takhrij, ctx } = prepared;
  const toc = readToc(config, paths, prepared);

  // Keluaran build lama dihapus lebih dulu: bila validasi gagal, tidak ada SQL usang yang bisa
  // termuat tanpa sadar. Build versi lain (mis. ihya-v1 setelah naik ke ihya-v2) ikut dihapus:
  // data/build/sql hanya memuat satu build, dan .sqlite/.sha256 versi lain tidak lagi cocok dengannya.
  const sqlDir = join(paths.build, "sql");
  const sqlitePath = join(paths.build, config.output);
  const hashPath = join(paths.build, `${config.corpusVersion}.sha256`);
  const stale = existsSync(paths.build)
    ? readdirSync(paths.build)
        .filter((f) => /^surau-corpus-.+\.sqlite(?:-journal|-wal|-shm)?$|\.sha256$/.test(f))
        .map((f) => join(paths.build, f))
    : [];
  for (const path of [sqlDir, sqlitePath, hashPath, ...stale]) {
    rmSync(assertWritable(path), { recursive: true, force: true });
  }

  const idsPath = assertWritable(join(paths.repo, config.ids));
  const idMap = opts.resetIds
    ? { format: 1 as const, edition: config.edition.id, page: {}, toc: {}, passage: {} }
    : readIdMap(idsPath, config.edition.id);
  const ids = createAllocator(idMap);
  const { rows, fts } = rowsFor(config, paths, prepared, toc, ids, opts.env);
  const validation = validate({ config, source, pages, toc, matan, takhrij, rows });
  writeText(
    join(paths.repo, `${config.reportPrefix}-validasi.md`),
    validationReport(ctx, validation),
  );
  writeText(
    join(paths.repo, `${config.reportPrefix}-openiti.md`),
    openitiReport(ctx, pages, matan, takhrij),
  );
  if (!validation.ok) return { validation };

  mkdirSync(sqlDir, { recursive: true });
  const files = emitSql(rows, fts);
  for (const f of files) writeFileSync(join(sqlDir, f.name), f.content);
  const { counts } = buildSqlite(sqlitePath, paths.migrations, files, [
    ...TABLE_ORDER,
    "passage_fts",
  ]);
  mkdirSync(dirname(idsPath), { recursive: true });
  writeIdMap(idsPath, ids.snapshot());

  const digest = buildDigest(sqlDir, sqlitePath);
  writeFileSync(hashPath, `${digest}\n`);
  return {
    validation,
    output: {
      files: files.map((f) => f.name),
      sqlite: sqlitePath,
      counts,
      hash: digest,
      idsAdded: { ...ids.added },
    },
  };
}
