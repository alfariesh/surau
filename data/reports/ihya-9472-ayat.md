# Laporan ayat: Ihya' 'Ulum ad-Din (Shamela 9472)

> Dibuat otomatis oleh `pnpm ingest ihya` (`tools/ingest/src/quran`, S12). Jangan disunting tangan.
> Tanpa teks kitab panjang: rujukan juz/halaman, permalink paragraf, rujukan surah:ayat, dan ≤6 kata awal kutipan.

- Korpus: `ihya-v6` · NORM_VERSION 1
- Sumber Qur'an: `kemenag-id` Terjemahan Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `6569af2c3518…`); `kemenag-latin` Transliterasi Latin Al-Qur'an Kementerian Agama RI quran.kemenag.go.id, salinan 2026-06-03 (sha256 `bb02c07b9bad…`); `tanzil-simple-clean` Tanzil Quran Text (Simple Clean) 1.1 (sha256 `140787b7c399…`); `tanzil-uthmani` Tanzil Quran Text (Uthmani) 1.1 (sha256 `203f0f1bf315…`)
- Ambang: `{…}` mirip = skor penjajaran **huruf** ≥ 0,93 (alif/waw/ya/hamzah dan ه/ت = setengah biaya); tanpa kurung: jangkar 3 kata persis, minimal 4 kata, skornya = porsi **kata** yang sama persis (metrik berbeda, jadi bisa < 0,93). Aturan lengkap: ADR-040. Mode S13 (paragraf badan, selalu dari lafaz di mushaf): tanpa tanda = ≥ 5 kata sama persis, atau ≥ 4 kata tepat sesudah pengantar ayat (تعالى، عز وجل، قرأ، {وقال} …), lafaz satu-satunya di mushaf kecuali sesudah pengantar; pendek = 2–3 kata langka sesudah قال تعالى, diperpanjang melewati beda ejaan. ADR-042.

## Ringkasan

