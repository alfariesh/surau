// Alur ingest (ARSITEKTUR-TEKNIS §6), per kitab: baca → bersih/pecah → daftar isi + patch → QA
// OpenITI → validasi → baris; lalu baris semua kitab digabung menjadi satu korpus (X31a, ADR-137) →
// SQL + .sqlite + peta ID dan laporan per kitab. Semua keluaran deterministik:
// `built_at` diambil dari SOURCE_DATE_EPOCH atau tanggal commit HEAD, bukan jam sekarang.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { AudioTrackRow, MetaRow, PassageAyahRefRow, PassageRow } from "@surau/db";
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
import { mergeSamePageMarkers, parseOpenitiPages } from "./openiti/markdown.ts";
import { checkMatan, checkTakhrij, noTakhrijCheck } from "./openiti/verify.ts";
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
import type { CorpusRows, CorpusTable } from "./rows.ts";
import { ftsRows, latinFtsRows, termStats } from "./search-index.ts";
import type { FtsRow } from "./search-index.ts";
import { dropEditorFootnotes, mergeSamePrintPages, parsePage } from "./shamela/page.ts";
import type { ParsedPage } from "./shamela/page.ts";
import { readShamelaBook } from "./shamela/source.ts";
import type { ShamelaSource } from "./shamela/source.ts";
import { emitSql } from "./sql.ts";
import { assertWritable } from "./sqlite.ts";
import { llmRows } from "./llm/attach.ts";
import type { LlmBuild } from "./llm/attach.ts";
import { digestInvariant, digestRows, withDigestSummaries } from "./llm/digest-attach.ts";
import type { DigestBuild } from "./llm/digest-attach.ts";
import {
  WITHDRAWN_REPORT,
  contentDigestRows,
  contentInvariant,
  mergeDigests,
  readContentUnits,
  unitsOf,
  withdrawnReport,
} from "./konten.ts";
import type { ChatDigestBuild, ContentUnits, MergedDigest } from "./konten.ts";
import { loadReviews } from "./llm/reviews.ts";
import {
  applyRevisions,
  loadRevisions,
  revisionInvariant,
  revisionMetaRows,
} from "./llm/revisions.ts";
import type { LoadedRevisions, RevisionStats } from "./llm/revisions.ts";
import { readSubheadings } from "./llm/titles.ts";
import { buildToc } from "./toc.ts";
import type { TocBuild } from "./toc.ts";
import { validate } from "./validate.ts";
import type { Validation } from "./validate.ts";
import type { CorpusConfig, WorkConfig } from "./works/config.ts";

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

