# Sumber terjemahan Al-Qur'an berbahasa Inggris untuk situs Surau berbahasa Inggris · 24 Oktober 2026

Riset ini menjawab satu pertanyaan yang tersisa dari [ADR-092](../../implementasi/KEPUTUSAN.md): situs `/en/…` butuh terjemahan ayat Inggris yang **sah, berlisensi jelas, dan tampil verbatim**, karena ayat tidak pernah diterjemahkan model ([aturan 9](../../.claude/rules/teks-arab.md)). Dokumen ini hanya riset dan rekomendasi. Keputusan dan semua permintaan izin ada di tangan pemilik (draf tugas: **T-27** di [TUGAS-PEMILIK](../../implementasi/TUGAS-PEMILIK.md)). Tidak ada kode dan tidak ada data ayat yang diunduh ke repo.

> **Bukan nasihat hukum.** Semua status hak cipta di bawah berasal dari halaman penerbit, halaman distributor, dan rujukan publik yang disebut di setiap baris. Yang tidak bisa dipastikan ditandai **"perlu dikonfirmasi"**. Pembacaan teks lisensi di bawah dilakukan 2026-10-24; syarat bisa berubah.

## 1. Yang dibutuhkan Surau dari sebuah terjemahan

Surau memakai terjemahan ayat dengan empat cara. Setiap sumber harus diizinkan untuk **semuanya**, bukan hanya yang pertama:

| # | Pemakaian | Mengapa |
|---|---|---|
| A | Tampil di situs nirlaba tanpa iklan | pembaca, Cari, Maknaz |
| B | Disimpan di korpus (`quran_translation`, `quran_source`) | ADR-040 |
| C | Ikut di **dump data** berlisensi CC BY-NC-SA 4.0 (`data/LICENSE`) | konten turunan Surau dibagikan |
| D | Keluar lewat API/MCP (`read_page` membawa `quran.sources` dan blok `license`) | S16 (lihat catatan di ADR-040 dan docs/03) |

Syarat tambahan dari aturan Surau: verbatim dan tidak diubah, sumber dan versi tercatat di `quran_source` dengan sha256 (ADR-040), lengkap per ayat dengan penomoran 6.236 ayat, dan bisa dicocokkan dengan teks Tanzil.

**Catatan tentang CC BY-NC-SA.** Lisensi dump seharusnya hanya berlaku untuk bagian yang dimiliki Surau. Teks Tanzil (CC BY 3.0, verbatim) sudah diperlakukan begitu lewat `quran_source.attribution` dan `data/ATTRIBUTION.md`. Tetapi `data/LICENSE` sekarang menyebut "dump korpus" CC BY-NC-SA tanpa pengecualian pihak ketiga, dan Kemenag tidak punya syarat tertulis (risiko diterima pemilik, ADR-040). Saat sumber Inggris masuk, `data/LICENSE` dan `data/ATTRIBUTION.md` harus diubah agar pengecualian pihak ketiga tertulis, dan aturan 9 di `teks-arab.md` serta aturan keras 2 di CLAUDE.md (kini hanya menyebut Kemenag) diperbarui lewat ADR. Karena itu syarat "tidak boleh diubah" atau "tidak boleh dibagikan ulang sebagai data" pada sebuah sumber langsung menentukan lolos atau tidaknya pemakaian C dan D. Sumber domain publik tidak punya masalah ini.

## 2. Kandidat

Kolom "izin tertulis": **ya** = pemegang hak melarang tanpa izin tertulis; **tidak** = syaratnya sudah tertulis publik atau tidak ada hak; **?** = status tidak bisa dipastikan.

