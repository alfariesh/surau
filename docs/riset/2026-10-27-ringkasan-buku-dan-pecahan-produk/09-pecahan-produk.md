# Pecahan produk Surau: Maknaz, Intisari, Academy, dan lainnya · 27 Oktober 2026

Dokumen ini menjawab: perlukah Surau dipecah menjadi merek terpisah ("Surau Maknaz", "Surau Summary", "Surau Academy", dan lainnya), produk mana dikerjakan lebih dulu, dan apakah Intisari sudah cukup menarik. Isinya sintesis tiga strategi (pengguna, korpus, keberlanjutan) yang diserang tiga skeptik; perubahan wajib sudah dimasukkan. Analisis app: [01](01-blinkist.md) sampai [05](05-pola-lintas-app.md). Tangkapan layar Mobbin tidak disimpan di repo (hak cipta pihak ketiga); salinannya ada di file Paper "Surau Research".

> **Bukan nasihat hukum.** Penilaian mutu berasal dari agent, bukan ustadz; persona dan ambang adalah hipotesis atau usulan (belum ada data pemakaian). Keyakinan: T tinggi, S sedang, R rendah.

## Ringkasan temuan

1. **Jangan pecah merek sekarang.** Satu Surau dengan mode bernama: "Surau Summary" tetap **Intisari**, "Surau Maknaz" tetap **Maknaz** (nama agen), "Surau Academy" menjadi **Jalur**.
2. **Yang langka bukan dolar:** kepercayaan, jam ustadz (satu ustadz peninjau; nol persetujuan ustadz atas soal Jawab per 2026-10-26), bukti pemakaian (belum diukur). Terjemahan ulang X21 US$35,89; audio penuh sekitar US$104 ([docs/08](../../08-biaya.md)).
3. **Mendesak (cek langsung, T):** bab 100017 dan 100007 masih memuat dua gagasan yang dinilai Salah oleh QA agent, berikut audio aktif (enam bab beraudio di produksi: 100004, 100005, 100006, 100007, 100009, 100017) dan tanpa tautan Laporkan; "ditahan" di [STATUS](../../../implementasi/STATUS.md) hanya di staging.
4. **Intisari belum menarik bagi pengunjung baru; dugaannya pembungkus, bukan isi** (hipotesis, belum uji pengguna): layar pertama penuh label, hub dan llms.txt 404, sitemap nol Intisari ([audit](08-audit-intisari.md)).
5. **Urutan:** amankan data; tahan lewat daftar tolak di repo plus deploy (halaman ter-cache); bungkus tanpa LLM dengan Tahap B pilot paralel; uji pembaca; teks beku; lalu Faedah, Jalur, Dengar.
6. **Tenggat alami Ramadan 1448 H** (perkiraan media berdasarkan hisab BMKG sekitar 8 Februari 2027; penetapan resmi menunggu sidang isbat Kemenag, jadi belum terverifikasi). Usulan: batch Intisari Kitab (X15c) diputuskan paling lambat 20 Desember; cadangan: Jalur dari 19 Bab yang ada.

## 1. Pecah merek sekarang? Tidak

Selisih terhadap [ADR-097](../../../implementasi/KEPUTUSAN.md): ADR itu menyasar pekerja kota dan awam dengan gaya Headway/Blinkist dan tidak membahas pemecahan merek; di sini audiens utama bergeser ke alumni pesantren dan pemecahan ditolak. Alasan, dari yang terkuat:

1. **Pemisahan memisahkan nama, bukan risiko:** korpus, label AI, aturan sitasi, antrean tinjau (satu ustadz), dan operator sama. Satu salah atribusi tetap dinisbatkan ke Surau; tiap merek menambah kewajiban privasi dan koreksi.
2. **Tarikan per produk belum terbukti:** rencana belajar Quran.com tercatat 44.000+ pendaftaran terhadap 63 juta+ pengguna aktif web (Mar 2024-Mar 2025; metrik berbeda, angka swa-lapor; S-R). Ngaji Ihya (sekitar 300 penonton langsung; ISEAS 2022; T) membuktikan kajian dipimpin guru, bukan permintaan Intisari.
3. **Analog dan anggaran:** Sefaria satu merek bermodul (pengeluaran US$7,76 juta, 2024; T); merek terpisah lahir dari sponsor atau model bisnis berbeda (inferensi; S). Anggaran AI satu (plafon Maknaz US$20 per bulan); nama bentrok (Maknaz = agen, [ADR-071](../../../implementasi/KEPUTUSAN.md); "Academy" menyiratkan ijazah).

