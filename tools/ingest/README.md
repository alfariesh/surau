# @surau/ingest

Pipeline lokal yang mengubah kitab Shamela menjadi data korpus Surau yang tervalidasi (S07, ADR-018, ADR-032). Node 24 dengan type stripping (tanpa build); teks Arab diolah hanya lewat `@surau/text`, ID dan skema baris lewat `@surau/db`. Drive Shamela dibaca **hanya-baca** (`src/sqlite.ts` menolak menulis di bawah `/Volumes/`).

## Perintah (dari root repo)

| Perintah | Isi |
|---|---|
| `pnpm ingest ihya` | Bangun korpus Ihya (±3 detik): `data/build/sql/*.sql`, `data/build/surau-corpus-ihya-v1.sqlite`, `data/build/ihya-v1.sha256`, peta ID `data/ids/ihya-9472.json`, dan laporan `data/reports/ihya-9472-{validasi,openiti}.md`. **Gagal** (tanpa keluaran) bila invarian dilanggar |
| `pnpm ingest:verify` | Hanya gerbang QA OpenITI (matan ≥0,95 per halaman di ≥1.705 halaman; takhrij vs JK000001) → laporan `…-openiti.md` |
| `pnpm corpus:load:local` | Migrasi korpus + muat semua file SQL ke D1 lokal (`.wrangler/state`), lalu smoke query (jumlah baris, j1 h200) |
| `pnpm corpus:load:staging --confirm` | Sama, ke `surau-corpus-staging` (remote). **Minta izin pemilik dulu**; tanpa `--confirm` skrip menolak. Selama impor (±1 menit) DB tidak melayani kueri |

**Peringatan:** file pertama (`0000-reset.sql`) mengosongkan **seluruh** DB korpus. Untuk sekarang satu DB berisi satu kitab; begitu ada kitab kedua, reset harus dibuat per edisi dulu. Bila `passage_fts` sudah diisi (S11), indeksnya juga harus ikut dikosongkan.

Syarat: drive Shamela terpasang (T-09; bisa ditimpa `--shamela <dir>` atau `SURAU_SHAMELA_ROOT`) dan dua file OpenITI yang dipin ada di `data/raw/openiti/` (cara unduh dan sha256: `data/SOURCES.md`). Opsi `--reset-ids` membangun peta ID dari nol, **hanya** sebelum rilis Fase 1 (ADR-029).

## Alur dan modul

| Langkah | Modul |
|---|---|
| Baca `book/{id%1000}/{id}.db` + `update/master/{book,author}.sqlite` (Zod di batas) | `src/shamela/source.ts`, `src/sqlite.ts` |
| Pecah halaman: badan/catatan kaki, paragraf, span judul, takhrij `//`, tautan penanda (١) | `src/shamela/page.ts` (memakai `@surau/text`) |
| Daftar isi + patch YAML, node tiap paragraf | `src/toc.ts`, `src/patch.ts` |
| QA OpenITI: parser mARkdown minimal, kemiripan matan (LCS token), cocok takhrij (bigram) | `src/openiti/`, `src/similarity.ts` |
| Baris tabel (ID dari peta ID + `@surau/db`), validasi, laporan | `src/rows.ts`, `src/ids.ts`, `src/validate.ts`, `src/report.ts` |
| SQL D1 (≤90 KB/statement, tanpa BEGIN/COMMIT), `.sqlite` dari migrasi yang sama | `src/sql.ts`, `src/build-sqlite.ts` |
| Orkestrasi, CLI, muat ke D1 | `src/pipeline.ts`, `src/cli.ts`, `src/load.ts` |
| Konfigurasi per kitab (ID, slug, harapan validasi, pin OpenITI) | `src/works/ihya.ts` |

Build deterministik: dua build pada commit yang sama menghasilkan sha256 yang sama (`built_at` = `SOURCE_DATE_EPOCH` atau tanggal commit HEAD).

## Tes

- `pnpm test`: unit per modul + uji ujung-ke-ujung dengan kitab **buatan** (`test/fixture.ts`: struktur meniru Shamela/OpenITI, isi kalimat karangan).
- `test/ihya-ingest.test.ts` dan `test/ihya-text.test.ts` memakai Ihya asli; dilewati otomatis bila drive/unduhan tidak ada (CI). Keluarannya di folder sementara, teks kitab tidak disalin ke git.

## Menambah kitab

Ubah reset menjadi per edisi dulu (lihat peringatan di atas). Lalu buat `src/works/<kitab>.ts` (salin pola `ihya.ts`), patch `data/patches/<kitab>-<id>.yaml` bila daftar isinya cacat, pin versi OpenITI-nya di `data/SOURCES.md`, lalu tambahkan perintahnya di `src/cli.ts`. Kitab tanpa versi OpenITI butuh kebijakan lisensi per kitab dulu (ADR-018).
