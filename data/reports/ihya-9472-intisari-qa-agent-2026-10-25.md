# QA pilot Intisari Kitab al-'Ilm: penilaian agent, 25 Oktober 2026

**Hasil: gerbang lolos.** 2 dari 133 gagasan yang dimuat dinilai "Salah" (1,5%; batas 5%). Benar 91 (68,4%), Kurang 40 (30,1%). Ini penilaian agent sebagai lapisan koreksi, bukan penilaian pemilik atau ustadz, dan bukan kebenaran mutlak. Pemilik menyerahkan QA ini untuk sementara kepada agent (2026-10-25, di sesi induk): "Saya serahkan ke agent sementara untuk QA model sonnet". T-31 tetap terbuka untuk penilaian manusia.

## Sumber dan cara menilai

- **Bahan:** halaman QA `data/build/llm/intisari/qa/intisari-100003.html` (`pnpm llm intisari report`). Halaman ini tidak di-commit karena berisi teks kitab. Isinya:
  - 21 Intisari yang dimuat ke staging (1 Kitab + 20 Bab, 133 gagasan);
  - pembanding Haiku untuk Intisari Kitab (7 gagasan, tidak dimuat).
- **Paket:** halaman dipecah per Intisari menjadi paket teks berisi judul, isi, label sikap, pertanyaan, Dasar teks, kutipan pilihan beserta terjemahannya, dan istilah. Dasar teks = potongan Arab yang disalin kode + terjemahan AI paragraf utuh.
- **Penilai:** empat subagen Claude Code berkonteks baru, satu kelompok per subagen (Kitab + pembanding; Bab 1–2; Bab 3–4; Bab 5–7). Mereka tidak membangun pipeline ini dan tidak membaca kode, prompt, atau laporan pipeline. Tidak ada panggilan API berbayar.
- **Rubrik** (sama dengan halaman QA): Benar / Kurang / Salah, ditambah centang *setia pada teks sumber*, *atribusi tepat*, dan *bebas nada fatwa*. Catatan wajib untuk Kurang dan Salah. Setiap gagasan dinilai terhadap Dasar teks-nya sendiri, bukan seluruh bab.
- **Pemeriksaan agent X15b:** kedua "Salah" dicek ulang ke teks Arabnya, dan keduanya memang salah. Gerbang dihitung dengan skrip: 140 gagasan dinilai tepat sekali, tanpa huruf Arab di catatan.
- **Nilai mentah:** [`ihya-9472-intisari-qa-agent-2026-10-25.json`](ihya-9472-intisari-qa-agent-2026-10-25.json), berbentuk "Salin hasil" halaman QA ditambah catatan kutipan dan abstrak.

## Hasil per Intisari

