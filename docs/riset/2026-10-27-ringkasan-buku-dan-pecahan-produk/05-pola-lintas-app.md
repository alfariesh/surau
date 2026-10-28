# Pola lintas app dan pembanding · 27 Oktober 2026

Dokumen ini menjawab tiga pertanyaan: apa yang sama dan beda pada Blinkist, Headway, Deepstash, dan Uptime; pola mana yang layak dicontoh Surau; dan app apa yang menjadi pembanding bagi empat calon wajah produk (Maknaz, Academy, Dengar, Perpustakaan; semuanya nama kerja, dan Academy menjadi Jalur menurut [09](09-pecahan-produk.md)). Analisis per app ada di [01](01-blinkist.md) sampai [04](04-uptime.md), audit Intisari di [08](08-audit-intisari.md), dan soal memecah merek di [09](09-pecahan-produk.md). Riset awal Headway dan Blinkist ada di [ADR-097](../../../implementasi/KEPUTUSAN.md) dan tidak diulang.

> **Tangkapan layar tidak disimpan di repo** (hak cipta pihak ketiga). Salinannya ada di file Paper "Surau Research" (halaman per app dan halaman pola pembanding); di sini hanya tautan Mobbin. Usia tangkapan berbeda: Blinkist dan Deepstash sekitar Maret 2026, Headway Oktober 2024, Uptime sekitar 2023 (sedang), jadi tampilan terbaru bisa lain.

## Ringkasan temuan

1. Keempat app memakai resep sama: unit pendek (5 sampai 15 menit, 5 sampai 10 gagasan), pembaca per gagasan dengan progres, lalu lapisan kebiasaan. Isi Intisari sudah tepercaya; yang belum ada adalah pembungkusnya.
2. Tak satu pun memecah merek menurut format. Blinkist dan Headway menaruh semua format dalam satu app, Uptime bergeser ke B2B, dan Deepstash satu dari lima app kecil di bawah payung Smartheads. Untuk Surau: mode dalam satu app dulu, sejalan dengan [09](09-pecahan-produk.md).
3. Keunggulan Surau yang tidak dimiliki satu pun: alamat tiap gagasan ke teks, pembedaan pendapat penulis dan nukilan, kutipan verbatim. Headway tidak menampilkan penulis ringkasan, dan lisensi penerbit tidak ditemukan pada Headway, Deepstash, maupun Uptime.
4. Cara mereka mencari uang adalah yang harus dihindari, dan itu juga sumber keluhan terbesar. Trustpilot bintang 1: Blinkist 29%, Headway 22%, Deepstash 13%. Uptime: 13 dari 21 ulasan buruk App Store menyangkut bayar (sampel 50 ulasan, kecil).
5. Di sisi konsumen tidak ditemukan tanya-jawab berbasis sumber; AI mereka ada di tepi (Extract, alat tulis, AI Chat). Yang mendekati hanya asisten B2B Uptime (klaim sendiri). Maknaz mengisi ruang kosong, tetapi studi menunjukkan sitasi saja bukan bukti.
6. Bukti belajar paling kuat ada pada uji dan ulas berjarak, bukan sorotan atau streak. Headway dan Uptime punya ulas. Catatan: tinjauan yang menilai sorotan rendah menguji pelajar yang menulis ringkasan sendiri, bukan pembaca ringkasan siap pakai.
7. Audio: teks menyala mengikuti suara, daftar gagasan berstempel waktu, timer tidur. Pengaruhnya pada pemahaman kecil, jadi dijual sebagai kemudahan akses.
8. Keraguan pemilik soal Intisari: [audit 08](08-audit-intisari.md) menjawab "sebagian, condong ke belum" (2,65 dari 5, penilaian agent). Halaman contoh bab 100008 dibuka ringkasan datar, memuat enam gagasan tanpa daftar ringkas, dan hanya punya satu jalan keluar. Keempat app mengerjakan ketiganya rapi. Temuan mutu (dua gagasan dinilai Salah masih tayang) lebih mendesak; lihat 08 dan 09.

## 1. Matriks 4 app x 10 dimensi

