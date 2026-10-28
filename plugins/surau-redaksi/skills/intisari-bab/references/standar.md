# Standar Intisari Bab (konten@1)

Sumber kebenaran angka: `CONTENT_LIMITS` di `@surau/core` dan [docs/09-konten.md](https://github.com/alfariesh/surau/blob/main/docs/09-konten.md) §5.1. Semua diperiksa `check_content_draft`.

Kerangka tampil: **Inti → Ringkasan → Gagasan 1..n (judul, isi, sikap, Dasar teks, soal) → Kutipan pilihan → Istilah → penutup "pintu ke teks" (ditambah kode)**.

| Bagian | Standar |
|---|---|
| Inti | Satu kalimat, 12–35 kata, atributif ("Menurut al-Ghazali, …"). Tidak dibuka "Bagian/Teks ini membahas". Menyatakan isi, bukan topik |
| Ringkasan | 40–110 kata; alur bab dari awal ke akhir |
| Jumlah gagasan | Bagian < 1.500 karakter Arab: 1–3. < 5.000: 2–5. Selebihnya: 3–7. Bagian yang punya sub-bab: 3–7 |
| Judul gagasan | 4–14 kata, berupa tesis. Selalu menyebut siapa berpendapat (al-Ghazali, penulis, kaum …, menurut …). Paling banyak sepertiga judul dibuka "Al-Ghazali". Jangan membicarakan babnya ("bab ini bertujuan …"). Tanpa tanda baca di akhir |
| Isi gagasan | 25–110 kata. Contoh dan alasan penulis dipertahankan; batasan ("sebagian", "hendaknya") jangan dibuang |
| Sikap | `author`, `reported`, atau `refuted`. Pendapat yang dinukil lalu dibantah = `refuted`, dan isinya menyebut bantahan penulis |
| Jenis | `idea`, atau `advice` bila penulis sendiri menganjurkan sesuatu (kasus pribadi ditanyakan kepada ulama; catatan itu ditambah kode) |
| Dasar teks | 1–6 paragraf badan di dalam bagian ini. Cakupan dasar seluruh gagasan sebaiknya ≥ 50% paragraf isi |
| Soal | Satu per gagasan. Pertanyaan 6–30 kata diakhiri "?"; jawaban 4–30 kata berupa pernyataan. Paling banyak separuh soal dibuka "Menurut al-Ghazali". Soal menguji isi teks, bukan pendapat pembaca, dan tidak benar/salah atas perkara khilafiyah |
| Kutipan pilihan | 0–2. Satu paragraf, 20–400 karakter, di batas kata (offset dari `verify_quote`), tidak menyentuh ayat, bukan riwayat bertakhrij sangat lemah/palsu/tanpa asal/tidak ditemukan. Terjemahan 2–150 kata |
| Istilah | 0–5 kunci glosarium yang ada |

## Ciri Intisari yang baik

- Pembaca baru paham isi bab dari inti dan judul saja.
- Judul berbeda-beda bentuknya; tidak semua "Al-Ghazali menjelaskan …".
- Setiap gagasan bisa ditunjuk paragrafnya dan tidak melebihi apa yang tertulis.
- Pendapat yang dinukil atau dibantah tidak terbaca sebagai pendapat penulis.
- Tidak ada gagasan "meta" (tentang tujuan bab) dan tidak ada gagasan yang sama dengan Intisari induk atau saudaranya.
