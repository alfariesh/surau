# Log Keputusan (ADR)

Setiap keputusan teknis yang tidak bisa ditebak dari kode dicatat di sini, lengkap dengan alasan dan alternatif yang ditolak. Keputusan **tidak dihapus**. Bila berubah, tulis ADR baru dan tandai yang lama "diganti oleh ADR-xxx".

Status: **diterima** (berlaku) · **sementara** (berlaku, tapi menunggu data/izin tertentu) · **diusulkan** (menunggu pemilik) · **diganti**.

Format ADR baru:

```
## ADR-NNN · Judul — status · YYYY-MM-DD
**Konteks:** … **Keputusan:** … **Ditolak:** … **Konsekuensi:** … **Tinjau ulang bila:** …
```

Semua fakta versi di bawah dicek ke docs/registry resmi pada 15 Okt 2026 (riset paralel 9 area). Rangkumannya ada di [STACK.md](STACK.md).

---

## Keputusan yang menunggu pemilik

**Wajib dijawab pemilik:** P-2 (P-5 dijawab 2026-10-18: Anas; P-6 dijawab 2026-10-16). **Bila tidak dijawab, usulan CTO dipakai:** P-1, P-3, P-4, dan P-7. Pemilik tetap boleh mengubahnya kapan saja.

| ID | Pertanyaan (bahasa awam) | Usulan CTO | Dibutuhkan saat |
|---|---|---|---|
| P-1 | Kode di GitHub **terbuka untuk umum atau privat**? Lisensi HeroUI Pro (Terms §9) melarang mempublikasikan komponen dan template Pro, sedangkan `web/` adalah turunan template chat Pro. | **Privat.** Minta izin tertulis ke support@heroui.pro. Repo ini menyimpan template Pro di riwayat git, jadi repo ini **tidak boleh sekadar diubah menjadi publik**. Bila kelak ingin publik tanpa izin HeroUI, buat repo publik baru dari kode yang sudah ditulis ulang, tanpa riwayat lama. Lihat ADR-004. | S02 |
| P-2 | Nama domain Surau | Pemilik memilih; daftar lewat Cloudflare Registrar | S03 |
| P-3 | Font Arab utama | **Dijawab 2026-10-15:** Noto Naskh Arabic, palet Zaitun (Opsi A, ADR-027). | S04 |
| P-4 | Plafon biaya AI per bulan, dan jatah tanya gratis per pengunjung per hari | $20/bulan untuk Tanya online, 10 pertanyaan/hari per pengunjung. Batch dan eval memakai workspace terpisah (`surau-dev`, ±$40/bulan). | S13, Fase 4 |
| P-5 | Siapa ustadz pertama untuk eval dan review | **Anas** ditunjuk pemilik 2026-10-18 (T-13); persetujuan/penilaian nyata T-24 | Rilis Fase 4 (dianjurkan sudah ada sejak Fase 2) |
| P-6 | Sumber teks publik dan lisensi konten | **Dijawab 2026-10-16 (S10):** ADR-018 + ADR-021 disetujui; email pemberitahuan ke Shamela sudah dikirim pemilik (jawaban ditunggu). Kontak koreksi/takedown: formulir laporan + GitHub Issues. | Rilis Fase 1 |
| P-7 | Bolehkah Surau menyimpan pertanyaan dan jawaban pengguna (tanpa alamat IP atau data pribadi) untuk memperbaiki mutu, dan berapa lama? | Pertanyaan + jawaban (`answer_log`) 12 bulan; laporan kesalahan (`feedback`) sampai ditangani + 12 bulan; penghitung kuota harian 7 hari; catatan biaya (`llm_ledger`) 24 bulan. Semua diumumkan di kebijakan privasi. **`feedback` dijawab 2026-10-16 (S10): sampai ditangani + 12 bulan, diumumkan di `/lisensi#privasi`.** | Retensi `feedback`: rilis Fase 1. Sisanya: S18, S20 |


---

## ADR-001 · Cara kerja: folder `implementasi/` + sesi + skill `/sesi` — diterima · 2026-10-15

**Konteks:** Aplikasi dibangun penuh oleh agent dan pemilik bukan developer. **Keputusan:** Rencana dipecah menjadi fase yang bisa dirilis sendiri dan sesi yang muat dalam satu percakapan. Status disimpan di Markdown (`STATUS.md`, `LOG.md`, `sesi/*.md`) dengan aturan "centang hanya dengan bukti". Skill `/sesi`, `/posisi` (bukan `/status`, yang bentrok dengan perintah bawaan), `/rilis`, dan `/docs-terbaru`, subagen `peninjau`, aturan path-scoped `teks-arab`, dan hook SessionStart menyuntikkan status. **Ditolak:** daftar fitur JSON ala Anthropic (lebih tahan ditimpa model, tapi tidak bisa dibaca pemilik); plugin (belum perlu untuk satu repo). **Tinjau ulang bila:** agent sering salah menandai selesai. Dalam kasus itu, tambahkan file JSON yang dicek hook Stop.

## ADR-002 · Hosting: Cloudflare Workers, bukan Vercel — diterima · 2026-10-15

**Konteks:** Pemilik sudah membayar Workers Paid ($5/bln). Rancangan lama memakai Vercel + Supabase. **Keputusan:** Semua komponen berjalan di Cloudflare: Workers (web, MCP, API), D1, R2, Turnstile, AI Gateway, dan Rate Limiting. Satu tagihan, satu dashboard, dan satu CLI (`wrangler`). **Ditolak:** Vercel. Vercel menambah vendor dan Hobby non-komersial, dan biaya Cloudflare sudah dibayar. **Konsekuensi:** Next.js berjalan lewat adapter (ADR-003). Batas Worker: 64 MiB tanpa kompresi, startup 1 detik, memori 128 MB.

## ADR-003 · Frontend: Next.js 16 App Router + OpenNext di Workers — sementara · 2026-10-15

> **Pembaruan 2026-10-16 (X01, ADR-030):** gerbang versi terpenuhi: OpenNext 1.20.12 mendukung 16.4 resmi, dan `pnpm --filter @surau/web preview` (workerd) lolos smoke test (5 rute, e2e 26/26). Surau kini memakai **Next 16.4.1 + React 19.3.1 + OpenNext 1.20.12**. Aturan konservatif di bawah tetap berlaku; `cacheComponents` tetap `false` karena PR OpenNext #1318 belum dirilis.

