# Eval Jawab (S18)

Status 2026-10-19: **60 draf, belum ada persetujuan ustadz**. Set ini menguji alat evaluasi sebelum pipeline Jawab S19 tersedia. Lihat [panduan penilai dan operasi](../../docs/tinjau-operasional.md), [metrik](../../docs/06-evaluasi.md), dan ADR-052.

| Jenis | Jumlah |
|---|---:|
| Lokasi + isi | 24 |
| Topik tersebar | 9 |
| Status hadits | 9 |
| Di luar cakupan | 6 |
| Premis keliru | 6 |
| Atribusi | 6 |

`ihya-draf-v1.jsonl` memuat 42 soal publik (`jNNN`); 18 holdout (`pNNN`) berada di `evals/private/jawab.jsonl`, bukan git. Semua `disetujui_oleh` masih `null`. Persetujuan pemilik atas set retrieval S15 tidak berlaku untuk set Jawab ini. Lokasi/sumber sudah diperiksa kode terhadap `ihya-v6`; ketepatan makna dan poin kunci tetap perlu Anas. Soal holdout tidak dipakai untuk merancang perbaikan.

Kontrak Zod ada di `packages/core/src/eval-schema.ts`. Pertanyaan, poin kunci, dan jawaban hanya teks Latin; kutipan disimpan sebagai `{passage_id, char_start, char_end}` (offset UTF-16, akhir eksklusif, maksimal 2.000 karakter). Kode mengambil teks dari DB dan memverifikasi sebelum tampil. Snapshot jawaban mencatat hash soal/jawaban, versi korpus, model, prompt, biaya, latensi, dan waktu.

## Perintah gratis

```bash
pnpm run eval:jawab baseline --mode empty --run contoh-empty-v1
pnpm run eval:jawab baseline --mode search --run contoh-search-v1
pnpm run eval:jawab score --input evals/private/jawab-runs/s18-calibration-v1.jsonl --judge evals/private/jawab-runs/s18-calibration-v1-judge.jsonl --run contoh-score-v1
pnpm run eval:jawab seed --input evals/private/jawab-runs/s18-tinjau-v1.jsonl --run contoh-seed-v1
```

Uji kandidat gratis (tanpa LLM; X03, X13):

```bash
# Rute routing tersimpan dari arsip diagnostik (mesin yang punya evals/private/jawab-runs/):
pnpm run eval:jawab kandidat --input evals/private/jawab-runs/x03-publik-lokasi-v1-diagnostik-publik.jsonl
# Tanpa arsip: pertanyaan + ringkasan saja, atas korpus staging (hanya SELECT):
pnpm run eval:jawab kandidat --tanpa-rute --remote
# + daftar pencarian makna dari berkas peringkat {id, passage_ids} (soal publik saja):
pnpm run eval:jawab kandidat --tanpa-rute --remote --semantik PERINGKAT.jsonl --makna-k 20 --makna-bobot 1
```

Untuk soal status hadits, "lengkap" berarti halaman gold **dan** catatan kaki takhrij gold ada di dokumen (sejak X13). Berkas peringkat makna dibuat di luar repo (ADR-093); `answer --semantik` memakainya di run berbayar dan menandai arsip `+makna-berkas`.

Baseline membaca korpus lokal yang disalin ke direktori sementara; `--remote` hanya korpus staging. Set privat wajib tersedia kecuali `--publik-saja` dinyatakan. `seed` hanya menghasilkan SQL `INSERT`, tidak mengirim ke D1. Nama run baru wajib unik; keluaran tidak ditimpa. Arsip per soal/SQL/hasil judge berada di `evals/private/jawab-runs/`; laporan publik hanya agregat.

## Judge berbayar

Prompt `packages/llm/prompts/jawab-judge-v1.ts` memakai Sonnet 5.5, Message Batches, effort low, JSON terstruktur, maksimal 2.048 token keluaran. Skor manusia dan identitas penilai tidak dikirim. `judge-plan` memakai `countTokens` gratis tetapi **mengirim contoh dan sumber ke Anthropic**: izin pemilik harus mencakup data dan tujuan ini sebelum dijalankan.