Risiko sebaliknya, dilusi, ditangkal dengan audiens utama 8 pekan pertama: **segmen 1** ([06](06-lanskap-kitab-islam-dan-indonesia.md)), yaitu alumni pesantren, santri dewasa, pekerja kota berlatar NU yang sudah ngaji online. Segmen lain dilayani bila nol LLM dan nol jam ustadz.

**Syarat memisah satu mode** (semua; angka usulan riset ini): pemakaian berulang dari audiens berbeda minimal 8 pekan; minimal 2 peninjau aktif; 3 dari 4 uji situasi ya (orang, saluran, biaya, pengurus); pemicu luar yang memaksa; badan hukum bila menyangkut donasi atau data mitra; 5 orang baru bisa menjelaskan hubungannya dengan Surau. Kandidat pertama: Bahan Kajian, lalu Dengar.

## 2. Arsitektur merek dan penamaan

Satu merek, domain surau.org, nol domain atau akun sosial baru. Mode tanpa awalan "Surau" di dalam situs: **Baca/Cari/Takhrij**, **Intisari** (satu istilah; hentikan "Ringkasan AI"), **Dengar** (mode di Intisari), **Jalur** ("Arba'in Ihya" hanya nama satu jalur 40 hari), **Faedah** (saluran satu butir per pos), **Bahan Kajian** (nama kerja), **Rujukan**, **Integrasi AI**, **Maknaz** (nama agen di /tanya, bersubjudul "tanya kitab, jawabannya beralamat"; arti dugaan "perbendaharaan", S: pastikan ke penutur Arab).

Aturan: pakai **kegiatan pengguna**, bukan **peran guru** (Surau bukan pengganti guru). Ditolak: Sorogan dan Bandongan (mensyaratkan guru manusia), Ustadz, Fatwa, Sanad, Ijazah, Majelis (mirip Majelis Ulama), "Ngaji Ihya", "Rumah Kitab" (Kemenag), Wakaf atau Zakat sebelum bermitra dengan nazir atau LAZ, "Khatam" untuk selesai Intisari. Makna istilah dari pengetahuan umum, belum dicek ustadz.

Menu situs maksimal empat label (Baca/Cari, Intisari, Tanya (Maknaz), Integrasi AI); nama lain tetap nama kerja sampai 5 orang bisa menjelaskan fungsinya. Saluran luar memakai akhiran ("Faedah Surau"), bukan merek. "Intisari" juga nama media lama (belum terverifikasi); cadangan: Peta Bab.

## 3. Portofolio

Urutan = kapan butir butuh kerja atau keputusan; maksimal tiga jalur aktif sekaligus. Prinsip (tujuh butir ringkasan riset ini, diturunkan dari [docs/01](../../01-visi-dan-prinsip.md) dan [docs/05](../../05-kebijakan.md); nomornya bukan nomor di docs/01): 1 Arab disalin kode, 2 alamat dan atribusi, 3 bukan fatwa atau guru, 4 status hadits dari takhrij, 5 nirlaba dan anggaran, 6 ustadz dalam lingkaran, 7 bahasa awam.

**1. Intisari**
- *Untuk, masalah:* segmen 1 (utama), awam (pembanding hook). Gagasan Salah masih tayang; gagasan pertama di luar layar pertama pada 19 dari 19 halaman; QA agent: 2 Salah dari 133 gagasan (125 tingkat Bab; [laporan](../../../data/reports/ihya-9472-intisari-qa-agent-2026-10-25.md)).
- *MVP:* **A0** daftar tolak, tes regresi, /koreksi; **A1** satu baris label (rincian di lipatan), "Dalam bab ini", Dalil dilipat, Berikutnya, hub, sitemap, OG; **A2** Laporkan lewat /api/feedback; lalu **Tahap B pilot** 19 Bab (inti beratribusi, judul membuka dengan isi, validator negasi).
- *Bergantung, metrik, biaya:* izin biaya, keputusan label docs/05 §12, 5 pembaca. Nol gagasan ditolak tayang; uji kualitatif, bukan rating suka (Deslauriers dkk. 2019; T). A nol LLM; Tahap B sen sampai sekitar satu dolar (ukur gratis: `pnpm llm intisari plan`). "Inti" tampil hanya bila ditinjau (prinsip 2, 3).

