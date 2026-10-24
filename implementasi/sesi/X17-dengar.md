# X17 · Sesi sisipan: Dengar (audio Intisari dengan ElevenLabs v4)

> **Fase:** sisipan (`packages/text`, `packages/core`, `tools/audio` baru, `tools/ingest` hanya pemuat audio, `apps/web`, dokumen) · **Status:** belum
> **Prasyarat:** X15a di-merge (tabel `audio_track`, `DigestView.audio`); sampel nyata dari pilot X15b · Tugas pemilik: T-29 (kunci API + kuota), T-31 (uji dengar)
> **Perkiraan:** 1–2 percakapan agent · pilot TTS ≤ 50 ribu karakter (izin; masuk paket Starter) · produksi ±1,3 juta karakter (izin + keputusan kuota T-29)

## Tujuan

Setiap Intisari punya tombol **Dengarkan**. Audionya narasi bahasa Indonesia berlabel suara AI, tanpa huruf Arab yang dibacakan mesin, dengan bab per gagasan. Pemutarnya tetap berjalan saat pembaca pindah halaman, bisa dikendalikan dari layar kunci ponsel, dan melanjutkan dari posisi terakhir.

## Kenapa sesi ini ada

Lihat [X15](X15-intisari.md) dan ADR-097 butir 6. Pekerja kota yang sibuk belajar sambil di perjalanan. Blinkist menghentikan narasi AI (Juni 2026) karena keluhan pendengar, jadi mutu suara diuji pemilik dulu (T-31). Pola yang aman dicontoh dari Yaqeen Institute: suara AI berlabel + tautan ke teks.

## Baca dulu (hanya ini)

