// Pembaca staging hanya SELECT; SQL pilot membersihkan node basi dalam cakupan.
import type { D1Db, D1Statement } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import type { DigestBuild } from "./digest-attach.ts";
import { pilotSql, selectOnly } from "./digest-staging.ts";

const fake: D1Db = {
  prepare: () => {
    const stmt: D1Statement = {
      bind: () => stmt,
      all: async () => ({ results: [] }),
      first: async () => null,
    };
    return stmt;
  },
  batch: async () => [],
};

describe("selectOnly", () => {
  test("SELECT dan WITH … SELECT boleh; DML, PRAGMA, ATTACH, dan pernyataan ganda ditolak", () => {
    const db = selectOnly(fake);
    expect(() => db.prepare("SELECT key, value FROM meta")).not.toThrow();
    expect(() => db.prepare("WITH x AS (SELECT 1) SELECT * FROM x")).not.toThrow();
    for (const q of [
      "INSERT INTO meta VALUES ('a', 'b')",
      "WITH x AS (SELECT 1) DELETE FROM digest",
      "PRAGMA foreign_keys = OFF",
      "ATTACH DATABASE 'x' AS y",
      "SELECT 1; DROP TABLE digest",
      "  update meta set value = 'x'",
    ]) {
      expect(() => db.prepare(q), q).toThrow(/hanya SELECT/u);
    }
  });
});

describe("pilotSql", () => {
  const empty: DigestBuild = {
    glossary_term: [],
    digest: [],
    digest_point: [],
    digest_anchor: [],
    digest_quote: [],
    digest_question: [],
    digest_term: [],
    fts: [],
    summary: [],
    stats: {
      targets: 0,
      loaded: 0,
      missing: [],
      points: 0,
      quotes: 0,
      passageTranslations: 0,
      quotesWithheld: 0,
      termsWithoutGloss: 0,
      glossary: 0,
      summaryOverrides: 0,
      abstractsKept: [],
    },
    problems: [],
  };
  test("node cakupan tanpa Intisari berlaku: kepala + audio basi dihapus walau build kosong", () => {
    const sql = pilotSql(empty, [100_004, 100_003]);
    expect(sql).toContain(
      "DELETE FROM digest_point WHERE lang = 'id' AND toc_node_id IN (100003, 100004);",
    );
    expect(sql).toContain(
      "DELETE FROM audio_track WHERE lang = 'id' AND toc_node_id IN (100003, 100004);",
    );
    expect(sql).toContain(
      "DELETE FROM digest WHERE lang = 'id' AND toc_node_id IN (100003, 100004);",
    );
    expect(sql).toContain(
      "DELETE FROM digest_point_fts WHERE rowid BETWEEN 10000300 AND 10000399;",
    );
  });
});
