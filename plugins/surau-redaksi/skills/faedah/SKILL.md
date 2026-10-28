---
name: faedah
description: Memilih dan menyiapkan Faedah Surau, yaitu butir satu paragraf untuk WhatsApp Channel dan kartu bagikan, dalam format surau-konten/1. Terjemahan paragraf disalin kode; yang ditulis hanya judul pendek, konteks atributif, dan tema. Dipakai saat diminta "buat Faedah dari bab 100008", "pilih 7 faedah", "bahan WhatsApp Channel", atau "kutipan harian" dari kitab.
metadata:
  version: "1"
  rules: "konten@1"
---

# Faedah

Ikuti **pedoman-redaksi**. Faedah adalah satu paragraf pilihan yang dibaca **tanpa konteks** di WhatsApp. Karena itu syaratnya ketat, dan **teks terjemahannya tidak ditulis di draf**: kode menyalin terjemahan AI berlabel dari database, lengkap dengan sitasi dan tautan.

## Langkah

1. `list_faedah_candidates(section_id)`: hanya paragraf yang `eligible: true`. Paginasi dengan `offset` sampai `next_offset` null bila perlu.
2. Untuk setiap calon, baca terjemahannya dan, bila perlu, paragraf sebelum dan sesudahnya (`read_page` atau `read_section`) supaya yakin:
   - itu **pendapat al-Ghazali sendiri**, bukan pendapat yang ia nukil atau bantah (bila muncul peringatan `stance_unchecked`, pastikan dari konteks; bila ragu, lewati);
   - maknanya utuh tanpa paragraf lain;
   - bukan kisah atau praktik yang berbahaya bila ditiru (lapar berkepanjangan, meninggalkan ikhtiar, menyakiti diri);
   - bukan perkara khilafiyah yang terbaca seperti fatwa.
3. Pilih 1–14 butir (bawaan 7). Usahakan tema beragam.
4. Untuk setiap butir tulis:
   - `judul`: 2–8 kata, menyebut isinya, tanpa janji ("agar", "supaya", "rahasia", "cara mudah" ditolak);
   - `konteks`: 6–30 kata, atributif, menjelaskan di mana al-Ghazali menulisnya ("Al-Ghazali menulis ini ketika menjelaskan …");
   - `tema`: 1–3 kata kunci huruf kecil (mis. "ilmu", "adab", "niat").
5. `check_content_draft` sampai `ok: true`; **periksa-draf** (satu entri per butir); salin `stamp`; buat berkas `faedah-<section_id>.json`.

## Bentuk `isi`

```json
{
  "butir": [
    {
      "passage_id": 10000167,
      "judul": "Yang dicari karena dirinya lebih mulia",
      "konteks": "Al-Ghazali menulis ini ketika membagi hal berharga menjadi tiga macam.",
      "tema": ["ilmu"]
    }
  ]
}
```

Standar: `references/standar.md`.
