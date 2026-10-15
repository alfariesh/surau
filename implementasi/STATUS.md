# Status Implementasi

> Diperbarui: 2026-10-15 · oleh agent, S01 terblokir (menunggu aplikasi Claude dibuka ulang, T-02)
> Agent: bagian *Sekarang* sampai sebelum *Progres* otomatis disuntikkan ke setiap sesi baru. Jaga tetap ringkas (≤35 baris).

## Sekarang

- **Mulai di sini (pemilik):** tutup aplikasi Claude sepenuhnya (**Cmd+Q**), buka lagi, lalu ketik **`/sesi`** di percakapan baru. T-00 dan T-01 sudah selesai; T-02 sudah benar di Terminal, tetapi aplikasi Claude masih membawa Node 22 dari sebelum T-02.
- **Fase:** 0 · Fondasi (belum dimulai)
- **Sesi berikutnya:** **S01 · Monorepo & toolchain** → [sesi/S01-monorepo-toolchain.md](sesi/S01-monorepo-toolchain.md)
- **MENUNGGU PEMILIK (memblokir S01):** T-02 langkah 2: buka ulang aplikasi Claude (Cmd+Q) supaya `node -v` di shell agent = v24
- **Wajib dijawab pemilik:** P-2 domain (S03) · P-5 ustadz (rilis Fase 4; mulai cari sekarang, T-13) · P-6 sumber teks & lisensi (rilis Fase 1, T-10)
- **Dipakai usulan bila tidak dijawab:** P-1 repo privat · P-3 font Noto Naskh · P-4 anggaran $20/bln · P-7 retensi data
- **Gerbang X01 (Next 16.4):** belum terpenuhi · terakhir dicek 2026-10-15

## Sudah bisa dicoba

- Belum ada aplikasi yang berjalan. Yang tersedia: dokumen produk (`docs/`), rencana implementasi (`implementasi/`), dan setup agent (`CLAUDE.md`, `.claude/`).

## Perhatian (risiko aktif)

- **Gerbang versi Next:** OpenNext 1.20.11 belum mendukung Next 16.4 (perkiraan patch akhir Okt 2026). Surau memakai Next 16.3.8 + mitigasi; upgrade lewat sesi sisipan X01 (ADR-003).
- **Lisensi HeroUI Pro** melarang publikasi komponen dan template Pro. Repo privat sampai ada izin (ADR-004, P-1).
- **Lisensi teks:** Shamela tidak memberi hak pakai ulang, jadi dipakai rantai lisensi OpenITI (ADR-018).
- **Vite+ masih baru** (1.0 pada 28 Sep 2026). S01 adalah spike; cadangannya Biome (ADR-008).
- Template `web/` memakai Next 16.3.4 yang **rentan** (CVE RCE `next/og`). Jangan di-deploy sebelum S01 meng-upgrade.

## Progres

| Fase | Sesi | Judul | Status | Catatan |
|---|---|---|---|---|
| – | S00 | Review dokumen & setup agent | selesai | 2026-10-15 |
| 0 | S01 | Monorepo & toolchain | terblokir | T-00, T-01 selesai · menunggu T-02 (buka ulang app) |
| 0 | S02 | GitHub & CI | belum | butuh T-03 (P-1), T-04 |
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
