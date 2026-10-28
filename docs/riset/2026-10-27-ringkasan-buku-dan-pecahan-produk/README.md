# Ringkasan buku, Intisari, dan pecahan produk: rangkuman riset · 27 Oktober 2026

Pemilik Surau meminta tiga hal: mencontoh hal bagus dari empat app ringkasan buku (Blinkist, Headway, Deepstash, Uptime), menilai apakah Intisari sudah cukup menarik, dan menimbang apakah Surau perlu dipecah menjadi produk atau merek terpisah (mis. "Surau Maknaz", "Surau Summary", "Surau Academy"). Dokumen induk ini menjawab ketiganya secara singkat dan menautkan sembilan dokumen rinci. Riset awal di [ADR-097](../../../implementasi/KEPUTUSAN.md) tidak diulang; selisihnya dicatat di tiap dokumen.

## Ringkasan temuan

1. Yang layak dicontoh adalah pembungkus (pembuka, progres, kartu, bagikan, simpan, ulas), bukan isi atau cara mereka mencari uang.
2. Isi dan keterlacakan Intisari sudah melampaui keempat app; pembungkusnya belum.
3. Skor Intisari 2,65 dari 5: "sebagian, condong ke belum" (penilaian agent, bukan uji pengguna).
4. Lebih mendesak daripada daya tarik: dua gagasan berstatus Salah masih tayang di produksi.
5. Jangan pecah merek sekarang: satu Surau dengan mode bernama (Intisari, Maknaz, Jalur).
6. Yang langka bukan dolar, tetapi jam ustadz (satu orang), kepercayaan, dan bukti pemakaian.
7. Celahnya nyata: ringkas, dengar, dan belajar kitab klasik berbahasa Indonesia yang beralamat; penggabungnya tidak ditemukan (keyakinan rendah-sedang).
8. Tenggat alami: Ramadan 1448 H; keputusan X15c diusulkan paling lambat 20 Desember.

## 1. Cara membaca folder ini

Tangkapan layar Mobbin tidak ada di repo (hak cipta pihak ketiga; repo open source). Salinannya ada di file Paper "Surau Research" milik pemilik (akses terbatas; salinan layar tidak dipublikasikan di repo), dengan delapan halaman: 00 Ringkasan, 01 Blinkist, 02 Headway, 03 Deepstash, 04 Uptime, 05 Pola pembanding, 06 Intisari hari ini, 07 Peta produk. Tautan Mobbin di dokumen menjadi atribusi. Penilaian mutu dan skor berasal dari agent AI, bukan ustadz atau pengguna. Satu app: baca 01 sampai 04; keputusan: 09; mutu Intisari: 08.

- [01 Blinkist](01-blinkist.md): sepuluh dimensi, 26 layar, alasan akhir narasi AI di ADR-097 (koreksi belum didukung bukti primer).
- [02 Headway](02-headway.md): poin kunci bernomor, kartu bagikan, "Remember"; dua catatan ADR-097 diperiksa (satu didukung, satu dikoreksi).
- [03 Deepstash](03-deepstash.md): kartu satu gagasan, koleksi, mengapa terasa menarik.
- [04 Uptime](04-uptime.md): Hack 5 menit, ulas berjarak, menu Laporkan, pergeseran ke B2B.
- [05 Pola lintas app](05-pola-lintas-app.md): matriks 4 app x 10 dimensi, pembanding per produk, 12 pola berperingkat.
- [06 Lanskap kitab Islam dan Indonesia](06-lanskap-kitab-islam-dan-indonesia.md): pesaing, sikap NU dan MUI soal AI, segmen, kanal.
- [07 Korpus dan data](07-korpus-dan-data.md): analog (Sefaria dkk.), playbook Fase 5 sampai 7, biaya, lisensi, bukti.
- [08 Audit Intisari](08-audit-intisari.md): 19 Intisari Bab pilot, skor, 13 usulan Intisari v2.
- [09 Pecahan produk](09-pecahan-produk.md): alasan tidak memecah merek, portofolio, roadmap, keputusan pemilik.

## 2. Jawaban singkat atas tiga pertanyaan pemilik

**a. Apa yang dicontoh?** Pembungkus, bukan isi.

- Blinkist: lencana asal (Blink berbeda dari Extract AI), pembuka, progres tersegmen, baca-dengar satu layar, sorotan menjadi daftar kutipan.
- Headway: poin kunci bernomor dengan wawasan satu kalimat, kartu bagikan, "Remember" menjadi kartu ulas berjarak, penilaian dengan chip.
- Deepstash: satu gagasan per layar, simpan ke koleksi, ekspor, kuis di tengah alur.
- Uptime: kerangka tetap, kartu geser, menu Laporkan dan Atribusi.

