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

## 2026-11-26 · X31 rencana · Gelombang 1: tiga kitab kecil — selesai
- Dikerjakan:
  - Dicek (hanya baca): Bidayat al-Hidayah (Shamela 12718, 46 halaman), at-Tibyan (1969, 224 halaman), al-Ajurrumiyyah (11371, 31 halaman) punya versi OpenITI ber-ID Shamela sama; gabungan ±4% Ihya; catatan kaki: Bidayah nol, Tibyan 5 halaman, Ajurrumiyyah 4 halaman.
  - Rencana [X31](sesi/X31-gelombang-1-tiga-kitab.md) (X31a–X31d) dengan "Definisi selesai per kitab", ADR-135 (lepas dari Jawab, parkir Ihya kecuali X24 dan T-35), baris FASE, STATUS, dan kartu papan.
  - Entri LOG Oktober dipindah ke `log/2026-10.md`.
- Verifikasi: `node:sqlite` hanya-baca atas tiga `.db` Shamela → jumlah halaman, judul, karakter, dan nomor cetak seperti di file sesi (Ajurrumiyyah: 31 halaman, 19 nomor cetak berbeda) · peninjau: 1 wajib (build X31a hanya di mesin agent) + 18 lainnya, ditangani di file sesi, ADR-135, STATUS, skill `/posisi`, dan catatan tautan arsip · `gh api repos/OpenITI/...` → `Shamela0012718`, `Shamela0001969`, `Shamela0011371` ada · `pnpm check` → lolos
- Biaya API: –
- Keputusan: ADR-135
- Catatan untuk sesi berikutnya: X31a dulu (tanpa LLM). Alat ingest masih satu karya (`IHYA` di `cli.ts`, `0000-reset.sql` mengosongkan seluruh DB); slug ketiga kitab sudah ada di `kitab-mendatang.ts`. Riset korpus 2026-10-27 masih di branch `riset/ringkasan-buku-pecahan-produk`.

