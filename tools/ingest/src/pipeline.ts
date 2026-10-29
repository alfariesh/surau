// Alur ingest satu kitab (ARSITEKTUR-TEKNIS §6): baca → bersih/pecah → daftar isi + patch →
// QA OpenITI → validasi → baris → SQL + .sqlite + peta ID + laporan. Semua keluaran deterministik:
// `built_at` diambil dari SOURCE_DATE_EPOCH atau tanggal commit HEAD, bukan jam sekarang.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { AudioTrackRow, PassageAyahRefRow, PassageRow } from "@surau/db";
import { LATIN_NORM_VERSION, NORM_VERSION, normalizeArabic } from "@surau/text";

import { buildSqlite } from "./build-sqlite.ts";
import { buildDigest } from "./corpus.ts";
import {
  checkStability,
  fingerprintPath,
  fingerprints,
  readFingerprints,
  writeFingerprints,
} from "./fingerprint.ts";
import { createAllocator, readIdMap, writeIdMap } from "./ids.ts";
import type { IdAllocator } from "./ids.ts";
import { parseOpenitiPages } from "./openiti/markdown.ts";
import { checkMatan, checkTakhrij } from "./openiti/verify.ts";
import type { MatanCheck, TakhrijCheck } from "./openiti/verify.ts";
import { readStrictYaml, readTocPatch } from "./patch.ts";
import { ayatReport } from "./quran/report.ts";
import { applyAyahPatch, ayahPatch } from "./quran/ayah-patch.ts";
import { matchAyat, mergePatchedRefs, quranIndex, quranTableRows } from "./quran/rows.ts";
import type { AyahStats, AyatBuild } from "./quran/rows.ts";
import { loadQuran } from "./quran/source.ts";
import type { QuranConfig, QuranData } from "./quran/source.ts";
import { openitiReport, validationReport } from "./report.ts";
import type { ReportContext } from "./report.ts";
import { TABLE_ORDER, buildRows, emptyDigestRows } from "./rows.ts";
import type { CorpusRows } from "./rows.ts";
import { ftsRows, latinFtsRows, termStats } from "./search-index.ts";
import type { FtsRow } from "./search-index.ts";
import { parsePage } from "./shamela/page.ts";
import type { ParsedPage } from "./shamela/page.ts";
import { readShamelaBook } from "./shamela/source.ts";
import type { ShamelaSource } from "./shamela/source.ts";
import { emitSql } from "./sql.ts";
import { assertWritable } from "./sqlite.ts";
import { llmRows } from "./llm/attach.ts";
import type { LlmBuild } from "./llm/attach.ts";
import { digestInvariant, digestRows, withDigestSummaries } from "./llm/digest-attach.ts";
import type { DigestBuild } from "./llm/digest-attach.ts";
import { loadReviews } from "./llm/reviews.ts";
import {
  applyRevisions,
  loadRevisions,
  revisionInvariant,
  revisionMetaRows,
} from "./llm/revisions.ts";
import type { RevisionStats } from "./llm/revisions.ts";
import { readSubheadings } from "./llm/titles.ts";
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
  /** Sumber Al-Qur'an (Tanzil + Kemenag, git-ignored) dan sha256 yang dipin (S12). */
  quran: QuranConfig;
  /**
   * Hasil batch LLM yang lolos (S13, git-ignored, JANGAN dihapus): data/build/llm. Tanpa path =
   * korpus tanpa terjemahan/ringkasan (QA sampel dan CLI llm tidak membutuhkannya).
   */
  llm?: string;
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

/**
 * Baris korpus + baris indeks FTS; `term_stat` dihitung dari indeks itu (S11), tabel Qur'an dan
 * rujukan ayat dari sumber Qur'an (S12).
 */
