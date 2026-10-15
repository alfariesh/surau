# S15 · Eval retrieval & rilis Fase 2

> **Fase:** 2 · **Status:** belum
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

- [ ] ≥20 soal disetujui pemilik/ustadz (nama penyetuju tercatat di dataset)
- [ ] `pnpm run eval:retrieval` berjalan dan menghasilkan laporan; angka dicatat di LOG
- [ ] **hit@10 (lokasi benar) ≥ 90%**, atau ada keputusan tertulis dan sesi S15b direncanakan
- [ ] ADR keputusan embedding tertulis
- [ ] STATUS, LOG, dan file sesi ini diperbarui; FASE.md menandai Fase 2 siap rilis

## Di luar cakupan

- Eval jawaban LLM (S18).

## Catatan hasil

*(diisi agent)*
