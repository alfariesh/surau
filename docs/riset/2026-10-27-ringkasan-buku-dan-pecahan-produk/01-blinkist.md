# Blinkist: yang layak dicontoh Surau · 27 Oktober 2026

Dokumen ini menjawab dua pertanyaan. Pertama, apa dari Blinkist (app ringkasan buku nonfiksi terbesar) yang layak dipinjam Surau untuk Intisari dan pengembangan korpus + AI, dan apa yang dihindari. Kedua, apakah catatan [ADR-097](../../../implementasi/KEPUTUSAN.md) tentang narasi AI Blinkist benar. Riset awal ADR-097 tidak diulang; di sini ditambah pengamatan layar, harga, operasi konten, keluhan, dan perbandingan dengan Intisari.

> **Tangkapan layar tidak ada di repo.** 26 layar iOS Blinkist dari Mobbin tidak disalin (hak cipta pihak ketiga, repo open source); salinannya ada di file Paper "Surau Research" (halaman Blinkist), di sini hanya tautan Mobbin. Rekaman dari app versi 11.12.0 (sekitar Maret 2026); App Store kini menulis 11.37.1, jadi sebagian layar mungkin berubah.

## Ringkasan temuan

1. Blinkist (Berlin, 2012) memakai **satu merek untuk banyak format** (Blinks, Shorts, Shortcasts, Guides, Spaces, Extract AI); hanya Business (B2B) ditawarkan terpisah (apakah app terpisah: belum terverifikasi). Bahasanya Inggris, Jerman, Spanyol, Portugis; **tidak ada Indonesia** (tinggi).
2. Yang layak dicontoh adalah **pengalaman di sekitar ringkasan**: pembuka, progres tersegmen, baca-dengar satu layar, sorotan menjadi daftar kutipan, onboarding berbasis tujuan.
3. Kelemahan Blinkist adalah kekuatan Surau: tanpa jangkar sumber per gagasan, contoh dan kualifikasi hilang.
4. Intisari lebih tepercaya daripada Blink, tetapi **belum menarik sebagai pengalaman**. Sebabnya kemasan, bukan isi: tak ada inti satu kalimat, progres, atau "berikutnya"; audio baru di sebagian halaman.
5. Verifikasi ADR-097: tanggal 3 Juni 2026 cocok, tetapi alasan "keluhan pendengar" **belum didukung bukti primer**; menurut ringkasan pencarian atas posting Blinkist (halaman aslinya 403, belum dibaca), Blinkist membingkainya sebagai mutu (bagian 5).
6. Keluhan terbesar ada di **tagihan dan pembatalan**, bukan konten. Surau tanpa paywall, jadi pola uji coba dan retensi tidak ditiru.
7. Blinkist tidak memecah merek: "Surau Summary" cukup menjadi tab; "Surau Academy" (nama kerja; keputusan penamaan di [09](09-pecahan-produk.md): Jalur) paling mirip Guides dan Business.
8. Sembilan dari sepuluh usulan berusaha S atau M; sebagian besar jalan di perangkat pembaca tanpa akun.

## 1. Profil singkat

Diakses 2026-10-27.

| Hal | Temuan | Keyakinan |
|---|---|---|
| Pemilik | Blinks Labs GmbH, Berlin; didirikan 2012. Diakuisisi Go1 8 Mei 2023 (nilai tidak diungkap); April 2026 dibeli kembali dua pendirinya menurut satu laporan perdagangan | tinggi (akuisisi); sedang (pembelian kembali) |
| Skala | Klaim sendiri 42 juta pengguna, 9.000+ ringkasan. App Store 4,8 (157 ribu rating); Trustpilot 4,3 (1.550 ulasan, 29% bintang 1). Pendapatan sekitar 53 juta euro (FY2023/24, teks siaran pers yang dimuat satu outlet) | tinggi (listing); sedang (klaim, pendapatan) |
| Harga, model | Freemium + langganan. Basic gratis (1 Daily Blink); Premium sekitar $99,99/tahun; Pro (dengan AI) sekitar $140-200/tahun; Platinum hanya disebut satu sumber pihak ketiga. Layar Maret 2026: 7 hari gratis lalu $199,98/tahun. Daftar pembelian dalam app di App Store Indonesia memuat harga rupiah (Premium 1 tahun Rp 899 ribu sampai Rp 1,199 juta; Pro Rp 1,999 juta), belum tentu semuanya berlaku | sedang (bervariasi) |

