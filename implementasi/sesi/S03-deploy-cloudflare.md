# S03 · Deploy ke Cloudflare

> **Fase:** 0 · **Status:** selesai · PR #4 (2026-10-15)
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

- [x] `pnpm --filter @surau/web preview` berjalan di workerd lokal tanpa error, dan ukuran bundle tercatat · `opennextjs-cloudflare preview --port 3005` → `/explore`, `/library`, `/new`, `/pro-ai-showcase` 200, `/` 307; log tanpa error; konsol browser kosong · `wrangler deploy --dry-run` → **15.993 KiB / gzip 3.021 KiB** (batas 64 MiB)
- [x] PR mendapat komentar URL preview yang bisa dibuka · run [38700735787](https://github.com/alfariesh/surau/actions/runs/38700735787) success → komentar `github-actions` di PR #4 berisi https://pr-4-surau-web.alfarieshsalman.workers.dev; smoke `/explore`, `/library`, `/new` → 200 (dicek ulang dari lokal)
- [x] Merge ke `main` men-deploy otomatis (tautan run dicatat); situs terbuka di domain atau workers.dev · merge PR #4 (`3f77eb1`) → run Deploy [38701138352](https://github.com/alfariesh/surau/actions/runs/38701138352) success, versi `ce2a24bf`, smoke 3 halaman 200 → https://surau-web.alfarieshsalman.workers.dev (domain belum ada, T-07)
- [x] Workers Logs tidak menunjukkan error saat membuka 3 halaman · `wrangler tail surau-web --format json` sambil membuka `/explore`, `/library`, `/pro-ai-showcase` → outcome `ok`, status 200, 0 exception, 0 log error
- [x] Preview tidak memakai resource produksi (dicek dari `wrangler.jsonc`) · blok `previews` → R2 `surau-next-cache-preview`; JSON `wrangler preview` uji → `NEXT_INC_CACHE_R2_BUCKET.bucket_name = surau-next-cache-preview`. Pengecualian yang dicatat: `WORKER_SELF_REFERENCE` selalu ke produksi (ADR-026)
- [x] Versi Next dan OpenNext yang dipakai, beserta status gerbang ADR-003, dicatat di STACK.md · Next 16.3.8 + OpenNext 1.20.11 (peer `>=16.3.8`), gerbang 16.4 belum terbuka
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Perubahan tampilan (S04). D1 dan data (Fase 1). Turnstile dan rate limit (Fase 4).

## Catatan hasil

**2026-10-15 (percakapan 1) — terblokir di T-06.**

Dibuat:
- `@opennextjs/cloudflare` 1.20.11 + `wrangler` 4.151.0 di `apps/web` (catalog). `wrangler.jsonc` (Worker `surau-web`, R2 cache, blok `previews`, observability + `redact_query_string`), `open-next.config.ts` (R2 + regional cache long-lived), `initOpenNextCloudflareForDev` di `next.config.ts` (persist ke `<root>/.wrangler/state`), `public/_headers`, `.dev.vars` (tidak di-commit), skrip `preview`/`deploy:web`/`upload`/`cf-typegen`, `cloudflare-env.d.ts` hasil `wrangler types` (diabaikan fmt/lint).
- R2 `surau-next-cache` dan `surau-next-cache-preview` dibuat. Deploy produksi pertama dari lokal → https://surau-web.alfarieshsalman.workers.dev (startup 20 ms).
- `deploy.yml`, `preview.yml`, dan action komposit `.github/actions/siapkan` (refactor `ci.yml`). ADR-026.
- Peninjau: tanpa blocker. Diperbaiki: ADR-026 ditulis, `redact_query_string`, `workflow_dispatch` hanya dari `main`, job hapus preview (Node lewat setup-vp, `pnpm dlx` versi catalog, `--skip-confirmation`, gagal = peringatan), cek secret tanpa nilai token, `curl --fail` supaya 5xx diulang.

**Lanjutan setelah T-06:** kedua secret diisi pemilik (07:40–07:41 UTC). Run preview pertama gagal: di CI, `wrangler preview --json` menulis teks lain ke stdout sebelum JSON, sehingga `jq` gagal (lokal tidak). Diperbaiki dengan mengambil keluaran mulai baris pertama `{` (+ `WRANGLER_SEND_METRICS=false`); run berikutnya hijau.

Semula belum selesai (karena T-06):
- Agent tidak bisa mengisi secret GitHub (ditolak pengaman mode otomatis), jadi `CLOUDFLARE_API_TOKEN` **dan** `CLOUDFLARE_ACCOUNT_ID` diisi pemilik. Setelah itu: jalankan ulang job `preview` di PR #4 (`gh run rerun --failed`), cek komentar URL, merge, lalu cek run `deploy.yml` dan Workers Logs. Domain (T-07) belum ada → tetap workers.dev.
- Tindak lanjut S01 (vite-plus 1.2.0, React 19.2.9) belum bisa: belum lewat 24 jam saat sesi ini (14:10 WIB).

Utang teknis / untuk sesi berikutnya:
- `pnpm --filter @surau/web preview` masih menyimpan state di `apps/web/.wrangler/state` (beda dari `next dev`). S06 wajib menyamakannya sebelum D1 lokal (ADR-026).
- Smoke di workflow memakai `curl`; ganti/ tambah Playwright di S04 (`test:e2e`).
- `.claude/settings.json` (perubahan pemilik) memindahkan beberapa perintah berisiko ke `allow`; dilaporkan ke pemilik, tidak diubah agent.
- Dependabot PR #3 (49 pembaruan) masih terbuka; belum ditinjau di sesi ini.

**Setelah merge:** `wrangler deployments list` → 100% `ce2a24bf`. `wrangler tail` sambil membuka halaman dengan `?q=…` → outcome `ok`, 0 exception, dan URL di log sudah **tanpa** query string (`redact_query_string` bekerja). Penutupan PR #4 menjalankan job `hapus preview` (success) → `pr-4-surau-web…` sekarang 404.