**Keputusan:** Pertahankan Next.js (template HeroUI Pro berbasis Next, dan tooling agent Next paling matang: docs dibundel di `apps/web/node_modules/next/dist/docs`, AGENTS.md, dan MCP devtools). Deploy memakai `@opennextjs/cloudflare`. Aturan konservatif:
- `cacheComponents: false` sampai bug OpenNext (PR #1318) dirilis.
- Tanpa `proxy.ts`/`middleware.ts`, tanpa `runtime = 'edge'`, dan tanpa Server Actions (mutasi lewat route handler atau Worker API).
- `images: { unoptimized: true }`.
- Kutipan Arab tidak pernah dirender lewat Markdown.

**Gerbang rilis F3 (dicek 2026-10-17, `docs-terbaru`):** Next 16.4.1 didukung resmi [OpenNext 1.20.12](https://github.com/opennextjs/opennextjs-cloudflare/releases/tag/@opennextjs%2Fcloudflare@1.20.12). Advisory Next 673q/2464/p3m5 ditambal di 16.4.1; placeholder versi pada advisory lain dicocokkan dengan GitHub curated API (tambalan 16.3.8). Tidak ditemukan advisory langsung yang mengenai OpenNext 1.20.12 atau Wrangler 4.151.0. Next 16.4.2 dan Wrangler 4.151.1 tersedia sebagai patch opsional; versi rilis ini tidak diubah.

Mitigasi keamanan yang wajib dipertahankan dan sudah diverifikasi untuk build rilis ini:
- `cacheComponents: false`, `images.unoptimized: true`, tanpa `'use server'`/`'use cache'`, proxy/middleware atau edge runtime. `apps/web/.next/required-server-files.json` mengonfirmasi kedua flag; `server-reference-manifest.json` memiliki `node` dan `edge` kosong. Grep sumber tidak menemukan fitur terlarang tersebut.
- **React RSC xqc2/h3gv:** React publik 19.3.1 sudah ditambal. Salinan compiled Next masih berlabel canary, meski marker patch upstream ditemukan (`RESPONSE_SYMBOL`, `getBackingBlob`, stream namespace `S`, pengaman detached buffer). Kesetaraan seluruh patch belum dibuktikan; tetap **tanpa Server Actions dan tanpa typed array pada props Server Component** (ADR-023/030). Typed array di sumber hanya ada pada helper route server untuk HMAC, bukan props Server Component.
- **[GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2), glob 10.3.3** (OpenNext → AWS → `@node-minify/core` 9.0.2): pemicunya CLI `glob -c`/`--cmd` dengan shell; API library tidak terkena. Paket terpasang mengimpor `globSync` di `dist/index.mjs:82` dan hanya memanggil API pada baris 176/189. Scripts proyek dan workflow tidak memanggil CLI rentan. Jangan menambahkan pemanggilan CLI tersebut sebelum dependency ditambal.
- **[GHSA-62ch-8vmq-8xm7](https://github.com/advisories/GHSA-62ch-8vmq-8xm7), figlet 1.11.0** (CLI HeroUI Pro): pemicunya `whitespaceBreak: true` dengan `width` lebih kecil daripada satu glyph. CLI terpasang hanya memakai `textSync("HeroUI Pro")` tanpa opsi/input pengguna (`heroui-pro` 1.0.0-beta.14, `dist/cli/commands/menu.js:2`); grep CLI tidak menemukan opsi rentan. Default `whitespaceBreak` mati, sesuai workaround vendor. Jangan mengaktifkan opsi itu sebelum dependency ditambal.

`pnpm audit --json` masih melaporkan dua advisory high transitif di atas; keduanya dicatat sebagai termitigasi pada jalur penggunaan ini, bukan diklaim hilang dari lockfile. Build web/MCP dan seluruh tes lolos. Tinjau kembali mitigasi saat dependency, scripts, konfigurasi, atau props Server Component berubah.

**Gerbang versi:** pakai Next 16.4.x terbaru **hanya bila** rilis OpenNext sudah resmi mendukungnya **dan** `pnpm preview` (workerd) lolos smoke test. Upgrade-nya dikerjakan di sesi sisipan [X01](sesi/X01-upgrade-next-16-4.md). Per 15 Okt 2026, OpenNext 1.20.11 rusak di 16.4; patch-nya sudah di-merge dan rilisnya diperkirakan sekitar akhir Okt. Sampai saat itu, pakai **16.3.8** (versi minimum OpenNext, terbukti jalan di workerd) dengan React 19.2.x dan mitigasi di atas. Ketiga advisory 14 Okt tidak berlaku karena fiturnya dimatikan; untuk DoS Server Actions, vendor sendiri menyatakan aplikasi tanpa Server Actions tidak rentan. Catatan: pnpm ≥11 menolak paket berumur <24 jam (`minimumReleaseAge`); jangan set ke 0. **Ditolak:** vinext (direkomendasikan Cloudflare, tapi masih beta dan punya 2 advisory baru) sebagai **cadangan**, dievaluasi ulang di Fase 3 atau bila OpenNext tertinggal lebih dari satu minor; React Router v8, TanStack Start, dan Astro (butuh port template, dan agent kurang fasih). **Tinjau ulang bila:** OpenNext macet lebih dari satu rilis minor Next.

## ADR-004 · UI: HeroUI v3 OSS + HeroUI Pro (versi dipin persis) — sementara · 2026-10-15

**Keputusan:** `@heroui/react` dan `@heroui/styles` 3.2.6, serta `@heroui-pro/react` **1.0.0-beta.10 dipin persis**. Jangan memakai `latest` atau `^`, karena ada versi salah terbit `1.0.0-beta.19` yang secara semver lebih tinggi. Ikon memakai `@gravity-ui/icons` saja. Dark mode memakai `next-themes`. UI berbahasa Indonesia dan LTR. Teks Arab memakai blok `lang="ar" dir="rtl"`. Agent memakai MCP HeroUI Pro (`https://mcp.heroui.pro/mcp`) dan skill global `heroui-react-pro` dan `heroui-pro-design-taste` (berlisensi, jangan di-commit). **Risiko lisensi:** Terms Pro §9 melarang redistribusi komponen dan template Pro. Karena itu repo **privat** sampai ada izin tertulis (P-1). Bila izin ditolak, ada dua jalan: (a) `apps/web` di repo privat sementara inti, MCP, dan data publik; atau (b) beralih ke OSS-only. **Konsekuensi:** kontributor tanpa lisensi Pro tidak bisa mem-build `apps/web`. CI butuh secret `HEROUI_AUTH_TOKEN`, dan `node_modules` harus di-cache (kuota unduhan 1.000/hari).

## ADR-005 · Database: Cloudflare D1 (SQLite) + FTS5, bukan Supabase/Postgres — diterima · 2026-10-15

**Konteks:** Korpus bersifat hanya-baca dan berukuran sedang. Ihya = 11 MB data, ditambah indeks FTS ±6,9 MB dengan skema terpilih (paragraf, norm+stem, contentless; [riset FTS](../docs/riset/2026-10-15-pencarian-arab/README.md)). Perkiraan 92 kitab: indeks 0,37–0,68 GB + teks mentah 0,5–0,95 GB, jauh di bawah batas 10 GB per DB. **Keputusan:** Pakai dua jenis DB:
- `surau-corpus-<versi>`: hanya-baca, dibangun ulang oleh pipeline, dan diganti secara *blue-green* (DB baru → ganti binding → deploy; DB lama disimpan untuk rollback).
- `surau-app`: umpan balik, pengaturan, kuota, ledger biaya, dan cache jawaban. DB ini tanpa tabel virtual supaya export dan Time Travel tetap mudah.

Keduanya dibuat dengan `--location apac`. FTS5 memakai teks yang **dinormalisasi di kode** (unicode61 menganggap harakat sebagai pemisah, dan `remove_diacritics` tidak menghapus harakat Arab, sudah diuji). Filter per kitab memakai rentang `rowid`, bukan kolom UNINDEXED (3,6 ms vs 291 ms). **Ditolak:** Supabase (Free dijeda bila tidak aktif, Pro $25/bln, vendor kedua); Postgres lewat Hyperdrive (cadangan bila batas 10 GB atau throughput single-thread terlampaui); Durable Objects SQLite (tanpa tooling migrasi). **Konsekuensi:** `wrangler d1 export` tidak bisa untuk DB ber-FTS5, jadi dump data terbuka dibangun oleh pipeline. Impor SQL dibatasi <100 KB per statement dan <30 detik per query, sehingga FTS diisi per kitab. Kata yang sangat umum mahal pada skala besar: الله butuh ±245 ms pada simulasi 60× Ihya (indeks paragraf). Hasil populer perlu di-cache, dan read replication (beta) disiapkan bila perlu.

## ADR-006 · Embedding/vektor ditunda sampai eval membuktikan perlu — diterima · 2026-10-15

**Keputusan:** Fase Cari memakai BM25 (FTS5) pada teks Arab ternormalisasi ditambah terjemahan dan ringkasan Indonesia. Vectorize + Workers AI (`@cf/qwen/qwen3-embedding-0.6b` vs `@cf/baai/bge-m3`, keduanya ±$0,012/juta token, 1024 dimensi) baru diaktifkan bila recall@10 pada set eval kurang. Penggabungannya hybrid RRF di kode, dan vektor juga disimpan di R2 supaya portabel. **Ditolak:** reranker Workers AI `bge-reranker-base` (hanya Cina/Inggris); Cloudflare AI Search (chunking dan sitasi tidak terkontrol).

## ADR-007 · Satu bahasa: TypeScript di semua tempat; Go dan Python tidak dipakai di awal — diterima · 2026-10-15

**Konteks:** Pemilik membuka opsi Golang. **Keputusan:** TypeScript dipakai untuk web, Worker, dan pipeline ingest. Ingest berjalan di Node 24 dengan `node:sqlite` bawaan: Ihya terbaca dalam 241 ms dan FTS5 tersedia, sehingga tidak perlu dependency native. Hasilnya satu modul normalisasi Arab dipakai bersama oleh pipeline dan Worker, tanpa duplikasi Python/TS. **Ditolak:** Go (Workers tidak menjalankan Go secara native, hanya lewat Containers/WASM, dan menambah bahasa kedua bagi agent tanpa manfaat); Python untuk ingest (dua implementasi normalisasi harus dijaga identik). **Pengecualian:** kalkulator biaya `scripts/hitung_biaya.py` (warisan dokumen perencanaan) tetap Python dan boleh diport ke TS kapan saja. **Tinjau ulang bila:** Fase Wiki butuh LangExtract (Python). Bila itu terjadi, isolasi di `tools/wiki-extract` dengan `uv`. Default yang diusulkan: ekstraksi TS-native (Claude structured outputs + grounding offset dihitung kode), diputuskan final lewat ADR baru saat Fase 6 dirinci.

## ADR-008 · Monorepo pnpm 12 + Vite+ sebagai toolchain tunggal, TypeScript 7, Node 24 — sementara · 2026-10-15

**Keputusan:**
- pnpm 12.11.2: workspaces, `catalog` dengan `catalogMode: strict`, dan `allowBuilds`. Field `pnpm` di package.json dan `onlyBuiltDependencies` sudah tidak berlaku sejak v11.
- Vite+ 1.2.0 (`vp check` = Oxfmt + Oxlint + type-check, `vp test` = Vitest 5, `vp run` = task runner dengan cache). Lisensi MIT, stabil sejak 28 Sep 2026, dan sudah terpasang di mesin pemilik.
- TypeScript 7.0.2: Next ≥16.3 memakai `tsc` CLI lokal untuk type-check. Kombinasi Next 16.3.8 + TS7 diverifikasi di spike S01; bila gagal, pakai TS 6. ESLint dibuang karena typescript-eslint mensyaratkan TS <6.1.
- Node 24 LTS: dipin di `.node-version`, pnpm dipin di `packageManager`.

**Ditolak:** ESLint + Prettier (bentrok dengan TS7, lambat, banyak config); Turborepo (`vp run` sudah cukup); Biome sebagai **cadangan** bila Vite+ bermasalah serius. **Konsekuensi:** di `apps/web` jangan memakai `vp dev`/`vp build`, karena itu build Vite, bukan Next. Pakai `vp run build` atau script pnpm. S01 adalah *spike* untuk memverifikasi semua ini. Bila gagal, catat ADR baru dan pakai cadangan. **Hasil spike:** lolos, lihat ADR-023.

## ADR-009 · Tanpa ORM di Fase 0–4: migrasi SQL `wrangler d1 migrations` + repository bertipe (Zod) — diterima · 2026-10-15

**Konteks:** Drizzle 1.0 masih RC (rc.4, 27 Jun 2026) dan tidak ada RC baru selama ±3,5 bulan. Sementara itu, jalur 0.45.x terus di-patch, padahal docs resminya sudah ditulis untuk v1. Akibatnya agent rawan mencampur API v0 dan v1. Query terpenting Surau (FTS5) memang SQL mentah, dan tabel aplikasinya kecil. **Keputusan:**
- Migrasi ditulis sebagai file SQL di `packages/db/migrations/NNNN_nama.sql` dan diterapkan dengan `wrangler d1 migrations apply <db> --local|--remote`.
- Akses data lewat fungsi repository bertipe di `packages/db`: `prepare().bind()`, hasil di-parse dengan Zod, batch maksimal 100 parameter, statement <100 KB.
- Tipe baris didefinisikan sekali (skema Zod) dan dipakai ulang di `packages/core`.
- Migrasi dipisah per DB: `packages/db/migrations/corpus/` dan `packages/db/migrations/app/`, masing-masing dengan `migrations_dir` sendiri.
- Teks ternormalisasi dan peta offset **tidak disimpan** di tabel. Keduanya dihitung ulang secara deterministik dari `text_raw` + `NORM_VERSION` (±7 juta karakter/detik). Bentuk normal dan stem hanya tersimpan di indeks FTS5.
- Better Auth (nanti) memakai adapter D1 bawaannya.

**Ditolak:** Drizzle 1.0 RC (mandek, risiko campur API) dan Drizzle 0.45 (API akan usang); Kysely (lapisan tambahan tanpa kebutuhan nyata). **Tinjau ulang bila:** Drizzle 1.0 GA dan jumlah tabel aplikasi bertambah banyak (misalnya Fase 5+).

## ADR-010 · Tiga Worker berbagi `packages/core`; `surau-api` tanpa route publik — diterima · 2026-10-15

**Keputusan:**
- `surau-web` (Next via OpenNext): UI, dan membaca D1 langsung lewat `packages/core` di server component. Endpoint milik web sendiri, seperti `/api/search` dan `/api/feedback`, ditulis sebagai route handler Next.
- `surau-mcp` (Fase 3): MCP publik read-only, endpoint `mcp.<domain>/mcp`.
- `surau-api` (Fase 4): Jawab (SSE), kuota, ledger biaya, dan cron. **Tidak punya route publik** (`workers_dev=false`). Web memanggilnya lewat **service binding** dari route handler Next (`/api/jawab`, `/api/admin`), sehingga tetap satu origin tanpa CORS dan tidak ada dua Worker yang berebut path `/api/*`.

Logika domain ada di paket TS murni yang menerima binding sebagai parameter. **Ditolak:** MCP/LLM sebagai route Next (terikat ke adapter dan cold start Next, rate limit dan kegagalan tercampur, rilis per fase sulit); route publik `<domain>/api/*` untuk `surau-api` (bentrok dengan endpoint web dan aturan prioritas route). **Konsekuensi:**
- Setiap Worker punya `wrangler.jsonc` sendiri dan `namespace_id` rate limit yang berbeda.
- Service binding dari Worker **preview** memanggil deployment **produksi** Worker tujuan (docs Workers Previews). Uji end-to-end Jawab di preview harus memperhitungkan hal ini, misalnya dengan Worker `surau-api-staging`.

## ADR-011 · MCP: `@modelcontextprotocol/server` v2, stateless dual-era, tanpa paket `agents` — diterima · 2026-10-15

**Keputusan:** Pakai SDK v2.3.x dengan `createMcpHandler(factory)`. Mode `legacy: 'stateless'` (default) melayani klien spesifikasi 2025-11-25 sekaligus 2026-07-28. Server ini tanpa auth, read-only, dan tidak pernah memanggil LLM. Validasi Origin memakai `originValidationResponse`. Rate limit memakai binding dengan key `HMAC(IP):tool`, bukan IP mentah (ADR-014). Batasnya longgar, karena semua pengguna Claude.ai datang dari IP Anthropic. Output dipaginasi (±4–6 ribu token). Setiap tool punya anotasi `readOnlyHint`. **Ditolak:** `McpAgent` (deprecated sejak agents 0.20); `agents/mcp/server` (paket 0.x yang rilis mingguan dan mengunci versi peer; menjadi **cadangan** bila butuh OAuth); `mcp-handler` (tidak menambah nilai di luar Next); SDK v1 (mode pemeliharaan).

## ADR-012 · Nama di kode dan MCP berbahasa Inggris; dokumen dan UI berbahasa Indonesia — diterima · 2026-10-15

**Keputusan:** Identifier kode, nama tabel, dan nama tool MCP memakai bahasa Inggris snake_case/camelCase, misalnya `get_table_of_contents`, `read_section`, `search_text`, `verify_quote`, dan `get_hadith_takhrij`. Tujuannya interoperabilitas dengan AI global; nama tool juga wajib ASCII. Deskripsi tool dwibahasa (Inggris + Indonesia). Dokumen, string UI, dan pesan commit berbahasa Indonesia. Istilah domain Arab ditransliterasi konsisten, misalnya `takhrij`, `juz`, dan `kitab`. **Menggantikan** nama tool berbahasa Indonesia di docs lama (`daftar_isi`, `baca_bagian`, …).

## ADR-013 · LLM: Claude Haiku 5.5 lewat AI Gateway; batch langsung ke Anthropic — sementara · 2026-10-15

**Keputusan:** `@anthropic-ai/sdk` dengan model `claude-haiku-5-5` untuk Jawab dan ingest. Aturan wajib (dicek di referensi resmi):
- `output_config.effort: "low"` diset eksplisit (default `medium`).
- Thinking adaptif aktif secara default; jangan kirim `budget_tokens`.
- Jangan kirim `temperature`, `top_p`, atau `top_k` (nilai non-default → 400).
- Tanpa prefill assistant (400).
- Prompt ≤100k token, termasuk token cache. Di atas batas itu harga naik 5×, jadi Jawab dibatasi ±40k.
- `stop_reason: "refusal"`: Haiku 5.5 **tidak punya fallback server**, dan parameter `fallbacks` tidak boleh dikirim. Ulangi di sisi klien dengan `claude-sonnet-5-5`, atau turun ke mode Cari.
- Citations tidak bisa dipakai bersamaan dengan structured outputs.

Panggilan online lewat **AI Gateway mode BYOK**, karena spend limit gateway hanya berlaku untuk Unified Billing dan BYOK. Kunci Anthropic disimpan pemilik di AI Gateway › Provider Keys (Secrets Store), dan Worker hanya memegang `CF_AIG_TOKEN`. Header yang dipakai: `cf-aig-collect-log-payload: false`, `cf-aig-metadata`, dan rate limit global. Mode ini dipakai **setelah** uji passthrough Citations, streaming, `cache_control`, dan header beta lolos, sekaligus memastikan harga `claude-haiku-5-5` dikenali gateway. Ini belum terdokumentasi Cloudflare. Bila uji gagal, panggil `api.anthropic.com` langsung (ganti `baseURL`, kunci sebagai Worker secret). Ledger D1 tetap menjadi rem otoritatif (ADR-014). Message Batches dipanggil langsung dari skrip lokal. **Catatan:** Message Batches **tidak tersedia di Amazon Bedrock** (tabel ketersediaan platform di referensi resmi `claude-api`, dicek 15 Okt 2026; cek ulang di docs Bedrock sebelum mengandalkannya), sehingga kredit AWS hanya berguna untuk panggilan online. **Ditolak:** Unified Billing AI Gateway (biaya 5%, kredit prabayar, tidak bisa memakai kredit Max/Team); mode pass-through `x-api-key` (spend limit gateway tidak berlaku); caching AI Gateway (exact-match dan volatil, sehingga cache jawaban dibuat sendiri di D1).

## ADR-014 · Pengaman biaya dan penyalahgunaan berlapis — diterima · 2026-10-15

**Keputusan (Fase 4):**
1. Workspace Anthropic `surau-prod` khusus untuk Tanya online, dengan spend limit bulanan dan auto-reload OFF. Batch dan eval memakai workspace `surau-dev` terpisah.
2. Spend limit harian di gateway AI Gateway `surau-gw` (mode BYOK, ADR-013; eventually consistent, jadi bukan rem utama).
3. Ledger anggaran di D1 dengan reservasi atomik (`UPDATE … WHERE spent+reserved+est <= cap RETURNING`) dan cron untuk melepas reservasi basi.
4. Sakelar `settings.jawab_enabled` yang diubah dari `/admin`, dilindungi Cloudflare Access.

Turnstile mode Managed hanya di Jawab. Token ditukar menjadi cookie anonim HMAC 24 jam. Burst dibatasi Rate Limiting binding (per anon-id). Kuota harian memakai counter atomik D1 per anon-id dan per HMAC(IP, salt harian). Untuk IPv6, yang di-hash adalah prefiks /64. IP mentah tidak pernah disimpan. Setiap kegagalan penyedia turun dengan anggun ke mode Cari. **Ditolak:** Bot Fight Mode (memblokir klien MCP); counter di KV (eventually consistent, tulis mahal); Rate Limiting binding untuk kuota harian (hanya periode 10 atau 60 detik, dan per lokasi).

## ADR-015 · Observabilitas bawaan Cloudflare; eval dan anotasi buatan sendiri — diterima · 2026-10-15

**Keputusan:**
- Observabilitas: Workers Logs, Traces (sampling 0,1), dan Issues; analytics AI Gateway (retensi 7 hari, tanpa payload); Cloudflare Web Analytics (tanpa cookie, snippet manual).
- **Eval dan anotasi dibangun sendiri** (biaya $0):
  - `tools/eval` dengan dataset JSONL di git (sebagian privat) dan pemeriksaan deterministik (kutipan verbatim, lokasi, takhrij, penolakan) yang berjalan di CI.
  - Halaman `/tinjau` di aplikasi (UI Indonesia, Arab RTL, Benar/Kurang/Salah) yang dilindungi Cloudflare Access.
  - Tabel D1 `answer_log` dan `review` sebagai arsip milik sendiri (tanpa PII, retensi sesuai P-7).

**Ditolak:** Langfuse sebagai alat utama (Hobby hanya 2 user, UI Inggris tanpa RTL, SDK belum resmi untuk Workers; menjadi **cadangan** bila butuh eksperimen atau manajemen prompt, dan mengajukan kredit OSS); promptfoo (cadangan untuk membandingkan model); Braintrust, Opik, dan Arize (vendor tambahan tanpa RTL); AI Gateway Evaluations (deprecated). **Catatan biaya:** mulai 1 Des 2026, log dan trace Cloudflare dihitung per GB (Paid: 50 GB ingest gratis per siklus).

## ADR-016 · Autentikasi: Better Auth + D1, ditunda sampai setelah Jawab — diterima · 2026-10-15

**Keputusan:** Fase 0–4 tanpa login, dengan kuota anonim. Login baru ditambahkan bila kuota anonim terbukti kurang, atau bila ada fitur riwayat/bookmark. Pilihannya Better Auth 1.7.x (adapter D1 bawaan, Google OAuth + magic link lewat Cloudflare Email Service, plugin captcha Turnstile, rate limit dengan storage database). `/admin` dan `/tinjau` dilindungi Cloudflare Access (Zero Trust Free; batas penggunanya dicek di docs resmi saat S18, karena angka "≤50 pengguna" belum terverifikasi). **Ditolak:** Clerk (PII di luar, vendor tambahan); Auth.js (sekarang bagian dari Better Auth, v5 masih beta); Supabase Auth.

## ADR-017 · CI/CD: GitHub Actions + wrangler; Worker Previews per PR — diterima · 2026-10-15

**Keputusan:** Workflow memakai `ci.yml` (`pnpm verify` di setiap PR/push), `preview.yml` (PR: build lalu `wrangler preview`, smoke Playwright, komentar URL), dan `deploy.yml` (push ke `main`: migrasi D1 remote lalu deploy). Semua konfigurasi ada di repo, sehingga agent bisa membaca log lewat `gh run view --log-failed`. `node_modules` di-cache dengan kunci hash lockfile (karena unduhan HeroUI Pro). Preview di-bind ke D1/R2 **staging**, karena resource akun tidak terisolasi per preview. **Ditolak:** Workers Builds sebagai jalur utama (konfigurasi di dashboard, pnpm default 10.11.1, tanpa cache `node_modules`, log tidak terbaca agent). Workers Builds menjadi cadangan.

## ADR-018 · Sumber teks Ihya: struktur dari Shamela lokal, lisensi lewat OpenITI — diterima (pemilik, 2026-10-16) · 2026-10-15

**Konteks:** Syarat Shamela (diperbarui 19 Sep 2026) menyatakan hak tetap pada pemiliknya dan **tidak memberi hak pakai ulang**. OpenITI rilis 2025.1.9 (Zenodo, CC BY-NC-SA 4.0) punya dua versi Ihya dengan 1.706 penanda halaman yang identik dengan edisi Shamela 9472 (Dar al-Ma'rifah, 361/386/413/546 per jilid):
- `Shamela0009472-ara1.completed`: matan identik dengan Shamela lokal (1.705 dari 1.706 halaman ≥0,95, median 1,0), tapi takhrijnya hilang.
- `JK000001-ara1`: takhrij al-'Iraqi ada di dalam baris (` + `), tapi pasangannya tidak andal secara global, judulnya datar, dan tag ayatnya tidak andal.

**Keputusan:**
- Matan dan struktur (311 judul, catatan kaki terpisah) **dibangun dari Shamela lokal**, karena paling bersih.
- Kesesuaiannya dengan OpenITI yang dipin (commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e`) **diverifikasi otomatis** sebagai gerbang QA (`verify-openiti`, S07).
- Takhrij diambil dari catatan kaki Shamela dan dicek silang dengan JK000001. Takhrij yang tidak cocok ditandai `needs_review`.
- Atribusi publik di setiap halaman: *"Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982"*, ditambah tautan `shamela.ws/book/9472/{page.id}`.
- Pindaian archive.org hanya ditautkan, tidak di-hosting.
- Pemilik mengirim email pemberitahuan ke pengelola Shamela (T-10).

**Ditolak:** OpenITI Shamela0009472 saja (takhrij hilang); JK000001 saja (struktur buruk, menjadi cadangan dan sumber cek silang); teks Shamela tanpa rantai lisensi OpenITI. **Konsekuensi:** sekitar 200 halaman takhrij yang bercampur setelah `//` harus dipisah dan ditandai. Penanda halaman OpenITI ada di **akhir** halaman. **Tinjau ulang bila:** Shamela keberatan, atau kitab berikutnya tidak punya versi OpenITI. Untuk kitab seperti itu dibutuhkan kebijakan lisensi per kitab sebelum ditampilkan publik.

## ADR-019 · Urutan fase: MCP dirilis sebelum Jawab — diterima · 2026-10-15

**Konteks:** Roadmap lama menaruh MCP (v1.5) setelah Jawab. **Keputusan:** MCP publik dirilis di Fase 3, setelah Pembaca (Fase 1) dan Cari (Fase 2), dan sebelum Jawab (Fase 4). MCP hampir gratis dijalankan (tanpa LLM), langsung berguna bagi pengguna Claude/ChatGPT, dan menguji core tools di dunia nyata sebelum pipeline Jawab yang berbiaya. Ini sejalan dengan [docs/08](../docs/08-biaya.md#pendanaan--program): "Dahulukan MCP dan mode Cari".

## ADR-020 · Al-Qur'an: teks Tanzil, terjemahan Kemenag via QuranEnc, tidak pernah diterjemahkan LLM — diterima · 2026-10-15

> **Diperbarui ADR-040 (2026-10-17):** terjemahan dan transliterasi Kemenag diambil dari data milik pemilik, bukan QuranEnc. Bagian lain tetap berlaku.

**Keputusan:** Teks ayat diambil dari Tanzil 1.1 (CC BY 3.0, **hanya verbatim**, wajib pemberitahuan dan tautan tanzil.net): `simple-clean` untuk indeks pencocokan, `uthmani` untuk tampilan. Terjemahan Indonesia memakai QuranEnc `indonesian_affairs` (Kemenag, versi dicatat, verbatim, penanda catatan kaki ditampilkan apa adanya). Kutipan ayat di kitab dikenali secara deterministik; 97,2% cocok persis setelah normalisasi, sisanya dicocokkan fuzzy dengan label "mirip". **Ayat tidak pernah diterjemahkan LLM.** Dalam batch terjemahan (S13), bentang ayat diganti placeholder lalu diisi terjemahan Kemenag. **Ditolak:** API Quran Foundation sebagai sumber indeks (cache maksimal 1 minggu, dilarang dibundel); `quran-json` (deprecated, tanpa hak redistribusi); scraping situs Kemenag. **Terbuka:** apakah PMA 44/2016 (tashih) berlaku untuk aplikasi yang hanya mengutip ayat di dalam kitab. Tanyakan ke LPMQ bila perlu.

## ADR-021 · Lisensi konten: CC BY-NC-SA 4.0, terpisah dari kode Apache-2.0 — diterima (pemilik, 2026-10-16) · 2026-10-15

**Konteks:** Teks berasal dari rilis OpenITI berlisensi CC BY-NC-SA 4.0. Terjemahan dan ringkasan buatan LLM atas teks tersebut adalah *Adapted Material*. **Keputusan:**
- `LICENSE` (Apache-2.0) berlaku untuk kode. `data/LICENSE` (CC BY-NC-SA 4.0) berlaku untuk konten turunan: teks, terjemahan, ringkasan, indeks, dan dump. `data/ATTRIBUTION.md` mencantumkan OpenITI, Shamela, Dar al-Ma'rifah, Tanzil, dan Kemenag/QuranEnc beserta versinya.
- Setiap respons MCP dan API memuat `license` dan `attribution`.
- **Tanpa iklan, paywall, atau penjualan akses atas konten** (klausul NC). Donasi untuk organisasi nirlaba tetap boleh.
- Dataset eval pihak ketiga dengan lisensi lain (misalnya IslamicEval CC BY-SA, GPL) hanya dipakai internal dan tidak diredistribusikan.

**Tinjau ulang bila:** ada izin eksplisit dari Shamela atau penerbit, atau kitab baru dengan lisensi berbeda.

## ADR-022 · Posisi produk terhadap Shamela AI dan MCP — diterima · 2026-10-15

**Konteks:** Per Okt 2026, Shamela punya MCP publik resmi (`mcp.shamela.ws`, 4 tool, tanpa auth) dan "اسأل الشاملة" (tanya-jawab AI bersumber) untuk ribuan kitab berbahasa Arab. Usul.ai dan Ansari juga aktif. **Keputusan:** Surau tidak bersaing dalam lebar cakupan atau pencarian Arab lintas kitab. Pembedanya adalah:
1. Bahasa Indonesia di semua lapisan.
2. Kedalaman per kitab (struktur yang diperbaiki, takhrij yang tertaut, dan ayat dengan terjemahan Kemenag).
3. Kutipan yang **diverifikasi kode** dan permalink halaman cetak yang stabil.
4. Review ustadz dan eval terbuka.
5. Biaya transparan dan nirlaba.

MCP Surau menonjolkan nilai-nilai ini. Instruksi server Shamela boleh dipelajari sebagai referensi desain (nisbah ke pengucap, catatan kaki milik muhaqqiq, konten kitab adalah data dan bukan instruksi).

## ADR-023 · Hasil spike toolchain S01: Vite+ dan TS7 lolos, dengan penyesuaian versi dan konfigurasi — diterima · 2026-10-15

**Konteks:** S01 memverifikasi ADR-008. Hasilnya: `vp check` (Oxfmt + Oxlint + type-check tsgolint) memeriksa `apps/web` memakai tsconfig app (diuji dengan error tipe yang disengaja), `vp test` tidak mengumpulkan `docs/**`, dan `next build` 16.3.8 berjalan dengan `tsc` TypeScript 7.0.2. Cadangan Biome **tidak** dipakai. Beberapa hal menyimpang dari rencana tertulis atau belum tercatat:

**Keputusan:**
1. **Versi muda ditunda, bukan dikecualikan.** `vite-plus` 1.2.0 (terbit 14 Okt 09:21 UTC) dan `react`/`react-dom` 19.2.9 (14 Okt 16:54 UTC) berumur <24 jam saat S01, sehingga ditolak `minimumReleaseAge`. Catalog sementara memakai `vite-plus` **1.1.0** dan React **19.2.8**. Keduanya dinaikkan setelah cukup umur (cukup ubah catalog lalu `pnpm install`; lihat Catatan hasil S01). Tidak ada `minimumReleaseAgeExclude`.
2. **`minimumReleaseAge: 1440` ditulis eksplisit** di `pnpm-workspace.yaml`. Dengan nilai bawaan, pnpm 12 diam-diam menambahkan paket yang belum cukup umur ke `minimumReleaseAgeExclude` (terjadi pada wrangler 4.151.0). Nilai eksplisit menyalakan mode strict: install gagal, tidak melonggarkan diri.
3. **Build script `@zowe/secrets-for-zowe-sdk` ditolak** (`allowBuilds: false`). Paket ini dibawa CLI `heroui-pro` (dependensi `@heroui-pro/react`) untuk akses keychain. Postinstall Pro tetap berhasil mengunduh artefak tanpa paket itu (sudah diuji, termasuk dari `node_modules` kosong). Bila CI (S02) gagal mengunduh artefak Pro dengan `HEROUI_AUTH_TOKEN`, tinjau ulang poin ini.
4. **`turbopack.root` di `next.config.ts`** menunjuk root monorepo. Ada `pnpm-workspace.yaml` di luar repo (folder home pemilik) yang membuat Next menebak root secara keliru dan memberi peringatan.
5. **Lint `nextjs/no-img-element` dimatikan.** `images.unoptimized` (ADR-003) membuat `next/image` tidak memberi optimasi di Workers.
6. **Advisory yang mengenai Next 16.3.8, dimitigasi lewat larangan ADR-003 sampai X01:**
   - GHSA-673q-mjm6-r5xr (kritis, RCE `use cache` dengan typed array). Mitigasi: `cacheComponents: false` dan larangan `'use cache'`.
   - GHSA-2464-fhr4-w9xw (kritis, RCE Image Optimization dengan SVG). Mitigasi: `images.unoptimized: true`.
   - GHSA-p3m5-59mp-jv5r (DoS Server Actions). Mitigasi: tanpa Server Actions.
   - GHSA-xqc2-xf4c-x3h3 di React (kritis, RCE pada RSC yang mengirim typed array bersama nilai dari penyerang; tambalannya React 19.2.9). App Router Next memakai salinan React **bawaan Next** (`19.3.0-canary` di `next/dist/compiled`), bukan paket `react` di catalog. Jadi menaikkan `react` ke 19.2.9 tidak menambal sisi server; tambalannya datang lewat Next 16.4.1 (X01). Mitigasi: tanpa Server Actions, tanpa `'use cache'`, dan tidak mengirim typed array (`Uint8Array` dan sejenisnya) dari Server Component ke klien.

**Ditolak:** `minimumReleaseAgeExclude` untuk vite-plus/React (melemahkan pengaman rantai pasok demi versi minor); cadangan Biome (tidak perlu, Vite+ bekerja).
**Konsekuensi:** Larangan ADR-003 sekarang juga menjadi mitigasi keamanan, bukan hanya kehati-hatian. Peninjau wajib menolak `'use server'`, `'use cache'`, dan typed array di props Server Component. X01 sebaiknya dikerjakan sebelum `/rilis 0` begitu gerbangnya terbuka.
**Tinjau ulang bila:** X01 selesai (Next 16.4.1+), atau CI gagal mengunduh artefak HeroUI Pro. → X01 (2026-10-16): 3 advisory Next ditambal di 16.4.1; tambalan React RSC (xqc2/h3gv) baru **indikasi** (ADR-030 poin 4), jadi larangan typed array tetap wajib.

## ADR-024 · GitHub & CI: repo privat baru, cache `node_modules` terpisah, token sempit, Dependabot dengan cadangan manual, tanpa proteksi branch — diterima · 2026-10-15

**Konteks:** S02 memasang repo GitHub dan CI (ADR-017). Di lapangan ditemukan: nama `alfariesh/surau` sudah dipakai repo privat lama (Feb 2026, proyek berbeda); proteksi branch dan ruleset ditolak untuk repo privat di akun GitHub Free (`gh api …/branches/main/protection` dan `…/rulesets` → HTTP 403 "Upgrade to GitHub Pro or make this repository public"); Dependabot belum resmi mendukung pnpm 12 + catalog (dependabot-core #12244, #14339, #14824, #15904, #16311, #16434, #16521).

**Keputusan:**
1. **Repo:** atas izin pemilik, repo lama di-rename menjadi `alfariesh/surau-lama` (isi utuh), lalu dibuat repo **privat** baru `alfariesh/surau` (P-1). Pengalihan nama lama GitHub ke `surau-lama` otomatis hilang karena nama itu dipakai lagi.
2. **CI satu job** (`.github/workflows/ci.yml`): checkout → guard token → `setup-vp` (`cache: false`, `run-install: false`, Node dari `.node-version`, versi vp dari catalog) → `actions/cache/restore` `node_modules` → `pnpm install --frozen-lockfile` → `actions/cache/save` (hanya bila miss, **sebelum** verify) → `pnpm verify`. Cache store bawaan setup-vp tidak dipakai, karena tidak menghemat kuota unduhan HeroUI Pro; yang menghemat adalah `node_modules` (artefak Pro ada di dalamnya). Kunci: OS, arsitektur, hash `.node-version`, semua `package.json` workspace, lockfile, dan `pnpm-workspace.yaml`; **tanpa** `restore-keys`.
3. **Token sempit:** `HEROUI_AUTH_TOKEN` hanya diberikan ke langkah guard dan install, tidak di level job seperti tertulis di rencana S02. Postinstall Pro hanya berjalan saat install, jadi `next build`, tes, dan kode dependensi di `pnpm verify` tidak perlu (dan tidak bisa) membacanya.
4. **Action dipin ke SHA commit** (`checkout` v7.0.1, `cache` v6.1.0, `setup-vp` v1.21.2; dicocokkan dengan tag lewat `gh api`). Moving tag `setup-vp@v1` beku di v1.15.0, jadi jangan dipakai.
5. **PR dari fork tidak dijalankan** (`if` membandingkan `head.repo.full_name`), dan `pull_request_target` tidak dipakai.
6. **Dependabot:** npm mingguan, minor/patch dikelompokkan, mayor diabaikan, `cooldown` 3 hari (> `minimumReleaseAge` 24 jam). `@heroui-pro/react` diabaikan total (dipin persis ke beta); `next` hanya diabaikan untuk minor (16.4 lewat X01), patch 16.3.x tetap diusulkan. github-actions bulanan. **Cadangan:** bila PR npm Dependabot rusak (lockfile/catalog), tutup PR-nya dan naikkan versi secara manual lewat catalog di sesi berikutnya. Judul PR Dependabot berbahasa Inggris; disunting saat squash bila perlu.
7. **Proteksi `main` tidak tersedia** (akun Free + repo privat). Pengganti: CI di setiap PR, aturan "merge hanya dengan izin pemilik" (CLAUDE.md aturan 4), squash merge, dan larangan `push --force` ke `main` (KONVENSI). Tidak upgrade ke GitHub Pro hanya demi ini.

**Ditolak:** cache bawaan `setup-vp` (store pnpm saja, kuota Pro tetap terpakai); cache yang disimpan oleh post-step `actions/cache` (tidak tersimpan bila verify gagal, dan membawa sisa run); token di level job; membuat repo publik demi proteksi branch (melanggar Terms HeroUI Pro §9).
**Konsekuensi:** run pertama per lockfile ±1 menit dengan unduhan Pro; run berikutnya memulihkan `node_modules` tanpa unduhan. Bila repo kelak publik, PR fork bisa memulihkan cache berisi artefak Pro; ini alasan tambahan repo ini tidak boleh sekadar dijadikan publik (P-1).
**Tinjau ulang bila:** akun pindah ke GitHub Pro/Team atau repo baru dibuat publik (pasang ruleset `main`: wajib check `verify`, tanpa force-push); Dependabot resmi mendukung pnpm 12 + catalog; atau kuota unduhan HeroUI Pro mendekati batas.

## ADR-025 · Repo `alfariesh/surau` publik sementara (kuota CI privat habis), risiko lisensi HeroUI Pro diterima pemilik — sementara · 2026-10-15

**Konteks:** P-1 semula dijawab "privat" (ADR-004, ADR-024). Setelah S02 digabung, pemilik meminta repo dibuat publik. Agent menjelaskan risikonya: 16 file `apps/web` memakai `@heroui-pro/react` dan template chat Pro ada di riwayat git sejak S01, sedangkan Terms HeroUI Pro §9 melarang publikasi komponen dan template Pro; publikasi tidak bisa ditarik kembali. Pilihan lain yang ditawarkan: tetap privat sambil meminta izin HeroUI, repo publik terpisah tanpa `apps/web`, atau beralih ke HeroUI OSS. Pemilik memilih **tetap publikkan sekarang** dan menanggung risikonya. **Alasan pemilik:** kuota menit GitHub Actions akunnya sudah habis, sehingga CI tidak berjalan di repo privat, sedangkan repo publik tidak memakai kuota menit. Ini sifatnya **sementara**: repo direncanakan kembali privat setelah tahap uji.

**Keputusan:**
1. Repo `alfariesh/surau` **publik** sejak 2026-10-15 (`gh repo edit --visibility public`). Sebelumnya seluruh riwayat dipindai: tanpa `.env*`, `.dev.vars*`, `*.db`/`*.sqlite`, teks kitab, skill HeroUI, kunci privat, atau pola token. Email penulis commit pemilik ikut terlihat publik (riwayat `main` tidak ditulis ulang).
2. **Persetujuan workflow untuk semua kontributor luar** (`fork-pr-contributor-approval` = `all_external_contributors`). Alasan: PR dari fork menjalankan versi workflow milik fork dan bisa memulihkan cache `node_modules` dari `main` yang berisi artefak HeroUI Pro. Pemilik harus menyetujui run semacam itu, dan sebaiknya **tidak** menyetujui PR fork yang mengubah `.github/`.
3. **Proteksi `main` dipasang** (tersedia untuk repo publik di akun Free): wajib check `verify` lolos, berlaku juga untuk admin, tanpa force-push dan tanpa hapus branch, tanpa wajib review. Akibatnya semua perubahan ke `main` lewat PR yang hijau, termasuk catatan status; commit "docs(status): … digabung" langsung ke `main` tidak dipakai lagi.
4. Biaya Actions untuk repo publik $0 (menit tidak dihitung kuota).

**Ditolak:** tetap privat sambil menunggu izin HeroUI; repo publik terpisah; beralih ke HeroUI OSS (semuanya ditawarkan, pemilik memilih publik sekarang).
**Konsekuensi:** risiko pelanggaran Terms HeroUI Pro §9 aktif. Bila HeroUI menegur, jalan keluarnya: hapus komponen/template Pro dari kode (beralih ke OSS), dan bila diminta, buat repo baru tanpa riwayat lama. Draf email izin ke HeroUI (lampiran TUGAS-PEMILIK) tetap disarankan dikirim. Kontributor tanpa lisensi Pro tetap tidak bisa mem-build `apps/web` (ADR-004). ADR-024 butir 7 (tanpa proteksi branch) diganti oleh butir 3 ADR ini.
**Bila kembali privat:** proteksi `main` hilang lagi (akun Free, HTTP 403; kembali ke ADR-024 butir 7), CI memakai kuota menit lagi (pastikan kuota sudah pulih atau akun di-upgrade), dan salinan publik yang sempat dibuat orang lain tidak ikut tertarik.
**Tinjau ulang bila:** tahap uji selesai (rencana kembali privat), HeroUI memberi jawaban atas permintaan izin atau menegur, atau UI beralih ke OSS-only.

## ADR-026 · Deploy web: OpenNext 1.20.11 di Worker `surau-web`, cache R2 + regional, Preview per PR lewat `wrangler preview` — diterima · 2026-10-15

**Konteks:** S03 memasang deploy Cloudflare (ADR-002, ADR-003, ADR-017). Fakta lapangan 15 Okt 2026: peer OpenNext 1.20.11 = `next >=15.5.27 <16 || >=16.3.8`, jadi 16.3.8 adalah versi minimum yang didukung resmi. Range itu secara peer juga mencakup 16.4, tetapi catatan rilis belum menyebut 16.4 diuji (gerbang X01 tetap tertutup). Worker Previews butuh blok `previews` yang tidak mewarisi binding dari produksi.

**Keputusan:**
1. Satu Worker `surau-web` (`apps/web/wrangler.jsonc`), `compatibility_date` 2026-10-14 (tanggal terbaru yang didukung workerd 1.20261012 di wrangler 4.151.0), flag `nodejs_compat` + `global_fetch_strictly_public`, tanpa binding `IMAGES` (`images.unoptimized`, ADR-003).
2. Cache ISR: `withRegionalCache(r2IncrementalCache, { mode: "long-lived" })` di R2 `surau-next-cache` (produksi) dan `surau-next-cache-preview` (Preview). Queue dan tag cache dibiarkan default (`dummy`/tanpa tag cache): belum ada revalidasi berbasis waktu atau `revalidateTag`.
3. Observability: log 100%, trace 10%, **`redact_query_string: true`** di produksi dan Preview, supaya pertanyaan pengguna di query string (cari, Jawab) tidak tercatat (P-7). `upload_source_maps: true`.
4. CI/CD: `deploy.yml` (push ke `main` atau manual **hanya dari `main`**: build OpenNext → `opennextjs-cloudflare deploy`, yang juga mengisi cache R2 produksi → smoke `curl` 3 halaman) dan `preview.yml` (PR dari repo ini, bukan Dependabot: build → `wrangler preview --name pr-<n> --json` → smoke `curl` → satu komentar URL yang diperbarui; saat PR ditutup, Preview dihapus dan kegagalannya hanya menjadi peringatan). Langkah install bersama dipindah ke action komposit `.github/actions/siapkan` (dipakai juga oleh `ci.yml`); token HeroUI tetap hanya di cek + install (ADR-024), token Cloudflare hanya di langkah deploy/preview/hapus.
5. Smoke test memakai `curl`, **bukan Playwright** seperti tertulis di ADR-017. Playwright baru dipasang di S04 (`test:e2e`); smoke Playwright di `preview.yml` ditambahkan saat itu.
6. Deploy belum memigrasi D1: belum ada D1 sampai Fase 1 (S06 menambahkan migrasi `surau-app` ke `deploy.yml`).
7. Deploy produksi pertama dilakukan dari lokal (`opennextjs-cloudflare deploy`, versi `6347e851`) sebelum Preview pertama, karena service binding self-reference dari Preview memanggil produksi.

**Keterbatasan yang diketahui:**
- `WORKER_SELF_REFERENCE` dari Preview memanggil Worker **produksi**. Dengan queue `dummy` binding ini praktis tidak dipakai. Bila kelak memakai `memoryQueue`/DO queue untuk ISR, revalidasi dari Preview akan mengenai Worker dan cache R2 produksi: tinjau ulang sebelum itu.
- `opennextjs-cloudflare populateCache remote` membaca `bucket_name` top-level (produksi); jangan dipakai di `preview.yml`. Cache R2 Preview kosong, jadi halaman ISR di Preview dirender on-demand.
- `pnpm --filter @surau/web preview` (wrangler dev) masih menyimpan state di `apps/web/.wrangler/state`, sedangkan `next dev` memakai `<root>/.wrangler/state` (ARSITEKTUR-TEKNIS §7 aturan 1). Isi cache-nya dibuat ulang setiap build, jadi belum berdampak; S06 wajib menyamakan lokasi ini sebelum ada D1 lokal.
- URL produksi `surau-web.alfarieshsalman.workers.dev` ditulis di `deploy.yml` sampai ada domain (T-07, P-2).

**Ditolak:** `cloudflare/wrangler-action` (lapisan tambahan; `pnpm exec wrangler` memakai versi catalog), Workers Builds (ADR-017), `npx wrangler` di job hapus (melewati `minimumReleaseAge`; diganti `pnpm dlx` dengan versi dari catalog).
**Tinjau ulang bila:** OpenNext menyatakan dukungan Next 16.4 (X01), ISR berbasis waktu atau `revalidateTag` mulai dipakai (perlu queue + tag cache), domain sendiri siap, atau D1 masuk (S06).

## ADR-027 · Identitas visual dan fondasi UI web: palet Zaitun, Plus Jakarta Sans + Noto Naskh Arabic, next-themes, Playwright + axe — diterima · 2026-10-15

**Konteks:** S04 mengubah template chat HeroUI Pro menjadi Surau. T-08 (arah desain, P-3) belum diisi pemilik, jadi agent membuat dua opsi di halaman sementara `/_desain` (A · Zaitun: kertas hangat, aksen hijau zaitun, Noto Naskh Arabic; B · Lazuardi: kertas sejuk, aksen biru lazuardi, Amiri). Pemilik menjawab: "Lupakan Paper, pakai Opsi A Zaitun saja." (2026-10-15).

**Keputusan:**
1. **Palet Zaitun** ditulis sebagai override variabel dasar tema HeroUI di `:root` dan `:root.dark` (`apps/web/src/app/globals.css`), sengaja di luar `@layer` supaya menang atas `@layer base` HeroUI. Variabel turunan (hover, soft, focus) tetap dihitung HeroUI. Aksen terang `oklch(0.47 0.085 150)`, gelap `oklch(0.79 0.1 150)`. Kontras diperiksa axe (WCAG 2.1 AA) di terang dan gelap.
2. **Font** lewat `next/font/google`, di-host sendiri: UI **Plus Jakarta Sans** (Tokotype, Indonesia; OFL) dan Arab **Noto Naskh Arabic** (variable, subset `arabic`, `preload: false` karena teks Arab belum ada di setiap halaman). Variabel CSS `--font-arabic` dan `--arabic-leading` (2). Amiri tidak dipakai: harakatnya tinggi dan butuh line-height ±2,4.
3. **Tipografi Arab** hanya lewat `ArabicText` (blok, `lang="ar" dir="rtl"`) dan `ArabicInline` (`<bdi>`). `line-height` blok Arab ditulis di luar `@layer` supaya tidak ditimpa utilitas ukuran Tailwind (`text-3xl` ikut menyetel line-height).
4. **Tema** memakai `next-themes` 0.4.6 (`attribute="class"`, `defaultTheme="system"`); tombol tema berpindah terang/gelap. `I18nProvider locale="id-ID"` dan `RouterProvider` (router Next) dipasang di `Providers`; root layout tidak membaca `headers()`.
5. **Tes UI:** `@playwright/test` 1.64.0 (chromium desktop + profil ponsel Pixel 7) untuk smoke, ditambah `@axe-core/playwright` 4.13.0 (MPL-2.0, devDependency saja; kompatibel dengan Apache-2.0) untuk cek a11y di setiap halaman, terang dan gelap. `preview.yml` menjalankannya terhadap URL preview PR (runtime Workers). Smoke `curl` di `deploy.yml`/`preview.yml` kini `/` dan `/tentang`.
6. **Dependensi template dibuang:** semua `@tiptap/*`, `embla-carousel*`, `marked`, `react-markdown`, `remark-*`, `streamdown`, `shiki`, `recharts`, `@number-flow/react`, `@internationalized/number`, `@react-stately/utils` (peer opsional HeroUI Pro, atau dependensi langsungnya). Bundle Worker: 15.993 → 5.815 KiB (gzip 3.021 → 1.221 KiB).
7. **Vitest** mentransformasi JSX dengan `oxc.jsx.runtime: "automatic"` di `vite.config.ts`, karena tsconfig web wajib `jsx: "preserve"` untuk Next.
8. Demo basmalah (`apps/web/src/content/basmalah.ts`) diambil skrip, lalu dicocokkan persis dengan unduhan resmi Tanzil Uthmani v1.1 (sha256 dicatat di file). Atribusi bertaut ke tanzil.net sesuai syarat Tanzil. S12 menggantinya dengan data ayat dari DB.

**Ditolak:** Opsi B Lazuardi + Amiri (pilihan pemilik). Mengimpor Design System HeroUI Pro (pemilik tidak membuatnya). Paper MCP untuk referensi warna (koneksi gagal; pemilik memilih Opsi A). `ToggleButtonGroup` tiga keadaan (terang/gelap/sistem) untuk tema: ditunda, tombol dua keadaan cukup untuk Fase 0.
**Tinjau ulang bila:** pemilik membuat Design System di HeroUI Pro, teks Arab panjang (Fase 1 pembaca) menunjukkan Naskh kurang nyaman, atau domain sendiri siap (`SITE_URL` di `layout.tsx` dan `deploy.yml`).

## ADR-028 · Paket `@surau/text`: aturan NORM_VERSION 1, pembersih HTML Shamela, cakupan tes, `/api/version` — diterima · 2026-10-15

**Konteks:** S05 memindahkan prototipe riset pencarian Arab ke `packages/text`. Pemeriksaan hanya-baca atas Ihya 9472 dan ±200 kitab Shamela lain (15 Okt 2026) menunjukkan tag `<span data-type='title'>` berkutip tunggal, `<span id="aya-N">`, `<hr>`, `<img>` base64, `<table>`, entitas `&gt;`/`&lt;`/`&amp;`, serta ligatur kehormatan Unicode 14 (﵁, ﵀, ﷿, …) yang tidak punya dekomposisi NFKC.

**Keputusan:**
1. **NORM_VERSION 1** = aturan `.claude/rules/teks-arab.md` ditambah: (a) NFKC per karakter untuk presentation forms; ligatur frasa (ﷺ) diberi batas kata, ligatur dalam kata (ﻻ) tetap menyatu, bentuk harakat terisolasi dibuang; (b) ligatur kehormatan Unicode 14 (U+FD40–FD4F, U+FDCF, U+FDFD–FDFF) diekspansi lewat tabel; (c) semua `\p{Mn}`/`\p{Me}` dibuang (bukan hanya harakat Arab) supaya huruf Latin berdiakritik tidak terpecah, dan iterasi per code point; (d) angka 1–4 digit dalam kurung selalu dianggap penanda catatan kaki dan dibuang dari bentuk normal, termasuk tahun seperti "(١٤٠٢)" (sadar: tidak bisa dicari; tahun tanpa kurung tetap bisa); (e) stem: kata dilindungi tetap utuh setelah klitik dibuang (والذين → الذين, prototipe menghasilkan ذين), اللائي tidak lagi disamakan dengan اللاتي.
2. **`toRawSpan`** hanya memperluas ujung span ke tanda gabung, tatweel, dan waw/ya kecil, bukan kontrol arah/BOM, supaya isolate bidi tidak ikut tersalin. **`findQuote`** menolak kecocokan yang batasnya ada di dalam ekspansi satu karakter mentah, dan menolak `opts.normalized` yang bukan milik teks mentah yang sama.
3. **Pembersih HTML:** `cleanShamelaHtml` (pengganti `stripTitleSpans` di rencana: satu fungsi untuk semua tag, judul dicatat posisinya) memakai daftar putih. Tag blok → `\r`, sel tabel → spasi, `span`/`img`/format → dibuang. Tag tak dikenal **dibiarkan sebagai teks** dan dilaporkan di `unknownTags`, karena `text_raw` permanen dan teks seperti `x<y` tidak boleh hilang diam-diam. `extractTitles` tetap ada.
4. **`buildFtsMatch`**: kolom hanya dari daftar tetap (selain itu `TypeError`), maksimal 32 token (`RangeError`) dan 64 frasa.
5. **Tes:** `@vitest/coverage-v8` 5.0.4 (MIT, devDependency root; dipin persis sama dengan vitest bawaan vite-plus 1.2.0). `pnpm test` = `vp test --coverage` + smoke Node; ambang `packages/text/src`: fungsi 100%, baris 95%, cabang 90%. Golden vectors di `packages/text/test/golden.json` membawa `normVersion` yang harus sama dengan `NORM_VERSION`.
6. **`tools/ingest`** dibuat lebih awal (S05, bukan S07) untuk smoke type stripping, benchmark, dan tes integrasi Ihya yang dilewati bila drive Shamela tidak ada.
7. **`GET /api/version`** (route handler dinamis, `no-store`) mengembalikan `{ normVersion }`: bukti bundling paket workspace TS mentah di Next/OpenNext (dicek e2e di preview) dan alat cek sinkron dengan `meta.norm_version` korpus.

**Ditolak:** NFKC seluruh string (merusak peta offset); membuang semua tag tanpa sisa (kata bisa menempel, teks non-tag hilang); stem agresif (riset: merusak kata dasar); `transpilePackages` (Turbopack 16 mentranspilasi paket workspace otomatis).
**Tinjau ulang bila:** kitab kedua memakai tag di luar daftar putih (lihat `unknownTags` di laporan S07), pencarian tahun dalam kurung dibutuhkan, atau eval retrieval (S15) menunjukkan aturan stem perlu diubah (= NORM_VERSION 2, reindex penuh).

## ADR-029 · Skema data v1: formula ID, permalink publik, aturan stabilitas, dan tes D1 di workerd — diterima · 2026-10-15

**Konteks:** S06 membuat `packages/db` (ADR-009). Sebelum data masuk (S07), ID dan URL publik harus diputuskan, karena keduanya tidak boleh berubah setelah rilis ([docs/02](../docs/02-arsitektur.md#yang-harus-benar-sejak-v1) butir 1) dan DB app (feedback, nanti review ustadz) merujuk korpus lewat ID. Ihya Shamela 9472 (hanya-baca, 15 Okt 2026): 1.706 halaman, juz 1–4, `part` dan `page` selalu angka, tanpa pasangan (juz, halaman) ganda; 311 judul.

**Keputusan:**
1. **Formula ID (usulan ARSITEKTUR dipakai):** `page.id = edition_id·10⁵ + seq`, `toc_node.id = edition_id·10⁵ + seq`, `passage.id = edition_id·10⁷ + seq`. Pada build pertama, `seq` mulai 1 dalam urutan sumber. Batas: 99.999 halaman/node dan 9.999.999 paragraf per edisi. `edition_id` 1..899.999 adalah batas konservatif; batas aritmetika 2⁵³/10⁷ ≈ 900 juta. Formula dijaga `CHECK` di DB dan fungsi `pageId`/`tocNodeId`/`passageId`. Filter FTS per edisi memakai rentang rowid `passageIdRange` (ADR-005). Alternatif "hash isi" ditolak (tidak berurutan, tidak bisa difilter per rentang); UUID ditolak (boros, tanpa rentang).
2. **Urutan tampil tidak pernah diambil dari ID.** Halaman diurutkan dengan (`juz`, `page_no`), daftar isi dengan `ord`, dan paragraf dengan (`kind`, `ord`) per halaman. Dengan begitu ID bisa dibekukan tanpa merusak urutan.
3. **Aturan stabilitas.** Sebelum rilis publik Fase 1, ID boleh dibangun ulang bebas. **Sejak rilis**, ID dibekukan:
   - Build ulang dengan sumber + patch yang sama wajib menghasilkan ID yang sama.
   - **Alokasi ID memakai peta ID yang di-commit sebagai masukan**, tidak dihitung ulang dari urutan. Peta ini berisi kunci stabil → `seq`, tanpa teks kitab, di `data/ids/<edition>.json` (format final di S07).
   - Kunci stabil per tabel:
     - halaman: `source_page_id`;
     - node daftar isi: `source_title_id`, atau ID patch untuk node hasil patch;
     - paragraf: (`source_page_id`, `kind`, posisi paragraf di halaman sumber).
   - S07 membuat peta dari build pertama. Sejak rilis Fase 1, ingest hanya boleh **menambah** entri ke peta itu.
   - Unit baru (paragraf atau node hasil patch) mendapat `seq` setelah yang terbesar. Nomor tidak pernah dipakai ulang.
   - Unit yang hilang atau digabung dialihkan lewat tabel redirect korpus (`id_redirect`: `old_id` → `new_id`). Tabel ini dibuat dengan migrasi baru saat pertama kali dibutuhkan, sebelum perubahannya dirilis.
   - Pemeriksaan "ID lama masih ada atau dialihkan" terhadap manifes rilis sebelumnya dikerjakan di S10 (`corpus:promote`). **Tidak pernah dibuat di S10; diwujudkan di ingest sebagai sidik teks (ADR-059, #59).**
   - Slug karya dan edisi juga dibekukan.
4. **Permalink publik:**
   - Halaman: `/kitab/<work.slug>/<juz>/<page_no>`, misalnya `/kitab/ihya/1/200`, memakai edisi default (`edition.is_default`, tepat satu per karya, dijaga unique index parsial).
   - Edisi lain: `/kitab/<work.slug>@<edition.slug>/<juz>/<page_no>`.
   - Bagian daftar isi: `/kitab/<work.slug>/bab/<toc_node.id>`.
   - Jangkar paragraf (badan maupun catatan kaki): `#p<seq>`, dengan `seq` = `passage.id − edition_id·10⁷`, lewat fungsi `passageAnchor`.
   - Jangkar **bukan** `ord`. `ord` hanya urutan tampil dan bisa bergeser bila patch menyisipkan paragraf, padahal fragmen `#…` tidak sampai ke server, sehingga tidak bisa dialihkan.
   - Satu URL kanonis per halaman. `/kitab/ihya@<slug edisi default>/…` dan `/bab/<id>` dari edisi lain dialihkan atau ditolak (validasi kepemilikan edisi, S08/S09).
   - Privasi: kueri atau pertanyaan pengguna **tidak pernah** ditaruh di segmen path. Rute cari/tanya memakai query string (yang tidak disimpan di `feedback` maupun log).
   - Kitab satu jilid memakai juz 1.
   - Pasangan (edisi, juz, halaman) wajib unik (`page_citation`). Sumber yang punya nomor ganda atau kosong diperbaiki lewat patch di S07, tidak dibiarkan ambigu.
5. **Skema v1:** semua tabel biasa `STRICT`, dengan `CHECK` untuk enum dan formula.
   - `meta.schema_version` diisi migrasi (sekarang `1`, konstanta `CORPUS_SCHEMA_VERSION`). `norm_version`, `corpus_version`, `built_at`, dan `source_hash` diisi ingest (S07).
   - `footnote_ref` hanya menyimpan penanda yang punya catatan kaki. Offset-nya berupa indeks string JS di `text_raw`.
   - `work.attribution_status` ∈ `authentic`/`disputed`/`spurious` (docs/05 §3).
   - DB app: `settings` (`jawab_enabled` = `0`) dan `feedback` tanpa PII (`path` tanpa query string, pesan 1–2.000 karakter; dijaga Zod dan `CHECK`).
   - Bentuk normal dan peta offset tetap **tidak disimpan** (ADR-009).
6. **Repository** menerima tipe struktural `D1Db` (`prepare`/`bind`/`all`/`first`/`batch`), bukan tipe global `D1Database`, supaya `@surau/db` bisa di-typecheck dari Node (`tools/ingest`) tanpa tipe ambien Workers. Tes `d1-compat` memastikan binding asli memenuhi tipe itu. Query `IN (…)` dipecah ≤100 parameter dan dikirim dalam `batch`.
7. **DB remote** (dibuat 2026-10-15 dengan `--location apac`; ID di `packages/db/wrangler.jsonc`):
   - `surau-corpus-staging`
   - `surau-app` (produksi)
   - `surau-app-staging` (`env.staging`)
   - Korpus produksi blue-green dibuat di S10.
   - Migrasi remote diterapkan atas izin pemilik. Skrip dipisah: `db:migrate:staging` (korpus staging + app staging) dan `db:migrate:remote` (hanya `surau-app` produksi; `deploy.yml` kelak memakainya).
   - Uji di `surau-corpus-staging` membuktikan FTS5 `contentless_delete=1` dan tabel `STRICT` didukung D1 remote. Ini menutup butir "belum diuji di remote" dari riset FTS.
8. **Tes D1:** `@cloudflare/vitest-plugin` 1.4.2 di project Vitest `db` (`packages/db/vitest.config.ts`). Tes Node berada di project `node`.
   - Binding dideklarasikan lewat opsi `miniflare`, bukan `wrangler.jsonc`, supaya tes tidak pernah menyentuh remote.
   - Migrasi diterapkan di setup dengan `applyD1Migrations`.
   - Dua penyesuaian wajib:
     - `fsModuleCache: false` untuk project `db`: cache modul Vitest 5 tidak terbaca dari runner workerd.
     - Coverage v8 hanya untuk project `node`: plugin menolak perintah `__vitest_stopV8Coverage`. Akibatnya `pnpm test` = `vp test --coverage --project node && vp test --project db && smoke`.

**Ditolak:** ORM (ADR-009); tipe `D1Database` dari `@cloudflare/workers-types` di `src` (paket itu hanya ambien, tanpa ekspor modul, dan dipakai di tes saja); binding tes dari `wrangler.jsonc` (risiko `remoteBindings`); coverage `istanbul` untuk semua project (mengubah alat ukur ambang S05 di tengah fase).
**Utang teknis:**
- Integritas lintas tabel belum dijaga DB, misalnya `passage.page_id` dari edisi lain atau `footnote_ref` yang menunjuk paragraf `body`. Pemeriksaannya masuk validasi ingest S07 dan QA S10, bukan migrasi.
- `settings.updated_at` tidak berubah saat UPDATE (setter/trigger di S20).
- `packages/db/tsconfig.json` memuat tipe ambien Workers juga untuk `src`, jadi larangan `cloudflare:*` di `src` dijaga peninjau, belum oleh alat.
- Cakupan `packages/db/src` belum diukur angkanya. Semua fungsinya dipanggil tes, tetapi tanpa angka. Tinjau saat plugin mendukung coverage v8 atau saat pindah ke istanbul.
**Tinjau ulang bila:** satu edisi melewati 99.999 halaman atau 10⁷ paragraf, kitab berjilid memakai penomoran non-angka, atau plugin Cloudflare mendukung `fsModuleCache`/coverage v8.

## ADR-030 · Upgrade Next 16.4.1 + React 19.3.1 + OpenNext 1.20.12 (sesi X01); larangan ADR-003 tetap — diterima · 2026-10-16

**Konteks:** Gerbang ADR-003 terbuka: `@opennextjs/cloudflare` 1.20.12 (15 Okt 07:53 UTC) menyatakan "Add support for Next.js 16.4", issue #1448 (`loadManifest(preview-props.json)`) ditutup lewat PR opennextjs-cloudflare #1356 (perbaikan sejenis di opennextjs-aws #1285), dan `@opennextjs/aws` naik ke 4.1.11. Peer OpenNext 1.20.12 adalah `next >=15.5.28 <16 || >=16.4.1`, jadi OpenNext dan Next harus naik bersamaan. Next 16.4.1 (14 Okt) adalah rilis keamanan: GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r. Next 16.4.2 (15 Okt 20:57 UTC) hanya backport Turbopack dan docs. Blog Next 16.4 tidak memuat breaking change untuk App Router tanpa Server Actions dan tanpa `cacheComponents`.

**Keputusan:**
1. Catalog: `next` **16.4.1**, `react`/`react-dom` **19.3.1**, `@types/react`/`@types/react-dom` **19.3.0**, `@opennextjs/cloudflare` **1.20.12**. **16.4.2 tidak dipasang**: saat X01 (16 Okt ±15:00 WIB) umurnya baru ±11 jam dan isinya bukan perbaikan keamanan. Dependabot boleh mengusulkannya sebagai patch.
2. `next upgrade --agent` **tidak** dipakai: perubahan hanya kenaikan versi di catalog, tanpa codemod. Tidak ada perubahan kode aplikasi.
3. Larangan ADR-003 **dipertahankan**: tanpa `cacheComponents`/`'use cache'` (PR OpenNext #1318 masih terbuka; issue #1450 HTTP 500 dengan Cache Components), tanpa Server Actions, `proxy.ts`/`middleware.ts`, `runtime = 'edge'`, dan `images.unoptimized: true`. Larangan typed array dari Server Component (ADR-023) juga tetap, sebagai pertahanan berlapis.
4. **React RSC (GHSA-xqc2-xf4c-x3h3, GHSA-h3gv-c5rc-p453).** App Router memakai salinan React bawaan Next (`next/dist/compiled`, berlabel `19.3.0-canary-278794d7-20261002`), bukan paket `react` di catalog. Labelnya tidak berubah ke 19.3.1, tetapi kode `react-server-dom-turbopack` dan `react-server-dom-webpack` bawaan 16.4.1 berbeda dari 16.3.8 (antara lain fungsi `getBackingBlob` dari perbaikan "[Flight] Improve transport protocol" #37845 yang menjadi isi React 19.3.1). Ini **indikasi**, bukan bukti penuh, bahwa tambalan ikut; karena itu poin 3 tetap berlaku.
5. Dependabot tetap mengabaikan minor `next`/`react`/`react-dom`/`@types/react*`: minor berikutnya (16.5) kembali lewat sesi sisipan setelah OpenNext mendukung.
6. **Bukti gerbang (smoke workerd + preview):** `pnpm verify` lolos; `pnpm --filter @surau/web preview` (workerd lokal, OpenNext 1.20.12 + `@opennextjs/aws` 4.1.11) → `/` 200, `/tentang` 200, `/api/version` 200 `{"normVersion":1}`, `/tidak-ada` 404, `/icon.svg` 200, `/_next/image` 404, tanpa error di log server dan konsol; e2e 26/26 di workerd lokal, di `next dev`, dan di Preview PR #13 (CI).
7. **Log Preview tidak bisa dibaca agent:** `wrangler tail` belum mendukung Worker Previews (docs Cloudflare "Previews › Test and debug", Okt 2026), dan pemanggilan API observability dengan token OAuth wrangler ditolak pengaman mode otomatis. Penggantinya: `wrangler tail surau-web` di **produksi** setelah merge. Bila kelak log Preview wajib dibaca otomatis, pertimbangkan `previews.tail_consumers` atau token API sempit khusus observability. → Ditindaklanjuti **ADR-031** (ringkasan GraphQL di CI).
8. `.claude/launch.json` mendapat konfigurasi `web-workers` (`pnpm --filter @surau/web preview`, :3005) supaya agent bisa menjalankan preview workerd lewat panel preview.

**Ditolak:** Next 16.4.2 lewat `minimumReleaseAgeExclude` (melemahkan pengaman rantai pasok demi backport non-keamanan); mengaktifkan `cacheComponents` sekarang (#1318 belum dirilis).
**Konsekuensi:** 3 advisory Next yang mengenai 16.3.8 (673q, 2464, p3m5) tidak lagi berlaku; untuk advisory React RSC (xqc2, h3gv) lihat poin 4. `apps/web/AGENTS.md` memakai format blok agent baru Next 16.4 (ditulis ulang oleh `next dev`).
**Tinjau ulang bila:** OpenNext merilis #1318 (evaluasi `cacheComponents` lewat ADR baru), Next 16.5 dirilis dan didukung OpenNext, atau advisory baru mengenai 16.4.x.

## ADR-031 · Log Worker Preview dibaca CI lewat GraphQL Analytics (`workersInvocationsAdaptive`), bukan Tail Worker — diterima · 2026-10-16

**Konteks:** ADR-030 poin 7: agent tidak bisa membaca log Worker Preview. `wrangler tail` belum mendukung Previews (docs Cloudflare "Workers › Previews › Test and debug", diperbarui 10 Okt 2026), dan memanggil API observability memakai token OAuth wrangler di Mac ditolak pengaman mode otomatis. S09 mensyaratkan "tidak ada error di Workers Logs" untuk preview, jadi celah ini ditutup sebelum S09. Dua opsi dievaluasi: (a) langkah CI yang memakai `CLOUDFLARE_API_TOKEN` (sudah ada di secrets) untuk query GraphQL Analytics; (b) `previews.tail_consumers` ke Tail Worker kecil.

**Keputusan:**
1. Opsi **(a)**. Langkah **Ringkasan log Preview** di `preview.yml`, setelah e2e (juga bila e2e gagal), menjalankan `.github/scripts/ringkas-log-preview.sh`. Skrip itu meng-query dataset `workersInvocationsAdaptive` dengan filter `datetime_geq` (waktu sebelum `wrangler preview`), `isPreview: 1`, dan `scriptName: surau-web`. Baris lalu disaring per `previewSlug == pr-<nomor>` di jq, karena `previewSlug` hanya terdokumentasi sebagai *dimensi*, belum sebagai filter.
2. Data analytics masuk dengan jeda, jadi skrip mengulang query (maks 9 × 20 detik) sampai jumlah request > 0 dan stabil dua putaran berturut-turut.
3. Hasilnya berupa tabel status → request/error di log CI, di **Summary** job, dan di komentar preview PR yang sama (diperbarui, bukan komentar baru). Bila smoke test gagal, komentar URL tidak ditulis, sehingga ringkasan hanya ada di log CI dan Summary. Agent membacanya lewat `gh pr view <n> --comments` atau `gh run view <id> --log`. Angkanya adalah **angka minimum**: data yang masuk sangat terlambat (setelah dua putaran stabil) tidak ikut terhitung.
4. **Kebijakan gagal:** job merah hanya bila ada invocation berstatus selain `success`/`clientDisconnected` (`scriptThrewException`, `exceededResources`, `internalError`). `clientDisconnected` hanya *notice*, karena Playwright wajar membatalkan navigasi atau prefetch. Token tanpa izin (pesan otorisasi), gangguan jaringan/HTTP, atau data belum masuk hanya memberi *warning*, supaya PR tidak merah karena hal di luar kode. Penolakan GraphQL lain (validasi/skema, misalnya bila `isPreview`/`previewSlug` berubah) membuat job **merah**, karena itu bug skrip yang harus diperbaiki. Pesan dari API dipotong satu baris (maks 300 karakter) sebelum masuk komentar PR publik. Token dikirim ke curl lewat `-H @<(printf …)`, bukan argumen baris perintah. Job `preview` bukan check wajib `main` (yang wajib hanya `verify`).
5. **Izin token:** GraphQL Analytics butuh *Account › Account Analytics › Read*, yang tidak ada di daftar izin T-06. Tugas pemilik **T-21** menambahkan izin itu ke token yang sama. Sebelum T-21 selesai, langkah ini hanya memberi peringatan yang menyebut T-21.
6. **Keterbatasan (bukti parsial):** dataset ini hanya punya status *invocation*, tanpa dimensi status HTTP (docs "Metrics and analytics": status invocation berbeda dari kode HTTP). Exception yang ditangkap Next lalu dikembalikan sebagai HTTP 500 tetap tercatat `success`, dan `console.error` tidak terhitung. Pesan error lengkap (stack) juga **tidak** ikut, karena GraphQL hanya memberi jumlah per status. Bila jumlah gagal > 0, pesan error menunjuk dashboard (Workers → surau-web → Previews → pr-<n> → Logs), yang bisa dibaca pemilik. Log Preview sudah dinyalakan lewat `previews.observability` di `wrangler.jsonc` (S03).

**Ditolak:**
- (b) Tail Worker: perlu Worker baru beserta tempat menyimpan event (KV/R2/D1) dan endpoint baca yang dijaga, lalu agent tetap butuh akses baca ke sana. Lebih banyak permukaan dan biaya daripada satu query.
- API Workers Observability `telemetry/query`: memberi pesan log lengkap, tetapi docs API mencantumkan izin *Workers Observability Write* (lebih luas dari sekadar baca), dan kunci filter untuk memisahkan Preview dari produksi belum terdokumentasi.
- Token OAuth wrangler di Mac agent: ditolak pengaman, dan memang sebaiknya tidak dipakai di luar `wrangler`.

7. Query belum pernah dijalankan ke API sungguhan saat ADR ini ditulis (token belum punya izin; OAuth wrangler ditolak pengaman). Verifikasi pertama terjadi di PR pertama setelah T-21. Bila skema ternyata berbeda, poin 4 membuat job merah, sehingga tidak lolos diam-diam.
8. **Temuan run pertama (PR #16, 2026-10-16):** query diterima (skema cocok, T-21 berlaku), tetapi semua baris Preview berisi `previewSlug: "__unknown__"`, sehingga saringan `pr-16` kosong. Perbaikan: bila tidak ada baris dengan slug persis, skrip memakai baris `__unknown__` dan menandainya di ringkasan (*notice* + kalimat di komentar), karena bisa tercampur trafik Preview lain yang masih hidup di jendela waktu yang sama (PR terbuka mana pun, crawler, pemilik yang sedang membuka preview). Kebijakan merah tetap berlaku untuk baris cadangan: melewatkan error sungguhan lebih berbahaya daripada alarm palsu yang jarang; pesan `::error` lalu menyebut bahwa asalnya baris `__unknown__`. Begitu slug persis terlihat dalam satu run, cadangan tidak dipakai lagi. Setiap putaran juga mencetak jumlah request per slug untuk diagnosis. Bila Cloudflare kelak mengisi slug, saringan persis otomatis dipakai lagi.

**Konsekuensi:** Setiap PR dari repo ini mendapat ringkasan request/error Preview, setelah T-21 selesai. Untuk butir "tidak ada error di Workers Logs" (S09 dan seterusnya), tabel ini adalah bukti **sebagian**: baris selain `success`/`clientDisconnected` harus kosong, **ditambah** e2e/smoke yang memeriksa status HTTP rute yang diuji. Ini bukan pengganti penuh Workers Logs (lihat poin 6). Kriteria S09 tidak diubah; bila butuh bukti 5xx/`console.error`, cek dashboard atau evaluasi `telemetry/query`. Langkah ini menambah ±1–3 menit per run preview.
**Tinjau ulang bila:** `wrangler tail` mendukung Previews, `previewSlug` terisi atau didokumentasikan sebagai filter, atau sesi butuh isi pesan error otomatis (saat itu evaluasi `telemetry/query` dengan token sempit).


## ADR-032 · Importer Ihya (S07): keluaran build, `passage_needs_review`, pemisahan takhrij `//`, daftar isi + patch, peta ID — diterima · 2026-10-16

**Konteks:** S07 membangun `tools/ingest` (Shamela 9472 → korpus D1). Beberapa temuan di data nyata menuntut keputusan yang belum ada di rencana, dan ada dua penyimpangan dari teks sesi yang ditulis terbuka di sini.

**Keputusan:**
1. **Keluaran build** (`pnpm ingest ihya`, ±3 detik):
   - `data/build/sql/NNNN-<tabel>[-kk].sql`: INSERT multi-baris ≤90 KB per statement, ≤2 MB per file, tanpa `BEGIN`/`COMMIT`, tabel induk lebih dulu, `toc_node` dalam urutan DFS (induk sebelum anak). File `0000-reset.sql` mengosongkan korpus (anak dulu; `meta.schema_version` dipertahankan) supaya pemuatan bisa diulang. `translation`/`summary` sengaja tidak dihapus: bila sudah berisi (S13+), foreign key membuat pemuatan ulang **gagal**, bukan diam-diam membuang hasil batch.
   - `data/build/surau-corpus-ihya-v1.sqlite`: migrasi korpus yang sama (`packages/db/migrations/corpus`) + file SQL di atas lewat `node:sqlite` (SQLite 3.53.4, FTS5 ada), lalu `foreign_key_check`, `integrity_check`, dan `VACUUM`.
   - sha256 gabungan file SQL (terurut, nama + isi) + `.sqlite` ditulis ke `data/build/<korpus>.sha256`. Hash ini **tidak** masuk laporan yang di-commit, karena `built_at` ikut tanggal commit HEAD (laporan akan berubah di setiap commit).
   - Determinisme: dua build dari `data/build` kosong pada HEAD yang sama menghasilkan hash identik (dibuktikan di S07 dan di tes).
2. **Tabel baru `passage_needs_review`** (migrasi korpus 0002, lalu 0003 setelah peninjauan; `schema_version` 3). Skema v1 belum punya tempat untuk tanda `needs_review` yang diwajibkan ADR-018. Kolomnya (`passage_id`, `reason`), dengan `reason` salah satu dari:
   - `takhrij_inline`: takhrij menempel yang dipotong dari matan;
   - `takhrij_boundary`: potongan matan di sebelahnya, karena batasnya ditebak;
   - `takhrij_unmatched`: catatan kaki yang tidak ditemukan di JK000001 halaman itu;
   - `inline_unsplit`: paragraf memuat `//` tetapi takhrijnya tidak dikenali;
   - `footnote_orphan`: catatan bawah halaman yang tidak dirujuk penanda matan mana pun.

   Satu paragraf bisa punya lebih dari satu alasan. Migrasi 0003 membuat ulang tabelnya, karena CHECK tidak bisa diubah dan migrasi 0002 sudah diterapkan ke staging; isi tabel ini turunan ingest, jadi tidak ada yang hilang. Ini tanda dari pipeline, **bukan** hasil review: hasil review manusia tetap di DB app (ARSITEKTUR §3.2). Repository untuk membacanya ditambahkan saat dibutuhkan (S08/S09).
3. **Takhrij yang menempel lewat `//`** (`splitInlineTakhrij` di `@surau/text`). Temuan: 203 halaman, masing-masing satu `//`. Arahnya **tidak** selalu "takhrij sesudah `//`" seperti dugaan awal:
   - 130 sesudah `//` (dibuka "حديث");
   - 64 sebelum `//` (matan berlanjut sesudahnya);
   - 9 tanpa takhrij yang bisa dikenali.

   Aturan pemisahan:
   - Sesudah `//`: takhrij = dari `//` sampai akhir paragraf. Akhir takhrij tidak ditandai di sumber, dan JK000001 punya cacat yang sama (dicek di j4 h171), jadi 23 potongan ≥400 karakter mungkin ikut membawa matan. Semuanya tercantum di laporan validasi.
   - Sebelum `//`: mundur dari `//` lewat kandidat pembuka (penanda `(n)`, atau "حديث" yang tidak didahului من/في/عن…) selama setiap potongan memuat atribusi takhrij (أخرج/اخرج/رواه/متفق عليه/إسناد/لم أقف/…). Awal paragraf ikut diambil hanya dengan atribusi kuat, dan hanya bila tidak ada kandidat yang ditolak di depannya. **Penanda `(n)` yang membuka takhrij tetap di matan**, karena penanda itu milik matan dan merujuk catatan bawah bernomor sama (53 kasus). Bila catatan bawah bernomor itu tidak ada, penanda ditautkan ke takhrij yang dipotong.
   - Arah "sesudah" sengaja tidak mensyaratkan kata atribusi: ke-130 kasusnya memang takhrij, dan 7 di antaranya ("عزاه …", "لم أقف له على أصل") akan gagal dipisah bila syarat itu dipakai.
   - Tidak dikenali: paragraf **tidak** dipecah dan `//` tetap di `text_raw`.
   - Bila dipecah, `//` dibuang sebagai pemisah (sama seperti `\r` dan garis `_________`); teks lain tetap persis.
   - Potongan takhrij menjadi paragraf `foot` (sesudah catatan bagian bawah halaman) dengan alasan `takhrij_inline`; potongan matan di sebelahnya diberi `takhrij_boundary`.
   - **Dampak ke tautan catatan kaki:**
     - 4.117 penanda tertaut. 87 penanda lain ada di tengah blok takhrij yang dipotong; teksnya tetap utuh di paragraf takhrij, tetapi tidak ditautkan. 4.117 + 87 = 4.204, sama dengan hitungan S05.
     - 87 catatan bawah yang nomornya hanya muncul di dalam blok itu menjadi tak terjangkau dari matan. Semuanya ditandai `footnote_orphan`; isinya sering matan yang tergeser ke bagian bawah (contoh j1 h71).
     - Invarian "penanda tidak hilang" memastikan setiap penanda ada di matan atau di potongan takhrij.
4. **Paragraf catatan kaki = satu catatan bernomor** (`splitFootnoteEntries`), bukan satu baris. 220 catatan memanjang beberapa baris; baris barunya diseragamkan ke `\n`, karena `\r` tidak dianggap baris baru oleh CSS.
5. **Cek silang takhrij (JK000001):** JK dipecah per halaman di ` + `. Segmen dianggap takhrij bila dibuka "حديث" atau menyebut sumbernya. Skor sebuah catatan = bagian bigram token (setelah `normalizeArabic`) yang ada di satu segmen. Skor <0,6, atau catatan kurang dari 3 token, ditandai `takhrij_unmatched`. Hasil Ihya: 190 dari 4.398 catatan. Ukuran bigram dipilih karena segmen JK bisa menggabung beberapa takhrij (pasangan ` + ` tidak andal).
6. **Gerbang matan:** kemiripan per halaman = 2·LCS token / jumlah token (Myers O(ND); halaman di bawah ambang dihitung ulang tanpa batas jarak, jadi angkanya pasti), dibandingkan dengan teks badan Shamela sebelum `//` dipisah, karena OpenITI memuat cacat yang sama. Hasilnya 1.705/1.706 halaman ≥0,95. Satu-satunya pengecualian, j3 h116 (0,535), memuat 100% token matan Shamela secara berurutan; OpenITI menambahkan 388 token, yaitu takhrij halaman itu yang ditulis di dalam baris.
7. **Daftar isi:**
   - Posisi judul diambil dari span `toc-N` di teks. Judul tanpa span (t1, t2) dimulai di awal `title.page`.
   - Paragraf ikut judul terakhir yang dimulai di/sebelum paragraf itu. Bila beberapa judul dimulai di paragraf yang sama, node terdalam yang dipakai. Span judul **induk** yang muncul sesudah span judul anaknya yang sedang berjalan (Shamela menulis "كتاب … وهو الكتاب الأول من ربع …") tidak memindahkan paragraf ke induk.
   - Paragraf **tidak** dipotong di span judul, karena Shamela juga menaruh span di kolofon ("يتلوه … كتاب …").
   - "Urutan monoton" dicek per halaman, bukan per paragraf.
   - Catatan kaki ikut paragraf badan pertama yang merujuknya; takhrij menempel ikut paragraf asalnya; sisanya ikut paragraf badan terakhir di halaman.
   - Patch YAML (`data/patches/ihya-9472.yaml`, parser `yaml` 2.9.1 yang ketat: kunci ganda, alias, dan kunci asing ditolak) hanya berisi `add` dan `move`. Node `add` diberi kata pembuka (`heading`), dan judulnya **disalin** dari paragraf halaman yang dibuka kata itu (`findQuote`, harus di awal paragraf). Teks Arab tidak pernah diambil dari patch.
   - Setiap node yang ditambah atau dipindah ditandai `patched`.
   - Metadata karya/edisi dan harapan validasi (1.706 halaman, 4 rub' × 10 kitab, gerbang ≥1.705) ada di `tools/ingest/src/works/ihya.ts`, bukan di patch.
8. **Peta ID** `data/ids/ihya-9472.json` (format 1, ADR-029 butir 3; satu entri per baris, urut seq):
   - Kunci halaman = `page.id` Shamela.
   - Kunci node = `t<title.id>` atau `patch:<id>`.
   - Kunci paragraf = `<page.id>:<kunci di halaman>`, posisional:
     - `b<baris>`: baris badan ke-n, atau matan di **depan** takhrij/`//` bila baris dipecah;
     - `b<baris>.1`: matan **sesudah** `//`;
     - `t<baris>`: takhrij menempel;
     - `f<n>`: catatan ke-n di bagian bawah halaman.

     Peta dibangun ulang (`--reset-ids`) setelah arti kunci ini diperbaiki atas temuan peninjau.

   Konsekuensinya: menyisipkan baris di tengah halaman sumber menggeser kunci baris sesudahnya. Hal ini diterima sebelum rilis Fase 1, lalu dicek manifes di S10. Opsi `--reset-ids` hanya untuk sebelum rilis.
   - **Penyimpangan dari teks sesi:** butir "Selesai bila" S07 menyebut `git ls-files data/` hanya berisi LICENSE/ATTRIBUTION/SOURCES/patches/reports. Peta ID di `data/ids/` (tanpa teks kitab) diwajibkan ADR-029 yang lebih baru, jadi ikut di-commit. Butir itu dicatat apa adanya di Catatan hasil S07, tanpa mengubah kriterianya.
9. **ID dan metadata:**
   - `author.id` = 1, `work.id` = 1 (`slug` `ihya`, `openiti_uri` `0505Ghazali.IhyaCulumDin`), `edition.id` = 1 (`slug` `dar-al-marifah`, default).
   - Nama, judul, penerbit (`دار المعرفة`), dan kota (`بيروت`) disalin dari `book.sqlite`/`author.sqlite`. `volumes` = jumlah juz.
   - `wikidata_id` dibiarkan kosong (tidak ditebak).
   - `meta.source_hash` = `sha256:<sha256 9472.db>`. Teks sesi menyebut `source_sha256`; dipakai nama kunci dari skema S06 (`corpusMeta`, ARSITEKTUR §3.1).
   - `meta.built_at` = `SOURCE_DATE_EPOCH` atau tanggal commit HEAD (UTC).
10. **Pemuatan D1** (`pnpm corpus:load:local` / `corpus:load:staging --confirm`):
    - Urutannya: migrasi korpus, lalu setiap file SQL lewat `wrangler d1 execute --file` (per file atomik), lalu smoke query (jumlah baris dan j1 h200). Belum ada perbandingan sampel acak (ARSITEKTUR §6 langkah 8; S10).
    - Pemuatan remote wajib memakai `--confirm` sebagai penanda bahwa izin pemilik sudah ada.
    - D1 menolak `UNION ALL` panjang ("too many terms in compound SELECT"), jadi hitungan baris memakai satu SELECT dengan subkueri.
    - `0000-reset.sql` mengosongkan **seluruh** DB korpus. Kitab kedua butuh reset per edisi, dan `passage_fts` wajib ikut dikosongkan begitu S11 mengisinya.
11. **Invarian dan penjaga:**
    - Selain 9 invarian struktur dan gerbang matan, ingest gagal bila ada penanda yang hilang saat takhrij dipisah, atau bila integritas lintas tabel rusak (serah terima S06): edisi halaman dan node harus sama dengan edisi paragraf, dan `footnote_ref` harus menunjuk dari paragraf badan ke catatan kaki di halaman yang sama.
    - Keluaran build lama dihapus di awal build, supaya SQL usang tidak termuat bila validasi gagal.
    - Setiap hapus/tulis berkas keluaran lewat `assertWritable`: symlink diurai dan huruf besar-kecil tidak dibedakan, sehingga apa pun di bawah `/Volumes/` ditolak.

**Ditolak:**
- Memotong takhrij "sesudah `//`" dengan bantuan JK000001: JK punya cacat yang sama dan tidak menandai akhir takhrij.
- Menyimpan `needs_review` hanya di laporan: UI (S09) dan tool MCP takhrij perlu membacanya per paragraf.
- Memecah paragraf di posisi span judul: span sering ada di kolofon kitab sebelumnya.
- Kunci paragraf berbasis offset karakter: satu salah ketik yang diperbaiki di sumber akan menggeser semua kunci sesudahnya di halaman itu.

**Tinjau ulang bila:** ustadz/peninjau menemukan pola batas takhrij yang lebih baik (perbaikan lewat patch per paragraf), Shamela memperbarui kitab 9472 (sha256 di `data/SOURCES.md` berubah), atau kitab kedua masuk (pindahkan konfigurasi `works/` ke pola yang lebih umum).

## ADR-033 · Core tools baca (S08): kontrak keluaran, sitasi, error bertipe, paginasi `readSection` per blok — diterima · 2026-10-16

**Konteks:** S08 membuat `packages/core` (`@surau/core`), satu-satunya pintu baca untuk web (S09), MCP (S16), dan Jawab (S19). Bentuk keluarannya akan menjadi kontrak MCP, jadi beberapa hal yang belum dirinci di ARSITEKTUR §4 harus diputuskan sekarang. Data nyata (Ihya di D1 lokal): halaman terbesar ±4.800 karakter, rata-rata ±3.200; paling banyak 41 paragraf per halaman; 0 penanda yang menunjuk catatan kaki milik bagian lain.

**Keputusan:**
1. **Bentuk keluaran** (skema Zod di `src/schema.ts`, contoh JSON di README paket):
   - Nama field `snake_case`, sama dengan kolom DB dan JSON MCP. Deskripsi field berbahasa Inggris karena ikut ke JSON Schema tool MCP; penjelasan Indonesia di README.
   - `Citation` = `source` (karya + penulis + edisi + lisensi + atribusi) + `location` (`juz`, `page_no`, `permalink`, `label`). `Passage` = `id`, `anchor` (`p<seq>`), `kind`, `ord`, `toc_node_id`, `text_raw` (persis dari DB), `footnote_refs` (penanda → `footnote_id`), `needs_review` (alasan ADR-032), `location`.
   - Permalink berupa path tanpa origin, karena domain belum diputuskan (P-2): web/MCP menambahkan origin. Edisi non-default memakai `@<edisi>`, jangkar `#p<seq>` (ADR-029).
   - `label` = `"<title_id>, j. N, h. M"`, ditambah `(<slug edisi>)` untuk edisi non-default. Slug dipakai, bukan nama penerbit, karena penerbit bisa berhuruf Arab dan membuat label Latin berarah campuran.
   - `is_default` dan `patched` menjadi boolean di kontrak (di DB tetap 0/1).
2. **"Setiap keluaran punya Citation lengkap"** ditafsirkan begini, dan ditulis terbuka:
   - `readPage`, `readSection`, dan `getToc` punya field `citation` (halaman, awal potongan, atau awal node pertama), dan setiap node daftar isi punya `start`.
   - Setiap paragraf membawa `location` saja, bukan `Citation` penuh. Sitasi penuhnya = `citation.source` keluaran itu + `location`, atau `buildCitation`. `source` Ihya = 514 karakter (±260 token perkiraan); menyalinnya ke setiap paragraf menambah ±7.700 token pada potongan 30 paragraf, lebih besar daripada batas potongan itu sendiri.
   - `listWorks`/`getWork` tidak berhalaman, jadi tidak punya `citation`; lisensi dan atribusi ada di setiap edisi.
3. **Tanda tangan fungsi** sedikit berbeda dari tabel ARSITEKTUR §4 (tabelnya diperbarui):
   - D1 menjadi parameter pertama semua fungsi (`readPage(db, editionId, juz, pageNo)`).
   - `getToc(db, editionId, { nodeId?, depth? })`: objek opsi, bukan dua parameter opsional berurutan. `depth` bawaan 2 (Ihya: 5 akar + 40 kitab, ±6 ribu token perkiraan), maks. 10, dan `child_count` memberi tahu anak yang tidak dikirim. Daftar isi utuh Ihya (313 node) diperkirakan ±43 ribu token, terlalu besar untuk satu hasil MCP.
   - `buildCitation(db, passageId)`, bukan `buildCitation(passage)`, karena Jawab (S19) hanya memegang ID paragraf.
   - `readSection` memuat node **beserta seluruh subpohonnya**. Node kitab atau rub' berisi hampir semua teksnya di node anak, jadi membaca hanya paragraf node itu sendiri tidak berguna.
4. **Error bertipe** (`src/errors.ts`):
   - `NotFound` (`not_found`) untuk alamat sah yang tidak ada, termasuk node edisi lain di `getToc`.
   - `InvalidCitation` (`invalid_citation`) untuk alamat salah bentuk, termasuk cursor rusak/milik node lain dan `depth` di luar batas. Masukan divalidasi dengan skema Zod yang sama yang diekspor untuk route dan MCP (`parseInput`, isu pertama saja).
   - Pesan berbahasa Inggris (kontrak publik), hanya menyebut alamat yang diminta. apps/* memetakan `code` ke 404/400 dan ke string UI Indonesia. Error lain (ZodError baris DB, D1 gagal) tidak dibungkus.
   - Validasi kepemilikan edisi untuk URL `/kitab/<karya>/bab/<id>` (ADR-029 butir 4) tetap di S09: `SectionView.citation.source` memuat `work.slug` dan `edition.id`/`is_default` untuk pemeriksaan itu.
5. **Paginasi `readSection`:**
   - Satuan potong = **blok**: satu paragraf badan + catatan kaki di halaman yang sama yang pertama kali dirujuknya. Catatan kaki yang tidak dirujuk paragraf badan mana pun di bagian itu (yatim, takhrij yang dipotong dari matan) ikut blok terakhir halamannya. Halaman tanpa paragraf badan menjadi satu blok catatan kaki. Paragraf tidak pernah dipotong, dan penanda selalu satu potongan dengan catatan kakinya.
   - Ukuran = perkiraan **1 token ≈ 2 karakter JSON keluaran** (`estimateTokens`). Angka ini konservatif untuk teks Arab dan melebih-lebihkan bagian ASCII. Belum dikalibrasi dengan `count_tokens` Anthropic, karena butuh kunci API; kalibrasi dijadwalkan di S16.
   - Aturan: blok diisi selama ≤ 6.000 token (blok pertama selalu ikut), lalu potongan diakhiri di **batas halaman cetak terakhir yang sudah ≥ 4.000 token**. Bila tidak ada batas halaman di rentang itu, potongan diisi sampai batas atas dan halaman terbelah di antara blok. Di dalam satu potongan, setiap halaman tampil badan dulu, lalu catatan kakinya.
   - Percobaan pertama memotong hanya di batas halaman. Hasilnya pada bagian terpanjang Ihya (Rub' al-Munjiyat, 1,68 juta karakter): 323 potongan, median 4.563 token, dan 38% di bawah 4.000, karena satu halaman Ihya rata-rata ±3.500 token. Dengan blok: 278 potongan, p5 4.143, median 5.278, maks 5.997, hanya 4 potongan di bawah 4.000.
   - Cursor v1 = base64url JSON `{v, n, j, p, o}` (node, juz, halaman, `ord` paragraf badan berikutnya; 0 = awal halaman), selalu divalidasi ulang. Format ini belum dirilis, jadi boleh berubah sebelum S16.
   - Per panggilan diambil ≤ 201 baris dari awal halaman cursor (keyset `(juz, page_no) >= (?, ?)`). Bila lebih dari 200, halaman terakhir yang mungkin terpotong dibuang dan menjadi awal potongan berikutnya. Satu halaman dengan >200 paragraf di satu bagian melempar error internal (Ihya maks. 41). Jalur ini diuji lewat `readSectionWithLimit` (batas baris kecil, tidak diekspor dari index), karena dengan 200 baris jalur itu praktis tidak tercapai.
   - Catatan kaki tanpa `footnote_ref` (takhrij menempel `//` yang dipotong dari matan) ikut blok **terakhir** halamannya, bukan paragraf asalnya: hubungan asal itu tidak disimpan di DB. Di halaman yang terbelah, takhrij seperti ini bisa muncul satu potongan sesudah matannya. Simpan hubungannya di DB bila Jawab (S19) membutuhkannya.
6. **SQL tetap di `@surau/db`:** `getEditionContext`, `listEditions`, `listWorkAuthors`, `listTocNodes`, `getSectionPassages`, `getPassageById`, `getNeedsReview` (repository `passage_needs_review` yang dijanjikan ADR-032 butir 2).
   - `getSectionPassages` memakai recursive CTE untuk subpohon, sehingga tidak ada daftar `IN (…)` yang melewati 100 parameter.
   - Konsekuensinya, setiap panggilan membaca semua paragraf subpohon sebelum `LIMIT` (Rub': ±4.600 baris). Untuk sekarang ini dapat diterima; tinjau ulang bila biaya *rows read* D1 terasa.
   - Urutan tampil tetap dari (`juz`, `page_no`, `kind`, `ord`), tidak pernah dari ID (ADR-029 butir 2).
7. **Tes:**
   - Project Vitest `core` (workerd) memakai migrasi korpus `packages/db` dan fixture S06, ditambah satu bagian panjang sintetis: 6 halaman kecil yang menguji potongan berbatas halaman, dan 6 halaman besar yang menguji halaman terbelah.
   - Tes integrasi Ihya (`packages/core/test/local/ihya.test.ts`) berjalan di project `node` lewat `getPlatformProxy`, pada **salinan** `.wrangler/state/v3` di folder sementara. Alasannya, beberapa proxy pada state yang sama bisa gagal `SQLITE_BUSY`, dan tes tidak boleh menulis ke DB dev. `persist.path` wajib berakhiran `v3`, karena proxy tidak menambahkannya sendiri seperti CLI. Tes dilewati bila state tidak ada (CI) atau Ihya belum dimuat.
   - Cakupan baris `packages/core` belum terukur, sama dengan `packages/db` (ADR-029).
   - `@surau/text` sudah menjadi dependensi sesuai rencana S08, tetapi belum diimpor; `verifyQuote` (S11) akan memakainya.
   - Fixture core mengimpor fixture S06 lewat path relatif lintas paket (`../../db/test/fixture.ts`). Ini sengaja, supaya ada satu fixture dasar; pindahkan bila struktur paket berubah.
8. **Perbaikan di luar cakupan, ditulis terbuka:** `apps/web/next.config.ts` memberi `initOpenNextCloudflareForDev` path `.wrangler/state` tanpa `v3`. Akibatnya state dev web (R2, cache) berada di `.wrangler/state/{r2,cache}`, dan D1 web kelak akan kosong, bukan Ihya yang dimuat `corpus:load:local`. Opsi itu diteruskan apa adanya ke `getPlatformProxy` (dicek di kode OpenNext 1.20.12). Path diganti ke `.wrangler/state/v3` dan ARSITEKTUR §7 aturan 1–2 diperbarui. `pnpm dev` dicek masih jalan; state dev kini ada di `.wrangler/state/v3/{cache,d1,r2}`. Folder lama `.wrangler/state/{r2,cache}` hanya cache lokal dan boleh dihapus.
9. **Utang yang dicatat:** penanda yang menunjuk catatan kaki milik node daftar isi lain belum dijaga invarian ingest (Ihya: 0 kasus). Di kitab berikutnya, penanda seperti itu akan tampil di `readSection` tanpa catatan kakinya; tambahkan invarian di `tools/ingest/src/validate.ts` saat kitab kedua masuk.

**Ditolak:**
- Potongan hanya di batas halaman: 38% potongan di bawah 4.000 token pada Ihya.
- Potongan per paragraf tanpa blok: penanda bisa terpisah dari catatan kakinya.
- Sitasi penuh di setiap paragraf: menambah ribuan token per potongan (butir 2).
- Cursor berbasis offset karakter atau ID paragraf: ID bukan urutan tampil (ADR-029).
- Menghitung token lewat API saat runtime: berbayar/berkunci dan menambah latensi.

**Tinjau ulang bila:**
- Kalibrasi `count_tokens` (S16) menunjukkan rasio karakter/token jauh dari 2.
- Klien MCP butuh batas ukuran lain.
- Ada kitab dengan paragraf di atas ±6 ribu token.
- Biaya *rows read* D1 dari `getSectionPassages` terasa.

## ADR-034 · UI pembaca (S09): rute ISR on-demand, pembaca tertutup di produksi, takhrij HoverCard/Popover, laporan berpengaman, `keep_names: false` — diterima · 2026-10-16

**Konteks:** S09 membangun pembaca Ihya di `apps/web` di atas `@surau/core` (ADR-033). Fakta lapangan 16 Okt 2026:
- Next 16.4.1 tanpa `cacheComponents` masih mendukung ISR on-demand: `revalidate = false` + `generateStaticParams` yang mengembalikan `[]`. Render pertama MISS, berikutnya HIT. Hasil 404 dan redirect ikut di-cache sampai deploy berikutnya.
- OpenNext 1.20.12 punya issue #1455 (terbuka): setiap render ISR di workerd menahan ±1,4 MB heap per render (halaman 600 KB) sampai isolate diganti. Perbaikannya ada di PR #1456, belum dirilis.
- CI tidak punya D1. Halaman tanpa parameter atau sitemap yang di-prerender saat build akan membaca D1 kosong.
- T-10 (sumber teks & lisensi, P-6) belum dijawab pemilik, dan korpus produksi baru dibuat di S10.

**Keputusan:**
1. **Rute** (permalink ADR-029):
   - `/kitab`: daftar karya, `force-dynamic` (satu query kecil).
   - `/kitab/[work]`: halaman karya dengan edisi, lisensi, atribusi, dan daftar isi.
   - `/kitab/[work]/[juz]/[page]`: halaman cetak.
   - `/kitab/[work]/bab/[id]`: **307** ke halaman awal bagian dengan jangkar `#bab-<id>`. Bukan 308, karena awal bagian bisa bergeser bila patch daftar isi berubah.
   - Segmen `[work]` menerima `ihya` (edisi default) dan `ihya@<edisi>`. `ihya@<slug edisi default>` dialihkan **308** ke URL kanonis dengan sisa path yang sama; edisi milik karya lain = 404.
   - Angka juz/halaman/ID divalidasi `uintSegment` sebelum dipakai di URL pengalihan. `01` atau `1e2` = 404.
   - Error core dipetakan: `NotFound` dan `InvalidCitation` → 404 (`notFound()`); error lain → `error.tsx` (`retry`).
2. **ISR on-demand** untuk tiga rute dinamis: `revalidate = false`, `dynamicParams = true`, `generateStaticParams = []`.
   - Tidak ada render saat build, jadi CI tidak butuh D1. Render pertama saat dibuka, lalu disimpan di cache R2 (ADR-026) sampai deploy berikutnya.
   - `getCloudflareContext({ async: true })` dipanggil di dalam fungsi, tidak pernah di top-level modul.
   - `sitemap.xml` `force-dynamic` dengan origin dari host permintaan. Isinya: `/`, `/tentang`, `/kitab`, halaman karya, dan 1.706 halaman cetak edisi default lewat `@surau/db` `listPages` (fungsi baru). Bagian `/bab/<id>` tidak dicantumkan karena itu pengalihan. `robots.txt` statis: semua boleh kecuali `/api/`.
   - Diukur di Preview PR #21 (halaman yang belum pernah dibuka):
     - TTFB dingin 0,71–1,02 dtk (MISS), hangat 0,10–0,18 dtk (HIT).
     - HTML j1 h200 ±200 KB mentah, ±28 KB gzip.
   - **Risiko diterima, dengan batas yang ditulis jujur** (koreksi dari peninjau):
     - Ruang path ISR **tidak terbatas**: `/kitab/<apa saja>`, `/kitab/ihya/1/<0..999999999>`, `/kitab/ihya/bab/<angka>`. Setiap path baru, termasuk yang berakhir 404, memicu satu render Worker dan satu tulis cache R2 (operasi Class A), lalu 404-nya ikut di-cache.
     - Ini sudah berlaku di **produksi sejak merge**, walau `READER_ENABLED = "0"`, karena `notFound()` terjadi di dalam render ISR. Sebelum S09, `/kitab/*` jatuh ke 404 statis.
     - Setiap render ISR juga menahan heap (#1455). Path sah Ihya sekitar 2.000 per deploy, tetapi pemindai/bot bisa membuat path unik tanpa batas. Isolate diganti otomatis saat mendekati 128 MB; error 1102 hanya di beban sangat tinggi.
     - Mitigasi sekarang: pantau R2 Class A ops dan grafik memori Worker di dashboard. Mitigasi berikutnya:
       - aturan rate limit/WAF untuk `/kitab/*` saat domain sendiri siap (P-2, WAF butuh zona);
       - naikkan OpenNext saat #1456 dirilis.
     - Ruang path tidak dipersempit (mis. folder literal `ihya` atau `dynamicParams = false`), karena keduanya memutus permalink edisi `ihya@<edisi>` (ADR-029) atau butuh D1 saat build.
3. **Binding:**
   - `CORPUS_DB` dan `APP_DB` dengan `database_id` **eksplisit** di top-level dan di `previews`. ID-nya sama dengan `packages/db/wrangler.jsonc`, jadi `next dev` membaca D1 lokal yang dimuat `corpus:load:local`.
   - Produksi menunjuk `surau-corpus-staging` + `surau-app`. Preview menunjuk `surau-corpus-staging` + `surau-app-staging`.
   - **Pembaca ditutup di produksi** lewat `vars.READER_ENABLED = "0"` (Preview `"1"`; `next dev` selalu terbuka). Saat tertutup:
     - `/kitab` menampilkan "segera hadir";
     - `/kitab/*` dan `/api/feedback` = 404;
     - sitemap tanpa halaman kitab.
   - Alasannya: korpus produksi (S10), QA, dan T-10 belum ada. Membukanya cukup dengan mengubah satu `vars` di S10/`/rilis 1`.
   - **Menutup/membuka harus lewat commit + `deploy.yml`**, bukan dashboard atau `wrangler versions`. Halaman ISR yang sudah HIT dilayani dari cache R2/regional tanpa menjalankan `readerEnabled()`, dan hanya build baru (BUILD_ID baru) yang memulai cache dari nol. Prosedur tutup darurat (mis. bila Shamela keberatan, T-10) ditulis di S10.
   - `wrangler types --strict-vars=false`, supaya `READER_ENABLED` bertipe `string`, bukan literal `"0"`.
   - Secret `IP_HMAC_KEY` tidak dibuat `wrangler types`, jadi tipenya ditulis di `apps/web/env.d.ts` (opsional).
4. **Halaman baca:**
   - Setiap paragraf adalah `ArabicText` dengan `id="p<seq>"`.
   - Penanda `(١)` dipotong **hanya di offset `footnote_ref`** (`splitByFootnotes`, diuji: gabungan potongan = `text_raw`). Teks penanda dan teks takhrij keduanya `text_raw` dari DB.
   - Perangkat ber-hover (`(hover: hover) and (pointer: fine)`) memakai HoverCard Pro, yang juga terbuka saat diklik. Ponsel/sentuh memakai Popover.
   - Span pemicu HoverCard sendiri dijadikan tombol (`role="button"`): HoverCard memasang `aria-expanded` di span itu, dan tombol bersarang di dalamnya melanggar axe `aria-allowed-attr`.
   - Catatan kaki juga tampil di daftar bawah halaman (jangkar `#p<seq>`, tautan "kembali ke teks"), lengkap dengan tanda `needs_review` dan penjelasan bahwa tanda itu hasil pemeriksaan otomatis, bukan tinjauan.
   - Paragraf yang teksnya sama persis dengan judul node yang mulai di halaman itu ditampilkan sebagai `h2`. Ini hanya soal tampilan; teksnya tetap `text_raw`.
   - Navigasi halaman mengikuti arah kitab Arab: **Berikutnya di kiri / ←**, **Sebelumnya di kanan / →**. Tombol panah diabaikan di kolom isian, menu, dialog, dan pohon. Baris alat baca sengaja bukan `role="toolbar"`, karena pola itu memakai ←/→ untuk berpindah antar-kontrol.
   - Daftar isi memakai `FileTree` Pro (313 node; leluhur bagian aktif terbuka, panel menggulir sendiri ke bagian aktif) di samping (≥ lg) dan di Drawer (ponsel).
   - Ukuran huruf Arab (5 langkah) disimpan di `localStorage`. Skrip awal kecil memasangnya sebelum teks tampil.
   - T-08 hanya memberi satu font Arab, jadi tidak ada pilihan font.
5. **Sitasi salin:**
   - Format: `al-Ghazali, Ihya' 'Ulum ad-Din, Dar al-Ma'rifah, j.1 h.200. <permalink>`, untuk halaman maupun paragraf (`#pN`).
   - Isinya teks biasa + HTML (judul miring, tautan aktif).
   - Origin = situs yang sedang dibuka, jadi tautan dari Preview menunjuk Preview.
   - Nama pengarang ringkas dan nama penerbit berhuruf Latin diambil dari tabel nama tampilan web (`apps/web/src/content/works.ts`). DB hanya menyimpan nama lengkap dan penerbit berhuruf Arab. Karya baru tanpa entri memakai data DB apa adanya.
   - Judul mengikuti `title_id` DB (`Ihya' 'Ulum ad-Din`, dengan apostrof), bukan ejaan di contoh rencana.
6. **Atribusi ADR-018 + CC BY-NC-SA 4.0 §3(a)(1)** (`LicenseNotice`, di halaman karya dan footer halaman baca):
   - atribusi edisi dari DB apa adanya;
   - nama lisensi + tautan ke teks lisensinya;
   - tautan ke materi sumber berlisensi (OpenITI 2025.1.9 di Zenodo, `data/ATTRIBUTION.md`);
   - pernyataan pengolahan ("Diolah Surau: … Huruf teks Arab tidak diubah");
   - di halaman baca, tautan "Halaman ini di al-Maktaba al-Shamela".
   - Tautan lisensi, sumber, dan judul catatan kaki "takhrij al-'Iraqi" disimpan per edisi di `apps/web/src/content/works.ts`. Edisi tanpa entri hanya mendapat "Catatan kaki", supaya catatan kaki karya lain tidak salah diatribusikan.
   - Tautan itu berasal dari field tambahan `@surau/core` `PageView.source_url` (`https://shamela.ws/book/<source_ref>/<source_page_id>`, hanya untuk edisi `shamela`). Kontrak hanya bertambah.
7. **Laporan kesalahan** `POST /api/feedback`: route handler, bukan Server Action. Logikanya di `lib/feedback-handler.ts` (diuji tanpa Workers), dengan urutan:
   - pembaca terbuka;
   - Origin sama;
   - `content-type` JSON;
   - body ≤ 8 KB (header + penghitung stream);
   - Zod `feedbackRequest`: jenis `text/citation/toc/other`, pesan memakai aturan `feedbackInput` @surau/db, path hanya `/kitab/...` tanpa `?`/`#`;
   - honeypot `website`: bila terisi, dijawab 201 tanpa menyimpan;
   - Rate Limiting `FEEDBACK_LIMITER` 5/60 dtk dengan kunci `HMAC-SHA256(IP_HMAC_KEY, cf-connecting-ip)` 128 bit;
   - simpan ke `feedback` dengan `corpus_version` dan **tanpa IP**.

   Ketentuan lain:
   - `namespace_id` 1001 (produksi) dan 2001 (Preview) supaya hitungannya tidak bercampur.
   - Secret `IP_HMAC_KEY` dipasang agent dengan nilai acak, tidak pernah dicetak: produksi lewat `wrangler secret put`, Preview lewat `wrangler preview base-config secret put`. `next dev` memakai kunci tetap khusus pengembangan; secret yang hilang = 503.
   - Retensi `feedback` tetap menunggu P-7 / T-10 butir 4.
8. **`keep_names: false`** di `apps/web/wrangler.jsonc`.
   - esbuild wrangler (keepNames, bawaan) menyisipkan `__name(fn, "…")` ke kode server.
   - Skrip tema `next-themes` dibuat dari `fn.toString()`, jadi `__name` ikut ke browser dan gagal (`ReferenceError`) di halaman yang dirender Worker saat runtime.
   - Halaman statis Fase 0 dirender di Node saat build, jadi tidak terdampak. Halaman ISR S09 terdampak (ditemukan Lighthouse di Preview).
   - Setelah perubahan: 0 `__name(` di HTML Preview, dan *best practices* naik dari 96 ke 100.
9. **Kualitas** (Preview PR #21, j1 h200, Lighthouse 13.5.0):
   - Ponsel: a11y **100**, performa 80 (FCP 3,1 dtk, LCP 4,2 dtk, TBT 20 ms, CLS 0), BP 100.
   - Desktop: 100/100/100.
   - SEO 66 di Preview hanya karena `x-robots-tag: noindex` bawaan Preview.
   - axe 0 pelanggaran untuk `/kitab`, `/kitab/ihya`, dan `/kitab/ihya/1/200` (terang/gelap, desktop/ponsel).
   - LCP ponsel terutama terhambat CSS global HeroUI (±90 KB, render-blocking) dan JS. Itu utang lintas halaman, bukan khusus pembaca. → Ditangani ADR-035 (CSS 83 KB → 30 KB gzip).

**Ditolak:**
- `force-dynamic` untuk halaman baca: tidak bocor (#1455), tetapi setiap request merender dan membaca D1, dan butuh Workers Cache + `Cache-Control` yang belum teruji dengan OpenNext.
- Prerender seluruh Ihya saat build: CI tidak punya D1.
- Mengarahkan produksi ke korpus staging **dengan** pembaca terbuka: teks akan tampil publik sebelum QA S10 dan T-10.
- IP mentah sebagai kunci rate limit (P-7).
- `server-only` sebagai dependensi baru: rute sudah server-only lewat `next/navigation` + OpenNext.
- Tombol penanda di dalam span HoverCard (axe).
- Pilihan font kedua (T-08 hanya satu font).

**Utang:**
- ~~Pohon daftar isi dikirim dua kali di payload RSC halaman baca (panel samping + Drawer), ±25 KB mentah. Bisa disatukan lewat konteks.~~ **Koreksi (ADR-035):** salah ukur. React Flight menulis array yang sama sekali saja; pemakaian kedua hanya rujukan ±80 byte.
- `/api/feedback` tidak mencocokkan `passage_id` dengan `path` (laporan bisa merujuk paragraf halaman lain; cukup ditandai saat triase). Untuk rilis publik, pertimbangkan batas global per hari selain 5/menit per IP, karena IP (terutama IPv6) mudah dirotasi.
- Satu kali klik sebelum hidrasi tidak berbuat apa-apa (e2e memakai `toPass`).
- Penanda di mode HoverCard berganti elemen setelah hidrasi (Popover → HoverCard) karena kemampuan hover baru diketahui di klien.
- Pengguna yang membuka `/kitab/*` sebelum `READER_ENABLED` dinyalakan di produksi akan mendapat 404 yang ter-cache sampai deploy berikutnya. Mengubah `vars` memang selalu lewat deploy baru, yang membuang cache build lama.

**Tinjau ulang bila:**
- OpenNext merilis perbaikan #1455.
- Korpus produksi blue-green siap (S10): ganti binding `CORPUS_DB` dan nyalakan `READER_ENABLED`.
- Domain sendiri siap (`SITE_URL`, P-2).
- Ada kitab kedua dengan edisi non-default atau satu jilid.

## ADR-035 · CSS HeroUI diimpor selektif per komponen; pohon daftar isi ternyata sudah terkirim sekali — diterima · 2026-10-16

**Konteks:** Dua utang ADR-034 di halaman baca (`/kitab/ihya/1/200`), dikerjakan di luar S10:
- Pohon daftar isi (313 node) disangka terkirim dua kali di payload RSC: sebagai `ReaderToolbar.toc` (Drawer ponsel) dan `TocTree.items` (panel samping).
- LCP ponsel 4,2 dtk (Lighthouse 13.5.0, performa 80). `globals.css` mengimpor `@heroui/styles/css` dan `@heroui-pro/react/css` utuh, sehingga semua halaman memuat satu CSS render-blocking **815.852 B mentah / 82.895 B gzip**. Isinya 757 KB `@layer components` dari 84 berkas CSS komponen OSS dan 67 Pro, padahal Surau memakai 29 dan 8. Angka "±90 KB" di ADR-034 adalah ukuran terkompresi.

**Temuan daftar isi (tanpa perubahan kode):**
- HTML Preview `main` (`eae7707`) j1 h200: 203.670 B mentah, 28.737 B gzip. Payload RSC 84 KB, dan array `toc` muncul **sekali** (51 KB JSON, di props `ReaderToolbar`).
- Prop `items` milik `TocTree` di panel samping ditulis React Flight sebagai rujukan jalur `"$19:props:…:toc"` (±80 byte). React 19 menulis objek yang sama sekali saja per render, dan klien memulihkannya sebagai objek yang sama.
- Jadi utang ADR-034 ("±25 KB") salah ukur. Memindah `toc` ke `ReaderProvider` tidak menghemat byte, jadi tidak dikerjakan. Panel samping hanya merender baris yang terbuka (9 KB HTML); Drawer tidak dirender sebelum dibuka.

**Keputusan:**
1. `apps/web/src/app/globals.css` memakai **impor selektif**. Cara ini didokumentasikan HeroUI di Theming → Import Strategies, dan dicek lewat MCP `heroui-pro` serta `/docs-terbaru`:
   - `tailwindcss`, `tw-animate-css`, `@heroui/styles/base/{base,scrollbar}.css` `layer(base)`;
   - 29 berkas `@heroui/styles/components/*.css` `layer(components)`, urut seperti `components/index.css` (primitif dulu);
   - `@heroui/styles/themes/default` `layer(theme)`, lalu `utilities` dan `variants`;
   - 8 berkas Pro `@heroui-pro/react/css/components/*.css` `layer(components)`. Urutannya mengikuti urutan aturan di `@heroui-pro/react/css` (app-layout, file-tree, hover-card, native-select, navbar, sheet, resizable, sidebar), bukan abjad.
   - Berkas Pro per komponen **tidak ber-layer** (CSS hasil kompilasi Tailwind). Tanpa `layer(components)`, aturannya akan mengalahkan utilitas Tailwind seperti `w-full`.
   - Kriteria pilih: komponen HeroUI yang diimpor di `src/`, ditambah komponen yang diimpor dan dirender di dalamnya (impor internal di `dist` paket), ditambah `menu` (kelas `Dropdown.Menu`). Impor yang hanya mengambil `*Context` tidak dihitung. Hasilnya cocok dengan kelas BEM yang benar-benar dihasilkan `tv()` di bundle.
   - Tidak diimpor:
     - `surface`, `checkbox-group`, `combo-box`: Dropdown/Card/Checkbox hanya mengimpor konteksnya. Definisi `tv()`-nya ikut terbundel tetapi tidak pernah dipanggil.
     - `header`, `field-error`, dan semua komponen yang tidak dipakai.
   - `checkbox` tetap diimpor: FileTree mengimpor Checkbox, walau hanya merendernya bila kotak pilih aktif (`toc-tree.tsx` tidak memakainya). Ukurannya kecil dan aman bila kelak dipakai.
2. `tw-animate-css` 1.4.0 menjadi devDependency langsung `apps/web` lewat `catalog` (hanya dipakai saat build, seperti `tailwindcss`), dengan versi yang sama dengan bawaan `@heroui/styles`. Alasannya:
   - dropdown, modal, popover, dan tooltip memakai `@apply fade-in-0` dan sejenisnya;
   - pnpm tidak bisa me-resolve paket transitif dari `globals.css` ("Can't resolve").
3. **Aturan baru:** memakai komponen HeroUI yang belum ada di daftar = tambahkan berkas CSS-nya di `globals.css` dengan urutan di atas, selalu `layer(components)`. Tanpa itu, komponen tampil tanpa gaya. Aturan ini dicatat di `apps/web/CLAUDE.md` dan `KONVENSI.md`.
4. **Penjaga otomatis** `apps/web/src/app/heroui-css.test.ts` (ikut `pnpm test` dan CI). Tes ini menelusuri komponen HeroUI yang diimpor di `src/` beserta impor internalnya di `dist`, lalu gagal bila:
   - berkas CSS komponen yang terjangkau tidak diimpor;
   - urutan berkas OSS/Pro menyimpang;
   - versi `tw-animate-css` berbeda dari bawaan `@heroui/styles`.

   Uji kontrol: membuang `menu-section`, `sheet`, atau `close-button`, atau menukar urutan navbar/sidebar dan button/link → gagal, dengan nama berkas dan jalurnya (mis. `oss:close-button (lewat Toast → close-button)`).
5. **Alat banding** di `apps/web/scripts/heroui-css/`: `banding-deklarasi.mjs` (per deklarasi), `potret-gaya.mjs` dan `banding-gaya.mjs` (gaya terhitung 42 keadaan). Cara pakai ada di kepala tiap berkas.
6. `@heroui/react`, `@heroui/styles`, dan `tw-animate-css` dikeluarkan dari Dependabot, seperti `@heroui-pro/react`. Naik versinya lewat sesi yang menjalankan langkah "Tinjau ulang" di bawah, karena CI (verify, e2e, axe) tidak memeriksa gaya.

**Hasil** (build lokal; CSS sebelum identik byte per byte dengan Preview `main`):

| CSS global (semua halaman) | Sebelum | Sesudah |
|---|---|---|
| Mentah | 815.852 B | 262.005 B (−68 %) |
| gzip -9 (lokal) | 82.895 B | 30.034 B (−64 %) |
| Di jaringan, `Accept-Encoding: gzip` | 82.963 B | 30.022 B |
| Di jaringan, `Accept-Encoding: br` | 82.571 B | 30.973 B |

- HTML j1 h200 **tidak berubah**: 203.670 B mentah dan ±28,7 KB gzip, baik di Preview `main` maupun Preview PR #22. CSS tidak di-inline, dan payload RSC tetap 84 KB dengan satu array `toc`.
- Lighthouse 13.5.0 ponsel (simulasi bawaan), j1 h200. Pengukuran diselang-seling di jendela waktu yang sama:

| | Sebelum: Preview `main`, 9 kali | Sesudah: Preview PR #22, 6 kali |
|---|---|---|
| Performa, median (rentang) | 81 (80–90) | **85** (83–92) |
| LCP, median | 4,2 dtk (7 kali 4,2; 2 kali 3,5) | **3,9 dtk** (5 kali 3,9; sekali 3,2) |
| FCP, median | 2,4 dtk | 2,2 dtk |
| TBT / CLS | 20–50 ms / 0–0,059 | 30–50 ms / 0–0,059 |
| Aksesibilitas / BP | 100 / 100 | 100 / 100 |
| Perkiraan hemat render-blocking | ±1.040 ms | 750 ms |

- Sisa LCP ponsel (3,9 dtk) adalah *render delay* elemen LCP (paragraf Arab pertama). CSS 30 KB tetap satu permintaan render-blocking, perkiraan Lighthouse ±750 ms di simulasi 4G lambat, ditambah JS hidrasi. Memangkas lebih jauh butuh kerja di JS atau font, di luar ADR ini.

**Bukti tampilan sama:**
- Banding statis per deklarasi (postcss) untuk semua selektor yang kelasnya ada di bundle: 0 nilai berubah dan 1 beda urutan. Beda urutan itu antar-`@keyframes` yang berbeda nama, jadi tidak berpengaruh.
  - Yang hilang hanya aturan komponen tak terpakai dan fallback `@supports` browser lama (`@layer properties`).
  - Juga hilang 35 variabel tema dan 14 `@keyframes` yang tidak dirujuk `var()`/`animation` di CSS maupun JS.
- Banding gaya terhitung di Chromium (Playwright, `next dev`, CSS lama dan baru bergantian di server yang sama):
  - 42 keadaan: 8 halaman, terang/gelap, desktop 1280 px dan Pixel 7. Termasuk HoverCard takhrij, popover lompat, menu paragraf, dialog laporan, tooltip, toast, sidebar diciutkan, fokus keyboard, laci daftar isi, menu ponsel, dan popover penanda.
  - 19.170 elemen, masing-masing beserta `::before`/`::after`: **0 beda properti tampilan**.
  - Yang beda hanya 46 properti kustom tak terpakai (`--chart-*`, `--color-red-500`, `--tw-gradient-*`, dll.), tidak dirujuk CSS maupun JS.
  - Kontrol: dua potret dengan CSS yang sama → 0 beda.
- Tangkapan layar halaman penuh build produksi (Preview `main` vs Preview PR #22): `/`, `/kitab/ihya`, dan `/kitab/ihya/1/200`, terang/gelap, desktop/Pixel 7. Hasilnya 12 dari 12 PNG **identik byte per byte**.
- `pnpm verify` lolos; `pnpm test:e2e` 64/64 (termasuk axe terang/gelap).

**Ditolak:**
- Memecah CSS per rute: semua halaman memakai shell yang sama (AppLayout, Navbar, Sidebar), dan CSS global Next tetap render-blocking.
- Menyalin aturan Pro dari `index.css` ke berkas sendiri: berlisensi (ADR-025) dan tidak ikut naik versi.
- Inline *critical CSS*: butuh langkah build tambahan di OpenNext, dan tidak perlu lagi setelah CSS menjadi 30 KB gzip.
- Memindah `toc` ke `ReaderProvider`: tidak menghemat byte (lihat Temuan).

**Konsekuensi:**
- Subpath `@heroui-pro/react/css/components/*.css` ada di `exports` paket tetapi **belum didokumentasikan** HeroUI. Versi Pro disematkan persis di `catalog`.
- Impor selektif membuka jalan rusak diam-diam yang tidak ada saat impor utuh:
  - Berkas CSS dihapus atau diganti nama: build gagal keras.
  - Komponen mulai merender komponen lain: ditangkap tes penjaga.
  - Aturan pindah ke berkas CSS lain, atau ke berkas bersama baru: **tidak** ditangkap build maupun tes. Karena itu kenaikan versi HeroUI lewat sesi dengan banding ulang (keputusan 6).
- Tiap berkas Pro membawa fallback `@layer properties`, `@property`, dan `@keyframes enter/exit` sendiri (sekarang menjadi `components.properties`). Isinya identik, dan `@keyframes` tak ber-layer dari `tw-animate-css` tetap menang. Tambahan ukurannya kecil.
- Token `--chart-1..5` dari `@heroui-pro/react/css` tidak ada lagi. Bila kelak memakai chart Pro, tambahkan tokennya.

**Tinjau ulang bila:**
- `@heroui/styles`, `@heroui/react`, `@heroui-pro/react`, atau `tw-animate-css` naik versi:
  1. `pnpm test` (tes penjaga).
  2. Build `main` dan branch, lalu `node apps/web/scripts/heroui-css/banding-deklarasi.mjs <css-lama> <css-baru>` (CSS terbesar di `apps/web/.next/static/chunks/`): 0 nilai berubah.
  3. `pnpm dev`, lalu `potret-gaya.mjs lama.json` dengan CSS lama, ganti ke CSS baru, `potret-gaya.mjs baru.json`, dan `banding-gaya.mjs lama.json baru.json <css-baru>`: 0 beda properti tampilan.
- Memakai komponen HeroUI baru.
- HeroUI mendokumentasikan (atau menghapus) impor CSS Pro per komponen.

## ADR-036 · Korpus produksi blue-green (S10): `corpus:promote`, QA sampel byte demi byte, `preview_database_id` untuk lokal, `/lisensi`, migrasi app di deploy — diterima · 2026-10-16

**Konteks:** S10 memindahkan korpus Ihya ke D1 produksi dan menyiapkan syarat rilis Fase 1 (FASE.md R1). Fakta lapangan 16 Okt 2026 (wrangler 4.151.0, dibaca dari source terpasang):
- `wrangler d1 migrations apply` hanya mengenal DB yang tercantum di config (nama atau binding). Tidak ada `--database-id`.
- `wrangler d1 create` tidak punya `--json`; `--binding` saja sudah menulis ke config tanpa bertanya. `d1 info --json` memberi `uuid`, `running_in_region`, dan `rows_read_24h`.
- Dev lokal (miniflare, `getPlatformProxy`, `wrangler dev`) menyimpan D1 lokal per **`preview_database_id ?? database_id`**. `wrangler deploy` hanya memakai `database_id`.
- Pemilik menjawab T-10 di chat: ADR-018 + ADR-021 disetujui, email ke Shamela sudah dikirim, kontak koreksi = formulir + GitHub Issues, retensi `feedback` = sampai ditangani + 12 bulan. Pemilik juga mengizinkan langkah remote S10 (buat DB baru, muat, ganti binding).

**Keputusan:**
1. **`pnpm run corpus:promote <versi>`** (`tools/ingest/src/promote.ts`, prosedur di `tools/ingest/README.md`):
   - Tanpa `--confirm` hanya rencana: sha256 build dicek ulang terhadap `data/build/<versi>.sha256` (SQL + .sqlite dari build yang sama), `meta.corpus_version` = versi, dan keadaan remote.
   - `--confirm`: `d1 create surau-corpus-<versi> --location apac --update-config=false` → migrasi → muat `data/build/sql/*.sql` → smoke → ganti `CORPUS_DB` produksi di `apps/web/wrangler.jsonc` (file lokal; deploy lewat PR + `deploy.yml`).
   - Migrasi dan muat ke DB yang belum ada di config memakai **config sementara** di folder temp (`migrations_dir` absolut, `src/d1.ts`), sehingga `packages/db/wrangler.jsonc` tidak berubah per versi.
   - Smoke = hitungan **setiap** tabel dan seluruh `meta` sama persis dengan .sqlite build, plus j1 h200 (badan, catatan kaki, penanda). Bila gagal, binding tidak diubah. `corpus:load:*` memakai smoke yang sama.
   - Pengaman (diperketat setelah peninjau): DB yang **melayani atau pernah melayani produksi** tidak pernah dimuat ulang, juga dengan `--reload`. "Produksi" = binding `CORPUS_DB` di working tree **dan** di `origin/main` (setelah `git fetch`; rollback yang belum di-merge tetap terlindungi), ditambah semua DB di tabel `data/SOURCES.md`. Versi baru = nama baru.
   - **Korpus staging tidak pernah menjadi produksi**: staging dimuat ulang setiap sesi (S11 FTS), jadi rollback ke sana bisa mengosongkan DB yang sedang melayani pembaca. `promote` menolak staging, `corpus:load:staging` menolak bila staging tercatat sebagai produksi, dan tes memastikan binding produksi ≠ staging.
   - Rollback: `--switch-only <versi>` (hanya baca remote: smoke + `meta.schema_version` = `CORPUS_SCHEMA_VERSION` kode, lalu ganti binding). `ihya-v1` belum punya versi lama (sebelumnya pembaca tertutup), jadi rollback-nya = **tutup darurat** (`READER_ENABLED = "0"` lewat PR).
   - Dijalankan sekali untuk `ihya-v1` (±67 dtk): `surau-corpus-ihya-v1` (`41e3033e-…`, APAC, 13,2 MB), hitungan = build. Jalur `--switch-only` diuji dua arah (sebelum aturan "staging tidak pernah produksi" ditambahkan) dan `--reload` atas `ihya-v1` terbukti ditolak. Riwayat versi di `data/SOURCES.md`.
2. **Binding:** `CORPUS_DB` top-level = korpus produksi (nama + ID hanya diubah skrip, lewat PR). `preview_database_id` = ID staging, khusus supaya `next dev`/`preview` lokal tetap membaca D1 lokal yang dimuat `corpus:load:local` (diverifikasi: j1 h200 tampil di `pnpm dev`). Blok `previews` tetap staging.
3. **`deploy.yml` memigrasi `surau-app` saja** (`pnpm run db:migrate:remote`, binding APP) sebelum deploy, dan tidak pernah korpus. Tes `tools/ingest/src/corpus.test.ts` menjaga aturan ini (ARSITEKTUR-TEKNIS §7 aturan 4) dan bentuk binding di `apps/web/wrangler.jsonc`.
4. **QA otomatis (`pnpm run corpus:qa <versi>`):**
   - 30 halaman acak, seed **9472** (mulberry32, Fisher–Yates parsial atas `page.id` terurut).
   - Baris harapan dibangun ulang di memori dari sumber Shamela oleh pipeline ingest (pembersihan deterministik `@surau/text`, peta ID yang di-commit, gagal bila peta ID tidak lengkap). Lalu dibandingkan dengan baris D1: `page`, setiap paragraf (kolom + `text_raw` **byte demi byte** UTF-8), `footnote_ref`, dan `passage_needs_review`.
   - Sekali per korpus juga dibandingkan: `meta` (kecuali `built_at`; `source_hash`, `norm_version`, `corpus_version` dari sumber, `schema_version` dari kode), `author`, `work`, `edition` (lisensi + kalimat atribusi), dan node daftar isi yang dirujuk paragraf sampel (25 judul).
   - Argumen CLI divalidasi Zod (`--n` 1..jumlah halaman, `--human` ≤ `--n`); hasil kosong dianggap gagal, jadi laporan 30/30 tidak bisa tertimpa "0/0".
   - Laporan tanpa teks kitab (ID, jumlah, byte, sha256). Hasil: produksi 30/30 + baris korpus cocok, staging sama.
   - **Batas yang ditulis jujur:** QA ini membuktikan jalur sumber → build → SQL → D1 tidak mengubah satu byte pun. Ia tidak menguji ulang pembersih itu sendiri; itu tugas golden test `@surau/text` (S05), gerbang `verify-openiti` (S07, 1.705/1.706), dan QA manusia (T-15).
5. **QA manusia (T-15):** 10 halaman bercatatan kaki dari sampel yang sama, bergiliran per jilid, di `data/reports/ihya-9472-qa-manusia.md`. Tautan pindaian archive.org (`ihya-ghazali`, berkas `iud-dm-00N`) memakai selisih indeks halaman per jilid **9/2/3/3**, dikalibrasi dengan membaca nomor cetak di 2–3 titik per jilid (`works/ihya.ts` `scan`). Pindaian hanya ditautkan (ADR-018).
6. **`/lisensi`** statis (tanpa baca D1, tetap terbuka saat pembaca ditutup): kode Apache-2.0, konten CC BY-NC-SA 4.0 (klausul NC: tanpa iklan/paywall/penjualan akses), syarat pakai ulang, atribusi per edisi (`EDITION_CREDITS`, dites sama dengan `data/ATTRIBUTION.md`), jalur koreksi dan takedown (formulir + GitHub Issues), dan retensi laporan kesalahan. Tautannya ada di footer menu samping, Tentang, dan catatan lisensi setiap halaman baca. Tautan "lihat di Shamela" per halaman sudah ada sejak S09 (`PageView.source_url`).
7. **Biaya baca D1 per kunjungan** (diukur di Preview `pembaca`, DB staging berisi build yang sama; pembaca produksi masih tertutup): 50 halaman berbeda yang belum pernah dibuka → semua 200, `MISS`, rata-rata 0,87 dtk; `d1 insights` sebelum/sesudah: **800 kueri, 76.502 baris dibaca = ±16 kueri dan ±1.530 baris per render**. Kueri daftar isi (`getToc`, ±939 baris per panggilan, 76 panggilan) menyumbang 93%. 50 kunjungan ulang ke halaman yang sama → 0,22 dtk, **0 kueri D1** (dilayani cache ISR; header `x-nextjs-cache: STALE`, bukan `HIT` seperti catatan S09, tanpa render ulang yang terlihat di D1). Kontrol: satu halaman baru yang dibuka sesudahnya muncul di analytics ±2 menit kemudian (+19 kueri), jadi angka 0 bukan karena jeda analytics. Angka per bentuk kueri adalah selisih jendela 24 jam yang bergeser, jadi bisa sedikit di bawah angka sebenarnya.
   - Biaya: Workers Paid (sudah dibayar) mencakup 25 miliar baris/bulan; satu render penuh semua halaman Ihya (±1.706) ≈ 2,6 juta baris per deploy → **±$0**. Di paket Free (5 juta/hari) masih muat, tetapi pemindai yang membuka banyak path unik bisa mendekati batas harian.

**Utang / tindak lanjut:**
- `getToc` membaca seluruh pohon per render (±939 baris) dan terpanggil ±1,5 kali per render; bisa dihemat dengan memoisasi per isolate atau pohon ringkas per edisi. Belum mendesak (±$0).
- Header `STALE` pada kunjungan ulang belum dipahami penuh (dummy tag cache + `revalidate = false` seharusnya `HIT`). Tidak ada baca D1 tambahan, tetapi perlu dicek di produksi setelah `/rilis 1` (Workers Logs: galat "Dummy queue is not implemented"?).
- Retensi `feedback` (12 bulan setelah ditangani) belum punya pembersih otomatis; volume kecil, ditangani manual sampai pengaman data S20.
- `d1 insights` masih eksperimental; angka di atas dari jendela 24 jam yang bergeser (selisih per bentuk kueri).

- `/lisensi` menyebut "terjemahan" sebagai konten CC BY-NC-SA. Saat Fase 2 (S12) teks ayat Tanzil (CC BY 3.0, hanya verbatim) dan terjemahan Kemenag masuk, halaman ini butuh pengecualian per sumber. Takedown sekarang lewat GitHub Issues (publik); tambahkan saluran privat begitu ada email kontak.

**Tinjau ulang bila:** korpus versi kedua (`ihya-v2` atau kitab kedua: reset per edisi), Shamela membalas email T-10, atau Fase 2 menambah sumber berlisensi lain (Tanzil, Kemenag).

## ADR-037 · Rilis Fase 1: pembaca dibuka di produksi, penyimpangan S07 butir 5 diterima, pengaman path acak dan batas laporan global — diterima · 2026-10-16

**Konteks:** `/rilis 1` (2026-10-16). Pemeriksaan kesiapan menemukan satu butir "Selesai bila" S07 yang tidak dicentang: daftar file `data/` yang boleh di git tidak menyebut peta ID `data/ids/ihya-9472.json`, padahal peta itu diwajibkan ADR-029 (dicek: 0 huruf Arab, hanya angka). Tinjauan keamanan `rilis-f0..main` (peninjau): 0 blocker, 2 "perbaiki". Gerbang versi (docs-terbaru): Next 16.4.1 didukung resmi OpenNext 1.20.12; advisory 673q, 2464, p3m5 ditambal di 16.4.1, xqc2/h3gv kemungkinan besar ditambal di React bawaan (bukti lebih kuat dari ADR-030 poin 4: commit `a4cea6aec`, `getBackingBlob`), dan pemicunya tetap dimatikan (ADR-003). Masalah operasional terbuka: OpenNext #1455 (heap per render ISR), belum ada rilis perbaikan.

**Keputusan:**
1. **Penyimpangan S07 butir 5 diterima pemilik** di chat (FASE.md: syarat yang dilewati secara sadar dicatat di sini). Butirnya tetap tidak dicentang di file sesi S07; yang diterima adalah penyimpangannya, bukan kriteria yang diubah.
2. **Path acak tidak lagi membaca D1 besar** (temuan peninjau): sejak pembaca terbuka, setiap path `/kitab/ihya/<juz>/<angka>` atau `/kitab/ihya/bab/<angka>` dirender ISR. Sebelumnya `getToc` (±940 baris) ikut berjalan paralel bahkan untuk 404.
   - `loadPage`: juz < 1 atau > `edition.volumes` = 404 sebelum `readPage`.
   - Halaman baca dan `generateMetadata`: `loadPage` dulu, baru `loadToc` (satu round-trip tambahan hanya saat render MISS).
   - `loadTocNode`: `getTocNode` (satu baris) + cek `edition_id` sebelum `getToc`.
   - e2e: `/kitab/ihya/0/1`, `/5/1`, `/999999999/1`, `/bab/999999999` = 404.
3. **Batas laporan kesalahan** (temuan peninjau): binding kedua `FEEDBACK_GLOBAL_LIMITER` (kunci tetap `global`, 30/60 dtk; produksi `1002`, Preview `2002`) dicek sebelum batas per klien. Kunci per klien kini HMAC atas **jaringan** IP: IPv4 penuh, IPv6 per /64 (IPv4 tersemat tetap utuh). Rate Limiting Cloudflare dihitung per lokasi, jadi "global" berarti per lokasi. Turnstile menyusul bila spam terlihat.
4. **`READER_ENABLED = "1"`** di top-level `apps/web/wrangler.jsonc` lewat PR + `deploy.yml` (cache ISR mulai dari nol di BUILD_ID baru). Smoke `deploy.yml` menambah `/kitab` dan `/kitab/ihya/1/200`. Secret `IP_HMAC_KEY` produksi dicek ada (`wrangler secret list`).
5. **Risiko #1455 diterima ulang** dengan batas yang sama seperti ADR-034: isolate diganti otomatis saat memori mendekati 128 MB; pantau error 1102 dan memori Worker setelah rilis; naikkan OpenNext saat #1456 dirilis.

**Tinjau ulang bila:** spam laporan terlihat (Turnstile), error 1102 muncul di log produksi, OpenNext merilis perbaikan #1455, atau domain sendiri siap (WAF/rate limit `/kitab/*`).

## ADR-038 · Antrean revalidasi no-op untuk ISR `revalidate = false` (opennextjs-aws#1250); breadcrumb bab membungkus di ponsel — diterima · 2026-10-16

**Konteks:** Setelah rilis Fase 1, Workers Logs produksi mencatat `Failed to revalidate stale page … FatalError: Dummy queue is not implemented` setiap kali halaman kitab dibuka ulang, dan responsnya bertanda `x-nextjs-cache: STALE`. Halaman tetap benar dan tidak ada baca D1 tambahan (ADR-036 butir 7). Penyebabnya (dibaca dari kode terpasang, dikonfirmasi docs-terbaru 2026-10-16):
- `@opennextjs/aws` 4.1.11 `adapters/cache.js` menyimpan `revalidate` di entri R2, tetapi `get()` tidak mengembalikan `cacheControl` ke Next.
- Next 16.4.1 `IncrementalCache.get` lalu mencari batas revalidasi di memori isolate atau di prerender manifest. Path ISR on-demand (`generateStaticParams` → `[]`) tidak ada di manifest, jadi di isolate yang belum merender halaman itu `calculateRevalidate(undefined)` = **1 detik** → entri dianggap basi.
- Dalam *minimal mode* OpenNext, revalidasi diserahkan ke antrean; antrean bawaan `dummy` melempar galat (ditangkap, hanya dicatat).
- Ini bug hulu yang diketahui: opennextjs-aws#1250 (terbuka), perbaikan #1302/#1317 belum di-merge per 2026-10-16. Direproduksi lokal: `web-workers-tanpa-build` (server dimulai ulang tanpa build ulang) → kunjungan ulang `STALE`.

**Keputusan:**
1. `open-next.config.ts`: `queue: { name: "surau-noop", send: async () => {} }`. Semua rute ISR Surau `revalidate = false`; isinya hanya berubah lewat deploy (BUILD_ID baru = cache baru), jadi tidak ada yang perlu direvalidasi. Antrean nyata ditolak: `memory`/`do-queue` merender ulang halaman (baca D1 + tulis R2) setiap kunjungan STALE, dan selama bug di atas ada, itu berarti hampir setiap kunjungan ke isolate dingin.
2. Tes penjaga `apps/web/src/app/isr-config.test.ts`: setiap `export const revalidate` = `false`, tanpa `revalidatePath`/`revalidateTag`/`unstable_cache`/`fetch` ber-`revalidate`, dan konfigurasi antrean tetap no-op. Rute dengan revalidasi berkala butuh ADR baru (antrean DO + perbaikan `cacheControl`).
3. Respons STALE tetap tanpa `Cache-Control` (perilaku OpenNext). Tanpa Workers Cache/CDN zona ini hanya memengaruhi browser; tinjau ulang saat domain sendiri dan cache edge dinyalakan.
4. Di luar butir utama: butir breadcrumb HeroUI (`li.breadcrumbs__item`) ber-`flex-shrink: 0`, jadi judul bab Arab yang panjang tidak membungkus dan meluber 12 px melewati gutter di ponsel. Butir bab diberi `min-w-0 shrink` (dicek 375 px: tautan 16–344 px, tanpa scroll horizontal).
5. `pnpm --filter @surau/web preview` kini memakai `--persist-to ../../.wrangler/state` (ARSITEKTUR-TEKNIS §7 aturan 1). Sebelumnya versi Workers lokal membaca D1 kosong di `apps/web/.wrangler/state`, sehingga halaman kitab 500. Konfigurasi peluncuran baru `web-workers-tanpa-build` memulai ulang server tanpa build ulang (BUILD_ID sama), untuk menguji isolate dingin.

**Tinjau ulang bila:** opennextjs-aws merilis #1317/#1302 (entri lalu `HIT` di isolate dingin; antrean no-op boleh tetap), ada rute dengan revalidasi berkala, atau Workers Cache/CDN dinyalakan.

## ADR-039 · Pencarian Arab (S11): indeks kolom stem saja, `term_stat` >10%, pengaman kata umum di ekspresi MATCH, hasil per halaman dalam satu bolak-balik D1, korpus `ihya-v2` — diterima · 2026-10-17

**Konteks:** S11 mengisi `passage_fts` (skema sejak S06) dan membuat `searchText`. Riset 2026-10-15 merekomendasikan normalisasi di kode + kolom stem + ekspansi klitik/kunyah, tetapi belum menguji D1 remote. Ukuran di S11 memakai build Ihya `ihya-v2` (20.509 paragraf), `node:sqlite` 3.53.4, D1 lokal, dan `surau-corpus-staging` (APAC).

**Keputusan:**
1. **Hanya kolom stem yang diisi.** `sbody`/`sfoot` = `stemText(normalizeArabic(text_raw).text)` sesuai `kind`; `body`/`foot` diisi `''`. Ukur: stem saja 5,45 MB vs stem + normal 7,42 MB (+36%), kecepatan kueri sama (الصبر 0,15 ms, الله 3,1 ms lokal). Kueri selalu memfilter `{sbody sfoot}`, jadi kolom normal tidak terpakai. Kolomnya dipertahankan di skema: mode "kata persis" kelak cukup membangun ulang indeks (versi korpus baru), tanpa migrasi. Bobot bm25 `(0, 0, 1.0, 0.5)`: catatan kaki (takhrij) separuh badan teks.
2. **`term_stat` (migrasi 0004, skema 4) = stem di >10% paragraf**, dihitung dari `fts5vocab` (`col`, `sbody`+`sfoot`) di DB `:memory:` dengan migrasi korpus yang sama, jadi tokenisasinya persis D1. **Menyimpang dari rencana (±5%)**: ambang 5% menjaring 85 stem, termasuk kata bermakna yang justru dicari di Ihya (علم 6,9%, دنيا 8,9%, ناس, نفسه, رجل, يوم); 10% menjaring 39 stem fungsi/formula (من, في, الله, ان, علي, قال, صلي, وسلم, حديث, اخرجه, رسول …). Biaya kata 5–10% di staging masih wajar (علم: 1.516 paragraf, ±12 ms SQL, ±12 ribu baris dibaca).
3. **Pengaman kata umum di dalam ekspresi MATCH.** Bila SETIAP posisi kueri mengenai kata di `term_stat` (posisi frasa dihitung dari semua token yang benar-benar dicari: varian proklitik/kunyah, dan awalan bila `expand`): tanpa bm25, `limit` paragraf pertama dalam urutan rowid (= urutan kitab), `warning: "common_terms"`, tanpa total dan tanpa halaman lanjut. Di staging الله berperingkat = ±42 ribu baris dibaca dan 35–69 ms SQL; versi pengaman ±30 baris dan <1 ms. Caranya: kedua kueri (berperingkat dan urutan kitab) memakai `MATCH (CASE WHEN <jumlah posisi yang mengenai term_stat> <|= n THEN ?match ELSE '"' || char(57344) || '"' END)`; token kueri dikirim sebagai JSON `[posisi, token, awalan]` (`json_each`), dan "mengenai" = sama persis (PRIMARY KEY) atau (awalan) `term` di rentang `[token, token || char(1114111))` (rentang PRIMARY KEY; U+10FFFF tidak pernah ada di stem). Versi `substr(term, 1, length(token)) = token` memindai `term_stat` per token: ±1.400 baris dibaca tambahan per kueri di staging. Versi pertama hanya membandingkan stem dasar; peninjau menemukan celahnya: `الل` + expand = `"الل"*` membaca seluruh daftar dokumen الله tanpa pengaman, begitu juga varian proklitik (سلم → وسلم). `common_terms` di keluaran = kata `term_stat` yang dikenai kueri. Subkueri konstan dievaluasi sebelum indeks dipindai; cabang lain mencari U+E000 (private use, dibuang `normalizeArabic` sehingga tak pernah ada di indeks) = 3–4 baris dibaca. Ditolak: syarat konstan `(SELECT count(*) …) < n` di WHERE biasa (D1 tetap memindai seluruh daftar dokumen, rows_read 9.244) dan `MATCH NULL`/`''` (syntax error FTS5).
4. **Satu bolak-balik D1 per pencarian.** Ukuran pertama di staging (dua bolak-balik: batch konteks, lalu kueri hasil) memberi SQL p50 4,9 ms tetapi total handler p50 185 ms / p95 212 ms: Worker preview di SIN, primary `surau-corpus-staging` di NRT (`served_by_colo`), ±85 ms per bolak-balik. Maka `searchCorpus` mengirim SATU `batch`: `meta` + `term_stat` (stem kueri lewat `json_each(?)`) + edisi/karya/penulis + kueri berperingkat + kueri urutan kitab. Kueri berperingkat: `WITH h AS MATERIALIZED` (bm25 + filter rentang rowid) → paragraf ke halaman → peringkat halaman (`min(bm25)`, lalu jumlah paragraf cocok) + total lewat window → paragraf cocok halaman terpilih beserta `text_raw`, letak cetak, dan judul bab. `MATERIALIZED` wajib: D1 menolak bm25 di CTE yang diratakan ke join ("unable to use function bm25 in the requested context"). Korpus tanpa `term_stat` membuat batch gagal; skema lalu dicek terpisah (`ready: false`). rows_read ±9× jumlah paragraf cocok (الصبر 323 → ±2.900, karena tabel sementara dan indeks otomatis ikut dihitung): diterima untuk Ihya, tinjau ulang pada skala banyak kitab.
5. **Sorotan dan potongan dihitung di kode** (indeks contentless tidak punya `highlight()`/`snippet()`): `planFtsQuery` (@surau/text) menghasilkan rencana yang dipakai bersama oleh `ftsMatchExpression` (MATCH, keluaran `buildFtsMatch` tidak berubah) dan `findPlanSpans` (token `normalizeArabic(text_raw)` → `stemToken` → frasa, dipetakan lewat `toRawSpan`). Potongan ±160 karakter dipotong di batas spasi. Semua rentang adalah indeks di `text_raw`, jadi yang tampil selalu substring persis teks sumber. `normalizeArabic`/`stemToken` tidak berubah → `NORM_VERSION` tetap 1.
6. **Kontrak `searchText`** (`searchView`, kontrak MCP S16): halaman cetak + semua paragraf cocok (urut baca), `score` = −bm25, `highlights` (maks. 50), `snippet`, `section`, `terms`, `common_terms`, `total_pages`/`total_hits`, `limit` (1–50) dan `offset` (0–1000) per halaman, `expand` (awalan stem, satu kata). Error baru `InvalidQuery` (400) dan `Unavailable` (503). Skema < 4 atau `meta.norm_version` ≠ `NORM_VERSION` → `Unavailable` (ARSITEKTUR §7 aturan 5): produksi `ihya-v1` menjawab 503 sampai `corpus:promote ihya-v2` (S14).
7. **Korpus `ihya-v2`** (versi baru, bukan memuat ulang `ihya-v1`). File SQL: tabel biasa → `passage-fts-*` → `passage-fts-optimize` → `meta` terakhir (korpus ber-`corpus_version` pasti termuat penuh). Reset memakai `INSERT INTO passage_fts(passage_fts) VALUES('delete-all')`: INSERT ke rowid yang sudah ada tidak menghapus token lama. Ingest menghapus build versi lain di `data/build` (satu folder `sql/` = satu build). Smoke menghitung baris indeks dan menjalankan satu kueri الصبر. Staging dimuat `ihya-v2` (±65 dtk).
8. **`GET /api/search`** (`apps/web`): Zod (kueri ≤200 karakter, `edition_id` ≤ 899.999 = batas formula ID, selebihnya 400), batas `SEARCH_LIMITER` 60/menit per HMAC jaringan IP lalu `SEARCH_GLOBAL_LIMITER` 300/menit (kunci tetap, per lokasi; urutan ini supaya permintaan yang ditolak per klien tidak memakan kuota global, dan satu jaringan tidak bisa mematikan pencarian untuk semua orang; `/api/feedback` diubah ke urutan yang sama, mengoreksi ADR-037 butir 3) (helper dipindah ke `client-key.ts`, sama dengan `/api/feedback`), `Cache-Control: no-store` (cache kueri populer = S14), header `Server-Timing` (jumlah `meta.duration` D1 dan total handler; bolak-balik dan baris dibaca hanya bila `SEARCH_TIMING_DETAIL = "1"`, yaitu Preview, supaya kueri termahal tidak mudah dipetakan dari produksi). Kueri pengguna tidak dicatat (log Worker menghapus query string). Read replication D1 tidak dinyalakan: primary APAC (NRT) + satu bolak-balik sudah memenuhi target; replika baru berguna untuk pengguna jauh dari Asia Timur atau saat throughput primary jadi batas.

9. **`expand` (awalan) diterima dengan biayanya.** Awalan akar 3 huruf mengumpulkan banyak kata yang masing-masing di bawah 10% (staging: علم 17.090 baris dibaca / 45 ms SQL, نفس 19.275, قلب 14.884), ±2,5× kueri berperingkat terberat tanpa `expand` (أبو هريرة 7.665) tetapi jauh di bawah الله berperingkat (±42 ribu). Batas minimal 4 huruf ditolak: kebanyakan akar Arab 3 huruf, justru itu kegunaan `expand` (صبره, علمه). Dibatasi batas laju; tinjau bersama cache S14 (UI boleh tidak menyalakan `expand` secara bawaan).

**Konsekuensi:** hitungan smoke dan `buildInfo` kini mencakup `term_stat` dan `passage_fts`. Smoke korpus skema < 4 tidak lagi crash: tabel pencarian tidak dihitung dan smoke melaporkan "belum punya indeks pencarian", jadi `pnpm run corpus:promote ihya-v1 --switch-only` ditolak dengan pesan (bersama cek `meta.schema_version` = skema kode). Bila rollback ke korpus skema 3 dibutuhkan setelah `ihya-v2` aktif, longgarkan kedua pemeriksaan itu di `promote.ts` (S14); pencarian sendiri aman di skema lama (503).

**Tinjau ulang bila:** korpus berisi lebih dari satu kitab (reset per edisi termasuk `DELETE FROM passage_fts WHERE rowid BETWEEN`, `term_stat` per korpus, rows_read kueri berperingkat), cache kueri populer di S14, atau eval S15 menunjukkan ambang 10% / bobot catatan kaki merugikan relevansi.

## ADR-040 · Ayat (S12): teks Tanzil (XML), terjemahan + transliterasi Kemenag dari data pemilik (menggantikan QuranEnc), pencocok deterministik `{…}` + frasa pengantar, korpus `ihya-v3` (skema 5), penanda ayat S13 — diterima (pemilik, 2026-10-17) · 2026-10-17

**Konteks:** ADR-020 merencanakan teks Tanzil + terjemahan Kemenag lewat QuranEnc `indonesian_affairs`. Saat memulai S12, pemilik menulis: "Untuk data quran pakai surau-quran-kemenag. Ini adalah data yg saya miliki dari kemenag resmi … Jangan terlalu perketat lisensi, saya ingin ship dulu." Folder itu berisi ekstrak tabel Al-Qur'an dari dump DB Surau lama: terjemahan Kemenag (+678 catatan kaki), transliterasi Latin Kemenag, teks Arab QPC Hafs/Imlaei (QUL), metadata surah (QUL), dan pengantar surah (QUL). Metadata lisensinya mencatat `permitted` untuk terjemahan/transliterasi berdasarkan artikel berita Kemenag tentang API Qur'an Kemenag (bukan dokumen syarat pakai), dan `needs_review` untuk teks Arab QUL.

**Keputusan:**
1. **Sumber.**
   - Teks ayat tetap **Tanzil 1.1** (ADR-020, aturan keras CLAUDE.md), diunduh dalam format **XML**, bukan `txt-2`: basmalah pembuka surah ada di atribut `bismillah` terpisah, sedangkan format teks menempelkannya ke ayat 1 di 112 surah. `uthmani` untuk tampilan, `simple-clean` untuk pencocokan. Teks Arab QUL di data pemilik **tidak** ditampilkan; Imlaei hanya dipakai untuk cek silang penomoran (6 dari 6.236 ayat beda ejaan, semua bernomor sama).
   - **Terjemahan (dengan catatan kaki) dan transliterasi = data Kemenag milik pemilik** (asal quran.kemenag.go.id, salinan 2026-06-03), **menggantikan QuranEnc** (menyimpang dari ADR-020 atas arahan pemilik). Sama-sama terjemahan resmi Kemenag, sudah lengkap dengan catatan kaki, tanpa unduhan/API tambahan. Edisi terjemahan tidak tercatat di data, jadi tidak diklaim; versi ditulis "quran.kemenag.go.id, salinan 2026-06-03". Risiko lisensi (belum ada syarat pakai tertulis) **diterima pemilik**.
   - Nama Latin surah dan jenis wahyu dari metadata surah di data pemilik (QUL), nama Arab dari Tanzil, juz dari QUL. Pengantar surah QUL tidak dipakai (bukan Kemenag).
   - Semua berkas sumber dipin sha256 (`tools/ingest/src/quran/source.ts`, `data/SOURCES.md`). Blok hak cipta Tanzil disalin dari komentar XML ke `quran_source.attribution` dan `data/ATTRIBUTION.md`: syarat Tanzil untuk berkas turunan yang memuat sebagian besar teksnya (korpus/dump).
2. **Skema korpus 5 (migrasi 0005):** `quran_source` (id, jenis, versi, lisensi, atribusi, url, sha256), `quran_surah`, `quran_ayah` (`text_uthmani` + `text_index`, juz), `quran_translation` (terjemahan dan transliterasi dibedakan `quran_source.kind`; catatan kaki JSON `[{marker, text}]`, penanda seperti "1)" tetap di teks), `passage_ayah_ref`. Menyimpang dari rencana: kolom `lang/source/version` per baris diganti FK ke `quran_source`; ditambah `bracketed` dan `alt_count`.
3. **Pencocok** (`tools/ingest/src/quran/matcher.ts`, normalisasi `@surau/text`, `NORM_VERSION` tetap 1):
   - **Bentang `{…}`.** Shamela juga memakai `{…}` untuk menebalkan kata di hadits/takhrij (`{قال}`, `{ثم قال}`, `{وفيه}`, `{حميد مجيد}` dalam lafaz shalawat).
     - 1 kata ditolak (186 di Ihya, tidak satu pun ayat utuh).
     - 2 kata hanya diterima bila sama persis DAN: ayat utuh, atau pengantar kuat (تعالى/عز وجل/سبحانه/قرأ/تلا/نزلت) di dua kata sebelumnya, atau "الآية" sesudahnya, atau satu surah dengan kutipan sebelumnya di paragraf. "قوله" saja tidak cukup karena dipakai juga untuk lafaz hadits. 2–3 kata yang tidak persis (3 kata tanpa pengantar) tidak dicoba cocok mirip (`short_inexact`).
     - ≥3 kata: `exact` bila sama persis. `similar` bila ≥4 kata (3 kata: syarat pengantar yang sama), dengan penjajaran huruf semi-global (alif/waw/ya/hamzah dan ه↔ت setengah biaya), skor ≥ 0,93, dan minimal separuh kata sama persis.
     - Ambang diambil dari data. Beda ejaan yang diterima berskor ≥ 0,938 (أولوا/أولو, مسئولا, ما لهذا/مال هذا, من ما/مما), sedangkan kalimat bukan ayat 3 kata bisa berskor 0,86–0,95. Harga ambang konservatif: **2 ayat asli tetap tidak tertaut** (39:9 أم من/أمّن, skor 0,90; 13:22 ويدرؤون, 3 kata tanpa pengantar). Laporan menyebutnya "tidak cocok, tidak ditautkan", bukan "bukan ayat".
   - **Kutipan tanpa kurung** (wujud "heuristik konservatif" di rencana):
     - Hanya sesudah frasa pengantar (`قال/قوله/يقول [الله] تعالى | عز وجل | سبحانه …`).
     - Jangkar 3 kata sama persis, lalu diperpanjang kata demi kata. Beda ejaan kecil boleh di tengah (السموات/السماوات; "kecil" = biaya ≤ 0,5, atau ≤ 1 untuk kata ≥ 5 huruf, jadi ربك/ربه tidak dianggap mirip), tetapi kutipan dipotong di kata terakhir yang sama persis (kata mirip di ujung biasanya kata penulis: ولما/ولا).
     - Bila beberapa jangkar sama panjang, hanya yang kata persisnya terbanyak yang bersaing; label `exact`/`similar`, skor, dan `alt_count` (letak lain berlafaz mushaf identik) dihitung dari letak yang dipilih (temuan peninjau).
     - Minimal 4 kata; berhenti di `{` berikutnya.
     - Di Ihya ada 648 kutipan seperti ini (610 persis, 38 mirip), sehingga cakupan hampir dua kali lipat (1.002 berkurung + 648).
     - Keterbatasan yang diketahui: "قال الله تعالى" juga membuka hadits qudsi; hadits qudsi yang dimulai dengan lafaz Qur'ani ≥ 4 kata (mis. أنا الله لا إله إلا أنا = 20:14) ikut ditautkan sebagai ayat. Dijaga tinjauan T-16 dan eval S15.
   - **Lafaz di beberapa letak:** pilih ayat utuh, lalu surah kutipan sebelumnya di paragraf, lalu urutan mushaf. `alt_count` disimpan dan ditampilkan ("juga di N tempat lain"). Rentang lintas surah ditolak.
   - **Gerbang ingest** (invarian, ingest gagal bila dilanggar):
     - exact ≥ 95% dari `{…}` tervalidasi (hasil 977/1.004 = 97,3%; mirip 25; tidak cocok 2);
     - rujukan sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada);
     - setiap kutipan `exact` benar-benar ada di teks ayat rujukannya, ayat utuh = sama persis (1.587/1.587);
     - sumber utuh;
     - beda QUL vs Tanzil ≤ 20.
4. **Core.**
   - `Passage.ayah_refs` (juga ikut `readSection`), `PageView.quran` (ayat utuh + terjemahan + transliterasi + surah + sumber dalam satu batch D1; kunci `surah·1000+ayah` lewat `json_each` → pencarian kunci utama), dan `getAyahRefs`.
   - Korpus skema < 5 (produksi `ihya-v1`): kueri rujukan gagal, lalu `meta` dicek, lalu rujukan kosong. Halaman tetap tampil (+1 kueri gagal + 1 kueri `meta` per render ISR). `getAyahRefs` menjawab `Unavailable`.
   - `quranForRefs` memecah per ≤ 300 ayat (`QURAN_AYAT_MAX`), jadi halaman yang merujuk banyak ayat tidak gagal; terjemahan dan transliterasi dipilih menurut ID sumber (`QURAN_SOURCE`), dan `quran.sources` hanya memuat satu sumber per jenis.
5. **Penanda ayat S13** (`packages/core/src/ayah-placeholder.ts`).
   - Placeholder `⟦QS s:a⟧` / `⟦QS s:a-b⟧`; `maskAyat(text_raw, ayah_refs, footnote_refs)`/`unmaskAyat` round-trip. Penanda `(١)` di dalam kutipan dipindah tepat sesudah placeholder (tidak hilang); rujukan yang batasnya jatuh di tengah penanda dilewati (aturan sama dengan web). Pola placeholder lewat `ayahPlaceholderPattern()` (RegExp baru, tanpa `lastIndex` bersama).
   - `checkPlaceholders` menolak keluaran LLM yang kehilangan, menggandakan, atau mengarang placeholder.
   - `translationSegments` memberi label `ai_translation`, `kemenag`, atau `kemenag_full_ayah` (kutipan sebagian). Placeholder asing atau tanpa terjemahan = `invalid`, tidak dirender sebagai terjemahan.
6. **UI pembaca.**
   - Kutipan diberi warna halus tanpa latar. Sesudahnya (untuk `{…}`: sesudah kurung tutup) ada label "QS s:a" sebagai tombol: HoverCard di desktop, Popover di layar sentuh, pola yang sama dengan penanda catatan kaki. Nama aksesibel diawali label yang terlihat (WCAG 2.5.3) dan tombol ber-`lang="id"` di dalam blok Arab (juga penanda catatan kaki).
   - Isi popup: nama surah, catatan (sebagian ayat / beda ejaan / letak lain), teks Tanzil, transliterasi, terjemahan Kemenag + catatan kaki, sumber, dan tautan `tanzil.net/#s:a`. Kutipan sebagian = "Terjemahan ayat lengkap (Kemenag)".
   - Teks label memakai CSS `content: attr(data-label)` supaya tidak ikut tersalin bersama teks Arab; pembaca layar memakai `aria-label`.
   - Footer halaman: atribusi dari `quran_source`. `/lisensi` mendapat bagian "Ayat Al-Qur'an".
7. **Korpus `ihya-v3`** dimuat ke D1 lokal dan `surau-corpus-staging` (±80 dtk). Produksi tetap `ihya-v1` sampai promote di S14 (versi yang dipromosikan harus ≥ `ihya-v3`).

**Konsekuensi:**
- Smoke korpus skema < 5 melaporkan "belum punya tabel ayat", jadi `corpus:promote --switch-only` ke `ihya-v1`/`ihya-v2` ditolak (sama dengan catatan ADR-039), kecuali `promote.ts` dilonggarkan.
- `.claude/rules/teks-arab.md` butir 9, docs/04, dan ARSITEKTUR-TEKNIS diperbarui (Kemenag dari data pemilik).

**Tinjau ulang bila:**
- Kemenag/LPMQ menerbitkan syarat pakai, atau pertanyaan tashih (PMA 44/2016) terjawab;
- korpus berisi lebih dari satu kitab (tabel Qur'an bersama, reset per edisi);
- eval S15 atau tinjauan T-16 menemukan rujukan salah.

> ADR-041 sengaja dilewati: PR #30 (pohon daftar isi, belum digabung) menulis ADR bernomor 040 yang sudah dipakai S12, jadi nomor berikutnya disisakan untuknya.

## ADR-041 · Pohon daftar isi: `NavigationTree` react-aria + garis pemandu sendiri menggantikan `FileTree` HeroUI Pro; satu bagian aktif. Sampul kitab 3D (`Book`) dan kartu kitab `Widget` — diterima · 2026-10-17

**Konteks:** Pemilik meminta pohon daftar isi bergaya garis pemandu induk → anak (siku melengkung di anak terakhir), hanya SATU baris aktif berlatar, dan garis menuju baris aktif berwarna aksen. `FileTree` Pro hanya punya garis tegak generik (`showGuideLines`), tanpa siku, tanpa warna per jalur, dan menyorot setiap bagian di `activeIds` (halaman dengan beberapa bagian = beberapa latar, termasuk induknya).

**Keputusan:**
1. `TocTree` memakai `NavigationTree` react-aria-components 1.22 (sudah terpasang): baris adalah tautan dengan `aria-current="page"`, navigasi panah/Enter, chevron `slot="chevron"`. Gaya ditulis di `globals.css` (`.toc-*`) dengan token HeroUI (`--border`, `--accent`, `--accent-soft`, `--default`, `--focus`, `--radius`). Impor `file-tree.css` Pro dihapus.
2. Bagian aktif = **bagian terakhir** yang tampil di halaman (`activeIds.at(-1)`, keputusan pemilik). Breadcrumb tetap memakai bagian pertama.
3. Tautan daftar isi kini `<halaman awal>#bab-<id>` (`tocHref`), sama seperti breadcrumb: unik per bagian (beberapa bagian bisa mulai di halaman yang sama, sedangkan `selectedRoute` dicocokkan lewat `href`) dan mendarat di judul bagiannya.
4. Garis dihitung di `tocRows` (`lib/reader/toc.ts`, teruji): per leluhur satu kolom `line`/`end`/`none`; aksen hanya jalur induk langsung → bagian aktif (batang di bawah chevron induk, garis tegak melewati saudara sebelumnya, siku ke baris aktif).

5. Komponen `Book` (`components/book/`, permintaan pemilik): sampul buku 3D meniru Geist Book (vercel.com/geist/book), murni CSS (`book.css`, aman di Server Component). Geometri dan bayangan mengikuti Geist; warna memakai token HeroUI/Zaitun. Tambahan Surau: `direction="rtl"` (punggung di kanan seperti kitab Arab), pola khatam SVG buatan sendiri (`BookPattern`), tekstur noise SVG (gambar tekstur Vercel tidak dipakai), dan gerak mati saat "kurangi gerakan". `WorkCover` = sampul kitab Surau (judul Arab dari DB lewat `ArabicInline`, judul Latin + pengarang), warna hijau zaitun tetap di kedua tema. Dipakai di kepala halaman karya (tautan "mulai membaca") dan kartu `/kitab`.
6. Kartu `/kitab` memakai `Widget` HeroUI Pro (impor `widget.css`): sampul di header, judul/pengarang di konten; baris lisensi dan tombol dihapus atas permintaan pemilik (lisensi tetap di halaman karya dan `/lisensi`). Seluruh kartu bisa diklik lewat tautan judul (`after:inset-0`); sampul miring saat kartu di-hover atau tautannya difokus keyboard (`book-trigger`). CSS `checkbox` (dulu untuk FileTree) dihapus.
7. Rak kitab di Beranda (permintaan pemilik): `BookRing`, rak putar 3D dari daftar karya (`listWorks`). Buku = benda padat (Book + permukaan punggung `spine`), punggung menghadap keluar; buku terdepan berputar menghadap dan maju. Putar dengan seret (momentum + berhenti tepat di satu buku), gulir horizontal, panah (arah RTL), atau Tab ke tautan buku; klik buku belakang memutarnya ke depan, klik buku terdepan membuka edisinya. Putaran otomatis bertahap (satu buku tiap 4 dtk, jeda lewat timer, rAF hanya saat bergerak, berhenti di luar layar). Kedalaman = lapisan warna latar di tiap sisi (opacity meratakan 3D). Kurang dari 3 karya atau "kurangi gerakan" → rak datar (Book bertautan). Diadaptasi dari pola circular carousel (contoh pemilik), tanpa potongan melengkung dan tanpa memuat gambar. Beranda kini `force-dynamic` (satu query D1 seperti `/kitab`); pembaca tertutup atau D1 gagal → rak disembunyikan (galat dicatat), Beranda tetap tampil. Gerak buku dua fase: ditarik keluar dulu, baru diputar menghadap (urutan terbalik saat kembali); pegas sedikit kurang teredam (rasio 0,72, lewat ±3% lalu menetap). Hover/fokus buku terdepan: naik ±6 px, bayangan lantai per buku melebar dan memudar (sampul tidak dibuka, atas permintaan pemilik: sederhana). Panah memindahkan fokus ke buku terdepan. Lantai rak = bidang datar di dasar buku. Cahaya dan kedalaman: kecerahan tiap sisi buku dihitung per bingkai dari arah hadapnya terhadap cahaya tetap kiri-depan (`filter: brightness`, ambien 0,74 + difus 0,32), sisi atas lebih terang dan bawah lebih gelap; buku di belakang diburamkan maks. 1,5 px hanya di perangkat pointer halus (diukur: median 16,6 ms/bingkai dengan atau tanpa blur, juga dengan CPU 4× diperlambat; blur menambah satu lonjakan ±40 ms di bingkai pertama). Mode gelap: kertas sedikit diredupkan.
8. Latar kertas (permintaan pemilik, sama dengan portofolio pemilik `Backdrop`/`PaperFibre`): serat kertas `PaperTexture` dari `@paper-design/shaders-react` 0.0.81 (Apache-2.0, dipin persis karena 0.x) dengan roughness dan fiber 0,3, tanpa lipatan/kerutan/bercak, dirender sekali (`speed` 0) setelah event `load` lewat `next/dynamic` tanpa SSR; plus butiran noise SVG 5% (CSS). Keduanya lapisan tetap di atas semua isi (`pointer-events: none`): serat `multiply` 55% di atas kertas putih (gelap: `screen` di atas hitam), jadi navbar, sidebar, dan kartu ikut bertekstur tanpa pita polos dan warna teks tidak berubah. Impor lewat modul perantara (`paper-texture.ts`, ekspor bernama statis) supaya hanya PaperTexture yang dibundel, di luar muatan awal. Tanpa WebGL2 latar tetap polos. Percobaan sebelumnya (preset "Flat" yang lebih kasar, lalu tile CSS ala footer paper.design) ditolak pemilik. **(Diganti oleh ADR-058: shader dipanggang jadi tile statis.)**
9. Tinta di kertas (permintaan pemilik): semua teks **(sejak ADR-058: hanya judul Latin `h1`–`h6`)** diberi bayangan 0,6 px sewarna huruf (sepertiga kekuatan) seperti tinta meresap; judul Latin `h1`/`h2` (selain judul bab Arab) diisi warna teks + noise halus lewat `background-clip: text` (terang: bintik memudar `screen`, gelap: bintik menggelap `multiply`) dengan resapan lewat `drop-shadow`. Teks Arab hanya mendapat resapan; bagian Arab di dalam judul tetap tinta penuh (`-webkit-text-fill-color: currentColor`) supaya harakat tajam. Cek axe terang/gelap lolos.

**Tinjau ulang bila:** HeroUI merilis pohon navigasi dengan garis pemandu per jalur, daftar isi butuh virtualisasi (kitab dengan ribuan bagian), atau katalog berisi banyak kitab (sampul per kitab, kinerja transform 3D di daftar panjang).

## ADR-042 · Pencocok ayat S13: kutipan pendek sesudah pengantar dan kutipan tanpa tanda (hanya lafaz satu-satunya di mushaf, paragraf badan) — diterima · 2026-10-17

**Konteks:** S13 menguji 20 paragraf. Di satu paragraf, model menerjemahkan ayat 3:120 karena kurung di sumber salah tempat (`{وقال} إن تمسسكم حسنة تسؤهم`): kurungnya membungkus kata "وقال", bukan ayatnya, sehingga dua mode S12 (`{…}` dan frasa pengantar `قال تعالى …`, ADR-040) melewatkannya. Pemindaian seluruh paragraf badan Ihya menemukan **435–580 paragraf** dengan deret ≥5–6 kata yang sama persis dengan mushaf, tetapi tidak ditandai. Di batch pertama, model juga mengarang placeholder untuk ayat pendek yang luput (`قال تعالى واسجد واقترب`, 2 kata). Tanpa tanda, LLM menerjemahkan ayat-ayat itu, padahal aturan keras 2 melarangnya.

**Keputusan:** dua mode baru di `tools/ingest/src/quran/matcher.ts`, hanya cocok **persis** dan hanya untuk **paragraf badan** (catatan kaki tidak diterjemahkan, jadi mode longgar di sana hanya menambah risiko):
1. **Kutipan pendek sesudah pengantar** (`cue_short`): 2–3 kata tepat sesudah frasa pengantar kuat S12 (`قال/قوله … تعالى | عز وجل | سبحانه`) yang tidak cukup panjang untuk mode pengantar biasa (≥4).
   - 3 kata: lafaz di ≤2 letak mushaf. 2 kata: satu-satunya letak, pengantarnya bukan "يقول …" (pembuka hadits qudsi), dan tidak diawali kata fungsi (لا، في، قال، من، على، إلى، عن، إن، أو، ثم). Contoh yang ditolak: hadits qudsi "قال الله تعالى لا يزال العبد…", "قال الله تعالى في الزبور".
   - Bila kutipan berlanjut di ayat yang sama dengan ejaan lain, bentang **diperpanjang** (`similar`) melewati kata mirip, satu kata sumber = dua kata mushaf (أينما = أين ما), atau sebaliknya, sampai kata terakhir yang sama persis. Temuan peninjau kedua: tanpa ini hanya "وهو معكم" yang ditandai, dan sisa ayat "أينما كنتم" diterjemahkan model.
   - Ditolak juga bila jendela 6 kata sesudah pengantar cocok mirip (skor ≥0,85) dengan letak **lain**: kutipan sebenarnya berejaan lain dan lebih panjang (وإذا لم يهتدوا = 46:11, bukan 7:203).
2. **Kutipan tanpa tanda** (`unmarked`): deret ≥5 kata yang sama persis dengan mushaf di mana pun dalam paragraf, atau ≥4 kata tepat sesudah pengantar ayat (تعالى، عز وجل، سبحانه، قرأ، تلا، نزلت، أنزل, atau "{وقال}" yang dikurung sumber). Syarat tambahan (temuan peninjau S13: versi pertama menautkan "إن الله غفور رحيم" ke ayat larangan bangkai, zikir "وهو على كل شيء قدير", dan basmalah pembuka khutbah):
   - **hanya lafaz yang satu-satunya di mushaf** (`alt_count = 0`), kecuali deret yang tepat didahului pengantar ayat (تعالى، عز وجل …), karena di situ jelas kutipan dan letaknya dipilih dengan aturan S12. Untuk lafaz berulang tanpa pengantar, letak mana pun praktis sembarang dan terjemahan "ayat lengkap" jadi salah konteks;
   - "قال/قوله/يقول" saja bukan pengantar (dipakai juga untuk hadits dan ucapan orang), kecuali "{وقال}"/"{ثم قال}" yang dikurung sumber;
   - tidak dihitung: kalimat tauhid saja, istirja' (إنا لله وإنا إليه راجعون) dan hasbalah (ucapan, bukan kutipan), deret berawal basmalah (pembuka kitab/khutbah), dan deret dalam konteks hadits/zikir (رسول، النبي، وسلم، "لا شريك له" dalam 16 kata sebelumnya tanpa pengantar ayat di antaranya). Deret yang ditolak dilompati seluruhnya.
3. Tidak ada kolom baru: rujukan baru disimpan dengan `bracketed = 0`. Laporan ayat punya baris dan bagian sendiri (20 sampel acak dengan seed lain). **Sampel T-16 tetap diambil dari dua mode S12**, jadi daftar yang sedang diperiksa pemilik tidak berubah.
4. Invarian S12 berlaku untuk semua mode: rujukan sah, dan setiap kutipan `exact` benar-benar ada di teks ayat rujukannya. Gerbang exact ≥95% `{…}` tidak berubah (97,3%).

**Alasan:** rujukan ke ayat yang salah lebih buruk daripada tidak menandai, karena terjemahan Kemenag ayat lain tampil di tengah kalimat. Tidak menandai berarti LLM bisa menerjemahkan ayat. Syarat "lafaz satu-satunya" + "persis" menjaga rujukan benar.

**Sisa risiko yang diterima (jujur):** ayat yang luput dari pencocok (lafaz berulang tanpa pengantar, ejaan jauh berbeda, ≤3 kata tanpa pengantar, pengantar yang tidak dikenali) **biasanya langsung diterjemahkan model sebagai bagian kalimat**, di bawah label "terjemahan AI". Validasi batch hanya menangkap sebagian: placeholder karangan model dan transliterasi berdiakritik dekat placeholder ditolak (ADR-043). Contoh dari data S13: 19:72 sesudah "{ثم قال}" (kini dikenali) dan "ومزاجه من تسنيم" (83:27). Jumlahnya belum terukur. Ini **tidak** melanggar invarian ingest, yang hanya memeriksa rujukan yang dikenali. Mitigasi berikutnya: daftar "kemungkinan ayat belum ditandai" di laporan terjemahan, QA T-17, eval S15, dan pemindai deret mirip panjang (bukan hanya persis) di sesi berikut.

**Konsekuensi:** pembaca menampilkan lebih banyak label "QS s:a" setelah korpus baru dipromosikan (S14); angka akhir ada di laporan ayat. Ayat yang dikutip penulis dengan lafaz berulang (mis. "إن الله غفور رحيم") tanpa kurung atau pengantar tetap tidak ditandai, dan bisa diterjemahkan model sebagai bagian kalimat; ini sisa risiko yang diterima dan dipantau lewat QA T-17 dan eval S15.

**Tinjau ulang bila:** tinjauan T-16 atau eval S15 menemukan rujukan baru yang salah, atau kitab kedua memakai lafaz Qur'ani dalam prosa jauh lebih sering.

## ADR-043 · Batch terjemahan & ringkasan AI (S13): satu request per paragraf, prompt v2, ringkasan dua putaran, validasi berlapis, kirim bertahap, korpus `ihya-v4` — diterima · 2026-10-17

**Konteks:** S13 membuat terjemahan Indonesia setiap paragraf badan Ihya (16.111) dan ringkasan ID + EN setiap simpul daftar isi (313) sekali, lewat Message Batches Claude Haiku 5.5 (ADR-013). Token Arab diukur dengan `count_tokens`: **0,716 token/karakter = 1,84× o200k** (200 paragraf acak, `data/reports/ihya-9472-token.md`).

**Keputusan:**
1. **Paket `@surau/llm`** (`packages/llm`): klien `@anthropic-ai/sdk` 0.135.0 (OpenTelemetry SDK dimatikan), `custom_id`, prompt berversi di `prompts/`, request, validasi keluaran, dan harga. Tanpa `node:*`, sehingga bisa dipakai Worker di S19. Alat lokal ada di `tools/ingest/src/llm` (`pnpm llm …`); kunci dibaca dari `.env` hanya oleh perintah yang memanggil API.
2. **Satu request per paragraf** (`passage-<id>`), sesuai rencana. Paragraf sebelumnya di bagian yang sama ikut sebagai konteks `<sebelumnya>` (tidak diterjemahkan), begitu juga jalur judul bab. Paragraf digabung beberapa per request **ditolak** untuk v1: biaya prompt sistem per request memang tinggi (±4.300 token × 16.111 = 70 juta token), tetapi dengan cache 1 jam di batch, ringkasan putaran 1 menunjukkan cache terbaca ±96%. Penggabungan butuh keluaran JSON dan uji kualitas baru.
3. **Prompt v2** (`translate-passage@2`, `summarize-section@2`), hasil uji kecil v1. Prompt v1 mengarang placeholder untuk lafaz hadits berkurung, mengubah penanda `(٢)` menjadi `(2)`, menulis "berfirman" untuk Nabi, dan memparafrasekan ayat di ringkasan. Glosarium ±110 istilah (transliterasi Latin, ejaan KBBI/Kemenag) ada di prefix yang di-cache. Ayat tetap dikirim sebagai placeholder (ADR-040).
4. **Ringkasan dua putaran.** Putaran 1 meringkas teks Arab bertanda milik setiap simpul. Teks dipecah per halaman cetak menjadi potongan ≤50 ribu token perkiraan (0,72 token/karakter); di Ihya ada 315 potongan, terbesar 57.011 token termasuk prompt sistem; pembuka simpul induk yang hanya berisi judul (<80 huruf, 17 simpul) tidak diringkas. Putaran 2 meringkas simpul induk dan daun yang terpecah (89 simpul) dari **semua** ringkasan putaran 1 di subpohonnya, urut baca; prompt terbesar 83.231 token (rub' pertama). Cukup dua putaran berapa pun dalam pohonnya.
5. **Validasi berlapis** (v2 setelah batch pertama dan tinjauan peninjau).
   - **Saat dikumpulkan:** stop reason; placeholder sama persis; **tanpa huruf Arab sama sekali** (aturan teks-arab 1); penanda catatan kaki berangka Arab yang tidak ada di sumber ditolak, penanda yang hilang hanya dicatat (model membuangnya di ±4% paragraf; takhrij tetap tertaut di teks Arab di sebelahnya), dan penanda yang ditulis dengan angka Latin/superskrip dikembalikan deterministik; transliterasi berdiakritik (ā ī ū ḥ …) dalam 80 karakter dari placeholder ditolak (tanda model menulis ulang lafaz ayat); rasio panjang 0,8–4 tanpa harakat (v3); tanpa Markdown, kalimat pembuka, atau komentar model ("Let me…", "Maaf, saya ulangi"). Ringkasan: bahasa benar, tanpa placeholder/rujukan "QS"/huruf Arab.
   - **Hasil lolos selalu dibangun ulang dari hasil mentah** (`collect`, `rejudge`): perubahan aturan validasi atau pencocok ayat cukup dinilai ulang tanpa membayar lagi. Heuristik "yakni/maksudnya sesudah placeholder" dan "kutipan sesudah placeholder" diuji lalu **ditolak**: semua kasusnya sah (tafsiran al-Ghazali sendiri, doa atau ucapan sesudah ayat).
   - **Saat ingest:** setiap hasil dicek ulang terhadap sumber saat ini lewat sha256 teks bertanda (hasil usang, mis. setelah ADR-042 mengubah rujukan ayat, tidak dimuat) dan divalidasi ulang. Invarian baru: setiap kutipan ayat di paragraf yang diterjemahkan dirender sebagai segmen Kemenag utuh oleh `translationSegments` (seperti di UI); cakupan terjemahan dan ringkasan ≥99% (`expect.llmCoverage`).
   - **v4 (temuan peninjau ketiga):** sisa ±17 terjemahan dengan label/komentar model ("Terjemahan:" di tengah teks, "mari terjemahkan", "Lanjutkan terjemahan", "bukan terjemahan"). Aturan: kata "terjemah…" di terjemahan ditolak kecuali sumbernya memuat ترجم (7 pemakaian sah semuanya menerjemahkan ترجمة); kurung kurawal di keluaran ditolak; pola "mari …", "lanjutkan di bawah", "[tidak", "teks yang diberikan". Akar masalahnya: prompt menyebut label "terjemahan AI" dan model menggemakannya; ubah di prompt v3 (sesi berikut).
   - **v3 (temuan peninjau kedua):** ±1,4% keluaran yang lolos v2 memuat komentar atau koreksi-diri berbahasa Indonesia ("Maaf, bagian di atas keliru. Berikut terjemahannya:", "Catatan: …", dua versi terjemahan, tag `<teks>`, label "terjemahan AI"). Kini ditolak dengan pola spesifik (kata biasa seperti "memberi maaf" tidak ikut); rasio panjang maksimal 4 (p99 hasil = 3,1; versi ganda di atas 4); ringkasan dengan ≥3 kata fungsi bahasa lain ditolak (ringkasan wajar: 0). Baris kosong yang memecah satu paragraf menjadi beberapa (±4%, sumber tidak pernah punya baris baru) diterima bila tidak ada pola di atas.
   - **Ringkasan putaran 2** menyimpan sha256 teks ringkasan putaran 1 yang dipakainya; bila salah satu anak ditolak atau diulang sesudahnya, ringkasan induk dianggap usang dan dikirim ulang.
   - **Ulangan:** `refusal` diulang dengan Sonnet 5.5; lainnya dengan Haiku, kecuali **percobaan ke-3 yang selalu Sonnet 5.5**; ringkasan mendapat satu percobaan Sonnet lagi (maks. 4–5 percobaan) karena satu ringkasan anak yang gagal menghalangi ringkasan putaran 2 semua induknya. Alasannya, di batch S13 sebagian paragraf sulit tetap menghasilkan keluaran Haiku yang rusak setelah dua kali gagal (Arab-Indonesia campur, "Let's translate carefully"). Ini perluasan ADR-013, yang semula memakai Sonnet hanya untuk refusal. Menyerah hanya setelah Sonnet ikut dicoba. Model per baris tercatat di `translation.model`/`summary.model`. Paragraf yang gagal karena model menulis placeholder sendiri **dibiarkan tanpa terjemahan** (lebih baik kosong daripada AI menerjemahkan ayat) dan didaftar di laporan sebagai "kemungkinan ayat belum ditandai".
6. **Kirim bertahap** (`submit --kind/--limit`): ringkasan putaran 1 dan 4.000 paragraf pertama dulu. Biaya aktualnya dipakai untuk memproyeksikan total sebelum sisanya dikirim. Pemilik menyetujui **±$6** (skenario cache 50%) dan **berhenti bila proyeksi melewati $7,20**; `submit --budget 7.2` dan `retry --budget 7.2` menolak bila biaya terpakai + perkiraan (`count_tokens`, cache 50%) melewatinya. `submit`/`retry` hanya mengirim request yang sumbernya sama dengan korpus saat ini, belum lolos untuk sumber itu, dan tidak sedang diproses; `batches.create` tanpa ulang otomatis (POST yang timeout bisa sudah diterima, ulangan = batch ganda).
7. **Penyimpanan:** `data/build/llm/` (git-ignored, jangan dihapus) berisi request terkirim, hasil mentah per batch, hasil yang lolos, kegagalan, dan `batches.json` dengan biaya aktual dari `usage`. Laporan tanpa teks kitab: `data/reports/ihya-9472-terjemahan.md`.
8. **Korpus `ihya-v4`, skema tetap 5:** tabel `translation`/`summary` sudah ada sejak migrasi 0001, jadi cukup masuk `TABLE_ORDER` (reset dan smoke ikut). `translation.text` menyimpan placeholder; `review_status = 'ai_generated'`; `model`, `prompt_version`, dan `created_at` (waktu selesai batch) per baris.

**Ditolak:** terjemahan tanpa konteks paragraf sebelumnya (rujukan "ia/hal itu" sering salah); satu request per bahasa ringkasan digabung JSON (hemat ±$0,2, tetapi ringkasan teks polos lebih sederhana dan per bahasa bisa diulang sendiri); menyimpan hasil LLM di git (repo publik; keputusan pemilik bila nanti dibutuhkan untuk tinjauan ustadz).

**Konsekuensi:** `translation`/`summary` dibangun ulang setiap ingest dengan `review_status = 'ai_generated'`, jadi status tinjauan manusia (S18) harus disimpan di luar hasil batch dan digabung saat ingest. Biaya terbesar adalah prompt sistem yang dibaca dari cache, jadi biaya batch bergantung pada hit rate cache (perkiraan $2,6 pada 95% sampai $9,2 tanpa cache). Hasil LLM hanya ada di Mac pemilik sampai korpus dimuat ke D1; cadangkan `data/build/llm/` bersama drive data.

**Tinjau ulang bila:** QA T-17 menemukan Salah >10% (prompt v3 lalu ulangi paragraf terdampak); kitab berikutnya jauh lebih besar (pertimbangkan beberapa paragraf per request); atau tinjauan ustadz membutuhkan riwayat hasil di git.

## ADR-044 · Cari bahasa Indonesia (S14): indeks terjemahan/ringkasan AI dengan stem ringan, gabungan RRF tiga jalur dalam satu batch, cache hasil per versi korpus, filter bagian, korpus `ihya-v5` (skema 6) — diterima · 2026-10-17

**Konteks:** S14 menambah pencarian berbahasa Indonesia di atas jalur Arab S11 (ADR-039), memakai terjemahan dan ringkasan AI dari S13 (ADR-043), lalu membangun halaman `/cari`. Batas: tanpa LLM saat mencari, p95 handler staging < 300 ms tanpa cache, dan teks Arab di hasil tetap irisan `text_raw`.

**Keputusan:**
1. **Indeks** (migrasi 0006, skema 6): `translation_fts` (rowid = `passage_id`) dan `summary_fts` (rowid = `toc_node_id`). Keduanya contentless + `contentless_delete=1`, `unicode61 remove_diacritics 2`, satu kolom `terms`, hanya bahasa `id`. Yang diindeks hanya teks AI: placeholder `⟦QS s:a⟧` dibuang, jadi terjemahan Kemenag tidak pernah dicari sebagai teks model. Indeks `toc_node_start` ditambahkan untuk ringkasan per halaman di pembaca. Isi indeks dihitung ingest dengan fungsi yang sama dengan sisi kueri; versinya disimpan di `meta.latin_norm_version`.
2. **Teks Latin** (`packages/text/src/latin.ts`, terpisah dari normalisasi Arab dan `NORM_VERSION`):
   - **Token dan normalisasi:** huruf Latin + angka ASCII; apostrof di tengah kata ikut kata lalu dibuang (mu'amalah = muamalah); NFKD tanpa diakritik (ṣabr = sabr).
   - **Stopword kecil:** kata fungsi, kata ganti, dan preposisi berakhiran -nya/-mu/-ku; dicek sebelum stem.
   - **Varian ejaan → ejaan glosarium S13** (taubat → tobat, shalat → salat, dzikir → zikir, …), sebelum dan sesudah stem (bertaubat = bertobat): hanya varian ejaan, bukan sinonim.
   - **Stem ringan Tala (2003)** (partikel, kata ganti milik, awalan me-/pe-/di-/ter-/ke-/ber-/per-, akhiran -kan/-an/-i), dengan pengecualian kecil dari tinjauan kosakata terjemahan Ihya: akar mirip partikel (sedekah, masalah, …, *-llah*), akar mirip kata ganti (ilmu, tanya, …), dan kata yang awalannya tidak dibuang karena bertabrakan makna (perhatian ≠ hati, berdiri ≠ diri, kedudukan ≠ duduk, pendapat ≠ dapat).
   - **Uji sebelum dipakai** (langkah 1). Indeks tanpa stem vs dengan stem atas 16.086 terjemahan:
     - Kecocokan naik: sabar 173 → 404, niat 300 → 448, syukur 131 → 242, ikhlas 152 → 219, cinta dunia 178 → 328, keutamaan ilmu 90 → 197.
     - Varian ejaan: taubat 11 → 248.
     - 5 teratas "sabar", "niat", dan "adab murid kepada guru" semuanya relevan.
     - Tabrakan yang tersisa: kecil dan dicatat (kehati-hatian → hati 56×, menempatkan → empat ±130×, mendirikan → diri 14×).
     - Kesimpulan: stem dipakai.
3. **Deteksi bahasa kueri:**
   - Huruf Arab saja (angka di sampingnya tidak dihitung sebagai kueri Indonesia) → jalur S11 apa adanya (bm25, pengaman kata umum, total eksak).
   - Huruf Latin saja → jalur terjemahan + ringkasan.
   - Keduanya → tiga jalur; bagian Arab yang semua katanya umum tidak dicari (`warning: "common_terms_ignored"`).
4. **Gabungan RRF** (`searchCorpusFused`, satu `batch` D1 = satu bolak-balik, SQL disusun dari potongan konstan + parameter bernomor):
   - **Kandidat per jalur:** paragraf teratas bm25 per jalur (`FUSION_DEPTH` 100, ringkasan `SUMMARY_DEPTH` 30).
   - **Skor:** paragraf = Σ 1/(60 + peringkat).
   - **Ringkasan → paragraf:** ringkasan yang cocok dipetakan ke paragraf badan pertama milik node itu di halaman awalnya (sama dengan jangkar `#bab-<id>` pembaca). Node tanpa paragraf sendiri di sana → paragraf pertama turunannya di halaman itu, dicari lewat CTE rekursif yang hanya menelusuri turunan yang mulai di halaman yang sama (bukan urutan ID: node patch bisa ber-ID lebih besar dari anaknya). Bila dua bagian berawal di paragraf yang sama, peringkat terbaik dipakai.
   - **Halaman:** diurutkan menurut skor paragraf terbaiknya, lalu jumlah paragraf. `total_pages`/`total_hits` dihitung di atas himpunan kandidat (`fusion` di keluaran).
   - **Kata kueri Indonesia:** semua kata harus ada (AND). Bila jalur terjemahan + ringkasan bersama-sama punya < 5 kecocokan semua kata, kecocokan sebagian kata (OR) menyusul di belakangnya (`matched_by[].all_terms = false`).
5. **Kontrak** (hanya menambah field):
   - `searchView`: `latin_terms`, `paths`, `fusion`, `section_id`, warning `common_terms_ignored`.
   - `searchHit`: `matched_by` (jalur + peringkat, skor yang bisa dijelaskan), `translation` dan `summary` (potongan berlabel AI + sorotan; potongan tidak pernah memotong placeholder ayat).
   - `score`: bm25 untuk kueri Arab saja, RRF untuk lainnya.
   - Hasil Arab juga membawa terjemahan paragrafnya.
   - `readPage`: `translation` per paragraf dan `summaries` bagian yang mulai di halaman itu.
6. **Filter bagian** (`section_id` / `?section=`): node daftar isi + turunannya lewat CTE rekursif, berlaku di ketiga jalur. Node tidak ada atau milik edisi lain → `NotFound`. UI: rub' (TagGroup) lalu kitab (NativeSelect), URL `?bagian=`.
7. **Cache hasil** (langkah 8):
   - **Tempat:** Cache API Workers (`caches.default`, per data center, `s-maxage` 7 hari; menurut docs Cloudflare berfungsi juga di workers.dev).
   - **Kunci:** sha256 dari nama DB korpus produksi + rencana kueri ternormalisasi (`searchCacheKey`: stem Arab/Indonesia + opsi + versi normalisasi + konstanta peringkat/potongan + `SEARCH_RESULT_VERSION`, dinaikkan bila keluaran berubah tanpa konstanta itu berubah); teks kueri tidak masuk kunci maupun isi cache (`query` disimpan kosong dan diisi ulang saat hit).
   - **Versi korpus:** var `SEARCH_CACHE_CORPUS`, sama dengan `database_name` CORPUS_DB; `corpus:promote` mengganti keduanya, dijaga tes.
   - **Tanpa cache:** Preview (staging dimuat ulang tanpa versi baru) dan `next dev`.
   - **Urutan:** cache diperiksa sebelum rate limiter; yang lolos cache tidak menyentuh D1.
8. **UI:**
   - **`/cari`:** kerangka + pilihan filter dirender server per request (seperti `/kitab`: CI tanpa D1). Hasil diambil klien dari `/api/search` (rate limit + cache), jadi `?q=` bisa dibagikan tanpa render server per kueri.
   - **Kartu:** potongan Arab asli dengan `<mark>`, terjemahan AI berlabel, ringkasan bagian, asal kecocokan; maks 3 paragraf per kartu, paling relevan dulu.
   - **Palet ⌘K/Ctrl+K** di navbar (Command Pro); menu Cari aktif.
   - **Pembaca:**
     - Terjemahan AI per paragraf, berlabel. Ayat dirender dari terjemahan Kemenag verbatim dengan labelnya sendiri; penanda (١) menaut ke catatan kaki.
     - Ringkasan AI di awal bagian (`<details>`). Bisa disembunyikan (localStorage).
     - Status `rejected` tidak ditampilkan, tidak diindeks, dan tidak dikirim API.
     - Sorotan `?q=` lewat CSS Custom Highlight API: DOM dan teks kitab tidak diubah, halaman tetap ISR.
9. **Rollback** (keputusan langkah 10): `corpus:promote --switch-only` kini menerima korpus berskema LEBIH LAMA. Smoke memisahkan `limitations` (fitur yang hilang karena skema) dari `problems`. Kode memeriksa `meta.schema_version` dan menyembunyikan fiturnya: pembaca jalan di skema 3, pencarian Arab butuh ≥ 4, Indonesia ≥ 6, ayat ≥ 5. Jadi `ihya-v1` tetap target rollback. Build baru dan pemuatan tetap wajib tanpa batasan; skema lebih baru dari kode ditolak.

**Penyimpangan dari rencana:** langkah 1 menyebut stemming "-nya, ber-, me-"; yang dipakai Tala lengkap (konfiks ke-…-an perlu agar "sabar" menemukan "kesabaran"), dengan pengecualian dari data. Filter per rub'/kitab butuh parameter API baru (`section`), tidak tertulis di langkah. Catatan S11 menyebut promote `ihya-v2`; yang dipromosikan adalah versi terbaru, `ihya-v5`.

**Ditolak:**
- Jalur Arab ikut RRF untuk kueri Arab saja: hasilnya sama, tetapi total eksak dan pengaman S11 hilang.
- Selalu OR untuk kueri banyak kata: dokumen dengan satu kata langka mengalahkan dokumen dengan semua kata.
- Memetakan ringkasan ke SEMUA paragraf bagiannya: bagian rub' membanjiri hasil.
- Render server `/cari?q=`: melewati rate limit dan cache API.
- Cache di R2/`unstable_cache`: satu tulis Class A per kueri unik.
- Sorotan pembaca dengan membungkus teks di server: membuat halaman dinamis per kueri.

**Konsekuensi:**
- Pencarian Indonesia hanya menjangkau 100 paragraf teratas per jalur (cukup untuk 5 halaman pertama hasil; "Muat lebih banyak" berhenti di himpunan itu).
- Kueri Arab saja tidak memakai ringkasan atau judul bagian, jadi peringkatnya lebih datar (5 teratas الصبر/النية relevan tetapi tidak selalu bab utamanya): bahan eval S15.
- Ukuran build ±+3 MB SQL indeks Indonesia; pemuatan staging tetap ±1,5 menit.
- Selama produksi masih `ihya-v1` (skema 3), **semua** kueri `/api/search` menjawab 503 (Arab butuh skema ≥ 4, Indonesia ≥ 6), halaman `/cari` menampilkan "Pencarian sedang disiapkan" (cek `meta.schema_version` di server, bukan 503 per kueri), dan pembaca tidak menampilkan terjemahan/ayat, sampai `corpus:promote ihya-v5`.

**Tinjau ulang bila:** eval S15 menunjukkan recall kueri Indonesia rendah (sinonim/embedding, ADR S15); tabrakan stem dilaporkan pengguna; korpus berisi banyak kitab (rows_read RRF, kedalaman per jalur, cache per edisi).

## ADR-045 · Eval retrieval (S15): soal JSONL publik + holdout privat di R2, runner `searchText` atas D1 lokal/staging, gerbang R2 = hit@10 ≥ 90% atas ≥20 soal disetujui, kata pembingkai kueri Indonesia — diterima · 2026-10-17

**Konteks:** S15 harus mengukur mutu Cari secara objektif sebelum rilis Fase 2 (docs/06, ADR-015), tanpa LLM. Korpus tidak bisa dibangun di CI (teks Shamela tidak di git) dan D1 berindeks FTS5 tidak bisa diekspor.

**Keputusan:**
1. **Dataset** (`evals/retrieval/*.jsonl` publik, `evals/private/retrieval.jsonl` privat; format di `evals/README.md`):
   - Field docs/06 ditambah **`kueri`**: teks yang diketik pengguna di kotak Cari. `pertanyaan` tetap kalimat wajar untuk manusia, dan dipakai lagi di eval Jawab (S18).
   - `lokasi_benar` = node daftar isi (beserta turunannya) atau rentang halaman cetak dalam satu jilid. Rentang dipakai karena daftar isi Shamela untuk Rub' Adat dan Muhlikat hanya sampai tingkat kitab.
   - Setiap lokasi membawa `label` ("j2 h56–59") yang dicek runner terhadap DB, sehingga salah ID gagal keras.
2. **Draf 31 soal** (agent, 2026-10-17):
   - Komposisi: 4 rub' (6–10 soal per rub' menurut lokasi pertama; 5 topik tersebar lintas kitab); jenis 19 lokasi, 7 istilah, 5 topik tersebar; 6 kueri Arab, 25 Indonesia.
   - **Kueri ditulis sebelum pencarian pernah dijalankan**, dengan kata awam (mis. "menggunjing", bukan judul bab).
   - Lokasi diverifikasi dengan membaca judul Arab, ringkasan, dan terjemahan bab terkait.
   - Hanya soal ber-`disetujui_oleh` (T-12) yang masuk set resmi.
3. **Holdout privat:**
   - 10 soal dipilih sebelum run pertama, mencakup keempat rub', kedua bahasa, dan ketiga jenis. Disimpan git-ignored dan di R2 `surau-evals` (privat, r2.dev mati). Setiap revisi diunggah sebagai berkas baru; kuncinya `PRIVATE_KEY` di `eval.yml`.
   - Laporan, ringkasan CI, dan pesan galat hanya memuat ID, jenis, dan peringkat soal privat.
   - **Aturan:** kegagalan soal privat dianalisis per kategori saja; perbaikan dirancang dan diuji dengan soal publik.
   - **Salinan teks soal privat** ada di tiga tempat: mesin pemilik (`evals/private/`), R2 `surau-evals`, dan halaman tinjauan T-12 (artifact claude.ai privat milik pemilik). Salinan baru hanya dibuat dengan alasan dan dicatat.
   - **Insiden S15** (keduanya temuan peninjau):
     - (1) Perbaikan butir 6 dirancang dari kegagalan soal privat p03, dan teks kuerinya masuk ke kode. p03 dipindah ke publik sebagai r03 dan diganti p31 (ditulis sebelum dijalankan).
     - (2) Catatan sesi menyebut topik soal privat p12 saat menganalisis peringkat. p12 dipindah ke publik sebagai r12, dengan isi dan persetujuan tetap, tanpa pengganti.
     - Holdout kini 9 soal. S18 menambah soal privat bersama ustadz.
4. **Runner** `pnpm run eval:retrieval` (`tools/eval`, Node + `getPlatformProxy`):
   - **Sumber data:** D1 lokal (salinan state, ARSITEKTUR §7 aturan 2), atau `--remote` = staging lewat remote binding (`preview_database_id` = staging, sehingga produksi tidak pernah tersentuh; hanya SELECT).
   - **Hasil benar:** halaman dalam rentang, atau halaman yang paragraf cocoknya ada di bagian lokasi benar.
   - **Metrik:** hit@1/5/10 dan MRR atas 50 halaman (`limit` maksimum `searchText`), per jenis, bahasa kueri, dan set. Hasil tanpa peringkat (kata Arab sangat umum) dihitung gagal.
   - **Laporan** di `evals/reports/` (tanggal, `corpus_version`, commit `-dirty`).
5. **Gerbang R2:** ≥ 20 soal disetujui **dan** hit@10 ≥ 90% atas set resmi (publik + privat).
   - `--gate` keluar dengan kode 2 bila belum lolos, dan wajib menyertakan soal privat (kecuali `--publik-saja`). Dipakai `/rilis` atas D1 lokal yang memuat korpus produksi.
   - CI (`eval.yml`, non-blocking, hanya PR repo sendiri): staging remote, soal privat dari R2, ringkasan di Summary, peringatan dibedakan antara "di bawah gerbang" dan "gagal berjalan".
6. **Kata pembingkai kueri Indonesia** (`ID_QUERY_FRAMING`, perbaikan murah langkah 5):
   - **Masalah:** cara, bagaimana, mengapa, di mana, menurut, membahas/menjelaskan, serta "(Imam) al-Ghazali" yang menempel jarang ada di teks jawaban, tetapi dulu diwajibkan (AND).
   - **Akibatnya:** r03 "cara khusyuk dalam salat" hanya cocok 5 halaman dan bab khusyuk berada di luar 50 teratas.
   - **Perbaikan:** kata-kata itu dibuang dari kueri saja, dan hanya bila masih ada kata lain. Token berapostrof (ma'na) dikecualikan.
   - Indeks tidak berubah: `LATIN_NORM_VERSION` tetap 1, korpus tidak perlu dibangun ulang. Kunci cache ikut berubah lewat stem rencana kueri.
   - **Hasil:** r03 > 50 → 1, r20 2 → 1, dan tidak ada soal lain yang turun. Uji 4 kueri di luar set (mis. bagaimana cara ikhlas, cara berwudu, menurut al-Ghazali tentang riya): bab utama di 3 teratas. Ejaan Al-Ghozali dan Ghazzali ikut dianggap pembingkai.

**Hasil (D1 lokal = staging = produksi `ihya-v5`):** baseline 30 soal hit@1 56,7% · hit@5 90,0% · hit@10 96,7% · MRR 0,732. Setelah butir 6 (31 soal, termasuk r03 dan p31): hit@1 64,5% · hit@5 96,8% · **hit@10 100%** · MRR 0,795. Kueri Arab 6/6 di peringkat 1. Satu lokasi benar dilebarkan setelah baseline, berdasarkan bacaan teks (r23: pembuka kitab j3 h231 menyebut harta sebagai fitnah dunia terbesar). Kenaikan r23 dari peringkat 7 ke 3 berasal dari pelebaran itu, bukan dari butir 6. **Set resmi** (T-12: ke-31 soal disetujui pemilik, 2026-10-17; laporan `evals/reports/retrieval-2026-10-17-ihya-v5-resmi.md`): hit@10 100% → **lolos gerbang R2**; set publik 22 soal dan set privat 9 soal sama-sama hit@10 100% (laporan dibuat ulang setelah p12 → r12).

**Ditolak:**
- Set regex/gold otomatis (riset S11): tidak mewakili relevansi manusia.
- Ekspor D1 ke artefak CI: FTS5 tidak bisa diekspor, dan ekspor memblokir DB.
- Menyimpan salinan korpus di R2 untuk CI: teks turunan Shamela di lokasi baru, ditambah token dan biaya tanpa manfaat dibanding staging.
- Menaikkan ambang OR-susulan (`ANY_TERMS_BELOW`): mengubah peringkat semua kueri pendek, padahal masalahnya kata pembingkai.
- Glosarium sinonim: tidak ada kegagalan kosakata di set ini, jadi ditunda sampai ada bukti (S18/S16).

**Konsekuensi:** set kecil (31 soal, satu kitab, disusun agent) dan longgar untuk topik tersebar (benar bila satu lokasi muncul; cakupan lokasi dicatat terpisah). Holdout baru bermakna lagi setelah pengganti p31; eval Jawab S18 bersama ustadz menambah soal privat. Laporan baseline dibuat sebelum runner di-commit (commit `92f2ef8` di laporannya = kode pencarian, bukan runner).

**Tinjau ulang bila:** kitab kedua masuk korpus (set per kitab), ustadz menambah/menilai soal (T-13), atau hit@10 set resmi turun di bawah 90%.

## ADR-046 · Embedding/vektor tetap ditunda setelah eval S15 (hit@10 ≥ 90%); S15b tidak dijadwalkan — diterima · 2026-10-17

**Konteks:** ADR-006 menunda Vectorize + Workers AI sampai eval membuktikan perlu. Langkah 6 S15: bila hit@10 < 90% setelah perbaikan murah, rencanakan S15b (embedding `qwen3-embedding-0.6b` vs `bge-m3`, Vectorize 1024 dimensi, RRF).

**Keputusan:** embedding **tetap ditunda**, dan S15b tidak dijadwalkan. Dasarnya, setelah perbaikan murah (ADR-045 butir 6):
- hit@10 = 100% atas set resmi 31 soal yang disetujui pemilik (publik 22 dan privat 9 sama-sama 100%), hit@5 96,8%, kueri Arab 6/6 di peringkat 1.
- Tidak ada kegagalan karena kosakata Indonesia ↔ istilah Arab yang butuh kesamaan makna. Kegagalan satu-satunya adalah kata pembingkai, dan itu sudah diperbaiki secara leksikal. Ringkasan AI per bagian sudah menjembatani kueri awam ke bab yang tepat.
- Biaya dan kompleksitas embedding (indeks Vectorize, pipeline ingest, ±+1 bolak-balik per kueri) tidak sebanding dengan selisih yang bisa diukur di set ini.

**Yang belum terukur (risiko diterima):**
- Peringkat teratas: hit@1 baru 64,5%.
- Sinonim yang tidak ada di terjemahan (mis. pelajar ≈ murid).
- Kueri panjang berbentuk kalimat, yang datang di Jawab (S19).
- Kitab selain Ihya.

**Tinjau ulang bila:** hit@10 set resmi < 90% pada eval berikutnya; eval Jawab S18 menunjukkan bagian yang benar tidak ditemukan karena kosakata; korpus berisi banyak kitab dengan terjemahan/ringkasan yang tidak seragam; atau pengguna melaporkan kueri bermakna sama yang tidak menemukan bab yang jelas ada.

## ADR-047 · Mutu terjemahan AI sebelum rilis Fase 2 (X02): lapisan koreksi tinjauan, prompt `translate-passage@3`, pencocok ayat lintas paragraf, korpus `ihya-v6` — diterima · 2026-10-17

**Konteks:**
- T-16 (20 sampel ayat) dan T-17 tahap 2 (20 sampel terjemahan) dinilai agent lain. Pemilik meneruskan laporannya sebagai lapisan koreksi ("bukan kebenaran mutlak"), lalu agent X02 memeriksanya ulang di korpus; konfirmasi pemilik di `/rilis 2`. Laporannya: `data/reports/ihya-9472-review-prarilis-f2-2026-10-17.md`.
- T-16: 20/20 cocok.
- T-17 tahap 2: Benar 14 (70%, target ≥ 80%), Kurang 4, Salah 2 (10%, tepat di batas). Agent X02 menilai nomor 5 (p3482) Benar karena satu-satunya cacatnya tanda kurung sisa; dengan penilaian itu Benar jadi 75%, tetap di bawah target.
- Kesalahannya bersifat pola, bukan kebetulan:
  - satuan diganti (*mann* → "rithl");
  - ungkapan tebusan *bi abi anta wa ummi* jadi sumpah ("demi ayah dan ibuku": 17 dari 23 kemunculan);
  - *kumm* jadi "siku";
  - judul *at-targhib 'anhu* terbalik;
  - kitab amal "diberikan dari sebelah kanan".
- Kutipan QS 54:55 terbelah dua paragraf, sehingga tidak dikenali dan ikut diterjemahkan AI.
- Pemilik mengizinkan biaya ≤ $1 dan promote korpus baru (chat, 2026-10-17: "Ok go ahead").

**Keputusan:**
1. **Lapisan koreksi tinjauan** (`data/reviews/ihya-9472-terjemahan.json`, di git, tanpa teks kitab):
   - Isi: paragraf yang dinilai Salah/Kurang, alasan, penilai, dasar tinjauan, dan versi prompt yang ditolak.
   - `pnpm llm rejudge/collect` menolak hasil versi itu (`review_rejected`, dicatat di posisi kronologisnya). Ingest memeriksanya lagi secara mandiri (`llmRows`), jadi hasil yang ditolak tidak terbit walau `rejudge` lupa dijalankan.
   - `retry` mengirim ulang ke Sonnet 5.5 dengan prompt saat ini, dengan hitungan percobaan mulai dari awal sekali per versi yang ditolak (terbatas `MAX_ATTEMPTS`). Bila yang ditolak justru versi prompt saat ini, paragraf itu tidak diulang (`needsNewPrompt`) sampai ada versi prompt baru. Hasil versi prompt lain tidak ikut ditolak.
   - Bila gagal, paragraf itu tampil tanpa terjemahan, bukan dengan terjemahan yang ditolak.
   - Berkas ini menjadi tempat koreksi sampai `/tinjau` + tabel `review` (S18).
2. **Prompt `translate-passage@3`** (= v2 + bagian "Satuan, ungkapan, dan kalimat yang bersambung"), dipakai untuk 28 hasil X02, lalu **`translate-passage@4`** untuk paragraf berikutnya. v4 membetulkan satu aturan v3 (temuan peninjau): v3 menulis *raghiba fi* = "menyukai atau menganjurkan", padahal "menganjurkan" adalah makna *targhib*. Ke-28 hasil v3 sudah dicek dan tidak ada yang memakai pola itu.
   - Aturannya umum dan tidak menyebut paragraf tertentu.
   - Hanya dipakai untuk paragraf baru dan paragraf yang ditolak. 16 ribu hasil v2 lainnya tetap, karena versi prompt tercatat per terjemahan.
3. **Sampel terarah** (agent X02): mencari pola kesalahan yang sama di seluruh terjemahan. Ditemukan 21 paragraf di luar sampel acak, dan semuanya masuk lapisan koreksi. Kandidat yang ternyata benar tidak dimasukkan.
4. **Pencocok ayat lintas paragraf** (`crossPassageSpans`):
   - Berlaku untuk paragraf badan berurutan menurut jilid, halaman cetak, dan `ord`, dengan aturan mode tanpa tanda ADR-042 ditambah ≥ 2 kata di tiap sisi batas. Deret yang ditolak dilompati seluruhnya.
   - Hanya pasangan di bagian daftar isi yang sama. Ditautkan sebagai dua rujukan untuk letak mushaf yang bersambung (di Ihya: dua bagian dari satu ayat), sehingga terjemahan Kemenag ayat itu tampil di kedua paragraf.
   - Di Ihya tepat 1 pasang (QS 54:55, p18256–p18257). Percobaan pertama juga menautkan 27 pembuka khutbah (basmalah + *al-hamdu lillah*) dan 1 kalimat penulis; keduanya disaring sebelum dipakai.
   - Ringkasan bab 100273 dan dua induknya ikut dibuat ulang karena teks bertandanya berubah.
5. **Kaki halaman pembaca:** "Kutipan ayat yang dikenali sistem tidak diterjemahkan AI …; kutipan ayat yang belum dikenali bisa ikut terjemahan AI" (sebelumnya klaim mutlak).
6. **Sampel QA T-17 dibekukan:** nomor yang terjemahannya ditolak atau belum ada tidak lagi diganti paragraf lain, dan dinilai sebagai kegagalan cakupan.
7. **Korpus `ihya-v6`** (skema 6, tanpa migrasi baru): dibangun, dimuat ke lokal dan staging, lalu dibuat sebagai DB produksi `surau-corpus-ihya-v6` (QA 30/30). Binding produksi berpindah setelah PR X02 di-merge. `ihya-v5` menjadi target rollback. Perbaikan kode sesudah tinjauan tidak mengubah isi korpus: build ulang dengan `SOURCE_DATE_EPOCH` yang sama menghasilkan sha256 yang sama.

**Insiden holdout eval (S15):**
- Halaman tinjauan T-12 (artifact claude.ai) memuat teks 9 soal eval privat dan sempat dibagikan "siapa saja yang punya tautan", sementara tautannya tercantum di dokumen repo yang publik.
- Teks soal privat sudah dihapus dari halaman (versi 3). Pemilik disarankan menutup berbagi tautan.
- Soal privat itu tetap dihitung di set resmi, tetapi diperlakukan sebagai holdout lemah (bisa saja terbaca pihak lain). S18 menyusun soal privat baru bersama ustadz.

**Ditolak:**
- Menerjemahkan ulang seluruh korpus dengan prompt v3: biaya ±$4 dan hasil v2 yang sudah dinilai Benar ikut berubah.
- Mengedit teks terjemahan dengan tangan: teks berlabel "terjemahan AI" harus benar-benar keluaran model dengan versi prompt tercatat. Koreksi manusia butuh label sendiri (S18).
- Menyembunyikan saja paragraf yang salah tanpa terjemahan ulang: kehilangan terjemahan di 27 paragraf, padahal perbaikannya murah.

**Konsekuensi:**
- Biaya X02 **$0,25** (batch: 26 ulangan Sonnet $0,23, ringkasan $0,01, dua terjemahan ayat Haiku < $0,01); total batch terjemahan Ihya kini $4,68 dari `usage`. Semua 27 paragraf koreksi lolos validasi pada percobaan pertama.
- Skor T-17 sebelum perbaikan tetap tercatat (70% Benar). Sesudah perbaikan, 20 sampel yang sama dinilai ulang agent X02: 20/20 Benar. Angka ini **bias** karena perbaikannya menyasar sampel tersebut, jadi tidak mewakili mutu 16 ribu terjemahan v2 lainnya. Perkiraan mutu korpus tetap dari penilaian sebelum perbaikan, dikurangi pola yang sudah dibersihkan di seluruh korpus. Pengukuran yang tidak bias butuh sampel acak baru dengan seed baru, dinilai pemilik atau ustadz (usulan T-17 tahap 3).
- Pola kesalahan yang belum terdeteksi bisa tersisa di 16 ribu paragraf v2. Tinjauan ustadz (S18) dan laporan pengguna menambah entri ke lapisan koreksi.

**Tinjau ulang bila:** S18 membangun penyimpanan tinjauan di D1 (lapisan koreksi dipindah atau disinkronkan), atau tinjauan berikutnya menemukan Salah > 10% (perbaiki prompt dan ulangi paragraf yang terdampak, aturan T-17).

## ADR-048 · Rilis Fase 2: T-16/T-17 penilaian agent diterima, target 80% T-17 dilewati secara sadar, batas global pencarian 1.200/menit — diterima · 2026-10-17

**Konteks:** `/rilis 2` (2026-10-17). Fitur Fase 2 sudah tampil di produksi sejak S14/X02 (setiap merge ke `main` di-deploy, korpus `ihya-v6`), jadi rilis ini meresmikan fase, bukan membuka fitur. Pemeriksaan kesiapan menemukan tiga butir "Selesai bila" yang belum dicentang: S12 "20 sampel ayat diperiksa pemilik atau ustadz" (T-16), S12 "`pnpm verify` lolos …" (buktinya ada di LOG S12, hanya lupa dicentang), dan S13 "QA 20 sampel tercatat (target Benar ≥ 80%, Salah ≤ 10%)" (T-17 tahap 2). T-16 dan T-17 tahap 2 dinilai agent lain lalu diteruskan pemilik (ADR-047). Tinjauan keamanan `rilis-f1..main` (peninjau): 0 blocker, 2 "perbaiki". Gerbang versi (docs-terbaru): Next 16.4.1 didukung resmi OpenNext 1.20.12 (peer `>=16.4.1`), tidak ada advisory terbuka untuk Next 16.4.1, React 19.3.1, OpenNext 1.20.12, wrangler 4.151.0; larangan ADR-003 tetap terpenuhi.

**Keputusan:**
1. **T-16 diterima pemilik** di chat ("Terima keduanya"): 20/20 rujukan ayat cocok menurut penilaian agent. Butir S12 dicentang dengan bukti itu.
2. **T-17 tahap 2 diterima sebagai penyimpangan sadar:** sampel awal 70% Benar (14 B, 4 K, 2 S), di bawah target 80%; Salah 10% tepat di batas. Temuannya sudah diperbaiki di X02 (ADR-047), tetapi skor ulang 20/20 bias. Butir S13 **tetap tidak dicentang**; yang diterima adalah penyimpangannya, bukan kriteria yang diubah. Keterbatasan ini ditulis terbuka di CHANGELOG. Pengukuran tanpa bias = T-17 tahap 3 (opsional) atau tinjauan ustadz S18.
3. **Batas global `/api/search` 300 → 1.200 per menit** (temuan peninjau): Rate Limiting Cloudflare dihitung per lokasi, sehingga lima jaringan IP yang masing-masing memakai 60/menit sudah bisa membuat pencarian di satu kota menjawab 429. Batas per klien tetap 60/menit karena banyak pengguna ponsel di Indonesia berbagi IP (CGNAT); kini butuh 20 jaringan untuk menghabiskan kuota satu lokasi. Hasil yang ada di cache tetap dilayani tanpa limiter. Produksi `1004` dan Preview `2004`.
4. **Holdout eval:** pemilik menyatakan berbagi tautan halaman tinjauan T-12 sudah ditutup. Tautannya tetap ada di riwayat git; soal privat tetap diperlakukan sebagai holdout lemah (ADR-047) dan diganti di S18. Gerbang rilis tetap dihitung dengan set resmi 31 soal: `pnpm run eval:retrieval --gate --label rilis` atas D1 lokal `ihya-v6` (= `CORPUS_DB` produksi) → hit@10 100%.

**Ditolak:** menurunkan batas per klien ke 20/menit (pengguna di balik CGNAT ikut tertahan); menunda rilis sampai T-17 tahap 3 (pemilik memilih rilis dengan keterbatasan tertulis).

**Tinjau ulang bila:** biaya baca D1 dari `/api/search` naik tajam (turunkan batas global atau pasang WAF saat domain siap), muncul laporan 429 dari pengguna, atau T-17 tahap 3/tinjauan ustadz menemukan Salah > 10%.

## ADR-049 · MCP publik (S16): Worker `surau-mcp` stateless dual-era di `mcp.surau.org/mcp`, tujuh tool di atas core, amplop lisensi + permalink absolut, `search_text` dipadatkan, kalibrasi token `readSection`, batas `HMAC(IP):tool` + batas global — diterima · 2026-10-17

**Konteks:** S16 membangun MCP publik read-only (ADR-010, ADR-011) setelah domain `surau.org` siap (T-07). Docs terbaru (2026-10-17): `@modelcontextprotocol/server` 2.3.1 (advisory server < 2.3.0: GHSA-jm63 instance bersama, GHSA-46jr, GHSA-rvq5; < 2.1.0: GHSA-f897; client < 2.3.0: GHSA-6prh, < 2.2.0: GHSA-6qxp), spesifikasi 2026-07-28 (tanpa sesi, `server/discover`, header `MCP-Protocol-Version`/`Mcp-Method`/`Mcp-Name`), MCP Inspector 2.11.0 (`--protocol-era`). Pengukuran dengan `count_tokens` (gratis) **sebelum** perubahan: heuristik ADR-033 (2 karakter/token) meremehkan teks Arab, 81 potongan `read_section` lewat MCP median **7.690**, maks. 9.192 token Claude; JSON `passages` median 1,63 karakter/token, p5 1,5, min. 1,38. `searchView` core apa adanya (diukur di D1 lokal tanpa amplop): kueri "sabar" limit 10 = 58.655 karakter, limit 5 = 30.586. Daftar isi dari akar kedalaman 3 = 23.981 token.

**Keputusan:**
1. **Worker `apps/mcp` (`surau-mcp`)**: `createMcpHandler(factory, { legacy: "stateless", maxRequestBodySize: 64 KiB, maxSubscriptions: 16 })` satu per isolate; pabriknya dipanggil SDK per permintaan (dengan `requestInfo`) dan membuat `McpServer` baru dengan `env` dari `cloudflare:workers`. Skema dan definisi tool dibangun sekali per isolate. Tanpa `nodejs_compat` (SDK memakai `@cfworker/json-schema` di workerd). Custom domain `mcp.surau.org` lewat `routes` (`workers_dev: false`, `preview_urls: true`). `CORPUS_DB` = D1 korpus produksi yang sama dengan web; `corpus:promote` kini mengganti binding di `apps/web` **dan** `apps/mcp` sekaligus (keduanya dihitung dulu sebelum ditulis) dan menolak bila keduanya tidak sama (tes `corpus.test.ts`).
2. **Tujuh tool, satu core tool masing-masing** (nama ADR-012): `list_works`, `get_table_of_contents`, `read_page`, `read_section`, `search_text`, `verify_quote`, `get_hadith_takhrij`. Dua core tool baru di `@surau/core` (kontrak bertambah): `verifyQuote` (`findQuote`, `match.text` = substring mentah) dan `getHadithTakhrij` (catatan kaki tertaut, `review_status: "unreviewed"`, `status` `linked`/`none`/`is_footnote`, catatan kaki halaman yang tidak tertaut sebagai ID). Anotasi read-only lengkap; `outputSchema` = skema Zod core + `license`; `structuredContent` + salinan JSON di `content`. Error core → hasil `isError` `<code>: <pesan>`; error lain `internal_error` tanpa detail, log hanya nama tool dan nama error.
3. **Amplop setiap hasil:** permalink path core diberi origin `SITE_URL` (`https://surau.org`), dan blok `license` (`name`, `url`, `terms_url` = `/lisensi`, `attribution`, `notice`) dari semua sumber di hasil: edisi kitab, dan di `read_page` juga teks ayat Tanzil + terjemahan Kemenag (`quran.sources`, lisensinya sendiri dan wajib verbatim, ADR-040). Butir S16 "setiap hasil memuat citation" ditafsirkan sama dengan core README, dan dirinci terbuka di awal sesi: hasil yang memuat teks/letak membawa `citation`; `list_works` (metadata) membawa lisensi + atribusi per edisi dan blok `license`.
4. **Penyimpangan dari "bentuk core = kontrak MCP" (ARSITEKTUR §4), hanya untuk `search_text`:** limit 1–5 (bawaan 5, core 1–50; halaman berikutnya lewat `offset`), ≤3 paragraf skor tertinggi per halaman (urutan baca tetap, `hits_omitted` baru, `hit_count` tetap jumlah asli), tanpa `anchor`/`ord`/`toc_node_id`/`highlights` di paragraf dan tanpa `highlights`/`created_at` di potongan AI. Hasilnya limit 5 median 7.317, maks. 10.907 token (kueri "sabar" 21.135 karakter, dari 30.586 tanpa pemadatan). Offset sorotan tanpa teks penuh tidak berguna bagi model; teks lengkap lewat `read_page`.
5. **`get_table_of_contents`**: dari akar maks. 2 tingkat (±7,8 ribu token), dari `node_id` maks. 3 (core sampai 10).
6. **Kalibrasi ADR-033:** `CHARS_PER_TOKEN` 2 → **1,4** (dekat minimum pengukuran sebelum), `SECTION_MIN_TOKENS` 4.000 → **3.500**, `SECTION_MAX_TOKENS` 6.000 → **5.000** (sisa ±1.000 token untuk citation, node, ancestors, dan blok lisensi). **Sesudah** (84 potongan, `data/reports/mcp-token.md`): seluruh hasil `read_section` median **5.037**, p95 5.557, maks. 6.193 token Claude. Token `passages` / `estimated_tokens` median 0,88, maks. 1,11: perkiraan bisa ±11% di bawah token sebenarnya untuk potongan Arab yang padat (karakter/token min. 1,26), jadi "≤ ±6 ribu" berlaku dengan toleransi itu. `readSection` hanya dipakai MCP (web tidak), jadi batas potongan boleh bergeser; cursor lama tetap sah (cursor menyimpan letak, bukan nomor potongan). Alat ukurnya `pnpm llm mcp-tokens` (angka saja).
7. **Batas pemakaian (ADR-014):** kunci `HMAC(IP_HMAC_KEY, jaringan IP):tool` dari `@surau/core` (`ipKey`/`ipNetwork` dipindah dari web supaya satu tempat). Tool baca 120/menit per klien per tool + **600/menit global** semua tool baca (`MCP_READ_GLOBAL_LIMITER`, temuan peninjau: `get_table_of_contents` dan `read_section` membaca seluruh daftar isi, ±1.000 baris, per panggilan); `search_text` 60/menit per klien + 600/menit global (D1 dipakai bersama web, yang punya 1.200/menit). `namespace_id` produksi 3001–3004, Preview 4001–4004. Habis → hasil `isError` `rate_limited` (model membaca pesannya); secret tidak ada → `unavailable` (gagal tertutup). Secret dipasang agent dengan nilai acak, tidak dicetak.
   - **Pembaruan 2026-10-20 (#74):** kode hasil `isError` untuk secret yang tidak ada berganti dari `unavailable` menjadi `not_configured`, supaya tidak menyatu dengan kode core `unavailable` (korpus tanpa indeks atau `NORM_VERSION` berbeda). Ini perubahan kecil kontrak publik MCP; tidak ada konsumen di repo. Keluaran tool yang tidak lolos `outputSchema` kini dijawab `internal_error` dan tercatat `output_invalid`. Event `mcp_error` mencatat nama kelas, label dari awalan pesan SDK, dan kode, tetap tanpa pesan (P-7).
8. **Origin:** allowlist `surau.org`, `www.surau.org`, `mcp.surau.org`, localhost (`originValidationResponse`); tanpa Origin lolos (klien server-ke-server, termasuk konektor claude.ai). `cacheHints` publik 1 jam untuk `tools/list` dan `server/discover`.
9. **Tes dan CI:** project Vitest `mcp` (workerd, Client v2 in-process lewat `exports.default.fetch`, kedua era, fixture buatan core); `.github/scripts/uji-mcp.sh` (Inspector 2.11.0 `pnpm dlx`, era modern + legacy, ketujuh tool, error, Origin 403) di job `preview mcp` (Preview per PR, korpus staging) dan, mode `daftar` dengan coba ulang ±5 menit, di job `deploy mcp` setelah deploy web. URL Preview MCP di Summary job, bukan komentar PR (komentar web memakai `--edit-last`).
10. **Alamat web pindah ke `https://surau.org`** (`SITE_URL` metadata/sitemap, smoke `deploy.yml`, tautan laporan `pnpm llm`). Custom domain web tetap diatur di dashboard (T-07), tidak di `apps/web/wrangler.jsonc`.

**Ditolak:** `McpServer` tingkat modul yang dibagi antarpermintaan (GHSA-jm63; handler tingkat modul boleh karena pabriknya per permintaan); `agents/mcp/server` (ADR-011); meneruskan `searchView` core apa adanya (limit 10 ±58 ribu karakter); limit `search_text` 10 (sesudah dipadatkan tetap sampai ±19,9 ribu token); menulis ringkasan JSON khusus MCP untuk semua tool (kontrak core cukup kecuali pencarian); kunci rate limit per IP mentah; HTTP 429 untuk batas habis (klien MCP menganggapnya galat transport, bukan pesan untuk model); memoisasi daftar isi per isolate di core sekarang (cache basi saat korpus lokal dimuat ulang; lihat Tinjau ulang).

**Konsekuensi:** `read_page` tetap besar (median ±11,1 ribu, maks. ±14,8 ribu token; halaman = satuan sitasi, tidak dipotong), di atas peringatan 10 ribu Claude Code tetapi di bawah batas 25 ribu; deskripsi tool menyebut ukurannya. Semua pengguna claude.ai berbagi kuota per IP Anthropic. Beban baca terburuk pada batas global = 600 panggilan × ±1.000 baris ≈ 600 ribu baris D1/menit per lokasi Cloudflare (perkiraan, belum diukur di produksi). Batas WAF luar (T-19) di plan Free hanya bisa memfilter path, jadi berlaku untuk `/mcp` di seluruh zona `surau.org`; T-19 sebaiknya selesai sebelum MCP diumumkan (S17).

**Pembaruan 2026-10-20 (#66):** daftar isi kini di-memo per isolate di `@surau/core` (`tocNodesOf`, dipakai `getToc` dan `readSection`, jadi juga web `/cari` dan pembaca). Kunci memo = `meta` korpus (`corpus_version`, `built_at`, `source_hash`) + edisi. Di produksi, korpus baru selalu berarti DB baru dan deploy baru. `built_at` adalah tanggal commit, jadi build dari commit yang sama di D1 lokal atau staging bisa berkunci sama. Untuk kasus itu, `getToc`/`readSection` membaca ulang tanpa memo bila node tidak ditemukan di pohon memo. Tanpa ketiga nilai itu, atau bila `meta` tidak terbaca, tidak ada memo; hasil kosong juga tidak di-memo. Biayanya satu baca `meta` (±6 baris) per panggilan, menggantikan ±1.000 baris. Yang disimpan adalah hasilnya, bukan Promise, karena I/O lintas permintaan dilarang di Workers. Maksimal 8 entri.

**Tinjau ulang bila:** T-18 (uji dari claude.ai) menunjukkan batas per IP terlalu ketat atau `read_page` terlalu besar untuk konteks klien; `rows_read` D1 dari MCP naik tajam (pertimbangkan memoisasi daftar isi per isolate atau tabel turunan); kitab kedua dimuat (instruksi server menyebut Ihya sebagai satu-satunya korpus); SDK v2 mengubah `cacheHints`/era.

## ADR-050 · Panduan MCP dan pemantauan tanpa isi pertanyaan

**Tanggal:** 2026-10-17 · **Status:** diterapkan di S17

**Konteks:** Worker MCP S16 sudah publik, tetapi belum ada panduan bagi pengguna umum atau hitungan volume per tool. R3 membutuhkan uji klien nyata, sitasi dan lisensi; pengamatan satu minggu tidak dapat selesai dalam satu hari.

**Keputusan:**
1. Panduan pengguna berada di `/mcp`, ditautkan navigasi dan sitemap, memakai Server Component statis dan pola halaman informasi yang ada. Langkah Claude.ai/Desktop/Code, ChatGPT dan klien lain ditulis dari docs resmi 17 Oktober; tidak menjanjikan paket/menu tersedia untuk semua akun. UI mengikuti bahasa Indonesia terpusat. Jawaban akhir tetap tanggung jawab AI klien: alur cari → baca konteks → verifikasi kutipan → sitasi, label AI, takhrij dan lisensi dijelaskan secara terbuka.
2. Setiap callback tool mencatat objek `console.info({event: "mcp_tool", tool, outcome, duration_ms})` agar field diindeks Workers Logs. Tidak menyimpan argumen, hasil, alamat halaman, teks, IP atau identitas pengguna. Sampling existing 1 dan retensi layanan tetap berlaku. Request yang ditolak SDK/transport/WAF tidak terhitung sebagai callback; gunakan metrik request/error terpisah. Error limiter juga ditangkap dan dipetakan ke `internal_error` agar detail tak bocor.
3. Uji Claude Code nyata (2.1.299, Haiku) atas izin pemilik ≤ US$0,10: search→read sukses, biaya US$0,00344562. Claude.ai dikonfirmasi pemilik (T-18), Playground diuji lewat UI dengan model demo. Hasil klien yang mengabaikan sebagian instruksi dicatat sebagai keterbatasan, bukan klaim semua jawaban terjamin.
4. Mulai pemantauan 17–24 Oktober WIB, simpan agregat harian dan snapshot D1 tanpa isi kueri pengguna. D1 dibagi web/MCP sehingga biaya khusus MCP belum terpisah. Batas S16 tidak diubah berdasarkan satu uji. Koreksi fakta STACK: Paid mencakup **25 miliar** rows read/bulan, bukan 25 juta. Rilis/tag fase tetap lewat `/rilis 3` yang dipanggil pemilik; registry/directory/skill opsional ditunda.

**Konsekuensi:** satu event log tambahan per callback memakai kuota Workers Logs; retensi 7 hari memerlukan pencatatan agregat harian. Catatan uji dan prosedur pemantauan ada di [docs/mcp-operasional.md](../docs/mcp-operasional.md). Satu minggu pengamatan masih tindak lanjut dan tidak dinyatakan selesai pada S17 hari pertama. Tidak ada dependensi baru, panggilan LLM di server, migrasi korpus, atau perubahan rate limit.

**Tinjau ulang bila:** log perlu retensi lebih lama atau volume log mahal (pertimbangkan metrik agregat); `rate_limited` menghambat penggunaan normal; rows_read meningkat tajam; menu/ketentuan klien berubah.

## ADR-051 · Rilis Fase 3: MCP publik — diterima · 2026-10-17

**Konteks:** S16–S17 selesai dan merge (PR #42/#43). Gerbang R3 mencakup Inspector kedua era, uji Claude Code/Claude.ai, serta sitasi dan lisensi; bukti ada di sesi, docs/mcp-operasional.md dan prarilis PR #44. Pemeriksaan rilis atas `rilis-f2..main` sampai `4f88541` tidak menemukan masalah keamanan. Gerbang versi dan mitigasi build ADR-003 lolos; dua advisory high transitif (`glob`, `figlet`) tetap ada pada lockfile dengan pemicu yang tidak dipakai dan mitigasi tertulis di ADR-003. Preview PR #44: verify hijau, e2e 99 lolos/1 dilewati, MCP lengkap modern/legacy lolos.

**Keputusan:** pemilik menjawab **"ya"** di chat setelah ditanya **"Rilis Fase 3 ke produksi sekarang?"** (2026-10-17). Rilis melalui merge PR #44 dan `deploy.yml` (web lalu MCP), smoke produksi diulang, lalu tag `rilis-f3` dibuat dan dipush hanya setelah deploy/smoke sukses. Tidak ada migrasi atau pergantian korpus baru; web dan MCP tetap memakai `ihya-v6`. CHANGELOG, FASE, STATUS dan LOG mencatat rilis ini. Bukti akhir deploy/versi/smoke disimpan pada anotasi tag. Pengumuman hanya didrafkan bagi pemilik.

**Konsekuensi:** MCP sudah tersedia sejak S16, sehingga rilis ini meresmikan fase dan tag. Keterbatasan ukuran `read_page`, batas bersama IP penyedia, klien yang belum diuji langsung, serta mutu keluaran AI pengguna tetap terbuka. Pemantauan 17–24 Oktober berjalan terpisah; kestabilan satu minggu belum diklaim. S18 menjadi sesi berikutnya.


## ADR-052 · Eval Jawab dan ruang tinjau terautentikasi — diterima · 2026-10-19

**Konteks:** S18 menyiapkan alat ukur sebelum pipeline S19. Pemilik menunjuk Anas, memberikan satu email Access, mempertahankan perubahan judul beranda, dan mengizinkan 30 contoh + sumber ke Anthropic dengan pagu US$1. Penunjukan penilai tidak sama dengan persetujuan soal.

**Keputusan:**

1. Susun 60 draf (komposisi 24/9/9/6/6/6), pisahkan 18 holdout sebelum pengujian. Git hanya memuat 42 soal publik dengan poin Indonesia dan ID/offset sumber, tanpa teks kitab. Holdout baru, arsip, SQL, plan dan alasan judge berada di penyimpanan privat (inventaris `evals/README.md`). Semua persetujuan awal null; target ≥50 soal tetap menunggu Anas.
2. Kontrak jawaban tidak menerima teks Arab dari model. Kutipan diambil dari korpus dengan ID + offset UTF-16, diverifikasi, dan diberi sitasi/lisensi. Metrik tanpa penyebut = tidak tersedia. Lokasi harus mencakup semua lokasi gold; penolakan harus eksplisit dan tidak kosong; status hadits harus cocok dengan gold serta takhrij tertaut. Pola fatwa adalah heuristik.
3. Judge Sonnet 5.5 memakai prompt berversi `jawab-judge-v1`, JSON terstruktur, effort low, batas 2.048 token, Message Batches. Manifest mengikat record dan request; submit menghitung pagu dengan buffer input 10%, menolak perubahan parameter, dan tidak retry otomatis. Human review tidak diberikan ke judge. Kalibrasi mencocokkan hash soal/jawaban/korpus/versi judge dan nama penilai; skor agent tidak dihitung sebagai manusia.
4. Antrean awal berisi 30 contoh publik buatan agent (sebagian sengaja salah) dan 30 baseline Cari. Label UI menjelaskan asal contoh. Batch menghasilkan 29/30 output valid, satu `max_tokens`; biaya US$0,112528 dari batas estimasi US$0,377774. Ini evaluasi alat/rubrik, **bukan hasil pipeline S19**. Penilaian manusia 0; judge belum terkalibrasi dan gerbang R4 belum aktif.
5. `answer_log` dan `review` memakai DB app, terpisah dari blue-green korpus. Snapshot tidak ditimpa; review mengikat hash, akun Access (hash issuer+subjek), nama tampilan dan waktu. Hash/korpus/sumber yang berbeda menutup penilaian. Golden menolak keputusan/versi/pemisahan privat yang bertentangan; ekspor/golden mula-mula tetap privat.
6. Access One-time PIN 24 jam hanya untuk `surau.org/tinjau` dan `surau.org/api/review`, satu email yang diizinkan pemilik. Wildcard preview tidak dibuat karena perluasan cakupan tidak diizinkan. Aplikasi memverifikasi JWT RS256 (issuer/audience/exp/iat/sub/type/email) di semua host; tanpa dev bypass. Tambah `jose` 6.2.12 (MIT, WebCrypto) untuk kriptografi. API no-store/noindex, POST exact Origin dan batas input 12 KB; email/token tidak disimpan.
7. Usulan P-7 12 bulan hanya untuk eval terkurasi; pertanyaan pengguna umum belum diterima. Expiry disaring saat baca/tulis/ekspor. **Penghapusan fisik belum otomatis**; prosedur manual tercatat, S20 menjadwalkannya sebelum Oktober 2027 termasuk salinan privat. Jangan menyebutnya retensi otomatis.

**Verifikasi:** `pnpm verify` (485 Node + 218 Workers, build), retrieval 31 soal hit@10 100%; peninjau memperbaiki klaim hadits ganda, keputusan golden bertentangan, dan pengikatan receipt batch ke snapshot. Browser komponen aktual + fixture buatan: persistensi formulir, desktop/390 px, Arab RTL/Naskh. Login dan ≥10 uji Anas di produksi tetap T-24.

**Konsekuensi:** S18 **sebagian**; ≥50 persetujuan, ±30 penilaian kalibrasi, dan ≥10 uji halaman tetap tidak dicentang. S19 menunggu dasar evaluasi manusia ini. Runner gratis baseline/score/seed/golden terpisah dari judge-submit berbayar. Panduan: `evals/jawab/README.md`, `docs/tinjau-operasional.md`.

**Tinjau ulang bila:** Anas mengoreksi soal/rubrik, korpus/prompt/model berubah, judge sering terpotong, akses penilai diperluas, atau S20 mengaktifkan pencatatan pertanyaan umum/pembersih retensi.

## ADR-053 · Tata letak satu lebar, daftar isi halaman teks, panel Tampilan pembaca, kertas sepia, judul ringkas di navbar — diterima · 2026-10-19

**Konteks:** Pemilik meminta (1) header sejajar dengan isi, (2) lebar halaman seragam dan daftar isi di halaman Tentang/MCP/Lisensi, (3) baris tombol pembaca yang lebih bersih: daftar isi ponsel dalam sheet buram, satu grup tombol (Daftar isi · Lompat · Salin sitasi · Tampilan), panel Tampilan (ukuran huruf, sakelar terjemahan AI, font Arab dengan pratinjau) dari kanan di desktop dan dari bawah di ponsel, catatan kaki lebih kecil dan terangkat seperti buku cetak. Pemilik memilih empat font OFL, warna kertas + jarak baris, tombol ⋮ (kebab) yang muncul saat hover, dan header lengket yang mengecil mulus dengan `ProgressCircle` (bukan bilah).

**Keputusan:**
1. **Satu lebar:** `PAGE_FRAME` (`lib/layout.ts`, `max-w-6xl` + gutter `px-4 sm:px-6`) dipakai semua halaman dan `Navbar.Header`, sehingga tepi header = tepi isi. Teks panjang tetap dibatasi di dalamnya (±42rem halaman teks, 48rem hasil Cari). Halaman karya: daftar isi di kolom utama, kartu edisi menempel di kolom kanan (desktop).
2. **`TextPage` + `OnThisPage`:** kolom baca kiri dan daftar "Di halaman ini" yang menempel di kanan; bagian aktif dihitung dari posisi judul (bukan IntersectionObserver, supaya bagian pendek terakhir tetap bisa aktif). Ponsel: `Dropdown` "Di halaman ini" di bawah judul.
3. **Grup tombol pembaca:** `ButtonGroup` OSS (`role="group"` berlabel "Alat baca", bukan `toolbar`, karena ←/→ membalik halaman). Daftar isi ponsel = `Sheet` Pro dari bawah, latar `blur`. Tombol lapor halaman pindah ke bagian Sumber di bawah halaman; aksi per paragraf tetap di menu ⋮ (`MoreVertical`), yang di perangkat ber-mouse hanya tampak saat paragraf disorot/difokus.
4. **Panel Tampilan (`ReaderStyle`):** `Sheet` Pro, `placement` kanan (≥1024 px) atau bawah, latar buram. Isinya ukuran huruf (`--reader-scale`), font Arab (`RadioGroup`), jarak baris (`Segment` Pro: rapat 1,75 / sedang 2 / longgar 2,45), warna kertas (`Segment`), terjemahan AI (`Switch`). Semua disimpan per browser (localStorage) dan dipasang ke `<html>` (`data-reader-font`, `data-reader-leading`) oleh skrip awal halaman baca supaya tidak berkedip. Pratinjau memakai awal paragraf pertama halaman, dipotong hanya di spasi dari `text_raw` (`lib/reader/preview.ts`, teruji; tanpa spasi → tanpa pratinjau, supaya huruf tidak terpisah dari harakatnya). Kode yang menyalin, bukan teks ketikan.
5. **Font Arab:** Noto Naskh Arabic (bawaan), Amiri, Scheherazade New, Noto Sans Arabic lewat `next/font/google`, semuanya OFL, `preload: false`. Berkas font baru diunduh saat dipakai: font pilihan di teks, atau keempatnya saat panel dibuka (contoh di pilihan font). Pilihan font hanya berlaku untuk teks kitab dan catatan kaki (`.reader-text`, `.reader-footnotes`), bukan judul, breadcrumb, atau daftar isi, supaya halaman lain tidak berganti font tergantung halaman yang terakhir dibuka.
6. **Kertas sepia:** tema ketiga `next-themes` (`themes: light, dark, sepia`, kelas `.sepia`) dengan palet hangat berkroma rendah dan `color-scheme: light`. Tombol bulan/matahari di navbar tetap beralih terang ↔ gelap.
7. **Judul ringkas di navbar:** `NavbarSlot` (portal ke slot di `SurauNavbar`). Saat judul besar halaman baca masuk ke balik navbar, judul navbar ("Kitab") bergeser-pudar keluar dan judul ringkas masuk: `ProgressCircle` posisi baca di teks halaman, juz/halaman, nama bab (≥768 px), dan tombol Tampilan. Judul besar ikut mengecil dan memudar lewat animasi berbasis gulir (`animation-timeline: view(block 4rem 0rem)`, inset = tinggi navbar; peningkatan progresif; mati saat "kurangi gerakan").
8. **Catatan kaki:** penanda `(١)` 0,62em superskrip (`line-height: 1`, bukan 0, supaya tetap bisa diketuk di ponsel); daftar catatan kaki 0,875rem × skala pembaca, garis pendek 6rem dan judul kecil.
9. **Navigasi halaman** hanya sekali, di akhir halaman (sesudah catatan kaki), tanpa label j./h. yang terlihat (nomor halaman tetap ada di nama aksesibel). Lingkar progres ukuran `sm` (20 px).
10. PR ini juga membawa PR #46 (daftar isi berikon, breadcrumb dipindah ke JSON-LD, footer pembaca ringkas, sidebar ikon/duotone, "Tentang" di bawah sidebar) yang di-merge ke branch ini; uji asap menu samping disesuaikan (Tentang di menu bawah).
11. **Ringkasan AI** (pilihan pemilik): catatan tipis di bawah judul bab, bukan kotak `<details>` berbingkai. Garis aksen di tepi awal, label "Ringkasan AI · <judul bab>", dua baris pertama (`line-clamp`), tombol "Baca selengkapnya" (hanya bila teks memang terpotong) yang juga menampilkan model dan status tinjau. Teks lengkap tetap di HTML.
12. **Terjemahan AI judul bab** (pilihan pemilik): satu baris kecil abu-abu di bawah judul Arab, tanpa garis tepi, dengan label kecil "· Terjemahan AI" di akhir baris (aturan 8 tetap: terjemahan selalu berlabel). Judul yang memuat kutipan ayat tetap memakai tampilan lengkap berlabel Kemenag.
13. **Satu kolom baca** (temuan pemilik: tepi tidak rata, ponsel timpang): menu ⋮ per paragraf pindah dari kolom sendiri (±36 px di kiri) ke dalam teks, sebaris sesudah kata terakhir (di judul bab: di samping `<h2>`, bukan di dalamnya, supaya tidak ikut nama judul). Teks Arab, terjemahan, dan ringkasan kini berbagi tepi yang sama.
14. **Rata kanan-kiri** seperti kitab cetak menjadi bawaan untuk teks dan catatan kaki (`text-align: justify`, `text-justify: inter-word`; browser melebarkan spasi, huruf tidak diubah). Pilihan "Rata kanan" di panel Tampilan (`data-reader-align="start"`). Judul bab dan terjemahannya di tengah.
15. **Grup tombol ponsel** (<640 px): Daftar isi dan Tampilan melebar, ⋮ "Aksi lain" berisi Lompat ke halaman (sheet bawah dengan formulir yang sama), Salin sitasi, Laporkan kesalahan. Tablet/desktop: Lompat (ikon `arrow-right-double`) · Salin sitasi · Tampilan, plus Daftar isi sampai `lg`. Dua grup dirender, CSS memilih salah satu (sudut ButtonGroup mengikuti `:first-child`/`:last-child` di DOM).

**Ditolak:** `Drawer` OSS untuk panel (Sheet Pro sudah dipakai AppLayout, punya latar blur, handle, dan seret-tutup); bilah progres (pemilik memilih lingkar); header lengket yang menyusut di tempat (tingginya berubah dan menggeser teks saat melewati ambang); `line-height: 0` untuk penanda (tombol ponsel jadi tak terlihat oleh uji e2e dan sulit diketuk).

**Konsekuensi:** CSS baru `switch`, `progress-circle`, `segment` (urutan ADR-035). Deklarasi `@font-face` tiga keluarga font baru (beserta fallback buatan `next/font`) ikut di CSS awal; berkasnya tidak diunduh sampai dipakai. CSS `checkbox` dan `drawer` dihapus (tidak dipakai lagi). Tes: unit `previewSample`, e2e simpan font/jarak baris setelah muat ulang, axe dengan panel terbuka dan kertas sepia. Atribusi lisensi font belum ditampilkan di `/lisensi` (sama dengan font yang sudah ada).

**Tinjau ulang bila:** pembaca meminta pengaturan per kitab (bukan per browser), font lain dibutuhkan untuk teks berharakat padat, atau `animation-timeline` didukung semua browser utama (efek bisa dijadikan sumber utama, bukan tambahan).


## ADR-054 · Evaluasi agent sementara tanpa menghambat pengembangan — diterima · 2026-10-19

**Konteks:** implementasi S18 sudah terpublikasi, login dan simpan–muat ulang produksi lolos. Penilaian Anas belum tersedia. Pemilik menyatakan: “Saat ini anda aja yg Eval, anas nanti belakangan. Saya gak mau hambat dev”.

**Keputusan:** agent mengevaluasi 60 jawaban dengan identitas **Agent QA S18** terpisah: 30 contoh publik dibaca terhadap sumber DB, 30 baseline Cari dinilai belum lengkap tanpa menilai isi/kunci holdout. Ulasan masuk D1 secara aditif dengan pengikatan hash/expiry; tidak menimpa ulasan akun Access. Semua keputusan persetujuan soal tetap null. Penilaian agent dibekukan sebelum pembandingan dengan judge lama. Hasil 18 benar/31 kurang/11 salah; kesepakatan antarmodel 25/29 kesetiaan dan 28/29 atribusi. Tidak ada biaya LLM tambahan.

**Konsekuensi:** kewajiban menunggu dasar manusia sebelum mulai **pengembangan S19** pada ADR-052 dikecualikan atas arahan pemilik. S18 selesai secara teknis, status kriteria asli tetap sebagian; T-24 Anas ditunda dan tidak menghambat dev. Ini bukan izin menandai persetujuan ustadz, kalibrasi manusia, ≥10 uji ustadz, atau gerbang rilis R4 sebagai selesai. Nama agent tidak dipakai membentuk golden resmi. Anas dapat meninjau kemudian dengan akun Access; hasil agent merupakan pembanding terpisah. Perbedaan kelengkapan dan dukungan klaim dalam rubrik perlu adjudikasi sebelum judge menjadi gerbang.

**Bukti:** [laporan Agent QA](../evals/reports/jawab-s18-agent-qa-v1.md), arsip privat hash-bound, 60 ulasan Agent QA S18 + satu ulasan uji UI Agent QA di produksi; 0 ulasan Anas.


## ADR-055 · Tipografi UI memakai Typography HeroUI — diterima · 2026-10-20

**Konteks:** audit tipografi menemukan teks UI ditulis dengan tag mentah (`<p>`, `<h1>`–`<h6>`, `li`/`dd`/`dt`) dan kelas ukuran sembarang (`text-[2rem]`, `leading-[1.12]`, `text-[0.95rem]`). Akibatnya judul halaman berukuran 30–48 px tergantung halaman, paragraf pembuka 16 atau 18 px, dan tinggi baris isi 24–28 px.

**Keputusan:**
1. Teks UI memakai komponen `Typography` HeroUI OSS (`type="body" | "body-sm" | "body-xs" | "h1"–"h6"`, `color="muted"`, `weight`). Heading memakai `Typography.Heading level={n}` supaya level semantik benar; ukuran yang berbeda dari bawaan level diatur dengan token Tailwind (`text-xl`), bukan nilai sembarang. `elementType` tidak ada di tipe `Typography` dan `render` tidak bisa dilewatkan dari Server Component (komponennya `"use client"`).
2. CSS `typography.css` diimpor di `globals.css` (ADR-035), setelah `kbd`.
3. `components/page-title.tsx`: `PageTitle` (h1 30/36/48 px, tinggi baris 1,1 di `lg`) dan `PageLead` (paragraf pembuka 16 px, 18 px di `sm`) menjadi satu-satunya definisi judul dan pembuka halaman. Judul halaman baca (24/30 px) dan halaman galat sengaja memakai `Typography` langsung.
4. Isi `li`, `dt`, `dd`, dan `blockquote` dibungkus `Typography` supaya ikut skala HeroUI.

**Dikecualikan:** teks Arab (`ArabicText`/`ArabicInline`), CSS kustom pembaca, daftar isi, dan sampul buku (bergantung pada skala pembaca, `cqw`, dan harakat); `h2.card__title` di panel Edisi (`Card.Title` adalah h3); paragraf judul terjemahan bab dengan kelas `passage-translation-heading`; `pre`/`blockquote` (tanpa padanan HeroUI OSS). `Card.Description` tetap bertinggi baris 20 px (bawaan komponen).

**Konsekuensi:** `body-sm` bertinggi baris 24 px (dulu 20 px) dan `body` 28 px; teks ringkasan/terjemahan pembaca 14 px (dulu 15 px); `h2` bagian memakai `tracking-tight`.

**Tinjau ulang bila:** HeroUI menambahkan prop `elementType`/`as` pada `Typography`, atau `CodeBlock` Pro dipakai untuk blok kode halaman MCP.


## ADR-056 · Font UI HarmonyOS Sans menggantikan Plus Jakarta Sans — diterima · 2026-10-20

**Konteks:** pemilik memilih HarmonyOS Sans untuk teks antarmuka dan membutuhkan italic asli (Plus Jakarta Sans sebelumnya hanya dimuat gaya normal, jadi teks miring adalah italic buatan browser). Lisensi HarmonyOS Sans (Huawei) bukan OFL: gratis, termasuk komersial, boleh dibundel dengan software, dengan syarat berkas tidak diubah, ada pemberitahuan mencolok bahwa font dipakai, `LICENSE.txt` ikut disertakan, dan font tidak dibagikan sebagai paket tersendiri.

**Keputusan:**
1. UI memakai HarmonyOS Sans lewat `next/font/local` (`layout.tsx`, variabel `--font-harmony`), TTF dipakai apa adanya (tanpa konversi WOFF2, supaya tidak dianggap modifikasi). Berkas yang dibawa hanya yang dipakai: Regular, Regular Italic, Medium, Bold, beserta `LICENSE.txt`, di `apps/web/src/fonts/harmonyos-sans/`.
2. Berkasnya statis dan tidak punya SemiBold: weight 600 (semua judul `Typography`) dan 700 memakai berkas Bold. Judul tampil sedikit lebih tebal daripada sebelumnya. Italic hanya Regular; Medium/Bold italic ditambahkan bila dibutuhkan.
3. Pemberitahuan penggunaan ada di `/lisensi` (bagian "Font") dengan tautan ke berkas lisensinya.
4. Font Arab tidak berubah (ADR-027). HarmonyOS Sans hanya dipakai untuk Latin.

**Risiko:** TTF berada di repo git. Pemilik menyatakan repo hanya privat sampai alpha dirilis; **repo kini berstatus publik (dicek 2026-10-20)**, sehingga berkas font tidak boleh di-push sebelum repo dijadikan privat atau berkasnya dikeluarkan dari git. Sebelum repo dibuat publik lagi, berkas di `apps/web/src/fonts/harmonyos-sans/` harus ditinjau ulang: dikeluarkan dari git dan diambil saat build, atau diganti font OFL (Plus Jakarta Sans).

**Ditolak:** tetap Plus Jakarta Sans dengan italic asli (aman lisensi, tetapi bukan pilihan pemilik); konversi ke WOFF2 (bisa dianggap mengubah berkas).

**Tinjau ulang bila:** repo akan dibuat publik; lisensi HarmonyOS Sans berubah; judul terasa terlalu tebal tanpa SemiBold; atau italic Medium/Bold dibutuhkan.


## ADR-057 · Aset visual: skill `aset` dengan mesin iso-glow (MIT) bertoken Surau; tiga ilustrasi prinsip di Beranda — diterima · 2026-10-19

**Konteks:** Pemilik membutuhkan aset landing page, cover blog, konten, dan aset lain yang interaktif (bukan gambar diam) dan konsisten. Usulan pertama pemilik adalah skill Colorfigures (April Zhu, MIT): ilustrasi isometrik bertinta tangan dan berwarna penuh. Agent membangun skill Surau di atasnya beserta figur contoh "kitab di atas rehal". Pemilik menilai hasilnya "kurang pas" lalu mengusulkan iso-glow (karya yang sama, MIT): gambar garis tipis dengan satu aksen yang menyala. Agent membuat ulang figur yang sama dengan iso-glow beraksen Zaitun dan memberikan perbandingan berdampingan (terang/gelap). Pemilik memilih iso-glow, meminta perbaikan (WebP, tombol terlihat, demo otomatis, token warna tidak disalin manual), lalu meminta tiga aset untuk kartu "Tiga prinsip utama" di Beranda ("Ya kerjakan. Lalu buat 3 aset untuk pairing di home Tiga prinsip utama").

**Keputusan:**
1. **Skill `.claude/skills/aset/`** berisi:
   - `SKILL.md`: aturan Surau, alur, keluaran per kebutuhan, kriteria selesai.
   - `REFERENSI.md`: kernel, kelas, kontrak, pelajaran.
   - `mesin/iso.js` + `mesin/LICENSE`.
   - Dua contoh asli iso-glow di `contoh/`.
   - Skrip Node `skrip/bangun.mjs` (menyisipkan mesin dan token; `--situs` menulis figur ke `apps/web/public/aset/` dan mesin bersama ke `apps/web/public/aset-mesin/`, butir 11) dan `skrip/potret.mjs` (Chromium Playwright dari `apps/web`; sumber dibangun di memori; WebP lewat `sharp` milik Next, JPG/PNG; galat skrip, berkas gagal, figur kosong, atau `NaN` → kode keluar 2).

   Tanpa Python (Python di repo hanya untuk kalkulator biaya).
2. **Gaya terkunci:** garis tipis, warna netral situs, satu aksen hanya pada yang hidup. Token warna dibaca `bangun.mjs` langsung dari blok `:root`, `:root.dark`, dan `:root.sepia` di `globals.css`; turunannya (`--body`, `--deck`, `--line`, `--accent-hi`, …) dihitung dengan `color-mix`. Bila warna situs berubah, bangun ulang aset dan warnanya ikut. Figur tidak boleh menulis hex/oklch sendiri.
3. **Mesin disesuaikan untuk Surau (dibanding iso-glow):**
   - Tanpa galeri, pemilih warna, font Google, dan kredit di gambar.
   - Tombol berbahasa Indonesia yang terlihat (versi asli hanya keyboard/klik).
   - Mode `?sematan=1` (latar transparan, tombol menempel di bawah), `?polos=1`, dan `?sampul=1&judul=&kecil=` (1200×630; teks lewat `textContent`).
   - Demo otomatis saat diam dan terlihat, berhenti saat disentuh. "Kurangi gerakan" menampilkan keadaan akhir.
   - Label `api.tag` berukuran piksel layar (±9 px) dan dijaga di dalam bingkai.
   - Filter cahaya berskala viewBox dengan wilayah `userSpaceOnUse` (garis mendatar tidak hilang); tanpa pendar di tema terang/sepia.
   - Tema bisa dikirim induk lewat `postMessage`.
4. **Tiga figur prinsip di Beranda** (`aset/figur/prinsip-{verbatim,alamat,atribusi}.html` → `/aset/*.html`), **tanpa kata, angka, atau tombol**:
   - **verbatim:** salinan keliru meredup dengan lencana silang, lalu salinan yang sama persis menyala dengan lencana centang.
   - **alamat:** jejak di alas dari klaim ke rak; jilid yang dirujuk ditarik keluar dan pita penanda halamannya terangkat dan menyala.
   - **atribusi:** jejak di alas dari pernyataan ke kitab; papan nama penulis di punggung kitab menyala; stempel putusan redup dan dicoret.

   Tanpa huruf Arab, wajah, atau sosok.
5. **Penyematan:**
   - Komponen klien `ArtEmbed` (`components/art/art-embed.tsx`) memasang `<iframe sandbox="allow-scripts" loading="lazy" aria-hidden tabindex=-1>` (tanpa `allow-same-origin`, jadi skrip aset tidak bisa menyentuh cookie atau DOM Surau). Iframe ini dekoratif, karena maknanya ada di teks kartu. Rasio 4:3.
   - Tema next-themes dikirim lewat `postMessage` saat tema berubah dan saat iframe dimuat; setelah itu aset mengabaikan perubahan tema sistem. `color-scheme` iframe diwarisi dari `<html>`. Gaya inline dari `resolvedTheme` tidak dipakai, karena menimbulkan ketidakcocokan hidrasi.
   - Header `/aset/*` ditulis di `apps/web/public/_headers`, karena Static Assets tidak melewati Worker:
     - `X-Frame-Options: SAMEORIGIN` dan CSP `frame-ancestors 'self'; sandbox allow-scripts`, sehingga dibuka langsung pun tetap berorigin "null".
     - `Cache-Control: … no-transform`, karena tanpanya Cloudflare menyisipkan beacon Web Analytics: setiap iframe tercatat sebagai kunjungan dan beacon gagal CORS. Ditemukan dan diperbaiki di preview.
     - `nosniff` dan `Permissions-Policy`.

     Aturan yang sama ada di `next.config.ts` untuk `next dev`, sedangkan halaman lain tetap `DENY`.
   - Pada figur bertombol, tekanan pengunjung (tombol, ketukan gambar, tombol keyboard) menghentikan animasi demo yang sedang berjalan (`api.tandai` → `batal()`), jadi tidak ada ketukan yang tertelan. Demo hanya berjalan saat figur ada di layar (IntersectionObserver).
   - **Tanpa berkas font di aset** (setelah ADR-056): figur situs tidak memuat kata, jadi mesin cukup memakai `'HarmonyOS Sans', system-ui`. Berkas HarmonyOS tidak disalin ke `public/aset/` (lisensinya melarang dibagikan sebagai paket tersendiri, dan iframe origin "null" butuh CORS). `potret.mjs` membaca TTF dari `apps/web/src/fonts/harmonyos-sans/` dan menyuntikkannya hanya ke browser pemotret, untuk cover dan konten yang memuat judul.
   - Kredit iso-glow dan iso-figure di `/lisensi#ilustrasi`.
6. **Format gambar diam:** WebP untuk situs dan konten (cover ±27 KiB, sebelumnya PNG ±425 KiB), JPG untuk `og:image` (±41 KiB; dukungan WebP di semua aplikasi pratinjau tautan belum pasti). Tanpa PNG di situs, karena gambar tidak dioptimasi ulang di Workers (ADR-003).
7. `vite.config.ts`: mesin, contoh asli, `aset/**`, `apps/web/public/aset/**`, dan `apps/web/public/aset-mesin/**` dikecualikan dari lint dan format (HTML padat hasil bangun).
8. **Tanpa kata, tanpa tombol, satu cerita** (permintaan pemilik, 2026-10-19: "Saya merasa kurang pas ada button di ilustrasi"; situs direncanakan bisa berbahasa Indonesia, Inggris, dan Arab):
   - Teks di gambar harus diterjemahkan di luar i18n, terlalu kecil di kartu, dan untuk bahasa Arab bertabrakan dengan aturan tanpa huruf Arab di aset. Karena itu figur situs memakai tanda visual bebas bahasa (`api.lencanaBidang`, pita, papan nama, redup, coret).
   - Tombol diganti **cerita sekali jalan**: diputar saat terlihat, lalu diam. Hover atau ketuk kartu (`data-art-card` → `postMessage {putar:true}`), atau kursor dan ketukan (`click`, jadi menggulir di ponsel tidak memicunya) di figur, memutarnya ulang. Satu cerita ±2–3 detik, tanpa perulangan tanpa henti.
   - Hover saja ditolak karena ponsel dan keyboard tidak punya hover.
   - Tombol tetap ada di mesin untuk halaman "coba sendiri" (`?tombol=0` menyembunyikannya).
9. **Penamaan (menyimpang dari ADR-012, terbuka):** kode aplikasi web memakai identifier Inggris (`ArtEmbed`, `name`, kunci `art` dan `principleArtTitle`). Mesin, figur, dan skrip skill memakai identifier Indonesia (`mountFigure` tetap dari asalnya), sama seperti skill dan perkakas pemilik lainnya (`scripts/ikon.mjs`), karena dibaca dan disunting dalam bahasa kerja skill. Jalur publik `/aset/<nama>` mengikuti rute situs yang berbahasa Indonesia (`/kitab`, `/cari`).
10. **Penghubung dan tanda ikut kisi isometrik** (dua putaran masukan pemilik): kabel lengkung bebas dan lencana yang menghadap layar terbaca sebagai gambar 2D di atas gambar isometrik. Kabel ortogonal yang melayang juga terasa tidak alami, karena tidak berpijak. Dari tiga opsi yang dibandingkan (A: jejak di alas, B: diangkat atau tampilan urai, C: tanpa penghubung), pemilik memilih **A**. Penghubung kini berupa jejak di permukaan alas (`api.jalur` setinggi alas + `api.simpul` di ujung), seperti jalur papan sirkuit sekaligus metafora jalur penelusuran. Lencana ✓/✗ menempel di bidang (`api.lencanaBidang`).
11. **Siap production** (cek akhir pemilik):
    - **Mode berulang** untuk empty state dan indikator memuat (`cfg.ulang`/`?ulang=N&jeda`, `ArtEmbed repeat`). Diputar N kali hanya selama figur terlihat, berhenti saat tab disembunyikan atau figur keluar layar, dan diam saat "kurangi gerakan". Empty state: total gerak ≤5 detik supaya tidak butuh tombol jeda (WCAG 2.2.2), contohnya `kosong-pencarian` (2 kali). 0 (terus) hanya untuk indikator memuat selama proses berjalan (gerak yang memang bagian dari prosesnya). Nilai `?ulang` yang tidak valid diabaikan (kembali ke bawaan figur), bukan dianggap 0.
    - **Mesin bersama:** di situs, mesin dimuat dari `/aset-mesin/iso-<hash>.js` (`Cache-Control: immutable` di `_headers`), sehingga HTML tiap figur turun dari ±32 KiB ke ±6 KiB. `bangun.mjs --situs` menghapus mesin lama dan membangun ulang semua figur situs supaya tidak ada rujukan yang patah. Konsekuensinya, satu jendela singkat saat deploy: halaman HTML lama yang masih ter-cache bisa merujuk mesin yang sudah dihapus; figur hanya tidak tergambar sampai dimuat ulang.

**Ditolak:**
- **Colorfigures** (dicoba lalu diganti): tinta tebal dan warna penuh terasa seperti merek lain di samping UI Surau yang tenang; garis tepi luar hilang di mode gelap.
- **Gaya "Lumen" iso-glow:** gradien neon, partikel, hanya gelap; kesannya situs kripto.
- **Mode 3D iso-glow:** three.js dari CDN, terlalu berat untuk Beranda.
- **Memasang skill hanya di `~/.claude/skills`:** tidak terlihat oleh sesi cloud.
- **Mesin sebagai komponen React:** global mesin bertabrakan dengan aplikasi; iframe mengisolasinya.
- **Dua gaya sejajar:** bertentangan dengan alasan awal pemilik, yaitu konsistensi.
- **iframe disembunyikan sampai tema terkirim:** bila iframe sudah selesai dimuat sebelum hidrasi, `onLoad` tidak terpanggil dan iframe tersembunyi selamanya.

**Konsekuensi:**
- Tiga iframe lazy di Beranda, masing-masing ±6 KiB HTML ditambah satu mesin bersama ±34 KiB (cache selamanya), tanpa berkas font.
- Static Assets mengalihkan `/aset/x.html` ke `/aset/x` (satu 307); mesin dirujuk dengan jalur absolut `/aset-mesin/…`.
- Mesin tidak ikut pembaruan iso-glow secara otomatis.
- Server dev tidak bisa dijalankan di sesi cloud (HeroUI Pro berlisensi tidak terpasang di sana). Sematan diuji lewat halaman tiruan, sedangkan Beranda asli lewat preview PR dan e2e CI.

**Tinjau ulang bila:** CSP penuh situs dipasang (`/aset/*` butuh CSP sendiri untuk skrip/gaya inline), pemilik ingin gaya lain, figur dipakai di halaman berat (pertimbangkan gambar diam + tombol "coba"), atau iso-glow merilis perbaikan mesin yang dibutuhkan.

## ADR-058 · Tekstur kertas dipanggang jadi tile AVIF statis (mask CSS), bukan shader WebGL saat runtime — diterima · 2026-10-20

**Konteks:** pemilik melaporkan tekstur kertas baru muncul beberapa ratus ms setelah halaman tampil. Penyebabnya berantai (ADR-041 poin 8): menunggu event `load` (semua gambar dan font), mengunduh chunk shader lewat `next/dynamic`, memuat tekstur noise data-URL, mengompilasi WebGL2, lalu fade-in 0,6 dtk. Audit viewport juga menemukan: (a) skala serat ikut lebar/tinggi viewport (`fit="cover"` pada persegi), jadi berbeda di ponsel, laptop, dan monitor 2560 px; (b) `maxPixelCount` 1920×1080 membuat kanvas di layar retina besar dirender di bawah resolusi layar lalu diperbesar (buram); (c) di ponsel, perubahan tinggi viewport saat bilah alamat muncul/hilang memicu render ulang; (d) tanpa WebGL2 latar polos. Dari sisi baca: setelan roughness 0,3 + fiber 0,3 didominasi bintik pasir per piksel di sekitar huruf, sementara seratnya hampir tak terlihat.

**Keputusan:**
1. Shader `PaperTexture` yang sama (`@paper-design/shaders` 0.0.81) dirender SEKALI oleh alat dev `scripts/kertas.mjs` (`pnpm kertas`, halaman lokal dengan slider + pratinjau terang/gelap/sepia): kanvas 1536+192 px, tepi disambung jadi tile mulus (campuran penjaga varians), dikecilkan ke 1024 px (sharp, tepi berulang supaya sambungan tetap mulus), disimpan AVIF abu-abu tanpa alpha q40 di `apps/web/public/kertas/serat.avif`.
2. Web memakai tile itu sebagai mask luminans `body::before` berwarna `--paper-shadow` (terang `#cdc8bb`, gelap `#3a362e`, sepia `#c4b396` baru), blend `multiply`/`screen`, opacity 0,6 di terang/sepia dan 0,55 di gelap, ulang tiap 768 px CSS. Atas permintaan pemilik latar terang dinaikkan dari `oklch(0.975 0.008 90)` ke `oklch(0.985 0.007 90)`, karena serat dan noise menggelapkan kertas sekitar 2,5%; teksturnya sedikit diperkuat (0,55 → 0,6) supaya tetap terlihat. Tanpa JavaScript, WebGL, atau fade; skala sama di semua viewport (di layar 2× tile diperbesar 1,5×; serat lembut sehingga tidak tampak buram, tile 1536 px AVIF ±150 KB tidak sepadan). Dibungkus `@supports (mask-mode: luminance)` supaya peramban lama tetap polos, bukan tertutup warna. Tidak dicetak dan disembunyikan di `forced-colors`.
3. URL memakai `?v=<hash isi>` yang diperbarui otomatis oleh `pnpm kertas`; `/kertas/*` di-cache `immutable` (`_headers`).
4. Setelan baru (dipilih dari enam varian berdampingan; tujuan: enak dibaca, alami, tidak mengganggu): roughness 0,2 (dari 0,3), roughnessSize 0,8 (dari 0,5: butir lebih besar dan lembut, tidak berpasir di tepi huruf), roughnessRows 0 (garis baris berisiko berinterferensi dengan baris teks), fiber 0,35 (dari 0,3), fiberSize 0,7 (dari 0,5), angle 300, seed 4. Butiran halus per piksel tetap dari noise SVG 5% (`body::after`).
5. Di luar tekstur (keputusan tipografi terkait, permintaan pemilik): tinta meresap (ADR-041 poin 9, bayangan 0,6 px) kini hanya untuk judul `h1`–`h6` selain judul bab Arab (`.reader-heading`), tidak lagi untuk semua teks. Teks isi, teks Arab kitab dan judul babnya (harakat, titik, penanda catatan kaki di dalamnya), serta teks kecil tidak dilunakkan; kesan kertas sudah datang dari tekstur. Tinta tidak rata di judul Latin `h1`/`h2` tetap (termasuk `drop-shadow` 0,5 px yang juga mengenai potongan Arab di dalam judul kartu `/kitab`). Beban gulir diukur di Mac pada `/kitab/ihya/1/4`, ponsel 375 px, 180 bingkai gulir 40 px lewat rAF, dua putaran: median 5 ms/bingkai (p95 5,5–5,7 ms) dengan maupun tanpa bayangan. Jadi alasannya keterbacaan, bukan kinerja.
6. Server alat panggang hanya mendengar di 127.0.0.1 dan menolak POST yang Host/Origin-nya bukan halamannya sendiri atau bukan PNG (maks. 20 MB), karena ia menulis berkas di repo.
7. `@paper-design/shaders-react` dihapus dari `apps/web`; `@paper-design/shaders` dan `sharp` 0.35.5 (versi sama dengan sharp transitif Next) menjadi devDependency root, hanya untuk alat panggang.

**Beda dengan percobaan yang ditolak (ADR-041 poin 8):** tile CSS yang dulu ditolak adalah tekstur lain (footer paper.design). Tile ini adalah keluaran shader PaperTexture itu sendiri, dengan parameter yang bisa diatur ulang lewat `pnpm kertas`.

**Ditolak:** mempercepat shader runtime (render saat mount, preload chunk) karena tetap menunggu hidrasi + kompilasi WebGL dan tidak memperbaiki skala per viewport; cache hasil render di `localStorage` (kunjungan pertama tetap terlambat, menambah JS); tile WebP 1536 px (±430–840 KB).

**Tinjau ulang bila:** pengulangan tile 768 px terasa di layar sangat lebar; pemilik ingin setelan lain (jalankan `pnpm kertas`); atau `@paper-design/shaders` naik versi.

## ADR-059 · Stabilitas ID paragraf dijaga sidik teks yang di-commit, diperiksa saat ingest — diterima · 2026-10-20

**Konteks:** issue #59 (audit agent). ADR-029 butir 3 menjanjikan pemeriksaan "ID lama masih ada atau dialihkan" di `corpus:promote` (S10), tetapi pemeriksaan itu tidak pernah dibuat. Kunci paragraf di peta ID bersifat posisional (`<halaman Shamela>:b<baris>`). Akibatnya, perubahan parser atau sumber yang menyisipkan baris di **tengah** halaman membuat ID lama tetap ada tetapi menunjuk paragraf lain, dan tidak ada yang menolaknya. Peta ID yang hilang juga diperlakukan sebagai peta kosong, dan `--reset-ids` tidak dijaga setelah rilis. Dampaknya: permalink `#p<seq>`, laporan `feedback`, tinjauan berkunci `passage_id`, dan klien MCP bisa menunjuk teks yang salah.

**Keputusan:**
1. Berkas baru `data/ids/<kitab>-<id shamela>.teks.json` (contoh: `ihya-9472.teks.json`) memetakan `passage.id` → 16 hex awal sha256(`text_raw`). Berkas ini tidak memuat teks kitab, hanya sidik. Satu entri per baris, urut ID, ±0,7 MB untuk Ihya.
2. `runIngest` membandingkan build baru dengan sidik itu. Setiap ID lama wajib ada dengan teks yang sama. Bila tidak, invarian "ID paragraf rilis stabil" gagal dan tidak ada keluaran: SQL, peta ID, dan sidik tidak ditulis. Daftar **lengkap** ID yang hilang atau berubah ditulis di bagian "ID paragraf rilis" pada laporan validasi. ID **baru** boleh ditambahkan karena peta hanya bertambah dan tidak menggeser ID lama, jadi usulan `--allow-new-ids` dari issue tidak dipakai.
3. Koreksi teks yang disengaja (patch) diterima hanya **per ID**: `--terima-teks-berubah <id,…>`. ID berubah yang tidak disebut tetap gagal, sehingga satu koreksi tidak bisa meloloskan pergeseran lain di run yang sama. ID yang disebut tetapi tidak berubah juga gagal, supaya daftarnya tidak basi. ID yang **hilang** selalu ditolak; jalan keluarnya kelak adalah `id_redirect` (ADR-029), dibuat saat pertama kali dibutuhkan.
4. Bila sidik ada, korpus dianggap sudah dirilis: `--reset-ids` ditolak, dan peta ID yang hilang menjadi galat (dulu peta kosong). Sebaliknya, peta ID yang berisi paragraf tanpa sidik juga galat, supaya sidik yang terhapus tidak dibuat ulang diam-diam. Kitab yang belum pernah dirilis memakai `--reset-ids`.
5. Sidik Ihya awal diambil dari build `surau-corpus-ihya-v6` (yang sedang di produksi). Sebelumnya dicek bahwa build itu sama dengan D1 produksi: seluruh `id, text_raw` produksi dibaca (kueri baca), disidik, lalu dibandingkan. Hasilnya 20.509 paragraf, tanpa ID hilang atau berubah di kedua arah. Ingest penuh dengan kode saat ini ke folder sementara lolos dengan 20.509 ID dan teks yang sama, dan peta ID tidak berubah.

**Menyimpang dari ADR-029:** pemeriksaan dilakukan di ingest, bukan di `corpus:promote`. Alasannya, build hanya bisa dibuat lewat `runIngest`, sehingga gerbang di sana menolak lebih awal tanpa membaca D1 produksi. `promote` tetap hanya menjalankan smoke hitungan. Celah yang tersisa: berkas `.sqlite` yang diubah tangan setelah ingest tidak tertangkap.

**Ditolak:** membandingkan langsung dengan D1 produksi di `promote` (butuh unduh ±5 MB teks per promote, dan promote sudah diblokir mode otomatis); menyimpan sidik di dalam peta ID (mengubah format peta yang sudah di-commit).

**Batas yang diketahui:** pergeseran di antara paragraf yang teksnya identik di halaman yang sama tidak tertangkap. Sidik juga tidak menjaga permalink halaman (`juz/page_no` per `source_page_id`) maupun ID node daftar isi (`/bab/<id>`).

**Tinjau ulang bila:** ada kitab kedua (sidik per edisi sudah mendukungnya); patch pertama yang menghapus atau menggabungkan paragraf (buat `id_redirect`); kunci paragraf diganti menjadi tidak posisional; atau ada perubahan sumber yang menggeser halaman atau daftar isi.

## ADR-060 · Deploy produksi melewati push yang hanya mengubah prosa — diterima · 2026-10-20

**Konteks:** issue #68. `deploy.yml` berjalan di setiap push ke `main`. Dari 59 commit terakhir, 16 hanya mengubah prosa (STATUS, LOG, ADR, laporan). Setiap deploy seperti itu membangun ulang OpenNext, men-deploy web dan MCP beserta smoke-nya (±10 menit Actions), mengisi ulang cache R2, dan menghasilkan versi Worker baru yang isinya identik.

**Keputusan:** pemicu `push` di `deploy.yml` diberi `paths-ignore`: `docs/**`, `implementasi/**`, `evals/reports/**`, `data/reports/**`, `.claude/**`, dan `**/*.md`. Tidak ada berkas dari jalur itu yang dibundel ke Worker (sudah dicek: tidak ada impor `.md` di `apps/` maupun `packages/`). Push yang mencampur kode dan prosa tetap men-deploy, karena `paths-ignore` hanya melewati push yang **semua** berkasnya cocok. `workflow_dispatch` tetap tersedia untuk deploy manual. `ci.yml` tidak diubah: `verify` adalah required check, dan workflow yang dilewati akan memblokir merge.

**Ditolak (untuk sekarang):** rollback otomatis bila smoke produksi gagal (usulan opsional di issue). Butuh keputusan terpisah soal migrasi `surau-app` yang sudah jalan.

**Tinjau ulang bila:** ada berkas Markdown atau isi `docs/` yang mulai dibundel ke Worker (mis. halaman yang merender Markdown dari repo); atau `aset/` mulai disalin ke `apps/web/public` lewat build.

## ADR-061 · Tanda terima sebelum mengirim batch LLM, dan `pnpm llm reconcile` — diterima · 2026-10-20

**Konteks:** issue #63. Pada keputusan batch S13, butir 6 hanya menyebut "tanpa ulang otomatis" untuk POST batch. Namun catatan batch baru ditulis **setelah** `batches.create` berhasil. Bila POST (puluhan MB) timeout atau proses mati padahal server sudah menerima batch, batch itu yatim: tidak ada di `batches.json`, tidak dihitung pagu (ADR #62), dan `submit` berikutnya mengirim request yang sama lagi, sehingga tertagih ganda.

**Keputusan:**
1. Sebelum POST, `submit` menulis request ke `requests/submitting-*.jsonl` dan catatan `submitting.json` (nama, jumlah request, perkiraan biaya, waktu mulai, PID pengirim). Penulisan berkas JSON di `data/build/llm/` kini atomik (tulis berkas sementara lalu rename).
2. Setelah POST berhasil, batch dicatat di `batches.json`. Request ditulis ulang dari memori ke `requests/<id>.jsonl`, lalu catatan dilepas. Pencatatan ini idempoten, jadi aman diulang bila proses mati di langkah mana pun.
3. Selama catatan ada: `submit` dan `retry` menolak jalan sebelum POST, pagu ikut menghitung perkiraan biayanya, dan `status` memberi peringatan.
4. `pnpm llm reconcile` (gratis) membaca `batches.list` (terbaru dulu) dan mencari kandidat yang memenuhi semua syarat ini:
   - belum tercatat;
   - jumlah request sama;
   - dibuat antara 1 menit sebelum dan 15 menit sesudah catatan;
   - bila batch sudah selesai, `custom_id` hasil pertamanya milik catatan. Syarat ini mencegah batch `tools/eval` di workspace yang sama ikut diadopsi.
   
   Hasilnya: satu kandidat dicatat; lebih dari satu dipilih manual dengan `--id`; tidak ada kandidat berarti catatan dilepas, **hanya** bila proses pengirim sudah mati dan catatan berumur ≥ 15 menit (batas tunggu POST eksplisit 10 menit + 5). Dengan begitu, reconcile di terminal lain tidak bisa melepas pengiriman yang masih berjalan.

**Ditolak:** idempotency key (opsi `idempotencyKey` di SDK 0.135 ditandai deprecated dan tanpa efek); mengulang POST otomatis (justru sumber tagihan ganda).

**Tinjau ulang bila:** API batch mendukung idempotency key atau metadata per batch (pencocokan bisa memakai penanda, tidak lagi jendela waktu dan jumlah request); atau `tools/eval` dan `tools/ingest` mulai mengirim batch berukuran sama secara bersamaan.

## ADR-062 · Satu alamat publik produksi: workers.dev web dimatikan, MCP menolak host selain mcp.surau.org — diterima · 2026-10-20

**Konteks:** issue #64. Ada dua celah, keduanya sudah dicek langsung pada 2026-10-20:
- **Web:** `https://surau-web.alfarieshsalman.workers.dev/` melayani situs penuh (200), dan `sitemap.xml` di sana menunjuk ke alamat `workers.dev`.
- **MCP:** Version URL produksi (`7e7cc2bd-surau-mcp.alfarieshsalman.workers.dev/mcp`) menjawab `tools/list` dengan binding produksi.

Kedua jalur ini berada di luar zona `surau.org`, sehingga pagar tingkat zona (WAF/rate limit T-19, Access) tidak berlaku. Batas di dalam Worker tetap berjalan.

**Temuan docs (Cloudflare, Sep 2026):** `preview_urls` mengatur Version URL **dan** URL Preview per PR di `workers.dev`, dengan satu setelan. Usulan issue (`preview_urls: false` di MCP) akan mematikan Preview per PR. Untuk domain yang dikelola dari dashboard, docs menganjurkan konfigurasi tanpa `routes` dengan `workers_dev: false`.

**Keputusan:**
1. **Web:** `"workers_dev": false` dan `"preview_urls": true` ditulis eksplisit, supaya Preview per PR tetap jalan. Custom domain `surau.org` tetap diatur di dashboard (T-07).
   - `sitemap.xml` memakai var `SITEMAP_ORIGIN`: produksi `https://surau.org`; Preview kosong, artinya origin diambil dari host permintaan.
2. **MCP:** `preview_urls` tetap `true`. Var baru `PUBLIC_HOST` berisi `mcp.surau.org` di produksi dan kosong di Preview. Worker produksi mengembalikan 404 untuk host lain sebelum memproses apa pun, sehingga Version URL produksi tidak melayani MCP.
3. Tautan `workers.dev` di STATUS diganti `surau.org`.

**Sisa yang diketahui:** Version URL **web** produksi (`<versi>-surau-web…workers.dev`) masih melayani situs. Web tidak boleh memakai middleware (ADR-003), jadi penjaga host seperti di MCP tidak dipasang. Cloudflare otomatis menambah `X-Robots-Tag: noindex` di URL Preview `workers.dev`, dan sitemap kini selalu menunjuk `surau.org`. Bila perlu ditutup penuh, pemilik bisa menyalakan Cloudflare Access untuk Version/Preview URL di dashboard (tab Domains Worker). Dengan begitu Preview per PR juga butuh login.

**Tambahan 2026-10-20 (#76):** web mengirim `Strict-Transport-Security: max-age=31536000` dari `next.config.ts`; sebelumnya tidak aktif di edge. Tanpa `includeSubDomains`, karena isi zona DNS belum diperiksa: satu subdomain yang hanya HTTP akan terkunci setahun. Tanpa `preload`, karena sulit ditarik. Header ini tidak ikut pada berkas `public/` (Static Assets), tetapi satu respons HTML sudah cukup bagi peramban.

**Tinjau ulang bila:** Cloudflare memisahkan setelan Version URL dari Preview URL; atau web mendapat titik masuk Worker sendiri (pembungkus OpenNext) tempat penjaga host bisa dipasang.

## ADR-063 · Stem Arab: artikel tidak dipotong bila sisanya kata fungsi dua huruf, varian lam melebur untuk kueri berartikel; NORM_VERSION 2, korpus `ihya-v7` — diterima · 2026-10-20

**Konteks:** issue #61. `stemToken` membuang artikel selama sisanya minimal dua huruf. Karena normalisasi melipat أ/إ/آ → ا, kata berartikel bersisa dua huruf bertabrakan dengan kata fungsi: الهم → هم ("mereka"), الآن → ان (= أن/إن), dan الأم → ام ("atau"). Bentuk ل + kata berartikel yang huruf pertamanya ل ditulis dengan lam melebur (لِلِّسَان = "للسان") dan ter-stem menjadi سان, sehingga tidak cocok dengan kueri اللسان (stem لسان).

**Keputusan:**
1. **Indeks dan kueri:** bila sisa sesudah artikel adalah **kata fungsi dua huruf**, artikel tidak dibuang. Daftarnya ada di `FUNCTION_TWO`, antara lain هم, ان, ام, من, ما, في, له, dan عن. Bentuknya diseragamkan menjadi `ال` + sisa (بالهم/والهم/للهم → الهم). Sisa dua huruf lain (الحق → حق, الحج, الشك, الظن, الحب) tetap dipotong seperti `NORM_VERSION` 1. `NORM_VERSION` naik ke 2, dan korpus dibangun ulang sebagai `ihya-v7`.
2. **Kueri saja:** token kueri **berartikel** yang stemnya berawalan ل mendapat varian `lamMergedVariant` (اللسان → سان, الليل → يل). Token tanpa artikel (لان, لهم, ليس) tidak diberi varian, supaya tidak membuka tabrakan الان/الهم/اليس dari arah kueri. Stem kanonis `ال` + kata fungsi tidak diberi varian proklitik, karena semua bentuk berklitiknya sudah sama di indeks.
3. **Tidak diselesaikan:** tabrakan verba berhamzah dengan kata benda berartikel (ألحق/الحق, ألهم/الهم) dan bentuk VIII (التفت) butuh analisis morfologi. Diterima secara sadar.

**Ukuran** (jumlah paragraf cocok; v6 = kode lama + build v6, v7 = kode baru + build v7):

| Kueri | v6 | v7 | Keterangan |
|---|---|---|---|
| الهم | 365 | 70 | tidak lagi tercampur هم |
| هم | 365 | 299 | tidak lagi tercampur الهم |
| الآن | 8.335 | 230 | tidak lagi tercampur أن/إن |
| الأم | 363 | 37 | tidak lagi tercampur أم |
| الحق, حق | 882, 882 | 882, 882 | kata benda dua huruf tidak berubah |
| الحج, الشك, الظن, الحب | 212, 155, 215, 425 | sama | |
| إليه, لان, الليل | 1.536, 934, 356 | sama | |
| اللسان | 305 | 309 | bentuk للسان kini ikut ditemukan |

Eval retrieval resmi (31 soal, lokal) tidak berubah: hit@1 64,5%, hit@5 96,8%, hit@10 100%, MRR 0,795.

**Urutan rilis:** kode `NORM_VERSION` 2 dengan korpus `norm_version` 1 membuat Cari Arab menjawab `unavailable`. Karena itu PR ini di-merge **bersama** perpindahan binding produksi ke `ihya-v7` (`corpus:promote ihya-v7 --confirm`, diizinkan pemilik 2026-10-20). `ihya-v6` tetap menjadi target rollback: revert kode lalu `--switch-only ihya-v6`. Staging (norm 1) dimuat ulang dari build v7 sesudah PR lain yang berbasis kode norm 1 sudah masuk, supaya Preview dan eval CI tetap jalan.

**Ditolak:**
- **Semua sisa dua huruf tidak dipotong** (rancangan pertama, ditolak peninjau). Cara ini memisahkan الحق dari حق dan menghilangkan recall kata benda inti Ihya.
- **Sisa minimal tiga huruf tanpa penyeragaman.** Cara ini memisahkan الحج dari بالحج/والحج.

**Tinjau ulang bila:** ada kata fungsi dua huruf lain yang bertabrakan (tambahkan ke `FUNCTION_TWO` = `NORM_VERSION` naik + reindex); atau analisis morfologi ringan tersedia untuk memisahkan verba berhamzah.
