# Eval retrieval · 2026-10-17 · ihya-v5

- **Gerbang R2:** belum ada soal yang disetujui (T-12), gerbang belum bisa dinilai
- **Korpus:** `ihya-v5` (skema 6, norm 1, latin_norm 1, dibangun 2026-10-17T06:25:29.000Z), sumber D1: lokal
- **Kode:** `92f2ef8`, `SEARCH_RESULT_VERSION` 1
- **Cara ukur:** `searchText(kueri, { limit: 50 })`; hasil benar = halaman yang masuk rentang lokasi benar atau memuat paragraf cocok di bagian lokasi benar (beserta turunannya). MRR dihitung atas 50 halaman (0 bila tidak ada).

## Semua soal (draf + disetujui, 30 soal)

| Kelompok | Soal | hit@1 | hit@5 | hit@10 | MRR |
|---|---|---|---|---|---|
| **Semua** | 30 | 56,7% | 90,0% | 96,7% | 0,732 |
| lokasi | 18 | 55,6% | 94,4% | 94,4% | 0,741 |
| topik tersebar | 5 | 40,0% | 80,0% | 100,0% | 0,595 |
| istilah | 7 | 71,4% | 85,7% | 100,0% | 0,806 |
| kueri Arab | 6 | 100,0% | 100,0% | 100,0% | 1,000 |
| kueri Indonesia | 24 | 45,8% | 87,5% | 95,8% | 0,665 |
| set publik | 20 | 60,0% | 95,0% | 100,0% | 0,774 |
| set privat | 10 | 50,0% | 80,0% | 90,0% | 0,648 |

Topik tersebar: 8 dari 13 lokasi benar muncul di 10 teratas (informasi, bukan gerbang).

## Per soal publik

