// Binding khusus tes (vitest.config.ts). Binding Worker lain ada di worker-configuration.d.ts.
declare namespace Cloudflare {
  interface Env {
    CORPUS_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
  /** `exports` dari cloudflare:workers di tes = handler default Worker ini (src/index.ts). */
  interface Exports {
    default: Fetcher;
  }
}
