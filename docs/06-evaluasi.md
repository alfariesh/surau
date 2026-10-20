# 06 · Evaluasi

Dokumen ini menetapkan **apa yang diukur** dan **kapan sebuah fase boleh dirilis**. Cara membangunnya ada di sesi [S15](../implementasi/sesi/S15-eval-retrieval.md) (eval retrieval) dan [S18](../implementasi/sesi/S18-eval-jawab.md) (eval Jawab), serta ADR-015 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md). Syarat rilis per fase ada di [implementasi/FASE.md](../implementasi/FASE.md).

## Prinsip

- **Eval adalah syarat rilis.** Cakupan baru (kitab, agen, fitur) hanya dibuka setelah eval-nya lolos. Skill `/rilis` memeriksa gerbang ini (Fase 2: retrieval, Fase 4: Jawab).
- **Setiap agen punya set eval sendiri.** Contohnya: eval Ihya, eval Ruang al-Ghazali, eval fiqih.
- **Disusun dan dinilai bersama ustadz.** Penilai otomatis (LLM-as-judge) dikalibrasi terhadap penilaian ustadz.
- **Kode memeriksa yang bisa dicek pasti.** Validitas kutipan, lokasi, status takhrij, dan penolakan dihitung oleh kode. Penilai LLM hanya dipakai untuk hal yang butuh penilaian, seperti kesetiaan dan atribusi.
- **Sebagian soal disimpan privat** supaya tidak bocor ke data latih model dan tidak "di-overfit" saat pengembangan. Rilis benchmark terbuka direncanakan di Fase 7.
- **Setiap perubahan prompt atau kode Jawab menjalankan ulang eval** sebelum merge.

## Dua eval, dua fase

Eval dipisah karena yang diuji berbeda: pencarian tanpa LLM dirilis lebih dulu (Fase 2), jawaban LLM menyusul (Fase 4).

| | Eval retrieval | Eval Jawab |
|---|---|---|
| Fase · sesi | Fase 2 · S15 | Fase 4 · S18 (dipakai lagi di S19 dan S21) |
| Yang diuji | Cari Arab dan Indonesia (`searchText`), tanpa LLM | Pipeline Jawab: Haiku 5.5 + Citations + verifikasi kutipan oleh kode |
| Jumlah soal | Agent menyusun draf 30; **≥20 disetujui** pemilik atau ustadz | **50–100**, disusun bersama ustadz |
| Metrik utama | hit@1, hit@5, hit@10, dan MRR atas lokasi | Metrik deterministik + LLM-judge Sonnet 5.5 |
| Gerbang rilis | **hit@10 ≥ 90%** (syarat R2) | Target R4 (lihat tabel metrik di bawah) |
| Perintah | `pnpm run eval:retrieval` | `pnpm run eval:jawab` |

## Eval retrieval (Fase 2)

Pertanyaannya berbentuk "di mana al-Ghazali membahas X?", dan jawabannya adalah **lokasi**, bukan teks.

**Isi set.** Pertanyaan berbahasa Indonesia atau Arab, dengan tiga jenis: lokasi, topik tersebar, dan istilah. Setiap soal menyimpan `id`, `pertanyaan`, `lokasi_benar` (satu atau lebih `page_id`/`toc_node_id`), `jenis`, `catatan`, dan `disetujui_oleh`. Lokasi benar diverifikasi agent dengan membaca bagian terkait sebelum dikirim untuk disetujui (T-12).

**Metrik.**

| Metrik | Cara ukur |
|---|---|
| hit@k (k = 1, 5, 10) | Porsi soal yang minimal satu lokasi benarnya muncul di k hasil teratas |
| MRR | Rata-rata 1/peringkat lokasi benar pertama |

Semua metrik dihitung per jenis soal. Laporannya berformat Markdown di `evals/reports/`, dengan tanggal dan `corpus_version`.

**Gerbang dan keputusan embedding.** "Lokasi benar ≥ 90%" pada syarat R2 berarti **hit@10 ≥ 90%**. Untuk setiap soal yang gagal, dicek penyebabnya: kosakata (query Indonesia vs. istilah Arab), normalisasi, atau ranking. Perbaikan murah dicoba dulu (glosarium sinonim, bobot bm25, ringkasan). Bila hit@10 tetap < 90%, direncanakan sesi tambahan S15b untuk embedding (ADR-006). Bila ≥ 90%, embedding tetap ditunda. Keduanya dicatat sebagai ADR.

Eksperimen FTS di [riset/2026-10-15-pencarian-arab](riset/2026-10-15-pencarian-arab/README.md) memakai gold set berbasis regex. Angkanya belum mewakili relevansi menurut manusia; eval S15 yang menggantikannya.

