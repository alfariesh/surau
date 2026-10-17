// Tes Worker MCP (S16) di workerd (Miniflare) dengan D1 lokal sementara, seperti packages/core:
// migrasi korpus dari packages/db diterapkan di setup, fixture buatan core diisi per file. Binding
// ditulis langsung (bukan wrangler.jsonc) supaya tes tidak pernah menyentuh DB remote; batas
// pemakaian dibuat kecil supaya tes batas bisa menghabiskannya.
import { fileURLToPath } from "node:url";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vite-plus";

import { TEST_SEARCH_LIMIT, TEST_TOOL_LIMIT } from "./test/limits.ts";

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: "./src/index.ts",
      miniflare: {
        compatibilityDate: "2026-10-14",
        compatibilityFlags: ["global_fetch_strictly_public"],
        d1Databases: ["CORPUS_DB"],
        ratelimits: {
          MCP_TOOL_LIMITER: {
            namespace_id: "9001",
            simple: { limit: TEST_TOOL_LIMIT, period: 60 },
          },
          MCP_READ_GLOBAL_LIMITER: { namespace_id: "9004", simple: { limit: 1000, period: 60 } },
          MCP_SEARCH_LIMITER: {
            namespace_id: "9002",
            simple: { limit: TEST_SEARCH_LIMIT, period: 60 },
          },
          MCP_SEARCH_GLOBAL_LIMITER: { namespace_id: "9003", simple: { limit: 1000, period: 60 } },
        },
        bindings: {
          SITE_URL: "https://surau.test",
          IP_HMAC_KEY: "kunci-tes",
          CORPUS_MIGRATIONS: await readD1Migrations(dir("../../packages/db/migrations/corpus")),
        },
      },
    })),
  ],
  test: {
    name: "mcp",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
    // Sama dengan packages/core: cache modul di disk tidak terbaca dari runner workerd (plugin 1.4.2).
    fsModuleCache: false,
  },
});
