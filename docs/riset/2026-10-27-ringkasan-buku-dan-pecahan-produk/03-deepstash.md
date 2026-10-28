# Deepstash: yang layak dicontoh Surau · 27 Oktober 2026

Dokumen ini menjawab dua pertanyaan: apa yang membuat Deepstash (app "kartu gagasan" milik Brainstash, Inc) terasa menarik, dan bagian mana yang boleh dicontoh Intisari Surau (aturannya di [docs/05 §12](../../05-kebijakan.md)) tanpa melanggar prinsip. Deepstash bukan peringkas buku utuh seperti Blinkist atau Headway, sehingga riset awal di [ADR-097](../../../implementasi/KEPUTUSAN.md) tidak memuatnya. Dokumen ini hanya menambah, tidak mengulang.

Tangkapan layar Mobbin **tidak disimpan di repo** (hak cipta pihak ketiga). Salinannya ada di file Paper "Surau Research", halaman Deepstash; di sini hanya ditautkan lewat Mobbin.

## Ringkasan temuan

1. Deepstash adalah "Pinterest untuk gagasan": kartu satu-gagasan yang selalu bersumber, disimpan ke koleksi bernama (Stash), lalu dibungkus jalur editorial (Journeys), kuis mikro, dan streak. Keyakinan sedang sampai tinggi.
2. Daya tariknya ada di **pembungkus**, bukan kedalaman isi: satu gagasan per layar, progres bersegmen, simpan, bagikan sebagai kartu. Keluhan "konten dangkal" tetap muncul, jadi formatnya disukai tetapi isinya tidak terjamin.
3. Surau sudah unggul di hal yang Deepstash lemah: jangkar ke teks, atribusi, label AI. Yang belum ada di halaman Intisari: kartu per layar, simpan, bagikan, koleksi, sebelumnya/berikutnya, dan pintu masuk dari beranda (audit produksi 2026-10-27). Semuanya pembungkus, murah, dan tidak menyentuh isi.
4. Sepuluh pola layak dicontoh (tabel di "Dampak untuk Surau"). Yang usahanya kecil: kuis di tengah alur, tiga angka di halaman judul, pratinjau tautan per Intisari.
5. Yang dijauhi: tembok bayar atas simpan/dengar/offline, iklan, banner diskon dan win-back, ide komunitas tanpa tinjauan, alat AI penulis ulang, gamifikasi kompetitif, akun dini.
6. Deepstash tidak mendukung bahasa Indonesia dan tidak punya kitab klasik. Itu fakta (keyakinan tinggi); bahwa ini "celah pasar" adalah kesimpulan riset ini.
7. Angka skala dan harga berbeda-beda antarsumber dan banyak klaim pemasaran (keyakinan sedang).
8. Untuk pecahan produk: Smartheads memilih banyak app kecil di satu payung. Untuk tim sekecil Surau, jadikan "mode" dalam satu app dulu.

## 1. Siapa Deepstash

| Hal | Temuan | Keyakinan |
|---|---|---|
| Pemilik | Penjual App Store: Brainstash, Inc. Deepstash tercantum sebagai satu dari lima app di situs Smartheads. Lokasi (Newark AS, Bucharest) dan ukuran (51-200 karyawan) berasal dari agregator dan LinkedIn serta belum terverifikasi. Hubungan hukum Brainstash dan Smartheads tidak dinyatakan. | tinggi (penjual, lima app) / rendah (lokasi, ukuran) |
| Usia dan dana | Diperkirakan sejak 2019. Seed EUR 3 juta (Des 2020). Pembiayaan akuisisi pengguna USD 9 juta (22 Okt 2025, tulisan promosi). | sedang / tinggi |
| Skala | Klaim situs 10 juta+ unduhan dan 200 ribu+ ide; halaman About 3 juta+ pengguna; deskripsi App Store 11 juta+ orang; App Store 4,7 dari 84 ribu rating; Trustpilot 4,4 dari sekitar 2.100 ulasan, 13% di antaranya bintang 1 (halaman Trustpilot di daftar Sumber, diakses 2026-10-27). Tidak konsisten. | sedang |
| Harga | Gratis (dengan iklan); Pro bulanan sekitar USD 12,99, tahunan USD 29,99 sampai 119,99 menurut promo dan wilayah; uji coba 7 hari. | tinggi (daftar IAP) / sedang |
| Bahasa | Inggris, Prancis, Spanyol. Indonesia: tidak ada. | tinggi |

