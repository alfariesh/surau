# S06 · Skema data & D1 (`packages/db`)

> **Fase:** 1 · **Status:** belum
> **Prasyarat:** S05 selesai · Tugas pemilik: – (`wrangler login` dari T-05 sudah ada)
> **Perkiraan:** 1 percakapan agent

## Tujuan

Skema korpus dan aplikasi terdefinisi, migrasinya berjalan di D1 lokal dan remote, dan skema ID serta permalink publik diputuskan (ADR). Setelah ini data siap dimasukkan.

## Baca dulu (hanya ini)

- ARSITEKTUR-TEKNIS §3 (model data) dan §7 (lingkungan).
- KEPUTUSAN: ADR-005 (dua DB, blue-green, FTS5) dan ADR-009 (tanpa ORM: migrasi SQL + repository bertipe).
- [docs/02](../../docs/02-arsitektur.md#yang-harus-benar-sejak-v1): "Yang harus benar sejak v1".
- `/docs-terbaru` untuk D1 Worker API (`prepare`/`bind`/`batch`, `meta.rows_read`), `wrangler` (`d1 create`, `d1 migrations create/apply`, `previews`), dan `zod` v4.

## Langkah

1. Buat `packages/db` (`@surau/db`) **tanpa ORM** (ADR-009). Satu-satunya dependensi runtime adalah `zod` (catalog).
2. **Skema korpus** (migrasi SQL di `migrations/corpus/` dan skema Zod baris di `src/schema/corpus.ts`): `work`, `author`, `edition`, `page`, `toc_node`, `passage`, `footnote_ref`, `meta`, plus `translation` dan `summary` (kosong sampai S13). Tabel `page` menyimpan `source_page_id` (Shamela `page.id`). Buat indeks yang dibutuhkan query baca: (`edition_id`, `juz`, `page_no`), `toc_node.parent_id`, dan `passage.page_id`. `meta.norm_version` diisi dari `NORM_VERSION` `@surau/text` (S05); web sudah melaporkan versinya di `GET /api/version`.
3. **Skema app** (`migrations/app/` + `src/schema/app.ts`): `settings` dan `feedback`. Tabel kuota dan ledger ditunda ke Fase 4. **Tanpa** tabel virtual.
4. **ADR ID & permalink.** Putuskan dan tulis ADR baru tentang hal-hal di bawah. ADR ini juga mengonfirmasi bahwa bentuk normal dan peta offset tidak disimpan (ADR-009).
   - Formula ID (`page.id = edition_id·10⁵ + seq`; `passage.id = edition_id·10⁷ + seq`), atau alternatif yang lebih baik.
   - Pola URL publik (usulan ARSITEKTUR §3.3).
   - Jangkar paragraf.
   - Aturan stabilitas (ID tidak berubah setelah rilis; ada tabel redirect bila terpaksa).
5. **Migrasi:**
   - File SQL bernomor di `migrations/corpus/` dan `migrations/app/` (dibuat dengan `wrangler d1 migrations create` atau ditulis manual dengan format yang sama). Satu perubahan skema = satu file baru; file lama tidak diedit.
   - Migrasi korpus juga membuat `passage_fts` (FTS5 contentless, `unicode61 remove_diacritics 0`, kolom `body`, `foot`, `sbody`, `sfoot`). Tabel ini dibuat sekarang supaya skema lengkap; isinya diisi di S11.
   - `wrangler.jsonc` (di `packages/db`, atau dipakai bersama oleh apps): `migrations_dir` untuk tiap DB.
   - Tes otomatis memastikan skema Zod cocok dengan kolom hasil migrasi (`PRAGMA table_info` di D1 lokal).
6. **DB:**
   - Lokal: jalankan `wrangler d1 migrations apply … --local --persist-to <root>/.wrangler/state` (satu lokasi untuk semua; ARSITEKTUR §7 aturan 1). Skrip `db:migrate:local` membungkus perintah ini.
   - Remote (minta izin): `surau-corpus-staging`, `surau-app`, dan `surau-app-staging` dengan `--location apac`. DB korpus produksi dibuat di S10 (blue-green).
7. **Repository bertipe** (`src/repo/`): fungsi query dasar (`getPageByCitation`, `getTocChildren`, `getPassagesByPage`, dll.) yang menerima `D1Database`, memakai `prepare().bind()`, dan mem-parse baris dengan Zod. Batas D1 dipatuhi (≤100 parameter, statement <100 KB). FTS **belum**.
8. **Tes:** `@cloudflare/vitest-plugin` dengan D1 lokal. Terapkan migrasi di setup tes, isi fixture kecil buatan (1 karya, 3 halaman, 2 catatan kaki), lalu uji repository.
9. Skrip root: `db:migrate:local` dan `db:migrate:remote` (dengan izin). Selalu dipanggil lewat `pnpm run`.

## Selesai bila

- [ ] Migrasi berhasil diterapkan di D1 lokal dari nol (log dicatat), dan `passage_fts` terbentuk
- [ ] DB remote staging dan app dibuat dengan `--location apac`, ID-nya ada di `wrangler.jsonc` (bukan rahasia)
- [ ] ADR ID & permalink tertulis di KEPUTUSAN.md
- [ ] Tes repository lolos di `vp test` dengan `@cloudflare/vitest-plugin`
- [ ] Skema Zod cocok dengan hasil migrasi (tes); tidak ada ORM; `pnpm verify` lolos
- [ ] ARSITEKTUR-TEKNIS §3 diperbarui sesuai skema final
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Mengisi data nyata (S07). Query FTS (S11). Tabel kuota dan ledger (S20).

## Catatan hasil

*(diisi agent)*