| Intisari | Model | Gagasan | Benar | Kurang | Salah | tidak setia | atribusi keliru | nada fatwa |
|---|---|---|---|---|---|---|---|---|
| Kitab Ilmu (`dg-100003-id-b`) | Sonnet | 8 | 3 | 5 | 0 | 1 | 0 | 0 |
| Kitab Ilmu (`dg-100003-id-bh`) | Haiku (pembanding) | 7 | 2 | 5 | 0 | 1 | 0 | 0 |
| Bab Pertama: Keutamaan ilmu, mengajar, dan belajar, serta bukti-buktinya dari dalil naqli dan akal (`dg-100004-id-m`) | Haiku | 6 | 2 | 4 | 0 | 3 | 1 | 0 |
| Keutamaan ilmu (`dg-100005-id`) | Haiku | 5 | 4 | 1 | 0 | 1 | 0 | 0 |
| Keutamaan belajar (`dg-100006-id`) | Haiku | 4 | 3 | 1 | 0 | 0 | 0 | 0 |
| Keutamaan mengajar (`dg-100007-id`) | Haiku | 7 | 4 | 2 | 1 | 2 | 0 | 0 |
| Bukti-bukti akal (`dg-100008-id`) | Haiku | 6 | 4 | 2 | 0 | 1 | 0 | 0 |
| Bab Kedua: Ilmu yang terpuji dan yang tercela, pembagian keduanya, serta hukum-hukumnya (`dg-100009-id-m`) | Haiku | 7 | 6 | 1 | 0 | 1 | 0 | 0 |
| Penjelasan ilmu yang menjadi fardu kifayah (`dg-100010-id-m`) | Haiku | 7 | 5 | 2 | 0 | 2 | 0 | 0 |
| Bab Ketiga: Apa yang dianggap orang awam termasuk ilmu-ilmu terpuji padahal bukan (`dg-100011-id-m`) | Haiku | 6 | 5 | 1 | 0 | 0 | 0 | 0 |
| Penjelasan lafaz-lafaz ilmu yang telah diubah maknanya (`dg-100012-id`) | Haiku | 5 | 1 | 4 | 0 | 2 | 1 | 0 |
| Penjelasan kadar yang terpuji dari ilmu-ilmu yang terpuji (`dg-100013-id`) | Haiku | 7 | 5 | 2 | 0 | 0 | 0 | 0 |
| Bab Keempat: Sebab manusia berbondong-bondong menekuni ilmu khilaf, rincian bencana-bencana perdebatan dan debat, serta syarat-syarat kebolehannya (`dg-100014-id-m`) | Haiku | 7 | 3 | 4 | 0 | 0 | 0 | 0 |
| Penjelasan tipuan dalam menyamakan perdebatan-perdebatan ini dengan musyawarah para sahabat dan diskusi kaum salaf (`dg-100015-id`) | Haiku | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| Penjelasan bencana-bencana perdebatan dan sifat-sifat akhlak yang membinasakan yang lahir darinya (`dg-100016-id`) | Haiku | 6 | 4 | 2 | 0 | 0 | 0 | 0 |
| Bab Kelima: Adab murid dan guru (`dg-100017-id-m`) | Haiku | 7 | 6 | 0 | 1 | 1 | 0 | 0 |
| Penjelasan tugas-tugas guru pembimbing (`dg-100018-id`) | Haiku | 6 | 4 | 2 | 0 | 1 | 0 | 0 |
| Bab Keenam: Bencana-bencana ilmu dan penjelasan tanda-tanda ulama akhirat serta ulama jahat (`dg-100019-id-m`) | Haiku | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| Bab Ketujuh: Akal, kemuliaannya, hakikatnya, dan pembagiannya (`dg-100020-id-m`) | Haiku | 7 | 5 | 2 | 0 | 0 | 0 | 0 |
| Penjelasan kemuliaan akal (`dg-100021-id`) | Haiku | 7 | 5 | 2 | 0 | 0 | 1 | 0 |
| Penjelasan hakikat akal dan pembagiannya (`dg-100022-id`) | Haiku | 6 | 5 | 1 | 0 | 1 | 0 | 0 |
| Penjelasan perbedaan tingkat akal di antara jiwa-jiwa (`dg-100023-id`) | Haiku | 7 | 5 | 2 | 0 | 0 | 0 | 0 |

Kolom *tidak setia*, *atribusi keliru*, dan *nada fatwa* menghitung centang yang tidak diberikan. Pembanding Haiku tidak ikut gerbang.

**Kepekaan:** penilai Bab 3–4 menyebut `dg-100012-id#g4` "hampir Salah", tetapi menilainya Kurang. Bila dihitung Salah, hasilnya 3/133 = 2,3%, tetap lolos.

## Dua gagasan Salah

1. **`dg-100007-id#g4`** (Keutamaan mengajar; Haiku, `digest-section@2`). Isinya menyebut mengajarkan kalimat hikmah "setara dengan ibadah sunah". Hadis di Dasar teks 1 menyebut setara ibadah *setahun*: kata *sanah* (tahun) terbaca *sunnah*. Terjemahan AI paragrafnya sendiri sudah benar ("ibadah setahun"). Pertanyaan gagasan ini (makna tanah tandus) juga tidak terjawab oleh isinya.
2. **`dg-100017-id-m#g2`** (Bab Kelima; Haiku, `digest-merge@1`). Kalimat terakhirnya ("bukan rumah dan anjing secara harfiah, melainkan isyarat kepada batin") membalik Dasar teks 2. Di sana al-Ghazali menegaskan tidak mengatakan rumah = hati dan anjing = amarah. Menurutnya hadis itu peringatan (*tanbih*) kepada batin yang tetap menetapkan makna lahirnya, dan kehalusan inilah yang membedakannya dari kaum Batiniyah.

Keduanya masih tampil di staging (Preview). Keduanya harus ditahan atau dibuat ulang sebelum `ihya-v9` dipromosikan (X15c).

## Pola "Kurang" (40)

Dikelompokkan agent X15b dari catatan penilai, menurut masalah utama tiap gagasan (sebagian punya lebih dari satu masalah):

- **Klaim tidak tertutup Dasar teks (16).**
  - Kelima Kurang di Intisari Kitab (Sonnet) termasuk di sini.
  - Isinya sering memang ada di bagian lain kitab, misalnya kisah Nabi Daud, dendam dan tajassus, atau daftar ilmu tercela. Jadi masalahnya lebih pada penunjuk yang kurang daripada isi karangan.
  - Penyebab di gagasan Kitab/merge: jangkarnya diambil bergiliran dari jangkar gagasan sumber dan dibatasi 9 (`anchorsFromPoints`). Akibatnya, jangkar yang mendukung klaim tertentu bisa tidak terbawa.
  - Pengecualian: tafsir "pakaian takwa = rasa malu" (`dg-100004-id-m#g1`, `dg-100005-id#g1`) tidak ditemukan di teks Arab paket mana pun.
