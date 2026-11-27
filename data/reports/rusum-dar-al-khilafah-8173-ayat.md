# Laporan ayat: Rusum Dar al-Khilafah (Shamela 8173)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest/src/quran`, S12). Jangan disunting tangan.
> Tanpa teks kitab panjang: rujukan juz/halaman, permalink paragraf, rujukan surah:ayat, dan ≤6 kata awal kutipan.

- Korpus: `kitab-v11` · NORM_VERSION 2
- Sumber Qur'an: `kemenag-id` Terjemahan Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `6569af2c3518…`); `kemenag-latin` Transliterasi Latin Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `bb02c07b9bad…`); `tanzil-simple-clean` Tanzil Quran Text (Simple Clean) 1.1 (sha256 `140787b7c399…`); `tanzil-uthmani` Tanzil Quran Text (Uthmani) 1.1 (sha256 `203f0f1bf315…`)
- Ambang: `{…}` mirip = skor penjajaran **huruf** ≥ 0,93 (alif/waw/ya/hamzah dan ه/ت = setengah biaya); tanpa kurung: jangkar 3 kata persis, minimal 4 kata, skornya = porsi **kata** yang sama persis (metrik berbeda, jadi bisa < 0,93). Aturan lengkap: ADR-040. Mode S13 (paragraf badan, selalu dari lafaz di mushaf): tanpa tanda = ≥ 5 kata sama persis, atau ≥ 4 kata tepat sesudah pengantar ayat (تعالى، عز وجل، قرأ، {وقال} …), lafaz satu-satunya di mushaf kecuali sesudah pengantar; pendek = 2–3 kata langka sesudah قال تعالى, diperpanjang melewati beda ejaan. ADR-042.

## Ringkasan

| | Jumlah |
|---|---|
| Bentang `{…}` di teks | 0 |
| Disaring sebelum pencocokan (1 kata: 0; 2 kata tanpa pengantar: 0) | 0 |
| **Tervalidasi** (dicocokkan ke mushaf) | **0** |
| · cocok persis (`exact`) | 0 (–) |
| · mirip, beda ejaan (`similar`) | 0 (–) |
| · tidak cocok: tidak ditautkan (bisa ayat berejaan jauh berbeda; dibiarkan, tidak ditebak) | 0 (–) |
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 1 / 0 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 11 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 0 pasang |
| Kutipan dari patch ayat terverifikasi (X29, ADR-133; `data/patches/*-ayat.yaml`) | 0 |
| **Rujukan ayat** (`passage_ayah_ref`) | **12** di 6 paragraf |
| · sebagian ayat (`partial`) | 9 |
| · lebih dari satu ayat | 3 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 0 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → – ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h142 | `/kitab/rusum-dar-al-khilafah/1/142#p322` | QS Al-An'am [6]: 124 | persis, tanpa kurung, sebagian ayat | الله أعلم حَيْثُ يَجْعَل |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (11): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h58 | `/kitab/rusum-dar-al-khilafah/1/58#p142` | QS At-Tawbah [9]: 129 | persis, tanpa tanda, sebagian ayat | حسبي الله لَا اله إِلَّا هُوَ … |  |
| 2 | j1 h58 | `/kitab/rusum-dar-al-khilafah/1/58#p142` | QS An-Nisa [4]: 104 | persis, tanpa tanda, sebagian ayat | من الله مَا لَا يرجون |  |
| 3 | j1 h95 | `/kitab/rusum-dar-al-khilafah/1/95#p233` | QS Al-Baqarah [2]: 137 | persis, tanpa tanda, sebagian ayat | فَسَيَكْفِيكَهُم الله وَهُوَ السَّمِيع الْعَلِيم |  |
| 4 | j1 h95 | `/kitab/rusum-dar-al-khilafah/1/95#p233` | QS Al-Hajj [22]: 40–41 | persis, tanpa tanda, sebagian ayat | ولينصرن الله من ينصره ان الله … |  |
| 5 | j1 h114 | `/kitab/rusum-dar-al-khilafah/1/114#p274` | QS Ar-Rahman [55]: 60 | persis, tanpa tanda, ayat utuh | هَل جَزَاء الْإِحْسَان إِلَّا الْإِحْسَان |  |
| 6 | j1 h134 | `/kitab/rusum-dar-al-khilafah/1/134#p309` | QS Al-Ma'idah [5]: 55 | persis, tanpa tanda, sebagian ayat | إِنَّمَا وَلِيكُم الله وَرَسُوله وَالَّذين آمنُوا … |  |
| 7 | j1 h134 | `/kitab/rusum-dar-al-khilafah/1/134#p309` | QS Al-Ma'idah [5]: 55–56 | persis, tanpa tanda, sebagian ayat | وهم رَاكِعُونَ) (وَمن يتول الله وَرَسُوله … |  |
| 8 | j1 h134 | `/kitab/rusum-dar-al-khilafah/1/134#p309` | QS At-Tawbah [9]: 18 | persis, tanpa tanda, ayat utuh | إِنَّمَا يعمر مَسَاجِد الله من آمن … |  |
| 9 | j1 h134 | `/kitab/rusum-dar-al-khilafah/1/134#p309` | QS At-Takathur [102]: 5–8 | persis, tanpa tanda, sebagian ayat | كلا لَو تعلمُونَ علم الْيَقِين لترون … |  |
| 10 | j1 h134 | `/kitab/rusum-dar-al-khilafah/1/134#p309` | QS An-Nisa [4]: 59 | persis, tanpa tanda, sebagian ayat | يَا أَيهَا الَّذين آمنُوا أطِيعُوا الله … |  |
| 11 | j1 h142 | `/kitab/rusum-dar-al-khilafah/1/142#p321` | QS An-Nahl [16]: 128 | persis, tanpa tanda, ayat utuh | إِن الله مَعَ الَّذين اتَّقوا وَالَّذين … |  |

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
