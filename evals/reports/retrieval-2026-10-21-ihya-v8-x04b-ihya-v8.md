# Eval retrieval · 2026-10-21 · ihya-v8

- **Gerbang R2:** hit@10 = 100,0% atas 31 soal disetujui → **LOLOS** (syarat ≥ 90,0%, minimal 20 soal)
- **Korpus:** `ihya-v8` (skema 7, norm 2, latin_norm 1, dibangun 2026-10-21T16:31:00.000Z), sumber D1: lokal
- **Kode:** `f902c7d-dirty`, `SEARCH_RESULT_VERSION` 1 · soal privat ikut
- **Cara ukur:** `searchText(kueri, { limit: 50 })`; hasil benar = halaman yang masuk rentang lokasi benar atau memuat paragraf cocok di bagian lokasi benar (beserta turunannya). MRR dihitung atas 50 halaman (0 bila tidak ada).

## Set resmi (disetujui, 31 soal)

| Kelompok | Soal | hit@1 | hit@5 | hit@10 | MRR |
|---|---|---|---|---|---|
| **Semua** | 31 | 64,5% | 96,8% | 100,0% | 0,795 |
| lokasi | 19 | 68,4% | 100,0% | 100,0% | 0,833 |
| topik tersebar | 5 | 40,0% | 100,0% | 100,0% | 0,633 |
| istilah | 7 | 71,4% | 85,7% | 100,0% | 0,806 |
| kueri arab | 6 | 100,0% | 100,0% | 100,0% | 1,000 |
| kueri indonesia | 25 | 56,0% | 96,0% | 100,0% | 0,746 |
| set publik | 22 | 63,6% | 95,5% | 100,0% | 0,787 |
| set privat | 9 | 66,7% | 100,0% | 100,0% | 0,815 |

## Semua soal (draf + disetujui, 31 soal)

| Kelompok | Soal | hit@1 | hit@5 | hit@10 | MRR |
|---|---|---|---|---|---|
| **Semua** | 31 | 64,5% | 96,8% | 100,0% | 0,795 |
| lokasi | 19 | 68,4% | 100,0% | 100,0% | 0,833 |
| topik tersebar | 5 | 40,0% | 100,0% | 100,0% | 0,633 |
| istilah | 7 | 71,4% | 85,7% | 100,0% | 0,806 |
| kueri arab | 6 | 100,0% | 100,0% | 100,0% | 1,000 |
| kueri indonesia | 25 | 56,0% | 96,0% | 100,0% | 0,746 |
| set publik | 22 | 63,6% | 95,5% | 100,0% | 0,787 |
| set privat | 9 | 66,7% | 100,0% | 100,0% | 0,815 |

Topik tersebar: 8 dari 13 lokasi benar muncul di 10 teratas (informasi, bukan gerbang).

## Per soal publik

