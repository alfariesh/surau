// Adaptor `D1Db` (tipe struktural @surau/db, ADR-029) di atas `node:sqlite`: fungsi baca core yang
// sama dengan situs (`readDigest`, `loadDigestScript`) bisa dijalankan atas .sqlite hasil build,
// tanpa wrangler. Parameter `?`/`?N` diikat berurutan seperti D1.
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import type { D1Db, D1Statement, D1Value } from "@surau/db";

const input = (v: D1Value): SQLInputValue => (v instanceof ArrayBuffer ? new Uint8Array(v) : v);

export function sqliteD1(db: DatabaseSync): D1Db {
  const statement = (query: string, values: readonly D1Value[]): D1Statement => ({
    bind: (...next) => statement(query, next),
    all: async () => ({ results: db.prepare(query).all(...values.map(input)) }),
    first: async () => db.prepare(query).get(...values.map(input)) ?? null,
  });
  return {
    prepare: (query) => statement(query, []),
    batch: async (statements) => Promise.all(statements.map((s) => s.all())),
  };
}
