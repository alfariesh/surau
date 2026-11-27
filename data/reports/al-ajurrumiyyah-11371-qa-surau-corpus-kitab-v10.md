# QA otomatis korpus D1: al-Ajurrumiyyah (Shamela 11371)

> Dibuat oleh `pnpm run corpus:qa` (S10, `tools/ingest/src/qa.ts`). Tanpa teks kitab: hanya ID, jumlah, byte, dan sha256.

- DB: `surau-corpus-kitab-v10` (`6a051588-755e-4a66-af82-d50583f5d510`) · korpus `kitab-v10` · built_at 2026-11-27T07:01:19.000Z · schema 10 · NORM_VERSION 2
- Pembanding: sumber Shamela `sha256:c4ac77d505163ba2c5484e77521193a0b6b1c72da5c4ab08e42461087013621e` diparse ulang oleh pipeline ingest pada commit `98db6b3` (pembersihan deterministik `@surau/text`, peta ID `data/ids/al-ajurrumiyyah-11371.json`).
- Sampel: 19 dari 19 halaman, acak dengan seed **11371** (mulberry32, Fisher–Yates parsial atas page.id terurut).
- Diperiksa per halaman: baris `page` (juz, halaman, `source_page_id`), setiap paragraf (id, jenis, urutan, node daftar isi, `text_raw` **byte demi byte** UTF-8), `footnote_ref` (offset, penanda, paragraf tujuan), dan `passage_needs_review`.
- Diperiksa sekali per korpus: `meta` (kecuali `built_at`), `author`, `work`, `edition` (termasuk lisensi dan kalimat atribusi), dan 25 node daftar isi yang dirujuk paragraf sampel (judul Arab byte demi byte).
- Dijalankan: 2026-11-27

## Hasil: 19/19 halaman cocok · baris korpus cocok

| # | Juz | Hal. | page.id | Shamela | Badan | Cat. kaki | Penanda | Ditinjau | Byte | sha256 (12) | Hasil |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 5 | 400001 | 1 | 8 | 0 | 0 | 0 | 803 | `10a4343b6aa2` | ✓ |
| 2 | 1 | 6 | 400002 | 2 | 9 | 0 | 0 | 0 | 1361 | `5ce2d274df70` | ✓ |
| 3 | 1 | 7 | 400003 | 4 | 11 | 0 | 0 | 0 | 1418 | `58de99c14a45` | ✓ |
| 4 | 1 | 8 | 400004 | 5 | 6 | 0 | 0 | 0 | 752 | `b5fb26814b00` | ✓ |
| 5 | 1 | 9 | 400005 | 6 | 7 | 0 | 0 | 0 | 1193 | `89a83f084e3d` | ✓ |
| 6 | 1 | 10 | 400006 | 7 | 7 | 0 | 0 | 0 | 1080 | `4632cfaf18c0` | ✓ |
| 7 | 1 | 11 | 400007 | 8 | 8 | 0 | 0 | 0 | 1489 | `26136a57be75` | ✓ |
| 8 | 1 | 12 | 400008 | 10 | 8 | 0 | 0 | 0 | 1263 | `2f105d3c06fd` | ✓ |
| 9 | 1 | 13 | 400009 | 12 | 8 | 0 | 0 | 0 | 1447 | `10101cd0692e` | ✓ |
| 10 | 1 | 14 | 400010 | 14 | 6 | 0 | 0 | 0 | 1933 | `6de27ec72600` | ✓ |
| 11 | 1 | 15 | 400011 | 16 | 7 | 0 | 0 | 0 | 1109 | `9e14176c274e` | ✓ |
| 12 | 1 | 16 | 400012 | 18 | 7 | 0 | 0 | 0 | 1189 | `2ec62c22351f` | ✓ |
| 13 | 1 | 17 | 400013 | 20 | 7 | 0 | 0 | 0 | 914 | `7f8b0d715552` | ✓ |
| 14 | 1 | 18 | 400014 | 21 | 7 | 0 | 0 | 0 | 1239 | `557ff91ed1db` | ✓ |
| 15 | 1 | 19 | 400015 | 23 | 6 | 0 | 0 | 0 | 1059 | `ea05e648267a` | ✓ |
| 16 | 1 | 20 | 400016 | 25 | 7 | 0 | 0 | 0 | 1119 | `47429b837015` | ✓ |
| 17 | 1 | 21 | 400017 | 26 | 8 | 0 | 0 | 0 | 1081 | `f274964962f8` | ✓ |
| 18 | 1 | 22 | 400018 | 28 | 9 | 0 | 0 | 0 | 933 | `c6643f788473` | ✓ |
| 19 | 1 | 23 | 400019 | 31 | 3 | 0 | 0 | 0 | 732 | `133385ed0d6f` | ✓ |
