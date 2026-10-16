# S10 · Korpus produksi & QA rilis Fase 1

> **Fase:** 1 · **Status:** selesai* (QA manusia T-15 dan persetujuan teks `/lisensi` menunggu pemilik)
> **Prasyarat:** S09 selesai · Tugas pemilik: **T-09** (drive), **T-10** (keputusan sumber dan lisensi, email ke Shamela, retensi `feedback`). **T-15** dikerjakan di langkah 4.
> **Perkiraan:** 1 percakapan agent

## Tujuan

Korpus Ihya berada di D1 produksi lewat prosedur blue-green yang bisa diulang dan di-rollback. Kualitasnya diperiksa dengan sampel, halaman lisensi dan atribusi tersedia, dan Fase 1 siap dirilis.

## Baca dulu (hanya ini)

- ADR-005 (blue-green), ADR-018 (lisensi dan atribusi), dan ARSITEKTUR-TEKNIS §7.
- Laporan `data/reports/ihya-9472-validasi.md` dari S07.
- Skill `/rilis` (supaya syarat rilis sudah dipenuhi sejak sesi ini).

## Langkah

1. **Prosedur blue-green** sebagai skrip `pnpm corpus:promote <versi>`, dengan izin di setiap langkah remote:
   1. Buat `surau-corpus-<versi>` (`--location apac`).
   2. Terapkan migrasi.
   3. Muat SQL dan jalankan smoke query.
   4. Ubah `database_id` binding `CORPUS_DB` produksi di `wrangler.jsonc` lewat PR.
   5. Deploy.
   6. DB lama **tidak dihapus** dan dicatat di `data/SOURCES.md` sebagai target rollback.

   Tulis prosedur rollback di README `tools/ingest`.
2. Jalankan prosedur ini untuk `surau-corpus-ihya-v1`.
3. **QA otomatis:** 30 halaman acak (seed tetap). Bandingkan `text_raw` di D1 produksi dengan hasil parse sumber Shamela byte demi byte setelah pembersihan deterministik, juga catatan kaki dan tautan penanda. Laporannya masuk ke `data/reports/`.
4. **QA manusia (T-15):** siapkan daftar 10 halaman beserta tautan pindaian archive.org (tautan saja), tautan `shamela.ws/book/9472/{source_page_id}`, dan URL Surau. Minta pemilik atau ustadz mencocokkan. Catat hasilnya.
5. **Halaman `/lisensi`** dan footer atribusi:
   - Kode Apache-2.0, konten CC BY-NC-SA 4.0.
   - Atribusi OpenITI, Shamela, dan Dar al-Ma'rifah.
   - Kontak untuk koreksi dan takedown.
   - Tanpa iklan, paywall, atau penjualan akses atas konten (klausul NC).
6. Tautan "lihat di Shamela" per halaman (`shamela.ws/book/9472/{source_page_id}`) sebagai bentuk atribusi.
7. Pastikan `deploy.yml` hanya memigrasi `surau-app` dan tidak pernah DB korpus. Korpus hanya berubah lewat `corpus:promote` (ARSITEKTUR §7 aturan 4).
8. Pantau Workers Logs dan metrik D1 `rows_read` untuk 50 kunjungan halaman, lalu catat biayanya (seharusnya ±$0).
9. Perbarui CHANGELOG (draf), lalu sarankan `/rilis 1` kepada pemilik.

## Selesai bila

- [ ] `surau-corpus-ihya-v1` aktif di produksi; prosedur promote dan rollback terdokumentasi dan sudah dijalankan sekali · *promote dijalankan dan rollback diuji dua arah; "aktif" dicentang setelah deploy `main` memakai binding baru*
- [ ] QA otomatis 30/30 halaman cocok; QA manusia 10 halaman tercatat · **otomatis 30/30 ✓** (produksi dan staging, `data/reports/ihya-9472-qa-surau-corpus-ihya-v1.md`); **manusia menunggu T-15** (daftar siap: `data/reports/ihya-9472-qa-manusia.md`)
- [ ] `/lisensi` dan atribusi tampil, dan pemilik menyetujui teksnya · **tampil ✓** (lokal + e2e, desktop/ponsel, terang/gelap); **persetujuan teks menunggu pemilik**
- [x] T-10 tercentang (email ke Shamela terkirim; jawabannya ditunggu, tidak memblokir bila ADR-018 sudah diterima pemilik) · dijawab di chat 2026-10-16
- [x] `rows_read` per kunjungan halaman tercatat di LOG · ±16 kueri / ±1.530 baris per render, 0 untuk kunjungan ulang (ADR-036 butir 7)
- [x] STATUS, LOG, dan file sesi ini diperbarui; FASE.md menandai Fase 1 siap rilis

