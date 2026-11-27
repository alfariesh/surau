# Laporan ayat: at-Ta'rifat (Shamela 7312)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest/src/quran`, S12). Jangan disunting tangan.
> Tanpa teks kitab panjang: rujukan juz/halaman, permalink paragraf, rujukan surah:ayat, dan ≤6 kata awal kutipan.

- Korpus: `kitab-v11` · NORM_VERSION 2
- Sumber Qur'an: `kemenag-id` Terjemahan Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `6569af2c3518…`); `kemenag-latin` Transliterasi Latin Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `bb02c07b9bad…`); `tanzil-simple-clean` Tanzil Quran Text (Simple Clean) 1.1 (sha256 `140787b7c399…`); `tanzil-uthmani` Tanzil Quran Text (Uthmani) 1.1 (sha256 `203f0f1bf315…`)
- Ambang: `{…}` mirip = skor penjajaran **huruf** ≥ 0,93 (alif/waw/ya/hamzah dan ه/ت = setengah biaya); tanpa kurung: jangkar 3 kata persis, minimal 4 kata, skornya = porsi **kata** yang sama persis (metrik berbeda, jadi bisa < 0,93). Aturan lengkap: ADR-040. Mode S13 (paragraf badan, selalu dari lafaz di mushaf): tanpa tanda = ≥ 5 kata sama persis, atau ≥ 4 kata tepat sesudah pengantar ayat (تعالى، عز وجل، قرأ، {وقال} …), lafaz satu-satunya di mushaf kecuali sesudah pengantar; pendek = 2–3 kata langka sesudah قال تعالى, diperpanjang melewati beda ejaan. ADR-042.

## Ringkasan