/** Baca sumber, pecah halaman, dan jalankan QA OpenITI (dipakai build dan `verify-openiti`). */
export function prepare(config: WorkConfig, paths: PipelinePaths, corpusVersion: string): Prepared {
  const source = readShamelaBook(paths.shamela, config.shamelaBook);
  // Catatan penyunting modern tidak dimuat sama sekali (ADR-138 butir 3): dibuang sebelum daftar
  // isi, QA, dan alokasi ID, jadi tidak ada paragraf, footnote_ref, maupun ID untuknya.
  const parsed = source.pages
    .map(parsePage)
    .map((p) => (config.footnotes === "modern_editor" ? dropEditorFootnotes(p) : p));
  // Halaman Shamela berurutan bernomor cetak sama digabung (ADR-139), juga penanda OpenITI-nya,
  // sehingga QA matan, daftar isi, dan baris tetap per halaman Surau.
  const merge = config.mergeSamePrintPage === true;
  if (merge && config.openiti.takhrij !== undefined) {
    throw new Error(
      `${config.work.slug}: mergeSamePrintPage dengan versi pembanding takhrij belum didukung (ADR-139)`,
    );
  }
  const pages = merge ? mergeSamePrintPages(parsed) : parsed;
  const openitiMatan = parseOpenitiPages(readOpenitiFile(paths.openiti, config.openiti.matan));
  const matan = checkMatan(pages, merge ? mergeSamePageMarkers(openitiMatan) : openitiMatan);
  const takhrij =
    config.openiti.takhrij === undefined
      ? noTakhrijCheck(pages)
      : checkTakhrij(
          pages,
          parseOpenitiPages(readOpenitiFile(paths.openiti, config.openiti.takhrij)),
        );
  return {
    source,
    pages,
    matan,
    takhrij,
    ctx: { config, corpusVersion, sourceSha256: source.sha256, normVersion: NORM_VERSION },
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
  corpusVersion: string,
): { ok: boolean; prepared: Prepared } {
  const prepared = prepare(config, paths, corpusVersion);
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
  // Kitab tanpa patch daftar isi: pohon judul Shamela apa adanya (gerbang yatim tetap berlaku).
  const patch =
    config.patch === undefined
      ? { shamela_book: config.shamelaBook, add: [], move: [] }
      : readTocPatch(join(paths.repo, config.patch));
  if (patch.shamela_book !== config.shamelaBook) {
    throw new Error(
      `${config.patch} untuk kitab ${patch.shamela_book}, bukan ${config.shamelaBook}`,
    );
  }
  return buildToc(prepared.source.titles, prepared.pages, patch);
}

/** Data bersama satu build korpus: sumber Qur'an dan waktu build (sama untuk semua kitab). */
interface CorpusShared {
  corpusVersion: string;
  builtAt: string;
  quran: QuranData;
  /** Revisi terjemahan manusia (X08) seluruh korpus; disaring per edisi saat dipasang. */
  revisions: LoadedRevisions | null;
  /** Unit konten chat (X24) seluruh repo; disaring per edisi saat dipasang. */
  content: ContentUnits;
}

function corpusShared(
  corpus: Pick<CorpusConfig, "version">,
  paths: PipelinePaths,
  env?: NodeJS.ProcessEnv,
): CorpusShared {
  return {
    corpusVersion: corpus.version,
    builtAt: buildTimestamp(paths.repo, env),
    quran: loadQuran(paths.quran, (s) => normalizeArabic(s).text),
    revisions: loadRevisions(paths.repo),
    content: readContentUnits(paths.repo),
  };
}

/** Revisi milik satu edisi saja (`passage.id` = edition_id·10⁷ + seq, ADR-029). */
function revisionsOf(loaded: LoadedRevisions | null, editionId: number): LoadedRevisions | null {
  if (loaded === null) return null;
  const lo = editionId * 1e7;
  return {
    ...loaded,
    lines: loaded.lines.filter((l) => l.passage_id > lo && l.passage_id < lo + 1e7),
  };
}

/**
 * Baris korpus SATU kitab + baris indeks FTS-nya; tabel Qur'an dari sumber Qur'an bersama (S12).
 * `term_stat` dihitung dari indeks bila `withTermStats` (QA satu kitab); build korpus menghitungnya
 * sekali dari indeks gabungan semua kitab.
 */
function rowsFor(
  config: WorkConfig,
  paths: PipelinePaths,
  prepared: Prepared,
  toc: TocBuild,
  ids: IdAllocator,
  shared: CorpusShared,
  withTermStats: boolean,
): {
  rows: CorpusRows;
  fts: FtsRow[];
  ayat: AyatBuild;
  llm: LlmBuild | null;
  revisions: RevisionStats;
  /** Intisari (X15b): baris + indeks + invarian; null bila kitab dibangun tanpa hasil LLM. */
  digest: DigestBuild | null;
  /** Konten chat (X24): null bila edisi ini tanpa unit siap maupun ditarik. */
  content: { chat: ChatDigestBuild; merged: MergedDigest; withdrawn: number } | null;
} {
  const { source, pages, takhrij } = prepared;
  const { quran } = shared;
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
      corpusVersion: shared.corpusVersion,
      builtAt: shared.builtAt,
      sourceHash: `sha256:${source.sha256}`,
    },
  });
  const fts = ftsRows(base.passage);
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
    term_stat: withTermStats ? termStats(fts, paths.migrations) : [],
  };
  // Hasil LLM per kitab (ADR-137): tanpa folder hasil LLM atau tanpa `config.llm` = tanpa
  // terjemahan/ringkasan/Intisari (gerbang `llmCoverage` 0 yang menentukan boleh tidaknya).
  const llmDir =
    paths.llm === undefined || config.llm === undefined
      ? undefined
      : join(paths.llm, config.llm.dir);
  const subheadings = readSubheadings(paths.repo, config);
  // Terjemahan/ringkasan AI dicek terhadap baris yang baru dibangun ini (hash sumber, ayat).
  const llm =
    llmDir === undefined ? null : llmRows(rows, llmDir, loadReviews(paths.repo), subheadings);
  if (llm !== null) {
    rows.translation = llm.translation;
    rows.summary = llm.summary;
    rows.toc_title_translation = llm.toc_title_translation;
    rows.subheading_translation = llm.subheading_translation;
  }
  // Revisi terjemahan manusia (X08 tahap 2, ADR-082): menimpa teks AI sesudah hasil batch dimuat,
  // divalidasi ulang terhadap baris korpus ini. Metadata git tanpa berkas ekspornya = GAGAL.
  const revisions = applyRevisions(rows, revisionsOf(shared.revisions, config.edition.id));
  rows.translation = revisions.translation;
  rows.translation_review = revisions.translation_review;
  // Intisari (X15b, ADR-097): dicek terhadap baris korpus final ini (termasuk terjemahan yang sudah
  // direvisi, untuk kutipan satu paragraf utuh). Abstrak yang lolos `checkSummary` menjadi ringkasan
  // bahasa id node itu, sehingga Cari/Jawab/MCP memakai satu ringkasan.
  const baseSummary = rows.summary;
  let digest =
    paths.llm === undefined || config.llm === undefined
      ? null
      : digestRows(rows, join(paths.llm, config.llm.intisari), { subheadings });
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
  // Konten chat (X24, ADR-145): unit siap menggantikan Intisari batch bagian yang sama; Intisari
  // batch induk dari anak yang diganti ikut dibuang. Ringkasan dihitung ulang dari ringkasan dasar.
  const units = unitsOf(shared.content, config.edition.id);
  let content: { chat: ChatDigestBuild; merged: MergedDigest; withdrawn: number } | null = null;
  if (units.ready.length > 0 || units.withdrawn.length > 0) {
    const chat = contentDigestRows(rows, units.ready);
    const merged = mergeDigests(digest, chat, rows.toc_node);
    digest = merged.build;
    rows.glossary_term = digest.glossary_term;
    rows.digest = digest.digest;
    rows.digest_point = digest.digest_point;
    rows.digest_anchor = digest.digest_anchor;
    rows.digest_quote = digest.digest_quote;
    rows.digest_question = digest.digest_question;
    rows.digest_term = digest.digest_term;
    rows.summary = withDigestSummaries(baseSummary, digest.summary);
    content = { chat, merged, withdrawn: units.withdrawn.length };
  }
  return {
    content,
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
 * Baris korpus SATU kitab yang SEHARUSNYA ada, dibangun ulang di memori dari sumber Shamela dengan
 * peta ID yang di-commit (tanpa menulis apa pun). Dipakai QA sampel halaman (`qa.ts`, S10).
 */
export function expectedRows(
  config: WorkConfig,
  paths: PipelinePaths,
  env?: NodeJS.ProcessEnv,
  corpusVersion = "qa",
): CorpusRows {
  const prepared = prepare(config, paths, corpusVersion);
  const toc = readToc(config, paths, prepared);
  const ids = createAllocator(readIdMap(join(paths.repo, config.ids), config.edition.id));
  const shared = corpusShared({ version: corpusVersion }, paths, env);
  const { rows } = rowsFor(config, paths, prepared, toc, ids, shared, true);
  const added = Object.values(ids.added).reduce((a, b) => a + b, 0);
  if (added > 0) {
    throw new Error(
      `Peta ID ${config.ids} belum memuat ${added} baris sumber: build korpus tidak sesuai sumber, jalankan \`pnpm ingest korpus\``,
    );
  }
  return rows;
}

/** Hasil satu kitab di dalam build korpus. */
export interface WorkIngest {
  config: WorkConfig;
  validation: Validation;
  ayat: AyahStats;
  idsAdded: Record<string, number>;
}

export interface IngestResult {
  /** Gabungan semua kitab (satu kitab = validasi kitab itu apa adanya). */
  validation: Validation;
  /** Statistik pencocok ayat (S12) kitab pertama; per kitab di `works`. Ada juga bila validasi gagal. */
  ayat: AyahStats;
  works: WorkIngest[];
  /** Diisi bila validasi lolos dan keluaran ditulis. */
  output?: {
    files: string[];
    sqlite: string;
    counts: Record<string, number>;
    /** sha256 gabungan file SQL (terurut) + .sqlite. */
    hash: string;
    /** Jumlah ID baru semua kitab (per kitab di `works`). */
    idsAdded: Record<string, number>;
  };
}

export interface IngestOptions {
  /** Abaikan peta ID yang ada dan bangun dari nol (HANYA sebelum rilis, ADR-029; ditolak bila sidik teks ada). */
  resetIds?: boolean;
  /**
   * `passage.id` lama yang teksnya boleh berubah (koreksi teks yang disengaja), satu per satu. ID
   * yang HILANG tetap ditolak. Periksa daftar lengkap di laporan validasi dulu: paragraf bergeser
   * juga tampil sebagai "berubah". Setiap ID hanya berlaku untuk edisinya (ADR-029).
   */
  acceptTextChanges?: readonly number[];
  env?: NodeJS.ProcessEnv;
  /**
   * Baris `audio_track` yang sha skripnya sudah dicocokkan dengan build sebelumnya yang sama
   * (`selectBuildAudio`, X17). Diisi putaran kedua CLI ingest; foreign key ke `digest` diperiksa build.
   */
  audioTracks?: readonly AudioTrackRow[];
}

type Row = Record<string, unknown>;

/**
 * Tabel yang isinya sama untuk semua kitab (atau dipakai bersama): digabung tanpa duplikat, dengan
 * kunci primernya. Glosarium Intisari milik korpus (satu istilah, satu definisi per bahasa); kitab
 * yang membawa definisi berbeda untuk istilah yang sama membuat build gagal (diputuskan di X31b).
 */
const SHARED_TABLES: Partial<Record<CorpusTable, ((r: Row) => string) | null>> = {
  author: (r) => String(r.id),
  quran_source: null,
  quran_surah: null,
  quran_ayah: null,
  quran_translation: null,
  glossary_term: (r) => `${String(r.term_key)}|${String(r.lang)}`,
};

/** Gabungkan baris tanpa duplikat persis; kunci sama dengan isi berbeda = galat. */
function dedupeRows(
  table: string,
  rows: readonly object[],
  key: ((r: Row) => string) | null,
): object[] {
  const seen = new Map<string, object>();
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const json = JSON.stringify(r);
    if (seen.has(json)) continue;
    if (key !== null) {
      const k = key(r as Row);
      const prev = byKey.get(k);
      if (prev !== undefined)
        throw new Error(`Tabel ${table}: kunci ${k} berbeda isi antar-kitab (${prev} ≠ ${json})`);
      byKey.set(k, json);
    }
    seen.set(json, r);
  }
  return [...seen.values()];
}

