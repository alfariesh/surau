# QA pilot terjemahan Inggris lewat plugin (X27) · 2026-10-28

Pilot skill `terjemah-inggris` (ADR-132) untuk bab **100007** (keutamaan mengajar). Isinya 18 paragraf badan dan 1.753 kata Inggris, dengan 7 placeholder ayat dan 17 penanda catatan kaki. Semua penilaian di sini **penilaian AI, bukan tinjauan manusia** (ADR-105). Teks kitab tidak dimuat di laporan ini.

| Lapis | Hasil |
|---|---|
| Penerjemah | Agen Claude Code, **Sonnet 5.5**, mengikuti skill plugin. Bahan diambil dari `pnpm terjemah bahan` (fungsi yang sama dengan tool MCP `list_translation_units`). |
| 1. Cek kode (`checkTranslationDraft`) | lolos tanpa peringatan; penilaian di putaran 2 dicap ulang |
| 2. Periksa mandiri (Sonnet, percakapan yang sama) | 18 benar |
| 3. Periksa independen putaran 1 (Sonnet, konteks segar, 18 butir) | **14 benar, 3 kurang, 1 salah**: tidak lolos |
| 3. Periksa independen putaran 2 atas versi final (agen baru, 18 butir) | **16 benar, 2 kurang, 0 salah**: lolos, status `siap` |

## Temuan putaran 1 dan perbaikannya

- **Salah, butir 8 (p148):** pelaku "mengamalkan" pada atsar Umar tertukar. Terjemahan membuat penyampai hadits sekaligus pengamalnya; sumber (dan konteks bab) berarti hadits yang disampaikan lalu diamalkan orang lain. Diperbaiki.
- **Kurang, butir 18 (p158):** glosa tambahan "traced back to the Prophet" dan salawat yang tidak ada di sumber. Dibuang.
- **Kurang, butir 7 (p136):** tata bahasa dua majelis ("One of them were …"). Diperbaiki.
- **Kurang, butir 5 (p134):** formula salawat untuk Nabi Isa tidak mengikuti glosarium. Diperbaiki, dan glosarium kini menyebut kasus ini.
- **Butir 3 (p125):** satu kata lafaz ayat tersisa di luar placeholder (rentang ayat yang dikenali sedikit lebih pendek). Penerjemah tidak menerjemahkannya, dan pemeriksa menyatakan itu benar karena ayat tidak pernah diterjemahkan model. Aturan skill kini menyebutnya eksplisit.

## Pelajaran

- **Periksa mandiri tidak cukup.** Sonnet menilai karyanya sendiri 18 benar, sedangkan penilai independen menemukan satu Salah (pelaku tertukar, pola kesalahan terbanyak T-17). Lapis 3 wajib untuk setiap berkas.
- Tidak ada huruf Arab ketikan model di berkas: hanya angka penanda catatan kaki, dicek kode dan skrip.
- **Kurang yang tersisa** (bahan versi berikutnya): butir 15, "their own fathers and mothers" bisa terbaca sebagai orang tua para ulama; butir 18, "devoting it" untuk *badhl*, dan "to Allah" tersirat saja.
- **Biaya API: US$0.** Kuota langganan untuk satu bab 18 paragraf: satu penerjemah dan dua penilai, ±400 ribu token agen. Kebutuhan kuota per bab perlu dipantau sebelum produksi besar.

## Bab 100008 (bukti akal keutamaan ilmu)

21 paragraf tanpa ayat dan catatan kaki. Penerjemahnya Sonnet 5.5 dengan plugin 0.2.1.

| Lapis | Hasil |
|---|---|
| 1. Cek kode | lolos tanpa peringatan |
| 2. Periksa mandiri | 18 benar, 3 kurang |
| 3. Periksa independen (Sonnet, konteks segar, 21 butir) | **18 benar, 3 kurang, 0 salah**: lolos pada putaran pertama, status `siap` |

Kurang yang tersisa, bahan versi berikutnya:
- **butir 3 (p166):** *sil'a* sebaiknya "an extra lump", dan "to anything" dibuang;
- **butir 18 (p181):** "of either" menutup ambiguitas kata ganti sumber;
- **butir 19 (p182):** frasa "akal rasional atas yang bahasa" kemungkinan **salah cetak edisi** ("ilmu" tertulis "akal"). Diterjemahkan sesuai cetakan, dan perlu dicek ke edisi lain sebelum dipatch (`data/patches`).

## Batch Kitab al-'Ilm 1 · 2026-10-29

Lima bagian (134 paragraf) diterjemahkan paralel oleh Sonnet 5.5 (plugin 0.2.1) dan dinilai seluruh butirnya oleh penilai independen Sonnet dengan konteks segar.

