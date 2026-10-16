# 03 · Sumber Data

Fakta di dokumen ini dicek pada 15 Okt 2026. Keputusan tentang sumber teks dan lisensi ada di ADR-018, ADR-020, dan ADR-021 (lihat [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)). Cara pipeline memakai sumber-sumber ini ada di [ARSITEKTUR-TEKNIS §6](../implementasi/ARSITEKTUR-TEKNIS.md).

## Ringkasan

| Sumber | Peran di Surau | Versi / pin | Lisensi & syarat |
|---|---|---|---|
| **Shamela lokal** (ekspor desktop Shamela 4) | Bahan baku matan, pohon judul, halaman cetak, dan catatan kaki takhrij. Dibaca lokal oleh pipeline, **tidak pernah masuk repo** | Salinan di drive pemilik (7.330 dari 8.589 judul) | Syarat Shamela (19 Sep 2026) **tidak memberi hak pakai ulang** |
| **OpenITI** `…IhyaCulumDin.Shamela0009472-ara1.completed` | Pembanding matan (gerbang QA `verify-openiti`) dan dasar rantai lisensi teks publik | Rilis 2025.1.9, commit `e8dddd44…` | **CC BY-NC-SA 4.0** |
| **OpenITI** `…IhyaCulumDin.JK000001-ara1` | Pembanding takhrij al-'Iraqi; cadangan | Rilis dan commit yang sama | **CC BY-NC-SA 4.0** |
| **Tanzil** | Teks ayat: `simple-clean` untuk pencocokan, `uthmani` untuk tampilan | 1.1 (12 Feb 2021) | CC BY 3.0, **hanya verbatim**, wajib pemberitahuan dan tautan tanzil.net |
| **QuranEnc** `indonesian_affairs` | Terjemahan Kemenag, ditampilkan verbatim | v1.0.1 (diperbarui 23 Jun 2025) | Tanpa perubahan; sebut Kemenag, QuranEnc.com, dan nomor versi |
| **shamela.ws** dan **archive.org** | Tautan saja: halaman Shamela per `page.id` dan pindaian edisi cetak untuk verifikasi | – | Tidak disalin, tidak di-hosting ulang |

Konten turunan Surau (teks, terjemahan dan ringkasan AI, indeks, dump) berlisensi CC BY-NC-SA 4.0, terpisah dari kode Apache-2.0 (lihat ADR-021 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)). Opsi sumber yang tidak dipakai ada di [Opsi yang ditolak](#opsi-yang-ditolak).

## Shamela lokal

Lokasi: `/Volumes/Elfariesh/database`. Drive ini dipasang pemilik setiap kali ada sesi yang membangun ulang korpus (T-09 di [implementasi/TUGAS-PEMILIK.md](../implementasi/TUGAS-PEMILIK.md)). Pipeline membacanya **read-only** dengan `node:sqlite` dan tidak pernah menulis ke drive ini (lihat ADR-007 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)).

```
book/{id % 1000, 3 digit}/{id}.db     ← satu SQLite per kitab
update/master/book.sqlite             ← katalog kitab (8.589 judul)
update/master/author.sqlite           ← 3.187 penulis + tahun wafat + biografi
update/master/category.sqlite         ← 40 kategori
```

Skema per kitab:

```sql
page(id, content, part /*juz*/, page /*halaman cetak, bertipe TEXT*/, number, services)
title(id, content, page /*→ page.id, BUKAN halaman cetak*/, parent /*→ title.id, '0' = akar*/)
```

- **Halaman cetak = (`part`, `page`).** Kolom `page` bertipe TEXT, sehingga `max(page)` menghasilkan `'99'`. Selalu cast ke integer.
- **`title.page` menunjuk ke `page.id`.** Judul juga muncul di dalam teks halaman sebagai `<span data-type="title" id=toc-{title.id}>`, sehingga sebuah bagian bisa dipotong persis di batas judul.
- **Paragraf dipisah `\r`** (CR), bukan `\n`.
- **Catatan kaki** ada di bagian bawah `content`, setelah garis **tepat 9** garis bawah (`\r_________\r`). Nomornya memakai angka Arab-India `(١) (٢)` dan merujuk ke penanda yang sama di teks.
- **Takhrij bisa bercampur ke matan** setelah `//` (lihat temuan Ihya di bawah).
- **Harakat parsial:** di Ihya, sekitar 10,8% kata bervokal sebagian. Karena itu teks dinormalisasi di kode sebelum diindeks (lihat [eksperimen pencarian Arab](riset/2026-10-15-pencarian-arab/README.md)).
- **Permalink balik:** URL `shamela.ws/book/9472/{page.id}` memetakan langsung ke `page.id` lokal (id 5 = j1 h5). Surau menautkan setiap halaman ke sana.
- **Salinan lokal belum lengkap:** baru 7.330 file kitab dari 8.589 judul di katalog.

