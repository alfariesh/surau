// Tes integrasi pipeline terhadap Ihya Shamela 9472 (drive pemilik, hanya-baca) dan OpenITI yang
// dipin (data/raw/openiti). Dilewati otomatis bila salah satunya tidak ada (CI). Keluaran ditulis ke
// folder sementara, bukan ke repo; teks kitab tidak disalin ke git (hanya diperiksa).
import { copyFileSync, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { findQuote, normalizeArabic } from "@surau/text";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { runIngest } from "../src/pipeline.ts";
import type { IngestResult, PipelinePaths } from "../src/pipeline.ts";
import { QURAN_EXPECT, QURAN_FILES } from "../src/quran/source.ts";
import { IHYA } from "../src/works/ihya.ts";

const repo = resolve(import.meta.dirname, "../../..");
const shamela = process.env.SURAU_SHAMELA_ROOT ?? "/Volumes/Elfariesh/database";
const openiti = join(repo, "data/raw/openiti");
const quranRoot = join(repo, "data/raw");
const available =
  existsSync(join(shamela, "book/472/9472.db")) &&
  existsSync(join(openiti, IHYA.openiti.matan.file)) &&
  Object.values(QURAN_FILES).every((f) => existsSync(join(quranRoot, f.path)));

describe.skipIf(!available)("ingest Ihya 9472 (sumber lokal)", () => {
  let result: IngestResult;
  let paths: PipelinePaths;
  beforeAll(() => {
    const work = mkdtempSync(join(tmpdir(), "surau-ihya-"));
    // Patch dan peta ID yang di-commit disalin, supaya ID hasil tes sama dengan build sungguhan.
    for (const file of [IHYA.patch, IHYA.ids]) {
      mkdirSync(dirname(join(work, file)), { recursive: true });
      copyFileSync(join(repo, file), join(work, file));
    }
    paths = {
      repo: work,
      shamela,
      openiti,
      build: join(work, "build"),
      migrations: join(repo, "packages/db/migrations/corpus"),
      quran: { root: quranRoot, files: QURAN_FILES, expect: QURAN_EXPECT },
    };
    // Tes struktur korpus: tanpa hasil LLM (dimuat dan diuji terpisah, test/llm-attach.test.ts).
    const config = { ...IHYA, expect: { ...IHYA.expect, llmCoverage: 0 } };
    result = runIngest(config, paths, { env: { SOURCE_DATE_EPOCH: "1760000000" } });
  });

  test("semua invarian lolos: 1.706 halaman, 4 rub' × 10 kitab, gerbang OpenITI", () => {
    expect(result.validation.invariants.filter((i) => !i.ok)).toEqual([]);
    expect(result.output?.counts).toMatchObject({ page: 1706, toc_node: 313 });
    expect(result.output?.idsAdded).toEqual({ page: 0, toc: 0, passage: 0 });
  });

  test("j1 h200: paragraf badan, catatan kaki takhrij 'باطل لا أصل له', penanda tertaut", () => {
    const db = new DatabaseSync(result.output?.sqlite ?? "", { readOnly: true });
    const rows = db
      .prepare(
        `SELECT p.kind, p.text_raw FROM passage p JOIN page g ON g.id = p.page_id
         WHERE g.juz = 1 AND g.page_no = 200 ORDER BY p.kind, p.ord`,
      )
      .all() as { kind: string; text_raw: string }[];
    const refs = db
      .prepare(
        `SELECT count(*) AS n FROM footnote_ref r JOIN passage b ON b.id = r.passage_id
         JOIN page g ON g.id = b.page_id WHERE g.juz = 1 AND g.page_no = 200`,
      )
      .get() as { n: number };
    db.close();
    expect(rows.filter((r) => r.kind === "body").length).toBeGreaterThan(0);
    const foot = rows.filter((r) => r.kind === "foot");
    expect(foot.some((r) => findQuote(r.text_raw, "باطل لا أصل له") !== null)).toBe(true);
    expect(refs.n).toBeGreaterThan(0);
  });

  test("ayat (S12): gerbang exact ≥95%, dan setiap kutipan exact benar-benar ada di ayat rujukannya", () => {
    expect(result.ayat.exactRatio).toBeGreaterThanOrEqual(0.95);
    const db = new DatabaseSync(result.output?.sqlite ?? "", { readOnly: true });
    const refs = db
      .prepare(
        `SELECT r.surah, r.ayah_from, r.ayah_to, r.match, r.partial, p.text_raw, r.char_start, r.char_end,
           (SELECT group_concat(a.text_index, ' ') FROM (SELECT text_index FROM quran_ayah
              WHERE surah = r.surah AND ayah BETWEEN r.ayah_from AND r.ayah_to ORDER BY ayah) a) AS ayat
         FROM passage_ayah_ref r JOIN passage p ON p.id = r.passage_id`,
      )
      .all() as {
      match: string;
      partial: number;
      text_raw: string;
      char_start: number;
      char_end: number;
      ayat: string;
    }[];
    db.close();
    expect(refs.length).toBeGreaterThan(1500);
    const norm = (t: string) => ` ${normalizeArabic(t).text} `;
    const bad = refs.filter((r) => {
      if (r.match !== "exact") return false;
      const quote = norm(r.text_raw.slice(r.char_start, r.char_end));
      const ayat = norm(r.ayat);
      return r.partial === 1 ? !ayat.includes(quote) : ayat !== quote;
    });
    expect(bad).toEqual([]);
  });
});