| Bagian | Paragraf | Periksa mandiri | Periksa independen | Status |
|---|---|---|---|---|
| 100005 | 40 | B37/K3/S0 | **B39/K1/S0** | siap |
| 100006 | 12 | B12 | **B10/K2/S0** | siap |
| 100013 | 22 | B17/K5/S0 | putaran 1 B16/K6, lalu 1 Salah ditetapkan dari sumber; putaran 2 sesudah perbaikan **B17/K5/S0** | siap |
| 100015 | 28 | B25/K3/S0 | **B23/K5/S0** | siap |
| 100016 | 32 | B23/K9/S0 | **B27/K5/S0** | siap |

**Temuan penting, 100013 butir 21 (p456):**
- Kata *fahdzarhum* sesudah "firman-Nya" adalah lafaz QS 63:4 yang tidak ditandai placeholder (rentang ayat tidak dikenali). Penerjemah menerjemahkannya ("so beware of them").
- Penilai independen mencurigainya, dan pemanggil memastikannya dari teks sumber. Karena ini pelanggaran aturan ayat, butir dinilai **Salah**.
- Perbaikannya: lafaz ayat tidak diterjemahkan, dan kalimat berhenti pada "His saying, Most High". Aturan skill diperketat (plugin 0.2.2), lalu bagian ini dinilai ulang.
- Pola ini juga menunjukkan celah data: kutipan ayat pendek tanpa `passage_ayah_ref`. Celah ini dicatat untuk pencocok ayat.

**Pertanyaan terbuka untuk peninjau manusia, 100005 butir 7 (p45):**
- Penulis menjelaskan tiga kata ayat (QS 7:26) satu per satu ("X artinya ilmu").
- Penerjemah menulis ketiga kata itu dalam transliterasi Latin, tanpa menerjemahkannya, supaya penjelasan penulis tetap terbaca. Penilai independen menerimanya.
- Transliterasi ayat di Surau biasanya dari Kemenag, jadi ini perlu dipastikan peninjau.

## Batch Kitab al-'Ilm 2 · 2026-10-29

Tujuh berkas dengan 152 paragraf disimpan (155 diterjemahkan, 3 ditunda). Penerjemahnya Sonnet 5.5 (plugin 0.2.2), dan setiap berkas dinilai seluruh butirnya oleh penilai independen dengan konteks segar.

| Berkas | Paragraf | Periksa independen (final) | Catatan |
|---|---|---|---|
| 100012 (bag. 1) | 24 | B21/K3/S0 | putaran 1: 1 Salah (lafaz QS 6:79 tanpa placeholder diterjemahkan); p385 dan p386 ditunda |
| 100012 (bag. 2) | 26 | B25/K1/S0 | |
| 100018 (bag. 1) | 20 | B18/K2/S0 | putaran 1: 1 Salah (iqtibas QS 32:12 diterjemahkan); p637 ditunda |
| 100018 (bag. 2) | 21 | B17/K4/S0 | |
| 100021 | 11 | B7/K4/S0 | lafaz ayat "cahaya" sesudah "firman-Nya" tidak diterjemahkan |
| 100022 | 33 | B29/K4/S0 | lafaz ayat di p1031 dan p1033 tidak diterjemahkan |
| 100023 | 17 | B16/K1/S0 | |

**Pola utama:** lafaz ayat yang tidak dikenali pencocok ayat muncul di tiga dari tujuh berkas.
- Bila lafaz itu didahului "firman-Nya", penerjemah menahannya dengan benar.
- Bila lafaz itu dikutip sebagai ucapan orang (p385) atau dijalin ke kalimat penulis (p637), penerjemah ikut menerjemahkannya, dan penilai menangkapnya.

Paragraf seperti itu kini ditunda ([daftar tunda](../terjemah/tunda-en.md)) sampai rujukan ayatnya dipatch ke korpus. Terjemahan Indonesia yang tayang kemungkinan memuat masalah yang sama dan perlu dicek di sesi pencocok ayat.

## Batch Kitab al-'Ilm 3 · 2026-10-29

Lima berkas dengan 194 paragraf disimpan (197 diterjemahkan, 3 ditunda oleh penerjemah karena lafaz ayat yang dijalin ke kalimat). Penerjemahnya Sonnet 5.5, dan penilai independen memeriksa seluruh butir.

| Berkas | Paragraf | Periksa independen (final) | Catatan |
|---|---|---|---|
| 100010 (bag. 1) | 39 | B38/K1/S0 | p225 ditunda (QS 32:7-8 dijalin); p235 kemungkinan salah cetak edisi |
| 100010 (bag. 2) | 40 | B37/K3/S0 | putaran 1: 1 Salah (negasi "bukan ilmu sehingga tidak dicantumkan" terbalik), diperbaiki |
| 100010 (bag. 3) | 38 | B36/K2/S0 | |
| 100017 (bag. 1) | 40 | B40/K0/S0 | putaran 1: 1 Salah (Khidr dan Musa: pelaku "tidak sabar" terbaca Khidr), diperbaiki; sikap al-Ghazali soal riwayat anjing dan rumah (letak kesalahan Intisari lama) terjaga |
| 100017 (bag. 2) | 37 | B35/K2/S0 | p608 dan p615 ditunda (lafaz ayat dijalin) |

