# Label status hadits (aturan versi 1) · tinjauan agent · ihya-v7 · 2026-10-26

> **Penilai: agent (Claude), pengganti ustadz sementara atas permintaan pemilik (2026-10-26), bukan
> ustadz.** Keputusan ini **tidak** disimpan di `takhrij_review` dan **tidak** mengubah label situs. Di
> situs, label tetap "dikenali otomatis dari teks takhrij, belum ditinjau". Status "ditinjau ustadz"
> hanya berasal dari akun ustadz terdaftar (ADR-070). Berkas ini hanya memuat ID, jenis istilah, dan
> catatan Latin, tanpa teks kitab. Lihat ADR-105.

Data per catatan kaki: [`data/reviews/ihya-9472-takhrij-agent-2026-10-26.jsonl`](../reviews/ihya-9472-takhrij-agent-2026-10-26.jsonl)
(`decision` approved/corrected/unsure, `kinds` = jenis istilah yang benar bila dikoreksi,
`false_positive`, `missed`, `misleading`, dan `note` dengan offset karakter di `text_raw`).

## Sampel

4.398 catatan kaki Ihya di `ihya-v7` (label versi 1: `terms` 3.376, `sources_only` 358, `refers_back`
467, `not_takhrij` 197). Sampelnya 253 catatan kaki, diambil sekali dengan seed 20261026 (mulberry32)
sebelum ada penilaian. Urutannya: semua catatan kaki yang dikutip jawaban x06, lalu 25 `mixed`, lalu
maksimal 8 per jenis istilah (urut abjad), lalu 30 `sources_only`, 20 `not_takhrij`, dan 10
`refers_back`, tanpa catatan kaki ganda. Skrip pengambilan tidak di-commit, jadi seed ini tidak bisa
diaudit ulang sepenuhnya; daftar ID-nya ada di berkas data.

| Strata | n | Setuju | Koreksi | Ragu | Menyesatkan |
|---|---:|---:|---:|---:|---:|
| Dikutip jawaban Jawab (semua) | 8 | 8 | 0 | 0 | 2 |
| `mixed` acak | 25 | 14 | 7 | 4 | 7 |
| Per jenis istilah (≤ 8 per jenis, 20 jenis) | 160 | 127 | 29 | 4 | 23 |
| `sources_only` acak | 30 | 15 | 5 | 10 | 8 |
| `not_takhrij` acak | 20 | 19 | 1 | 0 | 1 |
| `refers_back` acak | 10 | 9 | 0 | 1 | 0 |
| **Jumlah** | **253** | **192** | **42** | **19** | **41** |

Sampel sengaja memperbanyak jenis istilah yang jarang, jadi porsinya **bukan** perkiraan untuk seluruh
4.398 catatan kaki. Presisi deteksi istilah (satuan: satu jenis istilah per catatan kaki, dihitung
dari `label.terms` dan `false_positive` di berkas data): **423 dari 450 benar (94,0%)**. Jenis
terlemah: `la_bas` 6/11, `bukhari` 16/20, `muslim` 24/29, `palsu` 10/12, dan `lam_ajid` 17/19. Yang
100% benar di sampel: `sangat_lemah` 24, `mursal` 23, `sebagian` 21, `gharib` 16, `jayyid` 16, `mawquf`
14, `duafa` 11, `hasan_sahih` 10, dan `muallaq` 10.

