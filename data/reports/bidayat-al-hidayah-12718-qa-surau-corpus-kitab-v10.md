# QA otomatis korpus D1: Bidayat al-Hidayah (Shamela 12718)

> Dibuat oleh `pnpm run corpus:qa` (S10, `tools/ingest/src/qa.ts`). Tanpa teks kitab: hanya ID, jumlah, byte, dan sha256.

- DB: `surau-corpus-kitab-v10` (`6a051588-755e-4a66-af82-d50583f5d510`) · korpus `kitab-v10` · built_at 2026-11-27T07:01:19.000Z · schema 10 · NORM_VERSION 2
- Pembanding: sumber Shamela `sha256:c41459f5c9a2f42354ba4fede121e5db5ddccdf94e1132db9805b35c568956ca` diparse ulang oleh pipeline ingest pada commit `98db6b3` (pembersihan deterministik `@surau/text`, peta ID `data/ids/bidayat-al-hidayah-12718.json`).
- Sampel: 30 dari 46 halaman, acak dengan seed **12718** (mulberry32, Fisher–Yates parsial atas page.id terurut).
- Diperiksa per halaman: baris `page` (juz, halaman, `source_page_id`), setiap paragraf (id, jenis, urutan, node daftar isi, `text_raw` **byte demi byte** UTF-8), `footnote_ref` (offset, penanda, paragraf tujuan), dan `passage_needs_review`.
- Diperiksa sekali per korpus: `meta` (kecuali `built_at`), `author`, `work`, `edition` (termasuk lisensi dan kalimat atribusi), dan 38 node daftar isi yang dirujuk paragraf sampel (judul Arab byte demi byte).
- Dijalankan: 2026-11-27

## Hasil: 30/30 halaman cocok · baris korpus cocok

| # | Juz | Hal. | page.id | Shamela | Badan | Cat. kaki | Penanda | Ditinjau | Byte | sha256 (12) | Hasil |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 25 | 200001 | 1 | 4 | 0 | 0 | 0 | 1671 | `7746c977dbec` | ✓ |
| 2 | 1 | 26 | 200002 | 2 | 7 | 0 | 0 | 0 | 2981 | `c2f0c40141eb` | ✓ |
| 3 | 1 | 28 | 200004 | 4 | 7 | 0 | 0 | 0 | 2197 | `de8b4a434f82` | ✓ |
| 4 | 1 | 30 | 200006 | 6 | 9 | 0 | 0 | 0 | 2477 | `eb8021b28879` | ✓ |
| 5 | 1 | 31 | 200007 | 7 | 8 | 0 | 0 | 0 | 2865 | `f18a116fd450` | ✓ |
| 6 | 1 | 32 | 200008 | 8 | 9 | 0 | 0 | 0 | 3286 | `9dba5ac4327e` | ✓ |
| 7 | 1 | 34 | 200010 | 10 | 11 | 0 | 0 | 0 | 2759 | `457a884823d1` | ✓ |
| 8 | 1 | 35 | 200011 | 11 | 2 | 0 | 0 | 0 | 3517 | `d0b98a523e38` | ✓ |
| 9 | 1 | 36 | 200012 | 12 | 7 | 0 | 0 | 0 | 3671 | `0879ccb5e9bc` | ✓ |
| 10 | 1 | 42 | 200018 | 18 | 10 | 0 | 0 | 0 | 2662 | `7a9473d99943` | ✓ |
| 11 | 1 | 43 | 200019 | 19 | 9 | 0 | 0 | 0 | 2980 | `e696171d3c40` | ✓ |
| 12 | 1 | 44 | 200020 | 20 | 9 | 0 | 0 | 0 | 2975 | `354c917f520b` | ✓ |
| 13 | 1 | 46 | 200022 | 22 | 8 | 0 | 0 | 0 | 3465 | `846801b4e614` | ✓ |
| 14 | 1 | 47 | 200023 | 23 | 9 | 0 | 0 | 0 | 2728 | `98fc834dd875` | ✓ |
| 15 | 1 | 49 | 200025 | 25 | 8 | 0 | 0 | 0 | 3722 | `4b1ad9f02283` | ✓ |
| 16 | 1 | 50 | 200026 | 26 | 8 | 0 | 0 | 0 | 2974 | `5c5c92406516` | ✓ |
| 17 | 1 | 51 | 200027 | 27 | 8 | 0 | 0 | 0 | 2607 | `b13f3afa7eae` | ✓ |
| 18 | 1 | 53 | 200029 | 29 | 13 | 0 | 0 | 0 | 2884 | `98ba90ff38d9` | ✓ |
| 19 | 1 | 54 | 200030 | 30 | 7 | 0 | 0 | 0 | 3081 | `f8c803d4f5ce` | ✓ |
| 20 | 1 | 55 | 200031 | 31 | 10 | 0 | 0 | 0 | 3095 | `2e03abaaa08d` | ✓ |
| 21 | 1 | 57 | 200033 | 33 | 8 | 0 | 0 | 0 | 2869 | `e73d49d1b061` | ✓ |
| 22 | 1 | 58 | 200034 | 34 | 7 | 0 | 0 | 0 | 3038 | `3e365f7b4541` | ✓ |
| 23 | 1 | 60 | 200036 | 36 | 8 | 0 | 0 | 0 | 3911 | `c5fcfca17fdc` | ✓ |
| 24 | 1 | 61 | 200037 | 37 | 1 | 0 | 0 | 0 | 1834 | `687f600c182d` | ✓ |
| 25 | 1 | 62 | 200038 | 38 | 4 | 0 | 0 | 0 | 5734 | `b20e4f9fafef` | ✓ |
| 26 | 1 | 63 | 200039 | 39 | 10 | 0 | 0 | 0 | 2809 | `a161f26dc272` | ✓ |
| 27 | 1 | 65 | 200041 | 41 | 22 | 0 | 0 | 0 | 3782 | `df914361e725` | ✓ |
| 28 | 1 | 68 | 200044 | 44 | 8 | 0 | 0 | 0 | 3546 | `da6aba7aff43` | ✓ |
| 29 | 1 | 69 | 200045 | 45 | 20 | 0 | 0 | 0 | 3630 | `c69242fd70c0` | ✓ |
| 30 | 1 | 70 | 200046 | 46 | 5 | 0 | 0 | 0 | 2773 | `a42e08db3555` | ✓ |
