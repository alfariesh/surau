# Paragraf yang ditunda dari terjemahan Inggris

Paragraf di bawah sengaja tidak diterjemahkan, karena memuat lafaz ayat yang belum dikenali pencocok ayat (tidak ada `passage_ayah_ref`, jadi tidak ada placeholder `⟦QS⟧`). Lafaz itu ikut terbaca sebagai teks biasa, padahal ayat tidak pernah diterjemahkan model (teks-arab.md aturan 9).

Terjemahkan sesudah rujukan ayatnya ditambahkan ke korpus lewat patch pencocok ayat, lalu dimuat ulang. `pnpm terjemah bahan --belum` tetap menampilkannya, jadi lewati paragraf yang tercantum di sini.

| passage_id | Bagian | Ayat | Catatan |
|---|---|---|---|
| 10000385 | 100012 | QS 6:79 | dikutip utuh ("ia berkata: wajjahtu wajhiya …") |
| 10000386 | 100012 | QS 6:79 | merujuk balik lafaz yang sama |
| 10000637 | 100018 | QS 32:12 | iqtibas: lafaz ayat dijalin ke kalimat penulis |
