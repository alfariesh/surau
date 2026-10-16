import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

// Penjaga impor CSS HeroUI per komponen (ADR-035). globals.css hanya memuat CSS komponen yang
// dipakai, jadi komponen baru (atau komponen yang mulai merender komponen lain setelah HeroUI naik
// versi) tanpa berkas CSS-nya akan tampil tanpa gaya tanpa ada build yang gagal. Tes ini menelusuri
// komponen HeroUI yang diimpor di src/ beserta impor internalnya di dist paket, lalu memastikan
// setiap berkas CSS komponen yang terjangkau ikut diimpor di globals.css.

const web = join(import.meta.dirname, "../..");
const oss = join(web, "node_modules/@heroui/react/dist");
const pro = join(web, "node_modules/@heroui-pro/react/dist");
const ossCss = join(web, "node_modules/@heroui/styles/dist/components");
const proCss = join(pro, "css/components");
const globals = readFileSync(join(web, "src/app/globals.css"), "utf8");

function exportMap(indexJs: string): Map<string, string> {
  const map = new Map<string, string>();
  const source = readFileSync(indexJs, "utf8");
  for (const m of source.matchAll(
    /export\s*\{([^}]*)\}\s*from\s*["']\.\/components\/([a-z0-9-]+)\//g,
  )) {
    for (const name of m[1]!.split(","))
      map.set(
        name
          .trim()
          .split(/\s+as\s+/)
          .at(-1)!,
        m[2]!,
      );
  }
  return map;
}
const ossExports = exportMap(join(oss, "index.js"));
const proExports = exportMap(join(pro, "index.js"));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function namedImports(source: string, from: RegExp): string[] {
  const names: string[] = [];
  for (const m of source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    if (!from.test(m[2]!) || m[0].startsWith("import type")) continue;
    for (const n of m[1]!.split(",")) {
      const name = n
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]!;
      if (name && !n.trim().startsWith("type ")) names.push(name);
    }
  }
  return names;
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Berkas CSS (`oss:<nama>` / `pro:<nama>`) yang dibutuhkan komponen HeroUI yang dipakai src/. */
function requiredCss(): Map<string, string> {
  const required = new Map<string, string>(); // css -> jalur pertama yang menjangkaunya
  const seen = new Set<string>();
  const queue: [pkg: "oss" | "pro", dir: string, via: string][] = [];

  for (const file of walk(join(web, "src")).filter(
    (f) => /\.tsx?$/.test(f) && !/\.test\./.test(f),
  )) {
    const source = readFileSync(file, "utf8");
    for (const name of namedImports(source, /^@heroui\/react$/)) {
      const dir = ossExports.get(name);
      if (dir) queue.push(["oss", dir, name]);
    }
    for (const name of namedImports(source, /^@heroui-pro\/react(\/|$)/)) {
      const dir = proExports.get(name);
      if (dir) queue.push(["pro", dir, name]);
    }
  }

  while (queue.length > 0) {
    const [pkg, dir, via] = queue.shift()!;
    const key = `${pkg}:${dir}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cssFile = join(pkg === "oss" ? ossCss : proCss, `${dir}.css`);
    if (existsSync(cssFile) && !required.has(key)) required.set(key, via);

    const base = join(pkg === "oss" ? oss : pro, "components", dir);
    for (const file of readdirSync(base).filter((f) => f.endsWith(".js"))) {
      const source = readFileSync(join(base, file), "utf8");
      // Impor/ekspor dari komponen saudara. Yang hanya mengambil konteks (mis. `SurfaceContext`
      // di Dropdown/Card, `CheckboxGroupContext` di Checkbox) tidak merender komponen itu.
      for (const m of source.matchAll(
        /(?:import|export)\s*(?:\{([^}]*)\}\s*from\s*)?["']\.\.\/([a-z0-9-]+)\//g,
      )) {
        const names = (m[1] ?? "").split(",").map((n) => n.trim().split(/\s+as\s+/)[0]!);
        if (names.length > 0 && names.every((n) => n.endsWith("Context"))) continue;
        queue.push([pkg, m[2]!, `${via} → ${m[2]}`]);
      }
      if (pkg === "pro") {
        for (const name of namedImports(source, /^@heroui\/react$/)) {
          const ossDir = ossExports.get(name);
          if (ossDir) queue.push(["oss", ossDir, `${via} → ${name}`]);
        }
      }
      // Kelas dari varian @heroui/styles (mis. `menuVariants` → menu.css).
      for (const name of namedImports(source, /^@heroui\/styles$/)) {
        const stem = name.replace(/Variants$/, "");
        if (stem === name) continue;
        for (const cand of [kebab(stem), stem.toLowerCase()]) {
          if (existsSync(join(ossCss, `${cand}.css`)))
            queue.push(["oss", cand, `${via} → ${name}`]);
        }
      }
    }
  }
  return required;
}

function importedCss(): string[] {
  return [
    ...globals.matchAll(
      /@import\s+"(@heroui\/styles\/components|@heroui-pro\/react\/css\/components)\/([a-z0-9-]+)\.css"\s+layer\(components\);/g,
    ),
  ].map((m) => `${m[1]!.startsWith("@heroui/") ? "oss" : "pro"}:${m[2]}`);
}

describe("CSS HeroUI per komponen (ADR-035)", () => {
  const required = requiredCss();
  const imported = new Set(importedCss());

  test("setiap komponen HeroUI yang dipakai (termasuk yang dirender di dalamnya) punya CSS di globals.css", () => {
    const missing = [...required]
      .filter(([css]) => !imported.has(css))
      .map(([css, via]) => `${css} (lewat ${via})`);
    expect(missing, "tambahkan berkas CSS-nya di globals.css dengan urutan ADR-035").toEqual([]);
  });

  test("berkas OSS mengikuti urutan components/index.css", () => {
    const order = [
      ...readFileSync(join(ossCss, "index.css"), "utf8").matchAll(
        /@import "\.\/([a-z0-9-]+)\.css";/g,
      ),
    ].map((m) => `oss:${m[1]}`);
    const ours = importedCss().filter((c) => c.startsWith("oss:"));
    expect(ours).toEqual(order.filter((c) => ours.includes(c)));
  });

  test("berkas Pro mengikuti urutan aturan di @heroui-pro/react/css", () => {
    const index = readFileSync(join(pro, "css/index.css"), "utf8");
    // Posisi aturan gaya pertama berkas komponen itu di dalam index.css Pro (keduanya hasil
    // kompilasi yang sama). Bukan nama blok: app-layout.css juga memuat aturan `.navbar`/`.sidebar`.
    const position = (block: string) => {
      const css = readFileSync(join(proCss, `${block}.css`), "utf8").replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      );
      let depth = 0;
      let start = 0;
      for (let i = 0; i < css.length; i++) {
        if (css[i] === "{") {
          const header = css.slice(start, i).trim();
          if (depth === 0 && !header.startsWith("@")) {
            // Harus di awal aturan: `.hover-card__trigger` juga muncul di `.chat-source .hover-card__trigger`.
            const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return index.search(new RegExp(`(?<=[{};])${escaped}\\{`));
          }
          depth++;
        } else if (css[i] === "}") {
          depth--;
          if (depth === 0) start = i + 1;
        } else if (css[i] === ";" && depth === 0) start = i + 1;
      }
      return -1;
    };
    const ours = importedCss()
      .filter((c) => c.startsWith("pro:"))
      .map((c) => c.slice(4));
    for (const block of ours) expect(position(block), block).toBeGreaterThan(-1);
    expect(ours).toEqual([...ours].sort((a, b) => position(a) - position(b)));
  });

  test("tw-animate-css langsung = versi yang dipakai @heroui/styles", () => {
    const styles = JSON.parse(
      readFileSync(join(web, "node_modules/@heroui/styles/package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const direct = JSON.parse(
      readFileSync(join(web, "node_modules/tw-animate-css/package.json"), "utf8"),
    ) as { version: string };
    expect(direct.version).toBe(styles.dependencies["tw-animate-css"]);
  });
});
