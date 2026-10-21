# X05 · Sesi sisipan: lokasi benar di tahap jawaban Jawab

> **Fase:** sisipan Fase 4 (sesudah X03, sebelum `/rilis 4`) · **Status:** berjalan
> **Prasyarat:** X03 selesai (ADR-067) · izin pemilik di chat untuk satu eval publik berbayar (±US$0,10, pagu run 0,3): "Ya, saya izinkan" (2026-10-21)
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Sesudah X03, lokasi eval publik 82,4% (28/34), target R4 ≥ 90%. Dari 6 soal yang gagal, 3 (j014, j020, j023) sudah punya semua halaman gold di dokumen jawaban, tetapi jawabannya menyitasi halaman lain. Jadi masalahnya di tahap jawaban, bukan pencarian. 3 soal lain (j018, j019, j021) tak terjangkau pencarian kata dan di luar cakupan sesi ini.

## Baca dulu (hanya ini)

- ADR-064 (pipeline Jawab), ADR-066 (eval S21), ADR-067 (kandidat X03, temuan 3 soal gagal di tahap jawaban).
- `evals/README.md` (aturan holdout: holdout tidak boleh dipakai merancang).

## Langkah

1. Bedah gratis arsip `evals/private/jawab-runs/x03-publik-lokasi-v1*.jsonl` (soal publik saja) untuk j014, j020, j023: dokumen gold apa yang ada di prompt, di peringkat berapa, berterjemahan atau tidak, dan apa yang disitasi.
2. Ubah tahap jawaban seminimal mungkin: prompt `answer@6` (instruksi umum, bukan kata kunci soal eval) dan, bila bedah menunjukkannya, `answer.ts`/`pipeline.ts`.
3. Jalankan subagen `peninjau` dan tutup temuannya sebelum eval berbayar.
4. Izin biaya pemilik di chat, lalu **satu** eval publik berbayar dengan folder D1 `ihya-v7` terpisah (`SURAU_EVAL_STATE`, dibangun dari `data/build/surau-corpus-ihya-v7.sqlite`).
5. Holdout tidak dipakai untuk merancang dan tidak dijalankan.

## Selesai bila

- [ ] Lokasi dan kutipan valid sebelum/sesudah tercatat di ADR baru (ADR-068)
- [ ] Kutipan valid tetap 100%
- [ ] Penolakan tepat dan tidak salah menolak tidak turun
- [ ] Biaya per jawaban tetap ±US$0,002–0,003
- [ ] `pnpm verify` lolos (format, lint, typecheck, tes, build)
- [ ] STATUS, LOG, dan file sesi ini sudah diperbarui
- [ ] PR di-merge (squash) setelah CI hijau

## Di luar cakupan

- Pencarian kandidat (`retrieve.ts`, routing `answer-route@2`), pencarian makna (ADR-046), dan 3 soal yang tak terjangkau pencarian kata.
- Status hadits dari label takhrij yang ditinjau, kalibrasi judge, review ustadz (T-24), persetujuan tampilan (T-25), mengubah gold eval.

## Catatan hasil

*(diisi di akhir sesi)*
