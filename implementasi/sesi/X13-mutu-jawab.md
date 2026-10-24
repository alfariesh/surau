# X13 · Sesi sisipan: mutu Jawab (Maknaz) sebelum `/rilis 4`

> **Fase:** sisipan Fase 4 (sesudah X05–X07, sebelum `/rilis 4`) · **Status:** sebagian (langkah gratis + eval publik berbayar (a) selesai 2026-10-24; lokasi tidak naik; holdout dan produksi ditunda)
> **Prasyarat:** X03, X05, X06, X07 selesai · Tugas pemilik: T-24 (tinjauan Ust. Anas, untuk kalibrasi judge dan gold), izin biaya di chat untuk setiap langkah berbayar
> **Nomor:** X12 disisihkan untuk perbaikan mode baca (X11), jadi sesi ini X13.
> **Perkiraan:** 1–2 percakapan agent (gratis dulu, berbayar sesudah izin)

## Kenapa sesi ini ada

Syarat R4 yang belum terpenuhi sesudah X05–X07 (STATUS, ADR-068–070):
- **Lokasi benar 85,3% (29/34) < 90%**, dan angka itu *in-sample* (soal publik yang sama dipakai merancang). Sisa kegagalan: 3 soal topik tersebar yang halaman gold-nya tak terjangkau pencarian kata (j018, j019, j021), j023 (gold h290 vs h292 di bagian yang sama, menunggu T-24), dan j024 (takhrij gold tidak terambil).
- **Judge belum terkalibrasi** (0 pasangan skor manusia ↔ judge).
- **Holdout belum pernah dijalankan** untuk Jawab.

ADR-046 menunda pencarian makna sampai eval membuktikan perlu; ADR-067 menyatakan bila lokasi tetap < 90% karena soal yang tak terjangkau leksikal, pencarian makna butuh ADR sendiri. Sesi ini menulis ADR itu dengan bukti gratis dulu.

## Baca dulu (hanya ini)

- ADR-045/046 (aturan holdout, penundaan embedding), ADR-064, ADR-067, ADR-068, ADR-069.
- `evals/README.md` dan `evals/jawab/README.md` (holdout, judge, kalibrasi).
- `.claude/rules/teks-arab.md` (kutipan tetap disalin dari DB; pencarian makna hanya memilih paragraf).
- Docs Cloudflare Workers AI `@cf/baai/bge-m3` dan Vectorize (harga, batas) lewat MCP `cloudflare-docs`.

## Aturan holdout (ADR-045/046)

Soal privat (`p…`) **tidak dipakai merancang** perbaikan, tidak dibaca isinya, dan topiknya tidak disebut. Semua rancangan dan uji gratis memakai 42 soal publik `evals/jawab/ihya-draf-v1.jsonl`. Holdout hanya dijalankan sekali sesudah kode dibekukan, dengan laporan agregat.

## Langkah

### A. Gratis (dikerjakan sesi ini)

1. **Bedah j024** atas korpus staging `ihya-v8` (`--remote`, hanya SELECT): di mana paragraf hadits dan takhrij gold berada dalam daftar pencarian.
2. **Cakupan gratis yang jujur untuk soal status hadits:** `docCoverage` menghitung catatan kaki takhrij gold sebagai syarat tersendiri, bukan cukup halamannya (rekomendasi X05).
3. **`kandidat --tanpa-rute`:** uji kandidat gratis tanpa arsip diagnostik (mesin pemilik yang baru tidak punya `evals/private/jawab-runs/`): pertanyaan + ringkasan saja, sama untuk semua varian.
4. **Kait pencarian makna di pipeline** (`semanticList`, `JawabDeps.semanticSearch`, parameter `semantic` di `jawabCandidates`): satu daftar RRF tambahan, mati bila tidak diisi. Worker belum mengisinya, jadi perilaku produksi tidak berubah.
5. **Eksperimen lokal gratis:** embedding `bge-m3` (ONNX q8, model sama dengan `@cf/baai/bge-m3`) atas 20.509 paragraf staging di CPU mesin pemilik, di luar repo; peringkat makna 42 soal publik; `kandidat --tanpa-rute --semantik …` dengan beberapa nilai k dan bobot.
6. **ADR-093** (pencarian makna): keputusan berdasarkan angka langkah 5, rancangan produksi (Workers AI + Vectorize), biaya, dan apa yang menunggu izin.
7. **Persiapan kalibrasi judge dan holdout:** perintah, perkiraan biaya, dan syaratnya ditulis di sini dan di laporan ke pemilik.

### B. Berbayar (menunggu izin pemilik di chat beserta plafon)

