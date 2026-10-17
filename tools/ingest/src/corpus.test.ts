import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import {
  isProtected,
  readProductionCorpus,
  readSearchCacheCorpus,
  recordedCorpora,
  setProductionCorpus,
  stagingCorpus,
} from "./corpus.ts";
import { WEB_CONFIG, repo } from "./d1.ts";

const STAGING_ID = "ffc5ce9a-2b5a-4d09-8487-922ff0e67827";

const SAMPLE = `{
  "vars": { "SEARCH_CACHE_CORPUS": "surau-corpus-staging" },
  "d1_databases": [
    {
      "binding": "CORPUS_DB",
      "database_name": "surau-corpus-staging",
      "database_id": "${STAGING_ID}",
      // komentar tetap
      "preview_database_id": "${STAGING_ID}",
    },
    { "binding": "APP_DB", "database_name": "surau-app", "database_id": "app-id" },
  ],
  "previews": {
    "vars": { "SEARCH_CACHE_CORPUS": "" },
    "d1_databases": [
      {
        "binding": "CORPUS_DB",
        "database_name": "surau-corpus-staging",
        "database_id": "${STAGING_ID}",
      },
    ],
  },
}`;

describe("binding korpus produksi", () => {
  test("membaca dan mengganti hanya CORPUS_DB top-level; previews + preview_database_id tetap", () => {
    expect(readProductionCorpus(SAMPLE)).toEqual({ name: "surau-corpus-staging", id: STAGING_ID });
    const next = setProductionCorpus(SAMPLE, { name: "surau-corpus-ihya-v1", id: "new-id" });
    expect(readProductionCorpus(next)).toEqual({ name: "surau-corpus-ihya-v1", id: "new-id" });
    // Versi korpus kunci cache pencarian ikut berganti (S14).
    expect(readSearchCacheCorpus(next)).toBe("surau-corpus-ihya-v1");
    // Hanya tiga nilai yang berubah; sisanya (komentar, ID lokal, blok previews) identik.
    expect(
      next.replaceAll("surau-corpus-ihya-v1", "surau-corpus-staging").replace("new-id", STAGING_ID),
    ).toBe(SAMPLE);
    expect(next.slice(next.indexOf('"previews"'))).toBe(SAMPLE.slice(SAMPLE.indexOf('"previews"')));
  });

  test("menolak config tanpa blok previews atau dengan CORPUS_DB top-level ganda/tidak ada", () => {
    expect(() => readProductionCorpus('{ "d1_databases": [] }')).toThrow(/previews/);
    expect(() => readProductionCorpus('{ "d1_databases": [], "previews": {} }')).toThrow(
      /tepat satu/,
    );
    const dup = SAMPLE.replace(
      '"d1_databases": [',
      '"d1_databases": [ { "binding": "CORPUS_DB", "database_name": "x", "database_id": "y" },',
    );
    expect(() => readProductionCorpus(dup)).toThrow(/tepat satu/);
  });

  test("SEARCH_CACHE_CORPUS wajib tepat satu di top-level", () => {
    expect(() =>
      setProductionCorpus(
        SAMPLE.replace('"SEARCH_CACHE_CORPUS": "surau-corpus-staging"', '"X": ""'),
        { name: "a", id: "b" },
      ),
    ).toThrow(/SEARCH_CACHE_CORPUS/);
  });

  test("apps/web/wrangler.jsonc: produksi punya ID eksplisit, lokal + Preview tetap korpus staging", () => {
    const text = readFileSync(join(repo, WEB_CONFIG), "utf8");
    const prod = readProductionCorpus(text);
    // Kunci cache pencarian = korpus produksi yang sedang dipakai (S14, ADR-044).
    expect(readSearchCacheCorpus(text)).toBe(prod.name);
    expect(prod.name).toMatch(/^surau-corpus-/);
    expect(prod.id).toMatch(/^[0-9a-f-]{36}$/);
    const head = text.slice(0, text.indexOf('"previews"'));
    expect(head).toContain(`"preview_database_id": "${STAGING_ID}"`);
    const previews = text.slice(text.indexOf('"previews"'));
    expect(previews).toMatch(
      new RegExp(
        `"binding": "CORPUS_DB",\\s*"database_name": "surau-corpus-staging",\\s*"database_id": "${STAGING_ID}"`,
      ),
    );
  });
});

