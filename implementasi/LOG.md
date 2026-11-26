# Log Sesi

Entri terbaru di paling atas. Satu entri per sesi (atau per hari kerja bila satu sesi butuh lebih dari satu percakapan).

**Arsip:** file ini hanya memuat bulan berjalan. Entri bulan sebelumnya dipindah apa adanya ke [log/](log/), satu berkas per bulan (`log/YYYY-MM.md`). Entri Oktober 2026 ada di [log/2026-10.md](log/2026-10.md) (dipindah 2026-11-26). Awal bulan berikutnya, pindahkan entri bulan lalu ke `log/YYYY-MM.md` tanpa mengubah isinya.

Format entri:

```
## YYYY-MM-DD · SNN · Judul sesi — selesai | sebagian | terblokir
- Dikerjakan: 2–5 poin
- Verifikasi: perintah yang dijalankan → hasil (mis. `pnpm verify` → lolos, 42 tes)
- Biaya API: $x (bila ada panggilan LLM berbayar), atau –
- Keputusan: ADR-NNN (bila ada)
- Catatan untuk sesi berikutnya: …
```

## 2026-11-26 · X29 / T-35 · Build staging patch ayat — selesai (promote menunggu izin)
- Dikerjakan:
  - `git pull`, lalu `pnpm ingest ihya` di mesin agent dengan patch ayat aktif, lalu `pnpm corpus:load:staging --confirm` dan `pnpm corpus:qa staging`.
  - Build pertama keluar dengan Intisari 0: `data/build/llm/intisari` sudah berisi hasil X15c (prompt `@3`/`@2`, cabang belum digabung). Build yang dimuat memakai cadangan pilot X15b (= Intisari produksi) lewat penukaran folder sementara; data X15c dikembalikan utuh.
  - Laporan ingest (`data/reports/ihya-9472-ayat.md`, `-validasi.md`) diperbarui; catatan di file sesi X29.
  - E2e Preview (membaca staging) gagal karena data contoh berubah: `p2824` kehilangan terjemahan (patch), `p15425` kini berterjemahan (X21-sisa). Contoh dipindah ke `p2825` dan `p3942`.
- Verifikasi: semua gerbang ingest ✓ · rujukan ayat 2.693 (= 2.514 + 179) · terjemahan 15.955/16.111 (usang 153) · ringkasan 623/626 · Intisari 19/313, 119 gagasan · audio 4 (A0 sudah mengeluarkan 100007/100017) · smoke staging = hitungan build · QA staging 30/30 halaman cocok byte demi byte · `implementasi/sesi/bukti/X29/cek-patch-build.ts` → 179/179 entri jadi rujukan, 0 terjemahan lama tersisa di 153 paragraf terkena
- Biaya API: –
- Keputusan: [ADR-136](keputusan/ADR-136.md) (Intisari pilot untuk build `main`, promote X29 = build ulang `ihya-v10`, pemicu perbaikan permanen; utang dicatat di file sesi X29)
- Catatan untuk sesi berikutnya: promote hanya atas izin pemilik, sebagai `ihya-v10` dibangun ulang dengan penukaran folder ADR-136 (pembanding: arsip `data/build/arsip/x29-staging-2026-11-26/`). Membangun ulang tanpa penukaran folder menghapus 19 Intisari tayang.

## 2026-11-26 · X31 rencana · Gelombang 1: tiga kitab kecil — selesai
- Dikerjakan:
  - Dicek (hanya baca): Bidayat al-Hidayah (Shamela 12718, 46 halaman), at-Tibyan (1969, 224 halaman), al-Ajurrumiyyah (11371, 31 halaman) punya versi OpenITI ber-ID Shamela sama; gabungan ±4% Ihya; catatan kaki: Bidayah nol, Tibyan 5 halaman, Ajurrumiyyah 4 halaman.
  - Rencana [X31](sesi/X31-gelombang-1-tiga-kitab.md) (X31a–X31d) dengan "Definisi selesai per kitab", ADR-135 (lepas dari Jawab, parkir Ihya kecuali X24 dan T-35), baris FASE, STATUS, dan kartu papan.
  - Entri LOG Oktober dipindah ke `log/2026-10.md`.
- Verifikasi: `node:sqlite` hanya-baca atas tiga `.db` Shamela → jumlah halaman, judul, karakter, dan nomor cetak seperti di file sesi (Ajurrumiyyah: 31 halaman, 19 nomor cetak berbeda) · peninjau: 1 wajib (build X31a hanya di mesin agent) + 18 lainnya, ditangani di file sesi, ADR-135, STATUS, skill `/posisi`, dan catatan tautan arsip · `gh api repos/OpenITI/...` → `Shamela0012718`, `Shamela0001969`, `Shamela0011371` ada · `pnpm check` → lolos
- Biaya API: –
- Keputusan: ADR-135
- Catatan untuk sesi berikutnya: X31a dulu (tanpa LLM). Alat ingest masih satu karya (`IHYA` di `cli.ts`, `0000-reset.sql` mengosongkan seluruh DB); slug ketiga kitab sudah ada di `kitab-mendatang.ts`. Riset korpus 2026-10-27 masih di branch `riset/ringkasan-buku-pecahan-produk`.

