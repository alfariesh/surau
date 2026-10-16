# Status Implementasi

> Diperbarui: 2026-10-16 · oleh agent, **X01 selesai** (Next 16.4.1 + React 19.3.1 + OpenNext 1.20.12)
> Agent: bagian *Sekarang* sampai sebelum *Progres* otomatis disuntikkan ke setiap sesi baru. Jaga tetap ringkas (≤35 baris).

## Sekarang

- **Mulai di sini (pemilik):** X01 selesai (Next 16.4.1, tambalan keamanan). Buka percakapan baru dan ketik **`/sesi`** untuk S07 (drive Shamela harus terpasang, T-09).
- **Fase:** 1 · Pembaca Ihya (berjalan; Fase 0 dirilis 2026-10-15, `rilis-f0`)
- **Sesi berikutnya:** **S07 · Importer Ihya** → [sesi/S07-importer-ihya.md](sesi/S07-importer-ihya.md) (butuh T-09)
- **Tindak lanjut kecil:** `next` 16.4.2 (backport non-keamanan) boleh lewat Dependabot. Log Worker **Preview** belum bisa dibaca agent (ADR-030 poin 7). Cakupan tes `packages/db` belum terukur (coverage v8 tidak jalan di workerd, ADR-029).
- **Wajib dijawab pemilik:** P-2 domain (S03) · P-5 ustadz (rilis Fase 4; mulai cari sekarang, T-13) · P-6 sumber teks & lisensi (rilis Fase 1, T-10)
- **Sudah dijawab:** P-1 → repo **publik sementara** (2026-10-15, `alfariesh/surau`): kuota menit CI privat habis; kembali privat setelah tahap uji. Risiko lisensi HeroUI Pro diterima pemilik (ADR-025)
- **Dijawab di S04:** P-3/T-08 → palet **Zaitun** + Noto Naskh Arabic (ADR-027)
- **Dipakai usulan bila tidak dijawab:** P-4 anggaran $20/bln · P-7 retensi data
- **Gerbang sisipan berikutnya:** tidak ada yang terbuka. X01 selesai 2026-10-16 (ADR-030). `cacheComponents` menunggu rilis PR OpenNext #1318 (dicek 2026-10-16: belum); Next 16.5 lewat sesi sisipan baru setelah OpenNext mendukung

## Sudah bisa dicoba

- https://surau-web.alfarieshsalman.workers.dev: situs Surau (Beranda, Tentang, 404; terang/gelap) online di Cloudflare; setiap merge ke `main` otomatis ter-deploy.
- `pnpm dev` → http://localhost:3004: situs Surau lokal. `pnpm --filter @surau/web preview` → http://localhost:3005 (versi Workers lokal).
- `pnpm test:e2e`: smoke + cek aksesibilitas (Playwright, chromium desktop & ponsel); juga berjalan otomatis di setiap preview PR.
- `pnpm verify` → format, lint, cek tipe, tes (dengan cakupan), dan build sekaligus.
- `pnpm run db:migrate:local` → DB D1 lokal (korpus + app) dengan skema v1 di `.wrangler/state`. `pnpm exec vp test --project db` → 46 tes DB di runtime Workers lokal. DB Cloudflare: `surau-corpus-staging`, `surau-app`, `surau-app-staging` (apac, sudah bertabel, masih kosong).
- `pnpm bench:text` → kecepatan normalisasi teks Arab (±0,5 dtk per 5 juta karakter). `/api/version` di situs → versi aturan normalisasi (`normVersion`).
- https://github.com/alfariesh/surau (publik): setiap PR otomatis dicek CI (±1 menit) dan mendapat link preview (`pr-<nomor>-surau-web…workers.dev`) di komentar; Dependabot mengusulkan pembaruan tiap Senin.

## Perhatian (risiko aktif)

