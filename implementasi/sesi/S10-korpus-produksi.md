# S10 · Korpus produksi & QA rilis Fase 1

> **Fase:** 1 · **Status:** belum
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

- [ ] `surau-corpus-ihya-v1` aktif di produksi; prosedur promote dan rollback terdokumentasi dan sudah dijalankan sekali
- [ ] QA otomatis 30/30 halaman cocok; QA manusia 10 halaman tercatat
- [ ] `/lisensi` dan atribusi tampil, dan pemilik menyetujui teksnya
- [ ] T-10 tercentang (email ke Shamela terkirim; jawabannya ditunggu, tidak memblokir bila ADR-018 sudah diterima pemilik)
- [ ] `rows_read` per kunjungan halaman tercatat di LOG
- [ ] STATUS, LOG, dan file sesi ini diperbarui; FASE.md menandai Fase 1 siap rilis

## Di luar cakupan

- Pencarian (Fase 2). Kitab kedua.

## Catatan hasil

*(diisi agent)*
