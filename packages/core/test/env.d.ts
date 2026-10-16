// Binding Worker tes (vitest.config.ts). Hanya untuk tes; kode src memakai tipe struktural D1Db.
declare namespace Cloudflare {
  interface Env {
    CORPUS: D1Database;
    CORPUS_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
