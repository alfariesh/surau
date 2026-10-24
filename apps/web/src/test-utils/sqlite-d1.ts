// D1 tiruan di atas `node:sqlite` (Node 24, FTS5 ada) untuk tes integrasi web di project "node"
// (X08): migrasi repo diterapkan apa adanya, jadi CHECK STRICT, indeks unik parsial, dan JSON SQLite
// sama dengan D1. Hanya untuk tes; `batch` = satu transaksi seperti D1.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { D1Db, D1Result, D1Statement, D1Value } from "@surau/db";

const MIGRATIONS = join(import.meta.dirname, "../../../../packages/db/migrations");

export function migratedDb(kind: "corpus" | "app"): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  const dir = join(MIGRATIONS, kind);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(join(dir, file), "utf8"));
  return db;
}

export function sqliteD1(db: DatabaseSync): D1Db {
  const exec = (sql: string, values: readonly D1Value[]): D1Result => {
    const stmt = db.prepare(sql);
    const args = values.map((v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : v));
    if (stmt.columns().length > 0)
      return { results: stmt.all(...args).map((r) => ({ ...r })), meta: { changes: 0 } };
    const r = stmt.run(...args);
    return {
      results: [],
      meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) },
    };
  };
  const statement = (
    sql: string,
    values: readonly D1Value[] = [],
  ): D1Statement & {
    run: () => D1Result;
  } => ({
    bind: (...v) => statement(sql, v),
    all: async () => exec(sql, values),
    first: async () => exec(sql, values).results[0] ?? null,
    run: () => exec(sql, values),
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (stmts) => {
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => (s as ReturnType<typeof statement>).run());
        db.exec("COMMIT");
        return out;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
