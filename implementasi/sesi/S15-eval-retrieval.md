# S15 · Eval retrieval & rilis Fase 2

> **Fase:** 2 · **Status:** selesai
> **Prasyarat:** S14 selesai · Tugas pemilik: **T-12** (review soal eval)
> **Perkiraan:** 1 percakapan agent (ditambah waktu review pemilik/ustadz)

## Tujuan

Kualitas pencarian diukur secara objektif sebelum dirilis: set soal "di mana al-Ghazali membahas X?" dengan lokasi jawaban yang benar, runner eval di repo yang berjalan di CI, dan keputusan berbasis data apakah embedding perlu ditambahkan.

## Baca dulu (hanya ini)

- [docs/06-evaluasi.md](../../docs/06-evaluasi.md) dan ADR-015 (eval buatan sendiri) dan ADR-006 (embedding ditunda sampai eval membuktikan perlu).
- `/docs-terbaru vite-plus` (bila runner memakai `vp test`) atau skrip Node biasa.

## Langkah

1. Buat `tools/eval` dengan format dataset JSONL di `evals/retrieval/`:
   - `id`, `pertanyaan` (Indonesia atau Arab), `lokasi_benar` (daftar `page_id`/`toc_node_id`; boleh lebih dari satu), `jenis` (lokasi / topik tersebar / istilah), `catatan`, `disetujui_oleh`.
   - Sebagian soal disimpan di file privat (`evals/private/`, git-ignored, disimpan di R2) supaya tidak bocor ke data latih ([docs/06](../../docs/06-evaluasi.md)).
2. **Draf 30 soal** oleh agent, mencakup berbagai kitab di keempat rub'. Lokasi benarnya diverifikasi dengan membaca bagian terkait, lalu dikirim ke pemilik/ustadz untuk disetujui (T-12). Hanya soal yang disetujui yang masuk set resmi (target ≥20).
3. **Runner `pnpm run eval:retrieval`** (tanpa LLM; akses D1 lokal lewat `getPlatformProxy` dengan lokasi bersama, ARSITEKTUR §7 aturan 2): jalankan `searchText` (D1 lokal dengan korpus terbaru) lalu hitung hit@1, hit@5, hit@10, dan MRR per jenis soal. Laporannya Markdown di `evals/reports/` (dengan tanggal dan `corpus_version`).
4. Masukkan ke CI sebagai job non-blocking (DB lokal dibangun dari artefak; bila tidak memungkinkan di CI, jalankan lokal dan catat di LOG). Tambahkan juga gerbang rilis di skill `/rilis`.
5. **Analisis kegagalan:** untuk setiap soal yang gagal, apakah masalahnya kosakata (query Indonesia vs istilah Arab), normalisasi, atau ranking? Perbaiki yang murah (glosarium sinonim, bobot bm25, ringkasan) lalu ukur ulang.
6. **Keputusan embedding (ADR baru):** bila hit@10 < 90% setelah perbaikan murah, rencanakan sesi tambahan "S15b · Embedding": Workers AI `qwen3-embedding-0.6b` vs `bge-m3`, Vectorize 1024 dimensi, dan RRF. Bila ≥ 90%, catat bahwa embedding tetap ditunda.
7. Lengkapi syarat rilis R2 di FASE.md, lalu sarankan `/rilis 2`.

## Selesai bila

- [x] ≥20 soal disetujui pemilik/ustadz (nama penyetuju tercatat di dataset): 31/31, `disetujui_oleh` = "Salman Alfariesh (pemilik), 2026-10-17" di `evals/retrieval/soal.jsonl` (21) + set privat (10, R2 `retrieval/2026-10-17-resmi.jsonl`)
- [x] `pnpm run eval:retrieval` berjalan dan menghasilkan laporan; angka dicatat di LOG (`evals/reports/retrieval-2026-10-17-ihya-v5-resmi.md`; juga `--remote` di CI)
- [x] **hit@10 (lokasi benar) ≥ 90%**: `pnpm run eval:retrieval --gate` → set resmi 31 soal hit@10 **100%**, kode keluar 0
- [x] ADR keputusan embedding tertulis (ADR-046: tetap ditunda; ADR-045: rancangan eval)
- [x] STATUS, LOG, dan file sesi ini diperbarui; FASE.md menandai Fase 2 siap rilis (dengan sisa tugas pemilik T-16 + T-17 tahap 2, ditulis terbuka di Status R2)

## Di luar cakupan

- Eval jawaban LLM (S18).

## Catatan hasil

2026-10-17 · PR #36 · ADR-045, ADR-046.

**Yang dibuat**
- **`tools/eval`** (`@surau/eval`) + `pnpm run eval:retrieval`:
  - dataset JSONL tervalidasi Zod, dengan label lokasi dicek terhadap DB;
  - pencocok lokasi berupa node daftar isi + turunan, atau rentang halaman menurut jilid/halaman cetak;
  - hit@1/5/10 + MRR@50 per jenis, bahasa kueri, dan set;
  - laporan Markdown tanpa teks soal privat;
  - `--remote` (staging), `--gate` (kode keluar 2), dan `--publik-saja`. 22 tes di `tools/eval/src/*.test.ts`.