describe("pengaman korpus produksi", () => {
  test("korpus staging tidak pernah menjadi produksi (staging dimuat ulang tiap sesi)", () => {
    const prod = readProductionCorpus(readFileSync(join(repo, WEB_CONFIG), "utf8"));
    const staging = stagingCorpus();
    expect(staging.id).toBe(STAGING_ID);
    expect(prod.name).not.toBe(staging.name);
    expect(prod.id).not.toBe(staging.id);
  });

  test("data/SOURCES.md mencatat binding produksi sebagai korpus terlindung, tanpa staging", () => {
    const sources = readFileSync(join(repo, "data/SOURCES.md"), "utf8");
    const recorded = recordedCorpora(sources);
    const prod = readProductionCorpus(readFileSync(join(repo, WEB_CONFIG), "utf8"));
    expect(recorded).toContainEqual(prod);
    expect(recorded.map((r) => r.id)).not.toContain(STAGING_ID);
  });

  test("recordedCorpora hanya membaca baris tabel di bagian Korpus D1 produksi", () => {
    const md = [
      "## Lain",
      "| `surau-corpus-x-v9` | `00000000-0000-0000-0000-000000000009` |",
      "## Korpus D1 produksi",
      "Catatan `surau-corpus-staging` `ffc5ce9a-2b5a-4d09-8487-922ff0e67827` bukan baris tabel.",
      "| Versi | DB | ID |",
      "|---|---|---|",
      "| `ihya-v1` | `surau-corpus-ihya-v1` | `41e3033e-3aa0-456c-9d60-b8967f57e89d` |",
      "## Sesudahnya",
      "| `surau-corpus-y-v1` | `00000000-0000-0000-0000-000000000001` |",
    ].join("\n");
    const recorded = recordedCorpora(md);
    expect(recorded).toEqual([
      { name: "surau-corpus-ihya-v1", id: "41e3033e-3aa0-456c-9d60-b8967f57e89d" },
    ]);
    const guard = { all: recorded, production: [], notes: [] };
    expect(isProtected(guard, { name: "surau-corpus-ihya-v1", id: "lain" })).toBe(true);
    expect(isProtected(guard, { name: "lain", id: "41e3033e-3aa0-456c-9d60-b8967f57e89d" })).toBe(
      true,
    );
    expect(isProtected(guard, { name: "surau-corpus-ihya-v2", id: "baru" })).toBe(false);
  });
});

describe("deploy otomatis tidak pernah menyentuh korpus (ARSITEKTUR-TEKNIS §7 aturan 4)", () => {
  const yml = readFileSync(join(repo, ".github/workflows/deploy.yml"), "utf8");
  const scripts = (
    JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    }
  ).scripts;
  const commands = yml.split("\n").filter((l) => !/^\s*#/.test(l));

  test("tidak ada baris deploy.yml (selain komentar) yang menyebut korpus", () => {
    expect(commands.filter((l) => /corpus/i.test(l))).toEqual([]);
  });

  test("setiap skrip pnpm yang dipanggil deploy.yml tidak menyentuh korpus; skrip D1 hanya APP", () => {
    const called = [...commands.join("\n").matchAll(/pnpm run ([\w:-]+)/g)].map(
      (m) => m[1] as string,
    );
    expect(called).toContain("db:migrate:remote");
    const bodies = called.map((name) => `${name}: ${scripts[name] ?? ""}`);
    expect(bodies.filter((b) => /corpus/i.test(b))).toEqual([]);
    // Skrip yang memanggil `wrangler d1` hanya boleh menyasar binding APP.
    expect(bodies.filter((b) => /\bd1\b/.test(b) && !/\bAPP\b/.test(b))).toEqual([]);
  });
});