/**
 * Gabungkan baris beberapa kitab menjadi satu korpus. `meta` dibangun ulang: nilai korpus sama untuk
 * semua kitab, `source_hash` menggabungkan sumber per kitab (satu kitab = apa adanya).
 */
function mergeRows(
  parts: readonly { config: WorkConfig; rows: CorpusRows }[],
  revisions: LoadedRevisions | null,
): CorpusRows {
  const out: Record<string, object[]> = {};
  for (const table of TABLE_ORDER) {
    if (table === "meta" || table === "term_stat") continue;
    const all = parts.flatMap((p) => p.rows[table] as object[]);
    out[table] =
      table in SHARED_TABLES ? dedupeRows(table, all, SHARED_TABLES[table] ?? null) : all;
  }
  const first = parts[0]?.rows.meta ?? [];
  const hashes = parts.map((p) => ({
    slug: p.config.work.slug,
    value: p.rows.meta.find((m) => m.key === "source_hash")?.value ?? "",
  }));
  const sourceHash =
    hashes.length === 1
      ? (hashes[0]?.value ?? "")
      : hashes.map((h) => `${h.slug}=${h.value}`).join(";");
  const meta: MetaRow[] = [
    ...first.map((m) => (m.key === "source_hash" ? { ...m, value: sourceHash } : m)),
    ...revisionMetaRows(revisions),
  ];
  return { ...(out as unknown as CorpusRows), meta, term_stat: [] };
}

