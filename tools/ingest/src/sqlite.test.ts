import { existsSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { assertWritable, openReadOnly, openWritable } from "./sqlite.ts";

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

  test("penjaga tidak peka huruf besar-kecil dan mengurai symlink", () => {
    expect(() => assertWritable("/volumes/Elfariesh/x")).toThrow(/hanya boleh dibaca/);
    expect(() => assertWritable("/Volumes")).toThrow(/hanya boleh dibaca/);
    const dir = mkdtempSync(join(tmpdir(), "surau-guard-"));
    expect(assertWritable(join(dir, "baru", "a.sqlite"))).toMatch(/baru\/a\.sqlite$/);
  });

  test.skipIf(!existsSync("/Volumes"))("symlink ke /Volumes ditolak", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-guard-"));
    symlinkSync("/Volumes", join(dir, "v"));
    expect(() => assertWritable(join(dir, "v", "x.sqlite"))).toThrow(/hanya boleh dibaca/);
  });
});
