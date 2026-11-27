# Atribusi konten Surau

Konten Surau berlisensi **CC BY-NC-SA 4.0** ([LICENSE](LICENSE)). Siapa pun yang memakai ulang teks, struktur, terjemahan, ringkasan, indeks, atau dump korpus Surau wajib mencantumkan atribusi di bawah ini, tidak memakainya untuk tujuan komersial, dan membagikan karya turunannya dengan lisensi yang sama. Keputusan sumber dan lisensi: ADR-018, ADR-020, dan ADR-021 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md). Versi dan sha256 setiap berkas sumber: [SOURCES.md](SOURCES.md).

## Ihya' 'Ulum ad-Din (al-Ghazali, w. 505 H)

**Diarsipkan** sejak 2026-11-26 (ADR-142): tidak tayang di surau.org maupun MCP, dan tidak ada di halaman `/lisensi`. Atribusinya tetap dicatat di sini untuk korpus lama (`ihya-v1`–`ihya-v9`) dan bila kelak dibuka lagi.

Kalimat atribusi yang tampil di setiap halaman Surau dan di setiap respons API/MCP:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982

Rinciannya:

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed` (matan) dan `0505Ghazali.IhyaCulumDin.JK000001-ara1` (takhrij al-'Iraqi di dalam baris) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0525AH` commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 9472). Matan, struktur judul, dan catatan kaki dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/ihya-9472-openiti.md](reports/ihya-9472-openiti.md)) | https://shamela.ws/book/9472 (setiap halaman Surau menautkan `shamela.ws/book/9472/<page.id>`) |
| **Dar al-Ma'rifah, Beirut** | Penerbit edisi cetak: 4 jilid, 1402 H / 1982 M. Nomor jilid dan halaman di Surau mengikuti cetakan ini | Pindaian edisi (hanya ditautkan, tidak di-hosting): https://archive.org/details/ihya-ghazali |
| **Zain ad-Din al-'Iraqi** (w. 806 H) | Penulis takhrij *al-Mughni 'an Haml al-Asfar* yang menjadi catatan kaki edisi ini | – |

Perubahan yang dilakukan Surau atas teks tersebut (wajib disebut oleh CC BY-NC-SA, bagian 3(a)(1)(B)):

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Takhrij yang tercampur ke matan (ditandai `//` di sumber) dipindah ke catatan kaki dan ditandai perlu ditinjau.
- Daftar isi diperbaiki lewat patch yang di-commit ([patches/ihya-9472.yaml](patches/ihya-9472.yaml)): dua kitab Rub' al-Munjiyat yang hilang ditambahkan dan satu bayan dikembalikan ke levelnya.

## Bidayat al-Hidayah (al-Ghazali, w. 505 H)

