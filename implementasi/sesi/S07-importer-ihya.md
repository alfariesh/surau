# S07 · Importer Ihya (`tools/ingest`)

> **Fase:** 1 · **Status:** belum
> **Prasyarat:** S06 selesai · Tugas pemilik: **T-09** (drive Shamela terpasang)
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Pipeline lokal yang mengubah Ihya dari Shamela (`book/472/9472.db`) menjadi data korpus yang tervalidasi: halaman, paragraf, catatan kaki takhrij beserta tautan penandanya, dan daftar isi yang sudah diperbaiki. Matannya terbukti identik dengan rilis OpenITI berlisensi (ADR-018), dan hasilnya termuat di D1 lokal dan staging.

## Baca dulu (hanya ini)

- ADR-018 (sumber teks publik dan rantai lisensi), ARSITEKTUR-TEKNIS §3 dan §6 (pipeline), serta skema dari S06.
- [docs/03-sumber-data.md](../../docs/03-sumber-data.md): struktur Shamela dan cacat daftar isi Ihya.
- `.claude/rules/teks-arab.md` dan README `packages/text`.
- `/docs-terbaru node` (`node:sqlite` `DatabaseSync` readOnly, type stripping), `/docs-terbaru wrangler` (`d1 execute --file`, batas impor).

## Fakta sumber (sudah diverifikasi, 15 Okt 2026)

- Ihya terdiri dari 1.706 halaman (jilid 1–4: 361/386/413/546) dan 311 judul. `title.page` menunjuk ke `page.id`, bukan ke halaman cetak. `page.page` bertipe TEXT (harus di-cast).
- Paragraf dipisah `\r`, dan judul berbentuk `<span data-type="title" id=toc-N>`. Catatan kaki ada setelah **tepat 9** garis bawah `_________` (1.124 halaman), dengan penanda `(١)` berangka Arab-India.
- Sekitar **200 halaman** punya takhrij yang bercampur ke matan setelah `//` (contoh j1 h179). Bagian ini harus dipotong ke catatan kaki dan ditandai `needs_review`.
- Ada dua versi OpenITI yang dipin ke commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e` (rilis 2025.1.9):
  - `0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed`: matan identik per halaman (1.705 dari 1.706 halaman ≥0,95), tapi takhrijnya hilang.
  - `0505Ghazali.IhyaCulumDin.JK000001-ara1`: takhrij ada di dalam baris, diapit ` + `, tapi pasangannya tidak andal secara global, sehingga harus di-parse per halaman.
- Penanda halaman OpenITI `PageVxxPyyy` ada di **akhir** halaman.

## Langkah

1. Lanjutkan `tools/ingest` (paketnya sudah dibuat di S05 berisi `scripts/smoke-text.ts`, `scripts/bench-normalize.ts`, dan tes integrasi `test/ihya-text.test.ts`; Node 24, type stripping, impor `@surau/text` dan `@surau/db` untuk tipe skema). Bungkus akses SQLite di `src/sqlite.ts` (`new DatabaseSync(path, { readOnly: true })`). Jangan pernah menulis ke `/Volumes`.
2. **Sumber & lisensi:**
   - Unduh dua file OpenITI yang dipin ke `data/raw/openiti/` (git-ignored). Catat sha256-nya di `data/SOURCES.md`.
   - Buat `data/LICENSE` (CC BY-NC-SA 4.0 untuk konten turunan) dan `data/ATTRIBUTION.md` (OpenITI 2025.1.9, al-Maktaba al-Shamela, Dar al-Ma'rifah Beirut 1402/1982). Teks atribusinya ada di ADR-018.
3. **Parser Shamela** (`src/shamela/`): baca `page` dan `title`, lalu metadata karya, edisi, dan penulis dari `update/master/book.sqlite` dan `author.sqlite`. Pembersihan dan pemecahan teks **memakai fungsi `@surau/text`** (`splitFootnotes`, `cleanShamelaHtml`, `splitParagraphs`, `linkFootnotes`; S05 mengukur 4.204/4.204 penanda Ihya terhubung). Logika teks baru, termasuk pemisah takhrij `//`, ditambahkan ke `packages/text/src/shamela.ts` beserta tesnya, bukan di `tools/ingest` (satu konsep, satu tempat). Per halaman:
   - Pisahkan badan teks dan catatan kaki.
   - Pisahkan takhrij yang ada setelah `//` dan beri flag.
   - Pecah paragraf; ekstrak span judul (posisinya dicatat, teksnya tetap di DB sebagai judul).
   - Petakan penanda `(١)` di badan teks ke paragraf catatan kaki bernomor sama. Penanda yatim dicatat di laporan.
