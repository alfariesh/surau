# S13 · Batch terjemahan & ringkasan (Haiku 5.5)

> **Fase:** 2 · **Status:** berjalan
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

- [ ] Faktor token Arab Claude terukur; kalkulator dan `docs/08` diperbarui
- [ ] 100% paragraf badan teks punya terjemahan dan 100% bagian punya ringkasan ID+EN (atau daftar yang gagal tercatat < 1%)
- [ ] Tidak ada ayat yang diterjemahkan LLM (tes: semua bentang `passage_ayah_ref` di terjemahan diisi teks Kemenag)
- [ ] Biaya aktual tercatat dan tidak melebihi estimasi yang disetujui lebih dari 20%
- [ ] QA 20 sampel tercatat (target Benar ≥ 80%, Salah ≤ 10%)
- [ ] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Menampilkan terjemahan di UI pencarian (S14). Mode baca paralel Arab–Indonesia di pembaca boleh ditambahkan bila waktu tersisa.

## Catatan hasil

*(diisi agent)*
