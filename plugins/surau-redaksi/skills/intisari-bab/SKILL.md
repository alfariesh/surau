---
name: intisari-bab
description: Membuat Intisari Bab Surau (ringkasan belajar satu bab atau sub-bab Ihya' 'Ulum ad-Din) dalam format surau-konten/1, berjangkar ke paragraf sumber, lengkap dengan inti satu kalimat, gagasan berjudul tesis, soal berjawaban, dan kutipan lewat offset. Dipakai saat diminta "buat Intisari bab 100007", "Intisari Bab", "ringkas bab ini untuk Surau", atau memperbaiki Intisari lama sebuah bab.
metadata:
  version: "1"
  rules: "konten@1"
---

# Intisari Bab

Ikuti **pedoman-redaksi** (aturan keras, bahasa, alur umum). Skill ini menambahkan standar dan langkah khusus Intisari Bab.

## Masukan

`section_id` bab atau sub-bab (mis. 100007). Bila pemilik hanya menyebut judul, cari dengan `get_table_of_contents` (`edition_id: 1`, `node_id` Kitab-nya) atau `search_text`. Bila bagian itu Kitab (tingkat 2, mis. 100003), pakai skill **intisari-kitab**.

## Langkah

1. **Baca seluruh bagian**: `read_section(section_id)`, ulangi dengan `cursor` sampai `next_cursor` null. Catat `id` setiap paragraf badan (`kind: "body"`), panjangnya, dan apa isinya. Paragraf sangat pendek biasanya judul.
2. **Jangan membuka Intisari lama** (`get_section_digest`, hasil batch API uji coba). Tulis hanya dari teks bagian supaya tidak terpengaruh kesalahannya. Intisari lama bagian yang sama diganti otomatis saat impor, jadi `menggantikan` berisi `null` untuk unit baru (untuk revisi, lihat `format.md`).
3. **Rencanakan gagasan** (lihat jumlah di `references/standar.md`). Untuk setiap gagasan tentukan: paragraf dasarnya (1–6 `passage_id`), sikapnya (`author`/`reported`/`refuted`), dan apakah anjuran. Susun berurutan mengikuti teks. Usahakan dasar seluruh gagasan menutup sebagian besar paragraf isi; bab yang dilewati harus karena memang tidak penting, bukan terlewat.
4. **Tulis** `inti`, `ringkasan`, dan gagasan (judul tesis yang menyebut pemilik pendapat, isi, soal dan jawaban). Perhatikan baik-baik:
   - **negasi** ("bukan", "tidak", "kecuali"): jangan membalik maksud penulis;
   - **bilangan dan waktu** (setahun, tiga macam, empat tingkat): salin dari teks, bukan dari ingatan. Contoh kekeliruan nyata: "sanah" (setahun) pernah terbaca "sunnah";
   - **makna lahir dan batin**: bila penulis menetapkan makna lahir lalu menambah makna batin, jangan menulis bahwa makna lahirnya ditolak.
5. **Kutipan pilihan** (0–2): pilih kalimat penting yang bukan ayat dan bukan riwayat. Ambil potongan Arab dari `text_raw`, panggil `verify_quote(passage_id, potongan)`, pakai `match.char_start`/`match.char_end`. Terjemahkan potongan itu ke bahasa Indonesia untuk `terjemahan` (terjemahan kutipan boleh memakai "aku" bila penulis berkata begitu). Jangan menulis huruf Arab di draf.
6. **Istilah** (0–5): hanya kunci glosarium yang sudah ada; bila ragu, kosongkan.
7. **Cek**: `check_content_draft({ draft })`. Perbaiki semua galat; baca peringatan. Ulangi sampai `ok: true`.
8. **Periksa mandiri** dengan skill **periksa-draf**, isi `periksa.mandiri`, cek ulang, salin `stamp` ke `periksa.kode`.
9. **Buat berkas** `intisari-bab-<section_id>.json` untuk diunduh, lalu beri tahu pemilik langkah impornya.

## Bentuk `isi`

```json
{
  "inti": "satu kalimat, 12–35 kata, atributif",
  "ringkasan": "40–110 kata",
  "gagasan": [
    {
      "judul": "4–14 kata, tesis, menyebut pemilik pendapat",
      "isi": "25–110 kata",
      "sikap": "author",
      "jenis": "idea",
      "dasar": [10000140, 10000141],
      "soal": { "tanya": "6–30 kata diakhiri ?", "jawab": "4–30 kata" }
    }
  ],
  "kutipan": [
    { "gagasan": 1, "passage_id": 10000140, "char_start": 0, "char_end": 88, "terjemahan": "2–150 kata" }
  ],
  "istilah": ["ilmu"]
}
```

Standar lengkap: `references/standar.md`. Contoh draf yang lolos: `references/contoh.json`.