Tidak ditiru: paywall, uji coba otomatis, urgensi palsu, streak harian, lencana capaian atau penyelesaian, papan peringkat, onboarding panjang berakun, pelacakan (lencana asal atau status seperti "teks kitab" dan "ditinjau" tetap boleh; hanya target mingguan lembut tanpa streak yang diterima). Keluhan terbesar keempatnya adalah tagihan, bukan konten (Trustpilot bintang 1: Blinkist 29%, Headway 22%, Deepstash 13%; [05](05-pola-lintas-app.md)). Tak satu pun mendukung bahasa Indonesia.

**b. Apakah Intisari sudah menarik?** Sebagian, condong ke belum: rata-rata 2,65 dari 5 (lima sudut pandang x delapan dimensi). Kuat di kepercayaan (4,0) dan kedalaman (3,5); lemah di dorongan kembali (1,4), bagikan (1,6), dan hook (2,0). Penyebabnya pembungkus ([08](08-audit-intisari.md)):

- Gagasan pertama di luar layar ponsel pertama pada 19 dari 19 halaman; layar itu berisi label.
- Tidak ada inti satu kalimat: 16 dari 19 abstrak dibuka "Bagian/Teks ini membahas".
- Median sekitar 12 layar; nol tombol bagikan, simpan, atau berikutnya; audio di 6 dari 19 halaman.

Dua gagasan yang dinilai Salah oleh QA agent (bab 100017 dan 100007) masih tayang; audio 100017 kemungkinan membacakannya (belum didengar). Jawaban pasti baru datang dari uji lima pembaca.

**c. Bagaimana memecah Surau?** Belum. "Surau Summary" tetap Intisari, "Surau Maknaz" tetap Maknaz (nama agen, [ADR-071](../../../implementasi/KEPUTUSAN.md)), "Surau Academy" menjadi Jalur ("Academy" menyiratkan ijazah). Alasan ([09](09-pecahan-produk.md)): pemisahan memisahkan nama, bukan risiko; korpus, aturan sitasi, peninjau, dan anggaran AI (plafon US$20 per bulan) tetap sama; tak satu pun dari empat app memecah merek per format; Sefaria satu merek bermodul ([07](07-korpus-dan-data.md)). Merek terpisah baru bila semua syarat di 09 terpenuhi, antara lain pemakaian berulang dari audiens berbeda selama 8 pekan dan minimal dua peninjau aktif. Kandidat pertama menurut 09: Bahan Kajian, lalu Dengar (01 menunjuk Academy bila audiensnya kelas atau pesantren). Selisih terhadap ADR-097: audiens utama bergeser ke alumni pesantren ([06](06-lanskap-kitab-islam-dan-indonesia.md)).

## 3. Roadmap singkat

Dari [09](09-pecahan-produk.md) dan [08](08-audit-intisari.md).

- **Sekarang (tanpa LLM):** tahan dua gagasan Salah lewat daftar tolak di repo plus deploy; kepala halaman baru (label satu baris menunggu keputusan pemilik no. 3 di bawah, karena menyentuh [docs/05 §12](../../05-kebijakan.md)), urutan halaman, kartu Intisari di beranda, hub, sitemap, pratinjau tautan; tombol Laporkan; llms.txt; ledger kitab. Tahap B pilot (inti dan judul baru, 19 Bab) menunggu izin biaya.
- **Berikutnya:** uji lima pembaca, teks dibekukan; lalu Faedah (satu butir lewat WhatsApp), Jalur 7 hari, kitab pertama sesudah Ihya (Bidayat al-Hidayah), uji dengar buta, Maknaz terbatas.
- **Nanti:** X15c dan Jalur 40 hari, diputuskan paling lambat 20 Desember agar mengejar Ramadan 1448 H (perkiraan awal Februari 2027, belum terverifikasi); audio batch, kitab lanjutan, badan hukum dan donasi, pemisahan merek.

## 4. Keterbatasan riset

- **Mobbin:** hanya iOS; 26 layar per app dari kumpulan lebih besar. Usia tangkapan: Blinkist dan Deepstash sekitar Maret 2026, Headway Oktober 2024, Uptime sekitar 2023. Fitur AI baru tidak tertangkap.
- **App tidak dicoba langsung.** Harga bertentangan antar sumber; skala adalah klaim sendiri. Sampel ulasan kecil (20 sampai 50); Reddit tidak terjangkau; ulasan pesaing bias.
- **Blinkist menolak akses (403):** alasan akhir narasi AI hanya dari ringkasan pencarian (sedang); koreksi atas ADR-097 belum didukung bukti primer, jadi baca sumber primer dulu sebelum sebuah ADR mengoreksinya.
- **Skor Intisari adalah penilaian agent:** audio tidak didengar, kesetiaan isi hanya dibaca penuh pada bab 100008, belum ada penilaian ustadz atau pengguna.
- **Batas WebSearch:** anggaran habis saat menyusun 06 dan 07 (Cabaca, Fabula, Storial, Bookmate, hasil Munas XI MUI belum diperiksa); beberapa halaman tidak terbuka.
- **Belum terverifikasi:** tanggal resmi 1 Ramadan 1448 H, arti "Maknaz", berlakunya PMA 44/2016 bagi Surau, isi Rumah Kitab, kesediaan berdonasi, permintaan nyata ringkasan kitab AI.
- **Klaim "3 poin per hari" Headway (ADR-097):** didukung FAQ dan blog resmi sebagai syarat streak, tetapi layar Mobbin hanya menampilkan target menit; keyakinan sedang ([02](02-headway.md)).
- Regulasi dan lisensi bukan nasihat hukum.

