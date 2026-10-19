---
name: aset
description: Buat aset visual Surau yang interaktif dan seragam gayanya, yaitu ilustrasi isometrik bergaya tinta tangan dengan warna datar (mesin Colorfigures yang dikunci ke palet Zaitun Surau). Hasilnya satu file HTML yang bisa ditekan, ditambah PNG diam bila perlu. Pakai untuk ilustrasi landing page, cover blog atau Open Graph, gambar konten media sosial, ilustrasi "cara kerja", atau aset visual lain; juga saat pemilik menyebut "aset", "ilustrasi", "cover", "gambar landing", atau "Colorfigures".
argument-hint: "[benda/adegan] [untuk: landing | cover | konten]"
---

# Aset visual Surau: $ARGUMENTS

Semua aset visual Surau memakai **satu mesin dan satu gaya**: benda isometrik dengan tinta tangan, tiga tingkat bayangan warna datar, bayangan jatuh, dan latar kertas. Mesinnya turunan Colorfigures (MIT) dan sudah dikunci ke identitas Surau di `mesin/core.js`, meliputi palet, font, tema terang/gelap/sepia, teks UI berbahasa Indonesia, dan pengaturan "kurangi gerakan". Tujuannya agar aset tidak sekadar gambar diam: di situs, aset bisa ditekan, sedangkan di tempat yang hanya menerima gambar (OG, media sosial), PNG-nya dipotret dari file yang sama.

## Aturan Surau (keras, tidak bisa ditawar)

1. **Tidak ada huruf Arab di aset.** Tidak boleh ada kaligrafi, ayat, basmalah, judul kitab Arab, atau "hiasan" berbentuk huruf (aturan keras 1; `.claude/rules/teks-arab.md`). Baris teks di halaman kitab digambar sebagai **garis polos**. Teks Arab asli hanya boleh tampil di halaman situs lewat `ArabicText` dari DB, bukan di dalam figur.
2. **Tidak ada wajah atau sosok manusia**, termasuk ulama, santri, dan tangan (docs/05 §2–3). Agar aman, hindari juga makhluk bernyawa lain. Yang digambar adalah benda dan tempat.
3. **Label dan tombol memakai bahasa Indonesia**, awam, dan singkat; tombol berupa kata kerja (misalnya "Buka kitab" atau "Balik halaman").
4. **Warna hanya dari palet mesin**: `PALS.zaitun` (aksen Surau), `kayu`, `tanah`, `nila`, `emas` (ornamen), `KERTAS`, `METAL`, `CERAMIC`, `DARK`, `BOARD`/`WOOD`. Bila butuh warna baru, tambahkan ke `PALS` di `mesin/core.js` (berlaku untuk semua aset) dan catat alasannya. Jangan menulis hex lepas di figur, kecuali warna teks garis halaman dan bingkai seperti di contoh.
5. **Tanpa permintaan ke luar.** File HTML aset tidak memuat font, gambar, atau skrip dari internet. Hanya `skrip/potret.mjs` yang boleh memuat font situs dari Google Fonts saat memotret.
6. **Kredit tetap ada.** Komentar lisensi MIT di `mesin/core.js` ikut tersisip ke setiap file hasil dan tidak boleh dihapus. Saat aset pertama kali tampil di situs, tambahkan kredit Colorfigures (April Zhu, MIT) di halaman `/lisensi`.
7. **Ikuti proses yang sebenarnya.** Kitab Arab dibaca dari kanan ke kiri, jadi halaman dibalik dari kiri ke kanan pembaca (contoh `kitab-rehal`). Sebelum menggambar, tulis urutan nyatanya di komentar figur.

## Benda yang cocok untuk Surau

Kitab (terbuka/tertutup, bertumpuk), rehal, rak kitab, meja lesehan, lampu pelita atau lentera, pena dan dawat, kotak kartu katalog, kaca pembesar di atas halaman, timbangan (untuk "menimbang sumber"), bedug, dan bangunan surau kayu kecil. Untuk ilustrasi "cara kerja" (misalnya alur dari pertanyaan → pencarian → halaman kitab), gunakan label `tag()` berbahasa Indonesia dan nyalakan label yang sedang aktif.

## Alur kerja

1. **Baca dulu:** `aset/figur/kitab-rehal.html` (contoh Surau: kotak berorientasi bebas `obox`, lembar yang dibalik, sampul yang menutup, `?param` untuk potret), `REFERENSI.md` (kontrak menggambar: koordinat, urutan pelukis, bentuk, pelajaran), dan bila perlu `mesin/core.js` beserta contoh asli di `contoh/`.
2. **Tulis** `aset/figur/<nama>.html` (nama kebab-case bahasa Indonesia). Muat mesin dengan `<script src="../../.claude/skills/aset/mesin/core.js"></script>`, lalu tulis satu `<script>` yang memanggil `mountFigure({...})` dengan `title`, `hint`, `alt` (deskripsi untuk pembaca layar), `buttons`, `acts`, `params`, dan `readout` (status untuk pembaca layar).
3. **Potret dan perbaiki**, maksimal dua putaran:
   ```bash
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/diam.png
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/urutan.png --query "press=Buka@200,Balik@1500" --tunggu 2200
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/gelap.png --query "tema=gelap&sematan=1"
   node .claude/skills/aset/skrip/potret.mjs aset/figur/<nama>.html <scratchpad>/hp.png --lebar 375 --tinggi 560 --skala 1
   ```
   Skrip keluar dengan kode 2 dan mencetak galatnya bila ada error skrip atau `NaN` di SVG. Lihat setiap gambar seperti orang asing melihatnya: adakah bagian yang melayang, garis tinta menembus benda lain, bayangan terlepas, atau bentuk yang tidak mirip aslinya? Coba juga satu tombol yang ditekan di luar urutan; harus muncul pesan, tidak boleh diam.