## 2. Sepuluh dimensi

| Dimensi | Yang terlihat | Bagi Surau |
|---|---|---|
| Unit konten | "Ide": kartu satu gagasan, 1-2 menit, selalu menampilkan sumber. Satu buku bisa punya banyak ide dari beberapa kurator. Lapisan kedua "Journey": jalur editorial (contoh: 13 gagasan, 4-5 menit per gagasan). | Gagasan kunci Intisari setara ide, tetapi Surau menaruhnya di satu halaman panjang (median 12 layar ponsel, audit). |
| Penemuan | Beranda satu kartu besar per buku; Explore berisi carousel, sekitar 50 topik, kurator untuk diikuti; pencarian bertab (Top, Topics, People, Sources, Ideas); Book Scan. | Hasil Cari bisa dikelompokkan per jenis. Intisari belum disebut di beranda atau halaman karya. |
| Baca dan dengar | Satu kartu per layar, bilah progres bersegmen, bilah aksi bawah; tema terang/gelap/OLED; kecepatan 0,8x-1,5x. Dengar, offline, riwayat hanya Pro. | Surau sudah punya pemutar ([ADR-097](../../../implementasi/KEPUTUSAN.md)); yang perlu dipelajari dari Deepstash adalah kartu dan progresnya. Dengar tetap gratis. |
| Lapisan belajar | Streak harian dengan freeze otomatis, kalender, lencana; kuis mikro dua pilihan di dalam Journey. Ulas berjarak: tidak ditemukan. | 136 pertanyaan ingatan di pilot Surau ada di dasar halaman; pindahkan ke tengah alur. |
| Aksi pengguna | Simpan ke Stash, suka, komentar, bagikan sebagai kartu gambar ke WhatsApp/Instagram/tautan pendek, buat ide sendiri, ekspor perpustakaan. Sorot dan catatan pada buku: tidak ditemukan. | Halaman Intisari Surau belum punya satu pun aksi ini. Ekspor = hak pengguna atas datanya. |
| Onboarding | Panjang (sekitar 24 langkah menurut screensdesign): tujuan, minimal 3 topik, kartu geser Skip/Add, login email, paywall, lalu satu kartu. Momen aha: membaca satu kartu. | Ambil tujuan, topik, dan rekomendasi 3 bab; buang akun dan paywall. |
| Monetisasi | Freemium: gratis dengan iklan dan simpan terbatas; Pro membuka simpan, dengar, offline, riwayat, Journeys. Paket website lebih murah, banner diskon menempel. | Tidak dicontoh. Surau [tanpa iklan dan paywall](../../01-visi-dan-prinsip.md). |
| AI | Hanya di alat pembuat ide (Rephrase, Enhance, pembuat gambar dengan kuota token). Chat atau ringkasan AI untuk pembaca: tidak ditemukan. Label AI pada bacaan: tidak ditemukan. | Kebalikan Surau, yang melabeli AI di sisi pembaca. Penghitung kuota yang terlihat patut dicontoh untuk Maknaz. |
| Operasi konten | Komunitas menulis ide (Curators Programme), tim editorial untuk Journeys dan audio, sumber luar yang bisa diikuti. QA, moderasi, lisensi penerbit: tidak ditemukan. | Model tanpa tinjauan tidak cocok; Surau butuh ustadz di dalam lingkaran. |
| Keluhan | Trustpilot: perpanjangan otomatis mengejutkan, sulit batal, kendala refund pada sebagian ulasan, konten dangkal. Label privasi mencatat banyak data untuk pelacakan. Reddit: tidak ditemukan. | Kepercayaan rusak oleh penagihan, bukan oleh format kartu. |

## 3. Layar kunci

