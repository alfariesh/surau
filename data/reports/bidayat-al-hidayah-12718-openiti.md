# Laporan verify-openiti: Bidayat al-Hidayah (Shamela 12718)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0525AH` commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e`.
- Matan: `0505Ghazali.BidayatHidaya.Shamela0012718-ara1` (sha256 `15f75e3f926f249e3301143dad2ac4313b086527ac8dbcdf3252486a1f077263`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 46 dari 46 halaman ≥0,95 (gerbang ≥46).

- Sebaran kemiripan: min 0,995 · p1 0,995 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
