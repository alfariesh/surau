# X10 · Sesi sisipan: rapikan sisa kecil pembaca

> **Fase:** sisipan (lepas dari Fase 4; hanya `apps/web`, tidak menyentuh `/tanya`, `apps/api`, `apps/mcp`, maupun `packages/llm`) · **Status:** berjalan (2026-10-22; kode selesai, menunggu PR + ukur LCP sesudah deploy)
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
- [x] Preferensi pembaca tersimpan (skala, tata letak terjemahan, font) sudah terpasang di `<html>` walau semua chunk JS Next diblokir (e2e), dan HTML j1/200 tidak lagi memuat `reader-prefs` lewat `self.__next_s`. *Bukti: e2e `reader-x10` "preferensi pembaca terpasang …" lolos (desktop + ponsel); uji mutasi dengan `layout.tsx` lama → gagal (`data-tr-layout` kosong); HTML j1/200 lokal tanpa `__next_s`, produksi sebelum X10 masih `self.__next_s=…push([0,{"children":"try{var d=…`.*
- [x] Daftar isi: sesudah gulir bersambung masuk ke bagian yang leluhurnya tertutup, baris aktif terlihat tanpa klik di panel samping dan di sheet ponsel; subjudul kurasi disorot sebagai baris aktif di halaman yang memuatnya (e2e). *Bukti: e2e `reader-x10`: j3/202 baris aktif = subjudul `#p13553` (panel + sheet); 3/201 → 3/202 membuka cabang kitab, cabang yang ditutup tetap tertutup di 3/203; 1/147 → 1/148 membuka lagi induk saudara; sheet ponsel yang dibuka sesudah gulir bersambung (aktivasi virtual tanpa menggulir; lihat Catatan hasil) menyorot `#p13553`.*
- [x] Halaman sambungan menampilkan catatan AI/tinjau sesuai isinya sendiri (e2e: halaman sambungan dengan tanda "perlu ditinjau" menampilkan catatan tinjau di kakinya). *Bukti: e2e "kaki halaman menurut halamannya sendiri": kaki j1/200 (tepat di bawah teksnya) tanpa catatan tinjau, kaki j1/201 dengan catatan tinjau + catatan AI, urutan DOM 200 → 201, kaki artikel tanpa catatan AI; tes unit `PageFoot` 5 kasus.*
- [x] Popover label tinjauan tampil berdekatan dengan lencananya dan tidak keluar layar di 375 px (Chromium, cek posisi kotak), tetap terbuka/tertutup tanpa JS, axe lolos. *Bukti: e2e "rincian label …375 px" (markup sama dengan `AiBadge` disisipkan ke halaman pembaca, berjalan juga di CI tanpa data tinjauan): lencana kiri dan kanan → rincian < 16 px di bawah lencana, di dalam 0–375 px, lebar > 300 px; dekat dasar layar → pindah ke atas. Data uji lokal (dua terjemahan j1/200 "Ust. Uji", tidak di-commit): rincian 6 px di bawah lencana di desktop/ponsel/gelap (tangkapan 08–10), Escape menutup dan fokus kembali ke lencana, axe 0 pelanggaran dengan popover terbuka sesudah perbaikan label dalam nama.*
- [x] HTML `<main>` j1/200 sebelum/sesudah hanya berbeda pada perubahan yang disengaja (dicatat). *Bukti: banding `next dev` lokal, korpus `ihya-v8` sama, ID otomatis React Aria dinormalisasi: j1/200 hanya catatan AI yang pindah dari kaki artikel ke kaki halaman (teks sama); j3/202 itu + cabang kitab aktif terbuka (pohon 15 → 20 baris, gzip 36,4 → 37,3 KB).*
- [ ] LCP ponsel produksi j1/200 dan j3/202 sebelum dan sesudah deploy tercatat (n=5, berselang-seling) di X09 dan STATUS.
- [x] Tangkapan layar desktop, ponsel, dan gelap untuk W2–W4 dilampirkan di PR. *Bukti: `bukti/X10/01`–`10` (08–10 data uji lokal), ditautkan di badan PR.*
- [x] Teks Arab tetap dari DB (tidak ada string Arab baru di diff `apps/web` selain data tes). *Bukti: grep huruf Arab atas `git diff origin/main...HEAD -- apps/web`: hanya "عنوان" di data tes buatan `toc.test.ts`.*
- [x] Peninjau dijalankan dan temuannya dikerjakan; ADR bila ada keputusan baru; STATUS, LOG, STACK, dan file ini diperbarui. *Bukti: peninjau 0 blocker, 4 perbaikan dikerjakan (ADR-083 bagian Peninjau); ADR-083, STATUS, LOG, STACK (`react-aria-components` 1.22.1), X09, file ini.*

