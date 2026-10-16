# QA otomatis korpus D1: Ihya' 'Ulum ad-Din (Shamela 9472)

> Dibuat oleh `pnpm run corpus:qa` (S10, `tools/ingest/src/qa.ts`). Tanpa teks kitab: hanya ID, jumlah, byte, dan sha256.

- DB: `surau-corpus-ihya-v1` (`41e3033e-3aa0-456c-9d60-b8967f57e89d`) · korpus `ihya-v1` · built_at 2026-10-16T12:55:55.000Z · schema 3 · NORM_VERSION 1
- Pembanding: sumber Shamela `sha256:36e66c5498b74e6d4fd7542108a29327361cf45534794d1c5a878e7bc2b7d586` diparse ulang oleh pipeline ingest pada commit `9a5981a` (pembersihan deterministik `@surau/text`, peta ID `data/ids/ihya-9472.json`).
- Sampel: 30 dari 1706 halaman, acak dengan seed **9472** (mulberry32, Fisher–Yates parsial atas page.id terurut).
- Diperiksa per halaman: baris `page` (juz, halaman, `source_page_id`), setiap paragraf (id, jenis, urutan, node daftar isi, `text_raw` **byte demi byte** UTF-8), `footnote_ref` (offset, penanda, paragraf tujuan), dan `passage_needs_review`.
- Diperiksa sekali per korpus: `meta` (kecuali `built_at`), `author`, `work`, `edition` (termasuk lisensi dan kalimat atribusi), dan 25 node daftar isi yang dirujuk paragraf sampel (judul Arab byte demi byte).
- Dijalankan: 2026-10-16

## Hasil: 30/30 halaman cocok · baris korpus cocok

| # | Juz | Hal. | page.id | Shamela | Badan | Cat. kaki | Penanda | Ditinjau | Byte | sha256 (12) | Hasil |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 113 | 100113 | 113 | 9 | 3 | 3 | 0 | 5840 | `e0b65973447c` | ✓ |
| 2 | 1 | 140 | 100140 | 140 | 19 | 5 | 5 | 0 | 5751 | `6e9ad01d5189` | ✓ |
| 3 | 1 | 170 | 100170 | 170 | 16 | 1 | 1 | 0 | 5935 | `9d42401a95a0` | ✓ |
| 4 | 1 | 241 | 100241 | 241 | 10 | 3 | 3 | 0 | 5256 | `b8ef6351447d` | ✓ |
| 5 | 1 | 273 | 100273 | 273 | 17 | 11 | 11 | 0 | 6156 | `2419fd5e9f00` | ✓ |
| 6 | 1 | 320 | 100320 | 320 | 1 | 12 | 12 | 0 | 7232 | `cacd781b53f0` | ✓ |
| 7 | 2 | 108 | 100468 | 468 | 8 | 0 | 0 | 0 | 5613 | `e33d8851b803` | ✓ |
| 8 | 2 | 204 | 100564 | 564 | 15 | 13 | 13 | 0 | 7214 | `13da8d3626f5` | ✓ |
| 9 | 2 | 210 | 100570 | 570 | 25 | 9 | 9 | 0 | 6669 | `23b0d8162bf4` | ✓ |
| 10 | 2 | 265 | 100625 | 625 | 27 | 3 | 3 | 0 | 5079 | `f2ab60de3284` | ✓ |
| 11 | 2 | 304 | 100664 | 664 | 23 | 2 | 2 | 0 | 5573 | `5497441b69cd` | ✓ |
| 12 | 2 | 341 | 100701 | 701 | 16 | 1 | 1 | 0 | 5926 | `90cec8d15e74` | ✓ |
| 13 | 3 | 47 | 100793 | 793 | 3 | 0 | 0 | 0 | 5588 | `ccca0b530cc0` | ✓ |
| 14 | 3 | 91 | 100837 | 837 | 5 | 4 | 3 | 3 | 5400 | `ab938a530bf2` | ✓ |
| 15 | 3 | 107 | 100853 | 853 | 6 | 0 | 0 | 0 | 4843 | `66ef45ad7a00` | ✓ |
| 16 | 3 | 144 | 100890 | 890 | 5 | 6 | 1 | 6 | 5811 | `8ec2cdc173c8` | ✓ |
| 17 | 3 | 147 | 100893 | 893 | 12 | 0 | 0 | 0 | 4786 | `2054e7c83cd0` | ✓ |
| 18 | 3 | 148 | 100894 | 894 | 5 | 3 | 3 | 0 | 6552 | `1c6a0d9b5008` | ✓ |
| 19 | 3 | 166 | 100912 | 912 | 11 | 0 | 0 | 0 | 5943 | `c9ef1a90aa15` | ✓ |
| 20 | 3 | 193 | 100939 | 939 | 8 | 1 | 1 | 0 | 5159 | `197349b73deb` | ✓ |
| 21 | 3 | 263 | 101009 | 1009 | 13 | 0 | 0 | 0 | 4715 | `c0761d6f951f` | ✓ |
| 22 | 3 | 275 | 101021 | 1021 | 10 | 1 | 0 | 2 | 5523 | `6310e8fa1b76` | ✓ |
| 23 | 3 | 360 | 101106 | 1106 | 6 | 1 | 1 | 0 | 6960 | `9dff68501cef` | ✓ |
| 24 | 3 | 364 | 101110 | 1110 | 10 | 0 | 0 | 0 | 5215 | `363815fb875b` | ✓ |
| 25 | 3 | 409 | 101155 | 1155 | 7 | 0 | 0 | 0 | 8298 | `65a08cf3c9e2` | ✓ |
| 26 | 4 | 230 | 101389 | 1389 | 6 | 0 | 0 | 0 | 5305 | `631903bfe912` | ✓ |
| 27 | 4 | 234 | 101393 | 1393 | 11 | 5 | 5 | 0 | 5826 | `52df7b6b055a` | ✓ |
| 28 | 4 | 276 | 101435 | 1435 | 4 | 0 | 0 | 0 | 5466 | `67e0086b9ef6` | ✓ |
| 29 | 4 | 336 | 101495 | 1495 | 14 | 0 | 0 | 0 | 4657 | `03542f6192d2` | ✓ |
| 30 | 4 | 480 | 101639 | 1639 | 9 | 0 | 0 | 0 | 5202 | `9df635fa57af` | ✓ |
