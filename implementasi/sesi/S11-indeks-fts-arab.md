# S11 · Indeks FTS Arab & `searchText`

> **Fase:** 2 · **Status:** selesai
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

- [x] `passage_fts` terisi di D1 lokal dan staging; `norm_version` tercatat — `wrangler d1 execute CORPUS --local|--remote`: lokal dan staging sama-sama `schema_version` 4, `norm_version` 1, `corpus_version` ihya-v2, `passage_fts` 20.509 = `passage` 20.509, `term_stat` 39; smoke `corpus:load:local`/`staging` lolos (termasuk kueri الصبر)
- [x] Recall regresi 18 query ≥ angka riset (1,000 terhadap gold regex), dengan maksimal ±10 hit melenceng — `vp test --project node packages/core/test/local/ihya-search.test.ts`: 18/18 recall 1,000, gold sama dengan angka riset per kueri, 6 halaman di luar gold (q03 dan q11 masing-masing 3)
- [x] Latensi staging p95 < 150 ms untuk query non-umum; `rows_read` tercatat — handler p95 137 ms, SQL p95 9,9 ms (n = 180); `rows_read` per kueri di bawah dan di LOG
- [x] Query hanya kata umum (الله) memberi peringatan, bukan beban penuh — staging: `ranked: false`, `warning: "common_terms"`, 147 baris dibaca (vs ±42 ribu berperingkat); tes core, db, dan Ihya lokal (termasuk الل+expand dan varian berklitik)
- [x] Sorotan selalu mengembalikan substring persis dari `text_raw` (tes) — `packages/core/src/search.test.ts` (dibanding `text_raw` dari DB), `packages/text/test/property.test.ts` (2.000 string acak), tes Ihya lokal الصبر
- [x] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui — `pnpm verify` → lolos (lihat LOG)

## Di luar cakupan

- Query bahasa Indonesia (S14). Embedding (ditunda, ADR-006). UI (S14).

## Catatan hasil

2026-10-17 · PR #29 · ADR-039.

**Yang dibuat**
- Korpus **`ihya-v2`**: migrasi korpus 0004 `term_stat` (skema 4). `pnpm ingest ihya` (±4 dtk) kini mengisi `passage_fts` (20.509 baris; hanya kolom stem `sbody`/`sfoot`, `body`/`foot` kosong), `optimize`, lalu `meta` sebagai file terakhir; `term_stat` = 39 stem di >10% paragraf (dari `fts5vocab` di DB sementara dengan migrasi yang sama). Reset korpus mengosongkan indeks (`delete-all`). Smoke menghitung indeks + kueri الصبر, dan tidak lagi crash pada korpus skema lama. Dimuat ke D1 lokal dan `surau-corpus-staging` (±65 dtk). Produksi tetap `ihya-v1`.
- `@surau/text`: `planFtsQuery` + `ftsMatchExpression` (keluaran `buildFtsMatch` tidak berubah), `findPlanSpans` (sorotan di teks mentah lewat `toRawSpan`), `snippetSpan` (±160 karakter di batas spasi). `NORM_VERSION` tetap 1.
- `@surau/db`: `searchCorpus`, satu `batch` per pencarian: konteks (meta, kata umum, edisi/karya/penulis) + kueri berperingkat per halaman + kueri urutan kitab; pengaman kata umum di ekspresi MATCH.
- `@surau/core`: `searchText` (kontrak `searchView` untuk MCP S16), error `InvalidQuery` (400) dan `Unavailable` (503).
- `apps/web`: `GET /api/search?q=&edition=&limit=&offset=&expand=1` (Zod, `SEARCH_GLOBAL_LIMITER` 300/menit + `SEARCH_LIMITER` 60/menit per HMAC jaringan IP, `Server-Timing`; detail baris dibaca hanya di Preview). Produksi menjawab 503 sampai `ihya-v2` dipromosikan.

