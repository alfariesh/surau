# X03 · Sesi sisipan: cakupan lokasi gold di kandidat Jawab

> **Fase:** sisipan Fase 4 (sesudah S21, sebelum `/rilis 4`) · **Status:** selesai
> **Prasyarat:** S19–S21 selesai · izin pemilik di chat untuk satu eval publik berbayar (±US$0,11, pagu run 0,3): "ya saya izinkan" (2026-10-21)
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Syarat R4 "lokasi benar ≥ 90%" belum terpenuhi: eval publik S19/S21 memberi lokasi 73,5–76,5%. Lokasi gold baru masuk dokumen jawaban pada 25–29 dari 34 soal, dan topik tersebar paling lemah (≤ 1/6). Jadi hambatannya di pencarian kandidat (`packages/llm/src/jawab/retrieve.ts`, `route.ts`), bukan di prompt jawaban (ADR-064, ADR-066).

## Baca dulu (hanya ini)

- ADR-064 butir 3–4 dan tabel eval, ADR-066 (hasil eval S21), ADR-046 (pencarian makna ditunda).
- `evals/README.md` (aturan holdout), `evals/reports/jawab-s19-publik-final-3.md`, `evals/reports/jawab-s21-publik-hadits-v5.md`.

## Langkah

1. **Ukur gratis dulu.** Subperintah `eval:jawab kandidat --input <diagnostik,…>` mengulang langkah 2 pipeline tanpa LLM (`jawabCandidates`, kode yang sama dengan Worker) atas rute routing tersimpan di arsip `*-diagnostik-publik.jsonl`. Metrik: semua lokasi gold ada di dokumen. Hanya soal publik.
2. **Opsi murah dulu:** bobot RRF per jenis daftar, jatah/kedalaman per bagian, lebih banyak kueri per bagian, bagian dari ringkasan AI bagian (routing kedua), pembersihan kata pembingkai. Pencarian makna hanya lewat ADR baru.
3. Pilih varian terbaik dari uji gratis, jalankan `peninjau` dan tutup temuannya, lalu **satu** eval publik berbayar setelah izin pemilik: `SURAU_EVAL_STATE=<folder ihya-v7> pnpm run eval:jawab answer --run <nama> --budget-usd 0.3 --confirm`.
4. Holdout tidak dipakai untuk merancang dan tidak dijalankan.

## Selesai bila

- [x] Cakupan gold di dokumen dan lokasi eval sebelum/sesudah tercatat di ADR baru (ADR-067): dokumen 27,0 → 30,5/34 (uji gratis, 6 set rute), lokasi eval 73,5–76,5% → 82,4%
- [x] Kutipan valid tetap 100% pada eval publik berbayar (`x03-publik-lokasi-v1`: 156/156)
- [x] Biaya per jawaban tetap ±US$0,002–0,003 (US$0,0027 rata-rata)
- [x] `pnpm verify` lolos (format, lint, typecheck, tes, build)
- [x] STATUS, LOG, dan file sesi ini sudah diperbarui
- [x] PR di-merge (squash) setelah CI hijau: PR #102, CI 4/4 lolos (1 dilewati), merge 2026-10-21 `d3b85b3`

## Di luar cakupan

- Prompt jawaban `answer@5` dan prompt routing `answer-route@2` (tidak diubah).
- Status hadits dari label takhrij yang ditinjau, kalibrasi judge, review ustadz (T-24), persetujuan tampilan (T-25).
- Pencarian makna/embedding (ADR-046) dan mengubah gold eval.

## Catatan hasil

- **Ukur gratis:** `pnpm run eval:jawab kandidat --input <diagnostik,…>` (baru) mengulang langkah 2 pipeline (`jawabCandidates`, diekstrak dari `runJawab`) atas rute tersimpan. Baseline kode S21: 27,0/34 (6 set rute desain), 26,25/34 (4 set rute lama untuk validasi).
- **Dipakai (ADR-067):** daftar pertanyaan global ×3 di RRF, bagian 3 halaman, ≤ 3 bagian dari ringkasan AI bagian (routing kedua tanpa LLM, hanya sisa jatah 20), pertanyaan panjang dipotong per aksara (`queryWordOverflow`), `JAWAB_PIPELINE_VERSION` 4, arsip eval mencatat `+pipeline@4`. Hasil gratis 30,5/34 (validasi 30,0/34).
- **Eval berbayar sekali** (US$0,1134): kutipan valid 100%, lokasi 82,4% (28/34), penolakan tepat 100%, tidak salah menolak 100%, US$0,0027/jawaban. Sisa: 3 soal topik tersebar tak terjangkau leksikal (j018, j019, j021), 3 soal gold ada di dokumen tetapi jawaban menyitasi sebagian (j014, j020, j023).
- **Tidak dipakai:** routing dua langkah dengan LLM (±2–3× biaya), pembersihan kata pembingkai (+0), round robin (+0 sesudah bobot), lebih banyak kueri per bagian (lebih buruk), saran peninjau saring turunan/ambang sebagian kata (+0).
- **Untuk sesi berikutnya:** R4 lokasi ≥ 90% belum (82,4%). Dua jalur: (1) prompt jawaban untuk pertanyaan perbandingan agar menyitasi tiap lokasi (3 soal; eval ulang berbayar), (2) pencarian makna lewat ADR baru (ADR-046) atau gold topik tersebar yang ditinjau Anas (T-24). Kenaikan ini in-sample (soal publik yang sama); bukti akhir R4 tetap butuh holdout.
- Biaya API sesi: US$0,1134. Holdout tidak dipakai.
