# S19 · Pipeline Jawab (`packages/llm` + `apps/api`)

> **Fase:** 4 · **Status:** belum (garis besar; rinci ulang di awal fase)
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

## Selesai bila

- [ ] ADR hasil uji passthrough AI Gateway tertulis
- [ ] Catatan: service binding dari web **preview** memanggil `surau-api` **produksi**; uji end-to-end memakai Worker `surau-api-staging` atau dicatat keterbatasannya
- [ ] Validitas kutipan 100% di eval; metrik lain dicatat terhadap target R4
- [ ] Refusal dan error penyedia teruji (tes dengan mock), dengan degradasi ke Cari
- [ ] Biaya rata-rata per jawaban tercatat (target ±$0,002–0,003, [docs/08](../../docs/08-biaya.md))
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
