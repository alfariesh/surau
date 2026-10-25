# @surau/ingest

Pipeline lokal yang mengubah kitab Shamela menjadi data korpus Surau yang tervalidasi (S07, ADR-018, ADR-032). Node 24 dengan type stripping (tanpa build); teks Arab diolah hanya lewat `@surau/text`, ID dan skema baris lewat `@surau/db`. Drive Shamela dibaca **hanya-baca** (`src/sqlite.ts` menolak menulis di bawah `/Volumes/`).

## Perintah (dari root repo)

| Perintah | Isi |
|---|---|
| `pnpm ingest ihya` | Bangun korpus Ihya (±10 detik, termasuk indeks pencarian S11, ayat S12, terjemahan/ringkasan AI S13, dan indeks Indonesia S14): `data/build/sql/*.sql`, `data/build/surau-corpus-ihya-v7.sqlite`, `data/build/ihya-v7.sha256` (build versi lain di `data/build` dihapus; `data/build/llm/` TIDAK disentuh), peta ID `data/ids/ihya-9472.json`, sidik teks paragraf `data/ids/ihya-9472.teks.json` (ADR-059), dan laporan `data/reports/ihya-9472-{validasi,openiti,ayat}.md`. **Gagal** (tanpa keluaran) bila invarian dilanggar, termasuk bila hasil batch LLM di `data/build/llm/` hilang atau cakupannya < 99%. Opsi `--quran <dir>` (bawaan `data/raw`) |
| `pnpm llm <perintah>` | Batch terjemahan dan ringkasan AI (S13). Lihat [Terjemahan dan ringkasan AI](#terjemahan-dan-ringkasan-ai-s13) |
| `pnpm ingest:verify` | Hanya gerbang QA OpenITI (matan ≥0,95 per halaman di ≥1.705 halaman; takhrij vs JK000001) → laporan `…-openiti.md` |
| `pnpm corpus:load:local` | Migrasi korpus + muat semua file SQL ke D1 lokal (`.wrangler/state`), lalu smoke query (jumlah baris termasuk indeks FTS, j1 h200, satu kueri الصبر) |
| `pnpm corpus:load:staging --confirm` | Sama, ke `surau-corpus-staging` (remote). **Minta izin pemilik dulu**; tanpa `--confirm` skrip menolak, dan ditolak juga bila staging tercatat sebagai korpus produksi. Selama impor (±1 menit) DB tidak melayani kueri |
| `pnpm run corpus:promote <versi> [--confirm]` | Korpus **produksi** blue-green (ADR-005, ADR-036): tanpa `--confirm` hanya rencana. Lihat [Korpus produksi](#korpus-produksi-blue-green) |
| `pnpm run corpus:qa <versi\|staging> [--human 10]` | QA sampel: 30 halaman acak (seed 9472) di D1 remote dibandingkan byte demi byte dengan sumber Shamela yang diparse ulang, plus `meta`, edisi, dan judul daftar isi. Untuk versi: laporan `data/reports/ihya-9472-qa-<db>.md`; untuk staging: hanya di layar. `--human` menulis daftar QA manusia (T-15) sekali |

**Peringatan:** file pertama (`0000-reset.sql`) mengosongkan **seluruh** DB korpus, termasuk indeks `passage_fts` (`delete-all`: indeks contentless tidak menghapus token lama bila rowid yang sama dimasukkan ulang). Untuk sekarang satu DB berisi satu kitab; begitu ada kitab kedua, reset harus dibuat per edisi dulu (indeks lewat `DELETE … WHERE rowid BETWEEN`).

**Indeks pencarian (S11, ADR-039):** setelah tabel biasa, file `passage-fts-*.sql` mengisi `passage_fts` (rowid = `passage.id`, kolom `sbody`/`sfoot` = stem dari `normalizeArabic(text_raw)`, `body`/`foot` kosong), lalu `passage-fts-optimize.sql` menggabungkan segmen indeks. `meta` tetap file terakhir. `term_stat` = stem di >10% paragraf, dihitung dari `fts5vocab` di DB sementara dengan migrasi yang sama (`src/search-index.ts`). Ihya: 20.509 baris indeks, 39 stem umum, ±5,4 MB; impor staging ±65 detik untuk seluruh korpus.

**Ayat Al-Qur'an (S12, ADR-040):** `src/quran/` membaca Tanzil 1.1 (XML `uthmani` + `simple-clean`, `data/raw/tanzil/`) dan data Kemenag milik pemilik (terjemahan + catatan kaki, transliterasi, metadata surah, juz; `data/raw/kemenag/`), semuanya dipin sha256. Pencocok deterministik (`src/quran/matcher.ts`) mengenali kutipan `{…}` dan kutipan tanpa kurung sesudah frasa pengantar (قال تعالى …), lalu menulis `passage_ayah_ref`. Gerbang: ≥95% kutipan `{…}` tervalidasi cocok persis (Ihya 97,3%). Laporan `data/reports/ihya-9472-ayat.md` berisi angka, daftar "mirip" dan "tidak cocok", dan 20 sampel acak untuk diperiksa pemilik (T-16).

Syarat: drive Shamela terpasang (T-09; bisa ditimpa `--shamela <dir>` atau `SURAU_SHAMELA_ROOT`), dua file OpenITI yang dipin ada di `data/raw/openiti/`, dan sumber Al-Qur'an di `data/raw/tanzil/` + `data/raw/kemenag/` (cara unduh/salin dan sha256: `data/SOURCES.md`). Opsi `--reset-ids` membangun peta ID dari nol, **hanya** sebelum rilis (ADR-029); ditolak bila sidik teks sudah ada. Setelah rilis, setiap ID paragraf lama wajib ada dengan teks yang sama (ADR-059): paragraf yang bergeser atau hilang menggagalkan ingest. Daftar lengkapnya ada di laporan validasi. Koreksi teks yang disengaja diterima per ID lewat `--terima-teks-berubah <id,…>` (ID hilang tetap ditolak).

## Terjemahan dan ringkasan AI (S13)

`src/llm/` menyusun request Message Batches dari baris korpus yang dibangun ulang dari sumber (butuh drive Shamela, T-09) dan kunci `surau-dev` di `.env` (T-11; dibaca hanya oleh perintah yang memanggil API, tidak pernah dicetak). Prompt dan validasi ada di `@surau/llm` (`packages/llm`).

| Perintah | Isi | Biaya |
|---|---|---|
| `pnpm llm tokens` | Ukur token Arab Claude Haiku 5.5 pada 200 paragraf acak → `data/reports/ihya-9472-token.md` | gratis (`count_tokens`) |
| `pnpm llm sample --confirm` | Uji kecil 20 paragraf + 5 bagian lewat API biasa → `data/build/llm/sample/` (halaman nilai T-17 tahap 1). Tanpa `--confirm` hanya ringkasan | ±$0,03 |
| `pnpm llm plan --round 1\|2` | Susun request yang masih tertunda, `count_tokens` semuanya (tolak bila ≥100k), estimasi biaya per skenario cache → `plan-r<n>.jsonl` | gratis |
| `pnpm llm submit --round 1\|2 [--kind …] [--limit N] --budget USD --confirm` | Kirim batch (≤4.000 request per batch) yang sumbernya masih sama dengan korpus saat ini, belum lolos, dan tidak sedang diproses. **Berbayar: hanya setelah pemilik menyetujui biaya di chat**; `--budget` wajib bersama `--confirm` dan menolak bila biaya terpakai + perkiraan batch yang belum di-`collect` + perkiraan kiriman ini (cache 50%) melebihi angka yang disetujui. Tanpa `--confirm` hanya ringkasan | berbayar |
| `pnpm llm status` · `pnpm llm wait` | Status batch; `wait` menunggu (poll tiap menit) sampai semua batch terbuka selesai | gratis |
| `pnpm llm reconcile [--id BATCH]` | Bila pengiriman batch terputus (timeout, proses mati), catatan `submitting.json` tertinggal dan `submit`/`retry` menolak kirim. Perintah ini mencocokkannya dengan daftar batch di server (ADR-061): batch yang cocok dicatat; bila tidak ada, catatan dilepas (aman kirim ulang) hanya setelah proses pengirim mati dan ≥15 menit; bila lebih dari satu, periksa Console lalu pilih dengan `--id` | gratis |
| `pnpm llm collect` | Unduh hasil mentah batch yang selesai (biaya aktual dari `usage`), lalu bangun ulang hasil lolos/gagal dari semua hasil mentah | gratis |
| `pnpm llm rejudge` | Bangun ulang hasil lolos/gagal dari hasil mentah dengan aturan validasi dan sumber saat ini (setelah validasi atau pencocok ayat berubah) | gratis |
| `pnpm llm retry --budget USD --confirm` | Kirim ulang yang gagal (refusal → Sonnet 5.5), maks. 3 percobaan per `custom_id` | berbayar (kecil) |
| `pnpm llm report` | `data/reports/ihya-9472-terjemahan.md` (cakupan, gagal, biaya aktual vs estimasi, 20 sampel QA T-17 tahap 2) + halaman nilai lokal `data/build/llm/qa/review-batch.html` | gratis |

Urutan: `plan --round 1` → `submit --round 1 --confirm` → `wait` → `collect` → `retry --confirm` (ulangi sampai tidak ada yang tersisa) → `plan --round 2` → `submit --round 2 --confirm` → `wait` → `collect` → `report` → `pnpm ingest ihya`.

- **Satuan kerja:** satu request per paragraf badan (`passage-<id>`, dengan paragraf sebelumnya di bagian yang sama sebagai konteks) dan ringkasan dua putaran per simpul daftar isi: putaran 1 meringkas teks Arab simpul atau potongannya (≤50 ribu token perkiraan, dipotong di batas halaman), putaran 2 meringkas simpul induk dan daun yang terpecah dari ringkasan putaran 1 di subpohonnya.
- **Ayat:** kutipan ayat diganti `⟦QS s:a⟧` (`maskAyat`) sebelum dikirim; paragraf yang rujukan ayatnya tidak bisa ditandai tidak dikirim sama sekali. `translation.text` menyimpan placeholder, UI merendernya dengan terjemahan Kemenag.
- **Koreksi tinjauan (X02, ADR-047):** `data/reviews/ihya-9472-terjemahan.json` (di git, tanpa teks kitab) mencatat paragraf yang dinilai Salah/Kurang dan versi prompt yang ditolak. `collect`/`rejudge` menolak hasil versi itu (`review_rejected`), dan ingest tidak memuatnya. `retry --budget … --confirm` mengirim ulang ke Sonnet 5.5 dengan prompt saat ini. Untuk mengoreksi paragraf lain: tambah entri, `rejudge`, `retry`, `collect`, `report`, `pnpm ingest ihya`, lalu promote versi korpus baru.
- **Hasil usang:** setiap request menyimpan sha256 sumbernya (teks bertanda). Bila teks atau rujukan ayat berubah (mis. pencocok ayat diperbaiki), `rejudge` menandai hasil lama "stale", ingest tidak memuatnya, dan `plan` + `submit` mengirimnya lagi. Kegagalan untuk sumber lama tidak dihitung sebagai percobaan.
- **Validasi** (`@surau/llm`): placeholder ayat sama persis; tanpa huruf Arab sama sekali; tanpa penanda catatan kaki karangan (penanda yang hilang hanya dicatat); tanpa transliterasi berdiakritik dekat placeholder (tanda model menulis ulang ayat); rasio panjang 0,8–4 (tanpa harakat); kata "terjemah…" hanya bila sumbernya membahas ترجمة; tanpa kurung kurawal; tanpa Markdown, kalimat pembuka, atau komentar model. Ringkasan: bahasa benar, tanpa placeholder/rujukan QS/huruf Arab.
- **Penyimpanan:** `data/build/llm/` (git-ignored) berisi request terkirim, hasil mentah per batch, hasil yang lolos (`translation.jsonl`, `summary.jsonl`, `summary-r1.jsonl`), kegagalan, dan `batches.json`. **Jangan dihapus**: hasil batch berbayar dan tidak deterministik; cadangkan bersama drive data.

## Intisari (X15b, ADR-097, ADR-098)

`src/llm/digest-*.ts` menyusun Intisari (ringkasan belajar berlapis) per bagian daftar isi. Model hanya **menunjuk**: blok teks `b1…bn` (tahap leaf), atau ID gagasan `n<seq>.g<k>` dan kutipan `n<seq>.q<k>` Intisari anak (tahap merge/book). Rentang `text_raw`, sidik `raw_sha256`, jangkar, dan teks Arab dihitung kode (teks-arab.md aturan 1, 11). Prompt dan validator di `@surau/llm` (`digest.ts`, `glossary.ts`, `prompts/digest-*.ts`, `prompts/glossary-v2.ts`). Semua di `data/build/llm/intisari/` (git-ignored, **jangan dihapus**).

| Perintah | Isi | Biaya |
|---|---|---|
| `pnpm llm intisari plan --stage leaf\|merge\|book [--banding]` | Susun request yang masih tertunda + `count_tokens` (tolak bila ≥100k) → `plan-<tahap>.jsonl`. `--banding`: Intisari Kitab juga dibuat Haiku 5.5 sebagai pembanding (pilot) | gratis |
| `pnpm llm intisari submit --stage … --budget USD --confirm` | Kirim batch (tanda terima ADR-061, pagu bersama folder ini). **Berbayar: hanya setelah pemilik menyetujui biaya di chat** | berbayar |
| `pnpm llm intisari status` · `wait` · `reconcile [--id BATCH]` | Status / tunggu / pulihkan kiriman yang terputus | gratis |
| `pnpm llm intisari collect` · `rejudge` | Unduh hasil (biaya aktual) lalu nilai ulang semua hasil mentah dengan rencana + validator saat ini. Hanya node dalam cakupan `--kitab` yang dinilai; hasil kitab lain dibawa apa adanya | gratis |
| `pnpm llm intisari retry --budget USD --confirm` | Ulangi yang gagal: Haiku lalu Sonnet 5.5 (refusal/percobaan terakhir); Intisari Kitab selalu Sonnet | berbayar (kecil) |
| `pnpm llm intisari report` | `data/reports/ihya-9472-intisari.md` (angka, tanpa teks kitab) + halaman QA pemilik `data/build/llm/intisari/qa/intisari-<node>.html` (T-31, tidak di-commit) | gratis |
| `pnpm llm intisari muat-staging --from staging --kitab <id> [--confirm]` | Muat Intisari pilot ke `surau-corpus-staging`: migrasi korpus (0008 + 0009 bila belum), lalu baris Intisari node itu saja (idempoten: anak dihapus lalu disisipkan ulang; `digest` dan `glossary_term` di-UPSERT supaya baris `audio_track` X17 tidak ikut terhapus), lalu smoke `readDigest`. **Minta izin pemilik dulu**; ditolak bila staging tercatat sebagai korpus produksi. Bukan ingest penuh (X15c) | gratis |
| `pnpm llm glosarium [--budget USD] [--confirm]` | Definisi singkat 144 istilah glosarium berkunci (`glossary_term`), Sonnet 5.5 lewat API biasa; tanpa `--confirm` hanya rencana + hitung token | ±$0,13 |

**Sumber korpus.** Bawaan: build lokal dari drive Shamela (T-28). `--from staging --kitab <toc_node_id>`: baca `surau-corpus-staging` lewat binding D1 remote (`wrangler.staging.jsonc`, pola `tools/eval/src/open-corpus.ts`) yang dibungkus `selectOnly` (hanya SELECT), satu subpohon. Dari worktree, kunci API diberikan lewat `node --env-file=<checkout utama>/.env tools/ingest/src/llm/cli.ts intisari …`.

Urutan pilot: `plan --stage leaf` → `submit --stage leaf` → `wait` → `collect` → (`retry`) → `plan --stage merge` → `submit` → `wait` → `collect` (ulangi merge bila ada bab bertingkat) → `plan --stage book --banding` → `submit --banding` → `wait` → `collect` → `glosarium` → `report` → `muat-staging`.

- **Blok:** `segmentText` sasaran 220 karakter (paragraf ≤330 satu blok), tidak pernah di dalam rentang `passage_ayah_ref` atau penanda catatan kaki, dipotong di batas subjudul; ayat diganti placeholder per blok. Paragraf yang rujukan ayatnya tidak bisa ditandai tidak dikirim.
- **Tahap:** bagian pendek tanpa subbagian = satu request final (`dg-<id>-id`); bagian panjang (>24 ribu token) dipecah per halaman (`-p<k>`) lalu digabung (`-m`); bagian induk = teks pembukanya (`-p<k>`) + Intisari anaknya (`-m`); muqaddimah dan 40 kitab = Intisari Kitab (`-b`, Sonnet 5.5). Merge berjalan bergelombang (anak dulu); Intisari rub' (Intisari Bab dari kitab-kitabnya) baru bisa di-`plan --stage merge` sesudah tahap book, dan `collect`/`rejudge` menilai merge/book menurut pascaurut daftar isi (bukan menurut tahap).
- **Kutipan (`digest-section@2`):** model memberi blok `dari`/`sampai` + penunjuk Arab pendek `awal`/`akhir` (kata pertama/terakhir); kode mencarinya dengan `findQuote` di rentang blok itu lalu membuang penunjuknya. Penunjuk harus cocok tepat sekali di blok yang disebut (frasa berulang = `pointer_ambiguous`, kutipan dibuang). Jenis (`text`/`report`/`poetry`) dan larangan takhrij ditentukan kode: larangan berlaku untuk penanda di dalam kutipan dan penanda PERTAMA sesudahnya menurut urutan baca (lintas paragraf di bagian yang sama, ≤ 1.500 karakter, tanpa syarat tanda baca); label riwayat lebih ketat (penanda di dalam/tepat sesudah kutipan, atau di paragraf yang sama ≤ 600 karakter tanpa akhir kalimat dan tanpa rumus riwayat baru).
- **Versi prompt:** hasil dengan versi prompt lama dianggap basi (satu kitab tidak bercampur versi); induknya ikut basi lewat sidik sumber.
- **Pagu:** batch Intisari dan definisi glosarium memakai satu buku biaya folder ini (`--budget` = pagu total yang disetujui pemilik).
- **Basi:** sidik berjenjang (teks subpohon) dan sidik Intisari sumber (`input_sha256`); hasil basi tidak dimuat dan dijadwalkan ulang oleh `plan`.
- **Ingest:** `pnpm ingest ihya` memuat hasil yang berlaku ke `digest*` + `digest_point_fts`, dan abstrak yang lolos `checkSummary` menggantikan `summary.text` bahasa id. Invarian build (gagal bila dilanggar): kutipan cocok sidik dan tidak menyentuh ayat, sumber `passage` hanya untuk paragraf utuh, gagasan berjangkar, terjemahan kutipan `digest` membawa asal model-nya sendiri, indeks hanya gagasan yang tampil, istilah punya glosarium.

## Koreksi terjemahan manusia (X08, ADR-081/082)

Editor terdaftar mengoreksi atau menandai benar terjemahan di `/tinjau/terjemahan`; revisinya tersimpan di DB app (`translation_revision`) dan **baru tampil lewat korpus berikutnya**, sehingga pembaca, Cari (`translation_fts`), MCP, dan Maknaz berubah bersamaan.

| Perintah | Isi | Biaya |
|---|---|---|
| `pnpm review:export-terjemahan` | BACA DB app produksi `surau-app` → revisi berlaku per paragraf (aktif terakhir; pembatalan → versi yang dipulihkan; kembali ke AI = tidak ikut) → `data/build/reviews/<nama bertanggal>.jsonl` (git-ignored, berisi teks) + salinan R2 privat `surau-revisi/terjemahan/<nama>` (tidak pernah menimpa) + metadata `data/reviews/ihya-9472-revisi.json` (di git: ID, hash, jenis, nama tampil, tanggal; **tanpa teks**). `--staging` / `--lokal` = sumber uji tanpa R2 (metadatanya **jangan di-commit**; ingest hanya memuatnya dengan `SURAU_REVISI_UJI=1`, dan tes repo menolak metadata uji ter-commit); `--tanpa-r2` melewati salinan R2. Nama berkas = cap waktu + awal sha256 isi | gratis |

Urutan korpus berikutnya: `pnpm review:export-terjemahan` → commit metadata → (bila ada batch AI: `pnpm llm plan …`, paragraf berevisi otomatis dilewati) → `pnpm ingest ihya` (naikkan `corpusVersion`) → `pnpm corpus:load:local` + cek → `eval:retrieval --gate` → promote **atas izin pemilik**. Catat `revisions_sha256` (meta korpus) di `data/SOURCES.md`.

- **Ingest** memuat berkas ekspor hanya bila sha256-nya sama dengan metadata git dan isinya sama persis (berkas hilang/beda = GAGAL; unduh dengan `pnpm wrangler r2 object get surau-revisi/<r2_key> --file data/build/reviews/<export_file> --remote`). Setiap revisi divalidasi ulang terhadap teks Arab + rujukan ayat korpus yang sedang dibangun: teks Arab berubah, placeholder ayat tidak cocok lagi, atau draf AI yang dinyatakan benar sudah diganti = **usang** (tidak dimuat, dilaporkan di invarian laporan validasi; tidak pernah ditulis balik ke DB app). Perbaikan manusia tetap menang walau draf AI berubah.
- **Korpus:** `translation.text` = teks perbaikan, `review_status` = `ustadz_verified` (akun ustadz) / `reviewed` (editor lain); `model`/`prompt_version` tetap draf AI asalnya; asal tinjauan di `translation_review` (skema 8: revisi, nama terdaftar, peran, izin nama MCP, draf AI yang digantikan). `meta.revisions_sha256` + `revisions_count`. Tanpa izin nama, metadata dan korpus hanya menyimpan peran.
- **Batch AI** (`plan`/`submit`/`retry`) tidak mengirim paragraf yang revisi manusianya **masih berlaku** (teks Arab, rujukan ayat, dan draf AI lolos sama). Revisi usang tidak melindungi, supaya paragrafnya tetap mendapat draf baru (perbaikan manusia berlaku lagi di atasnya, "sudah benar" perlu ditinjau ulang). Revisi yang belum diekspor belum terlindung: ekspor dulu sebelum batch.
- **`meta.revisions_count`** = jumlah revisi di berkas ekspor (deterministik, supaya `corpus:qa` cocok); jumlah yang dimuat/usang ada di laporan validasi.

## Korpus produksi (blue-green)

Satu versi korpus = satu DB D1 `surau-corpus-<versi>` yang tidak pernah diubah setelah aktif. Binding `CORPUS_DB` top-level di `apps/web/wrangler.jsonc` **dan** `apps/mcp/wrangler.jsonc` (Worker MCP, S16; selalu sama, dijaga tes) menunjuk versi aktif; `deploy.yml` tidak pernah menyentuh korpus (dijaga tes `src/corpus.test.ts`). Riwayat versi dan target rollback: [data/SOURCES.md](../../data/SOURCES.md#korpus-d1-produksi).

**Promote versi baru** (setiap langkah remote dengan izin pemilik):

1. `pnpm ingest ihya` (build bersih), lalu `pnpm run corpus:promote <versi>`: rencana, sha256 build, dan hitungan baris. Versi baru = nama baru (`ihya-v2`). Skrip menolak memuat ulang DB yang melayani atau pernah melayani produksi: binding di working tree, di `origin/main` (setelah `git fetch`), atau tercatat di `data/SOURCES.md`. Korpus staging tidak pernah dijadikan produksi.
2. `pnpm run corpus:promote <versi> --confirm` (±1 menit untuk Ihya): `d1 create --location apac` → migrasi korpus → muat `data/build/sql/*.sql` → smoke (hitungan **setiap** tabel dan `meta` = build, j1 h200) → ganti `CORPUS_DB` produksi di `apps/web/wrangler.jsonc` dan `apps/mcp/wrangler.jsonc` (ditolak bila keduanya tidak menunjuk DB yang sama). Bila smoke gagal, binding tidak diubah.
3. `pnpm run corpus:qa <versi>`: harus 30/30. Laporannya di-commit.
4. Catat versi baru (aktif) dan versi lama (rollback) di `data/SOURCES.md`, lalu PR. Setelah CI hijau dan merge, `deploy.yml` men-deploy Worker dengan binding baru. Cache ISR ikut kosong karena build baru (ADR-034).
5. DB lama **tidak dihapus**.

**Rollback** (korpus baru bermasalah): `pnpm run corpus:promote <versi-lama> --switch-only` (hanya baca remote: smoke DB lama, lalu ganti binding CORPUS_DB web + MCP **dan** `SEARCH_CACHE_CORPUS`, kunci cache pencarian web), commit, PR, merge. Sejak S14 (ADR-044) korpus berskema **lebih lama** dari kode boleh jadi target: kode memeriksa `meta.schema_version` dan menyembunyikan fitur yang tabelnya belum ada, dan perintah mencetak fitur yang hilang sebagai peringatan (mis. `ihya-v1`, skema 3: pencarian Arab dan Indonesia 503, tanpa rujukan ayat dan terjemahan; pembaca tetap jalan). Skema yang lebih baru dari kode ditolak. Versi yang baru dibangun (`--confirm`) tetap wajib berskema terbaru.

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
| Al-Qur'an: sumber Tanzil/Kemenag, pencocok ayat (`{…}`, frasa pengantar, dan kutipan tanpa tanda ≥5 kata persis, S13), baris `quran_*` + `passage_ayah_ref`, laporan ayat | `src/quran/source.ts`, `src/quran/matcher.ts`, `src/quran/rows.ts`, `src/quran/report.ts` |
| Terjemahan/ringkasan AI: unit kerja, batch, validasi, laporan, pemuatan ke `translation`/`summary` | `src/llm/*.ts` (S13) |
| SQL D1 (≤90 KB/statement, tanpa BEGIN/COMMIT), `.sqlite` dari migrasi yang sama | `src/sql.ts`, `src/build-sqlite.ts` |
| Orkestrasi, CLI, muat ke D1 | `src/pipeline.ts`, `src/cli.ts`, `src/load.ts` |
| D1 remote: pembungkus wrangler, smoke, build, binding produksi, promote, QA sampel | `src/d1.ts`, `src/corpus.ts`, `src/promote.ts` (keputusan murni yang teruji: `src/promote-plan.ts`), `src/qa-sample.ts`, `src/qa.ts` |
| Konfigurasi per kitab (ID, slug, harapan validasi, pin OpenITI) | `src/works/ihya.ts` |

Build deterministik: dua build pada commit yang sama menghasilkan sha256 yang sama (`built_at` = `SOURCE_DATE_EPOCH` atau tanggal commit HEAD).

## Tes

- `pnpm test`: unit per modul + uji ujung-ke-ujung dengan kitab **buatan** (`test/fixture.ts`: struktur meniru Shamela/OpenITI, isi kalimat karangan) dan mushaf **buatan** (`test/quran-fixture.ts`: format berkas Tanzil/Kemenag, bukan teks Al-Qur'an).
- `test/ihya-ingest.test.ts` dan `test/ihya-text.test.ts` memakai Ihya asli; dilewati otomatis bila drive/unduhan tidak ada (CI). Tes ayat memastikan setiap kutipan `exact` benar-benar ada di teks ayat rujukannya. Keluarannya di folder sementara, teks kitab tidak disalin ke git.

## Menambah kitab

Ubah reset menjadi per edisi dulu (lihat peringatan di atas). Lalu buat `src/works/<kitab>.ts` (salin pola `ihya.ts`), patch `data/patches/<kitab>-<id>.yaml` bila daftar isinya cacat, pin versi OpenITI-nya di `data/SOURCES.md`, lalu tambahkan perintahnya di `src/cli.ts`. Kitab tanpa versi OpenITI butuh kebijakan lisensi per kitab dulu (ADR-018).
