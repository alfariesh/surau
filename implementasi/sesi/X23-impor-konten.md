# X23 · Impor konten turunan ke korpus dan tampil di web

> **Fase:** Sisipan · **Status:** belum
> **Prasyarat:** X22 selesai; minimal satu unit `siap` di `data/konten/` · Tugas pemilik: izin promote korpus (aturan keras 4: menimpa data produksi)
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Unit `siap` di `data/konten/` (Intisari Bab v2, Intisari Kitab) masuk build korpus dan tampil di halaman Intisari, MCP, dan Cari, dengan inti, jawaban soal, tombol Laporkan, dan penarikan lewat `status: ditarik`. Intisari batch lama untuk bagian yang sama digantikan.

## Baca dulu (hanya ini)

- [ADR-121](../keputusan/ADR-121.md), [docs/09-konten.md](../../docs/09-konten.md), [docs/redaksi-operasional.md](../../docs/redaksi-operasional.md)
- `tools/ingest/src/llm/digest-attach.ts` (`digestRows`, invarian), `tools/ingest/src/pipeline.ts` (urutan ingest), `packages/db/migrations/corpus/0009_digest.sql`, `packages/core/src/digest.ts` (`readDigest`)
- `packages/core/src/content-check.ts` (`checkContentDraft` dijalankan lagi saat build pada `.sqlite` baru lewat `sqliteD1`)

## Langkah

1. **Migrasi korpus 10:** kolom `digest.lead` (inti) dan `digest_question.answer` (jawaban), keduanya boleh kosong. Pembaca (web, MCP, Cari, skrip audio) menangani skema 9 dan 10, karena produksi tetap `ihya-v9` sampai promote.
2. **Pembangun baris dari draf** (paralel dengan `digestRows`, bukan lewat `acceptedDigest`): `dasar` → `digest_anchor` paragraf utuh (≤ 9 per gagasan); kutipan → rentang + `raw_sha256` + jenis dari `quoteInspector`; terjemahan kutipan berlabel AI dengan `model` dan `prompt_version` = `surau-redaksi/<skill>`; `review_status` `ai_generated`. Invarian `digestRows` dipakai bersama (difaktorkan keluar).
3. **Gerbang build:** setiap unit `siap` diperiksa ulang `checkContentDraft` pada `.sqlite` baru dan `readinessIssues`; galat = build gagal. Unit `ditarik` tidak dimuat dan dicatat di log koreksi publik.
4. **Penggantian dan kaskade:** unit chat menggantikan Intisari batch bagian yang sama (`menggantikan`). Intisari induk yang dibangun dari anak yang diganti (mis. 100004, 100003 dari 100007; 100003 dari 100017) ikut basi: tarik gagasan induk yang berasal dari gagasan Salah (audit `points[].basis` `dg-100004-id-m`, `dg-100003-id-b`), atau ganti induk lewat Intisari Kitab dari chat. X15c melewati bagian yang punya unit chat.
5. **Audio:** naskah berubah → `script_sha256` berbeda → trek lama gugur otomatis (audio 100007 dan 100017 yang memuat gagasan Salah ikut hilang). Rekam ulang berbayar menunggu izin pemilik. Bila inti dibacakan, naikkan `SCRIPT_VERSION` dan catat dampaknya ke enam audio lama.
6. **Tampilan:** inti di kepala halaman Intisari (di atas label satu baris), jawaban di Uji pemahaman, label "Intisari AI, belum ditinjau manusia" + model + skill + tanggal; tombol **Laporkan** per gagasan lewat `/api/feedback` (tanpa migrasi app bila memungkinkan); kalimat "pintu ke teks" dari UI, bukan dari data.
7. **MCP `get_section_digest`:** tambah field (`lead`, `answer`) tanpa mengubah yang lama.
8. Build, `corpus:load:staging`, cek di staging, lalu promote atas izin pemilik.

## Selesai bila

- [ ] `pnpm verify` lolos; tes pembangun baris dan gerbang build (unit rusak membuat build gagal)
- [ ] Staging: Intisari 100007 dan 100017 tampil versi v2 (inti, jawaban), dua gagasan Salah lama tidak ada, audio lama keduanya tidak tampil
- [ ] Unit `ditarik` tidak tampil dan tercatat di log koreksi
- [ ] Promote ke produksi atas izin pemilik; curl halaman produksi membuktikan butir di atas
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Halaman Faedah dan Jalur (X24); rekam ulang audio (izin biaya); peninjau manusia R1–R3.
