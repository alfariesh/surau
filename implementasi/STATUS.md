# Status Implementasi

> Diperbarui: 2026-10-15 · oleh agent, S02 selesai dan sudah digabung ke `main` (PR #1)
> Agent: bagian *Sekarang* sampai sebelum *Progres* otomatis disuntikkan ke setiap sesi baru. Jaga tetap ringkas (≤35 baris).

## Sekarang

- **Mulai di sini (pemilik):** kerjakan **T-05** dan **T-06** (Cloudflare), buka percakapan baru, dan ketik **`/sesi`** untuk S03.
- **Fase:** 0 · Fondasi (S01 selesai dengan 1 butir tertunda, S02 selesai)
- **Sesi berikutnya:** **S03 · Deploy ke Cloudflare** → [sesi/S03-deploy-cloudflare.md](sesi/S03-deploy-cloudflare.md)
- **Tindak lanjut kecil (awal S03; belum bisa di S02 karena belum 24 jam):** naikkan catalog `vite-plus` → 1.2.0 (boleh mulai 15 Okt 16:21 WIB) dan `react`/`react-dom` → 19.2.9 (mulai 15 Okt 23:54 WIB), lalu `pnpm verify` dan centang butir S01 yang tertunda (ADR-023)
- **Wajib dijawab pemilik:** P-2 domain (S03) · P-5 ustadz (rilis Fase 4; mulai cari sekarang, T-13) · P-6 sumber teks & lisensi (rilis Fase 1, T-10)
- **Sudah dijawab:** P-1 repo privat (2026-10-15, `alfariesh/surau`)
- **Dipakai usulan bila tidak dijawab:** P-3 font Noto Naskh · P-4 anggaran $20/bln · P-7 retensi data
- **Gerbang X01 (Next 16.4):** belum terpenuhi (OpenNext 1.20.11 belum menyebut dukungan 16.4) · terakhir dicek 2026-10-15

## Sudah bisa dicoba

- `pnpm dev` → http://localhost:3004: template chat HeroUI Pro (belum bertema Surau) berjalan di monorepo baru.
- `pnpm verify` → format, lint, cek tipe, tes, dan build sekaligus.
- https://github.com/alfariesh/surau (privat): setiap PR otomatis dicek CI (±1 menit); Dependabot mengusulkan pembaruan tiap Senin.

## Perhatian (risiko aktif)

- **Gerbang versi Next:** OpenNext 1.20.11 belum mendukung Next 16.4 (perkiraan patch akhir Okt 2026). Surau memakai Next 16.3.8 + mitigasi; upgrade lewat sesi sisipan X01 (ADR-003).
- **Lisensi HeroUI Pro** melarang publikasi komponen dan template Pro. Repo privat sampai ada izin (ADR-004, P-1).
- **`main` tanpa proteksi server-side** (akun GitHub Free + repo privat → HTTP 403). Pengamannya CI + merge hanya dengan izin pemilik (ADR-024).
- **Lisensi teks:** Shamela tidak memberi hak pakai ulang, jadi dipakai rantai lisensi OpenITI (ADR-018).
- **Vite+ masih baru** (1.0 pada 28 Sep 2026). Spike S01 lolos (check, lint, type-check apps/web, test, staged); cadangan Biome tidak dipakai (ADR-023).
- **Advisory Next 16.3.8:** 3 kritis/tinggi di Next + 1 kritis di React RSC, semuanya ditambal di Next 16.4.1. Dimitigasi dengan larangan ADR-003 (tanpa `use cache`, Server Actions, optimasi gambar) dan larangan typed array dari Server Component (ADR-023). Kerjakan X01 sebelum `/rilis 0` bila gerbangnya terbuka.

## Progres

| Fase | Sesi | Judul | Status | Catatan |
|---|---|---|---|---|
| – | S00 | Review dokumen & setup agent | selesai | 2026-10-15 |
| 0 | S01 | Monorepo & toolchain | selesai* | 2026-10-15 · *vite-plus 1.2.0 tertunda (ADR-023) · di `main` |
| 0 | S02 | GitHub & CI | selesai | 2026-10-15 · PR #1 · tanpa proteksi branch (ADR-024) · di `main` |
| 0 | S03 | Deploy ke Cloudflare | belum | butuh T-05, T-06 (T-07 opsional) |
| 0 | S04 | Identitas & fondasi UI | belum | butuh T-08 · lalu `/rilis 0` |
| 1 | S05 | Paket teks Arab | belum | |
| 1 | S06 | Skema data & D1 | belum | |
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
| sisipan | X01 | Upgrade Next 16.4 + React 19.3 | menunggu gerbang | setelah OpenNext mendukung 16.4 (cek mingguan) |
