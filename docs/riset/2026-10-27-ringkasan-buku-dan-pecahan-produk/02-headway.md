# Headway: yang layak dicontoh Surau · 27 Oktober 2026

Riset ini menjawab satu pertanyaan: apa dari Headway, app microlearning dan ringkasan buku nonfiksi, yang pantas ditiru Surau untuk Intisari dan fitur belajar, dan apa yang sebaiknya dijauhi. Riset awal Headway sudah ada di [ADR-097](../../../implementasi/KEPUTUSAN.md); dokumen ini tidak mengulangnya, hanya menambah dan mengoreksinya (bagian "Selisih terhadap ADR-097"). Kode `[S#]` menunjuk daftar Sumber.

> **Tangkapan layar tidak ada di repo.** Layar Mobbin Headway tidak disalin (hak cipta pihak ketiga, repo open source); di sini hanya tautan `mobbin_url`. Salinannya ada di file Paper "Surau Research", halaman "02 · Headway". Tangkapan berusia sekitar Oktober 2024.

## Ringkasan temuan

1. Headway adalah app microlearning dan ringkasan buku (±15 menit, teks dan audio), terbit Januari 2019. Skala klaim sendiri tidak seragam: 40 sampai 60+ juta pelajar atau unduhan (sedang).
2. Kekuatannya dua: unit konten berkerangka tetap (poin kunci bernomor, ditutup satu wawasan satu kalimat) dan lapisan aksi dan kebiasaan (bagikan, Remember ke kartu ulas berjarak, tantangan berhari-hari).
3. Intisari Surau sudah unggul di keterlacakan (Dasar teks per gagasan, label sikap, label AI). Yang belum ada: daftar ringkas bernomor, kalimat inti yang bisa dibagikan, simpan dan ingat, jalur lanjut.
4. Sepuluh pola layak ditiru. Yang paling menjawab keraguan soal daya tarik Intisari: struktur (pola 1), kartu bagikan (2), penilaian dengan alasan (5), ulas berjarak (3).
5. Yang dijauhi: onboarding panjang yang mewajibkan akun, uji coba otomatis dengan diskon darurat, tekanan psikologis, klaim sosial tak terperiksa, pelacakan lintas app.
6. Keluhan terbesar pengguna Headway adalah tagihan, bukan konten (Trustpilot 3,9/5, 22% bintang 1). Surau tanpa paywall unggul di titik ini.
7. Dua catatan untuk ADR-097: "target 3 poin per hari" didukung FAQ resmi (syarat streak: minimal 3 poin kunci sehari), meski layar menampilkan target menit dan misi 3 tugas; dan "kutipan disorot" ternyata sorotan buatan pengguna (koreksi).
8. Headway tidak mendukung bahasa Indonesia. Fitur terbaru (AI Chat, Shorts) tidak tertangkap di Mobbin.

## 1. Profil singkat

| Butir | Temuan | Sumber · keyakinan |
|---|---|---|
| Pemilik | Headway Inc (nama sejak April 2025), pendiri dan CEO Anton Pavlovsky, berakar di Kyiv; penjual App Store GTHW App Limited, Limassol, Siprus | S1, S7, S11, S12 · sedang-tinggi |
| Skala | Klaim 60+ juta pelajar (beranda), 55+ juta unduhan (halaman fitur), 50+ juta pengguna (deskripsi App Store AS), ±40 juta unduhan (profil 2024). App Store AS 4,6/5 dari 117 ribu rating. Judul 1.500 sampai 2.500+ menurut sumber | S1, S2, S3, S7, S12 · sedang |
| Platform, bahasa | iOS, Android, web, Mac, watchOS, CarPlay, Android Auto. 11 bahasa, tanpa Indonesia | S2, S7, S8 · tinggi |

## 2. Sepuluh dimensi

