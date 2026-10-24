# X14 · Sesi sisipan: Lanjutan mode baca (mudah ditemukan, ringkasan ikut kata cari, ukur LCP di repo)

> **Fase:** sisipan (hanya `apps/web`, `scripts/`, dan dokumen) · **Status:** berjalan
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

- [ ] `pnpm verify` lolos, termasuk tes unit skrip awal (petunjuk tampil/tersembunyi menurut mode tersimpan dan penutupan) dan ringkasan satu DOM.
- [ ] Petunjuk tampil bagi pengunjung baru walau JS Next diblokir, tersembunyi sebelum tampil bila mode tersimpan atau sudah ditutup, dan pilihan di dalamnya mengganti mode tanpa menggeser paragraf yang dibaca (≤ 2 px) (e2e).
- [ ] Kata cari Indonesia yang cocok di Ringkasan AI tersorot di mode Keduanya; di mode Arab ringkasannya dibuka sementara lalu bisa ditutup lagi (e2e, tes regresi).
- [ ] axe lolos dengan petunjuk tampil dan dengan ringkasan yang dibuka sementara.
- [ ] `pnpm ukur:lcp` berjalan dari repo bersih; angka acuan produksi (pengunjung baru, Arab, Keduanya, Terjemahan) dan nama mesin tercatat.
- [ ] LCP ponsel j1/200 di Preview tidak lebih buruk dari acuan produksi di mesin yang sama melebihi sebaran antarputaran.
- [ ] Tangkapan layar ponsel, desktop, dan gelap dilampirkan di PR.
- [ ] Teks Arab tetap dari DB (tidak ada string Arab baru di diff selain data tes).
- [ ] Peninjau dijalankan dan temuannya dikerjakan; ADR, STATUS, LOG, FASE, dan file ini diperbarui.

## Di luar cakupan

Petunjuk di Cari/Maknaz/daftar isi (mode di sana mengikuti pilihan yang sama dan ada di menu ⋮), tombol mode di toolbar, mode per kitab, akun/sinkron preferensi, ukur LCP di Mac pemilik.

## Catatan hasil

*(diisi di akhir sesi)*