**Pemeriksaan kualitas lain di Fase 2.** Ini bukan gerbang eval, tetapi hasilnya dicatat di LOG.

| Sesi | Yang dicek | Ambang |
|---|---|---|
| S12 | Pencocokan ayat ke Tanzil | Cocok persis ≥ 95% dari bentang kandidat tervalidasi; 20 sampel diperiksa pemilik atau ustadz |
| S13 | Terjemahan AI per paragraf | 20 sampel acak dinilai Benar/Kurang/Salah; bila Salah > 10%, prompt diperbaiki dan paragraf terdampak diulang |
| S14 | Cari Indonesia | Query seperti "sabar", "niat", dan "adab murid kepada guru" memberi hasil relevan di 5 teratas (cek manual) |

## Eval Jawab (Fase 4)

### Isi set (50–100 soal)

| Jenis soal | Porsi | Contoh |
|---|---|---|
| Lokasi + isi | 40% | "Apa kata al-Ghazali tentang adab murid kepada guru?" → *Kitab al-'Ilm*, Bab 5 |
| Topik tersebar | 15% | "Bagaimana al-Ghazali membahas niat?" → muncul di banyak kitab |
| Status hadits | 15% | "Apakah hadits shalat malam Rabu di Ihya sahih?" → takhrij al-'Iraqi |
| Di luar cakupan | 10% | Pertanyaan yang tidak dibahas Ihya → wajib "tidak ditemukan" |
| Premis keliru | 10% | "Kenapa al-Ghazali mengharamkan X?" padahal tidak pernah ditulis |
| Atribusi | 10% | Pendapat yang dinukil atau dibantah, bukan pendapat penulis sendiri |

Setiap soal menyimpan: pertanyaan (bahasa Indonesia), lokasi jawaban yang benar (kitab/bab/halaman), poin-poin jawaban kunci, status hadits yang diharapkan (bila ada), tanda "wajib ditolak" (bila ada), dan catatan ustadz. Sekitar 30% soal disimpan privat.

### Metrik dan target

| Metrik | Cara ukur | Target | Gerbang R4 |
|---|---|---|---|
| **Validitas kutipan** | Kode (`verifyQuote`): setiap kutipan ada di sumber (setelah normalisasi) | **100%** (dijamin oleh desain) | ya |
| **Lokasi benar** | Kode: bagian yang dibuka/dikutip memuat lokasi benar | ≥ 90% | ya |
| **Menolak dengan benar** | Kode: soal di luar cakupan dan berpremis keliru | ≥ 90% | ya |
| **Kesetiaan (faithfulness)** | LLM-judge Sonnet 5.5 yang dikalibrasi + sampel ustadz | ≥ 95% | ya |
| **Atribusi benar** | LLM-judge Sonnet 5.5 + sampel ustadz: penulis vs. yang dinukil vs. yang dibantah | ≥ 95% | ya |
| **Status hadits benar** | Kode: dibandingkan dengan teks takhrij | 100% untuk hadits yang punya takhrij | ya |
| **Tanpa bahasa fatwa** | Kode: pola kalimat terlarang ([05 Kebijakan](05-kebijakan.md)) | nol di sampel | ya |
| **Kualitas bahasa Indonesia** | Penilaian ustadz (skala 1–5) | ≥ 4 | ya |
| Biaya dan latensi per jawaban | `answer_log` dan `usage` | Dicatat sebagai pembanding antar model; acuan biaya di [08 Biaya](08-biaya.md) | dicatat |

Angka target adalah usulan awal untuk didiskusikan dengan ustadz. Metrik bertanda "ya" adalah syarat rilis R4 di [implementasi/FASE.md](../implementasi/FASE.md), bersama review ustadz atas kebijakan dan prompt, serta uji rem biaya. Bila angka di sini berbeda dengan FASE.md, yang berlaku FASE.md.

### Penilai LLM (LLM-as-judge)

- **Model:** Claude Sonnet 5.5 (`claude-sonnet-5-5`), hanya untuk kesetiaan dan atribusi.
- **Kalibrasi:** dibandingkan dengan ±30 penilaian ustadz, dan tingkat kesepakatannya dicatat. Judge tidak menggantikan ustadz: sebelum rilis, ustadz tetap menilai ≥20 sampel jawaban di `/tinjau` (S21).
- **Aturan API sama dengan ADR-013:** jangan kirim `temperature`/`top_p`/`top_k` dan jangan memakai prefill. Nilai sampling non-default dan prefill memberi error 400.
- **Biaya:** panggilan judge dan pembanding Claude lewat Message Batches (diskon 50%), langsung ke Anthropic (ADR-013).

### Baseline dan pembanding

