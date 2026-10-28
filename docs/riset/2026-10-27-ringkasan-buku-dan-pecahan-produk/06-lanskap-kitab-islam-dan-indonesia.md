# Lanskap produk kitab Islam dan pasar Indonesia · 27 Oktober 2026

Dokumen ini menjawab tiga pertanyaan: produk apa yang sudah ada untuk kitab Islam digital dan di mana celahnya, bagaimana lembaga dan ulama menyikapi AI, serta siapa yang akan memakai Surau di Indonesia, lewat kanal, nada, dan harga seperti apa. Ini riset dan rekomendasi saja; empat app ringkasan buku dibahas di dokumen lain pada folder ini. Tangkapan layar tidak dimuat (hak cipta pihak ketiga); salinannya ada di file Paper "Surau Research".

> **Bukan nasihat hukum.** Bagian regulasi adalah pembacaan teks publik. Angka audiens, pengguna, dan harga umumnya klaim pihak yang diteliti. Keyakinan: T = tinggi, S = sedang, R = rendah. Klaim berkeyakinan rendah ditandai "(belum terverifikasi)".

## Ringkasan temuan

1. **Cakupan kitab Arab sudah diisi pemain resmi.** Shamela punya tanya-jawab AI bersumber dan MCP publik hanya-baca (syarat diperbarui 19 Sep 2026); Usul.ai menjual paket AI berbasis token. Surau tidak bersaing di lebar cakupan ([ADR-022](../../../implementasi/KEPUTUSAN.md) tetap berlaku).
2. **Celah terbesar: ringkas, dengar, dan belajar untuk kitab klasik berbahasa Indonesia yang berjangkar ke halaman sumber.** Dari sekitar 19 produk global dan 18 pemain Indonesia dalam catatan kerja (hitungan kasar, tidak diaudit ulang), tidak ada yang menggabungkan ketiganya. Keyakinan rendah sampai sedang karena pencarian Indonesia terbatas.
3. **Sikap lembaga searah:** AI boleh sebagai alat bantu, bukan mufti atau pedoman amal (Dar al-Ifta Mesir, Munas NU, MUI). Bahasa atribusi Surau sudah sejalan. Hasil pedoman MUI belum ditemukan.
4. **Pola aman yang layak ditiru:** "AI hanya mengembalikan yang sudah disetujui" (Fatwa Chat Islamweb), audio AI berlabel dengan tautan umum ke makalah tertulis (Yaqeen), aturan-untuk-agen (Sunnah.com). Chatbot agama gagal berulang karena tanpa grounding dan berpersona otoritas.
5. **Retrieval yang benar belum cukup.** Menurut JaleesBench (laporan penulis sendiri), satu instruksi "keteguhan" menaikkan skor satu asisten Islam (skenario setelah tekanan, iman tak disebut) dari +0,48 ke +0,84. Maknaz perlu uji di bawah desakan.
6. **Permintaan Ihya online nyata tetapi berskala ribuan,** dengan daya tarik komunal-ritual (jadwal, komunitas, berkah), bukan efisiensi. Pasar ringkasan buku berbayar berbahasa Indonesia tampak kecil (dasar tipis: satu angka instalasi NexPage dari 2023).
7. **Kanal terbesar: WhatsApp, YouTube, Spotify, bukan app baru.** Pendanaan nirlaba tipis; jalur dana Indonesia (wakaf uang, zakat, hibah) mensyaratkan badan hukum.
8. **Dua hal butuh langkah pemilik di luar riset ini:** pertanyaan tertulis ke LPMQ soal PMA 44/2016, dan kepastian status badan hukum.

## 1. Peta kategori produk dan celah

