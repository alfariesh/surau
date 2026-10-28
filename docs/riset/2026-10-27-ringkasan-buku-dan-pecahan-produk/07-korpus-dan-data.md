# Korpus dan data: pelajaran untuk perluasan Surau · 27 Oktober 2026

Riset ini menjawab satu pertanyaan: apa yang bisa Surau pelajari dari perpustakaan teks lain, praktik mengelola korpus, dan bukti penelitian tentang ringkasan, AI, audio, dan kepercayaan, agar Fase 5 sampai 7 ([FASE](../../../implementasi/FASE.md)) tumbuh sesuai prinsip? Bagian 1: analog lintas tradisi; bagian 2: playbook korpus; bagian 3: bukti beserta label kualitasnya. Riset awal Intisari di [ADR-097](../../../implementasi/KEPUTUSAN.md) tidak diulang; dokumen sejawat: [05](05-pola-lintas-app.md), [06](06-lanskap-kitab-islam-dan-indonesia.md), [08](08-audit-intisari.md).

Tangkapan layar Mobbin tidak dimasukkan ke repo (hak cipta pihak ketiga); salinannya ada di file Paper "Surau Research".

> **Bukan nasihat hukum.** Bagian lisensi adalah pembacaan publik atas undang-undang dan syarat sumber; klaim berkeyakinan rendah ditandai "(belum terverifikasi)".

## Ringkasan temuan

1. **Analog memecah produk menjadi modul dalam satu merek** (Sefaria, 84000, Wikisource); merek terpisah muncul karena denominasi, bisnis, atau sponsor (inferensi).
2. **Sefaria memberi cetak biru pagar AI:** label dua tingkat (bantuan AI yang ditinjau manusia versus murni AI); asistennya hanya mengutip perpustakaan dan menolak putusan hukum.
3. **Penarik kembali adalah rencana dan jadwal, bukan ringkasan,** tetapi buktinya lemah (angka swa-lapor).
4. **Hambatan Fase 5 adalah jam ustadz, bukan dolar:** LLM untuk 20 karya al-Ghazali lain ±US$58-61; satu ustadz pendamping, persetujuan manusia nol.
5. **Rantai lisensi OpenITI ([ADR-018](../../../implementasi/KEPUTUSAN.md)) bisa diperluas,** tetapi tiga celah belum tertulis: catatan kaki modern, teks OCR, identitas edisi.
6. **Pencocokan ±92 kitab belum bisa dipercaya:** 9 dari 25 nomor yang diperiksa salah atau parsial.
7. **Bukti belajar mendukung ringkasan plus tindakan aktif** (g ≈ 0,5); AI tanpa pagar menurunkan nilai ujian 17%.
8. **Ringkasan buku oleh LLM setia 68,7-90,9% (FABLES);** redaksi ADR-097 soal studi AGU belum didukung bukti primer (hanya abstrak dan laporan pers yang terbaca).

## 1. Analog lintas tradisi

| Proyek | Yang patut ditiru | Batas atau peringatan | Keyakinan |
|---|---|---|---|
| Sefaria (teks Yahudi, nirlaba) | Satu merek, modul berbagi akun. Label AI dua tingkat. Asisten (di atas Claude) hanya mengutip Library, menolak putusan hukum, dilepas bertahap. Ekspor bulanan, API tanpa kunci, MCP berlisensi MIT | Biaya dan tingkat kesalahan asisten tidak diterbitkan; pengeluaran 2024 US$7,76 juta | tinggi |
| SuttaCentral | ID segmen tetap menyelaraskan teks akar dan terjemahan; terjemahan AI dilarang | Hanya memohon data tidak melatih AI | tinggi |
| Wikisource | Status per halaman; Validated hanya oleh orang kedua | Mutu bergantung sukarelawan | tinggi |
| YouVersion, Quran.com | Rencana berhari, target preset, API pengguna OAuth2 | Quran.com melaporkan 82 juta+ pengguna aktif (Feb 2025-Feb 2026), tetapi hanya 300 ribu+ target dan 100 ribu+ pendaftaran rencana sejak fitur dirilis (swa-lapor; angka YouVersion tidak diperiksa) | rendah |
| 84000, Perseus | Dua ruang menurut tingkat pembaca; sponsor per karya; korpus terpisah dari penampil; kutipan stabil (CTS URN) | Lisensi 84000 tidak ditemukan | sedang |

