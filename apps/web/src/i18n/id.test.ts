import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { id } from "./id";

// Penjaga kamus UI per bagian (X09). Objek `id` (i18n/id.ts) mengimpor SEMUA bagian; komponen yang
// ikut ke browser dan mengimpornya membawa seluruh kamus (±26 KB mentah, sempat tersalin di 2–3
// chunk halaman baca). Komponen dan modul bersama (components/, lib/) mengimpor bagiannya langsung
// dari `i18n/id/<bagian>`; objek `id` hanya untuk route dan server component di app/.

const src = join(import.meta.dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("kamus UI per bagian", () => {
  test("components/ dan lib/ tidak mengimpor objek kamus lengkap", () => {
    const offenders = ["components", "lib"]
      .flatMap((d) => files(join(src, d)))
      .filter((f) => /from "(?:\.\.?\/)+i18n\/id"/.test(readFileSync(f, "utf8")))
      .map((f) => relative(src, f));
    expect(offenders).toEqual([]);
  });

  test("berkas klien di app/ juga tidak mengimpor objek kamus lengkap", () => {
    const offenders = files(join(src, "app"))
      .filter((f) => {
        const text = readFileSync(f, "utf8");
        return text.startsWith('"use client"') && /from "(?:\.\.?\/)+i18n\/id"/.test(text);
      })
      .map((f) => relative(src, f));
    expect(offenders).toEqual([]);
  });

  test("objek `id` memuat setiap berkas bagian dengan nama yang sama", () => {
    const parts = readdirSync(join(import.meta.dirname, "id"))
      .filter((n) => n.endsWith(".ts"))
      .map((n) => n.replace(/\.ts$/, ""))
      .sort();
    expect(Object.keys(id).sort()).toEqual(parts);
  });
});
