import { describe, expect, test } from "vite-plus/test";

import { MAX_STATEMENT_BYTES, RESET_SQL, emitSql, insertStatements, sqlLiteral } from "./sql.ts";
import type { CorpusRows } from "./rows.ts";

describe("sqlLiteral", () => {
  test("teks dikutip dengan '' untuk kutip tunggal; angka dan NULL apa adanya", () => {
    expect(sqlLiteral("قال 'نعم'")).toBe("'قال ''نعم'''");
    expect(sqlLiteral(42)).toBe("42");
    expect(sqlLiteral(null)).toBe("NULL");
  });

  test("menolak NUL dan bilangan bukan bulat", () => {
    expect(() => sqlLiteral("a\u0000b")).toThrow(/NUL/);
    expect(() => sqlLiteral(1.5)).toThrow(/bulat/);
  });
});

describe("insertStatements", () => {
  test("dipecah supaya setiap statement ≤ batas byte", () => {
    const rows = Array.from({ length: 3000 }, (_, i) => [
      i + 1,
      "نص عربي طويل نسبيا للتجربة ".repeat(3),
    ]);
    const statements = insertStatements("t", ["id", "text"], rows);
    expect(statements.length).toBeGreaterThan(1);
    for (const st of statements) {
      expect(Buffer.byteLength(st, "utf8")).toBeLessThanOrEqual(MAX_STATEMENT_BYTES);
      expect(st.startsWith("INSERT INTO t (id, text) VALUES\n")).toBe(true);
    }
    expect(statements.join("").match(/\(\d+, '/g)).toHaveLength(3000);
  });

  test("satu baris melebihi batas → error; tanpa baris → tanpa statement", () => {
    expect(() => insertStatements("t", ["x"], [["ا".repeat(MAX_STATEMENT_BYTES)]])).toThrow(
      /melebihi/,
    );
    expect(insertStatements("t", ["x"], [])).toEqual([]);
  });
});

describe("emitSql", () => {
  const empty: CorpusRows = {
    author: [],
    work: [],
    edition: [],
    page: [],
    toc_node: [],
    passage: [],
    footnote_ref: [],
    passage_needs_review: [],
    quran_source: [],
    quran_surah: [],
    quran_ayah: [],
    quran_translation: [],
    passage_ayah_ref: [],
    translation: [],
    summary: [],
    term_stat: [],
    meta: [{ key: "corpus_version", value: "uji" }],
  };

  test("file pertama mengosongkan korpus (anak dulu, schema_version tetap); tabel kosong dilewati", () => {
    const files = emitSql(empty);
    expect(files.map((f) => f.name)).toEqual(["0000-reset.sql", "0001-meta.sql"]);
    expect(RESET_SQL.indexOf("DELETE FROM passage_needs_review")).toBeLessThan(
      RESET_SQL.indexOf("DELETE FROM passage;"),
    );
    // Rujukan ayat (anak passage dan quran_ayah) dihapus sebelum induknya.
    expect(RESET_SQL.indexOf("DELETE FROM passage_ayah_ref")).toBeLessThan(
      RESET_SQL.indexOf("DELETE FROM quran_ayah;"),
    );
    expect(RESET_SQL.indexOf("DELETE FROM passage_ayah_ref")).toBeLessThan(
      RESET_SQL.indexOf("DELETE FROM passage;"),
    );
    expect(RESET_SQL).toContain("DELETE FROM meta WHERE key <> 'schema_version';");
    expect(files[1]?.content).toBe(
      "INSERT INTO meta (key, value) VALUES\n('corpus_version', 'uji');\n",
    );
  });

  test("reset mengosongkan indeks FTS (delete-all) dan term_stat", () => {
    expect(RESET_SQL).toContain("INSERT INTO passage_fts (passage_fts) VALUES ('delete-all');");
    expect(RESET_SQL).toContain("DELETE FROM term_stat;");
  });

  test("indeks FTS + optimize dimuat tepat sebelum meta (meta tetap file terakhir)", () => {
    const fts = [{ rowid: 10_000_001, body: "", foot: "", sbody: "صبر ضياء", sfoot: "" }];
    const files = emitSql(empty, fts);
    expect(files.map((f) => f.name)).toEqual([
      "0000-reset.sql",
      "0001-passage-fts.sql",
      "0002-passage-fts-optimize.sql",
      "0003-meta.sql",
    ]);
    expect(files[1]?.content).toBe(
      "INSERT INTO passage_fts (rowid, body, foot, sbody, sfoot) VALUES\n(10000001, '', '', 'صبر ضياء', '');\n",
    );
    expect(files[2]?.content).toBe("INSERT INTO passage_fts (passage_fts) VALUES ('optimize');\n");
  });
});