- **Versi Next:** Next 16.4.1 + OpenNext 1.20.12 (ADR-030). Larangan ADR-003 tetap (tanpa `cacheComponents`, Server Actions, middleware, optimasi gambar).
- **Lisensi HeroUI Pro** melarang publikasi komponen dan template Pro, tetapi repo sudah publik atas keputusan pemilik (ADR-025). Disarankan tetap kirim email izin ke HeroUI (lampiran TUGAS-PEMILIK); bila ditegur, beralih ke HeroUI OSS.
- **`main` terlindungi:** hanya bisa diubah lewat PR yang lolos CI `verify`, tanpa force-push (ADR-025). PR dari fork butuh persetujuan pemilik sebelum CI berjalan; jangan setujui PR fork yang mengubah `.github/`.
- **Lisensi teks:** Shamela tidak memberi hak pakai ulang, jadi dipakai rantai lisensi OpenITI (ADR-018).
- **Vite+ masih baru** (1.0 pada 28 Sep 2026). Spike S01 lolos (check, lint, type-check apps/web, test, staged); cadangan Biome tidak dipakai (ADR-023).
- **Advisory:** 3 advisory Next (673q, 2464, p3m5) ditambal di 16.4.1. Tambalan React RSC (xqc2, h3gv) di salinan React bawaan Next baru **indikasi** (ADR-030 poin 4), jadi larangan typed array dari Server Component (ADR-023) tetap wajib.

## Progres

| Fase | Sesi | Judul | Status | Catatan |
|---|---|---|---|---|
| – | S00 | Review dokumen & setup agent | selesai | 2026-10-15 |
| 0 | S01 | Monorepo & toolchain | selesai* | 2026-10-15 · *vite-plus 1.2.0 tertunda (ADR-023) · di `main` |
| 0 | S02 | GitHub & CI | selesai | 2026-10-15 · PR #1 · di `main` · repo publik + proteksi `main` (ADR-025) |
| 0 | S03 | Deploy ke Cloudflare | selesai | 2026-10-15 · PR #4 · di `main` · workers.dev, preview per PR (ADR-026) |
| 0 | S04 | Identitas & fondasi UI | selesai | 2026-10-15 · PR #7 · palet Zaitun (ADR-027) · lalu `/rilis 0` |
| 1 | S05 | Paket teks Arab | selesai | 2026-10-15 · `@surau/text`, NORM_VERSION 1 (ADR-028) |
| 1 | S06 | Skema data & D1 | selesai | 2026-10-15 · `@surau/db`, 3 DB D1 apac, ID & permalink (ADR-029) |
| 1 | S07 | Importer Ihya | belum | butuh T-09 |
| 1 | S08 | Core tools baca | belum | |
| 1 | S09 | UI pembaca | belum | |
| 1 | S10 | Korpus produksi & QA | belum | butuh T-09, T-10, T-15 · lalu `/rilis 1` |
| 2 | S11 | Indeks FTS Arab | belum | butuh T-09 |
| 2 | S12 | Ayat & terjemahan Kemenag | belum | butuh T-09, T-16 |
| 2 | S13 | Batch terjemahan & ringkasan | belum | butuh T-09, T-11, T-17 + persetujuan biaya |
| 2 | S14 | Cari Indonesia + UI | belum | butuh T-09 (bila korpus dibangun ulang) |
| 2 | S15 | Eval retrieval | belum | butuh T-12 · lalu `/rilis 2` |
| 3 | S16 | Worker MCP | belum | garis besar · butuh T-07, T-19 |
| 3 | S17 | Dokumentasi & rilis MCP | belum | garis besar · butuh T-18 · lalu `/rilis 3` |
| 4 | S18 | Eval Jawab & tinjau | belum | garis besar · butuh T-13, T-14 (Access), P-7 |
| 4 | S19 | Pipeline Jawab | belum | garis besar · butuh T-11, T-14 (AI Gateway) |
| 4 | S20 | Pengaman biaya | belum | garis besar · butuh T-14, P-4, P-7 (T-20 opsional) |
| 4 | S21 | UI Tanya & transparansi | belum | garis besar · lalu `/rilis 4` |
| 5–7 | – | Ruang al-Ghazali, Wiki, Kurikulum | belum | dirinci saat Fase 4 hampir selesai |
| sisipan | X01 | Upgrade Next 16.4 + React 19.3 | selesai* | 2026-10-16 · PR #13 · Next 16.4.1, React 19.3.1, OpenNext 1.20.12 (ADR-030) · *log Preview tidak terbaca agent; log produksi setelah merge bersih (6 event ok, 0 error) |