Korpus `kitab-v10` (X31, ADR-135, ADR-137), tayang di produksi sejak promote Gelombang 1. Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0012718; digitalisasi asal: al-Maktaba al-Shamela; edisi: Maktabat Madbuli, Kairo 1413/1993

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0505Ghazali.BidayatHidaya.Shamela0012718-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0525AH` commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 12718). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/bidayat-al-hidayah-12718-openiti.md](reports/bidayat-al-hidayah-12718-openiti.md)) | https://shamela.ws/book/12718 |
| **Maktabat Madbuli, Kairo** | Penerbit edisi cetak: satu jilid, cetakan pertama 1413 H / 1993 M, tahqiq Muhammad Zainhum Muhammad 'Azab. Nomor halaman di Surau mengikuti cetakan ini | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.

## at-Tibyan fi Adab Hamalat al-Qur'an (an-Nawawi, w. 676 H)

Korpus `kitab-v10` (X31c, ADR-135, ADR-137, ADR-138, ADR-150), tayang di produksi sejak promote Gelombang 1. Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0001969; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar Ibn Hazm, Beirut 1414/1994, tahqiq Muhammad al-Hajjar; catatan kaki, mukadimah, faedah tambahan, dan kata penutup pentahqiq tidak disertakan

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0676Nawawi.Tibyan.Shamela0001969-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0700AH` commit `6dca5e250b9e4405b93c4a5e73cfffdef5d7fef7` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 1969). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/at-tibyan-1969-openiti.md](reports/at-tibyan-1969-openiti.md)) | https://shamela.ws/book/1969 |
| **Dar Ibn Hazm, Beirut** | Penerbit edisi cetak: satu jilid, cetakan ketiga 1414 H / 1994 M, tahqiq Muhammad al-Hajjar. Nomor halaman di Surau mengikuti cetakan ini | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Catatan kaki pentahqiq (Muhammad al-Hajjar) **tidak disertakan** (ADR-138): catatan itu karya penyunting modern di luar rilis OpenITI. Penanda nomor catatan di teks utama tetap ada sebagai teks biasa tanpa tautan.
- Teks badan tulisan pentahqiq **tidak disertakan** (ADR-150): mukadimah pentahqiq sebelum teks an-Nawawi (halaman cetak 5), bagian "al-Fawa'id al-Mazidah 'ala al-Kitab" (faedah tambahan, halaman 227–229), dan "Kalimat al-Khitam" (kata penutup bertanda tangan, halaman 230). Karya penyunting modern bisa masih dilindungi hak cipta; rilis OpenITI memuatnya, tetapi lisensi OpenITI tidak bisa memberikan hak atas karya penyunting. Daftar persisnya: [patches/at-tibyan-1969-pentahqiq.yaml](patches/at-tibyan-1969-pentahqiq.yaml).

## al-Ajurrumiyyah (Ibnu Ajurrum, w. 723 H)

