# @surau/api · Worker Jawab `surau-api`

Worker Hono (S19–S20, [ADR-010](../../implementasi/KEPUTUSAN.md), [ADR-064](../../implementasi/KEPUTUSAN.md), [ADR-065](../../implementasi/KEPUTUSAN.md)) yang menjalankan pipeline Jawab `runJawab` dari `@surau/llm`: routing Haiku atas daftar isi → kandidat `searchText` → jawaban Haiku + Citations → setiap kutipan dipetakan ke ID paragraf + offset dan diverifikasi ke DB → hasil, atau turun ke Cari. Sejak S20 semua **pengaman biaya** ada di sini: cookie anon + Turnstile, burst, kuota harian, ledger anggaran, dan cron.

**Tanpa alamat publik:** tidak ada route, `workers_dev: false`, `preview_urls: false`. Satu-satunya pintu adalah service binding `API` milik `surau-web` (`/api/jawab`, produksi **mati** sampai `/rilis 4`). Web meneruskan nilai cookie `surau_anon` sebagai header `x-surau-anon` dan IP klien sebagai `x-surau-ip` (header internal; tidak bisa dipalsukan dari internet karena Worker ini tanpa alamat publik).

## Endpoint

| Endpoint | Isi |
|---|---|
| `GET /health` | `{ ok, environment }` |
| `GET /jawab/status` | `{ available, reason, challenge, sitekey, quota }` untuk UI, tanpa biaya LLM. `reason`: `disabled`, `not_configured`, `budget`, `quota`; `challenge: true` = belum punya cookie anon sah (UI menyiapkan Turnstile) |
| `POST /jawab` | Body JSON `{ "question": "…", "turnstile"?: "<token>" }` (skema bersama `jawabRequest`, `@surau/core`; 3–1.000 karakter, ≤8 KB). Respons SSE, atau JSON 4xx/503 sebelum stream |

Penolakan sebelum stream (urutan guard): 415 (bukan JSON), 413 (terlalu besar), 400 (`invalid`), 503 `disabled` (`settings.jawab_enabled` = 0), 503 `not_configured` (secret/konfigurasi belum lengkap; kunci uji Turnstile di produksi juga), 401 `challenge_required` + `sitekey` (tanpa cookie anon sah dan tanpa token), 403 `challenge_failed`, 503 `challenge_unavailable` (siteverify mati atau secret salah), 429 `rate_limited` (burst 3/60 dtk per anon-id), 429 `quota_exceeded` + `scope` (`anon`/`ip`), 503 `budget` (anggaran bulan ini habis). Token Turnstile sah → `Set-Cookie: surau_anon=…; Max-Age=86400; Path=/api/jawab; HttpOnly; Secure; SameSite=Strict`.

Event SSE (`data` = JSON):

| Event | Isi |
|---|---|
| `stage` | `{ stage }`: `route`, `retrieve`, `answer`, `retry` (ulang Sonnet), `verify` |
| `block` | Pratinjau satu blok jawaban yang sitasinya sudah terverifikasi + sitasinya. Ditahan sampai sitasi pertama lolos |
| `reset` | Buang pratinjau (Haiku menolak, Sonnet mengulang) |
| `done` | `{ result, cached }`: hasil akhir `answer` atau `not_found`. **UI wajib memakai ini**, bukan pratinjau |
| `fallback` | `{ result }`: turun ke Cari (`reason`: `unverified`, `refusal`, `provider_error`, `budget` = anggaran tidak cukup untuk ulangan Sonnet, `cancelled` = klien sudah pergi sebelum panggilan berikutnya); `result.search` = paragraf hasil Cari |
| `error` | `{ error: "internal" }`, tanpa pesan internal |

`result`: `outcome`, `reason` (`false_premise` untuk premis keliru), `text` (Latin saja), `blocks` (teks + nomor sitasi), `citations` (`n`, `passage_id`, `char_start`, `char_end`, `kind`, `label`, `permalink`), `hadith` (status `ai_extracted` dari takhrij yang disitasi), `search`, `model`, `prompt_version`, `corpus_version`. **Teks Arab tidak pernah ada di hasil:** UI mengambilnya dari DB lewat `passage_id` + offset (aturan teks-arab no. 1). Diagnostik, token, dan biaya tidak dikirim ke klien.

## Konfigurasi

| | Produksi `surau-api` | Staging `surau-api-staging` (`--env staging`) |
|---|---|---|
| `CORPUS_DB` | korpus produksi yang sama dengan web/MCP (diganti `corpus:promote`) | `surau-corpus-staging` |
| `APP_DB` | `surau-app` | `surau-app-staging` |
| Dipanggil oleh | web produksi (route mati sampai S20) | web **Preview** per PR (`previews.services`): service binding dari Preview selalu memanggil deployment produksi Worker tujuan |
| LLM | AI Gateway `surau-gw` (BYOK), `LLM_MODE = "gateway"` | sama |
| Turnstile | widget `Surau` (sitekey di `vars`, secret `TURNSTILE_SECRET_KEY`), cek `action` "jawab" + hostname `surau.org` | kunci **uji** resmi di `vars` (menerima token apa pun; ditolak bila `ENVIRONMENT = production`) |
| Burst | `JAWAB_BURST` 3/60 dtk (`namespace_id` 5001) | 6001 |
| Cron | `*/10 * * * *` | diwariskan (data staging) |

