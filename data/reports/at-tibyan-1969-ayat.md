# Laporan ayat: at-Tibyan fi Adab Hamalat al-Qur'an (Shamela 1969)

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
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 24 / 0 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 41 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 0 pasang |
| Kutipan dari patch ayat terverifikasi (X29, ADR-133; `data/patches/*-ayat.yaml`) | 0 |
| **Rujukan ayat** (`passage_ayah_ref`) | **65** di 34 paragraf |
| · sebagian ayat (`partial`) | 52 |
| · lebih dari satu ayat | 6 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 7 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → – ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h13 | `/kitab/at-tibyan/1/13#p39` | QS Fatir [35]: 29–30 | persis, tanpa kurung, ayat utuh | إن الذين يتلون كتاب الله وأقاموا … |  |
| 2 | j1 h26 | `/kitab/at-tibyan/1/26#p58` | QS Al-Hajj [22]: 32 | persis, tanpa kurung, ayat utuh | ذلك ومن يعظم شعائر الله فإنها … |  |
| 3 | j1 h26 | `/kitab/at-tibyan/1/26#p58` | QS Al-Hajj [22]: 30 | persis, tanpa kurung, sebagian ayat | ذلك ومن يعظم حرمات الله فهو … |  |
| 4 | j1 h31 | `/kitab/at-tibyan/1/31#p65` | QS Al-Bayyinah [98]: 5 | persis, tanpa kurung, ayat utuh | وما أمروا إلا ليعبدوا الله مخلصين … |  |
| 5 | j1 h34 | `/kitab/at-tibyan/1/34#p71` | QS Ash-Shuraa [42]: 20 | persis, tanpa kurung, ayat utuh | من كان يريد حرث الآخرة نزد … |  |
| 6 | j1 h34 | `/kitab/at-tibyan/1/34#p71` | QS Al-Isra [17]: 18 | persis, tanpa kurung, sebagian ayat | من كان يريد العاجلة عجلنا له … |  |
| 7 | j1 h63 | `/kitab/at-tibyan/1/63#p140` | QS Ali 'Imran [3]: 113–114 | persis, tanpa kurung, sebagian ayat | من أهل الكتاب أمة قائمة يتلون … |  |
| 8 | j1 h80 | `/kitab/at-tibyan/1/80#p176` | QS Ali 'Imran [3]: 190–191 | persis, tanpa kurung, sebagian ayat | إن في خلق السماوات والأرض واختلاف … |  |
| 9 | j1 h83 | `/kitab/at-tibyan/1/83#p183` | QS Sad [38]: 29 | persis, tanpa kurung, sebagian ayat | كتاب أنزلناه إليك مبارك ليدبروا آياته |  |
| 10 | j1 h86 | `/kitab/at-tibyan/1/86#p192` | QS Az-Zumar [39]: 16 | persis, tanpa kurung, sebagian ayat | لهم من فوقهم ظلل من النار … |  |
| 11 | j1 h86 | `/kitab/at-tibyan/1/86#p195` | QS Al-Isra [17]: 109 | persis, tanpa kurung, ayat utuh | ويخرون للأذقان يبكون ويزيدهم خشوعا |  |
| 12 | j1 h92 | `/kitab/at-tibyan/1/92#p208` | QS Al-A'raf [7]: 204 | persis, tanpa kurung, ayat utuh | وإذا قرئ القرآن فاستمعوا له وأنصتوا … |  |
| 13 | j1 h93 | `/kitab/at-tibyan/1/93#p209` | QS An-Nur [24]: 30 | persis, tanpa kurung, sebagian ayat | قل للمؤمنين يغضوا من أبصارهم |  |
| 14 | j1 h103 | `/kitab/at-tibyan/1/103#p226` | QS Al-Ma'idah [5]: 2 | persis, tanpa kurung, sebagian ayat | وتعاونوا على البر والتقوى) ولا |  |
| 15 | j1 h116 | `/kitab/at-tibyan/1/116#p246` | QS Al-Ahzab [33]: 31 | persis, tanpa kurung, sebagian ayat | ومن يقنت منكن لله ورسوله |  |
| 16 | j1 h116 | `/kitab/at-tibyan/1/116#p246` | QS Ya-Sin [36]: 28 | persis, tanpa kurung, sebagian ayat | وما أنزلنا على قومه من بعده … |  |
| 17 | j1 h116 | `/kitab/at-tibyan/1/116#p246` | QS Fussilat [41]: 47 | persis, tanpa kurung, sebagian ayat | إليه يرد علم الساعة |  |
| 18 | j1 h139 | `/kitab/at-tibyan/1/139#p310` | QS Al-Baqarah [2]: 172 | persis, tanpa kurung, sebagian ayat, +2 letak lain | إن كنتم إياه تعبدون |  |
| 19 | j1 h157 | `/kitab/at-tibyan/1/157#p360` | QS Al-An'am [6]: 160 | persis, tanpa kurung, sebagian ayat | من جاء بالحسنة فله عشر أمثالها |  |
| 20 | j1 h182 | `/kitab/at-tibyan/1/182#p421` | QS Al-Baqarah [2]: 164 | persis, tanpa kurung, sebagian ayat, +1 letak lain | إن في خلق السماوات والأرض |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (41): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h26 | `/kitab/at-tibyan/1/26#p58` | QS Al-Ahzab [33]: 58 | persis, pendek sesudah pengantar, sebagian ayat | والذين يؤذون المؤمنين |  |
| 2 | j1 h74 | `/kitab/at-tibyan/1/74#p164` | QS Az-Zukhruf [43]: 13 | persis, tanpa tanda, sebagian ayat | سبحان الذي سخر لنا هذا وما … |  |
| 3 | j1 h74 | `/kitab/at-tibyan/1/74#p164` | QS Al-Baqarah [2]: 201 | persis, tanpa tanda, sebagian ayat | ربنا آتنا في الدنيا حسنة وفي … |  |
| 4 | j1 h81 | `/kitab/at-tibyan/1/81#p179` | QS An-Nahl [16]: 98 | persis, pendek sesudah pengantar, sebagian ayat | فإذا قرأت |  |
| 5 | j1 h81 | `/kitab/at-tibyan/1/81#p179` | QS An-Nahl [16]: 98 | persis, tanpa tanda, sebagian ayat | فاستعذ بالله من الشيطان الرجيم |  |
| 6 | j1 h85 | `/kitab/at-tibyan/1/85#p191` | QS At-Tur [52]: 27 | persis, tanpa tanda, ayat utuh | فمن الله علينا ووقانا عذاب السموم |  |
| 7 | j1 h86 | `/kitab/at-tibyan/1/86#p192` | QS Al-Baqarah [2]: 281 | persis, tanpa tanda, sebagian ayat | واتقوا يوما ترجعون فيه إلى الله |  |
| 8 | j1 h113 | `/kitab/at-tibyan/1/113#p242` | QS An-Nisa [4]: 41 | persis, tanpa tanda, ayat utuh | فكيف إذا جئنا من كل أمة … |  |
| 9 | j1 h116 | `/kitab/at-tibyan/1/116#p246` | QS Az-Zumar [39]: 48 | persis, pendek sesudah pengantar, sebagian ayat, +1 letak lain | وبدا لهم سيئات |  |
| 10 | j1 h116 | `/kitab/at-tibyan/1/116#p246` | QS Al-Baqarah [2]: 203 | persis, tanpa tanda, sebagian ayat | واذكروا الله في أيام معدودات |  |
| 11 | j1 h120 | `/kitab/at-tibyan/1/120#p257` | QS At-Tawbah [9]: 30 | persis, tanpa tanda, sebagian ayat | اليهود عزير ابن الله وقالت النصارى … |  |
| 12 | j1 h120 | `/kitab/at-tibyan/1/120#p257` | QS Al-Ma'idah [5]: 64 | persis, tanpa tanda, sebagian ayat | وقالت اليهود يد الله مغلولة |  |
| 13 | j1 h121 | `/kitab/at-tibyan/1/121#p258` | QS Al-Isra [17]: 111 | persis, tanpa tanda, sebagian ayat | الحمد لله الذي لم يتخذ ولدا |  |
| 14 | j1 h139 | `/kitab/at-tibyan/1/139#p310` | QS Al-Hajj [22]: 18 | persis, tanpa tanda, sebagian ayat | إن الله يفعل ما يشاء |  |
| 15 | j1 h151 | `/kitab/at-tibyan/1/151#p349` | QS Al-Isra [17]: 108 | persis, tanpa tanda, sebagian ayat | سبحان ربنا إن كان وعد ربنا … |  |
| 16 | j1 h157 | `/kitab/at-tibyan/1/157#p360` | QS Ali 'Imran [3]: 92 | persis, tanpa tanda, sebagian ayat | لن تنالوا البر حتى تنفقوا مما … |  |
| 17 | j1 h157 | `/kitab/at-tibyan/1/157#p360` | QS At-Takwir [81]: 23 | persis, tanpa tanda, ayat utuh | ولقد رآه بالأفق المبين |  |
| 18 | j1 h157 | `/kitab/at-tibyan/1/157#p360` | QS Al-An'am [6]: 103 | persis, tanpa tanda, sebagian ayat | لا تدركه الأبصار وهو يدرك الأبصار |  |
| 19 | j1 h178 | `/kitab/at-tibyan/1/178#p414` | QS Al-Baqarah [2]: 136 | persis, tanpa tanda, sebagian ayat | قولوا آمنا بالله وما أنزل إلينا |  |
| 20 | j1 h178 | `/kitab/at-tibyan/1/178#p414` | QS Ali 'Imran [3]: 64 | persis, tanpa tanda, sebagian ayat | قل يا أهل الكتاب تعالوا إلى … |  |

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
