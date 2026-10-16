// Tes @surau/core berjalan di workerd (Miniflare) dengan D1 lokal sementara, sama seperti
// @surau/db (ADR-029): migrasi korpus dari packages/db diterapkan di setup, lalu fixture buatan
// diisi per file. Tes integrasi Ihya lokal (test/local) berjalan di project "node" root.
import { fileURLToPath } from "node:url";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vite-plus";

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      // Tanpa wrangler.jsonc: binding dideklarasikan langsung supaya tes tidak pernah menyentuh
      // DB remote. Tanggal kompatibilitas sama dengan packages/db/wrangler.jsonc.
      miniflare: {
        compatibilityDate: "2026-10-14",
        d1Databases: ["CORPUS"],
        bindings: {
          CORPUS_MIGRATIONS: await readD1Migrations(dir("../db/migrations/corpus")),
        },
      },
    })),
  ],
  test: {
    name: "core",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
    // Sama dengan packages/db: cache modul di disk tidak terbaca dari runner workerd (plugin 1.4.2).
    fsModuleCache: false,
  },
});
