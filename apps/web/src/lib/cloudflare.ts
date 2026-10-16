import { getCloudflareContext } from "@opennextjs/cloudflare";

// Binding Cloudflare (D1, Rate Limiting, vars) untuk server component dan route handler.
// Selalu mode async: halaman ISR (`revalidate = false`) tidak punya konteks request sinkron, dan
// mode sync melempar error di rute statis. Jangan dipanggil di top-level modul (ADR-034).

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

/**
 * Pembaca kitab terbuka? Produksi `READER_ENABLED = "0"` sampai rilis Fase 1; Preview `"1"`;
 * `next dev` selalu terbuka supaya D1 lokal bisa dibaca tanpa konfigurasi tambahan.
 */
export function readerEnabled(env: Pick<CloudflareEnv, "READER_ENABLED">): boolean {
  return env.READER_ENABLED === "1" || process.env.NODE_ENV === "development";
}
