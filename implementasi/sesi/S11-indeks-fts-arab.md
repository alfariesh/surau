# S11 · Indeks FTS Arab & `searchText`

> **Fase:** 2 · **Status:** belum
> **Prasyarat:** Fase 1 dirilis (atau S10 selesai) · Tugas pemilik: **T-09** (drive, untuk membangun ulang korpus)
> **Perkiraan:** 1 percakapan agent

## Tujuan

Pencarian Arab di Ihya berjalan cepat dan akurat. Teks diindeks dalam bentuk ternormalisasi beserta stem proklitik. Query disusun dengan aman (ekspansi klitik dan kunyah), dan hasilnya disorot di teks mentah asli.

## Baca dulu (hanya ini)

- [Riset pencarian Arab](../../docs/riset/2026-10-15-pencarian-arab/README.md): angka, skema, dan jebakan. Ini wajib.
- ADR-005 dan 006, ARSITEKTUR-TEKNIS §3.1 dan §4 (`searchText`), serta README `packages/text` (`buildFtsMatch`, `stemText`, `toRawSpan`).
- `/docs-terbaru` untuk SQLite FTS5 (`contentless_delete`, bm25, kolom filter) dan D1 (batas query, `meta.rows_read`, read replication).

## Langkah

1. **Mulai rinci fase.** Ini sesi pertama Fase 2. Tinjau S12–S15 dan rapikan bila perlu.
2. **Isi FTS dari pipeline:** `tools/ingest` menambahkan keluaran SQL untuk `passage_fts` (`body`, `foot`, `sbody`, `sfoot`, dihitung dengan `@surau/text`). Kolom diisi sesuai `kind` paragraf; untuk contentless, semua kolom wajib diisi. Pecah per batch supaya setiap eksekusi < 30 detik. Simpan `norm_version` di `meta`.
3. **Statistik kata umum:** saat build, hitung df per stem (via `fts5vocab` di `.sqlite` lokal), lalu simpan stem dengan df > ±5% ke tabel `term_stat`.
4. **`searchText` di `packages/core`:**
   - `buildFtsMatch(query)` sebagai **satu** parameter terikat. Query kosong setelah normalisasi → hasil kosong.
   - SQL: `ORDER BY bm25(passage_fts, …) LIMIT n`. Karena `buildFtsMatch` mencari di kolom `{sbody sfoot}`, bobot efektifnya ada di kolom stem (mis. `bm25(passage_fts, 0, 0, 1.0, 0.5)`). Kolom `body`/`foot` dipertahankan hanya bila dipakai untuk mode frasa persis; putuskan dan catat.
   - Filter per edisi lewat rentang `rowid`.
   - Agregasi per halaman.
   - Sorotan dibuat dengan `normalizeArabic(text_raw)` + `toRawSpan`, dan potongan (±160 karakter) diambil dari **teks mentah**.
   - Pengaman: bila semua term ada di `term_stat`, kembalikan peringatan dan hasil terbatas.
   - Opsi `expand` (sufiks) bersifat opsional.
5. Endpoint `GET /api/search?q=&edition=&limit=` di `apps/web` (route handler, Zod, panjang query ≤200 karakter). Endpoint ini dipakai UI S14.
6. **Ukur di staging remote** (titik ukur: `meta.duration` hasil D1 = waktu SQL di server, ditambah header `Server-Timing` dari `GET /api/search` di preview; catat metodenya): 18 query dari riset (الصبر, التوكل, النية, والصبر, بالنية, أبو هريرة, frasa hadits berharakat, dll.). Catat latensi p50/p95 dan `meta.rows_read` di LOG. Bandingkan dengan angka lokal riset; perkiraannya rows_read ≈ 3× jumlah kecocokan.
7. **Tes:**
   - Unit: penyusun query dan sorotan.
   - Integrasi dengan D1 lokal + fixture kecil.
   - Tes regresi recall: 18 query + definisi gold di [`docs/riset/2026-10-15-pencarian-arab/queries.json`](../../docs/riset/2026-10-15-pencarian-arab/queries.json). Hasil harus ≥ angka per query di file itu. Gold dibuat ulang otomatis dari DB lokal Ihya, dan tes dilewati bila DB tidak ada.
8. Kode yang membaca tabel baru (`term_stat`) memeriksa `meta.schema_version` (ARSITEKTUR §7 aturan 5). Promosikan korpus versi baru (`ihya-v2` dengan FTS) lewat `corpus:promote` setelah UI S14 siap. Sesi ini cukup memuat ke staging.

## Selesai bila

- [ ] `passage_fts` terisi di D1 lokal dan staging; `norm_version` tercatat
- [ ] Recall regresi 18 query ≥ angka riset (1,000 terhadap gold regex), dengan maksimal ±10 hit melenceng
- [ ] Latensi staging p95 < 150 ms untuk query non-umum; `rows_read` tercatat
- [ ] Query hanya kata umum (الله) memberi peringatan, bukan beban penuh
- [ ] Sorotan selalu mengembalikan substring persis dari `text_raw` (tes)
- [ ] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Query bahasa Indonesia (S14). Embedding (ditunda, ADR-006). UI (S14).

## Catatan hasil

*(diisi agent)*