| Dimensi | Temuan | Layar · keyakinan |
|---|---|---|
| Unit konten | Satu buku = satu ringkasan ±15 menit berkerangka tetap: blurb, kotak "yang akan dipelajari" (4 butir), 7 sampai 10 poin kunci bernomor berjudul kalimat tesis, penutup, rating. Tiap poin ditutup satu wawasan satu kalimat. Kartu judul menjanjikan ukuran isi (8 poin, 13 menit); pembaca berpaginasi "1 dari 10" | 04, 05, 07 · tinggi [S2, S3] |
| Penemuan | Empat tab (For you, Explore, Library, Profile). Beranda digerakkan tujuan (maks. 3, dipilih saat onboarding): streak, pertumbuhan pekan ini, sesi 10 kartu dalam 3 menit, tantangan, koleksi. Tombol melayang "Roll the dice" memberi ringkasan acak | 01, 02, 03 · sedang-tinggi |
| Baca, dengar | Dua mode (Read, Listen). Audio per poin kunci, mundur 5 dan maju 10 detik, kecepatan 0,5 sampai 2x, dua narator bernama (situs menyebut tim "aktor suara", tanpa menyatakan eksplisit bahwa suaranya manusia). Pembaca serif, tema terang atau gelap, daftar isi dua tab (poin, wawasan), offline | 06, 08, 09, 10 · tinggi; "aktor suara": klaim sendiri [S3], sedang |
| Lapisan belajar | Misi harian 3 tugas (dengan hitung mundur), streak dan lencana, tantangan berhari-hari (Mobbin: 5 hari; blog resmi menjanjikan hasil dalam 28 hari atau kurang), Spaced Repetition (Remember mengubah wawasan menjadi kartu ulas dengan jawaban Ya/Tidak), perbandingan dengan pengguna lain. Target harian yang terlihat adalah menit (default 10 sampai 15). FAQ: streak butuh minimal 3 poin kunci sehari. Blog resmi tidak mengutip studi | 11, 12, 13, 14, 20 · sedang-tinggi [S2, S5, S6] |
| Aksi pengguna | Sorot, Remember, bagikan kartu wawasan (blog resmi: ke Instagram Stories), unduh, undang teman, penilaian dengan chip alasan. Pustaka tiga tab (Summaries, Repetition, Highlights); sorotan dikelompokkan per judul. Tidak terlihat: catatan bebas, koleksi buatan pengguna, ekspor | 13, 15, 16, 17 · tinggi |
| Onboarding | 41 layar di Mobbin, 35 langkah menurut analis. Akun dibuat sebelum personalisasi: fokus, gender, usia, tujuan, perbandingan buku 8 sampai 10 jam vs ringkasan 15 menit, target menit, komitmen streak, layar "menyusun pengalaman", pakta komitmen, lalu paywall. Momen aha: buku yang diberi minat masuk Library | 18 sampai 23 · tinggi [S15, S16] |
| Monetisasi | Gratis: satu judul pilihan per hari. Uji coba 7 hari pada paket tahunan (sekali per akun toko), lalu perpanjangan otomatis; paywall lunak sesudah onboarding. Layar trial hampir berakhir memberi diskon 38%; upsell infografis sekali bayar setelah trial; Headway for Business; lifetime deal pihak ketiga. Nominal tidak baku antar jalur | 24, 25, 26 · tinggi [S2]; nominal rendah [S14] |
| AI | FAQ: ringkasan ditulis dan ditinjau tim manusia, tidak dibuat otomatis; machine learning disebut untuk rekomendasi. Dukungan Headway (Jun 2026) menyebut pendekatan "human-first" dengan AI membantu beberapa tahap. AI Chat: kebijakan 2 Sep 2026, penyedia OpenAI, Anthropic, Google, khusus 18+, berlabel bukan manusia. Layar AI di Mobbin: nol. Kontroversi AI: tidak ditemukan | tinggi [S2, S4]; dukungan: sedang [S13] |
| Operasi konten | Tim internal penulis, editor, aktor suara. Proses menurut FAQ: baca buku, draf, proofread, edit, tinjau manusia. Judul baru tiap pekan, biasanya 3 sampai 5 (FAQ); perpustakaan disebut berisi nonfiksi terlaris. Byline penulis tidak tampil. Lisensi atau kerja sama penerbit: tidak ditemukan | tinggi (klaim sendiri) [S2, S7] |
| Keluhan | Trustpilot 3,9/5 dari 6.677 ulasan (22% bintang 1): tagihan tak terduga, perpanjangan otomatis, refund ditolak, sulit membatalkan. Sampel 20 ulasan App Store AS (9 sampai 24 Okt 2026): 5 soal langganan, termasuk keempat bintang 1; 7 memuji konten. Kelemahan produk: ringkasan terlalu singkat (rendah-sedang), onboarding terlalu panjang | sedang [S9, S10, S15]; sampel kecil |