## 2. Sepuluh dimensi

| Dimensi | Blinkist | Catatan untuk Surau |
|---|---|---|
| 1. Unit konten | Blink: satu buku, nominal 15 menit; pembuka manfaat, 5-10 gagasan bernomor berjudul kalimat klaim, penutup. Jumlah kata per Blink: belum terverifikasi. Format lain: Shorts (sekitar 1 menit per butir), Shortcasts, Guides, Spaces | Intisari Bab (2-4 menit) lebih kecil; padanannya Intisari Kitab belum tampil |
| 2. Penemuan | Beranda: satu pilihan harian besar, target mingguan, kartu Shorts. Rekomendasi beralasan; kategori berikon; topik diikuti (layar 01-04) | Beranda dan halaman karya belum menyebut Intisari |
| 3. Baca-dengar | Teks dengan dock audio di satu layar; progres tersegmen per bab; empat tema dan ukuran huruf; timer tidur; bab berstempel waktu; unduh offline (layar 07-12) | Pemutar punya kecepatan dan lompat 15 detik ([ADR-097 butir 6, ADR-100](../../../implementasi/KEPUTUSAN.md)); Panel Tampilan hanya di pembaca teks ([ADR-053](../../../implementasi/KEPUTUSAN.md)). Dock di halaman, daftar berstempel, timer tidur belum ada |
| 4. Lapisan belajar | Target mingguan "3 hari seminggu" dengan cincin; statistik judul selesai; kuis mikro di Shorts. Ulas berjarak tidak ditemukan | "Uji pemahaman" Surau lebih dekat ke belajar; ulas berjarak di Fase 7 ([FASE](../../../implementasi/FASE.md)) |
| 5. Aksi pengguna | Library (Saved, Downloads, Extracts, Spaces); sorotan per judul; Spaces bersama dengan catatan; bagikan; Kindle | Intisari belum punya simpan, sorot, bagikan |
| 6. Onboarding | Empat langkah: tujuan, kategori, geser suka/tidak suka kartu judul; Library terisi sebelum paywall (momen aha); langkah 2 tidak teramati | Surau tanpa akun: pilihan disimpan di perangkat |
| 7. Monetisasi | Basic sangat terbatas; Premium, Pro, Platinum; uji coba 7 hari untuk paket tahunan; alur batal: survei, diskon 40%, pesan sosial (layar 21-22; survei dan pesan sosial dari alur Mobbin "Canceling free trial", tidak disalin) | Tidak berlaku (nirlaba, tanpa paywall) |
| 8. AI | Extract (Pro): tautan atau PDF diringkas AI; lencana ungu berbeda dari lencana hijau Blink; tautan sumber asli; ketentuan GenAI terpisah, beta. Narasi AI sekitar 2 tahun, berakhir Juni 2026. Blink buku diklaim ditulis manusia | Pelajaran pelabelan, bukan fiturnya (bagian 5-6) |
| 9. Operasi konten | Editor memilih judul; pakar membaca seluruh buku; penulis profesional; tinjauan akurasi; narasi; QA. Mitra penerbit dengan bagi hasil, kredit tampil (layar 06) | Surau: model menyusun, kode menjangkar, review kecil |
| 10. Keluhan | Tagihan dan pembatalan; kedalaman hilang; audio datar; rekomendasi harian tak cocok; tingkat gratis tak berguna; harga membingungkan; tak ada Indonesia | Kedalaman hilang juga risiko Intisari; dilawan "Dasar teks" dan label sikap |