- **Makna bergeser (21):**
  - dilunakkan: "boleh dilarang" untuk "hendaknya melarang", "bukan semata" untuk "tidak lain", "tidak boleh meninggalkannya begitu saja";
  - dilebihkan: ucapan Malik menjadi "tidak ada yang lebih utama", dan "lebih hina" menjadi "paling rendah";
  - digeneralisasi: "kaum sufi" untuk "sebagian kelompok sufi", dan "ulama" untuk "ulama su'";
  - pelaku tertukar: "mempelajari untuk diajarkan" menjadi "mengajarkan", dan penjelasan al-Ghazali disandarkan kepada sabda Nabi;
  - perumpamaan rusak: batu asah menjadi pisau.
- **Pertanyaan tidak terjawab atau melingkar (3).**

## Sonnet vs Haiku (Intisari Kitab)

Sonnet: 8 gagasan (3 Benar, 5 Kurang, 0 Salah). Haiku: 7 gagasan (2 Benar, 5 Kurang, 0 Salah).

Penilai memilih Sonnet, dengan dua alasan:
- cakupannya lebih lengkap: kewajiban mengajar, tiga kadar ilmu, syarat debat beserta contoh Umar dan Ali, dan tugas guru;
- satu gagasan per bab lebih mudah diikuti pembaca awam.

Kekurangan Sonnet kebanyakan berupa klaim tanpa Dasar teks. Haiku lebih sering mengaburkan logika teks (g1, g3, g4) dan memadatkan bab debat menjadi satu gagasan. Penilaian ini sejalan dengan pilihan pemilik, yaitu Sonnet (ADR-098).

## Kutipan, abstrak, nada fatwa

- **Kutipan pilihan:** semua terjemahannya dinilai tepat. Satu label jenis dipertanyakan: kutipan 1 di `dg-100017-id-m` berlabel riwayat, padahal itu kalimat al-Ghazali sendiri yang merangkum riwayat.
- **Abstrak:** lima catatan ringan:
  - cakupan Bab Pertama tanpa dalil akal;
  - perumpamaan yang tidak muncul di gagasan;
  - "salat sunah" pada kisah Malik, padahal jenis salatnya tidak disebut;
  - "empat tingkat pengajaran" yang kabur;
  - satu klaim tugas guru yang tidak tertelusur.
- **Nada fatwa:** tidak ditemukan di 140 gagasan.

## Untuk X15c

1. **Dua gagasan Salah:** tangani sebelum promote, lewat lapisan koreksi Intisari (pola `data/reviews/ihya-9472-terjemahan.json`, ADR-047/X02) yang menahan atau membuat ulang gagasan berlabel Salah.
2. **Dasar teks:** gagasan Kitab/merge perlu memuat setidaknya satu jangkar dari setiap gagasan sumber yang dirujuk. Batas 9 yang diisi bergiliran sekarang bisa menghilangkan jangkar pendukung. Di tingkat leaf, prompt perlu meminta setiap klaim ditunjuk bloknya.
3. **Prompt berikutnya:**
   - pertahankan kata modal dan pembatas ("sebagian", "hendaknya", "tidak lain");
   - pertanyaan harus terjawab oleh isi gagasannya;
   - *sanah* berarti tahun, kecuali konteksnya sunah.
4. **Penilaian manusia T-31** (pemilik atau Ust. Anas) tetap terbuka, memakai halaman QA yang sama.

## Batas penilaian

- Satu penilai agent per gagasan, tanpa penilai kedua untuk mengukur kesepakatan.
- Dasar teks berupa potongan blok. Penilai memakai terjemahan AI paragraf utuh sebagai bantuan, padahal terjemahan itu sendiri bisa keliru.
- Yang tidak dinilai: gaya bahasa, kelengkapan cakupan bab, mutu glosarium, dan suara.

## Semua catatan penilai (Kurang dan Salah)