**2. Integrasi AI**
- *Untuk, masalah:* pengguna asisten AI; AI umum mengarang kutipan; llms.txt 404 (T); pesaing: Shamela AI dan MCP, Ansari, Usul. *MVP:* llms.txt (bukan fatwa, permalink, frasa takhrij asli berlabel "belum ditinjau"), halaman tiga resep, paragraf lisensi AI. *Bergantung, metrik:* telaah hukum klausul NC; panggilan MCP per tool ([ADR-050](../../../implementasi/KEPUTUSAN.md)), tingkat 429. LLM nol; token berbayar melanggar prinsip 5.

**3. Faedah**
- *Untuk, masalah:* pengguna WhatsApp (sekitar 9 dari 10 orang Indonesia menurut We Are Social; penyebutnya tidak dirinci; S-T), pengajar yang meneruskan ke grup; Intisari tanpa pemicu luar tidak membentuk kebiasaan. *MVP:* 14 pos manual, 14 hari, 20-50 pengikut; isi **kutipan terjemahan paragraf pilihan kode** (berlabel AI, sitasi, tautan #pN, tanpa Arab; paragraf berayat dikecualikan karena ayat tidak boleh lewat terjemahan AI, [teks-arab](../../../.claude/rules/teks-arab.md) aturan 9), bukan parafrase gagasan; saringan daftar putih (tanpa hadits tertaut, atau riwayat al-Bukhari atau Muslim) lalu dicek manusia. *Bergantung, metrik:* A0 aktif, WhatsApp Channel (tugas manusia baru); bertahan hari ke-14, klik ke teks sumber; uji kelayakan, bukan bukti pasar.

**4. Kitab berikutnya**
- *Untuk, masalah:* pengkaji dan semua mode (nilai dikali jumlah kitab); daftar 92 kitab salah atau parsial pada 9 dari 25 nomor sampel (sampel tidak acak; S); delapan karya gelombang P1-P2 sekitar 14 jam tinjau. *MVP:* **sekarang**, nol LLM dan nol ustadz: ledger per kitab (ID Shamela, versi OpenITI, edisi, kelas catatan kaki, **status lisensi per versi**, penerbit), gerbang G0-G7, ADR catatan kaki. *Bergantung:* memuat Bidayat al-Hidayah menunggu A0 aktif 7 hari, jam ustadz minimal 3 per bulan (usulan), izin biaya (di bawah US$1; S), Shamela (email T-10 2026-10-16; diam diberi tenggat 30 hari). *Metrik, biaya:* QA 30 halaman 30/30; 20 karya sekitar US$58-61 (S). Prinsip 1: setara OpenITI ([ADR-018](../../../implementasi/KEPUTUSAN.md)).

**5. Maknaz**
- *Untuk, masalah:* bukan hukum pribadi (Ansari: 37,5% dari sampel acak 10.000 percakapan berjenis "praktik", yaitu hukum fikih, halal-haram, dan etika; dikategorikan pengembangnya sendiri; S). Jawab menunggu `/rilis 4`: R4 minta 50 soal disetujui ustadz (kini 48 oleh agent, nol manusia; [ADR-105](../../../implementasi/KEPUTUSAN.md)), kesetiaan dan atribusi minimal 95% (run publik terakhir x10 `x10-publik-elipsis-v1`, 2026-10-27, pipeline@13, dinilai agent: kesetiaan 78,6% dan atribusi 95,2%; run sebelumnya x09: 71,4% dan 97,6%, dan x08 (`answer@8`): 85,7% dan 92,9%; selisih antar-run sebesar derau penilai; perubahan sesudahnya, ADR-116 (pipeline@15), belum dinilai ulang; [ADR-110](../../../implementasi/KEPUTUSAN.md), [ADR-111](../../../implementasi/KEPUTUSAN.md), [ADR-114](../../../implementasi/KEPUTUSAN.md), [ADR-116](../../../implementasi/KEPUTUSAN.md)). *MVP:* setelah R4, 20-30 undangan, 10 pertanyaan per hari, 4 pekan; penyimpangan R4 lewat ADR hanya melonggarkan jumlah soal, bukan tinjauan manusia atas prompt, kebijakan penolakan, dan 20 jawaban nyata; "praktik berbahaya" dan sakelar mati diputuskan sebelum undangan. *Biaya, risiko:* plafon US$20 per bulan; eval sekitar US$0,12 per run publik (x10: US$0,1216; x09: US$0,1181); risiko reputasi terbesar (sikap NU, lihat Sumber). Prinsip 3: tanpa persona.

**6. Jalur**
- *Untuk, masalah:* penghatam bersama, pengajar; penarik kembali di tradisi lain adalah jadwal dan teman (inferensi). *MVP:* halaman statis "Jalur 7 hari Kitab al-'Ilm": 7 Bab lolos mutu (100007 dan 100017 keluar atau diperbaiki), kotak centang localStorage, tanpa streak; diuji satu pengajar bersama jamaah dan 10 orang. *Metrik:* tuntas 7 hari dari laporan diri dan hitungan agregat; ambang ditulis sebelum uji. Prinsip 3: tanpa sertifikat, ijazah, sanad.

**7. Dengar**
- *Untuk, masalah:* pendengar (Indonesia peringkat 1 pendengar podcast: 42,6% pengguna internet usia 16+ mendengar tiap pekan, We Are Social Digital 2025; S); audio baru 6 dari 19 halaman, belum diuji pendengar luar, pos biaya terbesar (sekitar US$104 untuk Ihya). *MVP:* **ditunda sampai teks beku;** lalu uji dengar buta 5-8 orang (100007 dan 100017 keluar); sebelum umpan audio apa pun putuskan [ADR-102](../../../implementasi/KEPUTUSAN.md) (label hanya teks) dan suara milik Surau (T-31). Prinsip 1, 3: Arab tak dibacakan; tanpa kloning.

**8. Bahan Kajian** (nama kerja)
- *Untuk, masalah:* pengajar, majelis taklim; hipotesis tanpa bukti. *MVP:* 5 wawancara 30 menit (termasuk jam tinjau), lalu satu lembar cetak 3 Bab yang dicek manusia, dengan blok lisensi (OpenITI, Tanzil, Kemenag) dan label AI; tanpa ayat sampai LPMQ menjawab dan tanpa "pertanyaan diskusi". *Metrik:* minimal 3 dari 5 menyebut masalah serupa tanpa dipancing. Kemungkinan tumpang tindih dengan Rumah Kitab Kemenag (layanan diluncurkan 6 Januari 2024; isinya belum diperiksa; R).

**9. Rujukan**
- Halaman hadits "di mana dikutip" dari data takhrij (kode, nol LLM); halaman ayat menunggu LPMQ (PMA 44/2016 mencakup mushaf digital dan bagian ayat; penerapan R). Permintaan belum terbukti. Prinsip 1, 4.

## 4. Roadmap

**Sekarang** (syarat: izin pemilik hanya untuk menghapus mp3 dari R2)
- **Langkah 0:** mesin kanonis data/build/llm (di checkout ini basi), sha256, cadangan R2 privat, daftar ID ditolak dan label QA sebagai JSON di git, guard ingest; baca baseline Web Analytics.
- **A0:** daftar tolak disaring `readDigest` (web, Cari, MCP), audio null, deploy (cache ikut kosong), curl; promote gagal bila ada baris ditolak; /koreksi; hapus mp3 dan purge cache.
- A1, Tahap B pilot (validator menangkap dua kasus Salah dulu; izin biaya terpisah), Integrasi AI, ledger, transparansi. Tak ada tautan eksternal ke gagasan sebelum teks beku.

**Berikutnya** (A0 aktif minimal 7 hari kecuali dicatat)
- Uji 5 pembaca (tabel keputusan ditulis dulu; dua bingkai: peta bab lawan pendamping ngaji), sensus tinjau manusia sekitar 125 gagasan, teks beku.
- Faedah (40 butir lolos saring, 14 dicek), Jalur 7 hari, kitab P1, Bahan Kajian (3 dari 5 pengajar), Dengar (teks beku, ADR-102), Maknaz terbatas (A0 aktif 14 hari; T-24 jalan atau ADR penyimpangan).

**Nanti**
- X15c dan Jalur 40 hari: keputusan paling lambat 20 Desember; tanpa bukti dari luar jaringan pemilik, default cadangan. Audio batch, kitab P2-P4, Rujukan, kelas, badan hukum dan donasi, pemisahan merek menunggu pemicunya. Bila ustadz peninjau di bawah 2 jam per bulan, hanya sensus Intisari dan Faedah berjalan.

## 5. Tidak dipecah, dan perbedaan pendapat

**Tidak dipecah:** Baca/Cari/Takhrij; Maknaz dan Intisari sebagai dua merek; "Surau Academy"; fitur lintas mode (kartu kutipan, simpan, ulas); diskusi dan kelas; podcast dua host dan persona ulama (ADR-097); aplikasi native; paket berbayar dan iklan (prinsip 5).

| Isu | Posisi strategi | Pilihan |
|---|---|---|
| Pecah merek | Dua "bertahap", satu "tidak" | Tidak; pemicu luar wajib |
| Setelah gerbang mutu | Faedah / kitab ke-2 / badan hukum | Intisari; lainnya paralel bila nol LLM dan nol ustadz |
| Atribusi gagasan | Di judul / di chip | Tetap di judul, bervariasi |

## 6. Serangan skeptik dan jawabannya

Dari 42 serangan, 15 besar dan 1 penghalang dijawab di bawah; 26 lainnya sudah menjadi syarat di bagian 3 dan 4.

| Serangan | Jawaban |
|---|---|
| Validator "istilah ada di jangkar" tak menangkap inversi (100017 g2) | Validator negasi dan kategori berisiko (ta'wil lahir-batin, aliran, bilangan), Sonnet; wajib menangkap dua kasus Salah sebelum Tahap B |
| Sampel n=60 tanpa Salah lolos sekitar 40% pada laju 1,5%; itu sensus terpecah | Sensus manusia atas 19 Bab pilot; batch penuh pakai aturan lolos terhitung; pintu eksternal per butir yang ditinjau |
| Saringan Faedah dan chip takhrij "polos" memercayai label otomatis (negatif palsu) | Daftar putih plus tinjau; chip tetap "dikenali otomatis, belum ditinjau"; penilai tak disebut sebelum ditinjau |
| Penyimpangan R4 melompati tinjauan prompt dan kebijakan | Hanya jumlah soal yang longgar; sakelar mati sebelum undangan |
| Tahan lewat D1/R2 tak bekerja (halaman ter-cache); data LLM di luar git, checkout ini basi (penghalang) | Daftar tolak di repo plus deploy; hapus R2 dan purge dengan izin; Langkah 0 sebelum A0 |
| Laju tinjau 1-1,5 menit per butir tak terbukti | Ukur 10 gagasan dulu; tiap butir yang menunggu ustadz peninjau punya varian nol-jam |
| Tahap B mengubah urutan gagasan dan merusak tautan, label QA, audio | Tak ada tautan eksternal sebelum teks beku |
| Langkah A bukan satu sesi; /tinjau tak punya antrean gagasan | Dipecah A0, A1, A2; Laporkan lewat /api/feedback tanpa migrasi |
| Persona awam bertentangan dengan riset pasar; Ngaji Ihya bukan bukti permintaan Intisari; distribusi: sitemap nol Intisari, nol kemitraan | Segmen 1 untuk "adakah yang kembali" (minimal 3 dari 5), awam untuk hook; satu pengajar menjalankan Jalur bersama jamaah; sitemap dan OG di A1; tiga pembicaraan kemitraan via ustadz peninjau |
| Uji tarikan dari jaringan pribadi bias; rantai jadwal ke 20 Desember tanpa cadangan | Tabel keputusan sebelum uji, peserta menurut asal; X15c tak diikat hasil n kecil; rekrutmen mulai sekarang; default 20 Desember = Jalur dari 19 Bab |

## 7. Keputusan untuk pemilik

1. Izin menghapus mp3 bab 100007 dan 100017 dari R2 (aturan keras 4). Rekomendasi: ya, sekarang (vonis Salah dari agent).
2. Jam ustadz peninjau per bulan (saat ini satu orang) dan ustadz kedua; ukur laju dengan 10 gagasan dulu.
3. Pembaca uji (minimal 3 segmen 1, 2 awam), moderator non-pemilik, 3-5 pengajar.
4. Tafsir docs/05 §12 lewat ADR: label satu baris plus lipatan, judul beratribusi bervariasi, riwayat lemah bukan kutipan unggulan. Rekomendasi: ya.
5. Izin biaya terpisah per batch: Tahap B pilot, terjemahan dua karya P1, uji dengar.
6. Penamaan (kegiatan, bukan peran guru), arti "Maknaz", cek merek DJKI sebelum materi luar.
7. Badan hukum dan donasi (donasi tidak dibuka sebelum badan hukum ada).
8. WhatsApp Channel Faedah, suara AI tanpa nama persona, Jalur 40 hari sebagai target Ramadan, penghitung agregat anonim, pertanyaan LPMQ.

## Dampak untuk Surau

Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi. Kolom Prinsip memakai tujuh butir ringkasan riset di bagian 3 (bukan nomor di docs/01).

| Sesi | Tujuan | Selesai bila | Usaha | Prinsip |
|---|---|---|---|---|
| Langkah 0 dan A0 | Amankan data, tahan dua gagasan Salah | Cadangan ber-sha256; curl bersih; tes regresi hijau | M | 2, 6 |
| Intisari A1 dan A2 | Bungkus tanpa LLM, Laporkan, sitemap | Gagasan 1 di layar pertama 19 dari 19; Intisari di sitemap | L | 1-3, 7 |
| Validator dan Tahap B pilot | Inti dan judul baru | Validator menangkap dua kasus Salah; izin biaya | M | 1-3 |
| Integrasi AI | llms.txt, resep, lisensi AI | llms.txt 200; ambang 429 ditetapkan | S | 1-5 |
| Ledger kitab | Fondasi kitab kedua | Ledger, ADR gerbang, G0 tiga kandidat | M | 1, 2 |
| Uji kegunaan | Jawab "menarik atau belum" | Lima sesi tercatat; tabel keputusan lebih dulu | S | 3, 5 |

## Sumber

Semua sumber diakses 2026-10-27.

- Pemeriksaan langsung (T): https://surau.org/kitab/ihya/bab/100017/intisari , https://surau.org/kitab/ihya/bab/100007/intisari , https://surau.org/llms.txt (404), https://surau.org/sitemap.xml (1.716 URL, nol Intisari)
- Sefaria (T): https://projects.propublica.org/nonprofits/organizations/464406454 · Quran.com (S-R): https://quran.foundation/year-in-review/2025 · Ngaji Ihya (T): https://www.iseas.edu.sg/articles-commentaries/iseas-perspective/2022-91-from-liberalism-to-sufism-ulil-abshar-abdalla-gains-renewed-relevance-online-through-ngaji-ihya-by-wahyudi-akmaliah-and-norshahril-saat/
- WhatsApp (T-S): https://wearesocial.com/id/blog/2025/11/digital-2026-top-digital-and-social-media-trends-in-indonesia/ · podcast (S): https://goodstats.id/article/indonesia-jadi-negara-dengan-pendengar-podcast-terbanyak-2025-2SHc7 · Shamela (T): https://shamela.ws/page/terms · Usul (S): https://usul.ai · PMA 44/2016 (T; Pasal 1 ayat 1 mendefinisikan mushaf sebagai media berisi 30 juz dan/atau bagian dari surah atau ayat, cetak maupun digital; berlakunya bagi Surau belum jelas, lihat [docs/05](../../05-kebijakan.md) Pertanyaan terbuka): https://peraturan.bpk.go.id/Details/131092/peraturan-menag-no-44-tahun-2016
- Ansari (S; angka dari bagian 5.2, Gambar 1): https://arxiv.org/abs/2608.20390 · Deslauriers dkk. 2019 (T): https://doi.org/10.1073/pnas.1821936116 · NU (T; Munas Alim Ulama 2023, diumumkan 19 September 2023): https://nu.or.id/nasional/munas-nu-2023-bertanya-ke-ai-boleh-tapi-haram-dijadikan-pedoman-untuk-diamalkan-HvEJ3 · Rumah Kitab (S; artikel hanya menyebut peluncurannya): https://aceh.antaranews.com/berita/351549/kemenag-rilis-aplikasi-pegon-virtual-keyboard-dan-rumah-kitab-begini-penjelasannya
- Perkiraan awal Ramadan 1448 H (S; hasil pencarian 2026-10-27, halamannya belum dibuka langsung): https://www.metrotvnews.com/read/kBVCM5Xl-kapan-ramadan-2027-ini-perkiraan-awal-puasa-1448-h
- Repo: ADR-018, 050, 071, 097, 102, 105, 110, 111, 114, 116 di [KEPUTUSAN](../../../implementasi/KEPUTUSAN.md); [laporan eval x10](../../../evals/reports/jawab-x10-elipsis-banding.md) (run publik terakhir) dan [laporan eval x09](../../../evals/reports/jawab-x09-label-banding.md) (sebelumnya); [STATUS](../../../implementasi/STATUS.md); [docs/08](../../08-biaya.md).

Belum terverifikasi atau tidak ditemukan: permintaan ringkasan kitab AI dan pengajar di Indonesia; Web Analytics aktif; merek DJKI; arti "Maknaz"; tanggal resmi 1 Ramadan 1448 H (baru perkiraan hisab); "Intisari" sebagai nama media lain; isi layanan Rumah Kitab Kemenag.