- **Baseline:** "jawaban kosong" dan "mode Cari saja", supaya ada angka pembanding sebelum pipeline Jawab dibangun.
- **Model utama:** Claude Haiku 5.5, effort `low`. **Pembanding:** Sonnet 5.5 dan, setiap kuartal, satu model non-Claude.
- Hasil perbandingan dan pilihan model dicatat sebagai ADR.

## Alur

1. Pemilik atau ustadz menulis atau menyetujui soal. Soal disimpan sebagai JSONL di `evals/` (`retrieval/`, `jawab/`). Soal privat ada di `evals/private/` (git-ignored, disimpan di R2).
2. Runner `tools/eval` menjalankan semua soal: retrieval ke `searchText` atas D1 lokal dengan korpus terbaru, dan Jawab ke pipeline Haiku 5.5.
3. Skor deterministik dihitung kode. Kesetiaan dan atribusi dinilai judge Sonnet 5.5.
4. Jawaban disimpan di tabel D1 `answer_log` (retensi sesuai P-7, tanpa PII). Sampelnya masuk ke halaman `/tinjau`, dan penilaian ustadz disimpan di tabel `review`. Hasil penilaian bisa diekspor ke golden set.
5. Laporan ditulis di `evals/reports/` (tanggal, `corpus_version`, versi prompt), angkanya dicatat di LOG, dan keputusan model atau embedding dicatat di KEPUTUSAN.md.
6. Eval retrieval berjalan di CI sebagai job non-blocking (bila DB tidak bisa dibangun di CI, dijalankan lokal dan dicatat di LOG). Gerbang rilis diperiksa oleh `/rilis`.

## Alat

Semua alat utama dibangun sendiri, dengan biaya alat $0 (ADR-015).

- **`tools/eval`:** runner TypeScript di repo, dengan dataset JSONL dan pemeriksaan deterministik (kutipan verbatim, lokasi, takhrij, penolakan) yang berjalan di CI.
- **Halaman `/tinjau`:** UI berbahasa Indonesia, teks Arab kanan-ke-kiri (`lang="ar" dir="rtl"`), tombol Benar/Kurang/Salah, komentar, dan alasan. Dilindungi Cloudflare Access dengan login PIN lewat email. Email ustadz didaftarkan oleh pemilik (T-13).
- **Tabel D1 `answer_log` dan `review`** di DB `surau-app`: arsip eval dengan retensi sesuai P-7 (lihat [05 Kebijakan §8](05-kebijakan.md#8-privasi)). Log per permintaan AI Gateway dimatikan (tanpa payload; hanya angka agregat di Analytics, ADR-065), sehingga bukan arsip eval.
- **Dataset pihak ketiga** dengan lisensi lain (misalnya IslamicEval) hanya dipakai internal dan tidak diredistribusikan (ADR-021).

### Cadangan dan opsi yang ditolak

| Alat | Status | Alasan |
|---|---|---|
| Langfuse Cloud | cadangan | Paket Hobby hanya 2 user dan 1 antrean anotasi; antrean tidak berlaku untuk item dataset. UI berbahasa Inggris dan **tidak mendukung RTL**: teks Arab hanya terbaca baik di tampilan markdown ([issue #5758](https://github.com/langfuse/langfuse/issues/5758)). SDK belum resmi untuk Workers, dan self-host butuh ClickHouse, Postgres, Redis, dan S3. Diaktifkan bila butuh eksperimen atau manajemen prompt (ajukan kredit OSS). Ustadz tetap memakai `/tinjau`. |
| promptfoo | cadangan | Lisensi MIT dan cocok untuk membandingkan model atau prompt di CI, termasuk model non-Claude. Pemeriksaan kutipan verbatim tetap kode sendiri. |
| Cloudflare AI Gateway Evaluations | ditolak | Deprecated dan tidak tersedia untuk akun baru. |
| Braintrust | ditolak | Proprietary; versi gratis hanya 1 skor review manusia per proyek dan retensi 14 hari. |
| Opik, Arize Phoenix/AX | ditolak | Menambah platform dan akun tanpa RTL atau UI Indonesia untuk ustadz. Phoenix berlisensi Elastic-2.0 dan butuh server sendiri. |

## Eval untuk ekstraksi wiki (Fase 6, lihat [04](04-wiki-dan-entitas.md))

- **Presisi dan recall per jenis entitas** pada kitab pilot (*Kitab al-'Ilm*), dibandingkan dengan anotasi ustadz.
- **Grounding:** setiap entitas menunjuk bentang teks yang ada persis di sumber. Offset dihitung dan dicek oleh kode (ADR-007).
- **Akurasi resolusi entitas,** misalnya apakah sebutan "أبو حامد" tertaut ke tokoh yang benar.
- **Untuk Qaul:** akurasi sikap penulis (menyetujui/membantah/menukil).

Syarat rilis Fase 6: presisi ekstraksi disepakati bersama ustadz.
