# Laporan verify-openiti: Rusum Dar al-Khilafah (Shamela 8173)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0450AH` commit `e344cfe20a206c9ded3edfa15d45b4f821a97b8a`.
- Matan: `0448HilalSabi.RusumDarKhilafa.Shamela0008173-ara1` (sha256 `92a822726431d70a364750d07a70e3a2b433c00baec2c54f3fadec67ec0667b4`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 140 dari 140 halaman ≥0,95 (gerbang ≥140).

- Sebaran kemiripan: min 0,973 · p1 1,000 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
