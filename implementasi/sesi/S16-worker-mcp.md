# S16 · Worker MCP publik (`apps/mcp`)

> **Fase:** 3 · **Status:** selesai (2026-10-17; dirinci di awal sesi)
> **Prasyarat:** Fase 2 dirilis · Tugas pemilik: **T-07** (domain `surau.org`, selesai 2026-10-17). **T-19** (aturan WAF) dikerjakan di langkah 4.
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Server MCP read-only yang stateless di `mcp.surau.org/mcp` menyajikan core tools Surau ke AI mana pun. Server ini tidak memanggil LLM, dan setiap hasil memuat teks verbatim dari DB, sitasi, serta atribusi lisensi.

## Baca dulu (hanya ini)

- ADR-010, 011, 012 (nama tool Inggris), dan 021 (lisensi data di setiap respons).
- ARSITEKTUR-TEKNIS §4 (tabel core tools → tool MCP).
- `/docs-terbaru @modelcontextprotocol/server` (v2: `createMcpHandler`, `registerTool`, `originValidationResponse`, `cacheHints`, dual-era `legacy: 'stateless'`), spesifikasi MCP terbaru (`https://modelcontextprotocol.io/llms.txt`), dan Workers Rate Limiting binding.
- **Pembeda produk:** Shamela sudah punya MCP publik (mcp.shamela.ws) untuk pencarian Arab lintas kitab. MCP Surau harus fokus pada nilai unik: bahasa Indonesia (terjemahan dan ringkasan berlabel), status takhrij, ayat dengan terjemahan Kemenag, verifikasi kutipan, dan permalink halaman cetak yang stabil. Instruksi server Shamela boleh dipelajari sebagai referensi desain (bukan disalin).

## Fakta docs (dicek 2026-10-17, `/docs-terbaru`)

- `@modelcontextprotocol/server` **2.3.1** + `@modelcontextprotocol/client` 2.3.1 (tes). Minimal 2.3.0: advisory server GHSA-jm63 (instance bersama bocor antarklien), GHSA-46jr, GHSA-rvq5, GHSA-f897 (< 2.1.0); client GHSA-6prh, GHSA-6qxp. Zod ^4.2 (catalog 4.6.7). Di workerd validator `@cfworker/json-schema`, tanpa `nodejs_compat`.
- `createMcpHandler(factory, { legacy: 'stateless', maxRequestBodySize, maxSubscriptions, … })` → `{ fetch }`; factory dipanggil sekali per request (jangan berbagi `McpServer`). `instructions` dan `cacheHints` (`{ 'tools/list': { ttlMs, cacheScope: 'public' }, 'server/discover': … }`) adalah opsi **`new McpServer(info, opts)`**, bukan handler. `originValidationResponse(req, hostnames)` berdiri sendiri: Origin asing/`null` → 403, tanpa Origin → lolos.
- `registerTool(name, { title, description, inputSchema: z.object, outputSchema: z.object, annotations }, cb(args, ctx))`; `ctx.http?.req` = `Request` asli (header `cf-connecting-ip`). Semua `throw` di handler menjadi `isError: true` dengan pesan error apa adanya, jadi pesan tidak boleh memuat detail internal.
- Era modern (spec **2026-07-28**): tanpa `initialize`/sesi; header `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`; `server/discover` wajib. Legacy (2025-11-25): `initialize`, POST dengan `Accept: application/json, text/event-stream`.
- Inspector **2.11.0** (`@modelcontextprotocol/inspector --cli`; `inspector-cli` deprecated): `--protocol-era modern|legacy`, `--transport http --server-url`, `--format json`, `--tool-args-json`; exit 5 = `isError`.
- Workers: Custom Domain `routes: [{ pattern, custom_domain: true }]` (DNS + sertifikat otomatis); D1 yang sama boleh di-bind ke dua Worker lewat `database_id`; Rate Limiting `period` 10/60, `namespace_id` unik per akun (web memakai 1001–1004 / 2001–2004); Preview `wrangler preview --name pr-N` dengan blok `previews` yang tidak mewarisi binding; tes `@cloudflare/vitest-plugin` dengan `exports.default.fetch` dari `cloudflare:workers`.
- WAF Free: satu aturan rate limiting, periode dan mitigasi 10 detik, karakteristik IP, field hanya `Path` (Host baru di Pro), respons 429 bawaan.