| ID | Jenis | Kueri | Peringkat | Disetujui | 3 teratas |
|---|---|---|---|---|---|
| r01 | lokasi | kewajiban guru terhadap murid | 2 | draf | j1 h48 الباب الخامس في آداب المتعلم والمعلم · j1 h55 بيان وظائف المرشد المعلم · j3 h78 كتاب رياضة النفس وتهذيب الأخلاق ومعالجة أمراض القلب |
| r02 | lokasi | tanda-tanda ulama akhirat | 1 | draf | j1 h58 الباب السادس في آفات العلم وبيان علامات علما الآخرة والعلماء السوء · j1 h4 كتاب العلم · j4 h329 القول في علامات محبة العبد لله تعالى |
| r04 | lokasi | tingkatan puasa | 1 | draf | j1 h234 الفصل الثاني في أسرار الصوم وشروطه الباطنة · j1 h230 كتاب أسرار الصوم · j1 h238 الفصل الثالث في التطوع بالصيام وترتيب الأوراد فيه |
| r05 | lokasi | menafsirkan Al-Qur'an dengan pendapat sendiri | 2 | draf | j1 h104 الفصل الثالث من كتاب قواعد العقائد في لوامع الأدلة للعقيدة التي ترجمناها بالقدس · j1 h289 الباب الرابع في فهم القرآن وتفسيره بالرأي من غير نقل · j1 h13 الباب الثاني في العلم المحمود والمذموم وأقسامهما وأحكامهما |
| r07 | istilah | المناظرة | 1 | draf | j1 h45 بيان التلبيس في تشبيه هذه المناظرات بمشاورات الصحابة ومفاوضات السلف · j1 h4 كتاب العلم · j1 h99 الفصل الثاني في وجه التدريج إلى الإرشاد وترتيب درجات الاعتقاد |
| r08 | lokasi | ilmu fardu ain | 2 | draf | j1 h4 ربع العبادات · j1 h13 الباب الثاني في العلم المحمود والمذموم وأقسامهما وأحكامهما · j1 h16 بيان العلم الذي هو فرض كفاية |
| r10 | lokasi | kewajiban istri kepada suami | 2 | draf | j1 h211 النوع السادس في صدقة الفطر · j2 h58 كتاب آداب النكاح · j2 h42 كتاب آداب النكاح |
| r11 | lokasi | manfaat dan bahaya menikah | 1 | draf | j2 h21 كتاب آداب النكاح · j2 h35 كتاب آداب النكاح · j2 h221 كتاب آداب الألفة والأخوة والصحبة والمعاشرة مع أصناف الخلق |
| r13 | lokasi | bergaul dengan penguasa zalim | 1 | draf | j2 h142 كتاب الحلال والحرام · j2 h2 كتاب آداب الأكل · j2 h151 كتاب الحلال والحرام |
| r15 | istilah | الحسبة | 1 | draf | j2 h318 كتاب الأمر بالمعروف والنهي عن المنكر · j2 h325 كتاب الأمر بالمعروف والنهي عن المنكر · j2 h323 كتاب الأمر بالمعروف والنهي عن المنكر |
| r16 | topik tersebar | bekerja mencari nafkah dan tawakal | 1 | draf | j4 h272 بيان توكل المعيل · j2 h60 كتاب آداب الكسب والمعاش · j4 h259 الشطر الثاني من الكتاب في أحوال التوكل وأعماله |
| r17 | topik tersebar | manfaat uzlah | 1 | draf | j2 h221 كتاب آداب العزلة · j2 h226 كتاب آداب العزلة · j2 h245 كتاب آداب السفر |
| r19 | lokasi | menggunjing orang lain | 3 | draf | j2 h228 كتاب آداب العزلة · j2 h236 كتاب آداب العزلة · j3 h154 كتاب آفات اللسان |
| r20 | lokasi | cara mendidik anak | 2 | draf | j4 h540 صفة الحور العين والولدان · j3 h72 كتاب رياضة النفس وتهذيب الأخلاق ومعالجة أمراض القلب · j4 h62 بيان حقيقة الصبر ومعناه |
| r21 | istilah | الرياء الخفي | 1 | draf | j3 h305 كتاب ذم الجاه والرياء · j3 h318 كتاب ذم الجاه والرياء · j3 h293 كتاب ذم الجاه والرياء |
| r22 | istilah | keutamaan itsar | 2 | draf | j3 h231 كتاب ذم البخل وذم حب المال · j3 h257 كتاب ذم البخل وذم حب المال · j2 h174 كتاب آداب الألفة والأخوة والصحبة والمعاشرة مع أصناف الخلق |
| r23 | topik tersebar | bahaya harta | 7 | draf | j2 h149 كتاب الحلال والحرام · j4 h99 الركن الثاني من أركان الشكر · j3 h231 كتاب ذم البخل وذم حب المال |
| r25 | lokasi | berobat dan tawakal | 1 | draf | j4 h286 بيان آداب المتوكلين إذا سرق متاعهم · j4 h259 الشطر الثاني من الكتاب في أحوال التوكل وأعماله · j4 h243 كتاب التوحيد والتوكل |
| r28 | lokasi | doa dan rida terhadap takdir | 1 | draf | j4 h351 بيان أن الدعاء غير مناقض للرضا · j1 h317 دعاء علي بن أبي طالب رضي الله عنه · j1 h323 الباب الخامس في الأدعية المأثورة عند حدوث كل حادث من الحوادث |
| r29 | istilah | حقيقة الزهد | 1 | draf | j4 h216 بيان حقيقة الزهد · j4 h243 بيان علامات الزهد · j4 h242 بيان علامات الزهد |

## Per soal privat (holdout; teks soal tidak ditulis)

| ID | Jenis | Peringkat | Disetujui |
|---|---|---|---|
| p03 | lokasi | > 50 | draf |
| p06 | lokasi | 2 | draf |
| p09 | topik tersebar | 2 | draf |
| p12 | istilah | 7 | draf |
| p14 | lokasi | 1 | draf |
| p18 | lokasi | 1 | draf |
| p24 | lokasi | 1 | draf |
| p26 | lokasi | 1 | draf |
| p27 | istilah | 1 | draf |
| p30 | topik tersebar | 3 | draf |

Waktu per kueri (median): 13 ms, termasuk bolak-balik D1.
