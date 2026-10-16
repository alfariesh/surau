# Laporan verify-openiti: Ihya' 'Ulum ad-Din (Shamela 9472)

> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest ihya` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.

- OpenITI rilis 2025.1.9, repo `OpenITI/0525AH` commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e`.
- Matan: `0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed` (sha256 `e60d73c72033e5ca1be5ac3bf52f5fa5057aa4a3d1c750f26b9301b6b97e8997`, cocok).
- Takhrij: `0505Ghazali.IhyaCulumDin.JK000001-ara1` (sha256 `0780031c3e4a55b65bdf45d7cca890869757cbedaa46a21273e9378428466018`, cocok).
- Pembanding: teks badan halaman Shamela (sebelum takhrij `//` dipisah) vs teks halaman OpenITI yang sama (penanda `PageVxxPyyy` di akhir halaman), keduanya `normalizeArabic` (NORM_VERSION 1). Kemiripan = 2·LCS token / (jumlah token kedua sisi).

## Gerbang matan

**LOLOS**: 1.705 dari 1.706 halaman ≥0,95 (gerbang ≥1.705).

- Sebaran kemiripan: min 0,535 · p1 1,000 · median 1,000.
- Halaman di bawah ambang: j3 h116 (0,535).
- Halaman Shamela tanpa pasangan di OpenITI: 0.

## Takhrij vs JK000001

Setiap catatan kaki (termasuk takhrij menempel yang dipotong dari badan) dicocokkan dengan segmen takhrij JK000001 di halaman yang sama (potongan di antara ` + ` yang dibuka "حديث" atau menyebut sumbernya). Skor = bagian bigram token catatan yang ada di satu segmen. Skor <0,6, atau catatan kurang dari 3 token, ditandai `takhrij_unmatched`.

- 4.398 catatan; **4.208 cocok**, **190 ditandai `takhrij_unmatched`**.
- Di antaranya 194 takhrij menempel: 174 cocok, 20 tidak.

| Skor | Catatan |
|---|---|
| 0,0–0,1 | 49 |
| 0,1–0,2 | 30 |
| 0,2–0,3 | 31 |
| 0,3–0,4 | 28 |
| 0,4–0,5 | 26 |
| 0,5–0,6 | 26 |
| 0,6–0,7 | 21 |
| 0,7–0,8 | 14 |
| 0,8–0,9 | 22 |
| 0,9–1,0 | 4.151 |