**Pola Salah sejauh ini:**
- lafaz ayat tanpa penanda;
- pelaku tertukar karena kata ganti dalam kisah;
- negasi yang terbalik oleh anak kalimat "sehingga".

Ketiganya tertangkap penilai independen, bukan oleh periksa mandiri. Petunjuk penerjemah kini menyebut ketiga pola itu secara eksplisit.

## Batch Kitab al-'Ilm 4 · 2026-10-29 (Bab 100019)

Tujuh berkas dengan 247 paragraf disimpan (253 paragraf bab, 6 ditunda). Penerjemahnya Sonnet 5.5, dan penilai independen memeriksa seluruh butir.

| Berkas | Paragraf | Periksa independen (final) | Catatan |
|---|---|---|---|
| 100019 (bag. 1) | 36 | B32/K4/S0 | p693 ditunda (lafaz ayat sesudah "Allah berfirman") |
| 100019 (bag. 2) | 37 | B35/K2/S0 | putaran 1: 1 Salah ("salah satunya" menjadi "yang pertama"), diperbaiki |
| 100019 (bag. 3) | 36 | B35/K1/S0 | p765 ditunda (istirja' diucapkan tokoh) |
| 100019 (bag. 4) | 37 | B33/K4/S0 | |
| 100019 (bag. 5) | 37 | B34/K3/S0 | |
| 100019 (bag. 6) | 36 | B32/K4/S0 | p907 ditunda |
| 100019 (bag. 7) | 28 | B26/K2/S0 | putaran 1: 1 Salah ("dua pembuat bidah" menjadi "dua bidah"), diperbaiki; p960, p966, p976 ditunda (QS 25:70 dan doa berlafaz ayat) |

**Perlu dicek ke edisi cetak:** p971 tampaknya kehilangan predikat. Penerjemah menambah "is enough for him", dan penilai menandainya Kurang.

## Paragraf iqtibas dari daftar tunda · 2026-10-29

Sesudah ADR-133, 9 dari 12 paragraf tunda dinilai iqtibas, lalu diterjemahkan sebagai kalimat penulis tanpa catatan "(Qur'an)". Ada 5 berkas (100010, 100012, 100017, 100018, 100019) dengan total 9 paragraf.

- Putaran 1: B6/K3/S0. Ketiga Kurang ada di 100019. Yang paling penting: ucapan narator di p966 terbaca seolah ucapan Iblis karena tanda kutip. p960 dan p966 diperbaiki, lalu dinilai ulang oleh penilai baru: B4/K0/S0.
- Final: B9/K0/S0. Placeholder ⟦QS 6:91⟧ (p386) dan ⟦QS 56:88-91⟧ (p608) disalin tepat sekali.
- Sisa tunda: 3 paragraf kutipan (p385, p693, p765) menunggu patch ayat X29.

## Batch Kitab al-'Ilm 5 dan rekap · 2026-10-29

Batch ini menerjemahkan paragraf yang langsung berada di bawah judul Kitab dan judul Bab induk (`pnpm terjemah bahan 100003 --belum`), dalam dua berkas: 23 paragraf (B22/K1/S0) dan 22 paragraf (B20/K2/S0). Keduanya lolos pada putaran pertama.

**Kitab al-'Ilm selesai:**
- 811 dari 823 paragraf berstatus `siap` dalam 30 berkas.
- 12 paragraf ditunda karena lafaz ayat tanpa penanda ([daftar](../terjemah/tunda-en.md)).
- Setiap berkas dinilai penuh oleh penilai independen. Delapan Salah tertangkap di putaran pertama:
  - 4 kasus lafaz ayat yang tidak dikenali pencocok ayat;
  - 2 kasus pelaku tertukar;
  - 1 kasus negasi terbalik;
  - 1 kasus bilangan.

  Semuanya sudah diperbaiki atau ditunda, lalu dinilai ulang, jadi versi final tidak memuat Salah.

**Tindak lanjut:**
- Patch pencocok ayat untuk 12 paragraf tunda. Terjemahan Indonesia yang tayang untuk paragraf yang sama kemungkinan juga menerjemahkan lafaz ayat itu, jadi perlu dicek.
- Cek edisi cetak untuk dugaan salah cetak: p182, p235, p971.
- Memuat terjemahan ke korpus dan peralihan MCP (X26).
