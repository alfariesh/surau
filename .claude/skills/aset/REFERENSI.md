# Referensi teknis mesin aset (`mesin/iso.js`)

Mesin ini turunan **iso-glow** karya April Zhu (MIT), yang dibangun di atas **iso-figure** karya Tolga Cohce (MIT); lisensinya ada di `mesin/LICENSE`. Kernel proyeksi, kosakata kelas, dan pelajaran di bawah berasal dari sana, lalu disesuaikan untuk Surau. Bila halaman ini bertentangan dengan `SKILL.md`, yang berlaku `SKILL.md`.

## Koordinat dan kernel

- +x ke kanan-bawah, +y ke kiri-bawah, +z ke atas. Penonton melihat dari (+1,+1,+1).
- Muka yang terlihat: **atas** (+z), **FRONT** (y maksimum, kiri-bawah), dan **SIDE** (x maksimum, kanan-bawah).
- `K = api.frame(titik3D[], { margin, aspect, bawah })` memasang viewBox dari titik-titik terjauh. Masukkan titik tertinggi dan semua bagian yang bergerak, tetapi jangan lebih dari itu: satu titik pencilan membuat figur mengecil. Dalam mode sematan dengan tombol, ruang di bawah otomatis ditambah untuk tombol.

Isi `K`:

| Fungsi | Gunanya |
|---|---|
| `P(x,y,z)`, `D(x,y,z)` | Titik dan arah di layar |
| `TOP(x,y,z)`, `FRONT(x,y,z)`, `SIDE(x,y,z)` | Transform untuk `<g>`: gambar `rect`, `line`, atau `text` biasa dalam koordinat lokal muka (sudut kiri-atas muka; v ke bawah) |
| `box(x,y,z,w,d,h,r,kelas)` | Kotak sejajar sumbu; dengan `r > 0` tutup atas membulat dan dindingnya menyambung |
| `poly(titik3D, kelas)` | Muka datar sembarang |
| `line(titik3D, kelas)` | Garis terbuka |
| `obox(o, e1, e2, e3, kelas)` | Kotak miring/berputar (halaman, sampul yang menutup); hanya muka yang menghadap penonton |
| `prism(penampang(y,z), x0, x1, kelas)` | Penampang cembung disapu sepanjang x (papan rehal). Bentuk cekung dipecah dulu |
| `tepi(titik3D)` | Garis siluet sedikit lebih tebal di sekeliling satu benda. Gambar sesudah bendanya, satu per benda |
| `slits(...)` | Garis-garis sejajar di dalam muka |

Lain-lain:
- `api.kurva(a, b, naik)`: kabel melengkung (titik 3D).
- `api.lencana('centang'|'silang', p3, dx, dy, hot, garis)`: lencana bebas bahasa (pilihan utama untuk figur situs).
- `api.tag(p3, dx, dy, TEKS, hot, garis)`: label pil berkata, hanya untuk cover/konten berbahasa tunggal (lihat aturan 4 di SKILL.md).
- `api.px()`: satuan viewBox per piksel layar.
- `ISO.add/sub/cross/dot/norm/avg/vis/lerp/ease`: alat vektor.

**Urutan pelukis = satu-satunya pengurutan kedalaman.** Gambar dari belakang ke depan: x+y lebih kecil dulu, z lebih rendah dulu. Benda yang terpisah di sumbu x cukup diurutkan menurut x. Bagian yang bergerak (lembar dibalik, jilid ditarik) digambar ulang setiap frame dengan urutan yang dihitung ulang bila perlu.

## Kelas (warna hanya lewat ini)

| Kelas | Pakai untuk |
|---|---|
| `.face`, `.face.top`, `.face.recess`, `.face.kayu` | Badan benda, tutup atas, ceruk/sampul, kayu (rehal, rak) |
| `.tepi` | Siluet (dari `K.tepi`) |
| `.detail` | Garis halus: baris teks, bingkai halaman, tekstur |
| `.wire`, `.wire.hot` | Kabel; menyala = sedang menelusuri |
| `.pulse` + `api.replay(el)` | Denyut cahaya berjalan di kabel (`path` dengan `pathLength="1000"`) |
| `.nyala` (+ `filter="url(#soft)"`) | Garis yang menyala, misalnya baris yang dikutip |
| `.face.hot`, `.face.top.hot` | Benda yang hidup, misalnya kartu yang cocok atau jilid yang dirujuk |
| `.lencana`, `.lencana.hot` | Lencana centang/silang (dari `api.lencana`) |
| `.tag`, `.tag.hot` | Label pil (hanya untuk cover/konten berbahasa tunggal) |
| `.redup` | Yang sengaja dimatikan (kutipan keliru, "bukan putusan") |
| `.label` | Teks kecil di muka (nomor jilid, tanda kutip Latin) |
| `.glass`/`.hot`, `.halo`/`.hot`, `.led`/`.hot` | Kaca layar, cahaya latar, lampu indikator |