Dasarnya 104 layar Mobbin (26 per app) ditambah halaman resmi, App Store, dan ulasan.

| Dimensi | Blinkist | Headway | Deepstash | Uptime |
|---|---|---|---|---|
| Unit konten | Blink ±15 menit: pembuka manfaat, 5-10 gagasan, penutup; Shorts ±1 menit | ±15 menit: kotak "You'll learn", 7-10 poin kunci, satu wawasan satu kalimat per poin | "Ide" satu kartu 1-2 menit, selalu bersumber; Journey editorial 13-32 ide | Hack ±5 menit: inti, 2-4 insight, tindak lanjut, penutup |
| Penemuan | Tujuan mingguan, rekomendasi beralasan, topik diikuti | Beranda berbasis tujuan, sesi 3 menit, tombol acak, rating beralasan | ±50 topik, cari bertab, ikuti kurator, pindai buku fisik | "For you", Pilihan Redaksi mingguan, koleksi musiman |
| Baca dan dengar | Satu layar dua mode, dock audio, timer tidur, bab berstempel waktu, offline | Read/Listen, audio per poin, narator bisa dipilih, offline | Kartu per layar berprogres segmen; audio dan offline hanya Pro | Read/Watch (kartu story)/Listen, mini-player, offline Premium |
| Lapisan belajar | Target mingguan, cincin progres, kuis mikro di Shorts | Misi harian, streak, tantangan 5-28 hari, ulas berjarak ("Remember") | Streak dengan freeze otomatis, kuis mikro; ulas berjarak tidak ditemukan | Spark Repetition (Tidak/Ragu/Ya), streak; kuis hanya B2B |
| Aksi pengguna | Sorotan jadi daftar kutipan, Spaces bersama, kirim ke Kindle | Sorot, Remember, bagikan kartu; pustaka tiga tab; tanpa catatan bebas | Stash (koleksi), kartu bagikan, buat ide, ekspor pustaka | Simpan kartu ke papan; bagikan gambar, video, tautan, embed |
| Onboarding | 4 langkah; pustaka sudah terisi sebelum bayar | 35-41 layar, akun dulu, pakta komitmen | ±24 langkah, geser rekomendasi, lalu login dan paywall | Pilih 3 topik; paling ringan |
| Monetisasi | Basic 1 judul/hari; Premium ±$99,99/tahun; Pro dengan AI; batal ditawari diskon 40% | 1 judul/hari gratis; trial 7 hari; harga beda per jalur | Gratis berisi iklan; Pro; paket web lebih murah | 1 Hack/hari gratis; "75% off today"; B2B per kursi |
| AI | Extract (tautan atau PDF) berlencana lain; narasi AI dihentikan Juni 2026 | AI Chat pihak ketiga; ringkasan diklaim "human-first" | AI hanya untuk penulis (parafrase, gambar) | Konsumen: mesin plus tinjau manusia; asisten B2B mengutip sumber (klaim sendiri) |
| Operasi konten | Editor, pakar, penulis, tinjau akurasi; bagi hasil penerbit; 4 bahasa | Tim sendiri, 11 bahasa; penulis dan lisensi tidak tampil | Komunitas kurator plus editorial; QA dan lisensi tidak ditemukan | Tim plus kreator (Up Hack tanpa tinjau awal); lisensi tidak ditemukan |
| Keluhan | Tagihan, isi kehilangan bukti, audio datar | Tagihan, refund ditolak, onboarding panjang | Perpanjangan mengejutkan, isi dangkal | Bayar (13 dari 21 ulasan buruk), ringkasan tipis |