4. **Daftar isi + patch.** Buat `data/patches/ihya-9472.yaml` (di-commit; hanya ID dan struktur, tanpa teks panjang):
   - Tambahkan *Kitab at-Tafakkur* (mulai `page.id` 1582, j4 h423) dan *Kitab Dzikr al-Maut wa ma Ba'dahu* ke Rub' al-Munjiyat, lalu pindahkan subbabnya.
   - Kembalikan `title.id 170` ke level bayan.
   - Patch diterapkan secara deterministik dan setiap simpul hasil patch ditandai `patched`.
5. **Validasi otomatis** → `data/reports/ihya-9472-validasi.md` (di-commit, tanpa teks kitab):
   - 4 rub' × 10 kitab, urutan halaman monoton, tanpa judul yatim.
   - Hitung penanda tanpa catatan kaki dan sebaliknya, serta halaman dengan `//`.
   - Distribusi panjang paragraf.
   - Ingest **gagal** bila invarian struktural dilanggar.
6. **QA OpenITI** (`pnpm ingest verify-openiti`):
   - Parser mARkdown minimal: penanda halaman di akhir, gabung `~~`, buang `ms\d+`.
   - Bandingkan matan per halaman setelah normalisasi. Target ≥0,95 di ≥1.705 halaman.
   - Cocokkan takhrij dengan segmen JK per halaman. Takhrij yang tidak cocok ditandai `needs_review`.
   - Hasilnya masuk ke laporan.
7. **Keluaran:**
   - `data/build/sql/*.sql` untuk tabel korpus (tanpa FTS): statement ≤90 KB, file berurutan, tanpa `BEGIN`/`COMMIT`.
   - `data/build/surau-corpus-ihya-v1.sqlite`, dibangun dengan migrasi yang sama lewat `node:sqlite`, untuk inspeksi lokal dan cikal bakal dump terbuka.
   - Isi `meta`: `norm_version`, `corpus_version`, `schema_version`, `source_sha256`, dan `built_at`. **`built_at` diambil dari `SOURCE_DATE_EPOCH` atau tanggal commit HEAD, bukan jam sekarang**, supaya build deterministik. Cakupan hash: sha256 gabungan `data/build/sql/*.sql` (terurut) + `.sqlite`.
8. **Muat:** skrip `corpus:load:local` (`wrangler d1 execute … --local --persist-to <root>/.wrangler/state --file`, berurutan), lalu `corpus:load:staging` dengan izin pemilik. Jalankan smoke query (jumlah baris, j1 h200). Isi `page.source_page_id` dengan Shamela `page.id`.
9. **Tes:** unit test parser dengan fixture **buatan** (struktur meniru Shamela: span judul, `\r`, `_________`, `(١)`, `//`). Tes integrasi dengan sumber nyata dilewati otomatis bila `/Volumes/Elfariesh` tidak terpasang.
10. Skrip root: `ingest`, `ingest:verify`, `corpus:load:local`, `corpus:load:staging`.

## Selesai bila

- [ ] `pnpm ingest ihya` menghasilkan SQL dan `.sqlite` dari nol dalam < 2 menit, dan bersifat deterministik (dua kali build menghasilkan hash yang sama)
- [ ] Laporan validasi: 1.706 halaman, 4×10 kitab setelah patch, 0 judul yatim; penanda yatim dan halaman `//` dihitung
- [ ] `verify-openiti`: ≥1.705/1.706 halaman ≥0,95; takhrij yang tidak cocok dengan JK ditandai `needs_review` (jumlahnya dicatat)
- [ ] D1 lokal dan staging berisi Ihya; smoke query j1 h200 mengembalikan paragraf dan catatan kaki
- [ ] `git ls-files data/` hanya memuat LICENSE, ATTRIBUTION, SOURCES, patches, dan reports (tanpa teks kitab)
- [ ] Tes unit parser lolos; `pnpm verify` lolos
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Indeks FTS (S11). DB korpus produksi (S10). Kitab lain (Fase 5/7). Pencocokan ayat ke Tanzil (S12).

## Catatan hasil

*(diisi agent)*
