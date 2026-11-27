# X32 · Gelombang 2: kitab dari daftar CSV pemilik

> **Fase:** Sisipan · **Status:** berjalan (2026-11-28): korpus `kitab-v11` (7 kitab) di staging dan siap promote; at-Ta'rifat dan Nihayat az-Zain menyusul di `kitab-v12`
> **Prasyarat:** X31 selesai (Gelombang 1 tayang, ADR-151)
> **Keputusan:** [ADR-152](../keputusan/ADR-152.md)
> **Izin pemilik (chat 2026-11-28):** "proses kitab dari shet tadi sampai max cost 90 usd. Pakai batch API … Pakai sonnet batch api untuk ingest, dan skip audio dulu", lalu "anda bebas melakuakn comand apapun. saya izinkan semnuanya".

## Tujuan

Menambah kitab dari tiga CSV pencocokan (`classics_db_match_report.csv`, `dkislamiyah_db_match_report.csv`, `hasil_pencarian_kitab.csv`) dengan cetakan X31: teks + QA OpenITI, terjemahan dan ringkasan AI (Sonnet 5.5, Message Batches), judul daftar isi Indonesia, Intisari Bab tiga lapis, `/lisensi`, dan tampil. Audio tidak.

## Definisi selesai per kitab

Sama dengan X31 (butir audio dikecualikan oleh izin pemilik).

## Kitab

| Kitab | Shamela | Karya/edisi | Halaman | OpenITI matan | Terjemahan | Intisari Bab | Status |
|---|---|---|---|---|---|---|---|
| al-Munqidz min adh-Dhalal (al-Ghazali) | 9246 | 5/5 | 93 | 92/93 (ADR-152 butir 5) | 201/203 | 10 | `kitab-v11` |
| al-Waraqat (al-Juwaini) | 6297 | 6/6 | 25 | 25/25 (penanda diisi, butir 3) | 108/108 | 20 | `kitab-v11` |
| Rusum Dar al-Khilafah (Hilal ash-Shabi') | 8173 | 9/9 | 140 | 140/140 | 326/326 | 21 | `kitab-v11` |
| al-Muqaddimah al-Hadhramiyyah (Bafadl) | 6125 | 7/7 | 142 | 142/142 | 379/381 | 6 | `kitab-v11` |
| at-Ta'rifat (al-Jurjani) | 7312 | 8/8 | 255 | 257/257 | batch berjalan | dikerjakan | `kitab-v12` |
| Nihayat az-Zain (Nawawi al-Bantani) | 6146 | 10/10 | 400 | fondasi dikerjakan | – | – | `kitab-v12` |

Ditunda: Mutammimah al-Ajurrumiyyah (nomor halaman Shamela "مرقم آليا", bukan cetakan); kitab tanpa versi OpenITI ber-ID sama.

## Catatan hasil

- **Temuan produksi:** prompt ringkasan dasar menyebut Ihya' dan al-Ghazali, sehingga ringkasan `kitab-v10` at-Tibyan menyebut al-Ghazali di 89 dari 119 ringkasan dan 26 ringkasan al-Ajurrumiyyah menyebut Ihya (satu berbunyi "Teks ini tampaknya bukan petikan Ihya'…"). Diperbaiki dengan petunjuk identitas kitab untuk ringkasan (`SUMMARY_NOTES`, kitab berpetunjuk membuat ulang ringkasan lamanya) dan untuk terjemahan (`TRANSLATE_NOTES`), serta pola baru pemeriksa meta (petunjuk yang bocor ditolak). Sesudahnya: sebutan al-Ghazali yang tersisa di at-Tibyan hanya nukilan an-Nawawi dari al-Ghazali (sah).
- **Alat:** `openiti.fillZeroPageMarkers`, patch daftar isi `parent: 0`, dan (Hadhramiyyah) judul patch boleh didahului tanda baca + `prefix` (ADR-152 tambahan).
- **QA staging `kitab-v11`** (2026-11-28): `corpus:qa staging --kitab …` → Bidayah 30/30, Tibyan 30/30, Ajurrumiyyah 19/19, al-Munqidz 30/30, al-Waraqat 25/25, Rusum 30/30, Hadhramiyyah 30/30; baris korpus cocok.
- **Intisari Bab:** dibuat subagen per kitab (skill `intisari-bab`, teks dari build lokal yang identik dengan staging), lapis 1 `pnpm konten cek --korpus staging`, lapis 3 subagen Sonnet berkonteks segar. Salah yang ditemukan direvisi; tersisa 0 Salah. Kurang dicatat di berkas.
- **Biaya nyata** (buku biaya per folder `data/build/llm/<kitab>`): al-Munqidz US$0,62, al-Waraqat US$0,34, Rusum US$1,36, Hadhramiyyah US$1,58, ringkasan ulang at-Tibyan +US$0,87, al-Ajurrumiyyah +US$0,12, judul daftar isi ±US$0,12.
