# @surau/ingest

Pipeline lokal yang mengubah kitab Shamela menjadi data korpus Surau yang tervalidasi (S07, ADR-018, ADR-032). Node 24 dengan type stripping (tanpa build); teks Arab diolah hanya lewat `@surau/text`, ID dan skema baris lewat `@surau/db`. Drive Shamela dibaca **hanya-baca** (`src/sqlite.ts` menolak menulis di bawah `/Volumes/`).

## Perintah (dari root repo)

| Perintah | Isi |
|---|---|
| `pnpm ingest ihya` | Bangun korpus Ihya (±4 detik, termasuk indeks pencarian S11): `data/build/sql/*.sql`, `data/build/surau-corpus-ihya-v2.sqlite`, `data/build/ihya-v2.sha256` (build versi lain di `data/build` dihapus), peta ID `data/ids/ihya-9472.json`, dan laporan `data/reports/ihya-9472-{validasi,openiti}.md`. **Gagal** (tanpa keluaran) bila invarian dilanggar |
| `pnpm ingest:verify` | Hanya gerbang QA OpenITI (matan ≥0,95 per halaman di ≥1.705 halaman; takhrij vs JK000001) → laporan `…-openiti.md` |
| `pnpm corpus:load:local` | Migrasi korpus + muat semua file SQL ke D1 lokal (`.wrangler/state`), lalu smoke query (jumlah baris termasuk indeks FTS, j1 h200, satu kueri الصبر) |
| `pnpm corpus:load:staging --confirm` | Sama, ke `surau-corpus-staging` (remote). **Minta izin pemilik dulu**; tanpa `--confirm` skrip menolak, dan ditolak juga bila staging tercatat sebagai korpus produksi. Selama impor (±1 menit) DB tidak melayani kueri |
| `pnpm run corpus:promote <versi> [--confirm]` | Korpus **produksi** blue-green (ADR-005, ADR-036): tanpa `--confirm` hanya rencana. Lihat [Korpus produksi](#korpus-produksi-blue-green) |
| `pnpm run corpus:qa <versi\|staging> [--human 10]` | QA sampel: 30 halaman acak (seed 9472) di D1 remote dibandingkan byte demi byte dengan sumber Shamela yang diparse ulang, plus `meta`, edisi, dan judul daftar isi. Untuk versi: laporan `data/reports/ihya-9472-qa-<db>.md`; untuk staging: hanya di layar. `--human` menulis daftar QA manusia (T-15) sekali |

**Peringatan:** file pertama (`0000-reset.sql`) mengosongkan **seluruh** DB korpus, termasuk indeks `passage_fts` (`delete-all`: indeks contentless tidak menghapus token lama bila rowid yang sama dimasukkan ulang). Untuk sekarang satu DB berisi satu kitab; begitu ada kitab kedua, reset harus dibuat per edisi dulu (indeks lewat `DELETE … WHERE rowid BETWEEN`).

**Indeks pencarian (S11, ADR-039):** setelah tabel biasa, file `passage-fts-*.sql` mengisi `passage_fts` (rowid = `passage.id`, kolom `sbody`/`sfoot` = stem dari `normalizeArabic(text_raw)`, `body`/`foot` kosong), lalu `passage-fts-optimize.sql` menggabungkan segmen indeks. `meta` tetap file terakhir. `term_stat` = stem di >10% paragraf, dihitung dari `fts5vocab` di DB sementara dengan migrasi yang sama (`src/search-index.ts`). Ihya: 20.509 baris indeks, 39 stem umum, ±5,4 MB; impor staging ±65 detik untuk seluruh korpus.

Syarat: drive Shamela terpasang (T-09; bisa ditimpa `--shamela <dir>` atau `SURAU_SHAMELA_ROOT`) dan dua file OpenITI yang dipin ada di `data/raw/openiti/` (cara unduh dan sha256: `data/SOURCES.md`). Opsi `--reset-ids` membangun peta ID dari nol, **hanya** sebelum rilis Fase 1 (ADR-029).

## Korpus produksi (blue-green)

Satu versi korpus = satu DB D1 `surau-corpus-<versi>` yang tidak pernah diubah setelah aktif. Binding `CORPUS_DB` top-level di `apps/web/wrangler.jsonc` menunjuk versi aktif; `deploy.yml` tidak pernah menyentuh korpus (dijaga tes `src/corpus.test.ts`). Riwayat versi dan target rollback: [data/SOURCES.md](../../data/SOURCES.md#korpus-d1-produksi).

**Promote versi baru** (setiap langkah remote dengan izin pemilik):

1. `pnpm ingest ihya` (build bersih), lalu `pnpm run corpus:promote <versi>`: rencana, sha256 build, dan hitungan baris. Versi baru = nama baru (`ihya-v2`). Skrip menolak memuat ulang DB yang melayani atau pernah melayani produksi: binding di working tree, di `origin/main` (setelah `git fetch`), atau tercatat di `data/SOURCES.md`. Korpus staging tidak pernah dijadikan produksi.
2. `pnpm run corpus:promote <versi> --confirm` (±1 menit untuk Ihya): `d1 create --location apac` → migrasi korpus → muat `data/build/sql/*.sql` → smoke (hitungan **setiap** tabel dan `meta` = build, j1 h200) → ganti `CORPUS_DB` produksi di `apps/web/wrangler.jsonc`. Bila smoke gagal, binding tidak diubah.
3. `pnpm run corpus:qa <versi>`: harus 30/30. Laporannya di-commit.
4. Catat versi baru (aktif) dan versi lama (rollback) di `data/SOURCES.md`, lalu PR. Setelah CI hijau dan merge, `deploy.yml` men-deploy Worker dengan binding baru. Cache ISR ikut kosong karena build baru (ADR-034).
5. DB lama **tidak dihapus**.

**Rollback** (korpus baru bermasalah): `pnpm run corpus:promote <versi-lama> --switch-only` (hanya baca remote: smoke DB lama + `meta.schema_version` = skema kode, lalu ganti binding), commit, PR, merge. `ihya-v1` belum punya versi lama (sebelumnya pembaca tertutup), jadi rollback-nya = tutup darurat. Catatan S11: `ihya-v1` berskema 3 (tanpa `term_stat`), jadi setelah kode skema 4 ada di `main`, `--switch-only ihya-v1` ditolak dengan pesan (smoke: "skema korpus 3 belum punya indeks pencarian", ditambah cek `meta.schema_version`); pencarian sendiri aman di skema lama (503 `unavailable`).

**Tutup darurat pembaca** (teks salah tampil dan rollback belum siap): ubah `vars.READER_ENABLED` top-level di `apps/web/wrangler.jsonc` menjadi `"0"`, PR, merge (±5 menit sampai deploy). Rute `/kitab/*` kembali "segera hadir" dan cache ISR lama tidak dipakai lagi karena build baru. **Jangan** lewat dashboard Cloudflare: variabel berubah tanpa build baru, sehingga halaman yang sudah ter-cache di R2 tetap tampil (ADR-034).

## Alur dan modul

| Langkah | Modul |
|---|---|
| Baca `book/{id%1000}/{id}.db` + `update/master/{book,author}.sqlite` (Zod di batas) | `src/shamela/source.ts`, `src/sqlite.ts` |
| Pecah halaman: badan/catatan kaki, paragraf, span judul, takhrij `//`, tautan penanda (١) | `src/shamela/page.ts` (memakai `@surau/text`) |
| Daftar isi + patch YAML, node tiap paragraf | `src/toc.ts`, `src/patch.ts` |
| QA OpenITI: parser mARkdown minimal, kemiripan matan (LCS token), cocok takhrij (bigram) | `src/openiti/`, `src/similarity.ts` |
| Baris tabel (ID dari peta ID + `@surau/db`), validasi, laporan | `src/rows.ts`, `src/ids.ts`, `src/validate.ts`, `src/report.ts` |
| Indeks pencarian: baris `passage_fts` + `term_stat` (fts5vocab) | `src/search-index.ts` |
| SQL D1 (≤90 KB/statement, tanpa BEGIN/COMMIT), `.sqlite` dari migrasi yang sama | `src/sql.ts`, `src/build-sqlite.ts` |
| Orkestrasi, CLI, muat ke D1 | `src/pipeline.ts`, `src/cli.ts`, `src/load.ts` |
| D1 remote: pembungkus wrangler, smoke, build, binding produksi, promote, QA sampel | `src/d1.ts`, `src/corpus.ts`, `src/promote.ts`, `src/qa-sample.ts`, `src/qa.ts` |
| Konfigurasi per kitab (ID, slug, harapan validasi, pin OpenITI) | `src/works/ihya.ts` |

Build deterministik: dua build pada commit yang sama menghasilkan sha256 yang sama (`built_at` = `SOURCE_DATE_EPOCH` atau tanggal commit HEAD).

## Tes

- `pnpm test`: unit per modul + uji ujung-ke-ujung dengan kitab **buatan** (`test/fixture.ts`: struktur meniru Shamela/OpenITI, isi kalimat karangan).
- `test/ihya-ingest.test.ts` dan `test/ihya-text.test.ts` memakai Ihya asli; dilewati otomatis bila drive/unduhan tidak ada (CI). Keluarannya di folder sementara, teks kitab tidak disalin ke git.

## Menambah kitab

Ubah reset menjadi per edisi dulu (lihat peringatan di atas). Lalu buat `src/works/<kitab>.ts` (salin pola `ihya.ts`), patch `data/patches/<kitab>-<id>.yaml` bila daftar isinya cacat, pin versi OpenITI-nya di `data/SOURCES.md`, lalu tambahkan perintahnya di `src/cli.ts`. Kitab tanpa versi OpenITI butuh kebijakan lisensi per kitab dulu (ADR-018).
