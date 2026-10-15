import { join } from "node:path";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Aturan konservatif ADR-003: tanpa cacheComponents/'use cache' sampai OpenNext siap,
// dan tanpa optimasi gambar (Workers tidak menjalankan image optimizer Next).
const nextConfig: NextConfig = {
  cacheComponents: false,
  // Root monorepo ditulis eksplisit; tanpa ini Turbopack menebak root dari workspace pnpm lain.
  turbopack: {
    root: join(import.meta.dirname, "../.."),
  },
  devIndicators: {
    position: "bottom-right",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

// Binding Cloudflare (R2, nanti D1) tersedia di `next dev`. Data lokal disimpan di satu lokasi
// untuk semua perintah lokal: <root>/.wrangler/state (ARSITEKTUR-TEKNIS §7, aturan 1).
void initOpenNextCloudflareForDev({
  persist: { path: join(import.meta.dirname, "../../.wrangler/state") },
});
