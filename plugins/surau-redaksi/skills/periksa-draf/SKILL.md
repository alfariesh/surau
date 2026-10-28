---
name: periksa-draf
description: Periksa mandiri draf konten Surau (Intisari Bab, Intisari Kitab, Faedah, Jalur) sebelum disimpan, dengan membaca ulang paragraf sumber setiap butir dan menilai Benar/Kurang/Salah. Dipakai sesudah draf lolos check_content_draft, atau saat diminta "periksa draf ini", "cek kesetiaan Intisari", atau "apakah gagasan ini sesuai teks".
metadata:
  version: "1"
  rules: "konten@1"
---

# Periksa draf (periksa mandiri)

Lapis 2 dari cek otomatis tiga lapis. Tujuannya menangkap kekeliruan makna yang tidak bisa ditangkap kode. Sikap pemeriksa: **skeptis**, mencari kesalahan, bukan membenarkan draf.

## Langkah

1. Untuk setiap butir (gagasan, butir Faedah, atau hari Jalur), baca ulang paragraf sumbernya: cukup paragraf `dasar` dan tetangganya lewat `read_page` di halamannya (bab panjang tidak perlu dibaca ulang seluruhnya). Untuk Faedah, juga terjemahan yang akan disalin kode. Jangan menilai dari ingatan percakapan.
2. Jalankan daftar uji di `references/daftar-uji.md` untuk butir itu.
3. Beri nilai:
   - **benar**: setia pada teks, atribusi dan sikap tepat, tanpa nada fatwa;
   - **kurang**: tidak keliru, tetapi ada yang perlu dirapikan (terlalu umum, contoh penting hilang, dasar kurang lengkap);
   - **salah**: membalik makna, salah bilangan/waktu, salah pemilik pendapat, menambah klaim yang tidak ada di teks, atau bernada fatwa.
4. Tulis `periksa.mandiri`: satu entri `{ "ke": n, "nilai": "...", "catatan": "≤ 1 kalimat: apa yang dicek dan temuannya" }` per butir, nomor `ke` mulai 1.
5. **Semua yang salah wajib diperbaiki** sebelum berkas dibuat, lalu jalankan lagi `check_content_draft` dan periksa ulang butir itu. Yang kurang sebaiknya dirapikan bila mudah; bila tidak, catat alasannya.
6. Laporkan ke pemilik secara singkat: berapa benar, kurang, dan salah, dan apa yang diperbaiki.

Penilaian ini dibuat AI, bukan peninjau manusia. Jangan pernah menyebutnya "ditinjau" atau "terverifikasi". Saat impor, agen lain dengan konteks segar memeriksa lagi (periksa independen).
