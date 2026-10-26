# Perbandingan Jawab sebelum/sesudah `answer@7` · x06 vs x07 · 2026-10-26

> **Penilai semantik: agent (Claude), bukan ustadz dan bukan manusia** (ADR-105). Hasil ini tidak
> dihitung sebagai "ditinjau ustadz" di mana pun, termasuk `disetujui_oleh` dan gerbang R4. Keputusan
> perubahannya ada di ADR-106.

| | Sebelum (x06) | Sesudah (x07) |
|---|---|---|
| Run | `x06-publik-takhrij-v1` (2026-10-21) | `x07-publik-answer7-v1` (2026-10-26) |
| Versi | `answer@6+answer-route@2+pipeline@6`, rute tersimpan | `answer@7+answer-route@2+pipeline@8`, routing baru |
| Korpus | `ihya-v7` | `ihya-v8` (staging) |
| Soal | 42 publik, versi 1 | 42 publik, versi 2 (8 soal direvisi) |
| Model | Haiku 5.5 | Haiku 5.5 (tanpa ulangan Sonnet) |
| Biaya | — | **US$0,1205** (izin pemilik di chat, pagu US$0,50) |

Laporan kode run baru: [`jawab-x07-publik-answer7-v1.md`](jawab-x07-publik-answer7-v1.md). Penilaian
per jawaban (privat): `evals/private/jawab-runs/x07-agent-nilai-2026-10-26.jsonl`, salinan R2
`surau-evals/jawab-runs/x07-agent-nilai-2026-10-26.jsonl`.

## Hasil

| Ukuran | x06 | x07 | Syarat R4 | x07 |
|---|---|---|---|---|
| Benar / Kurang / Salah (agent) | 19 / 20 / 3 | 17 / 22 / 3 | — | |
| Kesetiaan (agent) | 76,2% (32/42) | **83,3%** (35/42) | ≥ 95% | tidak lolos |
| Atribusi benar (agent) | 97,6% (41/42) | 97,6% (41/42) | ≥ 95% | lolos |
| Bahasa Indonesia (agent, 1–5) | 3,74 | **3,45** | ≥ 4 | tidak lolos |
| Kalimat bernada fatwa (agent) | 1 | **0** | 0 | lolos |
| Menolak dengan benar (agent) | 8/8 | 8/8 | ≥ 90% | lolos |
| Status hadits benar (agent) | 4/6 | **5/6** | 100% | tidak lolos |
| Lokasi (kode), kunci versi 1 | 85,3% (29/34) | 88,2% (30/34) | ≥ 90% | tidak lolos |
| Lokasi (kode), kunci versi 2 | 85,3% (29/34) | **91,2%** (31/34) | ≥ 90% | lolos* |
| Kutipan valid (kode) | 100% | 100% (151/151) | 100% | lolos |
| Takhrij (kode) | 5/6 | 5/6 | — | |

\* Kunci versi 2 memuat pembetulan kunci keliru j014/j023 (ADR-106 butir 4). Dengan kunci lama, lokasi
88,2%. Satu soal tambahan lolos karena pembetulan kunci (j023), bukan karena jawabannya berubah.
Lokasi dihitung ulang dari sitasi arsip atas korpus staging; angka x06 dan x07 dengan kunci versi 2
sama dengan laporan kode masing-masing.

**Kesimpulan: syarat R4 masih belum terpenuhi.** Ukuran yang menjadi sasaran `answer@7` membaik
(kesetiaan, nol fatwa, status hadits, bahasa pipeline, lokasi), tetapi skor bahasa turun dan jumlah
Benar tidak naik. Status R4 tidak diubah.

Per jenis (Benar/Kurang/Salah), x06 → x07: lokasi+isi 9/7/1 → 8/8/1, topik tersebar 1/4/1 → 4/1/1,
status hadits 0/5/1 → 2/3/1, di luar cakupan 4/0/0 → 1/3/0, premis keliru 2/2/0 → 0/4/0, atribusi
3/2/0 → 2/3/0.

## Pola x06 yang membaik

- **Bahasa pipeline** ("dokumen yang dilampirkan", "terjemahan AI"): jawaban yang memuatnya turun dari
  19 menjadi 1 (hitungan teks).
- **Kalimat status yang bertentangan (j025–j029):** kalimat "tidak dapat dipastikan" turun dari 5
  jawaban menjadi 0. j025 dan j028 naik ke Benar. j028 kini menyebut riwayat al-Baihaqi yang mauquf
  sekaligus ketiadaan versi marfu'.
- **Celah "…" bekas huruf Arab:** turun dari 24 menjadi 11 kemunculan (7 jawaban di kedua run).
- **Salah di x06 yang diperbaiki:** j016 (Salah → Kurang; kesimpulan negatif tidak lagi mutlak, tetapi
  paragraf sesudahnya tetap tidak dibaca) dan j019 (Salah → Benar; tidak ada lagi parafrase ayat, nama
  kitab benar). Juga naik: j001, j005, j006, j014, j015, j022, j023, j041.