## Temuan pada Ihya (ID 9472)

- **Edisi:** Dar al-Ma'rifah, Beirut 1402/1982, 4 jilid, 1.706 halaman (jilid 1–4: 361/386/413/546). Penomorannya sesuai cetakan.
- **Ukuran:** 5.511.044 karakter, ±991 ribu kata, dan 20.738 paragraf (16.080 badan teks, 4.658 catatan kaki).
- **Pohon judul:** 311 judul, 5 tingkat (rub' → kitab → bab → bayan). Sebanyak 309 dari 311 judul tertaut tepat ke halamannya.
- **Catatan kaki = takhrij al-'Iraqi** (*al-Mughni 'an Haml al-Asfar*), ada di 1.124 halaman. Contoh di juz 1 halaman 200: hadits-hadits shalat malam Jumat diberi keterangan "باطل لا أصل له". Takhrij al-'Iraqi juga tersedia sebagai kitab terpisah (ID 21550), dan ada takhrij gabungan al-'Iraqi, as-Subki, dan az-Zabidi (ID 38171).
- **Takhrij bercampur:** 203 halaman punya takhrij yang menempel ke matan dengan `//` sebagai batas (contoh j1 h179). Arahnya tidak seragam (diukur di S07): di 130 halaman takhrij ada **sesudah** `//`, di 64 halaman **sebelum** `//` (matan berlanjut sesudahnya), dan di 9 halaman `//` berdiri tanpa takhrij. Akhir takhrij "sesudah `//`" tidak ditandai, jadi potongannya bisa ikut membawa matan. Cacat yang sama ada di OpenITI. Pipeline memindahkan potongan takhrij ke catatan kaki dan menandainya `needs_review` (ADR-032; daftar halamannya di `data/reports/ihya-9472-validasi.md`).
- **Daftar isi perlu diperbaiki:**
  - Rub' al-Munjiyat hanya mencatat 8 kitab, padahal seharusnya 10. *Kitab at-Tafakkur* (mulai halaman id 1582, juz 4 halaman 423) dan *Kitab Dzikr al-Maut wa ma Ba'dahu* tidak punya entri judul, sehingga subbabnya menempel ke *Kitab al-Muraqabah*.
  - Di Rub' al-Muhlikat, satu "bayan" (title id 170) naik ke level kitab.
  - Perbaikannya dicatat di file patch `data/patches/ihya-9472.yaml` (S07), bukan dengan mengubah sumber.
  - Pelajarannya: struktur setiap kitab harus divalidasi otomatis sebelum dipakai (jumlah kitab per rub', urutan halaman, judul yatim).

## OpenITI: dua versi Ihya

Rilis terbaru OpenITI adalah **2025.1.9** (Zenodo, terbit 30 Des 2025, CC BY-NC-SA 4.0, 13.320 teks Arab). Rilis sebelumnya 2023.1.8. File Ihya diambil dari repo `OpenITI/0525AH` yang **dipin ke commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e`** (27 Nov 2025), karena branch `master` bisa berubah. Sha256 setiap file dicatat di `data/SOURCES.md`.

Metadata rilis 2025.1.9 memuat dua versi Ihya, keduanya dari edisi Dar al-Ma'rifah, Beirut:

| | `Shamela0009472-ara1.completed` | `JK000001-ara1` |
|---|---|---|
| Status di metadata | Sekunder (tag FOOTNOTES, COMPLETED) | Primer (tag PRIMARY_VERSION, CLEANED_VERSION) |
| Panjang | 829.728 kata | 992.076 kata |
| Penanda halaman | 1.706 | 1.706, urutan identik |
| Judul | 667, berjenjang (`### \|`, jumlah pipa = level) | 448, satu level (`# \|`) |
| Takhrij al-'Iraqi | Praktis hilang atau bercampur ke teks. Catatan kualitas versi ini menandai `ISSUES: FOOTNOTES`. Frasa متفق عليه hanya muncul 45 kali, padahal di Shamela lokal ada di 388 halaman | Ada di dalam baris, diapit ` + ` (4.301 segmen di 1.188 halaman) |
| Tag ayat | – | `@QB@…@QE@`, tidak andal (contoh: `@QB@ الأول @QE@`) |
| Peran di Surau | Pembanding matan dan dasar lisensi | Pembanding takhrij; cadangan |

**Hasil pemeriksaan:**

- **Halaman identik.** Kedua versi punya 1.706 penanda `PageV01P001`…`PageV04P546` dengan urutan yang sama, dan pembagiannya per jilid (361/386/413/546) sama persis dengan Shamela lokal.
- **Matan identik.** Setelah normalisasi, matan `Shamela0009472` dibandingkan per halaman dengan matan Shamela lokal: median kemiripan 1,0, dan **1.705 dari 1.706 halaman ≥0,95**. Inilah dasar rantai lisensi teks publik (ADR-018).

**Jebakan saat parsing:**

- **Penanda halaman ada di AKHIR halaman.** Teks sebelum `PageV01P005` adalah isi halaman 5. Bila arahnya terbalik, semua sitasi bergeser satu halaman.
- Gabungkan baris lanjutan `~~`. Saat membandingkan, abaikan milestone `ms\d+` dan tag `@QB@`/`@QE@`. Milestone tidak boleh dihapus dari file sumber.
- Pasangan ` + ` di JK000001 tidak andal secara global (paritasnya bergeser antarhalaman). Parse per halaman dan klasifikasikan segmen yang diawali حديث.
- Hitungan `tok_length` OpenITI adalah **kata Arab, bukan token LLM**. Token LLM diukur dengan `count_tokens` di S13.

## Syarat Shamela dan layanan AI Shamela

- **Syarat Shamela** (diperbarui 19 Sep 2026, juga berlaku untuk layanan MCP-nya): hak atas buku dan edisi tetap pada pemiliknya. Syarat itu **tidak memberi hak pakai ulang** di luar izin pemilik hak atau hukum yang berlaku, dan melarang membangun ulang indeks penuh dengan mengakali batas.
- **MCP publik resmi** di `https://mcp.shamela.ws/` (v8.1.0, protokol MCP 2025-06-18, tanpa autentikasi) dengan 4 tool read-only: `shamela_find`, `shamela_find_scoped`, `shamela_open`, dan `shamela_open_many`.
- **"اسأل الشاملة"** (shamela.ws/ai): tanya-jawab AI dengan rujukan dan pratinjau halaman sumber, login Google/Apple, dan berkuota.

Akibatnya bagi Surau:

- Teks Shamela tidak ditampilkan publik tanpa rantai lisensi OpenITI (ADR-018).
- MCP Shamela hanya dipelajari sebagai referensi desain, bukan sumber data atau dependensi.
- Surau tidak bersaing dalam pencarian Arab lintas kitab. Pembedanya: bahasa Indonesia, kedalaman per kitab, kutipan yang diverifikasi kode, permalink halaman cetak, dan review ustadz (lihat ADR-022 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)).

