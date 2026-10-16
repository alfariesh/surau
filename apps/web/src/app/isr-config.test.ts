import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, test } from "vite-plus/test";

// Penjaga ADR-038: open-next.config.ts memakai antrean revalidasi no-op, jadi revalidasi berkala
// (ISR berbasis waktu) diam-diam tidak akan pernah jalan. Antrean itu hanya aman selama setiap rute
// `revalidate = false` (isi berubah lewat deploy) atau dinamis. Rute dengan `revalidate = <angka>`
// butuh antrean nyata (DO queue) dan perbaikan cacheControl OpenNext dulu.

const appDir = import.meta.dirname;
const webDir = join(appDir, "../..");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : [];
  });
}

describe("ISR tanpa revalidasi berkala (ADR-038)", () => {
  test("setiap `export const revalidate` di src/app bernilai false", () => {
    const numeric = sources(appDir).flatMap((file) => {
      const m = /export const revalidate\s*=\s*([^;\n]+)/.exec(readFileSync(file, "utf8"));
      return m && m[1]?.trim() !== "false" ? [`${relative(webDir, file)}: ${m[1]?.trim()}`] : [];
    });
    expect(numeric).toEqual([]);
  });

  test("tidak ada revalidasi on-demand atau cache data berbasis waktu", () => {
    const used = sources(join(webDir, "src")).flatMap((file) =>
      /\b(revalidatePath|revalidateTag|unstable_cache)\b|next:\s*\{\s*revalidate/.test(
        readFileSync(file, "utf8"),
      )
        ? [relative(webDir, file)]
        : [],
    );
    expect(used).toEqual([]);
  });

  test("open-next.config.ts memakai antrean no-op, bukan antrean yang merender ulang", () => {
    const config = readFileSync(join(webDir, "open-next.config.ts"), "utf8");
    expect(config).toMatch(/queue:\s*\{\s*name:\s*"surau-noop",\s*send:\s*async \(\) => \{\}\s*\}/);
    expect(config).not.toMatch(/memory-queue|do-queue|queue-cache/);
  });
});
