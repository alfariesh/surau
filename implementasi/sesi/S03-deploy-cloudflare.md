# S03 · Deploy ke Cloudflare

> **Fase:** 0 · **Status:** belum
> **Prasyarat:** S02 selesai · Tugas pemilik: **T-05** (wrangler login), **T-06** (token CI). **T-07** (domain) opsional; tanpa domain, situs memakai `*.workers.dev`
> **Perkiraan:** 1 percakapan agent

## Tujuan

Setiap merge ke `main` otomatis ter-deploy ke Cloudflare Workers, dan setiap PR mendapat URL preview. Template web berjalan di Workers lewat OpenNext tanpa error.

## Baca dulu (hanya ini)

- KEPUTUSAN: ADR-002, 003 (gerbang versi dan aturan konservatif), 017.
- ARSITEKTUR-TEKNIS §1 dan §7 (lingkungan dan binding).
- `/docs-terbaru` untuk: `@opennextjs/cloudflare` (get started, caching R2, batasan, rilis terbaru, dan **dukungan versi Next yang dipakai**), `wrangler` (konfigurasi `wrangler.jsonc`, `wrangler preview`, `observability`), dan Workers limits. Skill global `wrangler` dan `cloudflare` boleh dimuat. MCP `cloudflare-docs` tersedia.

## Langkah

1. **Gerbang versi (ADR-003).** Pastikan versi Next di `apps/web` (16.3.8) didukung resmi oleh rilis OpenNext yang dipasang. Bila OpenNext sudah merilis dukungan 16.4, catat di STATUS bahwa sesi sisipan X01 bisa dikerjakan setelah sesi ini.
   - Catatan (belum terverifikasi): `wrangler preview` mungkin tidak mengisi cache R2 seperti `opennextjs-cloudflare deploy`, sehingga halaman ISR di preview dirender on-demand. Itu cukup untuk smoke test.
2. Tambahkan `@opennextjs/cloudflare` dan `wrangler` (devDependency, lewat catalog) ke `apps/web`. Mulai sekarang selalu pakai `pnpm wrangler`, bukan wrangler global yang usang.
3. Buat `apps/web/wrangler.jsonc`:
   - `name: "surau-web"`, `main: ".open-next/worker.js"`, `compatibility_date` = hari ini.
   - `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`.
   - `assets` (`.open-next/assets`, binding `ASSETS`) dan `services` self-reference (`WORKER_SELF_REFERENCE`).
   - R2 `NEXT_INC_CACHE_R2_BUCKET` → `surau-next-cache`.
   - `observability` (logs aktif, traces sampling 0,1).
   - Blok `previews` yang **tidak** menunjuk ke resource produksi: `NEXT_INC_CACHE_R2_BUCKET` → `surau-next-cache-preview`. Binding storage tidak diwarisi, jadi harus dideklarasikan ulang di blok ini.
   - Catatan: service binding self-reference (`WORKER_SELF_REFERENCE`) dari preview memanggil deployment **produksi**. Karena itu, lakukan deploy produksi pertama **sebelum** menguji preview PR, dan catat keterbatasan ini.
4. `open-next.config.ts`: `defineCloudflareConfig({ incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }) })`. Panggil `initOpenNextCloudflareForDev()` di `next.config.ts`.
5. Tambahkan `public/_headers` (`/_next/static/*` immutable) dan `.dev.vars` (`NEXTJS_ENV=development`, git-ignored). Tambahkan juga skrip `preview`, `deploy:web` (bukan `deploy`, karena `pnpm deploy` adalah perintah bawaan pnpm), `upload`, dan `cf-typegen` (`wrangler types`). Tipe binding dihasilkan oleh `wrangler types`, bukan ditulis manual.
6. Minta izin, lalu buat bucket: `pnpm wrangler r2 bucket create surau-next-cache` dan `pnpm wrangler r2 bucket create surau-next-cache-preview`.
7. **Uji lokal di workerd:** `pnpm --filter @surau/web preview`. Buka halaman-halaman template dan pastikan tidak ada error. Ukur ukuran bundle dengan `wrangler deploy --dry-run --outdir`, lalu catat ukurannya.
8. **CI/CD (GitHub Actions):**
   - `deploy.yml`: push ke `main` → install (dengan cache) → `opennextjs-cloudflare build` → deploy. Memakai `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID`.
   - `preview.yml`: PR → build → `wrangler preview --name pr-<nomor> --json` → komentar URL ke PR.
9. **Domain** (bila T-07 selesai): tambahkan `routes` dengan custom domain untuk `surau-web`. Bila belum, pakai `*.workers.dev` dulu dan catat di STATUS.
10. Merge PR (dengan izin), lalu pastikan deploy produksi sukses dan cek Workers Logs.

## Selesai bila

- [ ] `pnpm --filter @surau/web preview` berjalan di workerd lokal tanpa error, dan ukuran bundle tercatat
- [ ] PR mendapat komentar URL preview yang bisa dibuka
- [ ] Merge ke `main` men-deploy otomatis (tautan run dicatat); situs terbuka di domain atau workers.dev
- [ ] Workers Logs tidak menunjukkan error saat membuka 3 halaman
- [ ] Preview tidak memakai resource produksi (dicek dari `wrangler.jsonc`)
- [ ] Versi Next dan OpenNext yang dipakai, beserta status gerbang ADR-003, dicatat di STACK.md
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Perubahan tampilan (S04). D1 dan data (Fase 1). Turnstile dan rate limit (Fase 4).

## Catatan hasil

*(diisi agent)*
