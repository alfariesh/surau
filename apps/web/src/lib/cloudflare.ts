import { env as workerEnv, waitUntil } from "cloudflare:workers";

// Binding Cloudflare (D1, Rate Limiting, vars) untuk server component dan route handler.
// `cloudflare:workers` (vinext) memberi binding langsung, di dev maupun produksi. Fungsi tetap
// async supaya pemanggil lama tidak berubah. Jangan dipanggil di top-level modul (ADR-034).

export async function getEnv(): Promise<CloudflareEnv> {
  return workerEnv as unknown as CloudflareEnv;
}

/** Binding + `ctx` (untuk `ctx.waitUntil`, mis. menyimpan ke Cache API sesudah respons). */
export async function getContext(): Promise<{
  env: CloudflareEnv;
  ctx: Pick<ExecutionContext, "waitUntil">;
}> {
  return { env: workerEnv as unknown as CloudflareEnv, ctx: { waitUntil } };
}

/**
 * Pembaca kitab terbuka? Produksi `READER_ENABLED = "0"` sampai rilis Fase 1; Preview `"1"`;
 * `next dev` selalu terbuka supaya D1 lokal bisa dibaca tanpa konfigurasi tambahan.
 */
export function readerEnabled(env: Pick<CloudflareEnv, "READER_ENABLED">): boolean {
  return env.READER_ENABLED === "1" || process.env.NODE_ENV === "development";
}

/**
 * Halaman pratinjau fixture `/dev/*` tanpa D1 (X16)? Produksi `DEV_PAGES = "0"` (404), Preview `"1"`
 * (e2e CI berjalan terhadap Preview), `next dev` selalu.
 */
export function devPagesEnabled(env: Pick<CloudflareEnv, "DEV_PAGES">): boolean {
  return env.DEV_PAGES === "1" || process.env.NODE_ENV === "development";
}
