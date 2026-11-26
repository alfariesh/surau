// Korpus banyak kitab dari fixture buatan (X31a, ADR-137): jalan di CI, tanpa drive Shamela.
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vite-plus/test";

import { runIngest } from "../src/pipeline.ts";
import type { CorpusConfig } from "../src/works/config.ts";
import { createFixture } from "./fixture.ts";

const env = { SOURCE_DATE_EPOCH: "1760000000" };

describe("runIngest dua kitab (fixture buatan)", () => {
  test("satu DB: dua karya, satu pengarang, tabel Qur'an sekali, meta korpus", () => {
    const { paths, config, second } = createFixture();
    const corpus: CorpusConfig = {
      version: "uji-v2",
      output: "uji.sqlite",
      works: [config, second],
    };
    const r = runIngest(corpus, paths, { env });
    expect(r.validation.invariants.filter((i) => !i.ok)).toEqual([]);
    expect(r.validation.invariants.map((i) => i.name)).toContain(
      "[uji-dua] Matan = OpenITI (≥0,95 per halaman)",
    );
    const db = new DatabaseSync(r.output?.sqlite ?? "", { readOnly: true });
    try {
      const one = (sql: string) => Object.values(db.prepare(sql).get() ?? {})[0];
      expect(one("SELECT count(*) FROM work")).toBe(2);
      expect(one("SELECT count(*) FROM author")).toBe(1);
      expect(one("SELECT count(*) FROM page WHERE edition_id = 8 AND juz = 1")).toBe(2);
      expect(one("SELECT count(*) FROM passage WHERE edition_id = 8 AND id / 10000000 != 8")).toBe(
        0,
      );
      expect(one("SELECT count(*) FROM quran_surah")).toBe(
        one("SELECT count(DISTINCT surah) FROM quran_ayah"),
      );
      expect(one("SELECT value FROM meta WHERE key = 'corpus_version'")).toBe("uji-v2");
      expect(String(one("SELECT value FROM meta WHERE key = 'source_hash'"))).toMatch(
        /^uji=sha256:[0-9a-f]{64};uji-dua=sha256:[0-9a-f]{64}$/,
      );
      // Tanpa versi pembanding takhrij: tidak ada tanda takhrij_unmatched di kitab kedua.
      expect(
        one(
          "SELECT count(*) FROM passage_needs_review r JOIN passage p ON p.id = r.passage_id WHERE p.edition_id = 8",
        ),
      ).toBe(0);
    } finally {
      db.close();
    }
  });

  test("ID/slug ganda antar kitab = gagal tanpa keluaran", () => {
    const { paths, config, second } = createFixture();
    const clash = { ...second, edition: { ...second.edition, id: config.edition.id } };
    const r = runIngest(
      { version: "uji-v2", output: "uji.sqlite", works: [config, clash] },
      paths,
      {
        env,
      },
    );
    expect(r.output).toBeUndefined();
    const failed = r.validation.invariants.filter((i) => !i.ok).map((i) => i.detail);
    expect(failed.join(" ")).toMatch(/edition\.id 7/);
  });

  test("ID diterima di luar edisi mana pun = galat (tidak diam-diam diabaikan)", () => {
    const { paths, config, second } = createFixture();
    const corpus = { version: "uji-v2", output: "uji.sqlite", works: [config, second] };
    expect(() => runIngest(corpus, paths, { env, acceptTextChanges: [99 * 1e7 + 1] })).toThrow(
      /bukan milik edisi mana pun/,
    );
  });
});

describe("gerbang batas bawah Intisari (ADR-137)", () => {
  test("minDigests > Intisari termuat = gagal", () => {
    const { paths, second } = createFixture();
    const strict = { ...second, expect: { ...second.expect, minDigests: 1 } };
    const r = runIngest({ version: "uji-v2", output: "uji.sqlite", works: [strict] }, paths, {
      env,
    });
    expect(r.output).toBeUndefined();
    expect(r.validation.invariants.filter((i) => !i.ok).map((i) => i.name)).toEqual([
      "Intisari termuat ≥ 1 (tidak berkurang dari korpus tayang)",
    ]);
  });
});
