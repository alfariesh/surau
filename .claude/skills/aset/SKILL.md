---
name: aset
description: Buat aset visual Surau yang interaktif dan seragam gayanya, yaitu ilustrasi isometrik garis tipis dengan satu aksen Zaitun yang menyala pada bagian yang "hidup" (mesin turunan iso-glow, warna langsung dari globals.css situs). Hasilnya satu file HTML yang bisa ditekan dan disematkan di situs, ditambah WebP/JPG diam untuk cover dan konten. Pakai untuk ilustrasi landing page atau beranda, cover blog/Open Graph, gambar dan konten media sosial, ilustrasi "cara kerja", atau aset visual lain; juga saat pemilik menyebut "aset", "ilustrasi", "cover", "gambar landing", atau "iso-glow".
argument-hint: "[benda/adegan] [untuk: situs | cover | konten]"
---

# Aset visual Surau: $ARGUMENTS

Semua aset visual Surau memakai **satu mesin dan satu gaya**: gambar isometrik bergaris tipis, warna netral situs, dan **satu aksen Zaitun hanya pada yang hidup**, misalnya baris yang dikutip, jilid yang dirujuk, atau kabel yang sedang menelusuri. Gaya ini dipilih pemilik setelah membandingkannya dengan Colorfigures (ADR-054). Mesinnya ada di `mesin/iso.js`, turunan iso-glow (MIT). Mesin ini membaca token warna langsung dari `apps/web/src/app/globals.css` saat dibangun, mendukung tema terang/gelap/sepia dan "kurangi gerakan", serta memakai teks UI berbahasa Indonesia. Di situs, aset bisa ditekan. Di tempat yang hanya menerima gambar (OG, media sosial), dipakai WebP/JPG yang dipotret dari file yang sama.

## Aturan Surau (keras, tidak bisa ditawar)

1. **Tidak ada huruf Arab di aset**: tidak ada kaligrafi, ayat, basmalah, judul kitab Arab, atau hiasan berbentuk huruf (aturan keras 1; `.claude/rules/teks-arab.md`). Baris teks digambar sebagai **garis polos**. Teks Arab asli hanya tampil di halaman situs lewat `ArabicText` dari DB.
2. **Tidak ada wajah atau sosok manusia**, termasuk ulama, santri, dan tangan (docs/05 §2–3). Hindari juga makhluk bernyawa lain. Yang digambar adalah benda dan tempat.
3. **Tidak ada klaim palsu.** Angka di label (misalnya "JILID 2 · HLM 214") hanya contoh ilustrasi, tanpa nama kitab atau ulama. Jangan pernah menggabungkan nama karya nyata dengan alamat karangan. Gunakan bahasa atribusi, bukan fatwa ("MENURUT PENULIS", bukan "HUKUMNYA").
4. **Label dan tombol memakai bahasa Indonesia** yang awam dan singkat. Tombol berupa kata kerja ("Salin", "Telusuri"); label di gambar memakai huruf Latin kapital.
5. **Warna hanya dari token**: `.face`, `.top`, `.recess`, `.kayu`, `.detail`, `.wire`, `.nyala`, `.hot`, `.tag`, dan sejenisnya (lihat `REFERENSI.md`). **Jangan menulis hex atau oklch di figur.** Warna baru ditambahkan ke `CSS_DASAR` di `mesin/iso.js` sebagai turunan token situs.
6. **Aksen hanya untuk yang hidup.** Satu atau dua hal menyala per keadaan, selebihnya netral. Bila semuanya menyala, tidak ada yang menonjol.
7. **Tanpa permintaan ke luar.** File aset tidak memuat apa pun dari internet; font Plus Jakarta Sans disajikan sendiri dari `/aset/fonts/` (OFL). Kredit iso-glow/iso-figure (MIT) ada di komentar mesin, di setiap keluaran, dan di `/lisensi#ilustrasi`. Jangan hapus.
8. **Ikuti proses nyata.** Kitab Arab dibaca dari kanan ke kiri, jadi halaman dibalik dari kiri ke kanan pembaca (`kitab-rehal`). Sebelum menggambar, tulis urutan nyatanya di komentar figur.

## Benda yang cocok

Kitab (terbuka/tertutup, bertumpuk), rehal, rak dan jilid, kartu kutipan, kabel penelusuran, lampu pelita, pena dan dawat, kotak kartu katalog, kaca pembesar, timbangan ("menimbang sumber"), dan bangunan surau kecil. Untuk "cara kerja" (pertanyaan → pencarian → halaman kitab), pakai kabel dengan denyut (`.pulse`) dan label.

## Alur kerja

1. **Baca dulu:** `REFERENSI.md` (kernel, kelas, kontrak `mountFigure`, pelajaran) dan satu contoh terdekat di `aset/figur/`. `prinsip-*.html` adalah figur kecil untuk kartu; `kitab-rehal.html` memuat kotak miring (`obox`), prisma (`prism`), lembar yang dibalik, dan sampul yang menutup. Contoh asli iso-glow ada di `contoh/`, untuk teknik saja.
2. **Tulis** `aset/figur/<nama>.html` (kebab-case bahasa Indonesia):
   - Muat mesin dengan `<script src="../../.claude/skills/aset/mesin/iso.js"></script>`.
   - Tulis satu `<script>` yang memanggil `mountFigure({ id, title, hint, alt, tombol, ulang, mount })`.
   - `mount` mengembalikan `{ render, demo, akhir, key }`: `render` menggambar ulang, `demo` adalah urutan singkat yang diputar otomatis, dan `akhir` adalah keadaan akhir untuk "kurangi gerakan", cover, dan polos.
