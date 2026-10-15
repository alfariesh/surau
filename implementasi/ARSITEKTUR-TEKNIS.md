# Arsitektur Teknis

Dokumen ini adalah **target** arsitektur. Bagian-bagiannya dibangun bertahap sesuai fase. Konsep produknya ada di [docs/02-arsitektur.md](../docs/02-arsitektur.md), dan alasan setiap pilihan ada di [KEPUTUSAN.md](KEPUTUSAN.md). Bila implementasi menyimpang, perbarui dokumen ini di sesi yang sama.

## 1. Peta sistem

```
                    ┌──────────────────────── Cloudflare ────────────────────────────┐
 Browser ──────────▶│ surau-web  (Next.js 16 via OpenNext)   <domain>/*               │
                    │   UI pembaca, cari, tanya; SSR membaca D1 lewat packages/core   │
                    │   route handler: /api/search, /api/feedback, /api/jawab*, /api/admin*
                    │        │ service binding (tanpa route publik)                    │
                    │        ▼                                                         │
                    │ surau-api  (Hono, Fase 4)                                        │
                    │   Jawab (SSE), kuota, ledger biaya, cron ── AI Gateway ──▶ Anthropic
                    │                                                                  │
 Claude/ChatGPT ───▶│ surau-mcp  (MCP SDK v2, Fase 3)        mcp.<domain>/mcp         │
   (AI pengguna)    │   read-only, tanpa LLM, rate limit HMAC(IP):tool                │
                    │                                                                  │
                    │ D1  surau-corpus-<versi>  (hanya-baca, FTS5)   ◀── semua Worker  │
                    │ D1  surau-app             (feedback, kuota, ledger, cache)       │
                    │ R2  surau-next-cache      (cache ISR OpenNext)                   │
                    │ R2  surau-open-data       (dump .sqlite terbuka, Fase 7)         │
                    └──────────────────────────────────────────────────────────────────┘
        ▲
        │ wrangler d1 execute --file (SQL berpotongan)       Mac pemilik (lokal)
        └──────────────────────────────────────────────── tools/ingest ◀── Shamela SQLite
                                                           (node:sqlite)    /Volumes/Elfariesh
```