**Pecahan dan pagar.** Source sheet Sefaria hidup di subdomain (voices.sefaria.org), bukan merek baru; merek terpisah (Logos, Hallow) komersial. Untuk tim kecil: satu merek Surau, ruang berbeda (Maknaz, Intisari, dan Academy, nama kerja; keputusan penamaan di [09](09-pecahan-produk.md): Jalur). Tiru Sefaria: label dua tingkat yang kelihatan, cek keaslian tautan, ID pengguna acak, pelepasan bertahap sebelum `/rilis 4`. Wikimedia menghentikan uji ringkasan artikel AI (Juni 2025) setelah editor menolak (sumber sekunder). Soal pelatihan AI: Sefaria diam, SuttaCentral hanya memohon.

## 2. Playbook korpus untuk Fase 5-7

Surau sudah ketat (ID paragraf stabil, rantai OpenITI, QA manusia); celah muncul saat kitab banyak.

### 2.1 ID dan edisi

| Usulan | Isi | Alasan |
|---|---|---|
| `external_ref` | ID luar: OpenITI, Shamela, Wikidata, VIAF | Wikidata Q9546 (al-Ghazali) memuat ID penulis Shamela 619 (sama dengan data lokal) dan VIAF 31996761; ID OpenITI tidak terlihat |
| `work_type`, `work_relation` | matn, sharh, hashiyah, nazm, composite; `sharh_of`, `overlaps_with`, `contains` | Kurikulum penuh syarah; tanpa relasi Maknaz bisa salah atribusi. *Qawa'id al-'Aqa'id* adalah bagian Ihya dan *Asnaf al-Maghrurin* tampaknya diambil dari Ihya ([docs/03](../../03-sumber-data.md)) |
| `edition.source_tier`, `footnote_class`, `work_alias` | `shamela_openiti_matched`, `ocr_uncorrected`, `keyed`; classical, modern_editor, unknown; ejaan pesantren | Dasar label UI (lihat 2.5); pencarian tak gagal karena ejaan |

**Ledger kitab:** satu berkas YAML atau CSV tanpa teks kitab, satu baris per kitab (ID Shamela, URI OpenITI dan paritas ID, edisi, tahun wafat, tingkat sumber, kelas catatan kaki, gerbang). Pada sampel tidak acak 25 nomor, 9 salah atau parsial: *Fath al-Mu'in* tercatat sebagai syarahnya, *Bulugh al-Maram* juga, *al-Hikam* sebagai karya al-Khazini (dinilai dari judul). [ADR-115](../../../implementasi/KEPUTUSAN.md) hanya memakai status `SAME_NORMALIZED` (13 kandidat), sejalan.

### 2.2 Gerbang ingest per kitab

| Gerbang | Isi | Di Ihya |
|---|---|---|
| G0 hukum dan sumber | Penulis wafat sebelum 1956 M; ada versi OpenITI dengan ID Shamela sama; kebijakan catatan kaki. Tanpa OpenITI: berhenti (ADR-018) | sebagian |
| G1 identitas edisi | Cek anakronisme daftar isi, bandingkan versi (tim Digital Sirah Project, lewat blog KITAB, baru sadar setelah lebih dari enam bulan bahwa satu teks al-Tabari adalah edisi gabungan) | tidak ada |
| G2-G4 struktur, paritas, perangkat | Judul yatim; `verify-openiti` ≥ 0,95 di 99,9% halaman; kelas catatan kaki; pencocokan Tanzil dilaporkan (Ihya 97,3% persis) | ada / sebagian |
| G5-G8 duplikasi, QA, AI, rilis | Shingling atau passim (`overlaps_with`); 30 halaman byte demi byte; uji buta plus aturan tiga; ID dibekukan, datasheet | sebagian |

**Gerbang OCR.** Teks sumber hanya dari mesin level-baris non-generatif (Kraken, seperti OpenITI). Model bahasa-visi cukup sebagai pembanding: ia menghasilkan teks, bertentangan dengan aturan [teks-arab](../../../.claude/rules/teks-arab.md), dan KITAB-Bench melaporkan CER Gemini-2.0 13%, GPT-4o 31%. Tampilkan "hasil OCR, belum dikoreksi" di samping gambar halaman; ukur CER pada sampel gold sebelum masuk Maknaz atau Intisari. Kasus uji: *Minhaj al-'Abidin* (di OpenITI hanya OCR tak dikoreksi), *Ayyuha al-Walad* (tidak ada di folder Ghazali OpenITI).

### 2.3 Urutan perluasan

