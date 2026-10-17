# @surau/llm

Pembungkus tipis Anthropic untuk Surau (S13, ADR-013). TypeScript murni tanpa `node:*` atau `cloudflare:*`: kunci API selalu diberikan pemanggil (skrip lokal membacanya dari `.env`, Worker dari secret di S19). Dipakai `tools/ingest/src/llm` (batch terjemahan dan ringkasan) dan nanti pipeline Jawab.

## Isi

| Modul | Isi |
|---|---|
| `src/client.ts` | `MODELS` (`claude-haiku-5-5`, ulangan refusal `claude-sonnet-5-5`), `createAnthropic(apiKey)` (OpenTelemetry SDK dimatikan), `MAX_PROMPT_TOKENS` = 100k |
| `src/custom-id.ts` | `custom_id` Message Batches: `passage-<id>`, `toc-<id>-<lang>`, `toc-<id>-<lang>-p<k>` (potongan), `toc-<id>-<lang>-r2` (putaran 2); pola `^[a-zA-Z0-9_-]{1,64}$` dan `parseCustomId` |
| `src/translate.ts` | `buildTranslateRequest` (prompt `translate-passage@3` sejak X02; v2 = batch S13) dan `checkTranslation`: placeholder ayat sama persis, penanda catatan kaki ada (angka Latin dikembalikan ke angka Arab), tanpa teks Arab ≥3 kata, rasio panjang 0,8–8, tanpa Markdown/pembuka |
| `src/summarize.ts` | `buildSummaryRequest` (putaran 1, teks Arab bertanda), `buildSummaryRound2Request` (dari ringkasan subbagian), `checkSummary` (panjang, bahasa, tanpa placeholder/rujukan QS, tanpa teks Arab) |
| `src/pricing.ts` | Harga Haiku/Sonnet 5.5 (dicek 2026-10-17), tarif Haiku >100k token, diskon batch 50%, tulis cache 5 menit/1 jam |
| `src/response.ts` | `messageText` (blok `text` saja; Haiku 5.5 bisa mulai dengan blok `thinking`), `stopProblem` (`refusal`, `max_tokens`, tanpa teks) |
| `prompts/` | Prompt berversi: `translate-passage-v{1,2}.ts`, `summarize-section-v{1,2}.ts`, `glossary-v1.ts` |

## Aturan request (ADR-013)

- `output_config.effort: "low"` eksplisit; thinking adaptif bawaan (tanpa `budget_tokens`); tanpa `temperature`/`top_p`/`top_k`; tanpa prefill.
- Prompt sistem satu blok dengan `cache_control: { type: "ephemeral", ttl: "1h" }`: prefix yang sama untuk semua request batch (glosarium termasuk, ±4.300 token untuk terjemahan).
- Teks kitab dibungkus tag (`<teks>`, `<sebelumnya>`, `<bagian>`) dan dinyatakan sebagai data, bukan instruksi.
- Ayat tidak pernah dikirim: kutipan ayat diganti `⟦QS s:a⟧` oleh `maskAyat` (@surau/core) sebelum request dibuat.

## Mengubah prompt

Jangan sunting file prompt yang sudah dipakai. Buat file versi baru (`…-v3.ts`, `id` naik), arahkan `TRANSLATE_PROMPT`/`SUMMARY_PROMPT` ke sana, lalu jalankan uji kecil (`pnpm llm sample`) sebelum batch. Setiap keluaran menyimpan `prompt_version` dan `model`.
