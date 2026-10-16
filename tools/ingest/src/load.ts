// Memuat korpus hasil `pnpm ingest ihya` ke D1 (binding CORPUS di packages/db/wrangler.jsonc).
//   node tools/ingest/src/load.ts local     → D1 lokal di <root>/.wrangler/state (ARSITEKTUR §7)
//   node tools/ingest/src/load.ts staging   → surau-corpus-staging (remote; minta izin pemilik dulu)
// Urutan: migrasi korpus, lalu data/build/sql/*.sql satu per satu (tiap file atomik; file pertama
// mengosongkan korpus, jadi pemuatan bisa diulang), lalu smoke query.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "../../..");
const config = "packages/db/wrangler.jsonc";

/** Jalankan wrangler. Keluaran (JSON per statement, panjang) hanya dicetak bila gagal. */
function wrangler(args: string[]): string {
  const r = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    process.stderr.write(`${r.stdout ?? ""}${r.stderr ?? ""}`);
    throw new Error(`wrangler ${args.slice(0, 3).join(" ")} gagal (kode ${String(r.status)})`);
  }
  return r.stdout ?? "";
}

// Satu baris berisi subkueri per tabel (D1 membatasi jumlah suku UNION dalam satu SELECT).
const COUNTED = [
  "author",
  "work",
  "edition",
  "page",
  "toc_node",
  "passage",
  "footnote_ref",
  "passage_needs_review",
] as const;
const SMOKE_COUNTS = `SELECT ${COUNTED.map((t) => `(SELECT count(*) FROM ${t}) AS ${t}`).join(", ")}`;

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

type Row = Record<string, string | number | null>;

function query(target: string[], sql: string): Row[] {
  const out = wrangler([
    "d1",
    "execute",
    "CORPUS",
    ...target,
    "-c",
    config,
    "--json",
    "--command",
    sql,
  ]);
  const parsed = JSON.parse(out) as { results: Row[] }[];
  return parsed.flatMap((r) => r.results);
}

function main(mode: string | undefined): number {
  if (mode !== "local" && mode !== "staging") {
    console.error("Pakai: pnpm corpus:load:local | pnpm corpus:load:staging");
    return 2;
  }
  const target = mode === "local" ? ["--local", "--persist-to", ".wrangler/state"] : ["--remote"];
  const sqlDir = join(repo, "data/build/sql");
  const files = readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0)
    throw new Error("data/build/sql kosong: jalankan `pnpm ingest ihya` dulu");

  wrangler(["d1", "migrations", "apply", "CORPUS", ...target, "-c", config]);
  for (const f of files) {
    console.info(`→ ${f}`);
    wrangler([
      "d1",
      "execute",
      "CORPUS",
      ...target,
      "-c",
      config,
      "--yes",
      "--file",
      join(sqlDir, f),
    ]);
  }

  const counts = query(target, SMOKE_COUNTS)[0] ?? {};
  console.info(`Jumlah baris: ${COUNTED.map((t) => `${t} ${String(counts[t] ?? 0)}`).join(", ")}`);
  const page = query(target, SMOKE_PAGE);
  console.info(
    `j1 h200: ${page.map((r) => `${String(r.kind)} ${String(r.n)}`).join(", ")}, penanda tertaut ${String(page[0]?.refs ?? 0)}`,
  );
  const body = Number(page.find((r) => r.kind === "body")?.n ?? 0);
  const foot = Number(page.find((r) => r.kind === "foot")?.n ?? 0);
  if (body === 0 || foot === 0 || Number(page[0]?.refs ?? 0) === 0) {
    console.error(
      "Smoke GAGAL: j1 h200 tidak punya paragraf badan, catatan kaki, atau penanda tertaut",
    );
    return 1;
  }
  console.info(`Korpus ${mode} siap.`);
  return 0;
}

process.exitCode = main(process.argv[2]);
