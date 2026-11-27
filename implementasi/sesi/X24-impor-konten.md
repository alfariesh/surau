# X24 · Impor konten turunan ke korpus dan tampil di web

> **Fase:** Sisipan · **Status:** selesai untuk Gelombang 1 (bagian 1 dan 2 selesai 2026-11-27; bukti staging/produksi dipindah ke X31b, ADR-145 butir 10; `check_content_draft` v2 untuk Jalur/Faedah ditunda ke X25) · disesuaikan ke Gelombang 1 lewat [ADR-145](../keputusan/ADR-145.md)
> **Prasyarat:** X23 selesai; minimal satu unit `siap` di `data/konten/` · Tugas pemilik: izin promote korpus (aturan keras 4: menimpa data produksi)
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Unit `siap` di `data/konten/` (Intisari Bab v2, Intisari Kitab) masuk build korpus dan tampil di halaman Intisari, MCP, dan Cari, dengan inti, jawaban soal, tombol Laporkan, dan penarikan lewat `status: ditarik`. Intisari batch lama untuk bagian yang sama digantikan.

## Baca dulu (hanya ini)

- [ADR-125](../keputusan/ADR-125.md), [docs/09-konten.md](../../docs/09-konten.md), [docs/redaksi-operasional.md](../../docs/redaksi-operasional.md)
- `tools/ingest/src/llm/digest-attach.ts` (`digestRows`, invarian), `tools/ingest/src/pipeline.ts` (urutan ingest), `packages/db/migrations/corpus/0009_digest.sql`, `packages/core/src/digest.ts` (`readDigest`)
- `packages/core/src/content-check.ts` (`checkContentDraft` dijalankan lagi saat build pada `.sqlite` baru lewat `sqliteD1`)

## Langkah

1. **Migrasi korpus 10:** kolom `digest.lead` (inti) dan `digest_question.answer` (jawaban), keduanya boleh kosong. Pembaca (web, MCP, Cari, skrip audio) menangani skema 9 dan 10, karena produksi tetap `ihya-v9` sampai promote.
2. **Pembangun baris dari draf** (paralel dengan `digestRows`, bukan lewat `acceptedDigest`): `dasar` → `digest_anchor` paragraf utuh (≤ 9 per gagasan); kutipan → rentang + `raw_sha256` + jenis dari `quoteInspector`; terjemahan kutipan berlabel AI dengan `model` dan `prompt_version` = `surau-redaksi/<skill>`; `review_status` `ai_generated`. Invarian `digestRows` dipakai bersama (difaktorkan keluar).
3. **Gerbang build:** setiap unit `siap` diperiksa ulang `checkContentDraft` pada `.sqlite` baru dan `readinessIssues`; galat = build gagal. Unit `ditarik` tidak dimuat dan dicatat di log koreksi publik.
4. **Penggantian dan kaskade:** unit chat menggantikan Intisari batch bagian yang sama per `section_id` + `lang`, tanpa melihat `menggantikan` (kolom itu hanya untuk revisi unit chat, ADR-131). Tetapkan penanda v2 (`prompt_version` berawalan `surau-redaksi/`). Ubah `check_content_draft` supaya hari Jalur hanya menerima Intisari v2 (`day_without_digest`) dan `stance_unchecked` Faedah hanya dibungkam Intisari v2. Intisari induk yang dibangun dari anak yang diganti (mis. 100004, 100003 dari 100007; 100003 dari 100017) ikut basi: tarik gagasan induk yang berasal dari gagasan Salah (audit `points[].basis` `dg-100004-id-m`, `dg-100003-id-b`), atau ganti induk lewat Intisari Kitab dari chat. X15c melewati bagian yang punya unit chat.
   Daftar tarik `data/reviews/ihya-9472-intisari-tolak.json` (A0, ADR-127) mati sendiri begitu `digest.created_at` 100007/100017 berganti. Sesudah promote, cek di produksi bahwa v2 tampil utuh, lalu hapus kedua entri itu dari berkas.
5. **Audio:** naskah berubah → `script_sha256` berbeda → trek lama gugur otomatis (audio 100007 dan 100017 yang memuat gagasan Salah ikut hilang). Rekam ulang berbayar menunggu izin pemilik. Bila inti dibacakan, naikkan `SCRIPT_VERSION` dan catat dampaknya ke enam audio lama.
6. **Tampilan:** inti di kepala halaman Intisari (di atas label satu baris), jawaban di Uji pemahaman, label "Intisari AI, belum ditinjau manusia" + model + skill + tanggal; tombol **Laporkan** per gagasan lewat `/api/feedback` (tanpa migrasi app bila memungkinkan); kalimat "pintu ke teks" dari UI, bukan dari data.
7. **MCP `get_section_digest`:** tambah field (`lead`, `answer`) tanpa mengubah yang lama.
8. Build, `corpus:load:staging`, cek di staging, lalu promote atas izin pemilik.

## Selesai bila

