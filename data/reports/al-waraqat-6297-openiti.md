# Laporan verify-openiti: al-Waraqat (Shamela 6297)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0500AH` commit `fff9e21790e2e54f14826322ae49ab7671f12744`.
- Matan: `0478ImamHaramaynJuwayni.Waraqat.Shamela0006297-ara1` (sha256 `1d7f55f4193d849e4d385d2f3359ddb3e500b08e41ed9940102a8d861118e68e`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 25 dari 25 halaman ≥0,95 (gerbang ≥25).

- Sebaran kemiripan: min 0,979 · p1 0,979 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
