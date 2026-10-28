# Standar Faedah (konten@1)

Sumber angka: `CONTENT_LIMITS` di `@surau/core`; [docs/09-konten.md](https://github.com/alfariesh/surau/blob/main/docs/09-konten.md) §5.3.

Satu berkas berisi 1–14 butir dari satu bagian. Tampilan (dibuat kode): **judul → konteks → terjemahan AI paragraf (disalin dari database) → "— al-Ghazali, Ihya' 'Ulum ad-Din, j. x, h. y (terjemahan AI)" → tautan ke paragraf**.

| Bagian | Standar |
|---|---|
| Paragraf | Teks badan; terjemahan tampil 15–90 kata tanpa huruf Arab atau placeholder ayat; tanpa rujukan ayat; tanpa penanda catatan kaki/hadits (daftar putih v1); tidak ditandai perlu ditinjau; bukan pendapat yang dinukil atau dibantah |
| Judul | 2–8 kata, menyebut isi; tidak wajib menyebut pemilik pendapat (atribusinya di konteks). Ditolak: "agar", "supaya", "biar", "dijamin", "pasti", "raih", "kuasai", "cara cepat/mudah", "rahasia sukses" |
| Konteks | 6–30 kata, atributif, menunjukkan letak dalam alur bab |
| Tema | 1–3 kata kunci |
| Isi berbahaya | Tidak dijadikan Faedah: kisah atau praktik yang bisa membahayakan kesehatan atau keselamatan bila ditiru, dan kalimat yang merendahkan suku, bangsa, atau kelompok |
| Potongan daftar | Paragraf yang dibuka "dan", "yang kedua", "adapun" (peringatan `faedah_fragment`) hanya dipakai bila konteks menjelaskan daftarnya; lebih baik lewati |

Paragraf yang sama tidak boleh muncul dua kali di satu berkas.