- [x] `pnpm verify` lolos; tes pembangun baris dan gerbang build (unit rusak membuat build gagal): `pnpm verify` → lolos (1.216 + 502 tes); `tools/ingest/src/konten.test.ts` 9 tes, termasuk `contentGate` menggagalkan unit dengan cap tidak cocok dan bagian yang tidak ada (2026-11-27)
- [ ] (Ihya diarsipkan; bukti setara dipindah ke X31b langkah 3 dengan unit Bidayah, ADR-145 butir 10) Staging: Intisari 100007 dan 100017 tampil versi v2 (inti, jawaban), dua gagasan Salah lama tidak ada, audio lama keduanya tidak tampil
- [ ] Unit `ditarik` tidak tampil dan tercatat di log koreksi
- [ ] (dipindah ke promote X31b, ADR-145 butir 10) Promote ke produksi atas izin pemilik; curl halaman produksi membuktikan butir di atas
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Halaman Faedah dan Jalur (X25); rekam ulang audio (izin biaya); peninjau manusia R1–R3.

## Catatan hasil

### Bagian 1 (2026-11-27, ADR-145)

- **Skema korpus 10** (`0010_konten_chat.sql`): `digest.lead`, `digest_question.answer`; pembaca membaca `*` (skema 9 dan 10).
- **Impor** `tools/ingest/src/konten.ts`: unit `siap` Intisari Bab/Kitab → baris `digest*` + `digest_point_fts`; menggantikan batch per bagian dan bahasa; Intisari batch induk dari anak yang diganti tidak dimuat; unit `ditarik` → `data/reports/konten-ditarik.md`.
- **Gerbang build** di CLI: `readinessIssues` + `checkContentDraft` pada `.sqlite` baru dan sidik sumber = cap; gagal = keluaran dihapus.
- **Inti dan MCP:** `readDigest` dan `get_section_digest` menambah `lead` dan `questions[].answer` (field lama tetap). Fixture `/dev/intisari` berisi contoh inti dan jawaban untuk bagian 2.
- **Bukti:** build Ihya lokal dengan unit 100007/100017 asli → 2 unit, 14 gagasan, 4 kutipan, 14 soal berjawaban tanpa masalah (build Ihya penuh tetap gagal di Mac karena data batch Ihya tidak ada, ADR-142). Build bawaan Bidayah lolos.
- **Menyimpang (terbuka, ADR-145):** induk batch dibuang utuh, bukan ditarik per gagasan; cek staging/produksi memakai Bidayah di X31b.
- **Peninjau (0 blocker, 4 perbaikan dikerjakan):** batas bawah `minDigests` dikurangi induk basi; istilah dicek ke glosarium gabungan korpus; tes jalur baca skema 10; langkah 4 bagian `check_content_draft` (Jalur/Faedah v2) dicatat ditunda ke bagian 2 (ADR-145 butir 9).
- **Berikutnya:** bagian 2 (tampilan web: inti, jawaban, label, Laporkan per gagasan; `check_content_draft` v2 untuk Jalur/Faedah), lalu X31b.

### Bagian 2 (2026-11-27, ADR-145)

- **Tampilan:** inti di kepala halaman Intisari (di bawah judul, di atas jumlah gagasan); jawaban soal di Uji pemahaman berlabel "Jawaban (AI)" plus tautan ke gagasannya (Intisari lama tetap menunjuk gagasan); label asal "Dibuat Claude Opus 5.5 lewat skill intisari-bab@1 (plugin Surau Redaksi) pada …, belum ditinjau manusia"; nama tampilan Opus/Fable 5.x.
- **Laporkan per gagasan** (`point-report.tsx`): dialog kecil ke `/api/feedback` yang sudah ada, tanpa migrasi DB app: jenis `other`, path halaman Intisari, `passage_id` paragraf dasar pertama, pesan berawalan "[Intisari, gagasan N]". Dicoba lokal: laporan tersimpan di DB app lokal dengan awalan dan paragrafnya.
- **Fixture** `/dev/intisari?tier=section` kini contoh Intisari v2 (inti, jawaban, skill).
- **Bukti:** `pnpm verify` lolos (1.221 + 502 tes); `digest-page.test.tsx` 3 tes baru; `e2e/intisari.spec.ts` 12/12 (termasuk axe pada dialog Laporkan, tanpa mengirim ke staging); tangkapan ponsel 375 px.
- **Peninjau (0 blocker, 2 perbaikan + 2 saran dikerjakan):** keterangan kosong/spasi tidak dikirim; tes bahwa body laporan lolos skema `/api/feedback` (panjang maksimum, path Intisari); awalan `CHAT_PROMPT_PREFIX` satu sumber di `@surau/core`; e2e menunggu animasi dialog, bukan jeda tetap.
- **Ditunda ke X25 (ADR-145 butir 9):** `check_content_draft` hanya menerima Intisari v2 untuk hari Jalur dan `stance_unchecked` Faedah.
