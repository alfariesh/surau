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


## ADR-056 · Font UI HarmonyOS Sans menggantikan Plus Jakarta Sans — diganti oleh ADR-080 · 2026-10-20

> **Digantikan 2026-10-22 (ADR-080):** font UI kini Google Sans (OFL); berkas HarmonyOS dikeluarkan dari repo.

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

> **Pembaruan 2026-10-22 (X09, ADR-079):** pada kunjungan pertama tile baru diunduh sesudah halaman dimuat lalu masuk halus 0,6 dtk (LCP ponsel); kunjungan berikutnya dan tanpa JavaScript tetap seperti poin 2.

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

## ADR-064 · Pipeline Jawab (S19): AI Gateway BYOK lolos uji, routing + Citations per paragraf, verifikasi kutipan ke DB, Worker `surau-api` tanpa alamat publik — diterima · 2026-10-20

**Konteks:** S19 membangun pipeline Jawab di atas ADR-010/013. Pemilik membuat gateway `surau-gw` (T-14: authenticated, log mati, cache mati, retry mati, 50 request/menit, US$1/hari, BYOK wajib) dan mengizinkan biaya LLM ≤ US$3, termasuk satu kali holdout. Docs dicek 2026-10-20: AI Gateway (Anthropic, BYOK, auth, spend limit, custom cost), Citations *custom content* (indeks blok 0-based, akhir eksklusif, `citations_delta`, tidak bisa bersama `output_config.format`), Haiku 5.5 (thinking adaptif bawaan, effort bawaan `medium`, refusal tanpa fallback server), Hono 4.13.13, service binding + Workers Previews.

**Keputusan:**

1. **AI Gateway BYOK dipakai untuk panggilan online** (`pnpm run jawab:gateway-check`, 2026-10-20, ±US$0,0055). Request identik langsung vs gateway: 12/12 pemeriksaan sama, yaitu status 200, jenis event SSE, `citations_delta`, hanya `content_block_location`, indeks blok valid, baca cache pada request kedua, field `cache_creation`, JSON routing (`output_config.format`), header beta (`cache-diagnosis-2026-04-07`), dan header `cf-aig-*`. Request gateway pertama membaca cache yang ditulis request langsung, artinya prefix diteruskan byte demi byte. TTFB gateway 3,0 / 1,2 dtk vs langsung 1,5 / 0,9 dtk. Pemilik melihat biaya tercatat di dashboard Analytics, jadi harga `claude-haiku-5-5` dikenali dan spend limit harian berlaku. `cf-aig-custom-cost` tidak dipakai. Klien (`createGatewayAnthropic`): token di `cf-aig-authorization`, `x-api-key` **dihapus** (null; docs BYOK: kredensial penyedia diteruskan ke Anthropic), `cf-aig-collect-log-payload: false`, `cf-aig-metadata` {app, env}, `maxRetries` 1 (retry gateway mati), timeout 60 dtk. Klien langsung dikunci ke `https://api.anthropic.com` supaya `ANTHROPIC_BASE_URL` tidak membelokkannya. Runner eval memakai klien langsung (`.env`), seperti Message Batches: alat lokal, dan pagu US$1/hari gateway tidak boleh menghentikan eval.
2. **Dua panggilan per pertanyaan.** (a) Routing `answer-route@2`: sistem + daftar isi Ihya (313 node, ±11,8 ribu token, cache 1 jam) → JSON bagian ≤4, kueri ≤6, tanda hadits; ±US$0,0002 bila cache terbaca. Kueri buatan model hanya dipakai `searchText`, tidak pernah ditampilkan. (b) Jawaban `answer@5` dengan Citations, effort `low`, tanpa parameter sampling, tanpa prefill, `max_tokens` 8.000, stream. Pertanyaan dibungkus `<pertanyaan>` sebagai data; tanda `<`/`>` di masukan dibuang supaya tidak bisa menutup tag.
3. **Kandidat:** `searchText` atas pertanyaan dan kueri routing (global, 10 halaman), serta pertanyaan + 3 kueri pertama di setiap bagian pilihan (5 halaman); maksimal 20 pencarian. Daftar digabung RRF k=60, hasil tak berperingkat (kata umum) dilewati, maksimal 60 paragraf. Pasangan selalu ikut: paragraf badan → catatan kaki takhrijnya, catatan kaki → paragraf yang merujuknya. Kata Arab yang dipecah per kata dicoba lalu dibuang, karena menurunkan cakupan (26 vs 28/34 dokumen memuat lokasi gold).
4. **Dokumen:** satu dokumen *custom content* per paragraf. Paragraf >600 karakter dipecah di akhir kalimat menjadi blok ±400 karakter yang bersambung persis (offset UTF-16). Catatan kaki ≤2.000 karakter tetap satu blok, supaya sitasi takhrij = seluruh catatan kaki. `title` = lokasi jilid + halaman (tanpa nomor paragraf: v4 menyalinnya ke jawaban); `context` (tidak bisa dikutip) = jenis (matan/takhrij al-'Iraqi), jalur bagian, rujukan ayat, dan terjemahan AI berlabel. Terjemahan hanya untuk **12 dokumen teratas**. Anggaran dokumen **20 ribu token** (perkiraan); batas prompt 40 ribu dipakai untuk memangkas dokumen sebelum request dan diperiksa sesudahnya dari `usage` (`over_prompt_limit`), jadi bukan jaminan keras sebelum request. Perkiraan dikalibrasi dengan `count_tokens` (1–19 dokumen, galat ≤9 token): Arab 0,7 token/karakter, Latin 0,53, 95 token/dokumen, ±2.360 token tetap. Uji gratis atas rute tersimpan: 20 ribu token + terjemahan 12 teratas memberi cakupan gold 29/34, lebih baik daripada 27 ribu + terjemahan semua (28/34), dengan biaya lebih rendah.
5. **Verifikasi:** `content_block_location` → rentang segmen → bentang `{passage_id, char_start, char_end}`, dipangkas dari spasi dan dipecah ≤2.000 karakter. `cited_text` API wajib sama dengan teks DB di bentang itu, lalu `resolveEvalSource`/`verifyQuote`. Sitasi gagal dibuang dan dihitung. Blok teks yang **semua** sitasinya gagal dibuang. Huruf Arab buatan model (termasuk harakat, yang ber-`Script=Inherited`) dihapus dan dihitung. Bila nol sitasi lolos dan jawabannya bukan penolakan → `fallback/unverified` + hasil Cari (ARSITEKTUR §5 butir 9). Blok tanpa sitasi tetap tampil. **Menyimpang dari ARSITEKTUR §5 butir 9 (butir 7 versi awal)** ("hanya kalimat yang didukung sitasi"): Citations memecah teks menjadi blok klaim bersitasi dan blok sambung tanpa sitasi, dan membuang semua blok tanpa sitasi merusak kalimat. Akibatnya blok tanpa sitasi bisa memuat klaim yang tidak didukung (juga pada penjelasan `not_found`/`false_premise`). S21 wajib merender blok tanpa sitasi berbeda dari klaim bersitasi; judge S19 menilainya sebagai bagian jawaban.
6. **Penolakan:** dua kalimat baku di paragraf pertama: "Tidak ditemukan di kitab yang dicakup." (tidak ada dokumen yang membahas) dan "Anggapan dalam pertanyaan ini tidak didukung teks Ihya." (premis keliru, `reason: false_premise`). Keduanya menjadi `outcome: not_found` (docs/05 §5). **Menyimpang dari docs/05 §5:** premis keliru memakai kalimat kedua, karena v2 dengan satu kalimat sering mulai "tidak ditemukan" lalu tetap menjawab. UI S21 memberi label yang sama ("tidak ditemukan di kitab yang dicakup") untuk keduanya. Tanpa kandidat sama sekali → `not_found/no_candidates` tanpa panggilan jawaban.
7. **Status hadits:** kalimat "Status hadits: …" + sitasi catatan kaki terverifikasi → klaim `ai_extracted`, `passage_id` = paragraf badan yang merujuk catatan kaki itu. Bila kalimat status tidak bersitasi takhrij sendiri, ia dipasangkan dengan takhrij di paragraf yang sama **hanya bila jelas**: tepat satu catatan kaki yang hadits-nya (paragraf badan perujuk) ikut disitasi di paragraf itu, atau, bila paragraf tidak menyitasi hadits apa pun, tepat satu catatan kaki. Selain itu kalimatnya diganti kode dengan "Status hadits: belum diketahui (tidak ada takhrij al-'Iraqi yang tersitasi untuk kalimat ini)." (termasuk penanda Markdown di depannya). Sejak awalan "Status hadits:" muncul, blok-blok berikutnya tidak dipratinjau; isi akhir hanya lewat `done` (temuan peninjau; aturan teks-arab no. 6). **Celah yang diketahui (wajib ditutup sebelum Jawab dibuka di S21):** deteksi memakai awalan persis "Status hadits:", jadi variasi ("Status Hadits:", "Status hadis:", `**Status hadits**:`) tidak ditahan atau diganti; awalan yang langsung diikuti baris baru menghasilkan status kosong yang dilewati; kalimat status terpotong di singkatan seperti "HR." atau "w." sehingga sisa kalimat yang tak didukung tetap tampil; dan pemasangan "jelas" masih bisa salah bila satu paragraf menyitasi dua hadits sementara hanya takhrij hadits pertama yang disitasi (peninjau putaran 3).
8. **Refusal dan galat:** refusal Haiku → ulang sekali dengan Sonnet 5.5 (pratinjau di-reset). Refusal Sonnet → Cari. Kategori `stop_details` dicatat. **Tanpa `fallbacks` server di Sonnet** (skill menganjurkannya sebagai bawaan): model cadangannya dipilih server dengan harga berbeda, jadi biayanya tidak bisa diperkirakan dan direservasi ledger (S20). Semua galat penyedia (APIError apa pun, koneksi, timeout) → `fallback/provider_error`.
9. **SSE `POST /jawab`:** `stage` (route/retrieve/answer/retry/verify), `block` (pratinjau blok terverifikasi, ditahan sampai sitasi pertama lolos), `reset`, `done`/`fallback` (hasil akhir, wajib dipakai UI), `error` (tanpa pesan internal). Hasil ke klien tanpa diagnostik, usage, atau biaya. Heartbeat komentar tiap 10 dtk; batal dari klien membatalkan request Anthropic dan tercatat `outcome: aborted` (biaya parsialnya hanya terlihat di Analytics gateway).
10. **Worker `surau-api` (Hono 4.13.13):** tanpa route, `workers_dev: false`, `preview_urls: false`; satu-satunya pintu adalah service binding `API` dari web. Tanpa `nodejs_compat` (bundel dan tes workerd lolos). Pemeriksaan: `jawab_enabled` (0 → 503), secret (`not_configured` → 503), body ≤8 KB, pertanyaan 3–1.000 karakter. `env.staging` = Worker `surau-api-staging` (korpus + app staging). Preview web memakainya lewat `previews.services`, karena service binding dari Preview selalu memanggil deployment **produksi** Worker tujuan. `deploy.yml`: job `deploy-api` (migrasi `surau-app`, lalu `surau-api`) sebelum web; job `deploy-api-staging` terpisah supaya kegagalannya tidak memblokir web. **Keterbatasan:** `surau-api-staging` mengikuti `main`, jadi Preview sebuah PR memanggil kode API versi main; PR yang mengubah apps/api menguji API-nya dengan deploy staging dari branch (S19: atas izin pemilik). `corpus:promote` ikut mengganti `CORPUS_DB` apps/api, dan tes menjaga ketiganya sama.
11. **Penyimpanan:** `answer_cache` (migrasi app 0003): kunci SHA-256(versi korpus + `built_at`, versi prompt + versi pascaproses `JAWAB_PIPELINE_VERSION`, pertanyaan dirapikan), **tanpa teks pertanyaan**, hanya hasil `answer`/`not_found` yang utuh (bukan `max_tokens`/di atas batas prompt), usulan 30 hari sesuai P-7, expiry disaring saat baca; galat tulis dicatat (nama galat saja). SHA-256 tanpa garam bisa dibalik dengan kamus oleh pemegang akses D1: ganti HMAC dengan secret Worker di S20. Log Worker = event `jawab` berisi metrik saja (outcome, token, biaya, sitasi, refusal), tanpa pertanyaan, kueri routing, atau jawaban. **Menyimpang dari file sesi langkah 3** ("simpan ke `answer_log`"): pertanyaan pengguna umum belum disimpan ke `answer_log`, karena P-7 belum menerima pertanyaan umum dan penyamaran PII belum ada (ADR-052 butir 7). Arsip eval tetap masuk `answer_log` lewat `eval:jawab seed`. Penyimpanan pertanyaan umum + PII → S20.
12. **Web `POST /api/jawab`:** penerus tipis (Origin sama, JSON ≤8 KB, batas per klien 5/menit + global 30/menit, request baru tanpa cookie, stream diteruskan). **Mati di produksi** (`JAWAB_ROUTE_ENABLED` "0", ditambah `jawab_enabled` 0) sampai guard S20. Di Preview menyala ke staging. URL Preview publik, jadi biaya dibatasi `surau-app-staging.jawab_enabled` (0 kecuali saat diuji), batas gateway 50/menit dan US$1/hari, serta batas web.

**Eval (soal draf, belum disetujui ustadz; R4 belum berlaku):**

| Run | Korpus | n | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Tanpa pola fatwa | Biaya/jawaban |
|---|---|---:|---|---|---|---|---|---|
| publik v1 (`answer@1`, `route@1`) | ihya-v6 | 42 | 100% (152/152) | 64,7% | 75% (6/8) | 82,4% | 100% | $0,00295 |
| publik v2 | ihya-v6 | 42 | 100% (171/171) | 70,6% | 100% (8/8) | 79,4% | 100% | $0,00368 |
| publik v3 | ihya-v6 | 42 | 100% (175/175) | 64,7% | 75% (6/8) | 88,2% | 100% | $0,00265 |
| publik v4 | ihya-v6 | 42 | 100% (173/173) | 67,6% | 100% (8/8) | 94,1% | 100% | $0,00271 |
| holdout v4 (sekali) | ihya-v6 | 18 | **100% (74/74)** | 57,1% | 100% (4/4) | 100% | 100% | $0,00268 |
| publik v5 (`answer@5`) | ihya-v7* | 42 | **100% (167/167)** | **76,5%** | 100% (8/8) | 97,1% | 100% | **$0,00262** |
| publik final-2 (sebelum peninjau ulang) | ihya-v7* | 42 | 100% (154/154) | 67,6% | 100% (8/8) | 97,1% | 100% | $0,00258 |
| **publik final-3 (kode akhir, dipakai)** | ihya-v7* | 42 | **100% (159/159)** | **76,5%** | 100% (8/8) | **100%** | 100% | **$0,00259** |

\* Build lokal `ihya-v7` (NORM_VERSION 2, sama dengan produksi sejak ADR-063) dimuat ke folder D1 terpisah; berisi 16.092 terjemahan, 6 lebih banyak dari laporan validasi yang di-commit (hasil batch lebih baru di `data/build/llm`). Run v1–v4 dan holdout memakai `ihya-v6` sebelum merge #97. Run v5 lewat proxy D1 remote dua kali putus di tengah jalan (24 soal, US$0,0665, arsip hilang); runner kini menyimpan tiap jawaban segera dan satu soal gagal tidak menghentikan run. Lokasi 76,5% (v5) → 67,6% (final-2) → 76,5% (final-3) pada prompt yang sama (perubahan kode di antaranya hanya pascaproses status hadits, tag, urutan verifikasi) menunjukkan variasi routing antar-run ±3 soal. Satu run final dihentikan setelah 30 soal (US$0,0807) karena kode diperbaiki lagi.

Judge Sonnet 5.5 (`jawab-judge-v1`, Message Batches, **belum terkalibrasi manusia**, hanya publik): v4 kesetiaan **52,4%** (22/42), atribusi **69,0%** (29/42), biaya US$0,2267; v5 kesetiaan **39,0%** (16/41), atribusi **63,4%** (26/41), 1 keluaran gagal, biaya US$0,2323. v5 tidak lebih baik menurut judge: 9 soal lolos di v4 tetapi gagal di v5, 3 sebaliknya; hampir semua berpola "inti tepat, ada klaim kecil yang tidak didukung bukti". Judge belum terkalibrasi dan n=41, jadi selisih ini belum bisa dibedakan dari derau; v5 tetap dipakai karena korpusnya = produksi dan dua pola gagal v4 hilang. Target R4 keduanya ≥95%. Pola gagal v4 menurut judge: sumber inti tidak masuk kandidat (±10 soal), kalimat terpotong "…" karena lafaz Arab dibuang (9/42 jawaban), nomor paragraf/nama bab yang tidak bisa dicek judge (11/42), beberapa salah atribusi dan penolakan keliru. v5 menjawab dua pola kedua (prompt + judul dokumen).

Status hadits 0% di semua run: metrik S18 mencocokkan string status gold secara persis (misalnya "Sanad lemah" vs "sanadnya lemah"), jadi ringkasan bebas tidak pernah cocok. Pada soal publik yang diperiksa, isinya sejalan dengan takhrij. Metriknya **tidak diubah** di sesi ini; perlu kosakata label atau penilaian judge. Iterasi prompt hanya memakai 42 soal publik; holdout dijalankan sekali (v4) dan hanya dibaca agregatnya. Variasi antar-run besar (routing tidak deterministik; selisih ±3 soal wajar).

**Konsekuensi:**
- Validitas kutipan 100% tercapai di semua run. Lokasi (target ≥90%) belum: lokasi gold masuk dokumen hanya untuk 25–29 dari 34 soal, jadi **pencarian adalah hambatan utama**, bukan prompt. Paling lemah pada topik tersebar (≤1/6; lokasi+isi v5 94%). Kesetiaan/atribusi judge jauh di bawah target. Usul tindak lanjut: pencarian makna (ADR-046 ditunda) atau routing dua langkah dengan ringkasan bagian, metrik status hadits berlabel, dan kalibrasi judge. Gold draf juga perlu disetujui Anas (T-24).
- Biaya rata-rata **±US$0,0026–0,0027/jawaban** (target ±$0,002–0,003, docs/08), prompt ±22 ribu token, latensi rata-rata ±8,6 dtk lokal; ujung-ke-ujung lewat Preview (Worker SIN → D1 NRT) ±19 dtk sampai `done`, blok pertama ±12,7 dtk, cache ±3 dtk.
- Validasi masukan web masih manual (duplikat batas dengan skema Zod `apps/api`); skema bersama di packages/core bersama guard S20.
- Total biaya LLM S19 ±**US$1,51** (izin ≤ US$3), termasuk ±US$0,15 terbuang di run yang terputus/dihentikan.

**Tinjau ulang bila:** harga/model berubah; gateway berubah perilaku atau mulai mengenakan biaya; S20 menambah ledger (reservasi Sonnet); set soal resmi tersedia; metrik hadits diubah; atau lokasi tetap < 90% setelah perbaikan pencarian.

## ADR-065 · Pengaman biaya Jawab (S20): semua guard di `surau-api`, satu secret HMAC berturunan HKDF, ledger mikro-USD dengan reservasi atomik terpisah untuk Sonnet, cron tunggal, `/admin` Access + JWT, P-4/P-7 usulan — diterima · 2026-10-21

**Konteks:** S20 membangun rem berlapis ADR-014 di atas pipeline S19 (ADR-064). Pemilik belum menjawab P-4 (angka anggaran/kuota) dan P-7 (retensi); STATUS menetapkan usulan dipakai bila tidak dijawab. Pemilik menyetujui semua tindakan sesi ini di chat (2026-10-20 malam). Docs dicek 2026-10-21: Turnstile (siteverify JSON, `idempotency_key`, kunci uji menerima token apa pun dan menjawab hostname `example.com` tanpa `action`), Rate Limiting binding (`ratelimits` tidak diwariskan ke `env.staging`, periode 10/60 detik, per lokasi), Cron Triggers (`triggers` diwariskan; Workers Paid ±250 cron), D1 (`batch` = transaksi berurutan; `INSERT … SELECT … WHERE` + UPSERT; `UPDATE … FROM`), Cloudflare Access (validasi header `Cf-Access-Jwt-Assertion`; AUD per aplikasi, `ctx.access` tidak tersedia di Worker ber-assets), retensi API Anthropic (30 hari, tanpa pelatihan, konten bertanda pelanggaran hingga 2 tahun).

**Keputusan:**

1. **Semua guard biaya di Worker `surau-api`** (satu tempat, teruji di workerd). Web tetap penerus tipis: Origin sama, batas body, skema bersama `jawabRequest` (`@surau/core`, utang S19), batas per IP/global yang sudah ada; ia meneruskan `{question, turnstile?}`, nilai cookie `surau_anon` (`x-surau-anon`), dan IP klien (`x-surau-ip`) sebagai header internal service binding (Worker tujuan tanpa alamat publik, jadi header tidak bisa dipalsukan dari internet), dan hanya meneruskan balik `Set-Cookie: surau_anon`. `GET /api/jawab` → `GET /jawab/status` (`available`, `reason`, `challenge`, `sitekey`, `quota`) untuk UI S21, tanpa biaya LLM.
2. **Urutan guard `POST /jawab`:** masukan → `jawab_enabled` (503 `disabled`) + konfigurasi lengkap (503 `not_configured`) → cookie anon HMAC 24 jam, atau token Turnstile (401 `challenge_required` + sitekey; siteverify dengan `remoteip` + `idempotency_key`, timeout 5 dtk, satu ulangan; gagal → 403 `challenge_failed`; siteverify mati/secret salah → 503 `challenge_unavailable`) → burst binding `JAWAB_BURST` 3/60 dtk per anon-id (429) → kuota harian anon **dan** jaringan IP dalam **satu statement** (`INSERT … SELECT … WHERE kedua hitungan < batas … ON CONFLICT DO UPDATE`: keduanya naik atau tidak sama sekali; 429 `quota_exceeded` + lingkup) → cache (tanpa biaya) → reservasi anggaran (503 `budget`) → pipeline → komit biaya aktual di `waitUntil`. Kuota dihitung juga untuk jawaban dari cache (pengaman pemindaian). Cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/jawab; Max-Age=86400`, isi `v1.<id acak 128 bit>.<kedaluwarsa>.<HMAC>`.
3. **Satu secret `SURAU_API_SECRET`** (acak ≥32 karakter) → kunci HKDF-SHA256 per kegunaan: tanda tangan cookie, HMAC kunci `answer_cache` (menggantikan SHA-256 polos S19, yang bisa dibalik dengan kamus oleh pemegang akses D1), dan HMAC subjek kuota dengan **label harian** (`surau/quota/v1/<tanggal>`): baris hari berbeda tidak bisa ditautkan tanpa secret, dan ID anon/IP tidak pernah disimpan polos. Pemilik cukup memasang satu secret baru; tanpa secret Jawab gagal tertutup. **Menyimpang dari T-14** (yang menyebut `ANON_COOKIE_SECRET` + `IP_HASH_SECRET` terpisah): satu secret berturunan lebih sedikit langkah manual dengan pemisahan kunci yang sama.
4. **Turnstile produksi gagal tertutup:** `guardConfig` menolak secret HMAC pendek di semua lingkungan, dan menolak secret/sitekey uji resmi serta hostname `localhost` kecuali `ENVIRONMENT` ada di daftar izin {staging, test, development} (salah ketik tetap gagal tertutup). Produksi memeriksa `action = "jawab"` dan hostname (`surau.org` + subdomain); kunci uji melewati kedua cek (respons ujinya memang tanpa itu). **Staging memakai kunci uji resmi** (sitekey `1x…AA`, secret uji publik di `vars`, bukan rahasia) supaya Preview bisa diuji ujung ke ujung tanpa secret produksi; risikonya dibatasi sakelar staging (0 kecuali diuji), plafon `surau-app-staging`, dan batas gateway.
5. **Ledger mikro-USD bulat** (migrasi app 0004): `llm_budget` per bulan kalender UTC (plafon, terpakai, tereservasi, `warned_at`) dan `llm_ledger` (satu baris per panggilan berbiaya: `jawab` = routing + jawaban Haiku, `retry` = ulangan Sonnet; token, biaya, hasil, tanpa teks). Reservasi = satu `batch` (buat periode bila belum ada → sisipkan baris ledger hanya bila `spent + reserved + jumlah <= cap` → naikkan `reserved` hanya bila baris itu ada): tes 40 reservasi bersamaan tidak pernah melewati plafon. Besar reservasi = biaya **terburuk** (seluruh prompt dengan tarif tulis-cache 1 jam, keluaran = `max_tokens`): Haiku routing 16 ribu + jawaban 40 ribu token ≈ US$0,0162; **Sonnet direservasi terpisah** (≈ US$0,24) lewat kait `beforeRetry` sebelum ulangan, dan bila gagal → `fallback` alasan baru `budget` tanpa memanggil Sonnet. Komit idempoten (`UPDATE … FROM` hanya bila baris masih `reserved`); biaya dibagi per model dari salinan `usage` sebelum ulangan.
6. **Biaya yang dicatat = biaya nyata bila bisa diketahui, konservatif bila tidak (revisi setelah peninjau):** klien yang memutus koneksi **tidak** membatalkan panggilan LLM yang sedang berjalan: panggilan itu diselesaikan di latar (`waitUntil`), biaya nyatanya dikomit, dan hasil utuh masuk cache; panggilan **baru** (jawaban sesudah routing, ulangan Sonnet) tidak dimulai lagi (`fallback/cancelled`, kait `isCancelled`), supaya pekerjaan di latar pendek (batas `waitUntil` ±30 dtk). Versi awal membatalkan request Anthropic dan menghitung seluruh reservasi (±US$0,016, ±6× biaya nyata) sebagai terpakai, sehingga putus-sambung berulang (±42 IP × 3 tantangan Turnstile) bisa menghabiskan plafon US$20 dengan biaya semu dan mematikan Jawab sampai akhir bulan. Galat penyedia **berstatus HTTP** (400/429/5xx) = request ditolak, tidak ditagih → hanya biaya panggilan yang selesai. Galat **tanpa status** (timeout, koneksi putus, galat di tengah stream, termasuk body yang putus sesudah `message_start` yang dibungkus SDK sebagai `AnthropicError` dasar) mungkin sudah ditagih dan diulang SDK sekali → biaya terburuk panggilan itu × 2 dihitung terpakai (`estimated = 1`, `diagnostics.provider_error` kini memuat tahap + model) dan pengguna tetap turun ke Cari. Galat tak terduga (bug) → seluruh reservasi dihitung terpakai. Reservasi yang tidak dikomit >10 menit (Worker mati, mis. melewati batas `waitUntil` ±30 dtk sesudah klien pergi) → cron menandainya `expired` dan menghitungnya terpakai. Angka transparansi bisa sedikit di atas tagihan nyata (bertanda "perkiraan"), tetapi plafon tidak terlewati oleh biaya yang tidak tercatat. Rekonsiliasi Cost API (T-20) bisa mengoreksinya kelak.
7. **Anggaran habis = Jawab mati otomatis tanpa menyentuh sakelar:** reservasi ditolak → 503 `budget`; status → `available: false, reason: "budget"` (UI S21 menampilkan Cari); bulan berikutnya periode baru otomatis terbuka. Situs (pembaca, Cari, MCP) tidak bergantung pada ledger.
8. **Satu cron `*/10 * * * *`** di `surau-api` (staging mewarisinya): reservasi basi, periode berjalan dipastikan ada, peringatan 80% sekali per bulan (event log `jawab_budget_warning`, juga dicatat saat komit). Hapus fisik P-7 sekali per hari UTC, pada putaran pertama yang menemukan `settings.purge_day` belum hari ini (bila gagal, putaran berikutnya mengulang; ledger dihapus per bulan lewat indeks `period`): `answer_cache` dan `answer_log` kedaluwarsa (tinjauannya lebih dulu), `quota_daily` > 7 hari, `feedback` `fixed`/`rejected` > 12 bulan sejak `resolved_at`, `llm_ledger` > 24 bulan (dibulatkan per bulan kalender, jadi paling lama ±25 bulan). **Tidak dibuat:** rekonsiliasi Cost API + email peringatan (butuh T-20 opsional dan alamat tujuan terverifikasi).
9. **`/admin`** (web): Cloudflare Access `Surau Admin` (T-14) di tepi + validasi JWT di aplikasi dengan **AUD admin** (`a7f9…65a4`, dibaca dari parameter `kid` redirect login; token aplikasi Tinjau ditolak, dan sebaliknya; tes). Isi: sakelar `jawab_enabled`, biaya bulan ini (plafon, terpakai, tereservasi, %, jumlah per hasil), kuota hari ini (agregat), plafon + kuota yang bisa diubah, laporan kesalahan terbaru + status. Mutasi `POST /api/admin`: Origin sama, JSON ≤4 KB, union Zod; log hanya jenis aksi. Rute Jawab produksi tetap terkunci oleh `JAWAB_ROUTE_ENABLED` "0" walau sakelar D1 dinyalakan (dibuka di `/rilis 4`).
10. **Privasi (P-7 usulan):** penyamaran PII deterministik (`redactPii`: email, deret ≥9 digit seperti telepon/NIK/rekening, tautan luar, akun `@`) untuk pesan `feedback` sebelum disimpan dan saat ditampilkan di `/admin` (laporan lama). Nama orang tidak dikenali (dicatat di kebijakan). **Pertanyaan pengguna umum tetap tidak disimpan** ke `answer_log`: docs/05 "Pertanyaan terbuka" meminta keputusan pemilik + dewan; S21 hanya menyimpan bila pengguna sendiri melaporkan jawaban. Halaman publik `/privasi` + docs/05 §8 diperbarui; klaim lama "log AI Gateway 7 hari" dikoreksi (log gateway mati = tanpa log per permintaan).
11. **Angka P-4 (usulan, bisa diubah di `/admin`):** plafon US$20/bulan, 10 Jawab/hari per pengunjung, 30/hari per jaringan IP (CGNAT), burst 3/60 dtk. Spend limit workspace Anthropic (±US$25) dan gateway (US$1/hari) tetap rem cadangan.
12. **Log otomatis per permintaan dimatikan di semua Worker** (`observability.logs.invocation_logs: false` untuk web, MCP, API; produksi, Preview, staging; dijaga tes `tools/ingest/src/corpus.test.ts`). Diperiksa 2026-10-21 dengan `wrangler tail surau-web --ip self` (hanya permintaan sendiri, nilai disamarkan saat dibaca): event per permintaan memuat `cf-connecting-ip` dan `x-real-ip` **mentah** (cookie disamarkan Cloudflare, query string sudah dihapus `redact_query_string`). Artinya sejak log dinyalakan, Workers Logs web dan MCP menyimpan IP pengunjung 7 hari, bertentangan dengan docs/05 §8; log lama itu habis sendiri dalam 7 hari sesudah deploy ini. Yang tersisa: event JSON buatan kode (tanpa IP) dan traces 10% (atribut resmi: negara/kota, ASN, jenis peramban, beberapa header `accept*`, URL; tanpa IP). Header internal `x-surau-ip`/`x-surau-anon` ke `surau-api` tidak lagi tercatat. Ringkasan log Preview di CI tetap jalan (GraphQL Analytics, ADR-031).
13. **Perbaikan lain dari peninjau:** status Jawab memeriksa kuota jaringan IP juga tanpa cookie (pengunjung tidak diminta Turnstile lalu ditolak 429); kunci uji Turnstile hanya diizinkan bila `ENVIRONMENT` ∈ {staging, test, development} (daftar izin, salah ketik tetap gagal tertutup); pesan laporan dipotong lagi ke 2.000 karakter sesudah disamarkan; aksi kuota `/admin` satu transaksi; tes galat penyedia 400/429 dan galat koneksi.

**Ditolak:** membatalkan request Anthropic saat klien putus (biaya tak diketahui → reservasi penuh → celah penghabisan plafon); mengirim IP/ID anon lewat body alih-alih header internal (header aman sesudah log otomatis dimatikan, dan traces tidak merekam header buatan sendiri); guard di web (ledger butuh `usage` yang hanya ada di `surau-api`; dua tempat = dua sumber kebenaran); dua tahap kuota (anon lalu IP) yang bisa memakan kuota anon saat jaringan penuh; reservasi Sonnet di muka untuk setiap pertanyaan (mengunci ±15× biaya rata-rata per permintaan); garam IP acak harian di D1 (privasi setara dengan HMAC berlabel tanggal, tetapi menambah baris rahasia di DB dan langkah rotasi); `changes()` sebagai penghubung antarstatement batch untuk reservasi (bekerja lokal, tetapi `EXISTS` atas baris yang baru disisipkan lebih jelas); menyalakan Jawab produksi di sesi ini (keputusan `/rilis 4`).

**Konsekuensi:**
- Jawab produksi tetap mati (rute web "0", `jawab_enabled` 0). Untuk menyalakannya kelak pemilik memasang secret produksi `surau-api`: `TURNSTILE_SECRET_KEY` (widget `Surau`), `SURAU_API_SECRET` (acak), `CF_AIG_TOKEN` (T-14).
- Staging butuh `SURAU_API_SECRET` sebagai secret `surau-api-staging` (selain itu `not_configured`); Turnstile staging memakai kunci uji di `vars`.
- Latensi sebelum LLM bertambah ±2 bolak-balik D1 (kuota, reservasi), ±90 ms masing-masing dari SIN ke NRT; kecil dibanding ±8–19 dtk jawaban.
- Entri cache S19 (kunci SHA-256) tidak terbaca lagi dan terhapus oleh cron saat kedaluwarsa.

**Tinjau ulang bila:** pemilik menjawab P-4/P-7; login pengguna ditambahkan (ADR-016); Turnstile/Rate Limiting berubah perilaku; T-20 dikerjakan (rekonsiliasi); atau kebocoran reservasi (`expired`) sering terjadi.

## ADR-066 · UI Tanya (S21): status hadits toleran, teks jawaban per blok tanpa Markdown, kartu kutipan dari `/api/kutipan`, Turnstile sesuai permintaan, laporan jawaban, `/transparansi`; rilis Fase 4 belum layak — diterima · 2026-10-21

**Konteks:** S21 membangun halaman Tanya di atas pipeline S19 (ADR-064) dan guard S20 (ADR-065). Pemilik menyetujui semua tindakan sesi ini di chat (2026-10-20 malam); agent membatasi biaya LLM S21 ≤ US$0,50. Review ustadz (T-13/T-24) dan persetujuan tampilan oleh pemilik belum bisa dilakukan malam ini.

**Keputusan:**

1. **Status hadits (utang wajib ADR-064 butir 7), versi 3 sesudah empat putaran tinjauan `peninjau`:** satu aturan inti yang aman secara desain, ditambah deteksi pernyataan yang toleran.
   - *Aturan inti:* setiap pernyataan status hanya tampil bila **kalimat itu sendiri** menyitasi catatan kaki takhrij terverifikasi — sama dengan perintah prompt `answer@5` ("Kalimat itu sendiri harus bersitasi ke dokumen takhrij"). Pemasangan dengan takhrij dari kalimat lain di baris/paragraf yang sama **dihapus** (celah "meminjam" takhrij hadits lain). *Kelompok* = kalimat-kalimat dari satu baris label atau satu butir (satu hadits): blok bersitasi yang menyentuh dua kelompok ambigu; takhrij (per paragraf catatan kaki) yang disitasi dua kelompok tidak mendukung siapa pun; dalam satu kelompok beberapa kalimat boleh menyitasi takhrij yang sama (satu klaim per kelompok + takhrij); satu pernyataan boleh menyitasi beberapa takhrij. Tanda baca/spasi di tepi blok tidak dihitung "menyentuh".
   - *Pernyataan = satu kalimat* (label AI = isi kalimat itu saja, bukan seluruh butir/paragraf): kalimat sesudah label status, kalimat berikutnya di baris yang sama yang memuat istilah penilaian, dan butir/paragraf di bawah label (kalimat pertama tiap butir selalu; kalimat berikutnya bila memuat istilah penilaian). Akhir kalimat untuk kepemilikan sitasi = akhir terdekat (juga sesudah "saw."/"dkk." bila diikuti huruf besar; kecuali singkatan rujukan seperti "HR. Muslim").
   - *Label toleran:* "Status/Derajat/Kualitas", ≤2 kata sisipan (juga berstrip: "masing-masing"), "hadits/hadis/hadist/hadith/ḥadīts", "hadits-hadits", "-nya", ≤8 kata/koma/kurung/kutipan sebelum pemisah (":", "：", "—", "–", "-" berspasi); baris label tanpa pemisah ("**Status hadits**", "Status hadits ini") hanya di awal baris dan ≤2 kata sesudah kata hadits; juga "Status:"/"Statusnya:" tanpa kata hadits ("Derajat:" tanpa kata hadits **tidak**, karena lazim untuk tingkatan amal). Butir: pengantar dari daftar putih kata ("sebagai berikut", "menurut takhrij al-'Iraqi:") bukan pernyataan; daftar longgar dan paragraf berisi istilah penilaian sesudah baris kosong ikut; baris yang memuat label lain menghentikan pembacaan butir; sesudah status sebaris yang lengkap hanya butir rapat yang memuat istilah penilaian yang ikut (daftar biasa tidak tertelan).
   - *Penggantian:* hanya kalimat yang tidak didukung (sampai akhir kalimat yang sadar singkatan; penanda daftar tetap), sebagai blok **tanpa sitasi**; kalimat lain di baris itu tetap, termasuk kalimat takhrij yang bersitasi — kecuali bila akhir kalimat yang sadar singkatan melewati "saw."/"dkk." sehingga kalimat sesudahnya ikut terganti (aman, tetapi isinya hilang). Pemberitahuan: "Status hadits: belum diketahui (tidak ada takhrij al-'Iraqi yang tersitasi untuk kalimat ini)" bila model sendiri menulis "belum/tidak diketahui"/"belum dapat ditentukan" atau jawaban tidak menyitasi takhrij sama sekali; selain itu pemberitahuan netral "Status hadits: tidak ditampilkan (takhrij al-'Iraqi untuk kalimat ini tidak dapat dipastikan)" — tidak menunjuk takhrij mana pun, karena takhrij yang tersitasi di tempat lain bisa milik hadits lain (putaran 4). Pemberitahuan dikenali sebagai teks pengganti (tidak diperiksa ulang, tidak memutus bagian status), yang berdampingan digabung. Bila bagian blok yang diganti memuat isi, sitasi takhrij potongan sisanya dibuang. Teks hasil diperiksa ulang sampai stabil; klaim dihitung dari teks akhir; bila belum stabil sesudah 6 putaran, jawaban **tidak ditampilkan** (fallback ke hasil Cari).
   - Pratinjau ditahan begitu gabungan teks blok memuat label. Tag `<cite …>` tiruan model dibuang (arsip j021). `JAWAB_PIPELINE_VERSION` 1 → 3 (2 dipakai eval ulang pertama; kunci cache berganti). Uji: 35 tes status hadits (di antara 60 tes `jawab-unit.test.ts`). Pemindaian sekali jalan (skrip lokal, tidak di-commit: `hadithStatements` atas `answer.text` arsip privat soal publik S19–S21): setiap pernyataan yang terdeteksi memang kalimat status hadits (satu-satunya salah kenal, "tiga derajat: puasa umum, …", membuat "Derajat:" tanpa kata hadits dikeluarkan dari label).
   - *Batas yang diketahui (penghalang `/rilis 4`):* (a) klaim status yang ditulis bebas tanpa label ("sanadnya dinilai lemah oleh al-'Iraqi") tidak diperiksa: bila tanpa sitasi tampil redup sebagai teks tanpa dukungan, bila bersitasi matan tampil seperti klaim yang didukung; (b) deteksi label tetap berbasis pola teks bebas, jadi varian yang belum terbayang bisa lolos. Desain yang aman sepenuhnya: status ditampilkan dari teks takhrij (label per catatan kaki yang dibuat sekali dan ditinjau), bukan dari tulisan model saat menjawab. Arsip diagnostik eval kini menyimpan blok + sitasinya untuk mengaudit (a).
2. **Eval ulang** (`s21-publik-hadits-v1`, 42 soal publik, ihya-v7, US$0,1167): kutipan valid 100% (171/171), lokasi 73,5% (25/34; final-3 S19 76,5%, dalam variasi routing ±3 soal), penolakan tepat 100% (8/8), tidak salah menolak 97,1% (33/34), tanpa pola fatwa 100%. Dari 5 kalimat berawalan "Status hadits:": 2 didukung takhrij, 3 diganti "belum diketahui", **0 kalimat berawalan tanpa takhrij yang tampil** (diperiksa dengan `hadithStatements` atas arsip; angka ini tidak mencakup klaim status yang ditulis bebas, lihat butir 1). Judge tidak dijalankan ulang (belum terkalibrasi; biaya ±US$0,23 tanpa informasi baru). Eval ulang versi 3 (final): lihat butir 13.
3. **Teks jawaban dirender per blok sebagai teks biasa, bukan Markdown** (menyimpang dari langkah garis besar "dirender sebagai Markdown"): blok bersitasi diberi penanda `[n]` ke kartu, blok tanpa sitasi tampil redup dengan keterangan (ADR-064 butir 5). Markdown tidak bisa membedakan gaya per blok tanpa memecah struktur; penanda sederhana (`**`, `_`, `#`) dibuang. Teks Arab tidak pernah ada di teks jawaban (dibuang pipeline).
4. **Komponen HeroUI OSS** (TextArea, Button, Card, Chip, Alert, Spinner) alih-alih komponen Chat Pro: Tanya = satu pertanyaan → satu jawaban + kartu kutipan, bukan percakapan; tanpa tambahan CSS Pro (ADR-035).
5. **`GET /api/kutipan?r=id:awal:akhir,…`** (≤20 rentang, ≤2.000 karakter per rentang; pagar sama dengan Cari: sakelar `READER_ENABLED`, `SEARCH_LIMITER` per jaringan, lalu `SEARCH_GLOBAL_LIMITER`): teks kartu = potongan `text_raw` DB yang disalin kode (aman surrogate), sekali ambil lewat `answerPassages` (bukan `resolveEvalSource` per rentang, yang butuh beberapa bolak-balik D1 per kutipan). Terjemahan AI paragraf berlabel; yang ditolak peninjau disembunyikan; placeholder ayat `⟦QS s:a⟧` tampil sebagai rujukan `(QS s:a)` saja. `Cache-Control: public, max-age=300` (isi = fungsi ID stabil).
6. **Turnstile hanya bila server meminta:** status (`GET /api/jawab`) atau `401 challenge_required` → skrip resmi dimuat sesuai kebutuhan (`render=explicit`), widget `interaction-only`, `action` "jawab"; token dikirim sekali bersama pertanyaan. Pengunjung yang tidak bertanya tidak pernah menjalankan Turnstile.
7. **Laporan jawaban:** formulir di bawah jawaban → `/api/feedback` jenis `answer`, path `/tanya` (skema: jenis `answer` ⇔ path `/tanya`). Pesan memuat komentar, pertanyaan, dan ±900 karakter awal jawaban, karena pengguna sendiri memilih melapor; server menyamarkan PII dan memotong 2.000 karakter; tampil di `/admin`. **Ditunda:** masuk ke `/tinjau` (`answer_log`), karena format `answer_log` adalah arsip eval dan penyimpanan pertanyaan umum menunggu keputusan pemilik + dewan (docs/05).
8. **`/transparansi`:** biaya AI tiga bulan terakhir dari ledger (pertanyaan berbiaya, biaya, bagian perkiraan, plafon), biaya tetap, prinsip tanpa iklan/paywall (NC), cara mendukung tanpa donasi (belum dibuka). Jawaban dari cache tidak berbiaya dan tidak dihitung.
9. **Navigasi:** menu "Tanya" tetap "segera" dan `/tanya` `noindex` sampai `/rilis 4`; halaman bisa dibuka langsung dan menampilkan "belum dibuka" (rute produksi 404).

10. **Tanda hadits lemah dari teks takhrij DB, bukan dari ringkasan AI** (docs/05 §4 "setiap kali dikutip"): `takhrijHasWeakTerms` (`@surau/text`, kata kunci Arab atas bentuk normal `normalizeArabic`: ضعيف/ضعف…, موضوع, باطل, منكر, متروك, مجهول, منقطع, واه, أعله, "لا أصل له", "لم أجده/لم أقف/لم أظفر/لم أر له أصلا…", "لا يصح", "شديد الضعف", "ليس بشيء", "فيه لين", "متهم", "كذبه"; proklitik mengikuti `queryProclitics`; negasi "ليس ب…/غير …" (dengan و/ف) tidak dihitung). `/api/kutipan` memberi `weak` untuk catatan kaki yang teks **lengkapnya** memuatnya; kartu kutipan dan bagian status hadits menampilkan "Takhrij memuat istilah kelemahan" + keterangan bahwa ini dikenali dari kata kunci dan bisa hanya mengenai satu jalur. Bagian status hadits kini menampilkan **teks takhrij asli dari DB** di bawah ringkasan "diekstrak AI". Tanda dari pencocokan kata pada ringkasan AI **dihapus** (bisa menandai hadits sahih karena kata "palsu"/"lemah" di deskripsi topik atau negasi). "ضعف" sendirian hanya dihitung dalam frasa khas takhrij ("فيه ضعف", "في إسناده ضعف", "وضعف إسناده"), karena di lafaz hadits ia juga berarti "lipat" atau lemah fisik; "منكر ونكير" (nama malaikat), "فاعله", dan negasi "ليس ب…/غير …" dikecualikan; kata yang lebih sering muncul di lafaz hadits/ayat daripada sebagai kritik ("هالك", "الكذاب", "منكرا", "باطلا") tidak dipakai. Ukuran (ihya-v7): 1.350 dari 4.398 catatan kaki bertanda; dari 522 yang menyebut "متفق عليه", 21 bertanda (kebanyakan takhrij campuran; sebagian kecil karena lafaz hadits sendiri memuat kata kunci, mis. "باطل" dalam syair Labid). Pada arsip eval versi 2: untuk 4 soal yang menyitasi takhrij gold-nya (j025, j027, j028, j029) takhrij itu bertanda; j026 (muttafaq 'alaih) tidak; j024 menyitasi takhrij hadits lain (takhrij gold-nya tidak masuk dokumen), yang juga bertanda — tanda melekat pada takhrij yang tampil, bukan pada hadits yang ditanyakan.
11. **Privasi jujur soal laporan jawaban:** `/privasi` dan docs/05 §8 kini menyebut bahwa laporan jawaban menyimpan komentar, teks pertanyaan, dan awal jawaban (≤900 karakter) yang dikirim pengguna sendiri, sampai ditangani + 12 bulan (sebelumnya ringkasan menyatakan pertanyaan Tanya tidak pernah disimpan).
12. **Aksesibilitas:** judul hasil h2 (bukan `Card.Title` h3), "Paragraf terkait" h2; penanda `[n]` bernama "Kutipan n"; pengumuman `aria-live` untuk hasil/galat; petunjuk "minimal 3 huruf"; status Jawab galat sementara (429/5xx) tidak lagi ditampilkan sebagai "belum dibuka"; tautan Cari yang memuat pertanyaan tanpa prefetch. `/tanya`, `/privasi`, `/transparansi` masuk `a11y.spec` (WCAG + urutan judul); e2e Tanya menunggu respons status sebelum memilih cabang.

13. **Eval ulang versi 3 final** (`s21-publik-hadits-v5`, 42 soal publik, ihya-v7, US$0,1091, rerata US$0,0026/jawaban; laporan `evals/reports/jawab-s21-publik-hadits-v5.md`): kutipan valid **100%** (159/159), lokasi **73,5%** (25/34; antar-run 73,5–76,5% karena variasi routing), penolakan tepat 100% (8/8), tidak salah menolak 94,1% (32/34), tanpa pola fatwa 100%. Audit status hadits atas arsip (blok + sitasi akhir, soal publik): **3 ringkasan status tampil, ketiganya bersitasi takhrij sendiri** — j028 dan j029 sesuai gold; j027 benar untuk hadits yang dibahas kalimatnya ("akal sebagai makhluk pertama", takhrij "dua isnad yang lemah"), sedangkan takhrij hadits yang ditanyakan tidak terambil pencarian (kegagalan lokasi, bukan status keliru); 2 pernyataan diganti pemberitahuan netral (j025, j027); 0 pemberitahuan "belum diketahui" yang salah tempat; **0 klaim penilaian bebas bersitasi matan** (dua temuan regex audit adalah "nahi mungkar" dan "bagian ini batil", bukan penilaian hadits); 6 klaim bebas tanpa sitasi (tampil redup). Tanda kelemahan DB: takhrij gold yang disitasi (j025, j028, j029) bertanda, j026 (muttafaq 'alaih) tidak. Metrik "Takhrij" laporan 0/7 karena mencocokkan string persis dengan label gold (catatan S18/S19), bukan bukti status keliru. Riwayat run: `s21-publik-hadits-v3` (sebelum perbaikan putaran 4, US$0,1096: kutipan 100%, lokasi 76,5%, 2 ringkasan tampil) dan `…-v4` (terhenti sesudah 11 soal karena batas run US$0,20 lebih kecil dari cadangan Sonnet runner, US$0,0299, laporan tidak disimpan).

**Belum terpenuhi (jujur):** syarat R4 —
- **Status hadits benar 100% (untuk hadits yang punya takhrij): belum terbukti.** Metrik otomatis masih 0/6 (pencocokan string persis, perlu label status per catatan kaki); secara manual, dari 6 soal status hadits di run final: 3 ringkasan status tampil dan sesuai takhrij yang disitasi kalimatnya (satu untuk hadits lain karena pencarian meleset), 2 ditahan dengan pemberitahuan netral. Deteksi berbasis pola teks bebas punya batas (butir 1: klaim bebas tanpa label, varian label yang belum terbayang) — **penghalang `/rilis 4`** sampai status ditampilkan dari label takhrij yang ditinjau, bukan dari tulisan model.
- Lokasi 73,5–76,5% < 90%; kesetiaan/atribusi belum terukur dengan judge terkalibrasi; kualitas bahasa belum dinilai ustadz; review ustadz atas prompt/kebijakan/sampel belum ada; pemilik belum melihat tampilan.

**`/rilis 4` belum disarankan.** Hambatan utama tetap pencarian (ADR-064 Konsekuensi) dan, untuk hadits, ekstraksi status dari takhrij (usul: label status per catatan kaki dibuat sekali secara deterministik/AI terkurasi dan ditinjau, bukan diekstrak model saat menjawab).

**Tinjau ulang bila:** ustadz/pemilik meninjau; pencarian makna atau routing dua langkah dibangun; atau format jawaban berubah (mis. Markdown per paragraf dengan penanda sitasi).

## ADR-067 · Kandidat Jawab (X03): RRF berbobot (pertanyaan ×3), bagian 3 halaman, bagian dari ringkasan AI sebagai routing kedua, pertanyaan panjang dipotong per kata; diukur gratis atas rute tersimpan — diterima · 2026-10-21

**Konteks:** Lokasi eval publik S19/S21 73,5–76,5% (target R4 ≥ 90%). Lokasi gold baru masuk dokumen jawaban pada 25–29 dari 34 soal; topik tersebar ≤ 1/6 (ADR-064, ADR-066). Hambatannya di pencarian kandidat, bukan prompt jawaban. ADR-046 menunda pencarian makna; sesi ini mencoba opsi murah dulu.

**Pengukuran gratis:** `pnpm run eval:jawab kandidat --input <diagnostik,…>` mengulang langkah 2 pipeline tanpa LLM (`jawabCandidates`, diekstrak dari `runJawab`, jadi kodenya sama dengan Worker) atas rute routing yang tersimpan di arsip `*-diagnostik-publik.jsonl`. Metrik: semua lokasi gold ada di dokumen (setelah anggaran 20 ribu token). Enam set rute `answer-route@2` (s19-publik-v5, final-2, final-3, s21-publik-hadits-v1, v3, v5) × 34 soal publik yang tidak wajib ditolak = 204 ulangan per varian. Rute sama untuk semua varian, jadi selisih hanya dari pencarian/penggabungan, bukan variasi routing antar-run. Holdout tidak dipakai.

Temuan bedah soal gagal:
- Untuk banyak soal, pencarian global atas pertanyaan sudah menemukan halaman gold di peringkat 2–8, tetapi peringkat gabungan RRF jatuh ke 30–54 dan terpangkas anggaran dokumen. Penyebabnya: satu daftar pertanyaan melawan hingga 19 daftar routing, dan paragraf di bagian pilihan routing (sering keliru) muncul di banyak daftar per bagian sekaligus.
- Kueri Arab routing yang dicari global juga kadang satu-satunya penemu gold, jadi bobot tidak boleh menenggelamkan daftar routing global.
- Tiga soal topik tersebar (j018, j019, j021) punya halaman gold yang tidak ditemukan kueri leksikal mana pun (pertanyaan, kueri routing, kueri gold, 50 halaman teratas). Ini batas BM25.

| Varian (rata-rata dari 6 set rute) | Lengkap /34 |
|---|---:|
| Kode S21 (baseline) | 27,0 |
| Pertanyaan global ×2 / ×3 / ×4 | 27,8 / 29,3 / 29,3 |
| Pertanyaan ×3 + kueri routing global ×2 / ×3 | 28,8 / 27,7 |
| Kueri routing global ×2 saja | 25,0 |
| Daftar per bagian ×0,5 / pertanyaan ×2 + bagian ×0,5 | 27,3 / 29,5 |
| RRF k = 20 | 27,2 |
| Jatah tetap 2 teratas per daftar (round robin) | 27,3 |
| Pertanyaan ×3 + jatah 2 teratas daftar global | 29,8 |
| + 3 bagian dari ringkasan AI (pertanyaan saja) | 30,3–30,5 |
| + bagian 3 halaman (bukan 5) | 30,7 |
| Bagian 2 halaman / 4 bagian ringkasan / 6 kueri per bagian (30 pencarian) | 29,2 / 29,8 / 29,5 |
| Kata pembingkai Jawab dibuang (Ihya, takhrij, al-Iraqi, keterangan, riwayat) | +0 |
| **Dipakai (kode akhir)** | **30,5** |

**Keputusan:**
1. **RRF berbobot:** `fuse` memakai `SearchList.weight`; daftar pertanyaan global berbobot `QUESTION_WEIGHT` = 3, daftar lain 1. Jatah round robin tidak dipakai: setelah bobot dan bagian ringkasan, tidak menambah apa pun.
2. **Bagian 3 halaman** (`SECTION_LIMIT` 5 → 3): daftar bagian yang keliru tidak membanjiri gabungan.
3. **Routing kedua tanpa LLM:** `searchSummarySections` (core) / `searchSummaryNodes` (db) mencari `summary_fts` (ringkasan AI bagian, bahasa `id`) dengan pertanyaan: semua kata, lalu sebagian kata. ≤ 3 bagian teratas yang bukan pilihan routing dicari dengan pertanyaan saja (3 halaman), hanya mengisi sisa jatah `MAX_SEARCHES` 20, dan dicari bersamaan dengan pencarian routing (tanpa menunggu). Kosong bila tanpa kata Indonesia atau indeks lama; galat D1 tetap dilempar seperti pencarian lain. Bila rencana routing sudah 20 pencarian (4 bagian + ≥ 3 kueri; 27 dari 204 rute tersimpan), ringkasan tidak dicari. Diagnostik baru `summary_sections`. Rencana pencarian kini fungsi murni (`routePlans`, `summaryPlans`) yang dites tersendiri.
4. **Pertanyaan panjang:** `questionQuery` membuang kata terakhir dari aksara yang meluap sampai lolos batas kata `searchText` (`queryWordOverflow` di core, aturan yang sama dengan validasinya: 16 kata Indonesia sesudah kata fungsi, 32 token Arab). Sebelumnya pertanyaan ±200 karakter (contoh uji: 18 kata isi) ditolak `InvalidQuery`, dan semua daftar pertanyaan hilang diam-diam. Kueri routing juga melewatinya. Soal eval tidak ada yang sepanjang itu, jadi angka eval tidak berubah karena ini.
5. `JAWAB_PIPELINE_VERSION` 3 → 4 (kunci `answer_cache`): jawaban dari kandidat lama tidak disajikan. Arsip eval kini mencatat `prompt_version` `answer@5+answer-route@2+pipeline@4` (format kunci cache), supaya run S21 dan X03 bisa dibedakan dari metadata.

**Hasil gratis (kode akhir):** lengkap 31 31 31 30 30 30 dari 34 (rata-rata 30,5 = 89,7%; baseline 27 27 28 28 27 25, rata-rata 27,0 = 79,4%). Per jenis (rata-rata): lokasi+isi 15,7 → 16,5 dari 17, topik tersebar 1,0 → 3,0 dari 6, status hadits 5,3 → 6,0 dari 6, atribusi 5,0 → 5,0 dari 5. Tidak ada soal yang memburuk; tersisa j018/j019/j021 (0/6, tak terjangkau leksikal), j015 (gagal 2/6, sama dengan baseline), j016 (1/6). **Validasi atas rute yang tidak dipakai merancang:** empat set rute lama (s19-publik-v1–v4, routing atas korpus `ihya-v6`, diulang di `ihya-v7`): baseline 27 29 24 25 → kode akhir 29 31 29 31 (rata-rata 26,25 → 30,0). Token dokumen tetap ±19,9 ribu per soal (anggaran sama), jadi biaya jawaban tidak naik; beban D1 +1 kueri kecil (`summary_fts`, 313 node) per pertanyaan, pencarian tetap ≤ 20.

**Eval publik berbayar (sekali, izin pemilik di chat 2026-10-21 "ya saya izinkan"):** `x03-publik-lokasi-v1` (42 soal publik, tanpa holdout, korpus lokal `ihya-v7`, US$0,1134, rerata **US$0,0027/jawaban**, maks US$0,0051, prompt rata-rata 22,3 ribu token, 0 di atas batas, 0 refusal; laporan `evals/reports/jawab-x03-publik-lokasi-v1.md`):

| Run | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Tanpa pola fatwa | Biaya/jawaban |
|---|---|---|---|---|---|---|
| S19 final-3 / S21 v5 (sebelum) | 100% | 76,5% / 73,5% | 100% (8/8) | 100% / 94,1% | 100% | $0,0026 |
| **X03 (sesudah)** | **100% (156/156)** | **82,4% (28/34)** | 100% (8/8) | **100% (34/34)** | 100% | **$0,0027** |

Per jenis: lokasi+isi 94,1% (16/17), atribusi 100% (5/5), status hadits 100% (6/6, lokasi), topik tersebar 16,7% (1/6). Cakupan gold di dokumen pada rute run ini 31/34 (sama dengan uji gratis): dari 6 soal yang gagal lokasi, **3 gagal di pencarian** (j018, j019, j021: halaman gold tak terjangkau leksikal) dan **3 gagal di tahap jawaban** (j014, j020, j023: semua lokasi gold ada di dokumen, tetapi jawaban hanya menyitasi sebagian; dua di antaranya topik tersebar yang menuntut dua lokasi). Bagian ringkasan terpakai di 38/42 soal. Metrik "Takhrij" 0/7 tetap pencocokan string persis (catatan S18/S19), tidak diubah.

**Tidak dipilih:**
- **Routing dua langkah dengan LLM** (ringkasan bagian kandidat sebagai konteks panggilan routing kedua): ringkasan Ihya ±1.200 karakter (±640 token) per bagian; 10 kandidat = ±6 ribu token tak ter-cache per pertanyaan (±US$0,006), dua sampai tiga kali biaya jawaban sekarang, dan tidak bisa diukur gratis. Ringkasan semua 313 bagian di prefix routing ±200 ribu token, di atas batas. Versi tanpa LLM (butir 3) mengambil manfaat ringkasan tanpa biaya. Uji gratis juga menunjukkan ringkasan menempatkan bagian gold kedua soal topik tersebar di peringkat 22–34 atau tidak sama sekali, jadi panggilan kedua pun belum tentu menolong soal tersulit.
- **Pembersihan kata pembingkai** khusus Jawab: tidak menambah cakupan dan menambah heuristik.
- **Lebih banyak kueri per bagian** (6, jatah 30 pencarian): lebih buruk (29,5) dan beban D1 naik.
- **Saran peninjau, diukur gratis dan tidak dipakai karena hasilnya sama (30,5):** menyaring bagian ringkasan yang merupakan turunan/induk bagian routing; memakai kecocokan sebagian kata ringkasan hanya bila kecocokan semua kata < 3 atau < 5.
- **Pencarian makna:** masih ditunda (ADR-046). Bila lokasi tetap < 90% karena soal topik tersebar yang tak terjangkau leksikal, pencarian makna perlu ADR sendiri (embedding 16 ribu paragraf, Vectorize, biaya batch).

**Konsekuensi:**
- Konstanta dipilih dan diukur di 34 soal publik yang sama, dan eval berbayar juga memakai set itu: kenaikan ini **in-sample**. Holdout tidak disentuh; bukti R4 akhir tetap butuh holdout dan gold yang disetujui (T-24). Mekanismenya umum (bobot, kedalaman, ringkasan), tanpa kata kunci soal, dan validasi atas 4 set rute yang tidak dipakai merancang memberi kenaikan serupa.
- Tiga soal topik tersebar memakai halaman gold yang tidak terjangkau BM25 (j019 dan j021 butuh j1 h55, j018 butuh j1 h13); gold masih draf sampai T-24.
- Target R4 lokasi ≥ 90% **belum tercapai** (82,4%). Sisa kegagalan terbagi dua: batas leksikal (3 soal topik tersebar, butuh pencarian makna atau gold yang ditinjau) dan tahap jawaban yang tidak menyitasi semua lokasi untuk pertanyaan perbandingan (3 soal; bahan sesi prompt berikutnya, mis. instruksi "sitasi tiap bagian yang dibandingkan", dengan eval ulang).

**Tinjau ulang bila:** prompt routing berubah (rute tersimpan tidak lagi mewakili), korpus bertambah kitab (bobot dan jatah per bagian), eval berbayar menunjukkan penolakan keliru naik, atau pencarian makna dipertimbangkan lagi.

## ADR-068 · Tahap jawaban Jawab (X05): dokumen dikelompokkan per bagian (urut kitab), prompt `answer@6`, eval atas rute routing tersimpan (`--rute`) — diterima · 2026-10-21

**Konteks:** Sesudah X03 (ADR-067) lokasi eval publik 82,4% (28/34), target R4 ≥ 90%. Tiga soal gagal (j014, j020, j023) sudah punya semua halaman gold di dokumen jawaban. Prompt `answer@5` sudah memerintahkan "jelaskan masing-masing pembahasan dengan sitasinya" untuk pertanyaan perbandingan. Sesi ini memperbaiki tahap jawaban, bukan pencarian. Holdout tidak dipakai merancang dan tidak dijalankan.

**Bedah gratis** (arsip `x03-publik-lokasi-v1`, dokumen direkonstruksi dengan `jawabCandidates` atas rute tersimpan; jumlah dokumen sama dengan arsip):
- **j014** (bagaimana al-Ghazali membantah bahwa tidak berobat selalu syarat tawakal; gold j4 h290): judul bagian "bantahan terhadap yang berkata meninggalkan pengobatan lebih utama" ada di peringkat 4 (berterjemahan). Tiga paragraf argumennya (bekam, sengatan kalajengking, haus/lapar/dingin, kisah wabah) ada di peringkat 15, 19, 21 tanpa terjemahan. Jawaban menyitasi kesimpulan di h286, h287, dan h292.
- **j020** (puasa lisan ↔ hadirnya hati dalam salat; gold j1 h234 + h160): h234 disitasi. Untuk salat, jawaban menyitasi h161 dan h172 (bagian yang sama atau dekat), lalu menulis kesimpulan "lisan yang membaca tanpa hati yang hadir kurang bermakna" **tanpa sitasi**, padahal itu isi paragraf h160 (peringkat 7, berterjemahan).
- **j023** (rida ↔ pengobatan; gold j4 h351 + h290): h351 disitasi. Halaman h290 hanya terwakili oleh judul bagian dan paragraf akhir bagian sebelumnya. Paragraf sumber gold (10017924) tidak masuk dokumen. Jawaban menyitasi h292, yang berada di bagian yang sama dan menyatakan hal serupa.
- Seluruh run: 16% dokumen berterjemahan (12 teratas) disitasi vs 6% dokumen tanpa terjemahan, sebagian karena peringkatnya memang lebih tinggi. Dokumen dikirim urut RRF, jadi paragraf satu bagian tercecer di antara bagian lain.

**Keputusan:**
1. **Urutan dokumen** (`orderBySection`, `answer.ts`, dipanggil di `jawabCandidates` sesudah `fitDocs`): dokumen dikelompokkan per bagian daftar isi, dan kelompok diurutkan menurut dokumen berperingkat tertinggi di dalamnya. Di dalam kelompok, dokumen diurutkan menurut urutan kitab: juz, halaman, badan sebelum catatan kaki, lalu `ord`. ID tidak dipakai (ADR-029 butir 2), dan `ord` ditambahkan ke `AnswerPassage`. Catatan kaki ikut kelompok paragraf badan pertama yang merujuknya bila paragraf itu ada di dokumen. Paragraf tanpa bagian dikelompokkan per halaman. Himpunan dokumen, anggaran token, dan terjemahan 12 teratas (dipilih menurut peringkat) tidak berubah. `JAWAB_PIPELINE_VERSION` 4 → 5 (kunci `answer_cache` berganti).
2. **Prompt `answer@6`**, perubahan minimal dari v5:
   - urutan dokumen dijelaskan: dokumen yang berurutan belum tentu bersambung, jadi model diminta memperhatikan halaman;
   - dokumen tanpa terjemahan sama layaknya dibaca dan disitasi;
   - model diminta menyitasi paragraf yang paling langsung memuat hal yang ditanyakan, dan untuk pertanyaan "bagaimana berargumen/membantah/menjelaskan", paragraf argumennya sendiri, bukan hanya kesimpulan;
   - dalam kesimpulan perbandingan, isi kitab yang disebut ulang atau ditambahkan wajib bersitasi.

   Kalimat baku penolakan dan status hadits tidak berubah. Semua instruksi berlaku umum, tanpa kata kunci soal (soal publik dipakai merancang).
3. **Eval atas rute tersimpan:**
   - `eval:jawab answer --rute <diagnostik.jsonl>` memakai ulang rute routing arsip publik tanpa panggilan routing (`JawabDeps.savedRoute`, hanya eval; Worker menyusun deps sendiri tanpa field ini). Dokumen per soal sama persis dengan run asal: dicek gratis, 42/42 identik dalam jumlah dokumen, token, daftar, dan kandidat. Jadi selisih hasil hanya berasal dari tahap jawaban, bukan dari variasi routing antar-run (±3 soal, ADR-064).
   - Rute dibersihkan dengan `normalizeRoute`, yang sama dengan keluaran routing.
   - `savedRoutesFor` menolak soal privat, soal tanpa baris rute, dan baris yang routing-nya gagal karena galat penyedia. Runner menolak soal tanpa rute sebelum panggilan pertama.
   - Arsip diberi akhiran `prompt_version` `+rute-tersimpan`, dan laporannya menyatakan bahwa biaya dan latensi tidak memuat routing.

**Eval berbayar** (izin pemilik di chat: "Ya, saya izinkan" untuk satu eval publik; sesudah hasilnya, "Cek kecil dulu" untuk mengulang 8 soal jebakan; korpus lokal `ihya-v7`, rute dari `x03-publik-lokasi-v1`, tanpa holdout):

| Run | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Tanpa pola fatwa | Biaya/jawaban |
|---|---|---|---|---|---|---|
| X03 `x03-publik-lokasi-v1` (sebelum, `answer@5`, `pipeline@4`) | 100% (156/156) | 82,4% (28/34) | 100% (8/8) | 100% (34/34) | 100% | $0,0027 (dengan routing) |
| **X05 `x05-publik-jawaban-v1`** (`answer@6`, `pipeline@5`, 42 soal) | **100% (176/176)** | **85,3% (29/34)** | 87,5% (7/8) | 100% (34/34) | 100% | $0,00257 tanpa routing (total $0,1078) |
| X05 `x05-publik-tolak-v1` (ulang 8 soal jebakan) | 100% (18/18) | — | **100% (8/8)** | — | 100% | $0,0020 tanpa routing (total $0,0162) |

- **Per soal:**
  - j014 dan j020 kini benar. j014 menyitasi paragraf argumen di h290 (bekam, sengatan, haus/lapar/dingin, kisah wabah), bukan hanya kesimpulan. j020 menyitasi h160 untuk argumen bahwa gerak lisan tanpa hadirnya hati bukan amal, tetapi kalimat penghubungnya merujuk paragraf kitab Taubat (j4 h46) sambil menyebut bahwa paragraf itu di luar kedua bab.
  - j023 tetap gagal: h351 disitasi, tetapi untuk pengobatan jawaban tetap menyitasi h292 (sama bagian, isi serupa), karena paragraf sumber gold di h290 tidak ada di dokumen.
  - **j024** (status hadits) 1 → 0, tetapi bukan kemunduran tahap jawaban. Takhrij gold (10000010) beserta paragraf haditsnya tidak ada di dokumen pada kedua run. X03 "lolos" karena menyitasi takhrij hadits lain yang kebetulan berada di halaman yang sama (j1 h2). Kedua jawaban menyatakan dengan benar bahwa takhrij hadits yang ditanyakan tidak ada di dokumen.
  - **j033** (di luar cakupan) pada run utama tidak diawali kalimat penolakan baku dan tanpa sitasi, sehingga turun ke Cari (`fallback/unverified`, aman, tanpa klaim). Pada ulangan, 8/8 ditolak tepat, termasuk j033. Gabungan kedua run dengan `answer@6`: 15/16. Teks mentah model untuk hasil fallback tidak diarsipkan, jadi penyebabnya tidak bisa dibedah.
- **Per jenis** (run utama): lokasi+isi 16/17 → 17/17, topik tersebar 1/6 → 2/6, status hadits 6/6 → 5/6 (j024), atribusi 5/5. Sitasi 193 → 210, 0 dibuang, 0 refusal.
- **Biaya:** jawaban saja $0,00257 per soal. Routing tidak dipanggil. Dari selisih cache read X03 (±11,3 ribu token per soal) dan ADR-064 (±$0,0002 per routing dengan cache terbaca, ditambah satu tulis cache per run), biaya routing ±$0,0002–0,0003. Perkiraan pipeline penuh **±$0,0028 per jawaban**, sedikit di atas X03 ($0,0027). Keluaran rata-rata ±1.170 token per soal untuk jawaban saja, sedangkan X03 ±1.090 token untuk routing dan jawaban bersama: jawaban v6 lebih panjang, dengan lebih banyak sitasi. Biaya API sesi: **$0,1239**.

**Ditolak / tidak dipilih:**
- **Prompt saja tanpa mengubah urutan:** instruksi perbandingan sudah ada di v5, dan kegagalannya adalah memilih halaman di dalam bagian yang benar dari paragraf yang tercecer.
- **Terjemahan untuk lebih banyak dokumen:** menambah token Latin dan memakan anggaran dokumen, dan tidak bisa diukur gratis.
- **Melonggarkan metrik lokasi ke tingkat bagian, atau mengubah gold:** di luar cakupan. Gold masih draf sampai T-24.
- **Entri khusus eval terpisah untuk `savedRoute`:** ditunda. Risikonya kecil: field opsional di `JawabDeps` yang diekspor, dan Worker tidak pernah mengisinya (dijaga tes Worker, yang tidak memakai field itu).
- **Eval pipeline penuh (dengan routing):** angkanya tercampur variasi routing ±3 soal, jadi tidak bisa menunjukkan efek tahap jawaban dengan satu run.

**Konsekuensi:**
- Kenaikan ini **in-sample**: aturan dirancang dari j014/j020/j023 dan diukur pada 42 soal publik yang sama. Efek urutan dokumen dan efek prompt tidak bisa dipisahkan, karena keduanya berubah dalam satu run. Dokumen sama dengan X03, tetapi jawaban tetap mengandung variasi sampling (j033 menunjukkan variasi tingkat 1/8). Bukti R4 tetap butuh holdout dan gold yang disetujui (T-24).
- Target R4 lokasi ≥ 90% **belum tercapai** (85,3%). Sisa kegagalan: 3 soal topik tersebar yang tak terjangkau pencarian kata (j018, j019, j021), j023 (paragraf sumber gold di luar dokumen; halaman lain di bagian yang sama disitasi), dan j024 (takhrij gold di luar dokumen).
- Metrik cakupan gratis X03 ("lokasi gold ada di dokumen", tingkat halaman) melebihkan j024. Untuk soal status hadits, cakupan sebaiknya memeriksa catatan kaki gold, bukan halamannya.
- Bila bedah berikutnya butuh peringkat dokumen, pakai urutan `withPairs(ranked)`, bukan indeks `found.docs`: sejak `pipeline@5`, urutan dokumen bukan lagi peringkat.

**Tinjau ulang bila:** holdout dijalankan; gold ditinjau (T-24); judge dikalibrasi; penolakan baku gagal lagi pada eval berikutnya (simpan teks mentah fallback untuk soal publik); atau anggaran dokumen/terjemahan berubah.

## ADR-069 · Status hadits dari label istilah takhrij (X06): pengenal frasa baku deterministik, label kode per catatan kaki, klaim dari struktur catatan kaki, tanda kelemahan dari label yang sama, metrik "Takhrij" berbasis label — diterima · 2026-10-21

**Konteks:** Syarat R4 "status hadits benar 100% (untuk hadits yang punya takhrij)" belum terbukti. Sejak S21 (ADR-066) status ditulis model sebagai kalimat bebas "Status hadits: …" yang hanya tampil bila kalimat itu sendiri menyitasi takhrij; isinya tetap tulisan model, dan metrik eval mencocokkan string status gold secara persis (selalu 0). Review ustadz (Anas, T-24) belum bisa diminta dalam waktu dekat, jadi labelnya harus deterministik, bisa diaudit, dan mudah ditinjau nanti. Ihya punya 4.398 catatan kaki takhrij al-'Iraqi.

**Keputusan:**
1. **Pengenal istilah** `takhrijTerms` (`packages/text/src/takhrij-terms.ts`, versi aturan `TAKHRIJ_TERMS_VERSION` 1): mencocokkan frasa baku per kata atas bentuk `normalizeArabic` (satu fungsi normalisasi), dengan rentang mentah tiap istilah (`toRawSpan`). Kosakata: muttafaq 'alaih (متفق عليه، أخرجاه، في الصحيحين), riwayat al-Bukhari/Muslim, sahih, hasan, hasan sahih, jayyid, la ba'sa bihi, gharib, lemah (ضعيف، بإسناد ضعيف، وضعفه، ليس بالقوي، فيه نظر، معضل، مجهول …), sangat lemah (منكر، متروك، واه، كذاب …), palsu/batil, disebut di kitab perawi lemah (في الضعفاء), tidak ada asalnya, tidak ditemukan penakhrij (لم أجده، لم أقف، لم أظفر له بإسناد، ولم أره مرفوعا …), mursal, mauquf, mu'allaq, sebagian lafaz (دون قوله), rujukan ke takhrij di tempat lain (تقدم، سيأتي في …). **Bagian sebelum penanda takhrij pertama (lafaz hadits "حديث …") tidak dipindai**, supaya "ما تقدم من ذنبه", "حسن الخلق", "كل شيء باطل" di lafaz tidak terbaca sebagai istilah. Pengecualian: kata sifat bersandang sesudah حسن/صحيح/غريب, nama kitab/orang (صحيح مسلم، في صحيحه، الحسن، مسلم بن، أبو مسلم), al-Bukhari/Muslim yang bukan penyebutan riwayat (على شرط مسلم = penilaian al-Hakim, ولم يخرجه البخاري، وضعفه البخاري، قال البخاري), "وأصله في الصحيحين" (hanya asalnya), negasi (ليس/غير/فليس), "حسنة" ("سنة حسنة") ≠ وحسنه, "فاعله" ≠ ف + أعله, "لا يعرف إلا …", "منكر ونكير", rujukan "تقدم" tanpa ف dan "سيأتي في …" saja ("سيأتي على الناس" = lafaz). Kata kerja penilaian boleh diikuti nama penilai ("وصححه الترمذي"). Pola diindeks per bentuk kata pertama. Ini indeks istilah yang tertulis, bukan penilaian Surau.
2. **Label** `takhrijLabel` (`packages/core/src/takhrij-label.ts`): arti baku tetap per istilah (`TAKHRIJ_TERM_GLOSS`), teks status Latin ≤ 120 karakter dibuat kode ("takhrij menyebut: mauquf; lemah; tidak ditemukan penakhrij"; muttafaq menyerap al-Bukhari/Muslim; rujukan hanya disebut bila sendirian; "(berbeda per jalur)" bila ada istilah positif dan negatif sekaligus), jenis `terms`/`sources_only`/`refers_back`/`not_takhrij`, `weak`, dan istilah beserta rentangnya.
3. **Pipeline (`pipeline@6`):** klaim status `hadith[]` dibuat **dari struktur**, bukan dari kalimat: setiap catatan kaki takhrij yang disitasi jawaban akhir mendapat satu klaim berlabel, dipasangkan ke paragraf badan yang penandanya merujuk catatan kaki itu (`takhrijClaims`). Klaim tidak pernah dipasangkan ke paragraf hadits lain. Label dihitung dari **bagian catatan kaki yang disitasi** (biasanya seluruhnya), supaya setiap istilah yang disebut punya frasa Arab di potongan yang ditampilkan. Catatan kaki yang bukan takhrij (catatan penyunting, teks tak dikenali) tidak menjadi klaim dan tidak mendukung kalimat status. Di teks jawaban, kalimat "Status hadits:" yang menyitasi takhrij sendiri **diganti teks label + lokasi haditsnya** ("takhrij menyebut: lemah (hadits di Ihya j. 1, h. 2)"), dengan sitasi takhrijnya dan sitasi paragraf hadits itu bila ada di kalimat yang sama; kalimat penilaian lanjutan untuk takhrij yang sama dalam satu kelompok dibuang; kalimat tanpa takhrij sendiri tetap diganti pemberitahuan S21. Klaim `hadith[]`: `label: "rule_extracted"`, `rules_version`, `mixed`, `terms`. Diagnostik baru `hadith_labeled` (juga di log Worker). Prompt jawaban tidak diubah. Batas klaim di arsip eval 5 → 20 (`evalAnswer.hadith`), karena kini setiap takhrij yang disitasi berklaim. UI menerima bentuk lama (`ai_extracted`, tanpa `terms`) dari API sebelum X06 (Preview memanggil staging versi `main`).
4. **Tanda "memuat istilah kelemahan"** di kartu kutipan kini `takhrijLabel(...).weak`, dari istilah yang sama dengan label; `takhrijHasWeakTerms` (S21) dihapus supaya hanya ada satu aturan. Banding di korpus: 1.324 catatan kaki ditandai keduanya, 26 hanya oleh pendeteksi lama (hampir semua istilah di lafaz: syair Labid "باطل", "كل ضعيف مستضعف", "الإمام الكذاب", "منكر … نكير", "تضعيف الحسنة", "وليس بمنقطع"), 32 hanya oleh label (mis. "ليس إسناده بذاك", "معضل", "فيه نظر").
5. **UI Tanya:** status = teks label + chip "dikenali otomatis dari teks takhrij, belum ditinjau"; daftar istilah dengan **frasa Arab disalin dari teks takhrij DB lewat rentangnya** + arti baku; catatan bila penilaian berbeda per jalur. Aturan `.claude/rules/teks-arab.md` no. 6 ditambah status `rule_extracted`.
6. **Metrik eval "Takhrij":** lolos bila takhrij gold disitasi (rentang persis) dan klaimnya untuk paragraf gold berstatus label takhrij gold itu. Karena status klaim dihitung kode dari teks yang sama, pencocokan status pasti sama; jadi metrik ini sekarang mengukur **"takhrij yang tepat disitasi dan dipasangkan ke hadits yang tepat"**, sedangkan **kebenaran label** (inti R4) bertumpu pada perbandingan manual dengan gold (6/6, di bawah), sampel agent, tes regresi DB lokal untuk enam takhrij gold (`packages/core/test/local/takhrij-label.test.ts`), dan nanti tinjauan ustadz. Angka "sebelum" (0/6, pencocokan string bebas) dan "sesudah" memakai definisi berbeda; keduanya dicatat apa adanya. **Klaim untuk takhrij di luar gold tidak lagi dihitung gagal** (dilaporkan terpisah di laporan eval, `hadithExtra`), karena kini label kode yang dipasangkan ke haditsnya sendiri, bukan klaim bebas tak didukung (alasan hukuman S18). Penyimpangan dari metrik S18 ini disengaja dan dicatat di sini.
7. **Alat gratis:** `pnpm run eval:takhrij` → `data/reports/ihya-9472-takhrij-label.md` (angka saja, tanpa teks kitab); `pnpm run eval:jawab hadits --run <arsip>` mengulang `hadithCheck` versi sekarang atas blok akhir arsip run publik (tanpa LLM) dan menilainya dengan metrik yang sama.
8. **Tanpa batch AI.** Brief sesi menyiapkan batch AI untuk catatan kaki yang tidak terlabel deterministik; tidak diperlukan: catatan kaki yang tidak dikenali (196, 4,5%) hampir semuanya bukan takhrij (matan yang tercetak sebagai catatan kaki, catatan kosong) dan diberi teks jujur "catatan kaki ini tidak memuat istilah takhrij yang dikenali". Biaya US$0.

**Ukuran (ihya-v7, aturan versi 1, `data/reports/ihya-9472-takhrij-label.md`):** dikenali sebagai takhrij 4.201/4.398 (95,5%): memuat istilah 3.376 (76,8%), hanya sumber 358 (8,1%), hanya rujukan 467 (10,6%); bukan takhrij 197 (4,5%); berbeda per jalur 253 (5,8%); bertanda kelemahan 1.368 (31,1%). Ketepatan (diperiksa agent sendiri, jadi bisa bias; tinjauan ustadz menyusul): sampel acak 70 catatan kaki sebelum perbaikan aturan → 2 istilah keliru dari lafaz ("ما تقدم من ذنبه", "حسن الخلق"), keduanya diperbaiki; sampel acak baru 50 → **0 istilah keliru**, 3 istilah eksplisit terlewat (لا بأس به، معضل، فيه نظر، بغير إسناد; ditambahkan), 3 kritik perawi tersirat tanpa istilah ("وفيه ابن لهيعة") sengaja tidak ditebak. Enam takhrij gold publik: semua label sesuai kategori status gold (j024/j027 lemah; j025 lemah; j026 muttafaq 'alaih + sebagian lafaz; j028 mauquf + lemah + tidak ditemukan; j029 mu'allaq + tidak ditemukan).

**Ulang gratis atas arsip run nyata** (`eval:jawab hadits`): metrik Takhrij 0/6 → **5/6** (X05 dan X03) dan 0/6 → 4/6 (S21 v5); semua yang gagal karena takhrij gold tidak masuk jawaban (masalah lokasi, ADR-068). Tidak ada jawaban yang menjadi tidak stabil (`unresolved` 0); klaim untuk takhrij di luar gold: 4 (X05), 10 (X03), 7 (S21 v5). Pola yang terlihat di X05: model menaruh penilaian di kalimat bebas yang menyitasi takhrij, sedangkan baris "Status hadits:" tanpa sitasi; karena itu klaim dibuat dari struktur, bukan dari baris status.

**Eval publik berbayar (sekali, izin pemilik di chat 2026-10-21 "ya jalankan"):** `x06-publik-takhrij-v1` (42 soal publik, tanpa holdout, korpus lokal `ihya-v7`, rute dari `x05-publik-jawaban-v1` lewat `--rute` sehingga dokumen sama dengan X05; US$0,1092, rerata US$0,0026/jawaban tanpa routing; laporan `evals/reports/jawab-x06-publik-takhrij-v1.md`):

| Run | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |
|---|---|---|---|---|---|---|
| X05 `x05-publik-jawaban-v1` (`pipeline@5`, status tulisan model) | 100% (176/176) | 85,3% (29/34) | 87,5% (7/8) | 100% | 0% (0/6, pencocokan string) | 100% |
| **X06 `x06-publik-takhrij-v1`** (`pipeline@6`, label kode) | **100% (166/166)** | **85,3% (29/34)** | **100% (8/8)** | **100% (34/34)** | **83,3% (5/6)** | **100%** |

Yang gagal (j024): takhrij gold tidak masuk jawaban (lokasi, ADR-068), bukan label keliru. Klaim untuk takhrij di luar gold: 3. Pada kelima soal yang lolos, model kembali menaruh sitasi takhrij di kalimat penilaian bebas dan menulis baris "Status hadits:" tanpa sitasi, sehingga baris itu diganti pemberitahuan sementara klaim struktur menampilkan label. **Sesudah eval**, teks pemberitahuan netral `HADITH_NOT_CITED` diubah dari "tidak ditampilkan (takhrij … tidak dapat dipastikan)" menjadi "tidak dipastikan untuk kalimat ini; status tiap takhrij yang dikutip ada di bagian "Status hadits" beserta lokasi haditsnya" (dan menjadi "belum diketahui" bila tidak ada klaim sama sekali), supaya teks jawaban tidak terkesan bertentangan dengan bagian status. Kalimatnya sengaja tidak mengaitkan takhrij mana pun dengan kalimat itu: versi antara "lihat bagian Status hadits di bawah" ditolak peninjau karena pada jawaban dua hadits bisa menunjuk label hadits lain (celah "meminjam" S21). Ini hanya pascaproses teks; diverifikasi gratis dengan `eval:jawab hadits --run x06-publik-takhrij-v1`: Takhrij tetap 5/6, 0 tidak stabil, 5 jawaban berubah teks pemberitahuannya saja. UI kini juga menampilkan lokasi tiap takhrij di bagian status.

**Tidak dipilih:**
- **Batch AI untuk label**: tidak perlu (butir 8), dan label AI tetap butuh tinjauan per butir.
- **Memasangkan baris status tanpa sitasi ke satu-satunya takhrij yang disitasi**: celah "meminjam" takhrij hadits lain (peninjau S21) tetap ada; klaim struktural menyelesaikannya tanpa menebak.
- **Mengubah prompt** agar model tidak menulis penilaian: tidak perlu untuk label yang benar; kalimat penilaian bebas yang bersitasi tetap klaim biasa (dinilai judge).

**Konsekuensi:**
- Status di `hadith[]` dan di baris "Status hadits:" yang bersitasi takhrij tidak pernah tulisan model, dan selalu menunjuk frasa Arab aslinya; ketepatannya bergantung pada aturan versi 1 dan belum ditinjau ustadz. Penilaian tersirat (perawi lemah tanpa istilah) tidak dikenali; catatan kaki campuran ditandai "berbeda per jalur", bukan dipilah per jalur.
- Kalimat penilaian bebas model yang menyitasi takhrij masih tampil sebagai klaim biasa (bisa melenceng dari label); pertimbangkan prompt yang menyerahkan status sepenuhnya ke label bila judge menemukan selisih.
- Tindak lanjut: antrean tinjauan label di `/tinjau` (Anas cukup menyetujui/mengoreksi label per catatan kaki, terikat `rules_version`), dan label di tool MCP `get_hadith_takhrij`.

**Tinjau ulang bila:** ustadz meninjau label; aturan istilah berubah (naikkan `TAKHRIJ_TERMS_VERSION`); kitab baru dengan penakhrij lain; atau eval menunjukkan label bertentangan dengan gold.

## ADR-070 · Tinjauan label status hadits (X07): tabel `takhrij_review` di DB app terikat sidik label + versi aturan, antrean `/tinjau/takhrij`, label tertinjau dipakai Jawab hanya dari akun + nama ustadz peninjau terdaftar — diterima · 2026-10-21

**Konteks:** ADR-069 membuat status hadits dari label kode atas istilah di teks takhrij (`rule_extracted`). R4 butuh tinjauan ustadz (Anas, T-24); membaca jawaban satu per satu berat dan tidak berulang-pakai. Satu keputusan per catatan kaki takhrij berlaku untuk setiap jawaban yang mengutipnya. Akses penilai sudah ada (`/tinjau`, Access `Surau Tinjau` + verifikasi JWT, ADR-052), tetapi akun Access yang sama juga dipakai uji (ulasan "Agent QA" sudah ada di produksi).

**Keputusan:**
1. **Penyimpanan:** tabel `takhrij_review` di DB app (`surau-app`, migrasi 0005), bukan korpus blue-green; catatan kaki dirujuk `passage_id` stabil. Kunci (catatan kaki, `rules_version`, penilai = hash issuer+subjek Access); penilai yang sama memperbarui barisnya. Kolom: `label_hash` (SHA-256 label kode utuh yang dilihat penilai: versi, jenis label, teks status, istilah + rentang + arti baku; arti atau kalimat yang berubah tanpa naik versi juga membatalkan tinjauan), `decision` `approved`/`corrected`/`unsure`, `kinds_json` (kode jenis istilah, hanya koreksi), `note`, `reviewer_name`, `corpus_version`, `updated_at`. **Penilai tidak pernah menulis teks Arab** (nama dan catatan ditolak bila memuat huruf Arab). Tanpa kedaluwarsa: ini anotasi korpus, bukan data pengguna (nama penilai = nama yang ia isi sendiri).
2. **Kapan berlaku** (`effectiveTakhrijReview`, core): versi aturan dan `label_hash` sama dengan label sekarang (teks atau aturan berubah = kembali ke antrean "belum ditinjau", keputusan lama tetap terlihat sebagai "untuk label lama"); penilai adalah **ustadz peninjau terdaftar**: kunci akun Access-nya ada di var Worker `TAKHRIJ_USTADZ_KEYS` (web dan api) DAN namanya di `TAKHRIJ_USTADZ_REVIEWERS` (Anas, T-13). Nama saja bisa diketik siapa pun yang punya akses (akun yang sama dipakai uji), jadi kunci didaftarkan agent lewat PR setelah pemilik memastikan baris pertama Anas (kunci kosong = tinjauan tersimpan tetapi belum dipakai; halaman memberi tahu akun yang belum terdaftar). Sama dengan prinsip kalibrasi S18: tidak setiap pengguna Access dianggap ustadz; ada yang ragu atau penilai berbeda jenis istilah = tidak ada yang berlaku (tidak memilih satu penilai). Koreksi yang sama dengan deteksi dihitung setuju.
3. **Label tertinjau** (`reviewedTakhrijLabel`): setuju = label kode utuh berstatus "ditinjau ustadz"; koreksi = istilah terdeteksi yang tidak dipilih dibuang (frasa yang tersisa tetap rentang DB); jenis yang ditambah penilai tanpa frasa baku **tidak pernah disebut sebagai isi takhrij**: teks status menyebutnya terpisah ("takhrij menyebut: mauquf; menurut peninjau: mursal") dan kartu menampilkannya sebagai arti Latin saja ("ditetapkan peninjau"). Teks status dan `mixed`/`weak` disusun kode dengan aturan yang sama dengan label otomatis (`takhrijStatus`, diekstrak dari `takhrijLabel`; keluaran label otomatis identik atas 13.194 kombinasi catatan kaki × rentang `ihya-v7`). Sitasi sebagian: tinjauan diterapkan pada istilah di bagian itu, jadi istilah yang ditolak penilai **tidak pernah muncul lagi** (catatan kaki >600 karakter memang dikutip per bagian).
4. **Jawab (`pipeline@7`):** `runJawab` memuat tinjauan untuk catatan kaki yang dikutip lewat dependensi `takhrijReviews` (pemuat + kunci ustadz; Worker `surau-api` membaca DB app; eval dan tes tanpa tinjauan); galat pemuatan = label kode (`takhrij_reviews_error`). Klaim `hadith[].label` = `rule_extracted` | `ustadz_reviewed` | `ustadz_corrected` + `added_terms`; baris "Status hadits:" bersitasi memakai teks label tertinjau. **Cache:** hasil `answer_cache` tidak disajikan bila tinjauan (oleh penilai terdaftar) salah satu takhrij yang diklaimnya berubah sesudah `created_at` − 5 dtk (selisih jam antar-Worker; `created_at` sekarang waktu permintaan), lalu pipeline dijalankan ulang (biaya satu jawaban; log `jawab_cache_stale`, galat cek = basi + log `jawab_review_check_error`). Daftar kunci ustadz ikut kunci cache, jadi mendaftarkan peninjau langsung berlaku. Tanda "memuat istilah kelemahan" di `/api/kutipan` ikut label tertinjau (cache HTTP 5 menit).
5. **Antrean `/tinjau/takhrij` + `/api/review/takhrij`** (turunan jalur Access yang sama; JWT diverifikasi di aplikasi; POST Origin persis, body ≤6 KB, skema ketat; simpan ditolak 409 bila label sudah berbeda dari yang dilihat): label semua catatan kaki dihitung sekali per isolate per versi korpus (4.201 takhrij Ihya); urutan = paling sering dikutip Jawab (`answer_log` eval **publik** saja — soal privat/holdout tidak boleh menggerakkan perbaikan — tanpa contoh `agent-draft`, + `answer_cache` × sajian) → berbeda per jalur → urutan kitab; filter belum/ragu/sudah per penilai. Teks takhrij dari DB dengan istilah disorot lewat rentangnya + arti baku, label yang dipakai Jawab sekarang, keputusan penilai lain. Formulir: nama, setuju/koreksi/ragu, jenis istilah (kotak centang, pratinjau teks label hasil koreksi), catatan internal (tidak tampil di Jawab).
6. **UI Tanya:** chip "ditinjau ustadz"/"dikoreksi ustadz"; jenis tambahan penilai tampil tanpa teks Arab. Aturan `.claude/rules/teks-arab.md` no. 6 dan docs/05 diperbarui.

**Peninjau (PR #108 lalu PR lanjutan):** 0 blocker, 5 penting (nama saja sebagai gerbang, jenis tambahan terbaca sebagai isi takhrij, istilah yang ditolak muncul lagi di sitasi sebagian, sidik tanpa arti/teks, holdout ikut prioritas) dan 5 kecil, semua ditutup di PR lanjutan; termasuk satu karakter kontrol arah teks (U+202E) yang tertulis literal di tes dan diganti escape.

**Verifikasi:** tes D1 workerd (repo, CHECK SQL, hitungan kutipan), core (sidik, keputusan efektif, label koreksi, sitasi sebagian), pipeline (klaim + baris status), Worker `surau-api` (label tertinjau dipakai; cache dipakai bila tinjauan tetap, dijalankan ulang bila berubah; Agent QA tidak dipakai), web (antrean, route, kutipan `weak`, tampilan Tanya). Pratinjau komponen antrean di browser lokal dengan catatan kaki Ihya nyata (desktop, ponsel 375 px tanpa gulir samping, mode gelap). `pnpm verify` lolos. Biaya US$0.

**Tidak dipilih:**
- **Tabel di korpus / patch ingest:** tinjauan manusia tidak boleh ikut blue-green (ADR-029/052); ekspor ke patch korpus bisa menyusul bila label perlu dibekukan.
- **Overlay label saat menyajikan cache tanpa menjalankan ulang:** teks baris status dibuat dari label di dalam blok; menulis ulang blok sesudahnya rapuh. Biaya jalankan ulang kecil dan hanya sekali per perubahan tinjauan.
- **Semua pengguna Access dianggap ustadz, atau nama saja:** akun yang sama dipakai uji dan nama diketik sendiri; label publik "ditinjau ustadz" harus dari akun terdaftar + nama yang ditunjuk pemilik.
- **Daftar peninjau di `/admin` (sakelar pemilik):** lebih mandiri bagi pemilik, tetapi butuh UI + API admin baru; var Worker lewat PR cukup untuk satu peninjau. Tinjau ulang bila peninjau bertambah.
- **Penilai memilih rentang frasa untuk jenis tambahan:** UI pemilihan teks Arab lebih rumit; jenis tambahan cukup tampil tanpa Arab.

**Konsekuensi:**
- Prioritas "paling sering dikutip" di produksi baru bermakna setelah Jawab menyala (cache) atau arsip eval dimuat ke `answer_log` (perlu aba-aba pemilik karena menambah antrean jawaban Anas); sebelum itu urutannya berbeda per jalur dulu, lalu urutan kitab.
- Jaminan identitas = akun Access terdaftar (kunci) + nama yang ditunjuk; satu langkah tambahan sesudah keputusan pertama Anas (agent membaca kunci dari DB app produksi, pemilik memastikan, PR). Menambah peninjau = PR + ADR.
- Koreksi berlaku per jenis istilah, bukan per rentang: satu jenis yang muncul di lafaz dan di penilaian sekaligus dipilih atau dibuang bersama (dicatat di panduan).
- Kenaikan `TAKHRIJ_TERMS_VERSION` membuat semua tinjauan tidak berlaku sampai ditinjau ulang; skrip pemindahan untuk label yang tidak berubah menyusul bila perlu.

**Tinjau ulang bila:** peninjau bertambah atau akses Access diperluas; aturan istilah naik versi; label perlu dibekukan ke korpus; atau tool MCP `get_hadith_takhrij` menampilkan label.

## ADR-071 · Nama agent AI Surau: **Maknaz** (pengganti "Tanya" di tampilan) — diterima · 2026-10-21

**Konteks:** Pemilik menamai agent AI Surau "Maknaz" (chat 2026-10-21: "ubah nama Tanya ke Maknaz ini nama Agent surau AI"). Sebelumnya fitur tanya-jawab tampil sebagai "Tanya" (menu, judul, pesan) dan "Jawab" di halaman pemilik/peninjau.

**Keputusan:**
1. Semua teks yang tampil ke pengguna, pemilik, dan peninjau memakai **Maknaz**: menu sidebar, judul halaman, tombol "Tanya Maknaz", pesan galat/keadaan, beranda (peta jalan), `/privasi`, `/transparansi`, `/admin`, `/tinjau` dan `/tinjau/takhrij`.
2. **Alamat tetap `/tanya`** ("tanya" tetap wajar sebagai kata kerja di alamat; belum dirilis sehingga bisa dipindah ke `/maknaz` kapan saja lewat PR + pengalihan bila pemilik mau).
3. **Nama internal kode tidak berubah:** pipeline `packages/llm/src/jawab`, Worker `surau-api` rute `/jawab`, `/api/jawab`, `JAWAB_*`, metrik dan eval `eval:jawab`. Dokumen implementasi lama tetap menyebut "Jawab"/"Tanya" sebagai nama fitur historis.

**Konsekuensi:** e2e dan tes komponen mengikuti teks baru. Dokumen produk (docs/) memakai nama baru saat bagian terkait berikutnya disentuh.

**Tinjau ulang bila:** pemilik ingin alamat `/maknaz`, atau nama dipakai juga di MCP/server (instruksi server, nama tool).

## ADR-072 · Orb tahap di halaman Tanya: satu orb titik yang berganti bentuk per tahap Jawab, komponen kanvas sendiri (bukan paket `thinking-orbs`) — diterima · 2026-10-21

**Konteks:** saat Jawab berjalan, halaman Tanya hanya menampilkan spinner HeroUI di samping teks tahap. Pemilik meminta indikator "thinking orb" ala [thinking-orbs](https://libraries.dev/orbs) (Jakub Antalik, MIT), dengan desain yang sesuai Surau, dan memilih **satu orb yang berganti bentuk per tahap** dari lima konsep yang diusulkan.

**Keputusan:**
1. Lima bentuk titik, satu per tahap (`STAGE_SHAPE`, `apps/web/src/components/tanya/orb-frames.ts`): `route` = **Sathr** (garis pindai menyapu baris titik dari kanan ke kiri, arah baca Arab; satu baris tetap menyala = bagian terpilih), `retrieve` = **Himpun** (titik berserakan berkumpul jadi blok paragraf), `answer` = **Khatam** (lingkaran → bintang delapan girih/rub' al-hizb, "ujung pena" berjalan, titik emas di pusat), `retry` = **Anyam** (dua helai menganyam = model lain), `verify` = **Untai** (butir diperiksa satu per satu, yang sudah diperiksa menjadi emas). Peralihan antartahap memakai crossfade 0,45 detik dengan skala; bila tahap berganti lagi di tengah peralihan, bentuk lama memudar dari opasitasnya saat itu. Waktu animasi tiap bentuk dihitung sejak tahapnya mulai, jadi Untai selalu mulai dari nol butir emas (bingkai diamnya juga paling banyak satu butir emas).
2. Warna hanya dari tema: tinta `--foreground`, satu aksen Zaitun `--accent` pada bagian yang "hidup", dan `--ornament-gold` hanya untuk "sudah diperiksa" serta pusat khatam. Warna dibaca ulang saat kelas tema di `<html>` berubah (terang, gelap, sepia). Tanpa wajah, sosok, bulan sabit, atau Ka'bah (`.claude/rules/teks-arab.md`, bagian Tampilan).
3. **Komponen sendiri** `TanyaOrb` (kanvas 2D, 44 px di baris tahap) dengan pola dari thinking-orbs: berhenti saat tidak terlihat (IntersectionObserver, tab tersembunyi), satu bingkai diam saat `prefers-reduced-motion` (diikuti langsung bila setelan berubah), dan DPR dibatasi 2. Tahap SSE yang tidak dikenal web diabaikan `parseSseFrame` (tahap sebelumnya tetap tampil), dan komponen tetap jatuh ke Sathr bila tahap tak terpetakan. Kanvas `aria-hidden`, karena teks tahap di sebelahnya sudah ada di wilayah `aria-live`. Di bawah teks tahap ada penanda "Tahap n dari 4" (`retry` dihitung sebagai langkah 3).
4. **Teks tahap memakai `TextShimmer` HeroUI Pro** (permintaan pemilik): sorotan menyapu teks selama proses. Bawaannya teks dasar 45% tinta, kontrasnya 2,84:1 di kertas terang (di bawah AA 4,5:1). Untuk teks tahap (`.tanya-stage`, `globals.css`) dinaikkan ke 70%: 6,11:1 terang dan 8,34:1 gelap (diukur di browser), sepia ±5,3:1 (dihitung dari variabel tema, belum diukur di browser). Kilau CSS berjalan terus selama proses, juga saat tidak terlihat (animasi `translate` di compositor, murah). Tanpa gerak, HeroUI menampilkan teks penuh. Salinan sorotan HeroUI sudah `aria-hidden`, jadi tidak dibacakan dua kali.

**Tidak dipilih:**
- **Memasang paket `thinking-orbs` + prop `frame`:** painter-nya hanya punya satu warna tinta per orb (rampa satu tint), jadi tinta + Zaitun + emas dalam satu orb tidak bisa. Tema otomatisnya juga hanya mengenal `dark`/`light`, sehingga sepia akan salah tebak. Geometri lima bentuk ditulis ulang, tidak ada kode yang disalin dari paket itu.
- **Satu orb tetap untuk semua tahap:** pengguna tidak merasakan kemajuan. Pemilik memilih orb yang berganti bentuk.
- **Centang emas di akhir Untai:** bisa terbaca sebagai "kutipan sudah terverifikasi" padahal animasinya berulang. Dibuang.

**Konsekuensi:** tahap baru di pipeline Jawab baru tampil di web setelah ditambahkan ke `JAWAB_STAGES` (web, `lib/tanya/model.ts`); typecheck lalu memaksa entri `STAGE_SHAPE`/`STAGE_STEP`. Tipe tahap web dan pipeline tidak dibagi, jadi menambah tahap di pipeline saja tidak menggagalkan typecheck web (tahapnya hanya diabaikan). Orb hanya tampil selama fase `asking`. Tes geometri (`orb-frames.test.ts`) memeriksa batas kanvas, determinisme, keliling bintang, dan urutan butir emas.

**Tinjau ulang bila:** halaman Tanya didesain ulang (nama Maknaz, ADR-071), orb dipakai di tempat lain (MCP, admin), tahap Jawab berubah, atau HeroUI Pro naik versi (override kontras bergantung pada kelas `.text-shimmer__text`; bila namanya berubah, kontras diam-diam kembali ke 2,84:1, jadi cek di langkah banding ADR-035).

## ADR-073 · Halaman Tanya sebagai percakapan: komponen chat HeroUI Pro (template chat), setiap pertanyaan tetap dijawab terpisah — diterima · 2026-10-21

**Konteks:** halaman Tanya (S21) berbentuk formulir: judul dan kotak pertanyaan di atas, lalu satu jawaban di bawahnya. Pertanyaan berikutnya menimpa jawaban sebelumnya. Pemilik merasa layar itu "tidak natural chat" dan meminta desain dari template chat HeroUI Pro (`@heroui-pro/template-chat`), dengan komponen HeroUI lain atau buatan sendiri bila lebih cocok.

**Keputusan:**
1. **Tata letak chat setinggi layar:** wadah percakapan bergulir sendiri, dan komposer `PromptInput` (Pro) menempel di bawah. Setiap pertanyaan menjadi satu giliran: gelembung penanya `ChatMessage.User` (latar aksen Zaitun, teks `--accent-foreground`, sudut kanan bawah 2px; kontras 6,39:1 terang, 7,27:1 sepia, 9,65:1 gelap, diukur di browser; di mode gelap teksnya gelap karena aksennya hijau muda) + balasan `ChatMessage.Assistant` (orb + `TextShimmer` selama proses, lalu jawaban). Jawaban-jawaban sebelumnya tetap terlihat di atas. Keadaan kosong rata tengah: orb hilal, judul halaman (h1), pembuka, 4 contoh pertanyaan berbentuk chip selebar isinya (`Button` bulat; hanya mengisi komposer, tidak langsung mengirim, jadi tidak memakai kuota), dan satu baris pendek "Bukan fatwa · tiap pertanyaan dijawab terpisah" dengan tanda "?". Detailnya (tanyakan ulama setempat; jawaban sebelumnya tidak dibaca) muncul di HoverCard saat hover/klik/Enter, atau Popover saat diketuk di layar sentuh (pola penanda catatan kaki). `PromptSuggestion` tidak jadi dipakai karena butirnya berbentuk kartu selebar kolom.
2. **Setiap pertanyaan tetap dijawab terpisah.** API Jawab tidak menerima riwayat, dan UI mengatakannya ("jawaban sebelumnya tidak ikut dibaca, jadi tulis pertanyaan lengkap"), supaya pengguna tidak mengira Surau mengingat konteks. Riwayat hanya ada di memori tab: tidak disimpan di perangkat maupun server. Tombol `+` di komposer memulai percakapan baru.
3. **Isi jawaban tidak berubah aturannya** (ADR-064/066/069/070): blok bersitasi `[n]`, blok tanpa sitasi redup, status hadits, kartu kutipan Arab dari `/api/kutipan`, dan hasil Cari. Yang berubah hanya bingkainya: tanpa kartu "Jawaban", judul h2 tersembunyi untuk urutan judul, judul Kutipan/Status hadits/terkait menjadi h3, dan jangkar unik per giliran (`#kutipan-g2-1`). Di bawah jawaban ada label model, lalu `ChatMessageActions`: salin jawaban (kalimat + penanda, keterangan kalimat tanpa kutipan, atribusi "Disusun AI oleh Surau … bukan fatwa", dan daftar sumber dengan tautan; tanpa teks Arab; berhasil/gagal diumumkan ke pembaca layar) dan "laporkan jawaban keliru" (formulir lama, kini terbuka di tempat dengan fokus ke isiannya; status "terkirim" bertahan).
4. **Komposer:** footer memuat "bukan pemberi fatwa", larangan data pribadi, dan tautan kebijakan privasi. Kuota hari ini (atau "minimal 3 huruf") tampil di toolbar. Bila Jawab tidak tersedia, peringatan + tautan Cari muncul di atas komposer, dan komposer serta tombol kirim dinonaktifkan. Selama giliran berjalan kotak pertanyaan tetap aktif (`lockInputOnRun={false}`) supaya fokus keyboard tidak hilang; kiriman baru ditahan sampai giliran selesai. Turnstile tampil di dalam balasan giliran itu.
5. **Gulir:** saat pertanyaan dikirim, percakapan digulir ke bawah. Saat jawaban selesai, percakapan digulir ke awal giliran itu (pertanyaannya), supaya jawaban dibaca dari atas.
6. **Orb punya keadaan "siap" dan "selesai"** (tambahan atas ADR-072, permintaan pemilik): `rest` = **Hilal** (garis titik bulan sabit muda yang bernapas pelan, kilau Zaitun menyusuri lengkung luarnya) di atas judul keadaan kosong, sebagai tanda awal: siap menerima pertanyaan. `done` = **Segel** (bintang delapan khatam yang utuh dan diam, pusat emas) 20 px di samping label model di bawah setiap jawaban. Hilal dipakai sendiri, tanpa bintang di sampingnya, supaya tidak menjadi lambang bulan-bintang yang bermuatan politis. Saat pertanyaan pertama dikirim, hilal di tengah "terbang" ke posisi orb balasan pertama (View Transitions, `document.startViewTransition` + `flushSync`, nama `tanya-orb`, 0,55 detik), lalu beralih dari hilal ke bentuk tahap pertama (prop `enterFrom`). Bila browser tidak mendukung, gerak dikurangi, atau Turnstile diminta sejak pertanyaan pertama, terbangnya dilewati (orb balasan tetap mulai dari hilal). `ask` baru dimulai sesudah giliran terpasang (di dalam callback transisi), dan kunci sinkron mencegah kiriman ganda selama callback belum berjalan. Sesudah giliran pertama, placeholder komposer mengingatkan bahwa pertanyaan sebelumnya tidak ikut dibaca.

**Tidak dipilih:**
- **`ChatConversation` (Pro) sebagai wadah gulir:** perilaku "menempel di bawah"-nya menarik tampilan kembali ke ujung daftar kutipan saat kutipan termuat sesudah jawaban selesai (dicoba di browser), sehingga awal jawaban selalu tergulir ke atas. Wadah gulir sendiri lebih dapat diatur.
- **`ChatSources` untuk kutipan:** dibuat untuk tautan/dokumen. Kutipan Surau harus menampilkan teks Arab verbatim + label lokasi, jadi kartu kutipan lama dipertahankan.
- **Mengirim riwayat ke model (percakapan sungguhan):** mengubah pipeline, biaya, cache, dan eval. Itu keputusan terpisah bila kelak dibutuhkan.
- **Tombol "buat ulang jawaban" / suka:** memakai kuota tanpa memperbaiki apa pun, dan suka tidak dipakai di mana pun.

**Konsekuensi:** tinggi layar chat = `100svh − var(--navbar-height, 4rem)`. Variabel itu hanya ada di elemen `.navbar`, jadi praktiknya selalu 4rem (tinggi navbar bawaan); bila tinggi navbar diubah, angka ini ikut diubah. Ikon aksi (salin, tersalin, jempol bawah, kirim) adalah ikon bawaan komponen HeroUI Pro, bukan dari `src/icons` (sama dengan `Alert.Indicator`). CSS komponen baru diimpor per ADR-035 (`chat-message`, `chat-message-actions`, `prompt-input`, `avatar`, `avatar-group`). `ChatMessage.Body` kehilangan padding kanan bawaannya di layar ponsel supaya kartu kutipan memakai lebar penuh. e2e `tanya.spec.ts` dirancang tetap berlaku tanpa perubahan (h1, teks "bukan pemberi fatwa", kotak "Pertanyaan", tombol "Tanya", tautan privasi, keadaan nonaktif); hasil menjalankannya dicatat di LOG.

**Tinjau ulang bila:** Jawab menerima riwayat percakapan, PR Maknaz (ADR-071) mengganti teks halaman, atau HeroUI Pro naik versi (kelas `.chat-message__body` dan perilaku `PromptInput`).

## ADR-074 · Struktur teks pembaca (X04 W4): daftar kurasi subjudul tanpa teks Arab, syair per syatr, dan model halaman siap render — diterima · 2026-10-21

**Konteks:** audit X04 (A1, A3, A5): 191 paragraf pendek berawalan *bayan* tampil sebagai paragraf biasa, subjudul menempel di awal paragraf (pola hari pekan j1/197–200), dan 450 paragraf syair (` ... ` di sumber) tampil sebagai prosa. Sumber Shamela dan OpenITI tidak menandai subjudul-subjudul ini, jadi aturan otomatis di UI akan menebak.

**Keputusan:**
1. **Daftar kurasi** `data/patches/ihya-9472-subjudul.yaml` (keputusan, ditinjau agent per paragraf dengan membaca `text_raw` + paragraf sekitarnya dari DB) → `pnpm subjudul` (`tools/ingest/src/subheadings*.ts`) → `data/patches/ihya-9472-subjudul.json` (dipakai web). Isinya hanya nomor jangkar `#pN`, jumlah kata, offset UTF-16, dan sidik sha256 16 hex (`text_raw`, dan teks terjemahan bila ada bagian yang ditebalkan). **Tanpa teks Arab:** span dihitung dari jumlah kata lewat `normalizeArabic` + `toRawSpan` (satu fungsi normalisasi, teks-arab.md aturan 3).
   - Aturan otomatis: paragraf badan < 200 karakter yang kata pertamanya *bayan* dan bukan judul node daftar isi = subjudul. Dari 191 calon, **186 dipakai** (184 utuh + 2 *bayan* yang isinya menyambung di paragraf yang sama) dan **5 dikecualikan** (butir pertama daftar bagian di pembuka kitab; alasan tercatat per paragraf).
   - Keputusan tambahan: 22 **lanjutan judul** (judul terpotong baris baru sumber; dirender menyatu dengan judulnya, jangkar `#pN` lanjutan tetap ada), 3 judul utuh non-*bayan* yang dibutuhkan penyatuan itu, 16 **subjudul di awal paragraf** (14 hari/malam pekan j1/197–200 + 2 *bayan* + isi), dan 6 **subjudul di akhir paragraf** (subjudul bagian pertama yang di sumber menempel di akhir daftar bagian pembuka kitab). Pola hari pekan punya 15 kemunculan; p2811 bukan subjudul (lanjutan hadits p2804 yang terpotong pergantian halaman).
   - Web memakai entri **hanya bila sidiknya cocok** dengan teks yang sedang dirender; terjemahan ditebalkan hanya bila sidik terjemahannya juga cocok. Korpus baru dengan teks berubah tidak pernah dipotong di offset usang (entri diabaikan, paragraf tampil biasa). Tes integrasi lokal: semua entri cocok dengan `ihya-v7` dan gabungan blok = `text_raw` byte demi byte; `pnpm subjudul --cek` mendeteksi JSON yang tidak sesuai korpus + keputusan.
2. **Tampilan:** subjudul utuh = h2/h3 di tengah tanpa ornamen (h3 bila sudah ada judul node h2 sebelumnya di halaman itu, supaya urutan heading tetap berurutan), terjemahannya satu baris tebal. Subjudul awal/akhir = elemen judul di baris sendiri di dalam blok Arab paragrafnya (pertanyaan desain 3), kalimat pertama/terakhir terjemahan ditebalkan bila padanannya (diperiksa per paragraf).
3. **Syair:** aturan saat render, bukan kurasi: paragraf yang **seluruhnya** bait (setiap bagian di antara ` ... ` ≤ 80 karakter) ditata per syatr, dua kolom sejajar (bertumpuk di kolom < 36rem). Pemisah ` ... ` tetap di DOM (tak terlihat, ikut tersalin). Di `ihya-v7`: **437 dari 450** paragraf badan ber-` ... `; 13 sisanya bait yang menempel di tengah prosa (batas baitnya tidak bisa diketahui tanpa menebak) tetap sebaris.
4. **Model halaman siap render** (`lib/reader/page-model.ts`, `buildPageModel`): satu bentuk untuk halaman yang dirender server dan halaman sambungan gulir bersambung (ADR-076), disusun di server dari `PageView` + node daftar isi yang mulai di halaman itu + daftar kurasi. Komponen `PageText` merendernya tanpa pohon daftar isi, `@surau/core`, atau hash. Judul node (h2) dan jangkar bab kini dihitung dari node yang mulai di halaman itu (`pageSections` dari pohon, atau `listTocNodesStartingAt` untuk halaman sambungan); tes lama `headingPassages`/`sectionStarts` dipindah ke `page-model.test.ts` dengan hasil yang sama.

**Tidak dipilih:**
- Aturan regex subjudul di UI: tidak bisa diaudit dan salah di kasus seperti p2811 dan butir daftar pembuka kitab.
- Menambah node `toc_node` baru: daftar isi MCP dan routing Jawab (ADR-067) memakainya; menjadi keputusan bagian B (W7) atau sesi Jawab.
- Memecah `text_raw` atau menyalin judul Arab ke berkas patch (teks-arab.md aturan 1–2).

**Konsekuensi:** daftar kurasi terikat `ihya-v7`; korpus baru = jalankan `pnpm subjudul --periksa` dan perbarui keputusan bila ada entri yang sidiknya berubah. Belum dikurasi: judul *syathr*/*rukn*/*bab* lain yang menempel (pola sama, di luar *bayan*), p20177/p20178 (kata terakhir judul di paragraf isi), p16600 dan p18645 (node daftar isinya menunjuk butir daftar sebagai judul; diperbaiki lewat patch daftar isi di bagian B).

**Tinjau ulang bila:** bagian B memindahkan subjudul ke daftar isi pembaca (W7), kitab kedua masuk, atau versi korpus berganti.

## ADR-075 · Label AI dan penyajian terjemahan di pembaca (X04 W1–W3): satu catatan halaman + lencana per terjemahan, label saat menyalin, tipografi terjemahan, tata letak pilihan — diterima · 2026-10-21

> **Sebagian digantikan 2026-10-24 (ADR-091):** "Arab saja" kini mode baca Arab (bukan sakelar), tata letak hanya berlaku di mode Keduanya, kartu Cari ikut mode baca, dan mode Terjemahan (Arab dilipat per paragraf) disetujui pemilik, menggantikan "Tidak dipilih: mode Indonesia saja".

**Konteks:** audit X04 (B, C): terjemahan AI 14 px dengan CPL desktop 94–113, jarak antarparagraf 12 px, dan satu baris label "Terjemahan AI" di setiap paragraf (±16 ribu di seluruh kitab), padahal bagi sebagian besar pembaca terjemahan adalah teks utama. Pemilik menyetujui usulan agent (pertanyaan desain 1–2, 2026-10-21).

**Keputusan:**
1. **Label (aturan 8 tetap):** satu catatan di awal teks halaman ("Terjemahan Indonesia dibuat AI …", tautan ke prinsip Surau) yang bisa ditutup dan diingat per browser (`surau:ai-notice`, skrip awal memasang `data-ai-notice="off"` sebelum tampil), plus **lencana "Terjemahan AI" di akhir setiap terjemahan** yang tetap tampil walau catatan ditutup (teks tidak disingkat, `title` = penjelasan lengkap). Pembaca layar mendengar awalan "Terjemahan AI:" per blok (sr-only). Lencana dan awalan tidak ikut terseleksi; **salinan** teks yang menyentuh terjemahan diberi label per segmen oleh satu pendengar `copy` di dokumen: "(Terjemahan AI, <permalink #pN>)" untuk segmen AI, label Kemenag untuk segmen ayat (bila labelnya belum ikut terseleksi). Ringkasan AI yang tersalin juga berlabel "(Ringkasan AI, <permalink>)"; elemen tersembunyi (`aria-hidden`, tak terlihat, `data-copy-skip`) tidak masuk salinan berlabel (temuan peninjau). Seleksi Arab saja memakai salin bawaan browser (verbatim). Kartu Cari dan kaki halaman tidak berubah.
2. **Tipografi terjemahan:** 16 px (ponsel) / 17 px (≥ 640 px), tinggi baris 1,7, lebar maks 64ch, skala sendiri di panel Tampilan (`--reader-tr-scale`, 90–135%). Jarak antarparagraf 28 px (16 px bila terjemahan disembunyikan); terjemahan menempel ke Arabnya. Diukur di j1/200 (dev lokal, 1440 px): 17 px, CPL 70, jarak 28 px.
3. **Teks Indonesia** (deterministik, isi kata tidak berubah): petik lurus berpasangan dalam satu segmen AI → “…” berwarna kutipan (petik ganjil dibiarkan; segmen Kemenag tidak disentuh); padanan subjudul ditebalkan (ADR-074); ringkasan AI yang dibuka penuh dibagi paragraf 2–3 kalimat (`indonesianSentences`, @surau/text, singkatan saw./swt./ra./QS. dan inisial tidak memotong kalimat); `hyphens: auto` + `text-wrap: pretty` pada `lang="id"` (pemenggalan nyata bergantung kamus bahasa Indonesia di browser).
4. **Tata letak** (pertanyaan desain 1, `data-tr-layout`, disimpan per browser): di bawah paragraf (bawaan), **dilipat** (tombol "Terjemahan AI" per paragraf, buka-tutup lewat satu pendengar klik), **berdampingan** (Arab kanan, Indonesia kiri, sejajar per paragraf) bila kolom teks ≥ 48rem (±1440 px dengan daftar isi; di kolom lebih sempit tetap di bawah). Arab saja tetap lewat sakelar terjemahan.
5. **Perataan Arab "Otomatis"** (bawaan baru): rata kanan-kiri di ≥ 640 px, rata kanan di ponsel (spasi antarkata tidak melebar); pilihan rata kanan-kiri dan rata kanan tetap ada.

**Tidak dipilih:** lencana "AI" saja (W3: tidak disingkat); mode "Indonesia saja" (teks Arab rujukan utama, docs/01); huruf miring istilah Arab, menebalkan nama/kata kunci, dan mengubah "Pertama… Kedua…" menjadi daftar (menafsir atau mengubah susunan).

**Konsekuensi:** `PassageTranslation` kini komponen server tanpa Typography untuk isi (pengecualian "CSS pembaca" di apps/web/CLAUDE.md); terjemahan judul memakai satu baris tebal. Panel Tampilan bertambah dua kontrol.

**Tinjau ulang bila:** ada terjemahan berstatus tinjauan manusia (label berbeda per status), atau T-17 tahap 3 menunjukkan perlunya penanda mutu per paragraf.

## ADR-076 · Gulir bersambung, Lanjutkan membaca, dan Bagikan tautan paragraf (X04 W5–W6) — diterima · 2026-10-21

**Konteks:** membaca satu bab berarti membalik halaman cetak satu per satu (`/kitab/ihya/bab/<id>` hanya mengalihkan), tidak ada cara kembali ke posisi baca terakhir, dan menu ⋮ paragraf hanya menyalin sitasi. Pemilik memilih gulir bersambung antarhalaman cetak (pertanyaan desain 4) dan kartu Lanjutkan membaca juga di beranda (pertanyaan 8).

**Keputusan:**
1. **`GET /api/halaman?work=&juz=&page=`** (`lib/reader/page-handler.ts`): model siap render (ADR-074) + judul bab + bagian aktif. Urutan pengaman seperti /api/search (ADR-048), **tanpa membaca D1 sebelum batas laju** (temuan peninjau): pembaca terbuka → Zod (juz/halaman `uintSegment`) → kunci HMAC terpasang (503 bila belum) → Cache API (kunci = korpus produksi + `PAGE_MODEL_VERSION` + segmen karya + juz + halaman, `s-maxage` 7 hari, hanya bila `SEARCH_CACHE_CORPUS` terisi; hanya respons 200 dari segmen kanonis yang pernah ditulis) → batas per klien (HMAC jaringan IP) → batas global → edisi kanonis + batas jilid (hanya segmen kanonis yang dikirim pembaca; varian ejaan/encoding = 404; diingat per isolate dan per korpus, paling banyak 64 entri) → baca → simpan. Alamat tidak sah/tidak ada = 400/404 **tanpa menulis cache**. Batas baru `PAGE_LIMITER` 60/menit per klien dan `PAGE_GLOBAL_LIMITER` 1.200/menit (namespace 1009/1010 produksi, 2009/2010 Preview). Respons ke browser `no-store`.
   - Tanpa pohon daftar isi: hanya node yang mulai di halaman itu (`listTocNodesStartingAt`, satu kueri lewat indeks `toc_node_start`) + satu node untuk judul bab. Diukur lokal (`ihya-v7`, D1 lokal, memo daftar isi dingin): j1/201 render penuh 1.152 baris dibaca vs halaman sambungan **203 baris (17,6%)**; sisanya bacaan isi halaman itu sendiri (`readPage`: paragraf, penanda, ayat, terjemahan), yang juga dibayar render penuh. Target pra-sesi "≤ 15%" (dari perkiraan daftar isi = 93% render, S10) tidak tercapai untuk halaman ini; dicatat apa adanya.
2. **Klien** (`ContinuousReader`): saat penanda di akhir teks mendekati layar (±1,5 layar), halaman berikutnya dimuat dan dirender `PageText` yang sama di bawah pemisah "Juz 1 · Halaman 201" (h2). Komponen render halaman sambungan dimuat malas (`next/dynamic`, hanya setelah halaman pertama dimuat). Otomatis paling banyak 5 halaman, sesudahnya lewat tombol "Muat halaman berikutnya". Halaman yang melewati garis 30% layar menjadi halaman terbaca: `history.replaceState(null, …)` ke permalinknya (URL awal, termasuk `?q=`/`#pN`, dipulihkan saat kembali ke halaman pertama), judul tab, judul ringkas navbar, dan sorotan daftar isi ikut. Nilai halaman terbaca disimpan di modul (`reader-page-event.ts`, bukan event sekali kirim) dan terikat permalink halaman pertama, supaya sheet daftar isi yang baru dipasang saat dibuka tetap menyorot halaman terbaca dan nilai dari halaman sebelumnya tidak terpakai sesudah navigasi (temuan peninjau). ←/→ membalik relatif ke halaman terbaca. Laporan kesalahan **dan sitasi paragraf** dari halaman sambungan memakai juz/halaman dari permalink paragrafnya (`citeForPath`; sebelumnya sitasi menyebut halaman pertama: temuan kritis peninjau, kini dites e2e).
3. **Lanjutkan membaca:** posisi baca (karya, judul Latin, juz, halaman, jangkar paragraf teratas yang terlihat, waktu) disimpan **hanya di browser** (`surau:last-read:<karya>`), saat halaman dibuka, paling sering tiap 1,5 detik saat menggulir, dan saat tab ditinggalkan. Kartu tampil di beranda dan `/kitab` (posisi terbaru) serta halaman karya (posisi karya itu saja); ruangnya dipesan sebelum tampil (skrip awal memasang `data-reading`) supaya tidak menggeser tata letak. Rekaman divalidasi ketat sebelum dipakai sebagai tautan. `/privasi` menyebut penyimpanan ini.
4. **Bagikan tautan paragraf** di menu ⋮: lembar bagi bawaan (`navigator.share`) di perangkat sentuh, selain itu salin URL `#pN`.

**Tidak dipilih:** halaman baca per bab (bagian terpanjang 70 halaman terlalu berat untuk satu render Worker, OpenNext #1455); merender halaman sambungan di server sebagai HTML (komponen interaktif tidak terhidrasi); menyimpan posisi baca di server/cookie (tanpa akun, P-7).

**Konsekuensi:** satu route + dua binding rate limit baru (`cloudflare-env.d.ts` diperbarui). Halaman sambungan tidak memakai sorotan Cari `?q=` dan tidak di-ISR (data dari API, ter-cache per data center di produksi). DOM halaman tumbuh selama pembaca menggulir (dibatasi 5 halaman otomatis).

**Tinjau ulang bila:** biaya baca D1 /api/halaman naik di Workers Analytics, OpenNext #1455 diperbaiki (halaman per bab mungkin layak), atau ada akun pengguna (sinkron posisi baca).

## ADR-077 · Judul daftar isi Indonesia (X04 bagian B W8): tabel korpus skema 7, prompt `translate-toc-title@2` (Sonnet 5.5, API biasa, pagu), label di kepala daftar isi, korpus `ihya-v8` — diterima · 2026-10-21

**Konteks:** daftar isi pembaca hanya Arab (audit X04 D), jadi pembaca Indonesia tidak bisa bernavigasi tanpa membaca Arab. 207 dari 313 node punya terjemahan paragraf judul dengan gaya tidak seragam dan satu salah tafsir ("yang kami terjemahkan di Quds"); 106 node dan semua subjudul kurasi belum punya padanan. Pemilik memilih opsi (b) "semua judul + subjudul diterjemahkan ulang dengan gaya seragam, Indonesia di atas, Arab di bawah" dengan pagu US$1 (jawaban desain X04 no. 5).

**Keputusan:**
1. **Data:** migrasi korpus `0007_title_translation.sql` (skema 7): `toc_title_translation` (kunci `toc_node_id`) dan `subheading_translation` (kunci `passage_id` paragraf subjudul kurasi, ADR-074), kolom sama dengan `translation`/`summary` (model, versi prompt, tanggal, `review_status`); `subheading_translation` juga menyimpan `source_sha256` judul Arab yang diterjemahkan, dan pembaca hanya menampilkannya bila judul Arab yang tampil sekarang bersidik sama (daftar kurasi bisa berubah tanpa korpus baru; temuan peninjau). Di skema < 7 web tidak menjalankan kuerinya sama sekali (skema dari `meta`). Korpus `ihya-v8` = `ihya-v7` + kedua tabel (313 + 209 baris) + 5 terjemahan paragraf `translate-passage@4` yang sudah ada di `data/build/llm` sesudah v7 dibangun. Halaman, paragraf, daftar isi, ringkasan, dan indeks Arab sama.
2. **Unit judul** (`tools/ingest/src/llm/titles.ts`): setiap node daftar isi + setiap subjudul kurasi yang tampil di daftar isi pembaca (ADR-078), judul Arab disalin kode dari DB (`subheadingPartText`, `@surau/core`, sama dengan web). Dikirim per kelompok ≤ 90 judul dalam urutan baca (dipotong di batas kitab) dengan `<jalur>` judul leluhur sebagai konteks, sehingga gaya seragam per kitab.
3. **Prompt** `translate-toc-title@2` + glosarium v1 (sama dengan terjemahan paragraf): penanda struktur tetap (Kitab, Bab Kedua: …, Pasal, Bagian, Paruh, Rukun, Segi, "bayan" → "Penjelasan …"), kapital judul hanya untuk rubu'/kitab, tanpa titik/kutip/Markdown/huruf Arab. v2 menggantikan v1 sesudah uji kelompok pertama: v1 menerjemahkan "tarjamah" di judul sebagai "terjemahan" (galat audit yang sama) dan membuka isi dengan "Tentang". Sonnet 5.5 lewat **Messages API biasa** (bukan batch; 7 request kecil, hasil langsung), effort low, keluaran terstruktur `output_config.format` (array `{id, indonesia}`, karena kunci dinamis tidak didukung).
4. **Validasi kode** (`checkTocTitle`, `judgeTocTitles`): satu judul per id yang diminta (ganda/hilang/asing ditolak), tanpa huruf Arab, ≤ 320 karakter, tanpa baris baru/Markdown/kutip/titik akhir (kecuali singkatan saw./ra.); respons yang berhenti selain `end_turn` ditolak seluruhnya. Hasil yang lolos disimpan di `data/build/llm/toc-title.jsonl` dengan sha256 judul Arab; ingest hanya memuat hasil dengan prompt aktif dan sidik judul yang masih sama, dan invarian baru mewajibkan cakupan ≥ 99% (`ihya-v8`: 522/522).
5. **Pagu** (`pnpm llm judul --budget`): sebelum setiap request, biaya tercatat (`toc-title-runs.jsonl`) + biaya terburuk request itu (input × tarif tulis cache 1 jam + `max_tokens` × tarif keluaran) tidak boleh melewati pagu; tanpa `--confirm` hanya hitung token gratis. Biaya aktual: **US$0,4117** (uji v1 US$0,0443 + v2 9 request; 2 judul terpanjang ditolak batas 220 karakter lalu dikirim ulang sesudah batas validasi dinaikkan ke 320). Perkiraan rencana ±US$0,26 belum menghitung glosarium di prompt sistem (±4,5 ribu token per request).
6. **Tampilan:** judul Indonesia hanya di tempat yang berlabel: pohon daftar isi pembaca (Indonesia di atas, Arab di bawah) dengan satu catatan "Terjemahan AI · model, versi prompt, tanggal · belum ditinjau" di kepala pohon (`aria-describedby` pohon), dan kepala halaman baca (judul bagian aktif + lencana "Terjemahan AI"). Breadcrumb JSON-LD, `<title>`, OG, judul ringkas navbar, daftar isi MCP, dan routing Jawab tetap judul Arab (pohon `loadToc`).
7. **Korpus lama:** web membaca tabelnya lewat `listTitleTranslations`; di skema < 7 hasilnya `null` (pola `loadAyahRefs`) dan pohon tampil tanpa judul Indonesia. Promote `ihya-v8` menunggu izin pemilik; kode aman di `ihya-v7`.

**Tidak dipilih:** memakai terjemahan paragraf judul yang sudah ada (gaya tidak seragam, ada salah tafsir); Message Batches (hemat ±50% dari biaya yang sudah kecil, hasil baru beberapa menit–jam kemudian); judul Indonesia di breadcrumb/<title>/OG (labelnya tidak bisa ikut); menyunting tangan judul yang keliru (bukan lagi "terjemahan AI"; koreksi lewat lapisan koreksi X08/ADR-047 bila perlu).

**Konsekuensi:** pohon daftar isi yang dikirim ke klien bertambah (522 baris, masing-masing dengan judul Indonesia; tetap terkirim satu kali di data RSC). Diukur di j1/200: HTML Preview PR #116 (`ihya-v8`) **350.864 byte / 60.980 gzip** vs produksi `ihya-v7` 253.739 / 40.516 (+38% / +50%); usul untuk sesi kinerja LCP: pohon daftar isi dimuat malas (per kitab atau sesudah halaman tampil). Judul Indonesia ikut gaya prompt v2; bila T-17/tinjauan menemukan pola salah, buat v3 dan kirim ulang dalam pagu baru. Kunci memo daftar isi pembaca = meta korpus + sidik daftar kurasi.

**Tinjau ulang bila:** ada tinjauan manusia atas judul (label per status), kitab kedua masuk, atau ukuran HTML/LCP halaman baca naik berarti karena pohon daftar isi.

## ADR-078 · Daftar isi pembaca dengan subjudul kurasi (X04 bagian B W7) dan judul node yang salah tempat (butir daftar pembuka, jangkar sumber terlalu awal) — diterima · 2026-10-21

**Konteks:** 19 dari 40 kitab tidak punya subbab di daftar isi korpus (audit X04 A2), padahal 209 subjudul kurasi (ADR-074) sudah dirender di teks. Menambah node `toc_node` akan mengubah daftar isi MCP dan routing Jawab (ADR-067; eval berbayar). Dua node (100224, 100285) di sumber menunjuk butir daftar pembuka kitab sebagai judulnya (p16599/p18644), dan 8 node lain berjangkar satu-dua paragraf sebelum paragraf judulnya (kolofon kitab sebelumnya, kalimat pengantar), sehingga judulnya tampil sebagai paragraf biasa.

**Keputusan:**
1. **Lapisan pembaca, bukan `toc_node`:** daftar isi pembaca (`loadReaderToc`, `lib/reader/reader-toc.ts`) = pohon `toc_node` + subjudul kurasi sebagai anak node pemilik paragrafnya (`passage.toc_node_id`), sebelum anak node (paragraf milik node selalu mendahului judul anak pertamanya), urut halaman + `ord`. Subjudul yang tampil: subjudul utuh (+ lanjutan judulnya), subjudul di awal/akhir paragraf; bukan butir `plain` dan bukan judul node `node_tail`. Judul disalin kode dari `text_raw` di offset kurasi (penanda catatan kaki dilewati), hanya bila sidik semua paragrafnya cocok; tautannya permalink paragraf `#pN`. Teks dan judul Indonesianya dimemo per isolate (kunci meta korpus + sidik daftar kurasi). Kitab tanpa anak di daftar isi pembaca: **19 → 6** (6 kitab memang tanpa calon *bayan*).
2. **Pohon tampilan terpisah:** breadcrumb, `<title>`, OG, bagian aktif, judul ringkas, dan model halaman tetap memakai pohon `toc_node` (`loadToc`); daftar isi MCP (`get_table_of_contents` = 313 node) dan Jawab tidak berubah.
3. **Butir daftar pembuka** (kurasi `node_tail`, `data/patches/ihya-9472-subjudul.yaml`): butir `p16599`/`p18644` = `plain` (teks biasa walau sama dengan judul node), dan 3 kata terakhir `p16600`/`p18645` = judul node 100224/100285 (h2), dengan jangkar `#bab-<id>` + ringkasan node dipindah ke paragraf itu. `pnpm subjudul` mengecek kata-kata akhir = judul node (bentuk normal), paragrafnya bersebelahan, dan butirnya memang paragraf judul node itu.
4. **Jangkar sumber terlalu awal:** judul node (h2) = paragraf **pertama** milik node di halaman awalnya yang teksnya sama dengan judul (dulu hanya paragraf pertama node), sama dengan aturan `isTocHeading` di ingest; jangkar `#bab-<id>` + ringkasan ikut pindah ke paragraf judul. 8 node (6 judul kitab sesudah kolofon kitab sebelumnya, 100223, 100243) kini tampil sebagai judul.
5. `toc_node` dan `passage.toc_node_id` **tidak diubah**: memindah paragraf ke node lain membuat ringkasan AI per bagian usang (sidik sumber) dan mengubah `read_section`/Jawab, padahal judul dan halaman awal node sudah benar.

**Tidak dipilih:** node `toc_node` baru untuk subjudul (MCP + Jawab berubah, butuh eval berbayar; keputusan sesi Jawab); patch `toc_node` untuk dua node butir daftar (judul dan halaman awalnya sudah benar, yang salah hanya paragraf judul yang dipilih pembaca).

**Konsekuensi:** `PAGE_MODEL_VERSION` naik ke 3 (bentuk `PassageModel` + logika judul). Daftar kurasi dilabeli `ihya-v8` (sidik semua entri sama dengan v7). Subjudul di daftar isi tidak ikut disorot sebagai bagian aktif (sorotan tetap per node).

**Tinjau ulang bila:** sesi Jawab memutuskan promosi subjudul ke `toc_node`, kitab kedua masuk, atau korpus baru mengubah teks paragraf kurasi.

## ADR-079 · Kinerja pembaca ponsel (X09): pangkas byte sebelum cat pertama — font UI tanpa preload, tekstur kertas ditunda di kunjungan pertama, pohon daftar isi ringkas + `/kitab/<karya>/daftar-isi.json` (ISR), JS dimuat saat dibutuhkan, kamus i18n per bagian; `experimental.inlineCss` ditolak — diterima · 2026-10-22

> **Pembaruan 2026-10-22 (ADR-080):** butir 1 diganti: font UI kini Google Sans WOFF2 (±35 KB) dan gaya normalnya di-preload lagi.

**Konteks:** LCP ponsel halaman baca produksi median 5,89 dtk (j1/200) dan 5,34 dtk (j3/202) (Lighthouse 13.5 ponsel, n=5), padahal ADR-035 mencatat 3,9 dtk. Lighthouse (Lantern) merekam jejak tanpa throttling lalu menghitung setiap permintaan yang **selesai sebelum LCP teramati** sebagai penghambat, plus skrip yang dievaluasi sebelum cat itu; di jejak cepat itu hampir semua ±1 MB muatan halaman selesai sebelum cat pertama, jadi LCP naik ±4,3 ms per KB. Eksperimen terkendali (build `main` di workerd + proksi HTTP/2 brotli, respons diubah di proksi): tanpa preload 4 TTF Harmony −0,24 dtk, tanpa tekstur −0,31, keduanya −0,61, tanpa JS sama sekali −1,98 (batas atas). Rincian di `sesi/X09-kinerja-pembaca.md`.

**Keputusan:**
1. **Font UI tanpa preload.** `localFont` HarmonyOS `preload: false`: empat TTF (±230 KB) tidak lagi di-preload; berkas tetap dimuat begitu teksnya tampil (Italic tidak dimuat bila tidak ada teks miring). Berkas TTF tidak diubah (ADR-056).
2. **Preload Noto Naskh khusus halaman baca ditolak** (sempat dicoba): pemanggilan `next/font` kedua mem-preload berkas ber-URL lain (`-s.p.`) daripada `@font-face` global (`-s.`), menambah satu CSS render-blocking per rute, dan pada navigasi klien dari halaman berteks Arab berkas yang sama (±92 KB) terunduh dua kali. Manfaatnya hanya CLS 0,036 → 0,012.
3. **Tekstur kertas ditunda di kunjungan pertama** (mengubah ADR-058 poin 2 "tanpa JavaScript, tanpa fade" untuk kunjungan pertama saja): `<script>` mentah di awal `<body>` (`lib/paper.ts`, dijalankan saat HTML diurai, di titik yang sama dengan skrip next-themes) memasang `data-kertas-tunda` di `<html>` bila tile belum pernah terunduh (penanda `localStorage`); globals.css memasang mask `body::before` hanya bila atribut itu tidak ada. Sesudah `load` + saat senggang tile diunduh (`Image()` mode CORS, sama dengan `mask-image`), atribut dilepas, tekstur masuk halus 0,6 dtk (`data-kertas-masuk`, mati bila `prefers-reduced-motion`). Kunjungan berikutnya dan tanpa JavaScript: tekstur tampil sejak cat pertama seperti ADR-058. `<Script strategy="beforeInteractive">` tidak dipakai karena di App Router isinya baru dijalankan sesudah JS utama terunduh.
4. **Pohon daftar isi ringkas.** HTML halaman baca hanya membawa akar + anak node yang tampil terbuka (`pruneToc`, leluhur bagian aktif = `defaultExpandedKeys` TocTree); node lain kehilangan anaknya dan ditandai `more` (ruang chevron tetap, baris tidak bergeser). Pohon lengkap dari route ISR baru **`/kitab/[work]/daftar-isi.json`** (`revalidate = false`, `generateStaticParams = []`, pola ADR-034; 404 bila pembaca tertutup/karya tidak ada, alias edisi 308; `X-Robots-Tag: noindex`), diambil sekali per karya (`lib/reader/full-toc.ts`) saat pohon terlihat (IntersectionObserver): panel samping desktop sesudah `load`, sheet ponsel saat dibuka. TocTree dipasang ulang saat pohon lengkap datang (`defaultExpandedKeys` hanya dibaca saat pasang). Breadcrumb JSON-LD, `<title>`, OG, judul bagian + lencana di kepala halaman (dihitung server dari pohon lengkap), sorotan bagian aktif, dan daftar isi MCP tidak berubah. HTML j1/200: 522 → 26 baris pohon, gzip 59,9 → 32,5 KB.
5. **JS dimuat saat dibutuhkan** (`next/dynamic`, `ssr: false`): isi panel Tampilan (`reader-style-panel.tsx`; preferensi di `reader-style-prefs.ts`), formulir Lompat (`jump-form.tsx`), dialog laporan (dipasang saat pertama dibuka), dialog palet cari (semua halaman). Panel Tampilan dan palet mulai diunduh saat tombolnya didekati/difokus. Indikator muat `Spinner` berlabel `common.loading`.
6. **Kamus i18n per bagian:** `i18n/id/<bagian>.ts`; objek `id` (`i18n/id.ts`) tetap untuk route/server component di `app/`. `components/`, `lib/`, dan berkas `"use client"` di `app/` mengimpor bagiannya langsung (KONVENSI, dijaga `i18n/id.test.ts`). Kamus utuh (±26 KB mentah) sebelumnya tersalin di 2–3 chunk JS halaman baca.
7. **`experimental.inlineCss` ditolak** walau di eksperimen proksi memberi LCP 2,1–3,4 dtk (cat pertama mendahului evaluasi JS): di build nyata bundle Worker 2,3 → 7,2 MB gzip (CSS tersalin per rute di manifes, opennextjs-cloudflare #1370) dan HTML j1/200 351 KB → 1,67 MB mentah (CSS tersalin 3×, Next #98110).

**Hasil** (Preview PR #118 vs produksi, berselang-seling di jendela waktu yang sama, Lighthouse 13.5 ponsel):

| | j1/200 Preview | j1/200 produksi | j3/202 Preview | j3/202 produksi |
|---|---|---|---|---|
| Putaran 1 (commit `277441f`, n=5) LCP median | 4,57 | 5,88 | 5,01 | 5,77 |
| Putaran final (commit `47f3916`, n=5) LCP median | **4,15** | 5,36 | **4,40** | 5,89 |
| Gabungan n=10 LCP median | 4,49 | 5,77 | 4,58 | 5,79 |
| CLS median (final) | 0,036 | 0,036 | 0,002 | 0,001 |
| Total terkirim | 870 KB | 1.005 KB | 868 KB | 1.003 KB |

JS halaman baca 455 → 405 KB br (lokal), HTML 54 → 26 KB br. Bundle Worker 2.291 → 2.322 KiB gzip. Target ≤ 4,29 dtk tercapai di j1/200 putaran final, **tidak** di j3/202 (4,40) maupun median gabungan. Variasi antarputaran besar karena balapan di jejak cepat: bila TTF Harmony Medium/Bold (60 KB masing-masing) dan subset Latin Naskh (20 KB) selesai sesudah cat pertama, LCP ±4,4–4,5 dtk; bila sebelum, ±5,3 dtk.

**Sisa yang tidak dikerjakan (keputusan pemilik):** JS kerangka situs ±377 KB br di semua halaman (Next/React, react-aria, HeroUI, `motion` lewat `LazyMotion`+`domAnimation` di Sidebar dan Navbar Pro, `react-resizable-panels` lewat AppLayout); font UI HarmonyOS TTF ±170 KB yang menurut lisensinya tidak boleh dikonversi WOFF2 atau di-subset; beacon Cloudflare Web Analytics (10 KB, hanya produksi).

**Ditolak:** inline critical CSS buatan sendiri (butuh langkah build di OpenNext, ADR-035); `content-visibility` per paragraf (permalink `#pN` bisa meleset karena tinggi perkiraan); mengganti Navbar Pro dengan markup polos (`motion` tetap terbawa Sidebar Pro).

**Konsekuensi:** ruang path ISR bertambah satu pola (`/kitab/<apa saja>/daftar-isi.json`), sekelas risiko yang diterima ADR-034 butir 2 (404/308 ikut di-cache; karya tak dikenal berhenti di `resolveWork` sebelum membaca pohon). Chunk `next/dynamic` bisa gagal dimuat di tab yang terbuka melewati deploy (aset lama hilang) → layar galat pembaca; risiko diterima. Pembaca dengan preferensi font Arab lain tidak terpengaruh (tanpa preload).

**Tinjau ulang bila:** HeroUI Pro membuat `motion` opsional di Sidebar/Navbar; OpenNext #1370 dan Next #98110 diperbaiki (`inlineCss` layak diuji lagi); pemilik mengganti font UI ke WOFF2/OFL; atau LCP ponsel naik lagi > 10%.

## ADR-080 · Font UI Google Sans (OFL, `next/font/google`) menggantikan HarmonyOS Sans — diterima · 2026-10-22

**Konteks:** sesudah X09 (ADR-079) sisa LCP ponsel di atas target (j1/200 4,15 dtk, j3/202 4,40 dtk; target 4,29) sebagian berasal dari font UI HarmonyOS Sans: tiga TTF ±58 KB (Regular, Medium, Bold) yang ikut terhitung LCP dan membuat hasil naik-turun ±0,8 dtk. Lisensi HarmonyOS mensyaratkan berkas tidak diubah (konversi WOFF2/subset bisa dianggap modifikasi, ADR-056), dan ADR-056 mencatat berkasnya tidak boleh ada di repo selama repo publik; repo kini publik. Pemilik memilih di chat 2026-10-22: "ubah jadi Google Sans".

**Keputusan:**
1. **Google Sans** dari Google Fonts (`ofl/googlesans`: OFL 1.1, tanpa Reserved Font Name; "Google"/"Google Sans" merek dagang Google LLC, hanya tidak boleh dipakai seolah berafiliasi) lewat `next/font/google` (`Google_Sans`, WOFF2 variabel 400–700, di-host sendiri saat build). Dua pemanggilan dengan nama keluarga sama: gaya normal (variabel `--font-ui`, subset Latin di-preload, ±35 KB untuk semua bobot) dan italic (tanpa preload). Bobot 600 kini SemiBold asli (HarmonyOS memakai berkas Bold). Ini **mengubah ADR-079 butir 1**: preload font UI dinyalakan lagi karena berkasnya kini satu WOFF2 ±35 KB (bukan empat TTF ±230 KB), sehingga selesai lebih awal dan hasil ukur tidak lagi bergantung pada balapan TTF Medium/Bold.
2. **Huruf cadangan bermetrik sendiri:** `next/font` belum punya metrik Google Sans ("Failed to find font override values"), jadi `adjustFontFallback: false` + `fallback: ["Google Sans Fallback"]`, dan `@font-face` "Google Sans Fallback" di globals.css = `local("Arial")` dengan `size-adjust` 101,95%, `ascent-override` 94,76%, `descent-override` 28,05%, `line-gap-override` 0% (rumus next/font atas metrik capsize berkas Latin wght 400: ascent 966, descent −286, unitsPerEm 1000, xWidthAvg 450 vs Arial 904/2048).
3. **Berkas HarmonyOS dikeluarkan dari repo** (`apps/web/src/fonts/harmonyos-sans/`, termasuk `LICENSE.txt`); `/lisensi#font` kini menyebut Google Sans + font Arab (OFL) dan catatan merek, tautan ke teks resmi OFL. Riwayat git masih memuat berkas lama (tidak ditulis ulang; `push --force` ke `main` dilarang).
4. **Alat aset:** `potret.mjs` menyuntikkan `.claude/skills/aset/font/GoogleSans-latin.woff2` (subset Latin resmi Google Fonts, + `OFL.txt`) ke browser pemotret; mesin `iso.js` memakai `'Google Sans', ui-sans-serif, …` (mesin situs dibangun ulang: `aset-mesin/iso-34d5a370f6.js`, figur `public/aset/` + `aset/keluaran/`). Figur di situs tetap tanpa permintaan font.

**Hasil:** lokal (build workerd + proksi HTTP/2 brotli, n=3): LCP j1/200 4,52 → 3,99 dtk, j3/202 4,52 → 4,01 dtk; font UI terkirim ±170 KB → 35 KB (+20 KB subset Latin lanjutan bila ada huruf berdiakritik). Preview PR #119 vs produksi (sudah memuat X09), berselang-seling n=5, Lighthouse 13.5 ponsel: j1/200 **3,86** vs 4,25 dtk, j3/202 **4,10** vs 4,09 dtk; total terkirim 870 → 750 KB; CLS j1/200 0,040 vs 0,036, j3/202 0,001 vs 0,002. Di jendela ukur ini produksi X09 sendiri sudah di bawah 4,29 (variasi antarjendela besar, lihat ADR-079); efek font paling jelas di j1/200 dan di total byte.

**Ditolak:** Google Sans Flex (lebih banyak sumbu, berkas lebih besar, tanpa italic); tetap HarmonyOS (lisensi + ukuran); Plus Jakarta Sans (bukan pilihan pemilik).

**Konsekuensi:** tampilan huruf antarmuka berubah (lebih geometris; judul semibold). `opengraph-image.jpg`/`twitter-image.jpg` lama masih dirender dengan HarmonyOS sampai dibuat ulang. Perangkat tanpa Arial (Android) memakai `ui-sans-serif` sebagai cadangan selama font diunduh (sama seperti cadangan otomatis next/font).

**Tinjau ulang bila:** next/font menambah metrik Google Sans (hapus cadangan buatan sendiri), atau pemilik mengganti font lagi.

## ADR-081 · Koreksi terjemahan tahap 1 (X08): revisi manusia di DB app (`translation_revision`, hanya bertambah), editor terdaftar `TRANSLATION_EDITORS` dengan peran ruang tinjau, `/tinjau/terjemahan`, daftar koreksi + batalkan di `/admin`, pemeriksa teks bersama `validateTranslationText` — diterima · 2026-10-22

**Konteks:** ke-16 ribu terjemahan Ihya berstatus `ai_generated`. Lapisan koreksi ADR-047 hanya bisa menolak hasil AI; teks perbaikan manusia belum bisa masuk. Pemilik memutuskan (X08, 2026-10-21): editor = ustadz terdaftar, nama tampil, tanpa persetujuan kedua, tayang lewat korpus ±sebulan sekali, paragraf dulu. Editor pertama: Anas, gelar tampil "Ust." (chat 2026-10-22). Rencana: `implementasi/sesi/X08-koreksi-terjemahan.md`. Tahap 1 = simpan koreksi (belum tampil di situs); tahap 2 = tayang lewat korpus (ADR terpisah).

**Keputusan:**
1. **Pemeriksa teks bersama** `validateTranslationText` di `@surau/core` (`translation-text.ts`), dipakai web dan ingest. `stripMarkers`, `hasArabicLetters`, `footnoteMarkerDigits`, `hasMarkdown` dipindah dari `packages/llm/src/check.ts` (diekspor ulang di sana untuk batch); web tetap tanpa `@surau/llm`. Aturan teks manusia: teks polos ≤8.000 karakter; placeholder ayat dibandingkan dengan **teks Arab** paragraf (`maskAyat`), masing-masing persis sebanyak di sumber; penanda catatan kaki berangka Arab-India hanya yang ada di Arab (paling banyak sebanyak di sumber; yang belum ada = peringatan, boleh dilengkapi; "(2)" berangka Latin = teks biasa); **semua karakter berskrip Arab** (bukan hanya huruf: juga ligatur hormat dan simbol seperti U+FDFD, U+FD40–U+FD4F, U+06DE; `hasArabicLetters` batch AI tetap hanya huruf supaya hasil batch lama tidak berubah status), tag `<…>`, Markdown (tebal, miring `*…*`/`_…_`, judul, butir, backtick), tautan `[…](…)`, dan karakter kontrol/arah teks **ditolak**; kurung siku `[…]` (kata tambahan) dan petik ganda wajib berpasangan, kecuali teks dasarnya pun tidak berpasangan (kutipan lintas paragraf) = peringatan; petik tunggal (Mu'adz) tidak diperiksa.
2. **Tabel `translation_revision`** (DB app, migrasi 0006, bukan korpus blue-green): setiap simpanan = baris baru (`confirmed` / `revised` / `reverted`), satu-satunya UPDATE = `active` → `superseded`. Indeks unik parsial = paling banyak satu revisi aktif per paragraf; **pemicu `BEFORE UPDATE`** menolak perubahan apa pun selain `active` → `superseded` tanpa mengubah kolom lain (dijaga DB, bukan hanya kode). Simpan = satu batch D1 (transaksi): revisi aktif yang dilihat editor digantikan dan revisi baru disisipkan, atau tidak ada yang berubah (409 bila revisi aktif atau sha256 teks dasar sudah berbeda, atau ID revisi aktif yang dikirim milik paragraf lain; diuji juga di D1 staging sungguhan). Kolom: teks (perbaikan saja), alasan (wajib untuk perbaikan), `base_sha256` (teks yang dilihat), `draft_sha256` (draf AI rantai), `source_sha256` (`text_raw` Arab), penulis = kunci akun (hash issuer+subjek Access) + nama pendek + nama lengkap + peran (`ustadz`/`editor`/`admin`) + izin nama di MCP, versi korpus, waktu. Status `proposed`/`approved`/`rejected` disiapkan untuk persetujuan dua orang (tidak dipakai, jawaban pemilik no. 3). Tidak ikut hapus fisik P-7 (riwayat koreksi kitab; satu baris di `/privasi`).
3. **Keadaan paragraf** (`stateOf`, core): draf AI → "sudah benar" (teks tetap draf AI, `text` NULL) atau perbaikan; teks dasar perbaikan berikutnya = revisi aktif terakhir (koreksi berantai sebelum korpus baru tidak memicu 409 palsu). "Sudah benar" hanya atas draf AI (bukan atas perbaikan orang lain, supaya label tidak menggabungkan dua nama) **yang lolos pemeriksaan teks manusia** (draf berhuruf Arab, placeholder hilang, atau ber-markup harus diperbaiki; penanda catatan kaki yang kurang tetap peringatan). **Batalkan** = mundur satu versi seperti riwayat urung (menekan lagi mundur lagi, bukan mengulang pembatalan); teks **dan label** ikut versi yang dipulihkan, kembali ke draf AI = tanpa nama, pembatal tidak pernah tampil sebagai pengoreksi. **Usang** dihitung, tidak disimpan: `source_sha256` ≠ teks Arab korpus sekarang (patch), atau draf AI yang dinyatakan benar sudah diganti; antrean menampilkannya di "Perlu ditinjau ulang".
4. **Editor terdaftar**: var Worker `TRANSLATION_EDITORS` (string berisi array JSON, pola `TAKHRIJ_USTADZ_KEYS`; string supaya tipe `cloudflare-env.d.ts` tetap `string` dan Preview tidak bergantung pada var objek): `{key, name, prefix?, suffix?, ustadz, mcp_name, also?}`. Gagal tertutup: JSON/entri rusak atau kunci ganda = tidak ada editor sama sekali; gelar depan ("Ust.") hanya untuk `ustadz: true`, gelar keulamaan (Ust., Ustadz, KH, Kiai, Syaikh, Habib, Buya) juga ditolak bila diselipkan di nama/gelar belakang akun bukan ustadz; nama pendek ≤80 dan lengkap ≤120 (= kolom DB app). Tes config memastikan nilai di `apps/web/wrangler.jsonc` (produksi + Preview) ter-parse utuh. Nama tampil hanya dari daftar ini, tidak pernah dari ketikan. Akun yang belum terdaftar melihat **kode akunnya** (hash, bukan email) untuk dikirim ke pemilik lewat jalurnya sendiri; pemilik meminta agent mendaftarkannya (PR + ADR, pola ADR-070). Nama: **pendek** = gelar depan + nama (label pembaca, "dikoreksi Ust. Anas"), **lengkap** = + gelar akademik (detail, riwayat, MCP, "Ust. Anas Lc."). Ini tafsiran atas contoh pemilik "dikoreksi Ust. Anas" / "diperiksa Ust. Anas Lc."; diubah cukup di satu entri.
5. **Peran ruang tinjau di server** (`canUseTinjauRoom`, `reviewRoomAllowed`): `/tinjau/terjemahan` + API hanya akun di `TRANSLATION_EDITORS` (403 `not_registered`, juga bila body mengetik nama editor). Ruang jawaban eval (`/tinjau`, `/api/review`, ekspor) dan label takhrij (`/tinjau/takhrij`): akun Access yang belum terdaftar tetap memakai akses lama (ADR-052/070); akun editor terdaftar hanya bila ruangnya tertulis di `also` (403 `forbidden_role`). Tanpa token = 401 di semua host. Satu orang yang juga peninjau takhrij: kuncinya ditulis di `TRANSLATION_EDITORS` (dengan `also`) **dan** `TAKHRIJ_USTADZ_KEYS` dalam satu PR; menyatukan keduanya butuh perubahan `apps/api` (di luar cakupan X08, tindak lanjut).
6. **API `/api/review/terjemahan`**: GET antrean (`filter` todo/done/stale, `offset`) atau satu paragraf (`ref` = ID, `p2824`, atau tautan pembaca); POST `confirm`/`revise`/`revert` dengan `base_sha256` + `active_id`. Origin persis, body ≤40 KB, skema ketat, teks divalidasi ulang terhadap teks Arab di server (422 + daftar masalah), 409 konflik/tidak berlaku, **429 bila simpanan ke-201 seorang editor dalam satu hari UTC** (dicek di dalam transaksi yang sama; pembatalan pemilik dari /admin tidak dihitung, karena kunci admin bisa sama dengan kunci editornya; UI menyebut hitungan mulai lagi pukul 07.00 WIB). Log hanya jenis aksi.
7. **Urutan antrean awal** (T-17 tahap 3 belum dinilai): (1) laporan pembaca jenis terjemahan yang belum selesai — kesalahan yang sudah dilihat orang; (2) paragraf yang dikutip Maknaz (jawaban eval publik + cache, tanpa holdout) — terjemahannya tampil di kartu kutipan; (3) paragraf badan urut kitab mulai Mukadimah dan Kitab al-'Ilm — bagian yang paling dulu dibaca dan dijadikan contoh di beranda; (4) catatan kaki takhrij — dibaca lebih jarang dan sudah punya antrean label sendiri (di korpus sekarang catatan kaki memang belum punya terjemahan AI, jadi praktis tidak muncul). Sinyal (1)–(2) disimpan 60 detik per isolate. Hasil T-17 tahap 3 (Salah lalu Kurang) masuk di depan setelah dinilai (`pnpm t17 hasil` belum menulis berkas). Judul daftar isi/subjudul (tabel `toc_title_translation`/`subheading_translation`, X04) bukan terjemahan paragraf: menyusul bersama koreksi ringkasan AI (jawaban pemilik no. 6).
8. **UI `/tinjau/terjemahan`**: teks Arab dari DB (hanya baca, kanan di layar lebar, pertama di ponsel), terjemahan sekarang dirender persis seperti pembaca (segmen ayat Kemenag verbatim, kutipan, penanda; kelas sendiri supaya pilihan "sembunyikan/lipat terjemahan" pembaca tidak menyembunyikannya), pemeriksaan otomatis teks sekarang, tombol Sudah benar / Perbaiki (textarea + petunjuk `⟦QS⟧`/`(١)`/`[…]` + pemeriksaan langsung + pratinjau + alasan wajib) / Batalkan (pratinjau versi yang dipulihkan), riwayat utuh. Textarea biasa; Tiptap tidak dipasang (§6 rencana).
9. **`/admin` → Koreksi terjemahan terbaru** (pengganti persetujuan kedua): jenis, nama lengkap, lokasi, alasan, diff kata (LCS, dilewati bila >1 juta sel), Batalkan satu revisi aktif, dan **batalkan semua koreksi satu editor sejak tanggal T** (≤100 paragraf per tekan, bahan dimuat sekaligus ≈ paragraf + 6 kueri D1; mundur melewati semua versi editor itu sejak T, termasuk versinya yang dipulihkan pembatalan orang lain; paragraf yang sesudahnya diubah editor lain dilewati dan dihitung, yang sudah dibatalkan pemilik tidak). Kedua tombol meminta konfirmasi. Galat daftar ini tidak menjatuhkan bagian lain `/admin` (sakelar Maknaz, biaya). Route `/api/admin/terjemahan` (AUD admin, Origin, ≤2 KB). Pembatalan pemilik tidak terkena batas harian.

**Peninjau:** 0 blocker, 7 penting (sudah benar atas draf tak sah, `/admin` jatuh bila daftar koreksi galat, simbol Arab non-huruf lolos, jumlah kueri batalkan massal, nilai config tanpa tes, butir "Selesai bila" tahap 1 belum terbukti, hitungan "dilewati"), 6 kecil, 7 saran; semua penting + kecil dikerjakan, dari saran: pemicu hanya-bertambah, pola gelar di nama, memo sinyal, konstanta panjang tunggal, catatan hari UTC, komentar diff.

**Verifikasi:** tes core (pemeriksa teks, daftar editor, peran, keadaan + batalkan + usang), D1 workerd (repo: berantai, konflik, batas harian, CHECK/UNIQUE, sinyal antrean), web di atas SQLite ber-migrasi repo (antrean, simpan, berantai, 409, batalkan memulihkan label, limit ke-201, usang, admin diff + batalkan + massal), route (401/403/409/422/429/413 dan peran lintas ruang). D1 **staging** (`surau-app-staging`, migrasi 0006 diterapkan): 3 revisi uji tersimpan lewat repository yang sama, konflik ditolak, lalu dibuang (0 baris tersisa). Pratinjau browser lokal (halaman sementara + D1 lokal, karena Access tidak bisa dilewati): simpan perbaikan, validasi langsung, batalkan, ponsel 375 px tanpa gulir samping, mode gelap. Pembaca tidak berubah: `<main>` j1/200 dari kode `main` dan kode tahap 1 identik byte demi byte (95.863 byte, D1 lokal yang sama). Biaya US$0.

**Tidak dipilih:**
- **Persetujuan dua orang sekarang:** pemilik menolak untuk saat ini; skema status disiapkan.
- **Nama editor di kode (seperti `TAKHRIJ_USTADZ_REVIEWERS`) atau diketik editor:** nama + gelar ikut kunci akun di satu entri, supaya nama tidak pernah bisa diklaim akun lain.
- **Var objek JSON:** didukung Wrangler, tetapi tipe `wrangler types` menjadi `object`/literal per isi dan perilaku di Preview belum terverifikasi.
- **Aplikasi Access terpisah untuk editor:** satu login (`Surau Tinjau`) lebih sederhana bagi ustadz; pemisahan peran cukup di server.
- **Overlay langsung di pembaca:** tetap ditolak (rencana §3; ISR, pencarian, MCP, dan Jawab akan berbeda teks).

**Konsekuensi:**
- Koreksi tersimpan tetapi **belum tampil** di situs sampai korpus berikutnya (tahap 2). Label pembaca tidak berubah di tahap ini, jadi belum ada klaim apa pun ke pembaca.
- Menambah editor = PR + ADR (kunci + nama + gelar + izin MCP), setelah persetujuan orangnya agar namanya tampil dicatat (T-26).
- Ruang jawaban eval tetap terbuka bagi semua akun Access yang belum terdaftar (perilaku lama); pengetatan penuh = daftar akun penilai jawaban (tindak lanjut bila penilai bertambah).

**Tinjau ulang bila:** editor bertambah (daftar di `/admin`?), persetujuan dua orang diminta, editor sering merusak placeholder (chip terkunci/Tiptap), atau batas 200/hari terasa sempit.

## ADR-082 · Koreksi terjemahan tahap 2 (X08): tayang lewat korpus — ekspor revisi (berkas lokal + R2 privat, metadata tanpa teks di git), ingest memvalidasi ulang + `translation_review` (skema 8), label bersama "Terjemahan AI · dikoreksi/diperiksa {nama}", `human_review` aditif di MCP, batch AI melewati paragraf berevisi — diterima · 2026-10-22

**Konteks:** ADR-081 menyimpan koreksi editor terdaftar di DB app tanpa menampilkannya. Pemilik memilih tayang lewat korpus ±sebulan sekali (jawaban no. 4), supaya pembaca, Cari, MCP, dan Maknaz selalu memakai teks yang sama (rencana X08 K1). Batas sesi: tanpa biaya LLM dan tanpa korpus baru; teks kitab dan turunannya tidak masuk git (aturan keras 3).

**Keputusan:**
1. **Ekspor** `pnpm review:export-terjemahan` (`tools/ingest/src/llm/revisions-cli.ts`): BACA `translation_revision` DB app (produksi; `--staging`/`--lokal` untuk uji), tentukan revisi berlaku per paragraf (revisi aktif; pembatalan → versi yang dipulihkannya; kembali ke draf AI = tidak diekspor; pembatalan pemilik tidak pernah menjadi sumber), tulis JSONL bertanggal ke `data/build/reviews/` (git-ignored) + salinan R2 privat `surau-revisi/terjemahan/<nama>` (bucket baru, akses publik mati; nama = cap waktu + awal sha256 isi, jadi tidak pernah menimpa isi lain), dan metadata `data/reviews/ihya-9472-revisi.json` (git): ID paragraf/revisi, jenis, sha256 teks/dasar/draf/Arab, nama tampil + peran + izin MCP, tanggal; **tanpa teks** (skema ketat menolak field teks; nama tanpa huruf Arab/karakter kontrol; tanpa izin nama hanya peran, bukan log aktivitas per orang). sha256 berkas ekspor di metadata. Ekspor uji (`--staging`/`--lokal`) menulis metadata yang sama tetapi ingest menolaknya kecuali `SURAU_REVISI_UJI=1`, dan tes repo menolak metadata uji ter-commit.
2. **Ingest** (`applyRevisions`, sesudah hasil batch AI dimuat): berkas ekspor wajib ada, sha256 sama dengan metadata, dan isinya menurunkan metadata yang sama persis (koreksi tidak bisa hilang atau berubah diam-diam); tanpa metadata = tanpa revisi. Setiap revisi divalidasi ulang terhadap baris korpus yang sedang dibangun: paragraf hilang, `text_raw` berubah, tanpa draf AI, teks perbaikan tidak lolos `validateTranslationText` dengan rujukan ayat terbaru dan draf AI sebagai dasar (sama dengan saat simpan: petik/kurung yang memang tidak berpasangan di draf cukup peringatan), atau "sudah benar" atas draf AI yang sudah diganti = **usang**: tidak dimuat, dihitung di invarian laporan validasi, tidak pernah ditulis balik ke DB app. Perbaikan manusia tetap menang walau draf AI di sekitarnya berubah (dicatat). Hasil: `translation.text` = perbaikan (indeks `translation_fts`, Jawab, MCP ikut), `review_status` = `ustadz_verified` (akun ustadz) / `reviewed` (editor lain), `model`/`prompt_version` tetap draf asal; asal tinjauan di tabel korpus baru `translation_review` (migrasi 0008, **skema 8**) termasuk draf AI yang digantikan (`ai_text`, hanya untuk ruang editor); `meta.revisions_sha256` + `revisions_count` (= revisi di berkas, deterministik untuk `corpus:qa`; yang dimuat/usang di laporan validasi). Invarian + smoke: status tinjauan manusia ada bila dan hanya bila baris asal tinjauannya ada; gelar ustadz tidak pernah untuk peran editor (Zod).
3. **Korpus lama tanpa cek skema:** status `reviewed`/`ustadz_verified` hanya ada di korpus skema ≥ 8, jadi `reviewersFor` (core) membaca `translation_review` hanya untuk baris yang berstatus itu. `ihya-v8` (skema 7) tidak pernah menjalankan kueri tambahan atau "no such table"; HTML pembaca j1/200, j1/49, j3/202 identik byte demi byte dengan `main`. Rollback ke `ihya-v8` (`--switch-only`) tetap sah (skema ≤ 8; smoke mencatat keterbatasan "belum punya tinjauan manusia").
4. **Tampilan, satu fungsi** `translationLabel` (web) untuk pembaca, kartu `/cari`, dan kartu kutipan Maknaz: "Terjemahan AI · dikoreksi Ust. Anas" / "… · diperiksa …" (asal AI tetap disebut). Di pembaca lencananya tombol yang membuka rincian nama lengkap + tanggal (popover HTML bawaan, tanpa JavaScript; `title` tidak terbaca di layar sentuh); awalan pembaca layar dan label salinan (`data-tr-label`) memakai teks yang sama. Kata tambahan `[…]` redup **hanya** pada teks perbaikan manusia (kurung siku tulisan AI tidak). Tanpa izin nama: peran saja ("dikoreksi ustadz"), di situs maupun MCP (lebih ketat dari rencana §4, yang membolehkan nama di situs saja; persetujuan dua tingkat menyusul bila diminta). Ruang editor membaca draf AI korpus skema 8 dari `ai_text`.
5. **Cache:** `SEARCH_RESULT_VERSION` naik ke 2 dan `PAGE_MODEL_VERSION` ke 4, supaya respons `/api/search` dan model `/api/halaman` lama (tanpa `human_review`, cache ≤7 hari, nama korpus sama) tidak disajikan ke komponen baru; `translationLabel` juga menganggap field yang tidak ada sebagai label AI biasa (kartu kutipan, cache 5 menit).
6. **MCP (aditif, ADR-049/050):** `translation.human_review` (`read_page`, `search_text`, juga dokumen kutipan): `{revised, reviewed_at, reviewer_role, reviewer_name|null, reviewer_short|null}` atau `null`; tanpa hash, email, atau draf. Satu objek nullable, bukan lima field datar, supaya hasil `search_text` tetap hemat token. Label tetap `ai_translation`. Instruksi server (aturan 4): sebut "AI translation, corrected by …", jangan "verified" atau fatwa.
7. **Batch AI** (`plan`/`submit`/`retry`) memakai unit kerja tanpa paragraf yang revisi manusianya **masih berlaku** terhadap baris korpus + draf AI lolos yang sumbernya sama (`protectedRevisions` → `withoutReviewed`): AI tidak menerjemahkan ulang terjemahan yang diperiksa/dikoreksi manusia; rencana lama yang memuatnya menjadi usang. Revisi usang (teks Arab di-patch, rujukan ayat berubah, draf ditolak/usang) tidak melindungi, supaya paragrafnya tidak pernah kehilangan terjemahan; perbaikan manusianya berlaku lagi di atas draf baru, "sudah benar" perlu ditinjau ulang. Revisi yang belum diekspor belum terlindung → ekspor dulu sebelum batch (README).
8. **Antrean ruang editor** urut baca (juz, halaman, jenis, urutan), bukan menurut ID.

**Peninjau:** 1 blocker (respons cache `/api/search` lama tanpa `human_review` membuat kartu `/cari` error selama ≤7 hari karena `SEARCH_RESULT_VERSION` tidak naik), 4 penting (validasi ingest tanpa dasar, paragraf bisa kehilangan terjemahan karena perlindungan batch menyertakan revisi usang, `corpus:qa` gagal karena `revisions_count`, metadata ekspor uji bisa masuk korpus produksi), 10 kecil, 3 saran; semua blocker/penting/kecil dikerjakan (termasuk lencana tanpa nama ganda untuk pembaca layar, panduan kurung siku AI, tes urutan baca), dari saran: nama → peran tanpa izin, catatan klien MCP ketat.

**Verifikasi:** tes db (asal tinjauan publik vs dengan draf, CHECK, gelar), core (readPage/search: teks perbaikan + `human_review`, tanpa izin = peran saja, tanpa hash/email/draf, korpus tanpa tinjauan tidak menyentuh `translation_review`), ingest (ekspor: aktif terakhir, pembatalan → yang dipulihkan, kembali ke AI tidak ikut; metadata tanpa teks; berkas hilang/hash/isi beda = gagal; usang per alasan; status per peran; invarian), web (label, lencana + popover, `[…]` redup hanya perbaikan, kartu kutipan), MCP (kontrak aditif + klien lama tetap jalan). **Ujung-ke-ujung lokal**: korpus `ihya-v8` dasar dibangun di worktree (skema 8) → 3 revisi lewat route + lib yang sama (2 perbaikan, 1 sudah benar; akun uji "Ust. Anas Lc.") → `review:export-terjemahan --lokal` → `pnpm ingest ihya` (3 dimuat, usang 0, `meta.revisions_sha256` = sha berkas) → `corpus:load:local` → pembaca j1/200 (teks perbaikan, label, popover, `[…]` redup; ponsel), `/api/search?q=<kata dari teks revisi>` (paragraf itu, status + `human_review`), `/cari`, MCP lokal `read_page` (sama, tanpa hash/email) → `eval:retrieval --gate` atas korpus uji = 31 soal hit@1 64,5% · hit@10 100% · MRR 0,795, sama dengan laporan `ihya-v6`/`ihya-v8`. Data uji tidak di-commit. Biaya US$0.

**Tidak dipilih:**
- **Overlay langsung dari DB app** (rencana §3): tetap ditolak (ISR, Cari, MCP, Jawab berbeda teks).
- **Kolom tambahan di `translation`** alih-alih tabel: tabel terpisah membuat kueri lama tetap sah di korpus skema 7 (tanpa cek skema) dan draf AI tidak ikut terbaca jalur publik.
- **Lima field datar di MCP:** ±30 token per hasil `search_text` untuk semua hasil yang belum ditinjau.
- Catatan kontrak: klien MCP yang memvalidasi keluaran dengan `outputSchema` lama secara ketat (`additionalProperties: false`) akan menolak field baru; klien yang membaca `outputSchema` terbaru atau mengabaikan field tambahan tetap jalan (ADR-049 sudah menyatakan keluaran boleh bertambah field).
- **Bucket `surau-evals`** untuk salinan ekspor: isinya berbeda tujuan; bucket sendiri lebih jelas aksesnya.

**Konsekuensi:**
- Koreksi tampil sesudah korpus berikutnya (ekspor → ingest → promote atas izin). Sampai itu, label pembaca tidak berubah.
- Korpus berikutnya **skema 8**; muat ulang staging dengan `db:migrate:staging` sebelum `corpus:load:staging`.
- Dokumen Jawab tetap menyebut "Terjemahan AI (bisa keliru…)" juga untuk teks yang dikoreksi (rencana: tindak lanjut sesi Jawab).

**Tinjau ulang bila:** jeda tayang terasa terlalu lama (overlay), persetujuan nama hanya-situs diminta, editor bertambah banyak (daftar di `/admin`), atau koreksi ringkasan AI/judul daftar isi menyusul (jawaban pemilik no. 6).

## ADR-083 · Rapikan pembaca (X10): skrip preferensi mentah, baris aktif daftar isi = subjudul kurasi + cabang terbuka terkendali, kaki per halaman cetak (`PageFoot`), catatan AI menurut konten AI yang belum ditinjau manusia, rincian label lewat CSS anchor positioning — diterima · 2026-10-22

**Konteks:** utang kecil pembaca dari X04 (leluhur bagian aktif tidak dibuka di halaman sambungan, subjudul tidak disorot, catatan di kaki halaman menurut halaman pertama), X09 (preferensi pembaca bisa berkedip di ponsel lambat) dan X08 (rincian label "dikoreksi …" di tengah layar). Batas: $0 LLM, tanpa korpus baru, hanya `apps/web`.

**Keputusan:**
1. **Skrip preferensi pembaca mentah.** `READER_SCALE_SCRIPT` ditulis root layout sebagai `<script>` mentah di awal `<body>` (sesudah skrip kertas), bukan `<Script strategy="beforeInteractive">`, yang di App Router baru dijalankan runtime Next sesudah chunk JS terunduh (`self.__next_s`; ADR-079 poin 3). e2e memblokir semua chunk JS Next dan memeriksa atribut `<html>` (uji mutasi: dengan `<Script>` tes gagal).
2. **Baris aktif daftar isi = subjudul kurasi terakhir node aktif yang mulai di halaman ini atau sebelumnya** (`activeRowId`), selain itu node aktif. Aturannya sama dengan bagian aktif ("bagian terakhir yang tampil di halaman ini"); paragraf subjudul milik node itu sendiri. Hanya pohon TAMPILAN: breadcrumb, `<title>`, OG, judul ringkas, model halaman, dan MCP tetap memakai node. Server memakai baris yang sama untuk `pruneToc`, jadi cabang node aktif yang bersubjudul ikut terkirim (j3/202: 15 → 20 baris, +0,9 KB gzip; j1/200 tidak berubah).
3. **Cabang terbuka dikendalikan** (`expandedKeys` + `onExpandedChange` NavigationTree, React Aria 1.22.1): leluhur baris aktif ditambahkan setiap kali baris aktif **atau** jalurnya berubah (halaman sambungan, pindah ke saudara berleluhur sama, pohon ringkas → lengkap), lewat penyesuaian state saat render (bukan efek, tanpa satu cat dengan cabang tertutup); cabang lain tidak ditutup, dan cabang yang ditutup pembaca tetap tertutup selama baris aktif sama. Pemasangan ulang pohon (`key` ringkas/lengkap, X09) tidak diperlukan lagi.
4. **Kaki per halaman cetak** (`PageFoot`, dipakai halaman pertama dan halaman sambungan): atribusi ayat, catatan AI, dan catatan "perlu ditinjau" menurut isi halaman itu, tepat di bawah teksnya. Kaki halaman pertama tidak lagi berada di kaki artikel (letaknya sesudah semua halaman sambungan); kaki artikel tinggal sumber + lisensi karya + tombol laporan. Dipilih per halaman (bukan satu kaki gabungan di akhir) supaya setiap halaman cetak membawa catatannya sendiri, seperti atribusi ayat sejak X04; harganya satu kalimat kecil yang berulang di halaman sambungan berterjemahan. HTML `<main>` j1/200: hanya catatan AI yang pindah tempat (teks sama).
5. **Catatan AI menurut konten AI yang belum ditinjau manusia** (`PageModel.ai`: `translation` = terjemahan tampil tanpa `human_review`, `summary` = ringkasan AI, `reviewed` = ada terjemahan "dikoreksi/diperiksa", ADR-082). Catatan di awal teks hanya bila ada terjemahan AI yang belum ditinjau (kalimat khusus bila sebagian sudah ditinjau: "Terjemahan berlabel “Terjemahan AI” tanpa keterangan dikoreksi atau diperiksa …"); catatan kaki halaman memilih kalimat sesuai isi (ringkasan saja, campuran, atau kalimat lama bila belum ada tinjauan). Lencana per paragraf tetap menyebut asal AI (aturan 8). Terjemahan `rejected` (tidak tampil) tidak lagi memicu catatan. Selama korpus belum punya tinjauan manusia, teks yang tampil sama dengan sebelum X10. `PAGE_MODEL_VERSION` 4 → 5.
6. **Rincian label tinjauan berjangkar** ke lencananya dengan CSS anchor positioning di dalam `@supports (position-area: bottom) and (position-try-fallbacks: flip-block)`: anchor implisit dari tombol `popovertarget` (`position-anchor: auto`), `position-area: bottom` (dipusatkan pada lencana, dijepit `inset-inline: 1rem`), `flip-block` bila tidak muat di bawah. Didukung Chrome 133+, Safari 26+, Firefox 147+ (BCD 8.1.6); browser lain memakai posisi bawaan popover (tengah layar). Tetap popover HTML bawaan tanpa JavaScript. Celah yang diterima: Chrome 129–132 lolos `@supports` tetapi belum punya anchor implisit, jadi di sana popover jatuh ke pojok kiri atas (praktis tanpa pengguna; Chrome stabil Oktober 2026 = 155).
7. **Lencana tinjauan bernama teks yang terlihat** (WCAG 2.5.3 "label dalam nama", temuan axe saat popover terbuka): `aria-label` = rincian (X08) diganti `aria-describedby` → popover; nama aksesibel = teks lencana, rincian tetap dibacakan sebagai deskripsi walau popover tertutup.

**Peninjau:** 0 blocker, 4 perbaikan (cabang tidak dibuka lagi saat pindah ke saudara berleluhur sama; satu flag `anyAi` untuk dua kalimat berbeda; catatan halaman pertama menempel di bawah halaman sambungan terakhir; e2e belum menutup sheet ponsel sesudah gulir bersambung dan popover 375 px tanpa data), semuanya dikerjakan; dari saran: `<footer>` untuk kaki halaman sambungan, docstring `pruneToc`, celah Chrome 129–132 dan kasus `joinTranslations` dicatat.

**Verifikasi:** tes unit `activeRowId`, `PageModel.ai` (hanya ditinjau, campuran, ditolak, ringkasan saja), `PageFoot` (lima kalimat), lencana `aria-describedby`; e2e `reader-x10` (skrip mentah dengan JS Next diblokir; subjudul aktif j3/202 di panel + sheet; 3/201 → 3/202 membuka cabang, 3/203 menghormati cabang yang ditutup; 1/147 → 1/148 membuka lagi induk saudara; sheet ponsel sesudah gulir bersambung lewat aktivasi virtual; kaki j1/200 tanpa dan j1/201 dengan catatan tinjau; popover 375 px kiri/kanan/dekat dasar layar lewat markup sisipan, jadi berjalan di CI tanpa data tinjauan); axe 0 pelanggaran dengan popover terbuka (data uji lokal).

**Tidak dipilih:**
- `anchor-name` per lencana (gaya inline atau `:has(:popover-open)`): anchor implisit sudah ada di ketiga mesin; `position-area: bottom span-right` menyempitkan popover di lencana dekat tepi kanan (teruji 65 px).
- Menyorot subjudul menurut posisi gulir di dalam halaman: aturan per halaman cetak sudah sama dengan bagian aktif dan tidak butuh pengamat gulir baru.
- Satu kaki gabungan di akhir gulir bersambung: catatan halaman tertentu jadi tidak jelas milik halaman mana.
- Tombol daftar isi di kepala ringkas ponsel: di luar cakupan. Membuka sheet dari toolbar di atas halaman berarti menggulir kembali ke halaman pertama, jadi bagian aktif saat itu memang halaman pertama.

**Konsekuensi:**
- Model `/api/halaman` lama (cache ≤ 7 hari per data center) tidak dipakai komponen baru (versi 5).
- Kasus tepi yang diterima: judul terpotong (lanjutan kurasi) yang kedua potongannya ditinjau orang berbeda dirender dengan label AI biasa (`joinTranslations`), sementara catatan AI menghitung per paragraf. Belum terjadi; bila terjadi, hitung catatan dari label yang dirender.
- Di antara teks dua halaman kini ada kaki halaman; selama garis baca (30% tinggi layar) berada di kaki itu, halaman terbaca tetap halaman sebelumnya (kakinya memang milik halaman itu).

**Tinjau ulang bila:** pembaca meminta penyorotan subjudul menurut posisi gulir, ringkasan AI mendapat tinjauan manusia, atau statistik browser menunjukkan pengguna tanpa anchor positioning cukup banyak.

## ADR-084 · Navbar ringkas: judul halaman masuk ke navbar saat digulir (semua halaman), ikon Cari + menu ⋮ (tema Terang/Gelap/Sistem + aksi halaman) — diterima · 2026-10-22

**Konteks:** permintaan pemilik: perilaku kepala ringkas pembaca (judul "Kitab" bergeser keluar saat judul besar tergulir) dipakai di semua halaman, dan dua tombol kanan navbar (Cari ⌘K berteks + tombol tema) dirapikan. Pemilik memilih: ikon Cari tetap terlihat, tema masuk menu ⋮ dengan opsi Sistem, Tampilan pembaca ikut masuk menu ⋮, dan halaman kitab tidak berganti ke "Daftar isi" saat menggulir ke daftar isi.

**Keputusan:**
1. **Judul ringkas umum lewat `PageTitle`.** h1 diberi `data-page-title` dan `CompactTitle` (klien) mem-portal judul ke slot navbar yang sama dengan pembaca (`NavbarSlot`). Bawaan: isi judul bila teks biasa; `compactTitle={false}` mematikan (beranda: kalimat sambutan); tidak tampil bila sama dengan label menu (`/kitab`). Halaman kitab memakai `title_id` saja (judul Arab wajib lewat `ArabicInline`, jadi tanpa judul Indonesia tidak ada judul ringkas). Pengamat bersama `useUnderNavbar(selector)` (IntersectionObserver, inset 4rem) dipakai juga oleh pembaca; kelas CSS `.reader-compact` → `.navbar-compact`, animasi mengecil berlaku juga untuk `[data-page-title]`.
2. **Menu ⋮ (`HeaderMenu`, Popover).** Segment HeroUI Pro Terang/Gelap/Sistem atas `theme` next-themes (bukan `resolvedTheme`, supaya "Sistem" bisa dipilih); kertas sepia (panel Tampilan pembaca) tidak punya pilihan di sini, jadi tidak ada yang tersorot. Halaman menambah aksi lewat `useHeaderMenuAction` (konteks, didaftarkan selama komponen terpasang); pembaca mendaftarkan "Tampilan", yang membuka Sheet `ReaderStyle` terkendali (`isOpen`/`onOpenChange`, tanpa tombol sendiri). Ikon Tampilan di kepala ringkas pembaca dihapus; tombol Tampilan di toolbar halaman tetap. `ThemeSwitch` dihapus.
3. **Cari jadi ikon saja** dengan `aria-label` "Cari", `aria-keyshortcuts`, dan tooltip berisi pintasan ⌘K/Ctrl K.
4. **Tanpa garis bawah navbar saat digulir.** Sempat dibuat (0,5px `var(--border)`), lalu dihapus atas permintaan pemilik: navbar tetap menyatu dengan latar.

**Tidak dipilih:**
- Cari di dalam menu ⋮: Cari jauh lebih sering dipakai daripada ganti tema; dua ketukan dan kurang terlihat.
- Navbar berganti ke "Daftar isi" saat menggulir ke daftar isi kitab: nama kitab hilang dari konteks dan satu guliran mengganti judul tiga kali; judul "Daftar isi" sudah terlihat di halaman.

**Verifikasi:** `pnpm check` lolos; `pnpm test` lolos (808 + 387). Browser lokal (fixture buatan `packages/db/test/fixture.ts` di D1 lokal, korpus asli tidak ada di mesin ini), ponsel 375 px dan desktop: `/kitab/ihya` "Kitab" → "Ihya' 'Ulum ad-Din", `/tentang` "Tentang" → "Tentang Surau", ⋮ membuka segment dan ganti tema tersimpan, di pembaca ⋮ → Tampilan membuka panel "Tampilan baca", posisi gulir tidak berubah saat menu dibuka. e2e Playwright belum dijalankan (butuh korpus lokal).

**Tinjau ulang bila:** halaman baru butuh aksi lain di menu ⋮, atau pembaca ingin sepia dipilih dari navbar.

## ADR-085 · Mockup buku tunggal seperti hardcover: papan sampul di sisi halaman, sampul menjorok, bayangan lantai, pratinjau `/dev/buku` — diterima · 2026-10-22

**Konteks:** permintaan pemilik: saat sampul kitab di-hover, sisi kiri (tebal halaman, kitab Arab) tampak abu-abu di ujung belakang; ujung itu harus berwarna sampul dan kertas tetap putih. Lanjutannya pemilik memilih tiga tambahan: papan sampul di kedua sisi + sampul menjorok, bayangan lantai, dan halaman pratinjau.

**Keputusan:**
1. **Hanya buku tunggal bersampul warna** (`.book:not(.book-ring .book) .book__rotate[data-color]`): rak `BookRing` (carousel beranda) punya sisi kertas, cahaya, dan bayangannya sendiri, jadi tidak diubah.
2. **Sisi halaman = papan belakang + kertas + papan depan.** Sisi halaman setinggi buku; pita warna sampul 16% (papan belakang, lebih tebal karena sampul depan sudah terlihat) dan 7% (papan depan) dengan garis gelap 1% sebagai batas; blok kertas putih di antaranya lebih pendek dari sampul sebesar `--book-square` (1,8% lebar buku) di atas dan bawah. Papan belakang di 0% sisi halaman untuk rtl dan 100% untuk ltr (rotateY sisi halaman berlawanan). Garis tekstur kertas dibuat halus (0,97/0,92) supaya kertas terbaca putih.
3. **Sampul belakang** ikut warna sampul (sebelumnya `var(--default)` untuk varian stripe); abu-abu hanya untuk buku tanpa warna.
4. **Bayangan lantai** (`.book::after`, elips buram di bawah buku): saat hover/fokus bergeser ke arah putaran, melebar, dan memudar; mati gerak bila "kurangi gerakan".
5. **Pratinjau `/dev/buku`** (404 di produksi, noindex): semua variasi dalam pose terkunci lewat atribut pembungkus `data-book-lifted` (pose hover) dan `data-book-turn` + `--book-turn` (sudut bebas), judul Arab dari DB lokal. Warna sampul rak dipindah ke `cover-colors.ts` supaya dipakai rak dan pratinjau.

**Verifikasi:** `pnpm check` lolos; tes web 45 berkas lolos. Browser lokal (fixture buatan): `/kitab/ihya` hover sungguhan (pita hijau + kertas putih), `/dev/buku` (diam, hover, sisi 65°, belakang 180°, 5 warna, rtl/ltr, 4 ukuran, tanpa warna), rak beranda tidak berubah (sisi kertas lama, tanpa bayangan tambahan).

**Tinjau ulang bila:** rak `BookRing` ingin memakai papan sampul yang sama, atau ada tes screenshot pose terkunci (ide lanjutan).

## ADR-086 · Beranda fokus cari: rak kitab → sambutan → satu kotak cari (Cari/Maknaz) → prinsip; pertanyaan Maknaz dititipkan di memori tab dan kotak "menjadi" gelembung lewat React `<ViewTransition>` — diterima · 2026-10-23

**Konteks:** permintaan pemilik: Beranda yang bersih dan langsung fokus pada cari + jelajah. Peta pembangunan dihapus; di tengah: rak kitab melingkar, judul + deskripsi sederhana, widget dengan pemilih sumber di kiri dan segmen Cari / cari dengan AI di kanan, kotak masukan di bawahnya (satu kotak untuk keduanya), transisi halus ke gelembung AI, lalu tiga prinsip. Pemilik menyetujui pilihan bawaan agent (chat 2026-10-23): segmen Maknaz mengikuti status Maknaz, pemilih sumber diam selama baru ada satu kitab, judul/deskripsi usulan pertama, dibangun di atas cabang `ui/navbar-ringkas-buku`.

**Keputusan:**
1. **Susunan Beranda:** rak `WorkShelf` (ruang atas panggungnya dipotong `-mt-6 sm:-mt-14` supaya kotak cari masuk layar pertama: desktop 1280×800 sampai contoh, ponsel 375×667 sampai kotak), judul berupa pertanyaan "Apa yang ingin Anda kaji?" tanpa deskripsi (pola Grok/Claude/Perplexity; janji "setiap hasil beralamat" dibawa bagian prinsip), `HomeSearch`, `ContinueReading`, tiga prinsip. Dihapus: peta pembangunan, kartu Basmalah (demo tipografi Fase 0), tombol "Kenali Surau"/"Lihat kode sumber" (sudah ada di sidebar dan kaki).
2. **Satu kotak, dua cara (`HomeSearch`).** Widget HeroUI Pro: kepala = label sumber (kiri) + `Segment` Cari/Maknaz (kanan); isi = satu `PromptInput` (`dir="auto"`). Cari → `/cari?q=…` (spasi dirapatkan); contoh Cari berupa tautan langsung (tanpa biaya). Maknaz → contoh hanya mengisi kotak (kuota), kaki kotak memuat catatan fatwa + privasi seperti `/tanya`, sisa kuota dan alasan mati (anggaran, kuota, dimatikan) dari status Jawab yang **baru dimuat saat Maknaz dipilih** (bukan di setiap kunjungan Beranda). `loadStatus` dipindah ke `lib/tanya/status.ts` (`loadJawabStatus`, `jawabUnavailable`) dan dipakai bersama.
3. **Segmen Maknaz hanya bila rute Jawab menyala** (`JAWAB_ROUTE_ENABLED === "1"` atau `next dev`): produksi menampilkan kotak Cari saja sampai `/rilis 4`; Preview PR (Jawab staging menyala) menampilkan keduanya.
4. **Pemilih kitab = `Autocomplete` HeroUI v3** (`SourcePicker`: Select `selectionMode="multiple"` + `SearchField` di popover lewat `Autocomplete.Filter`, `useFilter` `contains`; CSS `autocomplete.css` ditambahkan), atas permintaan pemilik walau korpus baru satu kitab. Kosong = "Semua kitab"; satu terpilih = judulnya; lebih = "N kitab". Daftar dari karya asli (`title_id`), bukan isian rak sementara. **Belum mengubah hasil**: API Cari hanya menerima `bagian` di dalam Ihya dan API Jawab tidak menerima batas sumber; dengan satu kitab semua pilihan sama hasilnya. Filter per kitab di API Cari/Jawab dibangun saat kitab kedua masuk (Jawab: perubahan pipeline + eval berbayar, butuh izin pemilik). Sempat diusulkan sebagai label diam; pemilik memilih pemilih sungguhan.
5. **Serah-terima pertanyaan ke `/tanya` di memori tab** (`lib/tanya/handoff.ts`, variabel modul, kedaluwarsa 10 dtk): bukan `?q=` (muat ulang/bagikan tautan akan bertanya lagi = kuota) dan bukan storage (riwayat Maknaz hanya di memori tab, ADR-073). `TanyaClient` membaca titipan di penginisialisasi `useState` (`peekHandOff`: satu-satunya tempat umur diperiksa) sehingga giliran pertama ada di render pertama, lalu mengirim sekali di efek (`takeHandOff` mengosongkan titipan tanpa memeriksa umur lagi, supaya giliran yang sudah tampil tidak macet "asking"; efek ganda StrictMode tidak bertanya dua kali). Bila status yang dimuat Beranda meminta Turnstile, titipan membawa `sitekey` dan giliran pertama dimulai di fase tantangan (tanpa POST yang pasti ditolak dan memakan jatah batas laju per-klien/global); status belum diketahui = server penentu (`challenge_required`). Titipan tidak disimpan/dibaca di server (isolate Workers dipakai bersama lintas permintaan), dan dikosongkan saat `HomeSearch` dipasang (navigasi ke `/tanya` yang batal tidak membuat kunjungan berikutnya bertanya sendiri).
6. **Transisi bersama dengan React `<ViewTransition>`** (React 19.3 + Next 16.4, tanpa konfigurasi; docs `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`): `name="pertanyaan-beranda"`, `share="pertanyaan"`, `default="none"` di `PromptInput.Shell` Beranda dan di gelembung pertanyaan titipan (hanya gelembung itu yang dibungkus). Navigasi ke `/cari` tidak berpasangan → diam. `router.prefetch("/tanya")` saat Maknaz dipilih supaya tujuan tampil di komit yang sama (syarat pasangan terbentuk). CSS: grup 0,5 dtk, kabur 2px di tengah; `prefers-reduced-motion` mematikan semua animasi view transition (transisi yang dijalankan React tidak memeriksanya sendiri). Peralihan hilal→orb di `/tanya` (ADR-073) tetap `document.startViewTransition` manual.

7. **Rapikan sesudah dilihat pemilik:** pemilih kitab memakai varian bawaan Autocomplete (kolom berlatar, bukan `secondary` yang terbaca seperti teks polos); contoh berupa chip `sm` (`chipVariants`, tautan untuk Cari, tombol React Aria untuk Maknaz); kaki komposer Beranda dan `/tanya` diringkas jadi "Bukan fatwa. Jangan tulis data pribadi. Privasi" (`tanyaText.footer`), catatan lengkap tetap di info Maknaz dan `/privasi`. **Bagian catatan diganti ADR-090** (satu `MaknazNotice` dengan label tetap S21).
8. **Batas panjang per mode:** Cari 200 huruf (`SEARCH_MAX` = `SEARCH_QUERY_MAX`, dijaga tes; tidak diimpor dari `@surau/core` supaya inti tidak ikut JS klien), Maknaz 1000. Teks panjang dari mode Maknaz tetap ada saat pindah ke Cari, dengan petunjuk dan tombol kirim nonaktif. Saat Maknaz tidak tersedia, kaki kotak memberi tombol "Pakai Cari" yang memindahkan segmen dengan teks yang sama.
9. **Tiga prinsip dirapikan:** judul tengah + satu kalimat pembuka, kartu bernomor (01–03, nama "Prinsip n" untuk pembaca layar) dalam `<ol>`, ilustrasi di panel `bg-surface-secondary` bertepi lembut (ruang kosong ilustrasi terbaca sebagai bingkai), judul kartu `text-base`. Selektor e2e ilustrasi ikut (`section[aria-labelledby="judul-prinsip"] iframe`).

**Tidak dipilih:**
- Maknaz menyatu di Beranda (Beranda berubah jadi percakapan di tempat): alamat dan riwayat bercampur dengan halaman utama, dan `/tanya` sudah punya tata letak setinggi layar.
- Segmen Maknaz tampil nonaktif "segera" di produksi: kontrol nonaktif tidak bisa dipakai dan tidak menjelaskan apa-apa; sidebar sudah menandai "segera".
- `PromptSuggestion` Pro untuk contoh: butuh CSS tambahan dan bentuk kartu; tombol bulat sama dengan contoh di `/tanya`.

**Verifikasi:** `pnpm check` dan `pnpm test` (lihat log sesi); tes baru `handoff.test.ts` (ambil sekali, kedaluwarsa) dan `home-search.test.tsx` (tanpa Maknaz tanpa segmen, contoh Arab lewat `ArabicInline`, contoh Cari bertaut). Browser lokal (fixture buatan, Chrome sistem + Firefox Playwright; API Jawab lokal tidak berjalan sehingga balasan = galat 503 yang wajar): desktop 1280×800 dan ponsel 375×667, terang dan gelap; Cari "الصبر" → `/cari?q=الصبر`, kotak `direction: rtl`; Maknaz → `/tanya` dengan gelembung pertanyaan, satu `startViewTransition`, pseudo `::view-transition-group(pertanyaan-beranda)` dengan keyframe 660×112 (kotak) → 282×44 (gelembung); muat ulang `/tanya` tidak bertanya lagi. e2e lokal (Chrome sistem): smoke Beranda (judul, teks Arab, kotak cari → Cari, Tentang, menu samping, ilustrasi prinsip) + axe `/`, `/tentang`, `/tanya` terang/gelap, desktop + ponsel: 24 lolos. e2e baru `beranda-maknaz.spec.ts` memalsukan `/api/jawab` di browser (`page.route`, tidak ada permintaan ke server = tanpa LLM berbayar di Preview; dilewati bila segmen Maknaz tidak ada): tepat satu POST, alamat tanpa query, muat ulang tidak mengirim lagi; dengan tantangan: fase Turnstile, 0 POST. e2e lokal sesudah perubahan pemilih kitab + prinsip: 28 lolos (smoke Beranda, Maknaz dari Beranda, axe `/`, `/tentang`, `/tanya` terang/gelap, desktop + ponsel). `pnpm test` lokal: semua lolos kecuali 4 tes `packages/core/test/local/ihya.test.ts` yang membaca D1 lokal; D1 lokal berisi fixture buatan (korpus Ihya tidak ada di mesin ini), tidak terkait perubahan ini.

**Peninjau:** 0 blocker, 4 perbaikan dikerjakan (titipan kedaluwarsa di antara render dan efek membuat giliran macet; titipan mengabaikan status tantangan → POST sia-sia; batas 1000 huruf di mode Cari; tes alur kuota) beserta saran: titipan dikosongkan saat kembali ke Beranda, penjaga server di modul titipan, tombol "Pakai Cari" yang mempertahankan teks, kelompok contoh bernama, `getEnv()` kembali di dalam `try` (gagal = Beranda tanpa rak/pemilih/Maknaz, bukan 500). Belum: ukur LCP/JS Beranda (PromptInput, Segment, Widget, Autocomplete kini di JS klien) sebelum `/rilis 4`; titipan kedaluwarsa masih dibuang, bukan mengisi komposer.

**Tinjau ulang bila:** kitab kedua masuk (pemilih sumber + filter API), `/rilis 4` membuka Maknaz (cek kuota/Turnstile dari Beranda di produksi), atau pemilik ingin mode terakhir diingat.

## ADR-087 · Halaman Cari memakai kotak Beranda: `SearchBox` bersama, pemilih bagian kitab bertingkat (pilihan tunggal) menggantikan dinding chip, jembatan "Tanyakan … ke Maknaz" di hasil — diterima · 2026-10-24

**Konteks:** sesudah Beranda baru (ADR-086), halaman Cari masih memakai kolom cari lama, kepala halaman berat (judul + dua baris penjelasan teknis), dan filter "Bagian kitab" berupa deretan chip rub' + NativeSelect kitab yang mendorong kotak dan hasil jauh ke bawah di ponsel. Agent mengusulkan enam perbaikan; pemilik memilih paket 1–3 (chat 2026-10-23: "ya").

**Keputusan:**
1. **Satu komponen `SearchBox`** (`components/search/search-box.tsx`, dipindah dari `home/home-search.tsx`) untuk Beranda dan /cari: pemilih sumber, segmen Cari/Maknaz, PromptInput, contoh chip. Di /cari kotak dan pemilih mengikuti URL (`query`, `section`, disetel saat render seperti sebelumnya: kembali/maju, contoh, palet ⌘K), dan mengganti bagian langsung menjalankan pencarian. Contoh membawa bagian terpilih. **Jalur tanpa JS dipertahankan** (#76): kotak dibungkus formulir GET `action="/cari"`, textarea `name="q"`, tombol kirim `type="submit"` yang aktif sebelum hidrasi, input tersembunyi `bagian`; dengan JS formulir di-`preventDefault` dan kiriman lewat PromptInput.
2. **Pemilih bagian kitab bertingkat** (`SourcePicker`, Autocomplete HeroUI + kolom cari): pilihan teratas = judul kitab satu-satunya (sama dengan semua kitab; "Semua kitab" bila kelak lebih dari satu), lalu rub' dan kitab di dalamnya (indentasi), judul Arab dari DB lewat `ArabicInline`, dicari dengan huruf Arab (`textValue` = judul Arab). Dinding chip rub' dan NativeSelect kitab dihapus. **Menyimpang dari ADR-086 butir 4 (multi-pilih):** pilihan kini tunggal karena API Cari hanya menerima satu `bagian`; multi-pilih butuh perubahan kueri inti (`packages/core`) dan tesnya. Beranda kini ikut memuat daftar bagian (`loadSearchSections`, satu kueri daftar isi kedalaman 2) supaya pemilih sama di kedua halaman.
3. **Jembatan Cari → Maknaz** (`AskMaknaz`, hanya bila rute Jawab menyala): di atas daftar hasil dan di bawah keadaan tanpa hasil, tombol "Tanyakan “q” ke Maknaz" dengan satu kalimat penjelasan. Saat ditekan status Jawab dimuat dulu (mati/kuota/anggaran = pesan di tempat; tantangan = sitekey dititipkan), lalu pertanyaan `askQuestion(q)` ("Apa yang dikatakan kitab tentang q?", kalimat buatan kode, bukan teks Arab) dititipkan di memori tab (ADR-086 butir 5) dan pindah ke /tanya. Saklar tampilan Maknaz dipusatkan di `lib/jawab-flag.ts` (`jawabRouteOn`).
4. **Kepala /cari lebih ringan:** pembuka satu kalimat ("Kata Indonesia dicari di terjemahan dan ringkasan AI, kata Arab di teks aslinya.") berukuran `text-base`. Judul halaman tetap `PageTitle` (skala sama dengan halaman lain). Kepala kotak tidak lagi membungkus di ponsel: segmen `shrink-0`, judul pemilih dipotong.
5. **Galat hidrasi lama diperbaiki:** daftar saran "Tidak ada hasil" (`<ul>`) dipindah dari `EmptyState.Description` (`<p>`) ke `EmptyState.Content`.

6. **Di mode Maknaz pemilih bagian disembunyikan:** Jawab belum menerima batas bagian, jadi pemilih tidak boleh terkesan membatasi jawaban (dan di /cari tidak menjalankan Cari saat pengguna di mode Maknaz). Bagian dari URL yang tidak dikenal (ID lama/salah ketik) diabaikan, sehingga pemilih dan penyaring yang dikirim selalu sama. Bagian selalu milik `SEARCH_WORK` (Ihya): dengan lebih dari satu karya, daftar per karya perlu dibangun.

**Tidak dipilih (kali ini):** kepala hasil yang menempel saat digulir, riwayat pencarian di perangkat, dan pengelompokan/lipat terjemahan di kartu hasil (ide 4–6 usulan agent): menyusul; kartu hasil perlu dilihat dengan korpus asli dulu.

**Verifikasi:** `pnpm check` lolos; tes unit web lolos (226). Browser lokal (fixture buatan; API Cari lokal menolak versi data fixture, jadi hasil kosong dipalsukan dengan `page.route`): /cari desktop 1280×800 dan ponsel 375 px, pemilih bertingkat terbuka dengan kolom cari, memilih bagian → `?bagian=700003`, lalu kirim "sabar" → `?q=sabar&bagian=700003`, jembatan Maknaz tampil, konsol tanpa galat (sebelumnya galat hidrasi `<ul>` di `<p>`). e2e lokal (Chrome sistem, 2 worker): smoke Beranda, Beranda → Maknaz, Cari → Maknaz (satu POST ke `/api/jawab` palsu), axe `/`, `/cari`, `/tanya` terang/gelap, desktop + ponsel: 26 lolos. Tes unit baru: jalur tanpa JS (input `bagian`, tombol submit aktif di render server, `maxLength` 200) dan bagian tak dikenal diabaikan.

**Peninjau:** 0 blocker, 4 perbaikan dikerjakan: gagal memuat bagian kitab tidak lagi menghapus rak dan Maknaz di Beranda (`.catch` sendiri, `ask` di luar `try`); pemilih disembunyikan di mode Maknaz; kata Arab di tombol jembatan lewat `ExampleText`/`ArabicInline`; `/tanya` di-prefetch saat jembatan tampil (titipan kedaluwarsa 10 dtk). Dari saran: bagian tak dikenal diabaikan, `findSection` diganti `selectedSection`, string filter lama dan `sourceCount` dihapus, tes jalur tanpa JS. Belum: hierarki rub' → kitab hanya visual untuk pembaca layar (`ListBox.Section` per rub'), spasi/baris baru `q` dari jalur tanpa JS tidak dirapikan di /cari. `e2e/search.spec.ts` (filter rub' lewat pemilih baru) butuh korpus asli: baru berjalan di Preview.

**Tinjau ulang bila:** kitab kedua masuk (pilihan "Semua kitab" + filter per karya di API), pemilik tetap ingin multi-pilih bagian (perubahan API), atau kartu hasil sudah dilihat dengan korpus asli (ide 6).

## ADR-088 · Menu Cari dihapus dari sidebar: kotak cari ada di Beranda, /cari = halaman hasil di bawah Beranda — diterima · 2026-10-24

**Konteks:** sesudah ADR-086/087 Beranda memuat kotak cari yang sama dengan /cari (pemilih kitab, Cari/Maknaz, Enter → hasil). Pemilik: menu "Cari" di sidebar tumpang tindih dengan Beranda dan ingin dihapus; agent setuju dengan tiga syarat, pemilik menjawab "ya".

**Keputusan:**
1. **Menu Cari dihapus** dari `NAV_ITEMS`. Sidebar: Beranda, Kitab, Maknaz, Pakai dengan AI (Tentang di kaki).
2. **/cari tetap ada** sebagai halaman hasil (tautan `/cari?q=…` yang sudah dibagikan tetap jalan, formulir tanpa JS, palet ⌘K).
3. **Di /cari Beranda yang tersorot** (`NavItem.also: ["/cari"]` di `findActiveNavItem`), tetapi judul navbar tetap "Cari" (`navTitle`, dipakai `SurauShell` dan `CompactTitle`), supaya pengguna tahu sedang di halaman hasil.
4. **Ikon cari di navbar (⌘K/Ctrl K) tetap**: jalan cepat mencari dari halaman mana pun tanpa kembali ke Beranda.

**Verifikasi:** `pnpm check` lolos; tes unit baru `nav-items.test.ts` (tanpa menu Cari, /cari menyorot Beranda berjudul "Cari", menu lain tetap). Browser lokal: /cari menyorot Beranda, navbar "Cari". e2e lokal "menu samping" (desktop + ponsel, diulang 2×) dan "panduan MCP" lolos; `openMenu` di tes kini mengulang ketukan sampai sheet terbuka dan tidak mengetuk lagi bila sudah terbuka.

**Tinjau ulang bila:** Maknaz dibuka untuk umum dan menu Maknaz terasa ganda dengan segmen di kotak Beranda.

## ADR-089 · `pnpm dev:remote`: dev lokal membaca korpus staging lewat remote binding D1 — diterima · 2026-10-24

**Konteks:** D1 lokal di mesin pengembangan berisi fixture buatan (korpus Ihya asli butuh drive Shamela, T-09), jadi hasil Cari, kartu hasil, dan pembaca tidak bisa dilihat dengan data asli secara lokal. `wrangler d1 export` tidak bisa mengekspor tabel virtual FTS5, jadi menyalin korpus remote ke lokal tidak praktis. Pemilik memilih opsi remote binding (chat 2026-10-24: "A").

**Keputusan:**
1. **`pnpm dev:remote`** (root dan `apps/web`, `SURAU_DEV_REMOTE=1 next dev`): `next.config.ts` membangkitkan `apps/web/wrangler.dev-remote.jsonc` dari `wrangler.jsonc` (satu sumber; hanya menambah `"remote": true` pada binding `CORPUS_DB`, gagal keras bila pola tidak ditemukan) dan memberikannya ke `initOpenNextCloudflareForDev({ configPath })`. Berkas turunan di-gitignore. `pnpm dev` tidak berubah (semua lokal).
2. **Korpus staging, bukan produksi:** dalam dev, D1 memakai `preview_database_id` (docs Wrangler configuration, "If provided, wrangler dev uses this ID"), yaitu `surau-corpus-staging` (= korpus Preview). Remote binding GA dan aktif bawaan di Wrangler 4.151 (`getPlatformProxy` `remoteBindings` bawaan true). Hanya korpus yang remote; `APP_DB`, R2, batas laju tetap lokal, jadi dev tidak menulis apa pun ke Cloudflare. Teks kitab tidak tersalin ke disk lokal maupun git.
3. **Syarat:** `pnpm wrangler login` (sudah di mesin ini). Kueri lebih lambat dari lokal (lewat jaringan).
4. **Tunggu sambungan remote sebelum melayani:** dalam mode ini `next.config.ts` mengekspor fungsi async yang menunggu `initOpenNextCloudflareForDev` (±6 dtk saat start). Tanpa itu permintaan pertama sesudah (re)start jatuh ke D1 lokal yang kosong (`no such table: work`, dilaporkan pemilik). `pnpm dev` biasa tetap mengekspor objek konfigurasi (tidak menunggu).

**Batas:** tes `packages/core/test/local/ihya.test.ts` dan `pnpm verify` lokal tetap membaca D1 lokal; untuk itu tetap perlu korpus lokal (T-09).

**Verifikasi:** `pnpm dev:remote` → `/api/search?q=الصبر` = 323 paragraf di 205 halaman (korpus staging); /cari?q=sabar menampilkan kartu hasil asli (71 halaman · 114 paragraf) desktop dan ponsel tanpa galat konsol; rak Beranda berjudul Arab asli dari DB. `.claude/launch.json` mendapat konfigurasi `web-remote`.

## ADR-090 · Halaman Maknaz (/tanya) sesudah Beranda baru: pembuka umum, satu catatan tetap yang berpindah, kotak berbentuk widget Beranda — diterima · 2026-10-24

**Konteks:** permintaan pemilik sesudah ADR-086/087: pembuka /tanya lebih ringkas dan tidak menyebut Ihya; dua catatan yang tumpang tindih ("Bukan fatwa · tiap pertanyaan dijawab terpisah" di atas dan "Bukan fatwa. Jangan tulis data pribadi. Privasi" di bawah kotak) diringkas jadi satu ("yang di atas, yang bawah kosong"); putih kotak /tanya berbeda kesan dengan Beranda; kotak dibuat seperti widget dengan kepala kitab. Peninjau akhir cabang menandai **blocker**: catatan atas hanya ada sebelum pertanyaan pertama, jadi label tetap S21 "Surau adalah asisten riset, bukan pemberi fatwa." (`implementasi/sesi/S21-ui-tanya.md`, docs/05 §2) hilang selama percakapan dan e2e `tanya.spec.ts` di Preview akan gagal.

**Keputusan:**
1. **Pembuka umum:** "Tanyakan isi kitab. Jawaban disusun AI dari teksnya, dan setiap kutipan Arab diperiksa kode."; placeholder "Tanya Maknaz tentang isi kitab…".
2. **Satu catatan tetap `MaknazNotice`** (label S21 + "Tiap pertanyaan dijawab terpisah; jangan tulis data pribadi." + tautan "Kebijakan privasi"), **satu yang terlihat pada satu waktu:** sebelum percakapan di atas (bersama ikon info), bagian bawah kosong (permintaan pemilik); sesudah giliran pertama catatan atas hilang, jadi catatan yang sama tampil di bawah kotak. Beranda mode Maknaz memakai catatan yang sama di bawah contoh (Maknaz tidak tersedia: pesan alasan + "Pakai Cari" sebagai gantinya). Kaki `PromptInput.Footer` /tanya tidak dipakai lagi. Ini menjaga kriteria S21 tanpa dua catatan sekaligus (aturan keras 5: kriteria tidak diubah).
3. **Kotak /tanya = widget Beranda:** `Widget` (radius 16px + 6px), kepala berisi **label** sumber jawaban (ikon buku + "Ihya' 'Ulum ad-Din", nama aksesibel "Sumber jawaban: …"), bukan pemilih: Jawab belum menerima batas kitab/bagian. Putih kotak sama dengan Beranda karena kini duduk di atas latar `surface-secondary` (nilai warna kotak memang sudah sama; yang berbeda latar sekitarnya). Judul sumber ditulis di i18n karena /tanya statis tanpa D1: perbarui saat kitab kedua masuk.

**Verifikasi:** `pnpm check` lolos; tes unit web lolos; browser lokal desktop + ponsel (/tanya awal: catatan atas + widget berkepala sumber).

**Tinjau ulang bila:** Jawab menerima batas sumber (label → pemilih sungguhan, butuh eval berbayar + izin pemilik) atau kitab kedua masuk.

## ADR-091 · Mode baca Arab · Keduanya · Terjemahan untuk seluruh situs (X11): satu preferensi `surau:read-mode` → `<html data-read-mode>`, bantuan terjemahan bertanda `data-tr-aid`, Cari dan Maknaz ikut mode tanpa menyembunyikan bukti, posisi baca dijaga — diterima · 2026-10-24

**Konteks:** pemilik bertanya (2026-10-24) apakah teks Arab dan terjemahan yang selalu tercampur perlu diperbaiki, karena pembaca bisa lebih suka salah satu atau keduanya; pemilik meminta solusi jangka panjang tanpa utang, karena bahasa Inggris menyusul dan pengalaman baca adalah fokus utama. Riset kode (`main` sesudah PR #124):
- pilihan tersebar: sakelar "Tampilkan terjemahan AI" (`data-translation="off"`) dan tata letak (`data-tr-layout`) yang terpisah;
- sakelar itu tidak menyembunyikan Ringkasan AI, judul Indonesia di daftar isi dan kepala halaman, maupun catatan AI di kaki halaman;
- tata letak Berdampingan mengabaikan sakelar dan meninggalkan separuh kolom kosong (juga untuk paragraf tanpa terjemahan); syair mengukur lebar seluruh kolom;
- kata cari Indonesia (`?q=`) tidak terlihat bila terjemahannya tersembunyi atau dilipat;
- kartu Cari dan kutipan Maknaz tidak mengikuti pilihan pembaca.

Jawaban pemilik (2026-10-24, pertanyaan pilihan): (1) mode Terjemahan boleh, dengan teks Arab tetap ada (dilipat per paragraf); (2) "bahasa Inggris" = situs berbahasa Inggris (ADR-092); (3) Cari dan Maknaz ikut mode, bukti tetap tampil; (4) dikerjakan sesudah PR #124.

**Keputusan:**
1. **Satu preferensi global** `surau:read-mode` (`ar` | `both` | `tr`), atribut `<html data-read-mode>` dipasang skrip awal (ADR-083); tanpa atribut = Keduanya (bawaan). Nilainya netral bahasa ("terjemahan" = terjemahan dalam bahasa situs). Sakelar lama `surau:reader-translation` dipindah sekali oleh skrip awal ("0" → `ar`, selain itu `both`; mode yang sudah tersimpan menang) lalu dihapus; cabang pemindahan boleh dihapus sesudah **2027-04-30**. Atribut `data-translation` dihapus.
2. **Mode Arab** menyembunyikan terjemahan paragraf dan semua bantuan terjemahan bertanda `data-tr-aid`: Ringkasan AI, catatan AI di awal teks, baris AI kaki halaman, judul Indonesia + catatannya di daftar isi, judul Indonesia di kepala halaman. Popover ayat (terjemahan Kemenag, bukan terjemahan AI) dan catatan kaki takhrij sama di semua mode; /tinjau tidak terpengaruh (`.translation-preview`).
3. **Tata letak** (Di bawah / Dilipat / Berdampingan) hanya berlaku di Keduanya. Berdampingan: paragraf tanpa terjemahan (`data-no-tr`) selebar penuh; syair mengukur lebarnya sendiri (`container: verse`, ambang `25.6em` = 36rem pada ukuran bawaan, ikut ukuran huruf).
4. **Teks tersembunyi yang dituju dibuka per paragraf** (`lib/reader/fold.ts`): kecocokan kata cari dan tautan `#…`. Di mode Arab terjemahan paragraf itu dibuka sementara (`data-tr-peek`) dengan tombol "Terjemahan AI" untuk menutupnya lagi; di Dilipat dibuka. Terjemahan judul (satu baris, tanpa tombol) ikut dibuka bila kata cari cocok di sana. ~~Batas yang diterima: ringkasan AI tidak disorot penyorot kata cari, jadi hasil Cari yang cocok hanya lewat ringkasan mendarat di halaman yang menyembunyikan ringkasan itu di mode Arab.~~ Batas ini dihapus oleh ADR-095 §2 (X14): Ringkasan AI ikut disorot dan dibuka sementara di mode Arab.
5. **Posisi baca dijaga** (`lib/keep-position.ts`): setiap perubahan preferensi (mode, ukuran, font, jarak, perataan, tata letak) dan pembukaan otomatis mengukur jangkar (paragraf pertama yang mulai di bawah navbar, atau paragraf terpotong bila tidak ada), menerapkan perubahan, lalu menggulir selisihnya di wadah gulir yang sebenarnya. Scroll anchoring browser dimatikan (`overflow-anchor: none`) selama dua frame penyesuaian: tanpa itu Chrome ikut mengoreksi sesudahnya (koreksi ganda, terukur ±270 px di uji lokal) bila jangkar pilihannya ikut tersembunyi.
6. **Kontrol:** Segment "Mode baca" (grup radio) di paling atas panel Tampilan dan di menu ⋮ navbar di bawah tema, hanya di halaman yang teksnya terpengaruh (pembaca, daftar isi karya yang berjudul Indonesia, Cari; didaftarkan halaman lewat `useHeaderMenuReadMode`). Label **Arab · Keduanya · Terjemahan** ("Arab + Terjemahan" tidak muat tiga tombol di menu 256 px). Panel: pratinjau Arab + terjemahan AI berlencana menurut mode; kontrol terjemahan yang tidak berlaku dinonaktifkan dengan keterangan, tidak disembunyikan; teks yang berganti menurut mode ditumpuk dalam satu sel grid (`StableText`), jadi tinggi panel tetap dan tepi atas lembar ponsel tidak bergeser di bawah jari (diukur 0 px). Kamus terpisah `i18n/id/readMode.ts` (shell tidak membawa kamus pembaca, ADR-079).
7. **Cari dan Maknaz ikut mode tanpa menyembunyikan bukti:** kartu Cari selalu menampilkan potongan Arab; di mode Arab terjemahan hanya tampil bila jalur terjemahan yang cocok (`hitParts`, satu-satunya alasan paragraf itu muncul); ringkasan bagian hanya ada bila jalurnya cocok, jadi selalu tampil. Kutipan Maknaz: Arab selalu tampil (bukti verifikasi); terjemahannya terbuka bawaan di mode Terjemahan (bagian B).
8. **Bahasa dari data:** `TranslationModel.lang` (`PAGE_MODEL_VERSION` 6), `summary.lang`, `TitleSource.lang`, `KutipanItem.translation.lang`; `lang` blok terjemahan, ringkasan, dan judul diambil dari situ. `<html lang>` dan tombol UI di dalam blok Arab memakai `UI_LANG` (`i18n/locale.ts`). Pemenggalan kata berkunci kelas, bukan `[lang="id"]`.
9. **Lencana AI pembaca satu komponen** (`components/reader/ai-badge.tsx`: paragraf, judul, kepala halaman). Teks label tetap satu sumber (`translationLabel`, ADR-082).
10. **Mode Terjemahan (bagian B, PR terpisah):** terjemahan sebagai teks utama tanpa garis tepi; teks Arab tiap paragraf yang punya terjemahan (`passage-ar`, bukan subjudulnya) dilipat di balik tombol "Teks Arab" di baris alat awal paragraf (urutan DOM = urutan tampil, WCAG 1.3.2; `data-ar-open`, satu pendengar klik); judul dan subjudul tidak pernah dilipat (Arab kecil redup di atas, terjemahan lebih besar); paragraf tanpa terjemahan menampilkan Arab dengan keterangan; ⋮ paragraf di baris alat dirender klien hanya di mode ini (`TrPassageActions`), jadi HTML server tidak bertambah; kalimat tambahan catatan AI hanya di mode ini (CSS). Hanya di layar: cetak menampilkan teks Arab. Kata cari Arab, tautan "kembali ke teks" catatan kaki, dan permalink paragraf `#pN` (sitasi, "Buka di pembaca") membuka Arab paragrafnya; penyorot memeriksa tiap kecocokan, bukan tiap blok. Kartu Cari menaruh terjemahan lebih dulu; kartu kutipan Maknaz membuka terjemahannya; menu ⋮ /tanya menampilkan Mode baca. Batas yang diterima: (a) subjudul yang menempel di *akhir* paragraf (`tail`) tampil di atas terjemahan teks yang mendahuluinya; (b) tombol lipat butuh JS, sama dengan Dilipat: bila JS gagal dimuat, teks Arab di mode Terjemahan tidak bisa dibuka di tempat (permalink dan salin sitasi tetap menunjuk paragrafnya); (c) di mode Terjemahan ukuran judul Arab disamakan (ornamen bab tetap membedakan tingkat).
11. **Penanda catatan kaki di terjemahan membuka takhrij di tempat** (`FootnoteMarker`, di semua mode), menggantikan tautan lompat ke daftar catatan kaki: di mode Terjemahan penanda Arab ikut terlipat, padahal teks-arab.md mensyaratkan penanda bisa diklik dan membuka takhrij di tempat. Nama aksesibelnya sama dengan penanda Arab ("Catatan kaki (n)").

**Menggantikan:** ADR-075 keputusan 4 kalimat "Arab saja tetap lewat sakelar terjemahan" (kini mode Arab); ADR-075 keputusan 1 kalimat "Kartu Cari dan kaki halaman tidak berubah" untuk kartu Cari; ADR-075 "Tidak dipilih: mode 'Indonesia saja'" (bagian B, atas keputusan pemilik; teks Arab tetap ada dan tetap rujukan).

**Tidak dipilih:** terjemahan saja tanpa teks Arab sama sekali (docs/01: Arab rujukan utama); mode lewat URL (memecah cache ISR, padahal mode adalah preferensi pembaca, bukan alamat); state React untuk tata letak pembaca (berkedip saat hidrasi; atribut + CSS bekerja tanpa JS); menyembunyikan kontrol yang tidak berlaku (lembar ponsel melompat); satu komponen label untuk semua permukaan (markup Cari dan Maknaz berbeda konteks; teksnya sudah satu).

**Konsekuensi:** HTML ISR tetap satu untuk semua pembaca (terjemahan selalu ada di HTML, CSS yang memilih), jadi mesin pencari dan salinan tidak berubah; `PAGE_MODEL_VERSION` 6 membatalkan cache `/api/halaman` lama; CellSwitch HeroUI tidak dipakai lagi (CSS-nya dihapus dari `globals.css`); e2e `reader-x11` + axe mode Arab.

**Tinjau ulang bila:** bahasa kedua masuk (ADR-092), ada akun/sinkron preferensi, atau data menunjukkan pembaca butuh mode per kitab.

## ADR-092 · Arsitektur bahasa: bahasa situs (locale) adalah dimensi URL, mode baca adalah preferensi pembaca; daftar bagian yang masih terkunci "id" untuk fase bahasa Inggris — diterima · 2026-10-24

**Konteks:** pemilik (2026-10-24): bahasa Inggris akan menyusul sebagai **situs berbahasa Inggris** (antarmuka, terjemahan kitab, dan nanti Maknaz) di alamat terpisah; alamat Indonesia tidak berubah; bahasa terjemahan ikut bahasa situs. ADR-057 §8 sudah menyebut rencana Indonesia, Inggris, dan Arab. Riset X11: tabel korpus yang menyimpan teks AI sudah berkunci `(…, lang)` (`translation`, `summary`, `toc_title_translation`, `subheading_translation`, `translation_review`) dan 313 ringkasan `en` sudah ada (tidak dibaca), tetapi lapisan core, web, LLM, Cari, Jawab, dan MCP terkunci ke "id".

**Keputusan:**
1. **Dua konsep terpisah.** *Bahasa situs* menentukan antarmuka, bahasa terjemahan/ringkasan/judul yang ditampilkan, bahasa jawaban Maknaz, sumber terjemahan ayat, dan jalur cari Latin; ditentukan oleh URL: `id` di alamat sekarang (permalink tetap, docs/01 prinsip 2), `en` di bawah `/en/…`. *Mode baca* (ADR-091) adalah preferensi pembaca di klien yang sama untuk semua bahasa.
2. **Tanpa proxy/middleware (ADR-003):** rute `/en` lewat segmen atau grup rute statis yang memakai halaman yang sama dengan bahasa sebagai parameter, atau `rewrites` di `next.config` — dipilih di sesi bahasa Inggris sesudah docs Next/OpenNext terbaru dibaca. HTML ISR satu per bahasa situs.
3. **Situs Arab** (ADR-057): antarmuka RTL; mode baca hanya Arab.
4. **Yang sudah netral bahasa sejak X11:** ADR-091 §8 (`lang` dari data, `UI_LANG`, nilai mode baca, CSS).
5. **Masih terkunci "id"** (diubah di fase bahasa Inggris; tidak ada yang dibangun sekarang):
   - konstanta `AI_TEXT_LANG` (`packages/db/src/repo/search.ts`), `TITLE_LANG` (`apps/web/src/lib/reader/reader-toc.ts`), `TRANSLATION_LANG` dan `TOC_TITLE_LANG` (`packages/llm`) → parameter `lang` di `readPage`, judul daftar isi, `searchText`, kutipan, dan tinjauan;
   - `translation_revision` (DB app) ber-`CHECK (lang = 'id')` → tabel dibangun ulang (data permanen + trigger hanya-tambah, butuh migrasi khusus);
   - FTS Latin per bahasa (`translation_fts`/`summary_fts` tanpa kolom bahasa, rowid = id paragraf), stemmer/stopword/ejaan Inggris, `LATIN_FTS_LANG`, dan deteksi bahasa kueri (kini setiap huruf Latin dianggap Indonesia);
   - kunci cache yang belum memuat bahasa: hasil Cari, `/api/halaman`, dan jawaban Jawab;
   - prompt `translate-passage` (gaya dan glosarium Indonesia), `translate-toc-title` (kunci keluaran `indonesia`), pemeriksa `check.ts` (kata Inggris dianggap komentar meta), CLI `pnpm llm` tanpa `--lang`, ingest `z.literal("id")`;
   - terjemahan ayat: Kemenag hanya Indonesia; bahasa Inggris butuh sumber terjemahan resmi berlisensi jelas (tugas pemilik), karena ayat tidak pernah diterjemahkan model (teks-arab.md aturan 9);
   - Maknaz: `jawabRequest` tanpa `lang`, prompt jawaban berbahasa Indonesia baku, kalimat baku yang diurai kode, eval dan tinjauan ustadz per bahasa;
   - UI: ±70 berkas mengimpor `i18n/id/*` langsung → pengambil kamus per bahasa; `I18nProvider locale`, formatter `id-ID`, `og:locale`, hreflang + sitemap;
   - MCP/API: parameter `lang` aditif (keluaran sudah membawa `lang`); deskripsi tool menyebut "Indonesian";
   - nama field `titleId` (judul Indonesia) di model daftar isi web.
6. docs/01 dan docs/07 mencatat rencana ini; "Bahasa Indonesia di semua lapisan" tetap berlaku untuk situs Indonesia. FASE: baris garis besar "Bahasa Inggris", belum dijadwalkan.

**Tidak dipilih:** memindahkan semua rute ke `app/[locale]` sekarang (belum ada terjemahan Inggris; tanpa proxy butuh rewrites yang menyentuh ISR/OpenNext, risiko LCP dan cache tanpa manfaat saat ini); bahasa terjemahan sebagai preferensi klien di samping mode baca (HTML ISR memuat satu bahasa; dua bahasa di HTML menambah berat halaman dan LCP).

**Tinjau ulang bila:** sesi bahasa Inggris dimulai (pilih mekanisme rute dengan docs terbaru), atau pemilik ingin terjemahan bahasa lain di situs Indonesia.

## ADR-093 · Pencarian makna untuk kandidat Jawab (X13): satu daftar RRF tambahan dari embedding `bge-m3` (k 20, bobot 2), diukur gratis dengan embedding lokal; kandidat naik tetapi lokasi jawaban eval berbayar tetap 85,3%, jadi produksi (Workers AI + Vectorize) ditunda — kode kait diterima, produksi ditunda · 2026-10-24

**Konteks:** Lokasi Jawab 85,3% (29/34, in-sample, X05) < 90% (R4). ADR-067 dan ADR-068 menyisakan j018, j019, j021 (topik tersebar; halaman gold tak terjangkau pencarian kata mana pun) dan j024 (takhrij gold tidak terambil). ADR-046 menunda embedding sampai eval membuktikan perlu, dan ADR-067 meminta ADR tersendiri bila pencarian makna dipertimbangkan lagi. Mesin pemilik sekarang (Linux) tidak menyimpan arsip diagnostik `evals/private/jawab-runs/` maupun korpus lokal lengkap, jadi uji gratis memakai korpus staging `ihya-v8` (hanya SELECT) tanpa rute routing tersimpan.

**Bedah j024 (gratis):** paragraf hadits 10000004 (j1 h2, 2.559 karakter terjemahan) memuat hadits itu di tengah teks dengan kata "orang berilmu yang tidak diberi manfaat oleh Allah", sedangkan pertanyaan memakai "orang alim … tidak mendapat manfaat"; catatan kaki takhrij 10000010 hanya berbahasa Arab (**0 dari 4.398 catatan kaki punya terjemahan**). Tanpa rute, daftar pertanyaan global tidak menemukan keduanya; yang menemukan takhrij adalah daftar bagian dari ringkasan AI (bagian 100001, peringkat 4), lalu paragraf haditsnya ikut lewat pasangan. Pada run X05 kemungkinan besar jalur ringkasan tidak berjalan karena rencana routing sudah 20 pencarian (ADR-067 butir 3); ini belum bisa dibuktikan di mesin ini (rute tersimpan ada di Mac pemilik).

**Pengukuran gratis** (`pnpm run eval:jawab kandidat --tanpa-rute --remote [--semantik …]`, 34 soal publik yang tidak wajib ditolak; "lengkap" = semua lokasi gold, dan untuk soal status hadits juga catatan kaki takhrij gold, ada di dokumen):
- Embedding lokal di CPU pemilik, di luar repo: `Xenova/bge-m3` ONNX q8 lewat `@huggingface/transformers` 4.3.1 (model sama dengan `@cf/baai/bge-m3`, presisi lebih rendah), CLS + normalisasi, ≤ 512 token per paragraf, teks = terjemahan AI bila ada, selain itu Arab (catatan kaki takhrij Arab). 20.509 paragraf, 66 menit, ±2,17 juta token. Peringkat 200 teratas per soal publik (cosine). Soal privat tidak di-embed.
- Peringkat makna saja (tanpa pencarian kata): halaman gold pertama di 10 teratas untuk 30/34 soal; j018 h55/h13 di peringkat 6 dan 16; j021 h272 di 8, tetapi h55 di 110; j019 h55 tidak ada di 200 teratas, h305 di 109; takhrij j024 di 109.

| Varian (tanpa rute) | Lengkap /34 | Belum lengkap |
|---|---:|---|
| Tanpa makna (baseline) | 26 | j016, j018, j019, j021, j023, j026, j028, j029 |
| Makna k 10/20/30/50, bobot 1 | 29 | j018, j019, j021, j023, j026 |
| Makna k 10, bobot 2 atau 3 | 29 | j018, j019, j021, j024, j026 |
| **Makna k 20 (atau 30/50), bobot 2 atau 3** | **30** | j019, j021, j024, j026 |

Token dokumen rata-rata 18,3 → 19,7 ribu (anggaran 20 ribu sama): biaya input jawaban naik ±7%, tetap di bawah pagu.

**Keputusan:**
1. **Kait di pipeline (diterima, aktif di kode, mati di produksi):** `semanticList` (`retrieve.ts`) membentuk satu `SearchList` `(makna)` dari peringkat embedding, `SEMANTIC_LIMIT` 20, `SEMANTIC_WEIGHT` 2, tidak dihitung ke `MAX_SEARCHES`. `jawabCandidates(…, semantic)` menambahkannya ke RRF; `JawabDeps.semanticSearch?(question)` menyediakannya di `runJawab`, galat = tanpa daftar makna (`diagnostics.semantic.error`), jawaban tetap berjalan. Tanpa sumber makna, daftar dan kandidat identik dengan sebelumnya (tes), jadi `JAWAB_PIPELINE_VERSION` tetap 7; versi naik saat Worker mulai mengisi `semanticSearch`. Saat itu juga: batas waktu di pipeline (bukan di pemanggil) dan ID dari indeks disaring per edisi (saran peninjau).
2. **Alat eval gratis:** `kandidat --tanpa-rute` (tanpa arsip), `kandidat --semantik PERINGKAT [--makna-k] [--makna-bobot]` (soal publik saja), `answer --semantik PERINGKAT` untuk run berbayar (soal privat hanya bersama `--termasuk-privat`; arsip berakhiran `+makna-berkas`, laporan menyatakannya). `docCoverage` kini menuntut catatan kaki takhrij gold untuk soal status hadits (rekomendasi X05): baseline tanpa rute turun dari "lengkap halaman" ke 26 karena j026, j028, j029 hanya terwakili halamannya.
3. **Rancangan produksi (diusulkan, menunggu izin biaya):**
   - Embedding `@cf/baai/bge-m3` (Workers AI, US$0,012 per juta token input; docs Cloudflare 2026-10-24) atas teks yang sama dengan uji lokal, sekali per versi korpus saat ingest, dari `tools/ingest` (REST Workers AI, bukan dari Worker publik). ±2,2 juta token = **±US$0,03 per bangun korpus**.
   - Indeks Vectorize per versi korpus (`surau-makna-<versi>`, 1.024 dimensi, cosine), ID vektor = ID paragraf, tanpa metadata teks (teks tetap dari D1; Vectorize hanya memilih ID). 20.509 × 1.024 = 21 juta dimensi tersimpan: kuota Workers Paid 10 juta + US$0,05 per 100 juta → **±US$0,006/bulan**; kueri (dimensi kueri + tersimpan) di bawah kuota 50 juta/bulan pada trafik sekarang.
   - Worker `surau-api` mengisi `semanticSearch`: embedding pertanyaan (±30 token, ±US$0,0000004) + `query` topK 20 tanpa nilai/metadata; batas waktu pendek, galat = pencarian kata saja. Promote korpus menukar indeks bersamaan dengan D1 (blue-green, ADR-036).
   - Kutipan tidak berubah: model tetap menyitasi dokumen dari D1, verifikasi teks Arab tetap ke DB (aturan teks-arab 1 dan 5).

**Tidak dipilih:**
- **Bobot 1:** 29/34, tetapi tidak menolong satu soal topik tersebar pun.
- **k 10:** j018 belum lengkap.
- **Embedding hanya teks Arab, atau dua vektor per paragraf (Arab + terjemahan):** belum diukur (satu varian lagi = ±1 jam CPU); ditunda sampai eval berbayar menunjukkan masih kurang.
- **Routing dua langkah dengan LLM:** tetap ditolak (ADR-067).
- **Mengubah gold j019/j021/j023:** di luar wewenang agent; T-24.

**Konsekuensi:**
- **In-sample:** k dan bobot dipilih dari 34 soal publik yang sama. Holdout tidak dipakai (soal privat tidak dibaca, tidak di-embed).
- **Basis berbeda dengan X03/X05:** uji ini tanpa rute (26 → 30), bukan dengan rute tersimpan (X03: 30,5). Dengan routing ada hingga 20 daftar lain, jadi bobot 2 bisa lebih lemah; eval berbayar dengan routing yang menentukan.
- **j024 kalah anggaran** saat daftar makna berbobot ≥ 2 (takhrij dari jalur ringkasan terdesak). Rancangan perbaikan berikutnya: bila soal menanyakan status hadits, catatan kaki takhrij juga dicari di embedding sebagai daftar tersendiri; belum dikerjakan.
- **j1 h55** adalah gold bersama j018, j019, j021 dan tetap tak terjangkau untuk j019/j021 oleh kata maupun makna. Ini tanda gold draf S18 perlu ditinjau (T-24), bukan bahan penyetelan lebih lanjut.
- Bila R4 lokasi ≥ 90% tercapai dengan pencarian makna, ADR-046 dianggap digantikan untuk Jawab; Cari tetap leksikal.

**Langkah berbayar yang menunggu izin pemilik (perintah di catatan X13):** (a) satu eval publik berbayar dengan `--semantik` (±US$0,12, pagu 0,30); (b) satu run holdout (±US$0,05, pagu 0,15); (c) embedding + indeks produksi (±US$0,03 + ±US$0,006/bulan) sesudah (a) lolos; kalibrasi judge tidak butuh biaya baru (lihat X13).

**Eval publik berbayar (izin pemilik di chat 2026-10-24: "Ya, saya izinkan eval publik X13 dengan pencarian makna, pagu US$0,30"):** `x13-publik-makna-v1`, 42 soal publik, pipeline penuh dengan routing, korpus staging `ihya-v8`, daftar makna dari berkas peringkat (`+makna-berkas`), tanpa holdout. Biaya **US$0,1171** (rerata US$0,0028/jawaban); laporan `evals/reports/jawab-x13-publik-makna-v1.md`.

| Run | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |
|---|---|---|---|---|---|---|
| X05 `x05-publik-jawaban-v1` (`ihya-v7`, tanpa makna) | 100% (176/176) | 85,3% (29/34) | 87,5% (7/8) | 100% (34/34) | 0% (0/6, metrik lama pencocokan string) | 100% |
| **X13 `x13-publik-makna-v1`** (`ihya-v8`, dengan makna) | **100% (148/148)** | **85,3% (29/34)** | **100% (8/8)** | 100% (34/34) | 83,3% (5/6) | 100% |

- Lokasi gagal tetap j018, j019, j021, j023, j024 (sama dengan X05).
- **Kandidat naik, jawaban tidak:** ulang gratis atas rute routing run ini (`kandidat --input …x13-publik-makna-v1-diagnostik-publik.jsonl --remote`): tanpa makna 29/34 (belum: j016, j018, j019, j021, j024) → dengan makna **31/34** (belum: j019, j021, j024). Jadi daftar makna membawa gold j016 dan j018 ke dokumen. j016 memang lolos lokasi; j018 tidak, karena jawaban hanya menyitasi paragraf sekitar j1 h55, tidak paragraf gold h13 (10000184) yang ada di dokumen (soal tahap jawaban, seperti j014/j020 di X05).
- j019 dan j021 tetap gagal karena j1 h55 (gold bersama), j023 karena gold h290 vs h292, j024 karena takhrij gold tidak terambil.

**Kesimpulan sesudah eval:** pencarian makna **tidak menaikkan lokasi jawaban** di set publik ini, walau menaikkan cakupan kandidat. Embedding + Vectorize produksi (langkah c) **tidak disarankan** sekarang: menambah token input ±7% dan satu layanan, tanpa kenaikan R4 yang terukur. Kait kode tetap (mati di Worker, tanpa biaya). Holdout (b) tidak dijalankan (izin pemilik hanya untuk a), dan baru bermakna sesudah perubahan yang menaikkan angka publik. Sisa jalan ke lokasi ≥ 90% ada di **tinjauan gold T-24** (j019, j021, j023 = 3 dari 5 kegagalan) serta tahap jawaban (j018) dan takhrij (j024).

**Tinjau ulang bila:** gold ditinjau Anas (T-24) dan lokasi masih < 90% karena soal yang tak terjangkau kata; korpus bertambah kitab (indeks per kitab, kuota Vectorize); atau Workers AI mengganti `bge-m3`.

## ADR-094 · Daftar makna takhrij untuk soal hadits (X13 lanjutan): catatan kaki terdekat (k 10) sebagai daftar RRF kedua, hanya bila routing menandai soal hadits; j018 diserahkan ke tinjauan gold — diterima (kode, mati di Worker) · 2026-10-24

**Konteks:** Sesudah eval berbayar X13 (ADR-093) lokasi tetap 85,3%. Dua dari lima kegagalan bukan masalah gold: j024 (takhrij gold tidak terambil) dan j018 (gold h13 ada di dokumen, tidak disitasi). Daftar makna ADR-093 menaruh takhrij j024 di peringkat 109 dari semua paragraf, karena catatan kaki pendek dan berbahasa Arab kalah oleh paragraf badan berterjemahan. Kueri routing Arab untuk j024 ("لا ينتفع بعلمه") memakai akar berbeda dari teks takhrij ("لم ينفعه الله بعلمه").

**Pengukuran gratis** (embedding lokal yang sama, `data/build/makna/`; peringkat baru `evals/jawab/makna/x13-bge-m3-q8-publik-v2.jsonl` = peringkat paragraf v1 persis + `footnote_ids` 50 catatan kaki teratas):
- Peringkat takhrij gold di antara catatan kaki saja (4.398): j024 5, j025 1, j026 10, j027 53, j028 9, j029 1 (di antara semua paragraf, j024 109).
- `kandidat --input x13-publik-makna-v1-diagnostik-publik.jsonl --remote` (rute routing eval berbayar X13): tanpa makna 29/34 · makna paragraf (ADR-093) 31/34 · **+ makna takhrij k 5/10/20: 32/34** (status hadits 6/6; belum: j019, j021). Token dokumen sama (±19,9 ribu).
- Tanpa rute (`--tanpa-rute`) tidak berubah (30/34): daftar takhrij hanya dipakai bila `route.hadith`.

**Keputusan:**
1. `semanticLists(route, semantic)` (murni, `retrieve.ts`): daftar makna paragraf (ADR-093), lalu daftar `(makna takhrij)` dari peringkat catatan kaki saja, `SEMANTIC_FOOTNOTE_LIMIT` 10, bobot sama (2), hanya bila routing menandai soal hadits. `JawabDeps.semanticSearch(question, { footnotes })` kini mengembalikan `{ passages, footnotes }`; `footnotes` hanya diminta untuk soal hadits (di produksi: satu kueri Vectorize tambahan dengan filter metadata `kind = foot`). Catatan kaki yang muncul di kedua daftar mendapat skor RRF dari keduanya (disengaja). Masih mati di Worker; `JAWAB_PIPELINE_VERSION` tetap 7.
2. Berkas peringkat boleh memuat `footnote_ids`; `kandidat --makna-takhrij-k N` untuk sapuan. `rank.mjs --korpus` menghasilkannya.
3. **j018 tidak disetel:** jawaban menyitasi bab tugas guru (j1 h55–57: kasih sayang kepada murid "dengan maksud menyelamatkan mereka", pengajaran "atas tujuan akhirat"), yang menjawab kedua sisi pertanyaan; gold menuntut juga j1 h13 (guru menyempurnakan hati). Mengubah prompt agar menyitasi lokasi kedua dirancang dari soal yang sama (in-sample) dan bisa menggelembungkan sitasi di soal lain. Diserahkan ke T-24 bersama j019, j021, j023.

**Konsekuensi:** in-sample (soal publik yang sama); efek nyata pada lokasi jawaban baru terlihat lewat eval berbayar. Bila j024 lolos, lokasi publik 30/34 (88,2%); sisa 4 kegagalan semuanya menunggu tinjauan gold (T-24). Produksi (Workers AI + Vectorize) tetap ditunda (ADR-093) sampai angka publik naik.

**Langkah berbayar yang menunggu izin:** eval publik atas rute X13 tersimpan + peringkat v2 (tanpa routing, ±US$0,11, pagu 0,30):
`pnpm run eval:jawab answer --run x13-publik-takhrij-v1 --remote --rute evals/private/jawab-runs/x13-publik-makna-v1-diagnostik-publik.jsonl --semantik evals/jawab/makna/x13-bge-m3-q8-publik-v2.jsonl --budget-usd 0.3 --confirm`

**Eval berbayar (izin pemilik di chat 2026-10-24: "Ya, saya izinkan eval X13 atas rute tersimpan dengan peringkat v2, pagu US$0,30"):** `x13-publik-takhrij-v1`, 42 soal publik, rute routing dari `x13-publik-makna-v1` (tanpa panggilan routing, `+rute-tersimpan`), peringkat v2 (`+makna-berkas`), staging `ihya-v8`, tanpa holdout. Biaya **US$0,1116** (US$0,0027/jawaban tanpa routing); laporan `evals/reports/jawab-x13-publik-takhrij-v1.md`.

| Run | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |
|---|---|---|---|---|---|---|
| `x13-publik-makna-v1` (ADR-093) | 100% (148/148) | 85,3% (29/34) | 100% (8/8) | 100% (34/34) | 83,3% (5/6) | 100% |
| **`x13-publik-takhrij-v1`** (ADR-094) | **100% (172/172)** | **88,2% (30/34)** | 87,5% (7/8) | 100% (34/34) | **100% (6/6)** | 100% |

- **j024 lolos** (lokasi dan takhrij). Lokasi gagal tinggal **j018, j019, j021, j023**, keempatnya menunggu tinjauan gold (T-24).
- **j033** (di luar cakupan: perintah SQL D1 "menurut Ihya") tidak diawali kalimat penolakan baku: paragraf pertama menjelaskan bahwa itu bukan isi Ihya, kalimat "Tidak ditemukan di kitab yang dicakup." baru di paragraf kedua, dengan satu sitasi bab doa sebagai contoh isi dokumen. Isinya menolak dengan benar dan tanpa klaim, tetapi menurut aturan `isNotFound` (kalimat baku harus di awal, sengaja, diuji) hasilnya "jawaban". Ini kali kedua j033 gagal dengan `answer@6` (X05 run utama juga), dari 4 run. Tidak diubah di sini: melonggarkan `isNotFound` mengubah kebijakan penolakan dan perlu ADR + eval sendiri. Kandidat perbaikan: pascaproses yang menjadikan jawaban berkalimat baku di awal paragraf mana pun + tanpa klaim kitab sebagai penolakan, diuji pada soal jebakan.
- Angka ini tetap **in-sample** dan atas rute satu run; bukti R4 butuh holdout dan gold yang ditinjau.

**Tinjau ulang bila:** gold ditinjau (T-24); j033 gagal lagi (prioritaskan kandidat perbaikan di atas); atau kitab kedua masuk (catatan kaki kitab lain bukan takhrij al-'Iraqi).

## ADR-095 · Petunjuk mode baca sekali tampil, Ringkasan AI ikut kata cari, dan ukur LCP per mode sebagai perintah repo (X14) — diterima · 2026-10-24

**Konteks:** sesudah X11 (ADR-091) tersisa tiga hal:
- pilihan mode baca hanya ada di menu ⋮ dan panel Tampilan, jadi sulit ditemukan pembaca baru;
- Ringkasan AI tidak disorot kata cari dan tersembunyi di mode Arab (batas ADR-091 §4);
- cara ukur LCP per mode (Lighthouse lewat Puppeteer, localStorage diisi) hanya ada di folder sementara agen.

Pemilik (2026-10-24, pertanyaan pilihan) memilih petunjuk sekali tampil di halaman baca, bukan tombol mode di kartu catatan AI atau di toolbar baca.

**Keputusan:**
1. **Petunjuk mode baca** (`components/reader/read-mode-hint.tsx`) di awal teks halaman baca, di atas catatan AI. Isinya judul "Pilih cara membaca", Segment mode baca (komponen yang sama dengan panel dan menu ⋮, jadi tidak menambah JS awal), dan penjelasan mode terpilih setinggi tetap (`StableText`, kini `components/stable-text.tsx`).
   - HTML-nya sama untuk semua pembaca (ISR). Skrip awal memasang `data-read-mode-hint="off"` bila `surau:read-mode` tersimpan (nilai apa pun, termasuk hasil pemindahan sakelar lama) atau `surau:read-mode-hint` = "off" (ditutup). CSS menyembunyikannya sebelum tampil: tanpa kedip dan tanpa geser tata letak.
   - Memilih mode di petunjuk menyimpan mode (lewat `setReadMode`, posisi baca dijaga) tetapi tidak menutup petunjuk di halaman itu, supaya teks di bawahnya tidak melompat. Di halaman berikutnya petunjuk tidak muncul.
   - Tombol tutup menyimpan "off" tanpa mengubah mode.
   - Penyimpanan diblokir: petunjuk tampil di setiap halaman dan bisa ditutup per halaman, sama dengan catatan AI.
   - Hanya di halaman baca utama (bukan halaman sambungan, Cari, daftar isi, Maknaz), dan juga di halaman tanpa terjemahan (penjelasannya menyebut bahwa teks Arab yang tampil). Tidak dicetak.
   - Catatan AI dan lencana per paragraf tidak berubah (teks-arab.md aturan 8); penjelasan mode menyebut "terjemahan AI".
2. **Ringkasan AI ikut kata cari** (menghapus batas ADR-091 §4):
   - Penyorot mencocokkan bagian Latin kueri juga di `[data-tr-seg="summary"]`.
   - Ringkasan memakai satu DOM untuk keadaan terpotong dan terbuka: paragraf `summaryParagraphs` selalu dirender, dan atribut `data-expanded` (CSS) memilih dua baris sebaris atau paragraf bertumpuk. Sorotan (Range di node teks) tetap berlaku saat ringkasan dibuka-tutup; sebelumnya keadaan terbuka mengganti node teks.
   - Kecocokan di bagian yang terpotong membuka ringkasan lewat event `SUMMARY_OPEN_EVENT` (komponen merender sinkron di dalam jaga posisi).
   - Di mode Arab ringkasan yang cocok dibuka sementara (`data-tr-peek`, seperti terjemahan paragraf) dengan tombol "Sembunyikan lagi ringkasan AI ini" yang hanya tampil dalam keadaan itu. Bantuan AI lain tetap tersembunyi.
3. **Ukur LCP per mode = `pnpm ukur:lcp <base> [mode,...] [n] [jalur,...]`** (`scripts/ukur-lcp.mjs`).
   - Mode `baru` (localStorage kosong: petunjuk tampil), `ar`, `both`, `tr`.
   - Lighthouse 13.5.0 (simulasi Lantern ponsel) lewat Puppeteer, cache HTTP dikosongkan tiap putaran, pemanasan ISR, median + sebaran.
   - Mencetak model mesin (bukan hostname), CPU, RAM, versi Chrome dan Lighthouse.
   - Lighthouse dan puppeteer-core (versi dipatok) **tidak** menjadi dependensi repo: dipasang sekali dengan npm ke `~/.cache/surau/ukur-lcp` (`SURAU_LCP_DIR`). Chrome = Chromium Playwright e2e (`CHROME_PATH` untuk yang lain).
   - Angka hanya sebanding di mesin yang sama; angka acuan produksi dicatat di X14 beserta mesinnya.

**Tidak dipilih:**
- Tombol mode di kartu catatan AI: kartu itu hilang di mode Arab, bila ditutup, dan di halaman tanpa terjemahan, sehingga tombolnya ikut hilang.
- Tombol mode di toolbar baca: toolbar ponsel makin padat, dan tombol itu tidak menjelaskan apa-apa ke pembaca baru.
- Menutup petunjuk otomatis saat mode dipilih: teks di bawahnya akan melompat setinggi petunjuk.
- Petunjuk lewat state React: berkedip dan menggeser tata letak saat hidrasi.
- Lighthouse sebagai devDependency (±100 paket untuk ukur manual) atau `pnpm dlx` (CLI Lighthouse tidak bisa mengisi localStorage sebelum halaman dimuat).

**Konsekuensi:**
- HTML halaman baca bertambah satu kartu kecil (±1 KB), tersembunyi CSS bagi pembaca yang sudah memilih.
- e2e yang mengukur posisi dari atas halaman kini melihat petunjuk bila tidak mengisi mode.
- e2e `reader-x14` + axe ringkasan dibuka sementara.

**Tinjau ulang bila:** data menunjukkan pembaca menutup petunjuk tanpa memilih (pertimbangkan teks lain), petunjuk serupa dibutuhkan di Cari/Maknaz, ada akun/sinkron preferensi, atau versi Lighthouse/Chrome Playwright naik (patok ulang, ukur ulang acuan).

## ADR-096 · Landing page publik di `/`, Beranda pindah ke `/home`; hero bergaya template buku (Primer) + bagian bergaya ElevenLabs yang menonjolkan AI lewat simulasi berdata asli — diterima · 2026-10-24

**Konteks:** pemilik meminta landing page publik yang mencontoh, atau lebih bagus dari, template Primer (Tailwind Plus), disesuaikan dengan Surau, memakai komponen HeroUI, dengan ilustrasi dari skill `aset`. Jawaban pemilik (chat 2026-10-24): landing di `/`, Beranda di `/home`; tanpa testimoni karangan dan tanpa nama orang; bagian harga = gratis + transparansi biaya, tanpa donasi. Sesudah versi pertama pemilik meminta tata letak yang benar-benar mengikuti Primer (hero dengan buku, menu bagian yang menempel, bukan menu header). Sesudah itu pemilik tidak puas dengan *pilihan isi*: daftar isi satu kitab tidak tahan bila kitab bertambah, dan AI tidak ditonjolkan. Arah akhirnya: hero Primer dipertahankan (panel gradien, tanpa garis kisi), bagian di bawahnya meniru ElevenLabs (kartu gradien, bento, simulasi), simulasi Maknaz dengan orb tanpa label, widget berbentuk widget cari Beranda dengan Segment berikon, logo asisten AI sebagai marquee, simulasi berulang tanpa tombol, tanpa bayangan, dan latar putih tembus di atas gradien.

**Keputusan:**
1. **Rute.** Grup `(landing)` memiliki `/` dengan layout sendiri (tanpa `SurauShell` dan tanpa menu header) + kaki halaman ringkas. Beranda dipindah ke `(app)/home` (kanonis `/home`). Menu "Beranda", logo sidebar, tautan 404/galat global, sitemap, e2e, dan smoke CI (`deploy.yml`, `preview.yml`) ikut `/home`.
2. **Hero (pola Primer, kode tidak disalin).** Panel gradien (`.landing-gradient-strong`) yang membentang ke tepi kiri dengan sampul 3D Ihya (`WorkCover`), kutipan asli di pita kanan atas, lalu judul + ajakan. Sesudahnya menu bagian bernomor yang menempel (`SectionNav`): tab aktif mengikuti gulir, versi ponsel berupa satu baris + daftar. Lisensi Tailwind Plus mengizinkan produk akhir open source; yang ditiru tata letaknya, kodenya ditulis ulang dengan HeroUI.
3. **01 Coba Surau.** `Widget` Pro berbentuk sama dengan widget cari Beranda, dengan `Segment` berikon (Maknaz · Cari · Baca, ikon duotone untuk pilihan aktif) selebar kepala widget. Panggung bertinggi tetap yang sama (544 px desktop, 560 px ponsel) supaya tidak melompat. Simulasi tanpa panggilan API: Maknaz (pertanyaan diketik → orb `TanyaOrb` melewati tahap Jawab → jawaban beratribusi + kartu kutipan), Cari (dua hasil nyata untuk "sabar"), Baca (paragraf utuh, mode Arab/Keduanya/Terjemahan).
4. **Teks Arab tetap disalin kode.** `HERO_QUOTE` = paragraf 10017769 (j. 4 h. 265) rentang [0, 44) lewat `answerPassages`, diperiksa di batas kata (`quoteSpan`). Hasil Cari = paragraf 10016277 dan 10013591, potongan awal `text_raw` di batas kata (`wordPrefix`) + kalimat terjemahan yang memuat kata cari (`sentenceWith`). Baca = paragraf utuh (Arab + terjemahan seluruh paragraf, dipotong tampilan saja). Terjemahan selalu berlabel `translationLabel`; kalimat berplaceholder ayat dibuang. Kalimat jawaban contoh Maknaz/MCP ditulis di i18n dengan bahasa atribusi dan alamat dari data kutipan, merangkum terjemahan paragraf yang dikutip.
5. **02 Fitur** (bento: orb Maknaz + kartu teks Arab berlabel, empat kartu kecil dengan teks seimbang), **03 Cara kerja** (empat kartu ilustrasi aset), **04 Koleksi** sebagai jalur bertahap: Tahap 1 Ihya tersedia dengan angka dari edisi + pohon daftar isi yang sudah dimuat (jilid, kitab, bagian; tanpa kueri hitung baru), Tahap 2–3 menyusul. Daftar isi satu kitab tidak ditampilkan (fitur pembaca, tidak tahan bila kitab bertambah).
6. **05 Integrasi AI:** alamat MCP, marquee logo Claude, ChatGPT, Grok, Gemini, Copilot, dan Mistral (set ikon Hugeicons lokal, kategori logos) + "dan klien MCP lainnya", dan simulasi asisten memanggil `search_text` → `read_page` → `verify_quote`. **06 Gratis** (dua panel: Rp0 dan biaya AI bulan ini dari ledger, ADR-065), tanya jawab (`DisclosureGroup`), dan kartu penutup dengan ilustrasi surau.
7. **Maknaz mengikuti saklarnya** untuk ajakan dan butir fitur (`jawabRouteOn`, produksi mati); simulasinya tampil tanpa label (pilihan pemilik).
8. **Gerak.** Simulasi diputar berulang (jeda 3,5 dtk di keadaan akhir) hanya selama terlihat; marquee berhenti saat di-hover. "Kurangi gerakan" = keadaan akhir diam, marquee diam. **Menyimpang dari ADR-057** (sekali jalan, WCAG 2.2.2) atas permintaan pemilik; tidak ada tombol jeda.
9. **Data sekunder.** `loadLandingData` dinamis per request; `getEnv`, karya, contoh, dan biaya masing-masing boleh gagal tanpa menjatuhkan halaman (bagian #isi/koleksi tetap ada).
10. **Gaya.** Gradien dari token tema (`.landing-gradient*`, aksen Zaitun + emas ornamen), tanpa bayangan di elemen landing (kecuali sampul 3D bawaan komponen), latar putih di atas gradien 60%. CSS `tabs`/`accordion` tidak dipakai; `disclosure` + `disclosure-group` ditambahkan (ADR-035).
11. **Ilustrasi (skill `aset`):** `landing-surau`, `cara-bertanya`, `cara-mencari`, `cara-memeriksa` (konsep lembar tembus pandang, pengganti timbangan yang ditolak pemilik), `integrasi-ai`, dan `kitab-rehal` dibangun `--situs`.

**Tidak dipilih:** testimoni (belum ada yang asli), profil bernama, tombol donasi, daftar isi satu kitab di landing, garis kisi, menu header, tombol "Putar ulang", logo DeepSeek/Meta/Kimi (dukungan MCP jarak jauh belum jelas).

**Tinjau ulang bila:** ada testimoni asli yang diizinkan, Maknaz dibuka (`/rilis 4`), situs `/en` dibangun (ADR-092; string ada di `landing.ts`), kitab kedua masuk (koleksi dan contoh per karya), atau tinjauan aksesibilitas menuntut tombol jeda untuk gerak berulang.

## ADR-097 · Intisari (ringkasan belajar berlapis) + Dengar (audio ElevenLabs v4): dua tingkat, model data korpus skema 9, kode menyalin kutipan, audio tanpa huruf Arab — diterima (kontrak X15a; pipeline, UI, audio menyusul X15b–X17) · 2026-10-24

**Konteks:**
- Pemilik (2026-10-24) meminta mode belajar ringkas ala Headway/Blinkist untuk pekerja kota yang sibuk, orang awam, dan peneliti, plus audiobook dengan ElevenLabs v4.
- Ringkasan sekarang (ADR-043/044): satu paragraf ±1.100 karakter per node daftar isi (313 node × id/en), tanpa poin kunci, kutipan, jangkar ke paragraf, atau audio.
- Riset 2026-10-24 (tiga agen, sumber di transkrip sesi):
  - Blinkist: pembuka + 5–10 gagasan (±350 kata) + penutup, ±15 menit. Narasi AI dihentikan 3 Juni 2026 karena keluhan pendengar.
  - Headway: konteks → poin kunci → kutipan disorot → aksi; target 3 poin/hari; pengulangan berjarak.
  - Shortform: lapisan ringkas → panduan per bab (cocok untuk peneliti). Yaqeen Institute: kajian dibacakan suara AI berlabel + tautan teks.
  - NotebookLM dua host terbukti berimprovisasi (studi AGU 2025).
  - Headway dan Blinkist tidak berbahasa Indonesia; belum ada aplikasi Indonesia yang menggabungkan ringkasan kitab, audio, dan kutipan Arab bersitasi.
- ElevenLabs `eleven_v4` (rilis 28 Sep 2026): Indonesia dan Arab, ≤10.000 karakter per permintaan, $0,08 per 1.000 karakter lewat API, IPA inline + kamus lafal phoneme untuk bahasa selain Inggris (hanya v4), tag `[pause]`, tanpa SSML. Timestamps untuk v4 belum pasti. Akun pemilik paket Starter (±75 ribu karakter v4 per bulan lewat API), juga terhubung lewat konektor (uji dengar).
- Jawaban pemilik (pertanyaan pilihan): audio untuk Intisari Kitab + Intisari Bab; nama "Intisari"; fitur belajar (jalur 40 hari, ulas, simpan kutipan) dicatat untuk nanti; ElevenLabs paket Starter dulu.

**Keputusan:**
1. **Dua tingkat.**
   - *Intisari Kitab*: muqaddimah + 40 kitab, 10–15 menit, dibuat dari Intisari bab anaknya.
   - *Intisari Bab*: bagian lain, 2–4 menit, dibuat dari teks Arab bagian itu; jumlah gagasan mengikuti panjang teks.
   - Isi: pembuka (kitab), abstrak, gagasan kunci (judul atributif + sikap: pendapat penulis / yang ia nukil / yang ia bantah), kutipan pilihan, istilah, pertanyaan ingatan per gagasan ("siapa berpendapat apa"), penutup (kitab).
   - "Anjuran" hanya gagasan berjenis `advice` yang ditulis penulis sendiri dan berjangkar, dengan catatan "untuk kasus pribadi, tanyakan ulama". Tidak ada "aksi hari ini" atas nama Surau.
   - Intisari adalah pintu ke teks (docs/01 "bukan pengganti guru"): setiap gagasan punya "Dasar teks" ke paragrafnya, dan halaman ditutup dengan tautan ke teks lengkap.
2. **Model data: korpus skema 9, migrasi `0009_digest.sql`.**
   - Tabel ternormalisasi `digest`, `digest_point`, `digest_anchor`, `digest_quote`, `digest_question`, `glossary_term`, `digest_term`, `audio_track`, dan indeks `digest_point_fts` (pola `summary_fts`).
   - Semua kolom teks AI membawa model, versi prompt, tanggal, dan status tinjau. Status tinjau dicatat per baris untuk gagasan, kutipan, pertanyaan, dan istilah. Terjemahan kutipan `digest` menyimpan asal model-nya sendiri, karena Intisari induk bisa memakai kutipan anak.
   - `basis`: `text` = teks Arab bagian itu sendiri (node panjang: per potongan, lalu digabung); `children` = hanya Intisari anak (teks sendirinya sebatas judul); `mixed` = keduanya.
   - CHECK menjaga: Intisari Kitab wajib punya pembuka dan penutup; paragraf jangkar dan kutipan harus dari edisi node; asal terjemahan kutipan lengkap atau kosong sesuai sumbernya.
   - Satu migrasi untuk seluruh fitur (`audio_track` kosong sampai X17), supaya cukup satu promote `ihya-v9`.
3. **Kode menyalin, model menunjuk (teks-arab.md aturan 1).**
   - Jangkar gagasan dan kutipan = rentang `text_raw` yang dihitung kode dari ID blok yang ditunjuk model (`segmentText`, blok tidak memotong rentang ayat).
   - Kutipan menyimpan `raw_sha256`. `readDigest` hanya menampilkan kutipan yang sidiknya masih cocok dan tidak menyentuh rujukan ayat (`passage_ayah_ref`). Kutipan yang ditahan dicatat di `withheld_quotes` (untuk log, tidak pernah ditampilkan); attach X15b menjadikan keduanya invarian build.
   - `readDigest` tidak mengirim gagasan, kutipan, atau pertanyaan yang ditolak peninjau, gagasan tanpa jangkar (beserta kutipan dan pertanyaan miliknya), atau teks AI berhuruf Arab (lapis pertahanan di luar validator).
   - Jenis kutipan (`text`/`report`/`poetry`) ditentukan kode. Kutipan yang menyentuh ayat ditolak. Riwayat yang label takhrijnya sangat lemah, palsu, atau "tidak ada asalnya" tidak dijadikan kutipan pilihan.
   - Terjemahan kutipan: bila kutipan = satu paragraf utuh (dicek kode), dipakai terjemahan paragraf itu (label tinjauan X08 ikut); selain itu terjemahan AI kutipan, berlabel dengan asalnya sendiri.
   - Dalil (ayat lewat `passage_ayah_ref`, takhrij lewat catatan kaki + label kode) dihitung dari jangkar saat dibaca, tidak disimpan.
4. **Abstrak = `summary.text`** bila lolos `checkSummary` (prompt `digest-…`). Cari (ADR-044), routing Jawab (ADR-067), MCP `read_page`, dan kartu pembaca memakai satu ringkasan. Node yang gagal tetap memakai `summarize-section@2`. Gerbang gratis sebelum promote: `eval:retrieval --gate` dan `eval:jawab kandidat` tidak boleh turun dari ihya-v8.
5. **Pipeline (X15b).**
   - `pnpm llm intisari …` mengikuti pola `pnpm llm`: Message Batches, tanda terima (ADR-061), `--budget --confirm`, dan izin pemilik di chat.
   - Bertingkat tanpa meratakan subpohon (prompt tetap di bawah tarif murah 100 ribu token Haiku): daun dari blok teks, induk merujuk ID gagasan dan kutipan anak.
   - Haiku 5.5 untuk bab. Sonnet 5.5 untuk 41 Intisari Kitab (pengecualian ADR-013: jumlahnya kecil dan mutunya paling terlihat; dibandingkan di pilot).
   - Keluaran structured outputs hanya berisi ID, tanpa huruf Arab.
   - Validator `judgeDigest` menolak huruf Arab, placeholder ayat, Markdown, pola fatwa (dipindah ke `packages/llm/src/check.ts` supaya satu sumber), orang pertama, kata status hadits, dan parafrase ayat. Butir opsional yang cacat dibuang dengan alasan tercatat, bukan menolak seluruh respons.
   - Glosarium menjadi data berkunci (`GLOSSARY_V2` dibangkitkan darinya); model memilih kunci istilah (enum), tidak menulis definisi.
   - Pilot boleh membaca korpus staging (hanya SELECT), jadi tidak menunggu data T-28.
6. **Audio "Dengarkan" (X17).**
   - Skrip dibuat kode dari Intisari, tanpa LLM baru: normalisasi lisan berversi ("saw.", "j. 3 h. 204", tahun Hijriah), leksikon IPA istilah di repo, `[pause]` antarbagian, dan kalimat label "Intisari ini dibuat AI dan dibacakan suara AI" di awal.
   - **Tidak ada huruf Arab yang dibacakan mesin.** Kutipan dibacakan lewat terjemahannya, ayat hanya disebut. Tanda riwayat sangat lemah ikut dibacakan bila riwayat itu disebut (docs/05 §4).
   - Narator netral, orang ketiga, tanpa tag dramatis, tanpa kloning suara tokoh atau ustadz. **Satu suara AI per Intisari** (PK `audio_track` per jenis suara; narator manusia kelak didahulukan), dipilih lewat uji dengar pemilik (T-31). Pilihan condong ke suara rancangan milik akun Surau, karena suara Voice Library bisa ditarik pemiliknya.
   - Skrip hanya dibangun dari yang tampil di `readDigest`: gagasan yang tidak ditolak dan berjangkar, serta kutipan yang tidak ditahan.
   - Penyedia di balik antarmuka `TtsProvider` (ElevenLabs v4 dulu, panggilan REST langsung tanpa SDK npm). Satu permintaan per gagasan dengan request stitching; bab pemutar = gagasan, jadi tidak bergantung timestamps.
   - MP3 mono di bucket R2 publik `surau-media` dengan domain `media.surau.org`; kunci objek memuat sha skrip (immutable, tidak pernah ditimpa). Metadata ter-commit `data/audio/<kitab>-audio.json` (tanpa teks) dimuat ingest ke `audio_track` hanya bila sha skripnya sama dengan skrip yang dibangun ulang.
   - Pemutar global di shell situs, dimuat saat ditekan (`preload="none"`; di iOS `play()` dipanggil sinkron di handler klik), dengan Media Session, kecepatan 0,75–2×, maju-mundur 15 detik, dan lanjut posisi (localStorage `surau:listen:v1`, dicatat di `/privasi`).
   - `npx @elevenlabs/cli onboard init` tidak dipakai: perintah itu menulis `.env.local` dan `~/.elevenlabs`, lalu menyuruh `npm install` (bentrok pnpm). Kunci API dibatasi ke Text-to-Speech + kuota, diketik pemilik ke `.env` (T-29).
7. **Tampil di situs:** hub `/kitab/<karya>/intisari`, halaman `/kitab/<karya>/bab/<id>/intisari` (ISR on-demand; `notFound` bila skema korpus < 9), kartu ringkasan pembaca + menu ⋮, lencana daftar isi, jalur gagasan di Cari, dan tool MCP baru `get_section_digest` (aditif; `read_page` tidak dibebani). Maknaz tidak berubah.
8. **Bahasa:** semua tabel berkolom `lang`; hanya `id` yang dibuat sekarang (ADR-092).

**Tidak dipilih:**
- Satu kolom JSON per Intisari: tanpa rowid FTS per gagasan, tanpa FK/CHECK jangkar, dan koreksi manusia per gagasan sulit.
- Model menulis kutipan Arab lalu diverifikasi: model tetap menulis Arab. ID blok tidak pernah gagal cocok; penunjuk Arab + `findQuote` jadi cadangan bila blok terbukti terlalu kasar.
- Podcast AI dua host atau debat: improvisasi dan nada yang terdengar seperti fatwa.
- TTS untuk teks Arab atau ayat: salah i'rab sama dengan salah kutip.
- Audiobook terjemahan penuh sekarang: ±5 juta karakter, dan terjemahan belum ditinjau (T-17).
- `audio_track` di DB app atau manifest di R2: tidak ikut versi korpus (audio bisa membacakan Intisari lama), atau menjadi sumber kebenaran ketiga.
- Route Worker untuk audio dengan Range: respons 206/If-Range ditulis sendiri lewat Worker OpenNext, padahal domain R2 publik sudah melayani Range dan cache.
- Kloning suara ustadz atau tokoh: mengesankan beliau membenarkan isi buatan AI.

**Konsekuensi:**
- Skema korpus naik ke 9. Build berikutnya membuat tabel Intisari (kosong sampai X15b). `corpus:qa` atas staging/produksi lama (skema < 9) gagal sampai dimuat ulang. Rollback ke `ihya-v8` (skema 7) aman: Intisari tersembunyi, dan smoke mencatatnya sebagai batasan.
- `readDigest` (core) serta `getDigest`/`listDigestHeaders`/`getDigestHeaders` (db) menjadi kontrak bersama web, MCP, dan audio; kontrak MCP hanya bertambah.
- Biaya: LLM ±$2,5–4 untuk Ihya (pilot ≤ $1); TTS ±1,3 juta karakter (≈ $104 dengan v4; Starter cukup untuk pilot saja); R2 ±0,6 GB (gratis). Setiap batch berbayar dengan izin pemilik.
- Ingest `ihya-v9` butuh data T-28 (drive Shamela, `data/raw`, `data/build/llm`) yang tidak ada di mesin agen saat ini.

**Tinjau ulang bila:** pilot menunjukkan blok terlalu kasar (>10% kutipan terpotong atau terlalu panjang), uji dengar menolak semua suara v4 (bandingkan Chirp 3 HD dan Gemini TTS), timestamps v4 tersedia (sorotan per kalimat), ada narator manusia atau qari berlisensi, fase bahasa Inggris dijadwalkan, atau koreksi Intisari oleh manusia dibuka.

## ADR-098 · Pipeline Intisari (X15b): blok berlabel dari `text_raw`, tiga tahap tanpa meratakan subpohon, validator di `@surau/llm`, glosarium berkunci, pilot dari staging (SELECT saja) — diterima · 2026-10-24

**Konteks:** ADR-097 menetapkan kontrak data Intisari (korpus skema 9) dan prinsip "kode menyalin, model menunjuk". X15b membangun pipeline yang mengisinya dan menjalankan pilot satu kitab (*Kitab al-'Ilm*, node 100003) atas izin pemilik (pagu US$1). Data T-28 (drive Shamela) tidak ada di mesin agen.

**Keputusan:**
1. **Blok.** `text_raw` paragraf badan dipecah `segmentText` dengan sasaran 220 karakter (parameter baru `singleMax` = 330; pemakai lama tidak berubah). Batas blok tidak pernah jatuh di dalam rentang `passage_ayah_ref` atau penanda catatan kaki, dan dipaksa di batas subjudul (judul node yang sama sesudah `normalizeArabic`, plus daftar kurasi subjudul yang sidiknya cocok). Ayat diganti placeholder per blok (`maskAyat`); paragraf yang rujukan ayatnya tidak bisa ditandai tidak dikirim. Label `b1…bn` per request; peta blok `[label, passage_id, char_start, char_end]` disimpan di catatan request (`plannedRequest.digest.blocks`) dan dicocokkan lagi saat menilai.
2. **Tiga tahap.** `leaf` (teks Arab satu bagian atau potongannya; bagian > 24 ribu token dipecah per halaman, lebih kecil dari ringkasan 50 ribu supaya gagasan tidak terlalu umum) → `merge` (Intisari Bab dari Intisari anak dan potongan teks node sendiri `n<seq>p<k>`) → `book` (muqaddimah + 40 kitab, Sonnet 5.5; `--banding` membuat pembanding Haiku 5.5 `-bh` yang tidak dimuat). Induk hanya melihat Intisari satu tingkat di bawahnya (`n<seq>.g<k>`, `n<seq>.q<k>`); merge berjalan bergelombang. Rub' = Intisari Bab dari kitab-kitabnya.
3. **Sidik.** Sidik berjenjang (`source_sha256` node = sha potongan dirinya + sha anak-anaknya) menandai perubahan teks di mana pun di subpohon; `input_sha256` = sha Intisari sumber yang dikirim (tanpa judul, yang hanya konteks). Hasil basi tidak dimuat dan dijadwalkan ulang oleh `plan`; kegagalan untuk sumber lama tidak dihitung percobaan.
4. **Keluaran terstruktur.** Semua field wajib, hanya `enum` (sikap, jenis, kunci istilah), tanpa `minLength`/`maxItems`/batas angka (tidak didukung structured outputs, dicek docs 2026-10-24); jumlah dan panjang dicek `judgeDigest`. Tidak ada field "alasan" (bisa memicu refusal `reasoning_extraction`). Kutipan = ID blok dari–sampai (leaf) atau ID kutipan anak (merge/book); teks Arab dan terjemahannya diambil kode beserta asal model-nya. Huruf Arab dari model hanya ada di penunjuk kutipan poin 10, yang tidak masuk hasil lolos, korpus, laporan, atau halaman QA (hasil mentah batch tetap menyimpannya untuk audit).
5. **Validator `judgeDigest`** (`packages/llm/src/digest.ts`). Gagal seluruhnya hanya bila: `stop_reason` ≠ `end_turn`, JSON/skema rusak, abstrak tidak lolos `checkSummary` + pemeriksaan narasi, pembuka/penutup Intisari Kitab cacat, atau gagasan tersisa di bawah minimum. Butir opsional yang cacat dibuang deterministik dengan alasan tercatat (`dropped`): gagasan (ID karangan, huruf Arab, placeholder, Markdown, pembuka basa-basi, komentar model, pola fatwa, sapaan pembaca, orang pertama, kata status hadits, parafrase ayat, panjang, anjuran bukan dari penulis, sikap dibalik terhadap sumber), kutipan (lintas paragraf, judul, ayat, < 20 atau > 400 karakter, tumpang tindih, terjemahan cacat, riwayat bertakhrij sangat lemah/palsu/tanpa asal/tidak ditemukan), pertanyaan, istilah. Pola fatwa dipindah dari `tools/eval/src/answer-metrics.ts` ke `packages/llm/src/check.ts` (satu sumber).
6. **Jenis kutipan ditentukan kode**: `report` bila ada penanda takhrij di dalam rentang atau tepat sesudahnya (hanya spasi/tanda baca di antaranya), `poetry` bila paragrafnya bait (`verseBounds`, kini di `@surau/core` dan dipakai bersama pembaca web), selain itu `text`.
7. **Glosarium berkunci** (`prompts/glossary-v2.ts`): 162 entri dari `GLOSSARY_V1` (dijaga tes: semua pasangan v1 ada), 144 boleh dipilih sebagai istilah; "ra." dipecah tiga karena dibacakan suara AI. `GLOSSARY_V2` dibangkitkan dari data; prompt lama tetap memakai v1 yang dibekukan. Definisi: `pnpm llm glosarium` (prompt `glossary-gloss@1`, Sonnet 5.5 lewat API biasa, seperti judul daftar isi ADR-077: sedikit dan sering dilihat).
8. **Pilot dari staging.** `--from staging --kitab <id>` membaca `surau-corpus-staging` lewat `getPlatformProxy` (pola `open-corpus.ts`, `tools/ingest/wrangler.staging.jsonc`) yang dibungkus `selectOnly`. `muat-staging` (atas izin pemilik) menerapkan migrasi korpus yang tertunda lalu menyisipkan baris Intisari node pilot saja secara idempoten (`digest`/`glossary_term` di-UPSERT supaya `audio_track` X17 tidak ikut terhapus), lalu smoke `readDigest`.
9. **Ingest.** `pnpm ingest ihya` memuat hasil yang berlaku dan menjadikan invarian ADR-097 poin 3 sebagai invarian build; abstrak yang lolos `checkSummary` menggantikan `summary.text` bahasa id (ringkasan `summarize-section@2` tetap untuk node lain dan bahasa en).
10. **Cadangan ADR-097 dipakai: penunjuk kutipan (`digest-section@2`).** Pilot v1 menunjukkan ±35% kutipan (9 dari 26, dinilai manual dari batas teksnya) mulai atau berakhir di tengah kalimat: teks klasik jarang bertanda baca, jadi batas blok jatuh di antara kata. Sejak v2 kutipan membawa `awal`/`akhir` (2–5 kata pertama/terakhir, disalin dari blok `dari`/`sampai`); kode mencarinya dengan `findQuote` (normalisasi `@surau/text`, batas kata) di rentang blok itu, menolak penunjuk di luar blok atau yang cocok lebih dari sekali (`pointer_ambiguous`, mis. salawat berulang), lalu MEMBUANG teks penunjuk. Yang disimpan hanya rentang `text_raw` + sidiknya. Hasil versi prompt lama dianggap basi (satu kitab tidak bercampur versi prompt).
11. **Jenis kutipan dan larangan takhrij (dua putaran peninjau).** Larangan takhrij (sangat lemah, palsu, tanpa asal, tidak ditemukan) berlaku untuk penanda di dalam kutipan dan untuk penanda PERTAMA sesudahnya menurut urutan baca: sisa paragraf, lalu paragraf berikutnya di bagian yang sama, ≤ 1.500 karakter, tanpa syarat tanda baca. Alasannya, kutipan bisa potongan awal riwayat panjang yang penandanya jauh, di halaman berikutnya, atau sesudah titik. Akibatnya perkataan penulis yang mendahului riwayat terlarang ikut terbuang (sengaja konservatif). Label `report` lebih ketat: penanda di dalam atau tepat sesudah kutipan, atau penanda pertama di paragraf yang sama ≤ 600 karakter tanpa akhir kalimat dan tanpa rumus riwayat baru di antaranya.

**Tidak dipilih:**
- Enum ID blok per request di skema: setiap request jadi skema baru (kompilasi grammar per skema) dan berisiko melewati batas kerumitan; ID divalidasi kode.
- Meratakan subpohon ke prompt kitab: prompt > 100 ribu token (tarif Haiku 5×) dan gagasan bab hilang.
- Model menulis kutipan Arab lalu dicocokkan: tetap cadangan ADR-097 bila blok terbukti terlalu kasar.

**Hasil pilot** (Kitab al-'Ilm, node 100003, 21 Intisari: 1 Kitab + 20 Bab; izin pemilik 2026-10-24 ±16:44 UTC, pagu US$1):
- **v1:** semua lolos (22 leaf + 8 merge + Kitab Sonnet/Haiku), tetapi kutipan sering terpotong di tengah kalimat. Dibaca manual: 9 dari 26 kutipan yang lolos. Heuristik batas alami: 6 dari 28 kutipan keluaran model (21%; penyebutnya termasuk kutipan yang dibuang validator). Karena itu cadangan ADR-097 dipakai (poin 10).
- **v2** (`digest-section@2` + `digest-merge@1`):
  - 22/22 leaf lolos; satu lewat ulangan, karena abstrak "Teks ini berisi…" ditolak sebagai komentar model.
  - 8/8 merge dan Intisari Kitab (Sonnet + pembanding Haiku) lolos. Sesudah aturan larangan lintas paragraf (poin 11), dua merge dan Kitab dibuat ulang karena kutipan anaknya berubah.
  - Kutipan: heuristik terpotong 2/23 (8,7%); dibaca agent 0/23 terpotong di tengah kalimat.
  - Heuristik itu diganti dua kali selama pilot karena teks klasik hampir tanpa tanda baca (c5ddb21, lalu pembuka klausa wa/fa ≥ 4 huruf). Angka v1 dan v2 di atas memakai versi akhirnya.
- **Dimuat ke staging** (skema 9, migrasi 0008 + 0009): 21 Intisari, 133 gagasan, 378 jangkar, 32 kutipan, 158 pertanyaan, 93 istilah, 144 definisi glosarium, 133 baris indeks. Smoke `readDigest` 21/21 dengan kutipan ditahan 0. Intisari Kitab ±10 menit baca, Intisari Bab 3–5 menit.
- **Butir yang dibuang validator (v2 akhir):** istilah di atas batas 5, kutipan menyentuh ayat 2, dasar > 12 ID 1, takhrij terlarang 1. Pada v1: parafrase makna ayat 1, "Allah berfirman" di terjemahan kutipan 1, "kami" 1.
- **Sonnet vs Haiku (Intisari Kitab):** 8 vs 7 gagasan, ±143 kata per gagasan, 3 kutipan, 8 istilah; biaya US$0,075 vs US$0,006. **Dipilih Sonnet 5.5** untuk Intisari Kitab di 41 kitab (bawaan `book` di poin 2; pembanding Haiku hanya bila diminta lewat `--banding`). Pemilik, 2026-10-25, di sesi induk: "Saya serahkan ke agent sementara untuk QA model sonnet".
- **QA pilot (penilaian agent, 2026-10-25, [laporan](../data/reports/ihya-9472-intisari-qa-agent-2026-10-25.md)):** pemilik menyerahkan QA untuk sementara kepada agent ("Saya serahkan ke agent sementara untuk QA model sonnet"). Empat subagen QA berkonteks baru menilai 140 gagasan halaman QA tanpa API berbayar. Hasil 133 gagasan yang dimuat: Benar 91, Kurang 40, Salah 2 (1,5%), jadi gerbang ≤ 5% lolos. Intisari Kitab: Sonnet 3/5/0, pembanding Haiku 2/5/0.
  - Dua Salah: *sanah* (tahun) terbaca *sunnah* (`dg-100007-id#g4`), dan penegasan al-Ghazali soal makna lahir/batin yang dibalik (`dg-100017-id-m#g2`).
  - Kurang terbanyak: klaim yang tidak tertutup Dasar teks (16, termasuk kelima Kurang Sonnet) dan makna bergeser (21).
  - Penilaian manusia T-31 tetap terbuka.
- **Biaya aktual: US$0,53**: batch US$0,397 (v1 US$0,167, v2 + ulangan US$0,230) dan glosarium US$0,129.
- **Catatan untuk prompt berikutnya:** pembuka Sonnet v1 menulis "sumber yang tersedia tidak menyebut alasan…", jadi instruksi "alasan bila disebut" sebaiknya dibuang; contoh abstrak "apa yang dibahas teks ini" memancing jawaban "Teks ini…".

**Konsekuensi:** `wrangler` menjadi devDependency `tools/ingest` (getPlatformProxy untuk baca staging; sebelumnya hanya root dan tools/eval). Staging kini skema 9 dengan Intisari pilot (kode lama hanya memeriksa `<`, jadi aman); `corpus:qa staging` tetap gagal sampai staging dimuat ulang dari build `ihya-v9` (X15c). Celah yang dicatat peninjau untuk X15c/prompt berikutnya (bukan blocker): sikap `reported` → `author` di merge, `advice` tanpa sumber berjenis anjuran, kutipan tidak wajib di blok dasar gagasannya, takhrij `rujukan` ("تقدم") belum diikuti, koreksi ustadz X07 belum dipakai larangan kutipan, pola fatwa tanpa "adalah" dan bentuk perintah "-lah". Dari QA agent: dua gagasan Salah harus ditahan atau dibuat ulang sebelum `ihya-v9` dipromosikan. Selain itu, jangkar gagasan Kitab/merge (`anchorsFromPoints`) diambil bergiliran dari gagasan sumber dan dibatasi 9, sehingga klaim yang didukung jangkar lain tidak terlihat. Menolak gagasan di staging wajib diikuti penghapusan audio bab itu (ADR-097 butir 6), karena baris `audio_track` staging dipakai apa adanya. Di build, ingest sudah membuang audio basi lewat sha skrip.

## ADR-099 · UI Intisari (X16): halaman + hub ISR, dalil dihitung core dari jangkar, kepala Intisari bersama ekstra daftar isi, lencana daftar isi tanpa tautan kedua, jalur Cari gagasan opt-in dengan memo isolate, fixture `/dev/intisari` di Preview — diterima · 2026-10-24

**Konteks:**
- ADR-097 butir 7 menetapkan tempat Intisari tampil. X15a menyediakan `readDigest`/`DigestView` dan kepala Intisari (db).
- Data nyata baru ada sesudah X15b langkah 9 (pilot ke staging). Staging dan produksi masih `ihya-v8` (skema 7).
- Halaman baca harus tetap ringan (ADR-079), dan produksi berskema 7 sampai `ihya-v9`.

**Keputusan:**
1. **Rute ISR on-demand** (ADR-034/038):
   - Hub `/kitab/<karya>/intisari`: Intisari Kitab per akar daftar isi (rub'). 404 bila korpus belum punya Intisari Kitab, termasuk skema < 9.
   - `/kitab/<karya>/bab/<id>/intisari`: 404 di skema < 9, node tanpa Intisari, node milik edisi lain, atau Intisari tanpa gagasan tampil.
   - Satu komponen server `DigestPage` dipakai rute dan fixture. Tata letak Kitab (`tier` book) menambah pembuka, penutup, dan daftar Intisari Bab.
   - Halaman Intisari tidak ikut mode baca: isinya teks Indonesia, dan terjemahan kutipan selalu tampil berlabel. Kartu ringkasan di pembaca tetap `data-tr-aid` (tersembunyi di mode Arab).
2. **Dalil = `DigestView.evidence`** (aditif), dihitung core dari jangkar gagasan yang tampil, tanpa model dan tanpa disimpan.
   - Ayat: `passage_ayah_ref` yang beririsan dengan jangkar, teksnya lewat `quranForRefs` (Tanzil + Kemenag verbatim).
   - Hadits: penanda catatan kaki di dalam jangkar, kecuali penanda di awal jangkar (milik kalimat sebelumnya). Penanda ≤ 3 karakter sesudah akhir jangkar, dengan hanya spasi atau tanda baca di antaranya, ikut dihitung, karena blok `segmentText` bisa berhenti di titik sebelum penanda kalimatnya.
   - Status hadits = `takhrijLabel` atas teks catatan kaki (`rule_extracted`, "dikenali otomatis dari teks takhrij, belum ditinjau"), dengan teks takhrij asli. Label tinjauan ustadz (DB app) menyusul. Catatan kaki yang tidak dikenali sebagai takhrij (`not_takhrij`, catatan penyunting) tampil sebagai "Catatan kaki (١)", tidak disebut hadits.
   - Kutipan membawa takhrij-nya sendiri (`DigestQuoteView.takhrij`, aditif: penanda di dalam atau tepat sesudah rentang kutipan, aturan yang sama), jadi kartu riwayat menampilkan label + teks takhrijnya, atau "status belum diketahui" bila tidak ada.
   - Riwayat yang takhrijnya memuat istilah sangat lemah, palsu, atau "tidak ada asalnya" ditahan saat dibaca (`withheld_quotes` alasan `weak_report`). Validator X15b menolaknya lebih dulu; ini lapis kedua (ADR-097 butir 3).
3. **Kepala Intisari bersama ekstra daftar isi.** `listDigestHeaders` dimuat bersama subjudul dan judul Indonesia (memo per isolate; skema ikut kunci memo) dan tidak dikueri sama sekali di skema < 9.
   - Lencana daftar isi, kartu ringkasan, menu ⋮, hub, dan tombol halaman karya memakai satu daftar, tanpa kueri tambahan per halaman.
   - Halaman sambungan (`/api/halaman`) memakai `getDigestHeaders` dan `getDigestHeadersOnPath` (baru: node + leluhurnya, terdekat dulu), hanya bila skema korpus ≥ 9. Skema dibaca sekali per isolate, sejajar dengan baca halaman, jadi produksi skema 7 tidak membayar kueri gagal di setiap halaman.
   - Intisari tanpa gagasan tampil tidak diberi kepala, jadi tidak ada lencana maupun tautan ke halaman 404.
4. **Pembaca:**
   - Kartu Ringkasan AI mendapat baris "Intisari AI · N gagasan · ± M menit · Buka Intisari" dari field `digests` di `PageModel`, bukan field baru di `SummaryView`. `PAGE_MODEL_VERSION` 7.
   - Menu ⋮ mendapat "Buka Intisari bagian ini" (atau "… kitab ini") ke Intisari terdekat di jalur bagian yang sedang dibaca, termasuk halaman sambungan.
   - Lencana daftar isi "Intisari · N mnt" adalah penanda di dalam tautan baris, bukan tautan kedua: `NavigationTree` = satu tautan per baris, dan sel interaktif kedua merusak navigasi keyboard pohon.
5. **Cari: jalur `digest`** di pencarian gabungan.
   - rowid `toc_node_id·100 + ord` dipetakan ke jangkar seq terkecil gagasan itu. Gagasan ditolak, Intisari ditolak, atau gagasan tanpa jangkar disaring sebelum diberi peringkat. Ambang "sebagian kata" jalur ini terpisah, jadi peringkat terjemahan dan ringkasan tidak berubah. Kedalaman 30.
   - Opt-in `searchText(…, { digest: true })`: Cari situs, MCP `search_text`, dan eval retrieval menyalakannya; Jawab tidak, supaya kandidat Jawab tidak berubah tanpa eval berbayar.
   - Korpus tanpa `digest_point_fts`: satu kueri gagal ("no such table") per isolate, lalu jalur dilewati sampai meta korpus melaporkan skema ≥ 9.
   - `SEARCH_RESULT_VERSION` 3; `searchHit.digest_point` dan `fusion.digest_depth` aditif.
6. **MCP:** tool `get_section_digest` → `{ digest: DigestView | null }` dengan blok lisensi sumber + ayat, dan instruksi server butir 7.
7. **Fixture `/dev/intisari`** (data buatan tanpa D1: teks Arab kalimat contoh, surah "Uji", takhrij tanpa nama perawi nyata) untuk e2e dan pratinjau sebelum data nyata. Tampil di `next dev` dan Preview lewat var baru `DEV_PAGES` ("0" produksi, "1" Preview). Tidak diindeks.
8. **"Sudah dibaca":** localStorage `surau:intisari:read:v1` (daftar ID node, ≤ 600), ditandai saat bagian "Lanjut ke teks lengkap" terlihat. Dicatat di `/privasi`.
9. **Slot ▶ Dengarkan** (`ListenSlot`) untuk X17: tidak merender apa pun selama `DigestView.audio` null.

**Tidak dipilih:**
- Lencana daftar isi sebagai tautan kedua (lihat butir 4).
- Jalur gagasan selalu menyala, termasuk untuk Jawab: kandidat Jawab berubah tanpa eval berbayar.
- Cabang skema di SQL atau dua kueri per pencarian: menambah latensi setiap pencarian produksi. Dipilih memo isolate.
- `/dev/intisari` hanya di `next dev`: e2e CI berjalan terhadap Preview, jadi UI tanpa data tidak akan teruji di CI.
- Dalil disimpan di DB: ADR-097 butir 3 menetapkan dihitung saat dibaca.

**Konsekuensi:**
- Tampilan produksi (skema 7) tidak berubah. Cari produksi membayar satu kueri gagal + satu baca meta pertama kali per isolate sampai `ihya-v9`.
- Bila X15b memuat pilot ke staging tanpa build baru, isolate Preview yang sudah memo kepala kosong dan halaman ISR yang sudah dirender baru berubah sesudah deploy berikutnya.
- `eval:retrieval --gate` saat ini sama dengan sebelumnya (staging tanpa gagasan); ulangi sesudah data nyata (gerbang X15c).
- Hitungan gagasan di kepala (`listDigestHeaders`, SQL) tidak memakai penjaga huruf Arab milik `readDigest`. Gagasan berhuruf Arab (yang sudah ditolak validator X15b) bisa terhitung di lencana walau tidak tampil di halaman. Kartu Cari memakai penjaga yang sama dengan halaman.
- Kartu kutipan membawa `data-quote-range`, sehingga e2e Preview membandingkan teks Arabnya dengan `/api/kutipan` begitu data ada.

**Tinjau ulang bila:** label hadits tinjauan ustadz dibawa ke Intisari, data pilot menunjukkan aturan penanda melewatkan atau menambah hadits, jalur gagasan menurunkan eval retrieval, atau X17 mengisi slot audio.

## ADR-100 · Dengar (X17): skrip audio deterministik dari Intisari yang tampil, ElevenLabs v4 lewat REST, MP3 CBR bersambung dengan kunci bersidik isi, pemutar global berlabel suara AI — diterima (kode + infrastruktur; pilot berbayar menunggu T-29, T-31, izin pemilik) · 2026-10-25

**Konteks:** ADR-097 butir 6 menetapkan audio "Dengarkan": skrip dibuat kode dari Intisari tanpa huruf Arab, satu suara AI per Intisari, request stitching, R2 publik `surau-media` + `media.surau.org`, metadata ter-commit yang dimuat ingest hanya bila sha skripnya cocok, dan pemutar global di shell. Docs dicek 2026-10-24 (`/docs-terbaru elevenlabs`, MCP `cloudflare-docs`): v4 ≤ 10.000 karakter per permintaan, stitching didukung v4 (maksimal 3 id, ≤ 2 jam), `mp3_44100_64` tersedia di Starter, `[…]` dibaca sebagai tag audio dan `/…/` sebagai IPA inline, tanpa SSML; R2 custom domain meng-cache `.mp3` secara bawaan dan melayani Range.

**Keputusan:**
1. **Skrip (`packages/core/src/digest-script.ts`, `SCRIPT_VERSION` 1).** Fungsi murni atas `DigestView` dari `readDigest`, jadi hanya yang tampil yang dibacakan. Segmen: `label` ("Intisari ini dibuat AI dan dibacakan suara AI." + "Dari kitab … karya …"), `intro` (pembuka + abstrak), satu `point` per gagasan ("Gagasan pertama." + judul + isi + kutipannya), `quotes` (kutipan umum), `closing` (penutup + "Intisari ini adalah pintu ke kitab, bukan penggantinya…"). Kutipan dibacakan lewat terjemahannya ("Teks kitab di jilid satu, halaman dua ratus, yang terjemahan AI-nya: …"; "terjemahannya" bila sudah ditinjau atau dikoreksi manusia, aturan 8); kutipan tanpa terjemahan dilewati. Di semua teks AI, penanda catatan kaki "(١)" dibuang dan placeholder ⟦QS s:a⟧ hanya disebut ("ayat Al-Qur'an, surah kedua ayat …"), karena `readDigest` meloloskan keduanya (bukan huruf Arab). Anjuran: "Anjuran yang ditulis al-Ghazali sendiri, di jilid …" + "Untuk kasus pribadi, tanyakan kepada ulama." Kalimat dipecah `indonesianSentences`, lalu dinormalisasi lisan. Pemeriksaan akhir menolak (`ScriptError`, bukan dibuang diam-diam) huruf berskrip Arab apa pun, ⟦ ⟧, `[ ]`, dan `/`. sha = sha256 JSON kanonik (versi skrip, versi lisan, node, bahasa, segmen).
2. **Judul bagian tidak dibacakan.** Skrip hanya bergantung pada `DigestView`; judul Indonesia (terjemahan AI, bisa dikoreksi) ada di ID3 dan Media Session. Perbaikan judul tidak menggugurkan audio dan tidak menagih sintesis ulang.
3. **Riwayat bertakhrij berat (docs/05 §4 dan §12).**
   - **Kutipan:** sejak X16 (ADR-099), `readDigest` menahan kutipan riwayat yang takhrijnya memuat penilaian sangat lemah, palsu, atau "tidak ada asalnya" (`withheld_quotes` alasan `weak_report`). Kutipan seperti itu tidak pernah dibacakan.
   - **Gagasan:** gagasan yang bersandar pada riwayat seperti itu (dalil `evidence.hadith` dengan `point_ords` gagasan itu, sama dengan chip di halaman) diberi kalimat buatan kode. Bunyinya: "Gagasan ini bersandar pada riwayat yang catatan takhrijnya memuat penilaian {glosa}; penilaian ini dikenali otomatis dari teks takhrij dan belum ditinjau." Glosanya tetap (`TAKHRIJ_TERM_GLOSS`), bukan teks model.
   - **Satu definisi:** himpunan istilah berat (`VERY_WEAK_TAKHRIJ_KINDS`, `takhrij-label.ts`) dipakai bersama `readDigest` dan skrip.
   - **Status lain** tidak dibacakan; halaman menampilkannya bersama teks takhrij aslinya.
   - **Riwayat draf:** draf awal X17 mencari penanda takhrij sendiri. Saat merge X16, temuan peninjau menunjukkan kode itu salah menisbahkan penanda di awal rentang, jadi diganti dengan `evidence`.
   - `loadDigestScript(db, node)` = `readDigest` + `digestScript`, dan menjadi satu-satunya jalan skrip yang dipakai bersama alat audio dan ingest.
4. **Normalisasi lisan (`packages/text/src/spoken-id.ts`, `SPOKEN_VERSION` 1):** angka → kata (titik = ribuan; di luar jangkauan dibaca per digit, tanpa galat), pecahan fikih "1/40" → "satu per empat puluh", tahun H/M dan rentangnya, "w./l." → "wafat/lahir tahun", letak cetak ("j. 1, h. 200"), rujukan QS hanya disebut (termasuk gaya Kemenag "QS al-Baqarah/2: 183"), gelar (saw./swt./rah. di mana saja; ra./as. hanya sesudah nama) dengan titik kalimat dipertahankan, singkatan umum, transliterasi bertanda → huruf dasar, `[ ]` → `( )`, `/` → "atau". Huruf Arab tidak disentuh (ditolak penyusun skrip).
5. **Jeda = bingkai sunyi, bukan tag `[pause]`.** Satu permintaan TTS per segmen (dipecah per kalimat hanya bila > 10.000 karakter). Jeda antarsegmen (600–900 ms) disisipkan penyambung sebagai bingkai MP3 sunyi: deterministik dan tanpa biaya karakter. Tag v4 tidak dijanjikan durasinya. Kalimat label disintesis sekali lalu dipakai ulang lewat cache untuk semua Intisari satu karya.
6. **Leksikon `data/lexicon/id.yaml`.** IPA inline `/…/` (atau `alias`) diterapkan SESUDAH sha skrip dihitung, jadi perbaikan lafal tidak menggugurkan kecocokan skrip. Versi = 12 heks sha entri `active` (bukan seluruh berkas, supaya mengedit draf atau komentar tidak memicu rakitan ulang), dicatat di manifest. Hanya entri `active` yang diterapkan. Semua isian leksikon (istilah, IPA, alias) ditolak bila memuat huruf Arab, ⟦ ⟧, atau `[ ]`; alias juga tanpa `/`. Teks akhir setiap permintaan (sesudah leksikon) diperiksa ulang sebelum dikirim, karena leksikon diterapkan sesudah pemeriksaan skrip. 32 entri draf (`test`) diperdengarkan berdampingan oleh `pnpm audio sample` untuk uji dengar T-31 (docs: IPA dipakai selektif). Kamus lafal API ElevenLabs tidak dipakai: butuh izin kunci tambahan dan versi kamus terpisah, sedangkan IPA inline cukup untuk v4.
7. **Penyedia di balik `TtsProvider`, ElevenLabs REST tanpa SDK** (`eleven_v4`, `language_code: "id"`, `mp3_44100_64`, `previous_request_ids` ≤ 3 dari segmen Intisari yang sama yang berumur ≤ 2 jam). Ulang otomatis hanya untuk 429/503 (pasti belum diproses). Jaringan putus, batas waktu, dan 5xx lain = "mungkin tertagih": tidak diulang (pola ADR-061).
8. **Tanda niat dan tanda terima (pola ADR-061)** di `data/build/audio/` (tidak di-git): `intents/<kunci>.json` ditulis sebelum setiap permintaan berbayar dan dilepas sesudah hasil tersimpan atau galat yang pasti belum tertagih. Selama niat terputus ada, `submit` menolak jalan sampai diperiksa (Speech History) dan dilepas dengan `pnpm audio release`. `receipts.jsonl` mencatat `character-cost` setiap permintaan (biaya aktual). Tanda terima ditulis SEGERA sesudah respons 200, sebelum keluarannya diurai. Keluaran yang bukan MP3 sambungan tetap tercatat biayanya; bait mentahnya disimpan di `rejected/` dan tidak masuk cache. `sample` memakai niat dan tanda terima yang sama. Cache segmen per sidik permintaan (penyedia, model, format, suara, bahasa, teks sesudah leksikon), jadi sintesis yang sama tidak pernah ditagih dua kali. `submit` wajib `--budget-chars` + `--confirm`, dan pagu dipotong sisa kuota bila kunci boleh membacanya.
9. **MP3 CBR bersambung.** Penyambung per bingkai (`tools/audio/src/mp3.ts`) membuang ID3/APE dan bingkai Xing/Info/VBRI. Ia menolak format atau bitrate yang berubah (tanpa indeks Xing, browser menghitung durasi dan posisi lompat dari ukuran berkas ÷ bitrate) dan bingkai pertama yang meminjam bit reservoir. Bingkai sunyi memakai bitrate yang sama dengan padding rata-rata, jadi offset bab = jumlah sampel segmen sebelumnya + jeda, tepat sampai sampel.
10. **ID3v2.4** (ditulis sendiri, deterministik): judul "Intisari: …", pembaca "Dibacakan suara AI (<suara>, elevenlabs eleven_v4)", lisensi CC BY-NC-SA 4.0 (TCOP + WCOP), halaman Intisari (WOAS), komentar = kalimat label + "pintu ke kitab" + atribusi teks sumber, TXXX `AI_GENERATED` (model Intisari + model suara).
11. **Kunci objek memuat sidik ISI berkas, bukan sha skrip** (penyempurnaan ADR-097 butir 6): `<karya>/<lang>/<node>-<12 heks sha256 MP3>.mp3`. Ganti suara, leksikon, atau skrip selalu menghasilkan kunci baru, sehingga objek tidak pernah ditimpa. sha skrip tetap di manifest dan `audio_track.script_sha256` untuk pencocokan. Manifest menyimpan riwayat; ingest memilih track terbaru yang skripnya cocok per (node, bahasa, jenis suara).
12. **R2.** Bucket `surau-media` dibuat 2026-10-25 (APAC, r2.dev mati). Domain `media.surau.org` menunggu Zone ID surau.org (T-32), karena wrangler butuh `--zone-id` dan agen tidak membaca berkas kredensial. Unggah lewat `wrangler r2 object put` (`Content-Type: audio/mpeg`, `Cache-Control: public, max-age=31536000, immutable`), dengan HEAD ber-query unik (melewati cache tepi) sebelum dan sesudahnya. Objek yang sudah ada berukuran sama dilewati, berukuran beda = galat. `pnpm audio verify` = HEAD jalur publik (status, tipe, ukuran, cache immutable) + Range 206 + sha256 isi. Tanpa CORS (`<audio>` tanpa `crossorigin`).
13. **Sumber skrip = korpus staging** (getPlatformProxy remote, hanya SELECT, pola tools/eval). Pilot memakai Intisari pilot X15b di staging; produksi memakai build `ihya-v9` yang dimuat ke staging (X15c), sehingga skrip sama dengan yang dibangun ulang ingest.
14. **Ingest:** satu Intisari yang skripnya gagal dibangun (`ScriptError`/`RangeError`) tidak menggagalkan build atau `plan`/`submit`: di ingest audionya gugur sebagai `script_error`, di alat audio node itu dilaporkan dan dilewati. ID baru dari putaran pertama yang dilaporkan, karena peta ID wajib di-commit. Selebihnya, `selectBuildAudio` membangun ulang skrip dengan `loadDigestScript` atas `.sqlite` hasil build (adaptor `D1Db` di atas `node:sqlite`), lalu `selectAudioTracks`. Bila ada track yang cocok, CLI ingest membangun sekali lagi dengan opsi `audioTracks`. Build deterministik (peta ID dan sidik teks sudah ditulis putaran pertama), dan `meta` tetap berkas SQL terakhir. Track basi, tanpa Intisari, atau tergantikan dilaporkan.
15. **Pemutar web.**
    - `components/listen/engine.ts`: satu `HTMLAudioElement` di modul, dibuat dan `play()`-nya dipanggil sinkron di handler tekan (iOS), `preload="none"`, tetap hidup saat navigasi klien.
    - `PlayButton`: nama aksesibel = teks terlihat ("Dengarkan 2 menit"), label suara AI sebagai deskripsi.
    - `MiniPlayer` lewat `next/dynamic` `ssr:false`: ±15 dtk, bab = gagasan, kecepatan 0,75–2×, slider + waktu, Media Session (metadata "Suara AI · Surau", play/pause, seek, bab berikut/sebelum, `setPositionState`).
    - `ListenProvider` di `surau-shell.tsx`.
    - Posisi di localStorage `surau:listen:v1`: kecepatan, track terakhir, ≤ 50 posisi; kunci objek berubah = mulai dari awal; track selesai atau pemutar ditutup tidak dipulihkan. Dicatat di `/privasi`.
    - Sesi dipulihkan sesudah muat ulang dari `…/bab/[id]/intisari/dengar.json` (ISR), kecuali pemutar sudah ditutup selama menunggu.
    - Menekan lagi sesudah galat memuat ulang audio dari posisi terakhir.
    - Media Session dibersihkan saat pemutar ditutup.
    - Judul cadangan yang berupa judul Arab dari DB (`titleLang: "ar"`) dirender lewat `ArabicInline`.
    - CSP penuh nanti wajib memuat `media-src https://media.surau.org`.
    - Halaman uji `/dev/dengar` + audio sunyi yang dibangkitkan (Range) untuk e2e, digerbang `DEV_PAGES` yang identik dengan PR #138 (X16).

**Tidak dipilih:**
- SDK npm ElevenLabs: dependensi besar untuk tiga endpoint.
- Tag `[pause]`: durasi tidak dijanjikan dan memakan karakter.
- Kamus lafal API: izin kunci tambahan dan versi kamus terpisah.
- Kunci objek dengan sha skrip: bentrok bila suara atau leksikon berganti.
- Audio VBR + indeks Xing: lebih rumit tanpa manfaat bagi narasi 64 kbps.
- Route Worker untuk audio (ADR-097).
- Menyimpan posisi dengar di server: data pribadi tanpa manfaat sepadan.
- Skrip ditulis LLM (lebih luwes): ADR-097 menolak LLM baru, dan ingest harus bisa membangun ulang skrip yang sama persis untuk mencocokkan sha.

**Konsekuensi:**
- Biaya: kalimat label dibayar sekali per karya, dan sisanya ±1 karakter per karakter skrip (v4 US$0,08/1.000).
- Kunci T-29 sebaiknya juga berizin *User: Read* dan *Voices: Read*. Tanpa itu `plan` tidak bisa membaca kuota, dan `submit` butuh `--voice-name`.
- `media.surau.org` belum hidup sampai T-32; `upload` menolak jalan bila HEAD tidak jelas.
- `audio_track` tetap kosong sampai pilot (izin pemilik) dan build berikutnya.
- Halaman Intisari (X16): `ListenSlot` merender `PlayButton` sebagai blok di bawah baris kepala, karena tombol + keterangan tidak sah di dalam paragraf baris kepala. Track dihitung rute halaman dengan segmen karya kanonis, sama dengan `dengar.json`.

**Tinjau ulang bila:** timestamps v4 terbukti ada (sorotan per kalimat: `alignment_key`), uji dengar menolak lafal bawaan v4 untuk banyak istilah (kamus lafal API), penyedia lain dipakai (Chirp 3 HD/Gemini TTS lewat `TtsProvider`), narator manusia tersedia (`voice_kind` human didahulukan), atau keluaran penyedia berubah menjadi VBR.

## ADR-101 · Gaya narator Dengar: tag audio v4 dari daftar tetap, dipilih kode per peran kalimat, bawaan polos sampai uji dengar A/B — diterima (kode; pemakaian menunggu T-31) · 2026-10-25

**Konteks:** pemilik bertanya (2026-10-25) apakah kutipan, kisah, dan syair perlu dibacakan lebih ekspresif dengan tag audio eleven_v4. Narasi yang datar 10–15 menit melelahkan, dan pendengar tanpa teks butuh penanda bunyi "ini kutipan". Di sisi lain ada risikonya: ekspresi bisa terdengar seperti memerankan tokoh (dekat dengan roleplay orang pertama yang dilarang), nada yang keliru mengubah kesan makna teks agama, tag v4 tidak sepenuhnya bisa diprediksi, dan ADR-097/docs/05 §12 menetapkan narator netral tanpa gaya dramatis.

**Keputusan:**
1. **Peran kalimat ditentukan kode** (`SentenceRole`, skrip v2): terjemahan kutipan teks atau riwayat = `quote`, terjemahan syair = `poetry`, selebihnya `narration`. Penentuannya dari jenis kutipan yang sudah dihitung kode, tidak pernah dari model. Kata yang dibacakan tidak berubah.
2. **Gaya = daftar tag tetap dan berversi** (`tools/audio/src/style.ts`):
   - `polos` (tanpa tag, bawaan);
   - `khidmat@1`: `[calm]` untuk narasi, `[thoughtful]` untuk kutipan, `[softly]` untuk syair.
   Tag dipasang di awal kalimat hanya saat peran berubah; kalimat pertama segmen = nada dasar. Ekspresinya milik narator yang mengutip, bukan tokoh yang dikutip. Emosi kuat (marah, menangis, tertawa, berbisik), tiruan suara, dan efek dilarang. Hanya tag terdaftar yang lolos pemeriksaan teks akhir; `[ ]` lain tetap ditolak (aturan 11).
3. **Gaya dicatat** di manifest (`style`) dan ikut sidik permintaan TTS, sehingga polos dan khidmat tidak berbagi cache. Gaya tidak ikut sha skrip, karena ingest mencocokkan isi, bukan cara membaca.
4. **Diputuskan lewat telinga.** `pnpm audio sample --demo-gaya` membuat satu contoh (±900 karakter, berbayar, izin pemilik): versi A tanpa gaya, lalu versi B khidmat, dengan teks demo buatan (narasi, kutipan, syair). Pemilik (dan Ust. Anas bila bisa) menilai di T-31. `submit --gaya khidmat` baru dipakai bila lolos.
5. **`variatif@1`** (permintaan pemilik 2026-10-25, sesudah memilih khidmat di uji A/B): sama dengan khidmat, ditambah `[warm]` untuk kalimat pertama pembuka dan untuk kepala + judul gagasan. Kalimat baku buatan kode (label AI, anjuran, tanda takhrij, pengantar kutipan, penutup) selalu `[calm]`. Dibandingkan di bab "Keutamaan belajar" (100006), suara Kang Sugiman.
6. **Kisah** di isi gagasan (teks AI) tidak diberi gaya tersendiri: kode tidak bisa mengenalinya tanpa menebak.

**Tidak dipilih:**
- Model memilih tag per kalimat: tidak bisa diaudit, dan rawan dramatis.
- Tag emosi per tokoh: terdengar seperti memerankan ulama.
- Mengubah kecepatan atau suara per peran: v4 tidak punya kontrol kecepatan, dan suara kedua melanggar "satu suara per Intisari".

**Konsekuensi:**
- `SCRIPT_VERSION` naik ke 2 (belum ada audio, tanpa biaya terbuang).
- Manifest mewajibkan `style`.
- Biaya uji A/B ±900 karakter.

**Tinjau ulang bila:** uji dengar menilai khidmat berlebihan atau malah kurang, ElevenLabs merinci perilaku tag v4, atau narator manusia tersedia.

## ADR-102 · Label suara AI hanya sebagai teks, tidak diucapkan di audio — diterima (keputusan pemilik) · 2026-10-25

**Konteks:** ADR-097/100 dan docs/05 §12 membuka setiap audio dengan "Intisari ini dibuat AI dan dibacakan suara AI." Sesudah mendengar pilot (bab 100006, suara Kang Sugiman, gaya variatif), pemilik memutuskan kalimat itu dihapus. Alasannya: audio lebih mudah dipotong, dan kalimat yang sama tidak diulang di setiap bab ("cukup label teks di web").

Agent menyampaikan risikonya lebih dulu dan menawarkan jalan tengah (label ringkas "Intisari Surau, dengan suara AI."). Pemilik tetap memilih hapus. Risikonya: rekaman yang beredar terpisah dari situs bisa dikira suara manusia, dan transparansi konten sintetis tidak lagi terdengar di audionya.

**Keputusan:**
- Skrip v3: tidak ada kalimat label di audio. Segmen pembuka hanya "Dari kitab … karya …" (atau tidak ada, bila judul Latin karya tidak ada).
- Label suara AI tetap ada sebagai teks:
  - tombol Dengarkan ("Dibacakan suara AI (…)");
  - pemutar mini;
  - Media Session ("Suara AI · Surau");
  - metadata ID3 (TPE1 "Dibacakan suara AI", COMM, TXXX `AI_GENERATED`).
- docs/05 §12 dan teks-arab aturan 11 diubah sesuai keputusan ini.
- Contoh dengar (`pnpm audio sample`) juga tanpa label lisan.

**Konsekuensi:** audio pilot lama (skrip v2) gugur saat ingest (`stale_script`); hanya berkas lokal, belum diunggah.

**Tinjau ulang bila:** audio mulai dibagikan sebagai berkas lepas (podcast, unduhan), ada keluhan pendengar yang mengira narator manusia, atau aturan transparansi konten sintetis mewajibkan label lisan.

## ADR-103 · media.surau.org dilayani Worker `surau-media` (R2 binding + Workers Caching), bukan domain kustom R2 langsung — diterima · 2026-10-25

**Konteks:** ADR-100 butir 12 merencanakan domain kustom R2 `media.surau.org` untuk bucket `surau-media`. Setelah domain tersambung (T-32, status `active`), semua permintaan ke `media.surau.org` dijawab 404 HTML dengan header `x-preview-user-error: true`, padahal objeknya ada di bucket (6.490.629 byte, sama dengan berkas lokal). Penyebabnya: Preview per PR web memakai domain kustom `surau.org` (`pr-N.surau.org`), dan Cloudflare membuat wildcard DNS + sertifikat `*.surau.org` untuk itu. Wildcard ini menangkap subdomain yang bukan Worker custom domain, termasuk domain kustom R2. `mcp.surau.org` (Worker custom domain) tidak terkena. Docs Cloudflare (Workers › Previews › Custom domains, Sep 2026) menganjurkan nama khusus seperti `previews.example.com` bila domain produksi sudah punya subdomain. Pilihan itu membuat Preview menjadi subdomain tingkat dua (`pr-N.previews.surau.org`), yang butuh Advanced Certificate Manager (US$10/bulan). Rute tanpa Worker (negasi) butuh dashboard pemilik, dan belum pasti berlaku untuk perutean Preview.

**Keputusan:**
1. Worker baru `apps/media` (`surau-media`) dengan Worker custom domain `media.surau.org` dan binding R2 `MEDIA` (hanya `head`/`get`). Domain kustom R2 dilepas (`wrangler r2 bucket domain remove`). Objek tidak berubah.
2. Hanya `GET`/`HEAD` dengan kunci berbentuk `audioObjectKey` (`<karya>/<lang>/<node>-<sha12>.mp3`). Selain itu 404 `no-store`. Metode lain 405. `Content-Type: audio/mpeg` dan `Cache-Control: public, max-age=31536000, immutable` ditetapkan kode, karena kunci memuat sidik isi. Konstanta disamakan dengan `@surau/core` dan dijaga tes.
3. **Workers Caching** (`cache.enabled`, `cross_version_cache: true`, docs Workers › Cache, Okt 2026): Cloudflare menyimpan respons 200 penuh dan melayani `Range` (206) dari cache tanpa menjalankan Worker. Karena itu Worker tidak menangani Range. Cache dipakai lintas versi, jadi deploy tidak mendinginkannya; isi per kunci memang tidak pernah berubah. Query unik (`?cek=…`, HEAD alat audio) melewati cache.
4. `workers_dev: false`, `preview_urls: false`, `invocation_logs: false` (ADR-065, tanpa IP di log). Preview web memutar audio dari `media.surau.org` produksi, karena objek tidak pernah ditimpa.
5. Deploy: job `deploy media` di `deploy.yml` (push ke `main`, sesudah web). Tes handler di project `node` dengan bucket tiruan.
6. **`pnpm audio staging [--confirm]`**: mengganti baris `audio_track` satu edisi di korpus staging dengan track manifest yang skripnya cocok. Pilihan dihitung oleh `selectAudioTracksIn` (core), fungsi yang sama dengan ingest, jadi build korpus berikutnya menghasilkan baris yang sama. Logika pencocokan dipindah dari `tools/ingest/src/audio.ts` ke core (`selectAudioTracksIn`, `audioReport`). Korpus produksi tetap hanya berganti lewat `corpus:promote`. Galat R2 dijawab 503 `no-store`.

**Bukti (2026-10-25):** sesudah deploy, `HEAD` 200 (`audio/mpeg`, 6.490.629 byte, immutable), `Range: bytes=0-99` → 206 `content-range: bytes 0-99/6490629` `cf-cache-status: HIT`. `pnpm audio upload --confirm`: 1 sudah ada + 7 diunggah. `pnpm audio verify`: 8/8 lolos (HEAD + Range + sha256). `pnpm audio staging --confirm`: 8 track dimuat, 0 gugur.

**Konsekuensi:** objek audio yang tidak ada di cache tepi menjalankan Worker sekali per lokasi (permintaan Workers + operasi R2 kelas B). Untuk audio pilot jumlahnya kecil. Docs CSP penuh tetap memuat `media-src https://media.surau.org`.

**Tinjau ulang bila:** Preview web pindah ke domain lain (domain kustom R2 langsung bisa dipakai lagi), Workers Caching berubah perilaku Range atau ukuran maksimum, atau audio mulai butuh kontrol akses.

## ADR-104 · Sorotan kalimat mengikuti audio Intisari (X18): timestamps per kalimat di objek R2 immutable, dua sumber waktu (with-timestamps TTS dan forced alignment), sorotan Highlight API + gulir + ketuk-untuk-lompat — diterima (kode; uji berbayar dan objek nyata menunggu T-29, T-32, izin pemilik) · 2026-10-25

**Konteks:** pemilik bertanya (2026-10-25) apakah teks Intisari bisa disorot mengikuti audio. X17 (ADR-100) menunda sorotan per kalimat dan menyiapkan kolom `audio_track.alignment_key`. Docs dicek 2026-10-25 (`/docs-terbaru elevenlabs`): `POST /v1/text-to-speech/{voice_id}/with-timestamps` mengembalikan `{audio_base64, alignment|null, normalized_alignment|null}` dengan waktu per karakter teks yang dikirim, tetapi docs **tidak menyebut** apakah `eleven_v4` didukung (hanya "model yang bisa TTS"). `POST /v1/forced-alignment` (multipart file + teks) mengembalikan waktu per karakter dan per kata, mendukung bahasa Indonesia, dan ditagih seperti Speech to Text (per durasi audio; tarif persisnya tidak tertulis). Belum ada audio produksi, kunci API (T-29) belum ada, jadi uji pembanding belum bisa dijalankan.

**Keputusan:**
1. **Satuan sorotan = kalimat skrip.** `digestScript` kini juga mengembalikan `sources`: untuk setiap kalimat skrip, rentang [start, end) di teks field yang tampil (`opening`, `abstract`, `closing`, judul/isi gagasan per `ord`, terjemahan kutipan per `ord`), atau null untuk kalimat buatan kode (sumber "Dari kitab …"; label suara AI tidak lagi diucapkan sejak ADR-102, "Gagasan pertama.", pengantar kutipan, tanda riwayat, anjuran, pintu ke kitab). Rentang dipetakan balik lewat peta offset `speakable` (penanda catatan kaki "(١)" dan placeholder ⟦QS⟧ yang diganti tetap utuh di teks tampil) dan dibatasi ke judul yang dipangkas (titik tambahan tidak ikut). `sources` **di luar sha skrip**: sha tetap atas segmen saja (dites), jadi memperbaiki pemetaan tidak menggugurkan audio.
2. **Objek timestamps `.align.json`** (`packages/core/src/audio-alignment.ts`, format 1): `{format, audio_sha256, script_sha256, method, segments: [[start_ms, end_ms] | null][]}` sejajar `segments[i].sentences`. Hanya angka, tanpa teks. Kunci `<karya>/<lang>/<node>-<12 heks sha256 isi JSON>.align.json`, immutable (`Cache-Control` sama dengan MP3, `Content-Type: application/json`), tidak pernah ditimpa. Kalimat urut waktu (skema menolak mulai yang mundur; pemetaan membuang yang mundur menjadi null).
3. **Manifest:** track punya `alignment` (`r2_key`, `sha256`, `bytes`, `method`) atau null (bawaan, jadi track lama tetap valid). Boleh ditambahkan sesudah track tercatat: `mergeTracks` hanya mengganti rujukan timestamps track yang sudah ada, objek audionya tetap. Ingest mengisi `audio_track.alignment_key` (migrasi 0009 sudah menyiapkan kolomnya; skema korpus tidak berubah). `DigestView.audio.alignment_key` (juga di MCP `get_section_digest`).
4. **Dua sumber waktu, satu pemetaan** (`tools/audio/src/align.ts`): token bertimestamp dicocokkan **berurutan** ke teks (bukan per indeks; lompatan maksimal 64 karakter), sehingga spasi yang dibuang, tanda baca terpisah, atau token asing tidak menggeser kalimat sesudahnya; kalimat tanpa token = null.
   - **tts_timestamps** (`pnpm audio submit --timestamps`): setiap permintaan memakai `/with-timestamps`; waktu karakter TEKS YANG DIKIRIM (sesudah leksikon, termasuk IPA `/…/`) dipetakan ke kalimat lewat rentang kalimat di potongan itu, lalu digeser ke awal potongan di berkas rakitan (sampel MP3, sama dengan bab). Tag gaya narator (ADR-101) di awal kalimat tidak masuk rentang kalimat. Timestamps hanya dibuat bila SEMUA potongan punya `alignment`; `alignment` null atau rusak diterima tanpa galat (respons 200 tetap tertagih dan tercatat). Cache segmen menyimpan waktu karakternya.
   - **forced_alignment** (`pnpm audio align [--node] --confirm`): untuk berkas rakitan tanpa timestamps, termasuk audio yang sudah diunggah. Teks = kalimat skrip seperti DIUCAPKAN (alias leksikon diterapkan; IPA tidak, karena katanya tetap sama), dipisah spasi. Skrip dibangun ulang dari staging dan wajib sha-nya sama dengan audio. Tanda terima di `align-receipts.jsonl` (durasi audio, bukan karakter), juga bila badan respons 200 rusak. Wajib `--budget-minutes` bersama `--confirm` (pagu menit audio, sejalan `submit --budget-chars`). Tanpa tanda niat: permintaan murah, gagal jaringan dilaporkan sebagai "mungkin tertagih".
   - Kunci cache segmen tidak memuat `--timestamps` (waktu karakter bukan bagian bunyi): segmen yang sudah ada tanpa waktu karakter dipakai ulang tanpa ditagih lagi, sehingga track itu tanpa tts_timestamps dan `submit` mencetak "belum (pnpm audio align)". Forced alignment melengkapinya.
5. **Jalur bawaan diputuskan oleh uji, bukan dari ingatan.** `pnpm audio align-test --voice ID --confirm` mengirim satu teks ±300 karakter ke `/with-timestamps` v4 (niat + tanda terima seperti `sample`), lalu forced alignment atas MP3 yang sama, dan mencetak per kalimat waktu kedua sumber + selisihnya (laporan JSON di `data/build/audio/align-test/`). Sampai uji itu dijalankan (butuh T-29 + izin pemilik, ≤ 2.000 karakter), jalur yang pasti adalah forced alignment; `--timestamps` opsional. Bila v4 mengembalikan `alignment` dan selisihnya kecil, `--timestamps` menjadi kebiasaan pilot (gratis, tanpa permintaan kedua); bila null, forced alignment.
6. **Web (`components/listen/follow*.ts`).** Rute halaman Intisari menghitung target sorotan dari skrip (`digestFollow`: `digestScript(view)` + `followTargets`) hanya bila audio punya `alignment_key`; elemen teks yang dibacakan diberi `data-say` (+ `data-say-at` untuk paragraf `Prose`). `ListenFollow` (klien, tidak merender apa pun) hanya memantau apakah audio halaman ini (kunci objek yang sama) dimuat pemutar; logikanya (`follow-run.ts`) dimuat malas:
   - mengambil objek timestamps (fetch lintas asal ke `media.surau.org`), menolak bila jumlah kalimatnya ≠ target atau `script_sha256`-nya ≠ sha skrip halaman;
   - menyorot kalimat aktif (kalimat terakhir yang sudah mulai; bertahan selama jeda) dengan CSS Custom Highlight API `::highlight(surau-dengar)`: Range di atas teks yang ada, DOM tidak diubah (pola Cari; `rangesFor` dipindah ke `lib/text-ranges.ts`); kalimat buatan kode tidak menyorot apa pun;
   - menggulir mengikuti kalimat aktif selama diputar bila keluar dari pita baca (di bawah kepala, di atas pemutar mini), kecuali pembaca menggulir sendiri dalam 5 detik terakhir (wheel/touchmove/tombol gulir); tanpa animasi bila `prefers-reduced-motion`;
   - mengetuk teks yang dibacakan melompat ke awal kalimatnya (caret dari titik ketuk; bukan di tautan/tombol, bukan saat memilih teks); papan ketik tetap memakai kontrol pemutar;
   - browser tanpa Highlight API: gulir dan ketuk tetap jalan.
   CSS baru hanya aturan sorotan + kursor (+ warna sistem di `forced-colors`) di `globals.css` (bukan CSS komponen HeroUI). CSP penuh nanti wajib `connect-src https://media.surau.org`. JS awal halaman bertambah hanya `ListenFollow` + target kalimat di payload RSC.
7. **Worker media melayani timestamps** (perluasan ADR-103): `apps/media` kini juga menerima kunci `alignmentObjectKey` (`<…>-<sha12>.align.json`, pola disamakan dengan `ALIGNMENT_KEY` dan dijaga tes) dengan `Content-Type: application/json`, cache immutable yang sama, dan `Access-Control-Allow-Origin: *`, karena timestamps dibaca `fetch` lintas asal (berbeda dengan `<audio>`; isinya publik dan immutable). Audio tetap tanpa CORS. Draf awal sesi ini memakai kebijakan CORS bucket R2 (`r2-cors.json`); itu tidak berlaku lagi sejak ADR-103 (Worker, bukan domain kustom R2) dan dihapus. `pnpm audio verify` juga memeriksa objek `.align.json` (tipe, ukuran, cache, sha, header CORS).
8. **Fixture:** `/dev/intisari` (Preview, `DEV_PAGES`) memutar audio sunyi buatan dengan timestamps buatan dari panjang kalimat skrip fixture (`/dev/intisari/sorotan.json`), untuk e2e dan pratinjau tanpa ElevenLabs atau media.surau.org.

**Tidak dipilih:**
- Sorotan per kata: ukuran objek berlipat dan gangguan visual; datanya bisa diturunkan nanti dari forced alignment bila diminta.
- Membungkus kalimat dengan `<span>` di server: mengubah DOM halaman ISR untuk semua pembaca (juga yang tidak mendengar) dan pemetaan teks Cari/pembaca.
- Timestamps di D1 (kolom JSON): skema X15a sudah memilih objek R2, dan halaman tidak perlu memuatnya sebelum audio diputar.
- Proxy timestamps lewat Worker web (asal sama, tanpa CORS): tambahan permintaan Worker per pemutaran; Worker media sudah ada dan dicache tepi.
- `normalized_alignment`: memetakan teks hasil normalisasi penyedia, bukan teks yang kami kirim.
- Menetapkan with-timestamps v4 sebagai jalur tunggal sebelum diuji: docs diam soal dukungan v4.

**Konsekuensi:**
- Audio lama tetap valid (sha skrip tidak berubah); timestamps bisa ditambahkan kapan saja dengan `align`.
- Biaya: tts_timestamps tanpa biaya tambahan menurut halaman harga (tidak ada tarif terpisah); forced alignment ±tarif STT per jam audio (Scribe v2 US$0,22/jam di halaman harga, belum pasti berlaku), ±1,3 juta karakter ≈ 24 jam ≈ ±US$5 bila seluruh produksi memakainya.
- Sorotan nyata baru tampil sesudah: T-29 (kunci) → izin uji `align-test` → pilot audio X17 → `align`/`--timestamps` → `upload` + `manifest` → deploy Worker media (merge ke `main`) → `pnpm audio staging` / build korpus. Sampai itu, Preview memperlihatkannya di `/dev/intisari`.

## ADR-105 · Agent menggantikan penilaian ustadz untuk sementara (Jawab, label takhrij, T-17 tahap 3), dicatat terpisah dan tidak pernah berlabel ustadz — diterima (permintaan pemilik; penerimaan sebagai syarat R4 diputuskan di `/rilis 4`) · 2026-10-26

**Konteks:** pemilik ingin segera rilis, sementara T-24 (Anas) masih ditunda. Ia meminta agent "mengerjakan eval/gantikan ustad untuk sementara", lalu "kerjakan semuanya: paket Rilis 4, label takhrij, dan T-17 tahap 3" (chat 2026-10-26). Ada contoh sebelumnya: T-16/T-17 tahap 2 dinilai agent dan diterima sebagai penyimpangan di `/rilis 2` (ADR-048), dan T-31 butir 4 (X15b). Syarat R4 (FASE) dan pra-registrasi T-17 tahap 3 menyebut ustadz atau penilai manusia secara eksplisit.

**Keputusan:**
1. Agent menilai dengan membaca teks Arab `text_raw` korpus `ihya-v7` (ekspor hanya-baca D1). Tidak ada panggilan API berbayar terpisah, tetapi teks kitab, soal (termasuk holdout), dan jawaban dibaca sesi agent Claude Code, sehingga diproses Anthropic (dicatat di `evals/README.md`, ADR-045). Terjemahan AI hanya alat bantu. Pekerjaan dibagi ke subagen berkonteks baru. Holdout dinilai subagen tersendiri: rincian lengkapnya hanya ditulis ke berkas privat, dan yang dilaporkan ke agent induk hanya ID dan kategori. Agent induk mengecek ulang sebagian temuan terhadap teks Arab.
2. **Tidak pernah berlabel ustadz.** `disetujui_oleh` soal tetap `null`. Tidak ada baris yang ditulis ke `review`, `takhrij_review`, atau `translation_revision`. Label situs tetap "dikenali otomatis …, belum ditinjau". `TAKHRIJ_USTADZ_KEYS` tidak berubah. Setiap berkas hasil mencatat penilai "Agent (pengganti ustadz sementara, bukan manusia)".
3. Hasil disimpan sebagai berkas yang bisa diaudit:
   - Laporan Jawab: `evals/reports/jawab-agent-pengganti-2026-10-26.md`, dengan rincian soal publik di `evals/jawab/tinjauan/agent-2026-10-26.jsonl`. Holdout dan nilai per jawaban ada di `evals/private/` dan R2 `surau-evals` (kunci baru, tidak menimpa).
   - Label takhrij: `data/reports/ihya-9472-takhrij-agent-2026-10-26.md` dan `data/reviews/…-takhrij-agent-2026-10-26.jsonl`.
   - T-17: bagian *Hasil* pra-registrasi (penyimpangan bertanggal) dan `data/reviews/ihya-9472-t17-tahap3-{hasil,detail}-agent.*`.
4. Penilaian agent **bukan** kalibrasi judge Sonnet (docs/06). Kalibrasi tetap menunggu ±30 penilaian manusia.
5. Di `/rilis 4`, pemilik memutuskan per syarat apakah penilaian agent diterima sebagai penyimpangan. Penilaian manusia kapan pun tetap menggantikan penilaian agent.

**Hasil (ringkas):**
- **Soal:** 48/60 disetujui apa adanya (< 50 yang disyaratkan R4), 12 perlu revisi, 5 kunci keliru (j014, j023, dan 3 holdout). j018/j019/j021 perlu ditulis ulang, bukan dilonggarkan kuncinya. Kunci j023 seharusnya rentang j4 h283–292.
- **42 jawaban x06:** 19 Benar, 20 Kurang, 3 Salah. Kesetiaan 76,2%, atribusi 97,6%, bahasa 3,74, 1 kalimat bernada fatwa, menolak 8/8, status hadits 4/6.
- **Label takhrij** (253 sampel berstrata): 192 setuju, 42 koreksi, 19 ragu, 41 menyesatkan. Presisi deteksi 94,0%. 11 pola aturan perlu diperbaiki (versi 2), termasuk catatan kaki yang tergabung di data.
- **T-17 tahap 3:** Benar 71,9%, Salah 13,3% (tertimbang), jadi **tidak lolos**. Keputusan pra-registrasinya terjemahan ulang terarah, dengan strata panjang paling lemah (Benar 35%). Pemicu tinjau ulang ADR-048 (Salah > 10%) terpenuhi, dengan catatan penilainya agent. Penilai manusia pertama yang menyelesaikan 60 nomor tetap menjadi estimasi resmi. Ditemukan juga kutipan ayat yang diterjemahkan AI (T-17 no. 12; j019 di Jawab), sisa risiko ADR-042.
- **Kesimpulan:** syarat R4 belum terpenuhi walaupun penilaian agent diterima. `/rilis 4` belum disarankan.

**Tidak dipilih:** menulis penilaian agent ke `/tinjau` dengan nama penilai agent. Cara itu memang memakai alur golden yang ada, tetapi data produksi berisi penilai non-manusia, dan pemilik bisa salah membacanya di antrean Anas. Tidak dipilih juga: menerapkan revisi soal dan kunci sekarang. Soal yang ditulis ulang harus dijalankan ulang (berbayar), dan kunci yang diubah sesudah melihat jawaban berisiko menaikkan angka secara tidak jujur (aturan keras 5). Revisi diterapkan bersama run baru.

**Tinjau ulang bila:** Anas atau penilai manusia lain mulai menilai (bandingkan kesepakatan dengan agent pada butir yang sama), atau `/rilis 4` menolak penyimpangan ini.

## ADR-106 · Mutu Jawab dari penilaian agent: prompt `answer@7`, pipeline@8, versi soal 2 — diterima · 2026-10-26

**Konteks:** penilaian agent pengganti ustadz (ADR-105) atas 42 jawaban run x06 (`answer@6`, Haiku 5.5) memberi 19 Benar / 20 Kurang / 3 Salah, kesetiaan 76,2% (syarat R4 ≥ 95%), bahasa 3,74 (≥ 4), 1 kalimat bernada fatwa, status hadits 4/6, dan lokasi 85,3% (≥ 90%). Laporan itu mencatat 10 pola kegagalan (§2) dan 10 usulan prompt/kebijakan (§3), serta 12 soal yang perlu revisi.

**Keputusan:**
1. **Prompt `answer@7`** (`packages/llm/prompts/answer-v7.ts`). Tambahannya: penilai yang dinukil atau dibantah al-'Iraqi disebut; riwayat lemah, tanpa asal, tanpa sanad, atau tidak ditemukan marfu' tidak disebut "sabda Nabi" tanpa catatan walau pertanyaannya bukan soal status; riwayat mauquf disampaikan bersama ketiadaan versi marfu'; kalimat "Status hadits:" paling banyak sekali per hadits dan hanya bila bersitasi takhrij di kalimat itu; jawaban tidak menyebut "dokumen", "lampiran", "konteks", atau "terjemahan AI"; kesimpulan negatif hanya "Di bagian yang ditemukan, …" sesudah memeriksa paragraf sesudahnya; nama kitab/bab hanya dari baris "Bagian"; rangkuman tetap beratribusi tanpa anjuran bersuara Surau; pelaku dan kata ingkar diperiksa; ayat yang dipakai berdalil tidak diparafrasekan; setiap bagian pertanyaan dijawab; tanpa pengantar "sebagai berikut" yang meninggalkan celah lafaz. Kalimat baku tetap sama.
2. **Pipeline@8** (`JAWAB_PIPELINE_VERSION` = 8, ikut kunci cache):
   - Konteks bagian dokumen selalu memuat judul kitab (`sectionPath`): sebelumnya hanya dua judul terdekat, sehingga paragraf di bab/pasal yang dalam kehilangan nama kitabnya dan model menebaknya (j022).
   - Baris "Ayat yang dikutip" di konteks dokumen memuat pengingat "sebut rujukannya saja".
   - `HADITH_NOT_CITED` dirumuskan ulang tanpa "tidak dipastikan" ("Status hadits: lihat bagian "Status hadits", …"). Pemberitahuan yang berdiri sendiri satu baris **dibuang** hanya bila jawaban juga memuat baris label status bersitasi takhrij (kode); tanpa baris label pemberitahuan tetap ada, karena takhrij yang tersitasi bisa milik hadits lain (peninjau). Di butir daftar atau di tengah paragraf pemberitahuan tetap ada, supaya tidak meninggalkan butir kosong; tanpa klaim tetap `HADITH_UNKNOWN`. Gabungan pemberitahuan dengan pernyataan model "belum diketahui" kini tetap `HADITH_UNKNOWN` (tidak pernah dibuang). Ini menjawab j025–j029: takhrij disampaikan benar, lalu ditutup kalimat "tidak ditampilkan (… tidak dapat dipastikan)" yang bertentangan. Kalimat model yang tidak bersitasi tetap tidak pernah tampil sebagai status.
   - Diagnostik baru `pipeline_terms` (istilah pipeline bocor) dan `ayah_gloss_suspect` (kalimat dengan rujukan QS + penanda makna/kutipan), di `JawabDiagnostics` dan log Worker. Keduanya heuristik dan **tidak menyaring** jawaban.
3. **Parafrase ayat (j019) tidak bisa dicegah kode secara pasti.** Penyelidikan: QS 98:5 ada di matan 10018810 (j4 h376) dan konteks dokumen sudah menyebut rujukannya; terjemahan AI di konteks memakai placeholder ⟦QS⟧, jadi model menerjemahkan dari teks Arab matan sendiri ("ikhlas berarti menjadikan agama ini semata-mata untuk Allah"). Parafrase makna tidak cocok secara leksikal dengan terjemahan Kemenag, sehingga pencocokan n-gram tidak menangkapnya; penyaringan semantik butuh LLM lagi. Pilihan: pengingat di prompt dan konteks dokumen + diagnostik heuristik untuk eval dan log. Penilaian manusia/agent tetap memeriksa ayat.
4. **Versi soal 2** (`evals/jawab/ihya-draf-v2.jsonl`, `git mv` dari v1; ID tetap, hash soal berubah): j018, j019, j020, j021 ditulis ulang supaya menunjuk konteks halaman gold (kunci tetap); j009 sumber ditambah; j041 poin "bukan petunjuk keselamatan" dipindah ke catatan gaya; j014 dan j023 **kunci keliru** dibetulkan ke rentang yang ditunjukkan penilai (j4 h290–292; bagian 100279 + j4 h283–292) dengan pertanyaan j023 diperjelas. Pembetulan j014/j023 memperluas kunci lokasi, dan j009 (sumber) serta j041 (poin) mengubah kunci isi tanpa menulis ulang pertanyaan; keempatnya dilaporkan dengan kunci lama dan baru secara terpisah. Pertanyaan j018–j021 ditulis ulang supaya menunjuk konteks tanpa memuat isi poin kunci (peninjau: rumusan pertama menggemakan poin); karena pertanyaannya berbeda dari x06, keempatnya ditandai tidak sebanding di laporan perbandingan. 4 holdout direvisi di `evals/private/jawab.jsonl` (cadangan v1 di `jawab-draf-v1.jsonl`), salinan R2 kunci baru `surau-evals/jawab/2026-10-26-draf-v2.jsonl`. `disetujui_oleh` tetap `null` di semua soal.
5. **docs/05 §5** diselaraskan dengan prompt: premis keliru memakai kalimat baku "Anggapan dalam pertanyaan ini tidak didukung teks Ihya." lalu menjelaskan isi teks; kesimpulan negatif hanya untuk bagian yang ditemukan. Usulan kebijakan "praktik berbahaya bila ditiru" hanya dicatat sebagai pertanyaan terbuka untuk pemilik dan dewan; prompt belum mengaturnya.

**Risiko yang diterima:** `answer@7` meminta penilai takhrij disebut dan riwayat lemah diberi catatan dalam kalimat bebas ("menurut al-'Iraqi, riwayat ini tidak ditemukan sebagai sabda Nabi"). Kalimat seperti itu tidak berawalan "Status hadits:", jadi tidak dipaksa `hadithStatements` menyitasi takhrij dan tidak diganti label kode; ia hanya diperiksa sebagai klaim bersitasi biasa (ADR-069). Celah ini sudah ada sejak X06 dan diperluas prompt ini. Penilaian jawaban (manusia/agent) memeriksanya; detektor kalimat penilaian tanpa sitasi catatan kaki menjadi kandidat pekerjaan lanjutan.

**Tidak dipilih:** membuang setiap pemberitahuan `HADITH_NOT_CITED` (di butir daftar meninggalkan butir kosong, dan untuk hadits yang takhrijnya tidak tersitasi pembaca kehilangan petunjuk); memasangkan pernyataan status tanpa sitasi dengan satu-satunya takhrij yang tersitasi (celah "meminjam" takhrij hadits lain, peninjau S21); memberi terjemahan Kemenag di konteks supaya model menyalinnya (model tetap bisa mengubahnya, melanggar aturan ayat verbatim); melonggarkan kunci j018/j019/j021 tanpa menulis ulang pertanyaan (aturan keras 5).

**Hasil run `x07-publik-answer7-v1`** (42 soal publik, US$0,1205, izin pemilik di chat; dinilai ulang agent, [laporan](../evals/reports/jawab-x07-answer7-banding.md)): Benar/Kurang/Salah 19/20/3 → 17/22/3, kesetiaan 76,2% → 83,3%, atribusi 97,6% tetap, bahasa 3,74 → 3,45, fatwa 1 → 0, menolak 8/8, status hadits 4/6 → 5/6, lokasi kode 85,3% → 91,2% dengan kunci versi 2 (88,2% dengan kunci versi 1). Yang menjadi sasaran membaik; bahasa turun karena terjemahan kutipan disalin mentah, kalimat tambahan sesudah penolakan, dan pembuka meta. R4 belum terpenuhi; `answer@7` tetap dipakai karena perbaikan kesetiaan, fatwa, dan status hadits menyangkut aturan keras, sedangkan bahasa diperbaiki di versi berikutnya.

**Tinjau ulang bila:** run publik `answer@7` dinilai ulang (laporan perbandingan), Anas/penilai manusia menilai jawaban, atau pemilik memutuskan kebijakan praktik berbahaya.

## ADR-108 · Label status hadits aturan versi 2: segmen per catatan kaki tergabung, lafaz yang dikutip tidak dipindai untuk kata ambigu, penilaian yang dibantah, empat jenis baru — diterima · 2026-10-26

**Konteks:** Tinjauan agent atas 253 label versi 1 (ADR-105, [laporan](../data/reports/ihya-9472-takhrij-agent-2026-10-26.md)) menemukan presisi deteksi 94,0% dan 41 label yang bisa menyesatkan, yang dikelompokkan menjadi 11 pola keliru. Dengan aturan versi 1, syarat R4 "status hadits benar 100%" tidak bisa dipenuhi. Belum ada tinjauan manusia di `takhrij_review`, jadi menaikkan versi tidak menghapus apa pun.

**Keputusan:**
1. **`TAKHRIJ_TERMS_VERSION` 1 → 2** (`packages/text/src/takhrij-terms.ts`). Pencocokan tetap per kata atas bentuk `normalizeArabic` dengan rentang mentah `toRawSpan`. Kata kunci ditulis dalam bentuk normal huruf Arab yang terlihat, seperti versi 1; escape `\uXXXX` hanya untuk regex harakat/kontrol (aturan teks Arab).
2. **Segmen:** catatan kaki yang tersimpan sebagai satu paragraf dengan penanda "(N)" internal diikuti "حديث" (35 paragraf, 122 segmen di ihya-v7) dipindai per segmen. Tiap segmen punya pembuka dan bagian lafaznya sendiri (`TakhrijTerms.segments`, `TakhrijTerm.segment`). `takhrijLabel(raw)` = segmen pertama + keterangan "(hadits pertama dari beberapa)". `takhrijLabel(raw, range)` = segmen yang beririsan dengan sitasi; bila lebih dari satu segmen, ditambah "(beberapa hadits)". "Berbeda per jalur" hanya dihitung di dalam satu segmen. `reviewedTakhrijLabel` hanya memakai tinjauan (yang menilai segmen pertama) bila sitasinya hanya mencakup segmen pertama. Sitasi yang mencakup hadits lain di paragraf gabungan tetap label kode, supaya istilah hadits lain tidak pernah tampil "ditinjau ustadz" atau terbuang oleh koreksi. Tanda `weak` kartu kutipan (`takhrijCitedWeak`) dihitung dari semua istilah hadits yang beririsan dengan potongan, dan pratinjau koreksi di antrean memakai `reviewedTakhrijLabel` supaya sama dengan teks di Jawab. Bila teks status melewati 120 karakter, keterangan "beberapa hadits" lalu "berbeda per jalur" dipangkas lebih dulu; istilah pertama selalu masuk. Pemisahan datanya tetap pekerjaan ingest (butir 8).
3. **Lafaz yang dikutip sesudah pembuka:** sesudah "من حديث/من رواية فلان", "بلفظ", "ولفظه", "ولفظ/واللفظ + penghimpun", dan "(و)في رواية + penghimpun", pola bertanda `ambiguous` diabaikan. Pola ambigu adalah kata yang juga lazim di lafaz: "مسلم", "لا بأس به", "موضوع/باطل…", "حسن/صحيح/غريب" tunggal, "دون", "ضعفه/جهله" tanpa nama penilai, dan "ليس بشيء". Pengecualiannya: kata itu langsung disusul pernyataan penakhrij. Bagian lafaz ditutup oleh frasa yang tidak ambigu, "الحديث", "قلت", "وإسناده/ورجاله…", "زاد/لفظ", "وقال", "قال + penilai/penilaian", atau "وهو + penilaian". Penjaga konteks per pola (`ok`): "مسلم/البخاري" tanpa proklitik hanya sesudah kata kerja sumber; "البخاري في التاريخ/الأدب…" bukan Sahih; "لا بأس به" tunggal hanya sesudah "قال فلان" atau "أرجو أنه"; dan "بن/ابن/أبو…" sebelum hasan/sahih/gharib menandai nama.
4. **Penilaian yang dibantah:** jenis baru `dibantah` ("penilaian yang dibantah penakhrij"). Rentangnya penilaian yang dinukil + bantahannya: "وليس كذلك", "وليس كما قال", "قلت بل", dan "ولم يصب" (≤ 4 kata sesudah penilaian apa pun); "وفيه نظر" dan "وليس بجيد/بصحيح" hanya sesudah penilaian baik atau penilaian lemah yang dinukil dari orang lain ("وضعفه المنذري", "قال إنه معضل"); dan "قلت" saja bila penilaian baik langsung disusul penilaian lemah. Sesudah penilaian lemah penakhrij sendiri ("منكر وليس بصحيح") itu penguatan, jadi tetap `daif` dan tanda lemah tidak hilang. "قلت" juga menutup bagian lafaz; di lafaz yang memuat "قلت يا رسول الله" kata ambigu sesudahnya kembali dipindai (risiko yang diterima, sama dengan versi 1). `dibantah` tidak positif dan tidak negatif.
5. **Jenis baru lain:** `lam_ajid_marfu` ("tidak ditemukan sebagai sabda Nabi (marfu')"; tetap bertanda lemah dan tetap dilarang sebagai kutipan pilihan Intisari, `BANNED_TAKHRIJ_KINDS`, supaya perilaku v1 terjaga); `tsiqat` ("perawi/sanad dinilai tepercaya") dan `mukhtalaf` ("perawi/sanad diperselisihkan"). Keduanya bukan penilaian hadits, jadi tidak positif/negatif dan tidak memicu tanda lemah. **Keputusan atas pertanyaan brief:** pernyataan positif tentang perawi dan "mukhtalaf fihi" mendapat jenis sendiri dan tidak dipetakan ke jayyid/daif, karena "rijaluhu tsiqat" tidak sama dengan sanad yang sahih (bisa munqathi'), dan perawi yang diperselisihkan tidak otomatis lemah. "فيه من لا أعرفه/من يجهل/من لم يسم" = `daif` (perawi tak dikenal), bukan "tidak ditemukan".
6. **Bentuk tambahan** (pola 8, 10, 11 di laporan): lihat [laporan v2](../data/reports/ihya-9472-takhrij-v2.md). Penilaian di akhir catatan kaki "حديث …" tanpa pembuka kini membuka takhrij. Rujukan yang juga menyebut sumber berteks "takhrij menyebut sumber riwayat dan merujuk ke takhrij di tempat lain" (`takhrijStatus` menerima konteks `sources`/`mixed`/`tail`).
7. **Ukuran (gratis, ekspor hanya-baca `surau-corpus-ihya-v7`):** kecocokan himpunan jenis dengan 234 keputusan tegas agent **192 → 228 (82,1% → 97,4%)**: setuju 190/192, koreksi 38/42. Ada 41 label menyesatkan; 29 dari 30 yang tegas kini cocok, termasuk gloss j028. Enam yang tidak cocok: tiga akibat salah cetak edisi, satu paragraf gabungan yang dinilai utuh oleh agent, dan dua di mana versi 2 menurut sesi ini lebih tepat (pola "qultu", "laisa fiha dzikr"; perlu dicek manusia). Di seluruh korpus 764/4.398 catatan kaki berubah; setiap jenis yang hilang atau baru per catatan kaki (500 butir) diperiksa agent dengan konteksnya. `pnpm run eval:takhrij`: memuat istilah 76,8% → 78,1%, berbeda per jalur 253 → 248, bertanda lemah 1.368 → 1.385. Penilainya agent, bukan ustadz.
8. **Ingest (dirancang, belum dikerjakan):** pemisahan 35 paragraf gabungan menjadi paragraf `foot` baru (ID segmen pertama tetap, ID baru di ujung seq, `footnote_ref` untuk penanda yatim, alasan `footnote_merged`); file patch untuk matan yang bocor ke catatan kaki (kandidat dari pencocokan bigram JK000001, dipilah); dan patch salah cetak edisi. `text_raw` tidak diubah di sesi ini.

**Tidak dipilih:**
- **Memotong catatan kaki di setiap baris baru** (matan bocor): 46 dari 220 catatan kaki berbaris baru berlanjut dengan takhrij sungguhan.
- **Alias pola untuk salah cetak** ("غير محظوظ" → lemah): label akan menunjuk frasa yang tertulis lain dari artinya. Patch teks yang bisa diaudit lebih jujur; keputusannya menyusul dengan ingest.
- **Memetakan `tsiqat` ke `jayyid` dan `mukhtalaf` ke `daif`:** lihat butir 5.
- **Menghapus penilaian yang dibantah tanpa jejak:** frasa Arabnya tetap ditampilkan bersama gloss `dibantah`, supaya pembaca bisa memeriksa.

**Konsekuensi:**
- Semua tinjauan versi 1 tidak berlaku lagi (ADR-070); belum ada tinjauan manusia, jadi tidak ada yang hilang. Antrean `/tinjau/takhrij` memakai label versi 2 dan menawarkan empat jenis baru. `docs/tinjau-operasional.md` diperbarui.
- Label Jawab, kartu kutipan (`weak`), status Intisari, dan MCP berubah saat deploy: label dihitung dari teks DB, tanpa build korpus baru.
- Syarat R4 "status hadits benar 100%" masih bergantung pada tinjauan manusia; versi 2 hanya mengurangi label menyesatkan pada sampel agent.

**Tinjau ulang bila:** ustadz meninjau label versi 2, pemisahan catatan kaki di ingest selesai, atau patch salah cetak dibuat.

## ADR-107 · Pencocok ayat: kutipan Qur'ani di konteks hadits diterima bila ada kata wahyu, ≥ 8 kata, atau satu ayat utuh (X21) — diterima · 2026-10-26

**Konteks:** T-17 tahap 3 (penilai agent, ADR-105) menemukan kutipan QS 15:98 di p10006163 diterjemahkan AI tanpa placeholder, padahal ayat wajib memakai terjemahan Kemenag (aturan teks-arab 9). Penyebab: mode tanpa tanda ADR-042 menolak deret yang ada tanda konteks hadits (رسول، النبي، وسلم …) dalam 16 kata sebelumnya, padahal paragraf itu berbunyi "أوحي إلى رسول الله … أن سبح بحمد ربك". Pemindaian seluruh korpus (16.111 paragraf badan; mushaf dari `quran_ayah.text_index` produksi; pencocok lokal identik dengan 2.484 rujukan produksi) menemukan 87 deret persis ≥ 5 kata yang satu-satunya di mushaf tetapi ditolak. Setelah dibaca satu per satu, sebagian adalah zikir/hadits (64:1, 2:156, 65:2, 48:2) dan sebagian ayat yang dibacakan Nabi atau sahabat.

**Keputusan:** di `unmarkedSpans`, deret yang lolos semua syarat ADR-042 tetap ditolak di konteks hadits, **kecuali** (a) kata wahyu (*uhiya, yuha, nazalat, unzila, anzala, unzilat*) ada dalam 16 kata sebelumnya, (b) deret ≥ 8 kata (`HADITH_LONG_MIN_TOKENS`), atau (c) deret seluruhnya satu ayat atau lebih dan ≥ 5 kata (`HADITH_WHOLE_MIN_TOKENS`). Awalan zikir yang kebetulan sama dengan ayat ("له الملك وله الحمد وهو على كل شيء قدير", QS 64:1) diblokir untuk ketiganya. Aturan lain ADR-042 tidak berubah (lafaz satu-satunya, tanpa basmalah/istirja'/hasbalah, paragraf badan saja).

**Hasil:** +30 rujukan di 28 paragraf (semua dibaca dan ayat sungguhan: 17:74, 19:42, 2:255, 17:80, 4:64, 41:42, 112:3–4, 55:46, 15:98–99 dan lain-lain); 0 rujukan hilang; `vp test run packages/llm tools/ingest/src/quran` → 11 berkas, 186 tes lolos (termasuk 4 tes baru matcher dan 1 tes v5). Paragraf terdampak otomatis dianggap usang (sha256 teks bertanda berubah) dan diterjemahkan ulang di batch X21 (±US$0,15).

**Sisa risiko (jujur):** deret pendek (< 8 kata, sebagian ayat) di konteks hadits tanpa kata wahyu, dan lafaz berulang di mushaf tanpa pengantar ayat, tetap tidak ditandai dan bisa diterjemahkan AI sebagai "terjemahan AI". Tidak dilonggarkan karena letak yang dipilih untuk lafaz berulang praktis sembarang (ADR-042). Garis dasar: pemindaian menemukan 87 deret persis ≥ 5 kata yang satu-satunya di mushaf dan ditolak; 30 kini diterima, ±57 tetap ditolak (kebanyakan zikir/hadits sungguhan, sebagian ayat pendek). Batas lain yang diketahui: `crossPassageSpans` (kutipan terbelah dua paragraf) masih memakai filter hadits lama tanpa tiga pengecualian. QA terjemahan berikutnya (T-17) memantau.

**Tinjau ulang bila:** penilaian menemukan rujukan baru yang salah dari aturan ini, atau korpus kitab kedua memakai lafaz Qur'ani dalam prosa jauh lebih sering.

## ADR-109 · Terjemahan ulang terarah Ihya (X21): Sonnet 5.5 + `translate-passage@5` untuk strata sedang + panjang, mekanisme pilihan yang mempertahankan terjemahan lama, pagu US$36 — diterima (pemilik, chat 2026-10-26) · 2026-10-26

**Konteks:** T-17 tahap 3 (penilai agent, ADR-105): Benar 71,9%, Salah 13,3% tertimbang; strata panjang Benar 35%. Aturan keputusan 2 pra-registrasi: terjemahan ulang terarah dengan biaya dan izin pemilik. 98% terjemahan korpus dibuat Haiku 5.5 + `translate-passage@2`. Uji buta X21 ([rencana](sesi/X21-terjemahan-ulang-terarah.md), US$1,13 atas izin pemilik, batas US$2,00): pada 24 paragraf baru sedang+panjang, produksi 46% Benar / 8% Salah, Haiku + v5 54% / 13%, Sonnet + v4 83% / 0%, **Sonnet + v5 88% / 4%**, Sonnet + v5 effort medium 96% / 0%.

**Keputusan:**
1. **Model dan prompt:** Sonnet 5.5 + `translate-passage@5`, effort `low`, Message Batches, untuk paragraf badan dengan `text_raw` ≥ 100 karakter (strata sedang dan panjang T-17: 10.492 paragraf). Pemilik menyetujui lingkup dan **pagu US$36** (perkiraan US$28). Effort `medium` tidak dipilih karena selisih 2 butir di bawah ambang pra-registrasi (10 poin); kriteria tidak diubah sesudah melihat hasil. `TRANSLATE_PROMPT` kini v5; v4 tetap tersedia lewat `buildTranslateRequest(..., { prompt })`.
2. **Mekanisme (`tools/ingest/src/llm/retranslate.ts`, berkas `data/reviews/ihya-9472-terjemahan-ulang.json`):**
   - Berkas memilih paragraf menurut `min_chars` dan jilid (`juz`), prompt tujuan (harus sama dengan prompt aktif), dan model. Entri terakhir menang.
   - `pendingRequests`, `submittable`, dan `unresolved` memperlakukan terjemahan lama (sumber sama, prompt lain) sebagai **belum selesai** untuk paragraf terpilih. Berbeda dari lapisan koreksi tinjauan (ADR-047), hasil lama tidak ditolak: `rebuild` hanya menimpanya bila hasil baru lolos validasi, jadi paragraf yang gagal tetap punya terjemahan lama, bukan kosong.
   - Ulangan paragraf terpilih selalu Sonnet 5.5, menyerah sesudah 3 percobaan. Paragraf yang sumbernya berubah (mis. ayat baru dikenali, ADR-107) atau pernah gagal juga langsung ke Sonnet; hanya paragraf yang belum pernah disentuh memakai Haiku.
   - Paragraf dengan revisi manusia yang masih berlaku tidak disentuh (`withoutReviewed`, ADR-082).
   - Versi prompt yang dicatat per hasil diambil dari objek prompt yang sama dengan yang dikirim (aturan teks-arab 8). `pnpm llm terjemah-ulang` meringkas pilihan per jilid (gratis).
3. **Pagu:** `--budget` pada `submit`/`retry` menghitung SEMUA batch di `data/build/llm` (termasuk ±US$4,7 batch S13 dan retry), jadi untuk pagu US$36 terjemahan ulang dipakai `--budget` = terpakai + 36 (perintah menampilkan "Sudah terpakai"). Dikirim bertahap (`--limit`, urutan baca = jilid 1 dulu) dengan proyeksi biaya aktual sebelum tahap berikutnya.
4. **Pengukuran ulang:** T-17 diukur ulang dengan **40 sampel lanjutan** (seed 20261024–26, 13/14/13) yang ditarik dari populasi korpus baru sesudah mengeluarkan 60 sampel pertama dan 30 ID sampel uji X21; 60 sampel pertama hanya pembanding in-sample (terjemahannya ikut diganti). Penyimpangan dari pra-registrasi dicatat bertanggal saat sampel ditarik (populasi pra-registrasi 16.092 tidak bisa direproduksi dari D1).

**Konsekuensi:** hasil uji adalah pemilihan lengan, bukan pengesahan mutu: n kecil, satu penilai Claude Opus per butir. Hasil yang sebenarnya diukur setelah korpus baru dibangun (T-28 dibutuhkan: `data/build/llm`, `data/raw/kemenag`). Paragraf baru (kitab lain) yang belum pernah disentuh masih memakai Haiku + v5, yang pada uji hampir tidak lebih baik dari produksi di sedang+panjang; pertimbangkan Sonnet untuk kitab berikutnya.

**Tinjau ulang bila:** QA T-17 pasca terjemahan ulang masih Salah > 10% atau Benar < 80%, biaya aktual melewati pagu, atau penilai manusia (T-17 resmi) tidak sepakat dengan penilai agent.

## ADR-110 · Bahasa jawaban Jawab: prompt `answer@8`, pipeline@9 (diagnostik kalimat berulang dan salinan terjemahan) — diterima · 2026-10-26

**Konteks:** run `x07-publik-answer7-v1` (ADR-106) memperbaiki kesetiaan, fatwa, dan status hadits, tetapi skor bahasa agent turun dari 3,74 ke 3,45. Penyebab yang tercatat di [laporan perbandingan](../evals/reports/jawab-x07-answer7-banding.md):
- model menulis parafrasenya sendiri lalu menempel terjemahan AI yang sama kata per kata (j006, j007, j008, j010, j012);
- kalimat tambahan sesudah "Tidak ditemukan …" memuat kartu kutipan tak relevan, celah "…", atau kata "dokumen" (j031–j033);
- ada pembuka meta dan orang pertama (j026, j039);
- "di bagian yang ditemukan" dipakai sebagai penutup (j012);
- baris "Status hadits:" tanpa sitasi menjadi pemberitahuan pengganti yang terbaca sebagai bahasa sistem (j026, j027).

Pemilik meminta `answer@8` untuk bahasa di chat (2026-10-26).

**Keputusan:**
1. **Prompt `answer@8`** (`packages/llm/prompts/answer-v8.ts`) mengatur hal-hal berikut:
   - jawaban mulai langsung dengan isi, tanpa mengulang atau menggolongkan pertanyaan dan tanpa kata "saya";
   - kata "paragraf" dan "potongan teks" ikut dilarang;
   - terjemahan AI tidak disalin, dan setiap isi ditulis sekali;
   - tanpa kutipan langsung bertanda petik, selain judul atau istilah;
   - "bagian yang ditemukan" hanya untuk kesimpulan negatif;
   - "Tidak ditemukan di kitab yang dicakup." berdiri sendiri tanpa sitasi, karena hasil Cari pelengkap sudah ditampilkan sistem;
   - baris "Status hadits:" tetap jalur utama untuk soal status (isinya diganti label kode, ADR-069), tetapi wajib menyitasi takhrij DI kalimatnya sendiri dan tidak ditulis sebagai penutup terpisah tanpa sitasi; di kalimat lain model menyebut perawi dan penilai yang dinukil tanpa merumuskan derajat sendiri. (Draf pertama membuat baris itu tidak wajib dan mencontohkan derajat dalam kalimat bebas; peninjau menunjukkan itu memindahkan status ke tulisan model yang tidak diganti label, jadi dibatalkan.)

   Kalimat baku dan aturan lain sama dengan `answer@7`.
2. **Pipeline@9:** diagnostik `repeated_sentences` dan `translation_copy` di `JawabDiagnostics` dan log Worker, keduanya heuristik dan tidak menyaring jawaban.
   - `repeated_sentences` menghitung pasangan kalimat dalam satu paragraf yang berbagi rangkaian ≥ 6 kata persis, setelah rumus atribusi "Menurut al-Ghazali dalam Ihya (j. …, h. …)" dibuang. Atas arsip x07, diagnostik ini menandai tepat lima jawaban yang dicatat penilai (j006, j007, j008, j010, j012). Atas arsip x06 ada tiga (j005, j008, j024).
   - `translation_copy` menghitung kalimat yang memuat rangkaian ≥ 8 kata persis dari terjemahan AI dokumen yang dikirim.
   - `grading_uncited` menghitung blok berisi istilah derajat + kata hadits/riwayat/sanad di luar baris label yang tidak menyitasi catatan kaki takhrij: ukuran untuk risiko kalimat penilaian bebas yang diterima di ADR-106.
   - Baris label kode dan pemberitahuan pengganti tidak dihitung `repeated_sentences`.
3. docs/05 §5: kalimat "Tidak ditemukan …" berdiri sendiri; di bawahnya hasil Cari bila ada, atau tautan ke Cari (jalur tanpa kandidat tidak punya hasil). Kepatuhan "tanpa sitasi" tidak ditegakkan kode (`refusalKind` tetap menerima kalimat bersitasi sesudahnya, sama dengan v7).
4. **Prompt ini baru dipakai setelah diukur:** PR tetap draft sampai satu run publik berbayar (izin pemilik) dinilai ulang dengan rubrik ADR-106. Bila bahasa atau kesetiaan turun dibanding x07, `answer@7` dipertahankan.

**Tidak dipilih:**
- Membuang kalimat berulang atau salinan terjemahan dengan kode. Blok bersitasi bisa hilang atau bergeser sitasinya, dan heuristik bisa salah tangkap.
- Menghapus terjemahan AI dari konteks dokumen. X03 menunjukkan terjemahan menaikkan cakupan sitasi.

**Hasil run `x08-publik-answer8-v1`** (42 soal publik, US$0,1167, izin pemilik di chat; dinilai ulang agent, [laporan](../evals/reports/jawab-x08-answer8-banding.md)): dibanding x07, Benar/Kurang/Salah 17/22/3 → 17/23/2, kesetiaan 83,3% → 85,7%, bahasa 3,45 → 3,55, atribusi 97,6% → 92,9% (j022, j025), fatwa 0, menolak 8/8, lokasi kode tetap 91,2% (kunci versi 2). Kalimat berulang 5 → 3 jawaban, salinan terjemahan 102 → 81 kalimat. Menurut butir 4 (ditulis sebelum run), `answer@8` dipakai karena bahasa dan kesetiaan tidak turun; selisihnya kecil dan dalam rentang derau penilai. R4 belum terpenuhi. Iterasi berikutnya sebaiknya menunggu penilaian manusia atau memperbaiki kode (bunyi label status, pencarian takhrij kemunculan pertama), bukan prompt lagi.

**Tinjau ulang bila:** run publik `answer@8` (berbayar, izin pemilik) dinilai ulang dengan rubrik yang sama.

## ADR-111 · Bunyi label status hadits untuk pembaca: "dinilai lemah, menurut takhrij al-'Iraqi", pipeline@10 — diterima · 2026-10-26

**Konteks:** di run `x08-publik-answer8-v1` (ADR-110) penilai agent menganggap baris "Status hadits: takhrij menyebut: lemah (hadits di Ihya j. 1, h. 2)." sebagai label mentah yang bocor ke kalimat (j025, j027, j028). Bahasa masih 3,55 dari syarat 4. Selain itu, arti `lam_ajid` "tidak ditemukan penakhrij" sulit dibedakan dari `lam_ajid_marfu` (j028 x06), dan kata kerja aktif bisa terbaca sebagai penilaian al-'Iraqi sendiri padahal takhrij sering menukil penilaian ulama lain (j025).

**Keputusan:**
1. **Teks status (`takhrijStatus`, `@surau/core`) berbentuk "predikat, menurut sumber":** "dinilai lemah, menurut takhrij al-'Iraqi". Beberapa istilah dipisah "; " sebelum atribusi ("dinilai sahih; dinilai lemah, menurut takhrij al-'Iraqi (berbeda per jalur)"). Jenis tambahan penilai menjadi kelompok sendiri dengan atribusinya ("…, menurut takhrij al-'Iraqi; diriwayatkan mursal, menurut peninjau"). Bila teks dipotong, "dan lainnya" hanya masuk ke kelompok terakhir kalau semua sisanya sekelompok, supaya atribusinya tidak keliru. Batas 120 karakter tetap berlaku.
2. **Arti istilah (`TAKHRIJ_TERM_GLOSS`) menjadi predikat.** Kata pasif "dinilai" dipakai karena takhrij juga menukil penilaian orang lain: "dinilai lemah", "diriwayatkan al-Bukhari", "diriwayatkan mauquf", "perawi atau sanadnya dinilai tepercaya", "memuat penilaian ulama lain yang dibantah". `lam_ajid` = "tidak ditemukan sanad atau lafaznya" (sanad, atau lafaz ini, sama sekali tidak ditemukan), sedangkan `lam_ajid_marfu` = "tidak ditemukan sebagai sabda Nabi (marfu')". Gabungan j028 berbunyi "tidak ditemukan sebagai sabda Nabi (marfu'); diriwayatkan mauquf, menurut takhrij al-'Iraqi".
3. **Teks tanpa istilah** menyebut penakhrijnya: "takhrij al-'Iraqi hanya menyebut sumber riwayatnya, tanpa istilah penilaian" dan "takhrij al-'Iraqi merujuk ke takhrijnya di tempat lain". Nama penakhrij ditulis di satu konstanta, karena aturan istilah `takhrijTerms` adalah pola frasa al-'Iraqi untuk Ihya. Kitab dengan penakhrij lain butuh aturan istilah sendiri, dan nama itu akan menjadi parameter.
4. **Jawab (`labelText`):** "Status hadits: dinilai lemah, menurut takhrij al-'Iraqi (hadits di Ihya j. 1, h. 2)." Label tanpa awalan (butir daftar) dibuka dengan huruf kapital. UI (Status hadits di Jawab, dalil Intisari, `/tinjau/takhrij`) menampilkan huruf pertama kapital lewat CSS, sementara datanya tetap huruf kecil. `JAWAB_PIPELINE_VERSION` 9 → 10, sehingga cache jawaban lama tidak disajikan.
5. **Yang tidak berubah:** label tetap dibuat kode dan menunjuk rentang frasa Arab di DB (aturan teks-arab no. 6). Status `rule_extracted` tetap berlabel "dikenali otomatis dari teks takhrij, belum ditinjau". Versi aturan istilah (`TAKHRIJ_TERMS_VERSION` 2) tidak naik karena istilah dan rentangnya sama. Teks status ikut `takhrijLabelHash`, jadi tinjauan lama tidak berlaku lagi. Di D1 `surau-app` produksi saat ini belum ada baris `takhrij_review` (dicek 2026-10-26), jadi tidak ada tinjauan yang hilang. Eval tetap konsisten: `goldStatus` dan status klaim sama-sama dari `takhrijLabel`/`reviewedTakhrijLabel`, dan kecocokan masih persis, tidak dilonggarkan. Kalimat lisan audio Intisari memakai glosa lisannya sendiri (bunyi lama) supaya sha skrip audio yang sudah direkam tidak berubah tanpa `SCRIPT_VERSION`.

**Tidak dipilih:**
- "menurut takhrij al-'Iraqi: lemah" di depan. Di baris Jawab akan muncul dua titik dua berturut-turut ("Status hadits: menurut …: lemah").
- "al-'Iraqi menilai …" atau "takhrij menyebutnya …". Bentuk aktif menyatukan penilaian yang dinukil sebagai penilaian al-'Iraqi (j025).
- Membiarkan LLM merumuskan baris status. Itu melanggar aturan teks-arab no. 6.

**Tinjau ulang bila:** penilaian manusia (Anas) atau run eval berikutnya (berbayar, izin pemilik) menilai bunyi baru ini masih kaku, atau ada kitab dengan penakhrij lain.


## ADR-112 · Konfigurasi project tes workerd memakai `defineProject` dari Vite+ — diterima · 2026-10-28

**Konteks:** PR #162 memperbarui sepuluh dependency, termasuk Vite+ 1.3.0 → 1.4.0 dan `@cloudflare/vitest-plugin` 1.4.4 → 1.4.7. CI gagal di `pnpm check` dengan TS2321 (kedalaman perbandingan tipe berlebihan) pada pemanggilan `defineConfig` di empat konfigurasi workerd. Error juga direproduksi lokal dengan dependency PR yang sama. Keempat konfigurasi tersebut dimuat sebagai project anak melalui `test.projects` di `vite.config.ts`, bukan sebagai konfigurasi root.

**Keputusan:** `apps/api/vitest.config.ts`, `apps/mcp/vitest.config.ts`, `packages/core/vitest.config.ts`, dan `packages/db/vitest.config.ts` memakai `defineProject` dari `vite-plus`. Root tetap memakai `defineConfig`. [Dokumentasi Vitest](https://vitest.dev/guide/projects#defining-projects) menyarankan helper ini untuk konfigurasi project. Implementasi Vite+ 1.4.0 menyuntikkan plugin resolver/test miliknya melalui kedua helper; helper Vite+ tetap dipakai agar integrasi tersebut berjalan. `defineProject` memeriksa bentuk konfigurasi project secara langsung, tanpa batas generic `ViteUserConfigExport` pada `defineConfig` yang memicu TS2321 di sini.

**Tidak dipilih:** menonaktifkan pemeriksaan tipe, menyembunyikan error dengan cast, atau menurunkan versi dependency. Pengaturan plugin Cloudflare, binding D1 lokal, migrasi, daftar tes, dan `fsModuleCache: false` tetap sama. `pnpm check` yang gagal sebelum perubahan lulus sesudahnya; suite workerd yang ada memeriksa pemuatan keempat project dan perilakunya.

**Tinjau ulang bila:** API konfigurasi Vite+/Vitest berubah atau ada opsi root yang perlu dipakai oleh project anak.
