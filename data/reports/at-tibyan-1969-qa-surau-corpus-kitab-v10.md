# QA otomatis korpus D1: at-Tibyan fi Adab Hamalat al-Qur'an (Shamela 1969)

> Dibuat oleh `pnpm run corpus:qa` (S10, `tools/ingest/src/qa.ts`). Tanpa teks kitab: hanya ID, jumlah, byte, dan sha256.

- DB: `surau-corpus-kitab-v10` (`6a051588-755e-4a66-af82-d50583f5d510`) · korpus `kitab-v10` · built_at 2026-11-27T07:01:19.000Z · schema 10 · NORM_VERSION 2
- Pembanding: sumber Shamela `sha256:3455f0e5e215d9ef1621b606d7b4d89e1acfdfa67d747e83523d0ee14ba30124` diparse ulang oleh pipeline ingest pada commit `98db6b3` (pembersihan deterministik `@surau/text`, peta ID `data/ids/at-tibyan-1969.json`).
- Sampel: 30 dari 220 halaman, acak dengan seed **1969** (mulberry32, Fisher–Yates parsial atas page.id terurut).
- Diperiksa per halaman: baris `page` (juz, halaman, `source_page_id`), setiap paragraf (id, jenis, urutan, node daftar isi, `text_raw` **byte demi byte** UTF-8), `footnote_ref` (offset, penanda, paragraf tujuan), dan `passage_needs_review`.
- Diperiksa sekali per korpus: `meta` (kecuali `built_at`), `author`, `work`, `edition` (termasuk lisensi dan kalimat atribusi), dan 38 node daftar isi yang dirujuk paragraf sampel (judul Arab byte demi byte).
- Dijalankan: 2026-11-27

## Hasil: 30/30 halaman cocok · baris korpus cocok

| # | Juz | Hal. | page.id | Shamela | Badan | Cat. kaki | Penanda | Ditinjau | Byte | sha256 (12) | Hasil |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 16 | 300011 | 11 | 1 | 0 | 0 | 0 | 237 | `757e5ed7f0b7` | ✓ |
| 2 | 1 | 36 | 300031 | 31 | 2 | 0 | 0 | 0 | 978 | `085b13ae6806` | ✓ |
| 3 | 1 | 40 | 300035 | 35 | 2 | 0 | 0 | 0 | 1977 | `c8ab1dba1d1f` | ✓ |
| 4 | 1 | 50 | 300045 | 45 | 4 | 0 | 0 | 0 | 1773 | `3403ef955825` | ✓ |
| 5 | 1 | 57 | 300052 | 52 | 1 | 0 | 0 | 0 | 1380 | `8c61fe549900` | ✓ |
| 6 | 1 | 62 | 300057 | 57 | 1 | 0 | 0 | 0 | 905 | `2be0e5fad654` | ✓ |
| 7 | 1 | 68 | 300063 | 63 | 3 | 0 | 0 | 0 | 890 | `0a0825003c1d` | ✓ |
| 8 | 1 | 79 | 300074 | 74 | 3 | 0 | 0 | 0 | 1504 | `b4196ca19e7a` | ✓ |
| 9 | 1 | 92 | 300087 | 87 | 3 | 0 | 0 | 0 | 1449 | `2cf4abb1674f` | ✓ |
| 10 | 1 | 98 | 300093 | 93 | 4 | 0 | 0 | 0 | 1582 | `20887dcf7a94` | ✓ |
| 11 | 1 | 99 | 300094 | 94 | 1 | 0 | 0 | 0 | 1862 | `0c833e42cf1e` | ✓ |
| 12 | 1 | 108 | 300103 | 103 | 2 | 0 | 0 | 0 | 1211 | `0cd41c0b34e7` | ✓ |
| 13 | 1 | 113 | 300108 | 108 | 1 | 0 | 0 | 0 | 1305 | `60e53a0c253d` | ✓ |
| 14 | 1 | 114 | 300109 | 109 | 1 | 0 | 0 | 0 | 833 | `ee651970df1c` | ✓ |
| 15 | 1 | 122 | 300117 | 117 | 3 | 0 | 0 | 0 | 1254 | `4d6dd703e2f7` | ✓ |
| 16 | 1 | 132 | 300127 | 127 | 5 | 0 | 0 | 0 | 976 | `498864f44337` | ✓ |
| 17 | 1 | 135 | 300130 | 130 | 3 | 0 | 0 | 0 | 1454 | `f8598aa3829e` | ✓ |
| 18 | 1 | 142 | 300137 | 137 | 2 | 0 | 0 | 0 | 1292 | `e6c5106e4b58` | ✓ |
| 19 | 1 | 146 | 300141 | 141 | 7 | 0 | 0 | 0 | 1387 | `433d8f6e47ae` | ✓ |
| 20 | 1 | 150 | 300145 | 145 | 1 | 0 | 0 | 0 | 607 | `9b273989e5b9` | ✓ |
| 21 | 1 | 154 | 300149 | 149 | 1 | 0 | 0 | 0 | 7 | `45e273aea411` | ✓ |
| 22 | 1 | 158 | 300153 | 153 | 4 | 0 | 0 | 0 | 1572 | `5e1a00544ec1` | ✓ |
| 23 | 1 | 159 | 300154 | 154 | 2 | 0 | 0 | 0 | 1331 | `b70463f15367` | ✓ |
| 24 | 1 | 174 | 300169 | 169 | 2 | 0 | 0 | 0 | 1511 | `0f4988033f2a` | ✓ |
| 25 | 1 | 175 | 300170 | 170 | 1 | 0 | 0 | 0 | 60 | `235f00927c36` | ✓ |
| 26 | 1 | 186 | 300181 | 181 | 1 | 0 | 0 | 0 | 1660 | `a18566690ff6` | ✓ |
| 27 | 1 | 191 | 300186 | 186 | 4 | 0 | 0 | 0 | 1357 | `9f5662c872ff` | ✓ |
| 28 | 1 | 200 | 300195 | 195 | 5 | 0 | 0 | 0 | 504 | `a131331fffa1` | ✓ |
| 29 | 1 | 217 | 300212 | 212 | 9 | 0 | 0 | 0 | 753 | `31cf58200847` | ✓ |
| 30 | 1 | 221 | 300216 | 216 | 6 | 0 | 0 | 0 | 605 | `04c51a4ec1eb` | ✓ |