Dua butir "dikutip jawaban" (10000058, 10000686) memang benar istilahnya, tetapi gloss `lam_ajid`
"tidak ditemukan penakhrij" menyesatkan, karena teksnya berarti tidak ditemukan sebagai sabda Nabi
(marfu'). Penilai jawaban menemukannya di j024/j028; penilai label semula menyetujuinya, lalu agent
induk menandainya menyesatkan.

## Pola yang keliru (bahan aturan versi 2)

Penanda: `#passage_id@offset`.

1. **Beberapa catatan kaki tersimpan sebagai satu paragraf.** Contohnya #10001658, #10005761,
   #10012214, #10012622, #10012762, #10015996: ada penanda "(N)" internal, sehingga istilah dari hadits
   lain ikut dihitung dan `mixed` menggabungkan hadits berbeda. Ini masalah data (pemisahan saat ingest),
   bukan hanya aturan.
2. **Teks matan Ihya bocor ke catatan kaki sesudah baris baru** (#10014268, #10014350, dan ±10 lainnya),
   ditambah 12 "catatan kaki" yang sebenarnya matan. Penyebab dua salah deteksi `la_bas`.
3. **Lafaz hadits sesudah pembuka takhrij ikut dipindai.** Akibatnya: `la_bas` (#10011552@165,
   #10011553@268), `muslim` sebagai kata benda biasa (#10016535@436), "maudhu'" yang berarti
   "diletakkan" (#10011581@253, @317), "majhul" sama hurufnya dengan "kebodohannya", "wa hasuna
   'amaluhu", dan pasif "ruwiya" yang mirip "ru'iya".
4. **Penilaian yang dinukil lalu dibantah al-'Iraqi tetap dihitung**, dan teksnya "berbeda per jalur"
   walaupun jalurnya sama (#10011993 "wa laisa kadzalika", #10016795 "qultu bal munqathi'", "wa fihi
   nazar", "wa laisa bi-jayyid").
5. **`bukhari`** juga menangkap kitab al-Bukhari selain Sahih (at-Tarikh) dan "wa lam yaqul", sementara
   "qala al-Bukhari fi shahihihi" justru terblokir.
6. **`lam_ajid`:** "fihi man la a'rifuhu" (perawi tak dikenal = lemah) terbaca "tidak ditemukan";
   "lam ajidhu illa balaghan" hilang karena notNext "illa"; dan "lam arahu/ajidhu marfu'an" perlu gloss
   sendiri ("tidak ditemukan sebagai sabda Nabi"), bukan "tidak ditemukan penakhrij". Gloss ini membuat
   j028 keliru. Penyebab utama j024 lain lagi: takhrijnya tidak terambil pencarian.
7. **`hasan`/`sahih`/`gharib` sesudah "bin"/"ibn"** (nama perawi, #10012837@287).
8. **Bentuk yang terlewat:** inqitha'uhu/inqitha'an, "laisa isnaduhu bi-muttashil", "ghair mahfuzh",
   "wa shahhaha isnadahu", "bi-isnad akhar jayyid", "wa lisy-syaikhain" (= muttafaq), "ash-shurah
   at-ta'liq", "dun …" dan "wa laisa fihi qauluhu" (= sebagian), "istaghrabahu" (= gharib), "lam aqif li
   …'ala ashl" (= la_asl), "taqaddama min hadits", "fataqaddama", "sa-ya'ti dzikruhu", serta kritik
   perawi: "mutakallam fihi", "yatakallamuna fihi", "man yujhal", "kadzdzabahu", "nusiba ila wadh'".
9. **Tanpa jenis untuk pernyataan positif tentang perawi** ("rijaluhu tsiqat", "rijal ash-shahih",
   "mustaqim al-isnad") dan "mukhtalaf fihi". Akibatnya teks `sources_only` menyatakan "tanpa istilah
   penilaian" padahal ada penilaian. Perlu jenis baru atau teks lain.
10. **Istilah penilaian tunggal tidak dianggap pembuka takhrij** (catatan kaki berakhir "gharib" →
    `not_takhrij`), dan istilah sebelum pembuka yang salah ketik hilang.
11. **`refers_back`** dipakai walaupun catatan kaki menyebut sumber, dan "yarwi al-maudhu'at" (sifat
    perawi) terbaca palsu.

Data teks yang perlu patch (salah ketik di edisi): "istaghrabahu" terpisah spasi, "ahrajahu",
kemungkinan "wa wadha'ahu" untuk "wa dha''afahu". Patch dibuat sebagai berkas patch yang bisa diaudit
(aturan teks Arab 2), bukan dengan menimpa teks.

## Akibat

- Aturan versi 1 **belum layak** menjadi dasar syarat R4 "status hadits benar 100%". Istilah pada 8
  label yang dikutip jawaban eval semuanya benar, tetapi gloss 2 di antaranya menyesatkan. Di sampel
  lebih luas, 41 dari 253 label menyesatkan (sampel berbobot ke jenis jarang, bukan perkiraan
  populasi).
- Aturan versi 2 membatalkan semua tinjauan versi 1 (ADR-070). Karena belum ada tinjauan manusia,
  belum ada yang hilang.
