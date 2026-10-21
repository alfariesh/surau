# X05 · Sesi sisipan: lokasi benar di tahap jawaban Jawab

> **Fase:** sisipan Fase 4 (sesudah X03, sebelum `/rilis 4`) · **Status:** selesai (satu butir tidak dicentang, lihat di bawah)
> **Prasyarat:** X03 selesai (ADR-067) · izin pemilik di chat untuk satu eval publik berbayar (±US$0,10, pagu run 0,3): "Ya, saya izinkan" (2026-10-21); sesudah hasilnya, ulang 8 soal jebakan (±US$0,02): "Cek kecil dulu" (2026-10-21)
> **Nomor:** semula X04, diganti X05 karena X04 dipakai rencana mutu baca (#104) yang ter-merge di tengah sesi.
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

- [x] Lokasi dan kutipan valid sebelum/sesudah tercatat di ADR baru (ADR-068): lokasi 82,4% (28/34) → 85,3% (29/34), kutipan valid 100% → 100%
- [x] Kutipan valid tetap 100% (`x05-publik-jawaban-v1`: 176/176; `x05-publik-tolak-v1`: 18/18)
- [ ] Penolakan tepat dan tidak salah menolak tidak turun — **tidak dicentang**: tidak salah menolak tetap 100% (34/34), tetapi penolakan tepat turun 8/8 → 7/8 di run utama (j033 tanpa kalimat baku → turun ke Cari, aman, tanpa klaim). Ulangan 8 soal jebakan atas izin pemilik: 8/8; gabungan `answer@6` 15/16. Pemilik memilih "Cek kecil dulu" dengan kesepakatan merge bila ulangan 8/8 (ADR-068)
- [x] Biaya per jawaban tetap ±US$0,002–0,003: jawaban US$0,00257 terukur (tanpa routing, `--rute`) + routing ±US$0,0002–0,0003 → ±US$0,0028
- [x] `pnpm verify` lolos (format, lint, typecheck, tes, build)
- [x] STATUS, LOG, dan file sesi ini sudah diperbarui
- [ ] PR di-merge (squash) setelah CI hijau

## Di luar cakupan

- Pencarian kandidat (`retrieve.ts`, routing `answer-route@2`), pencarian makna (ADR-046), dan 3 soal yang tak terjangkau pencarian kata.
- Status hadits dari label takhrij yang ditinjau, kalibrasi judge, review ustadz (T-24), persetujuan tampilan (T-25), mengubah gold eval.

## Catatan hasil

- **Bedah gratis** (rekonstruksi dokumen dari rute tersimpan): pada j014, j020, dan j023 halaman gold ada di dokumen, tetapi paragrafnya tercecer di peringkat RRF dan sering tanpa terjemahan AI (hanya 12 teratas yang diberi terjemahan). Jawaban menyitasi kesimpulan atau halaman tetangga di bagian yang sama. Instruksi perbandingan v5 sudah ada, dan model memang menyitasi tiap sisi.
- **Dibuat (ADR-068):**
  - `orderBySection`: dokumen dikelompokkan per bagian, kelompok urut peringkat terbaik, di dalam kelompok urut kitab (juz, halaman, badan sebelum catatan kaki, `ord`; `AnswerPassage.ord` baru). `JAWAB_PIPELINE_VERSION` 5.
  - Prompt `answer@6`.
  - `JawabDeps.savedRoute` (hanya eval) + `normalizeRoute` bersama `parseRoute`.
  - `eval:jawab answer --rute <diagnostik>` (`savedRoutesFor`; arsip `+rute-tersimpan`; laporan menyatakan tanpa routing).
  - Tes unit, runner, dan Worker (workerd).
- **Peninjau** dua putaran: putaran 1 memberi 4 temuan penting (urutan dari ID melanggar ADR-029, kalimat prompt "berdampingan = bersambung", arsip `--rute` tak bisa dibedakan, gerbang proses) dan 6 kecil, semuanya ditutup kecuali konteks "Bagian:" catatan kaki yang dipindah (opsional) dan subpath khusus eval (ditunda, dicatat di ADR). Putaran 2 memberi 4 temuan kecil, 3 ditutup sebelum eval; biaya routing ditulis terbuka.
- **Eval** (US$0,1078 + US$0,0162 = **US$0,1239**): dokumen identik dengan X03 untuk 42/42 soal.
  - j014 dan j020 kini benar.
  - j023 tetap gagal: paragraf sumber gold h290 di luar dokumen; jawaban menyitasi h292 di bagian yang sama.
  - j024 1 → 0 adalah artefak halaman: takhrij gold tidak ada di dokumen pada kedua run.
  - j033 turun ke Cari di run utama, lalu 8/8 di ulangan.
- **Untuk sesi berikutnya:** R4 lokasi ≥ 90% belum (85,3%, in-sample).
  - Sisa: 3 soal tak terjangkau pencarian kata (j018, j019, j021: pencarian makna lewat ADR baru, atau gold ditinjau T-24), j023 (gold halaman h290 vs h292 di bagian yang sama: tinjau gold di T-24), j024 (takhrij gold tidak terambil: pencarian).
  - Cakupan gratis untuk soal status hadits sebaiknya memeriksa catatan kaki gold, bukan halaman.
  - Simpan teks mentah model untuk hasil fallback soal publik di arsip diagnostik supaya penolakan yang gagal bisa dibedah.
  - Holdout belum dijalankan.