function rowsFor(
  config: WorkConfig,
  paths: PipelinePaths,
  prepared: Prepared,
  toc: TocBuild,
  ids: IdAllocator,
  env?: NodeJS.ProcessEnv,
): {
  rows: CorpusRows;
  fts: FtsRow[];
  ayat: AyatBuild;
  llm: LlmBuild | null;
  revisions: RevisionStats;
  /** Intisari (X15b): baris + indeks + invarian; null bila build tanpa folder hasil LLM. */
  digest: DigestBuild | null;
} {
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
      latinNormVersion: LATIN_NORM_VERSION,
      builtAt: buildTimestamp(paths.repo, env),
      sourceHash: `sha256:${source.sha256}`,
    },
  });
  const fts = ftsRows(base.passage);
  const quran = loadQuran(paths.quran, (s) => normalizeArabic(s).text);
  const matched = matchAyat(quran, base.passage, base.page);
  mergePatchedRefs(matched, ayahPatchRefs(config, paths, quran, base.passage, matched.refs));
  const rows: CorpusRows = {
    ...base,
    ...quranTableRows(quran),
    passage_ayah_ref: matched.refs,
    translation: [],
    translation_review: [],
    summary: [],
    toc_title_translation: [],
    subheading_translation: [],
    ...emptyDigestRows(),
    term_stat: termStats(fts, paths.migrations),
  };
  // Terjemahan/ringkasan AI dicek terhadap baris yang baru dibangun ini (hash sumber, ayat).
  const llm =
    paths.llm === undefined
      ? null
      : llmRows(rows, paths.llm, loadReviews(paths.repo), readSubheadings(paths.repo, config));
  if (llm !== null) {
    rows.translation = llm.translation;
    rows.summary = llm.summary;
    rows.toc_title_translation = llm.toc_title_translation;
    rows.subheading_translation = llm.subheading_translation;
  }
  // Revisi terjemahan manusia (X08 tahap 2, ADR-082): menimpa teks AI sesudah hasil batch dimuat,
  // divalidasi ulang terhadap baris korpus ini. Metadata git tanpa berkas ekspornya = GAGAL.
  const loaded = loadRevisions(paths.repo);
  const revisions = applyRevisions(rows, loaded);
  rows.translation = revisions.translation;
  rows.translation_review = revisions.translation_review;
  rows.meta = [...rows.meta, ...revisionMetaRows(loaded)];
  // Intisari (X15b, ADR-097): dicek terhadap baris korpus final ini (termasuk terjemahan yang sudah
  // direvisi, untuk kutipan satu paragraf utuh). Abstrak yang lolos `checkSummary` menjadi ringkasan
  // bahasa id node itu, sehingga Cari/Jawab/MCP memakai satu ringkasan.
  const digest =
    paths.llm === undefined
      ? null
      : digestRows(rows, join(paths.llm, "intisari"), {
          subheadings: readSubheadings(paths.repo, config),
        });
  if (digest !== null) {
    rows.glossary_term = digest.glossary_term;
    rows.digest = digest.digest;
    rows.digest_point = digest.digest_point;
    rows.digest_anchor = digest.digest_anchor;
    rows.digest_quote = digest.digest_quote;
    rows.digest_question = digest.digest_question;
    rows.digest_term = digest.digest_term;
    rows.summary = withDigestSummaries(rows.summary, digest.summary);
  }
  return {
    digest,
    rows,
    llm,
    revisions: revisions.stats,
    fts,
    ayat: {
      stats: matched.stats,
      matches: matched.matches,
      numberingMismatch: quran.numberingMismatch,
    },
  };
}

/** Rujukan dari patch ayat (X29): setiap entri dicocokkan ulang kode; satu yang gagal = ingest gagal. */
function ayahPatchRefs(
  config: WorkConfig,
  paths: PipelinePaths,
  quran: QuranData,
  passages: readonly PassageRow[],
  refs: readonly PassageAyahRefRow[],
): PassageAyahRefRow[] {
  if (config.ayahPatch === undefined) return [];
  const path = join(paths.repo, config.ayahPatch);
  if (!existsSync(path))
    throw new Error(`${config.ayahPatch} tidak ada (WorkConfig.ayahPatch diisi)`);
  const patch = readStrictYaml(path, ayahPatch);
  if (patch.shamela_book !== config.shamelaBook) {
    throw new Error(
      `${config.ayahPatch} untuk kitab ${patch.shamela_book}, bukan ${config.shamelaBook}`,
    );
  }
  const byId = new Map(passages.map((p) => [p.id, p]));
  const { refs: extra, problems } = applyAyahPatch(quranIndex(quran), byId, refs, patch);
  if (problems.length > 0) {
    throw new Error(`${config.ayahPatch}: ${problems.length} entri gagal\n${problems.join("\n")}`);
  }
  return extra;
}

/**
 * Baris korpus yang SEHARUSNYA ada, dibangun ulang di memori dari sumber Shamela dengan peta ID
 * yang di-commit (tanpa menulis apa pun). Dipakai QA sampel halaman (`qa.ts`, S10).
 */