3. **Potret dan perbaiki**, maksimal dua putaran. Sumber dibangun otomatis, jadi tidak perlu bangun dulu:
   ```bash
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/terang --format png --query "gerak=0"
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/gelap --format png --query "tema=gelap&gerak=0"
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/kartu --format png --query "sematan=1&gerak=0" --lebar 240 --tinggi 180 --skala 2
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/tombol --format png --query "demo=0&press=Salin@200" --tunggu 2200
   ```
   Skrip keluar dengan kode 2 bila ada galat skrip, berkas gagal dimuat, figur kosong, atau `NaN`. Lihat gambarnya seperti orang asing:
   - Adakah bagian yang melayang, saling tumpang tindih, atau terpotong bingkai?
   - Apakah label terbaca di ukuran kartu?
   - Apakah yang menyala hanya yang hidup?

   Coba juga tombol yang ditekan di luar urutan; harus muncul pesan, tidak boleh diam.
4. **Bangun:** `node .claude/skills/aset/skrip/bangun.mjs aset/figur/<nama>.html` menghasilkan `aset/keluaran/<nama>.html`. Tambahkan `--situs` untuk aset yang tampil di situs: salinannya masuk ke `apps/web/public/aset/`.
5. **Kirim tangkapan layar ke pemilik** (terang, gelap, ponsel) sebelum aset baru dipasang di halaman situs. Kalau aset sudah dipasang di PR, tautkan juga preview PR.

## Keluaran per kebutuhan

| Kebutuhan | Cara | Hasil |
|---|---|---|
| **Situs** (beranda, landing, artikel) | `bangun.mjs … --situs`, lalu `<AsetSemat nama="<nama>" title="Ilustrasi interaktif: …" />` (`apps/web/src/components/aset/aset-semat.tsx`) | iframe `sandbox="allow-scripts"`, rasio 4:3, lazy, tema mengikuti situs lewat postMessage, latar transparan |
| **Cover blog / Open Graph** | `potret.mjs … <keluar> --format webp,jpg --query "sampul=1&kecil=Blog%20Surau&judul=<judul>"` | 1200×630. **JPG untuk `og:image`** (pasti tampil di WhatsApp, Facebook, LinkedIn), **WebP untuk di dalam situs** (±25–35 KiB) |
| **Konten media sosial** (diam) | `potret.mjs … --format webp --query "polos=1[&tema=gelap]" --lebar 1080 --tinggi 1080 --skala 1` | Persegi tanpa tombol; gelap lebih "menyala" |
| **Gambar di halaman situs** (diam) | `--format webp` | Jangan PNG: di Workers gambar tidak dioptimasi ulang (ADR-003) |

Parameter bawaan mesin: `?tema=terang|gelap|sepia` (bawaan mengikuti sistem), `?sematan=1`, `?polos=1`, `?sampul=1&judul=…&kecil=…` (teks lewat `textContent`, aman dari sisipan HTML), `?gerak=0`, `?demo=0`, dan `?press=Label@ms,…` (uji). Figur boleh membaca parameternya sendiri untuk memotret keadaan tertentu (contoh: `?tutup=1`, `?balik=0.5`); nilai bukan angka wajib diabaikan (`Number.isFinite`).

**Penyajian di situs** (sudah terpasang sejak beranda memakai tiga figur prinsip):
- Header `/aset/*` ditulis di `apps/web/public/_headers`, karena Static Assets tidak melewati Worker: `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`, `nosniff`, dan CORS untuk font (iframe sandbox berorigin "null"). `next.config.ts` memuat aturan yang sama untuk `next dev`.
- Uji e2e `smoke.spec.ts` memeriksa iframe, tombol di dalamnya, dan header.
- Saat CSP penuh situs dipasang, `/aset/*` butuh CSP sendiri karena skrip dan gaya aset inline.

## Mutu yang wajib

- **Aksesibilitas:** `alt` menjelaskan isi gambar; iframe punya `title` "Ilustrasi interaktif: …"; tombol adalah `<button>` asli; `api.readout` mengumumkan perubahan keadaan (`role="status"`). "Kurangi gerakan" menampilkan `akhir()` tanpa animasi. Animasi hanya lewat `api.anim`, jangan memakai `requestAnimationFrame` sendiri.
- **Setiap tekanan menghasilkan sesuatu:** aksi, atau `api.readout('…')` yang menjelaskan kenapa belum bisa, termasuk saat animasi masih berjalan.
- **Terbaca di kartu kecil:** label memakai `api.tag` (huruf ±9 px di layar, pil dijaga di dalam bingkai). Uji di lebar 240 px.
- **Ukuran:** HTML ±30–40 KiB, tanpa gambar raster di dalamnya.
- **Demo otomatis** hanya saat terlihat dan belum disentuh (`ulang` ms); berhenti begitu pengunjung menekan sesuatu.

## Selesai bila

- [ ] `potret.mjs` keluar dengan kode 0 untuk keadaan terang, gelap, kartu 240 px, dan urutan tombol.
- [ ] Tidak ada huruf Arab, wajah, sosok, atau alamat karangan yang disandingkan dengan nama karya nyata (periksa gambar, bukan hanya kode).
- [ ] `aset/keluaran/` (dan `apps/web/public/aset/` bila `--situs`) dibangun ulang dari sumber terbaru; gambar diam berformat WebP (JPG hanya untuk OG).
- [ ] Tangkapan layar dikirim ke pemilik; bila dipasang di situs, preview PR dan e2e hijau.
