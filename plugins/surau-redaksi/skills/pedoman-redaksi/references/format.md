# Format berkas `surau-konten/1` dan kode galat

Satu berkas JSON per unit. Kunci berbahasa Indonesia; nilai teks berbahasa Indonesia; tidak ada huruf Arab di mana pun.

```json
{
  "format": "surau-konten/1",
  "jenis": "intisari-bab | intisari-kitab | faedah | jalur",
  "lang": "id",
  "edition_id": 1,
  "section_id": 100007,
  "versi": 1,
  "menggantikan": "digest-section@2",
  "status": "draf",
  "isi": { "...": "sesuai jenis" },
  "asal": {
    "pembuat": "claude-desktop",
    "model": "claude-opus-5-5",
    "plugin": "surau-redaksi@0.1.0",
    "skill": "intisari-bab@1",
    "operator": "pemilik",
    "dibuat": "2026-10-28T09:30:00+07:00"
  },
  "periksa": {
    "mandiri": [{ "ke": 1, "nilai": "benar", "catatan": "dasar p140 memuat seluruh isi" }],
    "independen": null,
    "kode": { "...": "salin stamp dari check_content_draft" }
  }
}
```

- `section_id`: bagian sumber. Intisari Kitab dan Jalur memakai ID Kitab (tingkat 2 daftar isi, mis. 100003 Kitab al-'Ilm).
- `menggantikan`: hanya untuk Intisari. Isi dengan `prompt_version` Intisari lama dari `get_section_digest` (mis. `"digest-section@2"` atau `"digest-merge@1"`), atau `null` bila belum ada. Faedah dan Jalur: `null` (Faedah tidak menggantikan Intisari).
- `status`: selalu `"draf"` dari chat. Status `siap` hanya diberikan saat impor sesudah periksa independen.
- `periksa.mandiri`: satu entri per gagasan (atau per butir Faedah, per hari Jalur), `nilai` = `benar`, `kurang`, atau `salah`, dengan catatan singkat.
- `periksa.kode`: salin `stamp` dari hasil `check_content_draft` yang terakhir (`aturan`, `lolos`, `sumber_sha256`, `draf_sha256`, `waktu`). Setiap perubahan isi sesudahnya membuat cap tidak cocok; cek ulang.

## Kode galat yang sering muncul

| Kode | Artinya | Perbaikan |
|---|---|---|
| `schema` | bentuk JSON salah | ikuti contoh di `references/contoh.json` skill jenisnya |
| `arabic` | ada huruf Arab | hapus; kutipan hanya lewat offset |
| `fatwa`, `address`, `first_person` | bahasa fatwa, menyapa pembaca, kata ganti orang pertama | tulis ulang dengan atribusi orang ketiga |
| `hadith_status`, `ayah_paraphrase`, `placeholder` | status hadits, isi ayat, atau "QS 2:255" | hapus; sebut saja bahwa penulis berdalil dengan ayat/riwayat |
| `length` | jumlah kata di luar standar | ringkas atau lengkapi |
| `title_no_holder` | judul tidak menyebut siapa berpendapat | tambahkan "menurut al-Ghazali", "penulis …", "kaum …" |
| `monotone_titles`, `monotone_questions` | terlalu banyak judul dibuka "Al-Ghazali" atau soal dibuka "Menurut al-Ghazali" | variasikan |
| `meta_title`, `topic_opener` | judul membicarakan babnya sendiri; inti dibuka "Bagian ini membahas" | tulis isinya langsung |
| `outside_section`, `not_body` | paragraf dasar di luar bagian atau berupa catatan kaki | pilih paragraf badan dari `read_section` bagian itu |
| `quote_boundary`, `quote_range` | offset memotong kata atau di luar teks | ambil ulang dari `verify_quote` |
| `quote_ayah`, `quote_weak_report` | kutipan menyentuh ayat atau riwayat terlarang | pilih kutipan lain atau tanpa kutipan |
| `point_count` | jumlah gagasan tidak sesuai panjang bagian | tambah atau gabungkan gagasan |
| `uncovered_chapter` | (Kitab) ada Bab anak yang tidak dirujuk | rujuk Bab itu di `bab` salah satu gagasan |
| `faedah_*` | paragraf tidak layak jadi Faedah | pilih dari `list_faedah_candidates` yang `eligible` |
| `day_without_digest` | (Jalur) bagian belum punya Intisari tampil | pilih bagian lain |
| `promise` | janji manfaat | sebut isinya saja |

Peringatan (`warnings`) tidak menggagalkan, tetapi wajib dibaca: `low_coverage` (dasar menutup kurang dari separuh paragraf), `stance_unchecked` (Faedah dari bagian tanpa Intisari: pastikan sendiri pendapat penulis), `short_basis` (paragraf dasar sangat pendek, kemungkinan judul), `quote_outside_basis`, `honorific`, `unknown_model`.
