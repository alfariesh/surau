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

**Wajib dijawab pemilik:** P-2, P-5, dan P-6. **Bila tidak dijawab, usulan CTO dipakai:** P-1, P-3, P-4, dan P-7. Pemilik tetap boleh mengubahnya kapan saja.

| ID | Pertanyaan (bahasa awam) | Usulan CTO | Dibutuhkan saat |
|---|---|---|---|
| P-1 | Kode di GitHub **terbuka untuk umum atau privat**? Lisensi HeroUI Pro (Terms §9) melarang mempublikasikan komponen dan template Pro, sedangkan `web/` adalah turunan template chat Pro. | **Privat.** Minta izin tertulis ke support@heroui.pro. Repo ini menyimpan template Pro di riwayat git, jadi repo ini **tidak boleh sekadar diubah menjadi publik**. Bila kelak ingin publik tanpa izin HeroUI, buat repo publik baru dari kode yang sudah ditulis ulang, tanpa riwayat lama. Lihat ADR-004. | S02 |
| P-2 | Nama domain Surau | Pemilik memilih; daftar lewat Cloudflare Registrar | S03 |
| P-3 | Font Arab utama | **Dijawab 2026-10-15:** Noto Naskh Arabic, palet Zaitun (Opsi A, ADR-027). | S04 |
| P-4 | Plafon biaya AI per bulan, dan jatah tanya gratis per pengunjung per hari | $20/bulan untuk Tanya online, 10 pertanyaan/hari per pengunjung. Batch dan eval memakai workspace terpisah (`surau-dev`, ±$40/bulan). | S13, Fase 4 |
| P-5 | Siapa ustadz pertama untuk eval dan review | Dicari pemilik (T-13) | Rilis Fase 4 (dianjurkan sudah ada sejak Fase 2) |
| P-6 | Sumber teks publik dan lisensi konten | ADR-018 + ADR-021: teks dan catatan kaki dari Shamela lokal, dengan dasar lisensi rilis OpenITI yang terbukti identik (CC BY-NC-SA 4.0); konten turunan CC BY-NC-SA; email pemberitahuan ke Shamela | Rilis Fase 1 |
| P-7 | Bolehkah Surau menyimpan pertanyaan dan jawaban pengguna (tanpa alamat IP atau data pribadi) untuk memperbaiki mutu, dan berapa lama? | Pertanyaan + jawaban (`answer_log`) 12 bulan; laporan kesalahan (`feedback`) sampai ditangani + 12 bulan; penghitung kuota harian 7 hari; catatan biaya (`llm_ledger`) 24 bulan. Semua diumumkan di kebijakan privasi. | Retensi `feedback`: rilis Fase 1. Sisanya: S18, S20 |


---

## ADR-001 · Cara kerja: folder `implementasi/` + sesi + skill `/sesi` — diterima · 2026-10-15

**Konteks:** Aplikasi dibangun penuh oleh agent dan pemilik bukan developer. **Keputusan:** Rencana dipecah menjadi fase yang bisa dirilis sendiri dan sesi yang muat dalam satu percakapan. Status disimpan di Markdown (`STATUS.md`, `LOG.md`, `sesi/*.md`) dengan aturan "centang hanya dengan bukti". Skill `/sesi`, `/posisi` (bukan `/status`, yang bentrok dengan perintah bawaan), `/rilis`, dan `/docs-terbaru`, subagen `peninjau`, aturan path-scoped `teks-arab`, dan hook SessionStart menyuntikkan status. **Ditolak:** daftar fitur JSON ala Anthropic (lebih tahan ditimpa model, tapi tidak bisa dibaca pemilik); plugin (belum perlu untuk satu repo). **Tinjau ulang bila:** agent sering salah menandai selesai. Dalam kasus itu, tambahkan file JSON yang dicek hook Stop.

## ADR-002 · Hosting: Cloudflare Workers, bukan Vercel — diterima · 2026-10-15

**Konteks:** Pemilik sudah membayar Workers Paid ($5/bln). Rancangan lama memakai Vercel + Supabase. **Keputusan:** Semua komponen berjalan di Cloudflare: Workers (web, MCP, API), D1, R2, Turnstile, AI Gateway, dan Rate Limiting. Satu tagihan, satu dashboard, dan satu CLI (`wrangler`). **Ditolak:** Vercel. Vercel menambah vendor dan Hobby non-komersial, dan biaya Cloudflare sudah dibayar. **Konsekuensi:** Next.js berjalan lewat adapter (ADR-003). Batas Worker: 64 MiB tanpa kompresi, startup 1 detik, memori 128 MB.

## ADR-003 · Frontend: Next.js 16 App Router + OpenNext di Workers — sementara · 2026-10-15

**Keputusan:** Pertahankan Next.js (template HeroUI Pro berbasis Next, dan tooling agent Next paling matang: docs dibundel di `apps/web/node_modules/next/dist/docs`, AGENTS.md, dan MCP devtools). Deploy memakai `@opennextjs/cloudflare`. Aturan konservatif:
- `cacheComponents: false` sampai bug OpenNext (PR #1318) dirilis.
- Tanpa `proxy.ts`/`middleware.ts`, tanpa `runtime = 'edge'`, dan tanpa Server Actions (mutasi lewat route handler atau Worker API).
- `images: { unoptimized: true }`.
- Kutipan Arab tidak pernah dirender lewat Markdown.

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

## ADR-018 · Sumber teks Ihya: struktur dari Shamela lokal, lisensi lewat OpenITI — diusulkan · 2026-10-15

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

**Keputusan:** Teks ayat diambil dari Tanzil 1.1 (CC BY 3.0, **hanya verbatim**, wajib pemberitahuan dan tautan tanzil.net): `simple-clean` untuk indeks pencocokan, `uthmani` untuk tampilan. Terjemahan Indonesia memakai QuranEnc `indonesian_affairs` (Kemenag, versi dicatat, verbatim, penanda catatan kaki ditampilkan apa adanya). Kutipan ayat di kitab dikenali secara deterministik; 97,2% cocok persis setelah normalisasi, sisanya dicocokkan fuzzy dengan label "mirip". **Ayat tidak pernah diterjemahkan LLM.** Dalam batch terjemahan (S13), bentang ayat diganti placeholder lalu diisi terjemahan Kemenag. **Ditolak:** API Quran Foundation sebagai sumber indeks (cache maksimal 1 minggu, dilarang dibundel); `quran-json` (deprecated, tanpa hak redistribusi); scraping situs Kemenag. **Terbuka:** apakah PMA 44/2016 (tashih) berlaku untuk aplikasi yang hanya mengutip ayat di dalam kitab. Tanyakan ke LPMQ bila perlu.

## ADR-021 · Lisensi konten: CC BY-NC-SA 4.0, terpisah dari kode Apache-2.0 — diusulkan · 2026-10-15

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
**Tinjau ulang bila:** X01 selesai (Next 16.4.1+), atau CI gagal mengunduh artefak HeroUI Pro.

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
