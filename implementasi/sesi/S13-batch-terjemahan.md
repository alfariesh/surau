# S13 · Batch terjemahan & ringkasan (Haiku 5.5)

> **Fase:** 2 · **Status:** selesai* (2026-10-17; QA 20 sampel T-17 tahap 2 menunggu pemilik)
> **Prasyarat:** S12 selesai · Tugas pemilik: **T-09** (drive), **T-11** (API Anthropic workspace `surau-dev`), plus **persetujuan biaya** di chat sebelum batch dikirim. **T-17** dikerjakan di langkah 5 dan 10.
> **Perkiraan:** 1–2 percakapan agent (ada waktu tunggu batch, biasanya < 24 jam)

## Tujuan

Setiap paragraf Ihya punya terjemahan Indonesia, dan setiap bagian daftar isi punya ringkasan Indonesia dan Inggris. Semuanya dibuat **sekali** lewat Message Batches (diskon 50%), disimpan dengan label AI, model, dan versi prompt. Ayat memakai terjemahan Kemenag (S12), bukan buatan LLM. Faktor token Arab yang sebenarnya diukur dan kalkulator biaya diperbarui.

## Baca dulu (hanya ini)

- **Muat skill `claude-api`** sebelum menulis kode Anthropic (wajib).
- ADR-013 (aturan Haiku 5.5) dan KONVENSI bagian *Prompt LLM*.
- [docs/08-biaya.md](../../docs/08-biaya.md) dan `scripts/hitung_biaya.py`.
- `/docs-terbaru @anthropic-ai/sdk` (Message Batches, `count_tokens`, prompt caching, `output_config.effort`).

## Langkah

1. Buat `packages/llm` (`@surau/llm`): klien tipis `@anthropic-ai/sdk`, membaca `ANTHROPIC_API_KEY` dari `.env` hanya di skrip lokal. Panggilan batch langsung ke `api.anthropic.com` (ADR-013).
2. **Ukur token Arab:** jalankan `messages.countTokens` (model `claude-haiku-5-5`) pada ±200 paragraf acak (gratis). Hitung rasio token Claude terhadap o200k (data riset: Ihya ±0,39 token/karakter di o200k). Perbarui `FAKTOR_TOKEN_ARAB` di `scripts/hitung_biaya.py`, jalankan kalkulator, dan perbarui tabel biaya di `docs/08`.
3. **Prompt berversi** di `packages/llm/prompts/`:
   - `translate-passage@1`: terjemahan Indonesia setia, istilah teknis dipertahankan dengan transliterasi, placeholder `⟦QS …⟧` **tidak diterjemahkan**, dan tanpa tambahan opini. Glosarium istilah ada di prefix yang di-cache (≥512 token).
   - `summarize-section@1`: ringkasan 3–6 kalimat dalam ID dan EN dengan bahasa atribusi ("al-Ghazali menjelaskan…").
   - Prompt sistem ditulis dalam bahasa Indonesia, jelas, dan tanpa huruf kapital berteriak.
