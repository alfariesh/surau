# Laporan ayat: Bidayat al-Hidayah (Shamela 12718)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest/src/quran`, S12). Jangan disunting tangan.
> Tanpa teks kitab panjang: rujukan juz/halaman, permalink paragraf, rujukan surah:ayat, dan ≤6 kata awal kutipan.

- Korpus: `kitab-v10` · NORM_VERSION 2
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
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 7 / 0 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 17 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 0 pasang |
| Kutipan dari patch ayat terverifikasi (X29, ADR-133; `data/patches/*-ayat.yaml`) | 0 |
| **Rujukan ayat** (`passage_ayah_ref`) | **24** di 21 paragraf |
| · sebagian ayat (`partial`) | 16 |
| · lebih dari satu ayat | 4 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 0 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → – ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h42 | `/kitab/bidayat-al-hidayah/1/42#p132` | QS Taha [20]: 130 | persis, tanpa kurung, sebagian ayat | وَسَبِح بِحَمدِ رَبِك قَبلَ طُلوع الشَمس … |  |
| 2 | j1 h42 | `/kitab/bidayat-al-hidayah/1/42#p136` | QS As-Sajdah [32]: 16 | persis, tanpa kurung, sebagian ayat | تَتَجافى جُنوبُهُم عَنِ المَضاجِع |  |
| 3 | j1 h52 | `/kitab/bidayat-al-hidayah/1/52#p220` | QS An-Nur [24]: 24 | persis, tanpa kurung, ayat utuh | يوم تشهد عليهم ألسنتهم وأيديهم وأرجلهم … |  |
| 4 | j1 h52 | `/kitab/bidayat-al-hidayah/1/52#p220` | QS Ya-Sin [36]: 65 | persis, tanpa kurung, ayat utuh | اليوم نختم على افواههم وتكلمنا أيديهم … |  |
| 5 | j1 h54 | `/kitab/bidayat-al-hidayah/1/54#p240` | QS Al-Hujurat [49]: 12 | persis, tanpa kurung, sebagian ayat | وَلا يَغتَب بَعضُكُم بَعضا، أَيُحِبُ أَحَدُكُم … |  |
| 6 | j1 h55 | `/kitab/bidayat-al-hidayah/1/55#p249` | QS An-Najm [53]: 32 | persis, tanpa kurung, sebagian ayat | فَلا تُزَكوا أَنفُسَكُم هَو أَعلَمُ بِمَن … |  |
| 7 | j1 h57 | `/kitab/bidayat-al-hidayah/1/57#p273` | QS Hud [11]: 113 | persis, tanpa kurung, sebagian ayat | وَلا تَركَنوا إِلى الَّذينَ ظَلَموا فَتَمَسَكُم … |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (17): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h26 | `/kitab/bidayat-al-hidayah/1/26#p7` | QS Al-Kahf [18]: 103–104 | persis, tanpa tanda, sebagian ayat | بِالأخسَرينَ أَعمالاً، الَّذين ضَلَ سَعيُهُم في … |  |
| 2 | j1 h28 | `/kitab/bidayat-al-hidayah/1/28#p22` | QS Ghafir [40]: 19 | persis, tanpa tanda, ayat utuh | يعلم خائنة الأعين وما تخفي الصدور |  |
| 3 | j1 h31 | `/kitab/bidayat-al-hidayah/1/31#p38` | QS Al-Mu'minun [23]: 97–98 | persis, tanpa tanda, sebagian ayat | رب أعوذ بك من همزات الشياطين … |  |
| 4 | j1 h31 | `/kitab/bidayat-al-hidayah/1/31#p41` | QS Ibrahim [14]: 27 | persis, tanpa tanda, sebagian ayat | بالقول الثابت في الحياة الدنيا وفي … |  |
| 5 | j1 h32 | `/kitab/bidayat-al-hidayah/1/32#p47` | QS Az-Zumar [39]: 18 | persis, tanpa tanda, sebagian ayat | الذين يستمعون القول فيتبعون أحسنه |  |
| 6 | j1 h36 | `/kitab/bidayat-al-hidayah/1/36#p79` | QS Ghafir [40]: 14 | persis, tanpa tanda, sebagian ayat | مخلصين له الدين ولو كره الكافرون |  |
| 7 | j1 h37 | `/kitab/bidayat-al-hidayah/1/37#p90` | QS Sad [38]: 66 | persis, tanpa tanda, sebagian ayat | والأرض وما بينهما العزيز الغفار |  |
| 8 | j1 h43 | `/kitab/bidayat-al-hidayah/1/43#p149` | QS Hud [11]: 56 | persis, tanpa tanda, sebagian ayat | آخذ بناصيتها، إن ربي على صراط … |  |
| 9 | j1 h45 | `/kitab/bidayat-al-hidayah/1/45#p165` | QS Al-An'am [6]: 162–163 | persis, tanpa tanda, sebagian ayat | إن صلاتي ونسكي ومحياى ومماتى لله … |  |
| 10 | j1 h52 | `/kitab/bidayat-al-hidayah/1/52#p220` | QS Al-Hijr [15]: 44 | persis, tanpa tanda, ayat utuh | لها سبعة أبواب لكل باب منهم … |  |
| 11 | j1 h56 | `/kitab/bidayat-al-hidayah/1/56#p256` | QS Al-An'am [6]: 68 | persis, tanpa tanda, sebagian ayat | عنهم حتى يخوضوا في حديث غيره |  |
| 12 | j1 h57 | `/kitab/bidayat-al-hidayah/1/57#p274` | QS Al-Muddaththir [74]: 38 | persis, tanpa tanda, ayat utuh | كل نفس بما كسبت رهينة |  |
| 13 | j1 h58 | `/kitab/bidayat-al-hidayah/1/58#p275` | QS An-Najm [53]: 39 | persis, tanpa tanda, ayat utuh | وَأَن لَيسَ لِلإِنسان إِلا ما سَعى |  |
| 14 | j1 h58 | `/kitab/bidayat-al-hidayah/1/58#p275` | QS Al-Infitar [82]: 13–14 | persis, tanpa tanda, ayat utuh | إنّ الأَبرارَ لَفي نَعيم، وَإنّ الفُجارَ … |  |
| 15 | j1 h62 | `/kitab/bidayat-al-hidayah/1/62#p300` | QS An-Nazi'at [79]: 2 | persis, pendek sesudah pengantar, ayat utuh | وَالناشِطاتِ نَشطا |  |
| 16 | j1 h64 | `/kitab/bidayat-al-hidayah/1/64#p319` | QS Al-Kahf [18]: 71 | persis, tanpa tanda, sebagian ayat | أَخَرَقتًها لِتُغرِقَ أَهلَها، لَقَد جِئتَ شَيئاً … |  |
| 17 | j1 h66 | `/kitab/bidayat-al-hidayah/1/66#p344` | QS Al-Kahf [18]: 28 | persis, tanpa tanda, sebagian ayat | وَلا تُطِع مَن أَغفَلنا قَلبَهُ عَن … |  |

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
