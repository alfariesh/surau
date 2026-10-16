import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { readProductionCorpus, setProductionCorpus } from "./corpus.ts";
import { WEB_CONFIG, repo } from "./d1.ts";

const STAGING_ID = "ffc5ce9a-2b5a-4d09-8487-922ff0e67827";

const SAMPLE = `{
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
    // Hanya dua nilai yang berubah; sisanya (komentar, ID lokal, blok previews) identik.
    expect(
      next.replace("surau-corpus-ihya-v1", "surau-corpus-staging").replace("new-id", STAGING_ID),
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

  test("apps/web/wrangler.jsonc: produksi punya ID eksplisit, lokal + Preview tetap korpus staging", () => {
    const text = readFileSync(join(repo, WEB_CONFIG), "utf8");
    const prod = readProductionCorpus(text);
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

describe("deploy otomatis tidak pernah menyentuh korpus (ARSITEKTUR-TEKNIS §7 aturan 4)", () => {
  test("deploy.yml hanya memigrasi DB app", () => {
    const yml = readFileSync(join(repo, ".github/workflows/deploy.yml"), "utf8");
    const commands = yml.split("\n").filter((l) => /d1|corpus|ingest/i.test(l) && !/^\s*#/.test(l));
    for (const line of commands) {
      expect(line).not.toMatch(/CORPUS|corpus:|ingest/);
    }
  });
});
