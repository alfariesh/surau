# Aset visual Surau

Ilustrasi interaktif untuk situs, blog, dan konten: gambar isometrik garis tipis dengan satu aksen Zaitun
pada bagian yang hidup. Dibuat agent dengan skill `aset` (`.claude/skills/aset/SKILL.md`); mesinnya turunan
iso-glow (MIT, April Zhu) dan mengambil warna langsung dari `apps/web/src/app/globals.css`.

- `figur/`: sumber tiap figur (HTML + satu skrip).
- `keluaran/`: hasil siap pakai. `<nama>.html` berdiri sendiri; `.webp` untuk situs dan konten, `.jpg` untuk
  pratinjau tautan (Open Graph). Figur yang tampil di situs juga disalin ke `apps/web/public/aset/`.

Coba: buka `keluaran/prinsip-alamat.html` di browser, lalu tekan tombolnya atau ketuk jilidnya.
Tambahkan `?tema=gelap` atau `?sampul=1&judul=Judul%20artikel` di akhir alamat untuk melihat mode lain.
