import { defineConfig } from "vite-plus";

// Toolchain tunggal Surau (ADR-008): `vp check` = Oxfmt + Oxlint + type-check, `vp test` = Vitest.
// Prosa (docs/, implementasi/, *.md) tidak disentuh formatter supaya teks Arab/Indonesia tidak berubah.
const generated = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.open-next/**",
  "**/.wrangler/**",
  "apps/mcp/dist/**",
  "apps/api/dist/**",
  "**/next-env.d.ts",
  "**/worker-configuration.d.ts",
  "**/cloudflare-env.d.ts",
];

const vendoredAset = [
  ".claude/skills/aset/mesin/**",
  ".claude/skills/aset/contoh/**",
  "aset/**",
  "apps/web/public/aset/**",
  "apps/web/public/aset-mesin/**",
];

export default defineConfig({
  // tsconfig apps/web memakai `jsx: "preserve"` (wajib untuk Next). Tes komponen (.tsx) dijalankan
  // Vitest, jadi JSX ditransformasi di sini dengan runtime otomatis React.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  lint: {
    plugins: ["typescript", "unicorn", "oxc", "react", "nextjs", "jsx-a11y", "import", "vitest"],
    // Mesin aset (turunan iso-glow, MIT), contoh aslinya, serta figur dan keluaran aset (HTML padat
    // bergaya mesin; keluaran dan public/aset = hasil bangun) tidak di-lint atau diformat ulang (ADR-057).
    ignorePatterns: [...generated, "docs/**", "implementasi/**", ...vendoredAset],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      // Vitest menerima pesan kustom sebagai argumen kedua expect(nilai, pesan).
      "vitest/valid-expect": ["warn", { maxArgs: 2 }],
      // images.unoptimized (ADR-003): next/image tidak memberi optimasi di Workers.
      "nextjs/no-img-element": "off",
    },
  },
  fmt: {
    ignorePatterns: [
      ...generated,
      "docs/**",
      "implementasi/**",
      "**/*.md",
      "data/raw/**",
      "data/build/**",
      ...vendoredAset,
    ],
    sortPackageJson: true,
  },
  test: {
    passWithNoTests: true,
    // Empat project: "node" (Node, semua tes selain packages/db, packages/core/src, apps/mcp/src),
    // "db" (workerd + D1 lokal, packages/db/vitest.config.ts, S06), "core" (workerd + D1 lokal,
    // packages/core/vitest.config.ts, S08), dan "mcp" (Worker MCP di workerd, apps/mcp, S16).
    // Plugin Cloudflare mengganti runtime seluruh project, jadi tes Node tidak boleh ikut project
    // workerd.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.ts", "tools/**/*.test.ts"],
          // packages/core/src diuji di workerd (project "core"); tes integrasi Ihya lokal
          // (packages/core/test/local) tetap di sini karena memakai getPlatformProxy dari Node.
          exclude: [
            "**/node_modules/**",
            "**/.next/**",
            "**/.open-next/**",
            "packages/db/**",
            "packages/core/src/**",
            "apps/mcp/src/**",
            "apps/api/src/**",
          ],
        },
      },
      "packages/db/vitest.config.ts",
      "packages/core/vitest.config.ts",
      "apps/mcp/vitest.config.ts",
      "apps/api/vitest.config.ts",
    ],
    // `pnpm test` = `vp test --coverage`. Paket teks Arab wajib 100% fungsi teruji (S05): semua
    // fungsi di sana menyentuh kutipan atau indeks, jadi tidak boleh ada jalur yang tak pernah diuji.
    coverage: {
      provider: "v8",
      // packages/db dan packages/core diuji di workerd (project "db"/"core"), dan coverage v8
      // tidak berjalan di sana
      // (plugin Cloudflare 1.4.2 menolak perintah __vitest_stopV8Coverage), jadi `pnpm test`
      // mengukur cakupan project "node" saja. Utang teknis S06: lihat ADR-029.
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "packages/db/**", "packages/core/**"],
      reporter: ["text-summary", "text"],
      thresholds: {
        "packages/text/src/**": { functions: 100, lines: 95, branches: 90 },
      },
    },
  },
  staged: {
    "*.{ts,tsx,js,mjs,json,css}": "vp check --fix",
  },
});
