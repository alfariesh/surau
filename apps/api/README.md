# @surau/api · Worker Jawab `surau-api`

Worker Hono (S19, [ADR-010](../../implementasi/KEPUTUSAN.md), [ADR-064](../../implementasi/KEPUTUSAN.md)) yang menjalankan pipeline Jawab `runJawab` dari `@surau/llm`: routing Haiku atas daftar isi → kandidat `searchText` → jawaban Haiku + Citations → setiap kutipan dipetakan ke ID paragraf + offset dan diverifikasi ke DB → hasil, atau turun ke Cari.

**Tanpa alamat publik:** tidak ada route, `workers_dev: false`, `preview_urls: false`. Satu-satunya pintu adalah service binding `API` milik `surau-web` (`POST /api/jawab`, produksi **mati** sampai guard biaya S20).

## Endpoint

| Endpoint | Isi |
|---|---|
| `GET /health` | `{ ok, environment }` |
| `POST /jawab` | Body JSON `{ "question": "…" }` (3–1.000 karakter, ≤8 KB). Respons SSE, atau JSON 4xx/503 sebelum stream |

Penolakan sebelum stream: 415 (bukan JSON), 413 (terlalu besar), 400 (`invalid`), 503 `disabled` (`settings.jawab_enabled` = 0 di DB app), 503 `not_configured` (secret belum dipasang).

Event SSE (`data` = JSON):

| Event | Isi |
|---|---|
| `stage` | `{ stage }`: `route`, `retrieve`, `answer`, `retry` (ulang Sonnet), `verify` |
| `block` | Pratinjau satu blok jawaban yang sitasinya sudah terverifikasi + sitasinya. Ditahan sampai sitasi pertama lolos |
| `reset` | Buang pratinjau (Haiku menolak, Sonnet mengulang) |
| `done` | `{ result, cached }`: hasil akhir `answer` atau `not_found`. **UI wajib memakai ini**, bukan pratinjau |
| `fallback` | `{ result }`: turun ke Cari (`reason`: `unverified`, `refusal`, `provider_error`); `result.search` = paragraf hasil Cari |
| `error` | `{ error: "internal" }`, tanpa pesan internal |

`result`: `outcome`, `reason` (`false_premise` untuk premis keliru), `text` (Latin saja), `blocks` (teks + nomor sitasi), `citations` (`n`, `passage_id`, `char_start`, `char_end`, `kind`, `label`, `permalink`), `hadith` (status `ai_extracted` dari takhrij yang disitasi), `search`, `model`, `prompt_version`, `corpus_version`. **Teks Arab tidak pernah ada di hasil:** UI mengambilnya dari DB lewat `passage_id` + offset (aturan teks-arab no. 1). Diagnostik, token, dan biaya tidak dikirim ke klien.

## Konfigurasi

| | Produksi `surau-api` | Staging `surau-api-staging` (`--env staging`) |
|---|---|---|
| `CORPUS_DB` | korpus produksi yang sama dengan web/MCP (diganti `corpus:promote`) | `surau-corpus-staging` |
| `APP_DB` | `surau-app` | `surau-app-staging` |
| Dipanggil oleh | web produksi (route mati sampai S20) | web **Preview** per PR (`previews.services`): service binding dari Preview selalu memanggil deployment produksi Worker tujuan |
| LLM | AI Gateway `surau-gw` (BYOK), `LLM_MODE = "gateway"` | sama |

Secret (dipasang pemilik, T-14): `CF_AIG_TOKEN` untuk kedua Worker. `ANTHROPIC_API_KEY` hanya untuk `LLM_MODE = "direct"` (dev lokal), tidak dipasang di produksi.

Cache: tabel `answer_cache` di DB app (migrasi 0003), kunci SHA-256 versi korpus (+ `built_at`) + versi prompt + pertanyaan dirapikan, **tanpa teks pertanyaan**, usulan 30 hari (P-7); hanya hasil utuh (bukan terpotong `max_tokens`). Log Worker: satu event `jawab` per pertanyaan berisi metrik (outcome termasuk `aborted`, token, biaya, sitasi, refusal), tanpa pertanyaan, kueri routing, atau jawaban.

Kalimat "Status hadits: …" tanpa takhrij tersitasi diganti "belum diketahui" dan tidak dipratinjau. `surau-api-staging` di-deploy `deploy.yml` dari `main`: Preview sebuah PR memanggil kode API versi main, bukan kode API PR itu.

## Perintah

```bash
pnpm --filter @surau/api dev                 # wrangler dev port 3007, D1 lokal bersama (.wrangler/state)
pnpm exec vp test --project api              # tes workerd + Anthropic tiruan (tanpa jaringan)
pnpm --filter @surau/api build               # dry-run bundel
pnpm run jawab:gateway-check [--confirm]     # uji passthrough gateway (berbayar ±US$0,01 dengan --confirm)
pnpm run eval:jawab answer --run NAMA --budget-usd 0.5 --confirm   # eval berbayar, izin pemilik
```

Dev lokal: jalankan `pnpm --filter @surau/api dev` dan `pnpm dev` bersamaan. Binding `API` milik `next dev` tersambung ke Worker lokal lewat dev registry wrangler. Untuk mode langsung, buat `apps/api/.dev.vars` berisi `LLM_MODE=direct` dan kunci uji sendiri (git-ignored). Deploy: otomatis lewat `deploy.yml` (job `deploy-api`, sebelum web).
