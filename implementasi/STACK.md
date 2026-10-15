# Stack & Docs Resmi

**Aturan:** sebelum memasang, meng-upgrade, atau menulis kode untuk teknologi di bawah, jalankan `/docs-terbaru <paket> <pertanyaan>`. Versi di tabel adalah versi **target** saat ditulis (dicek 15 Okt 2026). Setelah dipasang, isi kolom *Terpasang* dan tanggal cek. Upgrade mayor selalu lewat ADR di [KEPUTUSAN.md](KEPUTUSAN.md).

Alasan setiap pilihan ada di KEPUTUSAN.md (nomor ADR di kolom terakhir).

## Runtime & toolchain

| Teknologi | Target | Terpasang | Docs untuk agent | ADR |
|---|---|---|---|---|
| Node.js LTS | 24.22.0 (`.node-version`) | 24.22.0 (dicek 2026-10-15) | https://nodejs.org/docs/latest-v24.x/api/ · `node:sqlite` https://nodejs.org/docs/latest-v24.x/api/sqlite.html · type stripping https://nodejs.org/docs/latest-v24.x/api/typescript.html | 008 |
| pnpm | 12.11.2 (`packageManager`) | 12.11.2 (terbaru 12.13.0; dicek 2026-10-15) | https://pnpm.io/settings · https://pnpm.io/catalogs · build scripts https://pnpm.io/settings/build | 008 |
| Vite+ (`vp`) | 1.2.0 | lokal **1.2.0** (dinaikkan 2026-10-15 17:20 WIB) · global 1.1.0 · dicek 2026-10-15 | https://viteplus.dev/llms.txt · monorepo https://viteplus.dev/guide/monorepo · CI https://viteplus.dev/guide/ci | 008 |
| `voidzero-dev/setup-vp` (CI) | v1.21.2 (pin SHA `68f39c78…`) | v1.21.2 di `ci.yml` (dicek 2026-10-15) · **jangan** `@v1` (beku di v1.15.0) | https://github.com/voidzero-dev/setup-vp · https://viteplus.dev/guide/ci | 024 |
| `actions/checkout`, `actions/cache` (CI) | v7.0.1 (`3d3c42e5…`), v6.1.0 (`55cc8345…`, `restore`/`save`) | idem di `ci.yml` (dicek 2026-10-15) | https://github.com/actions/checkout · https://github.com/actions/cache | 024 |
| Dependabot | `version: 2`, npm + github-actions | `.github/dependabot.yml` (dicek 2026-10-15) · pnpm 12 + catalog belum resmi didukung | https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference | 024 |
| Oxlint / Oxfmt (di dalam Vite+) | ikut Vite+ | oxlint 1.88.0 · oxfmt 0.73.0 (lewat vite-plus 1.2.0) | https://oxc.rs/llms.txt | 008 |
| Vitest (di dalam Vite+) | 5.x | 5.0.4 (lewat vite-plus 1.2.0) · cakupan `@vitest/coverage-v8` **5.0.4** (dipin sama dengan vitest bawaan, root; dicek 2026-10-15, S05) | https://vitest.dev/llms.txt · coverage https://vitest.dev/guide/coverage | 008, 028 |
| TypeScript | 7.0.2 | 7.0.2 (root + apps/web; dicek 2026-10-15) | https://nextjs.org/docs/app/api-reference/config/typescript | 008 |
| Playwright | 1.64.x (chromium saja) | `@playwright/test` **1.64.0** (1.64.1 belum 24 jam) + `@axe-core/playwright` 4.13.0 (MPL-2.0, dev), apps/web; dicek 2026-10-15 | https://playwright.dev/docs/intro | 017 |

## Web

