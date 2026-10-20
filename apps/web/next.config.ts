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
  // Header keamanan dasar untuk semua respons (temuan peninjau rilis Fase 0). CSP penuh menyusul
  // sebelum Fase 4: next-themes menyisipkan skrip inline, dan nonce butuh proxy (dilarang ADR-003).
  // Aset ilustrasi (/aset/*, ADR-057) disematkan lewat iframe di halaman sendiri, jadi boleh dibingkai
  // oleh origin yang sama. Di produksi berkas public/ dilayani Workers Static Assets tanpa melewati Next,
  // sehingga header /aset/* yang berlaku ada di public/_headers; aturan di sini untuk `next dev`.
  headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // HSTS belum aktif di edge (dicek 2026-10-20, #76). Tanpa preload: keluar dari daftar preload
      // butuh berbulan-bulan. Semua subdomain (mcp.) sudah HTTPS.
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ];
    return [
      {
        source: "/((?!aset/).*)",
        headers: [...base, { key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/aset/:path*",
        headers: [
          ...base,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; sandbox allow-scripts",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Binding Cloudflare (R2, nanti D1) tersedia di `next dev`. Data lokal disimpan di satu lokasi
// untuk semua perintah lokal (ARSITEKTUR-TEKNIS §7, aturan 1). Proxy memakai path ini apa adanya,
// sedangkan `wrangler … --persist-to <root>/.wrangler/state` menambah `v3` sendiri; jadi di sini
// harus `.wrangler/state/v3`, supaya D1 yang dimuat `pnpm corpus:load:local` terlihat (S08).
void initOpenNextCloudflareForDev({
  persist: { path: join(import.meta.dirname, "../../.wrangler/state/v3") },
});
