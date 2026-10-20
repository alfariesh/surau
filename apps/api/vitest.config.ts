// Tes Worker Jawab (S19) di workerd (Miniflare) dengan D1 lokal sementara (korpus + app), seperti
// apps/mcp: migrasi repo diterapkan di setup, fixture buatan core diisi per file. Anthropic
// TIDAK pernah dipanggil: tes menyuntikkan klien SDK dengan `fetch` tiruan (test/fake-anthropic.ts).
import { fileURLToPath } from "node:url";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vite-plus";

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: "./src/index.ts",
      miniflare: {
        compatibilityDate: "2026-10-14",
        compatibilityFlags: ["global_fetch_strictly_public"],
        d1Databases: ["CORPUS_DB", "APP_DB"],
        bindings: {
          ENVIRONMENT: "test",
          LLM_MODE: "direct",
          AI_GATEWAY_URL:
            "https://gateway.ai.cloudflare.com/v1/0123456789abcdef0123456789abcdef/surau-gw/anthropic",
          CORPUS_MIGRATIONS: await readD1Migrations(dir("../../packages/db/migrations/corpus")),
          APP_MIGRATIONS: await readD1Migrations(dir("../../packages/db/migrations/app")),
        },
      },
    })),
  ],
  test: {
    name: "api",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
    fsModuleCache: false,
  },
});
