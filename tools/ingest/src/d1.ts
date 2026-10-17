// Pembungkus `wrangler d1` untuk DB korpus: dipakai `load.ts` (lokal/staging), `promote.ts`
// (blue-green produksi, ADR-005) dan `qa.ts` (sampel halaman). Satu tempat untuk memanggil
// wrangler, membaca keluaran JSON, dan smoke query, supaya ketiganya memeriksa hal yang sama.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  LATIN_SEARCH_SCHEMA_VERSION,
  QURAN_SCHEMA_VERSION,
  SEARCH_SCHEMA_VERSION,
} from "@surau/db";
import { buildFtsMatch, latinMatchExpression, planLatinQuery } from "@surau/text";

import { sqlLiteral } from "./sql.ts";

export const repo = resolve(import.meta.dirname, "../../..");
/** Config D1 bersama: binding CORPUS = korpus STAGING (lokal juga memakai ID ini). */
export const DB_CONFIG = "packages/db/wrangler.jsonc";
/** Config Worker web: binding CORPUS_DB top-level = korpus PRODUKSI. */
export const WEB_CONFIG = "apps/web/wrangler.jsonc";
/** Config Worker MCP (S16): CORPUS_DB top-level = korpus PRODUKSI yang sama dengan web. */
export const MCP_CONFIG = "apps/mcp/wrangler.jsonc";
export const CORPUS_MIGRATIONS = "packages/db/migrations/corpus";

/** Jalankan wrangler dari root repo. Keluaran (panjang) hanya dicetak bila gagal. */
export function wrangler(args: string[]): string {
  const r = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) {
    process.stderr.write(`${r.stdout ?? ""}${r.stderr ?? ""}`);
    throw new Error(`wrangler ${args.slice(0, 3).join(" ")} gagal (kode ${String(r.status)})`);
  }
  return r.stdout ?? "";
}

export type Row = Record<string, string | number | null>;

/** Ke DB mana perintah `wrangler d1` diarahkan: config + nama binding/DB + flag lokasi. */
export interface D1Target {
  /** Nama untuk pesan dan laporan, mis. `surau-corpus-ihya-v1`. */
  label: string;
  config: string;
  database: string;
  location: string[];
}

export const LOCAL: D1Target = {
  label: "lokal (.wrangler/state)",
  config: DB_CONFIG,
  database: "CORPUS",
  location: ["--local", "--persist-to", ".wrangler/state"],
};

export const STAGING: D1Target = {
  label: "surau-corpus-staging",
  config: DB_CONFIG,
  database: "CORPUS",
  location: ["--remote"],
};

/**
 * Target remote untuk DB korpus yang tidak tercantum di config mana pun (DB blue-green baru).
 * `wrangler d1 migrations apply` hanya mengenal DB dari config, jadi dibuat config sementara di
 * folder temp dengan `migrations_dir` absolut. Panggil `dispose()` setelah selesai.
 */
