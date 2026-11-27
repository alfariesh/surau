# Laporan verify-openiti: at-Tibyan fi Adab Hamalat al-Qur'an (Shamela 1969)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest korpus` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0700AH` commit `6dca5e250b9e4405b93c4a5e73cfffdef5d7fef7`.
- Matan: `0676Nawawi.Tibyan.Shamela0001969-ara1` (sha256 `075cd037b0a57f30be4207118a7685281c08525d5ec99ab5ab4dfed5080ead7f`, cocok).
- Takhrij: tidak ada versi pembanding; catatan kaki tidak dinilai.
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 2). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 224 dari 224 halaman ≥0,95 (gerbang ≥224).

- Sebaran kemiripan: min 0,989 · p1 1,000 · median 1,000.
- Halaman di bawah ambang: –.
- Halaman Shamela tanpa pasangan di OpenITI: 0.
