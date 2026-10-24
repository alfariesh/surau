# X11 · Sesi sisipan: Mode baca (Arab · Keduanya · Terjemahan) + fondasi bahasa

> **Fase:** sisipan (hanya `apps/web` + dokumen; tidak menyentuh `apps/api`, `apps/mcp`, `packages/*`, maupun korpus) · **Status:** selesai (2026-10-24, PR #126 + #127, ADR-091–092)
> **Prasyarat:** PR #124 (ADR-084–090: Beranda, Cari, navbar ringkas, Maknaz) di `main` · Tugas pemilik: –
> **Perkiraan:** 1–2 percakapan agent · $0 LLM · tanpa korpus baru · dua PR: bagian A (fondasi + Arab/Keduanya + Cari/Maknaz + dokumen), bagian B (mode Terjemahan)

## Tujuan

Satu pilihan **Mode baca** untuk seluruh aplikasi, yaitu Arab, Keduanya (bawaan), atau Terjemahan. Pilihan ini terpasang sebelum halaman tampil, tidak menggeser posisi baca, dan netral bahasa, sehingga situs berbahasa Inggris nanti cukup menambah data dan rute tanpa membongkar pembaca.

## Kenapa sesi ini ada

Pemilik bertanya (2026-10-24) apakah teks Arab dan terjemahan yang selalu tercampur perlu diperbaiki, karena pembaca bisa lebih suka salah satu atau keduanya. Pemilik ingin solusi jangka panjang tanpa utang, karena bahasa Inggris akan menyusul dan pengalaman baca adalah fokus utama aplikasi. Cari, Maknaz, dan permukaan lain juga harus dipikirkan.

Temuan riset kode (2026-10-24, `main` sesudah PR #124):
- Pilihan tersebar: ada sakelar "Tampilkan terjemahan AI" (`data-translation="off"`) dan tata letak terpisah (`data-tr-layout`). Tidak ada mode untuk membaca terjemahannya saja, karena ADR-075 menolak mode "Indonesia saja".
- Sakelar terjemahan **tidak** menyembunyikan Ringkasan AI, judul Indonesia di daftar isi dan kepala halaman, maupun catatan AI di kaki halaman.
- Tata letak berdampingan mengabaikan sakelar: separuh kolom kosong saat terjemahan dimatikan atau saat paragraf tanpa terjemahan. Ukuran syair di sana diukur dari seluruh kolom.
- Kata cari Indonesia (`?q=`) tidak terlihat bila terjemahannya tersembunyi atau dilipat.
- Kartu Cari dan kartu kutipan Maknaz tidak mengikuti pilihan pembaca.
- Bahasa "id" tertulis mati di komponen (`lang="id"`, `[lang="id"]` di CSS), padahal tabel DB sudah berkunci `(…, lang)` dan `TranslationView` membawa `lang`.

**Jawaban pemilik (2026-10-24):**
1. Mode Terjemahan boleh, dengan teks Arab tetap ada (dilipat per paragraf). Ini menggantikan penolakan di ADR-075.
2. "Bahasa Inggris" berarti situs berbahasa Inggris di alamat terpisah (mis. `/en/…`). Alamat Indonesia tidak berubah, dan bahasa terjemahan ikut bahasa situs.
3. Cari dan Maknaz ikut mode, tetapi bukti tetap tampil.
4. Dikerjakan sesudah branch `ui/navbar-ringkas-buku` masuk `main` (terpenuhi: PR #124).

## Baca dulu (hanya ini)

- ADR-075 (label AI + tata letak), ADR-079 (kamus per bagian), ADR-082 (label bersama), ADR-083 (skrip preferensi mentah), ADR-084 (menu ⋮), ADR-087 (kotak Cari) di [KEPUTUSAN.md](../KEPUTUSAN.md)
- [X04 Catatan hasil](X04-mutu-baca.md) (tata letak terjemahan) dan [X10 Catatan hasil](X10-rapikan-pembaca.md) (skrip preferensi, kaki halaman)
- `apps/web/CLAUDE.md`, `.claude/rules/teks-arab.md`

## Model

| Konsep | Isi | Disimpan | Kapan |
|---|---|---|---|
| **Mode baca** | `ar` / `both` / `tr`, plus tata letak khusus `both` | localStorage `surau:read-mode` → `<html data-read-mode>` lewat skrip sebelum tampil; HTML ISR tetap satu untuk semua pembaca | Sesi ini |
| **Bahasa situs** | Antarmuka, bahasa terjemahan, jawaban Maknaz, sumber terjemahan ayat, jalur cari Latin | Dimensi URL (`id` di alamat sekarang, `en` nanti di `/en/…`), tanpa proxy (ADR-003) | Fase bahasa Inggris (belum dijadwalkan) |

| Permukaan | Arab | Keduanya (bawaan) | Terjemahan |
|---|---|---|---|
| Paragraf | Arab saja | Di bawah / Berdampingan / Dilipat | Terjemahan utama; baris "Teks Arab" di atas paragraf membuka Arabnya |
| Judul/subjudul | Arab | Arab + terjemahan | Arab kecil di atas, terjemahan besar di bawah; tidak dilipat |
| Ringkasan AI, catatan AI, kaki AI, judul Indonesia (daftar isi, kepala halaman) | Disembunyikan | Tampil | Tampil |
| Paragraf tanpa terjemahan | Arab | Arab selebar penuh | Arab + keterangan "belum diterjemahkan" |
| Kartu Cari | Terjemahan hanya bila jalur terjemahan cocok; ringkasan tetap (hanya ada bila cocok) | Seperti sekarang | Terjemahan dulu, Arab di bawahnya |
| Kartu kutipan Maknaz | Arab; terjemahan dilipat | Sama | Arab; terjemahan terbuka |
| Catatan kaki takhrij, popover ayat (Kemenag), /tinjau | Tidak berubah | | |

## Langkah

### Bagian A (PR 1)

1. **W1 · Inti preferensi.**
   - `surau:read-mode` masuk ke `READER_ATTR_PREFS` (atribut `data-read-mode`, bawaan `both` = tanpa atribut).
   - Cadangan lama: `surau:reader-translation === "0"` → `ar`. `data-translation` dihapus.
   - `READ_MODES` di bagian A = `ar`, `both`.
   - Penyimpanan bersama (`subscribe/notify/store/readAttr/applyAttr`) pindah ke `lib/prefs.ts`. `useReadMode()`/`setReadMode()` ada di `components/read-mode.ts`. Migrasi kunci lama sekali jalan.
2. **W2 · Penanda markup + bahasa dari data.**
   - `data-no-tr` pada paragraf/judul tanpa terjemahan.
   - `data-tr-aid` pada semua bantuan terjemahan: ringkasan, catatan AI, baris AI kaki halaman, judul Indonesia + catatan judul di daftar isi, judul Indonesia di kepala halaman.
   - `lang` dari data (`TranslationModel.lang`, `PAGE_MODEL_VERSION` naik; `summary.lang`; `TitleSource.lang`).
   - `UI_LANG` (`i18n/locale.ts`) untuk tombol UI di dalam blok Arab.
   - Satu komponen lencana AI pembaca.
3. **W3 · CSS.**
   - Mode `ar` menyembunyikan terjemahan dan bantuan (`display:none`), kecuali paragraf yang dibuka sementara.
   - Dilipat/Berdampingan hanya di `both`. Grid berdampingan hanya untuk paragraf bukan-judul yang punya terjemahan.
   - Syair memakai container sendiri. Pemenggalan kata berkunci kelas.
   - Aturan cetak: lipatan dibuka, tombol disembunyikan.
4. **W4 · Buka otomatis.** `lib/reader/fold.ts` (`reveal`):
   - tautan `#pN`/`#bab-N`/`hashchange` ke teks tersembunyi membukanya;
   - kecocokan cari yang tak terlihat (mode Arab atau Dilipat) membuka terjemahan paragraf itu saja.
5. **W5 · Panel Tampilan + menu ⋮ + jaga posisi baca.**
   - Panel: Segment Mode baca di paling atas, lalu pratinjau setinggi tetap (Arab + terjemahan sesuai mode). Kontrol yang tidak berlaku dinonaktifkan dengan keterangan, tidak disembunyikan.
   - Menu ⋮: Segment Mode baca di bawah tema, hanya di halaman yang terpengaruh (pembaca, /cari, /tanya).
   - Kamus `i18n/id/readMode.ts`.
   - `keepReadingPosition()` dipakai untuk semua perubahan preferensi.
6. **W6 · Cari + Maknaz** (komponen klien, lewat `useReadMode()`): kartu Cari menurut tabel; kutipan Maknaz `lang` dari data.
7. **W7 · Dokumen.**
   - ADR Mode baca (menggantikan sebagian ADR-075) dan ADR Arsitektur bahasa (locale = dimensi URL tanpa proxy, daftar sambungan "id" untuk fase Inggris).
   - `docs/01`, `docs/07`, baris FASE (X11 + garis besar "Bahasa Inggris").
   - STATUS, LOG, file ini.
8. Verifikasi, tangkapan layar, LCP, peninjau, PR, merge, deploy.

### Bagian B (PR 2)

1. **B1 · Markup.**
   - Bila ada terjemahan, `div.passage-tools` menjadi anak pertama `.passage` dengan tombol `arabic-toggle` (`aria-controls=ar-pN`).
   - `passage-ar` + `id=ar-pN` hanya pada blok Arab badan.
   - Urutan DOM = urutan tampil.
2. **B2 · ⋮** inline tetap di mode `ar`/`both`. Di `tr`, ⋮ kedua di baris alat dirender di klien.
3. **B3 · Judul** bergaya kicker (Arab kecil di atas, terjemahan besar di bawah); `h2` tidak berubah.
4. **B4 · Sambungan.**
   - `tr` masuk `READ_MODES`; pendengar klik `arabic-toggle` → `data-ar-open`.
   - `reveal()` untuk kecocokan Arab dan tautan balik catatan kaki.
   - Penanda catatan kaki di terjemahan membuka takhrij di tempat.
   - Kalimat catatan AI mode `tr` dirender di server.
   - Cari: terjemahan dulu. Maknaz: terjemahan terbuka.
5. Verifikasi, peninjau, PR, merge, deploy.

## Selesai bila

### Bagian A

- [x] `pnpm verify` lolos, termasuk tes unit baru: skrip preferensi (kunci baru, cadangan lama, nilai salah, storage galat), penanda markup `PageText`, helper kartu Cari. *Bukti: `pnpm verify` exit 0 (839 + 387 tes, build) sesudah perbaikan peninjau; tes baru `scale.test.ts` (7), `hit-parts.test.ts` (4), `page-text.test.tsx` (3), `preview.test.ts` (+3), `page-foot` (+1), `passage-translation` (+2).*
- [x] Preferensi `read-mode=ar` dan nilai lama `reader-translation=0` terpasang di `<html>` walau semua chunk JS Next diblokir, dan bantuan terjemahan tersembunyi (e2e). *Bukti: e2e `reader-x11` "mode Arab dan sakelar lama terpasang … JS Next tidak dimuat" lolos (desktop + ponsel), termasuk kunci lama dipindah lalu dihapus.*
- [x] Pilihan Mode baca dari panel dan menu ⋮ bertahan sesudah muat ulang; halaman sambungan ikut mode; posisi gulir bergeser ≤ 2 px saat mode diganti (e2e). *Bukti: e2e `reader-x11`: panel → muat ulang tetap `ar`; "halaman sambungan … ikut mode Arab"; "ganti mode dari menu ⋮ … ≤ 2 px" (pembaca) dan "ganti mode di Cari … ≤ 2 px" lolos; Segment panel tidak bergeser (< 1 px).*
- [x] Berdampingan: paragraf tanpa terjemahan selebar penuh, mode Arab tanpa grid (e2e, tes regresi). *Bukti: e2e "berdampingan: paragraf tanpa terjemahan selebar penuh; mode Arab tanpa grid" (j1/86 #p1022, desktop); tangkapan 03.*
- [x] `?q=` Indonesia di mode Arab dan di Keduanya + Dilipat: kata tersorot terlihat (e2e, tes regresi). *Bukti: e2e "kata cari Indonesia di teks tersembunyi dibuka dan tersorot" (mode Arab dan Keduanya + Dilipat): `data-tr-peek`, sorotan > 0, paragraf tujuan tetap 80 px dari atas; tangkapan 07.*
- [x] Mode Arab menyembunyikan Ringkasan AI, catatan AI, kaki AI, dan judul Indonesia di daftar isi dan kepala halaman (e2e, tes regresi). *Bukti: e2e "mode Arab menyembunyikan terjemahan dan semua bantuan terjemahan" (semua `[data-tr-aid]` tersembunyi, judul daftar isi Arab saja) + "daftar isi di mode Arab: nama baris = judul Arab" (temuan peninjau); tangkapan 02, 08.*
- [x] Kartu Cari di mode Arab hanya menampilkan terjemahan bila jalur terjemahan cocok (unit + e2e). *Bukti: unit `hitParts` (4 kasus) + e2e "kartu Cari di mode Arab" (kueri Arab: 0 blok terjemahan; kueri Indonesia: terjemahan tampil); uji manual 41 hasil "sabar": 0 selisih; tangkapan 09–10.*
- [x] axe lolos untuk mode Arab dan Keduanya di ketiga tata letak, dengan panel terbuka. *Bukti: `a11y.spec`: Keduanya × Di bawah/Dilipat/Berdampingan, masing-masing tanpa dan dengan panel terbuka, + mode Arab dengan kata cari dibuka dan panel terbuka: 0 pelanggaran (desktop + ponsel).*
- [x] LCP ponsel (Lighthouse, n=5) j1/200 tetap ≤ 4,29 dtk di Preview. *Bukti: Lighthouse 13.5.0 ponsel (simulasi Lantern, Chrome for Testing 1248, mesin Linux agen, bukan Mac X09/X10), n=5: Preview #127 (memuat bagian A + B) j1/200 **3,74 dtk** (2,34–4,43), j3/202 **2,88 dtk**. Pembanding produksi sesudah deploy bagian A di mesin yang sama: j1/200 4,41 dtk lalu 4,86 dtk pada putaran ulang (sebaran 3,30–5,13), j3/202 4,33 / 4,41 dtk; mode Arab 4,36 / 3,18 dtk. Sebaran antarputaran ±1 dtk lebih besar dari perubahan bagian A (CSS ±2 KB, JS ±3 KB); deployment sebelum bagian A tidak lagi bisa diukur (500), jadi selisih sebelum/sesudah di mesin ini tidak tersedia. Lihat Catatan hasil.*
- [x] Tangkapan layar desktop, ponsel, dan gelap per mode dilampirkan di PR. *Bukti: `bukti/X11/01`–`10` (bagian A, ditautkan di PR #126) dan `11`–`18` (bagian B, PR #127).*
- [x] Teks Arab tetap dari DB (tidak ada string Arab baru di diff selain data tes). *Bukti: grep huruf Arab atas `git diff origin/main...HEAD -- apps/web`: hanya data tes (kueri e2e "الصبر", fixture `page-text.test.tsx`).*
- [x] Peninjau dijalankan dan temuannya dikerjakan; ADR, STATUS, LOG, FASE, docs, dan file ini diperbarui. *Bukti: peninjau bagian A (1 blocker + 4 perbaikan) dan bagian B (0 blocker, 6 perbaikan) dikerjakan; ADR-091, ADR-092, catatan ADR-075, docs/01, docs/07, FASE, STATUS, LOG, file ini.*

### Bagian B

- [x] `pnpm verify` lolos; tes unit tombol Arab (hanya bila ada terjemahan, `aria-controls` cocok, judul tidak pernah dilipat). *Bukti: `pnpm verify` exit 0 (847 + 387 tes, build); `page-text.test.tsx` mode Terjemahan (baris alat + `aria-controls=ar-pN`, tanpa terjemahan, judul daftar isi tidak dilipat, subjudul menempel: hanya badan dilipat, penanda catatan kaki terjemahan = tombol), `hit-parts` urutan, `scale` mode `tr`, `CitationCard` per mode.*
- [x] Mode Terjemahan: Arab tiap paragraf terlipat dan terbuka per paragraf; ⋮ tetap terjangkau; paragraf tanpa terjemahan menampilkan Arab (e2e). *Bukti: e2e `reader-x11` "mode Terjemahan: Arab tiap paragraf terlipat …; ⋮ tetap terjangkau" (⋮ tepat satu, menu Salin sitasi terbuka) dan "paragraf tanpa terjemahan menampilkan teks Arab dengan keterangan" (j1/86 #p1022); tangkapan 11–16.*
- [x] Tautan `#pN`, kecocokan Arab `?q=`, dan tautan balik catatan kaki membuka Arab yang terlipat (e2e). *Bukti: e2e "permalink #pN dan tautan balik catatan kaki membuka Arab paragrafnya" (temuan peninjau: `#pN` sebelumnya belum membuka) dan "kata cari Arab di teks yang terlipat membuka Arab paragraf itu" (tanpa `#`, sorotan > 0).*
- [x] Salin: terjemahan tetap berlabel, Arab yang dibuka tersalin apa adanya (e2e). *Bukti: e2e "salinan terjemahan tetap berlabel AI" dan "teks Arab yang dibuka tersalin apa adanya (tanpa label tombol)" (desktop).*
- [x] Kartu Cari menampilkan terjemahan dulu; kutipan Maknaz terbuka (e2e/unit). *Bukti: e2e "mode Terjemahan di Cari: terjemahan lebih dulu"; unit `hitParts` + `CitationCard` (`<details open>` hanya di `tr`, Arab selalu tampil); e2e menu ⋮ /tanya; tangkapan 17–18.*
- [x] axe lolos di mode Terjemahan (terlipat dan terbuka), termasuk urutan heading. *Bukti: `a11y.spec` "mode Terjemahan, terlipat dan terbuka (j1/200)": 0 pelanggaran desktop + ponsel (aturan heading-order axe ikut).*
- [x] LCP ponsel j1/200 di mode Terjemahan ≤ 4,29 dtk (Preview, n=5). *Bukti: Preview #127, Lighthouse 13.5.0 ponsel n=5 (mesin Linux agen): j1/200 Terjemahan **3,70 dtk** (2,58–4,41), Keduanya 3,74 dtk; j3/202 Terjemahan 3,82 dtk, Keduanya 2,88 dtk.*
- [x] Peninjau, ADR, STATUS, LOG, file ini. *Bukti: lihat butir peninjau bagian A; ADR-091 §10–11.*

## Di luar cakupan

Implementasi bahasa Inggris (rute `/en`, parameter `lang` di core/MCP/API, data terjemahan Inggris), font Arab pilihan pembaca untuk Cari/Maknaz, akun/sinkron preferensi, tombol daftar isi di kepala ringkas ponsel, label chevron React Aria berbahasa Inggris.

## Catatan hasil

*2026-10-24 · bagian A (ADR-091, ADR-092):*
- **Dibuat:**
  - Preferensi `surau:read-mode` + atribut `data-read-mode` lewat skrip awal; pemindahan sakelar lama di skrip (mode Arab tetap dari memori bila penyimpanan menolak ditulis). Modul bersama `lib/prefs.ts`, `components/read-mode.ts` (`useReadMode`/`setReadMode`), `components/read-mode-segment.tsx`.
  - Penanda `data-no-tr` dan `data-tr-aid`; `lang` dari data (`PAGE_MODEL_VERSION` 6); `UI_LANG`; lencana AI pembaca satu komponen (`ai-badge.tsx`).
  - CSS mode Arab, Dilipat/Berdampingan hanya di Keduanya, grid berdampingan tanpa separuh kosong, syair `container: verse`, cetak.
  - `lib/reader/fold.ts` (buka teks tersembunyi untuk kata cari dan tautan `#…`), `lib/keep-position.ts` (jaga posisi untuk semua perubahan preferensi).
  - Panel Tampilan: Segment Mode baca, pratinjau Arab + terjemahan berlencana (label ikut tinjauan manusia), teks yang berganti ditumpuk (`StableText`), kontrol nonaktif dengan keterangan. Menu ⋮: Mode baca di pembaca, daftar isi karya, Cari.
  - Kartu Cari `hitParts`; kutipan Maknaz membawa `lang`.
  - Dokumen: ADR-091, ADR-092 (+ catatan "sebagian digantikan" di ADR-075), docs/01, docs/07, FASE (X11 + garis besar "Bahasa Inggris").
- **Temuan di lapangan (diperbaiki):**
  - Kotak pratinjau menyusut di lembar ponsel (kolom flex yang bisa digulir) dan memotong lencana AI → `shrink-0`.
  - Ganti mode dari menu ⋮ melempar posisi ±270 px: scroll anchoring Chrome ikut mengoreksi sesudah koreksi kita bila jangkar pilihannya ikut tersembunyi → `overflow-anchor: none` selama dua frame penyesuaian (dihitung per wadah, temuan peninjau).
  - Jangkar paragraf terpotong di atas mendorong paragraf tujuan `#pN` saat kata cari dibuka → jangkar = paragraf pertama yang mulai di bawah navbar.
  - Klik alat uji pada tombol navbar menggulir halaman (scrollIntoView ke tengah) → e2e mengukur sesudah menu terbuka dan memilih lewat event DOM.
- **Peninjau** (`git diff origin/main...HEAD`): 1 blocker (nama baris daftar isi di mode Arab masih judul Indonesia/AI tanpa label → kini judul Arab), 4 perbaikan (jaga posisi kartu Cari lewat `flushSync`, `overflow-anchor` tertinggal `none` saat perubahan beruntun, fragmen URL rusak, jarak pratinjau di mode Arab) dan 9 saran; semua perbaikan + 6 saran dikerjakan. Saran yang dicatat sebagai batas: ringkasan AI tidak disorot kata cari (ADR-091 §4).
- **Penyimpangan rencana:** menu ⋮ di /tanya belum ditambahkan di bagian A karena mode Arab/Keduanya tidak mengubah kartu kutipan Maknaz; ditambahkan di bagian B bersama mode Terjemahan.
- **e2e lokal (`pnpm dev:remote`, korpus staging):** `reader-x11` 23 lolos/1 dilewati; `a11y`, `reader-x04`, `reader-x10`, `search`, `reader`: 159 lolos dalam satu putaran gabungan, 4 gagal karena waktu (render halaman lewat D1 jarak jauh 4,6–5,6 dtk saat paralel > batas tunggu 5 dtk; navigasi di browser normal, uji label lolos saat diulang). Dibuktikan ulang di e2e Preview PR.

*2026-10-24 · bagian B (ADR-091 §10–11):*
- **Dibuat:**
  - Mode Terjemahan: baris alat `passage-tools` (tombol "Teks Arab" `aria-controls=ar-pN` + ⋮ `TrPassageActions` yang hanya dirender klien di mode ini), blok `passage-ar` dilipat (`data-ar-open`), subjudul tidak dilipat, keterangan paragraf tanpa terjemahan, judul "kicker" hanya bila ada terjemahan, kalimat tambahan catatan AI, cetak menampilkan Arab.
  - `fold.ts` `toggleArabic`/`revealArabic`; `#pN`, kata cari Arab, dan tautan balik catatan kaki membuka Arab paragrafnya; penyorot memeriksa tiap kecocokan (satu pembukaan per paragraf).
  - Penanda catatan kaki di terjemahan = `FootnoteMarker` (takhrij dibuka di tempat, semua mode); props takhrij dan ⋮ dihitung sekali per halaman.
  - Cari: terjemahan dulu (`hitParts`); Maknaz: `CitationCard` menerima mode baca, terjemahan terbuka di `tr`; menu ⋮ /tanya.
  - Panel: tiga pilihan, varian `tr` di `StableText`, pratinjau tanpa garis tepi di mode Terjemahan.
- **Peninjau** (bagian B): 0 blocker, 6 perbaikan (`#pN` belum membuka Arab, penanda terjemahan terlalu kecil ±8 px, gaya judul redup ikut judul tanpa terjemahan, tes judul/subjudul tidak dilipat, e2e salin Arab, kutipan Maknaz tidak teruji) + saran; semua perbaikan dan 8 saran dikerjakan. Dicatat sebagai batas (ADR-091 §10): subjudul `tail`, tombol lipat butuh JS, ukuran judul disamakan.
- **e2e lokal** (`pnpm dev:remote`, `--workers=2`): `reader-x11` + `a11y` + `reader` 137 lolos (1 balapan sorotan diperbaiki → `reader-x11` diulang 2×: 68 lolos); pembaca lama 78 lolos. CI PR #126: e2e Preview 209 lolos, 1 rapuh (klik ⋮ sebelum menu tertutup; diperbaiki di bagian B).
- **LCP** (Lighthouse 13.5.0 ponsel lewat Puppeteer supaya mode baca bisa diisi di localStorage; cache HTTP dikosongkan tiap putaran; mesin Linux agen, bukan Mac X09/X10): Preview #127 j1/200 Keduanya 3,74 / Terjemahan 3,70 dtk, j3/202 2,88 / 3,82 dtk; produksi sesudah bagian A 4,41–4,86 dtk (j1/200) dengan sebaran 3,30–5,13 dtk. Sebaran antarputaran (±1 dtk) lebih besar dari selisih antarmode; HTML/CSS/JS sama untuk semua mode (CSS yang memilih).
- **Utang / pesan untuk sesi berikutnya:**
  - Ukur ulang LCP produksi di Mac pemilik (cara X09/X10) supaya sebanding dengan angka lama.
  - Ringkasan AI belum disorot kata cari (ADR-091 §4; dikerjakan di [X14](X14-lanjutan-mode-baca.md), ADR-095); halaman yang seluruhnya belum diterjemahkan menampilkan keterangan per paragraf (pertimbangkan satu catatan halaman saat kitab kedua masuk).
  - Bahasa Inggris: ikuti daftar ADR-092 §5 (belum dijadwalkan).