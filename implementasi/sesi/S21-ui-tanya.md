# S21 · UI Tanya, transparansi biaya & rilis Fase 4

> **Fase:** 4 · **Status:** belum (garis besar)
> **Prasyarat:** S20 selesai · Tugas pemilik: review ustadz atas prompt, kebijakan penolakan, dan sampel jawaban (T-13)
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Halaman Tanya yang jujur: jawaban Indonesia dengan kartu kutipan Arab verbatim, label "terjemahan AI", status hadits dari takhrij, tombol lapor, dan halaman transparansi biaya. Semua syarat R4 terpenuhi.

## Baca dulu

- [docs/05](../../docs/05-kebijakan.md) (seluruhnya), syarat R4 di FASE.md, dan riwayat git template chat HeroUI (komponen thread/composer, sebelum dihapus di S04).
- MCP `heroui-pro`: komponen Chat (`ChatConversation`, `ChatMessage`, `ChatSource`/`ChatSources` dengan `sourceType="document"`, `PromptInput`) dan `@heroui-pro/react/markdown` (penjelasan Indonesia saja).

## Langkah (garis besar)

1. `/tanya`: streaming jawaban dari `/api/jawab`.
   - Penjelasan Indonesia dirender sebagai Markdown, dengan penanda sitasi `[n]` dipetakan ke kartu.
   - Kartu kutipan memuat `ArabicText` dari DB + terjemahan + lokasi + tautan pembaca.
   - **Kutipan Arab tidak pernah lewat Markdown.**
2. Label tetap: "Surau adalah asisten riset, bukan pemberi fatwa." Untuk pertanyaan kasus pribadi, arahkan ke ulama setempat ([docs/05](../../docs/05-kebijakan.md) §2).
3. Keadaan khusus:
   - "Tidak ditemukan di kitab yang dicakup" disertai saran Cari.
   - Kuota habis, Jawab dimatikan, atau anggaran habis → arahkan ke Cari.
   - Turnstile (`interaction-only`) hanya saat diminta server.
4. Tombol "Laporkan jawaban keliru" menulis ke `feedback` dan muncul di `/admin` dan `/tinjau`.
5. `/transparansi`: biaya AI, hosting, dan jumlah pertanyaan bulan ini (dari ledger), serta cara berdonasi (tanpa iklan atau paywall, sesuai klausul NC).
6. Eval final: `pnpm run eval:jawab` (berbayar, dengan izin) memenuhi target R4. Ustadz mereview prompt sistem, kebijakan penolakan, dan ≥20 sampel jawaban di `/tinjau`.
7. E2E: tanya → jawaban dengan kutipan → klik kutipan membuka pembaca. Uji juga sakelar mati.
8. Sarankan `/rilis 4`.

## Selesai bila

- [ ] Semua syarat R4 (FASE.md) terpenuhi dan tercatat dengan angka
- [ ] Review ustadz atas prompt, kebijakan, dan sampel tercatat (nama dan tanggal)
- [ ] E2E lolos; pemilik menyetujui tampilan
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
