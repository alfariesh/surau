---
name: jalur
description: Menyusun Jalur 7 hari Surau (urutan baca satu bagian per hari, mis. tujuh Bab Kitab al-'Ilm) dalam format surau-konten/1, dengan pengantar singkat per hari dan tanpa sertifikat atau streak. Dipakai saat diminta "buat Jalur 7 hari", "jalur baca Kitab al-'Ilm", "rencana ngaji seminggu", atau bahan baca bersama pengajar dan jamaah.
metadata:
  version: "1"
  rules: "konten@1"
---

# Jalur 7 hari

Ikuti **pedoman-redaksi**. Jalur menata tujuh bagian yang sudah punya Intisari menjadi bacaan satu per hari. Yang ditulis hanya judul, deskripsi, dan pengantar per hari; menit baca, tombol "Baca teks lengkap", dan penafian "bukan pengganti guru" dibuat kode.

## Langkah

1. `get_table_of_contents(edition_id: 1, node_id: <kitab>, depth: 2)`: pilih tujuh bagian di dalam Kitab itu, biasanya tujuh Bab berurutan (Kitab al-'Ilm: 100004, 100009, 100011, 100014, 100017, 100019, 100020).
2. Pastikan setiap bagian punya **Intisari v2**: `get_section_digest(bagian)` tidak `null` dan `prompt_version`-nya berawalan `surau-redaksi/` (tampil sesudah impor X24). Intisari lama hasil batch API tidak dipakai. Bila ada bagian tanpa Intisari v2, berhenti dan beri tahu operator bagian mana yang perlu dibuatkan Intisari Bab-nya lebih dulu.
3. Baca Intisari v2 tiap bagian, lalu tulis `pengantar` 8–40 kata yang atributif ("Hari ini membaca bab tentang …, tempat al-Ghazali menjelaskan …"). Tanpa tugas atau target ("hafalkan", "amalkan hari ini").
4. Tulis `judul` (3–12 kata, menyebut isi, mis. "Tujuh hari bersama Kitab al-'Ilm") dan `deskripsi` (15–60 kata). Tanpa janji ("agar menjadi …", "raih …").
5. `slug`: huruf kecil dan tanda hubung, mis. `kitab-al-ilm-7-hari`. `section_id` = ID Kitab.
6. `check_content_draft` sampai `ok: true`; **periksa-draf** (satu entri per hari); salin `stamp`; buat berkas `jalur-<slug>.json`.

## Bentuk `isi`

```json
{
  "slug": "kitab-al-ilm-7-hari",
  "judul": "Tujuh hari bersama Kitab al-'Ilm",
  "deskripsi": "15–60 kata",
  "hari": [
    { "hari": 1, "section_id": 100004, "pengantar": "8–40 kata" }
  ]
}
```

Tepat tujuh hari, bernomor 1–7, bagian berbeda, sebaiknya mengikuti urutan kitab. Standar: `references/standar.md`.