- **31 soal disetujui pemilik (T-12)**: 21 publik (`evals/retrieval/soal.jsonl`) + 10 privat (git-ignored, R2 `surau-evals`). Komposisinya 4 rub', 19 lokasi / 7 istilah / 5 topik tersebar, serta 6 kueri Arab / 25 Indonesia. Kueri ditulis sebelum pencarian dijalankan, dan lokasi diverifikasi dengan membaca bab terkait. Persetujuan lewat halaman tinjauan (artifact claude.ai, `db`) dan chat ("Ya setujui semua").
- **Perbaikan murah (langkah 5):** kata pembingkai pertanyaan (`ID_QUERY_FRAMING`: cara, bagaimana, di mana, menurut, membahas, "(Imam) al-Ghazali" yang menempel …) dibuang dari kueri Indonesia, hanya di sisi kueri. Indeks dan `LATIN_NORM_VERSION` tidak berubah, jadi korpus tidak dibangun ulang.
- **CI `eval.yml`** (non-blocking): staging lewat remote binding, soal privat dari R2, ringkasan di Summary job, peringatan dibedakan antara di bawah gerbang (kode 2) dan galat. Uji pertama di PR #36: berjalan 39 detik, 30 soal termasuk privat.
- **Gerbang rilis:** skill `/rilis` (`--gate --label rilis` atas D1 lokal = korpus produksi), syarat R2 dirinci di FASE.md, `evals/README.md`.

**Angka (D1 lokal = staging = produksi `ihya-v5`)**

| Run | Soal | hit@1 | hit@5 | hit@10 | MRR |
|---|---|---|---|---|---|
| baseline (sebelum perbaikan) | 30 | 56,7% | 90,0% | 96,7% | 0,732 |
| **resmi** (31 disetujui) | 31 | 64,5% | 96,8% | **100%** | 0,795 |

- Kueri Arab 6/6 di peringkat 1. Kueri Indonesia hit@1 56%, hit@10 100%. Topik tersebar: semua lolos, tetapi baru 8 dari 13 lokasinya yang terjangkau di 10 teratas.
- **Analisis kegagalan:** satu-satunya kegagalan baseline (r03 "cara khusyuk dalam salat", > 50) masuk kategori kosakata, khususnya kata pembingkai: "cara" diwajibkan AND. Setelah perbaikan r03 → 1 dan r20 2 → 1, tanpa soal lain yang turun. Tidak ada kegagalan normalisasi atau peringkat yang menahan hit@10. Peringkat 1 masih lemah untuk topik tersebar dan istilah Indonesia (itsar, wara').
- **Keputusan embedding (ADR-046):** tetap ditunda, S15b tidak dijadwalkan.

**Peninjau**
- Putaran 1: 1 blocker + 5 perbaiki + 6 saran, semuanya ditangani.
  - Blocker: perbaikan kata pembingkai dirancang dari kegagalan soal privat p03, dan teks kuerinya masuk kode. p03 dianggap terbakar, dipindah ke publik sebagai r03, dan diganti p31 yang ditulis sebelum dijalankan. Aturan holdout baru dicatat di README dan ADR-045.
  - Perbaiki: gerbang wajib ≥ 20 soal; `--gate` wajib soal privat; galat soal privat disamarkan (log CI publik); "al"/"imam" yang menempel pada "ghazali"; ADR ditulis.
  - Saran: hasil tanpa peringkat dihitung gagal; baris bahasa kueri arab/indonesia/campuran; cek rentang menurut halaman cetak; kode `-dirty`; "ma'na" dikecualikan; kode keluar CI dibedakan.
- Putaran 2: lihat LOG.

**Penyimpangan (ADR-045):**
- Field `kueri` ditambahkan di samping `pertanyaan`.
- `lokasi_benar` boleh berupa rentang halaman, karena daftar isi Rub' Adat/Muhlikat dangkal.
- Set 31 soal, bukan 30, karena ada soal pengganti holdout.
- CI memakai staging remote, bukan DB yang dibangun dari artefak (korpus tidak bisa dibangun atau diekspor di CI).
- Satu lokasi benar dilebarkan setelah membaca teks (r23 + j3 h231).

**Utang / pesan untuk sesi berikutnya**
- Fase 2 **siap rilis**, tetapi `/rilis 2` menunggu **T-16** (20 sampel ayat) dan **T-17 tahap 2** (20 sampel terjemahan). Keduanya tugas pemilik dan sudah tertulis di syarat R2.
- Set eval kecil (31 soal, satu kitab, disusun agent). Ustadz (T-13) menambah dan menilai soal di S18. Topik tersebar dinilai longgar (benar bila satu lokasi muncul).
- hit@1 64,5%: bila Cari dinilai kurang tajam, bahan perbaikan peringkat (bobot ringkasan vs terjemahan, judul bagian) sebelum embedding.
- Laporan baseline dibuat sebelum runner di-commit (`92f2ef8` = kode pencarian).
- Halaman tinjauan T-12 (artifact claude.ai) bisa dipakai ulang untuk soal baru: buat ulang datanya dari dataset.