Tidak satu pun mendukung bahasa Indonesia (tinggi). Rujukan layar: [Blinkist 08](https://mobbin.com/screens/ea3c48f7-2bb6-4fd2-aec0-01dc925042cf), [Headway 05](https://mobbin.com/screens/2b1079d2-37be-4a4e-a045-22a0e25b9c77), [Deepstash 10](https://mobbin.com/screens/becd706c-f363-4588-a58a-819082661a5f), [Uptime onboarding](https://mobbin.com/flows/55190814-bdf4-46ec-954e-66aa1a4cabe2).

**Selisih terhadap ADR-097.** (a) ADR menulis target Headway "3 poin per hari": didukung FAQ dan blog resmi sebagai syarat streak (minimal 3 poin kunci sehari), meski layar Mobbin hanya menampilkan target menit per hari (bawaan 10-15) dan misi harian 3 tugas; jadi klaim itu tidak salah, hanya satu dari beberapa mekanik ([02](02-headway.md)). (b) Bagian tindak lanjut tidak tampak di layar Headway; yang memilikinya Uptime. (c) Narasi AI Blinkist: tanggal 3 Juni 2026 cocok (sedang), tetapi alasan "keluhan pendengar" hanya muncul di situs pihak ketiga dan tidak di tulisan Blinkist yang terbaca lewat hasil pencarian; halaman Blinkist menolak akses (403), jadi alasan resminya belum terverifikasi. Menurut hasil pencarian itu, eksperimen berjalan ±2 tahun pada sebagian rilis baru. (d) Baru: Deepstash dan Uptime, ulas berjarak sungguhan (Headway, Uptime), dan keluhan terukur.

## 2. Pembanding per produk target

Pembanding diambil dari 96 layar Mobbin lintas app (Perplexity, Duolingo, Audible, Matter, dan lain-lain) dan, untuk app yang tidak ada di Mobbin (Sefaria, Kindle, Readwise, Quran.com), dari dokumentasi atau sumber sekunder. Perilaku interaktif tidak terlihat di layar statis dan tidak diklaim. "Academy" dan "Perpustakaan" nama kerja; [09](09-pecahan-produk.md) mengusulkan "Jalur".

### 2.1 Maknaz (tanya-jawab bersumber)

| Pola | Pembanding | Catatan untuk Surau |
|---|---|---|
| Sitasi bernomor per kalimat dan kartu sumber | Perplexity, NotebookLM, ChatGPT | Sitasi bukan bukti: rata-rata 51,5% kalimat didukung penuh sitasinya (Liu dkk., EMNLP 2023), dan sitasi acak pun menaikkan kepercayaan pengguna (Ding dkk., AAAI 2025). Surau sudah punya penanda berjangkar ([ADR-064](../../../implementasi/KEPUTUSAN.md)); tambah hasil pemeriksaan kode yang terlihat. |
| Pratinjau sumber di lembar bawah | Liven, Perplexity | Kitab, jilid, halaman, dan Arab 2-3 baris disalin kode, tanpa meninggalkan jawaban. |
| Tanya dari teks terpilih; cakupan sumber | Matter, NotebookLM, Kindle (sekunder) | Konteks sempit menekan biaya token. |
| Penolakan yang berguna | WHOOP, Elicit (baik); Vrbo (jalan buntu) | Mesin pencari AI jarang menolak (Tow Center, 2025). Penolakan tepat Surau 7/8 sampai 8/8 pada eval berbayar ([STATUS](../../../implementasi/STATUS.md)) layak jadi kekuatan, asal diberi tiga jalan lanjut. |
| Label kepercayaan kategoris | Sefaria (bintang berongga atau penuh) | Ganti skor dengan fakta terperiksa: kutipan cocok, status takhrij, terjemahan AI ditinjau atau belum. |

Hindari: persona tokoh (Nibble; imam AI Catholic Answers 2024 diubah sekitar dua hari, sedang), sitasi dekoratif, promosi di dekat sumber.

### 2.2 Academy (jalur belajar)

| Pola | Pembanding | Catatan untuk Surau |
|---|---|---|
| Jalur berurutan tanpa gerbang | Imprint, Duolingo, Brilliant, Deepstash Journey | Simpul = Intisari Bab; uji pertama 19 Intisari pilot Kitab al-'Ilm. Imprint mengunci unit: jangan ditiru. |
| Jadwal bersama yang bergeser | Sefaria, Quran.com | Arba'in Ihya 40 hari. Ada permintaan nyata: siaran Ngaji Ihya sejak 2016, sesi langsung sekitar 300 penonton dan rekaman Facebook sering lebih dari 7.000 ([ISEAS](https://www.iseas.edu.sg/articles-commentaries/iseas-perspective/2022-91-from-liberalism-to-sufism-ulil-abshar-abdalla-gains-renewed-relevance-online-through-ngaji-ihya-by-wahyudi-akmaliah-and-norshahril-saat/)). |
| Ulas berjarak; uji satu pertanyaan per layar | Headway, Uptime, Brilliant, Babbel | Uji mengalahkan membaca ulang (Roediger dan Karpicke, 2006). Penjadwal terbuka ts-fsrs (MIT), data lokal. |
| Target hari per pekan; konsistensi pemaaf | Mimo, Duolingo, Insight Timer | Satu hari terlewat berdampak kecil pada kebiasaan, tetapi terlalu banyak hari terlewat tetap menurunkan hasil akhir (Lally dkk.; sedang). |

Hindari: permata, hitung mundur, liga, bab Premium, skor yang turun saat salah.

### 2.3 Dengar (audio)

| Pola | Pembanding | Catatan untuk Surau |
|---|---|---|
| Teks menyala mengikuti suara | ElevenReader, Speechify, Apple Podcasts | Pengaruh pada pemahaman kecil (g = 0,18; 0,06 bila pembaca mengatur sendiri; Clinton-Lisell, 2023). Jangan klaim "belajar lebih cepat". |
| Gagasan sebagai bab berstempel waktu | Blinkist, Audible, Queue | Tambahkan "Dasar teks" per gagasan, yang tidak dimiliki app mana pun. |
| Timer tidur "akhir gagasan"; pemutar penuh | Spotify, Audible, Pocket Casts | Murah dan sudah lazim. |
| Label suara AI konsisten | Spotify, Audible, Brink | Surau sudah punya label teks ([ADR-102](../../../implementasi/KEPUTUSAN.md)). Apakah Pasal 50 AI Act UE mengikat Surau: belum terverifikasi. |
| Unduh offline | Audible | Besar: butuh perubahan CORS media ([ADR-100](../../../implementasi/KEPUTUSAN.md) butir 12). |

Hindari: percakapan dua host AI (ditolak di ADR-097), suara tokoh atau kloning, Arab sintetis, kuota.

### 2.4 Perpustakaan (simpan, sorot, bagikan)

| Pola | Pembanding | Catatan untuk Surau |
|---|---|---|
| Sorot dari seleksi dengan label bermakna | Fable, Medium, Matter | Simpan sebagai ID paragraf plus offset; tiga label netral (Faedah, Hafalkan, Tanyakan). |
| Perpustakaan satu pintu bertab berhitungan | Headway, Medium, Matter | Tanpa akun berarti IndexedDB; Safari menghapus data situs yang 7 hari tak disentuh (sedang; app layar utama dikecualikan), jadi sediakan ekspor. |
| Kartu kutipan bergambar | Fable, Headway, Uptime | Teknis belum terbukti: font Arab dan harakat di `next/og` (batas bundel 500 KB) perlu diuji. |
| Ekspor yang membawa sitasi | Matter, Readwise | Pocket ditutup 8 Juli 2025 dengan ekspor CSV yang intinya daftar tautan (judul dan tag tidak selalu lengkap; sumber berbeda pendapat soal sorotan; sedang, belum dicek ke sumber primer Mozilla): contoh yang dihindari. |

Hindari: sorotan sosial, paywall atau kuota di alur simpan.

## 3. Peringkat 12 pola paling layak dicontoh

Urutan: dampak tinggi dengan usaha rendah lebih dulu. Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Semua dampak di sini penilaian agent, belum diuji pada pengguna.

| # | Pola | Dari | Untuk Surau | Usaha | Dampak |
|---|---|---|---|---|---|
| 1 | Lencana asal dan status tinjau seragam | Blinkist (Blink hijau, Extract ungu) | Satu komponen untuk "teks kitab", "Intisari AI", "ditinjau"; tidak pernah "terverifikasi" | S | tinggi |
| 2 | Pembuka manfaat dan inti satu kalimat | Blinkist 08, Uptime | Atas Intisari: apa yang dibahas bab ini, dari gagasan berjangkar. Bila ditulis ulang model, batch berbayar dan izin pemilik (08) | S | tinggi |
| 3 | Penolakan yang berguna | Elicit, WHOOP | Sebab spesifik plus Cari, bab terdekat, catat pertanyaan | S | tinggi |
| 4 | Laporan kekeliruan bertag | Blinkist 25, Headway 17, Uptime | "Setia pada teks?" ke antrean ustadz per gagasan; perlu triase karena kapasitas kecil | S | tinggi |
| 5 | Sitasi dengan pemeriksaan terlihat | Perplexity | Penanda hanya tampil bila kutipan cocok; mengubah pipeline Jawab berarti eval berbayar | S | tinggi |
| 6 | Teks menyala dan penanda "Arab dilewati" | ElevenReader, Brink | Menyempurnakan sorotan kalimat yang sudah ada (X18) | S | tinggi |
| 7 | Pembaca per gagasan, progres tersegmen, "Tandai selesai" | Keempat app, [Deepstash 10](https://mobbin.com/screens/becd706c-f363-4588-a58a-819082661a5f) | Disimpan lokal, lalu usul bab berikutnya dan "Baca teks lengkap" | M | tinggi |
| 8 | Kartu kutipan bergambar | [Headway 16](https://mobbin.com/screens/0dd4e9c8-60b6-4dea-b0f0-e57403fb90ff), Uptime 22 | Arab dari DB, sitasi, permalink, label AI | M | tinggi |
| 9 | Simpan dan sorot sebagai ID plus offset; ekspor bersitasi | Headway 15, Matter | Halaman "Kutipan saya"; ekspor Markdown, JSON, CSV | M | tinggi |
| 10 | Daftar gagasan berstempel waktu dan "lanjut baca di paragraf sumber" | [Blinkist 07](https://mobbin.com/screens/107b7229-a8b1-403c-82b3-ccef640be56d), Audible | Audio sebagai pintu ke kitab; tombol "Buka teks sumber" menonjol | M | tinggi |
| 11 | Tanya dari teks terpilih dan cakupan sumber | Matter, NotebookLM | Maknaz menjawab dari paragraf itu dulu | M | tinggi |
| 12 | Jalur berurutan tanpa gerbang | Deepstash 06, Headway 12 | Mulai 7 hari dari 19 Intisari pilot | M | tinggi |

Di luar 12: ulas berjarak (L, tinggi, menunggu jalur), target pekan lembut (S-M, sedang; sumber tak sepakat soal usaha dan dampak), onboarding tanpa akun (M, sedang), "Daftar bacaan halaqah" ala Spaces (L, sedang). Sudah sebagian ada: nomor 6 dan label suara AI.

## Dampak untuk Surau

Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi.

| Usulan | Usaha | Prinsip yang diuji |
|---|---|---|
| Paket "Intisari lebih menarik" dari nomor 1, 2, 4, 7: pembuka, lencana, daftar ringkas gagasan, pembaca kartu, tautan sebelumnya dan berikutnya. Dikerjakan sesudah dua gagasan Salah ditutup (08, 09) | S lalu M | Alamat tiap klaim; bukan pengganti guru ("Baca teks lengkap" tetap utama) |
| Ukur dulu: ajak lima orang awam membuka satu Intisari dan tanya apa isinya setelah 5 detik. Tanpa pelacakan | S | Privasi: data sesedikit mungkin ([docs/05 §8](../../05-kebijakan.md)) |
| Satu merek, beberapa mode (Maknaz tanya, Intisari baca-dengar, jalur belajar, Perpustakaan pribadi); pecah hanya bila ada bukti pemakaian dan kapasitas ustadz | S | Kapasitas peninjau kecil; anggaran AI terbatas |
| ADR "kebijakan desain belajar": dilarang papan peringkat, streak harian, lencana capaian, mata uang virtual, hitung mundur, notifikasi bersalah, gerbang berbayar, klaim angka tanpa bukti | S | Nirlaba tanpa paywall; adab menuntut ilmu |
| Maknaz: bila nomor 3, 5, 11 menyentuh kode atau prompt Jawab, gabungkan dalam satu eval berbayar (±US$0,12 menurut run x10, izin pemilik) | M | Anggaran; bahasa atribusi |
| Perpustakaan lokal "Kutipan saya" (nomor 9) lalu kartu kutipan (nomor 8) | M | Verbatim (ID dan offset, bukan teks bebas); data keagamaan tetap di perangkat |

Jalur dan ulas (nomor 12 dan di luar daftar) menunggu Intisari penuh (X15c, berbayar, izin pemilik).

## Sumber

Semua diakses 2026-10-27. Keyakinan dalam kurung.

- Blinkist: [App Store](https://apps.apple.com/us/app/-/id568839295) (tinggi); [harga](https://www.blinkist.com/en/pricing) (sedang); [kebijakan AI](https://www.blinkist.com/en/ai-policy) (tinggi); [Trustpilot](https://www.trustpilot.com/review/blinkist.com) (tinggi); [pembelian kembali 2026](https://www.mainsights.io/ma-news/germany-based-founders-holger-seim-and-tobias-balling-reacquire-media-startup-blinkist-from-go1) (sedang); [akhir narasi AI](https://www.blinkist.com/magazine/posts/the-app-that-just-brought-back-100-human-narration) (sedang; halaman 403, tanggal dari hasil pencarian).
- Headway: [App Store](https://apps.apple.com/us/app/headway-daily-book-summaries/id1457185832) (tinggi); [FAQ](https://makeheadway.com/faq/) (tinggi); [Trustpilot](https://uk.trustpilot.com/review/makeheadway.com) (tinggi); [rincian harga, Shortform](https://www.shortform.com/blog/hub/?p=4340) (sedang).
- Deepstash: [App Store](https://apps.apple.com/us/app/deepstash-smarter-every-day/id1445023295) (tinggi); [Trustpilot](https://uk.trustpilot.com/review/deepstash.com) (tinggi); [profil Smartheads](https://www.smartheads.app/) (sedang).
- Uptime: [App Store](https://apps.apple.com/us/app/uptime-get-smarter-stand-out/id1505323328) (tinggi); [pusat bantuan](http://help.uptime.app/en/) (tinggi); [akuisisi Econsultancy](https://www.investegate.co.uk/announcement/rns/centaur-media--cau/tender-offer-update-and-sale-of-econsultancy/9334935) (tinggi); ulasan App Store, sampel 50 (rendah).
- Mobbin: tautan di Bab 1 dan 3 (tinggi untuk apa yang terlihat); layar pembanding Bab 2 tercatat di Paper.
- Studi: [Liu dkk. 2023](https://arxiv.org/abs/2304.09848) (tinggi); [Ding dkk., AAAI 2025](https://ojs.aaai.org/index.php/AAAI/article/view/34550) (tinggi); [Tow Center](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php) (tinggi); [Clinton-Lisell 2023](https://eric.ed.gov/?id=EJ1403866) (tinggi); [Roediger dan Karpicke 2006](https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf) (tinggi); [Dunlosky dkk. 2013](https://doi.org/10.1177/1529100612453266) (tinggi, peringkat via sekunder); [Lally dkk.](https://bps.org.uk/research-digest/how-form-habit) (sedang; klaim "satu hari terlewat" cocok dengan ringkasan BPS Research Digest, 96 mahasiswa dan 84 hari, tetapi belum dicek pada artikel aslinya).
- Lain-lain: [imam AI, Decrypt](https://decrypt.co/228360/ai-priest-catholic-answers-father-justin) (sedang); [Pasal 50 AI Act](https://artificialintelligenceact.eu/article/50/) (tinggi untuk teksnya, keberlakuan bagi Surau belum terverifikasi); [aturan 7 hari Safari, WebKit 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) (sedang, belum dicek untuk 2026); [batas bundel `next/og`](https://nextjs.org/docs/app/api-reference/functions/image-response) (tinggi).
- Audit Intisari produksi, [halaman contoh](https://surau.org/kitab/ihya/bab/100008/intisari): dilihat langsung (tinggi); penilaian dan skor adalah penilaian agent.
