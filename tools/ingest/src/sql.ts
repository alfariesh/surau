// Menulis baris korpus sebagai file SQL untuk `wrangler d1 execute --file` (lokal dan remote).
// Aturan D1 (dicek 2026-10-16, docs + wrangler 4.151): statement ≤ 100 KB, tanpa BEGIN/COMMIT
// (impor remote sudah satu transaksi), foreign key selalu ditegakkan. Maka: INSERT multi-baris
// ≤ 90 KB per statement, tabel induk lebih dulu, node daftar isi dalam urutan DFS (induk dulu).
// Keluarannya deterministik: baris yang sama selalu menghasilkan byte yang sama.
import { corpusTables } from "@surau/db";

import { TABLE_ORDER } from "./rows.ts";
import type { CorpusRows } from "./rows.ts";
import {
  FTS_COLUMNS,
  FTS_OPTIMIZE_SQL,
  LATIN_FTS_COLUMNS,
  ftsOptimizeSql,
} from "./search-index.ts";
import type { FtsRow, LatinFtsRow } from "./search-index.ts";

/** Batas byte UTF-8 satu statement (batas D1 100 KB, disisakan ruang). */
export const MAX_STATEMENT_BYTES = 90_000;
/** Batas byte UTF-8 satu file (supaya impor per file tetap kecil dan bisa diulang). */
export const MAX_FILE_BYTES = 2_000_000;

export interface SqlFile {
  /** Nama file berurutan, mis. `0003-passage-02.sql`. */
  name: string;
  content: string;
}

type Value = string | number | null;

/** Literal SQL. Hanya bilangan bulat, teks, dan NULL yang dipakai skema korpus. */
export function sqlLiteral(value: Value): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`bukan bilangan bulat aman: ${value}`);
    return String(value);
  }
  if (value.includes("\u0000")) throw new Error("teks memuat karakter NUL");
  return `'${value.replaceAll("'", "''")}'`;
}

const bytes = (s: string): number => Buffer.byteLength(s, "utf8");

/**
 * Pernyataan pengosongan korpus, anak lebih dulu. `schema_version` milik migrasi dipertahankan.
 * Ini mengosongkan SELURUH DB korpus (satu kitab per DB untuk sekarang): kitab kedua butuh reset
 * per edisi. Indeks `passage_fts` (contentless) dikosongkan dengan `delete-all`: INSERT ke rowid
 * yang sudah ada TIDAK menghapus token lama, jadi indeks tidak boleh dimuat di atas isi lama.
 */
export const RESET_SQL = [
  "-- Kosongkan korpus sebelum dimuat ulang (anak lebih dulu), termasuk terjemahan/ringkasan AI",
  "-- (S13): keduanya dibangun ulang dari hasil batch di data/build/llm setiap ingest.",
  "INSERT INTO passage_fts (passage_fts) VALUES ('delete-all');",
  // Indeks Indonesia (S14, skema 6).
  "INSERT INTO translation_fts (translation_fts) VALUES ('delete-all');",
  "INSERT INTO summary_fts (summary_fts) VALUES ('delete-all');",
  // Indeks gagasan Intisari (X15, skema 9).
  "INSERT INTO digest_point_fts (digest_point_fts) VALUES ('delete-all');",
  ...[...TABLE_ORDER]
    .reverse()
    .filter((t) => t !== "meta")
    .map((t) => `DELETE FROM ${t};`),
  "DELETE FROM meta WHERE key <> 'schema_version';",
  "",
].join("\n");

