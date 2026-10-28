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
