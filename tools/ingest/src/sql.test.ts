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
    meta: [{ key: "corpus_version", value: "uji" }],
  };

  test("file pertama mengosongkan korpus (anak dulu, schema_version tetap); tabel kosong dilewati", () => {
    const files = emitSql(empty);
    expect(files.map((f) => f.name)).toEqual(["0000-reset.sql", "0001-meta.sql"]);
    expect(RESET_SQL.indexOf("DELETE FROM passage_needs_review")).toBeLessThan(
      RESET_SQL.indexOf("DELETE FROM passage;"),
    );
    expect(RESET_SQL).toContain("DELETE FROM meta WHERE key <> 'schema_version';");
    expect(files[1]?.content).toBe(
      "INSERT INTO meta (key, value) VALUES\n('corpus_version', 'uji');\n",
    );
  });
});
