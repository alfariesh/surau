// Membangun `data/build/<korpus>.sqlite` dengan migrasi D1 yang SAMA (packages/db/migrations/corpus)
// lalu file SQL hasil ingest, lewat node:sqlite (SQLite 3.53 dengan FTS5). Ini sekaligus uji muat:
// CHECK, STRICT, dan foreign key ditegakkan seperti di D1. Hasilnya untuk inspeksi lokal dan cikal
// bakal dump terbuka; isinya byte-identik untuk masukan yang sama (diuji di S07).
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import type { SqlFile } from "./sql.ts";
import { assertWritable, openWritable } from "./sqlite.ts";

export interface SqliteBuild {
  /** Jumlah baris per tabel korpus. */
  counts: Record<string, number>;
}

export function buildSqlite(
  outPath: string,
  migrationsDir: string,
  files: readonly SqlFile[],
  tables: readonly string[],
): SqliteBuild {
  assertWritable(outPath);
  for (const suffix of ["", "-journal", "-wal", "-shm"])
    rmSync(`${outPath}${suffix}`, { force: true });
  const db = openWritable(outPath);
  try {
    const migrations = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const m of migrations) db.exec(readFileSync(join(migrationsDir, m), "utf8"));
    db.exec("BEGIN");
    try {
      for (const f of files) db.exec(f.content);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    const fk = db.prepare("PRAGMA foreign_key_check").all();
    if (fk.length > 0) throw new Error(`foreign key rusak: ${JSON.stringify(fk.slice(0, 5))}`);
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
    if (integrity.integrity_check !== "ok")
      throw new Error(`integrity_check: ${JSON.stringify(integrity)}`);
    db.exec("VACUUM");
    const counts = Object.fromEntries(
      tables.map((t) => [
        t,
        (db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n,
      ]),
    );
    return { counts };
  } finally {
    db.close();
    if (existsSync(`${outPath}-journal`)) rmSync(`${outPath}-journal`);
  }
}