| Kategori | Sudah ada | Celah untuk kitab klasik berbahasa Indonesia |
|---|---|---|
| Baca dan cari | Shamela, Turath, Usul, Noorlib, Altafsir | Arab sudah penuh. Antarmuka Indonesia dengan takhrij tertaut dan permalink halaman cetak tidak ditemukan |
| Tanya-jawab AI | Shamela AI, Usul, Ansari, Fanar-Sadiq; Fatwa Chat Islamweb (ada bahasa Indonesia, hanya fatwa); AI Mu'awin (rencana MUI Jawa Timur bersama Universitas Brawijaya, pembahasan 18 Sep 2026; berbasis fatwa MUI, jadi pesaing berbasis fatwa dan calon mitra verifikasi; nama "MUI GPT" hanya dari hasil pencarian, belum terverifikasi) | Jawaban Indonesia yang tertaut ke halaman cetak kitab tidak ditemukan |
| Ringkas | Usul (penjelasan makna dan ayat); NexPage (nonfiksi; artikel Jan 2023 menyebut total 7.000 instalasi seluler di seluruh dunia: sinyal kecil, bukan ukuran pasar; judul dan isi artikel menulis NexPage, sedangkan slug URL dan keterangan gambarnya menulis NexSpace) | Ringkasan bab kitab klasik berjangkar paragraf tidak ditemukan |
| Dengar | Yaqeen (makalah modern); rekaman kajian (Ngaji Ihya, Gus Baha) | Rekaman kajian adalah ceramah tokoh. Audio ringkasan bab yang tertaut ke teks tidak ditemukan |
| Belajar | Quran.com (Learning Plans), Bayyinah, Nuqayah; Rumah Kitab, Rumaysho Academy | Ulas berjarak untuk kitab klasik tidak terlihat |
| Data dan API | Shamela MCP, Sunnah.com, Usul, Ansari, islamic.app | Sudah jadi norma. Pembeda Surau: bahasa, permalink stabil, `verify_quote` |

**Tabel 1. Lanskap global**

| Produk | Yang relevan | Model/biaya | Pelajaran untuk Surau | K |
|---|---|---|---|---|
| **Shamela** | Sekitar 7 juta halaman. AI: jawaban bernomor sumber, login Google/Apple. MCP: cari, buka halaman sumber, daftar isi, cek kutipan mekanis; pratinjau bukan rujukan sebelum halaman dibuka | Gratis, donasi; AI ada biaya per pertanyaan | Pesaing cakupan Arab. Tiru prinsip pratinjau-bukan-rujukan | T |
| **Usul.ai** | 15.000+ teks (angka antar-halaman tidak konsisten), AI Chat (sitasi belum terkonfirmasi), UI Inggris, Indonesia belum terlihat | Nirlaba (501(c)(3) pending). Free, 5, 25, 100 USD per bulan (token terbatas; 1/5/20 juta); API dan penggunaan komersial tercantum (pemetaan per paket tidak jelas) | Ancaman bila menambah bahasa Indonesia. Contoh penjatahan AI tanpa paywall atas teks | T |
| **Ansari** | Empat alat retrieval, system prompt terbuka, MCP dan Agent Skill; 140.000+ percakapan | Gratis, MIT; pendanaan tidak ditemukan | Pembanding eval. Halusinasi 21,4% (satu tabel) vs nol (34 pertanyaan): semua laporan diri | S |
| **Sunnah.com** | `llms.txt`: bukan fatwa, sitasi dengan nomor rujukan, sebut penilai derajat, larang scraping massal | API gratis berkunci | Contoh aturan-untuk-agen | T |
| **Quran.com / Quran Foundation** | Learning Plans (44.000+ pendaftaran pada Mar 2024-Mar 2025; 100.000+ sejak rilis fitur), QuranReflect; Content Sync satu-satunya jalur salinan offline; dokumentasi API meminta terjemah otomatis peramban dimatikan karena menerjemahkan ulang terjemahan terverifikasi bisa merusak makna | Wakaf/donasi, tanpa iklan | Bukti permintaan fitur belajar; aturan integritas terjemahan | T |
| **Islamweb Fatwa Chat** | Mencari di arsip fatwa terverifikasi, kasus baru dirujuk ke manusia; 179.000+ percakapan | Dikelola Kementerian Awqaf Qatar (pendanaan tidak dinyatakan) | Model "hanya mengembalikan yang disetujui". Jumlah fatwa tidak konsisten (244.245 vs 400.000+) | S |
| **Yaqeen** | 35 episode audio AI; menyatakan buatan AI dan lafal bisa berbeda; satu tautan umum ke makalah tertulis (bukan per episode) | Tidak ditemukan | Pola label untuk Dengar | T |
| **Muslim Pro** | Chatbot AiDeen (belum terverifikasi); data lokasi dijual lewat broker pada 2020 | Iklan + Premium | Privasi tegas sebagai pembeda | T |

