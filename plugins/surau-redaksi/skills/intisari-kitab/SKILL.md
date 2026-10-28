---
name: intisari-kitab
description: Membuat Intisari Kitab Surau (ringkasan satu Kitab Ihya' 'Ulum ad-Din, mis. Kitab al-'Ilm, 10–15 menit baca) dalam format surau-konten/1 dari Intisari Bab anak-anaknya dan paragraf yang dijangkar. Dipakai saat diminta "buat Intisari Kitab al-'Ilm", "Intisari Kitab 100003", "peta besar kitab ini", atau bahan hub Intisari dan Jalur.
metadata:
  version: "1"
  rules: "konten@1"
---

# Intisari Kitab

Ikuti **pedoman-redaksi**. Intisari Kitab adalah peta besar satu Kitab (tingkat 2 daftar isi). Ia disusun **dari Intisari Bab anak-anaknya dan pembacaan langsung paragraf yang dijangkar**, bukan dengan membaca seluruh Kitab (terlalu panjang dan boros kuota).

## Langkah

1. `get_table_of_contents(edition_id: 1, node_id: <kitab>, depth: 3)`: catat semua Bab anak langsung dan sub-babnya.
2. Untuk setiap Bab anak: `get_section_digest(bab)`. Utamakan Intisari v2 (dibuat lewat plugin); bila hanya ada Intisari lama, gagasannya wajib dicek ke paragraf jangkarnya. Bila sebuah Bab belum punya Intisari, baca sebagian awal dan akhirnya dengan `read_section` (potongan pertama dan terakhir).
3. Baca pengantar Kitab (paragraf yang langsung milik node Kitab, biasanya di awal) dengan `read_section(kitab)` potongan pertama.
4. Rencanakan **5–10 gagasan besar**. Setiap gagasan merangkum satu atau beberapa Bab (`bab`: ID Bab/sub-bab) dan punya 1–6 paragraf `dasar` yang benar-benar memuat gagasan itu (ambil dari jangkar Intisari Bab, lalu baca paragrafnya untuk memastikan). **Setiap Bab anak langsung harus dirujuk minimal satu gagasan.**
5. Tulis `inti`, `pembuka` (apa yang dibahas Kitab ini, tanpa janji), `ringkasan`, gagasan (judul tesis yang menyebut pemilik pendapat, isi 60–200 kata, sikap, soal), `penutup` (tanpa kalimat "pintu ke teks"; itu ditambah kode).
6. Kutipan (0–3) lewat `verify_quote` seperti Intisari Bab; istilah 0–8.
7. `check_content_draft` sampai `ok: true`; **periksa-draf**; salin `stamp`; buat berkas `intisari-kitab-<section_id>.json`.

## Bentuk `isi`

```json
{
  "inti": "satu kalimat, 12–35 kata",
  "pembuka": "40–120 kata",
  "ringkasan": "40–110 kata",
  "gagasan": [
    {
      "judul": "4–14 kata",
      "isi": "60–200 kata",
      "sikap": "author",
      "jenis": "idea",
      "bab": [100004, 100005],
      "dasar": [10000140],
      "soal": { "tanya": "…?", "jawab": "…" }
    }
  ],
  "kutipan": [],
  "istilah": [],
  "penutup": "15–80 kata"
}
```

Standar: `references/standar.md`.