## Dampak untuk Surau

Sepuluh pola dari empat app, dampak tinggi per usaha kecil lebih dulu; semuanya penilaian agent. Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Urutan ini menyaring usulan 01 sampai 04 dan tidak persis sama dengan 12 pola berperingkat di [05](05-pola-lintas-app.md), tempat pola khusus Maknaz juga berada. **Sebelum pola apa pun:** tutup dua gagasan Salah ([08](08-audit-intisari.md) usulan 1).

| # | Pola (asal) | Untuk Surau | Usaha | Prinsip yang diuji |
|---|---|---|---|---|
| 1 | Lencana asal seragam (Blinkist) | "teks kitab", "Intisari AI", "ditinjau"; tidak pernah "terverifikasi" | S | Label AI; "ditinjau" hanya bila nyata |
| 2 | Inti satu kalimat (Blinkist, Headway, Uptime) | Di kepala Bab, dari gagasan berjangkar; ditulis ulang model butuh izin batch | S | Atribusi; [docs/05 §12](../../05-kebijakan.md) melarang janji manfaat |
| 3 | Pintu masuk (Deepstash, Uptime) | Kartu Intisari di beranda, hub, "bab hari ini" | S-M | Koleksi hanya menata tautan |
| 4 | Laporan kekeliruan bertag (ketiganya) | "Setia pada teks?" masuk antrean ustadz per gagasan | S-M | Kapasitas ustadz kecil; bukan voting |
| 5 | Pembaca per gagasan, progres (semua) | Mode Kartu, tanda selesai di perangkat | M | Konteks jangan terpotong; bukan pengganti guru |
| 6 | Kartu kutipan bagikan (Headway, Deepstash, Uptime) | Gambar bersitasi dan permalink; mulai dari pratinjau tautan | S lalu M | Verbatim; hanya gagasan ditinjau |
| 7 | Baca-dengar satu layar (Blinkist, Headway) | Dengarkan di semua Intisari, daftar gagasan berstempel waktu | M | Tanpa Arab oleh mesin; audio butuh izin |
| 8 | Simpan dan ekspor (Headway, Deepstash) | "Kutipan saya": ID paragraf plus offset, data di perangkat | M | Verbatim; data keagamaan sensitif |
| 9 | Uji jawab-dulu, ulas berjarak (Headway, Uptime) | Kuis ke tengah alur (S); ulas berjarak lokal (L) | S ke L | Alat ingatan, bukan nilai keilmuan |
| 10 | Jalur berurutan (Deepstash, Headway) | Jalur 7 hari, lalu Arba'in Ihya 40 hari | M | Tanpa sertifikat atau ijazah |

### Keputusan yang menunggu pemilik

Ringkasan; daftar lengkap (delapan butir, termasuk WhatsApp Channel Faedah, suara AI tanpa nama persona, dan Jalur 40 hari sebagai target Ramadan) ada di [09](09-pecahan-produk.md) bagian 7.

1. Izin menghapus mp3 bab 100007 dan 100017 dari R2 ([aturan keras 4](../../../CLAUDE.md)); rekomendasi 09: ya, sekarang.
2. Jam ustadz peninjau per bulan (saat ini satu orang) dan ustadz kedua.
3. Tafsir docs/05 §12 lewat ADR: label satu baris plus lipatan, judul beratribusi bervariasi.
4. Izin biaya per batch: Tahap B pilot, kitab berikutnya, uji dengar, audio.
5. Penamaan, arti "Maknaz", cek merek DJKI.
6. Badan hukum, donasi, dan pertanyaan tertulis ke LPMQ soal PMA 44/2016.
7. Pembaca uji (tiga alumni pesantren, dua awam) dan tiga sampai lima pengajar.

## Sumber

Diakses 2026-10-27. Dokumen 01 sampai 09 punya daftar Sumber dan keyakinan sendiri; README ini tidak menambah klaim faktual baru.

- File Paper "Surau Research": file pribadi pemilik (akses terbatas; berisi salinan layar Mobbin pihak ketiga yang tidak dipublikasikan di repo; halamannya dibuka lewat Paper MCP; tinggi).
- Intisari yang dinilai: https://surau.org/kitab/ihya/bab/100008/intisari (dilihat langsung; tinggi).
- Konteks repo: [KEPUTUSAN](../../../implementasi/KEPUTUSAN.md) (ADR-071, ADR-097), [docs/05](../../05-kebijakan.md).