/** Pecah baris satu tabel menjadi INSERT multi-baris ≤ MAX_STATEMENT_BYTES. */
export function insertStatements(
  table: string,
  columns: readonly string[],
  rows: readonly Value[][],
): string[] {
  const head = `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n`;
  const out: string[] = [];
  let tuples: string[] = [];
  let size = bytes(head) + 2;
  for (const row of rows) {
    const tuple = `(${row.map(sqlLiteral).join(", ")})`;
    const tupleBytes = bytes(tuple) + 2;
    if (bytes(head) + tupleBytes + 2 > MAX_STATEMENT_BYTES) {
      throw new Error(`satu baris ${table} melebihi ${MAX_STATEMENT_BYTES} byte`);
    }
    if (tuples.length > 0 && size + tupleBytes > MAX_STATEMENT_BYTES) {
      out.push(`${head}${tuples.join(",\n")};\n`);
      tuples = [];
      size = bytes(head) + 2;
    }
    tuples.push(tuple);
    size += tupleBytes;
  }
  if (tuples.length > 0) out.push(`${head}${tuples.join(",\n")};\n`);
  return out;
}

/** Kelompokkan statement menjadi file ≤ MAX_FILE_BYTES bernama `<nomor>-<label>[-<bagian>].sql`. */
function toFiles(files: SqlFile[], label: string, statements: readonly string[]): void {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const st of statements) {
    if (current.length > 0 && size + bytes(st) > MAX_FILE_BYTES) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(st);
    size += bytes(st);
  }
  if (current.length > 0) chunks.push(current);
  chunks.forEach((chunk, i) => {
    const n = String(files.length).padStart(4, "0");
    const part = chunks.length > 1 ? `-${String(i + 1).padStart(2, "0")}` : "";
    files.push({ name: `${n}-${label}${part}.sql`, content: chunk.join("") });
  });
}

/** Baris indeks Indonesia (S14): `translation_fts`, `summary_fts`, dan gagasan Intisari (X15b). */
export interface LatinFts {
  translation: readonly LatinFtsRow[];
  summary: readonly LatinFtsRow[];
  /** `digest_point_fts` (rowid = toc_node_id·100 + ord); kosong sampai ada hasil Intisari. */
  digest?: readonly LatinFtsRow[];
}

/**
 * Semua file SQL korpus: reset, tabel biasa dalam `TABLE_ORDER`, lalu indeks `passage_fts` (S11),
 * `translation_fts` + `summary_fts` (S14), masing-masing dengan `optimize`, tepat sebelum `meta`.
 * `meta` (versi korpus) selalu file terakhir, jadi korpus yang punya `meta.corpus_version` pasti
 * sudah termuat penuh, termasuk indeksnya.
 */
export function emitSql(
  rows: CorpusRows,
  fts: readonly FtsRow[] = [],
  latin: LatinFts = { translation: [], summary: [] },
): SqlFile[] {
  const files: SqlFile[] = [{ name: "0000-reset.sql", content: RESET_SQL }];
  for (const table of TABLE_ORDER) {
    if (table === "meta" && fts.length > 0) {
      const values = fts.map((r) => FTS_COLUMNS.map((c) => r[c]));
      toFiles(files, "passage-fts", insertStatements("passage_fts", FTS_COLUMNS, values));
      toFiles(files, "passage-fts-optimize", [FTS_OPTIMIZE_SQL]);
    }
    if (table === "meta") {
      for (const [name, list] of [
        ["translation_fts", latin.translation],
        ["summary_fts", latin.summary],
        ["digest_point_fts", latin.digest ?? []],
      ] as const) {
        if (list.length === 0) continue;
        const values = list.map((r) => LATIN_FTS_COLUMNS.map((c) => r[c]));
        const label = name.replaceAll("_", "-");
        toFiles(files, label, insertStatements(name, LATIN_FTS_COLUMNS, values));
        toFiles(files, `${label}-optimize`, [ftsOptimizeSql(name)]);
      }
    }
    const columns = Object.keys(corpusTables[table].shape);
    const values = (rows[table] as Record<string, Value>[]).map((r) =>
      columns.map((c) => r[c] ?? null),
    );
    toFiles(files, table.replaceAll("_", "-"), insertStatements(table, columns, values));
  }
  return files;
}
