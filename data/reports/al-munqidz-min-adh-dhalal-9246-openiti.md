# Laporan verify-openiti: al-Munqidz min adh-Dhalal (Shamela 9246)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0525AH` commit `6290621b58e063ed1aa47ffd0a6fc1630191e7cb`.
- Matan: `0505Ghazali.Munqidh.Shamela0009246-ara1` (sha256 `a9d2ea465cb311b05d0a263035ea51b877f0bd7dc0a53e247531481377b0695a`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 92 dari 93 halaman ≥0,95 (gerbang ≥92).

- Sebaran kemiripan: min 0,897 · p1 0,897 · median 1,000.
- Halaman di bawah ambang: j1 h128 (0,897; 28 token Shamela, 30 token OpenITI; 93% token Shamela termuat berurutan di OpenITI).
- Halaman Shamela tanpa pasangan di OpenITI: 0.
