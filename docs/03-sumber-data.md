# 03 · Sumber Data

## Ringkasan

| Sumber | Peran | Struktur | Lisensi |
|---|---|---|---|
| **Shamela lokal** (ekspor desktop Shamela 4) | Sumber utama untuk pengembangan | Lengkap: pohon judul, juz/halaman cetak, catatan kaki | Izin redistribusi **tidak jelas** |
| **OpenITI** (rilis 2025.1.9, Zenodo) | Sumber untuk data publik dan pelengkap karya yang tidak ada di Shamela | Markup mARkdown (judul, halaman), URI kanonik | **CC BY-NC-SA 4.0** (terverifikasi di Zenodo) |
| **HuggingFace** `MoMonir/shamela_books_text_full` | Cadangan dan pencarian kata kunci massal | Per halaman, catatan kaki terpisah, **tanpa pohon judul**, baris digabung | Berlabel Apache-2.0, tetapi hak atas teks tetap milik Shamela/penerbit |

## Shamela lokal

Lokasi: `/Volumes/Elfariesh/database`

```
book/{id % 1000, 3 digit}/{id}.db     ← satu SQLite per kitab
update/master/book.sqlite             ← katalog kitab (8.589 judul)
update/master/author.sqlite           ← 3.187 penulis + tahun wafat + biografi
update/master/category.sqlite         ← 40 kategori
```

Skema per kitab:

```sql
page(id, content, part /*juz*/, page /*halaman cetak*/, number, services)
title(id, content, page /*→ page.id*/, parent /*→ title.id, '0' = akar*/)
```

- Judul juga muncul di dalam teks halaman sebagai `<span data-type="title" id=toc-{title.id}>`, sehingga sebuah bagian bisa dipotong persis di batas judul.
- Catatan kaki ada di bagian bawah `content`, setelah garis `_________`. Nomornya `(١) (٢)` dan merujuk ke penanda yang sama di teks.
- **Salinan lokal belum lengkap:** baru 7.330 file kitab dari 8.589 judul di katalog.

## Temuan pada Ihya (ID 9472)

- **Edisi:** Dar al-Ma'rifah, Beirut, 4 juz, 1.706 halaman. Penomorannya sesuai cetakan.
- **Pohon judul:** 311 judul, 5 tingkat (rub' → kitab → bab → bayan). Sebanyak 309 dari 311 judul tertaut tepat ke halamannya.
- **Catatan kaki = takhrij al-'Iraqi** (*al-Mughni 'an Haml al-Asfar*). Contoh di juz 1 halaman 200: hadits-hadits shalat malam Jumat diberi keterangan "باطل لا أصل له". Takhrij al-'Iraqi juga tersedia sebagai kitab terpisah (ID 21550), dan ada takhrij gabungan al-'Iraqi, as-Subki, dan az-Zabidi (ID 38171).
- **Daftar isi perlu diperbaiki:**
  - Rub' al-Munjiyat hanya mencatat 8 kitab, padahal seharusnya 10. *Kitab at-Tafakkur* (mulai halaman id 1582, juz 4 halaman 423) dan *Kitab Dzikr al-Maut wa ma Ba'dahu* tidak punya entri judul, sehingga subbabnya menempel ke *Kitab al-Muraqabah*.
  - Di Rub' al-Muhlikat, satu "bayan" (title id 170) naik ke level kitab.
  - Pelajarannya: struktur setiap kitab harus divalidasi otomatis sebelum dipakai (jumlah kitab per rub', urutan halaman, judul yatim).

## Karya al-Ghazali di Shamela

Semua 21 judul atas nama penulis ID 619 ada di disk lokal, dan semuanya punya daftar isi:

المنخول · التبر المسبوك · المستصفى · الوسيط · قواعد العقائد · المقصد الأسنى · معارج القدس · فضائح الباطنية · أصناف المغرورين · الاقتصاد في الاعتقاد · المنقذ من الضلال · كيمياء السعادة · ميزان العمل · إحياء علوم الدين · جواهر القرآن · تهافت الفلاسفة · مشكاة الأنوار · بداية الهداية · شفاء الغليل · محك النظر · معيار العلم

Catatan:
- **Karya terkenal yang tidak ada di katalog Shamela:** *Ayyuha al-Walad*, *Maqasid al-Falasifa*, *Faysal at-Tafriqa*, *Minhaj al-'Abidin*, *Iljam al-'Awam*, *al-Qistas al-Mustaqim*, dan *al-Wajiz*. Karya-karya ini perlu diambil dari OpenITI.
- **Tumpang tindih dengan Ihya:** *Qawa'id al-'Aqa'id* adalah bagian dari Ihya, dan *Asnaf al-Maghrurin* tampaknya diambil dari Ihya. Keduanya perlu dideduplikasi.
- **Atribusi dan bahasa asli:** *Ma'arij al-Quds* diragukan sebagai karya beliau. *Kimiya as-Sa'adah* aslinya berbahasa Persia, dan versi Arabnya adalah terjemahan.

## Daftar kurikulum (CSV di folder data)

File `classics_db_match_report.csv`, `dkislamiyah_db_match_report.csv`, dan `hasil_pencarian_kitab.csv` berisi upaya mencocokkan daftar kitab ke katalog Shamela.

- **Sekitar 92 kitab cocok dengan kuat,** totalnya ±140 ribu halaman dan ±98 juta token.
- **Penyebab sebagian kegagalan:** separuh judul berstatus NOT_FOUND di `dkislamiyah` (24 dari 48) memakai karakter Arab *presentation form* (hasil salin dari PDF). Normalisasi dengan NFKC sebelum mencocokkan ulang.

## Kebijakan data (ringkas)

- **Repo publik tidak memuat database Shamela.** Pipeline membaca Shamela milik pengguna secara lokal.
- **Data yang dipublikasikan diutamakan dari OpenITI,** dengan lisensi CC BY-NC-SA 4.0. Turunannya wajib berlisensi sama dan tidak untuk tujuan komersial.
- **Gunakan URI OpenITI sebagai ID kanonik** bila tersedia, supaya Surau bisa bertukar data dengan proyek digital humanities lain.
- **Izin Shamela:** hubungi pengelola Shamela bila ingin mempublikasikan turunan dari data mereka.