/** Invarian lintas kitab: ID karya/edisi dan slug unik (ADR-029, ADR-137). */
function corpusInvariants(corpus: CorpusConfig): Validation["invariants"] {
  const dup = (values: readonly (string | number)[]): string[] =>
    [...new Set(values.filter((v, i) => values.indexOf(v) !== i))].map(String);
  const works = corpus.works;
  const problems = [
    ...dup(works.map((w) => w.work.id)).map((v) => `work.id ${v}`),
    ...dup(works.map((w) => w.edition.id)).map((v) => `edition.id ${v}`),
    ...dup(works.map((w) => w.work.slug)).map((v) => `slug ${v}`),
    ...dup(works.map((w) => w.ids)).map((v) => `peta ID ${v}`),
    ...dup(works.map((w) => w.reportPrefix)).map((v) => `laporan ${v}`),
  ];
  return [
    {
      name: "Korpus: ID karya, ID edisi, slug, peta ID, dan laporan unik per kitab",
      ok: works.length > 0 && problems.length === 0,
      detail:
        works.length === 0
          ? "tanpa kitab"
          : problems.length === 0
            ? `${works.length} kitab: ${works.map((w) => w.work.slug).join(", ")}`
            : `ganda: ${problems.join("; ")}`,
    },
  ];
}