| | Jumlah |
|---|---|
| Bentang `{…}` di teks | 78 |
| Disaring sebelum pencocokan (1 kata: 1; 2 kata tanpa pengantar: 1) | 2 |
| **Tervalidasi** (dicocokkan ke mushaf) | **76** |
| · cocok persis (`exact`) | 74 (97,4%) |
| · mirip, beda ejaan (`similar`) | 2 (2,6%) |
| · tidak cocok: tidak ditautkan (bisa ayat berejaan jauh berbeda; dibiarkan, tidak ditebak) | 0 (0,0%) |
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 0 / 0 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 1 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 0 pasang |
| Kutipan dari patch ayat terverifikasi (X29, ADR-133; `data/patches/*-ayat.yaml`) | 0 |
| **Rujukan ayat** (`passage_ayah_ref`) | **77** di 62 paragraf |
| · sebagian ayat (`partial`) | 54 |
| · lebih dari satu ayat | 11 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 11 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → 97,4% ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h13 | `/kitab/at-tarifat/1/13#p74` | QS Al-Ma'idah [5]: 54 | persis, {…}, sebagian ayat | فَسَوْفَ يَأْتِي اللَّهُ بِقَوْمٍ يُحِبُّهُمْ وَيُحِبُّونَهُ … |  |
| 2 | j1 h16 | `/kitab/at-tarifat/1/16#p98` | QS Ya-Sin [36]: 82 | persis, {…}, ayat utuh | إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَنْ … |  |
| 3 | j1 h19 | `/kitab/at-tarifat/1/19#p127` | QS Hud [11]: 112 | persis, {…}, sebagian ayat | فَاسْتَقِمْ كَمَا أُمِرْتَ |  |
| 4 | j1 h47 | `/kitab/at-tarifat/1/47#p399` | QS Al-Hijr [15]: 30 | persis, {…}, ayat utuh, +1 letak lain | فَسَجَدَ الْمَلائِكَةُ كُلُّهُمْ أَجْمَعُونَ |  |
| 5 | j1 h52 | `/kitab/at-tarifat/1/52#p439` | QS Al-An'am [6]: 26 | persis, {…}, sebagian ayat | وَهُمْ يَنْهَوْنَ عَنْهُ وَيَنْأَوْنَ عَنْهُ |  |
| 6 | j1 h53 | `/kitab/at-tarifat/1/53#p452` | QS Al-An'am [6]: 102 | persis, {…}, sebagian ayat, +3 letak lain | خَالِقُ كُلِّ شَيْءٍ |  |
| 7 | j1 h60 | `/kitab/at-tarifat/1/60#p520` | QS An-Naml [27]: 22 | persis, {…}, sebagian ayat | وَجِئْتُكَ مِنْ سَبَأٍ بِنَبَأٍ يَقِينٍ |  |
| 8 | j1 h70 | `/kitab/at-tarifat/1/70#p624` | QS Ghafir [40]: 3 | persis, {…}, sebagian ayat | غَافِرِ الذَّنْبِ وَقَابِلِ التَّوْبِ |  |
| 9 | j1 h77 | `/kitab/at-tarifat/1/77#p677` | QS Al-Fath [48]: 10 | persis, {…}, sebagian ayat | إِنَّ الَّذِينَ يُبَايِعُونَكَ إِنَّمَا يُبَايِعُونَ اللَّهَ |  |
| 10 | j1 h78 | `/kitab/at-tarifat/1/78#p688` | QS Al-Baqarah [2]: 228 | persis, {…}, sebagian ayat | ثَلاثَةَ قُرُوءٍ |  |
| 11 | j1 h82 | `/kitab/at-tarifat/1/82#p713` | QS Al-Fajr [89]: 22 | persis, {…}, ayat utuh | وَجَاءَ رَبُّكَ وَالْمَلَكُ صَفًّا صَفًّا |  |
| 12 | j1 h96 | `/kitab/at-tarifat/1/96#p849` | QS Al-Baqarah [2]: 268 | persis, {…}, sebagian ayat | الشَّيْطَانُ يَعِدُكُمُ الْفَقْرَ وَيَأْمُرُكُمْ بِالْفَحْشَاءِ |  |
| 13 | j1 h118 | `/kitab/at-tarifat/1/118#p1021` | QS Al-An'am [6]: 59 | persis, {…}, sebagian ayat | وَعِنْدَهُ مَفَاتِحُ الْغَيْبِ لا يَعْلَمُهَا إِلَّا … |  |
| 14 | j1 h131 | `/kitab/at-tarifat/1/131#p1132` | QS Al-Anbya [21]: 83 | persis, {…}, ayat utuh | وَأَيُّوبَ إِذْ نَادَى رَبَّهُ أَنِّي مَسَّنِيَ … |  |
| 15 | j1 h174 | `/kitab/at-tarifat/1/174#p1506` | QS Al-Hadid [57]: 4 | persis, {…}, sebagian ayat | وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ |  |
| 16 | j1 h212 | `/kitab/at-tarifat/1/212#p1814` | QS Ash-Shu'ara [26]: 193 | persis, {…}, ayat utuh | نَزَلَ بِهِ الرُّوحُ الْأَمِينُ |  |
| 17 | j1 h215 | `/kitab/at-tarifat/1/215#p1840` | QS Al-Insan [76]: 16 | mirip (huruf 0,958), {…}, sebagian ayat | قَوَارِيرَا مِنْ فِضَّةٍ |  |
| 18 | j1 h218 | `/kitab/at-tarifat/1/218#p1866` | QS Al-Layl [92]: 5–6 | persis, {…}, ayat utuh | فَأَمَّا مَنْ أَعْطَى وَاتَّقَى وَصَدَّقَ بِالْحُسْنَى |  |
| 19 | j1 h224 | `/kitab/at-tarifat/1/224#p1916` | QS Ali 'Imran [3]: 42 | persis, {…}, sebagian ayat | وَإِذْ قَالَتِ الْمَلائِكَةُ يَا مَرْيَمُ |  |
| 20 | j1 h258 | `/kitab/at-tarifat/1/258#p2181` | QS Sad [38]: 75 | persis, {…}, sebagian ayat | مَا مَنَعَكَ أَنْ تَسْجُدَ لِمَا خَلَقْتُ … |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (1): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h125 | `/kitab/at-tarifat/1/125#p1080` | QS Al-Qasas [28]: 30 | persis, tanpa tanda, sebagian ayat | إني أنا الله رب العالمين |  |

## Kutipan terbelah dua paragraf (X02, 0 bentang, semua)

Satu kutipan yang mulai di ujung paragraf dan berlanjut di awal paragraf berikutnya (dua bentang per pasang). Diperiksa agent; boleh ikut diperiksa bersama T-16.

| Letak | Permalink | Rujukan | Jenis | Awal kutipan |
|---|---|---|---|---|

## Cocok mirip (`similar`, 2)

| Letak | Permalink | Rujukan | Jenis | Awal kutipan |
|---|---|---|---|---|
| j1 h70 | `/kitab/at-tarifat/1/70#p624` | QS An-Nur [24]: 31 | mirip (huruf 0,983), {…}, sebagian ayat | وَتُوبُوا إِلَى اللَّهِ جَمِيعاً أَيُّهَا الْمُؤْمِنُونَ |
| j1 h215 | `/kitab/at-tarifat/1/215#p1840` | QS Al-Insan [76]: 16 | mirip (huruf 0,958), {…}, sebagian ayat | قَوَارِيرَا مِنْ فِضَّةٍ |

## Bentang `{…}` tervalidasi yang tidak cocok (0)

| Letak | Permalink | Kata | Alasan | Awal bentang |
|---|---|---|---|---|
