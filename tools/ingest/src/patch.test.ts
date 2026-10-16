import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { readTocPatch } from "./patch.ts";

function patchFile(content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "surau-patch-")), "p.yaml");
  writeFileSync(path, content);
  return path;
}

describe("readTocPatch", () => {
  test("patch sah: add/move dibaca; bagian kosong boleh dihilangkan", () => {
    expect(
      readTocPatch(patchFile("shamela_book: 1\nmove:\n  - titles: [3]\n    parent: node-baru\n")),
    ).toEqual({
      shamela_book: 1,
      add: [],
      move: [{ titles: [3], parent: "node-baru" }],
    });
  });

  test("kunci ganda, alias, kunci asing, dan id patch tak sah ditolak", () => {
    expect(() => readTocPatch(patchFile("shamela_book: 1\nshamela_book: 2\n"))).toThrow(/unique/i);
    expect(() =>
      readTocPatch(
        patchFile(
          "shamela_book: 1\nmove:\n  - titles: &t [1]\n    parent: 2\n  - titles: *t\n    parent: 3\n",
        ),
      ),
    ).toThrow(/alias/i);
    expect(() => readTocPatch(patchFile("shamela_book: 1\nhapus: []\n"))).toThrow(/hapus/);
    expect(() =>
      readTocPatch(
        patchFile(
          "shamela_book: 1\nadd:\n  - id: Huruf_Besar\n    parent: 1\n    page: 1\n    heading: x\n",
        ),
      ),
    ).toThrow(/huruf kecil/);
  });
});
