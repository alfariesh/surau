# X18 · Sesi sisipan: sorotan kalimat mengikuti audio Intisari

> **Fase:** sisipan (`packages/core`, `packages/db` hanya view, `tools/audio`, `apps/web`, dokumen) · **Status:** sebagian (kode selesai 2026-10-25, ADR-104; uji berbayar + objek nyata menunggu T-29, T-32, izin pemilik)
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
6. **Web:** halaman Intisari menandai teks yang dibacakan (`data-say`), server menghitung target sorotan dari skrip, dan `ListenFollow` (klien, logika dimuat malas) menyorot kalimat aktif dengan CSS Custom Highlight API (`::highlight(surau-dengar)`, tanpa mengubah DOM), menggulir mengikuti audio kecuali pembaca sedang menggulir sendiri, dan mengetuk kalimat → lompat. Worker media (`apps/media`) melayani objek timestamps dengan CORS. Tanpa CSS komponen HeroUI baru; LCP ≤ 4,29 dtk.
7. **Fixture:** `/dev/intisari` memakai audio sunyi + timestamps buatan (`/dev/intisari/sorotan.json`) supaya e2e dan Preview bisa memperlihatkan sorotan tanpa audio nyata.
8. **Tes:** unit pemetaan (sumber kalimat, waktu → kalimat, objek timestamps), e2e sorotan + gulir + ketuk dengan MP3 sunyi, axe.

## Selesai bila

- [ ] Sorotan berjalan di Preview untuk satu Intisari pilot — *sebagian:* berjalan di Preview `pr-143.surau.org/dev/intisari` (fixture Intisari, audio sunyi + timestamps buatan; sorot, gulir, ketuk dicek di browser); Intisari pilot nyata belum ada di staging (X15b) dan belum ada audio/timestamps nyata (X17 pilot, T-29)
- [x] Tes unit pemetaan; e2e dengan MP3 sunyi + timestamps fixture; axe — `digest-script.test.ts` (sumber kalimat, sha emas = sha `main`), `audio-manifest.test.ts`, `tools/audio` 47 (align, render timestamps polos + khidmat, ElevenLabs, r2/manifest), `follow.test.ts` 6; e2e `sorotan.spec.ts` + `dengar.spec.ts` 8/8 (chromium + ponsel, axe) terhadap `next dev`
- [ ] Uji berbayar with-timestamps v4 vs forced alignment (≤ 2.000 karakter, izin pemilik) tercatat di ADR — *belum:* kunci T-29 belum ada; `pnpm audio align-test` siap
- [x] LCP halaman Intisari ≤ 4,29 dtk (`pnpm ukur:lcp`) — Preview PR #143, n=5: `/dev/intisari` 3,05 / 2,79 dtk, j1/200 2,97 / 2,87 dtk ([bukti](bukti/X18/lcp-pr143.md))
- [ ] `pnpm verify` lolos; peninjau dijalankan; PR di-merge setelah CI hijau; ADR + STATUS/LOG diperbarui — `pnpm verify` 984 + 440 tes + build; peninjau 0 blocker + 5 perbaikan (dikerjakan); ADR-104, STATUS, LOG; merge: lihat LOG

## Di luar cakupan

- Sorotan per kata (cukup per kalimat; datanya bisa diturunkan nanti dari forced alignment).
- Sorotan di pemutar mini atau halaman lain selain halaman Intisari yang sedang diputar.
- Membacakan teks Arab (tetap ditolak, ADR-097).

## Catatan hasil

**2026-10-25 · kode (ADR-104, PR #143).** Nomor ADR-101 dipakai X17b (gaya narator, PR #142) dan ADR-102 dipakai X17 label lisan dihapus (PR #147), ADR-103 dipakai Worker media (PR #148), ketiganya di-merge saat sesi ini berjalan, jadi sesi ini memakai ADR-104. Peran kalimat (`roles`, X17b) dan asal kalimat (`sources`, X18) digabung di `digestScript`; sha skrip di branch ini sama persis dengan `main` (dicek dengan worktree `origin/main`: `f210b611…` sesudah merge #147 (skrip v3), kini sha emas di tes).

Dibuat:
- core: `sources` per kalimat (di luar sha), `audio-alignment.ts` (objek `.align.json` format 1), `alignment` di manifest, `alignment_key` di `audio_track` dan `DigestView.audio`.
- `tools/audio`: `align.ts`; ElevenLabs `/with-timestamps` (`submit --timestamps`) + `/v1/forced-alignment`; `pnpm audio align --budget-minutes N --confirm`; `pnpm audio align-test --voice ID --confirm`; upload/manifest/verify untuk `.align.json` (verify memeriksa CORS); Worker media melayani `.align.json` dengan CORS. Tag gaya narator tidak masuk rentang kalimat.
- web: `data-say` (+ `data-say-at`), `follow-targets.ts`, `ListenFollow` + `follow-run.ts` (Highlight API `surau-dengar`, gulir mengikuti, ketuk-untuk-lompat, satu run pemilik sorotan, objek dengan sha skrip lain ditolak), `lib/text-ranges.ts` (dipakai juga sorotan Cari), `digestFollow`, fixture `/dev/intisari` + `/dev/intisari/sorotan.json`.

Uji coba nyata: Preview lokal `/dev/intisari` dan `?tier=section`, desktop + ponsel gelap: kalimat tersorot mengikuti audio sunyi, halaman bergulir, ketuk gagasan 1 → audio lompat ke 0:28 dan bab "Gagasan 1 dari 3".

Belum / utang:
- **Uji berbayar** with-timestamps v4 vs forced alignment belum dijalankan: kunci T-29 belum ada (alat audio melapor sendiri), dan izin pemilik di chat diperlukan (≤ 2.000 karakter; `align-test` ±300 karakter + ±20 dtk audio). Hasilnya dicatat di ADR-104 butir 5 lalu menetapkan jalur bawaan.
- **CORS:** sejak ADR-103 media dilayani Worker `apps/media`; Worker itu kini melayani `.align.json` dengan `Access-Control-Allow-Origin: *` (kebijakan CORS bucket dari draf awal dihapus).
- **Sorotan untuk Intisari pilot nyata** menunggu pilot X15b di staging + pilot audio X17 + timestamps + T-32. Butir pertama "Selesai bila" baru terbukti dengan fixture di Preview.

Peninjau: 0 blocker, 5 perbaikan (tanda terima forced alignment untuk badan 200 rusak, tes khidmat + timestamps, `.catch` impor malas, balapan run sorotan, `catch` hanya `ScriptError`), semuanya dikerjakan; saran yang dikerjakan: sha emas, pagu `align`, tombol kontrol bukan gulir manual, `forced-colors`, catatan CSP `connect-src`, cek `script_sha256` di klien, catatan kunci cache di ADR.

Untuk sesi berikutnya: sesudah T-29 + izin → `pnpm audio align-test --voice <id> --confirm`; lalu pilot X17 dengan `--timestamps` (bila v4 mengembalikan waktu) atau `pnpm audio align --budget-minutes N --confirm`; `upload --confirm` → `manifest` → CORS (T-32) → `verify` → build korpus.
