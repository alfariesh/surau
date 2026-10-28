# @surau/mcp

Worker MCP publik Surau (S16, [ADR-011](../../implementasi/KEPUTUSAN.md), ADR-049): **read-only, stateless, tanpa login, tanpa LLM**, di `https://mcp.surau.org/mcp`. Setiap hasil tool disalin kode dari D1 korpus (teks Arab verbatim, sitasi lengkap, permalink absolut ke `https://surau.org`, blok `license`). Logika data seluruhnya di [`@surau/core`](../../packages/core/README.md); di sini hanya skema MCP, pengaman, dan amplop.

**Panduan pengguna:** [Pakai Surau dari AI Anda](https://surau.org/mcp) (Claude.ai/Desktop/Code, ChatGPT, klien MCP lain). **Operasional S17:** [uji klien nyata, keterbatasan dan pemantauan](../../docs/mcp-operasional.md), termasuk event `mcp_tool` berisi nama tool, outcome dan durasi tanpa input/output/IP (ADR-050).

- SDK `@modelcontextprotocol/server` 2.3.1, `createMcpHandler` dengan `legacy: "stateless"`: klien spesifikasi **2025-11-25** (`initialize`) dan **2026-07-28** (`server/discover`, tanpa sesi) dilayani handler yang sama. Satu `McpServer` baru per permintaan.
- D1 `CORPUS_DB` = DB korpus produksi yang **sama** dengan `apps/web` (diganti `pnpm run corpus:promote` bersama web, dijaga `tools/ingest/src/corpus.test.ts`). Preview memakai `surau-corpus-staging`.

## Tool

| Tool | Core | Isi | Ukuran (token Claude, [laporan](../../data/reports/mcp-token.md)) |
|---|---|---|---|
| `list_works` | `listWorks` | Karya + edisi, lisensi, atribusi | ±0,6 ribu |
| `get_table_of_contents` | `getToc` | Pohon daftar isi; dari akar maks. 2 tingkat, dari `node_id` maks. 3 | ±7,8 ribu (akar), ±10 ribu (satu rub' kedalaman 3) |
| `read_page` | `readPage` | Halaman cetak: badan + catatan kaki verbatim, ayat (Tanzil + Kemenag, lisensi sendiri ikut blok `license`), terjemahan AI berlabel, ringkasan AI | median ±11,1 ribu, maks. ±14,8 ribu |
| `read_section` | `readSection` | Bagian + sub-bagian per potongan, `next_cursor` | median ±5 ribu, maks. ±6,2 ribu |
| `search_text` | `searchText` | Arab/Indonesia + gagasan Intisari (`digest_point`, X16); ≤5 halaman (lanjut lewat `offset`), ≤3 paragraf terbaik per halaman, tanpa field sorotan (ADR-049) | median ±7,3 ribu, maks. ±10,9 ribu |
| `verify_quote` | `verifyQuote` | Kutipan ada di paragraf? `match.text` = teks sumber persis | ±0,75 ribu |
| `get_hadith_takhrij` | `getHadithTakhrij` | Catatan kaki takhrij tertaut; tanpa takhrij = status tidak diketahui | median ±0,9 ribu, maks. ±2,3 ribu |
| `get_section_digest` | `readDigest` | Intisari satu bagian (X16, ADR-097/099): gagasan AI berjangkar ke paragraf, kutipan Arab dari DB, istilah, pertanyaan ingatan, dalil yang dihitung kode (ayat Tanzil + Kemenag, takhrij + label kode); `digest: null` bila bagian tanpa Intisari | belum diukur (data nyata menyusul X15b) |

### Endpoint `/redaksi` (X23, ADR-125)

`https://mcp.surau.org/redaksi`: server `surau-redaksi` untuk plugin penulis konten ([plugins/surau-redaksi](../../plugins/surau-redaksi/README.md)). Delapan tool di atas ditambah dua tool deterministik dari [`src/redaksi-tools.ts`](src/redaksi-tools.ts); instruksi sendiri ≤ 2.000 karakter ([`src/redaksi-instructions.ts`](src/redaksi-instructions.ts)). Tidak diiklankan di info `/`.

| Tool | Core | Isi |
|---|---|---|
| `check_content_draft` | `checkContentDraft` | Periksa draf `surau-konten/1` (skema, bahasa, korpus); `ok`, `errors`, `warnings`, `facts`, `stamp`. Draf tidak pernah digemakan |
| `list_translation_units` | `listTranslationUnits` | `/redaksi` saja (X27): paragraf badan bagian untuk terjemahan Inggris, teks Arab dengan ayat diganti `⟦QS s:a⟧`, penanda catatan kaki, konteks; paginasi `offset`/`limit` ≤ 40 |
| `check_translation_draft` | `checkTranslationDraft` | `/redaksi` saja (X27): periksa draf `surau-terjemah/1` dengan aturan batch terjemahan (`checkPassageTranslation`, bahasa en); `ok`, `errors`, `warnings`, `facts`, `stamp`; draf tidak pernah digemakan |
| `list_faedah_candidates` | `listFaedahCandidates` | Paragraf calon Faedah + terjemahan AI berlabel + alasan tidak layak (kode); paginasi `offset`/`next_offset` |

Semua tool: nama ASCII snake_case (ADR-012), deskripsi Inggris + ringkasan Indonesia setelah ` · `, anotasi `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`, `outputSchema` berakar objek (skema Zod core + `license`), `structuredContent` + salinan JSON di `content`. Error core menjadi hasil `isError` dengan teks `<code>: <pesan>` (mis. `not_found: Page not found: juz 9, page 1`); error lain `internal_error` tanpa detail. Instruksi server: [`src/instructions.ts`](src/instructions.ts), ≤ 2.000 karakter (`SERVER_INSTRUCTIONS_MAX`, dijaga tes) karena klien claude.ai memotong instruksi di sekitar 2.048 karakter; aturan docs/05 §11 diurutkan menurut kepentingan (ADR-126).

## Pengaman

| Lapisan | Aturan |
|---|---|
| Path | Hanya `/mcp`, `/redaksi` (X23), dan `GET /` = info JSON; lainnya 404 |
| Origin | `originValidationResponse`: `surau.org`, `www.surau.org`, `mcp.surau.org`, localhost; Origin lain atau `null` → 403; tanpa Origin (klien server-ke-server) → lolos |
| Body | `maxRequestBodySize` 64 KiB → 413; `maxSubscriptions` 16 per isolate |
| Batas per tool | Rate Limiting binding, kunci `HMAC(IP_HMAC_KEY, jaringan IP):tool`: tool baca 120/menit per klien (`MCP_TOOL_LIMITER`) + 600/menit per lokasi Cloudflare, bukan global akun (`MCP_READ_GLOBAL_LIMITER`; daftar isi dan `read_section` membaca ±1.000 baris per panggilan), `search_text` 60/menit per klien (`MCP_SEARCH_LIMITER`) + 600/menit per lokasi Cloudflare (`MCP_SEARCH_GLOBAL_LIMITER`, D1 dipakai bersama web). Di `/redaksi` kunci per klien diberi lingkup `redaksi:` (ember sendiri; plafon global search tetap satu), dan dua tool redaksi memakai `MCP_REDAKSI_LIMITER` (30/menit per klien, dan kunci `global` di binding yang sama = 30/menit semua klien; `namespace_id` 3005, Preview 4005). Habis → hasil `isError` `rate_limited`. Tanpa secret `IP_HMAC_KEY` → `not_configured` (gagal tertutup) |
| Pagar luar | Satu aturan WAF rate limiting per IP untuk path `/mcp` (T-19, dashboard); `/redaksi` belum tercakup (T-34) |
| Cache | `cacheHints` publik 1 jam untuk `tools/list` dan `server/discover` (era modern) |

Batas longgar karena semua pengguna claude.ai datang dari IP Anthropic (ADR-011). `namespace_id`: produksi 3001–3004, Preview 4001–4004 (web memakai 1001–1004 / 2001–2004).

## Perintah (dari root repo)

- `pnpm --filter @surau/mcp dev` → http://localhost:3006/mcp (D1 lokal di `.wrangler/state`, sama dengan web; butuh `apps/mcp/.dev.vars` berisi `IP_HMAC_KEY=<nilai uji>`, git-ignored). Jangan jalankan bersamaan dengan proses lain yang menulis D1 lokal.
- `bash .github/scripts/uji-mcp.sh http://localhost:3006/mcp` → MCP Inspector 2.11.0 CLI, era modern + legacy, kedelapan tool + kasus error + Origin 403; mode `redaksi` untuk `/redaksi` (sama dengan CI Preview).
- `pnpm exec vp test --project mcp` → tes workerd: `src/index.test.ts` (Client v2 in-process, kedua era, fixture buatan core) dan tes unit `envelope`, `guard`, `tools`.
- `pnpm --filter @surau/mcp build` → `wrangler deploy --dry-run` ke `dist/` (bundel diperiksa tanpa deploy).
- `pnpm llm mcp-tokens [--url …] [--n 25]` → ukur token hasil tool dengan `count_tokens` (gratis) → `data/reports/mcp-token.md`.
- `pnpm --filter @surau/mcp run cf-typegen` → `worker-configuration.d.ts` setelah mengubah `wrangler.jsonc`.

## Deploy

- **Preview per PR** (`preview.yml`, job `preview mcp`): `wrangler preview --name pr-<nomor>` di folder ini, lalu `uji-mcp.sh <url>/mcp lengkap`. URL ada di Summary job.
- **Produksi** (`deploy.yml`, job `deploy mcp`, setelah web): `wrangler deploy` (custom domain `mcp.surau.org` dari `routes`), lalu `uji-mcp.sh https://mcp.surau.org/mcp daftar`.
- Secret `IP_HMAC_KEY` dipasang agent dengan nilai acak (tidak pernah dicetak): produksi `wrangler secret put IP_HMAC_KEY`, Preview `wrangler preview base-config secret put IP_HMAC_KEY`.
