# Laporan ayat: al-Munqidz min adh-Dhalal (Shamela 9246)

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
| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | 3 / 0 |
| Kutipan S13 (paragraf badan): tanpa tanda (persis), dan pendek 2–3 kata sesudah pengantar (lafaz langka; bisa diperpanjang melewati beda ejaan) | 10 |
| Kutipan terbelah dua paragraf badan berurutan (X02; aturan mode tanpa tanda, dua rujukan sebagian per pasang) | 0 pasang |
| Kutipan dari patch ayat terverifikasi (X29, ADR-133; `data/patches/*-ayat.yaml`) | 0 |
| **Rujukan ayat** (`passage_ayah_ref`) | **13** di 8 paragraf |
| · sebagian ayat (`partial`) | 11 |
| · lebih dari satu ayat | 1 |
| · lafaz yang sama ada di letak lain (`alt_count` > 0) | 1 |

Gerbang S12: cocok persis ≥ 95% dari bentang `{…}` tervalidasi → – ✓.

## Cek silang penomoran ayat

Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: 6 ayat beda ejaan (batas 20): 2:181, 5:31, 8:6, 13:37, 17:32, 39:56. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.

## 20 sampel acak untuk diperiksa (T-16)

Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h115 | `/kitab/al-munqidz-min-adh-dhalal/1/115#p19` | QS Al-An'am [6]: 125 | persis, tanpa kurung, sebagian ayat | فمن يرد الله أن يهديهُ يشرح … |  |
| 2 | j1 h161 | `/kitab/al-munqidz-min-adh-dhalal/1/161#p101` | QS Al-Ma'idah [5]: 3 | persis, tanpa kurung, sebagian ayat | اليوم أكملتُ لكم دينكم وأتممتُ عليكمْ … |  |
| 3 | j1 h195 | `/kitab/al-munqidz-min-adh-dhalal/1/195#p180` | QS Al-Fatihah [1]: 1 | persis, tanpa kurung, ayat utuh, +1 letak lain | بسم الله الرحمن الرحيم |  |

## Kutipan S13: tanpa tanda + pendek sesudah pengantar (10): 20 sampel acak

Ayat yang tidak dikurung dan tidak didahului frasa pengantar yang dikenali, misalnya karena kurung di sumber salah tempat (`{وقال}`) atau pengantarnya lain (كما قال، لقوله). Dicek agent; boleh ikut diperiksa bersama T-16.

| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |
|---|---|---|---|---|---|---|
| 1 | j1 h114 | `/kitab/al-munqidz-min-adh-dhalal/1/114#p16` | QS Qaf [50]: 22 | persis, tanpa tanda, sebagian ayat | فكشفنا عنكَ غطاءكَ فبصرُكَ اليومَ حديدٌ |  |
| 2 | j1 h147 | `/kitab/al-munqidz-min-adh-dhalal/1/147#p79` | QS Saba [34]: 3 | persis, tanpa tanda, sebagian ayat | لا يعزب عنه مثقال ذرةٍ في |  |
| 3 | j1 h180 | `/kitab/al-munqidz-min-adh-dhalal/1/180#p140` | QS Al-Mujadila [58]: 11 | persis, tanpa tanda, sebagian ayat | يرفع الله الذين أمنوا منكم والذين … |  |
| 4 | j1 h180 | `/kitab/al-munqidz-min-adh-dhalal/1/180#p140` | QS Muhammad [47]: 16 | persis, tanpa tanda, sebagian ayat | إليك حتى إذا خرجوا من عندك … |  |
| 5 | j1 h181 | `/kitab/al-munqidz-min-adh-dhalal/1/181#p143` | QS Al-Muddaththir [74]: 31 | persis, tanpa tanda, sebagian ayat | وما يعلم جنودُ ربك إلا هو |  |
| 6 | j1 h188 | `/kitab/al-munqidz-min-adh-dhalal/1/188#p161` | QS Ash-Shu'ara [26]: 89 | persis, tanpa tanda, ayat utuh | إلا من أتى الله بقلب سليم |  |
| 7 | j1 h195 | `/kitab/al-munqidz-min-adh-dhalal/1/195#p180` | QS Al-'Ankabut [29]: 1–3 | persis, tanpa tanda, sebagian ayat | ألم. أحسب الناسُ أن يتركوا أن … |  |
| 8 | j1 h195 | `/kitab/al-munqidz-min-adh-dhalal/1/195#p180` | QS Al-An'am [6]: 34 | persis, tanpa tanda, sebagian ayat | ولقد كذبت رسلٌ من قبلكَ فصبروا … |  |
| 9 | j1 h195 | `/kitab/al-munqidz-min-adh-dhalal/1/195#p180` | QS Al-An'am [6]: 34 | persis, tanpa tanda, sebagian ayat | ولقد جاءك من نبأ المرسلين |  |
| 10 | j1 h195 | `/kitab/al-munqidz-min-adh-dhalal/1/195#p180` | QS Ya-Sin [36]: 11 | persis, tanpa tanda, sebagian ayat | إنما تنذرُ من اتبع الذكر وخشي … |  |

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