## Al-Qur'an dan terjemahan Kemenag

Dikerjakan di Fase 2 ([S12](../implementasi/sesi/S12-ayat-kemenag.md)). Keputusannya ada di ADR-020 (lihat [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)).

**Teks ayat: Tanzil 1.1**

- Lisensi CC BY 3.0. Teks boleh disalin dan didistribusikan **verbatim**, tetapi tidak boleh diubah. Wajib menyebut Tanzil Project, menautkan ke tanzil.net, dan menyertakan pemberitahuan hak cipta.
- `simple-clean` dipakai untuk indeks pencocokan, `uthmani` untuk tampilan. Normalisasi disimpan di kolom indeks terpisah; yang ditampilkan selalu teks asli.
- **Uji pada Ihya:** 97,2% (950 dari 977) bentang `{…}` multi-kata cocok persis dengan `simple-clean` setelah normalisasi ringan. Sisanya berbeda ejaan (أولوا/أولو, يدرؤون/يدرءون), sehingga dicocokkan fuzzy per token dan diberi label "mirip".
- Kurung `{…}` di Shamela juga dipakai untuk penomoran, dan tag `@QB@` di JK000001 tidak andal. Karena itu sebuah bentang baru diakui sebagai ayat bila cocok dengan Tanzil.

**Terjemahan: QuranEnc `indonesian_affairs` (Kemenag)**

