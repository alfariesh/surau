# X14 · Sesi sisipan: Lanjutan mode baca (mudah ditemukan, ringkasan ikut kata cari, ukur LCP di repo)

> **Fase:** sisipan (hanya `apps/web`, `scripts/`, dan dokumen) · **Status:** selesai (2026-10-24, PR #130, ADR-094)
> **Prasyarat:** X11 selesai (PR #126 + #127, ADR-091–092) · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent · $0 LLM · tanpa korpus baru · satu PR

## Tujuan

Pembaca baru tahu bahwa ia bisa memilih Arab, Keduanya, atau Terjemahan. Kata cari juga tersorot di Ringkasan AI, termasuk di mode Arab. Cara mengukur LCP per mode baca tersimpan di repo sebagai satu perintah, dengan angka acuan produksi.

## Kenapa sesi ini ada

Sesudah X11 tersisa tiga hal:
1. Pilihan mode hanya ada di menu ⋮ dan panel Tampilan, jadi sulit ditemukan pembaca baru.
2. Ringkasan AI tidak disorot kata cari, dan di mode Arab ringkasan tersembunyi. Hasil Cari yang cocok hanya lewat ringkasan mendarat di halaman tanpa jejak kata itu (batas ADR-091 §4).
3. Skrip ukur LCP per mode (Lighthouse lewat Puppeteer) hanya ada di folder sementara agen.

**Jawaban pemilik (2026-10-24, pertanyaan pilihan):** petunjuk sekali tampil di halaman baca bagi pengunjung yang belum memilih mode, berisi tiga pilihan mode, bisa ditutup, dan diingat per browser. Pilihan lain yang tidak dipilih: tombol mode di kartu catatan AI dan tombol mode di toolbar baca.

## Baca dulu (hanya ini)

- [X11](X11-mode-baca.md), khususnya *Catatan hasil*; ADR-091 dan ADR-092 di [KEPUTUSAN.md](../KEPUTUSAN.md)
- `apps/web/CLAUDE.md`, `.claude/rules/teks-arab.md` (aturan 8: label AI)

## Langkah

1. **Petunjuk mode baca.**
   - Kartu "Pilih cara membaca" di awal teks halaman baca (di atas catatan AI). Isinya Segment mode baca dan penjelasan mode terpilih (tinggi tetap, `StableText`).
   - Terpasang lewat skrip awal: tanpa mode tersimpan dan belum ditutup → tampil. Selain itu `data-read-mode-hint="off"` disembunyikan CSS sebelum tampil, jadi tidak ada geser tata letak.
   - Memilih mode di halaman ini tidak menutup kartu, supaya isi tidak melompat. Di halaman berikutnya kartu tidak muncul lagi karena mode sudah tersimpan.
   - Catatan AI dan lencana per paragraf tidak berubah (aturan 8).
2. **Ringkasan AI ikut kata cari.**
   - Penyorot juga mencari di teks ringkasan (`[data-tr-seg="summary"]`).
   - Ringkasan memakai satu DOM untuk keadaan terpotong dan terbuka, jadi sorotan tidak hilang saat dibuka. Kecocokan di bagian yang terpotong membuka ringkasannya.
   - Di mode Arab, ringkasan yang cocok dibuka sementara (`data-tr-peek`) dengan tombol untuk menutupnya lagi. Batas ADR-091 §4 dihapus.
3. **Ukur LCP di repo.** `scripts/ukur-lcp.mjs` + `pnpm ukur:lcp <base> <mode,...> <n>`. Lighthouse dan Puppeteer dipasang di cache pengguna (bukan dependensi repo). Hasilnya median, sebaran, nama mesin, dan versi Chrome/Lighthouse. Angka acuan produksi untuk ketiga mode + pengunjung baru dicatat di sini.
4. Tes unit + e2e, `pnpm verify`, tangkapan layar ponsel/desktop/gelap, peninjau, ADR, STATUS/LOG/FASE, PR, merge.

## Selesai bila

- [x] `pnpm verify` lolos, termasuk tes unit skrip awal (petunjuk tampil/tersembunyi menurut mode tersimpan dan penutupan) dan ringkasan satu DOM. *Bukti: `pnpm check` + build lolos; tes unit 851 lolos. Satu tes yang tidak tersentuh diff (`translation-review` "simpanan ke-201", 200 tulisan DB) melewati batas 5 dtk tipis (5,05 dtk) saat mesin agen ber-load 28 karena sesi lain; tes itu lolos di CI PR #130. Tes baru: `scale.test.ts` petunjuk (4), `page-text.test.tsx` ringkasan satu DOM (1).*
- [x] Petunjuk tampil bagi pengunjung baru walau JS Next diblokir, tersembunyi sebelum tampil bila mode tersimpan atau sudah ditutup, dan pilihan di dalamnya mengganti mode tanpa menggeser paragraf yang dibaca (≤ 2 px) (e2e). *Bukti: e2e `reader-x14`: "petunjuk tampil … walau JS Next tidak dimuat", "memilih mode di petunjuk … ≤ 2 px; tinggi petunjuk tetap", "memilih Keduanya/Arab … navigasi lunak dan muat ulang tanpa petunjuk" (regresi temuan peninjau; terbukti merah bila perbaikannya dimatikan), "tutup petunjuk". Desktop + ponsel, lokal dan CI Preview.*
- [x] Kata cari Indonesia yang cocok di Ringkasan AI tersorot di mode Keduanya; di mode Arab ringkasannya dibuka sementara lalu bisa ditutup lagi (e2e, tes regresi). *Bukti: e2e `reader-x14` "kata cari di Ringkasan AI tersorot; ringkasan terpotong dibuka", "mode Arab: Ringkasan AI … dibuka sementara lalu bisa disembunyikan lagi" (fokus tidak jatuh ke body), "mode Arab tanpa kata cari: tetap tersembunyi"; tangkapan 06–08.*
- [x] axe lolos dengan petunjuk tampil dan dengan ringkasan yang dibuka sementara. *Bukti: `a11y.spec` halaman `/kitab/ihya/1/200` tanpa mode tersimpan (petunjuk tampil, terang + gelap) dan "mode Arab + Ringkasan AI dibuka kata cari": 0 pelanggaran, CI Preview PR #130.*
- [x] `pnpm ukur:lcp` berjalan dari repo bersih; angka acuan produksi (pengunjung baru, Arab, Keduanya, Terjemahan) dan nama mesin tercatat. *Bukti: pemasangan pertama ke `~/.cache/surau/ukur-lcp` lalu ukur; tabel di Catatan hasil.*
- [x] LCP ponsel j1/200 di Preview tidak lebih buruk dari acuan produksi di mesin yang sama melebihi sebaran antarputaran. *Bukti: Preview PR #130 j1/200 pengunjung baru 3,96 dtk (produksi 4,19), Keduanya 3,31 (4,42), Terjemahan 3,16 (3,48), Arab 3,97 (2,88; sebaran Preview 2,57–4,85 menutupi angka produksi).*
- [x] Tangkapan layar ponsel, desktop, dan gelap dilampirkan di PR. *Bukti: `bukti/X14/01`–`08`.*
- [x] Teks Arab tetap dari DB (tidak ada string Arab baru di diff selain data tes). *Bukti: peninjau (grep diff) — tidak ada string Arab baru.*
- [x] Peninjau dijalankan dan temuannya dikerjakan; ADR, STATUS, LOG, FASE, dan file ini diperbarui. *Bukti: peninjau 0 blocker, 5 perbaikan + 3 saran, semuanya dikerjakan (lihat Catatan hasil); ADR-094, FASE, STATUS, LOG.*

## Di luar cakupan

Petunjuk di Cari/Maknaz/daftar isi (mode di sana mengikuti pilihan yang sama dan ada di menu ⋮), tombol mode di toolbar, mode per kitab, akun/sinkron preferensi, ukur LCP di Mac pemilik.

## Catatan hasil

*2026-10-24 · ADR-094:*
- **Nomor:** sesi ini mula-mula X13/ADR-093, tetapi sesi "Mutu Jawab" masuk `main` lebih dulu dengan nomor yang sama (PR #131), jadi sesi ini dinomori ulang menjadi X14/ADR-094 saat menggabungkan `main`. X12 kosong.
- **Dibuat:**
  - Petunjuk mode baca `read-mode-hint.tsx` (Alert + Segment + penjelasan setinggi tetap) di atas catatan AI. Atribut `data-read-mode-hint="off"` dari skrip awal, diulang di `useLayoutEffect` untuk navigasi lunak. Keduanya yang sudah aktif tetap tersimpan saat ditekan (`ReadModeSegment onPick`).
  - `StableText` dipindah ke `components/stable-text.tsx`.
  - Ringkasan AI satu DOM (`data-expanded`), `SUMMARY_OPEN_EVENT`, `revealFor` untuk ringkasan, tombol "Sembunyikan lagi ringkasan AI ini" (fokus pindah ke paragraf di atasnya), penyorot mencocokkan `[data-tr-seg="summary"]`. Penjelasan mode Arab disesuaikan.
  - `scripts/ukur-lcp.mjs` + `pnpm ukur:lcp`: Lighthouse 13.5.0 + puppeteer-core 25.14.0 dipasang `--ignore-scripts --before=2026-10-17` di cache pengguna. Mencetak model mesin (DMI/hw.model, bukan hostname).
- **Peninjau** (0 blocker, 5 perbaikan, 3 saran, semua dikerjakan):
  - petunjuk muncul lagi sesudah navigasi lunak (skrip awal tidak jalan ulang);
  - "Keduanya" tidak tersimpan (pilihan aktif tidak memicu perubahan);
  - e2e posisi ≤ 2 px di posisi gulir 0 tidak mungkin lolos saat mode Arab menyembunyikan catatan AI (kini menggulir dulu seperti X11; tinggi petunjuk diukur terpisah);
  - fokus hilang saat ringkasan disembunyikan;
  - pemasangan npm tanpa batas umur/postinstall;
  - saran: hostname, tombol tercetak, teks penjelasan mode Arab.
- **e2e:** CI Preview PR #130 (sebelum perbaikan peninjau) 237 lolos; hanya tes posisi versi lama yang gagal (sesuai temuan peninjau). Sesudah perbaikan, CI hijau. Lokal (`pnpm dev:remote`, mesin sibuk): `reader-x14` 16/16 lolos. Tujuh tes lama (X10 label, X11 kata cari Arab, reader navigasi, search kueri Arab) gagal lokal karena batas tunggu 5 dtk di D1 jarak jauh, dan lolos di CI Preview. Penyorot dicek manual: 8 sorotan, Arab dibuka.
- **LCP ponsel** (Lighthouse 13.5.0, simulasi Lantern, n=5, cache HTTP dikosongkan, pemanasan ISR; mesin ASUS Vivobook M7600QE, AMD Ryzen 9 5900HX 16 utas, 15 GiB, Linux, Chromium Playwright 156.0.8078.4). Median (sebaran) dalam detik:

  | Jalur | Mode | Produksi sebelum X14 (acuan) | Preview PR #130 |
  |---|---|---|---|
  | j1/200 | pengunjung baru | 4,19 (3,08–4,80) | 3,96 (3,27–4,67) |
  | j1/200 | Arab | 2,88 (2,73–3,81) | 3,97 (2,57–4,85) |
  | j1/200 | Keduanya | 4,42 (3,71–5,42) | 3,31 (2,56–4,12) |
  | j1/200 | Terjemahan | 3,48 (2,72–5,02) | 3,16 (2,76–4,05) |
  | j3/202 | pengunjung baru | 3,15 (2,74–4,42) | 2,80 (2,60–4,42) |
  | j3/202 | Arab | 3,52 (2,65–3,92) | 2,63 (2,49–3,70) |
  | j3/202 | Keduanya | 3,54 (3,47–4,59) | 3,96 (2,44–4,69) |
  | j3/202 | Terjemahan | 3,44 (2,71–4,43) | 2,90 (2,47–4,87) |

  Sebaran antarputaran (±1 dtk) lebih besar dari selisih antarmode maupun antara Preview dan produksi. Mesin agen juga dipakai sesi lain (load ±25), jadi angka ini acuan kasar. Untuk perbandingan sebelum/sesudah, ukur keduanya di jendela waktu yang sama.
- **Utang / pesan untuk sesi berikutnya:**
  - Ukur ulang di Mac pemilik (`pnpm ukur:lcp https://surau.org`, cara X09/X10) supaya sebanding dengan angka lama.
  - Petunjuk serupa di Cari/Maknaz belum ada (pilihan tetap di menu ⋮).
  - Tes `translation-review` "simpanan ke-201" rapuh di mesin sibuk (5 dtk). Pertimbangkan batas waktu sendiri.