## 3. Layar kunci (Mobbin, iOS, 26 layar)

Dari sekitar 84 layar iOS Headway di hasil pencarian, 26 dipilih dan dilihat langsung. Alur lengkap: [Onboarding](https://mobbin.com/flows/a5187f3a-b2db-4bc7-a247-f882842ea146) · [Subscribing to premium](https://mobbin.com/flows/69e7e5d7-fc79-4263-afbb-a4a2f67acd5a).

| Kelompok | Layar | Yang diperhatikan |
|---|---|---|
| Penemuan | [01 beranda](https://mobbin.com/screens/8a17b957-b9fa-4480-b956-328db04b432a) · [02 sesi harian](https://mobbin.com/screens/f1437835-7cd8-42fd-b67b-c0983f62a2cf) · [03 tantangan dan koleksi](https://mobbin.com/screens/e6b2eb5b-40ce-42b8-8e2b-e47f4548671c) | Tiga angka sederhana; kartu geser 3 menit |
| Detail judul | [04 detail](https://mobbin.com/screens/3a17e556-460c-43b0-bf46-893f5d49e263) · [05 yang akan dipelajari, poin kunci](https://mobbin.com/screens/2b1079d2-37be-4a4e-a045-22a0e25b9c77) | Ukuran isi di muka; daftar isi berupa klaim |
| Pembaca | [06 sorotan](https://mobbin.com/screens/c9ed4328-30e8-4f02-8ea8-861147e91878) · [07 wawasan di akhir poin](https://mobbin.com/screens/c4156c6c-c50c-4e52-904d-9eb79ad1ae9c) · [08 tab Insights](https://mobbin.com/screens/25b1d171-30d1-48d6-b6f5-c6d48a358f07) | Satu kalimat untuk dibagikan dan diingat |
| Audio | [09 pemutar per poin](https://mobbin.com/screens/51027dee-1b7a-4c35-ba3a-8f5129a725a3) · [10 pilih narator](https://mobbin.com/screens/aa0d156e-d220-4361-9e7b-df5cb995ba8c) | Audio dipecah per gagasan |
| Belajar | [11 misi harian](https://mobbin.com/screens/e069ee13-99bd-49bd-8d19-4cf8efbf466b) · [12 tantangan 5 hari](https://mobbin.com/screens/5497a2cb-2781-495a-a9d6-29e8cc94fc98) · [13 pustaka Repetition](https://mobbin.com/screens/1699f458-c7e7-4bb8-bdd1-47519ce9e340) · [14 kartu ulas](https://mobbin.com/screens/7bbd734b-7689-4ee3-9872-b8be7b5e9de6) | Ulas cukup dua tombol |
| Aksi | [15 sorotan per judul](https://mobbin.com/screens/2c55d88e-df31-418e-a76a-ce3c38799698) · [16 kartu wawasan layar penuh](https://mobbin.com/screens/0dd4e9c8-60b6-4dea-b0f0-e57403fb90ff) · [17 penilaian dan chip alasan](https://mobbin.com/screens/b2bad121-9f37-492e-a341-1d4ac371f654) | Kartu layak bagikan; umpan balik dua langkah |
| Onboarding (ditiru) | [18 fokus](https://mobbin.com/screens/37e33edd-5177-42eb-9b19-c026955a6487) · [19 buku vs ringkasan](https://mobbin.com/screens/78e7ab49-5e7b-4279-8def-b06edc9f371f) · [20 target harian](https://mobbin.com/screens/59a4bcf2-5a25-4a92-82fe-62f4add5095c) · [21 minat](https://mobbin.com/screens/c413a6fd-c032-4a73-97a9-857ee9fef3f6) | Nilai jual dalam satu gambar |
| Onboarding (dihindari) | [22 menyusun pengalaman](https://mobbin.com/screens/ae22e7eb-8117-4720-a976-23fa3ae06dfc) · [23 pakta komitmen](https://mobbin.com/screens/95a8c5a4-ebec-49bc-af3d-0ec5208a25ee) | Penantian buatan, klaim 30 juta+ pengguna, ritual komitmen |
| Paywall | [24 panduan uji coba](https://mobbin.com/screens/c550c1aa-b7d4-4b06-b4f3-ef448c07419f) · [25 harga uji coba](https://mobbin.com/screens/b690785c-1638-4a6a-86a8-0220b27170e5) · [26 diskon trial berakhir](https://mobbin.com/screens/8f29fa3f-1c57-4ba5-9e02-0b47f5db478d) | 24 baik (jadwal transparan); 25 dan 26 dihindari |

## 4. Yang sebaiknya tidak ditiru

1. **Onboarding 35 sampai 41 layar yang mewajibkan akun dan data demografis sebelum memberi nilai, plus penantian buatan** (layar 22). Surau tanpa akun, data keagamaan dan demografis sensitif, dan penantian palsu tidak jujur.
2. **Uji coba otomatis menjadi langganan, diskon darurat, upsell setelah trial** (layar 25, 26). Sumber keluhan terbesar Headway dan bertabrakan dengan prinsip tanpa paywall atas konten; donasi sukarela cukup.
3. **Tekanan psikologis**: pakta komitmen tahan sidik jari (layar 23), streak berhitung mundur, perbandingan persentil. Menumbuhkan riya dan rasa bersalah, tidak sejalan dengan adab menuntut ilmu.
4. **Klaim sosial yang tak bisa diperiksa dan pelacakan lintas app** (label privasi App Store). Setiap klaim Surau punya alamat, dan Surau tidak melacak lintas app (analitik hanya Cloudflare Web Analytics tanpa cookie, [docs/05 §8](../../05-kebijakan.md)).
5. **Ringkasan tanpa byline atau alamat ke sumber, dan wawasan lepas konteks.** Surau wajib punya Dasar teks per gagasan dan atribusi pendapat penulis vs yang dinukil atau dibantah.
6. **AI Chat bergaya pelatih atau persona, dan maskot hiburan untuk topik serius.** Surau melarang roleplay ulama dan fatwa ([teks-arab.md](../../../.claude/rules/teks-arab.md) aturan 7); Maknaz ([ADR-071](../../../implementasi/KEPUTUSAN.md)) tetap bernada atribusi.

## 5. Cermin: Intisari Surau dan Headway

Halaman [Intisari bab 100008](https://surau.org/kitab/ihya/bab/100008/intisari) dibaca 2026-10-27 (tinggi): label Intisari AI dan Terjemahan AI, catatan model dan tanggal, enam gagasan berlabel "Pendapat al-Ghazali" dengan Dasar teks, istilah, "Uji pemahaman" berjawaban tersembunyi, tautan ke teks lengkap, tanpa audio.

| Aspek | Headway | Intisari Surau | Posisi |
|---|---|---|---|
| Keterlacakan | Tanpa byline dan alamat sumber | Dasar teks per gagasan, label sikap, label AI | Unggul |
| Struktur | Daftar bernomor, kotak yang akan dipelajari, paginasi | Enam kartu sekaligus, tanpa daftar ringkas | Tertinggal |
| Kalimat bagikan | Wawasan dan kartu bagikan | Belum ada | Tertinggal |
| Mengingat | Remember dan kartu ulas berjarak | Uji pemahaman statis, tidak tersimpan | Sebagian |
| Audio | Per poin kunci | Dengarkan (X17) ada di 6 dari 19 bab pilot, bab ini belum | Sebagian |
| Kebiasaan | Misi, streak, tantangan | Belum ([FASE.md](../../../implementasi/FASE.md) Fase 7) | Tertinggal |
| Umpan balik | Penilaian dengan chip | Belum ada | Celah |
| Bahasa | 11 bahasa, tanpa Indonesia | Indonesia | Unggul |

Jawaban untuk keraguan pemilik: isi dan keterlacakan Intisari sudah menjadi alasan untuk percaya, tetapi belum ada alasan untuk berbagi atau kembali besok. Itu soal lapisan aksi, bukan isi. Ini perbandingan fitur, bukan uji dengan pembaca nyata (belum terverifikasi).

**Selisih terhadap ADR-097.**
- "Target 3 poin per hari" **didukung** sumber resmi [S2, S18]: streak bertahan bila membaca atau mendengar minimal 3 poin kunci sehari. Yang terlihat di layar Mobbin adalah target menit per hari dan misi harian berisi 3 tugas, dan halaman pemasaran lain menyebut sesi 3 menit [S19]; aturan streak tidak seragam antar halaman (sedang). Jadi klaim ADR-097 tidak salah, hanya satu dari beberapa mekanik, dan bukan target yang tampil di layar.
- "Kutipan disorot" di Headway adalah sorotan buatan pengguna (layar 06, 15), bukan kutipan pilihan editor. Kutipan berjangkar Intisari Surau lebih kuat dan tidak perlu disamakan (sedang).
- Langkah "aksi" tidak terlihat sebagai langkah editorial; yang ada tombol bagikan, ingat, dan sorot. Penolakan ADR-097 atas "aksi hari ini" atas nama Surau tetap sejalan.
- Baru: Headway menjual klaim ditulis manusia sebagai alasan percaya. Surau tidak bisa mengklaim itu, tetapi bisa menjadikan alamat per gagasan, label AI, dan status tinjau sebagai alasan percaya.

## Dampak untuk Surau

Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Urutan saran: 1 dan 2 dulu (paling menjawab soal daya tarik), lalu 5, 3, 4, 6; 7 sampai 9 kecil dan bisa diselipkan; 10 terakhir.

| # | Pola Headway (layar) | Usulan konkret untuk Surau | Usaha | Prinsip yang diuji, syarat |
|---|---|---|---|---|
| 1 | Poin kunci bernomor, kotak yang akan dipelajari, "N dari M" (04, 05, 07) | Pada Intisari Bab dan Kitab: daftar ringkas bernomor di atas (judul gagasan + label sikap), kotak 3 sampai 4 butir yang dibangkitkan kode dari judul gagasan, pembaca "gagasan 2 dari 6" | M | Atribusi: judul tetap atributif (bukan imperatif); Dasar teks menempel di tiap gagasan. Label kotak netral ("Gagasan di bagian ini"), bukan "yang akan Anda pelajari": [docs/05 §12](../../05-kebijakan.md) melarang janji manfaat atas nama Surau |
| 2 | Wawasan satu kalimat dan kartu bagikan (07, 08, 16) | Satu inti gagasan atributif per gagasan (kalimat Indonesia berlabel AI, lolos validator yang sama) dan kartu bagikan bergambar (Open Graph per gagasan, enak lewat WhatsApp): kitab, jilid, halaman, permalink, label Intisari AI, tautan ke teks | M | Verbatim, bukan fatwa. Kutipan Arab di kartu hanya disalin kode dari DB; hanya gagasan berstatus tinjau disetujui. Risiko sedang: kartu lepas konteks |
| 3 | Remember ke kartu ulas berjarak (13, 14) | Ulas berjarak lokal tanpa akun: muka kartu = pertanyaan "siapa berpendapat apa" yang sudah ada, balik = gagasan + Dasar teks; jadwal 1, 3, 7, 21 hari | M | Privasi (simpan lokal). Kartu tidak boleh memuat teks tak berjangkar |
| 4 | Kartu geser 3 menit, tombol acak (01, 02, 03) | Gagasan hari ini tanpa login, dipilih deterministik oleh kode, plus tombol acak; RSS atau email opsional, tanpa notifikasi dorong | M | Atribusi. Gagasan lepas dari bab: wajib atributif, sudah ditinjau, berdasar teks. Email mengumpulkan data pribadi: [docs/05 §8](../../05-kebijakan.md) (tanpa akun) diperbarui lebih dulu; RSS tidak perlu |
| 5 | Penilaian dengan chip alasan (17) | Chip sesudah membaca (akurat dengan teks, Dasar teks jelas, mudah dipahami, perlu dikoreksi) masuk antrean QA anonim untuk ustadz; sinyal terarah untuk kapasitas review yang kecil | M | Ustadz tetap penentu; jangan menjadi voting kebenaran |
| 6 | Pustaka tiga tab, sorotan per judul (13, 15) | Pustaka lokal (Intisari dibaca, Ulasan, Kutipan); simpan kutipan menyimpan teks verbatim beralamat kitab, jilid, halaman; catatan pribadi (Headway tidak punya); ekspor Markdown atau CSV | M | Verbatim; privasi: agama adalah data sensitif, jangan kirim ke server |
| 7 | Perbandingan buku vs ringkasan (19) | Gambar nilai di beranda dan hub: Ihya 1.706 halaman, Intisari Kitab 10 sampai 15 menit, teks asli satu klik, dengan penegasan pintu ke teks, bukan pengganti kitab atau guru | S | Bukan pengganti guru ([docs/01](../../../docs/01-visi-dan-prinsip.md)); risiko sedang bila penegasan hilang |
| 8 | Personalisasi ringan (18, 20, 21) | Tiga pertanyaan opsional dan bisa dilewati (ingin belajar apa, kapan, menit per hari), hasilnya rak "Untuk Anda" lokal; tanpa usia, gender, atau akun | S | Privasi |
| 9 | Misi harian dan ringkasan mingguan (01, 11) | Target pekan ini (mis. 3 gagasan) dan ringkasan gagasan yang dibaca, lokal; tanpa hitung mundur, streak harian, perbandingan, papan peringkat | S | Adab menuntut ilmu (riya): hanya kemajuan pribadi |
| 10 | Jalur berhari-hari (12) | Jalur "Arba'in Ihya": pilot 7 hari memakai Intisari Bab pilot Kitab al-'Ilm, centang lokal, tiap hari berakhir di tautan ke teks lengkap; versi 40 hari mengikuti Fase 7 dan menunggu batch penuh X15c | L | Memilih bab adalah sikap editorial: butuh tinjau ustadz. Tanpa trofi kompetitif |

**Pelajaran untuk pemecahan produk (sedang).** Headway memakai ulang satu unit konten di banyak permukaan (teks, audio, kartu, infografis berbayar, Business) tanpa memecah merek. Padanan Surau: satu Intisari, banyak permukaan (halaman, audio, kartu bagikan, kartu ulas). Pemecahan merek dibahas di dokumen lain di folder ini. Usulan yang diterima dicatat sebagai ADR baru di [KEPUTUSAN](../../../implementasi/KEPUTUSAN.md); usulan 3, 6, 9, dan 10 bersinggungan dengan rencana Fase 7.

## Sumber

Semua diakses 2026-10-27.

| # | URL | Isi | Keyakinan |
|---|---|---|---|
| S1 | https://makeheadway.com | Klaim skala, badan hukum | tinggi (klaim sendiri) |
| S2 | https://makeheadway.com/faq/ | Judul, proses, gratis, uji coba, ML, bahasa, syarat streak, rilis mingguan (dibuka ulang saat pemeriksaan) | tinggi |
| S3 | https://makeheadway.com/headway-app-features/ | Fitur, narator, 55+ juta unduhan | tinggi (klaim sendiri) |
| S4 | https://makeheadway.com/headway-ai-usage-policy/ | Kebijakan AI, 2 Sep 2026 | tinggi |
| S5 | https://makeheadway.com/blog/discover-the-headway-app-your-ultimate-reading-experience/ | Spaced Repetition, tantangan (hasil "28 hari atau kurang"), bagikan ke Instagram Stories | sedang |
| S6 | https://makeheadway.com/blog/compare-microlearning-vs-spaced-repetition-tools/ | Kuis ulang tanpa studi | tinggi untuk "tanpa studi" |
| S7 | https://apps.apple.com/us/app/headway-daily-book-summaries/id1457185832 | Penjual, rating, IAP, privasi | tinggi |
| S8 | https://apps.apple.com/id/app/headway-daily-micro-learning/id1457185832 | Storefront Indonesia, bahasa | tinggi |
| S9 | https://itunes.apple.com/us/rss/customerreviews/id=1457185832/sortBy=mostRecent/json | 20 ulasan App Store AS terbaru | sedang (sampel kecil) |
| S10 | https://uk.trustpilot.com/review/makeheadway.com | 3,9 dari 6.677 ulasan | sedang |
| S11 | https://en.wikipedia.org/wiki/Headway_Inc | Pendiri, rebrand April 2025, peluncuran Januari 2019, kantor Limassol | sedang |
| S12 | https://kyivindependent.com/ukraine-based-book-summary-app-wants-to-change-how-you-read/ | Profil 2024: unduhan, tim | sedang |
| S13 | https://appsumo.com/products/headway/questions/model-used-to-create-the-summaries-1516256/ | Balasan dukungan 3 Jun 2026 soal AI | sedang |
| S14 | https://www.shortform.com/blog/hub/?p=4340 | Harga per jalur (kompetitor, 30 Sep 2026) | rendah |
| S15 | https://screensdesign.com/showcase/headway-daily-micro-learning | Analisis desain: 35 langkah, paywall lunak | sedang |
| S16 | https://mobbin.com/flows/a5187f3a-b2db-4bc7-a247-f882842ea146 · https://mobbin.com/flows/69e7e5d7-fc79-4263-afbb-a4a2f67acd5a | Alur Onboarding 41 layar, Subscribing 10 layar | tinggi |
| S17 | https://surau.org/kitab/ihya/bab/100008/intisari | Halaman Intisari Surau (cermin) | tinggi |
| S18 | https://makeheadway.com/blog/how-to-make-the-most-of-headway/ | Target harian dan streak = 3 poin kunci sehari (ditambah saat pemeriksaan fakta) | tinggi (klaim sendiri) |
| S19 | https://makeheadway.com/headway-for-habit-building/ | Streak dijaga sesi sependek 3 menit (ditambah saat pemeriksaan fakta) | tinggi (klaim sendiri) |

Konteks internal: ADR-097 dan ADR-071 di [KEPUTUSAN](../../../implementasi/KEPUTUSAN.md); [FASE](../../../implementasi/FASE.md) Fase 7; [teks-arab.md](../../../.claude/rules/teks-arab.md); [docs/01](../../../docs/01-visi-dan-prinsip.md).

## Batas riset

- Layar Mobbin berusia sekitar Oktober 2024; AI Chat, Shorts, dan infografis penuh hanya diketahui dari teks. Aplikasi berbayar tidak dicoba langsung.
- FAQ tidak menyebut AI Chat, sedangkan kebijakan AI mengaturnya. Dugaan: FAQ belum diperbarui (belum terverifikasi).
- Pendanaan (Series A 2025, perpanjangan 2026) hanya dari ringkasan pencarian, dan klaim 130 juta pengguna lintas lima produk hanya dari kutipan sekunder: tidak dipakai (belum terverifikasi). Pendapatan, pengguna aktif, dan studi efektivitas: tidak ditemukan.
- Ulasan Reddit dan halaman Google Play tidak bisa diakses; sampel App Store hanya 20 ulasan.
