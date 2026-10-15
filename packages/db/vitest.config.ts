// Tes @surau/db berjalan di workerd (Miniflare) dengan D1 lokal sementara, bukan di Node:
// SQL, CHECK STRICT, dan FTS5 diuji di mesin yang sama dengan produksi. Migrasi repo diterapkan
// di setup (test/apply-migrations.ts). Project ini dipanggil dari test.projects di root.
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
        d1Databases: ["CORPUS", "APP"],
        bindings: {
          CORPUS_MIGRATIONS: await readD1Migrations(dir("./migrations/corpus")),
          APP_MIGRATIONS: await readD1Migrations(dir("./migrations/app")),
        },
      },
    })),
  ],
  test: {
    name: "db",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
    // Cache modul di disk (default Vitest 5) tidak cocok dengan runner workerd plugin 1.4.2:
    // modul yang tercatat di cache tidak bisa dibaca dari Worker ("readAll … .vitest-cache").
    fsModuleCache: false,
  },
});