| | Jumlah |
|---|---|
| Bentang `{…}` di teks | 1.249 |
| Disaring sebelum pencocokan (1 kata: 186; 2 kata tanpa pengantar: 59) | 245 |
| **Tervalidasi** (dicocokkan ke mushaf) | **1.004** |
| · cocok persis (`exact`) | 977 (97,3%) |
| · mirip, beda ejaan (`similar`) | 25 (2,5%) |
| · tidak cocok: tidak ditautkan (bisa ayat berejaan jauh berbeda; dibiarkan, tidak ditebak) | 2 (0,2%) |
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 610 / 38 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 832 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 1 pasang |
| **Rujukan ayat** (`passage_ayah_ref`) | **2.484** di 1.436 paragraf |
| · sebagian ayat (`partial`) | 1.905 |
| · lebih dari satu ayat | 300 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 92 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → 97,3% ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h103 | `/kitab/ihya/1/103#p1262` | QS Fussilat [41]: 21 | persis, tanpa kurung, sebagian ayat | وقالوا لجلودهم لم شهدتم علينا قالوا … |  |
| 2 | j1 h119 | `/kitab/ihya/1/119#p1452` | QS An-Naml [27]: 90 | persis, {…}, sebagian ayat | ومن جاء بالسيئة فكبت وجوههم في … |  |
| 3 | j1 h175 | `/kitab/ihya/1/175#p2354` | QS Al-Fatihah [1]: 1 | persis, {…}, ayat utuh, +1 letak lain | بسم الله الرحمن الرحيم |  |
| 4 | j2 h10 | `/kitab/ihya/2/10#p5097` | QS An-Nur [24]: 61 | persis, {…}, sebagian ayat | أو صديقكم |  |
| 5 | j2 h175 | `/kitab/ihya/2/175#p7757` | QS An-Nur [24]: 61 | persis, {…}, sebagian ayat | أو صديقكم |  |
| 6 | j2 h297 | `/kitab/ihya/2/297#p10408` | QS Al-Ma'idah [5]: 83 | persis, {…}, sebagian ayat | وإذا سمعوا ما أنزل إلى الرسول … |  |
| 7 | j3 h5 | `/kitab/ihya/3/5#p11799` | QS Al-Muddaththir [74]: 31 | persis, tanpa kurung, sebagian ayat | وما يعلم جنود ربك إلا هو |  |
| 8 | j3 h68 | `/kitab/ihya/3/68#p12347` | QS Yunus [10]: 7 | persis, {…}, sebagian ayat | ورضوا بالحياة الدنيا واطمأنوا بها |  |
| 9 | j3 h150 | `/kitab/ihya/3/150#p13055` | QS Al-Hujurat [49]: 6 | persis, tanpa kurung, sebagian ayat | يَا أَيُّهَا الَّذِينَ آمَنُوا إِنْ جَاءَكُمْ … |  |
| 10 | j3 h156 | `/kitab/ihya/3/156#p13111` | QS Al-Hujurat [49]: 12 | persis, {…}, sebagian ayat | اجْتَنِبُوا كَثِيرًا مِنَ الظَّنِّ إِنَّ بَعْضَ … |  |
| 11 | j3 h190 | `/kitab/ihya/3/190#p13480` | QS Al-Hadid [57]: 21 | persis, {…}, sebagian ayat | سَابِقُوا إِلَى مَغْفِرَةٍ مِنْ رَبِّكُمْ |  |
| 12 | j3 h222 | `/kitab/ihya/3/222#p13745` | QS Ali 'Imran [3]: 14 | persis, tanpa kurung, sebagian ayat | زُيِّنَ لِلنَّاسِ حُبُّ الشَّهَوَاتِ مِنَ النِّسَاءِ … |  |
| 13 | j3 h288 | `/kitab/ihya/3/288#p14474` | QS Al-A'la [87]: 16–17 | persis, tanpa kurung, ayat utuh | بل تؤثرون الحياة الدنيا والآخرة خير … |  |
| 14 | j3 h369 | `/kitab/ihya/3/369#p15446` | QS Al-Kahf [18]: 104 | persis, {…}, sebagian ayat | وَهُمْ يَحْسَبُونَ أَنَّهُمْ يُحْسِنُونَ صُنْعًا |  |
| 15 | j4 h68 | `/kitab/ihya/4/68#p16250` | QS An-Najm [53]: 29–30 | persis, {…}, sebagian ayat | ولم يرد إلا الحياة الدنيا ذلك … |  |
| 16 | j4 h227 | `/kitab/ihya/4/227#p17455` | QS An-Nisa [4]: 77 | persis, tanpa kurung, sebagian ayat | قل متاع الدنيا قليل |  |
| 17 | j4 h236 | `/kitab/ihya/4/236#p17559` | QS Al-Qasas [28]: 83 | persis, tanpa kurung, sebagian ayat | تِلْكَ الدَّارُ الْآخِرَةُ نَجْعَلُهَا لِلَّذِينَ لَا … |  |
| 18 | j4 h279 | `/kitab/ihya/4/279#p17845` | QS Ibrahim [14]: 12 | persis, {…}, sebagian ayat | ولنصبرن على ما آذيتمونا وعلى الله … |  |
| 19 | j4 h351 | `/kitab/ihya/4/351#p18498` | QS Yunus [10]: 7 | persis, {…}, sebagian ayat | ورضوا بالحياة الدنيا واطمأنوا بها |  |
| 20 | j4 h518 | `/kitab/ihya/4/518#p20289` | QS Al-Ma'idah [5]: 116 | persis, {…}, sebagian ayat | أأنت قلت للناس اتخذوني وأمي إلهين … |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (832): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h149 | `/kitab/ihya/1/149#p1921` | QS Al-'Alaq [96]: 19 | persis, pendek sesudah pengantar, sebagian ayat | واسجد واقترب |  |
| 2 | j1 h292 | `/kitab/ihya/1/292#p4196` | QS Qaf [50]: 23–24 | persis, tanpa tanda, sebagian ayat | وقال قرينه هذا ما لدي عتيد … |  |
| 3 | j1 h292 | `/kitab/ihya/1/292#p4197` | QS An-Nahl [16]: 120 | persis, tanpa tanda, sebagian ayat | إن إبراهيم كان أمة قانتاً لله |  |
| 4 | j1 h292 | `/kitab/ihya/1/292#p4197` | QS Al-Qadr [97]: 1 | persis, tanpa tanda, ayat utuh | إنا أنزلناه في ليلة القدر |  |
| 5 | j1 h304 | `/kitab/ihya/1/304#p4339` | QS Adh-Dhariyat [51]: 18 | persis, pendek sesudah pengantar, ayat utuh | وبالأسحار هم يستغفرون |  |
| 6 | j2 h171 | `/kitab/ihya/2/171#p7689` | QS An-Najm [53]: 29 | persis, tanpa tanda, sebagian ayat | تَوَلَّى عَنْ ذِكْرِنَا وَلَمْ يُرِدْ إِلَّا … |  |
| 7 | j2 h290 | `/kitab/ihya/2/290#p10286` | QS Al-Hajj [22]: 74 | persis, tanpa tanda, sebagian ayat | ما قدروا الله حق قدره |  |
| 8 | j3 h196 | `/kitab/ihya/3/196#p13514` | QS An-Nur [24]: 37 | persis, tanpa tanda, sebagian ayat | رِجَالٌ لَا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ … |  |
| 9 | j3 h201 | `/kitab/ihya/3/201#p13550` | QS Al-Baqarah [2]: 86 | persis, tanpa tanda, sebagian ayat | اشْتَرَوُا الْحَيَاةَ الدُّنْيَا بِالْآخِرَةِ فَلَا يُخَفَّفُ … |  |
| 10 | j3 h312 | `/kitab/ihya/3/312#p14769` | QS Ar-Ra'd [13]: 11 | persis, tanpa tanda, sebagian ayat | الله لا يغير ما بقوم حتى … |  |
| 11 | j3 h378 | `/kitab/ihya/3/378#p15551` | QS Al-An'am [6]: 125 | persis, tanpa tanda, sebagian ayat | ضيقاً حرجاً كأنما يصعد في السماء |  |
| 12 | j3 h385 | `/kitab/ihya/3/385#p15626` | QS As-Sajdah [32]: 12 | persis, tanpa tanda, sebagian ayat | ربنا أبصرنا وسمعنا فارجعنا نعمل صالحاً … |  |
| 13 | j4 h80 | `/kitab/ihya/4/80#p16321` | QS Ibrahim [14]: 7 | persis, pendek sesudah pengantar, sebagian ayat | لئن شكرتم لأزيدنكم |  |
| 14 | j4 h305 | `/kitab/ihya/4/305#p17998` | QS Al-Kahf [18]: 84 | persis, tanpa tanda, sebagian ayat | إنا مكنا له في الأرض |  |
| 15 | j4 h380 | `/kitab/ihya/4/380#p18849` | QS Al-Kahf [18]: 103–104 | persis, tanpa tanda, ayat utuh | قل هل ننبئكم بالأخسرين أعمالاً الَّذِينَ … |  |
| 16 | j4 h412 | `/kitab/ihya/4/412#p19241` | QS Ali 'Imran [3]: 30 | persis, tanpa tanda, sebagian ayat | يَوْمَ تَجِدُ كُلُّ نَفْسٍ مَا عَمِلَتْ … |  |
| 17 | j4 h453 | `/kitab/ihya/4/453#p19661` | QS Al-An'am [6]: 134 | persis, tanpa tanda, ayat utuh | إن ما توعدون لآت وما أنتم … |  |
| 18 | j4 h500 | `/kitab/ihya/4/500#p20167` | QS Al-Mu'minun [23]: 100 | persis, tanpa tanda, sebagian ayat | لعلي أعمل صالحاً فيما تركت |  |
| 19 | j4 h534 | `/kitab/ihya/4/534#p20397` | QS Fatir [35]: 37 | persis, tanpa tanda, sebagian ayat | ربنا أخرجنا نعمل صالحاً غير الذي … |  |
| 20 | j4 h540 | `/kitab/ihya/4/540#p20444` | QS Az-Zukhruf [43]: 71 | persis, pendek sesudah pengantar, sebagian ayat | يطاف عليهم بصحاف |  |

