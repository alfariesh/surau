# Riset Stack Implementasi · 15 Oktober 2026

Ringkasan riset paralel 9 area pada 15 Okt 2026 yang mendasari ADR-001 s.d. ADR-022 di [implementasi/KEPUTUSAN.md](../../implementasi/KEPUTUSAN.md). Versi target ada di [STACK.md](../../implementasi/STACK.md), urutan fase di [FASE.md](../../implementasi/FASE.md). Catatan ini melanjutkan [catatan riset sebelumnya](2026-10-15-catatan-riset.md); hal yang berubah dirangkum di bagian [Koreksi](#koreksi-terhadap-catatan-riset-sebelumnya).

Tanda **[diverifikasi]** berarti fakta dicek langsung pada 15 Okt 2026 lewat registry npm/PyPI, docs resmi (URL disertakan), atau tes lokal. Poin tanpa tanda adalah analisis atau keputusan. Klaim yang hanya berasal dari hasil pencarian, pihak ketiga, atau hitungan sendiri dikumpulkan di [Belum terverifikasi](#belum-terverifikasi--pertanyaan-terbuka). Semua tes lokal memakai salinan data di luar repo; tidak ada data Shamela yang masuk git.

## Ringkasan

| # | Area | Hasil | ADR |
|---|---|---|---|
| 1 | Next.js di Cloudflare | Next 16 App Router + OpenNext dengan konfigurasi konservatif; vinext cadangan | 002, 003 |
| 2 | Data di Cloudflare | D1 + FTS5 (korpus blue-green + DB app), R2; Vectorize ditunda; tanpa ORM | 005, 006, 009 |
| 3 | Pencarian Arab | Normalisasi di kode + `unicode61 remove_diacritics 0` + kolom stem proklitik | 005 |
| 4 | MCP | SDK v2 stateless dual-era di Worker terpisah, nama tool Inggris, rilis sebelum Jawab | 010–012, 019 |
| 5 | AI Gateway, biaya, anti-abuse, auth | AI Gateway (BYOK) setelah uji passthrough; rem biaya 4 lapis; Turnstile; Better Auth ditunda | 013–016 |
| 6 | HeroUI | OSS 3.2.6 + Pro 1.0.0-beta.10 dipin persis; repo privat dulu karena lisensi | 004 |
| 7 | Toolchain & CI | pnpm 12 + Vite+ + TS 7 + Node 24; ingest TS dengan `node:sqlite`; GitHub Actions | 007, 008, 017 |
| 8 | Setup Claude Code | CLAUDE.md pendek, skill, rules path-scoped, subagen peninjau, hook SessionStart | 001 |
| 9 | Data teks & eval | Matan Shamela lokal ≡ OpenITI; Tanzil + Kemenag/QuranEnc; eval buatan sendiri | 015, 018, 020–022 |

## 1. Next.js di Cloudflare Workers

- **[diverifikasi]** Next.js stabil terbaru 16.4.1 (14 Okt); jalur 16.3 terakhir 16.3.8 (30 Sep). 16.4.1 menambal tiga advisory 14 Okt (dua RCE kritis: `use cache` yang mengembalikan typed array dan Image Optimization lewat sharp/SVG; satu DoS Server Actions) tanpa backport ke 16.3. Template `web/` (16.3.4) juga terkena CVE-2026-94545 (RCE `next/og`). https://github.com/vercel/next.js/security/advisories
- **[diverifikasi]** `@opennextjs/cloudflare` 1.20.11 mensyaratkan `next >=16.3.8` demi perbaikan keamanan, tetapi di 16.4.0 semua halaman error `loadManifest(preview-props.json)`. Patch 16.4 sudah di-merge di opennextjs-aws (PR #1285, 14 Okt) dan belum dirilis. https://github.com/opennextjs/opennextjs-cloudflare/issues/1448
- **[diverifikasi]** Cache Components di OpenNext masih punya bug terbuka (#1225, #1369, #1349, #1450); perbaikannya (PR #1318) belum di-merge. `proxy.ts` masih eksperimental, dan proxy kosong saja menggembungkan bundle ±200 KB → ±4,6 MB (#1373). https://github.com/opennextjs/opennextjs-cloudflare/pull/1318
- **[diverifikasi]** Sejak 4 Sep 2026 batas Worker 64 MiB tanpa kompresi (Free dan Paid), tanpa batas terkompresi; startup 1 detik, memori 128 MB, CPU default 30 detik. Angka 3/10 MiB di docs OpenNext sudah usang. https://developers.cloudflare.com/workers/platform/limits/
- **[diverifikasi]** Cloudflare menyebut vinext sebagai cara default menjalankan Next di Workers, tetapi dokumennya sendiri menyebut beta dan belum *drop-in*. vinext 1.2.0 baru mendukung `use cache` secara terbatas dan menerbitkan 2 advisory pada 14 Okt. https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- **[diverifikasi]** Next ≥16.3 membundel docs sesuai versi di `node_modules/next/dist/docs/` dan `next dev` menulis blok terkelola di `AGENTS.md`. Claude Code hanya membaca AGENTS.md bila tidak ada CLAUDE.md, jadi `web/CLAUDE.md` perlu `@AGENTS.md`. https://nextjs.org/docs/app/guides/ai-agents
- **[diverifikasi]** `next/image` di OpenNext butuh binding Cloudflare Images (berbayar) atau loader sendiri. Varian Tailwind `rtl:` memakai `:dir(rtl)`, sehingga bekerja per blok di halaman LTR. Data font next@16.4.1: Noto Naskh Arabic variable 400–700; Amiri 400/700 dengan weight wajib ditulis. https://opennext.js.org/cloudflare/howtos/image · https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support
- **Versi:** `next` 16.4.1 / 16.3.8 · `react` 19.3.1 · `@opennextjs/cloudflare` 1.20.11 · `wrangler` 4.151.0 · `vinext` 1.2.0 · `next-devtools-mcp` 0.4.0.
- **Keputusan** (ADR-002, ADR-003): Next 16.3.8 + React 19.2.x, `cacheComponents: false`, tanpa `proxy.ts`, Server Actions, dan `runtime='edge'`, `images.unoptimized: true`; naik ke 16.4 lewat sesi X01 setelah OpenNext mendukung. Ditolak: React Router v8, TanStack Start, Astro (perlu port template HeroUI Pro).
- **Jebakan:** `cloudflare.config.ts` di `web/` membuat build OpenNext keluar 0 tanpa hasil (#1407); hindari Smart Placement (#1382) dan pakai satu host kanonik (#1413); jangan membaca `headers()` di root layout; kutipan Arab tidak dirender lewat Markdown; `/_next/mcp` hanya di localhost.

## 2. Data di Cloudflare

- **[diverifikasi]** D1: 10 GB per DB (tidak bisa dinaikkan), 1 TB per akun, 50.000 DB; query ≤30 detik (juga untuk satu `batch()`); statement ≤100 KB; ≤100 parameter; pola LIKE ≤50 byte; impor ≤5 GB; Time Travel 30 hari. Tiap DB single-threaded: rata-rata 1 ms ≈ 1.000 qps, 100 ms ≈ 10 qps. https://developers.cloudflare.com/d1/platform/limits/
- **[diverifikasi]** Workers Paid sudah mencakup 25 miliar baris dibaca, 50 juta baris ditulis, dan 5 GB per bulan. Baris dibaca dihitung dari baris yang dipindai; cara menghitung tabel bayangan FTS5 tidak didokumentasikan. https://developers.cloudflare.com/d1/platform/pricing/
- **[diverifikasi]** D1 dan workerd memakai SQLite 3.53.4 dengan FTS5 (termasuk `fts5vocab`). Tabel virtual selain FTS5/RTREE dan `ATTACH` dilarang; `sqlite_version()` ditolak ("not authorized"). Sumber: repo cloudflare/workerd + tes lokal.
- **[diverifikasi]** `wrangler d1 export` tidak mendukung DB yang punya tabel virtual, file `.sqlite` tidak bisa diimpor langsung, dan `d1 execute --remote --file` bersifat atomik. https://developers.cloudflare.com/d1/best-practices/import-export-data/
- **[diverifikasi]** Read replication masih public beta sejak 10 Apr 2025 dan wajib lewat Sessions API. Opsi `migrations_pattern` (29 Mei 2026) mendukung folder migrasi bersarang. https://developers.cloudflare.com/d1/best-practices/read-replication/
- **[diverifikasi]** Drizzle stabil 0.45.4; 1.0.0-rc.4 (27 Jun 2026) belum GA, padahal docs D1-nya sudah menyuruh `@rc`. Drizzle tidak memodelkan FTS5. https://orm.drizzle.team/docs/connect-cloudflare-d1
- **[diverifikasi]** Vectorize: ≤1.536 dimensi, 20 juta vektor per indeks, indeks metadata dibuat sebelum insert, tanpa pencarian hybrid. Embedding Workers AI `bge-m3` dan `qwen3-embedding-0.6b` ±$0,012/juta token; satu-satunya reranker, `bge-reranker-base`, hanya untuk Cina dan Inggris. https://developers.cloudflare.com/vectorize/platform/limits/ · https://developers.cloudflare.com/workers-ai/platform/pricing/
- **[diverifikasi, tes lokal]** Data Ihya 11 MB dan indeks FTS5 tingkat halaman 13,4 MB. Simulasi 92 kitab (Ihya ×54) menghasilkan indeks ±705 MB; filter kitab lewat kolom UNINDEXED 291 ms, lewat rentang `rowid` 3,6 ms.
- **[diverifikasi]** Pembanding yang ditolak: Supabase Free 500 MB dan dijeda setelah 1 minggu tidak aktif, Pro mulai $25/bln. Hyperdrive tanpa biaya tambahan di Paid (jalur cadangan ke Postgres). https://supabase.com/pricing · https://developers.cloudflare.com/hyperdrive/platform/pricing/
- **Versi:** `wrangler` 4.151.0 · SQLite di workerd 3.53.4 · `@cloudflare/workers-types` 5.20261015.1 · `drizzle-orm` 0.45.4 / 1.0.0-rc.4.
- **Keputusan** (ADR-005, ADR-006, ADR-009): `surau-corpus-<versi>` (blue-green) + `surau-app` tanpa tabel virtual, `--location apac`; dump terbuka dibangun pipeline; Vectorize ditunda sampai eval membuktikan perlu. Laporan area mengusulkan Drizzle RC, tetapi ADR-009 memilih **tanpa ORM** di Fase 0–4 (migrasi SQL + repository bertipe Zod).
- **Jebakan:** memori Worker 128 MB, jadi indeks tidak pernah dimuat ke memori; location hint hanya bisa diatur saat DB dibuat; wrangler global di mesin pemilik (4.126.0) usang.

## 3. Pencarian teks Arab

Rincian, skema, dan prototipe ada di [eksperimen pencarian Arab](2026-10-15-pencarian-arab/README.md). Keputusan di ADR-005.

- **[diverifikasi, tes lokal]** `unicode61` bawaan menganggap harakat (kategori Mn) sebagai pemisah, dan `remove_diacritics 1/2` hanya berlaku untuk huruf Latin: vocab teks mentah dengan dan tanpa opsi itu identik (83.599 term). https://sqlite.org/fts5.html
- **[diverifikasi, tes lokal]** Recall makro 18 query (gold berbasis regex): teks mentah 0,498; trigram mentah 0,658; teks ternormalisasi 0,595; trigram ternormalisasi 0,783; Postgres 18 `arabic` 0,721; strategi terpilih 1,000 dengan 6 hit melenceng.
- Strategi terpilih: normalisasi di TypeScript, `unicode61 remove_diacritics 0`, tabel contentless per paragraf (`contentless_delete=1`) dengan kolom stem proklitik konservatif, ekspansi proklitik dan kunyah di sisi query, bm25 berbobot.
- **[diverifikasi, tes lokal]** Indeks norm+stem Ihya 6,86 MB. Pada skala 60× (±59 juta kata) indeks 394 MB: الصبر 12,6 ms, tetapi kata sangat umum الله 245 ms. Semua fitur jalan di D1 lokal (wrangler 4.151); `rows_read` lokal ±3× jumlah kecocokan.
- Ditolak: trigram (3,7× lebih besar, banyak hit melenceng), Postgres `arabic` (stem tidak konsisten), stemming agresif ala Larkey (merusak kata dasar), indeks `prefix` (2,2× lebih besar), `detail=column` (query frasa hilang).
- **Versi SQLite di mesin pemilik:** `/usr/bin/sqlite3` 3.54.0 dan Homebrew 3.53.4 punya FTS5; build Android SDK 3.50.6 (pertama di PATH) tidak.
- **Jebakan:** tabel contentless tidak punya `highlight()`/`snippet()`; setiap token query di-quote dan dikirim sebagai satu parameter; simpan `NORM_VERSION` karena perubahan aturan berarti reindex penuh.

## 4. MCP

- **[diverifikasi]** Spesifikasi MCP yang berlaku: 2026-07-28. Protokol menjadi stateless (handshake `initialize` dan `Mcp-Session-Id` dihapus), `server/discover` wajib, `resultType` wajib, hasil list wajib memuat `ttlMs`/`cacheScope`. Sampling, Roots, Logging, dan transport HTTP+SSE deprecated. https://modelcontextprotocol.io/specification/2026-07-28/changelog
- **[diverifikasi]** Server yang hanya modern gagal melayani klien 2025-11-25; server dual-era boleh melayani keduanya di endpoint yang sama. https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
- **[diverifikasi]** TS SDK v2 stabil sejak 27 Jul 2026. SDK v1 hanya menerima perbaikan, setidaknya 6 bulan. Perubahan v2: wajib `registerTool`, Zod ≥4.2, dan `ProtocolError`. `createMcpHandler` upstream tidak memvalidasi Origin/Host. https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2 · https://ts.sdk.modelcontextprotocol.io/v2/serving/http.md
- **[diverifikasi, tes lokal]** POC Worker (SDK 2.3.1, wrangler 4.151, tanpa `nodejs_compat`): `tools/list` dan `tools/call` lolos di era modern dan legacy lewat Inspector CLI, teks Arab utuh, GET → 405, Origin asing → 403, bundle 209 KiB gzip.
- **[diverifikasi]** `McpAgent` Cloudflare deprecated dan dibekukan sejak agents 0.20.0; `agents` 0.28.1 mengunci versi persis tiga paket MCP, termasuk SDK v1. `mcp-handler` (Vercel) kini tidak terikat framework, tetapi hanya pembungkus SDK yang sama. https://developers.cloudflare.com/changelog/post/2026-07-27-agents-sdk-v0.20.0-mcp-sdk-v2/ · https://github.com/vercel/mcp-handler
- **[diverifikasi]** Custom connector Claude tersedia di plan Free sampai Enterprise (Free 1 connector), bisa tanpa login, dan koneksinya selalu dari IP Anthropic. Claude Code memperingatkan output tool >10.000 token (batas default 25.000). https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-MCP · https://code.claude.com/docs/en/mcp
- **[diverifikasi]** Rate Limiting binding: periode hanya 10 atau 60 detik, per lokasi, eventually consistent; docs tidak menganjurkan key IP; `namespace_id` yang sama berbagi counter antar-Worker. MCP Registry masih preview. https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ · https://modelcontextprotocol.io/registry/remote-servers
- **Versi:** `@modelcontextprotocol/server` dan `client` 2.3.1 · `@modelcontextprotocol/sdk` 1.32.1 (v1) · `agents` 0.28.1 · `mcp-handler` 2.3.0 · `@modelcontextprotocol/inspector` 2.11.0 (Node ≥22.19) · `zod` 4.6.7.
- **Keputusan** (ADR-010, ADR-011, ADR-012, ADR-019): Worker `surau-mcp` di `mcp.<domain>/mcp`, read-only, tanpa auth, tanpa LLM, `legacy: 'stateless'`, `originValidationResponse`, rate limit longgar dengan kunci `HMAC(IP):tool` (bukan IP mentah; keputusan final ADR-011), output dipaginasi ±4–6 ribu token, anotasi `readOnlyHint`. Nama tool Inggris snake_case (`list_works`, `get_table_of_contents`, `read_page`, `read_section`, `search_text`, `verify_quote`, `get_hadith_takhrij`) menggantikan nama Indonesia di laporan area.
- **Jebakan:** template Cloudflare `remote-mcp-authless` masih memakai McpAgent; berikan *factory*, bukan instance server; `outputSchema` harus berakar objek; `cacheHints` default `ttlMs: 0` dan privat.

## 5. AI Gateway, biaya, anti-abuse, auth, observabilitas

- **[diverifikasi]** Analytics, caching, dan rate limiting AI Gateway gratis; Unified Billing kena biaya 5%. Caching gateway hanya exact-match atas seluruh body dan bersifat volatil. https://developers.cloudflare.com/ai-gateway/reference/pricing/ · https://developers.cloudflare.com/ai-gateway/features/caching/
- **[diverifikasi]** Halaman provider Anthropic di AI Gateway tidak menyebut Message Batches, Citations, `cache_control`, maupun header `anthropic-beta`. Dengan BYOK atau Unified Billing, header `x-api-key` tidak boleh dikirim. https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/
- **[diverifikasi]** Spend limit (5 Jun 2026) berlaku untuk BYOK dan Unified Billing pada model yang harganya diketahui, bersifat best-effort dan eventually consistent. `cf-aig-collect-log-payload: false` tetap mencatat token, biaya, dan durasi tanpa isi prompt. Token Authenticated Gateway berlaku untuk semua gateway di akun. https://developers.cloudflare.com/ai-gateway/features/spend-limits/ · https://developers.cloudflare.com/ai-gateway/observability/logging/
- **[diverifikasi]** Usage & Cost API Anthropic hanya untuk organisasi (Admin key), data tertunda ±5 menit, dan cost per hari. Kredit API langganan: Max 5x $100, Max 20x $200, Team sampai $500 per bulan, tanpa rollover. https://platform.claude.com/docs/en/manage-claude/usage-cost-api · https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- **[diverifikasi]** Turnstile Free: challenge tak terbatas; token berlaku 300 detik dan sekali pakai. Bot Fight Mode tidak bisa di-skip dan bisa menantang trafik API. WAF Free: 1 aturan rate limiting (per IP, 10 detik). `workers_dev=false` tidak mematikan preview URL. https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ · https://developers.cloudflare.com/bots/get-started/bot-fight-mode/ · https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- **[diverifikasi]** Mulai 1 Des 2026 log dan trace Cloudflare (termasuk log AI Gateway) dihitung per GB: Paid 50 GB ingest per siklus termasuk, lalu $0,25/GB. Traces masih beta; Issues open beta gratis. https://developers.cloudflare.com/observability/pricing/
- **[diverifikasi]** Better Auth 1.7.8: D1 native, plugin captcha Turnstile; rate limit bawaan di memori tidak cocok untuk Workers. Auth.js kini bagian dari Better Auth. Cloudflare Email Service masih beta. https://better-auth.com/docs/concepts/database · https://authjs.dev/
- **Versi:** `@anthropic-ai/sdk` 0.134.0 · `better-auth` 1.7.8 · `@marsidev/react-turnstile` 1.6.2 · `hono` 4.13.13.
- **Keputusan** (ADR-013 s.d. ADR-016): Haiku 5.5 lewat AI Gateway mode BYOK setelah uji passthrough lolos, batch langsung ke Anthropic; rem biaya 4 lapis (spend limit workspace Anthropic, spend limit gateway, ledger D1 dengan reservasi atomik, sakelar `jawab_enabled`); Turnstile Managed ditukar cookie anonim HMAC 24 jam; kuota harian dengan counter D1; observabilitas bawaan Cloudflare; Better Auth setelah Jawab.
- **Jebakan:** `baseURL` SDK berakhir di `/anthropic` tanpa `/v1`; prompt Haiku 5.5 >100k token (termasuk cache) dihargai 5×, jadi Jawab dibatasi ±40k; banyak pengguna seluler di balik CGNAT, jadi kuota per IP hanya pelengkap kuota per cookie.

## 6. HeroUI

- **[diverifikasi]** HeroUI OSS v3 stabil: 3.0.0 (21 Mar 2026), terbaru 3.2.6 (17 Sep). Berbasis React Aria Components, compound component, tanpa Provider, Tailwind v4. https://heroui.com/docs/react/releases/v3-0-0
- **[diverifikasi]** `@heroui-pro/react` masih beta dan berlisensi UNLICENSED. Paket npm hanya stub 8 KB; postinstall mengunduh komponen dengan `HEROUI_AUTH_TOKEN`, dan tanpa token tetap exit 0 sehingga error baru muncul saat build. https://heroui.pro/docs/react/getting-started/installation
- **[diverifikasi]** Ada versi salah terbit 1.0.0-beta.19 (deprecated) yang secara semver lebih tinggi dari beta.10, jadi versi wajib dipin persis. Sumber: `npm view @heroui-pro/react versions`.
- **[diverifikasi]** Kuota unduhan CDN harian per token CI: Individual 1.000, Team Web 5.000, Team Super 10.000; `node_modules` perlu di-cache. https://heroui.pro/docs/react/getting-started/ci-caching
- **[diverifikasi]** Terms Pro §9 (diperbarui 19 Mar 2026) melarang mempublikasikan atau meredistribusi komponen dan template Pro; docs lisensinya tidak membahas proyek open source. https://heroui.pro/terms
- **[diverifikasi]** MCP Pro `https://mcp.heroui.pro/mcp` mencakup OSS dan Pro. OSS 3.1.0/3.2.3 dan Pro beta.7/beta.8 memakai logical CSS properties. Pro beta.8 mewajibkan impor subpath untuk Markdown, CodeBlock, ChatTool, dan Resizable. https://heroui.pro/docs/react/getting-started/mcp-server · https://heroui.pro/docs/react/releases/beta-8
- **[diverifikasi]** Docs Pro masih menulis `pnpm.onlyBuiltDependencies`, padahal pnpm ≥11 mengabaikannya; pakai `allowBuilds` di `pnpm-workspace.yaml`. https://pnpm.io/settings/build
- **Versi:** `@heroui/react` dan `@heroui/styles` 3.2.6 · `@heroui-pro/react` 1.0.0-beta.10 · CLI `heroui-pro` 1.0.0-beta.14 · `tailwindcss` 4.3.3 · `next-themes` 0.4.6.
- **Keputusan** (ADR-004): OSS 3.2.6 + Pro 1.0.0-beta.10 persis, ikon `@gravity-ui/icons`, `next-themes`, UI Indonesia LTR, repo privat sampai ada izin tertulis (P-1). Cadangan: HeroUI OSS saja.
- **Jebakan:** aturan v3 sering salah ditulis agent (`onPress`, `Separator`, `Card.Header`); PR dari fork tidak punya secret token; skill Pro berlisensi dan tidak boleh di-commit.

## 7. Toolchain, ingest, dan CI

- **[diverifikasi]** Sejak pnpm 11: `onlyBuiltDependencies` diganti `allowBuilds`, field `pnpm` di package.json tidak dibaca, `strictDepBuilds` default true, dan `minimumReleaseAge` default 1.440 menit (paket <24 jam ditolak). https://pnpm.io/blog/releases/11.0
- **[diverifikasi]** Vite+ 1.0 stabil 28 Sep 2026 (MIT) dan boleh dipakai di proyek non-Vite; vite-plus 1.2.0 membundel Vitest 5.0.4, Oxlint 1.88.0, dan Oxfmt 0.73.0 (masih 0.x). VoidZero kini bagian dari Cloudflare. https://voidzero.dev/posts/announcing-vite-plus-1-0 · https://blog.cloudflare.com/voidzero-update/
- **[diverifikasi]** TypeScript 7.0.2 adalah compiler native Go tanpa API programatik; `baseUrl` dihapus dan `types` default `[]`. `next build` memakai `tsc` CLI lokal. typescript-eslint mensyaratkan TS <6.1, sehingga ESLint dibuang. https://devblogs.microsoft.com/typescript/?p=5246 · https://nextjs.org/docs/app/api-reference/config/typescript
- **[diverifikasi]** Node 24 LTS masuk maintenance 20 Okt 2026 (EOL 30 Apr 2028); Node 26 menjadi LTS 28 Okt 2026. Type stripping stabil sejak 24.12 (hanya sintaks erasable, impor berekstensi `.ts`). https://raw.githubusercontent.com/nodejs/Release/main/schedule.json · https://nodejs.org/docs/latest-v24.x/api/typescript.html
- **[diverifikasi, tes lokal]** `node:sqlite` (Node 24) membuka Shamela 9472.db secara read-only dan menjalankan uji FTS5 dalam 241 ms. Di Node 26, `DatabaseSync` menjadi `Database`. https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- **[diverifikasi]** `@cloudflare/vitest-pool-workers` diganti nama menjadi `@cloudflare/vitest-plugin` (peer Vitest ^4.1 atau ^5). Worker Previews (Sep 2026) membuat lingkungan per PR, tetapi D1/KV/R2 tidak terisolasi per preview. https://developers.cloudflare.com/changelog/post/2026-09-22-worker-previews/
- **[diverifikasi]** Workers Builds: Node default 24.18.0, pnpm default 10.11.1, tidak meng-cache `node_modules`, dan log hanya di dashboard/API. https://developers.cloudflare.com/workers/ci-cd/builds/build-image/
- **[diverifikasi]** LangExtract (Python) tidak punya provider Anthropic bawaan (hanya Gemini, OpenAI, Ollama, plus plugin); paket npm `langextract` adalah port komunitas yang tidak diperbarui sejak Agu 2025. https://pypi.org/pypi/langextract/json
- **[diverifikasi, cek lokal]** Di mesin pemilik, `node` di PATH adalah 22.23.2 dan mengalahkan shim Vite+ (24.22.0).
- **Versi:** `pnpm` 12.11.2 · `vite-plus` 1.2.0 · `typescript` 7.0.2 · Node 24.22.0 / 26.12.0 · `@cloudflare/vitest-plugin` 1.4.2 · `@playwright/test` 1.64.1 · `voidzero-dev/setup-vp` v1.21.2 · `langextract` 1.7.1.
- **Keputusan** (ADR-007, ADR-008, ADR-017): semua TypeScript, ingest dengan `node:sqlite`, Go dan Python ditolak di awal, LangExtract opsional di Fase Wiki; pnpm 12 + Vite+ + TS 7 + Node 24 tanpa ESLint/Prettier/Turborepo, diverifikasi di spike S01; CI GitHub Actions + `wrangler preview`, Workers Builds cadangan.
- **Jebakan:** jangan `vp dev`/`vp build` di `apps/web` (itu build Vite, bukan Next); mengisi `plugins` Oxlint menimpa set bawaan; jalankan `vp config --no-agent` agar CLAUDE.md tidak diubah.

## 8. Setup Claude Code

- **[diverifikasi]** Claude Code terbaru di npm 2.1.300 (14 Okt), dist-tag stable 2.1.292. Sumber: `npm view @anthropic-ai/claude-code`.
- **[diverifikasi]** CLAUDE.md sebaiknya <200 baris, dan impor `@path` tidak mengurangi biaya konteks. CLAUDE.md di subdirektori dimuat saat file di sana dibaca. Rules `.claude/rules/*.md` dengan frontmatter `paths` dimuat saat file yang cocok dibuka; YAML yang tidak valid membuatnya dimuat untuk semua file. https://code.claude.com/docs/en/memory
- **[diverifikasi]** `disable-model-invocation: true` mencegah skill dipanggil otomatis; `context: fork` berjalan tanpa riwayat percakapan; `.claude/commands/` sudah digabung ke skills. https://code.claude.com/docs/en/skills
- **[diverifikasi]** Stdout hook SessionStart masuk konteks. Izin dievaluasi deny → ask → allow, dan `defaultMode` auto/bypassPermissions tidak berlaku dari settings proyek. https://code.claude.com/docs/en/hooks · https://code.claude.com/docs/en/settings
- **[diverifikasi]** Artikel Anthropic (26 Nov 2025) menganjurkan progress log, satu fitur per sesi, dan daftar fitur JSON. https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- **Keputusan** (ADR-001): status di Markdown dengan aturan "centang hanya dengan bukti" agar terbaca pemilik; skill `/sesi`, `/posisi` (awalnya `/status`, diganti karena bentrok dengan perintah bawaan), `/rilis`, `/docs-terbaru`; rule `teks-arab`; subagen `peninjau` tanpa Edit/Write; tanpa plugin.
- **Temuan saat riset** (sebelum `implementasi/` disusun): belum ada CLAUDE.md root dan `.claude/settings.json`, skill status memakai `disable-model-invocation`, dan template sesi memanggil `pnpm check` yang tidak ada.

## 9. Data teks, Al-Qur'an, dan eval

- **[diverifikasi]** OpenITI 2025.1.9 (Zenodo, 30 Des 2025, CC BY-NC-SA 4.0) memuat dua versi Ihya: `JK000001-ara1` (primer, takhrij al-'Iraqi di dalam baris) dan `Shamela0009472-ara1` (sekunder, isi takhrij praktis hilang). Keduanya punya 1.706 penanda halaman dengan pembagian jilid yang sama dengan Shamela lokal. https://zenodo.org/records/17767721
- **[diverifikasi, tes lokal]** Matan `Shamela0009472` vs Shamela lokal: median kemiripan per halaman 1,0; 1.705 dari 1.706 halaman ≥0,95. Sekitar 200 halaman di kedua sumber punya takhrij yang bercampur ke matan setelah `//`.
- **[diverifikasi]** Penanda halaman OpenITI (mARkdown) diletakkan di **akhir** halaman. https://alraqmiyyat.github.io/mARkdown/
- **[diverifikasi]** Syarat Shamela (19 Sep 2026): hak tetap pada pemiliknya dan tidak memberi hak pakai ulang. Shamela kini punya MCP publik (`mcp.shamela.ws`, v8.1.0, tanpa auth, 4 tool read-only) dan "اسأل الشاملة" (tanya-jawab AI bersumber). https://shamela.ws/page/terms · https://shamela.ws/ai
- **[diverifikasi]** Tanzil 1.1: CC BY 3.0, hanya boleh verbatim. Tes lokal: 97,2% (950/977) kutipan ayat bertanda `{…}` di Ihya cocok persis dengan `simple-clean` setelah normalisasi. https://tanzil.net/docs/text_license
- **[diverifikasi]** QuranEnc `indonesian_affairs` (Kemenag) punya syarat pakai ulang eksplisit (tanpa perubahan, sebut penerbit dan versi). API Quran Foundation membatasi cache 1 minggu dan melarang bundel; `quran-json` deprecated. UU 28/2014 Pasal 42: tidak ada hak cipta atas kitab suci. https://quranenc.com/api/v1/translations/list/id · https://api-docs.quran.foundation/legal/developer-terms/ · https://id.wikisource.org/wiki/Undang-Undang_Republik_Indonesia_Nomor_28_Tahun_2014
- **[diverifikasi]** Langfuse (diakuisisi ClickHouse, Jan 2026): Hobby gratis tetapi 2 user dan 1 antrean anotasi; UI Inggris tanpa RTL (issue #5758); tanpa panduan resmi untuk Workers; self-host butuh Postgres, Redis, ClickHouse, dan S3. promptfoo diakuisisi OpenAI (Mar 2026), tetap MIT. https://langfuse.com/pricing · https://github.com/langfuse/langfuse/issues/5758 · https://openai.com/blog/openai-to-acquire-promptfoo
- **Versi:** OpenITI 2025.1.9 (commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e`) · Shamela MCP 8.1.0 · Tanzil 1.1 · QuranEnc `indonesian_affairs` 1.0.1 · Langfuse v4.59.0 · `promptfoo` 0.124.1.
- **Keputusan** (ADR-015, ADR-018, ADR-020 s.d. ADR-022): matan dan struktur dari Shamela lokal dengan gerbang `verify-openiti`, takhrij dicek silang dengan JK000001; konten turunan CC BY-NC-SA 4.0 tanpa iklan/paywall; ayat Tanzil + terjemahan Kemenag, tidak pernah diterjemahkan LLM; eval `tools/eval` + halaman `/tinjau` + D1 `answer_log`/`review`; pembeda Surau terhadap Shamela adalah bahasa Indonesia, kedalaman per kitab, dan kutipan terverifikasi kode.
- **Jebakan:** kurung `{…}` di Shamela juga dipakai untuk penomoran dan tag `@QB@` di JK tidak andal, jadi ayat selalu divalidasi ke Tanzil; ±3% kutipan beda ejaan (pencocokan fuzzy berlabel "mirip"); jangan memakai branch `master` OpenITI, pin ke commit.

## Perbedaan antar-laporan area dan keputusan akhirnya

| Topik | Laporan yang berbeda | Keputusan | ADR |
|---|---|---|---|
| Versi Next | Next.js: 16.4.1 dengan gerbang rilis; HeroUI & tooling: 16.4.1 langsung | 16.3.8 + mitigasi; 16.4 setelah OpenNext mendukung | 003 |
| `cacheComponents` | HeroUI: tetap `true`; Next.js: `false` | `false` sampai PR #1318 dirilis | 003 |
| Batas ukuran Worker | HeroUI, MCP, tooling mengutip docs OpenNext (10 MiB terkompresi) | 64 MiB tanpa kompresi | 002 |
| CI/CD | Next.js: Workers Builds; HeroUI & tooling: GitHub Actions | GitHub Actions; Workers Builds cadangan | 017 |
| Pipeline ingest | Data Cloudflare: Python + snowballstemmer; tooling: `node:sqlite` | TypeScript, satu modul normalisasi | 007 |
| Tokenizer FTS | Data Cloudflare: `remove_diacritics 2` + stem Snowball | `remove_diacritics 0` + stem proklitik konservatif | 005 |
| ORM | Data Cloudflare & tooling: Drizzle 1.0.0-rc.4 | Tanpa ORM di Fase 0–4 | 009 |
| TypeScript | HeroUI: tetap TS 5.9/6 dulu; tooling: TS 7 | TS 7, diverifikasi di spike S01 | 008 |
| Font Arab | Next.js: Noto Naskh default; HeroUI: Amiri default | Usulan Noto Naskh + Amiri opsional | P-3 |
| Mode AI Gateway | AI Gateway: `x-api-key` dari Worker secret | BYOK, karena spend limit hanya berlaku untuk BYOK/Unified Billing | 013 |
| Nama tool MCP | MCP: Indonesia (`daftar_isi`, `baca_bagian`, `cari`, …) | Inggris snake_case | 012 |
| Tes Worker | MCP: `@cloudflare/vitest-pool-workers` 0.23 | `@cloudflare/vitest-plugin` 1.4.x | 008 |
| Langfuse | AI Gateway: ditolak; data & eval: cadangan | Cadangan; eval dibangun sendiri | 015 |
| `sqlite3` macOS | Data Cloudflare: `/usr/bin/sqlite3` tanpa FTS5 | Yang tanpa FTS5 adalah build Android SDK di PATH; `/usr/bin/sqlite3` 3.54.0 punya FTS5 | – |

## Koreksi terhadap catatan riset sebelumnya

Dibandingkan dengan [2026-10-15-catatan-riset.md](2026-10-15-catatan-riset.md):

| Catatan sebelumnya | Yang berlaku sekarang | Rujukan |
|---|---|---|
| Baca cache Sonnet 5.5 ditulis $0,20 | **$0,10** per juta token (halaman harga resmi, dicek 15 Okt 2026); tabel lengkap Haiku/Sonnet/Opus 5.5 di STACK.md | [STACK.md](../../implementasi/STACK.md) |
| Batch hanya disebut sebagai diskon 50% | Message Batches **tidak tersedia di Amazon Bedrock**; kredit AWS hanya untuk panggilan online, batch dikirim langsung ke Anthropic | ADR-013 |
| MCP: `@modelcontextprotocol/sdk` 1.32.1 dan `mcp-handler` 2.3.0 | SDK v1 hanya pemeliharaan; dipakai `@modelcontextprotocol/server` v2. `mcp-handler` dan `@vercel/mcp-adapter` tidak dipakai | ADR-011 |
| Langfuse: antrean anotasi, Hobby gratis | Benar, tetapi Hobby hanya 2 user, UI Inggris tanpa RTL, tanpa panduan Workers → cadangan | ADR-015 |
| Proyek sejenis: Ansari, Fanar-Sadiq, Usul.ai | Shamela sendiri kini punya MCP publik dan "اسأل الشاملة"; posisi Surau dibedakan | ADR-022 |
| Hosting: Vercel Hobby, Supabase Free | Cloudflare Workers Paid + D1 | ADR-002, ADR-005 |
| Postgres `arabic` sebagai kandidat | Diuji: recall 0,721 dan stem tidak konsisten → ditolak | ADR-005 |
| FTS5: harakat dianggap pemisah | Ditambah: `remove_diacritics` tidak berpengaruh pada Arab; indeks dibuat atas teks ternormalisasi dengan `remove_diacritics 0` | ADR-005 |
| LangExtract sebagai alat ekstraksi | Python dan tanpa provider Anthropic bawaan → opsional; default ekstraksi TS-native dengan grounding offset oleh kode | ADR-007 |
| Framework agen (AI SDK 7, LangChain, Mastra, PydanticAI) | Tidak masuk stack; dipakai `@anthropic-ai/sdk` langsung | ADR-013 |
| Alat eval: promptfoo, Braintrust, Opik | AI Gateway Evaluations deprecated; eval dan anotasi dibangun sendiri, promptfoo cadangan | ADR-015 |

## Belum terverifikasi / pertanyaan terbuka

- Passthrough AI Gateway untuk Citations, streaming SSE, `cache_control`, header `anthropic-beta`, dan Message Batches belum terdokumentasi; diuji di S19. Belum jelas juga apakah spend limit mengenali harga `claude-haiku-5-5` dan apakah `cf-aig-custom-cost` ikut dihitung.
- Respons Anthropic saat spend limit workspace tercapai (dilaporkan 400 `invalid_request_error`) hanya berasal dari laporan pengguna di GitHub, bukan docs.
- Biaya Rate Limiting binding tidak dicantumkan di halaman harga.
- Cara D1 produksi menghitung `rows_read` untuk FTS5, dukungan trigram dan `contentless_delete` di D1 remote, serta latensi remote. Semua angka latensi di atas berasal dari mesin lokal.
- Satu DB D1 di-bind ke beberapa Worker dengan `database_id` yang sama: inferensi dari model binding, belum ada kutipan docs.
- Apakah Claude.ai sudah memakai spesifikasi 2026-07-28 (mode dual-era menutup risiko ini). Syarat Anthropic Connectors Directory (anotasi tool) hanya dari ringkasan hasil pencarian.
- Kapan OpenNext merilis dukungan Next 16.4 dan perbaikan Cache Components; perkiraan maintainer ±2 minggu.
- Tidak berlakunya advisory `use cache` dan Image Optimization saat fiturnya dimatikan adalah analisis sendiri; untuk DoS Server Actions, ADR-003 mencatat pernyataan vendor.
- Lisensi HeroUI Pro untuk repo publik Apache-2.0 (perlu izin tertulis, P-1); apakah postinstall Pro mengunduh artefak sesuai versi stub yang dipin; rate limit MCP Pro tidak didokumentasikan.
- Kombinasi Next + TypeScript 7, `vp test` + `@cloudflare/vitest-plugin`, dan impor paket workspace lewat type stripping belum diuji; diverifikasi di spike S01.
- Cloudflare Access gratis ≤50 pengguna: sumbernya halaman pemasaran dan pihak ketiga, bukan docs resmi.
- Estimasi biaya satu Jawab (Haiku 5.5, asumsi skenario C kalkulator: 10,5k token dari cache + 10,6k token baru + 1,4k output ≈ $0,0019) adalah hitungan sendiri; jumlah token Arab di tokenizer Claude diukur di S13 dengan `count_tokens`.
- Recall 1,000 pada eksperimen FTS diukur terhadap gold regex yang sebagian sirkular; perlu set relevansi yang dinilai manusia (S15).
- Apakah QuranEnc `indonesian_affairs` sama dengan edisi penyempurnaan 2019, dan apakah PMA 44/2016 (tashih) berlaku untuk aplikasi yang hanya mengutip ayat di dalam kitab.
- Berapa dari ±92 kitab kurikulum yang punya versi OpenITI; kitab tanpa versi OpenITI butuh kebijakan lisensi tersendiri.
- Kapan pindah dari Node 24 ke Node 26 (LTS 28 Okt 2026) belum diputuskan.

Keputusan yang menunggu pemilik (repo publik atau privat, domain, font Arab, anggaran AI, ustadz, sumber teks dan lisensi, dan retensi data) ada di tabel P-1 s.d. P-7 di [KEPUTUSAN.md](../../implementasi/KEPUTUSAN.md#keputusan-yang-menunggu-pemilik).
