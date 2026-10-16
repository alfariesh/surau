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

## Menyusul (Fase 2, belum ada di korpus)

- **Tanzil** 1.1 (CC BY 3.0, hanya verbatim): teks ayat Al-Qur'an. Wajib menyebut Tanzil Project dan menautkan https://tanzil.net.
- **Kementerian Agama RI** lewat **QuranEnc.com**, `indonesian_affairs` v1.0.1: terjemahan ayat, ditampilkan verbatim dengan nomor versinya.