- Versi 1.0.1, diperbarui 23 Jun 2025. Syarat pakainya eksplisit: tanpa perubahan, menyebut penerbit dan QuranEnc.com, menyebut nomor versi, memperbarui ke versi terbaru, dan tanpa iklan yang tidak pantas.
- Penanda catatan kaki di dalam teks terjemahan (seperti `[5]`) ditampilkan apa adanya.
- QuranEnc juga punya `indonesian_complex` (Kemenag edisi lama, v1.0.1) dan `indonesian_sabiq` (v1.1.3). Keduanya tidak dipakai.
- **Ayat tidak pernah diterjemahkan LLM.** Dalam batch terjemahan (S13), bentang ayat diganti placeholder lalu diisi terjemahan Kemenag verbatim.
- **Belum diverifikasi:** apakah `indonesian_affairs` sama dengan Terjemahan Kemenag Edisi Penyempurnaan 2019. Dugaan ini hanya berdasarkan gaya terjemahannya.
- **Masih terbuka:** apakah PMA 44/2016 (tashih) berlaku untuk aplikasi yang hanya mengutip ayat di dalam kitab, bukan menampilkan mushaf. Tanyakan ke LPMQ bila perlu.

## Karya al-Ghazali di Shamela

Semua 21 judul atas nama penulis ID 619 ada di disk lokal, dan semuanya punya daftar isi:

المنخول · التبر المسبوك · المستصفى · الوسيط · قواعد العقائد · المقصد الأسنى · معارج القدس · فضائح الباطنية · أصناف المغرورين · الاقتصاد في الاعتقاد · المنقذ من الضلال · كيمياء السعادة · ميزان العمل · إحياء علوم الدين · جواهر القرآن · تهافت الفلاسفة · مشكاة الأنوار · بداية الهداية · شفاء الغليل · محك النظر · معيار العلم

Catatan:
- **Karya terkenal yang tidak ada di katalog Shamela:** *Ayyuha al-Walad*, *Maqasid al-Falasifa*, *Faysal at-Tafriqa*, *Minhaj al-'Abidin*, *Iljam al-'Awam*, *al-Qistas al-Mustaqim*, dan *al-Wajiz*. Karya-karya ini perlu dicari di OpenITI; ketersediaannya per judul belum diverifikasi.
- **Tumpang tindih dengan Ihya:** *Qawa'id al-'Aqa'id* adalah bagian dari Ihya, dan *Asnaf al-Maghrurin* tampaknya diambil dari Ihya. Keduanya perlu dideduplikasi.
- **Atribusi dan bahasa asli:** *Ma'arij al-Quds* diragukan sebagai karya beliau. *Kimiya as-Sa'adah* aslinya berbahasa Persia, dan versi Arabnya adalah terjemahan.
- **Lisensi (Fase 5):** sebelum tampil publik, setiap karya butuh versi OpenITI yang dicek seperti Ihya. Karya tanpa versi OpenITI butuh kebijakan lisensi per kitab (ADR-018).

## Daftar kurikulum (CSV di folder data)

File `classics_db_match_report.csv`, `dkislamiyah_db_match_report.csv`, dan `hasil_pencarian_kitab.csv` berisi upaya mencocokkan daftar kitab ke katalog Shamela.

- **Sekitar 92 kitab cocok dengan kuat,** totalnya ±140 ribu halaman dan ±98 juta token.
- **Penyebab sebagian kegagalan:** separuh judul berstatus NOT_FOUND di `dkislamiyah` (24 dari 48) memakai karakter Arab *presentation form* (hasil salin dari PDF). Normalisasi dengan NFKC sebelum mencocokkan ulang.
- **Belum dicek:** berapa dari 92 kitab itu yang punya versi OpenITI (lihat metadata TSV rilis 2025.1.9). Kitab tanpa versi OpenITI butuh kebijakan lisensi tersendiri sebelum masuk Fase 7.

## Kebijakan data

Ringkasan dari ADR-018 dan ADR-021 (keduanya masih **diusulkan** dan menunggu persetujuan pemilik, P-6) di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md).

