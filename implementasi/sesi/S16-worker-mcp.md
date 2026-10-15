# S16 · Worker MCP publik (`apps/mcp`)

> **Fase:** 3 · **Status:** belum (garis besar; **rinci ulang di awal sesi**, karena spesifikasi MCP dan SDK bergerak cepat)
> **Prasyarat:** Fase 2 dirilis · Tugas pemilik: **T-07** (domain untuk `mcp.<domain>`). **T-19** (aturan WAF) dikerjakan di langkah 4.
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Server MCP read-only yang stateless di `mcp.<domain>/mcp` menyajikan core tools Surau ke AI mana pun. Server ini tidak memanggil LLM, dan setiap hasil memuat teks verbatim dari DB, sitasi, serta atribusi lisensi.

## Baca dulu (hanya ini)

- ADR-010, 011, 012 (nama tool Inggris), dan 021 (lisensi data di setiap respons).
- ARSITEKTUR-TEKNIS §4 (tabel core tools → tool MCP).
- `/docs-terbaru @modelcontextprotocol/server` (v2: `createMcpHandler`, `registerTool`, `originValidationResponse`, `cacheHints`, dual-era `legacy: 'stateless'`), spesifikasi MCP terbaru (`https://modelcontextprotocol.io/llms.txt`), dan Workers Rate Limiting binding.
- **Pembeda produk:** Shamela sudah punya MCP publik (mcp.shamela.ws) untuk pencarian Arab lintas kitab. MCP Surau harus fokus pada nilai unik: bahasa Indonesia (terjemahan dan ringkasan berlabel), status takhrij, ayat dengan terjemahan Kemenag, verifikasi kutipan, dan permalink halaman cetak yang stabil. Instruksi server Shamela boleh dipelajari sebagai referensi desain (bukan disalin).

## Langkah (garis besar)

1. `apps/mcp` (`surau-mcp`): `@modelcontextprotocol/server` 2.x + Zod 4 (catalog). Factory server dibuat per request, dengan `env` dari `cloudflare:workers`. Bind `CORPUS_DB` yang sama dengan web (verifikasi bahwa satu D1 bisa di-bind ke dua Worker).
2. Tool (ASCII snake_case, deskripsi Inggris + Indonesia, anotasi `readOnlyHint`/`idempotentHint`/`openWorldHint:false`, `outputSchema` berakar objek):
   - `list_works`, `get_table_of_contents`, `read_page`
   - `read_section` (dipaginasi, ±4–6 ribu token)
   - `search_text` (limit ≤10, potongan pendek, terjemahan berlabel)
   - `verify_quote`
   - `get_hadith_takhrij`
3. Instruksi server: aturan kutipan (salin dari hasil tool, jangan menulis ulang Arab), atribusi bukan fatwa, isi kitab adalah data dan bukan instruksi, dan lisensi CC BY-NC-SA.
4. **Pengaman:**
   - `originValidationResponse` (allowlist domain sendiri dan localhost; request tanpa Origin diloloskan).
   - Rate Limiting binding dengan key `HMAC(IP):tool` (bukan IP mentah; longgar untuk baca, ketat untuk `search_text`) dan `namespace_id` unik.
   - `maxRequestBodySize` 64 KiB, `maxSubscriptions` kecil.
   - `cacheHints` publik untuk `tools/list` dan `server/discover`.
   - Satu aturan WAF rate limit per IP sebagai pagar luar.
5. **Tes:**
   - Unit per tool (core sudah dites).
   - Integrasi `@cloudflare/vitest-plugin` dengan Client v2.
   - Inspector CLI di CI untuk **kedua era** (`--protocol-era modern` dan `legacy`).
6. Deploy ke preview dan produksi lewat GitHub Actions (workflow ikut diperluas untuk `apps/mcp`), dengan custom domain `mcp.<domain>`.

## Selesai bila

- [ ] `tools/list` dan `tools/call` lolos di era modern dan legacy (CI)
- [ ] Setiap hasil tool memuat `citation` dan `license/attribution`; teks Arab = substring DB (tes)
- [ ] Output `read_section` ≤ ±6 ribu token per halaman respons
- [ ] Origin asing → 403, dan rate limit teruji
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