- ADR-097 butir 6, [docs/05 §12](../../docs/05-kebijakan.md#12-intisari-dan-suara-ai), `.claude/rules/teks-arab.md` aturan 11
- `/docs-terbaru elevenlabs` (text-to-speech `eleven_v4`, request stitching, with-timestamps, pronunciation dictionaries, format keluaran) sebelum menulis klien; docs R2 (bucket publik + domain kustom, cache) lewat MCP `cloudflare-docs`
- `packages/core/src/digest.ts` (`DigestView`), `packages/db/migrations/corpus/0009_digest.sql` (`audio_track`)
- `apps/web/src/components/shell/surau-shell.tsx`, `apps/web/CLAUDE.md`, ADR-079 (LCP)

## Langkah

1. **Normalisasi lisan** `packages/text/src/spoken-id.ts` (`SPOKEN_VERSION`): angka dan tahun Hijriah ("w. 505 H") menjadi kata, "j. 3 h. 204", gelar kehormatan ("saw." → "shallallahu 'alaihi wa sallam", "ra." menurut bentuk penuhnya), dan singkatan. Disertai tes.
2. **Skrip** `packages/core/src/digest-script.ts`, deterministik:
   - Intisari menjadi segmen per gagasan: kalimat label pembuka, pembuka/abstrak, gagasan, penutup.
   - Kalimat dipecah dengan `indonesianSentences`.
   - Kutipan dibacakan lewat terjemahannya ("…yang terjemahan bebasnya: …"). Ayat hanya disebut. Tanda riwayat sangat lemah ikut dibacakan bila riwayatnya disebut.
   - Hasil diperiksa: tanpa huruf Arab, tanpa `⟦`, dan sha skrip stabil.
3. **Leksikon** `data/lexicon/id.yaml`: IPA istilah dan nama (dari glosarium X15b + tokoh), dengan versi = sha berkas. Diterapkan sebagai IPA inline `/…/` (v4) atau kamus lafal ElevenLabs. Diuji dengar di T-31.
4. **`tools/audio`:**
   - `providers/elevenlabs.ts` di balik antarmuka `TtsProvider` (`synthesize`, `capabilities`). Panggilan REST langsung tanpa SDK npm, `eleven_v4`, `language_code: "id"`, MP3 mono 64 kbps, request stitching antar gagasan.
   - Penyambung MP3 per bingkai + tag ID3 (judul, "dibacakan suara AI", lisensi CC BY-NC-SA, atribusi).
   - CLI `pnpm audio plan | sample | submit --budget-chars --confirm | upload --confirm | manifest | verify`:
     - `plan` menghitung karakter terhadap kuota;
     - `submit` mencatat niat sebelum request dan hasil sesudahnya (pola ADR-061), dengan cache per sha di `data/build/audio/`;
     - `upload` tidak pernah menimpa atau menghapus objek;
     - `verify` = HEAD + sha.
   - Kunci API dari `.env` (`ELEVENLABS_API_KEY`, T-29). Agent tidak membaca `.env`; alat membacanya saat dijalankan.
5. **R2:** bucket publik `surau-media` + domain `media.surau.org` (wrangler; r2.dev mati). Kunci objek memuat sha (`<karya>/<lang>/<node>-<sha12>.mp3`) dengan `Cache-Control: public, max-age=31536000, immutable`, `Content-Type: audio/mpeg`. Tidak perlu CORS untuk `<audio>` tanpa `crossorigin`.
6. **Manifest + ingest:**
   - `data/audio/ihya-9472-audio.json` ter-commit, tanpa teks: node, lang, `voice_kind`, `r2_key`, bytes, durasi, provider, voice, model, sha skrip, versi skrip/leksikon, bab.
   - Pemuat di `tools/ingest` mengisi `audio_track` hanya bila sha skrip sama dengan skrip yang dibangun ulang dari Intisari di build itu.
7. **Web:**
   - `components/listen/{engine.ts, store.ts, play-button.tsx, mini-player.tsx}` + `ListenProvider` di `surau-shell.tsx`.
   - `HTMLAudioElement` dibuat dan `play()` dipanggil sinkron di handler klik (iOS). `MiniPlayer` dimuat lewat `next/dynamic` (`ssr:false`), dengan `preload="none"`.
   - Kontrol: Media Session (metadata + label suara AI, play/pause, ±15 dtk, bab berikut/sebelum, `setPositionState`), kecepatan 0,75–2×, bab = gagasan.
   - Lanjut posisi lewat localStorage `surau:listen:v1`, dicatat di `/privasi`. Data pemutar disajikan `…/bab/[id]/intisari/dengar.json` (ISR).
   - Tidak ada CSS komponen HeroUI baru di `globals.css`; JS awal bertambah ≤ ±3 KB.
8. **Pilot** (izin ≤ 50 ribu karakter): Intisari Kitab + ±7 bab dari pilot X15b, dengan suara pilihan T-31. Pemilik mendengar dan menilai (lafal istilah, tempo, label).
9. **Produksi** (izin + kuota T-29): seluruh Intisari yang durasi dengarnya ≥ 1 menit, manifest, muat ke korpus berikutnya.

## Selesai bila

- [ ] Tes `spoken-id`, skrip tanpa huruf Arab/placeholder (fixture), offset bab = jumlah durasi segmen, penyambungan MP3 + ID3, store posisi
- [ ] e2e pemutar dengan MP3 sunyi: putar, jeda, kecepatan, bab, Media Session, lanjut posisi sesudah muat ulang, navigasi antarhalaman tanpa putus; axe
- [ ] `pnpm audio verify` lolos untuk semua objek di manifest; `audio_track` termuat hanya untuk sha yang cocok
- [ ] LCP j1/200 dan halaman Intisari ≤ 4,29 dtk (`pnpm ukur:lcp`)
- [ ] Pemilik menyetujui suara dan sampel (T-31); biaya aktual tercatat
- [ ] `pnpm verify` lolos; peninjau; STATUS, LOG, dan berkas sesi ini diperbarui

## Di luar cakupan

- Membacakan huruf Arab atau ayat dengan mesin (ditolak, ADR-097).
- Narator manusia dan lantunan qari (kolom `voice_kind` sudah siap).
- Sorotan per kalimat, sampai timestamps v4 terbukti ada.
- Unduh offline (PWA), podcast dua host, fitur belajar.

## Catatan hasil

*(diisi agent di akhir sesi)*