Secret (T-14): `CF_AIG_TOKEN`, `TURNSTILE_SECRET_KEY` (produksi saja), dan `SURAU_API_SECRET` (acak ≥32 karakter; sumber kunci HKDF untuk tanda tangan cookie, HMAC kunci cache, dan HMAC subjek kuota per hari; dipasang agent di kedua Worker 2026-10-21). Tanpa salah satunya: `not_configured`. `ANTHROPIC_API_KEY` hanya untuk `LLM_MODE = "direct"` (dev lokal), tidak dipasang di produksi.

Ledger (migrasi app 0004): sebelum LLM, reservasi atomik biaya terburuk routing + jawaban Haiku (±US$0,0162) di `llm_budget`/`llm_ledger` (mikro-USD, bulan UTC, plafon `settings.budget_monthly_usd`); ulangan Sonnet direservasi terpisah (±US$0,24). Biaya aktual dikomit sesudah pipeline; klien yang memutus koneksi tidak membatalkan panggilan LLM yang sedang berjalan (diselesaikan di latar lewat `waitUntil`, biaya nyata dikomit, hasil di-cache), tetapi panggilan baru tidak dimulai (`fallback/cancelled`). Galat penyedia tanpa status HTTP = biaya terburuk panggilan itu × 2 (`estimated`); galat tak terduga = reservasi dihitung terpakai. Cron: reservasi basi >10 menit → `expired`, periode bulan berjalan, peringatan 80% (event `jawab_budget_warning`), dan sekali per hari UTC (putaran pertama, diulang bila gagal; penanda `settings.purge_day`) hapus fisik data lewat masa simpan (P-7: cache/arsip kedaluwarsa, kuota >7 hari, laporan selesai >12 bulan, ledger >24 bulan). Log otomatis per permintaan dimatikan (`invocation_logs: false`) karena merekam header termasuk IP.

Cache: tabel `answer_cache` di DB app (migrasi 0003), kunci **HMAC** (sejak S20; dulu SHA-256) versi korpus (+ `built_at`) + versi prompt + pertanyaan dirapikan, **tanpa teks pertanyaan**, 30 hari (P-7); hanya hasil utuh (bukan terpotong `max_tokens`). Jawaban dari cache tetap memakai kuota, tetapi tanpa reservasi biaya. Log Worker: satu event `jawab` per pertanyaan berisi metrik (outcome termasuk `rejected` + alasan guard, `client_gone`, token, biaya, sitasi, refusal), tanpa pertanyaan, kueri routing, jawaban, IP, ID anon, atau token.

Kalimat "Status hadits: …" tanpa takhrij tersitasi diganti "belum diketahui"; sejak awalan itu muncul, blok sesudahnya tidak dipratinjau (isi akhir lewat `done`). Deteksinya masih awalan persis; variasi penulisan dan beberapa kasus tepi belum tertangani (ADR-064 butir 7, wajib sebelum S21). Kunci cache juga memuat `JAWAB_PIPELINE_VERSION`. `surau-api-staging` di-deploy `deploy.yml` dari `main`: Preview sebuah PR memanggil kode API versi main, bukan kode API PR itu.

## Perintah

```bash
pnpm --filter @surau/api dev                 # wrangler dev port 3007, D1 lokal bersama; kunci uji Turnstile + secret HMAC dev lewat --var
pnpm exec vp test --project api              # tes workerd + Anthropic tiruan (tanpa jaringan)
pnpm --filter @surau/api build               # dry-run bundel
pnpm run jawab:gateway-check [--confirm]     # uji passthrough gateway (berbayar ±US$0,01 dengan --confirm)
pnpm run eval:jawab answer --run NAMA --budget-usd 0.5 --confirm   # eval berbayar, izin pemilik
```

Dev lokal: jalankan `pnpm --filter @surau/api dev` dan `pnpm dev` bersamaan. Binding `API` milik `next dev` tersambung ke Worker lokal lewat dev registry wrangler. Skrip `dev` memasang `ENVIRONMENT=development`, kunci **uji** Turnstile, dan `SURAU_API_SECRET` khusus dev lewat `--var` (bukan rahasia), jadi yang perlu ada di `apps/api/.dev.vars` (git-ignored) hanya kredensial LLM: `CF_AIG_TOKEN`, atau `LLM_MODE=direct` + kunci uji sendiri. Migrasi app lokal: `pnpm run db:migrate:local`. Deploy: otomatis lewat `deploy.yml` (job `deploy-api`, sebelum web).