export function remoteByName(name: string, id: string): D1Target & { dispose: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "surau-d1-"));
  const config = join(dir, "wrangler.jsonc");
  writeFileSync(
    config,
    JSON.stringify(
      {
        name: "surau-corpus-tool",
        compatibility_date: "2026-10-14",
        d1_databases: [
          {
            binding: "CORPUS",
            database_name: name,
            database_id: id,
            migrations_dir: join(repo, CORPUS_MIGRATIONS),
          },
        ],
      },
      null,
      2,
    ),
  );
  return {
    label: name,
    config,
    database: "CORPUS",
    location: ["--remote"],
    dispose: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** Satu kueri baca (`--command`, satu statement). Remote: satu panggilan /query, batas 30 dtk. */
export function query(target: D1Target, sql: string): Row[] {
  const out = wrangler([
    "d1",
    "execute",
    target.database,
    ...target.location,
    "-c",
    target.config,
    "--json",
    "--command",
    sql,
  ]);
  const parsed = JSON.parse(out) as { results: Row[] }[];
  return parsed.flatMap((r) => r.results);
}

export function applyMigrations(target: D1Target): void {
  wrangler(["d1", "migrations", "apply", target.database, ...target.location, "-c", target.config]);
}

/** Muat satu file SQL (remote: API impor; bila gagal DB kembali ke keadaan semula). */
export function executeFile(target: D1Target, file: string): void {
  wrangler([
    "d1",
    "execute",
    target.database,
    ...target.location,
    "-c",
    target.config,
    "--yes",
    "--file",
    file,
  ]);
}

// Tabel yang dihitung smoke query (urutan = urutan sisip, induk dulu).
export const COUNTED = [
  "author",
  "work",
  "edition",
  "page",
  "toc_node",
  "passage",
  "footnote_ref",
  "passage_needs_review",
  "quran_source",
  "quran_surah",
  "quran_ayah",
  "quran_translation",
  "passage_ayah_ref",
  // Terjemahan/ringkasan AI (S13): tabel ada sejak skema 1, kosong di korpus sebelum ihya-v4.
  "translation",
  "summary",
  "term_stat",
  "passage_fts",
  // Indeks Indonesia (S14): tabel virtual baru ada sejak skema 6.
  "translation_fts",
  "summary_fts",
  "meta",
] as const;
/** Tabel yang baru ada (atau baru diisi) sejak skema korpus 4 (S11): tidak dihitung di korpus lama. */
const SEARCH_TABLES: ReadonlySet<string> = new Set(["term_stat", "passage_fts"]);
const LATIN_TABLES: ReadonlySet<string> = new Set(["translation_fts", "summary_fts"]);
const QURAN_TABLES: ReadonlySet<string> = new Set([
  "quran_source",
  "quran_surah",
  "quran_ayah",
  "quran_translation",
  "passage_ayah_ref",
]);

// Satu baris berisi subkueri per tabel (D1 membatasi jumlah suku UNION dalam satu SELECT).
const smokeCounts = (tables: readonly string[]): string =>
  `SELECT ${tables.map((t) => `(SELECT count(*) FROM ${t}) AS ${t}`).join(", ")}`;

// j1 h200 (contoh baku: hadits shalat malam Jumat + takhrij al-'Iraqi): paragraf badan, catatan
// kaki, dan penanda yang tertaut.
const SMOKE_PAGE = `SELECT p.kind AS kind, count(*) AS n,
  (SELECT count(*) FROM footnote_ref f JOIN passage b ON b.id = f.passage_id WHERE b.page_id = pg.id) AS refs
FROM page pg
JOIN edition e ON e.id = pg.edition_id AND e.is_default = 1
JOIN work w ON w.id = e.work_id AND w.slug = 'ihya'
JOIN passage p ON p.page_id = pg.id
WHERE pg.juz = 1 AND pg.page_no = 200
GROUP BY p.kind ORDER BY p.kind`;

// Indeks pencarian (S11): kueri buatan @surau/text yang sama dengan searchText harus mengenai
// paragraf. الصبر ada di ±320 paragraf Ihya; literal MATCH dibuat kode (bukan masukan pengguna).
const SMOKE_SEARCH = `SELECT count(*) AS n FROM passage_fts WHERE passage_fts MATCH ${sqlLiteral(
  buildFtsMatch("الصبر") ?? "",
)}`;

// Indeks Indonesia (S14): kueri "sabar" (rencana @surau/text yang sama dengan searchText) harus
// mengenai terjemahan dan ringkasan.
const SABAR = planLatinQuery("sabar");
const SMOKE_LATIN = ["translation_fts", "summary_fts"].map(
  (t) =>
    `SELECT count(*) AS n FROM ${t} WHERE ${t} MATCH ${sqlLiteral(
      SABAR === null ? "" : latinMatchExpression(SABAR, "all"),
    )}`,
);

export interface Smoke {
  counts: Record<(typeof COUNTED)[number], number>;
  meta: Record<string, string>;
  /** Pesan kegagalan; kosong = lolos. */
  problems: string[];
  /**
   * Fitur yang tidak ada karena skema korpus lebih lama dari kode (mis. ihya-v1 tanpa indeks
   * pencarian). Bukan kegagalan data: kode memeriksa `meta.schema_version` dan menyembunyikan
   * fiturnya (ARSITEKTUR-TEKNIS §7 aturan 5). Build baru dan pemuatan wajib tanpa batasan.
   */
  limitations: string[];
}

/**
 * Smoke query: jumlah baris per tabel (termasuk indeks FTS), isi `meta`, j1 h200 (badan + catatan
 * kaki + penanda), dan satu kueri pencarian.
 * Bila `expect` diberikan (hitungan dan meta dari .sqlite build), setiap angka harus sama persis.
 */
export function smoke(
  target: D1Target,
  expect?: { counts: Record<string, number>; meta: Record<string, string> },
): Smoke {
  const meta = Object.fromEntries(
    query(target, "SELECT key, value FROM meta ORDER BY key").map((r) => [
      String(r.key),
      String(r.value),
    ]),
  );
  // Korpus skema < 4 (ihya-v1) tidak punya term_stat: dihitung 0 dan pencarian tidak dicoba, supaya
  // smoke (mis. `promote --switch-only`) memberi pesan, bukan crash "no such table".
  const search = Number(meta.schema_version ?? 0) >= SEARCH_SCHEMA_VERSION;
  // Tabel Qur'an (S12) baru ada sejak skema 5: korpus lama dihitung 0, tanpa crash.
  const quran = Number(meta.schema_version ?? 0) >= QURAN_SCHEMA_VERSION;
  // Indeks Indonesia (S14) sejak skema 6.
  const latin = Number(meta.schema_version ?? 0) >= LATIN_SEARCH_SCHEMA_VERSION;
  const tables = COUNTED.filter(
    (t) =>
      (search || !SEARCH_TABLES.has(t)) &&
      (quran || !QURAN_TABLES.has(t)) &&
      (latin || !LATIN_TABLES.has(t)),
  );
  const row = query(target, smokeCounts(tables))[0] ?? {};
  const counts = Object.fromEntries(
    COUNTED.map((t) => [t, Number(row[t] ?? 0)]),
  ) as Smoke["counts"];
  const problems: string[] = [];
  const limitations: string[] = [];
  const page = query(target, SMOKE_PAGE);
  const body = Number(page.find((r) => r.kind === "body")?.n ?? 0);
  const foot = Number(page.find((r) => r.kind === "foot")?.n ?? 0);
  if (body === 0 || foot === 0 || Number(page[0]?.refs ?? 0) === 0) {
    problems.push("j1 h200 tidak punya paragraf badan, catatan kaki, atau penanda tertaut");
  }
  if (!search) {
    limitations.push(
      `skema korpus ${meta.schema_version ?? "?"} belum punya indeks pencarian (S11)`,
    );
  } else if (Number(query(target, SMOKE_SEARCH)[0]?.n ?? 0) === 0) {
    problems.push("indeks passage_fts tidak mengenai الصبر (indeks kosong atau tidak sinkron)");
  }
  if (!quran) {
    limitations.push(`skema korpus ${meta.schema_version ?? "?"} belum punya tabel ayat (S12)`);
  } else if (counts.quran_ayah === 0 || counts.passage_ayah_ref === 0) {
    problems.push("tabel quran_ayah atau passage_ayah_ref kosong");
  }
  if (!latin) {
    limitations.push(
      `skema korpus ${meta.schema_version ?? "?"} belum punya indeks terjemahan Indonesia (S14)`,
    );
  } else if (counts.translation > 0) {
    // Korpus tanpa terjemahan (sebelum S13) memang tidak punya isi indeks Indonesia.
    const [tr, sm] = SMOKE_LATIN.map((sql) => Number(query(target, sql)[0]?.n ?? 0));
    if (tr === 0 || (counts.summary > 0 && sm === 0)) {
      problems.push('indeks translation_fts/summary_fts tidak mengenai "sabar"');
    }
  }
  if (expect !== undefined) {
    for (const t of COUNTED) {
      if (counts[t] !== expect.counts[t]) {
        problems.push(`${t}: ${counts[t]} baris, build ${String(expect.counts[t])}`);
      }
    }
    for (const [k, v] of Object.entries(expect.meta)) {
      if (meta[k] !== v) problems.push(`meta.${k} = ${meta[k] ?? "(tidak ada)"}, build ${v}`);
    }
  }
  return { counts, meta, problems, limitations };
}

export function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([t, n]) => `${t} ${n}`)
    .join(", ");
}