- **Kurang** `dg-100003-id-b#g1`: Klaim bahwa larangan menyembunyikan ilmu menunjukkan kewajiban menyampaikannya (jawaban Pertanyaan kedua), beserta pahala pengajar dan ancaman bagi penyembunyi ilmu, tidak ada di Dasar teks mana pun; DT6 hanya memuat QS 9:122 yang dimaknai sebagai pengajaran. 'Ucapan sebagian sahabat dan ulama' bahwa menuntut ilmu lebih utama daripada salat sunah juga tidak tertelusur, sebab DT7 hanya berisi hadis Nabi (termasuk soal seratus rakaat), bukan ucapan sahabat atau ulama.
- **Kurang** `dg-100003-id-b#g2`: 'Menukil lebih dari dua puluh pendapat' berlebihan karena DT2 hanya menyebut ada lebih dari dua puluh golongan dan al-Ghazali menolak merincinya, sedangkan contoh Ramadan dan zakat tidak ada di Dasar teks (DT8 hanya contoh waktu salat). Definisi fardu kifayah sebagai ilmu untuk urusan dunia diambil dari bagian ilmu non-syar'i yang terpuji di DT6, tetapi disajikan seolah definisi fardu kifayah secara umum.
- **Kurang** `dg-100003-id-b#g5`: Syarat mujtahid disebut 'Kedua', padahal DT4 menyebutnya syarat ketiga dari delapan syarat (DT1). Dendam, gibah, pujian diri, kemunafikan, wajah pendebat yang muram, dan aturan 'hanya boleh menukil mazhab gurunya' tidak ada di Dasar teks; DT6 dan DT9 hanya memuat hasad dan takabur.
- **Kurang** `dg-100003-id-b#g7`: Kalimat bahwa al-Ghazali menukil kisah Nabi Daud as. tentang ulama yang dikuasai dunia tidak ada di DT1-DT9. Klaim lain tertelusur: ciri ulama akhirat (DT3), menjauhi penguasa (DT4, DT9), dan 'tidak tahu' sebagai separuh ilmu (DT5).
- **Kurang** `dg-100003-id-b#g8`: Makna ketiga (ilmu dari pengalaman) dan keempat (kekuatan menahan syahwat), serta alasan perbedaan tingkat akal (usia, pengetahuan tentang bahaya maksiat, naluri yang tumbuh), tidak ada di Dasar teks. DT5 hanya menyatakan perbedaan berlaku pada semua jenis kecuali jenis kedua, dan pengecualian itu tidak disebut.
- **Kurang** `dg-100003-id-bh#g1` (pembanding Haiku): Kalimat 'ulama adalah pewaris para nabi, karena Nabi bersabda bahwa Allah menjadikan faqih orang yang Ia kehendaki baik' mengarang hubungan sebab antara dua hadis yang di DT2 berdiri sendiri-sendiri. Al-Syafi'i tidak ada di Dasar teks mana pun; DT9 justru berisi ucapan Malik lewat Ibnu 'Abd al-Hakam, yang tidak disebut.
- **Kurang** `dg-100003-id-bh#g2` (pembanding Haiku): Contoh Ramadan, zakat, dan kewajiban mempelajari rukun haji setelah berniat tidak ada di Dasar teks (DT7 hanya contoh waktu salat), dan 'menukil ... lebih dari dua puluh' berlebihan karena DT1 menyatakan al-Ghazali tidak merinci pendapat-pendapat itu. Definisi fardu kifayah sebagai ilmu urusan dunia di DT4 khusus untuk ilmu non-syar'i yang terpuji, tetapi disajikan seolah definisi umum.
- **Kurang** `dg-100003-id-bh#g3` (pembanding Haiku): Kisah dokter yang menakut-nakuti perempuan mandul (DT5, DT9) dipakai al-Ghazali untuk menunjukkan bahwa sebagian ilmu berbahaya dan ketidaktahuan kadang bermanfaat, bukan sebagai contoh 'mendalami rahasia ilahi sebelum waktunya'. Lagi pula DT5 meminta orang dicegah sama sekali dari membahas rahasia ilahi, bukan sekadar menunggu waktunya.
- **Kurang** `dg-100003-id-bh#g4` (pembanding Haiku): Kalimat 'orang dunia yang condong pada mazhab akan mengikuti ke arah itu' mengaburkan DT6: para pendebatlah yang akan ikut condong seandainya para pemegang dunia beralih ke imam atau ilmu lain. Syarat pertama (fardu ain), jawaban Pertanyaan kedua, tidak terlihat karena DT3 terpotong sebelum isinya, dan takabur serta dendam tidak ada di Dasar teks (DT9 hanya hasad).
- **Kurang** `dg-100003-id-bh#g7` (pembanding Haiku): Makna ketiga dan keempat akal, 'naluri sempurna sekitar usia empat puluh tahun', alasan perbedaan tingkat akal (jawaban Pertanyaan kedua), dan pernyataan bahwa hakikat akal termasuk ilmu mukasyafah tidak ada di Dasar teks. DT5 hanya menyatakan perbedaan berlaku pada semua jenis kecuali jenis kedua, dan pengecualian itu tidak disebut.
- **Kurang** `dg-100004-id-m#g1`: Klaim bahwa al-Ghazali menafsirkan 'pakaian takwa' sebagai rasa malu tidak ada di Dasar teks 1–6 (ayatnya tidak dikutip), dan Isi menjadikannya tafsiran al-Ghazali sendiri, padahal intisari anaknya (dg-100005-id#g1) menyebutnya pendapat yang ia nukil. Derajat ulama di atas orang beriman (Dasar teks 3) juga ucapan Ibnu Abbas yang ia kutip, bukan rumusannya sendiri.
- **Kurang** `dg-100004-id-m#g2`: Isi menyebut bahwa 'dalam riwayat yang sama' ulama disebut pewaris para nabi, padahal di Dasar teks 1 keduanya hadis terpisah (bernomor 1 dan 2). Komentar al-Ghazali bahwa tidak ada derajat di atas kenabian sudah sesuai teks.
- **Kurang** `dg-100004-id-m#g5`: Di Dasar teks 2 Malik hanya berkata bahwa salat yang hendak dikerjakan tidak lebih utama daripada belajarnya bila niatnya benar; Isi melebarkannya menjadi 'tidak ada yang lebih utama', sehingga bisa terbaca seolah belajar mengungguli salat zuhur itu sendiri. Nukilan Abu al-Darda' dan al-Syafi'i (Dasar teks 1, 3, 4) sudah tepat.
- **Kurang** `dg-100004-id-m#g6`: Hadis di Dasar teks 5 menjanjikan pahala tujuh puluh shiddiq bagi orang yang mempelajari satu bab ilmu untuk diajarkan, bukan bagi 'orang yang mengajarkan', dan Pertanyaan dibangun di atas pergeseran itu. Kalimat 'ilmu yang bermanfaat terus mengalirkan pahala' tidak ada di Dasar teks 1–7 (hadisnya baru muncul di dg-100007-id#g5, h. 11).
- **Kurang** `dg-100005-id#g1`: Kalimat tentang tafsir 'pakaian takwa' sebagai rasa malu, yang juga menjadi Pertanyaan kedua, tidak didukung Dasar teks 1–5 (ayat itu tidak dikutip di mana pun). Bagian lain (QS 3:18, QS 58:11 dan ucapan Ibnu Abbas) sesuai teks.
- **Kurang** `dg-100006-id#g4`: Dasar teks 1 hanya menyatakan bahwa salat yang hendak ia kerjakan tidak lebih utama daripada belajarnya bila niatnya benar; Isi melebarkannya menjadi 'tidak ada yang lebih utama', dan bersama Judul ('lebih utama dari salat') bisa terbaca seolah belajar mengungguli salat zuhur yang wajib.
- **Kurang** `dg-100007-id#g2`: Hadis di Dasar teks 2 berbunyi 'barang siapa mempelajari satu bab ilmu untuk mengajarkannya kepada manusia', tetapi Isi dan Pertanyaan mengubahnya menjadi pahala bagi orang yang mengajarkan satu bab ilmu. Bagian syafaat ulama dan catatan al-Ghazali tentang ilmu yang menular lewat pengajaran (Dasar teks 3) sudah tepat.
- **Salah** `dg-100007-id#g4`: Isi menyatakan mengajarkan kalimat hikmah 'setara dengan ibadah sunah', padahal hadis di Dasar teks 1 menyebut setara ibadah setahun (kata 'sanah' terbaca 'sunah'; terjemahan paragraf pun menulis 'ibadah setahun'), sehingga besaran pahala yang menjadi inti gagasan salah. Pertanyaan tentang makna tanah tandus juga tidak dijawab Isi (teks: perumpamaan bagi orang yang terhalang dari kedua manfaat).
- **Kurang** `dg-100007-id#g6`: Atha, Said bin al-Musayyab, dan Yahya bin Muadz tidak muncul di Dasar teks 1–6, begitu pula penjelasan bahwa ucapan Sufyan didorong semangat keutamaan mengajar (Dasar teks 3 berhenti pada 'negeri tempat ilmu mati'). Ucapan Ibnu Abbas, al-Hasan, Ikrimah, dan nasihat 'ajarkan ilmumu' sesuai teks.
- **Kurang** `dg-100008-id#g4`: Dasar teks 1 menyimpulkan bahwa pangkal kebahagiaan dunia dan akhirat adalah ilmu (karena amal pun bergantung pada ilmu), sehingga ilmu disebut amal paling utama; Isi menggesernya menjadi 'ilmu bersama amal menjadi pangkal', yang tidak sejalan dengan teks maupun Pertanyaannya sendiri.
- **Kurang** `dg-100008-id#g6`: Dasar teks 2 hanya memuat tingkat keempat (para pemberi nasihat) dan frasa 'setelah kenabian'; tingkat kedua dan ketiga (khalifah/penguasa dan ulama) yang dibutuhkan untuk menjawab Pertanyaan tidak ada di Dasar teks. Klaim bahwa pengajaran paling mulia setelah kenabian sesuai teks.
- **Kurang** `dg-100009-id-m#g6`: Daftar ilmu tercela (sihir, tilasman, sulap) dan ilmu mubah (syair) yang menjadi jawaban Pertanyaan tidak ada di Dasar teks 1, yang berhenti pada definisi fardu kifayah. Contoh ilmu non-syar'i di teks adalah hisab, kedokteran, dan bahasa, bukan syair.
- **Kurang** `dg-100010-id-m#g1`: Daftar ilmu tercela (sihir, tilasman, sulap) dan ilmu mubah (syair) yang menjadi jawaban Pertanyaan tidak ada di Dasar teks 1, yang berhenti pada definisi fardu kifayah. Contoh ilmu non-syar'i di teks adalah hisab, kedokteran, dan bahasa, bukan syair.
- **Kurang** `dg-100010-id-m#g3`: Kalimat 'para ulama menganjurkan agar meneladani sahabat' tidak ada di Dasar teks 1–3. Definisi cabang sebagai pemahaman lewat akal juga baru didukung Dasar teks gagasan 4, bukan gagasan ini.
- **Kurang** `dg-100011-id-m#g5`: Kisah tabib (Dasar teks 1-2) dipotong sebelum hasilnya: ketakutan membuat sang istri kurus sehingga ia bisa hamil, jadi ketidaktahuannya justru bermanfaat; tanpa itu contoh 'sebagian ilmu berbahaya' mudah dibaca sebagai tabib yang mencelakakan. Yang diperiksa tabib juga sang istri sendiri, bukan 'istri pasiennya'.
- **Kurang** `dg-100012-id#g1`: Pertanyaan kedua (mengapa rincian fatwa tidak menumbuhkan rasa takut) tidak dijawab: Isi hanya menyatakannya tanpa alasan dari Dasar teks 1 bahwa menekuni rincian itu terus-menerus justru mengeraskan hati. 'Jual beli' juga kurang tepat untuk salam dan ijarah (sewa).
- **Kurang** `dg-100012-id#g3`: Isi menyebut tingkat inti tauhid 'dimiliki kaum shiddiq', padahal Dasar teks 3-5 hanya membagi tauhid menjadi dua kulit dan inti tanpa menyebut kaum shiddiq; detail itu tambahan model.
- **Kurang** `dg-100012-id#g4`: Klaim bahwa al-Ghazali 'menyatakan majelis para sahabat berisi mengingat iman dan merenungi Al-Qur'an' tidak ada di Dasar teks 1-6, dan frasa 'mengingat iman' di Judul bertumpu padanya. Menurut Dasar teks 3, tazkir terpuji berisi ilmu akhirat, kematian, aib jiwa, bisikan setan, nikmat Allah, hinanya dunia, dan dahsyatnya akhirat.
- **Kurang** `dg-100012-id#g5`: Dasar teks 1 menyatakan semua ilmu yang diridai salaf telah lenyap dan sebagian besar yang ditekuni orang adalah bid'ah, sedangkan Isi melunakkannya menjadi 'sebagian ilmu ... telah bergeser'. Penjelasan bahwa ghuraba adalah orang yang memperbaiki sunah adalah jawaban Nabi dalam hadis, bukan penjelasan al-Ghazali sendiri.
- **Kurang** `dg-100013-id#g4`: Judul membatasi anjuran pada 'orang yang mampu membersihkan diri', padahal Dasar teks 1-2 menujukannya kepada orang yang sibuk memperbaiki dirinya dan siapa pun yang menginginkan akhirat, karena ilmu sifat hati 'diabaikan semua orang'. Isinya sendiri sesuai.
- **Kurang** `dg-100013-id#g5`: Dasar teks 1 menyebut fanatisme sebagai penyakit ulama su' (ulama buruk), sedangkan Isi menulis 'penyakit ulama' secara umum. Kalimat pertama juga bergeser: teks membicarakan orang awam yang tak bisa diharapkan kembali bila fanatismenya menguat, bukan lawan yang 'tidak menerima kekalahan'.
- **Kurang** `dg-100014-id-m#g2`: Dasar teks 2 menegaskan bahwa inilah pendorong kesibukan pada khilafiah dan debat, 'tidak lain', sedangkan Isi melunakkannya menjadi 'pendorong utama ... bukan ilmu agama semata', seolah agama tetap ikut menjadi motif.
- **Kurang** `dg-100014-id-m#g3`: Pertanyaan dijawab melingkar: Isi hanya berkata debat yang tidak memenuhi syarat tidak sama dengan musyawarah sahabat tanpa menjelaskan bedanya. Dasar teks 1 pun hanya memuat dalih para pendebat; uraian syaratnya baru ada di Dasar teks gagasan 4.
- **Kurang** `dg-100014-id-m#g4`: Dasar teks 4 menyatakan orang yang bukan mujtahid tidak boleh meninggalkan mazhabnya walau melihat kelemahannya; tambahan 'begitu saja' melunakkan ketentuan itu. Syarat mujtahid juga syarat ketiga (Dasar teks 2), bukan 'syarat berikutnya', dan contoh Dasar teks 5 adalah orang yang meninggalkan salat, bukan menundanya.
- **Kurang** `dg-100014-id-m#g7`: Dendam dan tajassus disebut di Isi tetapi tidak ada di Dasar teks 1-9 gagasan ini (keduanya memang ada di bagian yang sama, lihat dg-100016-id). Judul juga menyebut 'perdebatan' tanpa batasan, padahal Dasar teks 1 hanya membicarakan perdebatan untuk menang dan pamer.
- **Kurang** `dg-100016-id#g1`: Judul menyebut 'perdebatan' secara umum sebagai sumber segala akhlak tercela, padahal Dasar teks 1 membatasinya pada perdebatan untuk menang, membungkam, dan pamer. Perumpamaannya juga tertukar: Dasar teks 2-3 menyamakan perdebatan dengan minum khamar, sedangkan takabur, ujub, dan hasad sejajar dengan zina dan dosa lahir lainnya.
- **Kurang** `dg-100016-id#g2`: Ucapan Ibnu Abbas di Dasar teks 3 melarang menerima perkataan para fakih tentang satu sama lain karena mereka saling cemburu, bukan menolak pendapat fakih yang saling mendengki secara umum; Isi menggeser maknanya.
- **Salah** `dg-100017-id-m#g2`: Kalimat terakhir Isi ('maksudnya, menurut al-Ghazali, bukan rumah dan anjing secara harfiah, melainkan isyarat kepada batin') membalik Dasar teks 2: al-Ghazali menegaskan ia tidak mengatakan rumah = hati dan anjing = amarah, melainkan hadis itu tanbih kepada batin dengan tetap menetapkan makna lahirnya, dan justru kehalusan inilah yang membedakannya dari kaum Batiniyah. Bagian lain (hati sebagai rumah malaikat, sifat tercela sebagai anjing, Dasar teks 1) sudah benar.
- **Kurang** `dg-100018-id#g2`: Isi menyebut 'pisau yang tidak memotong', padahal Dasar teks 1 menyebut batu asah yang menajamkan benda lain tetapi dirinya sendiri tidak memotong, sehingga logika perumpamaannya hilang. 'Sumbu lilin' (juga di Judul) semestinya sumbu lampu.
- **Kurang** `dg-100018-id#g6`: Isi dan Pertanyaan memakai 'boleh dilarang', padahal Dasar teks 1 menjadikannya bagian tugas guru: bila murid hanya mencari dunia dan yang ia pelajari ilmu khilaf fikih, jadal kalam, atau fatwa sengketa, guru mencegahnya (terjemahan paragraf: 'hendaknya melarangnya'). Modalitas anjuran melemah menjadi sekadar kebolehan.
- **Kurang** `dg-100020-id-m#g6`: Pertanyaan kedua ('apa yang menyebabkan perbedaan naluri akal?') tidak dijawab Isi; Dasar teks 4 hanya menyatakan perbedaan naluri tidak bisa diingkari dan naluri tumbuh bertahap hingga sekitar 40 tahun. Isi juga menjadikan perubahan menurut usia sebagai sumber perbedaan akal tanpa catatan Dasar teks 8 bahwa perbedaan yang bersumber dari kuat-lemahnya syahwat tidak kembali kepada perbedaan akal.
- **Kurang** `dg-100020-id-m#g7`: Dasar teks 1 menyebut 'sebagian kelompok sufi', tetapi Judul dan Isi menggeneralisasi menjadi 'kaum sufi' yang mencela akal. Isi juga melewatkan alasan pokok di Dasar teks 2: yang dimaksud al-Ghazali dengan akal sama dengan yang mereka maksud dengan 'ainul yaqin dan cahaya iman.
- **Kurang** `dg-100021-id#g2`: Judul menyandarkan alasan 'karena pengalaman hasil akalnya' kepada sabda Nabi, padahal hadis di Dasar teks 1 hanya berbunyi 'orang tua di tengah kaumnya seperti nabi di tengah umatnya'; alasan pengalaman adalah penjelasan al-Ghazali sendiri. Isi sudah memisahkannya dengan benar.
- **Kurang** `dg-100021-id#g3`: Dasar teks 1 menyebut yang tampak di wajah Nabi adalah cahaya kenabian, yang tersembunyi dalam diri beliau 'sebagaimana akal tersembunyi'; Isi menghilangkan cahaya kenabian sehingga analogi itu terbaca seolah yang memancar dan membuat gentar adalah akal beliau.
- **Kurang** `dg-100022-id#g5`: Klaim bahwa ilmu pengalaman 'tumbuh dari dua makna sebelumnya' tidak ada di Dasar teks 1–2, yang hanya menyebut ilmu dari pengalaman sebagai jenis lain yang juga dinamai akal. Klaim itu tidak bisa ditelusuri dari paket (mungkin diambil dari kelanjutan teks yang tidak dikutip).
- **Kurang** `dg-100023-id#g5`: Dasar teks 1 menyatakan orang yang menyamakan akal Nabi dengan akal orang desa dan badui kasar 'lebih hina dirinya daripada orang desa itu' (perbandingan), sedangkan Isi dan Pertanyaan menjadikannya 'paling rendah dirinya', dan Pertanyaannya melingkar. Judul juga mencampur dua hal: yang berlaku bertahap pada seluruh makhluk adalah sunnatullah dalam penciptaan, bukan 'perbedaan naluri'.
- **Kurang** `dg-100023-id#g7`: Dasar teks 1 menyebut 'sebagian kelompok sufi', tetapi Judul dan Isi menggeneralisasi menjadi 'kaum sufi' yang mencela akal. Isi juga melewatkan alasan pokok di Dasar teks 2: yang dimaksud al-Ghazali dengan akal sama dengan yang mereka maksud dengan 'ainul yaqin dan cahaya iman.

## Catatan abstrak dan perbandingan

- `dg-100003-id-b`: Tidak ditemukan masalah faktual pada Pembuka, Abstrak, dan Penutup; daftar tujuh bab sesuai dengan Dasar teks.
- `dg-100003-id-bh`: Pembuka menyebut bab ketiga sebagai 'ilmu yang dikira bagian agama padahal bukan', padahal bab itu membahas ilmu yang dikira terpuji oleh orang awam, termasuk sihir dan nujum; kecil tetapi kurang tepat. Abstrak dan Penutup tidak bermasalah secara faktual.
- `perbandingan`: Keduanya mencakup ketujuh bab dan tidak ada gagasan yang Salah; keenam Kutipan pilihan diterjemahkan dengan tepat. Berkas 01 (8 gagasan: 3 Benar, 5 Kurang) lebih lengkap (kewajiban mengajar, tiga kadar ilmu, syarat debat beserta contoh Umar dan Ali, tugas guru) dan lebih mudah diikuti pembaca awam karena tiap bab punya gagasan sendiri; kekurangannya kebanyakan klaim yang tidak ditunjuk Dasar teks (g1, g2, g5, g7, g8) ditambah salah nomor syarat di g5, yang mudah diperbaiki. Berkas 02 (7 gagasan: 2 Benar, 5 Kurang) memadatkan bab debat menjadi satu gagasan, dan beberapa kalimatnya mengaburkan logika teks (hubungan sebab karangan di g1, contoh dokter yang salah tempat di g3, pelaku yang kabur di g4), meski unggul karena riwayat Nabi Daud tertelusur dan memuat rupa batin di akhirat. Saya memilih menerbitkan 01, setelah nomor syarat di g5 diperbaiki dan Dasar teks untuk klaim yang belum tertelusur ditambahkan.
- `dg-100004-id-m`: Cakupan, bukan salah fakta: Abstrak (dan keenam gagasan) hanya menggambarkan dalil Al-Qur'an, hadis, dan atsar, padahal judul bab menyebut dalil naqli dan akal; bukti-bukti akal (dg-100008-id) tidak disinggung sama sekali.
- `dg-100005-id`: Ringan: Abstrak menyebut alur ditutup dengan 'perumpamaan tentang ilmu yang disandingkan dengan amal', tetapi tidak ada gagasan atau Dasar teks yang memuat perumpamaan itu; rujukannya tidak jelas.
- `dg-100006-id`: Ringan: Abstrak menyebut kisah Malik dan Ibnu Abd al-Hakam sebagai perbandingan belajar dengan salat sunah, padahal teks hanya menyebut waktu zuhur tiba dan ia hendak salat tanpa menyebut jenis salatnya; Judul gagasan 4 malah menyebut 'salat' saja.
- `dg-100008-id`: Ringan: Abstrak menulis bahwa al-Ghazali 'menempatkan pengajaran dalam empat tingkat'; menurut Dasar teks gagasan 6, empat tingkat itu adalah empat golongan pekerjaan (yang keempat para pemberi nasihat) dan pengajaran disebut paling mulia di antaranya setelah kenabian, bukan pengajaran yang terbagi empat tingkat.
- `dg-100018-id`: Abstrak menyebut tugas guru 'penyampaian ilmu sesuai kemampuan akal murid', tetapi tidak ada gagasan atau Dasar teks dalam paket yang memuatnya; klaim itu tidak bisa ditelusuri dari paket (mungkin benar menurut kelanjutan bab).
