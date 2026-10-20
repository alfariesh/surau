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
        // Burst Jawab (S20): sama dengan wrangler.jsonc; hitungan lokal sungguhan (kunci unik per tes).
        ratelimits: { JAWAB_BURST: { namespace_id: "9501", simple: { limit: 3, period: 60 } } },
        bindings: {
          ENVIRONMENT: "test",
          LLM_MODE: "direct",
          // Kunci uji (bukan rahasia): secret uji Turnstile resmi + secret HMAC buatan tes.
          SURAU_API_SECRET: "secret-uji-surau-api-0123456789abcdef",
          TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
          TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
          TURNSTILE_HOSTNAMES: "surau.org",
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