Pelajaran kecil dari yang lain: Tarteel (berlangganan; program Alim: donor menyponsori Premium bagi pelajar tak mampu yang membaca minimal 2 jam per bulan), Fanar-Sadiq (zakat dan waris dihitung kode, bukan LLM), Nuqayah (kurikulum bersyarah; target donasi 2.000 USD/bulan, dukungan sekitar 754 USD saat dilihat), Turath (mode sembunyikan teks untuk hafalan), Bayyinah TV (kursus 11 USD/bulan, beasiswa setahun), Altafsir (tampilan lintas mazhab), Noorlib (ekspor BibTeX/Zotero), islamic.app (API terbuka berbatas laju). Dorar.net (diblokir) dan IslamQA belum cukup diperiksa; jangan dianggap "tanpa AI".

## 2. Sikap lembaga dan ulama tentang AI

| Lembaga | Sikap (ringkasan riset ini) | Tanggal | K |
|---|---|---|---|
| Dar al-Ifta Mesir | Bersandar pada aplikasi AI untuk fatwa tidak diperbolehkan; memakai AI pada prinsipnya boleh, tergantung tujuan. Alasan: alat itu tidak punya ketelitian ilmiah, metodologi yang sahih, dan pertimbangan konteks | 2 Des 2025 | T |
| Munas NU | Bertanya ke AI boleh; menjadikan jawabannya pedoman amal haram | 19 Sep 2023 | T |
| MUI (KH Cholil Nafis) | AI bukan mujtahid atau mufti; tetap berguna sebagai alat bantu | Agu 2025 | T |
| MUI | AI pendamping, bukan guru; tidak menggantikan sanad | 4 Nov 2025 | T |
| MUI | Menyiapkan pedoman AI untuk rujukan keagamaan, dibahas di Munas XI (20-23 Nov 2025); artikel terbit sebelum forum, hasil akhir tidak ditemukan | 18 Nov 2025 | T (rencana) |
| MUI (Infokomdigi) | Wasekjen: AI seperti "staf ahli", keputusan akhir tetap manusia; Ketua Infokomdigi: AI untuk belajar (contoh yang disebut: belajar membaca Al-Qur'an) harus diverifikasi ulama dan kitab asli | 29 Jul 2026 | T |
| Al-Azhar | Pernyataan resmi terpadu tidak ditemukan | - | R |

Kegagalan terdokumentasi: Ask Quran (2023) menganjurkan membunuh kaum politeis lalu dijeda; HadithGPT ditutup pembuatnya; Father Justin (2024) mengaku imam, memberi absolusi, lalu diganti nama dan dilepas dari peran imam dalam sekitar dua hari; satu studi kecil menemukan GPT-4o benar 6 dari 14 fatwa tentang yoga. Pola tanpa grounding dan persona ulama sudah dijaga aturan keras Surau; pola patuh berlebihan pada desakan dan dalil benar yang diterapkan salah belum punya uji di eval.

[docs/01](../../01-visi-dan-prinsip.md) dan [docs/05](../../05-kebijakan.md) menyebut "sikap MUI (2025)" tanpa tautan; sumbernya kini ada (nu.or.id, Agu dan 4 Nov 2025).

## 3. Pasar Indonesia

**Tabel 2. Pemain dan jangkar Indonesia**

| Pemain | Fakta | Pelajaran untuk Surau | K |
|---|---|---|---|
| **Ngaji Ihya** (Gus Ulil, Facebook, sejak 2016) | Sekitar 300 penonton langsung, rekaman sering lebih dari 7.000 (data sekitar 2022); banyak peserta perempuan; ramai di luar Ramadan | Satu-satunya bukti permintaan Ihya online; skala ribuan, daya tarik komunal-ritual | T |
| **Rumaysho** | Kajian kitab serial per bab; Academy dan toko | Format bab-demi-bab terbukti; audiens dan kanon beda dari Ihya | S |
| **Yufid** | Yayasan multi-situs; operasional sekitar Rp150-200 juta/bulan dari donasi, laporan terbuka (klaim sendiri) | Multi-merek di bawah satu yayasan wajar; transparansi membangun percaya | S |
| **NU Online** | Klaim 115 juta pengguna aktif 2025; WhatsApp Channel | Pintu kepercayaan audiens NU; kemitraan lebih realistis daripada bersaing | S |
| **Rumah Kitab** (Kemenag, diberitakan Jan 2024) | Jenjang ula, wustha, 'ulya; dengar kiai dan baca makna | Mitra sekaligus pesaing; jenjangnya cocok untuk Academy (nama kerja; keputusan penamaan di [09](09-pecahan-produk.md): Jalur) | S |

**Segmen, berurutan menurut kemungkinan (inferensi dari data di atas, bukan survei).** (1) Alumni pesantren dan pekerja kota berlatar NU yang ngaji online; (2) ustadz, pengajar, mahasiswa UIN dan Ma'had Aly; (3) Muslim kota awam pendengar podcast, lewat audio; (4) pengguna asisten AI umum, lewat MCP (biaya model ditanggung pengguna); (5) audiens dakwah Salafi, skala besar tetapi penerimaan terhadap al-Ghazali hanya hipotesis (belum terverifikasi); (6) non-Muslim peminat tasawuf, lewat situs Inggris. Segmen 1 dan 2 adalah inti Intisari dan korpus Ihya; segmen 3 perluasan.

**Kanal.** WhatsApp aktif tiap bulan bagi sekitar 9 dari 10 orang Indonesia; pengguna internet 230 juta dan jangkauan iklan YouTube 151 juta (akhir 2025); Indonesia peringkat satu dunia pada pendengar podcast mingguan (42,6% pengguna internet usia 16+, Feb 2025), Spotify dominan (62%) dan waktu dengar terbanyak sebelum tidur (42%) menurut survei YouGov 1.000 responden (Apr-Mei 2025). Mesin pencari menjadi jalur penemuan merek 38,3%, jadi permalink per bab adalah pintu masuk. Peringatan: app Qur'an Kemenag hanya 21.354 aktif dari 92.766 pengguna Android (Des 2017), dan iPusnas (2,43 juta anggota) diganjal ulasan negatif.

**Nada.** Kosakata pesantren (ngaji, kajian, kitab, santri), tenang dan santun, bukan bahasa produktivitas. AI sebagai alat bantu; guru dan sanad tetap ada; ajak mencocokkan ke teks asli. Hindari "menggantikan ngaji"; pakai "pendamping". Belum diuji ke pengguna atau ustadz.

**Harga dan pendanaan.** Jangkar langganan: Storytel Local Rp19.900 dan Premium Rp39.000 per bulan (halaman memberi label diskon 50% tanpa harga asli), Spotify Rp59.900 (Student Rp29.900), Muslim Pro sekitar Rp13.000-25.000 (label harga tidak jelas); wakaf uang mulai Rp10.000-15.000. Dana besar ada: zakat nasional Rp40,53 triliun (2024), potensi wakaf uang sekitar Rp180 triliun per tahun (terkumpul sekitar Rp3,5 triliun). Pintunya berbadan hukum: nazir wakaf uang (PMA 14/2025), mitra LAZ, dan platform galang dana (potongan Kitabisa 10% hanya dari kutipan di Wikipedia, belum terverifikasi dari sumber resmi); hibah Kemenag ditujukan ke pesantren. Apakah zakat sah membiayai perpustakaan digital kitab adalah pertanyaan fikih untuk ustadz. Biaya AI Surau kecil (terjemahan dan ringkasan awal Ihya US$4,48, [docs/08](../../08-biaya.md); terjemahan ulang X21 berpagu US$36, ADR-109); beban utama adalah waktu review ustadz.

**Regulasi ayat.** PMA 44/2016 mendefinisikan "mushaf" termasuk media digital dan bagian ayat (Pasal 1), mewajibkan tanda tashih atau izin edar dari LPMQ (Pasal 2), dan menujukan sanksi kepada penerbit (Pasal 20). Apakah tampilan ayat di alat studi kitab terkena belum jelas. Penilaian riset ini: wilayah abu-abu (keyakinan rendah).

## 4. Selisih terhadap ADR-097 dan ADR-022

- **ADR-097** menulis bahwa belum ada app Indonesia yang menggabungkan ringkasan kitab, audio, dan kutipan Arab bersitasi. Data Indonesia menguatkan (NexPage kecil, Rumah Kitab beda fungsi), tetapi Cabaca, Fabula, Storial, dan Bookmate belum diperiksa.
- **Bingkai baru.** ADR-097 menyasar pekerja kota sibuk, orang awam, dan peneliti dengan gaya Headway/Blinkist; bukti Indonesia menunjuk alumni pesantren dan kebiasaan ngaji sebagai inti. Ini menggeser urutan segmen dan bahasa, tidak membatalkan ADR-097.
- **Panjang audio.** ADR-097 menetapkan 2-4 menit per Intisari Bab; Populix (jumlah responden tidak disebut, R) melaporkan mayoritas pendengar menilai 30-60 menit pas. Layak diuji dua panjang.
- **ADR-022** mencatat MCP Shamela "4 tool". Halaman syarat yang dibaca ulang tidak menyebut jumlah tool; batas permintaan disebut tanpa angka. Baru sejak ADR-022: paket token Usul dengan API, Fatwa Chat Islamweb, Fanar-Sadiq.

## Dampak untuk Surau

Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Kolom prinsip memakai tujuh butir ringkasan riset ini (bukan nomor di docs/01), seperti di [09](09-pecahan-produk.md) bagian 3: 1 Arab disalin kode, 2 alamat dan atribusi, 3 bukan fatwa atau guru, 4 status hadits dari takhrij, 5 nirlaba dan anggaran, 6 ustadz dalam lingkaran, 7 bahasa awam.

| # | Usulan | Produk | Usaha | Prinsip yang diuji |
|---|---|---|---|---|
| 1 | Bingkai Intisari sebagai pendamping ngaji: jadwal baca, baca bersama, jalur 40 hari; dahulukan fitur komunal sebelum fitur ala Blinkist | Intisari, Jalur | M | 3 (bukan pengganti guru), 6 |
| 2 | Tambah ke eval Maknaz uji keteguhan di bawah desakan dan uji dalil benar tetapi salah terap; pertimbangkan menerbitkan system prompt | Maknaz | M | 3, 2 |
| 3 | Pertanyaan hukum baru dijawab dengan rujukan ke ustadz, bukan jawaban; label "bukan fatwa" selaras bahasa NU dan MUI | Maknaz | S | 3 |
| 4 | Dengar: label suara AI sudah berupa teks (ADR-102) dan tanpa huruf Arab; tambahkan catatan lafal dan tautan ke teks sumber | Dengar | S | 1, 2 |
| 5 | Terbitkan `llms.txt` dan aturan atribusi/laju untuk API dan MCP; ekspor sitasi BibTeX/Zotero dari permalink halaman cetak | Korpus, MCP | S | 2, 4 |
| 6 | Distribusi lewat kartu WhatsApp, umpan podcast ke Spotify/YouTube, dan halaman permalink; tunda app native | Intisari, Dengar | M | 5 |
| 7 | Pertahankan tanpa paywall; uji kesediaan berdonasi berulang Rp10.000-25.000 lewat survei (hipotesis; n minimal 200; donasi tidak dibuka sebelum badan hukum ada) dan "dukungan per kitab" (istilah netral; menunggu badan hukum dan nazir/LAZ, lihat [09](09-pecahan-produk.md) bagian 2); tampilkan jam review ustadz di /transparansi | Umum | M | 5, 6 |
| 8 | Pemilik: pertanyaan tertulis ke LPMQ soal PMA 44/2016, catat jawabannya sebagai ADR; pastikan status yayasan/perkumpulan | Korpus, Umum | S | 3 |
| 9 | Jajaki kemitraan tautan dan verifikasi: NU Online, Rumah Kitab, MUI | Umum | L | 6 |
| 10 | Uji prioritas kitab sesudah Ihya (Bidayatul Hidayah, Minhajul Abidin) dengan RMI-PBNU atau ustadz sebelum Fase 5 dikunci | Korpus | S | 6 |

**Pemecahan produk.** Multi-merek di satu yayasan lazim di dakwah Indonesia (Yufid, Muslim.or.id), jadi nama Maknaz, Intisari, Dengar, dan Jalur wajar selama ada satu akar kepercayaan. Pecah domain dan organisasi hanya bila audiens per produk terbukti.

**Apakah Intisari menarik?** Riset pasar hanya menjawab separuhnya: celahnya nyata dan format serial per bab terbukti, tetapi kemenarikan sebenarnya butuh data pemakaian dan uji pengguna Surau sendiri. Ukur dulu sebelum menambah fitur.

## Sumber

Semua diakses 2026-10-27; "dibaca ulang" = dibuka ulang saat penyusunan dokumen ini.

**Pemain global**
- https://shamela.ws/page/terms · dibaca ulang · T
- https://usul.ai/plans · dibaca ulang · T
- https://arxiv.org/html/2608.20390 (Ansari) · S; https://arxiv.org/html/2608.07508 (JaleesBench) · S
- https://sunnah.com/llms.txt · T
- https://quran.foundation/year-in-review/2025 · T
- https://tarteel.ai/blog/tarteel-alim-program/ · T
- https://thepeninsulaqatar.com/article/28/07/2026/awqaf-ministry-expands-use-of-ai-to-strengthen-islamic-knowledge-religious-guidance · S; https://islamonline.net/en/katara-tech-forum-ai-sharia/ (angka 400.000+) · S
- https://arxiv.org/abs/2603.08501 (Fanar-Sadiq) · S
- https://yaqeeninstitute.org/listen/research-made-audible-yaqeen-papers · T
- https://apps.apple.com/us/app/turath/id6740871791 · T; https://nuqayah.com · S; https://bayyinah.tv · T
- https://business-humanrights.org/en/latest-news/muslims-reel-over-a-prayer-app-that-sold-user-data-a-betrayal-from-within-our-own-community · T
- https://docs.islamic.app/api-reference/library-overview · S; https://altafsir.com/ · T
- https://restofworld.org/2023/chatgpt-religious-chatbots-india-gitagpt-krishna/ · T; https://www.theregister.com/2024/05/03/ai_catholic_priest/ · T; https://decrypt.co/228360/ai-priest-catholic-answers-father-justin (sekitar dua hari) · S; https://ejournal.um.edu.my/index.php/RIS/article/view/67075 · S

**Sikap lembaga**
- https://www.dar-alifta.org/en/fatwa/details/22255/using-ai-applications-to-obtain-fatwas · dibaca ulang · T
- https://nu.or.id/nasional/munas-nu-2023-bertanya-ke-ai-boleh-tapi-haram-dijadikan-pedoman-untuk-diamalkan-HvEJ3 · T
- https://www.nu.or.id/nasional/kiai-cholil-nafis-ingatkan-ai-tak-bisa-jadi-mujtahid-atau-pemberi-fatwa-wo0YX · T
- https://www.nu.or.id/nasional/mui-teknologi-ai-hanya-pendamping-tak-bisa-gantikan-peran-ulama-dan-sanad-keilmuan-iEFOG · T
- https://www.nu.or.id/nasional/mui-siapkan-pedoman-pemanfaatan-ai-untuk-rujukan-keagamaan-DHf7z · dibaca ulang · T
- https://mui.or.id/baca/berita/wasekjen-mui-ai-hanya-staf-ahli-manusia-tetap-pemegang-kendali-etika-dan-keputusan-akhir · T

**Pasar Indonesia**
- https://wearesocial.com/id/blog/2025/11/digital-2026-top-digital-and-social-media-trends-in-indonesia/ (WhatsApp, mesin pencari 38,3%) · T; https://datareportal.com/reports/digital-2026-indonesia (230 juta pengguna internet, YouTube 151 juta) · T
- https://goodstats.id/article/indonesia-jadi-negara-dengan-pendengar-podcast-terbanyak-2025-2SHc7 (42,6%, mengutip We Are Social Digital 2025) · S
- https://goodstats.id/article/memahami-kebiasaan-publik-ri-dalam-mendengar-podcast-2025-caVbv (Spotify 62%, sebelum tidur 42%; data YouGov) · S; Populix via https://mediaasuransinews.co.id/ekonomi-bisnis/populix-ungkap-kebiasaan-pendengar-podcast-indonesia-di-radiodays-asia-2025/ · R
- https://www.iseas.edu.sg/articles-commentaries/iseas-perspective/2022-91-from-liberalism-to-sufism-ulil-abshar-abdalla-gains-renewed-relevance-online-through-ngaji-ihya-by-wahyudi-akmaliah-and-norshahril-saat/ · T
- https://yufid.org/profil · S; https://rumaysho.com · S; https://nu.or.id/nasional/harlah-ke-23-nu-online-ajak-semua-pihak-melesat-bersama-cg2Bs · S
- https://aceh.antaranews.com/berita/351549/kemenag-rilis-aplikasi-pegon-virtual-keyboard-dan-rumah-kitab-begini-penjelasannya?page=2 · S
- https://www.pantura7.com/2026/09/21/mui-jatim-siapkan-ai-muawin-agentic-ai-berbasis-fatwa-mui-dan-islam-wasathiyah/ · S
- https://nu.or.id/balitbang-kemenag/sosialisasi-aplikasi-al-quran-digital-kemenag-TzWMB · T
- https://www.goodnewsfromindonesia.id/2023/01/01/nexspace-aplikasi-rangkuman-isi-buku-yang-kini-hadir-di-indonesia (artikel tentang NexPage; slug menulis nexspace) · S
- https://www.storytel.com/id · T; https://www.spotify.com/id/premium/ · T; https://apps.apple.com/id/app/muslim-pro-quran-azan/id388389451 · T
- https://www.nu.or.id/nasional/aset-wakaf-di-indonesia-capai-451-ribu-titik-tapi-banyak-yang-belum-dikelola-secara-produktif-NCaLC · T; https://www.jawapos.com/nasional/2508270311/penghimpunan-zakat-nasional-naik-signifikan-lima-tahun-terakhir-capai-rp-4053-triliun-sepanjang-2024 · T
- https://www.fortuneidn.com/sharia/wakaf-uang-kini-satu-pintu-kemenag-perketat-syarat-pengelolaan-00-4vfn9-g5r386/amp (PMA 14/2025) · S; https://id.wikipedia.org/wiki/Kitabisa (potongan 10%, kutipan pendapat ahli, bukan kebijakan resmi) · R
- https://peraturan.bpk.go.id/Download/121910/Permenag%20Nomor%2044%20Tahun%202016.pdf · T
- https://repository.upnjatim.ac.id/37426/2/21082010089.-bab1.pdf (iPusnas) · S

**Konteks repo:** [ADR-022](../../../implementasi/KEPUTUSAN.md), ADR-097, ADR-102, ADR-109 di KEPUTUSAN; docs/01, docs/05, docs/08.

## Batas riset ini

- Anggaran pencarian habis: Cabaca, Fabula, Storial, Bookmate, regulasi AI nasional, dan hasil akhir Munas XI MUI belum diperiksa.
- Beberapa halaman (Tribunnews, Dorar.net, Kitabisa) tidak bisa dibuka; data santri EMIS melompat tanpa penjelasan dan tidak dipakai.
- Angka audiens kanal kajian utama hanya klaim atau tidak bertanggal (belum terverifikasi); kesediaan membayar pengguna Surau belum diukur.
