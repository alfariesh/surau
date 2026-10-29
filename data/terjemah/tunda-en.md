# Paragraf yang ditunda dari terjemahan Inggris

Paragraf di bawah sengaja tidak diterjemahkan, karena memuat lafaz ayat yang belum dikenali pencocok ayat (tidak ada `passage_ayah_ref`, jadi tidak ada placeholder `⟦QS⟧`). Lafaz itu ikut terbaca sebagai teks biasa, padahal ayat tidak pernah diterjemahkan model (teks-arab.md aturan 9).

Sesudah ADR-133 (2026-10-29) daftar ini dibagi dua:
- **Kutipan** (kolom Jenis = kutipan): tetap ditunda sampai patch ayat X29 dimuat ke korpus, supaya kutipannya menjadi placeholder dan tampil dengan Kemenag.
- **Iqtibas** (kolom Jenis = iqtibas): boleh diterjemahkan sekarang sebagai kalimat penulis, tanpa "(Qur'an)" atau rujukan; kode memberi rujukan ayat kelak (X30). `pnpm terjemah bahan --belum` sudah tidak melewatinya; barisnya dihapus begitu berkas terjemahannya berstatus `siap`.

`pnpm terjemah bahan --belum` melewati paragraf berjenis kutipan yang tercantum di sini.

| passage_id | Bagian | Ayat | Jenis | Catatan |
|---|---|---|---|---|
| 10000385 | 100012 | QS 6:79 | kutipan | dikutip utuh ("ia berkata: wajjahtu wajhiya …") |
| 10000386 | 100012 | QS 6:79 | iqtibas | lafaz 6:79 diubah ke orang ketiga ("wajjaha wajhahu …") lalu dibahas penulis |
| 10000637 | 100018 | QS 32:12 | iqtibas | iqtibas: lafaz ayat dijalin ke kalimat penulis |
| 10000225 | 100010 | QS 32:7-8 (perkiraan) | iqtibas | penciptaan keturunan Adam "dari saripati tanah" dan "dari air yang terpancar" dijalin ke kalimat penulis |
| 10000608 | 100017 | QS 56:89-94 (perkiraan) | iqtibas | "rauh, raihan, jannatu na'im" dan "nuzulun min hamim" dijalin ke kalimat penulis |
| 10000615 | 100017 | QS 33:72 | iqtibas | langit, bumi, dan gunung enggan memikul amanah, dijalin ke kalimat penulis |
| 10000693 | 100019 | QS 2:146 / 6:20 (perkiraan) | kutipan | "mengenalnya seperti mengenal anak-anak mereka" dijalin sesudah "Allah berfirman" |
| 10000907 | 100019 | QS 22:11 / 39:15 (perkiraan) | iqtibas | "itulah kerugian yang nyata" dijalin ke kalimat penulis |
| 10000976 | 100019 | QS 31:33 / 35:5 (perkiraan) | iqtibas | doa "jangan tertipu kehidupan dunia dan jangan tertipu oleh penipu" dijalin ke kalimat |
| 10000765 | 100019 | QS 2:156 | kutipan | istirja' diucapkan tokoh (Syaqiq) tanpa placeholder |
| 10000960 | 100019 | QS 25:70 | iqtibas | "Allah mengganti keburukan mereka dengan kebaikan" dijalin ke ucapan Iblis |
| 10000966 | 100019 | QS 25:70 | iqtibas | lanjutan kalimat yang sama ("dengan kebaikan") |
