# Laporan ayat: al-Muqaddimah al-Hadhramiyyah (Shamela 6125)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest/src/quran`, S12). Jangan disunting tangan.
> Tanpa teks kitab panjang: rujukan juz/halaman, permalink paragraf, rujukan surah:ayat, dan ≤6 kata awal kutipan.

- Korpus: `kitab-v11` · NORM_VERSION 2
- Sumber Qur'an: `kemenag-id` Terjemahan Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `6569af2c3518…`); `kemenag-latin` Transliterasi Latin Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `bb02c07b9bad…`); `tanzil-simple-clean` Tanzil Quran Text (Simple Clean) 1.1 (sha256 `140787b7c399…`); `tanzil-uthmani` Tanzil Quran Text (Uthmani) 1.1 (sha256 `203f0f1bf315…`)
- Ambang: `{…}` mirip = skor penjajaran **huruf** ≥ 0,93 (alif/waw/ya/hamzah dan ه/ت = setengah biaya); tanpa kurung: jangkar 3 kata persis, minimal 4 kata, skornya = porsi **kata** yang sama persis (metrik berbeda, jadi bisa < 0,93). Aturan lengkap: ADR-040. Mode S13 (paragraf badan, selalu dari lafaz di mushaf): tanpa tanda = ≥ 5 kata sama persis, atau ≥ 4 kata tepat sesudah pengantar ayat (تعالى، عز وجل، قرأ، {وقال} …), lafaz satu-satunya di mushaf kecuali sesudah pengantar; pendek = 2–3 kata langka sesudah قال تعالى, diperpanjang melewati beda ejaan. ADR-042.

## Ringkasan

| | Jumlah |
|---|---|
| Bentang `{…}` di teks | 4 |
| Disaring sebelum pencocokan (1 kata: 2; 2 kata tanpa pengantar: 1) | 3 |
| **Tervalidasi** (dicocokkan ke mushaf) | **1** |
| · cocok persis (`exact`) | 1 (100,0%) |
| · mirip, beda ejaan (`similar`) | 0 (0,0%) |
| · tidak cocok: tidak ditautkan (bisa ayat berejaan jauh berbeda; dibiarkan, tidak ditebak) | 0 (0,0%) |
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 0 / 0 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 1 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 0 pasang |
| Kutipan dari patch ayat terverifikasi (X29, ADR-133; `data/patches/*-ayat.yaml`) | 0 |
| **Rujukan ayat** (`passage_ayah_ref`) | **2** di 2 paragraf |
| · sebagian ayat (`partial`) | 2 |
| · lebih dari satu ayat | 0 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 1 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → 100,0% ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h89 | `/kitab/al-muqaddimah-al-hadhramiyyah/1/89#p175` | QS Al-Baqarah [2]: 164 | persis, {…}, sebagian ayat, +1 letak lain | إِن فِي خلق السَّمَاوَات وَالْأَرْض |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (1): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h32 | `/kitab/al-muqaddimah-al-hadhramiyyah/1/32#p31` | QS Al-Anbya [21]: 87 | persis, tanpa tanda, sebagian ayat | أَن لَا إِلَه إِلَّا أَنْت |  |

## Kutipan terbelah dua paragraf (X02, 0 bentang, semua)

Satu kutipan yang mulai di ujung paragraf dan berlanjut di awal paragraf berikutnya (dua bentang per pasang). Diperiksa agent; boleh ikut diperiksa bersama T-16.

| Letak | Permalink | Rujukan | Jenis | Awal kutipan |
|---|---|---|---|---|

## Cocok mirip (`similar`, 0)

| Letak | Permalink | Rujukan | Jenis | Awal kutipan |
|---|---|---|---|---|

## Bentang `{…}` tervalidasi yang tidak cocok (0)

| Letak | Permalink | Kata | Alasan | Awal bentang |
|---|---|---|---|---|