8. **Embedding produksi:** Workers AI `bge-m3` atas korpus (±2,2 juta token, ±US$0,03) + indeks Vectorize (gratis dalam kuota Workers Paid); lalu Worker mengisi `semanticSearch`.
9. **Satu eval publik berbayar** dengan pencarian makna (±US$0,12) untuk mengukur lokasi sesudah perbaikan.
10. **Satu run holdout** (18 soal privat, ±US$0,05), sesudah kode dibekukan.
11. **Judge terkalibrasi:** hanya sesudah ±30 penilaian Anas (T-24); judge Sonnet Batches atas pasangan yang sama (±US$0,12, batas ≤ US$1).

## Selesai bila

- [x] Bedah j024 tercatat (ADR-093 "Bedah j024"): tanpa rute, paragraf hadits dan takhrij gold tidak ada di daftar pertanyaan global (peringkat −1); takhrij ditemukan daftar bagian ringkasan (bagian 100001, peringkat 4). Penyebab: istilah berbeda ("alim" vs "orang berilmu") dan 0/4.398 catatan kaki berterjemahan
- [x] `docCoverage` memeriksa catatan kaki takhrij gold untuk soal status hadits, dengan tes (`answer-candidates.test.ts`)
- [x] `pnpm run eval:jawab kandidat --tanpa-rute --remote` berjalan; baseline **26/34** (`ihya-v8`)
- [x] Kait pencarian makna di pipeline + tes unit; tanpa sumber makna, RRF tidak berubah (`jawab-unit.test.ts` "daftar makna")
- [x] Eksperimen lokal tercatat di ADR-093: 26 → **30/34** (k 20, bobot 2); j018 lengkap; j019, j021 (gold bersama j1 h55) dan j024, j026 belum
- [x] ADR-093 ditulis (keputusan, biaya dari docs Cloudflare 2026-10-24, risiko, langkah berbayar)
- [x] Perintah + perkiraan biaya langkah B tertulis (di bawah)
- [x] `pnpm verify` lolos (format, lint, typecheck, tes, build): 851 + 387 tes, build
- [x] Subagen `peninjau` dijalankan: 0 blocker, 3 penting + 4 kecil ditutup; 2 saran (batas waktu `semanticSearch` di pipeline, saring ID per edisi) dicatat untuk sesi yang menyalakan Worker
- [x] STATUS, LOG, dan file sesi ini sudah diperbarui
- [x] PR di-merge (squash) setelah CI hijau: langkah gratis PR #131 (`605889a`); hasil eval berbayar di PR berikutnya
- [ ] (berbayar, sesudah izin) lokasi eval publik ≥ 90% dengan pencarian makna, kutipan valid 100%, penolakan tepat tidak turun — **tidak tercapai**: `x13-publik-makna-v1` (US$0,1171) lokasi 85,3% (29/34, sama dengan X05); kutipan valid 100% (148/148), penolakan tepat 100% (8/8). Lihat ADR-093 "Eval publik berbayar"
- [ ] (berbayar, sesudah izin) holdout dijalankan sekali; laporan agregat
- [ ] (T-24 + izin) kesepakatan judge ↔ Anas tercatat atas ≥ 30 pasangan

## Di luar cakupan

- Mengubah gold eval (j023, gold bersama j1 h55): menunggu T-24.
- Prompt jawaban/routing, label status hadits, UI Tanya.
- Menyalakan pencarian makna di Worker produksi sebelum embedding produksi dan eval berbayar lolos.
- `/rilis 4`.

## Perintah langkah berbayar (belum dijalankan; tunggu izin pemilik di chat beserta plafon)

Semua dari root repo di mesin pemilik. Tanpa `--confirm`, perintah `answer` hanya mencetak rencana (gratis).

**(a) Eval publik dengan pencarian makna** (42 soal, pipeline penuh dengan routing, korpus staging `ihya-v8`; ±US$0,0028 × 42 ≈ **US$0,12**, pagu **0,30**):

```bash
pnpm run eval:jawab answer --run x13-publik-makna-v1 --remote --semantik evals/jawab/makna/x13-bge-m3-q8-publik.jsonl --budget-usd 0.3
pnpm run eval:jawab answer --run x13-publik-makna-v1 --remote --semantik evals/jawab/makna/x13-bge-m3-q8-publik.jsonl --budget-usd 0.3 --confirm
```

Pembanding tanpa makna dengan routing yang sama tidak ada (rute X05 tersimpan di Mac pemilik). Bila arsip `x03-publik-lokasi-v1-diagnostik-publik.jsonl` tersedia, varian lebih adil: tambah `--rute <arsip>` (tanpa routing, ±US$0,11).

**(b) Holdout sekali** (18 soal privat, sesudah (a) dan kode dibekukan; ±US$0,0028 × 18 ≈ **US$0,05**, pagu **0,15**). Butuh salinan soal privat di mesin ini (salinan baru dicatat di `evals/README.md`) dan peringkat maknanya (gratis, lokal):

