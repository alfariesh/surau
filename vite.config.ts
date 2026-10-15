import { defineConfig } from "vite-plus";

// Toolchain tunggal Surau (ADR-008): `vp check` = Oxfmt + Oxlint + type-check, `vp test` = Vitest.
// Prosa (docs/, implementasi/, *.md) tidak disentuh formatter supaya teks Arab/Indonesia tidak berubah.
const generated = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.open-next/**",
  "**/.wrangler/**",
  "**/next-env.d.ts",
  "**/worker-configuration.d.ts",
  "**/cloudflare-env.d.ts",
];

export default defineConfig({
  // tsconfig apps/web memakai `jsx: "preserve"` (wajib untuk Next). Tes komponen (.tsx) dijalankan
  // Vitest, jadi JSX ditransformasi di sini dengan runtime otomatis React.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  lint: {
    plugins: ["typescript", "unicorn", "oxc", "react", "nextjs", "jsx-a11y", "import", "vitest"],
    ignorePatterns: [...generated, "docs/**", "implementasi/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
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
    ],
    sortPackageJson: true,
  },
  test: {
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.ts", "tools/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.open-next/**"],
    passWithNoTests: true,
  },
  staged: {
    "*.{ts,tsx,js,mjs,json,css}": "vp check --fix",
  },
});