Semua Worker mengimpor logika domain yang sama dari `packages/core`. Aturan keamanan ditulis sekali, di satu tempat ([docs/02](../docs/02-arsitektur.md#gagasan-kunci): "Core Tools adalah satu-satunya pintu ke data").

## 2. Struktur monorepo (target)

```
surau/
├─ apps/
│  ├─ web/            @surau/web   Next.js 16 + HeroUI (dipindah dari web/ di S01)
│  ├─ mcp/            @surau/mcp   Worker MCP (Fase 3)
│  └─ api/            @surau/api   Worker Hono: Jawab, kuota, cron (Fase 4)
├─ packages/
│  ├─ text/           @surau/text  normalisasi Arab, offset map, stem, pembersih HTML Shamela, findQuote
│  ├─ db/             @surau/db    migrasi SQL (corpus + app), skema Zod baris, repository bertipe (tanpa ORM, ADR-009)
│  ├─ core/           @surau/core  core tools + skema Zod + pembangun sitasi
│  └─ llm/            @surau/llm   (Fase 2+) klien Anthropic, prompt berversi, verifikasi sitasi
├─ tools/
│  ├─ ingest/         CLI Node: Shamela → validasi → patch → SQL/dump (node:sqlite, type stripping)
│  └─ eval/           (Fase 2+) runner eval retrieval & jawaban
├─ data/              LICENSE (CC BY-NC-SA), ATTRIBUTION.md, SOURCES.md, patches/, reports/ (di-commit; tanpa teks kitab)
│                     raw/ dan build/ (git-ignored): sumber unduhan, *.sqlite, *.sql
├─ evals/             dataset eval (JSONL); private/ git-ignored
├─ docs/  implementasi/  .claude/  .github/workflows/
├─ package.json  pnpm-workspace.yaml  vite.config.ts  tsconfig.base.json  .node-version
└─ CLAUDE.md
```

Folder dibuat saat sesi yang membutuhkannya. Jangan membuat paket kosong lebih awal.

## 3. Model data

### 3.1 Korpus (`surau-corpus-<versi>`, hanya-baca)

Skema final v1 ada di `packages/db/migrations/corpus/0001_init.sql` (S06, ADR-029). Nama DB: `surau-corpus-staging` (sekarang) dan `surau-corpus-<versi>` blue-green (S10). Prinsipnya: **teks mentah tidak pernah diubah**, ID stabil setelah rilis, dan FTS adalah indeks turunan yang bisa dibangun ulang. Semua tabel biasa `STRICT`, dan enum serta formula ID dijaga `CHECK`. Urutan tampil tidak pernah diambil dari ID.

| Tabel | Kolom utama | Catatan |
|---|---|---|
| `work` | `id`, `slug` (`ihya`, segmen URL, dibekukan), `openiti_uri` (`0505Ghazali.IhyaCulumDin`), `title_ar`, `title_id`, `author_id`, `attribution_status` (`authentic`/`disputed`/`spurious`), `original_language`, `period` | Metadata karya. Untuk Ruang Tokoh, lihat [docs/05](../docs/05-kebijakan.md#3-persona-dan-ruang-tokoh) |
| `author` | `id`, `name_ar`, `name_id`, `death_hijri`, `shamela_author_id`, `wikidata_id` | Dimulai dari `author.sqlite` Shamela |
| `edition` | `id` (1..899.999), `work_id`, `slug` (segmen URL `@<slug>`), `is_default` (tepat satu per karya), `source` (`shamela`/`openiti`), `source_ref` (`9472`), `publisher`, `city`, `volumes`, `license`, `attribution` | Satu karya bisa punya beberapa edisi |
| `page` | `id` = `edition_id·10⁵ + seq`, `edition_id`, `seq`, `juz` (≥1; satu jilid = 1), `page_no` (halaman cetak), `source_page_id` (ID halaman di sumber, misalnya Shamela `page.id`, untuk tautan "lihat di Shamela" dan QA) | **Unit sitasi.** (`edition_id`, `juz`, `page_no`) unik (indeks `page_citation`) |
| `toc_node` | `id` = `edition_id·10⁵ + seq`, `edition_id`, `parent_id`, `ord`, `level`, `title_ar`, `start_page_id`, `source_title_id`, `patched` (0/1) | Pohon daftar isi; indeks (`edition_id`, `parent_id`, `ord`). Perbaikan dicatat di file patch |
| `passage` | `id` = `edition_id·10⁷ + seq` (supaya filter per edisi memakai rentang rowid), `edition_id`, `page_id`, `toc_node_id`, `kind` (`body`/`foot`), `ord` (per halaman per jenis, mulai 1 = jangkar `#p`/`#f`), `text_raw` | Paragraf. Teks mentah persis (HTML dibersihkan secara deterministik). Unik (`page_id`, `kind`, `ord`); indeks `toc_node_id` |
| `footnote_ref` | `passage_id`, `char_start`, `char_end`, `marker` (`١`), `footnote_passage_id` | Menautkan penanda (١) di badan teks ke catatan kaki takhrij. Offset = indeks string JS di `text_raw`; penanda yatim tidak disimpan |
| `passage_fts` | FTS5 contentless: `body`, `foot`, `sbody`, `sfoot` | `tokenize='unicode61 remove_diacritics 0'` di atas teks ternormalisasi. Lihat [riset FTS](../docs/riset/2026-10-15-pencarian-arab/README.md) |
| `translation` | `passage_id`, `lang`, `text`, `model`, `prompt_version`, `created_at`, `review_status` (`ai_generated`/`reviewed`/`ustadz_verified`/`rejected`) | Fase 2, berlabel "terjemahan AI" |
| `summary` | `toc_node_id`, `lang`, `text`, `model`, `prompt_version`, … | Fase 2, berlabel "ringkasan AI" |
| `quran_ayah`, `quran_translation`, `passage_ayah_ref` | surah, ayah, teks Tanzil (indeks + tampilan), terjemahan Kemenag/QuranEnc + versi; rujukan ayat di paragraf (`exact`/`similar`, `partial`) | Fase 2 (S12). Teks dan terjemahan verbatim (ADR-020) |
| `meta` | `key`, `value` | `schema_version` (diisi migrasi, sekarang 1), lalu `norm_version`, `corpus_version`, `built_at`, `source_hash` (diisi ingest) |

**Teks ternormalisasi tidak disimpan** di tabel. `normalizeArabic(text_raw)` beserta peta offsetnya dihitung ulang saat dibutuhkan (deterministik terhadap `NORM_VERSION`, ±7 juta karakter/detik). Bentuk normal dan stem hanya ada di indeks `passage_fts` (ADR-009).

### 3.2 Aplikasi (`surau-app`)

**Aturan:** apa pun yang dihasilkan **review manusia** (review ustadz, koreksi, status wiki `reviewed`/`ustadz_verified`) disimpan di DB app atau DB terpisah yang **tidak** ikut blue-green korpus, supaya tidak hilang saat korpus dibangun ulang ([docs/05](../docs/05-kebijakan.md) §6). Korpus hanya merujuknya lewat ID stabil.

Sudah ada (S06, `packages/db/migrations/app/0001_init.sql`): `settings` (`jawab_enabled` = `0`) dan `feedback` (laporan kesalahan dari UI, tanpa PII: `path` tanpa query string, pesan 1–2.000 karakter). DB: `surau-app` (produksi) dan `surau-app-staging` (Preview). Menyusul: `quota_daily`, `llm_budget`, `llm_ledger`, `answer_cache` (kunci = pertanyaan ternormalisasi + versi korpus), `answer_log` dan `review` (eval dan tinjau ustadz, ADR-015), dan nanti tabel Better Auth. **Tanpa** tabel virtual.

### 3.3 Permalink publik (final, ADR-029)

- Halaman: `/kitab/<work.slug>/<juz>/<page_no>` → `/kitab/ihya/1/200` (edisi default).
- Jangkar: paragraf badan `#p<ord>`, catatan kaki `#f<ord>`.
- Bagian daftar isi: `/kitab/ihya/bab/<toc_node.id>`.
- Edisi non-default: `/kitab/ihya@<edition.slug>/1/200`.

Permalink dan ID yang sudah dirilis tidak boleh berubah tanpa pengalihan. ID dibekukan sejak rilis Fase 1: unit baru mendapat `seq` setelah yang terbesar, dan unit yang hilang dialihkan lewat tabel `id_redirect` (dibuat saat pertama dibutuhkan). Repository di `packages/db/src/repo/` menerima tipe struktural `D1Db`.

## 4. Core tools (`packages/core`)

Fungsi murni yang menerima `D1Database` dan mengembalikan objek bertipe dengan **teks mentah dari DB** dan **sitasi**. Nama MCP mengikuti ADR-012.

| Fungsi | Tool MCP | Fase | Isi |
|---|---|---|---|
| `listWorks()` / `getWork(slug)` | `list_works` | 1 | Metadata karya dan edisi |
| `getToc(editionId, nodeId?, depth?)` | `get_table_of_contents` | 1 | Pohon daftar isi beserta halaman awal |
| `readSection(nodeId, cursor?)` | `read_section` | 1 | Paragraf bagian (dipaginasi ±4–6 ribu token), catatan kaki, sitasi |
| `readPage(editionId, juz, pageNo)` | `read_page` | 1 | Satu halaman cetak beserta catatan kakinya |
| `searchText(query, opts)` | `search_text` | 2 | Hasil BM25 dengan span sorotan (dipetakan ke teks mentah), terjemahan bila ada, sitasi |
| `verifyQuote(passageId, quote)` | `verify_quote` | 2 | `findQuote` → substring mentah verbatim atau `null` |
| `getHadithTakhrij(passageId)` | `get_hadith_takhrij` | 3 | Teks catatan kaki takhrij asli yang ditautkan, dengan status review |
| `buildCitation(passage)` | (di setiap hasil) | 1 | Karya, edisi, juz, halaman, permalink, lisensi/atribusi |

## 5. Alur utama

**Pembaca (Fase 1):** request `/kitab/ihya/1/200` → server component memanggil `readPage` → render `ArabicText` dari `text_raw`, dengan penanda (١) yang bisa diklik untuk membuka takhrij. Halaman di-cache ISR on-demand (`revalidate=false`), karena konten kitab tidak berubah per versi korpus.

**Cari (Fase 2):** query (Arab atau Indonesia; skrip dideteksi) → `buildFtsMatch` (Arab) dan/atau FTS atas terjemahan Indonesia → gabung dengan RRF → tampilkan potongan mentah yang disorot + terjemahan AI + lokasi. Query yang hanya berisi kata sangat umum diberi peringatan atau wajib difilter.

**Jawab (Fase 4):**
1. Guard: sakelar, cookie Turnstile, burst, kuota, dan reservasi anggaran.
2. Haiku memilih bagian dari daftar isi yang di-cache, ditambah kandidat BM25.
3. Haiku menjawab dengan Citations. Dokumen *custom content* berisi satu blok per paragraf beserta ID-nya.
4. Kode memetakan indeks blok ke `passage_id`, lalu menjalankan `verifyQuote`.
5. UI menampilkan teks dari DB. Biaya dikomit ke ledger.
6. Bila terjadi refusal, ulangi dengan Sonnet 5.5 atau turun ke Cari. Bila anggaran habis, turun ke Cari.
7. Bila **tidak satu pun** sitasi lolos verifikasi, jawaban **tidak** ditampilkan. Sebagai gantinya tampilkan "Surau tidak dapat memverifikasi kutipan untuk pertanyaan ini" + hasil Cari, dan catat kasusnya untuk eval. Bila sebagian lolos, tampilkan hanya kalimat yang didukung sitasi yang lolos.

## 6. Pipeline ingest (`tools/ingest`)

```
1 baca     Shamela book/{id%1000}/{id}.db (node:sqlite, readOnly) + update/master/book.sqlite, update/master/author.sqlite
2 bersih   HTML → teks mentah deterministik; pisah badan/catatan kaki (garis _________ dan takhrij setelah //); paragraf per \r
3 struktur pohon judul (title.parent; title.page = page.id), terapkan patch (data/patches/<id>.yaml, di-commit)
4 validasi jumlah kitab per rub', urutan halaman, judul yatim, penanda (١) tanpa catatan kaki → laporan
5 turunan  normalizeArabic + stem (packages/text), footnote_ref, NORM_VERSION; QA verify-openiti (matan ≥0,95/halaman)
5b ayat    (Fase 2) cocokkan bentang ayat ke Tanzil; terjemahan Kemenag/QuranEnc; FTS; terjemahan & ringkasan batch
6 keluaran data/build/<corpus-versi>.sqlite (dump) + data/build/sql/*.sql (≤90 KB/statement); deterministik:
           meta.built_at diambil dari SOURCE_DATE_EPOCH / tanggal commit, bukan jam sekarang
7 muat     wrangler d1 execute <db> --local|--remote --file …  (atomik per file), lalu isi FTS per edisi
8 cek      smoke query + hitung baris + bandingkan sampel halaman acak dengan sumber
```

File patch, laporan validasi, `SOURCES.md` (versi + sha256 sumber), `ATTRIBUTION.md`, dan `LICENSE` data **di-commit**, karena tidak memuat teks kitab. Teks kitab, unduhan OpenITI/Tanzil/QuranEnc, dan hasil build tetap di luar git (`data/raw/`, `data/build/`). Matan wajib lolos gerbang `verify-openiti` (ADR-018).

## 7. Lingkungan dan binding

| Lingkungan | Web | D1 korpus | D1 app | R2 cache Next | Catatan |
|---|---|---|---|---|---|
| Lokal | `pnpm dev` (port 3004) dan/atau `opennextjs-cloudflare preview` | D1 lokal | D1 lokal | lokal | **Satu lokasi data lokal untuk semua:** `<root>/.wrangler/state` (lihat aturan di bawah) |
| Preview (per PR) | `wrangler preview` | `surau-corpus-staging` | `surau-app-staging` | `surau-next-cache-preview` | Resource akun **tidak** terisolasi per preview, jadi semua binding storage dideklarasikan ulang di blok `previews`. Service binding dari preview memanggil deployment **produksi** Worker tujuan. |
| Produksi | custom domain | `surau-corpus-<versi>` (blue-green) | `surau-app` | `surau-next-cache` | `workers_dev=false`, `preview_urls=false` di produksi (Fase 4) |

**Aturan lingkungan (wajib):**
1. **Satu lokasi D1 lokal.** Semua perintah lokal memakai `--persist-to <root>/.wrangler/state`, yaitu `wrangler d1 migrations apply --local`, `wrangler d1 execute --local`, skrip `db:migrate:local`, dan `corpus:load:local`. `initOpenNextCloudflareForDev()` dan `getPlatformProxy()` diberi opsi `persist` yang sama. Tanpa ini, setiap `wrangler.jsonc` melihat DB lokal yang berbeda (kosong).
2. **Akses D1 dari Node** (`tools/eval`, tes integrasi): pakai `getPlatformProxy({ configPath, persist })` dari `wrangler`, dengan lokasi yang sama.
3. **Binding produksi wajib punya `database_id` eksplisit.** Binding D1 tanpa ID akan diprovisikan otomatis saat deploy, sehingga DB kosong dibuat tanpa izin. Sebelum korpus produksi ada (S10), arahkan ke `surau-corpus-staging` atau sembunyikan rute dengan flag di `vars`.
4. **Deploy otomatis (`deploy.yml`) hanya memigrasi `surau-app`, tidak pernah korpus.** Korpus hanya berubah lewat `pnpm run corpus:promote` (blue-green, dengan izin).
5. **Kode yang butuh skema korpus baru** (tabel `term_stat`, `quran_*`, `translation_fts`, dll.) memeriksa `meta.schema_version` dan menyembunyikan fitur bila korpus produksi masih versi lama. Cara lainnya: PR kode di-merge bersamaan dengan `corpus:promote`. Jangan sampai produksi error "no such table".

## 8. Angka dan batas yang perlu diingat

- **Worker:** 64 MiB tanpa kompresi, startup 1 detik, memori 128 MB, CPU default 30 detik.
- **D1:** 10 GB per DB, statement ≤100 KB, ≤100 parameter, query ≤30 detik, pola LIKE ≤50 byte, single-threaded per DB.
- **Ihya:** 11 MB data dan ±7 MB indeks FTS. 92 kitab diperkirakan ±1–1,6 GB total.
- **Haiku 5.5:** harga naik 5× di atas 100k token prompt (termasuk cache). Jawab dibatasi ±40k.
- **MCP:** output tool sebaiknya ≤10 ribu token (Claude Code memberi peringatan di atasnya).

## 9. Glosarium

| Istilah | Arti di kode |
|---|---|
| `work` | Karya (kitab), misalnya Ihya |
| `edition` | Edisi cetak atau sumber digital tertentu dari sebuah karya |
| `juz` / `page_no` | Jilid dan halaman cetak (unit sitasi) |
| `toc_node` | Simpul daftar isi (rub', kitab, bab, bayan) |
| `passage` | Paragraf badan teks (`body`) atau catatan kaki (`foot`) |
| `takhrij` | Catatan kaki status hadits (al-'Iraqi untuk Ihya) |
| `text_raw` / `norm` / `stem` | Teks persis sumber / bentuk cocok ternormalisasi / bentuk tanpa proklitik |
| `corpus version` | Versi build korpus. Setiap rilis data membuat DB baru (blue-green) |