- **Fatwa:** j021 tidak lagi memakai rangkuman preskriptif.
- **Diagnostik pipeline@8:** `pipeline_terms` 1, `ayah_gloss_suspect` 0, `hadith_unsupported` 2.

## Pola baru atau yang tersisa

1. **Penolakan dengan tambahan yang mengganggu** (j031–j033 Benar → Kurang): kalimat baku benar, tetapi
   kalimat tambahan tentang isi bagian yang ditemukan memuat kartu kutipan tak relevan, celah "…", atau
   kata "dokumen". Dua sisi dari aturan yang sama di prompt ("paling banyak satu kalimat …").
2. **Terjemahan kutipan ditempel mentah** (j006, j007, j008, j010, j012): kalimat definisi diulang dua
   kali atau menjadi rumpang ("ia menyebut bahwa Dan jika…"). Kemungkinan dari larangan "jangan
   mengantar lafaz", sehingga model menyalin terjemahan AI di konteks sebagai ganti lafaz. Ini penyebab
   utama turunnya skor bahasa.
3. **Kalimat pengganti status masih dinilai bocor** (j026, j027): rumusan baru "Status hadits: lihat
   bagian "Status hadits" …" tidak lagi bertentangan, tetapi tetap terbaca sebagai bahasa sistem.
   Dibuang hanya bila ada baris label bersitasi (ADR-106 butir 2); di j026/j027 model tidak menulis
   baris label bersitasi.
4. **Meta dan orang pertama** (j026 "jadi saya mulai dari takhrijnya", j039 "Pertanyaan ini
   menanyakan …"). Belum diatur prompt.
5. **Salah baca dan nama bagian** masih ada: j017 (Salah; "la ba'sa" dipindah ke objek lain, dan dua
   ayat diparafrasekan tanpa tertangkap diagnostik karena tanpa kata penanda), j036 (halaman h275 untuk
   h274, larangan dilunakkan), j037, j042 (eja "Rabu al-Muhlikat").
6. **j024 tetap Salah** (pola 3 laporan agent): takhrij di kemunculan pertama (j1 h2) tidak terambil
   pencarian, dan bagian Status hadits menampilkan label takhrij hadits lain (j1 h59) yang ikut
   disitasi. Ini masalah pencarian, bukan prompt.
7. **j018 menjadi Salah** dengan pertanyaan versi 2: model menafsirkan "objek yang diajar" sebagai
   ilmu (j1 h12), bukan hati manusia (j1 h13). Pertanyaan ini sengaja tidak lagi memuat isi poin kunci
   (peninjau ADR-106), sehingga menjadi lebih sulit.

## Keterbatasan

- **Penilai berbeda.** x06 dan x07 dinilai subagen Claude yang berbeda dengan rubrik yang sama, tanpa
  melihat nilai run lain. Selisih satu atau dua jawaban (mis. skor bahasa, j031–j033) bisa berasal dari
  ketegasan penilai. Belum ada penilaian berpasangan atau penilai manusia.
- **Tidak sebanding penuh.** Korpus berbeda (`ihya-v7` vs `ihya-v8`) dan routing x07 baru (rute x05
  tidak tersimpan di mesin ini). Pertanyaan j018–j021 dan j023 berbeda dari x06; kunci j009, j014, j023,
  j041 berubah. Tanpa kedelapan soal itu (34 soal yang sama): Benar/Kurang/Salah 18/14/2 → 12/20/2,
  kesetiaan 27 → 29, bahasa 3,74 → 3,41. Jadi naiknya jumlah Benar di soal yang direvisi tidak
  terulang di soal yang tidak berubah; yang turun terutama bahasa (pola 1–4 di atas).
- Satu run per prompt (Haiku nondeterministik); selisih kecil bisa derau.
- Label status hadits di x07 masih memakai aturan istilah takhrij versi 1. Aturan versi 2 (ADR-108)
  masuk ke `main` sesudah run ini dan belum ikut diukur.

## Rekomendasi (belum dikerjakan)

- Prompt `answer@8`: tegaskan "jelaskan dengan kata-kata sendiri, jangan menyalin terjemahan AI dan
  jangan mengulang kalimat"; batasi kalimat tambahan sesudah "Tidak ditemukan …" (tanpa sitasi, tanpa
  contoh); larang pembuka meta dan orang pertama.
- Pertimbangkan membuang kalimat pengganti status yang berdiri sendiri bila bagian "Status hadits"
  berisi, walau tanpa baris label, dengan menampilkan lokasi tiap hadits di bagian itu (keputusan
  produk karena menyangkut hadits yang takhrijnya tidak tersitasi).
- Pencarian kemunculan pertama hadits (j024) dan detektor kalimat penilaian takhrij tanpa sitasi
  catatan kaki (risiko yang diterima di ADR-106).