export function expectedRows(
  config: WorkConfig,
  paths: PipelinePaths,
  env?: NodeJS.ProcessEnv,
): CorpusRows {
  const prepared = prepare(config, paths);
  const toc = readToc(config, paths, prepared);
  const ids = createAllocator(readIdMap(join(paths.repo, config.ids), config.edition.id));
  const { rows } = rowsFor(config, paths, prepared, toc, ids, env);
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
  /** Statistik pencocok ayat (S12); ada juga bila validasi gagal. */
  ayat: AyahStats;
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
  /** Abaikan peta ID yang ada dan bangun dari nol (HANYA sebelum rilis, ADR-029; ditolak bila sidik teks ada). */
  resetIds?: boolean;
  /**
   * `passage.id` lama yang teksnya boleh berubah (koreksi teks yang disengaja), satu per satu. ID
   * yang HILANG tetap ditolak. Periksa daftar lengkap di laporan validasi dulu: paragraf bergeser
   * juga tampil sebagai "berubah".
   */
  acceptTextChanges?: readonly number[];
  env?: NodeJS.ProcessEnv;
  /**
   * Baris `audio_track` yang sha skripnya sudah dicocokkan dengan build sebelumnya yang sama
   * (`selectBuildAudio`, X17). Diisi putaran kedua CLI ingest; foreign key ke `digest` diperiksa build.
   */
  audioTracks?: readonly AudioTrackRow[];
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
        .filter((f) => /^(?:surau-corpus-.+\.sqlite(?:-journal|-wal|-shm)?|.+\.sha256)$/.test(f))
        .map((f) => join(paths.build, f))
    : [];
  for (const path of [sqlDir, sqlitePath, hashPath, ...stale]) {
    rmSync(assertWritable(path), { recursive: true, force: true });
  }

  const idsPath = assertWritable(join(paths.repo, config.ids));
  const printsPath = assertWritable(fingerprintPath(idsPath));
  // Sidik ada = korpus sudah dirilis (#59): ID tidak boleh dibangun ulang dan peta ID wajib ada.
  const released = readFingerprints(printsPath, config.edition.id);
  if (released !== null && opts.resetIds)
    throw new Error(`--reset-ids ditolak: ${config.ids} sudah dirilis (${printsPath} ada)`);
  if (released !== null && !existsSync(idsPath))
    throw new Error(`Peta ID ${idsPath} tidak ada padahal korpus sudah dirilis; pulihkan dari git`);
  const idMap = opts.resetIds
    ? { format: 1 as const, edition: config.edition.id, page: {}, toc: {}, passage: {} }
    : readIdMap(idsPath, config.edition.id);
  if (released === null && Object.keys(idMap.passage).length > 0)
    throw new Error(
      `Sidik teks ${printsPath} tidak ada padahal peta ID berisi paragraf; pulihkan dari git ` +
        "(kitab yang belum pernah dirilis: --reset-ids)",
    );
  const ids = createAllocator(idMap);
  const {
    rows,
    fts,
    ayat,
    llm,
    revisions,
    digest: intisari,
  } = rowsFor(config, paths, prepared, toc, ids, opts.env);
  if (opts.audioTracks !== undefined) rows.audio_track = [...opts.audioTracks];
  const validation = validate({
    config,
    source,
    pages,
    toc,
    matan,
    takhrij,
    rows,
    ayat,
    llm: llm?.stats ?? null,
  });
  validation.invariants.push(revisionInvariant(rows, revisions));
  validation.ok &&= validation.invariants.at(-1)?.ok ?? false;
  if (intisari !== null) {
    validation.invariants.push(digestInvariant(intisari));
    validation.ok &&= validation.invariants.at(-1)?.ok ?? false;
  }
  const prints = fingerprints(config.edition.id, rows.passage);
  const stability =
    released === null ? null : checkStability(released, prints, opts.acceptTextChanges);
  if (stability !== null) {
    validation.invariants.push({
      name: "ID paragraf rilis stabil (ADR-059)",
      ok: stability.ok,
      detail: stability.detail,
    });
    validation.ok &&= stability.ok;
  }
  writeText(
    join(paths.repo, `${config.reportPrefix}-validasi.md`),
    [validationReport(ctx, validation), ...(stability?.report ?? [])].join("\n"),
  );
  writeText(
    join(paths.repo, `${config.reportPrefix}-openiti.md`),
    openitiReport(ctx, pages, matan, takhrij),
  );
  writeText(join(paths.repo, `${config.reportPrefix}-ayat.md`), ayatReport(ctx, ayat, rows));
  if (!validation.ok) return { validation, ayat: ayat.stats };

  mkdirSync(sqlDir, { recursive: true });
  const files = emitSql(rows, fts, {
    ...latinFtsRows(rows.translation, rows.summary),
    digest: intisari?.fts ?? [],
  });
  for (const f of files) writeFileSync(join(sqlDir, f.name), f.content);
  const { counts } = buildSqlite(sqlitePath, paths.migrations, files, [
    ...TABLE_ORDER,
    "passage_fts",
    "translation_fts",
    "summary_fts",
    "digest_point_fts",
  ]);
  mkdirSync(dirname(idsPath), { recursive: true });
  writeIdMap(idsPath, ids.snapshot());
  writeFingerprints(printsPath, prints);

  const digest = buildDigest(sqlDir, sqlitePath);
  writeFileSync(hashPath, `${digest}\n`);
  return {
    validation,
    ayat: ayat.stats,
    output: {
      files: files.map((f) => f.name),
      sqlite: sqlitePath,
      counts,
      hash: digest,
      idsAdded: { ...ids.added },
    },
  };
}