4. **Bangun** file mandiri: `node .claude/skills/aset/skrip/bangun.mjs aset/figur/<nama>.html` menghasilkan `aset/keluaran/<nama>.html`.
5. **Kirim tangkapan layar ke pemilik** untuk disetujui sebelum aset dipasang di situs. Pemilik adalah desainer, jadi tunjukkan versi terang, gelap, dan ponsel.

## Keluaran per kebutuhan

| Kebutuhan | Cara | Hasil |
|---|---|---|
| **Landing / halaman situs** (interaktif) | `aset/keluaran/<nama>.html` disalin ke `apps/web/public/aset/`, lalu disematkan dengan `<iframe src="/aset/<nama>.html?sematan=1&tema=…" title="…" loading="lazy" style="aspect-ratio:4/3;border:0;width:100%">` | Figur bisa ditekan, latar transparan, mengikuti tema situs |
| **Cover blog / Open Graph** | `potret.mjs … --query "sampul=1&kecil=Blog%20Surau&judul=<judul>"` | PNG 1200×630, judul dengan Plus Jakarta Sans |
| **Konten media sosial** (diam) | `potret.mjs … --query "polos=1&<keadaan>" --lebar 1080 --tinggi 1080 --skala 1` | PNG persegi tanpa tombol |
| **Artikel blog** (interaktif) | Sama seperti landing, di dalam badan artikel | Pembaca bisa mencoba sendiri |

Parameter bawaan mesin: `?tema=terang|gelap|sepia` (bawaan mengikuti sistem), `?sematan=1`, `?polos=1`, `?sampul=1&judul=…&kecil=…`, `?labels=0`, `?gerak=0` (tanpa animasi), dan `?press=Label@ms,…` (uji). Teks `judul`/`kecil` dipasang lewat `textContent`, sehingga aman dari sisipan HTML. Setiap figur juga sebaiknya membaca keadaannya sendiri lewat `params` (contoh: `?tutup=1`, `?balik=0.5`) supaya keadaan apa pun bisa dipotret.

**Sematan pertama di situs (belum dilakukan, catat ADR saat mengerjakannya):** `next.config.ts` saat ini mengirim `X-Frame-Options: DENY` untuk semua path, sehingga iframe sesama situs pun ditolak. Ubah header khusus `/aset/:path*` menjadi `SAMEORIGIN`, ditambah `Content-Security-Policy: frame-ancestors 'self'`. Teruskan tema situs lewat `?tema=` dari komponen klien (next-themes). Font di dalam iframe saat ini memakai cadangan (Inter/system-ui), jadi sajikan Plus Jakarta Sans secara lokal bila perbedaannya terlihat. Tambahkan kredit di `/lisensi`, satu uji e2e (iframe tampil, tombol bisa ditekan), dan cek axe.

## Mutu yang wajib

- **Aksesibilitas:** `alt` menjelaskan isi gambar. Tombol adalah `<button>` asli dengan fokus terlihat. `readout` mengumumkan perubahan keadaan. Saat "kurangi gerakan" aktif, animasi langsung lompat ke akhir (sudah ditangani mesin; jangan memakai `requestAnimationFrame` sendiri).
- **Setiap tekanan menghasilkan sesuatu:** aksi, atau `ui.flash('…')` yang menjelaskan kenapa belum bisa, termasuk saat animasi masih berjalan.
- **Ukuran:** file hasil ±50–80 KiB tanpa gambar raster. Jangan menyisipkan PNG/foto ke dalam figur.
- **Konsistensi:** jangan menambah penggeser wobble, pemilih palet, atau kredit di gambar; mesin sengaja tidak menampilkannya.
- **Gaya figur:** tetap pada satu sudut pandang tetap dan satu cahaya (lihat `REFERENSI.md`).

## Selesai bila

- [ ] `potret.mjs` tanpa galat (kode keluar 0) untuk keadaan diam, urutan tombol, tema gelap, dan ponsel 375 px.
- [ ] Tidak ada huruf Arab, wajah, atau sosok di figur (periksa gambar, bukan hanya kode).
- [ ] `aset/keluaran/<nama>.html` dibangun ulang dari sumber terbaru, dan PNG yang diminta tersimpan di `aset/keluaran/`.
- [ ] Tangkapan layar dikirim ke pemilik; aset baru dipasang di situs setelah disetujui.