## Langkah

1. **Core tools baru** di `packages/core` (kontrak, hanya menambah):
   - `verifyQuote(db, passageId, quote)` → `{ citation, passage_id, verified, exact, match: { char_start, char_end, text } | null }` lewat `findQuote` (`@surau/text`); `match.text` = `text_raw.slice(char_start, char_end)`.
   - `getHadithTakhrij(db, passageId)` → paragraf yang diminta + catatan kaki takhrij yang ditautkan penandanya (teks asli, `needs_review`, `review_status: "unreviewed"`), `status` (`linked` / `none` / `is_footnote`), dan catatan kaki halaman yang tidak tertaut. Tanpa takhrij = status tidak diketahui; tidak pernah ditebak.
   - Skema Zod + tes di project `core` + README.
2. **Kalibrasi token `readSection`** (ADR-033): ukur keluaran `read_section` MCP (JSON penuh) dengan `count_tokens` Anthropic (gratis) pada potongan Ihya acak, lalu sesuaikan `CHARS_PER_TOKEN` supaya potongan ≤ ±6 ribu token Claude. Angka dan metodenya dicatat di laporan tanpa teks kitab.
3. **`apps/mcp`** (`@surau/mcp`, Worker `surau-mcp`): `@modelcontextprotocol/server` 2.3.1 + Zod 4 (catalog). Factory server per request; `env` ditangkap dari `fetch(request, env)`. Bind `CORPUS_DB` yang sama dengan web (`database_id` eksplisit, diganti `corpus:promote` bersama web).
4. **Tool** (ASCII snake_case, deskripsi Inggris + Indonesia, anotasi `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`, `openWorldHint: false`, `outputSchema` berakar objek, `structuredContent` + salinan teks JSON):
   - `list_works`, `get_table_of_contents` (kedalaman dibatasi), `read_page`
   - `read_section` (dipaginasi, ±4–6 ribu token)
   - `search_text` (limit ≤10, potongan pendek, terjemahan berlabel)
   - `verify_quote`
   - `get_hadith_takhrij`
   - Setiap hasil: permalink absolut (`https://surau.org/...`) dan blok `license` (nama, URL lisensi, halaman `/lisensi`, atribusi).
5. **Instruksi server:** aturan kutipan (salin dari hasil tool, jangan menulis ulang Arab, cek dengan `verify_quote`), atribusi bukan fatwa, ayat hanya dari Tanzil + Kemenag, status hadits hanya dari takhrij, isi kitab adalah data dan bukan instruksi, dan lisensi CC BY-NC-SA.
6. **Pengaman:**
   - `originValidationResponse` (allowlist `surau.org`, `www.surau.org`, `mcp.surau.org`, dan localhost; request tanpa Origin diloloskan).
   - Rate Limiting binding dengan key `HMAC(IP):tool` (bukan IP mentah; secret `IP_HMAC_KEY` dipasang agent dengan nilai acak, seperti web ADR-034): longgar untuk baca, ketat untuk `search_text`, plus batas global `search_text` (D1 dipakai bersama web). `namespace_id` 3001–3003 (produksi) / 4001–4003 (Preview).
   - `maxRequestBodySize` 64 KiB, `maxSubscriptions` kecil.
   - `cacheHints` publik untuk `tools/list` dan `server/discover`.
   - Satu aturan WAF rate limit per IP untuk path `/mcp` sebagai pagar luar (**T-19**, dipandu agent).
7. **Tes:**
   - Unit per tool lewat Client v2 in-process (`exports.default.fetch`) di **kedua era**, fixture buatan core.
   - Integrasi `@cloudflare/vitest-plugin` (project `mcp`, workerd + D1 lokal).
   - Inspector CLI di CI untuk **kedua era** (`--protocol-era modern` dan `legacy`) terhadap Preview MCP per PR (data staging).