## Di luar cakupan

Mode baca per bab, koreksi judul daftar isi/ringkasan AI, navigasi tanpa Sidebar/Navbar Pro, upgrade OpenNext, 13 bait syair di tengah prosa, pencocok ayat "[ayat N]".

## Catatan hasil

*2026-10-22 (ADR-083):*
- **Dibuat:**
  - W1: skrip preferensi pembaca mentah di awal `<body>` (sesudah skrip kertas).
  - W2: `activeRowId` (subjudul kurasi sebagai baris aktif), `pruneToc` server memakai baris yang sama, `TocTree` dengan `expandedKeys` terkendali (leluhur ditambahkan saat baris aktif/jalur berubah), prop `at` + halaman terbaca dari store gulir bersambung.
  - W3: `PageFoot` (atribusi ayat + catatan AI + catatan tinjau) untuk halaman pertama dan halaman sambungan, tepat di bawah teks halamannya; `PageModel.ai` (terjemahan belum ditinjau / ringkasan AI / ada yang ditinjau) memilih kalimat catatan, `PAGE_MODEL_VERSION` 5.
  - W4: CSS anchor positioning untuk rincian label tinjauan (`@supports`, fallback tengah layar); lencana bernama teks yang terlihat + `aria-describedby` (WCAG 2.5.3, temuan axe).
  - Tes: unit `activeRowId`, `PageModel.ai`, `PageFoot`, lencana; e2e baru `reader-x10.spec.ts` (9 skenario).
- **LCP ponsel produksi sebelum deploy X10** (Lighthouse 13.5.0, Chrome for Testing 1248, n=5 berselang-seling, 2026-10-22 ±14:45 WIB, `main` `0f892b8` = X09 + font Google Sans + X08): j1/200 **4,24 dtk** (3,56–4,40), FCP 1,25, CLS 0,040, TBT 55 ms, skor 85; j3/202 **3,94 dtk** (2,50–4,46), FCP 1,72, CLS 0,001, TBT 66 ms, skor 86. Keduanya ≤ 4,29 dtk.
- **Verifikasi:** `pnpm check` + `pnpm test` (822 + 387 tes) lolos; e2e pembaca lokal (`reader`, `reader-x04`, `reader-x04b`, `reader-x09`, `reader-x10`, `a11y`) 139 lolos, 11 dilewati.
- **Peninjau** (`git diff origin/main...HEAD`): 0 blocker, 4 perbaikan, 7 saran; semua perbaikan dikerjakan (lihat ADR-083).
- **Temuan di lapangan:**
  - Di ponsel tidak ada tombol daftar isi di kepala ringkas; sheet hanya dibuka dari toolbar di atas halaman, dan menggulir ke sana membuat halaman pertama kembali menjadi halaman terbaca. Jadi "sheet sesudah gulir bersambung" diuji dengan aktivasi virtual (seperti pembaca layar). Ini bukan bug, tetapi layak jadi usulan desain: tombol daftar isi di kepala ringkas.
  - Sempat tampak seperti bug "halaman melompat ke atas saat sheet dibuka" di Android: ternyata klik Playwright menggulir ke tombol toolbar. Di aplikasi tidak terjadi.
  - Kaki halaman kini ada di antara teks dua halaman, jadi celahnya lebih tinggi; bantu gulir e2e `reader-x10` menaruh awal teks di 20% tinggi layar.
  - Label tombol buka/tutup cabang React Aria berbahasa Inggris ("Collapse"/"Expand"): sudah ada sebelum X10, React Aria belum punya terjemahan Indonesia. Belum dikerjakan.
- **Utang / pesan untuk sesi berikutnya:**
  - Ukur LCP produksi sesudah deploy X10 (butir di atas), lalu catat di sini, X09, dan STATUS.
  - Tombol daftar isi di kepala ringkas ponsel (usulan, butuh keputusan desain pemilik).
  - Label chevron React Aria berbahasa Inggris (pembaca layar).
