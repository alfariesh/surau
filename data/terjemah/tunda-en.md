# Paragraf yang ditunda dari terjemahan Inggris

Paragraf di bawah sengaja tidak diterjemahkan, karena memuat lafaz ayat yang belum dikenali pencocok ayat (tidak ada `passage_ayah_ref`, jadi tidak ada placeholder `⟦QS⟧`). Lafaz itu ikut terbaca sebagai teks biasa, padahal ayat tidak pernah diterjemahkan model (teks-arab.md aturan 9).

Sesudah ADR-133 (2026-10-29) daftar ini dibagi dua:
- **Kutipan** (kolom Jenis = kutipan): tetap ditunda sampai patch ayat X29 dimuat ke korpus, supaya kutipannya menjadi placeholder dan tampil dengan Kemenag.
- **Iqtibas** (kolom Jenis = iqtibas): boleh diterjemahkan sekarang sebagai kalimat penulis, tanpa "(Qur'an)" atau rujukan; kode memberi rujukan ayat kelak (X30). `pnpm terjemah bahan --belum` sudah tidak melewatinya; barisnya dihapus begitu berkas terjemahannya berstatus `siap`.

`pnpm terjemah bahan --belum` melewati paragraf berjenis kutipan yang tercantum di sini.

| passage_id | Bagian | Ayat | Jenis | Catatan |
|---|---|---|---|---|
| 10000385 | 100012 | QS 6:79 | kutipan | dikutip utuh ("ia berkata: wajjahtu wajhiya …") |
| 10000693 | 100019 | QS 2:146 / 6:20 (perkiraan) | kutipan | "mengenalnya seperti mengenal anak-anak mereka" dijalin sesudah "Allah berfirman" |
| 10000765 | 100019 | QS 2:156 | kutipan | istirja' diucapkan tokoh (Syaqiq) tanpa placeholder |