| Teknologi | Target | Terpasang | Docs untuk agent | ADR |
|---|---|---|---|---|
| Next.js | **16.3.8** sekarang (+ mitigasi ADR-003); naik ke 16.4.x lewat sesi [X01](sesi/X01-upgrade-next-16-4.md) setelah OpenNext mendukung | **16.3.8** (dicek 2026-10-15; advisory dimitigasi, ADR-023) | **Utamakan** `apps/web/node_modules/next/dist/docs/` · https://nextjs.org/docs/llms.txt · agent guide https://nextjs.org/docs/app/guides/ai-agents · advisories https://github.com/vercel/next.js/security/advisories | 003 |
| React / React DOM | 19.2.x bersama Next 16.3.8; 19.3.x bersama Next 16.4 | 19.2.8 (19.2.9 belum 24 jam, ADR-023) | https://react.dev | 003 |
| @opennextjs/cloudflare | 1.20.11+ | **1.20.11** (devDependency apps/web, catalog; dicek 2026-10-15) · peer `next >=15.5.27 <16 \|\| >=16.3.8` → Next **16.3.8 didukung resmi** (versi minimum). Gerbang ADR-003 untuk 16.4: **terbuka** sejak **1.20.12** (15 Okt 2026, peer `>=16.4.1`, "Add support for Next.js 16.4"); pasang lewat X01 mulai 16 Okt 14:51 WIB (umur 24 jam). Advisory terbuka 16.3.8 (673q, 2464, p3m5) dan React xqc2/h3gv termitigasi, diverifikasi di build saat `/rilis 0` | https://opennext.js.org/cloudflare · rilis https://github.com/opennextjs/opennextjs-cloudflare/releases · *batas ukuran 3/10 MiB di docs ini sudah usang; yang berlaku 64 MiB* | 003 |
| HeroUI OSS (`@heroui/react`, `@heroui/styles`) | 3.2.6 | 3.2.6 | MCP `heroui-pro` (level user, T-01) · https://heroui.com/react/llms.txt | 004 |
| HeroUI Pro (`@heroui-pro/react`) | **1.0.0-beta.10 persis** | 1.0.0-beta.10 (catalog, dicek 2026-10-15) | MCP `heroui-pro` (`list_components`, `get_component_docs`) · https://heroui.pro/docs/react/llms.txt · instalasi/CI https://heroui.pro/docs/react/getting-started/installation · terms https://heroui.pro/terms | 004 |
| Tailwind CSS | 4.x (ikut template) | 4.3.3 (2026-10-15, dari PR Dependabot #3) | https://tailwindcss.com/docs | 004 |
| next-themes | 0.4.6 | 0.4.6 (apps/web, catalog; peer React ≤19; dicek 2026-10-15) | https://heroui.com/docs/react/getting-started/dark-mode | 004 |
| Ikon | `@gravity-ui/icons` saja | 2.22.0 | https://gravity-ui.com/icons | 004 |
| Font | Arab: Noto Naskh Arabic (T-08) · UI: Plus Jakarta Sans, via `next/font/google` | Noto Naskh Arabic (variable 400–700, subset arabic, `preload: false`) + Plus Jakarta Sans (latin), Next 16.3.8; dicek 2026-10-15 · Amiri dicoba lalu tidak dipilih (ADR-027) | data font ada di `next/dist/compiled/@next/font` | P-3 |

## Cloudflare

| Teknologi | Target | Terpasang | Docs untuk agent | ADR |
|---|---|---|---|---|
| Wrangler | 4.151.0+ (devDependency, **jangan pakai yang global**) | 4.151.0 (devDependency root + apps/web, catalog; dicek 2026-10-15) · global 4.126 (usang) | MCP `cloudflare-docs` · https://developers.cloudflare.com/workers/llms.txt · skill `wrangler` | 002 |
| Workers (limits, pricing) | Paid | Worker `surau-web` aktif: S04 (2026-10-15) **5.815 KiB / 1.221 KiB gzip** (S03: 15.993 / 3.021 KiB) dari batas 64 MiB, startup 20 ms, `compatibility_date` 2026-10-14 | https://developers.cloudflare.com/workers/platform/limits/ | 002 |
| D1 + FTS5 | – | `surau-corpus-staging`, `surau-app`, `surau-app-staging` (apac, 2026-10-15); STRICT + FTS5 `contentless_delete` lolos di remote (S06) | https://developers.cloudflare.com/d1/llms-full.txt · limits https://developers.cloudflare.com/d1/platform/limits/ · migrasi https://developers.cloudflare.com/d1/reference/migrations/ · impor https://developers.cloudflare.com/d1/best-practices/import-export-data/ · FTS5 https://www.sqlite.org/fts5.html | 005 |
| R2 | – | bucket `surau-next-cache` + `surau-next-cache-preview` (cache ISR OpenNext, 2026-10-15) | https://developers.cloudflare.com/r2/llms-full.txt | 005 |
| Vectorize + Workers AI (ditunda) | – | – | https://developers.cloudflare.com/vectorize/llms-full.txt · https://developers.cloudflare.com/workers-ai/llms-full.txt | 006 |
| Worker Previews | wrangler ≥4.135 | `wrangler preview --name pr-<n> --json` di `preview.yml` (open beta; diuji lokal 2026-10-15) | https://developers.cloudflare.com/workers/previews/get-started/ | 017 |
| Vitest di Workers | `@cloudflare/vitest-plugin` 1.4.x (**bukan** `vitest-pool-workers`, deprecated) | **1.4.2** (packages/db, catalog; peer vitest ^5; project `db` dengan `fsModuleCache: false`, tanpa coverage v8; dicek 2026-10-15, S06) | https://developers.cloudflare.com/workers/testing/vitest-integration/ | 008 |
| AI Gateway (mode BYOK) | – | – | https://developers.cloudflare.com/ai-gateway/llms.txt · Anthropic https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/ · BYOK https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/ · spend limit https://developers.cloudflare.com/ai-gateway/features/spend-limits/ | 013 |
| Turnstile | Managed | – | https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ | 014 |
| Rate Limiting binding | – | – | https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ | 014 |
| Observability / Web Analytics | – | – | https://developers.cloudflare.com/workers/observability/ · https://developers.cloudflare.com/web-analytics/llms.txt | 015 |

## Data & domain

| Teknologi | Target | Terpasang | Docs untuk agent | ADR |
|---|---|---|---|---|
| Akses D1 | **Tanpa ORM**: migrasi SQL + `wrangler d1 migrations` + repository bertipe (Zod) | `packages/db` (S06): migrasi corpus/app 0001, tipe struktural `D1Db`; `@cloudflare/workers-types` **5.20261014.1** hanya untuk tes (dicek 2026-10-15) | D1 Worker API https://developers.cloudflare.com/d1/worker-api/ · migrasi https://developers.cloudflare.com/d1/reference/migrations/ · (cadangan: Drizzle saat 1.0 GA, https://orm.drizzle.team/llms.txt) | 009 |
| Zod | 4.x (≥4.2, wajib untuk MCP SDK v2) | **4.6.7** (packages/db, catalog; impor dari `"zod"`; dicek 2026-10-15, S06) | https://zod.dev | 011 |
| Hono (Worker API, Fase 4) | 4.x | – | https://hono.dev/llms.txt | 010 |

## AI & MCP

| Teknologi | Target | Terpasang | Docs untuk agent | ADR |
|---|---|---|---|---|
| `@anthropic-ai/sdk` | 0.134.x | – | skill `claude-api` (**wajib dimuat sebelum menulis kode Claude**) · https://platform.claude.com/docs/en/about-claude/pricing · Citations https://platform.claude.com/docs/en/build-with-claude/citations · Batches https://platform.claude.com/docs/en/build-with-claude/batch-processing | 013 |
| Model | `claude-haiku-5-5` (utama), `claude-sonnet-5-5` (fallback refusal & pembanding) | – | lihat aturan di ADR-013 | 013 |
| `@modelcontextprotocol/server` (+ `client` untuk tes) | 2.3.x | – | https://ts.sdk.modelcontextprotocol.io/v2/llms.txt · spec https://modelcontextprotocol.io/llms.txt | 011 |
| `next-devtools-mcp` (MCP agent untuk dev server Next) | 0.4.0 (`.mcp.json`) | 0.4.0 · endpoint `/_next/mcp` diuji lewat curl 2026-10-15 | https://nextjs.org/docs/app/guides/mcp · `apps/web/node_modules/next/dist/docs/01-app/02-guides/mcp.md` | 003 |
| MCP Inspector | 2.11.x | – | https://github.com/modelcontextprotocol/inspector | 011 |
| Better Auth (ditunda) | 1.7.x (adapter D1 bawaan) | – | https://better-auth.com/docs/llms.txt · MCP https://mcp.better-auth.com/mcp | 016 |

## Harga acuan (untuk kalkulator dan ledger)

Sumber: https://platform.claude.com/docs/en/about-claude/pricing (dicek 15 Okt 2026). USD per juta token.

| Model | Input | Tulis cache 5m | Baca cache | Output | Batch (in/out) |
|---|---|---|---|---|---|
| Claude Haiku 5.5 (prompt ≤100k) | 0,10 | 0,125 | 0,01 | 0,50 | 0,05 / 0,25 |
| Claude Haiku 5.5 (prompt >100k) | 0,50 | 0,625 | 0,05 | 2,50 | 0,25 / 1,25 |
| Claude Sonnet 5.5 | 2,00 | 2,50 | **0,10** | 10,00 | 1,00 / 5,00 |
| Claude Opus 5.5 | 4,00 | 5,00 | 0,20 | 20,00 | 2,00 / 10,00 |

Diskon batch bertumpuk dengan caching. Batas 100k Haiku dihitung dari **seluruh** token input, termasuk baca dan tulis cache.

## Cloudflare: biaya yang relevan (Workers Paid $5/bln)

- Workers: 10 juta request + 30 juta CPU-ms per bulan termasuk.
- D1: 25 miliar baris dibaca, 50 juta ditulis, dan 5 GB per bulan termasuk.
- R2: 10 GB termasuk, egress $0.
- Workers AI: 10 ribu neuron/hari gratis. Embedding ±$0,012/juta token.
- Log dan trace dihitung per GB mulai 1 Des 2026 (50 GB ingest termasuk).
