# S18 · Eval Jawab & halaman tinjau ustadz

> **Fase:** 4 · **Status:** sebagian (2026-10-19; implementasi teknis siap; penilaian Anas/T-24 menunggu)
> **Prasyarat:** Fase 3 dirilis · Tugas pemilik: **T-13** (ustadz), Cloudflare Access untuk `/tinjau` (bagian dari T-14), **P-7** (penyimpanan dan retensi data)
> **Perkiraan:** 1–2 percakapan agent, ditambah waktu ustadz

## Tujuan

Sebelum ada pipeline Jawab, sudah tersedia **alat ukurnya**: set soal 50–100 bersama ustadz, runner eval dengan metrik deterministik dan LLM-judge yang terkalibrasi, serta halaman `/tinjau` berbahasa Indonesia (Arab RTL) tempat ustadz menilai jawaban.

## Baca dulu

- [docs/06-evaluasi.md](../../docs/06-evaluasi.md) (komposisi soal, metrik, target) dan ADR-015 (eval buatan sendiri, Langfuse cadangan).
- Skill `claude-api`, subcommand `build-eval` (panduan menyusun eval).

## Langkah

### Prasyarat dan keputusan awal (2026-10-18)

- Fase 3 sudah dirilis dan berada di `main` (`34ed7eb`, PR #44); `main` sama dengan `origin/main`.
- Pemilik menunjuk **Anas** sebagai penilai (T-13). Ini bukan persetujuan soal atau penilaian jawaban.
- Pemilik memberikan satu email untuk Access; alamat hanya dimasukkan ke Cloudflare, tidak ke repo publik. Lindungi `/tinjau` dan `/api/review`; setiap pembacaan/mutasi juga memverifikasi JWT di aplikasi. Tujuan wildcard preview belum diizinkan, jangan dibuat.
- Retensi awal mengikuti usulan P-7: 12 bulan. S18 hanya memasukkan soal eval yang dikurasi; penyimpanan pertanyaan pengguna umum dan penyamaran PII belum diaktifkan.
- Perubahan judul beranda 40 px milik pemilik dipertahankan; diterapkan kembali ke susunan beranda terbaru setelah merge UI PR #30.
- Skill `claude-api` tidak ditemukan lokal; panduan resmi Anthropic `build-eval` dan `eval-audit` dibaca melalui docs-terbaru. Pemilik kemudian mengizinkan 30 contoh + potongan sumber ke Anthropic, pagu US$1.

### Implementasi terukur

1. Susun **60 draf soal**: 24 lokasi+isi, 9 topik tersebar, 9 status hadits, 6 di luar cakupan, 6 premis keliru, 6 atribusi. Pisahkan 18 soal privat sebelum pengujian. Verifikasi lokasi dan sumber terhadap korpus; simpan kunci berupa poin Indonesia dan ID/offset sumber, tanpa menyalin teks kitab ke git. Persetujuan awal `null`.
2. Tetapkan kontrak jawaban dan rubrik: jawaban kosong tidak dihitung sebagai penolakan; metrik tanpa sampel ditulis tidak tersedia. Verifikasi kutipan menggunakan sumber DB, lokasi terhadap gold, penolakan eksplisit, takhrij terhadap sumber yang tertaut, pola bahasa fatwa. Laporkan cakupan tiap metrik dan hasil draf terpisah dari set resmi.
3. Tambahkan runner `eval:jawab` untuk baseline kosong/Cari (gratis), input jawaban tersimpan, persiapan judge, pengiriman batch dengan pagu eksplisit, pembacaan hasil, dan laporan. Artefak berisi teks privat/kitab berada di folder git-ignored; laporan publik hanya agregat dan ID soal privat.
4. Tambahkan prompt judge Sonnet 5.5 berversi untuk kesetiaan dan atribusi, keluaran JSON tervalidasi. Bandingkan dengan ±30 penilaian Anas atas versi jawaban yang sama; catat jumlah pasangan, kesepakatan dan kasus tak bisa dinilai. Skor manusia tidak dikirim ke judge. Belum ada kalibrasi sampai penilaian manusia benar-benar tersedia.
5. Migrasi app D1 untuk `answer_log` dan `review`, terpisah dari korpus blue-green. Simpan versi/hash soal, jawaban dan sumber; batasi ukuran input, umur data, dan ekspor. Tinjauan tidak boleh diam-diam dipakai untuk jawaban yang berubah.
6. Bangun `/tinjau`: daftar soal/jawaban, persetujuan soal, teks sumber Arab lewat `ArabicText`, Benar/Kurang/Salah, bahasa 1–5, kesetiaan/atribusi, alasan dan komentar. Mutasi lewat route handler dengan autentikasi dan pemeriksaan Origin, tanpa Server Actions/middleware. Ekspor golden set melalui endpoint terautentikasi.
7. Uji autentikasi gagal tertutup, token palsu/kedaluwarsa, Origin asing, input buruk, persistensi dan ekspor, kutipan karangan ditolak, metrik null/wrong-answer, serta regresi retrieval. Jalankan `pnpm verify`, tinjauan subagen peninjau, dan browser desktop/ponsel/RTL. Publikasikan alur untuk Anas, lalu catat hasil nyata; jangan centang syarat manusia sebelum terpenuhi.

### Cakupan awal yang dipertahankan

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
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

- 60 draf sesuai komposisi, 42 publik + 18 privat baru; semua belum disetujui. Lokasi/sumber terverifikasi terhadap `ihya-v6`; kunci makna tetap perlu Anas.
- Runner baseline/score/seed/golden + judge terpisah; prompt berversi, manifest/hash tervalidasi, tanpa retry berbayar otomatis. Kutipan berasal dari DB.
- Baseline Cari: kutipan 562/562 valid, semua lokasi gold terpenuhi 35/48 (72,9%), penolakan 0/12, takhrij 0/9. Ini draf, bukan gerbang resmi.
- Antrean 60 item disiapkan: 30 contoh kalibrasi publik buatan agent (sebagian sengaja salah), 30 Cari. Judge 29/30 valid, satu `max_tokens`, biaya **US$0,112528** (izin ≤ US$1). **0 pasangan manusia**, jadi butir kalibrasi belum dicentang.
- `/tinjau` + API/ekspor privat; Access PIN domain utama dan JWT tiap rute. D1 app `answer_log`/`review`, snapshot/hash, expiry, Origin/batas input. Dependensi **jose 6.2.12 (MIT)** untuk verifikasi JWT.
- `pnpm verify`: **485 Node + 218 Workers**, smoke/build lolos; peringatan lama lint/CSS tetap. `eval:retrieval --no-write`: 31 soal hit@10 100%, MRR 0,795.
- Peninjau: 3 temuan diperbaiki (klaim hadits ganda, persetujuan golden bertentangan, receipt batch belum mengikat record). Tinjauan ulang lolos terbatas pada temuan itu.
- Browser komponen aktual + fixture/API mock lokal: simpan→muat ulang, desktop/390 px, Noto Naskh 20 px/40 px, RTL, tanpa overflow. Tidak dihitung sebagai uji ustadz. Login produksi/10 uji Anas masih T-24.
- Retensi akses 12 bulan; penghapusan fisik manual sampai S20 (jadwalkan sebelum Oktober 2027). Pertanyaan pengguna umum belum disimpan; tanpa wildcard Access preview.
- UI terbaru `main` PR #30/#45 dipertahankan; ukuran judul 40 px pemilik dipulihkan pada susunan beranda terbaru. Kelanjutan memakai `codex/s18-eval-jawab-final`; rencana/WIP lama tetap di `codex/s18-eval-jawab`.
- ADR-052; [panduan penilai](../../docs/tinjau-operasional.md), [runner](../../evals/jawab/README.md). **S18 belum selesai** sampai ≥50 persetujuan, kalibrasi ±30, dan ≥10 uji manusia nyata. S19 menunggu.

### Kelanjutan 2026-10-19

- R2 `jawab/2026-10-19-draf-v1.jsonl` diunggah sesudah izin eksplisit kedua penyimpanan; unduhan cocok SHA-256 `1544b0f75c91e5045f6f4f6cb6750292aaf756770348c65b7f1f551d2adf139c`. Salinan sementara dihapus setelah perbandingan.
- Peninjau akhir tidak menemukan blocker. `pnpm check --fix` setelah pemindahan prompt lolos (1 warning lama); full verify 485+218 sebelumnya lolos. Layanan persetujuan sempat gagal (kredit/kapasitas), lalu pulih. Pengulangan `pnpm verify` pada perubahan akhir **lolos: 485 Node + 218 Workers dan kedua build**.
- Publikasi mengikuti PR/CI hijau → squash merge → Deploy; setelah migrasi, periksa run D1 kosong lalu jalankan SQL aditif `evals/private/jawab-runs/s18-tinjau-v1-seed.sql`. Izin R2 dan D1 sudah diberikan; jangan minta ulang.
- Isi D1 harus 60 (42 publik/18 privat) dan 0 review manusia sebelum T-24. Verifikasi akses anonim ditolak di domain utama/workers.dev, kemudian minta pemilik/Anas login PIN untuk uji nyata. QA lokal tidak menggantikan uji ini.

- Pemilik meminta penyelesaian seluruh S18. Layanan persetujuan pulih pada percobaan berikutnya; verifikasi dan publikasi dilanjutkan. Izin data/biaya sebelumnya tetap berlaku.