Korpus `kitab-v10` (X31d, ADR-135, ADR-137, ADR-138, ADR-139), tayang di produksi sejak promote Gelombang 1. Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0011371; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar ash-Shumai'i, 1419/1998; catatan kaki penyunting tidak disertakan

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0723IbnAjrum.Ajrumiyya.Shamela0011371-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0725AH` commit `1c14df8ff4ca37622d678a3a7e76f915848f3f88` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 11371). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/al-ajurrumiyyah-11371-openiti.md](reports/al-ajurrumiyyah-11371-openiti.md)) | https://shamela.ws/book/11371 |
| **Dar ash-Shumai'i** | Penerbit edisi cetak: satu jilid, 1419 H / 1998 M. Nomor halaman di Surau mengikuti cetakan ini (halaman 5–23) | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Shamela memecah satu halaman cetak menjadi beberapa halaman per bab. Potongan berurutan dengan nomor cetak yang sama digabung menjadi satu halaman (31 halaman Shamela menjadi 19 halaman cetak; ADR-139). Urutan dan isi paragraf tidak berubah.
- Catatan kaki penyunting **tidak disertakan** (ADR-138): catatan itu karya penyunting modern di luar rilis OpenITI. Penanda nomor catatan di teks utama tetap ada sebagai teks biasa tanpa tautan.

## al-Munqidz min adh-Dhalal (al-Ghazali, w. 505 H)

Korpus `kitab-v11` (X32, ADR-152). Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009246; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Kutub al-Haditsah, Mesir, disertai Dr. 'Abd al-Halim Mahmud

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0505Ghazali.Munqidh.Shamela0009246-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0525AH` commit `6290621b58e063ed1aa47ffd0a6fc1630191e7cb` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 9246). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi dengan rilis OpenITI di atas (laporan: [reports/al-munqidz-min-adh-dhalal-9246-openiti.md](reports/al-munqidz-min-adh-dhalal-9246-openiti.md)) | https://shamela.ws/book/9246 |
| **Dar al-Kutub al-Haditsah, Mesir** | Penerbit edisi cetak (disertai kajian Dr. 'Abd al-Halim Mahmud). Nomor halaman di Surau mengikuti cetakan ini (halaman 101–207). Hanya teks al-Ghazali yang dimuat | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.

## at-Ta'rifat (asy-Syarif al-Jurjani, w. 816 H)

Direncanakan untuk korpus `kitab-v12` (X32, ADR-152), belum tayang. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0007312; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Kutub al-'Ilmiyyah, Beirut, cetakan pertama 1403/1983, disunting sekelompok ulama di bawah penerbit; daftar isi penerbit tidak disertakan

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0816IbnMuhammadSharifJurjani.Tacrifat.Shamela0007312-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0825AH` commit `2630748a4754b509908048087e569ccc8dd251ce` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 7312). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/at-tarifat-7312-openiti.md](reports/at-tarifat-7312-openiti.md)) | https://shamela.ws/book/7312 |
| **Dar al-Kutub al-'Ilmiyyah** | Penerbit edisi cetak: satu jilid, Beirut, cetakan pertama 1403 H / 1983 M, disunting dan dikoreksi sekelompok ulama di bawah penerbit. Nomor halaman di Surau mengikuti cetakan ini (halaman 5–260) | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Label jilid Shamela di puncak daftar isi tidak dimuat, dan bab-bab di bawahnya menjadi judul tingkat teratas (patch daftar isi, ADR-152).
- Daftar isi penerbit di akhir edisi (halaman cetak 261–262) **tidak disertakan** (ADR-150): bukan teks al-Jurjani. Daftar persisnya: [patches/at-tarifat-7312-pentahqiq.yaml](patches/at-tarifat-7312-pentahqiq.yaml).

## al-Muqaddimah al-Hadhramiyyah (Bafadl al-Hadrami, w. 918 H)

Korpus `kitab-v11` (X32, ADR-152). Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0006125; digitalisasi asal: al-Maktaba al-Shamela; edisi: ad-Dar al-Muttahidah, Damaskus, cetakan ke-2 1413 H, tahqiq Majid al-Hamawi

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0918BafadlHadrami.MuqaddimaHadramiyya.Shamela0006125-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0925AH` commit `4f0f4562d1e13083c593e3a0ca6a19a3eb33805e` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 6125). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/al-muqaddimah-al-hadhramiyyah-6125-openiti.md](reports/al-muqaddimah-al-hadhramiyyah-6125-openiti.md)) | https://shamela.ws/book/6125 |
| **ad-Dar al-Muttahidah**, Damaskus | Penerbit edisi cetak (cetakan ke-2, 1413 H), tahqiq Majid al-Hamawi. Nomor halaman di Surau mengikuti cetakan ini (halaman 19–162) | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Daftar isi disusun ulang lewat patch yang bisa diaudit ([patches/al-muqaddimah-al-hadhramiyyah-6125.yaml](patches/al-muqaddimah-al-hadhramiyyah-6125.yaml)): judul "kitab" dan "bab" yang di Shamela hanya teks sebaris menjadi node daftar isi, dan judul "fasl" dipindah ke bawahnya. Judul node disalin dari teks halaman.
- Edisi ini tanpa catatan kaki. Teks sumber memuat artefak konversi "صلى الله عليه وسلم" di sekitar judul bab (juga ada di OpenITI); teks tidak diubah.

## Rusum Dar al-Khilafah (Hilal ibn al-Muhassin ash-Shabi', w. 448 H)

