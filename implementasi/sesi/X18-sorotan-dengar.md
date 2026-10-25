# X18 · Sesi sisipan: sorotan kalimat mengikuti audio Intisari

> **Fase:** sisipan (`packages/core`, `packages/db` hanya view, `tools/audio`, `apps/web`, dokumen) · **Status:** berjalan
> **Prasyarat:** X17 di-merge (PR #139: `audio_track.alignment_key`, pemutar global) · Tugas pemilik: T-29 (kunci API) untuk uji berbayar; T-32 (domain media) untuk objek nyata
> **Perkiraan:** 1 percakapan agent · uji berbayar ≤ 2.000 karakter, hanya dengan izin pemilik di chat

## Tujuan

Saat Intisari didengarkan, kalimat yang sedang dibacakan tersorot di halaman (gaya karaoke), halaman menggulir mengikuti audio, dan mengetuk sebuah kalimat melompatkan audio ke kalimat itu.

## Kenapa sesi ini ada

Pemilik bertanya (2026-10-25) apakah teks bisa disorot mengikuti audio. X17 menunda sorotan per kalimat karena belum pasti `eleven_v4` mengembalikan timestamps; cadangannya Forced Alignment ElevenLabs. Mendengar sambil melihat teks membantu pembaca yang belum terbiasa dengan istilah, dan ketuk-untuk-lompat membuat audio bisa dipakai untuk mengulang satu gagasan.

## Baca dulu (hanya ini)

- [X17](X17-dengar.md) (Catatan hasil), ADR-100, `.claude/rules/teks-arab.md` aturan 11
- `/docs-terbaru elevenlabs` (with-timestamps, forced alignment)
- `packages/core/src/digest-script.ts`, `tools/audio/src/render.ts`, `apps/web/src/components/listen/`, `apps/web/src/components/reader/search-highlighter.tsx` (pola Highlight API)

## Langkah

1. **Docs.** `POST /v1/text-to-speech/{voice_id}/with-timestamps` (dukungan `eleven_v4`, bentuk `alignment`) dan `POST /v1/forced-alignment` (bahasa Indonesia, biaya).
2. **Sumber kalimat.** `digestScript` juga mengembalikan `sources`: untuk setiap kalimat skrip, rentang di teks yang tampil (pembuka, ringkasan, judul/isi gagasan, terjemahan kutipan, penutup) atau null untuk kalimat buatan kode (label, "Gagasan pertama", pengantar kutipan). `sources` di luar sha skrip, jadi audio lama tetap cocok.
3. **Objek timestamps** `packages/core/src/audio-alignment.ts`: `{format, audio_sha256, script_sha256, method, segments: [[start_ms, end_ms] | null, …][]}` per kalimat skrip; kunci R2 `<karya>/<lang>/<node>-<sha12 isi>.align.json`, immutable. Manifest track punya `alignment` (kunci, sha, bytes, metode) atau null; ingest mengisi `audio_track.alignment_key`; `DigestView.audio.alignment_key`.
4. **`tools/audio`:**
   - Pemetaan waktu karakter/kata → kalimat (`align.ts`), satu fungsi untuk dua sumber.
   - `ElevenLabs.synthesize({ timestamps })` memakai `/with-timestamps` (opsi `submit --timestamps`); `ElevenLabs.align()` = forced alignment atas MP3 rakitan + teks skrip tanpa IPA.
   - `pnpm audio align [--node] [--confirm]` membuat timestamps untuk berkas rakitan yang belum punya (termasuk audio yang sudah diunggah); `upload`/`manifest`/`verify` ikut menangani objek `.align.json`.
   - `pnpm audio align-test --voice ID [--confirm]`: uji kecil berbayar (±300 karakter) yang membandingkan with-timestamps v4 dengan forced alignment atas MP3 yang sama.
5. **Uji berbayar** (izin pemilik, ≤ 2.000 karakter): jalankan `align-test`, catat hasilnya di ADR, lalu tetapkan jalur bawaan.
6. **Web:** halaman Intisari menandai teks yang dibacakan (`data-say`), server menghitung target sorotan dari skrip, dan `ListenFollow` (klien, logika dimuat malas) menyorot kalimat aktif dengan CSS Custom Highlight API (`::highlight(surau-dengar)`, tanpa mengubah DOM), menggulir mengikuti audio kecuali pembaca sedang menggulir sendiri, dan mengetuk kalimat → lompat. CORS bucket media untuk `GET` objek timestamps. Tanpa CSS komponen HeroUI baru; LCP ≤ 4,29 dtk.
7. **Fixture:** `/dev/intisari` memakai audio sunyi + timestamps buatan (`/dev/intisari/sorotan.json`) supaya e2e dan Preview bisa memperlihatkan sorotan tanpa audio nyata.
8. **Tes:** unit pemetaan (sumber kalimat, waktu → kalimat, objek timestamps), e2e sorotan + gulir + ketuk dengan MP3 sunyi, axe.

## Selesai bila

- [ ] Sorotan berjalan di Preview untuk satu Intisari pilot
- [ ] Tes unit pemetaan; e2e dengan MP3 sunyi + timestamps fixture; axe
- [ ] Uji berbayar with-timestamps v4 vs forced alignment (≤ 2.000 karakter, izin pemilik) tercatat di ADR
- [ ] LCP halaman Intisari ≤ 4,29 dtk (`pnpm ukur:lcp`)
- [ ] `pnpm verify` lolos; peninjau dijalankan; PR di-merge setelah CI hijau; ADR + STATUS/LOG diperbarui

## Di luar cakupan

- Sorotan per kata (cukup per kalimat; datanya bisa diturunkan nanti dari forced alignment).
- Sorotan di pemutar mini atau halaman lain selain halaman Intisari yang sedang diputar.
- Membacakan teks Arab (tetap ditolak, ADR-097).

## Catatan hasil

(diisi di akhir sesi)