## Di luar cakupan

- Pencarian (Fase 2). Kitab kedua.

## Catatan hasil

**Dibuat** (keputusan lengkap: ADR-036):
- `tools/ingest/src/d1.ts` (pembungkus `wrangler d1`, target lokal/staging/remote per nama lewat config sementara, smoke yang membandingkan hitungan + `meta` dengan build), `corpus.ts` (info build + cek sha256, muat SQL, baca/ganti `CORPUS_DB` produksi), `promote.ts` (`pnpm run corpus:promote`), `qa-sample.ts` + `qa.ts` (`pnpm run corpus:qa`). `load.ts` dan `pipeline.ts` memakai modul bersama (`expectedRows`, `buildDigest`); build tetap identik (sha256 sama sebelum/sesudah refactor).
- Korpus produksi `surau-corpus-ihya-v1` (`41e3033e-3aa0-456c-9d60-b8967f57e89d`, APAC). `apps/web/wrangler.jsonc`: `CORPUS_DB` produksi → DB ini, `preview_database_id` = staging (dev lokal), `previews` tetap staging. `data/SOURCES.md`: riwayat versi + target rollback.
- `deploy.yml`: langkah migrasi D1 `surau-app` saja (`db:migrate:remote`). Tes `corpus.test.ts` menjaga aturan ini dan bentuk binding.
- `apps/web`: halaman statis `/lisensi`, `EDITION_CREDITS` (dites sama dengan `data/ATTRIBUTION.md`), `PageSection` bersama Tentang, tautan dari menu samping/Tentang/`LicenseNotice`, sitemap, e2e smoke + axe.
- Laporan: `data/reports/ihya-9472-qa-surau-corpus-ihya-v1.md` (30/30), `data/reports/ihya-9472-qa-manusia.md` (10 halaman untuk T-15). `works/ihya.ts` `scan`: tautan pindaian archive.org per jilid.
- Dokumen: README `tools/ingest` (promote, rollback, tutup darurat), TUGAS-PEMILIK (T-09, T-10 ✓, T-15), STACK, FASE (siap rilis), CHANGELOG (draf Fase 1), KEPUTUSAN (ADR-018/021 diterima, P-6/P-7 `feedback`, ADR-036).

**Penyimpangan dari rencana (terbuka):**
- Langkah 1.4 "ubah `database_id` lewat PR": skrip mengubah file lokal, deploy terjadi lewat PR sesi ini (bukan PR terpisah).
- Langkah 2: sebelum promote, produksi menunjuk `surau-corpus-staging` (ADR-034), jadi DB lama yang dicatat sebagai target rollback adalah staging, yang isinya bisa berubah. Ditulis jujur di SOURCES.md dan README.
- Langkah 8: `rows_read` diukur di Preview `pembaca` (DB staging, isi sama, QA 30/30), bukan produksi, karena pembaca produksi masih tertutup sampai `/rilis 1`. Workers Logs produksi untuk pembaca baru bisa dipantau setelah rilis.
- Di luar rencana: `preview_database_id` (supaya dev lokal tidak kosong), kalibrasi tautan pindaian per jilid, `PageSection` bersama.

**Utang teknis:** `getToc` dibaca penuh per render (±939 baris, ±1,5 kali per render); header `x-nextjs-cache: STALE` pada kunjungan ulang (tanpa baca D1, tetapi beda dari catatan S09); pembersih retensi `feedback` belum ada (manual sampai S20); target rollback `ihya-v1` berubah saat staging dimuat ulang (S11).

**Untuk sesi berikutnya:** `/rilis 1` (pemilik) setelah T-15, T-22, dan persetujuan teks `/lisensi`: nyalakan `READER_ENABLED` lewat commit, lalu cek Workers Logs + `d1 info surau-corpus-ihya-v1 --json` di produksi. S11 akan memuat ulang staging (FTS): korpus produksi berikutnya = `ihya-v2` lewat `corpus:promote`.
