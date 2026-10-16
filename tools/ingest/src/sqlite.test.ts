import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { openReadOnly, openWritable } from "./sqlite.ts";

describe("akses SQLite", () => {
  test("menolak menulis di bawah /Volumes; DB hanya-baca tidak bisa ditulis", () => {
    expect(() => openWritable("/Volumes/Elfariesh/database/x.sqlite")).toThrow(
      /hanya boleh dibaca/,
    );
    const path = join(mkdtempSync(join(tmpdir(), "surau-sqlite-")), "a.sqlite");
    const w = openWritable(path);
    w.exec("CREATE TABLE t (x)");
    w.close();
    const r = openReadOnly(path);
    expect(() => r.exec("INSERT INTO t VALUES (1)")).toThrow(/readonly/);
    r.close();
    expect(() => openReadOnly(join(tmpdir(), "tidak-ada-sama-sekali.db"))).toThrow(
      /unable to open/,
    );
  });
});
