// Build korpus dua kitab dari sumber lokal (X31a, ADR-137): Ihya + Bidayat al-Hidayah dalam satu DB.
// Dilewati otomatis bila drive Shamela atau berkas OpenITI tidak ada (CI). Tanpa hasil LLM: yang diuji
// penggabungan baris, ID per edisi, tabel bersama, dan bahwa ID Ihya tidak berubah (sidik teks).
import { copyFileSync, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { beforeAll, describe, expect, it } from "vite-plus/test";

import { fingerprintPath } from "../src/fingerprint.ts";
import { runIngest } from "../src/pipeline.ts";
import type { IngestResult } from "../src/pipeline.ts";
import { QURAN_EXPECT, QURAN_FILES } from "../src/quran/source.ts";
import { BIDAYAH } from "../src/works/bidayah.ts";
import { IHYA } from "../src/works/ihya.ts";
import { CORPUS } from "../src/works/index.ts";

const repo = resolve(import.meta.dirname, "../../..");
const shamela = process.env.SURAU_SHAMELA_ROOT ?? "/Volumes/Elfariesh/database";
const openiti = join(repo, "data/raw/openiti");
const quranRoot = join(repo, "data/raw");
const available =
  existsSync(join(shamela, "book")) &&
  [IHYA, BIDAYAH].every((w) => existsSync(join(openiti, w.openiti.matan.file))) &&
  existsSync(join(quranRoot, "tanzil"));

describe.skipIf(!available)("korpus Ihya + Bidayat al-Hidayah (sumber lokal)", () => {
  let result: IngestResult;
  beforeAll(() => {
    const work = mkdtempSync(join(tmpdir(), "surau-multi-"));
    const files = [
      IHYA.patch,
      IHYA.ayahPatch,
      IHYA.subheadings,
      IHYA.ids,
      fingerprintPath(IHYA.ids),
      BIDAYAH.ids,
      fingerprintPath(BIDAYAH.ids),
    ];
    for (const file of files.filter((f): f is string => f !== undefined)) {
      if (!existsSync(join(repo, file))) continue;
      mkdirSync(dirname(join(work, file)), { recursive: true });
      copyFileSync(join(repo, file), join(work, file));
    }
    const ihya = { ...IHYA, expect: { ...IHYA.expect, llmCoverage: 0, minDigests: 0 } };
    result = runIngest(
      { ...CORPUS, works: [ihya, BIDAYAH] },
      {
        repo: work,
        shamela,
        openiti,
        build: join(work, "build"),
        migrations: join(repo, "packages/db/migrations/corpus"),
        quran: { root: quranRoot, files: QURAN_FILES, expect: QURAN_EXPECT },
      },
      { env: { SOURCE_DATE_EPOCH: "1760000000" } },
    );
  }, 180_000);

  it("lolos semua invarian, termasuk ID Ihya stabil", () => {
    expect(result.validation.invariants.filter((i) => !i.ok)).toEqual([]);
    expect(result.validation.invariants.map((i) => i.name)).toContain(
      "[ihya] ID paragraf rilis stabil (ADR-059)",
    );
    expect(result.works.map((w) => w.config.work.slug)).toEqual(["ihya", "bidayat-al-hidayah"]);
  });

  it("satu DB: dua karya, satu pengarang, tabel Qur'an tidak ganda, ID per edisi", () => {
    const db = new DatabaseSync(result.output?.sqlite ?? "", { readOnly: true });
    try {
      const one = (sql: string) => Object.values(db.prepare(sql).get() ?? {})[0];
      expect(one("SELECT count(*) FROM work")).toBe(2);
      expect(one("SELECT count(*) FROM author")).toBe(1);
      expect(one("SELECT count(*) FROM quran_ayah")).toBe(6236);
      expect(one("SELECT count(*) FROM page WHERE edition_id = 2")).toBe(46);
      expect(one("SELECT count(*) FROM passage WHERE edition_id = 2 AND id / 10000000 != 2")).toBe(
        0,
      );
      expect(one("SELECT value FROM meta WHERE key = 'corpus_version'")).toBe(CORPUS.version);
      expect(String(one("SELECT value FROM meta WHERE key = 'source_hash'"))).toMatch(
        /^ihya=sha256:[0-9a-f]{64};bidayat-al-hidayah=sha256:[0-9a-f]{64}$/,
      );
    } finally {
      db.close();
    }
  });
});