**Penyimpangan dan keputusan (ADR-039)**
- Langkah 3: ambang `term_stat` **10%**, bukan ±5%: 5% ikut menjaring kata bermakna (علم, دنيا, ناس, نفسه, رجل, يوم).
- Langkah 4: `body`/`foot` **tidak diisi** (stem saja 5,45 MB vs 7,42 MB, kecepatan sama); mode kata persis kelak = bangun ulang indeks tanpa migrasi.
- Pengaman kata umum dihitung per posisi kueri atas SEMUA token yang dicari (varian proklitik/kunyah, awalan `expand`), setelah peninjau menemukan celah `الل`+expand → الله. Akibatnya kueri seperti سلم (varian وسلم) juga dijaga.
- Langkah 6 menuntut dua titik ukur; ternyata bolak-balik Worker → D1 yang dominan, jadi desain diubah dari dua bolak-balik menjadi satu.
- Langkah 1: S12, S13, S15 tidak perlu diubah; S14 diberi catatan (API sudah ada, keputusan rollback `ihya-v1`).

**Ukuran staging (langkah 6)**
Metode: skrip Node mengirim `GET /api/search?q=…` ke Preview PR #29 (Worker colo **SIN**; DB `surau-corpus-staging`, primary **NRT**, `served_by_primary`) untuk 18 kueri riset + 2 kueri umum, berurutan dengan jeda 1,1 dtk (di bawah `SEARCH_LIMITER`), dibaca dari header `Server-Timing`: `d1` = jumlah `meta.duration` (waktu SQL di D1), `total` = durasi handler di Worker (termasuk bolak-balik ke D1); `client` = waktu dari Mac pemilik (Indonesia) hanya pembanding. Kode final (8c88754), 10 ulangan → n = 180 kueri berperingkat, 0 galat:

| Titik ukur | p50 | p95 | maks |
|---|---|---|---|
| SQL D1 (`meta.duration`) | 5,4 ms | 9,9 ms | 15,6 ms |
| Handler Worker (`total`) | 107 ms | **137 ms** | 198 ms |
| Klien (Indonesia → SIN) | 208 ms | 257 ms | 916 ms |

`rows_read` per kueri (satu batch, termasuk konteks): الصبر/الصَّبْرُ/والصبر/صبر 2.990 (323 paragraf cocok), التوكل 1.490, النية/بالنية 2.154, صلاة العيدين 91, أبو هريرة 7.665 (932), الإخلاص 1.722, طلب العلم 570, frasa hadits 215, الغيبة 1.640, حب الدنيا… 174, الرياء 3.123, ذكر الموت 672, التوبة 1.788, مسئول 289. Kata umum: الله 147, قال رسول الله 211 (berperingkat penuh الله ±42 ribu). Riset memperkirakan ±3× kecocokan; ternyata ±9× karena tabel sementara dan indeks otomatis ikut dihitung. Awalan `expand` akar 3 huruf: علم 17.090 / 45 ms SQL, نفس 19.275, قلب 14.884.

Riwayat ukur (desain berubah karena ini): dua bolak-balik → `total` p95 212 ms; satu batch dengan pengaman `substr` → p95 126 ms (n = 360) tetapi +±1.400 baris dibaca; final (pengaman lewat indeks) seperti tabel di atas.

**Utang dan pesan untuk sesi berikutnya**
- S14: promosikan `ihya-v2` (dengan izin) bersama UI. Setelah itu `--switch-only ihya-v1` ditolak (skema 3); longgarkan `promote.ts` bila `ihya-v1` harus tetap jadi target rollback.
- rows_read kueri berperingkat ±9× paragraf cocok (tabel sementara ikut dihitung); tinjau ulang saat korpus berisi banyak kitab (juga reset per edisi dan `term_stat` per korpus).
- Mode tanpa peringkat: `limit` = paragraf, tanpa halaman lanjut; UI S14 menampilkan peringatan dan saran menambah kata.
- Cache kueri populer (S14 langkah 8) belum ada; `Cache-Control: no-store`.