| Kandidat | Pemegang hak | Syarat/lisensi (sumber) | A situs | B+C dump | D API/MCP | Izin tertulis | Format data |
|---|---|---|---|---|---|---|---|
| **Pickthall**, *The Meaning of the Glorious Koran* (1930) | Marmaduke Pickthall (w. 1936); edisi AS Knopf 1930 | Menurut catatan Sacred Texts (dibaca lewat [mirror](https://neonvagabond.xyz/mirrors/sacred-texts/isl/pick/index.htm), bukan situs aslinya), domain publik di negara dengan masa hak cipta 50 atau 70 tahun pascapencipta. Edisi Knopf terbit di New York tahun 1930 ([Wikipedia](https://en.wikipedia.org/wiki/The_Meaning_of_the_Glorious_Koran)), jadi dihitung masuk domain publik AS per 1 Jan 2026 (aturan 95 tahun; **perlu dikonfirmasi**). Sacred Texts menyebut edisi Hyderabad 1938 "technically not" domain publik di AS karena terbit di India. Edisi hasil revisi pihak lain (mis. Everyman, Amana, IDCI) bisa punya hak sendiri | ya | ya | ya | tidak (edisi 1930) | Tanzil `en.pickthall` (txt/xml/sql); Project Gutenberg #16955 (gabungan tiga terjemahan, "Public domain in the USA") |
| **Wahiduddin Khan** (Goodword/CPS) | Goodword Books (New Delhi) | Halaman judul edisi 2025: *"This translation of the Quran is copyright free"* ([PDF cpsglobal.org](https://cpsglobal.org/sites/default/files/2024-10/English-Quran-with-footnotes.pdf), saya baca langsung). Bukan teks lisensi baku (bukan CC0), dan tahun terbit pertama beda antarsumber (2009, 2011, 2014). Goodword biasanya meminta pemberitahuan ([cpsglobal](https://cpsglobal.org/books/living-in-hope/title-page-living-in-hope), judul lain) | ya | kemungkinan ya (**konfirmasi tertulis disarankan**) | idem | tidak wajib; **disarankan** | PDF resmi (dengan catatan kaki); Tanzil `en.wahiduddin` |
| **Saheeh International** | Abul-Qasim Publishing House (1997) dan Al-Muntada Al-Islami (2004) | Cetakan: *"No part of this publication may be reproduced … without written permission from the publisher"* (catatan hak cipta dalam pindaian edisi 1997/2004 yang beredar; salinan bukan resmi). Tidak ditemukan syarat pakai publik dari penerbit. Ada klaim tak terverifikasi tentang edisi "no rights reserved" dan unggahan arsip.org berstatus "Public Domain Mark" oleh pengunggah; **keduanya tidak boleh diandalkan** | tidak pasti | tidak | tidak | **ya** | PDF (IslamHouse); Tanzil `en.sahih` |
| **Noor International Center** (di QuranEnc) | Noor International Center; kanal QuranEnc.com | Isi = cetak ulang Saheeh International edisi revisi kedua 2004 menurut [GloQur](https://gloqur.de/quran-translation-of-the-week-146-noor-international-an-emerging-saudi-arabian-publisher-of-quran-translations/) (sumber sekunder; **perlu dicocokkan sendiri**). QuranEnc: *"Contents of the translations can be downloaded and re-published, with the following terms"*: tanpa ubah/tambah/hapus, sebut penerbit dan sumber (QuranEnc.com), cantumkan nomor versi, simpan informasi transkrip, laporkan catatan ke QuranEnc, **ikuti versi terbaru**, tanpa iklan tidak pantas ([syarat](https://quranenc.com/en/browse/english_rwwad)). Tidak ada pernyataan pemegang hak asli dan tidak ada pernyataan soal pemakaian komersial/dump data | ya, bila syarat dipenuhi | **belum jelas**: dump diizinkan "re-published", tetapi rantai hak ke Saheeh tidak dinyatakan | idem | **?** (rantai hak) | JSON API, SQLite, bukan PDF (kunci `english_saheeh` v1.1.2) |
| **The Clear Quran** (Dr. Mustafa Khattab, 2015/2016) | Al-Furqaan Foundation; Furqaan Institute (edisi Inggris+Arab) dan Book of Signs Foundation (Inggris saja) memegang lisensi eksklusif | *"No person, business, or entity shall reproduce … any verses or excerpts … without prior written consent"*; pengecualian hanya untuk organisasi **501(c)(3)**, maksimal 10% karya, untuk pendidikan ([theclearquran.org](https://theclearquran.org/?p=15021); [QUL](https://qul.tarteel.ai/resources/translation/426)) | tidak tanpa izin | tidak | tidak | **ya** | tidak ada unduhan publik; tersedia di Quran.com/QUL |
| **Yusuf Ali**, *The Holy Qur'an* (1934–38) | Abdullah Yusuf Ali (w. 1952/1953, sumber beda) | Teks asli 1934–38 diperkirakan domain publik di Inggris, UE, Pakistan, dan negara masa 70 tahun. **Status AS tidak pasti**: [Gutenberg](https://www.gutenberg.org/ebooks/16955) menyebut "Public domain in the USA", tetapi analisis [WikiIslam](https://wikiislam.net/wiki/%C2%A9_Notice_for_the_Abdullah_Yusuf_Ali_translation) (tidak bisa dibuka; dilihat lewat ringkasan pencarian) menyebut pemulihan hak cipta AS lewat GATT/URAA. Edisi revisi Raja Fahd (1985) dan Amana (1989) mengubah teks dan **tidak** otomatis bebas ([Wikipedia](https://en.wikipedia.org/wiki/The_Holy_Qur%27an:_Text,_Translation_and_Commentary)) | ya, di luar AS | ya, bila teks edisi asli | idem | **?** untuk AS | Tanzil `en.yusufali`; Gutenberg #16955 |
| **Hilali–Khan**, *Noble Qur'an* | Dar-us-Salam; kaitan dengan Kompleks Raja Fahd (**perlu dikonfirmasi**) | Di QuranEnc (`english_hilali_khan` v1.1.2) memakai tujuh syarat QuranEnc yang sama; QuranEnc tidak menyebut pemegang hak asli | ya, bila syarat dipenuhi | belum jelas | idem | **?** | JSON/SQLite QuranEnc; Tanzil `en.hilali` |
| **Rowwad Translation Center** (di QuranEnc) | Rowwad Translation Center bersama beberapa asosiasi dakwah dan IslamHouse | Syarat QuranEnc yang sama. Terjemahan baru dan **aktif diperbarui** (v1.0.20, 21 Okt 2026); syarat "ikuti versi terbaru" bertabrakan dengan sha256 yang dipin | ya, bila syarat dipenuhi | belum jelas | idem | **?** | JSON, SQLite, PDF, EPUB |
| **Itani** (Talal Itani, 2012) | Talal A. Itani | Edisi PDF 2012: semua hak dilindungi, penggandaan tanpa izin penulis dilarang. Edisi 2024 "dibantu AI" di SureQuran berlisensi Creative Commons, tetapi **bertentangan dengan prinsip Surau** (ayat tidak ditulis/diterjemahkan model) | tidak | tidak | tidak | ya | – |
| **Layanan API Quran.com / Quran Foundation (QF)** | Quran Foundation | [Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/) (diperbarui 2026-08-10): tidak boleh menyimpan konten >1 minggu kecuali lewat Content Sync; "open datasets" dan redistribusi sebagai data butuh lisensi komersial bertanda tangan; membangun model ML butuh izin tertulis; Content Sync tidak mengizinkan basis data terkemas. Syarat per terjemahan tidak diuraikan | hanya sebagai tampilan dalam app | **tidak** | tidak | – | API |
| **Tanzil** (sebagai penyedia berkas) | Tanzil tidak memegang hak terjemahan | [Halaman terjemahan](https://tanzil.net/trans/): *"for non-commercial purposes only"*; selain itu perlu izin penerjemah/penerbit; menerbitkan ulang **daftarnya** di situs lain perlu izin Tanzil; tidak ada teks lisensi per terjemahan | ya, nirlaba | abu-abu | abu-abu | tergantung terjemahan | txt/xml/sql |

Kunci berkas Tanzil (`en.pickthall`, `en.wahiduddin`, dan seterusnya) ditulis dari ingatan dan dari satu URL log (`en.itani`); halaman daftar Tanzil memuat nama terjemahan tetapi tidak kuncinya. Cek saat implementasi.

Terjemahan lain yang sering disebut (Abdel Haleem/OUP, Asad, Arberry, Shakir, Maududi, dan sebagainya) **tidak saya periksa**: umumnya masih berhak cipta aktif atau tidak diketahui. Bila pemilik menginginkan salah satunya, status perlu diteliti dari awal.

## 3. Mutu dan penerimaan

Hanya rujukan yang bisa dicek. Tidak satu pun dari ini menggantikan penilaian ustadz peninjau Surau.

| Terjemahan | Gambaran | Catatan penerimaan |
|---|---|---|
| Pickthall | Terjemahan Inggris pertama oleh Muslim berbahasa ibu Inggris; salah satu dari dua terjemahan Inggris paling populer ([Wikipedia](https://en.wikipedia.org/wiki/The_Meaning_of_the_Glorious_Koran)). Judulnya sendiri mengakui bahwa Al-Qur'an tak bisa diterjemahkan sempurna ("meaning") | Gaya Inggris klasik (*thou/hath*) terasa kuno bagi pembaca sekarang; tidak punya catatan kaki. Sebagai kutipan atribusi, rujukannya mapan |
| Wahiduddin Khan | Gaya sederhana dan modern; versi Inggris dari tafsir Urdunya *Tadhkir al-Qur'an* (1985), disunting Farida Khanam | Ulasan umum memuji keterbacaan ([cpsglobal](https://old.cpsglobal.org/node/10154)); satu ulasan menyebutnya "lebih bebas daripada literal". **Tidak ada penilaian ilmiah yang cukup saya temukan**; perlu ditinjau ustadz |
| Saheeh International | Bahasa modern, "Allah" dipertahankan, kata tambahan di kurung siku. Pernah jadi terjemahan baku di Quran.com | Sangat populer; dikritik condong ke "ortodoksi Sunni" dan dipromosikan lingkaran Salafi ([Wikipedia](https://en.wikipedia.org/wiki/Sahih_International)) |
| Clear Quran | Bahasa Inggris modern; jadi terjemahan baku Quran.com sejak 2020 ([Wikipedia](https://en.wikipedia.org/wiki/Clear_Quran)) | Klaim "disetujui resmi Al-Azhar" bersumber dari halaman dukungan proyek sendiri (belum terverifikasi independen) |
| Yusuf Ali | Bahasa sastra Victoria, catatan kaki panjang | Salah satu dari dua terjemahan paling populer; catatan kakinya dikritik (mis. tentang Yahudi), dan edisi revisi mengubah teks ([Wikipedia](https://en.wikipedia.org/wiki/The_Holy_Qur%27an:_Text,_Translation_and_Commentary)) |
| Hilali–Khan | Terjemahan resmi Saudi dalam penyebaran haji | Dikritik karena penambahan dalam kurung yang bernuansa tafsir sektarian dan kesalahan bahasa ([ringkasan pencarian](https://en.wikipedia.org/wiki/Noble_Quran_(Hilali%E2%80%93Khan))). Kurang cocok untuk platform riset yang menjaga netralitas |
| Rowwad dan Noor (QuranEnc) | Rowwad baru; Noor = Saheeh | Untuk Rowwad **tidak ada** rujukan penerimaan yang saya temukan |

## 4. Rekomendasi

**Utama: Pickthall (edisi 1930)**, karena hanya inilah yang **kemungkinan besar** lolos keempat pemakaian (A–D) tanpa meminta izin siapa pun. Status domain publik-nya (terutama di AS) masih **perlu dikonfirmasi**, dan syarat tambahan bergantung pada asal teks digital: Gutenberg menyatakan domain publik di AS, sedangkan berkas Tanzil membawa syarat "non-komersial saja" dari halaman terjemahannya. Atribusi sebaiknya tetap menyebut penerjemah, edisi, dan asal salinan. Kelemahannya nyata: bahasanya kuno bagi pembaca sekarang. Itu bisa ditutupi di UI dengan label bahwa ini terjemahan klasik 1930. Sebelum dipakai, agent perlu: (1) mengambil teks dari Tanzil atau Gutenberg, (2) mencocokkan sampel ayat dengan pindaian edisi Knopf 1930, (3) memastikan penomoran sama dengan 6.236 ayat, (4) mencatat versi + sha256 di `quran_source`.

**Cadangan 1: Wahiduddin Khan**, sebagai terjemahan modern. Pernyataan *copyright free* di halaman judul edisi resminya sangat dekat dengan yang kita butuhkan, tetapi **bukan lisensi baku** dan tahun terbit pertamanya tidak konsisten antarsumber. Karena itu minta konfirmasi tertulis (satu email) sebelum dijadikan sumber tampil. Kualitas dan gayanya yang bebas perlu dinilai Ust. Anas.

**Cadangan 2 (bersyarat izin): Saheeh International lewat Noor/QuranEnc**, atau izin langsung ke Abul-Qasim/Al-Muntada. Ini yang paling dikenal pembaca Inggris. Tetapi (a) rantai hak antara Noor, QuranEnc, dan Saheeh tidak dinyatakan siapa pun, dan (b) syarat "ikuti versi terbaru" bertentangan dengan sha256 terpin. Bila pemilik mau menerima risiko seperti ADR-040 (Kemenag tanpa syarat pakai tertulis), jalur ini teknis termudah; sebagai kebijakan, risiko itu keputusan pemilik, bukan saya.

**Jalur peningkatan: Clear Quran.** Peminatnya terbesar, tetapi izin tertulis wajib, pengecualian 501(c)(3) tidak berlaku untuk Surau (kecuali yayasan AS), dan yang dibutuhkan (seluruh teks, dalam basis data, ikut dump, ikut API) jauh melampaui "10% untuk pendidikan". Peluang dikabulkan tidak bisa dinilai dari dokumen publik; tidak menghalangi untuk bertanya.

**Tidak direkomendasikan:** Hilali–Khan (mutu dan netralitas, ditambah hak tak jelas), Itani (hak penuh; edisi 2024 bantuan AI), API Quran Foundation (melarang data terbuka dan dump), dan Yusuf Ali (status AS tidak pasti; edisi revisi berhak). Rowwad hanya bila ustadz menilai mutunya dan syarat "versi terbaru" bisa ditangani.

**Rancangan yang mengamankan semua pilihan.** Skema `quran_translation` sudah berkunci `(surah, ayah, source_id)` dan `quran_source` punya `lang`, `license`, dan `attribution`, jadi beberapa terjemahan Inggris bisa hidup berdampingan. Mulai dengan Pickthall tidak mengunci pilihan; bila izin Clear Quran/Saheeh nanti turun, sumber ditambah sebagai terjemahan kedua. Ini juga cocok dengan prinsip "tanpa utang" ([ADR-092](../../implementasi/KEPUTUSAN.md)).

## 5. Risiko

1. **Hukum, sumber tak jelas.** Klaim domain publik Pickthall dan Yusuf Ali bergantung pada edisi, negara, dan hitungan tahun. Bila ragu, Pickthall edisi Knopf 1930 adalah yang paling kuat. Perlu pertimbangan hukum bila ada keberatan penerbit.
2. **Kerapuhan izin lisan.** Izin dari Furqaan atau Abul-Qasim bisa berupa persetujuan terbatas (tampil saja, tanpa dump), dan bisa dicabut. Dump yang sudah terbit tidak bisa ditarik kembali; karena itu terjemahan berizin terbatas harus ditandai sendiri dan dikeluarkan dari dump.
3. **Salinan tak resmi.** Banyak berkas Saheeh/Yusuf Ali yang beredar membawa klaim "bebas hak cipta" dari pengunggah. Jangan dipakai.
4. **Teks berubah.** Tanzil, Gutenberg, dan QuranEnc bisa memuat penyuntingan kecil dari teks asli. Aturan "verbatim + sha256" menuntut pencocokan terhadap pindaian/edisi rujukan.
5. **Mutu bagi pembaca.** Pickthall kuno; Wahiduddin Khan bebas; Saheeh dan Hilali–Khan dituduh condong ke satu arus. Perlu catatan di UI dan penilaian ustadz (Anas, T-13/T-24).
6. **Pemakaian oleh LLM.** Terjemahan ayat tidak perlu masuk prompt (placeholder `⟦QS s:a⟧`, ADR-040). QF melarang ML tanpa izin, dan Furqaan melarang penggandaan. Pertahankan pola placeholder.
7. **Janji menurut syarat Tanzil.** Tanzil menyatakan hanya untuk non-komersial dan melarang menerbitkan ulang daftarnya. Satu berkas terjemahan di dump bukan "daftar", tetapi cantumkan Tanzil sebagai asal salinan hanya bila itu benar.

## 6. Langkah memperoleh izin (draf; tidak ada yang dikirim)

Semua langkah dikerjakan **pemilik**; agent tidak menghubungi siapa pun. Langkah 1–3 ada di **T-27** dengan draf email; langkah 4 hanya dikerjakan bila pemilik memilih jalur QuranEnc (keputusan 4, bagian 7) dan menjadi langkah tambahan T-27 saat itu. Ringkasnya:

1. **Pemilik menulis ke Goodword/CPS (Wahiduddin Khan):** email ke info@goodwordbooks.com dan info@cpsglobal.org (alamat dari halaman judul PDF cpsglobal.org; belum diuji). Minta konfirmasi tertulis bahwa terjemahan boleh dipakai verbatim di situs nirlaba, disimpan di basis data, dibagikan dalam dump data berlisensi CC BY-NC-SA, dan diberikan lewat API/MCP, dengan atribusi.
2. **Pemilik menulis ke Al-Furqaan Foundation (Clear Quran):** formulir "Licensing & Copyright" di [theclearquran.org/contact](https://theclearquran.org/contact) (sumber halaman itu tidak menyebut alamat khusus lisensi; info@furqaan.com adalah alamat umum). Minta empat hal yang sama dengan nomor 1, ditambah penjelasan bahwa Surau bukan 501(c)(3) dan butuh seluruh teks.
3. **Pemilik mencari kontak lalu menulis ke pemegang hak Saheeh International:** pemegang hak tercatat di cetakan = Abul-Qasim Publishing House (Jeddah) dan Al-Muntada Al-Islami. **Saya tidak menemukan alamat kontak yang terverifikasi**; langkahnya adalah mencarinya di halaman hak cipta edisi cetak resmi atau menanyakannya lewat Dar-us-Salam (distributor yang menjual edisinya). Jangan memakai alamat dari situs yang tidak jelas.
4. **Pemilik menulis ke QuranEnc (hanya bila jalur Noor/Rowwad dipilih):** tanya lewat kontak situs mereka apakah syarat "re-published" mencakup basis data terbuka berlisensi CC BY-NC-SA, apakah syarat "ikuti versi terbaru" boleh diganti dengan versi terpin, dan siapa pemegang hak asal (Noor ← Saheeh).

## 7. Keputusan yang dibutuhkan dari pemilik

1. **Utama = Pickthall (1930)**: setuju, atau ingin menunggu izin Saheeh/Clear Quran dulu?
2. Kirim email konfirmasi ke **Goodword/CPS** (menjadikan Wahiduddin Khan cadangan modern yang aman)?
3. Mau meminta izin **Clear Quran** dan/atau **Saheeh** (tanpa jaminan), dan menunda penambahannya sampai ada jawaban tertulis?
4. Bila izin tidak turun: terima risiko jalur **QuranEnc (Noor/Saheeh)** seperti ADR-040, atau tidak?
5. Minta **Ust. Anas** menilai bahasa dan keandalan Pickthall dan Wahiduddin Khan untuk dipakai sebagai terjemahan ayat.

Setelah keputusan ada, ADR baru mencatatnya, lalu sesi bahasa Inggris dapat menambah `quran_source` Inggris tanpa mengubah skema.

## Sumber

- Tanzil, syarat terjemahan: https://tanzil.net/trans/
- QuranEnc, daftar terjemahan Inggris dan syarat: https://quranenc.com/en/home · https://quranenc.com/en/browse/english_rwwad · https://quranenc.com/en/browse/english_hilali_khan · https://quranenc.com/en/browse/english_saheeh · https://quranenc.com/api/v1/translations/list/en
- The Clear Quran, hak cipta: https://theclearquran.org/?p=15021 · https://qul.tarteel.ai/resources/translation/426 · https://theclearquran.org/contact · https://en.wikipedia.org/wiki/Clear_Quran
- Quran Foundation Developer Terms: https://api-docs.quran.foundation/legal/developer-terms/ · permintaan izin edukasi di Quran.com: https://feedback.quran.com/translation-and-reciter-requests/p/permission-request-for-educational-use-of-quran-translation
- Saheeh International: https://en.wikipedia.org/wiki/Sahih_International · https://islamhouse.com/en/books/78592/ · https://gloqur.de/quran-translation-of-the-week-146-noor-international-an-emerging-saudi-arabian-publisher-of-quran-translations/
- Pickthall: https://en.wikipedia.org/wiki/The_Meaning_of_the_Glorious_Koran · https://neonvagabond.xyz/mirrors/sacred-texts/isl/pick/index.htm · https://www.gutenberg.org/ebooks/16955
- Yusuf Ali: https://en.wikipedia.org/wiki/The_Holy_Qur%27an:_Text,_Translation_and_Commentary · https://wikiislam.net/wiki/%C2%A9_Notice_for_the_Abdullah_Yusuf_Ali_translation
- Wahiduddin Khan: https://cpsglobal.org/sites/default/files/2024-10/English-Quran-with-footnotes.pdf · https://old.cpsglobal.org/node/10154 · https://gloqur.de/quran-translation-of-the-week-169-quran-translation-into-every-language-goodword-books-and-its-recent-projects/
- Hilali–Khan: https://en.wikipedia.org/wiki/Noble_Quran_(Hilali%E2%80%93Khan)
- Konteks Surau: ADR-020, ADR-040, ADR-092 di [KEPUTUSAN](../../implementasi/KEPUTUSAN.md); [teks-arab.md](../../.claude/rules/teks-arab.md) aturan 9; [docs/03](../03-sumber-data.md); [data/LICENSE](../../data/LICENSE).

## Batas riset ini

- Teks syarat Quran.com/QUL untuk terjemahan Saheeh/Clear Quran tidak bisa saya baca (halaman memuat tombol "Licence" tanpa teks).
- Analisis WikiIslam tentang Yusuf Ali tidak bisa dibuka (403); saya hanya melihat ringkasan di hasil pencarian.
- Berkas PDF Saheeh edisi "Qur'an Project" dengan klaim "no rights reserved" tidak bisa dibuka (403); klaim itu tidak terverifikasi dan tidak dipakai dalam rekomendasi.
- Hubungan teks Noor International dengan Saheeh bersumber dari satu artikel sekunder.
- Status hak cipta ditulis sebagai pembacaan publik, bukan pendapat hukum.
