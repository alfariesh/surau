// Setup tes: terapkan migrasi repo ke D1 lokal tes. applyD1Migrations idempoten (mencatat ke
// tabel d1_migrations, sama seperti `wrangler d1 migrations apply`).
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(env.CORPUS, env.CORPUS_MIGRATIONS);
await applyD1Migrations(env.APP, env.APP_MIGRATIONS);