Angka keluhan: dari 150 ulasan terbaru (Understand, pesaing, 4 Oktober 2026), 19 menyangkut tagihan, termasuk 17 dari 31 ulasan bintang satu (sedang). Satu Blink yang dibandingkan dengan bukunya tidak keliru, tetapi pendukung argumen hilang (sedang).

## 3. Layar kunci

- **Penemuan:** [01 Beranda](https://mobbin.com/screens/a8771dda-c90b-4b19-bf78-7aa953101531) · [02 Alasan rekomendasi](https://mobbin.com/screens/d128040c-4d2b-43cc-95b2-8c7cd05a4941) · [03 Cari, kategori](https://mobbin.com/screens/e8800c69-7d0d-4736-972d-c2c7d0edaaff) · [04 Topik](https://mobbin.com/screens/2cfd353e-40a4-4f04-b385-2f8af7bd424e)
- **Detail judul:** [05 Detail](https://mobbin.com/screens/f722029b-9b06-4409-8fbb-258b13861a1f) · [06 Penerbit](https://mobbin.com/screens/b4bd59db-b995-4fc3-ab5a-cae6efeff848) · [07 Bab berstempel](https://mobbin.com/screens/107b7229-a8b1-403c-82b3-ccef640be56d)
- **Pembaca:** [08 Pembuka, progres](https://mobbin.com/screens/ea3c48f7-2bb6-4fd2-aec0-01dc925042cf) · [09 Tema, huruf](https://mobbin.com/screens/59c25ef7-b6d3-414b-b736-421f755abc6c) · [10 Tandai selesai](https://mobbin.com/screens/93e6cd0e-69f7-4f2c-ab34-32d9db33c752)
- **Audio:** [11 Pemutar penuh](https://mobbin.com/screens/83e3ffb8-e435-4bf8-ab66-c38b44c5c010) · [12 Dock audio](https://mobbin.com/screens/fd2df980-4afb-44a6-8607-fa0eb16c26b8)
- **Belajar:** [13 Target mingguan](https://mobbin.com/screens/8fb088c9-d0d7-41f9-b5ac-f9087c7e1cd0) · [14 Kartu Shorts](https://mobbin.com/screens/9e1520b8-f563-45cc-aab6-c638f1899446)
- **Aksi:** [15 Daftar sorotan](https://mobbin.com/screens/1eb6873a-771b-455d-9e37-7cd1f773cdf8) · [16 Kutipan](https://mobbin.com/screens/cbff2bf9-7db2-4083-8e8c-f2acb40ea6ff) · [17 Space](https://mobbin.com/screens/8bb0ea9f-630f-4fe6-abc7-f78841e8ca2f) · [18 Perpustakaan](https://mobbin.com/screens/f43b485e-a262-4ef8-b7e3-1861ab4405f5)
- **Onboarding:** [19 Tujuan](https://mobbin.com/screens/7c44a870-aba0-4bcc-a43d-eeadde9e4e58) · [20 Geser kartu](https://mobbin.com/screens/4beb07bc-be5e-44ac-940b-56c4cf36361f)
- **Paywall (tidak ditiru):** [21 Uji coba](https://mobbin.com/screens/1c74c6aa-ae67-4bdf-811f-9019e3ad8564) · [22 Diskon batal](https://mobbin.com/screens/0ee44212-8ee5-4d4b-9c04-c44cff089393)
- **AI:** [23 Tempel tautan](https://mobbin.com/screens/a7d595ea-538a-44e3-8e9d-adf14a6e9fe9) · [24 Extract berlabel](https://mobbin.com/screens/85db391b-27a2-468e-a1d1-b50a93fbd457)
- **Lainnya:** [25 Umpan balik](https://mobbin.com/screens/c6ad5740-ea65-44f1-9400-4feade15995d) · [26 Bahasa baca](https://mobbin.com/screens/828ee434-b4f4-4e42-8675-2b4d850eca6d)

**Cakupan.** Sekitar 60 layar iOS Blinkist ada; 26 diambil. **Tidak ada:** layar web, kuis atau kartu ulas khusus, chat AI tanya-jawab, kartu bagikan kutipan, perbandingan paket di paywall, langkah 2 onboarding. Layar Shorts tipis (dua kartu).

## 4. Blinkist dibandingkan Intisari hari ini

Sisi Surau: pengamatan [bab 100008](https://surau.org/kitab/ihya/bab/100008/intisari), audit 19 Intisari Bab pilot (2026-10-27), dan kode `apps/web/src/components/intisari/` (tinggi).

| Aspek | Blink | Intisari Bab hari ini |
|---|---|---|
| Pembuka | Blok manfaat di awal | Tidak ada; abstrak 16 dari 19 halaman dibuka "Bagian/Teks ini membahas": topik, bukan inti |
| Judul gagasan | Kalimat klaim yang memberi hasil | 119 dari 119 diawali "Al-Ghazali" + kata kerja: tepercaya, tetapi monoton |
| Atribusi, uji pemahaman | Tidak ada per gagasan; tidak ada kuis | Ada: label sikap penulis, "Dasar teks", "Uji pemahaman" di dasar halaman |
| Progres dan jalan keluar | Bilah per bab, tandai selesai, saran berikutnya | Tidak ada bilah, tombol selesai, atau "berikutnya". Penanda "Sudah dibaca" otomatis di perangkat ada (`read-mark.tsx`, X16) tetapi hanya tampil di hub yang belum tayang. Jalan keluar: "Baca teks lengkap" |
| Audio | Dock di setiap judul | 6 dari 19 halaman; tombol tidak tampil di halaman contoh |
| Identitas visual | Sampul di semua layar | Teks saja |
| Simpan, sorot, bagikan | Ada | Belum (Fase 7) |

**Jawaban untuk pemilik.** Intisari kuat di hal yang tidak dimiliki Blinkist dan lemah di hal yang ia kuasai. Tiga perubahan kecil yang paling menggeser kesan: inti satu kalimat di atas, progres dengan "tandai selesai" dan "bab berikutnya", audio dan lencana seragam.

## 5. Verifikasi klaim ADR-097 tentang narasi AI

Klaim di repo: "Narasi AI dihentikan 3 Juni 2026 karena keluhan pendengar."

| Bagian klaim | Hasil | Bukti dan keyakinan |
|---|---|---|
| Blinkist menghentikan narasi AI | **Terbukti** | Posting majalah Blinkist 3 Juni 2026: Blink baru dibawakan narator manusia; eksperimen sekitar dua tahun pada sebagian rilis baru. Halaman menolak fetch (403, dicoba ulang hari ini); dibaca lewat ringkasan pencarian: **sedang** |
| Tanggal 3 Juni | **Cocok** | Satu opini sekunder menyebut email pelanggan 14 Juni 2026, kemungkinan tanggal kirim; dibuka langsung hari ini dan isinya konsisten (dua tahun, mutu): **rendah** |
| Alasan "keluhan pendengar" | **Belum didukung bukti primer** | Menurut ringkasan pencarian (halaman Blinkist 403, belum dibaca penuh), Blinkist membingkainya sebagai mutu: suara AI tidak menyamai narator manusia; posting mengakui keputusan awal sebagian karena logistik dan biaya. "Keluhan" tidak tampak sebagai pemicu di ringkasan itu dan hanya muncul di satu direktori (**rendah**). Keluhan suara datar atau robotik terdokumentasi di ulasan app dan Shortform Hub (Juli 2026): **rendah-sedang** |
| Nasib judul lama | Tambahan | Tetap ada, berlabel AI (bentuk label belum terverifikasi). Mei 2026 Blinkist menjawab satu ulasan Google Play bahwa AI dipakai pada judul tertentu, tanpa rincian (ambigu, sedang) |

**Rumusan yang lebih berhati-hati (sementara, sampai sumber primer dibaca):** "Narasi AI dihentikan Juni 2026 setelah eksperimen sekitar 2 tahun pada sebagian rilis baru; Blinkist menyebut mutu; keluhan suara datar terdokumentasi di ulasan."

### Selisih terhadap ADR-097

- **Panjang Blink.** ADR-097 menulis sekitar 15 menit; itu nominal. Layar Mobbin menampilkan 17, 25, dan 29 menit (layar 02, 05, 04); Intisari Kitab 10-15 menit lebih pendek. Catatan ADR-097 bahwa Blinkist tidak berbahasa Indonesia terkonfirmasi (layar 26).
- **Pembuka manfaat vs kebijakan.** [docs/05 §12](../../05-kebijakan.md) melarang janji manfaat atas nama Surau, padahal pembuka Blinkist adalah janji manfaat. Tak bisa ditiru mentah (usulan 1).

### Pelajaran untuk audio Surau

Pendapat, belum diuji. Label suara AI Surau tidak diucapkan ([ADR-102](../../../implementasi/KEPUTUSAN.md)), sedangkan Blinkist tetap melabeli judul lama; syarat "tinjau ulang" ADR-102 layak dipantau. Jaga jalur narator manusia (ADR-097 butir 6). Keluhan "datar" muncul pada audio sekitar 15 menit; audio Surau sekitar 5 menit per bab (pilot 3,4 sampai 6,3 menit, `data/audio/ihya-9472-audio.json`; Intisari Kitab pilot 13,5 menit) mungkin lebih ringan, belum diuji.

## 6. Yang sebaiknya tidak ditiru

- **Tembok bayar dan empat tingkat harga:** bertabrakan dengan nirlaba tanpa paywall.
- **Uji coba berperpanjangan otomatis dan alur batal bertekanan:** sumber keluhan terbesar (layar 22: diskon 40%; pesan sosial dari alur Mobbin "Canceling free trial").
- **Meratakan ringkasan, membuang contoh, bukti, kualifikasi:** merusak atribusi (pendapat penulis, yang dinukil, yang dibantah). Pertahankan label sikap dan "Dasar teks".
- **Pemakaian AI yang ambigu:** label tampil sebagai teks; kutipan Arab tidak pernah dibacakan suara AI ([aturan 11](../../../.claude/rules/teks-arab.md)).
- **"Ringkas apa saja" dari tautan atau PDF ("as is"):** tak beralamat sumber; yang diambil hanya pelabelannya.
- **Metrik kecepatan, streak, notifikasi:** mendorong membaca cepat; bertentangan dengan "bukan pengganti guru".

## 7. Pelajaran untuk pemecahan produk

- **Blinkist tidak memecah merek.** Semua format hidup di satu app; hanya Business (B2B) ditawarkan terpisah, dengan pembeli berbeda (alasan ini dugaan, bukan pernyataan Blinkist).
- **"Surau Summary"** paling dekat dengan Blinks (usulan 1-5): cukup jadi tab Intisari di dalam Surau.
- **"Surau Academy"** paling dekat dengan Guides dan Business: jalur terkurasi (Arba'in Ihya 40 hari, [FASE](../../../implementasi/FASE.md) Fase 7) dan daftar bacaan halaqah (usulan 10). Kandidat merek terpisah terkuat bila audiensnya kelas/pesantren.
- **Maknaz** tidak punya padanan terverifikasi di Blinkist; pelajarannya hanya pelabelan dan ketentuan AI terpisah.
- **Aturan praktis (pendapat dari satu contoh):** merek terpisah hanya bila audiens, bahasa, atau tugasnya berbeda; sebelum itu, tab.

## Dampak untuk Surau

Urut menurut dampak per usaha. Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Nomor layar: bagian 3.

| # | Usulan untuk Surau (pola Blinkist) | Usaha | Dampak | Prinsip yang diuji |
|---|---|---|---|---|
| 1 | **Inti satu atau dua kalimat berbahasa atribusi** ("Menurut al-Ghazali dalam bab ini...") menggantikan abstrak "Bagian ini membahas...", dari gagasan yang sudah berjangkar (pembuka, layar 08, 19). Bukan janji manfaat | S | tinggi | Atribusi; docs/05 §12 melarang janji manfaat |
| 2 | **Satu chip asal per blok**: "Teks kitab (disalin dari DB)", "Intisari AI, belum ditinjau", "Terjemahan AI", "Ditinjau"; di Intisari, Cari, kartu pembaca, di samping "Dasar teks" (lencana, layar 23-24) | S | tinggi | Verbatim dan label AI; "ditinjau" hanya bila status tinjau nyata |
| 3 | **Bilah segmen per gagasan, "Tandai selesai" di perangkat** (memperluas `ReadMark` X16), lalu "Bab berikutnya" dan "Baca teks lengkap" (layar 08, 10, 11); dasar target mingguan | M | tinggi | Bukan pengganti guru: tanda selesai tidak boleh terkesan "lulus" |
| 4 | **Satu layar baca-dengar**: Dengarkan di semua Intisari, daftar gagasan berstempel waktu, timer tidur, Panel Tampilan ADR-053 di Intisari (layar 07, 09, 12). Sorotan kalimat sudah di kode ([ADR-104](../../../implementasi/KEPUTUSAN.md)), tetapi audio pilot belum bertimestamp per kalimat (penanda awal tiap gagasan sudah ada di metadata) | M | tinggi | Suara AI tanpa huruf Arab, label teks. Audio semua halaman berbayar (ADR-097: sekitar $104 untuk Ihya), perlu izin pemilik |
| 5 | **"Kutipan saya"**: simpan rujukan ID paragraf + offset, bukan teks bebas; render dari DB dengan kitab, jilid, halaman; salin bersitasi (sorotan, layar 15-16) | M | tinggi | Verbatim dan alamat; catatan pengguna berlabel milik pengguna |
| 6 | **Umpan balik bertag** setelah Intisari: "Apakah ringkasan ini setia pada teks?" (setia, terlalu ringkas, ada yang keliru, terjemahan janggal), masuk antrean tinjau per ID gagasan agar peninjau yang sedikit fokus pada yang dilaporkan (layar 25). Butuh penyimpanan server dan `/privasi` | M | tinggi | Laporan tidak mengubah teks Arab; tanpa data pribadi; bukan ukuran kebenaran |
| 7 | **"Faedah hari ini"**: satu gagasan berjangkar dengan "Dasar teks", dibagikan sebagai gambar bertaut permalink (kartu mikro bersumber, layar 14) | M | tinggi | Kartu tanpa konteks bisa terbaca sebagai fatwa; pilih gagasan bersikap jelas |
| 8 | **"Target pekan ini: 3 Intisari"** dengan cincin lokal, sejalan dengan Arba'in Ihya; tanpa streak, lencana capaian, peringkat (layar 13) | M | sedang | Gamifikasi berlebihan bertentangan dengan adab belajar |
| 9 | **Onboarding tanpa akun**: "Mau mulai dari mana?" (awam, pelajar, peneliti) menyusun urutan Intisari di perangkat; rekomendasi menyebut alasan ("Karena Anda membaca Kitab al-Ilm") dari relasi bab (layar 02, 19, 20) | M | sedang | Jangan menyaring konten menurut "level" keilmuan; tanpa pelacakan server |
| 10 | **"Daftar bacaan halaqah"**: susun bab Intisari atau bagian teks, beri catatan, bagikan lewat tautan tanpa akun (Spaces, layar 17) | L | sedang | Catatan pembuat daftar bisa terbaca sebagai suara Surau; perlu label, moderasi, batas privasi |

**Tindakan kecil (S):** baca sumber primer (posting majalah Blinkist 3 Juni 2026, yang di sini menolak akses) dulu, lalu putuskan apakah ADR-097 perlu dikoreksi (bagian 5); ADR-097 tidak ditulis ulang.

## Sumber

Semua diakses 2026-10-27. Tinggi = primer atau dibaca langsung; sedang = lewat ringkasan atau pihak ketiga andal; rendah = opini, agregator.

- **Keyakinan tinggi:** https://apps.apple.com/us/app/-/id568839295 (rating, klaim pengguna; klaimnya sedang) · https://support.blinkist.com/en/articles/10033219-what-about-copyrights-are-you-stealing-from-authors (hak cipta, mitra penerbit) · https://support.blinkist.com/en/ (bantuan) · https://www.trustpilot.com/review/blinkist.com (skor, keluhan) · https://www.go1.com/blog/go1-acquires-blinkist-launching-a-new-model-of-learning (akuisisi 2023) · https://tech.eu/2018/06/20/germanys-blinkist-raises-18-8-million-micro-learning-app-platform/ (pendanaan 2018) · https://mobbin.com/flows/a9e95e3d-961b-422b-b217-d3fe6fe34e0f (alur onboarding) · https://surau.org/kitab/ihya/bab/100008/intisari (Intisari yang dibandingkan)
- **Keyakinan sedang:** https://apps.apple.com/id/app/-/id568839295 (harga rupiah; daftar pembelian dalam app ambigu) · https://www.mainsights.io/ma-news/germany-based-founders-holger-seim-and-tobias-balling-reacquire-media-startup-blinkist-from-go1 (pembelian kembali 2026, keuangan) · https://www.smartcompany.com.au/startupsmart/unicorn-go1-acquires-german-book-app-blinkist/ (akuisisi) · https://en.wikipedia.org/wiki/Blinkist (pendiri) · https://makeheadway.com/blog/blinkist-cost/ (harga; pesaing) · https://www.shortform.com/blog/hub/product/blinkist-review/ (ulasan 8 Juli 2026; pesaing) · https://understandtutor.com/blog/blinkist-review (150 ulasan, 4 Oktober 2026; pesaing) · https://prnewswire.co.uk/news-releases/blinkist-a-pioneer-in-audio-learning-launches-innovative-new-format-shortcasts-846463784.html (Shortcasts 2020)
- **Keyakinan sedang, halaman Blinkist (fetch 403, dibaca lewat ringkasan pencarian):** https://www.blinkist.com/magazine/posts/the-app-that-just-brought-back-100-human-narration (akhir narasi AI) · https://www.blinkist.com/learn/what-is-a-blink-how-blinkist-summarises-a-book-in-15-minutes (struktur Blink) · https://www.blinkist.com/en/ai-policy (ketentuan GenAI) · https://www.blinkist.com/magazine/posts/introducing-blinkist-shorts-daily-dose-knowledge-just-5-minutes (Shorts) · https://www.blinkist.com/magazine/posts/blinkist-revolutionizing-learning-experience (Spaces, Library)
- **Keyakinan rendah:** https://dev.to/jamilxt/blinkist-just-admitted-ai-narration-failed-that-should-worry-every-ai-optimist-3a7f (email 14 Juni 2026; opini, dibuka langsung) · https://faith.tools/app/blinkist (direktori) · https://appsupports.co/568839295/blinkist-15min-book-insights/negative-reviews (agregator ulasan) · https://ohayou.bookriot.com/blinkist-review/ (kritik kedalaman)

Konteks Surau: [ADR-053, 097, 100, 102, 104](../../../implementasi/KEPUTUSAN.md); [docs/05 §12](../../05-kebijakan.md); [FASE](../../../implementasi/FASE.md) Fase 7; [teks-arab.md](../../../.claude/rules/teks-arab.md).

**Batas riset.** Harga bertentangan antar sumber; pembelian kembali 2026 dan keuangan hanya dari satu outlet. Tanya-buku dan alasan pasti narasi AI tidak terverifikasi; Reddit tidak terjangkau; ulasan pesaing bias; Mobbin hanya iOS.
