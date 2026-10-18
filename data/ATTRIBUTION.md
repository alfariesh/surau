# Atribusi konten Surau

Konten Surau berlisensi **CC BY-NC-SA 4.0** ([LICENSE](LICENSE)). Siapa pun yang memakai ulang teks, struktur, terjemahan, ringkasan, indeks, atau dump korpus Surau wajib mencantumkan atribusi di bawah ini, tidak memakainya untuk tujuan komersial, dan membagikan karya turunannya dengan lisensi yang sama. Keputusan sumber dan lisensi: ADR-018, ADR-020, dan ADR-021 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md). Versi dan sha256 setiap berkas sumber: [SOURCES.md](SOURCES.md).

## Ihya' 'Ulum ad-Din (al-Ghazali, w. 505 H)

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
