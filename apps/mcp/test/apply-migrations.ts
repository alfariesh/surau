// Setup tes: terapkan migrasi korpus repo (packages/db/migrations/corpus) ke D1 lokal tes.
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(env.CORPUS_DB, env.CORPUS_MIGRATIONS);