## Kutipan terbelah dua paragraf (X02, 2 bentang, semua)

Satu kutipan yang mulai di ujung paragraf dan berlanjut di awal paragraf berikutnya (dua bentang per pasang). Diperiksa agent; boleh ikut diperiksa bersama T-16.

| Letak | Permalink | Rujukan | Jenis | Awal kutipan |
|---|---|---|---|---|
| j4 h334 | `/kitab/ihya/4/334#p18256` | QS Al-Qamar [54]: 55 | persis, terbelah dua paragraf, sebagian ayat | في مقعد |
| j4 h335 | `/kitab/ihya/4/335#p18257` | QS Al-Qamar [54]: 55 | persis, terbelah dua paragraf, sebagian ayat | صدق عند مليك مقتدر |

## Cocok mirip (`similar`, 70, 40 pertama)

| Letak | Permalink | Rujukan | Jenis | Awal kutipan |
|---|---|---|---|---|
| j1 h9 | `/kitab/ihya/1/9#p125` | QS Ali 'Imran [3]: 187 | mirip (kata persis 0,9), tanpa kurung, sebagian ayat | وَإِذْ أخذ الله ميثاق الذين أوتوا … |
| j1 h54 | `/kitab/ihya/1/54#p608` | QS Al-Waqi'ah [56]: 88–91 | mirip (huruf 0,994), {…}, ayat utuh | فأما إن كان من المقربين فروح … |
| j1 h87 | `/kitab/ihya/1/87#p1039` | QS Al-An'am [6]: 75 | mirip (kata persis 0,833), tanpa kurung, sebagian ayat | وكذلك نرى إبراهيم ملكوت السموات والأرض |
| j1 h96 | `/kitab/ihya/1/96#p1162` | QS Al-Anfal [8]: 42 | mirip (kata persis 0,9), tanpa kurung, sebagian ayat | ليهلك من هلك عن بينة ويحيا … |
| j1 h100 | `/kitab/ihya/1/100#p1206` | QS At-Talaq [65]: 12 | mirip (kata persis 0,909), tanpa kurung, sebagian ayat | الله الذي خلق سبع سموات ومن … |
| j1 h105 | `/kitab/ihya/1/105#p1286` | QS Al-Baqarah [2]: 164 | mirip (kata persis 0,977), tanpa kurung, ayat utuh | إن في خلق السموات والأرض واختلاف … |
| j1 h105 | `/kitab/ihya/1/105#p1286` | QS Nuh [71]: 15–18 | mirip (kata persis 0,96), tanpa kurung, ayat utuh | ألم تروا كيف خلق الله سبع … |
| j1 h105 | `/kitab/ihya/1/105#p1287` | QS Ibrahim [14]: 10 | mirip (kata persis 0,833), tanpa kurung, sebagian ayat | أفي الله شك فاطر السموات والأرض |
| j1 h105 | `/kitab/ihya/1/105#p1289` | QS Luqman [31]: 25 | mirip (kata persis 0,875), tanpa kurung, sebagian ayat, +1 letak lain | ولئن سألتهم من خلق السموات والأرض … |
| j1 h105 | `/kitab/ihya/1/105#p1289` | QS Ar-Rum [30]: 30 | mirip (kata persis 0,857), tanpa kurung, sebagian ayat | فأقم وجهك للدين حنيفاً فطرة الله … |
| j1 h108 | `/kitab/ihya/1/108#p1325` | QS Al-Hadid [57]: 4 | mirip (kata persis 0,75), pendek sesudah pengantar, sebagian ayat | وهو معكم أينما كنتم |
| j1 h115 | `/kitab/ihya/1/115#p1405` | QS Ali 'Imran [3]: 133 | mirip (kata persis 0,909), tanpa kurung, ayat utuh | وَسَارِعُوا إِلَى مَغْفِرَةٍ مِنْ ربكم وجنة … |
| j1 h275 | `/kitab/ihya/1/275#p4007` | QS Ali 'Imran [3]: 191 | mirip (kata persis 0,917), tanpa kurung, sebagian ayat | الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَى … |
| j1 h284 | `/kitab/ihya/1/284#p4120` | QS Ar-Ra'd [13]: 19 | mirip (huruf 0,976), {…}, sebagian ayat, +1 letak lain | إنما يتذكر أولوا الألباب |
| j1 h285 | `/kitab/ihya/1/285#p4127` | QS Al-Baqarah [2]: 231 | mirip (huruf 0,991), {…}, sebagian ayat | وَاذْكُرُوا نِعْمَةَ اللَّهِ عَلَيْكُمْ وَمَا أَنْزَلَ … |
| j1 h286 | `/kitab/ihya/1/286#p4140` | QS Yusuf [12]: 105 | mirip (kata persis 0,909), tanpa kurung, ayat utuh | وكأين من آية في السموات والأرض … |
| j1 h291 | `/kitab/ihya/1/291#p4189` | QS Al-A'raf [7]: 187 | mirip (kata persis 0,75), pendek sesudah pengantar, sebagian ayat | ثقلت في السموات والأرض |
| j1 h330 | `/kitab/ihya/1/330#p4682` | QS Al-Muzzammil [73]: 6 | mirip (huruf 0,983), {…}, ayat utuh | إن ناشئة الليل هي أشد وطأ … |
| j1 h353 | `/kitab/ihya/1/353#p4851` | QS Al-Muzzammil [73]: 6 | mirip (huruf 0,983), {…}, ayat utuh | إن ناشئة الليل هي أشد وطأ … |
| j2 h26 | `/kitab/ihya/2/26#p5452` | QS At-Tur [52]: 21 | mirip (kata persis 0,889), pendek sesudah pengantar, sebagian ayat | ألحقنا بهم ذرياتهم وما ألتناهم من … |
| j2 h40 | `/kitab/ihya/2/40#p5690` | QS Ar-Rum [30]: 39 | mirip (kata persis 0,875), tanpa kurung, sebagian ayat | وما آتيتم من ربا ليربوا في … |
| j2 h159 | `/kitab/ihya/2/159#p7510` | QS At-Tur [52]: 21 | mirip (kata persis 0,889), pendek sesudah pengantar, sebagian ayat | ألحقنا بهم ذرياتهم وما ألتناهم من … |
| j2 h167 | `/kitab/ihya/2/167#p7631` | QS An-Nur [24]: 22 | mirip (kata persis 0,833), pendek sesudah pengantar, sebagian ayat | ولا يأتل أولوا الفضل منكم والسعة |
| j2 h167 (catatan kaki) | `/kitab/ihya/2/167#p7634` | QS An-Nur [24]: 22 | mirip (huruf 0,976), {…}, sebagian ayat | ولا يأتل أولوا الفضل منكم |
| j2 h224 | `/kitab/ihya/2/224#p8828` | QS Maryam [19]: 49 | mirip (kata persis 0,929), tanpa kurung, ayat utuh | فلما اعتزلهم وما يعبدون من دون … |
| j2 h307 | `/kitab/ihya/2/307#p10607` | QS Al-Ma'idah [5]: 78–79 | mirip (kata persis 0,963), tanpa kurung, ayat utuh | لُعِنَ الَّذِينَ كَفَرُوا مِنْ بَنِي إِسْرَائِيلَ … |
| j2 h307 | `/kitab/ihya/2/307#p10607` | QS Hud [11]: 116 | mirip (kata persis 0,923), tanpa kurung, sebagian ayat | فلولا كان من القرون من قبلكم … |
| j2 h307 | `/kitab/ihya/2/307#p10607` | QS An-Nisa [4]: 114 | mirip (kata persis 0,962), tanpa kurung, ayat utuh | لَا خَيْرَ فِي كَثِيرٍ مِنْ نَجْوَاهُمْ … |
| j2 h349 | `/kitab/ihya/2/349#p11279` | QS Al-Kahf [18]: 49 | mirip (huruf 1), {…}, sebagian ayat | ما لهذا الْكِتَابِ لَا يُغَادِرُ صَغِيرَةً … |
| j2 h349 | `/kitab/ihya/2/349#p11279` | QS Sad [38]: 26 | mirip (huruf 0,993), {…}, sebagian ayat | يا داود إنا جعلناك خليفة في … |
| j3 h12 | `/kitab/ihya/3/12#p11897` | QS Al-A'raf [7]: 100 | mirip (kata persis 0,909), tanpa kurung, sebagian ayat | أن لو نشاء أصبناهم بذنبوهم ونطبع … |
| j3 h17 | `/kitab/ihya/3/17#p11979` | QS Al-An'am [6]: 75 | mirip (kata persis 0,833), tanpa kurung, sebagian ayat | وكذلك نرى إبراهيم ملكوت السموات والأرض |
| j3 h24 | `/kitab/ihya/3/24#p12033` | QS Yunus [10]: 6 | mirip (kata persis 0,889), tanpa kurung, sebagian ayat | وما خلق الله في السموات والأرض … |
| j3 h38 | `/kitab/ihya/3/38#p12104` | QS Fatir [35]: 6 | mirip (kata persis 0,833), tanpa kurung, sebagian ayat | إن الشيطان لكم عدواً فاتخذوه عدواً |
| j3 h41 | `/kitab/ihya/3/41#p12124` | QS Al-Isra [17]: 36 | mirip (huruf 0,991), {…}, ayat utuh | ولا تقف ما ليس لك به … |
| j3 h88 | `/kitab/ihya/3/88#p12475` | QS Al-Ahzab [33]: 72 | mirip (kata persis 0,944), tanpa kurung, ayat utuh | إنا عرضنا الأمانة على السموات والأرض … |
| j3 h181 | `/kitab/ihya/3/181#p13403` | QS An-Nur [24]: 22 | mirip (kata persis 0,8), pendek sesudah pengantar, sebagian ayat | ولا يأتل أولوا الفضل منكم |
| j3 h192 | `/kitab/ihya/3/192#p13494` | QS Ali 'Imran [3]: 119 | mirip (kata persis 0,933), tanpa kurung, sebagian ayat | وإذا لقوكم قالوا آمنا وإذا خلو … |
| j3 h198 | `/kitab/ihya/3/198#p13531` | QS Fatir [35]: 43 | mirip (kata persis 0,833), tanpa kurung, sebagian ayat | ولا يحيق المكر السيء إلا بأهله |
| j3 h252 | `/kitab/ihya/3/252#p14057` | QS Ali 'Imran [3]: 180 | mirip (kata persis 0,955), tanpa kurung, sebagian ayat | وَلَا يَحْسَبَنَّ الَّذِينَ يَبْخَلُونَ بِمَا آتاهم … |

## Bentang `{…}` tervalidasi yang tidak cocok (2)

| Letak | Permalink | Kata | Alasan | Awal bentang |
|---|---|---|---|---|
| j1 h330 | `/kitab/ihya/1/330#p4682` | 4 | kemiripan < 0,93 (0,9) | أَمْ مَنْ هُوَ قَانِتٌ |
| j2 h207 | `/kitab/ihya/2/207#p8428` | 3 | 2–3 kata, tidak persis (cocok mirip tidak dicoba) | ويدرؤون بالحسنة السيئة |