Dari 26 layar yang dipilih untuk Paper, ini yang paling berguna (tautan Mobbin sebagai atribusi). Sisanya (semua iOS, sekitar Maret 2026): [02](https://mobbin.com/screens/34b46c3e-ef2d-4ee1-a7c0-edd98567e4c9) banner Book Scan, [03](https://mobbin.com/screens/40c9daa0-78a4-4a69-afae-2bc6e0bff1b3) pencarian bertab, [07](https://mobbin.com/screens/2e47a928-85f3-47ca-9c0e-2fbc34006b6a) sheet Journey, [09](https://mobbin.com/screens/c94fd404-edac-4b92-b6d7-011a9a1ae50d) kartu dari artikel, [11](https://mobbin.com/screens/d1fa99c4-acd7-4277-90aa-ec38b10ce811) kecepatan dengar, [18](https://mobbin.com/screens/06121712-ffe3-43e0-a1ff-39482e749901) buat ide, [19](https://mobbin.com/screens/51f77d1e-f077-4f31-9e6f-e131984fa782) pilih topik, [21](https://mobbin.com/screens/b620b4e9-f2d5-410a-9c22-7dca67b1fd17) tujuan utama, [22](https://mobbin.com/screens/624da086-8961-431e-bf4f-627600903d5a) paywall uji coba, [25](https://mobbin.com/screens/fb246ed3-f013-4f43-975b-aa86d0e0c25f) kuota token AI.

| No | Yang tampak | Pelajaran | Tautan |
|---|---|---|---|
| 01 | Carousel pilihan di Explore, tombol Baca, Dengar, acak | "Bab hari ini" dan "Bab acak" di beranda | [buka](https://mobbin.com/screens/689e0537-3e74-400d-b139-6a0571aa0ee7) |
| 04 | Halaman buku dengan tiga angka besar (ide, tahun, pembaca) | Jumlah bab ber-Intisari, tahun wafat, halaman cetak | [buka](https://mobbin.com/screens/f1d28fbc-fb33-4b86-ba87-1bb2045ea349) |
| 05 | "Pandangan lain" atas buku yang sama | Relevan setelah kitab kedua masuk; rekomendasi ganda di layar ini adalah bug yang harus dihindari | [buka](https://mobbin.com/screens/646a973a-db1b-46ab-b461-33ff2e6317d1) |
| 06 | Halaman Journey: jumlah gagasan dan menit per gagasan, tombol Mulai dan Dengar | Beban baca dinyatakan jujur di depan | [buka](https://mobbin.com/screens/8fa958b3-67a7-44b4-ac3b-9d04540cd388) |
| 08 | Kartu ide: kurator, sumber, jumlah baca, simpan | Ganti kurator dengan label sikap dan "Dasar teks" | [buka](https://mobbin.com/screens/b72917d2-5a9e-4bcd-bad1-39b3f97756b7) |
| 10 | Kartu baca: satu gagasan, progres tujuh segmen, ilustrasi | Ritme ringan; Surau butuh nada lebih tenang dan ilustrasi garis | [buka](https://mobbin.com/screens/becd706c-f363-4588-a58a-819082661a5f) |
| 12 | Kuis dua pilihan di tengah alur | Umpan balik harus menunjuk paragraf sumber | [buka](https://mobbin.com/screens/e67f36cd-e23a-467a-bb4d-495800435786) |
| 13, 14 | Tonggak streak, kalender, freeze otomatis | Pemaaf itu baik; dijual lewat Pro tidak | [13](https://mobbin.com/screens/a754fe05-cda2-4dbb-a361-19a2a6f02ef4), [14](https://mobbin.com/screens/67778ca7-d035-482f-a321-87938f865712) |
| 15, 16 | Perpustakaan dan isi satu Stash (nama, deskripsi, jumlah, menit) | Koleksi bisa dibagikan sebagai jalur mini | [15](https://mobbin.com/screens/35e37fc8-c805-4c36-9c11-2bcdb0c6f201), [16](https://mobbin.com/screens/1762db1e-5933-4636-bb1f-030654d2530a) |
| 17 | Sheet bagikan: kartu gambar, WhatsApp di baris pertama, tautan pendek | Kartu bersitasi dan permalink | [buka](https://mobbin.com/screens/ce468a96-88a6-4977-8459-7906105e4f88) |
| 20 | Rekomendasi pertama dengan kartu geser | Pilih 3 bab pertama tanpa akun | [buka](https://mobbin.com/screens/26562596-2a4a-4bae-a679-bcc6ec691a3e) |
| 23 | Tabel Gratis vs Pro | Daftar fitur yang di Surau harus tetap gratis | [buka](https://mobbin.com/screens/a1cb5f0b-973f-4df9-bfc5-74289a38fb6f) |
| 24 | Alat tulis AI: Rephrase, Enhance | Menulis ulang teks bertentangan dengan verbatim; hanya ikon sparkle sebagai penanda AI yang layak ditiru | [buka](https://mobbin.com/screens/c139797d-6ce8-4fc1-bf6d-3b38024f8f33) |
| 26 | Pengaturan: Export Library | Ekspor koleksi dan catatan lengkap dengan sitasi | [buka](https://mobbin.com/screens/1402efff-5fe3-487c-8137-a3a96cc81f1a) |

## 4. Mengapa terasa menarik, dan artinya bagi Intisari

Pemilik ragu apakah Intisari sudah menarik. Perbandingan dengan Deepstash menunjuk satu penyebab utama: **pembungkus, bukan isi**.

- **Membuka dengan isi.** Deepstash menaruh kartu pertama tepat setelah personalisasi, satu ketukan. Di halaman Intisari Surau, judul gagasan pertama belum tampak di layar ponsel pertama pada 19 dari 19 halaman pilot (pada bab 100008, judul bagian "Gagasan kunci" hanya mengintip di tepi bawah layar); layar itu berisi label AI dan penafian (audit, keyakinan tinggi).
- **Memecah menjadi layar.** Satu gagasan per layar dengan progres terasa selesai-selesai. Intisari adalah satu halaman dengan median sekitar 12 layar ponsel.
- **Memberi jalan lanjut.** Deepstash menyediakan kartu berikutnya, simpan, bagikan. Dari Intisari hanya ada satu jalan keluar, "Baca teks lengkap"; tombol bagikan dan simpan nol, dan pratinjau tautan memakai gambar yang sama untuk semua halaman.
- **Hanya sebagian halaman beraudio.** Contoh yang dibagikan pemilik (bab 100008) tidak punya tombol Dengarkan; audio baru ada di 6 dari 19 halaman.

Di sisi isi, kekuatan Surau tidak ditiru siapa pun: jangkar "Dasar teks" per gagasan, sikap tiga arah (pendapat penulis, dinukil, dibantah), kutipan dari DB, dan takhrij berlabel jujur. Deepstash tidak punya satu pun.

**Selisih terhadap ADR-097.** ADR-097 menetapkan Intisari sebagai pintu ke teks dan menunda fitur belajar ke Fase 7 ([FASE](../../../implementasi/FASE.md)). Deepstash menambah satu pelajaran: kartu, simpan, dan bagikan bukan fitur belajar yang berat, jadi bisa didahulukan. Itu tidak melanggar ADR-097 selama tetap tanpa "aksi hari ini" atau janji manfaat atas nama Surau ([docs/05 §12](../../05-kebijakan.md)), sehingga judul jalur harus menyebut isi, bukan menjanjikan hasil. Temuan lain dari audit (kalimat inti per bab, judul gagasan yang seragam) bukan dari Deepstash dan tidak dibahas di sini.

## 5. Yang dijauhi

| Hal | Alasan |
|---|---|
| Tembok bayar atas simpan, dengar, offline, riwayat; iklan | Bertabrakan dengan prinsip tanpa iklan dan paywall. Blog kompetitor pun mengkritik batas itu (bias, keyakinan rendah). |
| Banner diskon menempel, win-back, layar batal yang menakut-nakuti | Sumber keluhan terbesar di Trustpilot. Surau tidak punya langganan. |
| Ide komunitas tanpa tinjauan dan lisensi sumber jelas | Atribusi bisa keliru; ilmu agama butuh ustadz dalam lingkaran. Kontribusi pengguna kelak hanya lewat antrean tinjauan. |
| Rephrase, Enhance, gambar AI | Menjauhkan dari verbatim; gambar AI untuk topik agama berisiko. |
| Lencana capaian atau penyelesaian, profil publik, papan peringkat | Berisiko menumbuhkan riya dan menjadikan membaca kitab perlombaan (pertimbangan riset ini; ustadz perlu menilai). Lencana asal atau status (mis. "teks kitab", "Intisari AI", "ditinjau") berbeda dan boleh ([01](01-blinkist.md) usulan 2). |
| Onboarding panjang dengan akun dini dan izin pelacakan | [docs/05 §8](../../05-kebijakan.md): tanpa akun dan data sesedikit mungkin. Analisis pihak ketiga (screensdesign) menyebut akun wajib sejak dini sebagai gesekan yang bisa menurunkan konversi; opini tanpa angka (sedang). |

## Dampak untuk Surau

Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Semua usulan berlaku tanpa akun (localStorage; dicatat di `/privasi` seperti posisi dengar) dan tanpa mengubah isi Intisari.

| # | Usulan | Usaha / dampak | Prinsip yang diuji dan mitigasi |
|---|---|---|---|
| 1 | **Mode Kartu** di Intisari Bab: tiap gagasan satu kartu (judul, 2-3 kalimat berlabel ringkasan AI, label sikap, tombol "Dasar teks"), progres bersegmen, Sebelumnya/Berikutnya. | M / tinggi | Konteks bisa terpotong. Mitigasi: setiap kartu wajib punya Dasar teks dan label atribusi; Arab tetap disalin kode. |
| 2 | **Simpan dan koleksi bernama** (Baca nanti, Hafalan, Bahan tulisan); ekspor Markdown/JSON dengan sitasi dan permalink. Cocok dengan Fase 7. | M / tinggi | Verbatim: kutipan Arab disimpan sebagai ID dan offset, dirender ulang dari DB, bukan teks bebas. |
| 3 | **Jalur berpanduan**: "Arba'in Ihya" 40 hari dan jalur tema; daftar bab dengan menit, status selesai, tombol Mulai dan Dengarkan. | M / tinggi | Urutan adalah kurasi yang bisa terbaca sebagai arahan. Mitigasi: tandai "Kurasi tim Surau", judul menyebut isi bukan hasil, tinjau ustadz sebelum tayang. |
| 4 | **Kuis di tengah alur**: pindahkan "Uji pemahaman" ke akhir tiap 2-3 kartu; umpan balik menunjuk paragraf sumber. | S / sedang | Benar/salah pada perkara khilafiyah terbaca sebagai fatwa. Batasi pada isi teks, tanpa skor publik. |
| 5 | **Bagikan kartu gambar** dengan sitasi, label AI, dan permalink; mulai dari pratinjau tautan (OG) per Intisari. WhatsApp sebagai kanal utama. | M / tinggi | Kutipan lepas konteks. Mitigasi: atribusi dan permalink selalu ada; teks Arab pada gambar disalin kode. |
| 6 | **Halaman judul tiga angka**: bab ber-Intisari, tahun wafat, halaman cetak. | S / sedang | "Paling banyak dibaca" butuh hitungan pemakaian dan belum tentu sejalan dengan prinsip data sesedikit mungkin ([docs/05 §8](../../05-kebijakan.md)); tunda, mulai dari tiga angka saja. |
| 7 | **Pengingat baca** harian: kalender pribadi, jeda otomatis, opsional dan mati secara bawaan. | M / sedang | Riya dan tekanan. Mitigasi: privat, tanpa lencana capaian dan peringkat. Nama fitur perlu dipikirkan; hindari istilah ibadah. |
| 8 | **Onboarding ringan** opsional: tujuan, topik, 3 bab rekomendasi (kartu geser), langsung ke satu Intisari. | M / sedang | Jangan memperkuat gelembung; rekomendasi hanya dari topik pilihan sendiri. Uji dulu apakah perlu. |
| 9 | **"Cek halaman"**: foto atau tempel kutipan, OCR hanya sebagai kueri; hasil selalu teks verbatim dari DB (mirip `verify_quote`). | L / sedang | OCR Arab bisa keliru. Mitigasi: hasil OCR tidak pernah ditampilkan sebagai teks kitab; tak cocok berarti "tidak ditemukan". |
| 10 | **Payung merek = mode dalam satu app**: satu domain, satu korpus, satu aturan sitasi; Maknaz = tanya-jawab, Intisari = ringkasan, jalur belajar = "Jalur" (keputusan penamaan di [09](09-pecahan-produk.md)). | S / sedang | Pemecahan dini membagi kapasitas ustadz dan anggaran AI (plafon [US$20/bulan](../../../implementasi/KEPUTUSAN.md), ADR-065). Pecah hanya bila ada bukti pemakaian. |

Urutan disarankan: 4, 6, dan pratinjau tautan (usulan 5 di tabel Dampak untuk Surau) dahulu karena kecil; lalu 1, 2, 3 sebagai paket "pembungkus"; 9 paling akhir.

## Batas riset ini

- **Mobbin:** sekitar 90 layar iOS Deepstash unik terlihat, 26 diunduh. Tidak ada layar web atau Android; tidak ada layar komentar, pemutar audio penuh, atau ulas berjarak. Tangkapan sekitar Maret 2026 dari akun wilayah Singapura (harga SGD).
- Help center, syarat layanan, dan halaman harga tidak terjangkau: kebijakan hak cipta, moderasi, dan lisensi penerbit **tidak ditemukan**.
- Journeys terlihat di Mobbin dan disebut halaman About resmi (klaim "100+ jalur pada 50+ topik"), tetapi tidak dijelaskan lebih jauh; blog Nibble (kompetitor) malah menyebut tidak ada jalur terstruktur dan kuis (belum terverifikasi, bertentangan dengan Mobbin dan halaman About). Cara pembuatannya (editor atau AI) tidak ditemukan.
- Angka skala dan harga dari klaim pemasaran, agregator, dan blog kompetitor (Nibble, Headway) mungkin bias.
- Audit Intisari memakai tangkapan Playwright atas surau.org, 2026-10-27, termasuk pengecekan tombol Dengarkan di bab 100008. Penilaian "menarik atau tidak" adalah penilaian produk, bukan uji pengguna.

## Sumber

Semua diakses 2026-10-27. Keyakinan di akhir tiap baris.

- Situs resmi: https://www.deepstash.com (klaim sendiri) · sedang; https://app.deepstash.com/about (komunitas, Curators Programme, klaim 3 juta+ pengguna dan 100+ Journeys) · tinggi (untuk apa yang diklaim)
- App Store (penjual, rating, IAP, bahasa, catatan versi): https://apps.apple.com/us/app/deepstash-smarter-every-day/id1445023295 · tinggi
- Trustpilot (skor dan tema keluhan): https://uk.trustpilot.com/review/deepstash.com · tinggi
- Pendanaan: https://www.trendingtopics.eu/deepstash-the-romanian-startup-that-aims-to-help-people-deal-with-information-overload-announces-a-e3m-seed-round · tinggi; https://itbrief.co.nz/story/pvx-partners-backs-brainstash-with-9m-in-ua-financing-to-accelerate-global-growth-of-deepstash (promosi) · sedang; https://www.forbes.ro/startup-ul-deepstash-cofondat-de-vladimir-oane-alumni-forbes-30sub30-primit-o-finantare-de-3-milioane-de-dolar-114115 · sedang
- Smartheads: https://linkedin.com/company/deepstash · sedang; https://www.smartheads.app/ · sedang
- Wawancara pendiri 2019 (usang): https://www.howtoweb.co/5-questions-with-vladimir-oane-deepstash-about-the-principles-of-his-new-team-product-and-startup/ · sedang
- Analisis UX onboarding: https://screensdesign.com/showcase/deepstash-smarter-every-day · sedang
- Ulasan fitur: https://www.educationalappstore.com/app/deepstash · sedang; https://www.mactrast.com/?p=162672 · sedang
- Data Google Play (agregator, snapshot 2026-07-30): https://chrome-stats.com/d/com.deepstash · sedang
- Blog kompetitor (bias): https://makeheadway.com/blog/deepstash-cost/ · sedang; https://nibble-app.com/blog/deepstash-review dan https://nibble-app.com/blog/nibble-vs-deepstash · rendah
- Mobbin, alur onboarding, survei, dan streak: https://mobbin.com/flows/fadfb386-acb6-443a-b2ca-ede25e0f7adf · https://mobbin.com/flows/b0aa66bf-1028-4de9-890e-d9b46265970d · https://mobbin.com/flows/fba02bb5-37de-4288-b919-e42794704342 · tinggi (diamati langsung)
- Intisari Surau (audit produksi): https://surau.org/kitab/ihya/bab/100008/intisari · tinggi (tangkapan langsung)
- Konteks repo: [ADR-065, ADR-097](../../../implementasi/KEPUTUSAN.md) · [FASE](../../../implementasi/FASE.md) Fase 7 · [docs/05 §12](../../05-kebijakan.md) · [docs/01](../../01-visi-dan-prinsip.md)
