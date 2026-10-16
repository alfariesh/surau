// Korpus hasil build (`data/build/`) dan binding korpus PRODUKSI di apps/web/wrangler.jsonc.
// Dipakai `load.ts` (lokal/staging) dan `promote.ts` (blue-green produksi, ADR-005).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { COUNTED, DB_CONFIG, WEB_CONFIG, applyMigrations, executeFile, repo } from "./d1.ts";
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

/** Korpus staging = binding CORPUS top-level di packages/db/wrangler.jsonc (juga ID D1 lokal). */
export function stagingCorpus(jsonc = readFileSync(join(repo, DB_CONFIG), "utf8")): CorpusBinding {
  const m = /"binding": "CORPUS",\s*"database_name": "([^"]+)",\s*"database_id": "([^"]+)"/.exec(
    jsonc,
  );
  if (m === null) throw new Error(`${DB_CONFIG}: binding CORPUS top-level tidak ditemukan`);
  return { name: m[1] as string, id: m[2] as string };
}

/** Nama + ID DB korpus di tabel "Korpus D1 produksi" data/SOURCES.md (aktif dan rollback). */
export function recordedCorpora(markdown: string): CorpusBinding[] {
  const start = markdown.indexOf("## Korpus D1 produksi");
  if (start < 0) return [];
  const next = markdown.indexOf("\n## ", start + 1);
  const section = markdown.slice(start, next < 0 ? undefined : next);
  const out: CorpusBinding[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    const name = /`(surau-corpus-[a-z0-9-]+)`/.exec(line)?.[1];
    const id = /`([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`/.exec(line)?.[1];
    if (name !== undefined && id !== undefined) out.push({ name, id });
  }
  return out;
}

export interface ProtectedCorpora {
  /** DB yang tidak boleh dikosongkan atau dimuat ulang (nama + ID). */
  all: CorpusBinding[];
  /** Binding produksi di working tree dan di `origin/main` (yang di-deploy `deploy.yml`). */
  production: CorpusBinding[];
  /** Peringatan, mis. `git fetch` gagal sehingga `origin/main` mungkin usang. */
  notes: string[];
}

/**
 * DB korpus yang sedang atau pernah melayani produksi: binding `CORPUS_DB` di working tree DAN di
 * `origin/main` (setelah `git fetch`; rollback yang belum di-merge tetap terlindungi), ditambah
 * semua DB yang tercatat di data/SOURCES.md. Dipakai `promote` dan `load` sebelum menimpa DB remote.
 */
export function protectedCorpora(opts: { fetch?: boolean } = {}): ProtectedCorpora {
  const notes: string[] = [];
  const production = [readProductionCorpus(readFileSync(join(repo, WEB_CONFIG), "utf8"))];
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (opts.fetch !== false) {
    try {
      git(["fetch", "--quiet", "origin", "main"]);
    } catch {
      notes.push("git fetch origin main gagal: origin/main lokal mungkin usang");
    }
  }
  try {
    production.push(readProductionCorpus(git(["show", `origin/main:${WEB_CONFIG}`])));
  } catch {
    notes.push(`origin/main:${WEB_CONFIG} tidak terbaca: hanya working tree yang diperiksa`);
  }
  const sources = join(repo, "data/SOURCES.md");
  const recorded = existsSync(sources) ? recordedCorpora(readFileSync(sources, "utf8")) : [];
  return { all: [...production, ...recorded], production, notes };
}

export function isProtected(p: ProtectedCorpora, db: CorpusBinding): boolean {
  return p.all.some((x) => x.name === db.name || x.id === db.id);
}