Filter `#glow`, `#soft`, dan `#bloom` dipasang mesin dengan skala viewBox dan wilayah `userSpaceOnUse`. Di tema terang dan sepia filter ini tidak berpendar: yang menyala tetap berwarna aksen datar.

## Kontrak `mountFigure`

```js
mountFigure({
  id: 'prinsip-alamat', title: '…', hint: '…', alt: '…',
  tombol: [{ label: 'Telusuri', aksi: api => … }], // opsional; disembunyikan di kartu situs (?tombol=0)
  mount(stage, api) {
    const K = api.frame([...]);
    const st = { … };                             // satu objek keadaan
    function draw() { let s = …; api.gambar(s); } // satu fungsi gambar
    draw(); api.readout('…');
    return { render: draw, demo() { … }, akhir() { … }, batal() { st.busy = false; }, key(e) { … } };
  },
});
```

Fungsi `api`:

| Fungsi | Gunanya |
|---|---|
| `api.gambar(svg)` | Menulis ulang lapis lukisan |
| `api.denyut(d)` | Menjalankan satu denyut cahaya di lapis tersendiri yang tidak ikut digambar ulang |
| `api.anim(ms, step(t), selesai)` | Animasi; dengan "kurangi gerakan" langsung ke akhir |
| `api.after(ms, fn)` | Timer |
| `api.diam` | Benar bila gerakan dikurangi |
| `api.tandai()` | Menghentikan demo, timer, dan animasi, lalu memanggil `batal()` milik figur. Dipanggil otomatis saat tombol atau gambar ditekan dan saat fokus masuk; demo juga hanya berjalan saat figur ada di layar |

## Pelajaran (dari iso-glow dan figur Surau)

- **Keadaan menyala harus jelas.** Pendar yang samar adalah kegagalan paling umum. Satu elemen yang menyala tebal lebih baik daripada lima yang samar.
- **Arahkan detail ke penonton.** Hanya atas, FRONT, dan SIDE yang terlihat. Punggung jilid menghadap FRONT; baris kutipan di muka atas atau FRONT.
- **Garis lurus mendatar dan filter:** kotak batasnya setinggi nol, jadi filter dengan wilayah bawaan menghapusnya. Mesin sudah memakai `userSpaceOnUse`; jangan membuat filter sendiri.
- **Kotak bulat:** pakai `box(..., r)` (satu tutup + satu dinding). Jangan membulatkan FRONT dan SIDE terpisah karena sudutnya tidak akan bertemu.
- **List tipis atau pita di dinding:** gambar sebagai garis atau persegi di bidang FRONT/SIDE, bukan `box` (tutup `box` menutupi apa yang di atasnya).
- **Kabel:** lengkungkan ke atas (`api.kurva`) supaya tidak menembus benda; mulai dan akhiri tepat di permukaan.
- **Tanpa kata di figur situs:** situs tiga bahasa dan huruf Arab dilarang di aset. Pakai lencana, pita, papan nama yang menyala, dan coretan. Uji di 240 px.
- **Satu cerita utuh:** `demo()` memuat kedua sisi (keliru → benar) lalu berhenti. Lebih jelas daripada tombol, dan tidak mengulang tanpa henti.
- **Escape teks** sebelum masuk SVG (`ISO.esc`; `api.tag` sudah melakukannya).
- **iframe:** `color-scheme` elemen iframe harus sama dengan isinya, kalau tidak latarnya buram. Di situs, nilainya diwarisi dari `<html>` (next-themes), dan isi iframe mengikuti tema yang dikirim induk.
- **Animasi bisa dihentikan:** `api.anim` dihentikan `api.tandai()` saat pengunjung menekan sesuatu. Figur wajib punya `batal()` (lepas `st.busy`, rapikan keadaan setengah jalan) supaya aksi pengunjung tidak tertelan.
