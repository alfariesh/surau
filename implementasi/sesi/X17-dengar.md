# X17 · Sesi sisipan: Dengar (audio Intisari dengan ElevenLabs v4)

> **Fase:** sisipan (`packages/text`, `packages/core`, `tools/audio` baru, `tools/ingest` hanya pemuat audio, `apps/web`, dokumen) · **Status:** selesai untuk pilot (2026-10-25, ADR-100–103): kode, suara (Kang Sugiman, gaya `variatif@1`), 8 audio pilot di `media.surau.org`, dan baris audio di korpus staging. Audio produksi menunggu Intisari final (X15c, korpus `ihya-v9`) + kuota ElevenLabs (T-29 butir 6) + izin pemilik
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
   - Masukannya `DigestView` dari `readDigest`, jadi hanya yang tampil yang dibacakan: gagasan yang tidak ditolak dan berjangkar, serta kutipan yang tidak ditahan. Gagasan yang ditolak sesudah audio dibuat mengubah sha skrip, sehingga audionya gugur saat ingest.
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
8. **Pilot** (izin ≤ 50 ribu karakter): Intisari Kitab + ±7 bab dari pilot X15b, dengan satu suara AI pilihan T-31 (skema: satu suara AI per Intisari). Pemilik mendengar dan menilai (lafal istilah, tempo, label).
9. **Produksi** (izin + kuota T-29): seluruh Intisari yang durasi dengarnya ≥ 1 menit, manifest, muat ke korpus berikutnya.

## Selesai bila

- [x] Tes `spoken-id`, skrip tanpa huruf Arab/placeholder (fixture), offset bab = jumlah durasi segmen, penyambungan MP3 + ID3, store posisi — `spoken-id.test.ts` 41, `digest-script.test.ts` 10 (workerd, termasuk riwayat bertakhrij berat yang ditahan `readDigest` dan sha yang berubah saat gagasan ditolak), `audio-manifest.test.ts` 4, `tools/audio` 30 (`render.test.ts`: bab = jumlah sampel segmen + jeda; `mp3`/`id3`/`lexicon`/`elevenlabs`/`r2`), `listen.test.ts` 9 (store + track)
- [x] e2e pemutar dengan MP3 sunyi: putar, jeda, kecepatan, bab, Media Session, lanjut posisi sesudah muat ulang, navigasi antarhalaman tanpa putus; axe — `e2e/dengar.spec.ts` 4/4 (chromium + ponsel) terhadap `next dev`; CI Preview menjalankannya lagi di PR
- [x] `pnpm audio verify` lolos untuk semua objek di manifest; `audio_track` termuat hanya untuk sha yang cocok — pilot 2026-10-25: `pnpm audio verify` **8/8** (HEAD + Range + sha256, lewat Worker `surau-media`, ADR-103); `pnpm audio staging` atas korpus staging (sesudah X15b dan X18 merge): 8 track dimuat, 0 gugur (`selectAudioTracksIn`, fungsi yang sama dengan ingest); pemuat juga terbukti dengan korpus fixture (`tools/ingest/src/audio.test.ts`)
- [x] LCP j1/200 dan halaman Intisari ≤ 4,29 dtk (`pnpm ukur:lcp`) — Preview PR #139, n=5: j1/200 3,12 dtk (baru) / 3,01 dtk (Keduanya); halaman Intisari `/dev/intisari` (fixture X16, staging belum ber-Intisari) 2,71 / 2,61 dtk ([bukti](bukti/X17/lcp-pr139.md))
- [x] Pemilik menyetujui suara dan sampel (T-31); biaya aktual tercatat — suara "Kang Sugiman" (voice ID `aK834gEOxQEtviMPgurT`), gaya B lalu "lebih variatif" (`variatif@1`), lafal "Ihya Ulumuddin" (koreksi pemilik), label lisan dihapus (ADR-102); pilot disetujui ("Ya saya setuju", batas 45.000 karakter) lalu dinilai "Pilot bagus". Biaya aktual seluruh X17 (sampel + uji bab + pilot): 71 permintaan, **18.989 karakter** tertagih (±US$1,52, paket Starter; `pnpm audio status`)
- [x] `pnpm verify` lolos; peninjau; STATUS, LOG, dan berkas sesi ini diperbarui — `pnpm verify` 961 + 434 tes + build (sesudah merge X16 dan perbaikan peninjau); peninjau: 1 blocker + 8 perbaikan, semuanya dikerjakan (lihat Catatan hasil)