**Fase 5.** P1: *Bidayat al-Hidayah* dan *al-Munqidh* (ID Shamela sama dengan OpenITI pada sampel; LLM di bawah US$1). P2: karya akhlak dan akidah (*Mishkat al-Anwar*, *al-Maqshad al-Asna*, *al-Iqtishad*, *Mizan al-'Amal*, *Jawahir al-Qur'an*, *at-Tibr al-Masbuk*). P3: *Tahafut al-Falasifah*, *Fada'ih al-Bathiniyyah*, logika; polemik menuntut pembedaan pendapat penulis dan yang dibantah, jadi menunggu pilot wiki. P4: *al-Mustashfa* dan *al-Wasith* (55% token Fase 5), tunda. Label atribusi untuk *Ma'arij al-Quds* (diragukan) dan *Kimiya as-Sa'adah* (aslinya Persia). Paritas ID baru terbukti pada tiga karya; sisanya butuh metadata rilis OpenITI.

**Fase 7** (daftar kurikulum resmi tidak ditemukan; ini usulan): A akhlak, tasawuf, adab (an-Nawawi, *Hikam*); B hadits dan tafsir (*Bulugh al-Maram*, *Jalalayn*); C nahwu dan sharaf; D fiqh Syafi'i (review ustadz wajib, tunda); E ushul, mantiq, tauhid (belum dicek). Suara minat anonim ADR-115 bisa menjadi petunjuk urutan.

### 2.4 Biaya dan kapasitas review

Hitungan sendiri, belum terverifikasi: tarif efektif Sonnet ±US$19,94 per juta token (dari biaya terjemahan ulang X21, [ADR-109](../../../implementasi/KEPUTUSAN.md)) dan Haiku ±US$1,86 (dari biaya S13) tidak tertulis di repo selain di dokumen ini, dan jumlah token di balik hitungannya tidak tercatat di sana; hasilnya linear:

| Skenario | Juta token | Terjemahan Sonnet | Terjemahan Haiku | Total dengan Sonnet* |
|---|---|---|---|---|
| 20 karya Ghazali selain Ihya | 2,63 | ±52 | ±5 | ±58-61 |
| P1+P2 (8 karya) | 0,43 | ±8,5 | ±0,8 | ±9,5-10 |
| 92 kitab, angka [docs/03](../../03-sumber-data.md) | 98 | ±1.950 | ±180 | ±2.200-2.300 |
| 92 kitab, halaman × rasio Ihya | 148 | ±2.950 | ±275 | ±3.300-3.400 |

*Ditambah ringkasan, Intisari, wiki. [docs/08](../../08-biaya.md) memperkirakan US$174,54 (kalkulator Haiku). Estimasi token berselisih 1,5 kali; ukur satu kitab dulu. Haiku murah, tetapi uji buta X21: terjemahan lama 46% Benar, Sonnet 88%. Audio ±US$104 per kitab sebesar Ihya: bukan bawaan.

**Jam review.** Aturan tiga: nol galat pada n sampel acak berarti galat populasi di bawah 3/n (keyakinan 95%). Pada laju repo 1-1,5 menit per butir: n=60 (di bawah 5%) ±1-1,5 jam; n=150 (2%) ±2,5-3,75 jam; n=300 (1%) ±5-7,5 jam. Dengan 30 menit QA halaman ditambah n=60 per kitab, P1+P2 butuh ±14 jam, 92 kitab ±161 jam. Ambil gelombang sesuai kapasitas, rekrut santri editor (peran `editor` sudah ada), dan tampilkan tingkat jujur: T0 otomatis; T1 diperiksa satu orang; T2 divalidasi orang kedua (meniru Wikisource); T3 ustadz, khusus tingkat C seperti label takhrij dan hukum.

### 2.5 Lisensi dan hak cipta per kitab