Korpus `kitab-v11` (X32, ADR-152). Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0008173; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar ar-Ra'id al-'Arabi, Beirut, cetakan kedua 1986 M, tahqiq Mikha'il 'Awwad

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0448HilalSabi.RusumDarKhilafa.Shamela0008173-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0450AH` commit `e344cfe20a206c9ded3edfa15d45b4f821a97b8a` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 8173). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas (laporan: [reports/rusum-dar-al-khilafah-8173-openiti.md](reports/rusum-dar-al-khilafah-8173-openiti.md)) | https://shamela.ws/book/8173 |
| **Dar ar-Ra'id al-'Arabi** (Beirut), tahqiq **Mikha'il 'Awwad** | Penerbit edisi cetak: satu jilid, cetakan kedua 1986 M. Nomor halaman di Surau mengikuti cetakan ini (halaman 3–142) | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Edisi digital ini tidak memuat teks catatan kaki, mukadimah, atau lampiran pentahqiq. Dua penanda nomor catatan yang tersisa di teks utama tetap ada sebagai teks biasa tanpa tautan.

## al-Waraqat (Imam al-Haramain al-Juwaini, w. 478 H)

Korpus `kitab-v11` (X32, ADR-152). Rinciannya juga di halaman `/lisensi`. Kalimat atribusi:

> Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0006297; digitalisasi asal: al-Maktaba al-Shamela; edisi: tahqiq Dr. 'Abd al-Lathif Muhammad al-'Abd

| Pihak | Peran | Rujukan |
|---|---|---|
| **OpenITI** (Open Islamicate Texts Initiative), rilis 2025.1.9 | Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks. Versi `0478ImamHaramaynJuwayni.Waraqat.Shamela0006297-ara1` (matan) | Zenodo: https://zenodo.org/records/17767721 · repo `OpenITI/0500AH` commit `fff9e21790e2e54f14826322ae49ab7671f12744` |
| **al-Maktaba al-Shamela** | Digitalisasi asal edisi ini (kitab no. 6297). Matan dan struktur judul dibangun dari salinan lokal Shamela, lalu diverifikasi dengan rilis OpenITI di atas (laporan: [reports/al-waraqat-6297-openiti.md](reports/al-waraqat-6297-openiti.md)) | https://shamela.ws/book/6297 |
| **Edisi tahqiq Dr. 'Abd al-Lathif Muhammad al-'Abd** | Edisi cetak satu jilid. Nomor halaman di Surau mengikuti cetakan ini (halaman 7–31) | – |

Perubahan yang dilakukan Surau atas teks tersebut:

- HTML Shamela dibersihkan secara deterministik dan teks dipecah per paragraf; isi teks tidak diubah.
- Basmalah pembuka menjadi butir daftar isi tersendiri (ADR-152 butir 4); teksnya tidak diubah.

## Ayat Al-Qur'an (sejak korpus `ihya-v3`, S12)

Kutipan ayat di dalam kitab dikenali otomatis dan ditautkan ke surah:ayat. Teks ayat, terjemahan, dan transliterasi yang tampil di Surau disalin **verbatim** dari sumber berikut. Model AI tidak pernah menulis, mengubah, atau menerjemahkan ayat (ADR-020, ADR-040).

| Pihak | Peran | Rujukan |
|---|---|---|
| **Tanzil Project** | Teks ayat: *Tanzil Quran Text* versi 1.1, varian Uthmani (tampilan) dan Simple Clean (pencocokan kutipan), CC BY 3.0. Hanya boleh disalin verbatim; teks tidak diubah | https://tanzil.net · lisensi: https://tanzil.net/docs/text_license |
| **Kementerian Agama Republik Indonesia**, Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) | Terjemahan Al-Qur'an berbahasa Indonesia (beserta catatan kakinya) dan transliterasi Latin, ditampilkan verbatim. Salinan data milik pemilik Surau dari Qur'an Kemenag (2026-06-03) | https://quran.kemenag.go.id |

Pemberitahuan hak cipta Tanzil (wajib disertakan di salinan verbatim dan berkas turunan yang memuat sebagian besar teksnya, termasuk dump korpus Surau; teks lengkapnya juga tersimpan di kolom `quran_source.attribution` korpus):

```
Tanzil Quran Text (Uthmani, Version 1.1)
Copyright (C) 2007-2026 Tanzil Project
License: Creative Commons Attribution 3.0

This copy of the Quran text is carefully produced, highly
verified and continuously monitored by a group of specialists
at Tanzil Project.

TERMS OF USE:

- Permission is granted to copy and distribute verbatim copies
of this text, but CHANGING IT IS NOT ALLOWED.

- This Quran text can be used in any website or application,
provided that its source (Tanzil Project) is clearly indicated,
and a link is made to tanzil.net to enable users to keep
track of changes.

- This copyright notice shall be included in all verbatim copies
of the text, and shall be reproduced appropriately in all files
derived from or containing substantial portion of this text.

Please check updates at: http://tanzil.net/updates/
```

Yang dilakukan Surau: basmalah pembuka surah dipisah dari ayat 1 mengikuti atribut `bismillah` di XML Tanzil (teks ayat tidak diubah); teks Simple Clean dinormalisasi hanya di memori untuk mencocokkan kutipan, tidak untuk ditampilkan.
