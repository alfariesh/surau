# X09 · Sesi sisipan: kinerja pembaca di ponsel (LCP)

> **Fase:** sisipan (lepas dari Fase 4; tidak menyentuh `/tanya`, `apps/api`, `apps/mcp`, maupun `packages/llm`) · **Status:** selesai sebagian (2026-10-22, PR #118, ADR-079: 6 dari 8 butir lolos, butir LCP dicentang kemudian di X10 sesudah font Google Sans ADR-080 → 7 dari 8; target LCP tercapai di j1/200 putaran final, tidak di j3/202 — dicatat apa adanya)
> **Prasyarat:** X04 bagian A + B di `main` (PR #115, #116, #117) · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent · $0 LLM · tanpa korpus baru

## Tujuan

LCP ponsel halaman baca kembali ke baseline ADR-035 (3,9 dtk) + 10% = **≤ 4,29 dtk** (Lighthouse 13.5 ponsel, median n=5), atau sedekat mungkin dengan alasan tertulis. Pohon daftar isi tidak lagi ikut terkirim di HTML setiap halaman baca.

## Kenapa sesi ini ada

Usulan X04 (Catatan hasil bagian A dan B): LCP ponsel produksi ±5,7 dtk sebelum X04, Preview X04 6,11 dtk, padahal ADR-035 mencatat 3,9 dtk (2026-10-16). Sejak X04 bagian B, pohon daftar isi lengkap (522 baris, judul Indonesia + Arab) ikut di setiap halaman baca: HTML j1/200 41 → 61 KB gzip.

## Audit (2026-10-22)

**Cara ukur.** Lighthouse 13.5.0 (CLI, `--only-categories=performance`, ponsel bawaan = simulasi Lantern: RTT 150 ms, 1,6 Mbps, CPU 4×), Chrome for Testing 1248 headless, dari Mac pemilik. Dua halaman berselang-seling, n=5. Halaman sudah pernah dibuka (ISR HIT), jadi yang diukur adalah respons cache.

**Produksi `main` (`2bea232`, korpus `ihya-v8`), sebelum:**

| | j1/200 | j3/202 |
|---|---|---|
| LCP median (rentang) | **5,89 dtk** (5,63–6,36) | **5,34 dtk** (4,55–5,80) |
| FCP median | 1,91 dtk | 1,86 dtk |
| Performa median | 77 | 79 |
| TBT / CLS median | 72 ms / 0,036 | 68 ms / 0,001 |
| Elemen LCP | paragraf Arab pertama (`#p2824 p.arabic-text`) | paragraf Arab pertama |

**Ukuran yang dimuat (produksi, j1/200, satu kali muat dingin):** total ±1.004 KB terkirim.

| Jenis | Terkirim | Isi |
|---|---|---|
| HTML | 54 KB br / 60 KB gzip / 351 KB mentah | termasuk pohon daftar isi 522 baris di payload RSC |
| Font | 346 KB | 4 TTF HarmonyOS Sans **di-preload semua** (Regular, Italic, Medium, Bold: 56–60 KB masing-masing) + Noto Naskh 2 berkas (92 + 20 KB) |
| JS | 465 KB (32 berkas) | kerangka situs ±398 KB br (Next/React, react-aria, HeroUI, `motion` lewat Navbar/Sidebar Pro, kamus i18n utuh 77 KB mentah); pembaca menambah ±56 KB br |
| CSS | 55 KB | satu berkas global (ADR-035 mencatat 30 KB gzip; kini 44 KB br) |
| Gambar | 75 KB | tile tekstur kertas `serat.avif`, prioritas tinggi, dimuat sejak awal |
| Lain | 10 KB | beacon Cloudflare Web Analytics |

**Kenapa angkanya begini (Lantern).** Lighthouse merekam jejak tanpa throttling lalu mensimulasikan jaringan lambat. Untuk LCP, setiap permintaan yang **selesai sebelum LCP teramati** dihitung sebagai penghambat (rata-rata grafik optimistis dan pesimistis), dan skrip ikut dihitung bila dievaluasi sebelum cat itu. Di jejak cepat, cat pertama baru terjadi sesudah CSS, font, dan seluruh JS selesai (LCP teramati 128 ms lokal, 216–277 ms produksi), jadi ±900 KB ikut dihitung: kira-kira **4,3 ms per KB**. Memangkas byte apa pun yang dimuat sebelum cat pertama menurunkan LCP hampir linear.

**Eksperimen terkendali (lokal).** Build `main` di workerd (`opennextjs-cloudflare preview`) di belakang proksi HTTP/2 + brotli (meniru Cloudflare), respons diubah di proksi tanpa build ulang. Hasil satu kali per baris (simulasi deterministik, ±0,02 dtk):

| Perlakuan (j1/200) | LCP | Selisih |
|---|---|---|
| Dasar (sama dengan `main`) | 5,52 dtk | – |
| Tanpa preload 4 TTF Harmony | 5,28 | −0,24 |
| Tekstur kertas tidak dimuat | 5,21 | −0,31 |
| Keduanya | 4,91 | −0,61 |
| Preload Noto Naskh | 5,52 | 0 (CLS 0,036 → 0,012) |
| **Tanpa JS sama sekali** (batas atas) | 3,54 | −1,98 |
| CSS inline (Next `experimental.inlineCss`) + tanpa preload + tanpa tekstur | 2,08–3,41 | −2,1 s.d. −3,4 |

CSS inline membuat cat pertama terjadi sebelum JS dievaluasi, sehingga JS keluar dari hitungan. Tetapi di build nyata `experimental.inlineCss` **ditolak**: bundle Worker 2,3 → 7,2 MB gzip (OpenNext #1370, CSS tersalin per rute di manifes) dan HTML j1/200 351 KB → 1,67 MB mentah, 49 → 102 KB br (CSS tersalin 3×, Next #98110). Lihat ADR sesi ini.

**Kesimpulan audit.** Tidak ada satu penyebab tunggal; yang terbukti berpengaruh adalah byte yang dimuat sebelum cat pertama: JS kerangka (terbesar, tetapi sebagian besar milik HeroUI/Next dan semua halaman), preload font Harmony, tekstur kertas, lalu HTML pohon daftar isi dan JS pembaca yang belum diperlukan saat halaman tampil.

## Rencana (paket kerja)

- **W1 · Font.** Harmony `preload: false` (berkas tetap dimuat bila teksnya tampil; Italic tidak dimuat bila tidak dipakai). Noto Naskh di-preload **hanya di halaman baca** (elemen LCP; CLS turun) bila URL berkasnya sama dengan `@font-face` global. *(Hasil: syarat URL tidak terpenuhi, preload Naskh dibuang; ADR-079 poin 2.)*
- **W2 · Tekstur kertas ditunda.** Mask `serat.avif` hanya aktif sesudah halaman selesai dimuat pada kunjungan pertama (muncul halus), langsung aktif pada kunjungan berikutnya (berkas sudah di cache, ditandai di `localStorage`). Tanpa JS/`localStorage`: tekstur tetap muncul sesudah `load`.
- **W3 · Pohon daftar isi dimuat belakangan.** HTML halaman baca hanya membawa jalur bagian aktif (leluhur + saudara yang tampil terbuka). Pohon lengkap diambil dari route handler ber-cache per karya + versi korpus saat panel samping tampil (desktop) atau saat sheet daftar isi dibuka (ponsel). Breadcrumb JSON-LD, `<title>`, OG, judul bagian + label AI di kepala halaman, sorotan bagian aktif, dan daftar isi MCP tidak berubah.
- **W4 · JS pembaca yang belum diperlukan saat tampil dimuat saat dibutuhkan** (panel Tampilan, Lompat ke halaman, dialog laporan, isi sheet daftar isi) bila analyzer menunjukkan hemat berarti.
- **W5 · Kamus i18n** dipecah per bagian bila hemat terukur (klien hanya memuat bagian yang dipakai).
- **W6 · Ukur ulang** Preview PR vs produksi, berselang-seling, n=5, j1/200 dan j3/202; ukuran HTML/JS sebelum/sesudah.

## Baca dulu (hanya ini)

- File ini, ADR-003 (aturan konservatif Next/OpenNext), ADR-034 (ISR pembaca), ADR-035 (CSS per komponen), ADR-056 (lisensi HarmonyOS Sans: berkas tidak boleh diubah), ADR-058 (latar kertas), ADR-074–078.
- `apps/web/src/app/layout.tsx`, `app/globals.css` (latar kertas), `app/(app)/kitab/[work]/[juz]/[page]/page.tsx`, `components/reader/{toc-tree,reader-toolbar}.tsx`, `lib/reader/{data,reader-toc,toc}.ts`, `lib/reader/page-handler.ts` (pola route handler + cache).
- Docs Next bundel (`next/font`, route handler, `next/dynamic`), `/docs-terbaru` untuk OpenNext.

## Langkah

1. Branch `sesi/x09-kinerja-pembaca` (worktree). Audit + file ini (selesai di atas).
2. W1 → W2 → W3 → W4/W5 (sesuai hemat terukur di analyzer). Ukur lokal sesudah tiap paket dengan alat yang sama.
3. `pnpm verify`, e2e (termasuk axe dan tes daftar isi X04), tampilan ponsel/desktop terang/gelap di browser.
4. PR, ukur Preview vs produksi berselang-seling n=5, `peninjau`, catat (ADR, STATUS, LOG, STACK), merge.

## Selesai bila

- [x] `pnpm verify` lolos; e2e Preview (termasuk axe dan `reader-x04`/`reader-x04b`) lolos. *Bukti: `pnpm verify` lokal exit 0 (774 + 352 tes, build); CI PR #118 commit `47f3916`: verify, preview, preview mcp hijau; e2e terhadap Preview **167 lolos**, 9 dilewati, 0 gagal (termasuk `reader-x09` baru).*
- [x] LCP ponsel median Preview ≤ 4,29 dtk di j1/200 **dan** j3/202 (Lighthouse 13.5 ponsel, n=5, berselang-seling dengan produksi di jendela waktu yang sama); angka produksi pembanding dicatat. Bila tidak tercapai: angka apa adanya + alasan tertulis, butir ini tidak dicentang. *Tidak lolos. Putaran final (commit `47f3916`, n=5): j1/200 **4,15 dtk** (produksi 5,36), j3/202 **4,40 dtk** (produksi 5,89). Putaran 1 (`277441f`): 4,57 vs 5,88 dan 5,01 vs 5,77. Gabungan n=10: 4,49 vs 5,77 dan 4,58 vs 5,79 (−22% / −21%). Alasan sisa: lihat Catatan hasil.* *Dicentang di X10 (2026-10-22) atas arahan pemilik ("bila target ≤4,29 dtk tercapai, centang butir X09 itu dengan buktinya"): target tercapai di **produksi** sesudah X09 + font Google Sans (ADR-080), bukan di Preview X09 sendiri. Lighthouse 13.5.0 ponsel, n=5 berselang-seling, `main` `0f892b8`: j1/200 **4,24 dtk** (3,56–4,40), j3/202 **3,94 dtk** (2,50–4,46). Rincian: [X10 Catatan hasil](X10-rapikan-pembaca.md#catatan-hasil).*
- [ ] CLS ponsel median Preview ≤ produksi di kedua halaman. *Tidak dicentang (selisih kecil): j1/200 0,036 = 0,036; j3/202 **0,002** vs 0,001 (kedua putaran). Dugaan: font Harmony tanpa preload kadang berganti sesudah cat pertama. Perbaikan CLS 0,036 → 0,012 lewat preload Naskh dibuang (ADR-079 poin 2).*
- [x] HTML j1/200 tanpa pohon daftar isi lengkap: ukuran gzip turun dari 60 KB produksi dan tidak ada judul node yang tidak berada di jalur aktif (cek HTML Preview); pohon lengkap tampil di panel samping (desktop) dan sheet (ponsel) sesudah dimuat (e2e). *Bukti: HTML `pr-118.surau.org/kitab/ihya/1/200` 26 baris pohon (node 26, subjudul 0, `more` 17) vs produksi 522 (313 + 209); gzip 59,9 → 32,5 KB, br 54 → 25,7 KB, mentah 351 → 199 KB; j3/202 15 baris, 58,1 → 29,9 KB gzip. e2e `reader-x09` (desktop: pohon lengkap dimuat, rub' terpangkas bisa dibuka; ponsel: tanpa permintaan sebelum sheet dibuka, bagian aktif terlihat sesudah gulir bersambung) lolos lokal di build workerd.*
- [x] Breadcrumb JSON-LD, `<title>`, `og:title`, judul bagian + lencana "Terjemahan AI" di kepala halaman j1/200 identik dengan produksi (banding HTML); sorotan bagian aktif + subjudul X04 tetap (e2e `reader-x04b`); daftar isi MCP tidak berubah (`git diff` kosong di `apps/mcp`, tes MCP lolos). *Bukti: banding HTML Preview vs produksi j1/200 dan j3/202: title, og:title, JSON-LD, kepala `[data-reader-title]`, canonical **SAMA** (5/5 per halaman); e2e `reader-x04b` + `reader` (bagian aktif) lolos lokal; `git diff origin/main --stat -- apps/mcp` kosong, tes MCP ikut `pnpm verify`.*
- [x] Ukuran JS awal halaman baca dan total byte sebelum/sesudah dicatat (Lighthouse + analyzer). *Bukti: total terkirim j1/200 1.005 → 870 KB (Lighthouse); JS awal 455 → 405 KB br (lokal, 32 → 28 berkas), kerangka `/tentang` 398 → 377 KB br; kamus i18n di chunk pembaca: 2–3 salinan ±9,7 KB c → hanya bagian yang dipakai; bundle Worker 2.291 → 2.322 KiB gzip.*
- [x] Teks Arab tetap dari DB (tidak ada string Arab baru di diff `apps/web` selain data tes). *Bukti: grep huruf Arab atas `git diff origin/main...HEAD -- apps/web`: hanya contoh kueri `search` yang dipindah apa adanya ke `i18n/id/search.ts` dan "باب" di data tes buatan `full-toc.test.ts`.*
- [x] ADR baru, STATUS, LOG, STACK, dan file ini diperbarui. *(ADR-079 + catatan di ADR-058, KONVENSI String UI, STATUS, LOG, STACK, file ini.)*

## Di luar cakupan

- Mengganti font UI atau mengubah berkas TTF HarmonyOS Sans (ADR-056), mengganti kerangka Navbar/Sidebar HeroUI Pro, atau naik versi HeroUI/Next/OpenNext.
- `experimental.inlineCss` (ditolak, lihat audit) dan inline critical CSS buatan sendiri.
- Beacon Cloudflare Web Analytics (keputusan pemilik; dicatat saja).
- Isi pembaca (teks, terjemahan, subjudul), `/tanya`, `apps/api`, `apps/mcp`.

## Catatan hasil

*2026-10-22 (PR #118, ADR-079):*
- **Dibuat:** font HarmonyOS tanpa preload; tekstur kertas ditunda di kunjungan pertama (`lib/paper.ts`, `<script>` mentah di awal body, `data-kertas-tunda`/`data-kertas-masuk`); pohon daftar isi ringkas (`pruneToc` + `more`) + route ISR `/kitab/[work]/daftar-isi.json` + `lib/reader/full-toc.ts` (TocTree memuat pohon lengkap saat terlihat, dipasang ulang saat datang); `next/dynamic` untuk isi panel Tampilan, formulir Lompat, dialog laporan, dan palet cari; kamus i18n per bagian (`i18n/id/<bagian>.ts`, tes penjaga); tes `pruneToc`/`tocRows`, `full-toc`, e2e `reader-x09`.
- **Alat ukur** (scratchpad, tidak di git): Lighthouse 13.5.0 CLI + skrip berselang-seling, proksi HTTP/2 + brotli di depan `opennextjs-cloudflare preview` untuk eksperimen terkendali (mengubah respons tanpa build ulang), `next analyze --output` + `next analyze export --route` untuk komposisi JS per paket.
- **Kenapa target belum tercapai:** sisa muatan sebelum cat pertama ±625–645 KB pada putaran baik: JS kerangka situs ±377 KB br (semua halaman: Next/React ±130 KB, react-aria, HeroUI, `motion` lewat `LazyMotion`+`domAnimation` di Sidebar/Navbar Pro, `react-resizable-panels` lewat AppLayout), CSS 44 KB, Noto Naskh 92 KB, HarmonyOS Regular 58 KB. Pada putaran buruk TTF Medium/Bold (2 × 60 KB) dan subset Latin Naskh (20 KB) selesai sebelum cat pertama dan ikut terhitung (+0,8 dtk). Memangkas lebih jauh butuh keputusan pemilik: (a) font UI ke WOFF2/subset atau font OFL (lisensi HarmonyOS melarang konversi, ADR-056), (b) kerangka navigasi tanpa Sidebar/Navbar Pro (atau menunggu HeroUI membuat `motion` opsional).
- **Penyimpangan rencana:** preload Naskh dibuang (URL berbeda → unduhan ganda saat navigasi klien); `experimental.inlineCss` ditolak (bundle Worker 7,2 MB gzip, HTML 1,67 MB); endpoint diberi akhiran `.json` (tidak bentrok dengan halaman manusia kelak).
- **Peninjau** (`git diff origin/main...HEAD`): 0 blocker, 6 perbaikan, 6 saran. Dikerjakan: sheet daftar isi tetap tertutup sesudah gulir bersambung bila bagian aktif belum ada di pohon ringkas → TocTree dipasang ulang saat pohon lengkap datang (+ e2e ponsel); preload Naskh beda URL → dibuang; `Script beforeInteractive` baru jalan sesudah JS utama di App Router → `<script>` mentah dan gating dibalik (tanpa JS tekstur tetap tampil); `Spinner` berlabel "Loading" → `common.loading`; tes `pruneToc`/`full-toc`/e2e; KONVENSI + ADR. Saran dikerjakan: penjaga i18n juga untuk berkas `"use client"` di `app/`, endpoint `.json`. Saran tidak dikerjakan (dicatat): coba ulang otomatis bila ambil pohon gagal (kini dicoba lagi hanya saat TocTree lain terpasang), muat ulang halaman bila chunk dinamis hilang sesudah deploy, preload dialog laporan saat hover.
- **Utang teknis / pesan untuk sesi berikutnya:**
  - Skrip preferensi pembaca (`READER_SCALE_SCRIPT`, `<Script strategy="beforeInteractive">`) di App Router juga baru jalan sesudah JS utama, jadi ukuran huruf/tata letak pilihan pembaca bisa berkedip di ponsel lambat (temuan peninjau atas pola yang sama). Pindahkan ke `<script>` mentah seperti `lib/paper.ts`.
  - a11y `/tanya` (axe `color-contrast`, 2 elemen) gagal di produksi dan di build lokal, lolos di Preview: tampilan "belum dibuka" (Jawab mati) perlu dicek kontrasnya.
  - OpenNext 1.20.13 tersedia (belum dinaikkan); #1370 (dedup manifes `inlineCss`) belum tampak diperbaiki.
  - Ukur ulang LCP produksi sesudah merge (beacon Web Analytics +10 KB hanya di produksi).