/** Bangun satu korpus berisi semua kitab `corpus.works` (X31a, ADR-137). */
export function runIngest(
  corpus: CorpusConfig,
  paths: PipelinePaths,
  opts: IngestOptions = {},
): IngestResult {
  // Keluaran build lama dihapus lebih dulu: bila validasi gagal, tidak ada SQL usang yang bisa
  // termuat tanpa sadar. Build versi lain (mis. ihya-v1 setelah naik ke ihya-v2) ikut dihapus:
  // data/build/sql hanya memuat satu build, dan .sqlite/.sha256 versi lain tidak lagi cocok dengannya.
  const sqlDir = join(paths.build, "sql");
  const sqlitePath = join(paths.build, corpus.output);
  const hashPath = join(paths.build, `${corpus.version}.sha256`);
  const stale = existsSync(paths.build)
    ? readdirSync(paths.build)
        .filter((f) => /^(?:surau-corpus-.+\.sqlite(?:-journal|-wal|-shm)?|.+\.sha256)$/.test(f))
        .map((f) => join(paths.build, f))
    : [];
  for (const path of [sqlDir, sqlitePath, hashPath, ...stale]) {
    rmSync(assertWritable(path), { recursive: true, force: true });
  }

  if (corpus.works.length === 0) throw new Error("Korpus tanpa kitab: isi CorpusConfig.works");
  // ID yang diterima berubah wajib milik salah satu edisi build ini: salah ketik atau ID kitab yang
  // tidak ikut dibangun tidak boleh hilang diam-diam (ADR-059).
  const editionOf = (id: number): number => Math.floor(id / 1e7);
  const editions = new Set(corpus.works.map((w) => w.edition.id));
  const stray = (opts.acceptTextChanges ?? []).filter((id) => !editions.has(editionOf(id)));
  if (stray.length > 0)
    throw new Error(
      `--terima-teks-berubah: ${stray.join(", ")} bukan milik edisi mana pun di build ini (${[...editions].join(", ")})`,
    );
  const shared = corpusShared(corpus, paths, opts.env);
  const built = corpus.works.map((config) => buildWork(config, paths, shared, opts));
  // Log koreksi publik (X24): semua unit ditarik di repo, tanpa teks kitab.
  writeText(join(paths.repo, WITHDRAWN_REPORT), withdrawnReport(shared.content.withdrawn));
  const head = built[0];
  if (head === undefined) throw new Error("Korpus tanpa kitab");
  const works: WorkIngest[] = built.map((b) => ({
    config: b.config,
    validation: b.validation,
    ayat: b.ayat.stats,
    idsAdded: { ...b.ids.added },
  }));
  const validation = mergeValidation(
    built.map((b) => b.validation),
    corpus,
    built,
  );
  // Revisi X08 untuk kitab yang tidak ikut dibangun (mis. `--kitab` sebagian) dicatat, bukan disembunyikan.
  const outside = (shared.revisions?.lines ?? []).filter(
    (l) => !editions.has(editionOf(l.passage_id)),
  ).length;
  if (outside > 0)
    validation.invariants.push({
      name: "Revisi terjemahan manusia milik kitab yang tidak ikut build",
      ok: true,
      detail: `${outside} baris tidak dipasang (kitabnya tidak dibangun)`,
    });
  if (shared.content.problems.length > 0) {
    validation.invariants.push({
      name: "Berkas konten chat (data/konten) terbaca dan sah (X24)",
      ok: false,
      detail: shared.content.problems.slice(0, 20).join("; "),
    });
    validation.ok = false;
  }
  const ayat = head.ayat.stats;
  if (!validation.ok) return { validation, ayat, works };

  const rows = mergeRows(built, shared.revisions);
  // Istilah Intisari wajib ada di glosarium gabungan korpus (foreign key; sama dengan `unknown_term`
  // di gerbang konten chat, X24).
  const glossary = new Set(rows.glossary_term.map((g) => `${g.term_key}:${g.lang}`));
  const orphanTerms = rows.digest_term.filter((t) => !glossary.has(`${t.term_key}:${t.lang}`));
  if (orphanTerms.length > 0) {
    validation.invariants.push({
      name: "Istilah Intisari ada di glosarium korpus (X24)",
      ok: false,
      detail: orphanTerms
        .slice(0, 20)
        .map((t) => `${t.toc_node_id}:${t.term_key}`)
        .join(", "),
    });
    return { validation: { ...validation, ok: false }, ayat, works };
  }
  const fts = built.flatMap((b) => b.fts);
  rows.term_stat = termStats(fts, paths.migrations);
  if (opts.audioTracks !== undefined) rows.audio_track = [...opts.audioTracks];

  mkdirSync(sqlDir, { recursive: true });
  const files = emitSql(rows, fts, {
    ...latinFtsRows(rows.translation, rows.summary),
    digest: built.flatMap((b) => b.digest?.fts ?? []),
  });
  for (const f of files) writeFileSync(join(sqlDir, f.name), f.content);
  const { counts } = buildSqlite(sqlitePath, paths.migrations, files, [
    ...TABLE_ORDER,
    "passage_fts",
    "translation_fts",
    "summary_fts",
    "digest_point_fts",
  ]);
  for (const b of built) {
    mkdirSync(dirname(b.idsPath), { recursive: true });
    writeIdMap(b.idsPath, b.ids.snapshot());
    writeFingerprints(b.printsPath, b.prints);
  }

  const digest = buildDigest(sqlDir, sqlitePath);
  writeFileSync(hashPath, `${digest}\n`);
  const idsAdded: Record<string, number> = {};
  for (const w of works)
    for (const [k, n] of Object.entries(w.idsAdded)) idsAdded[k] = (idsAdded[k] ?? 0) + n;
  return {
    validation,
    ayat,
    works,
    output: { files: files.map((f) => f.name), sqlite: sqlitePath, counts, hash: digest, idsAdded },
  };
}