- **Tidak ada teks kitab di git.** Database Shamela, unduhan OpenITI/Tanzil/QuranEnc, dan hasil build tinggal di `data/raw/` dan `data/build/` (di luar git). Yang di-commit hanya `data/LICENSE`, `data/ATTRIBUTION.md`, `data/SOURCES.md` (versi + sha256 sumber), `data/patches/`, dan `data/reports/`. Fixture tes tidak boleh memuat teks Shamela.
- **Teks Ihya publik:** matan dan struktur dibangun dari Shamela lokal, lalu hanya dirilis bila lolos gerbang `verify-openiti` (kemiripan ≥0,95 di ≥1.705 dari 1.706 halaman). Takhrij diambil dari catatan kaki Shamela dan dicek silang dengan JK000001; yang tidak cocok ditandai `needs_review`.
- **Atribusi di setiap halaman:** *"Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982"*, ditambah tautan ke `shamela.ws/book/9472/{page.id}`. Pindaian archive.org (edisi Dar al-Ma'rifah beserta al-Mughni, 4 jilid, tanpa lisensi eksplisit) hanya ditautkan. Selisih nomor halaman PDF terhadap halaman cetak perlu dikalibrasi per jilid.
- **Lisensi terpisah:** kode memakai Apache-2.0 (`LICENSE`). Konten turunan (teks, terjemahan dan ringkasan AI, indeks, dump) memakai CC BY-NC-SA 4.0 (`data/LICENSE`). Terjemahan dan ringkasan AI atas teks Ihya adalah *Adapted Material*, jadi tidak boleh ditaruh di bawah Apache-2.0. `data/ATTRIBUTION.md` mencantumkan OpenITI, Shamela, Dar al-Ma'rifah, Tanzil, dan Kemenag/QuranEnc beserta versinya.
- **Nirlaba (klausul NC):** tanpa iklan, paywall, atau penjualan akses atas konten. Donasi untuk organisasi nirlaba tetap boleh.
- **Setiap respons MCP dan API** memuat field `license` dan `attribution`.
- **URI OpenITI sebagai ID kanonik** bila tersedia (kolom `work.openiti_uri`, contoh `0505Ghazali.IhyaCulumDin`), supaya Surau bisa bertukar data dengan proyek digital humanities lain.
- **Pemberitahuan ke Shamela:** pemilik mengirim email sopan ke pengelola al-Maktaba al-Shamela sebelum rilis Fase 1 (T-10, drafnya ada di [implementasi/TUGAS-PEMILIK.md](../implementasi/TUGAS-PEMILIK.md)). Jawabannya disimpan di repo. Bila Shamela keberatan, ADR-018 ditinjau ulang.
- **Dataset pihak ketiga dengan lisensi lain** (misalnya IslamicEval, CC BY-SA 4.0 dan GPL-3.0) hanya dipakai untuk eval internal dan tidak diredistribusikan bersama data Surau.

## Opsi yang ditolak

| Opsi | Alasan |
|---|---|
| HuggingFace `MoMonir/shamela_books_text_full` (dulu cadangan dan pencarian massal) | Berlabel Apache-2.0, tetapi hak atas teks tetap milik Shamela/penerbit. Tanpa pohon judul dan barisnya digabung. Shamela lokal + OpenITI sudah mencukupi |
| OpenITI `Shamela0009472` saja | Takhrij hilang, padahal status hadits bergantung pada takhrij |
| OpenITI `JK000001` saja | Judul datar, pasangan ` + ` dan tag ayat tidak andal. Tetap dipakai untuk cek silang takhrij dan sebagai cadangan |
| Teks Shamela tanpa rantai lisensi OpenITI | Syarat Shamela tidak memberi hak pakai ulang |
| MCP Shamela sebagai sumber data | Syarat Shamela melarang membangun ulang indeks penuh. Cukup dipelajari sebagai referensi desain |
| API Quran Foundation (Quran.com) untuk teks ayat | Cache maksimal 1 minggu, dilarang mendistribusikan database atau bundel siap pakai, dan butuh kredensial OAuth. Paling jauh dipakai nanti untuk audio atau tafsir lewat backend |
| npm `quran-json` | Deprecated; terjemahannya tanpa hak redistribusi |
| Scraping situs atau web-api Kemenag | Tidak ada syarat publik atau API resmi yang terdokumentasi |
| Terjemahan ayat oleh LLM | Bertentangan dengan prinsip Surau dan berisiko secara keagamaan |
| Hosting ulang pindaian archive.org | Tidak berlisensi eksplisit; cukup ditautkan |

## Rujukan

- OpenITI rilis 2025.1.9: https://zenodo.org/records/17767721 · repo Ihya: https://github.com/OpenITI/0525AH/tree/master/data/0505Ghazali/0505Ghazali.IhyaCulumDin · format mARkdown: https://alraqmiyyat.github.io/mARkdown/
- Syarat Shamela: https://shamela.ws/page/terms · MCP Shamela: https://mcp.shamela.ws/ · اسأل الشاملة: https://shamela.ws/ai
- Tanzil: https://tanzil.net/docs/text_license · https://tanzil.net/updates/ · https://tanzil.net/download/
- QuranEnc: https://quranenc.com/en/home/api/ · https://quranenc.com/en/browse/indonesian_affairs
- Syarat Quran Foundation: https://api-docs.quran.foundation/legal/developer-terms/
- CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en
- Pindaian Ihya Dar al-Ma'rifah: https://archive.org/details/ihya-ghazali
