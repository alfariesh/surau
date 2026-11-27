# Laporan verify-openiti: al-Muqaddimah al-Hadhramiyyah (Shamela 6125)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0925AH` commit `4f0f4562d1e13083c593e3a0ca6a19a3eb33805e`.
- Matan: `0918BafadlHadrami.MuqaddimaHadramiyya.Shamela0006125-ara1` (sha256 `1f2dee98e31f7a2df79c40b3f7990389e6030fd94fc4eb1a3e9d27536cb27149`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 142 dari 142 halaman ≥0,95 (gerbang ≥142).

- Sebaran kemiripan: min 1,000 · p1 1,000 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
