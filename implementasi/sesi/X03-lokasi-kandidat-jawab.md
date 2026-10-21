# X03 · Sesi sisipan: cakupan lokasi gold di kandidat Jawab

> **Fase:** sisipan Fase 4 (sesudah S21, sebelum `/rilis 4`) · **Status:** berjalan
> **Prasyarat:** S19–S21 selesai · izin pemilik di chat untuk satu eval publik berbayar (±US$0,11, pagu run 0,3)
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

- [ ] Cakupan gold di dokumen dan lokasi eval sebelum/sesudah tercatat di ADR baru (ADR-067)
- [ ] Kutipan valid tetap 100% pada eval publik berbayar
- [ ] Biaya per jawaban tetap ±US$0,002–0,003
- [ ] `pnpm verify` lolos (format, lint, typecheck, tes, build)
- [ ] STATUS, LOG, dan file sesi ini sudah diperbarui; PR di-merge (squash) setelah CI hijau

## Di luar cakupan

- Prompt jawaban `answer@5` dan prompt routing `answer-route@2` (tidak diubah).
- Status hadits dari label takhrij yang ditinjau, kalibrasi judge, review ustadz (T-24), persetujuan tampilan (T-25).
- Pencarian makna/embedding (ADR-046) dan mengubah gold eval.

## Catatan hasil

*(diisi agent di akhir sesi)*