```bash
pnpm wrangler r2 object get surau-evals/jawab/2026-10-19-draf-v1.jsonl --file evals/private/jawab.jsonl --remote
node docs/riset/2026-10-24-makna-lokal/rank.mjs data/build/makna evals/private/jawab.jsonl evals/private/x13-makna-holdout.jsonl mix --privat
pnpm run eval:jawab answer --run x13-holdout-v1 --remote --termasuk-privat --privat-saja --semantik evals/private/x13-makna-holdout.jsonl --budget-usd 0.15 --confirm
```

Laporan holdout hanya agregat (aturan ADR-045).

**(c) Embedding + indeks produksi** (sesudah (a) menunjukkan kenaikan): Workers AI `@cf/baai/bge-m3` ±2,2 juta token ≈ **US$0,03** per bangun korpus + Vectorize ±**US$0,006/bulan**. Kode ingest + binding Worker dikerjakan di sesi lanjutan (ADR-093 butir 3).

**(d) Kalibrasi judge:** tidak butuh biaya baru. Judge S18 sudah menilai 30 contoh kalibrasi (`s18-calibration-v1-judge.jsonl`, arsip di Mac pemilik) dan contoh yang sama sudah ada di `/tinjau`. Begitu Anas menilai ±30 contoh (T-24 langkah 3), perintah gratis `pnpm run eval:jawab score --input … --judge … --reviews … --reviewer Anas` menghitung kesepakatan. Judge atas jawaban pipeline baru (±US$0,11 per 30, pagu ≤ US$1) hanya bila pemilik ingin judge menilai jawaban X13 juga.

## Catatan hasil

- **Dibuat:** kait pencarian makna (`semanticList`, `SEMANTIC_LIMIT` 20, `SEMANTIC_WEIGHT` 2, `JawabDeps.semanticSearch`, `diagnostics.semantic`), mati di Worker; `kandidat --tanpa-rute`, `--semantik`/`--makna-k`/`--makna-bobot`; `answer --semantik` (arsip `+makna-berkas`); cakupan status hadits menuntut catatan kaki gold; prototipe embedding lokal `docs/riset/2026-10-24-makna-lokal/`; peringkat makna 42 soal publik `evals/jawab/makna/x13-bge-m3-q8-publik.jsonl` (hanya ID).
- **Angka gratis (tanpa rute, `ihya-v8`):** 26 → 30/34. Sapuan k {10, 20, 30, 50} × bobot {1, 2, 3}: bobot 1 = 29 (tidak menolong topik tersebar), k 10 = 29, k ≥ 20 bobot ≥ 2 = 30.
- **Temuan untuk T-24:** j1 h55 adalah gold bersama j018/j019/j021 dan untuk j019/j021 tak terjangkau kata maupun makna (h55 di peringkat makna 110 dan > 200). Perlu ditinjau Anas, bukan disetel.
- **Batas mesin:** mesin pemilik sekarang tanpa `evals/private/` dan korpus lokal lengkap; semua uji memakai staging `--remote` (SELECT saja). Vektor lokal di `data/build/makna/` (git-ignored).
- **Belum:** langkah B (berbayar), j024 dengan daftar makna berbobot (catatan kaki takhrij kalah anggaran; usul: daftar makna khusus catatan kaki untuk soal status hadits), varian embedding Arab saja.
- **Eval publik berbayar (a)** atas izin pemilik ("Ya, saya izinkan eval publik X13 dengan pencarian makna, pagu US$0,30"): US$0,1171, lokasi 85,3% (29/34), kutipan 100%, penolakan tepat 8/8, takhrij 5/6. Kandidat atas rute run ini 29 → 31/34 dengan makna, tetapi jawaban j018 hanya menyitasi paragraf sekitar h55, tidak paragraf gold h13 (10000184) yang ada di dokumen. Gagal tetap j018, j019, j021, j023, j024.
- **Keputusan sesudah (a):** produksi (c) tidak disarankan; holdout (b) belum (izin hanya untuk a, dan baru bermakna sesudah ada kenaikan). Jalan berikutnya: T-24 (gold j019/j021/j023), lalu tahap jawaban untuk topik tersebar dua lokasi (j018) dan takhrij j024.
- `answer` kini memuat set privat hanya dengan `--termasuk-privat` (run publik tidak butuh salinan holdout lokal).
- **Lanjutan (ADR-094, gratis):** daftar makna khusus catatan kaki takhrij untuk soal hadits (k 10): kandidat atas rute X13 31 → **32/34** (j024 lengkap, status hadits 6/6). j018 tidak disetel: jawaban menyitasi bab tugas guru h55–57 yang menjawab kedua sisi; gold h13 ditinjau di T-24. Eval atas rute tersimpan + peringkat v2 (izin pemilik, US$0,1116): **lokasi 88,2% (30/34)**, takhrij 6/6, kutipan 100% (172/172), penolakan tepat 7/8 (j033 tanpa kalimat baku di awal, kali kedua). Lokasi gagal tinggal j018, j019, j021, j023 (T-24).
- Biaya API sesi: **US$0,2287** (US$0,1171 + US$0,1116). Holdout tidak dibaca dan tidak dipakai.
