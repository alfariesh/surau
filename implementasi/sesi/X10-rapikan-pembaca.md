# X10 · Sesi sisipan: rapikan sisa kecil pembaca

> **Fase:** sisipan (lepas dari Fase 4; hanya `apps/web`, tidak menyentuh `/tanya`, `apps/api`, `apps/mcp`, maupun `packages/llm`) · **Status:** berjalan (2026-10-22)
> **Prasyarat:** X04 (PR #115–#117), X09 (PR #118), ADR-080 (PR #119), X08 (PR #120, #121) di `main` · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent · $0 LLM · tanpa korpus baru

## Tujuan

Menutup utang kecil pembaca yang dicatat X04, X09, dan X08: pilihan tampilan tidak berkedip di ponsel lambat, daftar isi selalu menunjukkan posisi baca (juga subjudul dan halaman sambungan), catatan di kaki halaman sambungan sesuai halamannya sendiri, rincian label koreksi tampil di dekat lencananya, dan angka LCP produksi sesudah font Google Sans tercatat.

## Kenapa sesi ini ada

Pemilik bertanya "di improvement reader apa yang belum, selain ustadz" (2026-10-22). Dari daftar sisa, butir yang kecil, tanpa biaya LLM, dan tanpa korpus baru digabung jadi satu sesi atas permintaan pemilik.

Sumber utang:
- X09 Catatan hasil: `READER_SCALE_SCRIPT` lewat `<Script strategy="beforeInteractive">` baru dijalankan sesudah JS utama (`self.__next_s`), jadi preferensi pembaca bisa berkedip di ponsel lambat; pola yang benar sudah dipakai `lib/paper.ts` (ADR-079).
- X04 Catatan hasil bagian A dan B: leluhur bagian aktif yang tertutup tidak dibuka otomatis (`defaultExpandedKeys` hanya dibaca saat pasang); subjudul kurasi tidak ikut disorot sebagai bagian aktif; catatan AI dan catatan tinjau di kaki halaman masih menurut halaman pertama.
- X08 Catatan hasil: popover rincian label "Terjemahan AI · dikoreksi …" tampil di tengah layar (`margin: auto` bawaan popover).
- X09/ADR-080: LCP produksi sesudah font Google Sans belum diukur ulang (Preview 3,86–4,10 dtk).

## Baca dulu (hanya ini)

- [X09 Catatan hasil](X09-kinerja-pembaca.md) (cara ukur Lighthouse, pola skrip mentah)
- [X04 Catatan hasil](X04-mutu-baca.md) (utang bagian A dan B)
- ADR-074, ADR-075, ADR-077, ADR-079, ADR-082 di [KEPUTUSAN.md](../KEPUTUSAN.md)

## Langkah

1. **W1 · Skrip preferensi mentah.** Root layout menulis `READER_SCALE_SCRIPT` sebagai `<script>` mentah di awal `<body>` (sesudah skrip kertas), seperti `PAPER_SCRIPT`. Tes: e2e memblokir semua chunk JS Next lalu memeriksa atribut preferensi tersimpan sudah terpasang di `<html>` (dengan `<Script beforeInteractive>` tes ini gagal).
2. **W2 · Daftar isi menunjukkan posisi baca.**
   - Cabang terbuka dikendalikan (`expandedKeys` + `onExpandedChange` React Aria): saat bagian aktif berubah (halaman sambungan, pohon ringkas → lengkap), leluhurnya ditambahkan ke cabang terbuka tanpa menutup cabang lain; cabang yang ditutup pembaca tetap tertutup sampai bagian aktif berubah lagi.
   - Subjudul kurasi sebagai bagian aktif: bila bagian aktif punya subjudul yang mulai di halaman ini atau sebelumnya, baris aktif = subjudul terakhir itu (aturan sama dengan "bagian terakhir yang tampil di halaman ini"). Pohon ringkas (`pruneToc`) ikut membuka node pemilik subjudul itu.
   - Berlaku di panel samping desktop, sheet ponsel, dan halaman sambungan gulir bersambung.
3. **W3 · Kaki halaman sambungan.** Setiap halaman sambungan menampilkan catatan AI dan catatan tinjau miliknya sendiri (seperti atribusi ayat per halaman). Catatan AI di kaki halaman hanya tampil bila ada konten AI yang belum ditinjau manusia (kalimatnya menyebut "belum ditinjau manusia"; terjemahan berlabel "dikoreksi"/"diperiksa" tidak termasuk).
4. **W4 · Popover label berjangkar.** Rincian label tinjauan menempel di bawah lencananya lewat CSS anchor positioning (anchor hanya dipasang pada lencana yang popover-nya terbuka; posisi cadangan bila tidak muat), tetap popover HTML bawaan tanpa JS. Browser tanpa dukungan: tetap di tengah layar seperti sekarang.
5. **W5 · Ukur LCP produksi.** Lighthouse 13.5 ponsel, j1/200 dan j3/202 berselang-seling, n=5, sebelum dan sesudah deploy sesi ini. Catat di X09 dan STATUS.
6. Banding HTML `<main>` j1/200 sebelum/sesudah (build lokal yang sama datanya), peninjau, catatan, PR, merge, deploy.

## Selesai bila

- [ ] `pnpm verify` lolos; e2e pembaca (`reader`, `reader-x04`, `reader-x04b`, `reader-x09`, tes baru sesi ini, termasuk axe) lolos.
- [ ] Preferensi pembaca tersimpan (skala, tata letak terjemahan, font) sudah terpasang di `<html>` walau semua chunk JS Next diblokir (e2e), dan HTML j1/200 tidak lagi memuat `reader-prefs` lewat `self.__next_s`.
- [ ] Daftar isi: sesudah gulir bersambung masuk ke bagian yang leluhurnya tertutup, baris aktif terlihat tanpa klik di panel samping dan di sheet ponsel; subjudul kurasi disorot sebagai baris aktif di halaman yang memuatnya (e2e).
- [ ] Halaman sambungan menampilkan catatan AI/tinjau sesuai isinya sendiri (e2e: halaman sambungan dengan tanda "perlu ditinjau" menampilkan catatan tinjau di kakinya).
- [ ] Popover label tinjauan tampil berdekatan dengan lencananya dan tidak keluar layar di 375 px (Chromium, cek posisi kotak), tetap terbuka/tertutup tanpa JS, axe lolos.
- [ ] HTML `<main>` j1/200 sebelum/sesudah hanya berbeda pada perubahan yang disengaja (dicatat).
- [ ] LCP ponsel produksi j1/200 dan j3/202 sebelum dan sesudah deploy tercatat (n=5, berselang-seling) di X09 dan STATUS.
- [ ] Tangkapan layar desktop, ponsel, dan gelap untuk W2–W4 dilampirkan di PR.
- [ ] Teks Arab tetap dari DB (tidak ada string Arab baru di diff `apps/web` selain data tes).
- [ ] Peninjau dijalankan dan temuannya dikerjakan; ADR bila ada keputusan baru; STATUS, LOG, STACK, dan file ini diperbarui.

## Di luar cakupan

Mode baca per bab, koreksi judul daftar isi/ringkasan AI, navigasi tanpa Sidebar/Navbar Pro, upgrade OpenNext, 13 bait syair di tengah prosa, pencocok ayat "[ayat N]".

## Catatan hasil

*(diisi di akhir sesi)*
