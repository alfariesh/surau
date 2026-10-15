// Skema Zod harus sama persis dengan hasil migrasi: nama + urutan kolom, dan nullable ↔ NOT NULL.
// Juga memastikan passage_fts terbentuk dengan kolom dan opsi yang benar (tabel virtual FTS5).
import { NORM_VERSION } from "@surau/text";
import { env } from "cloudflare:workers";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { z } from "zod";

import type { D1Db } from "../src/d1.ts";
import { getCorpusMeta } from "../src/repo/corpus.ts";
import { appTables } from "../src/schema/app.ts";
import { CORPUS_SCHEMA_VERSION, corpusTables } from "../src/schema/corpus.ts";

const columnInfo = z.strictObject({
  name: z.string(),
  type: z.string(),
  notnull: z.literal([0, 1]),
  pk: z.number().int(),
});

async function columns(db: D1Db, table: string) {
  const { results } = await db
    .prepare('SELECT name, type, "notnull", pk FROM pragma_table_info(?) ORDER BY cid')
    .bind(table)
    .all();
  return results.map((r) => columnInfo.parse(r));
}

async function strictTables(db: D1Db): Promise<Set<string>> {
  const { results } = await db.prepare("SELECT name, strict FROM pragma_table_list").all();
  return new Set(
    results
      .map((r) => z.object({ name: z.string(), strict: z.number() }).parse(r))
      .filter((r) => r.strict === 1)
      .map((r) => r.name),
  );
}

function checkTables(db: () => D1Db, tables: Record<string, z.ZodObject>) {
  for (const [table, schema] of Object.entries(tables)) {
    test(`${table}: kolom dan nullability sama dengan migrasi`, async () => {
      const cols = await columns(db(), table);
      expect(cols.map((c) => c.name)).toEqual(Object.keys(schema.shape));
      for (const c of cols) {
        const field = schema.shape[c.name];
        // Kolom PRIMARY KEY INTEGER tunggal adalah rowid: notnull=0 di PRAGMA, tetapi tak pernah null.
        const neverNull = c.notnull === 1 || (c.pk > 0 && c.type === "INTEGER");
        expect(field?.safeParse(null).success, `${table}.${c.name} nullable?`).toBe(!neverNull);
        // Tipe SQL ↔ tipe Zod: kolom INTEGER menolak teks, kolom TEXT menolak angka.
        const wrong = c.type === "INTEGER" ? "1" : c.type === "TEXT" ? 1 : undefined;
        expect(wrong, `${table}.${c.name} tipe ${c.type}`).toBeDefined();
        expect(field?.safeParse(wrong).success, `${table}.${c.name} tipe ${c.type}`).toBe(false);
      }
    });
  }

  test("semua tabel biasa STRICT", async () => {
    const strict = await strictTables(db());
    for (const table of Object.keys(tables)) expect(strict.has(table), table).toBe(true);
  });
}

describe("korpus", () => {
  checkTables(() => env.CORPUS, corpusTables);
});
describe("app", () => {
  checkTables(() => env.APP, appTables);
});

describe("passage_fts", () => {
  test("FTS5 contentless dengan kolom body, foot, sbody, sfoot", async () => {
    const row = await env.CORPUS.prepare(
      "SELECT sql FROM sqlite_master WHERE name = 'passage_fts'",
    ).first<{
      sql: string;
    }>();
    expect(row?.sql).toMatch(/USING fts5/i);
    expect(row?.sql).toMatch(/content = ''/);
    expect(row?.sql).toMatch(/contentless_delete = 1/);
    expect(row?.sql).toMatch(/tokenize = 'unicode61 remove_diacritics 0'/);
    const cols = await columns(env.CORPUS, "passage_fts");
    expect(cols.map((c) => c.name)).toEqual(["body", "foot", "sbody", "sfoot"]);
  });

  test("insert, MATCH, dan delete per rowid berjalan (contentless_delete)", async () => {
    const db = env.CORPUS;
    await db
      .prepare("INSERT INTO passage_fts (rowid, body, foot, sbody, sfoot) VALUES (?, ?, '', ?, '')")
      .bind(70_000_001, "الصبر ضياء", "صبر ضياء")
      .run();
    const hit = await db
      .prepare("SELECT rowid FROM passage_fts WHERE passage_fts MATCH ?")
      .bind('sbody : "صبر"')
      .all<{ rowid: number }>();
    expect(hit.results.map((r) => r.rowid)).toEqual([70_000_001]);
    await db.prepare("DELETE FROM passage_fts WHERE rowid = ?").bind(70_000_001).run();
    const after = await db
      .prepare("SELECT count(*) AS n FROM passage_fts WHERE passage_fts MATCH ?")
      .bind('sbody : "صبر"')
      .first<{ n: number }>();
    expect(after?.n).toBe(0);
  });
});

describe("meta", () => {
  test("migrasi mengisi schema_version terbaru", async () => {
    const meta = await getCorpusMeta(env.CORPUS);
    expect(meta.schema_version).toBe(CORPUS_SCHEMA_VERSION);
    expect(meta.norm_version).toBeUndefined();
  });

  test("norm_version yang ditulis ingest = NORM_VERSION @surau/text", async () => {
    onTestFinished(async () => {
      await env.CORPUS.prepare("DELETE FROM meta WHERE key = 'norm_version'").run();
    });
    await env.CORPUS.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('norm_version', ?)")
      .bind(String(NORM_VERSION))
      .run();
    const meta = await getCorpusMeta(env.CORPUS);
    expect(meta.norm_version).toBe(NORM_VERSION);
  });
});
