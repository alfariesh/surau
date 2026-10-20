# S19 · Pipeline Jawab (`packages/llm` + `apps/api`)

> **Fase:** 4 · **Status:** selesai (2026-10-20; PR #98, ADR-064)
> **Prasyarat:** teknis S18 selesai; T-24 manusia ditunda dan tidak menghambat pengembangan atas arahan pemilik (ADR-054), bukan kelulusan gerbang R4 · Tugas pemilik: T-11, dan bagian AI Gateway dari T-14 (kunci Anthropic di Provider Keys/BYOK, token gateway sebagai Worker secret)
> **Perkiraan:** 2 percakapan agent

## Tujuan

Satu panggilan LLM per pertanyaan: Haiku 5.5 memilih bagian dan menjawab dengan Citations. Kode memetakan dan memverifikasi setiap kutipan, dan teks Arab diambil dari DB. Refusal dan kegagalan turun dengan anggun ke mode Cari.

## Baca dulu

- **Skill `claude-api`** (wajib), ADR-013 (semua aturan Haiku 5.5), ADR-010 (`surau-api`), ARSITEKTUR-TEKNIS §5 (alur Jawab), dan [docs/05](../../docs/05-kebijakan.md) (atribusi, menolak menjawab).
- `/docs-terbaru` untuk Citations (*custom content documents*), prompt caching, streaming, AI Gateway provider Anthropic, dan Hono.

## Langkah (garis besar)

1. **Uji passthrough AI Gateway (mode BYOK) lebih dulu.** Skrip yang mengirim request identik (dokumen + `citations.enabled` + `cache_control` + stream) langsung ke `api.anthropic.com` dan lewat gateway, lalu membandingkan blok citations, `usage.cache_*`, dan event SSE. Pastikan juga spend limit gateway mengenali harga `claude-haiku-5-5`. Hasilnya masuk ke ADR. Bila gagal, panggil langsung, dengan kunci sebagai Worker secret.
2. **`packages/llm`:**
   - Prompt `answer@1` (bahasa atribusi, larangan fatwa, "tidak ditemukan", dan kutipan hanya lewat sitasi).
   - Prefix yang di-cache: sistem + daftar isi Ihya (±6–10k token).
   - Dokumen *custom content* dengan satu blok per paragraf beserta ID.
   - `effort: low`, tanpa parameter sampling, dan batas prompt ±40k token (`count_tokens`).
3. **Alur di `apps/api` (Hono, tanpa route publik; dipanggil web lewat service binding dari route handler `/api/jawab`, ADR-010):**
   - Kandidat = pilihan bagian dari daftar isi oleh Haiku (panggilan routing murah, atau digabung) ditambah BM25 `searchText`.
   - Panggil jawaban dan stream SSE ke klien.
   - Petakan `content_block_location` ke `passage_id`, lalu jalankan `verifyQuote`. Sitasi yang gagal dibuang dan dicatat. Bila **semua** sitasi gagal, jawaban tidak ditampilkan dan diganti hasil Cari (ARSITEKTUR-TEKNIS §5 butir 7).
   - Simpan ke `answer_log` dan `answer_cache`.
4. **Refusal** (`stop_reason: "refusal"`, tanpa fallback server untuk Haiku): ulangi sekali dengan `claude-sonnet-5-5` (boleh `fallbacks: "default"` di Sonnet sesuai skill), atau tampilkan hasil Cari. Catat kategorinya.
5. **Eval:** jalankan `pnpm run eval:jawab` (berbayar, dengan izin). Iterasi prompt (versi naik) sampai mendekati target docs/06. Catat biaya per jawaban.

## Langkah (rinci, 2026-10-20)

Izin pemilik di chat (2026-10-20): biaya LLM sesi ini **maksimal US$3**, termasuk satu kali jalan 18 soal holdout di akhir (pertanyaannya terkirim ke Anthropic, dinilai kode saja, tanpa judge). Gateway `surau-gw` (T-14) dibuat pemilik: authenticated, log mati, cache mati, retry mati, rate limit 50/menit, spend limit US$1/hari, BYOK wajib (Require Provider Credentials). Docs dicek 2026-10-20: AI Gateway (Anthropic/BYOK/auth/spend limit/custom cost), Hono 4.13.13 + `streamSSE`, service binding + Previews, Citations *custom content* (indeks blok 0-based, akhir eksklusif; `citations_delta` saat streaming; tidak bisa bersama `output_config.format`), Haiku 5.5 (thinking adaptif bawaan, effort bawaan `medium`, refusal tanpa fallback server).

1. **Uji passthrough** `pnpm run jawab:gateway-check` (`tools/eval`): request identik langsung vs gateway (dokumen *custom content* bercitations + `cache_control` 1 jam + stream, dua kali untuk melihat baca cache) dan satu request routing berformat JSON (`output_config.format`). Bandingkan urutan event SSE, bentuk `content_block_location`, `usage.cache_*`, `stop_reason`, header gateway. Klien gateway: `x-api-key` dihapus (null), token di `cf-aig-authorization`, `cf-aig-collect-log-payload: false`, `cf-aig-metadata`. Biaya < US$0,02. Hasil + angka spend limit (dashboard, dibaca pemilik bila perlu) → ADR.
2. **`packages/core`:** `answerPassages(db, ids)` (paragraf + lokasi + terjemahan AI berlabel + catatan kaki tertaut) supaya pipeline tetap lewat core; repo `getPassagesByIds` di `packages/db`.
3. **`packages/llm/src/jawab/`** (tanpa `node:*`/`cloudflare:*`):
   - Prompt berversi `answer-route@1` (sistem + daftar isi Ihya ber-ID, di-cache 1 jam; keluaran JSON: bagian ≤4, kueri pencarian ≤4, tanda hadits) dan `answer@1` (atribusi, bukan fatwa, tanpa teks Arab, kalimat baku "Tidak ditemukan di kitab yang dicakup.", status hadits hanya dari dokumen takhrij dengan baris `Status hadits:`, ayat tidak diterjemahkan).
   - Dokumen: satu dokumen *custom content* per paragraf (judul = lokasi, `context` = jenis + bagian + terjemahan AI berlabel); paragraf panjang dipecah per kalimat menjadi beberapa blok yang menutup teks persis (offset UTF-16). Catatan kaki takhrij yang tertaut ikut sebagai dokumen satu blok.
   - Kandidat: `searchText` atas pertanyaan + kueri router (global dan per bagian pilihan), digabung RRF, dipangkas ke anggaran token (estimasi terkalibrasi; batas keras 40k token prompt, dicatat dari `usage`).
   - Pemetaan sitasi: `content_block_location` → `{passage_id, char_start, char_end}` → `resolveEvalSource`/`verifyQuote`. Blok teks yang semua sitasinya gagal dibuang; teks Arab buatan model dihapus dan dicatat; nol sitasi lolos (dan bukan penolakan) → `unverified` + hasil Cari.
   - Refusal Haiku → ulang sekali dengan Sonnet 5.5 (tanpa `fallbacks` server: biaya model cadangan tidak bisa direservasi ledger); gagal lagi → Cari. Error penyedia (400/401/429/5xx/timeout) → Cari. Kategori dicatat.
   - Event bertahap untuk SSE: `stage`, `block` (hanya blok terverifikasi, ditahan sampai sitasi pertama lolos), `done`, `fallback`.
4. **`apps/api` (Worker `surau-api`, Hono 4.13.13):** `POST /jawab` (SSE, validasi Zod sebelum stream, heartbeat), `GET /health`; `workers_dev: false`, `preview_urls: false`, tanpa route. Cek `settings.jawab_enabled` (0 → `fallback`). Cache `answer_cache` (migrasi app 0003, kunci hash pertanyaan ternormalisasi + versi korpus + versi prompt, tanpa teks pertanyaan). Log `console.info` event `jawab` tanpa teks pertanyaan. Worker kedua `surau-api-staging` (env `staging`: korpus/app staging) untuk Preview web. Tes Workers dengan `fetch` Anthropic tiruan.
5. **`apps/web`:** route handler `POST /api/jawab` → `env.API.fetch` (Request baru, Origin sama, batas body, rate limit per klien), `JAWAB_ROUTE_ENABLED` "0" di produksi dan "1" di Preview; `previews.services` API → `surau-api-staging`. Deploy: `surau-api` sebelum web.
6. **Eval** `pnpm run eval:jawab answer --run … --budget-usd … --confirm`: pipeline yang sama atas D1 lokal, klien langsung (`.env`) atau gateway; pagu dicek sebelum setiap soal (biaya terburuk soal berikutnya). Iterasi prompt hanya dengan 42 soal publik; judge Sonnet (batch) hanya publik; holdout sekali di akhir. Laporan agregat di `evals/reports/`.

## Selesai bila

- [x] ADR hasil uji passthrough AI Gateway tertulis
- [x] Catatan: service binding dari web **preview** memanggil `surau-api` **produksi**; uji end-to-end memakai Worker `surau-api-staging` atau dicatat keterbatasannya
- [x] Validitas kutipan 100% di eval; metrik lain dicatat terhadap target R4
- [x] Refusal dan error penyedia teruji (tes dengan mock), dengan degradasi ke Cari
- [x] Biaya rata-rata per jawaban tercatat (target ±$0,002–0,003, [docs/08](../../docs/08-biaya.md))
- [x] STATUS, LOG, dan file sesi ini diperbarui
- [x] `pnpm verify` lolos; peninjau tanpa temuan blocker
- [x] Teks Arab tidak pernah berasal dari model: tes membuktikan kutipan hanya dari DB (ID + offset) dan teks Arab buatan model dibuang
- [x] Produksi tidak bisa memicu biaya LLM sebelum S20: `/api/jawab` produksi mati dan `jawab_enabled` produksi tetap `0` (dibuktikan dengan request)

## Di luar cakupan

- Turnstile, kuota harian, ledger/reservasi anggaran, `/admin` (S20). UI `/tanya` (S21).
- Menyimpan pertanyaan pengguna umum ke `answer_log` (butuh penyamaran PII + P-7, S20); S19 hanya menyimpan arsip eval dan cache tanpa teks pertanyaan.
- Gerbang R4 dan persetujuan ustadz (T-24, ADR-054).

## Catatan hasil

- **Dibuat:** pipeline `packages/llm/src/jawab` (routing `answer-route@2` atas daftar isi ter-cache → kandidat `searchText` RRF + pasangan takhrij → jawaban `answer@5` dengan Citations *custom content* → pemetaan blok ke `{passage_id, char_start, char_end}` + `cited_text` = DB + `verifyQuote` → hasil atau Cari); `core.answerPassages/answerToc`; repo `getPassagesByIds`, `getFootnoteRefsTo`; migrasi app 0003 `answer_cache`; Worker `surau-api` + `surau-api-staging` (Hono 4.13.13, SSE, tanpa alamat publik); `POST /api/jawab` web (mati di produksi); klien AI Gateway BYOK; `pnpm run jawab:gateway-check`; `eval:jawab answer`; `corpus:promote` mencakup apps/api; `deploy.yml` job `deploy-api` (+ `deploy-api-staging` terpisah).
- **Bukti butir "Selesai bila":**
  - ADR passthrough: ADR-064 butir 1 (12/12 sama, biaya tercatat di Analytics gateway, dikonfirmasi pemilik).
  - Preview → produksi: web Preview memakai `previews.services` → `surau-api-staging`; uji ujung-ke-ujung `pr-98.surau.org/api/jawab` lolos (SSE bertahap, 7 sitasi, cache, `not_found`, status hadits). Keterbatasan: staging mengikuti `main` (ADR-064 butir 10).
  - Validitas kutipan 100% di setiap run (final-3: 159/159; holdout v4: 74/74); metrik R4 lain di tabel ADR-064 (lokasi 76,5%, penolakan 100%, kesetiaan judge 39–52% belum terkalibrasi).
  - Refusal/galat penyedia: tes Worker `apps/api/src/index.test.ts` (Haiku → Sonnet, dua kali refusal → Cari, 529/500 → Cari, unverified → Cari, abort).
  - Biaya rata-rata **US$0,0026/jawaban** (final-3 US$0,00259).
  - `pnpm verify` lolos (577 Node + 254 Workers sebelum perbaikan akhir; sesudahnya `pnpm test` 579 + 256, `pnpm check` bersih); peninjau tiga putaran; semua blocker (status hadits tanpa takhrij, prompt belum dieval, pratinjau status) diperbaiki dan dites, putaran 3 tanpa blocker (sisa celah tepi status hadits dicatat sebagai utang wajib sebelum S21).
  - Teks Arab: tes `stripArabic` (harakat ikut), tes Worker memeriksa `result.text` tanpa huruf Arab dan setiap sitasi = potongan DB.
  - Produksi: `jawab_enabled` `surau-app` = 0 dan `POST surau.org/api/jawab` = 404 (dicek dengan request, juga sesudah merge).
- **Biaya LLM:** ±US$1,51 dari izin ≤ US$3 (rincian di LOG); ±US$0,15 terbuang di run terputus/dihentikan.
- **Penyimpangan (ADR-064):** premis keliru memakai kalimat baku kedua; blok tanpa sitasi tetap tampil (S21 merender beda); pertanyaan umum belum disimpan ke `answer_log` (P-7/PII, S20); Sonnet tanpa `fallbacks` server.
- **Utang/pesan untuk sesi berikutnya:**
  - **Wajib sebelum S21 (aturan teks-arab no. 6):** deteksi status hadits toleran (regex untuk variasi "Status Hadits/hadis", titik dua di luar tebal), awalan + baris baru, singkatan ("HR.", "w.", "dkk."), ganti sampai akhir baris untuk status tak didukung, pemasangan paragraf dua hadits yang lebih ketat, `holdPreview` dari gabungan teks; lalu eval ulang (peninjau putaran 3, ADR-064 butir 7).
  - Lokasi (pencarian) dan kesetiaan judge jauh dari target R4: pencarian makna atau routing dua langkah, kalibrasi judge, metrik status hadits berlabel (sekarang cocok string persis → 0%).
  - S20: ledger + reservasi (termasuk Sonnet), Turnstile, kuota, HMAC kunci `answer_cache`, penyamaran PII, penghapusan fisik `answer_cache`/`answer_log`, skema Zod `/api/jawab` bersama.
  - Pemilik: secret `CF_AIG_TOKEN` untuk `surau-api` produksi (T-14).
  - Arsip eval S19 di `evals/private/jawab-runs/s19-*` belum disalin ke R2; D1 lokal bersama masih `ihya-v6` (eval memakai folder terpisah `SURAU_EVAL_STATE`).
