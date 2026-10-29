---
name: terjemah-inggris
description: Menerjemahkan paragraf Ihya' 'Ulum ad-Din dari teks Arab ke bahasa Inggris untuk Surau, per bagian, dalam format surau-terjemah/1. Ayat diganti placeholder yang wajib disalin persis, penanda catatan kaki dipertahankan, dan setiap paragraf diperiksa kode sebelum disimpan. Dipakai saat diminta "terjemahkan bab 100007 ke bahasa Inggris", "terjemah Inggris", "lanjutkan terjemahan Inggris", atau "English translation" sebuah bagian.
metadata:
  version: "1"
  rules: "terjemah@1"
---

# Terjemah Inggris

Terjemahan Inggris per paragraf untuk Surau (ADR-130, ADR-132). Terjemahan ini kelak menjadi satu-satunya bantuan baca di MCP dan isi situs `/en`. Jadi mutunya harus setara terjemahan Indonesia yang tayang (Sonnet 5.5, `translate-passage@5`). Aturannya diturunkan dari prompt itu: `references/aturan.md` (wajib dibaca utuh sebelum menerjemahkan) dan `references/glosarium.md`.

**Model:** pakai **Sonnet** (keputusan pemilik). Satu berkas berisi ≤ 40 paragraf, satu berkas per percakapan, supaya kuota langganan tidak habis sekaligus dan mutu tidak turun di percakapan panjang.

## Langkah

1. Tanyakan `section_id` bila belum disebut (cari lewat `get_table_of_contents`). Bagian yang dianjurkan dikerjakan lebih dulu ada di pedoman redaksi.
2. `list_translation_units(section_id, offset, limit: 20)`. Untuk setiap unit:
   - `source` adalah teks yang diterjemahkan. Kutipan ayat sudah diganti `⟦QS s:a⟧`.
   - `heading` dan `previous` hanya konteks; jangan diterjemahkan.
   - Lewati unit dengan `blocked` tidak null, dan unit yang `translated_en: true`.
   - Ambil halaman berikutnya (`next_offset`) sampai paling banyak 40 paragraf atau bagian habis.
3. Terjemahkan setiap `source` mengikuti `references/aturan.md`:
   - setia dan lengkap dari kata pertama sampai terakhir;
   - setiap placeholder di `placeholders` muncul **tepat sekali** dan tidak pernah diisi terjemahan ayat;
   - setiap penanda catatan kaki ditulis persis seperti di sumber: angka Arab dalam kurung, bukan angka 1, 2;
   - tanpa huruf Arab, Markdown, catatan penerjemah, atau kalimat pengantar.
4. **Periksa mandiri** setiap paragraf dengan membaca ulang sumbernya, memakai daftar uji di `references/aturan.md` bagian "Before you finish": pelaku dan objek, jangkauan negasi, pendapat siapa, angka dan urutan, kelengkapan, dan placeholder. Nilai `benar`, `kurang`, atau `salah` dengan catatan satu kalimat. Semua yang `salah` wajib diperbaiki.
5. Susun draf (bentuk di bawah), lalu `check_translation_draft({ draft })`. Perbaiki setiap galat dan ulangi sampai `ok: true`. Peringatan `length_ratio` berarti periksa ulang apakah ada yang hilang atau ditambah. Peringatan `markers_missing` berarti kembalikan penandanya bila memang ada di sumber.
6. Salin `stamp` ke `periksa.kode`. Buat berkas `terjemah-<section_id>-<passage_id pertama>.json` untuk diunduh.
   Di Claude Code tanpa konektor: bahan didapat dari `pnpm terjemah bahan <section_id> --limit 40`, dan pemeriksaan dengan `pnpm terjemah cek <berkas>`. Fungsinya sama dengan kedua tool MCP.
7. Laporkan ke operator: jumlah paragraf, nilai periksa mandiri, dan `next_offset` untuk percakapan berikutnya. Sesudah diunduh, berkas diimpor di Claude Code ("impor terjemahan dari Downloads"), lalu diperiksa independen sebelum berstatus `siap`.

## Bentuk berkas

```json
{
  "format": "surau-terjemah/1",
  "lang": "en",
  "edition_id": 1,
  "section_id": 100007,
  "status": "draf",
  "butir": [
    { "passage_id": 10000124, "teks": "Allah Most High says, ⟦QS 9:122⟧ ..." }
  ],
  "asal": {
    "pembuat": "claude-desktop",
    "model": "claude-sonnet-5-5",
    "plugin": "surau-redaksi@0.2.2",
    "skill": "terjemah-inggris@1",
    "operator": "pemilik",
    "dibuat": "2026-10-28T10:00:00+07:00"
  },
  "periksa": {
    "mandiri": [{ "ke": 1, "nilai": "benar", "catatan": "pelaku, negasi, dan placeholder sesuai sumber" }],
    "independen": null,
    "kode": null
  }
}
```

- `butir` mengikuti urutan baca. `ke` di `periksa.mandiri` = nomor butir, mulai 1.
- `asal.model` diisi model yang benar-benar dipakai. `pembuat`: `claude-desktop`, `claude-web`, `cowork`, atau `claude-code`.
- Teks Arab **tidak pernah** ada di berkas. Yang ditulis hanya terjemahan Inggris dengan placeholder dan penanda dari sumber.

Terjemahan ini berlabel "AI translation" di Surau. Jangan pernah menyebutnya ditinjau atau terverifikasi.
