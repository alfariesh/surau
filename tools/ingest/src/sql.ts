// Menulis baris korpus sebagai file SQL untuk `wrangler d1 execute --file` (lokal dan remote).
// Aturan D1 (dicek 2026-10-16, docs + wrangler 4.151): statement ≤ 100 KB, tanpa BEGIN/COMMIT
// (impor remote sudah satu transaksi), foreign key selalu ditegakkan. Maka: INSERT multi-baris
// ≤ 90 KB per statement, tabel induk lebih dulu, node daftar isi dalam urutan DFS (induk dulu).
// Keluarannya deterministik: baris yang sama selalu menghasilkan byte yang sama.
import { corpusTables } from "@surau/db";

import { TABLE_ORDER } from "./rows.ts";
import type { CorpusRows } from "./rows.ts";

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
 * per edisi. `passage_fts` belum diisi (S11); begitu diisi, indeksnya wajib ikut dikosongkan di sini.
 */
export const RESET_SQL = [
  "-- Kosongkan korpus sebelum dimuat ulang (anak lebih dulu). Tabel terjemahan/ringkasan tidak",
  "-- dihapus: bila sudah berisi, foreign key membuat pemuatan ulang GAGAL (sengaja, S13+).",
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

export function emitSql(rows: CorpusRows): SqlFile[] {
  const files: SqlFile[] = [{ name: "0000-reset.sql", content: RESET_SQL }];
  for (const table of TABLE_ORDER) {
    const columns = Object.keys(corpusTables[table].shape);
    const values = (rows[table] as Record<string, Value>[]).map((r) =>
      columns.map((c) => r[c] ?? null),
    );
    const statements = insertStatements(table, columns, values);
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
      files.push({
        name: `${n}-${table.replaceAll("_", "-")}${part}.sql`,
        content: chunk.join(""),
      });
    });
  }
  return files;
}