## Di luar cakupan

- Membacakan huruf Arab atau ayat dengan mesin (ditolak, ADR-097).
- Narator manusia dan lantunan qari (kolom `voice_kind` sudah siap).
- Sorotan per kalimat, sampai timestamps v4 terbukti ada.
- Unduh offline (PWA), podcast dua host, fitur belajar.

## Catatan hasil

**2026-10-25 · kode + infrastruktur (ADR-100).** PR: lihat LOG.

Dibuat:
- `packages/text/src/spoken-id.ts` (`SPOKEN_VERSION` 1) dan `packages/core/src/digest-script.ts` (`SCRIPT_VERSION` 1, `digestScript`, `loadDigestScript`, `segmentText`). Segmen label/pembuka/gagasan/kutipan/penutup. Kutipan dibacakan lewat terjemahan, ayat hanya disebut, riwayat bertakhrij berat tidak pernah dibacakan (ditahan `readDigest` sejak X16), huruf Arab/⟦/[/]// ditolak.
- `packages/core/src/audio-manifest.ts`: skema `data/audio/<kitab>-audio.json`, `audioObjectKey` (sidik ISI MP3), `selectAudioTracks`. `data/audio/ihya-9472-audio.json` masih kosong.
- `tools/audio`:
  - `TtsProvider` + ElevenLabs REST;
  - `mp3.ts` (sambung CBR + jeda sunyi);
  - `id3.ts`;
  - `lexicon.ts` + `data/lexicon/id.yaml` (32 lafal draf `test`);
  - `store.ts` (cache segmen, niat, tanda terima);
  - `render.ts`;
  - `r2.ts` (tidak pernah menimpa, verify HEAD + Range + sha);
  - CLI `pnpm audio plan|sample|submit|upload|manifest|verify|status|release`.
- `tools/ingest/src/audio.ts` + `sqlite-d1.ts`: putaran kedua ingest dengan baris `audio_track` yang sha-nya cocok.
- Bucket R2 `surau-media` (APAC, r2.dev mati).
- Web:
  - `components/listen/*` (engine, store, track, PlayButton, MiniPlayer lazy, ListenProvider di shell);
  - `…/bab/[id]/intisari/dengar.json`;
  - `/dev/dengar` + audio sunyi buatan;
  - `/privasi`;
  - 8 ikon.
- JS awal setiap halaman bertambah ±1,9 KB gzip (provider + mesin + store; esbuild minify). Pemutar mini 3,7 KB gzip baru dimuat saat diputar.

Uji coba nyata:
- `pnpm audio plan` terhubung ke staging (0 Intisari karena staging masih skema < 9). Kunci T-29 belum terbaca.
- Pemutar diuji di browser (desktop + ponsel): Media Session, bab, kecepatan, navigasi tanpa putus, lanjut posisi.

Menyimpang dari rencana (ADR-100):
- Kunci objek memakai sidik isi MP3, bukan sha skrip, supaya ganti suara atau leksikon tidak bentrok.
- Jeda memakai bingkai sunyi, bukan tag `[pause]`.
- Judul bagian tidak dibacakan.
- Leksikon diterapkan sesudah sha skrip.

