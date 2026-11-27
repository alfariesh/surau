# Laporan verify-openiti: al-Ajurrumiyyah (Shamela 11371)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0725AH` commit `1c14df8ff4ca37622d678a3a7e76f915848f3f88`.
- Matan: `0723IbnAjrum.Ajrumiyya.Shamela0011371-ara1` (sha256 `1929acb67f85a0812d297fba9009bf570581ab46888f83ff97f0170043ea4020`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 19 dari 19 halaman ≥0,95 (gerbang ≥19).

- Sebaran kemiripan: min 1,000 · p1 1,000 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