| ID | Jenis | Kueri | Peringkat | Disetujui | 3 teratas |
|---|---|---|---|---|---|
| r01 | lokasi | kewajiban guru terhadap murid | 2 | ya | j1 h48 الباب الخامس في آداب المتعلم والمعلم · j1 h55 بيان وظائف المرشد المعلم · j3 h78 كتاب رياضة النفس وتهذيب الأخلاق ومعالجة أمراض القلب |
| r02 | lokasi | tanda-tanda ulama akhirat | 1 | ya | j1 h58 الباب السادس في آفات العلم وبيان علامات علما الآخرة والعلماء السوء · j1 h4 كتاب العلم · j4 h81 بيان حد الشكر وحقيقته |
| r03 | lokasi | cara khusyuk dalam salat | 1 | ya | j1 h171 بيان تفصيل ما ينبغي أن يحضر في القلب عند كل ركن وشرط من أعمال الصلاة · j1 h168 بيان تفصيل ما ينبغي أن يحضر في القلب عند كل ركن وشرط من أعمال الصلاة · j1 h159 الباب الثالث في الشروط الباطنة من أعمال القلب |
| r04 | lokasi | tingkatan puasa | 1 | ya | j1 h234 الفصل الثاني في أسرار الصوم وشروطه الباطنة · j1 h230 كتاب أسرار الصوم · j1 h238 الفصل الثالث في التطوع بالصيام وترتيب الأوراد فيه |
| r05 | lokasi | menafsirkan Al-Qur'an dengan pendapat sendiri | 2 | ya | j1 h104 الفصل الثالث من كتاب قواعد العقائد في لوامع الأدلة للعقيدة التي ترجمناها بالقدس · j1 h289 الباب الرابع في فهم القرآن وتفسيره بالرأي من غير نقل · j1 h13 الباب الثاني في العلم المحمود والمذموم وأقسامهما وأحكامهما |
| r07 | istilah | المناظرة | 1 | ya | j1 h45 بيان التلبيس في تشبيه هذه المناظرات بمشاورات الصحابة ومفاوضات السلف · j1 h4 كتاب العلم · j1 h99 الفصل الثاني في وجه التدريج إلى الإرشاد وترتيب درجات الاعتقاد |
| r08 | lokasi | ilmu fardu ain | 2 | ya | j1 h4 ربع العبادات · j1 h13 الباب الثاني في العلم المحمود والمذموم وأقسامهما وأحكامهما · j1 h16 بيان العلم الذي هو فرض كفاية |
| r10 | lokasi | kewajiban istri kepada suami | 2 | ya | j1 h211 النوع السادس في صدقة الفطر · j2 h58 كتاب آداب النكاح · j2 h42 كتاب آداب النكاح |
| r11 | lokasi | manfaat dan bahaya menikah | 1 | ya | j2 h21 كتاب آداب النكاح · j2 h35 كتاب آداب النكاح · j2 h221 كتاب آداب الألفة والأخوة والصحبة والمعاشرة مع أصناف الخلق |
| r12 | istilah | tingkatan wara | 7 | ya | j1 h18 بيان العلم الذي هو فرض كفاية · j2 h88 كتاب الحلال والحرام · j2 h2 كتاب آداب الأكل |
| r13 | lokasi | bergaul dengan penguasa zalim | 1 | ya | j2 h142 كتاب الحلال والحرام · j2 h2 كتاب آداب الأكل · j2 h151 كتاب الحلال والحرام |
| r15 | istilah | الحسبة | 1 | ya | j2 h318 كتاب الأمر بالمعروف والنهي عن المنكر · j2 h325 كتاب الأمر بالمعروف والنهي عن المنكر · j2 h323 كتاب الأمر بالمعروف والنهي عن المنكر |
| r16 | topik tersebar | bekerja mencari nafkah dan tawakal | 1 | ya | j4 h272 بيان توكل المعيل · j2 h60 كتاب آداب الكسب والمعاش · j4 h259 الشطر الثاني من الكتاب في أحوال التوكل وأعماله |
| r17 | topik tersebar | manfaat uzlah | 1 | ya | j2 h221 كتاب آداب العزلة · j2 h226 كتاب آداب العزلة · j2 h245 كتاب آداب السفر |
| r19 | lokasi | menggunjing orang lain | 3 | ya | j2 h228 كتاب آداب العزلة · j2 h236 كتاب آداب العزلة · j3 h154 كتاب آفات اللسان |
| r20 | lokasi | cara mendidik anak | 1 | ya | j3 h72 كتاب رياضة النفس وتهذيب الأخلاق ومعالجة أمراض القلب · j4 h62 بيان حقيقة الصبر ومعناه · j2 h217 كتاب آداب الألفة والأخوة والصحبة والمعاشرة مع أصناف الخلق |
| r21 | istilah | الرياء الخفي | 1 | ya | j3 h305 كتاب ذم الجاه والرياء · j3 h318 كتاب ذم الجاه والرياء · j3 h293 كتاب ذم الجاه والرياء |
| r22 | istilah | keutamaan itsar | 2 | ya | j3 h231 كتاب ذم البخل وذم حب المال · j3 h257 كتاب ذم البخل وذم حب المال · j2 h174 كتاب آداب الألفة والأخوة والصحبة والمعاشرة مع أصناف الخلق |
| r23 | topik tersebar | bahaya harta | 3 | ya | j2 h149 كتاب الحلال والحرام · j4 h99 الركن الثاني من أركان الشكر · j3 h231 كتاب ذم البخل وذم حب المال |
| r25 | lokasi | berobat dan tawakal | 1 | ya | j4 h286 بيان آداب المتوكلين إذا سرق متاعهم · j4 h259 الشطر الثاني من الكتاب في أحوال التوكل وأعماله · j4 h243 كتاب التوحيد والتوكل |
| r28 | lokasi | doa dan rida terhadap takdir | 1 | ya | j4 h351 بيان أن الدعاء غير مناقض للرضا · j1 h317 دعاء علي بن أبي طالب رضي الله عنه · j1 h323 الباب الخامس في الأدعية المأثورة عند حدوث كل حادث من الحوادث |
| r29 | istilah | حقيقة الزهد | 1 | ya | j4 h216 بيان حقيقة الزهد · j4 h243 بيان علامات الزهد · j4 h242 بيان علامات الزهد |

## Per soal privat (holdout; teks soal tidak ditulis)

| ID | Jenis | Peringkat | Disetujui |
|---|---|---|---|
| p06 | lokasi | 2 | ya |
| p09 | topik tersebar | 2 | ya |
| p14 | lokasi | 1 | ya |
| p18 | lokasi | 1 | ya |
| p24 | lokasi | 1 | ya |
| p26 | lokasi | 1 | ya |
| p27 | istilah | 1 | ya |
| p30 | topik tersebar | 3 | ya |
| p31 | lokasi | 1 | ya |

Waktu per kueri (median): 13 ms, termasuk bolak-balik D1.
