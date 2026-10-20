// Setup tes: terapkan migrasi korpus + app repo (packages/db/migrations) ke D1 lokal tes.
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(env.CORPUS_DB, env.CORPUS_MIGRATIONS);
await applyD1Migrations(env.APP_DB, env.APP_MIGRATIONS);
