// Konfigurasi OpenNext untuk Cloudflare (ADR-003). Cache ISR di R2, dengan cache regional
// "long-lived" di depannya supaya halaman yang sering dibuka tidak selalu membaca R2.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  // Antrean revalidasi no-op (ADR-038). Semua rute ISR Surau `revalidate = false`: isinya hanya
  // berubah lewat deploy (BUILD_ID baru), jadi tidak ada yang perlu direvalidasi. Antrean bawaan
  // (`dummy`) melempar galat setiap kali Next menandai halaman STALE, yang terjadi di isolate
  // dingin karena adapter cache OpenNext belum mengembalikan `cacheControl` (opennextjs-aws#1250,
  // perbaikan #1317 belum dirilis). Antrean nyata (memory/DO) akan merender ulang dan membaca D1.
  queue: { name: "surau-noop", send: async () => {} },
});
