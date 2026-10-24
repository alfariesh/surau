# X11 · Sesi sisipan: Mode baca (Arab · Keduanya · Terjemahan) + fondasi bahasa

> **Fase:** sisipan (hanya `apps/web` + dokumen; tidak menyentuh `apps/api`, `apps/mcp`, `packages/*`, maupun korpus) · **Status:** berjalan
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

- [ ] `pnpm verify` lolos, termasuk tes unit baru: skrip preferensi (kunci baru, cadangan lama, nilai salah, storage galat), penanda markup `PageText`, helper kartu Cari.
- [ ] Preferensi `read-mode=ar` dan nilai lama `reader-translation=0` terpasang di `<html>` walau semua chunk JS Next diblokir, dan bantuan terjemahan tersembunyi (e2e).
- [ ] Pilihan Mode baca dari panel dan menu ⋮ bertahan sesudah muat ulang; halaman sambungan ikut mode; posisi gulir bergeser ≤ 2 px saat mode diganti (e2e).
- [ ] Berdampingan: paragraf tanpa terjemahan selebar penuh, mode Arab tanpa grid (e2e, tes regresi).
- [ ] `?q=` Indonesia di mode Arab dan di Keduanya + Dilipat: kata tersorot terlihat (e2e, tes regresi).
- [ ] Mode Arab menyembunyikan Ringkasan AI, catatan AI, kaki AI, dan judul Indonesia di daftar isi dan kepala halaman (e2e, tes regresi).
- [ ] Kartu Cari di mode Arab hanya menampilkan terjemahan bila jalur terjemahan cocok (unit + e2e).
- [ ] axe lolos untuk mode Arab dan Keduanya di ketiga tata letak, dengan panel terbuka.
- [ ] LCP ponsel (Lighthouse, n=5) j1/200 tetap ≤ 4,29 dtk di Preview.
- [ ] Tangkapan layar desktop, ponsel, dan gelap per mode dilampirkan di PR.
- [ ] Teks Arab tetap dari DB (tidak ada string Arab baru di diff selain data tes).
- [ ] Peninjau dijalankan dan temuannya dikerjakan; ADR, STATUS, LOG, FASE, docs, dan file ini diperbarui.

### Bagian B

- [ ] `pnpm verify` lolos; tes unit tombol Arab (hanya bila ada terjemahan, `aria-controls` cocok, judul tidak pernah dilipat).
- [ ] Mode Terjemahan: Arab tiap paragraf terlipat dan terbuka per paragraf; ⋮ tetap terjangkau; paragraf tanpa terjemahan menampilkan Arab (e2e).
- [ ] Tautan `#pN`, kecocokan Arab `?q=`, dan tautan balik catatan kaki membuka Arab yang terlipat (e2e).
- [ ] Salin: terjemahan tetap berlabel, Arab yang dibuka tersalin apa adanya (e2e).
- [ ] Kartu Cari menampilkan terjemahan dulu; kutipan Maknaz terbuka (e2e/unit).
- [ ] axe lolos di mode Terjemahan (terlipat dan terbuka), termasuk urutan heading.
- [ ] LCP ponsel j1/200 di mode Terjemahan ≤ 4,29 dtk (Preview, n=5).
- [ ] Peninjau, ADR, STATUS, LOG, file ini.

## Di luar cakupan

Implementasi bahasa Inggris (rute `/en`, parameter `lang` di core/MCP/API, data terjemahan Inggris), font Arab pilihan pembaca untuk Cari/Maknaz, akun/sinkron preferensi, tombol daftar isi di kepala ringkas ponsel, label chevron React Aria berbahasa Inggris.

## Catatan hasil

*(diisi agent di akhir setiap bagian)*
