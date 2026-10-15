# @surau/web

Aplikasi web Surau: Next.js 16 (App Router) + HeroUI v3/Pro, di-deploy ke Cloudflare Workers lewat OpenNext. Instruksi agent ada di `CLAUDE.md`; perintah dijalankan dari root repo (lihat `../../CLAUDE.md`).

Kerangka ini berasal dari template chat HeroUI Pro dan diubah menjadi Surau di S04. Kode chat template bisa diambil lagi dari riwayat git (sebelum S04) saat Fase 4 (Tanya) membutuhkannya.

## Menjalankan

```bash
pnpm dev        # http://localhost:3004
pnpm test:e2e   # smoke e2e Playwright (chromium); menyalakan dev server bila belum jalan
```

Sekali saja di mesin baru: `pnpm --filter @surau/web exec playwright install chromium`.
Untuk menguji URL lain (misalnya preview PR): `BASE_URL=https://… pnpm test:e2e`.

## Halaman

| Rute       | Isi                                                                  |
| ---------- | -------------------------------------------------------------------- |
| `/`        | Beranda: apa itu Surau, tiga prinsip utama, peta pembangunan         |
| `/tentang` | Visi, untuk siapa, yang bukan Surau, prinsip, keterbukaan, lisensi   |
| 404        | Halaman tidak ditemukan (bahasa Indonesia)                           |

Kitab, Cari, dan Tanya tampil di menu dengan label "segera".

## Struktur

```
src/
  app/
    layout.tsx           # <html lang="id">, font, metadata, Providers
    providers.tsx        # next-themes, I18nProvider (id-ID), RouterProvider
    globals.css          # palet Zaitun + tipografi Arab
    icon.svg             # favicon: kitab terbuka
    not-found.tsx
    (app)/               # halaman di dalam SurauShell
  components/
    arabic/              # ArabicText, ArabicInline (+ tes)
    shell/               # SurauShell, sidebar, navbar, tombol tema, logo
  content/basmalah.ts    # demo tipografi (teks Tanzil, asal-usul dicatat)
  i18n/id.ts             # semua string UI
e2e/                     # smoke + aksesibilitas (axe), chromium desktop & ponsel
```

## Prasyarat

- Node 24 (`.node-version` di root) dan pnpm 12 (`packageManager`).
- Login HeroUI Pro (`pnpm dlx heroui-pro@latest login`) atau `HEROUI_AUTH_TOKEN` di CI; postinstall `@heroui-pro/react` mengunduh artefak berlisensi.
