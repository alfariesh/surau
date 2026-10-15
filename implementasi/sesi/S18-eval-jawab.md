# S18 · Eval Jawab & halaman tinjau ustadz

> **Fase:** 4 · **Status:** belum (garis besar; rinci ulang di awal fase)
> **Prasyarat:** Fase 3 dirilis · Tugas pemilik: **T-13** (ustadz), Cloudflare Access untuk `/tinjau` (bagian dari T-14), **P-7** (penyimpanan dan retensi data)
> **Perkiraan:** 1–2 percakapan agent, ditambah waktu ustadz

## Tujuan

Sebelum ada pipeline Jawab, sudah tersedia **alat ukurnya**: set soal 50–100 bersama ustadz, runner eval dengan metrik deterministik dan LLM-judge yang terkalibrasi, serta halaman `/tinjau` berbahasa Indonesia (Arab RTL) tempat ustadz menilai jawaban.

## Baca dulu

- [docs/06-evaluasi.md](../../docs/06-evaluasi.md) (komposisi soal, metrik, target) dan ADR-015 (eval buatan sendiri, Langfuse cadangan).
- Skill `claude-api`, subcommand `build-eval` (panduan menyusun eval).

## Langkah (garis besar)

1. Perluas `tools/eval` dengan dataset `evals/jawab/*.jsonl` dan skrip `eval:jawab` (berbayar, selalu minta izin; ada di daftar `ask`). Komposisinya sesuai docs/06: lokasi+isi 40%, topik tersebar 15%, status hadits 15%, di luar cakupan 10%, premis keliru 10%, atribusi 10%. Simpan ±30% secara privat.
2. **Metrik deterministik** (kode): validitas kutipan (setiap sitasi ditemukan verbatim di DB), lokasi benar, menolak dengan benar, status hadits cocok dengan takhrij, dan tanpa bahasa fatwa (pola terlarang).
3. **LLM-judge** (Sonnet 5.5) untuk kesetiaan dan atribusi, dikalibrasi terhadap ±30 penilaian ustadz. Catat tingkat kesepakatannya.
4. Tabel D1 app: `answer_log` (tanpa PII, retensi sesuai P-7) dan `review`.
5. Halaman `/tinjau` (dilindungi Cloudflare Access, PIN email):
   - Pertanyaan, jawaban, dan kutipan Arab RTL.
   - Tombol Benar/Kurang/Salah, skor kualitas bahasa Indonesia 1–5, komentar, dan alasan.
   - Ekspor ke golden set.
6. Baseline: jalankan runner terhadap "jawaban kosong" dan "mode Cari saja" supaya angka pembanding tersedia.

## Selesai bila

- [ ] ≥50 soal disetujui ustadz (target 100 sebelum rilis R4); sebagian privat
- [ ] Runner menghasilkan laporan metrik; judge terkalibrasi (kesepakatan tercatat)
- [ ] `/tinjau` dipakai ustadz untuk ≥10 penilaian uji
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
