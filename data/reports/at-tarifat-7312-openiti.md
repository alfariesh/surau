# Laporan verify-openiti: at-Ta'rifat (Shamela 7312)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0825AH` commit `2630748a4754b509908048087e569ccc8dd251ce`.
- Matan: `0816IbnMuhammadSharifJurjani.Tacrifat.Shamela0007312-ara1` (sha256 `7eb469f3a7d27785d456111e02456798dca66e9f256c7c01a2d207c6da19c3fe`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 257 dari 257 halaman ≥0,95 (gerbang ≥257).

- Sebaran kemiripan: min 1,000 · p1 1,000 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
