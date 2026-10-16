// Korpus hasil build (`data/build/`) dan binding korpus PRODUKSI di apps/web/wrangler.jsonc.
// Dipakai `load.ts` (lokal/staging) dan `promote.ts` (blue-green produksi, ADR-005).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { COUNTED, applyMigrations, executeFile, repo } from "./d1.ts";
import type { D1Target } from "./d1.ts";
import { openReadOnly } from "./sqlite.ts";

export const BUILD_DIR = join(repo, "data/build");
export const SQL_DIR = join(BUILD_DIR, "sql");

/** sha256 gabungan file SQL (terurut, nama + isi) + .sqlite; sama dengan `<versi>.sha256`. */
export function buildDigest(sqlDir: string, sqlitePath: string): string {
  const hash = createHash("sha256");
  for (const name of readdirSync(sqlDir).sort()) {
    hash
      .update(name)
      .update("\0")
      .update(readFileSync(join(sqlDir, name)));
  }
  hash.update(readFileSync(sqlitePath));
  return hash.digest("hex");
}

export interface BuildInfo {
  version: string;
  sqlite: string;
  hash: string;
  counts: Record<string, number>;
  meta: Record<string, string>;
}

/**
 * Baca hitungan baris dan `meta` dari .sqlite build, lalu pastikan file SQL + .sqlite masih sama
 * dengan sha256 yang ditulis ingest (tidak ada file yang tertinggal dari build lain). Tanpa
 * `version`, build satu-satunya di data/build yang dipakai.
 */
export function buildInfo(version?: string): BuildInfo {
  if (!existsSync(SQL_DIR))
    throw new Error("data/build/sql tidak ada: jalankan `pnpm ingest ihya`");
  const candidates = readdirSync(BUILD_DIR)
    .map((f) => /^surau-corpus-(.+)\.sqlite$/.exec(f)?.[1])
    .filter((v): v is string => v !== undefined);
  const v = version ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (v === undefined || !candidates.includes(v)) {
    throw new Error(
      `Build korpus ${version ?? ""} tidak ditemukan di data/build (ada: ${candidates.join(", ") || "–"}). Jalankan \`pnpm ingest ihya\`.`,
    );
  }
  const sqlite = join(BUILD_DIR, `surau-corpus-${v}.sqlite`);
  const hashFile = join(BUILD_DIR, `${v}.sha256`);
  const hash = buildDigest(SQL_DIR, sqlite);
  const recorded = existsSync(hashFile) ? readFileSync(hashFile, "utf8").trim() : "";
  if (hash !== recorded) {
    throw new Error(
      `data/build tidak konsisten: sha256 ${hash} ≠ ${recorded || "(tidak ada)"} di ${v}.sha256. Bangun ulang dengan \`pnpm ingest ihya\`.`,
    );
  }
  const db = openReadOnly(sqlite);
  try {
    const counts = Object.fromEntries(
      COUNTED.map((t) => [t, Number(db.prepare(`SELECT count(*) AS n FROM ${t}`).get()?.n ?? 0)]),
    );
    const meta = Object.fromEntries(
      db
        .prepare("SELECT key, value FROM meta")
        .all()
        .map((r) => [String(r.key), String(r.value)]),
    );
    if (meta.corpus_version !== v) {
      throw new Error(`${sqlite}: meta.corpus_version = ${meta.corpus_version ?? "–"}, bukan ${v}`);
    }
    return { version: v, sqlite, hash, counts, meta };
  } finally {
    db.close();
  }
}

/** Migrasi korpus lalu muat data/build/sql/*.sql satu per satu (file pertama = reset korpus). */
export function loadBuild(target: D1Target, log: (line: string) => void = console.info): void {
  const files = readdirSync(SQL_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) throw new Error("data/build/sql kosong: jalankan `pnpm ingest ihya`");
  applyMigrations(target);
  for (const f of files) {
    log(`→ ${f}`);
    executeFile(target, join(SQL_DIR, f));
  }
}

// --- Binding korpus produksi (apps/web/wrangler.jsonc) ---------------------------------------

export interface CorpusBinding {
  name: string;
  id: string;
}

// Entri CORPUS_DB top-level (produksi). Blok `previews` (staging) sengaja tidak tersentuh: pola
// hanya dicari di teks SEBELUM `"previews"`.
const PROD_ENTRY =
  /("binding": "CORPUS_DB",\s*"database_name": ")([^"]+)(",\s*"database_id": ")([^"]+)(")/g;

function splitTopLevel(jsonc: string): [string, string] {
  const at = jsonc.indexOf('"previews"');
  if (at < 0) throw new Error(`${"apps/web/wrangler.jsonc"}: blok "previews" tidak ditemukan`);
  return [jsonc.slice(0, at), jsonc.slice(at)];
}

/** Nama dan ID DB korpus yang sekarang dipakai produksi. */
export function readProductionCorpus(jsonc: string): CorpusBinding {
  const [head] = splitTopLevel(jsonc);
  const matches = [...head.matchAll(PROD_ENTRY)];
  if (matches.length !== 1) {
    throw new Error(
      `apps/web/wrangler.jsonc: harus ada tepat satu CORPUS_DB top-level (ditemukan ${matches.length})`,
    );
  }
  const m = matches[0] as RegExpMatchArray;
  return { name: m[2] as string, id: m[4] as string };
}

/** Ganti nama + ID DB korpus produksi; komentar, `preview_database_id`, dan `previews` tetap. */
export function setProductionCorpus(jsonc: string, next: CorpusBinding): string {
  readProductionCorpus(jsonc);
  const [head, tail] = splitTopLevel(jsonc);
  return (
    head.replace(PROD_ENTRY, (_m, a: string, _n, b: string, _i, c: string) =>
      [a, next.name, b, next.id, c].join(""),
    ) + tail
  );
}