Belum / utang:
- Pilot (≤ 50 ribu karakter) dan produksi menunggu T-29 (kunci, sebaiknya + User/Voices Read), T-31 (pilih suara + uji lafal lewat `pnpm audio sample`), T-32 (domain), dan izin pemilik di chat.
- Halaman Intisari X16 (PR #138) sudah masuk. `ListenSlot` merender `PlayButton` di bawah baris kepala; track dihitung rute halaman. Halaman Intisari baru punya data sesudah pilot X15b dimuat ke staging, jadi LCP-nya diukur memakai `/dev/intisari` (fixture).
- Bab "Penutup" belum menjadi bab pemutar (`audioChapters` hanya gagasan).
- ID3 belum memuat CHAP/CTOC.

Peninjau (sesudah merge X16): 1 blocker + 8 perbaikan, semuanya dikerjakan.
- **Blocker:** gagasan yang bersandar pada riwayat sangat lemah/palsu/tanpa asal kini diberi kalimat tanda dari `evidence`, sama dengan chip di halaman.
- **Perbaikan:**
  - pecahan "1/40" dan "QS al-Baqarah/2: 183";
  - isian leksikon + teks akhir diperiksa (aturan 11);
  - tanda terima sebelum validasi MP3, `sample` dengan niat;
  - Intisari bermasalah dilewati/`script_error`;
  - judul Arab cadangan lewat `ArabicInline`;
  - "coba lagi" memuat ulang;
  - ID putaran pertama;
  - string UI ke i18n.
- **Saran yang dikerjakan:**
  - "terjemahan AI-nya";
  - versi leksikon dari entri aktif;
  - race restore/tutup;
  - Media Session dibersihkan;
  - waktu dibandingkan sebagai waktu;
  - regex `\p{Mn}`;
  - penanda hanya berangka Arab-India;
  - catatan CSP `media-src`.
- **Saran yang belum:**
  - cek objek langsung ke bucket (masih lewat domain; aman karena kunci bersidik isi);
  - "ra." perempuan (bergantung X15b);
  - fokus sesudah tombol tutup;
  - alias `ihya@1/…/dengar.json`;
  - uji `play()` di iPhone sungguhan (T-31);
  - cocokkan sha skrip staging dengan build lokal sebelum pilot berbayar.

**X17b (ADR-101):** gaya narator `khidmat@1` (tag tetap per peran kalimat), bawaan polos; uji A/B lewat `pnpm audio sample --demo-gaya`.

Untuk sesi berikutnya: urutan pilot sesudah izin pemilik:
1. `pnpm audio sample --voice <id> --confirm` (uji lafal, ±2 ribu karakter);
2. `pnpm audio plan --voice <id>`;
3. `pnpm audio submit --voice <id> --budget-chars 50000 --node … --confirm`;
4. `pnpm audio upload --confirm`;
5. `pnpm audio manifest`;
6. `pnpm audio verify`;
7. build korpus berikutnya.

**2026-10-25 · X17c–X17d: pilot tayang (ADR-101–103).** PR #144–#148.
- Suara dan gaya dipilih pemilik lewat contoh dengar: Kang Sugiman, `variatif@1` (pembuka dan kepala gagasan hangat, kalimat baku tetap tenang). Lafal "Ihya Ulumuddin" aktif. Label suara AI hanya tampil sebagai teks, tidak diucapkan (ADR-102, skrip v3).
- Pilot: Kitab Ilmu (100003) + 7 bab (100004–100007, 100009, 100017, 100019), 8 berkas, **48,6 menit**, 16.597 karakter di manifest `data/audio/ihya-9472-audio.json`.
- `media.surau.org`: domain kustom R2 tertangkap wildcard Preview `*.surau.org`, jadi diganti Worker `apps/media` (`surau-media`) dengan binding R2 + Workers Caching (Range dari cache), deploy lewat job `deploy media` (ADR-103).
- `pnpm audio staging [--confirm]` memuat track yang skripnya cocok ke `audio_track` staging. Tombol "Dengarkan 3 menit" di `/kitab/ihya/bab/100006/intisari` (data staging, `pnpm dev:remote`) memutar audio dari `media.surau.org` dengan pemutar mini berlabel "Dibacakan suara AI (Kang Sugiman)".

Belum / menunggu:
- **Audio produksi** (seluruh Intisari Ihya, ±1,3 juta karakter): sesudah Intisari final X15c (korpus `ihya-v9`, butuh T-28 dan nilai QA T-31 butir 4), pilihan kuota ElevenLabs (T-29 butir 6), dan izin pemilik di chat. Saat korpus produksi dibangun, ingest memuat track yang skripnya cocok secara otomatis; audio pilot gugur sendiri bila Intisari-nya berubah.
- Di surau.org tombol Dengarkan belum tampil: korpus produksi (`ihya-v8`) belum memuat Intisari.
- Sorotan kalimat (X18, ADR-104) untuk audio pilot butuh objek `.align.json`; berkas pilot dirender tanpa timestamps (`pnpm audio align`, menunggu izin).
- Saran peninjau yang belum: lihat daftar di atas (fokus sesudah tombol tutup, alias `dengar.json`, uji `play()` di iPhone sungguhan).

Untuk sesi berikutnya: audio produksi mengikuti urutan pilot di atas dengan `--gaya variatif --voice aK834gEOxQEtviMPgurT --voice-name "Kang Sugiman"`, lalu `pnpm audio upload --confirm`, `manifest`, `verify`, dan build korpus.