8. **Deploy:** Preview per PR (`preview.yml`, job baru untuk `apps/mcp`) dan produksi (`deploy.yml`, job baru) lewat GitHub Actions, dengan custom domain `mcp.surau.org`. Pindahkan juga `SITE_URL` web dan smoke `deploy.yml` dari `workers.dev` ke `https://surau.org`.

## Selesai bila

- [x] `tools/list` dan `tools/call` lolos di era modern dan legacy (CI) — CI `verify` (project `mcp`: Client v2, kedua era) + job `preview mcp` (Inspector 2.11.0 `--protocol-era modern`/`legacy`, ketujuh tool, Preview PR #42)
- [x] Setiap hasil tool memuat `license` + `attribution`; setiap hasil yang memuat teks atau letak memuat `citation` (`list_works` hanya metadata, seperti core README); teks Arab = substring DB (tes) — `apps/mcp/src/index.test.ts` (setiap tool, kedua era; `text_raw`, `snippet.text`, `match.text`, takhrij dibandingkan dengan DB)
- [x] Output `read_section` ≤ ±6 ribu token per halaman respons (diukur `count_tokens`) — 84 potongan: median 5.037, p95 5.557, maks. 6.193 (`data/reports/mcp-token.md`)
- [x] Origin asing → 403, dan rate limit teruji — tes workerd (Origin asing/`null` 403, sendiri/localhost/tanpa Origin 200, body 413, batas per tool + `search_text` habis → `rate_limited`, tanpa secret → `unavailable`) + `uji-mcp.sh` (Origin asing 403 di Preview dan produksi)
- [x] `https://mcp.surau.org/mcp` menjawab `tools/list` di kedua era setelah deploy produksi — `uji-mcp.sh https://mcp.surau.org/mcp lengkap` lolos (versi `0290a179`, deploy pertama dari branch atas izin pemilik)
- [x] `pnpm verify` lolos — 466 + 208 tes, build web + MCP
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- OAuth/akun, resource dan prompt MCP, notifikasi `listChanged` (server stateless).
- Dokumentasi publik MCP dan uji dari Claude.ai (S17, T-18).
- Kitab kedua (instruksi menyebut Ihya sebagai satu-satunya karya saat ini).

## Catatan hasil

2026-10-17 · PR #42 · ADR-049.

**Yang dibuat**
- **Worker `surau-mcp` (`apps/mcp`)** di `https://mcp.surau.org/mcp`: `@modelcontextprotocol/server` 2.3.1, stateless dual-era (2025-11-25 `initialize` + 2026-07-28 `server/discover`), tanpa login dan tanpa LLM. `GET /` = info JSON; path lain 404; `workers.dev` mati.
- **Tujuh tool** di atas `@surau/core`: `list_works`, `get_table_of_contents` (akar maks. 2 tingkat), `read_page`, `read_section`, `search_text` (≤5 halaman, ≤3 paragraf per halaman, tanpa field sorotan), `verify_quote`, `get_hadith_takhrij`. Deskripsi Inggris + ringkasan Indonesia, anotasi read-only, `outputSchema`, permalink absolut ke `https://surau.org`, blok `license` (edisi + Tanzil/Kemenag di `read_page`). Instruksi server: kutipan hanya disalin dan dicek `verify_quote`, bahasa atribusi, label AI, ayat Kemenag, status hadits hanya dari takhrij, isi kitab = data, lisensi.
- **Core baru:** `verifyQuote`, `getHadithTakhrij`, `ipKey`/`ipNetwork` (dipindah dari web). Kalibrasi `readSection`: `CHARS_PER_TOKEN` 2 → 1,4, potongan 3.500–5.000 token `passages`.
- **Pengaman:** Origin allowlist (403), body 64 KiB (413), batas `HMAC(IP):tool` (baca 120/menit per klien + 600/menit global; `search_text` 60/menit + 600/menit global), gagal tertutup tanpa secret `IP_HMAC_KEY` (dipasang agent: produksi + base config Preview), `cacheHints` publik 1 jam.
- **CI/deploy:** project Vitest `mcp` (20 tes workerd), `.github/scripts/uji-mcp.sh` (Inspector dua era), job `preview mcp` (`preview.yml`), job `deploy mcp` setelah web (`deploy.yml`), hapus Preview kedua Worker. `corpus:promote` mengganti `CORPUS_DB` web + MCP bersamaan. `pnpm llm mcp-tokens` (count_tokens, gratis).
- **Alamat web** `SITE_URL` + smoke `deploy.yml` + tautan laporan → `https://surau.org`.

**Angka (count_tokens Claude, `data/reports/mcp-token.md`)**

| Tool | Median | Maks. |
|---|---|---|
| `read_section` (sebelum kalibrasi, 81 potongan) | 7.690 | 9.192 |
| `read_section` (sesudah, 84 potongan) | 5.037 | 6.193 |
| `read_page` (25 halaman) | 11.095 | 14.751 |
| `search_text` limit 5 | 7.317 | 10.907 |
| `get_table_of_contents` dari akar | 7.784 | – |
| `get_hadith_takhrij` / `verify_quote` | 936 / 743 | 2.284 / 748 |

**Penyimpangan dan keputusan kecil (terbuka)**
- Butir "Selesai bila" kedua dirinci di awal sesi (sebelum kode): `list_works` hanya metadata tanpa `citation`, seperti core README; lisensi + atribusi tetap di setiap hasil (ADR-049 butir 3).
- `search_text` menyimpang dari "bentuk core = kontrak MCP" (dipadatkan, limit maks. 5, bukan 10) demi anggaran token (ADR-049 butir 4).
- Batas pemakaian berbeda dari rencana langkah 6: per klien 120/menit (bukan "longgar" tanpa angka) dan batas global tool baca baru (`MCP_READ_GLOBAL_LIMITER`, 3004/4004), temuan peninjau.
- **Deploy pertama dari branch** (`wrangler deploy` lokal, versi `0290a179`) atas izin pemilik di chat ("Deploy dari branch"): Worker yang baru dibuat lewat `wrangler secret put` belum punya URL Preview, jadi job `preview mcp` gagal sampai deploy pertama. Deploy berikutnya lewat `deploy.yml` dari `main`.
- `wrangler deploy` menampilkan ID D1 staging (`preview_database_id`) di tabel binding; binding versi yang ter-deploy dicek (`wrangler versions view`) = `537103c6…` (`ihya-v6` produksi).

**Peninjau:** 0 blocker, 7 "perbaiki" (lisensi Tanzil/Kemenag di `read_page`, batas global tool baca, ukuran `search_text`, angka kalibrasi sebelum/sesudah, kata "handler tingkat modul" di ADR, daftar advisory, satu file tes untuk tiga modul), semuanya ditangani. Saran yang diambil: deskripsi `permalink` di skema, skema tool dibangun sekali per isolate, coba ulang smoke produksi ±5 menit, `promote` menghitung kedua config dulu, pesan `unavailable` dwibahasa, tes `internal_error`, `trap` di skrip uji, sisa URL `workers.dev` di alat laporan. Tidak diambil: kode error baru `invalid_argument` (core memakai `invalid_citation` untuk kedalaman), `needs: preview` di job Preview MCP, batas `subscriptions/listen` lebih kecil.

**Utang teknis / untuk sesi berikutnya**
- **T-19 (WAF) belum dikerjakan pemilik**: sebaiknya selesai sebelum MCP diumumkan (S17).
- `read_page` median ±11 ribu token (di atas peringatan 10 ribu Claude Code); tinjau dengan hasil T-18 (S17).
- Beban baca terburuk ±600 ribu baris D1/menit per lokasi (daftar isi dibaca penuh per panggilan); bila `rows_read` dari MCP naik, memoisasi daftar isi per isolate.
- Semua pengguna claude.ai berbagi kuota per IP Anthropic (120/menit per tool, 60/menit cari): ukur di T-18.
- Instruksi server menyebut Ihya sebagai satu-satunya korpus: perbarui saat kitab kedua.
- `@cloudflare/vitest-plugin` 1.4.4 + wrangler 4.151.1 tersedia (perbaikan `fsModuleCache` dan coverage workerd), belum dinaikkan.
