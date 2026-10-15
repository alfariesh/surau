# S06 · Skema data & D1 (`packages/db`)

> **Fase:** 1 · **Status:** selesai (2026-10-15)
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

- [x] Migrasi berhasil diterapkan di D1 lokal dari nol (log dicatat), dan `passage_fts` terbentuk
- [x] DB remote staging dan app dibuat dengan `--location apac`, ID-nya ada di `wrangler.jsonc` (bukan rahasia)
- [x] ADR ID & permalink tertulis di KEPUTUSAN.md
- [x] Tes repository lolos di `vp test` dengan `@cloudflare/vitest-plugin`
- [x] Skema Zod cocok dengan hasil migrasi (tes); tidak ada ORM; `pnpm verify` lolos
- [x] ARSITEKTUR-TEKNIS §3 diperbarui sesuai skema final
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Mengisi data nyata (S07). Query FTS (S11). Tabel kuota dan ledger (S20).

## Catatan hasil

**Dibuat (PR S06):**
- `packages/db` (`@surau/db`; dependensi runtime hanya `zod` 4.6.7):
  - Migrasi `migrations/corpus/0001_init.sql`: 10 tabel `STRICT` + `passage_fts` FTS5 contentless dengan `contentless_delete=1`.
  - Migrasi `migrations/app/0001_init.sql`: `settings` dan `feedback`.
  - Skema Zod baris (`corpusTables`, `appTables`) dan formula ID (`pageId`, `tocNodeId`, `passageId`, `passageIdRange`).
  - Repository: `listWorks`, `getWorkBySlug`, `getEdition`, `getPageByCitation`, `getPageById`, `getAdjacentPages`, `getTocNode`, `getTocChildren`, `getPassagesByPage`, `getFootnoteRefs`, `getCorpusMeta`, `getSettings`, `createFeedback`.
- ADR-029: formula ID, permalink final, aturan stabilitas (ID dibekukan sejak rilis Fase 1), dan tes D1 di workerd.
- DB remote (apac), ID-nya di `packages/db/wrangler.jsonc`:
  - `surau-corpus-staging` `ffc5ce9a…`
  - `surau-app` `76b6488e…`
  - `surau-app-staging` `49fd36a5…` (`env.staging`)
- Migrasi remote diterapkan atas izin pemilik.
- Skrip root `db:migrate:local` dan `db:migrate:remote`.
- `pnpm test` kini terdiri dari project `node` (dengan coverage) + project `db` (workerd) + smoke.

**Bukti:**
- `rm -rf .wrangler/state && pnpm run db:migrate:local`: korpus "17 commands executed successfully", app 5 commands, keduanya ✅. `sqlite_master` lokal memuat 10 tabel, `passage_fts` beserta tabel bayangannya (`_config`, `_data`, `_docsize`, `_idx`), dan indeks `edition_default`, `page_citation`, `passage_toc`, `toc_node_children`.
- `wrangler d1 create … --location apac` ×3: "Successfully created DB … in region APAC".
- `pnpm run db:migrate:remote`: 17/5/5 commands ✅.
- Uji FTS di `surau-corpus-staging` (insert → MATCH → delete → count 0) lolos. `pragma_table_list` remote: semua tabel Surau `strict=1`.
- `pnpm exec vp test --project db`: 44 tes lolos (6 file) di workerd. Uji sabotase (skema Zod `source_page_id` dibuat tidak nullable) membuat tes skema gagal, jadi tes itu benar-benar menjaga kecocokan.
- `pnpm verify` lolos: format, lint, cek tipe 61 file, 126 tes node + 44 tes db, smoke, build.

**Utang teknis / catatan:**
- Cakupan `packages/db/src` belum diukur angkanya: coverage v8 tidak berjalan di runner workerd (ADR-029 butir 8). Semua fungsi repository dipanggil tes.
- Tabel `id_redirect` dan pemeriksaan manifes ID dikerjakan di S10, sebelum rilis Fase 1.
- `translation.review_status` ada di korpus sesuai rencana. Review manusia sendiri tetap disimpan di DB app (S18).

**Untuk sesi berikutnya:**
- **S07:**
  - Ingest menulis `meta.norm_version` = `NORM_VERSION`, beserta `corpus_version`, `built_at` (`SOURCE_DATE_EPOCH`), dan `source_hash`.
  - Isi `edition.slug` + `is_default`, `work.slug` = `ihya`, `juz`/`page_no` sebagai angka. Pasangan (juz, halaman) di Ihya unik (dicek).
  - `footnote_ref` hanya untuk penanda yang tertaut, dengan offset dari `linkFootnotes` relatif terhadap `text_raw` paragraf.
  - ID memakai fungsi di `@surau/db`. Muat lokal dengan `--persist-to .wrangler/state` dan binding `CORPUS` dari `packages/db/wrangler.jsonc`.
- **S08/S09:** binding D1 di `apps/web/wrangler.jsonc` memakai `database_id` yang sama, ditambah blok `previews` (`surau-corpus-staging`, `surau-app-staging`), dan `migrations_dir` menunjuk ke `../../packages/db/migrations/app`. Persist lokal dibuat sama (ARSITEKTUR §7 aturan 1).
