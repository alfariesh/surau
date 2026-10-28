# Audit Intisari: apakah sudah menarik? · 27 Oktober 2026

Pemilik ragu apakah Intisari, misalnya [bab Bukti-bukti akal](https://surau.org/kitab/ihya/bab/100008/intisari), sudah cukup menarik. Dokumen ini menjawabnya lewat audit 19 Intisari Bab pilot di produksi (Kitab al-'Ilm) oleh lima sudut pandang (bagian 1), lalu membandingkannya dengan Blinkist, Headway, Deepstash, dan Uptime. **Jawaban jujur: sebagian, condong ke belum.** Intisari tepercaya dan lebih jujur daripada keempat app itu, tetapi belum memikat pengunjung baru, dan satu temuan mutu lebih mendesak daripada daya tarik.

Ini hanya riset: tidak ada kode, data, atau produksi yang diubah. Tangkapan layar tidak ditaruh di repo (hak cipta layar app lain); salinannya ada di file Paper "Surau Research", halaman "06 · Intisari hari ini", dan nama berkas gambar `surau-*.jpg` di bawah adalah tangkapan lokal sesi riset (tidak di-commit, tidak ada di repo), hanya rujukan catatan. Rincian per app: [Blinkist](01-blinkist.md), [Headway](02-headway.md), [Deepstash](03-deepstash.md), [Uptime](04-uptime.md).

## Ringkasan temuan

1. **Skor rata-rata 2,65 dari 5** (5 sudut pandang x 8 dimensi). Kuat: kepercayaan 4,0 dan kedalaman 3,5. Lemah: dorongan kembali 1,4, bagikan 1,6, hook 2,0. Tiga sudut pandang menjawab "sebagian", dua "belum".
2. **Layar ponsel pertama berisi label, bukan nilai.** Dua chip AI, baris model, dan kartu penafian (±160 px, ±19% layar) mendahului isi. Judul gagasan pertama tidak terlihat di layar 844 px pada 19 dari 19 halaman.
3. **Tidak ada inti satu kalimat.** 16 dari 19 ringkasan dibuka "Bagian/Teks ini membahas" (satu lagi "Bagian ini adalah"), dan 119 dari 119 judul gagasan diawali "Al-Ghazali".
4. **Halaman terlalu panjang untuk komuter.** Median ±12 layar; blok "Dalil" memakai 59-68% tinggi halaman panjang.
5. **Hampir tanpa pintu masuk dan jalan lanjut.** Nol sebutan "Intisari" di beranda dan halaman karya; hub belum tayang; nol tombol bagikan, simpan, atau berikutnya.
6. **Mutu lebih mendesak daripada daya tarik.** Dua gagasan yang dinilai Salah oleh QA agent (satu membalik sikap al-Ghazali) masih tayang di produksi, dan audio kedua bab itu (100007 dan 100017) masih aktif, padahal catatan sesi menyebutnya ditahan (diperiksa ulang 2026-10-27; audio 100017 hampir pasti membacakan gagasan itu, belum didengar).
7. **Pembeda yang harus dijaga:** Dasar teks per gagasan, sikap tiga arah, kutipan Arab dari DB, takhrij jujur. Tidak ditemukan pada keempat app benchmark.
8. **Perbaikan terbesar adalah penataan** (usaha S, tanpa LLM). Perubahan prompt (inti, judul) berbayar dan butuh izin pemilik.

## 1. Jawaban dan skor

Skala 1-5 (1 lemah, 5 sangat baik). Penilaian agent AI dari layar dan data produksi, **bukan uji pengguna**; audio tidak didengar.

| Sudut pandang | Hook | Pindai | Nilai baru | Kedalaman | Percaya | Dorongan kembali | Bagikan | Audio | Rata-rata | Putusan |
|---|---|---|---|---|---|---|---|---|---|---|
| Pembaca awam (komuter) | 2 | 2 | 3 | 4 | 4 | 1 | 1 | 3 | 2,50 | sebagian |
| Pengkaji (santri/mahasiswa) | 2 | 3 | 3 | 3 | 4 | 2 | 2 | 3 | 2,75 | sebagian |
| Ustadz penjaga mutu | 2 | 3 | 3 | 2,5 | 3 | 2 | 2 | 3 | 2,56 | belum |
| Product/growth | 2 | 3 | 3 | 4 | 4,5 | 1 | 1,5 | 3 | 2,75 | sebagian |
| Advokat setan | 2 | 2,5 | 3 | 4 | 4,5 | 1 | 1,5 | 3 | 2,69 | belum |
| **Rata-rata** | **2,0** | **2,7** | **3,0** | **3,5** | **4,0** | **1,4** | **1,6** | **3,0** | **2,65** | |

"Sebagian" berarti: bagi yang sudah mau mengkaji, Intisari berguna sebagai peta ke teks; bagi pengunjung baru dari tautan WhatsApp, belum, sebab tidak ada alasan menggulir. Ustadz memberi kepercayaan 3: rancangannya 4,5, keadaan data hari ini (butir 6) 2.

## 2. Temuan konten

| Temuan | Bukti | Keyakinan |
|---|---|---|
| Tidak ada inti satu kalimat; judul halaman hanya terjemahan judul bab | 16 dari 19 abstrak dibuka "Bagian ini membahas" (12) atau "Teks ini membahas" (4), satu lagi "Bagian ini adalah"; 47-70 kata (dihitung ulang dari halaman produksi 2026-10-27) | tinggi |
| Judul gagasan seragam, tanpa hasil | 119 dari 119 diawali "Al-Ghazali" lalu kata kerja (menukil 24, menjelaskan 16, membantah 12). Bukan satu frasa (pola "menjelaskan bahwa" hanya 8%), tetapi subjek dan struktur yang sama | tinggi |
| Isi mengulang judul; sebagian meta atau ganda | 46 dari 119 isi memakai kata kerja judul; 100008 gagasan 1 meta, gagasan 2 (kuda dan keledai) wawasan sungguhan; 100009 gagasan 6 menggantung; "ulama pewaris para nabi" ada di 100004 dan anaknya 100005. Nilai wawasan = pendapat auditor | sedang |
| Uji pemahaman monoton, jawaban hanya penunjuk | 106 dari 136 pertanyaan (78%) diawali "Menurut al-Ghazali,"; "jawaban" = judul gagasan + tautan | tinggi |
| **Dua gagasan Salah masih tayang** | QA agent ([laporan](../../../data/reports/ihya-9472-intisari-qa-agent-2026-10-25.md)): 133 gagasan, Benar 91, Kurang 40, Salah 2; keduanya masih tayang. Bab 100017 gagasan 2 menulis "bukan rumah dan anjing secara harfiah", padahal j.1 h.49 menetapkan makna lahir dan itulah pembeda dari kaum Batiniyah. Bab 100007 gagasan 4 menulis "ibadah sunah", teksnya "setahun". [X15](../../../implementasi/sesi/X15-intisari.md) mencatat keduanya ditahan dan audionya dihapus, tetapi hanya di staging; `ihya-v9` membawanya kembali. Menurut MCP, audio 100017 (dibuat 2026-10-25) punya penanda bab untuk ketujuh gagasan, jadi hampir pasti membacakan gagasan 2 (belum didengar). Audio 100007 juga aktif di produksi (diperiksa 2026-10-27: tombol Dengarkan ada dan berkas mp3 menjawab 200); karena ingest hanya memuat audio yang skripnya sama dengan Intisari build ([data/audio](../../../data/audio/README.md)), audio itu kemungkinan memuat gagasan 4 (belum didengar) | tinggi untuk teks dan penanda audio; penilai = agent, bukan ustadz |
| Dasar teks benar bentuknya, tidak lengkap | Pembacaan manual 100008: jangkar hanya 8 paragraf (p165-p171, p182) dari ±20; gagasan 6 menunjuk p171 dan p182, bukan p179-p181 yang memuat rinciannya; "bukan karena tubuhnya lebih besar" menyederhanakan p166. Bab lain belum diperiksa | sedang |
| Asal label dan pilihan kutipan | Chip sikap buatan AI tampil sama dengan chip dari kode. Kutipan 100017 memakai terjemahan Haiku, pembaca memakai Sonnet: dua terjemahan untuk kalimat yang sama. Kutipan unggulan 100017 berupa riwayat berlabel lemah: tidak melanggar [docs/05 §12](../../05-kebijakan.md) (yang ditahan hanya sangat lemah, palsu, tanpa asal), tetapi mudah diingat dan dijadikan soal ingatan | sedang |

## 3. Temuan UX

| Layar | Temuan | Bukti |
|---|---|---|
| Intisari Bab, ponsel, 5 detik pertama | Label mendahului nilai; "Gagasan kunci" di y 808-1.120 px pada viewport 844 px | `surau-intisari-100008-ponsel-01.jpg` |
| Seluruh halaman | Dalil untuk peneliti menimbun gagasan; label waktu tidak cocok | 100004: "± 4 menit baca" vs 25.819 px (≈30 layar), Dalil 68%, Uji pemahaman di y 24.526; 100005 59%; audio 100017 6:05 vs label 4 menit |
| Beranda, karya, menu, pembaca | Intisari tak punya pintu; beranda menulis "bukan sekadar membaca ringkasan"; di pembaca "Buka Intisari" teks kecil di y≈815 dari 844; "Ringkasan AI" dan "Intisari AI" berdampingan di Cari | kata "Intisari" 0 kali di beranda dan karya; `surau-baca-j1h12-ponsel-01.jpg`, `surau-cari-ilmu-ponsel-02.jpg` |
| Hub dan Intisari Kitab | 404, disengaja (hub belum tampil karena belum ada Intisari Kitab); di ponsel bilah atas tampil ganda | `surau-hub-intisari-ponsel-01.jpg`; 100003 dan 100019 juga 404 (lihat catatan di bawah tabel) |
| Jalan keluar dan cacat kecil | Hanya "Baca teks lengkap"; nol bagikan/salin/simpan/sorot/berikutnya; `og:image` generik; "Dasar teks: j. 1, h. 49, j. 1, h. 49" (dua paragraf sehalaman); label "digest-section@2" bermakna bagi mesin, bukan awam | pencarian teks dan HTML di 100008 dan 100017; 100017 gagasan 3 |
| Audio | Pemutar matang (jeda, ±15 dtk, 1x, bab per gagasan), tetapi hanya 6 dari 19 halaman (31%): bab 100004, 100005, 100006, 100007, 100009, dan 100017 (diperiksa ulang 2026-10-27); tidak di contoh pemilik (100008) | `surau-intisari-100017-dengar-ponsel-01.jpg` |

Catatan 404 pada 100003 (Kitab) dan 100019 (Bab Keenam): staging dan laporan QA agent memuat keduanya (21 Intisari: 1 Kitab + 20 Bab; 133 gagasan = 119 pada 19 Bab produksi + 6 pada 100019 + 8 pada Intisari Kitab, hitungan dari laporan itu), sedangkan produksi `ihya-v9` memuat 19 Bab. Mengapa keduanya tidak ikut tayang belum dijelaskan di repo (STATUS hanya menulis bahwa hub Kitab belum tampil karena belum ada Intisari Kitab); perlu dicek apakah disengaja (temuan terpisah). Manifes audio X17 memuat track untuk keduanya, tetapi halamannya tidak tayang.

## 4. Perbandingan dengan benchmark

Intisari Kitab (setara Blinkist) belum tayang; tangkapan Mobbin Headway dan Uptime berusia ±2023-2024.

| Elemen | Blinkist | Headway | Deepstash | Uptime | Intisari hari ini |
|---|---|---|---|---|---|
| Unit | ±15 menit; pembuka manfaat, 5-10 bab, penutup | ±15 menit; 7-10 poin kunci berjudul tesis | kartu satu gagasan | Hack ±5 menit; 2-4 insight | Bab 2-4 menit: abstrak + 4-7 gagasan |
| Inti | pembuka "What's in it for me?" | wawasan satu kalimat per poin | tidak ada | "In a nutshell" | tidak ada |
| Pembaca | progres tersegmen, dock audio | "poin 3 dari 10", Read/Listen | satu kartu per layar | kartu geser, Read/Watch/Listen | satu halaman gulir panjang |
| Aksi | sorot, simpan, bagikan | sorot, Remember, bagikan | simpan ke Stash, bagikan kartu | Spark card, bagikan | nol |
| Belajar | target mingguan | misi harian, streak, ulas berjarak | streak, kuis mikro | Spark Repetition | Uji pemahaman berupa penunjuk |
| Sumber | kredit penerbit, tanpa jangkar per paragraf | tanpa byline dan jangkar | ide bersumber, mutu bervariasi | menu Atribusi dan Laporkan | **jangkar per paragraf, sikap tiga arah, takhrij** |

Pola: benchmark menang di pembungkus (hook, kartu, progres, bagikan, kebiasaan); Surau menang di bukti. Pembungkus bisa ditiru; mesin monetisasi dan tekanan psikologisnya tidak.

## 5. Yang harus dipertahankan

- Sikap tiga arah (Pendapat al-Ghazali 77, Dinukil 28, Dibantah 14), chip "Anjuran penulis", dan Dasar teks per gagasan dengan permalink paragraf.
- Kutipan Arab disalin kode dari DB; takhrij berlabel "dikenali otomatis, belum ditinjau", chip merah untuk kelemahan, dan "tanpa takhrij = tidak diketahui".
- Label AI dan penafian (boleh dipadatkan, tidak boleh dihilangkan), penutup "Intisari ini hanya pintu", dan pesan belajar bersama guru.
- Audio per gagasan (label suara AI sebagai teks, tanpa Arab oleh mesin, tanpa kloning suara); penemuan lewat Cari dan lencana daftar isi; tipografi ponsel yang nyaman.
- Uji pemahaman yang menunjuk gagasan jawabannya: ubah bentuknya, jangan dibuang.
- Tanpa "aksi hari ini", paywall, atau streak yang menghukum. Proses QA agent yang menemukan dua Salah itu benar; yang kurang adalah mengikatnya ke gerbang promote.

## Dampak untuk Surau

Usulan Intisari v2, digabung dari lima sudut pandang, diurut dari dampak tinggi per usaha kecil. Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. "Izin" = butuh izin pemilik di chat ([CLAUDE.md](../../../CLAUDE.md) aturan keras 4).

| # | Usulan | Wujud | Usaha | Izin | Prinsip yang diuji |
|---|---|---|---|---|---|
| 1 | Gerbang mutu dulu | Tarik dua gagasan Salah dan audio bab itu dari produksi; status ditolak ikut ke build; audio bab gugur otomatis; catat di log koreksi ([docs/05 §9](../../05-kebijakan.md)) | S | ya (data produksi); jalan tanpa mengubah data: daftar tolak di repo plus deploy, izin hanya untuk menghapus mp3 di R2 ([09](09-pecahan-produk.md)) | Sesuai: atribusi jujur, ustadz di lingkaran |
| 2 | Kepala halaman baru | Judul, satu baris label ("Dibuat AI, belum ditinjau manusia · Tentang") dengan model dan versi prompt di lipatan, daftar "Dalam bab ini", tombol Dengarkan | S | tidak | Sesuai dengan syarat: satu baris label tetap terlihat; menyentuh docs/05 §1 dan §12, keputusan pemilik |
| 3 | Urutan halaman | Gagasan, Uji pemahaman, Lanjut ke teks lengkap, lalu Dalil dilipat (chip status takhrij tetap tampil); label baca dan dengar dihitung dari isi; hapus duplikat halaman di Dasar teks | S | tidak | Sesuai |
| 4 | Pintu masuk dan jalan lanjut | Kartu Intisari di beranda dan karya, satu nama, kalimat beranda yang tidak berlawanan, hub dibuka tanpa menunggu Intisari Kitab, Berikutnya/Sebelumnya, perbaiki bilah ganda di 404 | S-M | tidak | Sesuai; kurasi diberi label tim, bukan arahan |
| 5 | Uji 5 pembaca | Awam, santri, mahasiswa; tugas "paham bab ini dalam 4 menit"; ukur waktu ke gagasan pertama, klik Dasar teks, selesai, ingatan 3 hari; bukan rating suka (Deslauriers 2019) | S | tidak | Sesuai; catatan manual tanpa pelacakan |
| 6 | Bagikan | Salin tautan dan sitasi ("kutip kitabnya"), OG per Intisari (S); kartu gambar bergaya kartu kutipan beranda (M) | S lalu M | tidak | Sesuai dengan syarat: atribusi, label AI, permalink, hanya gagasan lolos tinjau |
| 7 | Pisahkan label kode dan AI; aturan kutipan | Chip sikap diberi penanda AI; riwayat lemah dan perkara ghaib tidak jadi kutipan unggulan, soal ingatan, atau kartu bagikan; satu terjemahan kanonik per paragraf | S-M | tidak | Sesuai; memperketat docs/05 §12, perlu ADR |
| 8 | Prompt isi (berbayar) | Kalimat "Inti", judul tesis dengan pembatas ("sebagian", "hendaknya"), larang gagasan meta dan duplikat induk-anak, soal bervariasi dengan jawaban satu kalimat. Pilot dulu pada 19 Intisari Bab dengan `--budget` | M | ya (batch LLM) | Sesuai dengan syarat: atribusi terbaca di judul (§12). Opsi A: di anak kalimat. Opsi B: hanya chip (ubah §12 lewat ADR) |
| 9 | Dengar jadi pintu utama | Tombol di hero semua Intisari ber-audio, daftar gagasan berstempel waktu; 13 audio lagi setelah uji dengar buta | M | ya (audio berbayar) | Sesuai; narator netral, tanpa Arab, label teks (ADR-102) |
| 10 | Mode Kartu | Baca, Kartu, Dengar; satu gagasan per layar, progres tersegmen, Tandai selesai di perangkat | M | tidak | Sesuai; atribusi dan Dasar teks di tiap kartu |
| 11 | Uji ingatan jawab-dulu | Satu soal per layar, Ingat/Ragu/Lupa lokal, ulas berjarak (Fase 7). Dasar: mengetes diri g 0,50, dengan umpan balik 0,73 (Rowland 2014) | M | tidak | Sesuai; tanpa akun, streak, skor publik; soal bukan kebenaran fikih |
| 12 | Peta cakupan dan catatan peninjau | "Berdasar 8 dari ±20 paragraf", sorot rentang Dasar teks, Catatan peninjau ustadz untuk anjuran dan "Dibantah" | M | tidak | Sesuai; "ditinjau" hanya bila benar dilakukan |
| 13 | Gerbang X15c | Verifikasi Sonnet atas gagasan sensitif, validator judul, sampel ustadz terarah, regresi dua gagasan Salah | L | ya (batch) | Sesuai |

**Ditolak (tidak sesuai prinsip):** streak harian, lencana capaian atau penyelesaian, dan papan peringkat (risiko riya; lencana asal atau status tetap boleh; [Fase 7](../../../implementasi/FASE.md) hanya menjadwalkan target mingguan tanpa hukuman); paywall dan harga bertekanan; "aksi hari ini" atau janji manfaat atas nama Surau (§12); podcast dua host dan kloning suara; ringkasan tanpa jangkar; ide komunitas tanpa tinjau. Label suara yang diucapkan bertentangan dengan [ADR-102](../../../implementasi/KEPUTUSAN.md) (keputusan pemilik), jadi hanya bila pemilik meninjau ulang.

**Keputusan pemilik yang menunggu:** izin menarik dua gagasan dan audio (1); pemadatan label (2); opsi A atau B untuk judul (8); izin batch berbayar (8, 9, 13).

**Selisih terhadap [ADR-097](../../../implementasi/KEPUTUSAN.md).** Pembuka dan penutup hanya dirancang untuk Intisari Kitab, padahal yang tayang Bab, jadi audit ini menambah "Inti" di tingkat Bab. Judul "atributif" ternyata monoton. Target "3 poin per hari" Headway terkonfirmasi sebagai syarat streak di FAQ resmi (minimal 3 poin kunci sehari, tanpa syarat menit); layar Mobbin hanya menampilkan target menit dan misi harian ([02](02-headway.md)), jadi klaim ADR-097 tidak salah. Label audio yang dibacakan sudah diganti ADR-102. Usulan 6, 10, dan 11 hanya mempercepat butir Fase 7 yang sudah dicatat.

**Batas penilaian.** Penilaian agent, belum ada uji pengguna; hanya 19 Intisari Bab pilot, Intisari Kitab dan hub belum bisa dinilai; audio tidak didengar; kesetiaan isi belum diaudit ustadz; pembacaan kesetiaan hanya bab 100008 (bab lain belum terverifikasi). Nilai "menarik" baru terjawab oleh usulan 5.

## Sumber

Semua diakses 2026-10-27; keyakinan di akhir butir.

- https://surau.org/kitab/ihya/bab/100008/intisari, `/100017/`, `/100007/`, 19 halaman 100004-100023; `/`, `/kitab/ihya`, `/kitab/ihya/1/12`, `/cari?q=ilmu`, `/tanya`, `/kitab/ihya/intisari` (404): hitungan, tinggi layar, teks, tombol. Tinggi.
- MCP Surau `get_section_digest` 100008 dan 100017: gagasan, jangkar, audio. Tinggi.
- Repo: [KEPUTUSAN.md](../../../implementasi/KEPUTUSAN.md) ADR-097 sampai 099 dan 102; [X15](../../../implementasi/sesi/X15-intisari.md); [X16](../../../implementasi/sesi/X16-intisari-ui.md); [docs/05](../../05-kebijakan.md) §12; [laporan QA agent](../../../data/reports/ihya-9472-intisari-qa-agent-2026-10-25.md); [FASE.md](../../../implementasi/FASE.md) Fase 7. Tinggi.
- https://apps.apple.com/us/app/-/id568839295 ; https://support.blinkist.com/en/ : Blinkist, unit dan harga. Tinggi.
- https://makeheadway.com/faq/ ; https://makeheadway.com/blog/discover-the-headway-app-your-ultimate-reading-experience/ : Headway, unit dan ulas berjarak. Tinggi; blog sedang.
- https://apps.apple.com/us/app/deepstash-smarter-every-day/id1445023295 ; https://app.deepstash.com/about : Deepstash, kartu dan Stash. Tinggi.
- http://help.uptime.app/en/ ; http://help.uptime.app/en/articles/4799489-does-an-uptime-hack-replace-reading-a-book-listening-to-a-podcast-doing-a-course-or-watching-a-documentary : Uptime, Hack dan atribusi. Tinggi.
- Mobbin, pola layar: [pembuka Blinkist](https://mobbin.com/screens/ea3c48f7-2bb6-4fd2-aec0-01dc925042cf), [poin kunci Headway](https://mobbin.com/screens/2b1079d2-37be-4a4e-a045-22a0e25b9c77), [wawasan Headway](https://mobbin.com/screens/c4156c6c-c50c-4e52-904d-9eb79ad1ae9c), [kartu baca Deepstash](https://mobbin.com/screens/becd706c-f363-4588-a58a-819082661a5f), [alur onboarding Uptime](https://mobbin.com/flows/55190814-bdf4-46ec-954e-66aa1a4cabe2); salinan layar di Paper "Surau Research". Tinggi.
- https://doi.org/10.1037/a0037559 (Rowland 2014, tes diri) ; https://doi.org/10.1073/pnas.1821936116 (Deslauriers 2019, rasa paham tidak sama dengan belajar) ; https://arxiv.org/abs/2404.01261 (FABLES, ringkasan LLM atas 26 buku fiksi terbitan 2023-2024: ada klaim tidak setia dan butir penting yang terlewat; model 2024). Tinggi (angka Rowland: g 0,50 keseluruhan, 0,73 dengan umpan balik dan 0,39 tanpa, dibaca dari PDF makalahnya); relevansi ke teks Arab-Indonesia sedang.
