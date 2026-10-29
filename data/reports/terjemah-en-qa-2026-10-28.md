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