4. **Parameter wajib:** `model: claude-haiku-5-5`, `output_config.effort: "low"`, tanpa `temperature`/`top_p`/`top_k`, tanpa prefill, `max_tokens` cukup untuk thinking dan keluaran, serta `cache_control` pada prefix bersama. Setiap request harus < 100k token (dicek dengan `count_tokens`). Bagian panjang dipecah.
5. **Uji kecil dulu:** 20 paragraf dan 5 bagian lewat API biasa. Periksa kualitas dengan pemilik, perbaiki prompt (naikkan versi), lalu hitung estimasi biaya penuh.
6. **Minta persetujuan biaya** di chat ("Batch penuh diperkirakan $X; lanjut?"). Setelah disetujui, kirim batch, poll, lalu baca hasil berdasarkan `custom_id` (urutannya acak).
   - `custom_id` wajib cocok `^[a-zA-Z0-9_-]{1,64}$` (aturan Message Batches): `passage-<id>`, `toc-<id>-<lang>`, dan `toc-<id>-<lang>-r2` untuk putaran 2. Validasi sebelum kirim, dan buat tes unit untuk pembuat ID.
   - **Ringkasan dua putaran:** putaran 1 meringkas simpul daun (bab/bayan; yang >100k token dipecah per halaman). Putaran 2 meringkas simpul induk (kitab, rub') dari ringkasan anaknya, karena satu rub' ±450 ribu token jauh di atas batas 100k.
7. **Validasi hasil:**
   - Tidak kosong dan rasio panjangnya wajar.
   - Placeholder ayat utuh, lalu diganti dengan terjemahan Kemenag.
   - Tanpa teks Arab panjang yang disalin (kecuali istilah).
   - Tangani `stop_reason: refusal`, `max_tokens`, dan `errored`/`expired` dengan retry terbatas atau tandai gagal. Bila terjadi refusal pada bab sensitif (jihad, hudud), ulangi dengan Sonnet 5.5 dan catat.
8. **Simpan** (placeholder ayat tetap di `translation.text`, lihat S12) ke `translation` dan `summary` lewat SQL ingest (versi korpus naik), dengan `model`, `prompt_version`, `created_at`, dan `review_status = 'ai_generated'` (himpunan status konten AI: `ai_generated` → `reviewed` → `ustadz_verified`, atau `rejected`). Simpan juga JSONL hasil mentah di `data/build/llm/` (git-ignored) untuk audit.
9. **Catat biaya aktual** dari `usage` (input, output, cache read/write, batch) di LOG dan `docs/08`, lalu bandingkan dengan estimasi.
10. **QA:** 20 terjemahan acak dinilai pemilik atau ustadz (Benar/Kurang/Salah). Skor dan contoh masalahnya dicatat. Bila Salah > 10%, perbaiki prompt dan ulangi untuk paragraf yang terdampak.

## Selesai bila

- [x] Faktor token Arab Claude terukur; kalkulator dan `docs/08` diperbarui — `pnpm llm tokens`: 0,716 token/karakter = **1,84× o200k** (200 paragraf, `data/reports/ihya-9472-token.md`); `FAKTOR_TOKEN_ARAB = 1.84` + model prompt sistem per request di `scripts/hitung_biaya.py`; tabel `docs/08` diperbarui
- [x] 100% paragraf badan teks punya terjemahan dan 100% bagian punya ringkasan ID+EN (atau daftar yang gagal tercatat < 1%) — `pnpm ingest ihya`: terjemahan **16.102/16.111 (99,94%)**, 9 gagal tercatat di `data/reports/ihya-9472-terjemahan.md` (0,06%); ringkasan **626/626** (313 bagian × ID+EN)
- [x] Tidak ada ayat yang diterjemahkan LLM (tes: semua bentang `passage_ayah_ref` di terjemahan diisi teks Kemenag) — invarian ingest "setiap kutipan ayat diisi terjemahan Kemenag": **0 bermasalah** (angka akhir di bawah; `translationSegments` merender setiap rujukan sebagai segmen Kemenag utuh); tes `test/llm-attach.test.ts`. **Catatan jujur:** tes ini sesuai definisinya hanya mencakup rujukan yang dikenali pencocok. Ayat yang luput dari pencocok (lafaz berulang tanpa pengantar, ejaan jauh berbeda, kutipan sangat pendek) bisa diterjemahkan model sebagai bagian kalimat; sisa risiko ini diterima dan dicatat di ADR-042, dengan daftar "kemungkinan ayat belum ditandai" di laporan.
- [x] Biaya aktual tercatat dan tidak melebihi estimasi yang disetujui lebih dari 20% — aktual **$3,77** (batch $3,72 dari `usage` + uji kecil $0,05) vs disetujui ±$6 (batas $7,20); per batch di laporan terjemahan, LOG, `docs/08`
- [ ] QA 20 sampel tercatat (target Benar ≥ 80%, Salah ≤ 10%) — **20 sampel siap** (`data/reports/ihya-9472-terjemahan.md`, halaman nilai lokal `data/build/llm/qa/review-batch.html`); menunggu nilai pemilik/ustadz (T-17 tahap 2). Tahap 1 (uji kecil v2): pemilik menyatakan "sampel layak" (nilai rinci menyusul)
- [x] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui — `pnpm verify` lolos (348 tes node + 155 tes db/core, build web)

## Di luar cakupan

- Menampilkan terjemahan di UI pencarian (S14). Mode baca paralel Arab–Indonesia di pembaca boleh ditambahkan bila waktu tersisa.

## Catatan hasil

**Dibuat:**
- `packages/llm` (`@surau/llm`): klien `@anthropic-ai/sdk` 0.135.0 (dependensi baru, MIT; membawa `@opentelemetry/api` Apache-2.0, dimatikan), `custom_id`, prompt berversi `translate-passage@{1,2}`, `summarize-section@{1,2}`, `glossary-v1` (±110 istilah, prefix ±4.300 token yang di-cache), validasi keluaran, harga Haiku/Sonnet 5.5.
- `tools/ingest/src/llm`: `pnpm llm tokens|sample|plan|submit|status|wait|collect|rejudge|retry|report`. Hasil lolos selalu dibangun ulang dari hasil mentah per batch (`rejudge` gratis); kirim/ulang berbasis hash sumber; pengaman `--budget`; ulangan terakhir ke Sonnet 5.5.
- Pencocok ayat: mode `cue_short` (2–3 kata sesudah قال تعالى, lafaz langka) dan `unmarked` (≥5 kata persis atau ≥4 sesudah pengantar ayat, lafaz satu-satunya di mushaf, tanpa konteks hadits/zikir, tanpa basmalah pembuka), hanya paragraf badan (ADR-042). Rujukan ayat 1.650 → **2.482** di 1.436 paragraf; sampel T-16 tidak berubah.
- Korpus **`ihya-v4`** (skema tetap 5): tabel `translation` (16.102) dan `summary` (626) terisi, dicek ulang terhadap sumber saat ingest (hash + validasi), invarian baru di laporan validasi. Dimuat ke D1 lokal; **belum** ke staging/produksi (UI terjemahan = S14; promote di S14).
- Laporan: `data/reports/ihya-9472-token.md`, `…-terjemahan.md` (cakupan, 9 gagal, 5 "kemungkinan ayat belum ditandai", biaya per batch, 20 sampel QA), `…-ayat.md` (+ bagian kutipan S13).

**Jalannya batch:** uji kecil v1 → v2 ($0,05); tahap 1 (668 ringkasan + 4.000 paragraf) → biaya terukur, proyeksi jauh di bawah batas → sisa 12.437; ulangan Haiku (383) → percobaan terakhir Sonnet (181, 172 lolos); putaran 2 (178/178). Cache prompt sistem ±100% di semua batch, 0 refusal. Temuan selama batch yang mengubah rencana (ADR-042, ADR-043): ±1.070 → (diperketat) 832 kutipan ayat tanpa tanda yang tadinya akan diterjemahkan LLM; penanda catatan kaki dibuang model di ±2% paragraf (kini peringatan); keluaran Haiku rusak pada paragraf sulit (kini Sonnet di percobaan terakhir). Peninjau menemukan blocker (rujukan ayat salah tunjuk untuk lafaz berulang) + 7 perbaikan; semua diperbaiki sebelum batch tahap 2.

**Utang teknis / untuk sesi berikutnya:**
- **S14:** tampilkan terjemahan (segmen AI vs Kemenag lewat `translationSegments`, label "terjemahan AI") dan ringkasan ("ringkasan AI"); muat `ihya-v4` ke staging dan promote; indeks teks Indonesia hanya segmen `ai`. Bangun ulang korpus butuh `data/build/llm/` (hanya di Mac pemilik; **jangan dihapus**, cadangkan).
- 9 paragraf tanpa terjemahan; 5 di antaranya kemungkinan ayat yang belum ditandai (daftar di laporan) → bahan perbaikan pencocok (S14/S15). Ayat dengan lafaz berulang tanpa kurung/pengantar tetap bisa diterjemahkan model sebagai bagian kalimat (sisa risiko ADR-042).
- Status tinjauan (`review_status`) dibangun ulang `ai_generated` setiap ingest: S18 harus menyimpan hasil tinjauan di luar hasil batch.
- `toAsciiDigits` di `packages/llm/src/check.ts` mengonversi digit Arab-India di luar `packages/text` (saran peninjau, belum dipindah).
- Mode baca paralel Arab–Indonesia di pembaca (opsional) tidak dikerjakan.

**Pesan untuk S14:** placeholder ada di `translation.text`; render dengan `translationSegments(text, maskAyat(text_raw, ayah_refs, footnote_refs).slots, quran)`. Terjemahan bisa tanpa penanda catatan kaki (330 paragraf). Model per baris (`claude-haiku-5-5` / `claude-sonnet-5-5`) dan `prompt_version` ada di tabel.
