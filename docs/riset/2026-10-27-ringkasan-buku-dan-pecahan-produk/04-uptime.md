# Uptime: yang layak dicontoh Surau · 27 Oktober 2026

Dokumen ini menjawab satu pertanyaan: dari Uptime, app belajar mikro asal London, apa yang pantas ditiru Surau untuk Intisari dan fitur belajar, dan apa yang sengaja dihindari? Uptime adalah satu dari empat app ringkasan buku yang ditelaah (bersama Blinkist, Headway, Deepstash; lihat dokumen lain di folder ini). Dokumen ini juga menjawab apakah [Intisari](https://surau.org/kitab/ihya/bab/100008/intisari) sudah cukup menarik.

Identitas: Uptime di sini adalah app UPTIME APP LIMITED (London), bukan layanan pemantau server yang mendominasi hasil pencarian; dipastikan lewat nama penjual di App Store [S2] dan situs uptime.app [S5]. Tangkapan layar Mobbin tidak disimpan di repo (hak cipta pihak ketiga); salinannya ada di file Paper "Surau Research" (halaman "04 · Uptime") dan dirujuk lewat tautan di bab 3. Kode [S#] menunjuk daftar Sumber.

## Ringkasan temuan

1. Satuan isi adalah Hack, sekitar 5 menit per karya, bisa dibaca, ditonton sebagai kartu ala story, atau didengar, dengan urutan tetap (layar 09-12).
2. Lapisan belajar ringan jarang ada pada pesaing: Spark (simpan satu kartu ke papan), Spark Repetition (kartu muncul lagi sesuai jawaban Tidak/Ragu/Ya), dan streak (layar 17-21).
3. Kartu kutipan bermerek bisa dibagikan sebagai gambar, video, tautan, atau embed; pemutar punya menu Laporkan dan Atribusi (layar 16, 22).
4. Uptime bergeser ke B2B: menjual platform AI untuk perusahaan setelah membeli Econsultancy (efektif 31 Des 2025) [S5, S12]. App konsumen tetap aktif (v6.76.0, 27 Okt 2026) [S2].
5. Keluhan terbesar adalah pembayaran: 13 dari 21 ulasan bintang 1-2 dalam sampel 50 ulasan [S3] (hitungan ulang 2026-10-27). Keluhan isi (tipis, diencerkan) justru titik kuat Intisari.
6. Untuk pemilik: Intisari kuat di kepercayaan, lemah di daya tarik dan kebiasaan. Ini perbandingan pola, bukan data penggunaan.
7. Tidak ditiru: paywall dan urgensi palsu, tingkat gratis dipotong, framing hemat waktu, konten tanpa tinjau awal, klaim pemasaran, pengumpulan data luas.

## 1. Siapa Uptime

| Hal | Temuan |
|---|---|
| Pemilik | UPTIME APP LIMITED, London [S2, tinggi]. Pendiri menurut pers 2021: Jamie (James) True, Jack Bekhor, dan Patrick Walker [S13-S15, sedang]; jabatan (CEO, CFO) tidak ditemukan di sumber itu, belum terverifikasi. Pers menyebut didirikan 2019; rilis App Store 2020 |
| Usia, skala | Rilis App Store 2020-04-20, peluncuran publik Feb 2021 [S2, S14]. iOS 4,73 dari 2.725 penilaian (AS) [S2]; Play 100K+ unduhan [S4]. Jun 2021: sekitar 35 ribu pengguna aktif bulanan [S16]. Klaim sendiri 2026: 11 juta+ pengguna, 2.000+ pelanggan perusahaan [S5] (belum terverifikasi). Seed 2021 total $19 juta [S13, S14] |
| Platform, bahasa | iOS, Android, web; Teams dan Slack untuk B2B [S1, S5]. App konsumen hanya berbahasa Inggris [S2]. Tidak ada konten Islam khusus; Religion & Spirituality hanya satu dari 14 topik |
| Harga | Free = 1 Hack per hari [S7, tinggi]. Mobbin sekitar 2023: $19,99/bulan, $55,99/tahun, trial 3 hari (angka bulanan dan trial cocok dengan [S17]); App Store kini menyebut trial 7 hari [S1]; 2021 sekitar $80/tahun [S16]. Beda per negara dan berubah (sedang) |
| Model bisnis | Freemium; benefit karyawan lewat pemberi kerja [S18, rendah]; Academy per kursi (klaim situs [S5], belum terverifikasi) |

## 2. Sepuluh dimensi

| Dimensi | Yang dilakukan Uptime | Pelajaran untuk Surau |
|---|---|---|
| 1. Unit konten | Hack 5 menit: Overview (*In a nutshell*, kutipan favorit), 2-4 Insight (satu pernyataan tebal + 1-3 kalimat), Take action, Wrap-up. Ada penanda *Section 5/6*, bar progres bersegmen, istilah yang bisa diketuk. 1.500+ Hack saat peluncuran [S14] | Kerangka tetap membuat isi mudah dipindai. Intisari Bab sudah punya Ringkasan dan Gagasan kunci; yang kurang penanda posisi dan ritme |
| 2. Penemuan | Beranda berlapis: *For you*, *Now trending*, *Editor's Picks* mingguan, *Collections* bertema. Browse: pencarian, 14 chip topik, per format. Hasil pencarian tidak ada di Mobbin | Hub Intisari Kitab belum tampil. Pilihan Pekan Ini dan Koleksi musiman murah karena hanya menata tautan |
| 3. Baca, dengar | Read, Watch (kartu ketuk-lanjut, *Jump to insights*), Listen dari bar bawah; mini-player melayang; lembar opsi (kecepatan, suara, unduh, laporkan, atribusi). Suara dan unduh Premium. Keluhan 2025: audio salah buku [S3] | Surau sudah punya Dengarkan ([ADR-097](../../../implementasi/KEPUTUSAN.md)) dengan sorotan kalimat ([ADR-104](../../../implementasi/KEPUTUSAN.md); baru sebagian bab pilot berudio), yang tidak tampak di layar Mobbin Uptime. Tambahan: mode kartu dan menu transparansi |
| 4. Lapisan belajar | Spark Repetition dengan jadwal sesuai jawaban dan penjelasan cara kerja di layar; streak dengan pengingat; progres 17% dari Hack yang dimulai. Streak repair hanya Premium. Tidak ada kuis per Hack di app konsumen | Surau punya pertanyaan ingatan per gagasan (Uji pemahaman), belum jadwal ulang. Bahannya sudah ada ([FASE](../../../implementasi/FASE.md), Fase 7) |
| 5. Aksi pengguna | Bookmark, unduh, simpan satu kartu ke Board, daftar Saved dan Unfinished. Bagikan kartu berfooter merek: video, gambar, tautan, embed. Tidak tampak sorotan atau catatan bebas | Permalink sudah ada; kartu kutipan bagikan dan Simpan gagasan belum |
| 6. Onboarding | Masuk Google, email, atau telepon; pilih minimal tiga dari 14 topik; pra-ajakan notifikasi; beranda langsung terisi; lalu penawaran trial | Satu pertanyaan minat cukup, bisa tanpa akun dan disimpan lokal |
| 7. Monetisasi | Free 1 Hack/hari; Premium membuka sisanya. Paywall di onboarding: diskon 75% hari ini, trial 3 hari. Meluas ke B2B2C dan Academy. Refund via app ikut Apple/Google [S11] | Tidak ditiru. Hanya jalur beli karya asli [S10] patut dicontoh; padanannya tautan ke teks lengkap |
| 8. AI | 2021: machine learning plus kurasi manusia; satu anggota tim yang sudah membaca sumbernya meninjau, sekitar 2 jam per Hack [S16]. Label AI pada Hack dan chat AI di app konsumen tidak ditemukan. B2B 2026: Sparky menjawab hanya dari konten ahli atau disetujui dan mengutip tiap sumber [S5] | Pola rujukan-dulu sejalan dengan Maknaz. Label AI Surau lebih jujur. Jangan meniru klaim mutlak (bab 4) |
| 9. Operasi konten | Judul dipilih tim ahli dan teknologi [S9]. Hack dari karya yang ada, plus Up Hack dari kreator yang tidak ditinjau sebelum terbit [S8]. Lisensi dengan penerbit tidak ditemukan. Laporan kekeliruan lewat *Give feedback*, proses koreksi tidak dijelaskan [S21] | Surau: kurasi sempit, tinjau sebelum terbit, lisensi jelas. Jangan buka jalur kreator tanpa tinjau |
| 10. Keluhan | Sampel 50 ulasan terbaru toko AS (2022-2026): 24 bintang 5, 21 bintang 1-2; 13 dari 21 soal bayar (tidak benar-benar gratis, tertagih setelah batal, harga); satu ulasan lagi menyebut harga $20/bulan sambil mengeluh koleksi. Isi: tipis, berulang, tanpa karya klasik. Pujian: format cerita menjaga perhatian [S3]. Reddit dan Trustpilot tidak ditemukan | Keluhan isi adalah kekuatan Intisari. Sampel kecil |

## 3. Cakupan Mobbin

- **Ada:** lebih dari 56 layar iOS Uptime (flow Onboarding 28 dan 23 layar, mailing list 4, Premium 1, plus layar lepas) [S19]. Dipilih 26 untuk Paper.
- **Tidak ada:** hasil pencarian, pengaturan dan profil, fitur AI atau Sparky, kuis selain Spark Repetition, situs web.
- **Usia:** tangkapan sebagian besar sekitar 2023; paywall, harga, dan tab Premium sesudahnya tidak tertangkap.
- Layar app lain tidak dipakai sebagai pengganti.

Layar yang dirujuk (iOS, salinan di Paper):

- Penemuan: [01 beranda](https://mobbin.com/screens/c34dfdc2-d565-487e-bde0-f193d1428b97), [02 Editor's Picks](https://mobbin.com/screens/a2854255-7b2a-4518-b07e-3189c30946b6), [03 koleksi](https://mobbin.com/screens/a211f217-6990-4bca-a85a-e3e1f3bb4aad), [04 Featured](https://mobbin.com/screens/4896d9fd-290d-494e-b33b-a9a4a810a2e1), [05 cari dan topik](https://mobbin.com/screens/72369ef4-9307-4f9b-9821-12bad75e1b97), [06 per format](https://mobbin.com/screens/857290a0-12ac-446f-a3a5-ed987e287b0a), [07 kategori](https://mobbin.com/screens/2dd11cc6-3c3e-48b2-8590-02789791decb)
- Detail dan pembaca: [08 detail](https://mobbin.com/screens/efc00467-3d25-419b-80a4-4130e96a71e1), [09 sampul](https://mobbin.com/screens/0d0f3766-e97e-4298-9e52-c05cf05f2ba1), [10 nutshell](https://mobbin.com/screens/7e41168b-cf75-4873-8743-96f5047977dc), [11 insight](https://mobbin.com/screens/47a72476-df88-4d2e-a07f-1c7a1199bdef), [12 take action](https://mobbin.com/screens/72d2535c-f7d2-4115-a9e9-3c8a2b987e95), [13 diagram](https://mobbin.com/screens/1a48d85e-7ecb-4be6-8045-b18bb415ef86), [14 video sumber](https://mobbin.com/screens/ee0b0a84-f555-47cd-bf41-095d18e43918), [15 mode Read](https://mobbin.com/screens/d5a70596-23e8-4a4f-80ee-bf88b0e57e53)
- Audio dan belajar: [16 opsi pemutar](https://mobbin.com/screens/7e7eabc9-a037-4e2a-a57c-2161e4d4c7e4), [17 kartu ulas](https://mobbin.com/screens/fc44f771-e928-4c87-9a26-c5add5ffa576), [18 cara kerja ulas](https://mobbin.com/screens/79f5ffba-cb77-4653-9d05-d9603b167b1b), [19 streak dan Unfinished](https://mobbin.com/screens/fa6e0905-61ed-4ff6-8785-4f20a33c4ab0)
- Aksi: [20 lembar Spark](https://mobbin.com/screens/d0de24c1-8b94-4e80-ae57-c37c96637600), [21 papan](https://mobbin.com/screens/d076c7e2-5bba-448d-ac77-aba4f8195076), [22 bagikan kutipan](https://mobbin.com/screens/5d311267-f5c2-4943-9638-79cc5bd7ae03), [23 daftar simpanan](https://mobbin.com/screens/36c67bf8-fdf0-4e5b-9383-b512dc74aa4e)
- Onboarding dan paywall: [24 pilih topik](https://mobbin.com/screens/1e565c14-d2a2-4e1e-a6b8-353feb65934e), [25 penawaran 75%](https://mobbin.com/screens/3f812646-bf73-4cc0-a434-4376e2bb167a), [26 Free vs Premium](https://mobbin.com/screens/3711d755-42f0-4048-b8df-67900482b992)

## 4. Yang sengaja tidak ditiru

- **Paywall berlapis dan urgensi palsu** (layar 25), serta **tingkat gratis dipotong dan fitur belajar dikunci** (layar 26). Bertabrakan dengan prinsip tanpa paywall atas konten; ulasan menyebut app ini tidak benar-benar gratis [S3]. Surau membuka semuanya, dukungan lewat donasi.
- **Ringkasan terlalu tipis.** Pada kitab klasik berisiko salah atribusi; pertahankan jangkar ke paragraf dan pembedaan pendapat penulis dari nukilannya.
- **Framing hemat waktu dan streak berbayar.** Menggeser ringkasan menjadi pengganti baca dan memanfaatkan cemas kehilangan streak (risiko riya).
- **Konten kreator terbit tanpa tinjau awal** [S8]. Kapasitas ustadz Surau kecil, jadi jalur terbit bebas tidak dibuka.
- **Klaim pemasaran dan pengumpulan data luas.** Situs memakai frasa "Nothing generated, nothing made up" [S5], yang adalah klaim pemasaran (belum diperiksa ulang pada tampilan situs). Label privasi App Store memuat email, telepon, lokasi kasar, dan riwayat pencarian sebagai data tertaut ke pengguna [S1]; bagian "dipakai untuk melacak" tidak tercantum. Surau cukup berjanji bahwa setiap jawaban punya alamat.

## 5. Apakah Intisari Surau sudah menarik?

Pengamatan atas HTML awal [S20] (diambil 2026-10-27, tanpa JavaScript): 6 gagasan, sekitar 4 menit baca. Ada label Intisari AI dan Terjemahan AI dengan model, tanggal, dan status belum ditinjau manusia; Ringkasan; enam kartu Gagasan kunci berlabel Pendapat al-Ghazali dengan tautan Dasar teks (blok Teks kitab hanya pada dua gagasan); Istilah; Uji pemahaman; tombol Baca teks lengkap; pengingat belajar dengan guru; catatan lisensi. Tidak ditemukan: tombol Dengarkan, Simpan, Bagikan, Laporkan, dan penanda progres. Bab ini mungkin belum berudio (baru 6 Intisari pilot yang berudio); belum diverifikasi di peramban.

- **Surau unggul** pada kedalaman dan jangkar (titik keluhan terbesar pengguna Uptime), kejujuran label AI, dan latihan per bab.
- **Uptime unggul** pada ritme kartu dan penanda posisi, saluran sebar (kartu bagikan, embed), kebiasaan (streak, Unfinished, jadwal ulang), penemuan (beranda berlapis), dan menu Laporkan serta Atribusi satu ketukan.

Kesimpulan: Intisari kuat untuk pembaca serius dan lemah untuk kebiasaan harian dan penyebaran. Itu soal bentuk dan pintu masuk, bukan isi. Sebelum membangun, ukur hal sederhana tanpa melacak individu, misalnya berapa kali Dasar teks dibuka.

## 6. Pelajaran arah produk

- **Lintasan Uptime:** app konsumen freemium (2021), benefit karyawan, Academy per kursi dengan dasbor penyelesaian, asisten berkutip, lalu pembelian Econsultancy, penerbit konten ahli [S5, S12]. Nilai bergerak dari ringkasan ke lapisan belajar, pengelola, dan korpus ahli.
- **Satu merek, banyak lapisan:** Hack, Academy, dan Sparky berada di bawah nama Uptime. Usulan riset ini (pendapat, bukan temuan): Surau memecah dulu sebagai fitur dan jalur (Intisari, Maknaz, jalur Arba'in, Halaqah) di bawah satu merek; merek terpisah menunggu tim dan kapasitas tinjau sendiri. Keputusan ada di pemilik.
- **Padanan nirlaba** adalah distribusi lewat kelas dan jalur belajar (Uptime menawarkan dasbor penyelesaian kepada pelanggan perusahaan [S5]). Selisih terbuka: Surau tidak meniru lencana penyelesaian atau capaian, streak harian, peringkat, dan papan peringkat; hanya lencana asal atau status (teks kitab, Intisari AI, ditinjau; lihat [01](01-blinkist.md) usulan 2) dan target mingguan lembut tanpa streak yang diterima. **Korpus adalah aset, AI hanya lapisan akses.**

## Dampak untuk Surau

Sepuluh usulan, dari kecil ke besar. Angka dalam kurung: nomor layar. Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi.

| # | Usulan konkret | Usaha, dampak | Prinsip yang diuji dan pengaman |
|---|---|---|---|
| 1 | Kerangka Intisari tetap: Satu kalimat, Kutipan pilihan (dipilih kode lewat ID dan offset), Gagasan 1..n, Istilah dan renungan, Bawa ke guru (09-12) | S, sedang | Bukan fatwa: ganti Take action dengan pertanyaan renungan dan arahan tanyakan ke guru, bukan perintah |
| 2 | Label jenis (Intisari Kitab, Intisari Bab, Istilah, Kutipan), Koleksi musiman (Ramadan, Muharram, Maulid) berupa tautan ke bagian kitab, Pilihan Pekan Ini kurasi manual (01-03, 06, 07) | S, sedang | Alamat: koleksi hanya menata tautan, bukan fatwa tematik |
| 3 | Menu Lainnya di tiap Intisari: Laporkan kekeliruan (catatan dengan ID gagasan ke antrean tinjau), Atribusi dan lisensi, mode baca (16) | S, tinggi | Kapasitas ustadz kecil: perlu triase dan status publik sedang ditinjau; jangan menjanjikan koreksi cepat |
| 4 | Onboarding satu pertanyaan tanpa akun (mau mulai dari mana: ilmu dan adab, ibadah, hati), disimpan lokal (24) | S, sedang | Privasi: tanpa akun paksa. Baru berguna setelah korpus lebih dari satu kitab |
| 5 | Mode kartu geser (Baca, Kartu, Dengar): satu gagasan per kartu, penanda Gagasan 2 dari 6, lompat ke gagasan; tiap kartu tetap memuat Pendapat al-Ghazali dan Dasar teks (04, 08, 09, 15) | M, tinggi | Atribusi: kartu singkat memotong konteks, maka label dan tautan sumber wajib di setiap kartu. Verbatim: Arab tetap disalin kode dari DB |
| 6 | Kartu kutipan bagikan, dirender kode: Arab dari DB, terjemahan berlabel AI, footer kitab, jilid, halaman cetak, permalink; aksi Bagikan gambar, Salin tautan, Sematkan (15, 22) | M, tinggi | Verbatim dan alamat: kutipan lepas konteks mudah disalahgunakan, jadi permalink dan label pendapat penulis vs nukilan wajib; Arab dirender dari teks DB (cek code point), bukan gambar buatan model |
| 7 | Maknaz rujukan-dulu: daftar rujukan (halaman cetak) dan Intisari terkait lebih dulu, baru penjelasan singkat berlabel AI [S5] | M, tinggi | Selaras prinsip; jangan meniru klaim nol halusinasi. Menekan biaya token (plafon $20/bulan) |
| 8 | Perpustakaan saya, lokal-first: Riwayat, Belum selesai, Tersimpan, lanjut di bab terakhir; target mingguan lembut tanpa streak (19, 23; Uptime memakai streak harian dengan pengingat, Surau tidak meniru) | M, sedang | Riya dan tekanan: tanpa streak harian, hukuman, penebusan berbayar, atau papan peringkat |
| 9 | Simpan gagasan ke Papan lokal dan ulas harian tiga tombol Belum/Ragu/Ingat (interval 1, 3, 7, 21 hari) dari pertanyaan ingatan yang sudah ada; jadwal dijelaskan satu kalimat (17, 18, 20, 21) | L, tinggi | Ketepatan: bahan hanya dari gagasan berjangkar dan glosarium, sampel ditinjau. Alat ingatan, bukan penilaian keilmuan. Fondasi jalur Arba'in |
| 10 | Surau Halaqah: ustadz atau pesantren membuat kelas, menetapkan jalur, melihat kemajuan agregat tanpa data pribadi [S5, S6] | L, tinggi | Privasi santri, terutama anak: agregat anonim, persetujuan wali. Tanpa lencana penyelesaian atau ijazah. Bergantung usulan 9 |

**Selisih terhadap ADR-097.** [ADR-097](../../../implementasi/KEPUTUSAN.md) meriset Headway, Blinkist, Shortform, NotebookLM, dan Yaqeen, bukan Uptime, jadi riset itu tidak diulang.
- *Mengonfirmasi:* fitur belajar yang dicatat di Fase 7 (ulas berjarak, simpan dan bagikan kartu kutipan, jalur 40 hari) punya padanan nyata di Uptime. Larangan "aksi hari ini" atas nama Surau tetap berlaku (usulan 1).
- *Menambah:* kartu geser sebagai tampilan alternatif; embed kartu kutipan; bentuk UI untuk koreksi (ADR-097 baru menyebut koreksi manusia sebagai syarat tinjau ulang); lapisan kelas; Maknaz rujukan-dulu.
- Tidak ada penyimpangan dari keputusan mana pun. Usulan 5 sampai 10 butuh ADR baru bila dikerjakan.

## Sumber

Tanggal akses semua sumber: 2026-10-27. Keyakinan: T tinggi, S sedang, R rendah. S2, S12, dan S20 dibaca ulang saat penyusunan dokumen ini; sisanya dibaca agen riset.

- [S1] App Store, deskripsi dan label privasi (T): https://apps.apple.com/us/app/uptime-get-smarter-stand-out/id1505323328
- [S2] iTunes Lookup API, penjual, versi, rating, bahasa (T): https://itunes.apple.com/lookup?id=1505323328&country=us
- [S3] 50 ulasan App Store terbaru (T sebagai data): https://itunes.apple.com/us/rss/customerreviews/page=1/id=1505323328/sortby=mostrecent/json
- [S4] Google Play (S): https://play.google.com/store/apps/details?id=com.uptime&hl=en
- [S5] Situs resmi, klaim sendiri (S/R): https://www2.uptime.app/
- [S6] Help center, beranda (T): http://help.uptime.app/en/
- [S7] Help center, Free vs Premium (T): http://help.uptime.app/en/articles/5267960-what-is-the-difference-between-uptime-premium-and-uptime-free
- [S8] Help center, tinjau Hack kreator (T): http://help.uptime.app/en/articles/6772264-will-my-hack-be-reviewed-before-it-s-published
- [S9] Help center, pemilihan konten (T): http://help.uptime.app/en/articles/4799891-how-does-uptime-choose-what-content-to-hack
- [S10] Help center, Hack bukan pengganti karya asli (T): http://help.uptime.app/en/articles/4799489-does-an-uptime-hack-replace-reading-a-book-listening-to-a-podcast-doing-a-course-or-watching-a-documentary
- [S11] Help center, refund (T): http://help.uptime.app/en/articles/5138219-can-i-get-a-refund-on-my-uptime-subscription
- [S12] RNS Centaur Media, penjualan Econsultancy (T): https://www.investegate.co.uk/announcement/rns/centaur-media--cau/tender-offer-update-and-sale-of-econsultancy/9334935
- [S13] tech.eu, 24 Mei 2021 (S): https://tech.eu/2021/05/24/london-based-bite-sized-knowledge-platform-uptime-raises-an-additional-3-million-in-seed-round-extension-huda-kattan-and-chad-hurley-on-board/
- [S14] Startups Magazine, Feb 2021 (S): https://startupsmagazine.co.uk/article-knowledge-hacking-app-raises-16m-transform-digital-learning
- [S15] City AM, 2021 (S): https://www.cityam.com/london-knowledge-hacking-app-uptime-raises-3m-from-youtube-founder/
- [S16] GetLatka, wawancara pendiri Jun 2021 (S): https://getlatka.com/companies/uptime/interviews/uptime-jack-bekhor-2021
- [S17] TapSmart, perbandingan app ringkasan (S): https://www.tapsmart.com/apps/education/book-summary-apps/
- [S18] Selebaran benefit karyawan (R; isi dari ringkasan pencarian): https://www.gtlaw.com/-/media/files/gtnn/uptime_flyer__us_english_03052025_high-(1).ashx?rev=-1
- [S19] Mobbin, flow Onboarding Uptime (T): https://mobbin.com/flows/55190814-bdf4-46ec-954e-66aa1a4cabe2
- [S20] Surau, Intisari Bab sebagai pembanding (T): https://surau.org/kitab/ihya/bab/100008/intisari
- [S21] Help center, laporan kekeliruan konten (T): http://help.uptime.app/en/articles/3935432-what-should-i-do-if-i-see-something-wrong-with-uptime-s-content

Konteks repo: [KEPUTUSAN](../../../implementasi/KEPUTUSAN.md) (ADR-071, ADR-097, ADR-104), [FASE](../../../implementasi/FASE.md), [visi](../../01-visi-dan-prinsip.md), [kebijakan](../../05-kebijakan.md).

## Batas riset ini

- Angka B2B (11 juta pengguna, 2.000+ pelanggan, harga Academy) adalah klaim pemasaran sendiri, belum terverifikasi independen.
- Sampel ulasan hanya 50 ulasan App Store AS; Reddit dan Trustpilot tidak ditemukan. Tangkapan Mobbin sekitar 2023, jadi harga dan tab Premium sekarang bisa berbeda.
- Tahun berdiri dan peran pendiri perlu konfirmasi.