/** Satu kitab: baca, bangun baris, validasi, sidik teks, dan laporan (belum menulis SQL). */
function buildWork(
  config: WorkConfig,
  paths: PipelinePaths,
  shared: CorpusShared,
  opts: IngestOptions,
) {
  const prepared = prepare(config, paths, shared.corpusVersion);
  const { source, pages, matan, takhrij, ctx } = prepared;
  const toc = readToc(config, paths, prepared);

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
    content,
  } = rowsFor(config, paths, prepared, toc, ids, shared, false);
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
  // Intisari batch (X15b) hanya bila kitab punya hasil LLM; konten chat (X24) dilaporkan terpisah.
  if (config.llm !== undefined && paths.llm !== undefined && intisari !== null) {
    validation.invariants.push(digestInvariant(intisari));
    validation.ok &&= validation.invariants.at(-1)?.ok ?? false;
  }
  if (content !== null) {
    validation.invariants.push(contentInvariant(content.chat, content.merged, content.withdrawn));
    validation.ok &&= validation.invariants.at(-1)?.ok ?? false;
  }
  // Batas bawah Intisari (ADR-137, dari ADR-136): build yang memuat lebih sedikit dari yang tayang gagal.
  // Induk batch yang dibuang karena anaknya diganti unit chat (X24, ADR-145) adalah pengurangan yang
  // disengaja, jadi batas bawahnya ikut turun sebanyak itu (tercatat di detail).
  const stale = content?.merged.staleParents.length ?? 0;
  const minDigests = Math.max(0, (config.expect.minDigests ?? 0) - stale);
  if ((config.expect.minDigests ?? 0) > 0) {
    const n = rows.digest.length;
    validation.invariants.push({
      name: `Intisari termuat ≥ ${minDigests} (tidak berkurang dari korpus tayang)`,
      ok: n >= minDigests,
      detail: `${n} Intisari${config.llm === undefined ? "" : ` dari ${config.llm.intisari}`}${stale > 0 ? `; batas ${config.expect.minDigests} dikurangi ${stale} induk batch basi (X24)` : ""}`,
    });
    validation.ok &&= n >= minDigests;
  }
  const prints = fingerprints(config.edition.id, rows.passage);
  const lo = config.edition.id * 1e7;
  const accepted = opts.acceptTextChanges?.filter((id) => id > lo && id < lo + 1e7);
  const stability = released === null ? null : checkStability(released, prints, accepted);
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
  return {
    config,
    rows,
    fts,
    ayat,
    validation,
    digest: intisari,
    ids,
    idsPath,
    printsPath,
    prints,
  };
}

/** Satu kitab: validasinya apa adanya. Beberapa kitab: invarian diberi awalan slug + invarian korpus. */
function mergeValidation(
  list: readonly Validation[],
  corpus: CorpusConfig,
  built: readonly { config: WorkConfig }[],
): Validation {
  const corpusChecks = corpusInvariants(corpus);
  const first = list[0];
  if (first === undefined) {
    throw new Error("Korpus tanpa kitab: isi CorpusConfig.works");
  }
  if (list.length === 1) {
    const ok = first.ok && corpusChecks.every((i) => i.ok);
    return { ...first, ok, invariants: [...first.invariants, ...corpusChecks] };
  }
  const invariants = [
    ...list.flatMap((v, i) =>
      v.invariants.map((inv) => ({ ...inv, name: `[${built[i]?.config.work.slug}] ${inv.name}` })),
    ),
    ...corpusChecks,
  ];
  return { ...first, ok: invariants.every((i) => i.ok), invariants };
}