1. **Pengarang klasik:** domain publik di Indonesia bila wafat lebih dari 70 tahun lalu (UU 28/2014 Pasal 58 ayat 1); tampil global tetap lewat rantai OpenITI (CC BY-NC-SA 4.0).
2. **Edisi modern:** catatan kaki, pengantar, dan indeks milik pentahqiq kemungkinan dilindungi (Pasal 40 ayat 1 huruf n memuat tafsir, saduran, dan karya hasil transformasi; penerapannya tafsiran penulis); OpenITI membuangnya. Ihya aman (catatan kakinya takhrij al-'Iraqi), kitab lain belum punya aturan. Usulan: klasik tampil, modern default tidak tampil, tidak diketahui ditahan.
3. **Terjemahan dan ringkasan AI** adalah materi adaptasi ([ADR-021](../../../implementasi/KEPUTUSAN.md)); status hak cipta keluaran AI di Indonesia belum terjawab.
4. **Data pihak ketiga:** Tanzil CC BY 3.0 hanya verbatim. Quranic Arabic Corpus berlisensi GNU GPL v3 (dibaca ulang): jangan masuk dump CC BY-NC-SA. *hadith-api* mengaku Unlicense, tetapi lisensi sumber teksnya tidak dinyatakan di halaman utama repo (belum terverifikasi).
5. **Shamela:** syarat 19 Sep 2026 tidak memberi hak pakai ulang; tetap bahan lokal hanya-baca. Jawaban email T-10 tidak tercatat.
6. **Dokumen basi:** [docs/03](../../03-sumber-data.md) dan [docs/05](../../05-kebijakan.md) §7 masih menulis ADR-018 dan ADR-021 "diusulkan", dan [docs/01](../../01-visi-dan-prinsip.md) (prinsip 8) masih menulis ADR-021 "masih menunggu persetujuan pemilik di P-6", padahal keduanya diterima pemilik 2026-10-16.

### 2.6 Rilis data dan skala

- **Rilis Fase 7:** lisensi dan atribusi di tiap berkas versi (seperti Sefaria), Croissant 1.0 dan datasheet per kitab, DOI Zenodo dan md5 per rilis (seperti OpenITI), klausul pemakaian AI tertulis (kecukupan klausul NC perlu telaah hukum).
- **Skala (ekstrapolasi linear, perlu uji beban):** peta ID dan sidik ±1,2 MB di git untuk Ihya menjadi ±100 MB pada 140 ribu halaman; D1 `ihya-v7` 45,7 MB (berkas lokal `data/build`; produksi kini `ihya-v9`, ukurannya belum diukur) menjadi ±2,5-3,7 GB (batas 10 GB per DB).

## 3. Bukti riset: ringkasan, AI, audio, kepercayaan

Label: **K1** meta-analisis atau uji acak; **K2** tolok ukur beranotasi atau studi kecil; **K3** kualitatif kecil, vendor, pers, swa-lapor.

### 3.1 Temuan

| Temuan | Label | Artinya bagi Surau |
|---|---|---|
| Tes ingatan mengungguli baca ulang: g = 0,50 (Rowland 2014; Yang 2021); umpan balik 0,73 versus 0,39; isian berpetunjuk 0,61 versus pengenalan 0,29 | K1 | Kuis Intisari: jawab dulu, lalu umpan balik berupa Dasar teks |
| Meringkas dan membaca ulang berutilitas rendah (Dunlosky 2013), tetapi yang dinilai pelajar yang menulis ringkasan; studi membaca ringkasan siap pakai versus buku penuh tidak ditemukan | K2 | Jangan klaim Intisari saja membuat paham |
| Kelas aktif belajar lebih banyak, tetapi dinilai mahasiswa kurang efektif (Deslauriers, PNAS 2019) | K1 | Ukur selesai baca, klik ke sumber, ulas H+3 dan H+7, bukan rating suka |
| AI tanpa pagar: sekitar seribu siswa, nilai latihan +48%, ujian tanpa AI -17%; Tutor berpagar sebagian besar menghindarinya (Bastani, PNAS 2025; satu mata pelajaran) | K1 | Tutor berpagar: petunjuk bertahap, tulis jawabanmu dulu |
| Ringkasan buku oleh LLM setia 68,7-90,9% (26 buku); butir penting hilang di 52-85% ringkasan; condong ke akhir buku; penilai LLM lemah (FABLES; model 2024, novel Inggris) | K2 | Audit sebaran gagasan per sub-bab, sampel manual per batch |
| Sekitar separuh kalimat mesin pencari generatif didukung penuh sitasinya; alat hukum RAG berhalusinasi 17-33%; Citations Anthropic menjamin penunjuk valid, bukan klaim didukung | K2 | Ukur dukungan sitasi, bukan keabsahan tautan saja |
| Studi AGU 2025 (kualitatif, n = 3 makalah; dari abstrak dan laporan pers, teks penuh tidak terbaca): ketidakakuratan di setiap ringkasan audio NotebookLM. Studi 10 podcast: umumnya akurat, tetapi ada salah istilah; aksen Amerika menurunkan kredibilitas. Audio setara teks untuk pemahaman umum (n = 91); tolok ukur mutu TTS Indonesia tidak ada | K3 (podcast), K2 (audio) | Dasar yang ada (tipis) untuk menolak podcast dua host; uji dengar buta sebelum batch besar |
| Khotbah robot dinilai kurang kredibel (tiga studi non-Muslim). MUI (20 Agu 2025): AI bukan rujukan hukum agama. Di Ansari, 37,5% percakapan (sampel 10.000) bertopik "praktik" (fikih, halal-haram, etika), dihitung operator sendiri. Survei Muslim Indonesia tidak ditemukan | K2, K3 | Pernyataan bukan-fatwa pada titik keputusan |
| Gamifikasi g = 0,25 untuk perilaku (0,49 kognitif); rencana jika-maka d = 0,65; klaim streak Duolingo dari blog sendiri; FTC menyebut nagging dan confirmshaming pola gelap | K1, K3 | Target mingguan fleksibel, cuti tanpa denda |

### 3.2 Selisih terhadap ADR-097

- **Redaksi studi AGU belum didukung bukti primer.** ADR-097 menulis "dua host terbukti berimprovisasi". Studinya ada (Flynn dan Peters, 11 Okt 2025) tetapi, menurut abstrak dan laporan pers (teks penuh tidak terbaca), kualitatif, n = 3, dan kata improvisasi tidak ditemukan di keduanya. Menolak podcast dua host tetap dapat dipertahankan; baca teks penuh studi dulu sebelum sebuah ADR mengoreksi redaksi itu.
- **Label lisan tidak diadopsi.** Bukti menyarankan label AI di awal audio, tetapi [ADR-102](../../../implementasi/KEPUTUSAN.md) (keputusan pemilik) menghapusnya; label tetap teks dan metadata. Bukti kredibilitas memperkuat label teks yang kelihatan.

## Dampak untuk Surau

Usaha: S = kurang dari satu sesi (hitungan jam), M = satu sesi, L = beberapa sesi.

| # | Usulan konkret | Usaha | Prinsip |
|---|---|---|---|
| 1 | Ledger kitab menggantikan CSV pencocokan; mulai dari 21 karya Ghazali dan 13 kandidat ADR-115 | S | 2, 5 |
| 2 | Perbarui docs/03, docs/05 §7, dan docs/01 prinsip 8 (ADR-018, ADR-021 sudah diterima); baca teks penuh studi AGU dulu, lalu putuskan apakah redaksi ADR-097 perlu dikoreksi | S | 2, 5 |
| 3 | ADR catatan kaki (klasik, modern, tidak diketahui) dan ADR OCR (tingkat sumber, label UI, gerbang); uji pada *Minhaj al-'Abidin* | S | 1, 5 |
| 4 | Migrasi ringan sebelum kitab ke-2 (`external_ref` dari Wikidata, `work_type`, `work_relation`, `source_tier`, `footnote_class`) dan gerbang G0, G1, G5 | M | 2, 3 |
| 5 | Pilot Fase 5 (*Bidayat al-Hidayah*, *al-Munqidh*), min. 20 soal lokasi per kitab; catat jam review | S | 5, 6 |
| 6 | Label tingkat review T0-T3 (aturan tiga, n=60) di laporan dan UI; label dua tingkat Intisari ("belum dicek ustadz" versus "dicek") dari `review_status` | S-M | 2, 6 |
| 7 | Intisari: audit kesetiaan sebelum X15c (sebaran gagasan per sub-bab, sampel manual) dan kuis jawab-dulu dengan umpan balik Dasar teks; ukur ulas tertunda | M | 1, 2, 3 |
| 8 | Maknaz: ukur dukungan sitasi, soal premis keliru, hadiah abstain | M | 3, 4 |
| 9 | Uji beban peta ID dan D1 (korpus sintetis 3 GB), lalu rilis data Fase 7: Croissant, datasheet, lisensi per versi, klausul AI, telaah hukum klausul NC | L | 5 |
| 10 | Pilot Jalur tanpa akun (localStorage): jalur Arba'in Ihya, ulas berjarak melebar (usulan H+1, H+3, H+7, H+21, bukan dari makalah), target mingguan fleksibel | L | 3, 5 |
| 11 | Wawancara 8-10 pengguna Indonesia; cek sikap NU, Muhammadiyah, Kemenag, Al-Azhar | M | 3 |

Kolom Prinsip: 1 verbatim, 2 alamat dan atribusi, 3 bukan fatwa, 4 status hadits dari takhrij, 5 nirlaba dan anggaran, 6 ustadz dalam lingkaran.

**Dibutuhkan dari pemilik:** jam per bulan ustadz peninjau (saat ini satu orang); status jawaban Shamela atas T-10; persetujuan ADR catatan kaki dan OCR (usulan 3); izin eksplisit untuk batch berbayar pilot Fase 5 (usulan 5).

## Sumber

Tanggal akses semua: 2026-10-27. Dibaca langsung: halaman AI Sefaria, Help:Page_status, Wikidata Q9546, UU 28/2014.

- **Analog, tinggi:** https://www.sefaria.org/ai · https://voices.sefaria.org/sheets/721008?lang=bi · https://developers.sefaria.org/docs/usage-of-our-name-and-logo · https://projects.propublica.org/nonprofits/organizations/464406454 · https://discourse.suttacentral.net/t/about-the-translations-category/27 · https://github.com/suttacentral/bilara-data · https://github.com/Sefaria/Sefaria-Export · https://en.wikisource.org/wiki/Help:Page_status
- **Analog, sedang:** https://www.youversion.com/the-bible-app · https://84000.co/ · https://opengreekandlatin.org/ · https://www.logos.com/ · https://hallow.com/ · https://en.wikipedia.org/wiki/Artificial_intelligence_in_Wikimedia_projects. **Rendah (swa-lapor):** https://quran.foundation/
- **Korpus, tinggi:** https://zenodo.org/records/17767721 · https://kitab-project.org/docs/openITI · https://kitab-project.org/When-al-Tabar%C4%AB-is-Not-(Just)-al-Tabar%C4%AB-The-Challenges-Posed-by-Composite-Editions-in-the-OpenITI-Corpus/ · https://kitab-project.org/OpenITI,-OCR,-and-Textual-Criticism/ · https://github.com/OpenITI/0525AH/tree/master/data/0505Ghazali · https://www.wikidata.org/wiki/Special:EntityData/Q9546.json · https://shamela.ws/page/terms · https://tanzil.net/docs/text_license · https://github.com/fawazahmed0/hadith-api · https://docs.mlcommons.org/croissant/docs/croissant-spec.html · https://github.com/dasmiq/passim · https://en.wikipedia.org/wiki/Rule_of_three_(statistics) · https://id.wikisource.org/wiki/Undang-Undang_Republik_Indonesia_Nomor_28_Tahun_2014 · https://developers.cloudflare.com/d1/platform/limits/
- **Korpus, sedang:** https://github.com/OpenITI/0700AH/tree/master/data/0676Nawawi (daftar terpotong) · https://corpus.quran.com/license.jsp · https://github.com/mbzuai-oryx/KITAB-Bench
- **Bukti, tinggi:** https://doi.org/10.1037/a0037559 · https://doi.org/10.1037/bul0000309 · https://doi.org/10.1073/pnas.1821936116 · https://doi.org/10.1073/pnas.2422633122 · https://arxiv.org/abs/2404.01261 · https://arxiv.org/abs/2304.09848 · https://arxiv.org/abs/2405.20362 · https://platform.claude.com/docs/en/build-with-claude/citations · https://www.ftc.gov/reports/bringing-dark-patterns-light
- **Bukti, sedang:** https://doi.org/10.1177/1529100612453266 · https://doi.org/10.1029/2025CN000282 · https://doi.org/10.1093/eurjcn/zvaf074 · https://doi.org/10.1177/2158244016669550 · https://doi.org/10.1037/xge0001443 · https://doi.org/10.1007/s10648-019-09498-w · https://doi.org/10.1016/S0065-2601(06)38002-1 (rencana jika-maka d = 0,65; abstrak tak terbaca, angka dikonfirmasi lewat sumber sekunder) · https://www.futurity.org/ai-generated-podcasts-3323312/ (laporan pers atas studi AGU; hanya dari ringkasan hasil pencarian) · https://www.detik.com/hikmah/khazanah/d-8070039/ketua-mui-ai-tak-bisa-dijadikan-rujukan-hukum-agama. **Rendah:** https://arxiv.org/html/2608.20390v1 (Ansari, laporan sistem sendiri) · https://blog.duolingo.com/how-duolingo-streak-builds-habit/

## Batas riset ini

Anggaran pencarian habis: Sunnah.com, Turath, Magisterium AI tidak diperiksa. Teks penuh studi AGU dan help.sefaria.org (403) tidak terbaca. Paritas ID OpenITI-Shamela terbukti pada tiga karya; "tidak terlihat" di daftar OpenITI belum berarti "tidak ada"; pencocokan dinilai dari judul, bukan isi.
