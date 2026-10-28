import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, test } from "vite-plus/test";

// Penjaga ADR-127: kepala Intisari untuk tampilan selalu lewat fungsi core yang menerapkan daftar
// tarik (`listShownDigestHeaders` dkk.), bukan fungsi db mentah, supaya halaman baru tidak
// menampilkan jumlah gagasan atau audio Intisari yang gagasannya ditarik.

const srcDir = join(import.meta.dirname, "../..");
const RAW = /\b(?:listDigestHeaders|getDigestHeaders|getDigestHeadersOnPath|getDigest)\b/u;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : [];
  });
}

describe("daftar tarik Intisari (ADR-127)", () => {
  test("apps/web tidak memanggil kepala/baris Intisari db mentah", () => {
    const raw = sources(srcDir).flatMap((file) =>
      RAW.test(readFileSync(file, "utf8")) ? [relative(srcDir, file)] : [],
    );
    expect(raw).toEqual([]);
  });
});