```bash
pnpm run eval:jawab judge-plan --input evals/private/jawab-runs/s18-calibration-v1.jsonl --run NAMA_BARU
# Sesudah izin biaya, data, dan tujuan dari pemilik:
pnpm run eval:jawab judge-submit --run NAMA_BARU --budget-usd 1 --confirm
pnpm run eval:jawab judge-collect --run NAMA_BARU
```

Submit menghitung batas biaya (input + buffer 10% + keluaran maksimum), memverifikasi ulang plan terhadap sumber/record, dan mencatat pengiriman sebelum request. Jika status `submitting` tertinggal setelah putus jaringan, rekonsiliasi di Anthropic; jangan menghapus receipt lalu mengirim ulang. Hasil ditautkan ke hash snapshot, bukan sekadar ID. Keluaran terpotong/invalid/hilang dicatat gagal, tanpa skor buatan dan tanpa retry berbayar otomatis.

Batch S18 diizinkan maksimal US$1 untuk **30 contoh publik** dan potongan sumbernya. Batas estimasi US$0,377774; biaya aktual **US$0,112528**; **29/30 valid**, satu `max_tokens`. Tidak ada holdout yang dikirim ke judge ini. Contoh `calibration-fixture-v1` disusun agent dan sebagian sengaja salah; hasilnya **bukan mutu pipeline Jawab**. Laporan: [kosong](../reports/jawab-s18-empty-v1.md), [Cari](../reports/jawab-s18-search-v1.md), [contoh kalibrasi](../reports/jawab-s18-calibration-v1.md).

## Membentuk set resmi dan kalibrasi

Unduh semua halaman ekspor dari `/tinjau` (maksimal 50 jawaban per halaman), gabungkan JSONL secara lokal, dan simpan hanya di folder privat. Jalankan:

```bash
pnpm run eval:jawab golden --reviews evals/private/reviews.jsonl --reviewer Anas --run anas-v1
pnpm run eval:jawab score --input evals/private/jawab-runs/s18-calibration-v1.jsonl --judge evals/private/jawab-runs/s18-calibration-v1-judge.jsonl --reviews evals/private/reviews.jsonl --reviewer Anas --run anas-calibration-v1
```

Golden menolak persetujuan yang bertentangan, versi soal ganda, atau klasifikasi publik/privat yang berubah. Kedua keluaran golden awalnya **privat**; periksa sebelum menyalin berkas publik ke sini dan mengunggah revisi holdout ke kunci R2 baru. Nama penilai adalah nama yang diisi manusia, bukan bukti identitas terpisah dari akun Access; jangan menghitung `Agent QA` sebagai Anas.

Kalibrasi hanya memasangkan hash soal, hash jawaban, versi korpus, dan versi judge yang sama, dengan dua skor manusia tersedia. Saat ini **0 pasangan**, sehingga belum ada angka kesepakatan. Target ±30 penilaian manusia; keluaran judge yang gagal tetap dikeluarkan dari penyebut dan dilaporkan.

Metrik tanpa sampel = `—`, bukan 100%. Lokasi harus memenuhi semua lokasi gold. Penolakan membutuhkan teks dan flag eksplisit; pemeriksaan semantik tetap milik manusia/judge. Status hadits harus cocok dengan gold dan catatan takhrij yang tertaut; klaim ganda yang bertentangan gagal. Pola bahasa fatwa hanya heuristik, bukan penilaian kebijakan lengkap. S18 belum memasang gerbang rilis R4 karena set resmi dan kalibrasinya belum tersedia.

## Evaluasi agent sementara

Atas permintaan pemilik, 60 ulasan **Agent QA S18** sudah tersedia, terpisah dari Anas. [Laporan](../reports/jawab-s18-agent-qa-v1.md) mencatat 30 pemeriksaan semantik publik dan 30 baseline belum lengkap; tidak ada persetujuan soal. Kesepakatan antarmodel bukan kalibrasi manusia. T-24 ditunda tanpa menghalangi dev S19 (ADR-054). Jangan menjalankan `golden --reviewer "Agent QA S18"` sebagai set resmi.
