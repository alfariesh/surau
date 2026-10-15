# 06 · Evaluasi

## Prinsip

- **Eval adalah syarat rilis.** Cakupan baru (kitab, agen, fitur) hanya dibuka setelah eval-nya lolos.
- **Setiap agen punya set eval sendiri.** Contohnya: eval Ihya, eval Ruang al-Ghazali, eval fiqih.
- **Disusun dan dinilai bersama ustadz.** Penilai otomatis (LLM-as-judge) dikalibrasi terhadap penilaian ustadz.
- **Sebagian soal disimpan privat** supaya tidak bocor ke data latih model dan tidak "di-overfit" saat pengembangan.

## Isi set eval (contoh untuk v1, 50–100 soal)

| Jenis soal | Porsi | Contoh |
|---|---|---|
| Lokasi + isi | 40% | "Apa kata al-Ghazali tentang adab murid kepada guru?" → *Kitab al-'Ilm*, Bab 5 |
| Topik tersebar | 15% | "Bagaimana al-Ghazali membahas niat?" → muncul di banyak kitab |
| Status hadits | 15% | "Apakah hadits shalat malam Rabu di Ihya sahih?" → takhrij al-'Iraqi |
| Di luar cakupan | 10% | Pertanyaan yang tidak dibahas Ihya → wajib "tidak ditemukan" |
| Premis keliru | 10% | "Kenapa al-Ghazali mengharamkan X?" padahal tidak pernah ditulis |
| Atribusi | 10% | Pendapat yang dinukil atau dibantah, bukan pendapat penulis sendiri |

Setiap soal menyimpan: pertanyaan (bahasa Indonesia), lokasi jawaban yang benar (kitab/bab/halaman), poin-poin jawaban kunci, dan catatan ustadz.

## Metrik

| Metrik | Cara ukur | Target v1 |
|---|---|---|
| **Validitas kutipan** | Kode: setiap kutipan ada di sumber (setelah normalisasi) | **100%** (dijamin oleh desain) |
| **Lokasi benar** | Bagian yang dibuka/dikutip memuat jawaban | ≥ 90% |
| **Kesetiaan (faithfulness)** | LLM-as-judge yang dikalibrasi + sampel ustadz | ≥ 95% |
| **Menolak dengan benar** | Soal di luar cakupan dan berpremis keliru | ≥ 90% |
| **Status hadits benar** | Dibandingkan dengan teks takhrij | 100% untuk hadits yang punya takhrij |
| **Atribusi benar** | Penulis vs. yang dinukil vs. yang dibantah | ≥ 95% |
| **Kualitas bahasa Indonesia** | Penilaian ustadz (skala 1–5) | ≥ 4 |
| Biaya dan latensi per jawaban | Tracing | Dicatat sebagai pembanding antar model |

Angka target adalah usulan awal untuk didiskusikan dengan ustadz.

## Alur

1. Ustadz menulis atau menyetujui soal, lalu disimpan sebagai dataset di Langfuse.
2. Skrip eval TS menjalankan semua soal ke model v1 (Claude Haiku 5.5, effort `low`). Pembandingnya Sonnet 5.5 dan, setiap kuartal, satu model non-Claude (Gemini 3.1 Pro atau GPT-5.5). Eval memakai Message Batches supaya hemat 50%.
3. Skor otomatis (kutipan, lokasi, penolakan) dihitung oleh kode. Kesetiaan dinilai oleh penilai LLM.
4. Sampel jawaban masuk ke antrean anotasi untuk dinilai ustadz.
5. Hasilnya dibandingkan, model dipilih, lalu dicatat di log keputusan.
6. Setiap perubahan prompt atau kode menjalankan ulang eval sebagai syarat sebelum rilis.

## Alat

- **Langfuse:** dataset, tracing, penilai LLM, antrean anotasi untuk ustadz. Mulai dengan paket gratis.
- **Skrip eval TS** di repo, untuk dijalankan di CI.
- **Bila antarmuka Langfuse menyulitkan ustadz:** buat halaman review sederhana di aplikasi (label bahasa Indonesia, tampilan Arab kanan-ke-kiri) yang menulis skor ke Langfuse. *Belum diverifikasi:* bagaimana Langfuse menampilkan teks Arab RTL. Tes dulu bersama ustadz.

## Eval untuk ekstraksi wiki (lihat 04)

- **Presisi dan recall per jenis entitas** pada kitab pilot, dibandingkan dengan anotasi ustadz.
- **Akurasi resolusi entitas,** misalnya apakah sebutan "أبو حامد" tertaut ke tokoh yang benar.
- **Untuk Qaul:** akurasi sikap penulis (menyetujui/membantah/menukil).
