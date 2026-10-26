# Label status hadits aturan versi 2 · ihya-v7 · 2026-10-26

> Perbaikan aturan kode `takhrijTerms`/`takhrijLabel` dari versi 1 ke versi 2 (ADR-108), berdasarkan
> [tinjauan agent 2026-10-26](ihya-9472-takhrij-agent-2026-10-26.md) (ADR-105). Penilainya agent,
> **bukan ustadz**: label situs tetap "dikenali otomatis dari teks takhrij, belum ditinjau", dan tidak
> ada yang ditulis ke `takhrij_review`. Laporan ini hanya memuat ID, jenis istilah, dan catatan Latin,
> tanpa teks kitab. Angka sebaran seluruh korpus: [`ihya-9472-takhrij-label.md`](ihya-9472-takhrij-label.md).

## Kecocokan dengan keputusan agent (253 sampel)

Korpus: ekspor hanya-baca `surau-corpus-ihya-v7` (tabel `passage`, `page`, `meta`, `toc_node`), dimuat
dengan `node:sqlite` dan D1 lokal di folder sementara. "Cocok" = himpunan jenis istilah label sama
dengan jenis yang benar menurut agent (label versi 1 bila disetujui, `kinds` bila dikoreksi). Butir
"ragu" (19) tidak punya jawaban benar, jadi tidak dihitung.

Empat jenis baru versi 2 belum ada saat agent menilai, jadi untuk perbandingan `lam_ajid_marfu`
dihitung sebagai `lam_ajid`, sementara `tsiqat`, `mukhtalaf`, dan `dibantah` tidak ikut dibandingkan.
Ini longgar untuk versi 2, karena jenis baru tidak bisa dinilai salah. Karena itu jenis baru diperiksa
terpisah (bagian *Perubahan di seluruh korpus*).

| Strata | Tegas | Cocok v1 | Cocok v2 |
|---|---:|---:|---:|
| Dikutip jawaban Jawab | 8 | 8 | 8 |
| `mixed` acak | 21 | 14 | 17 |
| Per jenis istilah | 156 | 127 | 155 |
| `sources_only` acak | 20 | 15 | 19 |
| `not_takhrij` acak | 20 | 19 | 20 |
| `refers_back` acak | 9 | 9 | 9 |
| **Jumlah** | **234** | **192 (82,1%)** | **228 (97,4%)** |

Per keputusan: disetujui 190/192 (v1 192/192 menurut definisinya), dikoreksi 38/42 (v1 0/42). Ada 41
label yang ditandai menyesatkan. Dari 30 yang punya keputusan tegas, 29 kini cocok, termasuk dua butir
"dikutip jawaban" (#10000058 j028, #10000686). Kedua butir itu sekarang berjenis `lam_ajid_marfu` dengan
gloss "tidak ditemukan sebagai sabda Nabi (marfu')", bukan "tidak ditemukan penakhrij". Ke-11 butir
menyesatkan yang ragu dibahas di bawah. Teks status berubah untuk 65 dari 253 sampel.

### Enam butir yang belum cocok

| Catatan kaki | Keputusan agent | Versi 2 | Sebab |
|---|---|---|---|
| #10004398 | setuju `sahih`+`daif` | `dibantah`+`daif` | Bentuknya "qala al-Hakim shahih al-isnad, qultu fihi …" (pola 4). Penilaian al-Hakim dibantah al-'Iraqi, sama dengan #10016795 dan #10015113 yang dikoreksi atau diragukan agent. Menurut agent (sesi ini), versi 2 yang lebih tepat; perlu dicek manusia. |
| #10005111 | setuju (tanpa `sebagian`) | `+sebagian` | "laisa fiha dzikr li-…" = kisahnya ada di Muslim tanpa menyebut tokoh itu, yaitu bentuk pola 8 yang diminta. Kemungkinan agent melewatkannya. |
| #10007610 | `+daif` | tanpa `daif` | Salah cetak edisi "ghair mahzhuzh" untuk "ghair mahfuzh". Perlu patch teks (lihat di bawah). |
| #10016109 | `+gharib` | tanpa `gharib` | Salah cetak "wastaghfara bihi" untuk "wastaghrabahu". Perlu patch. |
| #10016333 | `hasan` | tanpa istilah | Salah cetak "akhrajahu", jadi pembuka takhrij baru muncul sesudah "wa hassanahu". Perlu patch. |
| #10015996 | gabungan 3 takhrij, + `gharib` | hadits pertama saja | Agent menilai paragraf utuh, sedangkan versi 2 melabeli hadits pertama (pola 1). `gharib` hilang karena salah cetak "wastaghra bihi". |

## Status 11 pola

1. **Catatan kaki tergabung:** selesai di tingkat label. `takhrijTerms` memecah teks per penanda "(N)"
   internal yang diikuti "hadits" (35 paragraf, 122 segmen). Tiap segmen punya pembuka dan bagian
   lafaznya sendiri. Label paragraf utuh = hadits pertama, dengan keterangan "(hadits pertama dari
   beberapa)". Label sitasi = segmen yang beririsan dengan sitasi. "Berbeda per jalur" hanya dihitung di
   dalam satu hadits. Tinjauan ustadz atas label paragraf hanya dipakai untuk sitasi yang hanya mencakup hadits pertama.
   Pemisahan datanya masih tugas ingest (di bawah).
2. **Matan bocor ke catatan kaki:** sebagian. Dua salah deteksi `la_bas` (#10014268, #10014350) kini
   tertolak penjaga konteks, tetapi teks matannya tetap di catatan kaki. Ini masalah ingest (di bawah).
3. **Lafaz sesudah pembuka:** selesai. Sesudah "min hadits/min riwayah fulan", "bi-lafzh", "wa lafzhuhu",
   "wa fi riwayah li-…", kata yang juga lazim di lafaz (`ambiguous`: "muslim", "la ba'sa bihi",
   "maudhu'", "bathil", "hasan", "shahih", "gharib", "dun", dan "jahlahu" atau "dha'fuhu" tanpa nama
   penilai) diabaikan. Pengecualiannya: kata itu langsung disusul pernyataan penakhrij ("… wa la yashih
   wa lin-Nasa'i …"). Bagian lafaz berakhir pada frasa takhrij yang tidak mungkin muncul di lafaz,
   "al-hadits", "qultu", "wa isnaduhu", "wa qala", atau "wa huwa + penilaian".
4. **Penilaian yang dibantah:** selesai dengan jenis baru `dibantah` ("penilaian yang dibantah
   penakhrij"). Rentangnya mencakup penilaian dan bantahannya ("wa laisa kadzalika", "wa laisa kama
   qala", "qultu bal", "wa fihi nazhar", "wa laisa bi-jayyid", dan "qultu" saja bila penilaian positif
   disusul penilaian lemah). `dibantah` tidak positif, tidak negatif, dan tidak memicu "berbeda per
   jalur". "Fihi nazhar" dan "laisa bi-jayyid/bi-shahih" sesudah penilaian lemah penakhrij sendiri
   adalah penguatan, jadi tetap `daif`. Di korpus ada 16 kemunculan.
5. **al-Bukhari/Muslim:** selesai. Tanpa proklitik, keduanya hanya dihitung sesudah kata kerja sumber
   ("akhrajahu/rawahu/zada/lafzh/riwayah/infarada bihi/'allaqahu/afrad/bi-thulihi …"). "al-Bukhari fi
   at-Tarikh/al-Adab/…" tidak dihitung; "wa lam yaqul/lam yadzkurha/qalahu al-Bukhari" juga tidak.
   "qala al-Bukhari fi shahihihi" kini dihitung `bukhari`.
6. **`lam_ajid`:** selesai. Ada jenis baru `lam_ajid_marfu` (23 catatan kaki, termasuk "lam ajid lahu
   ashlan fi hadits marfu'"). "fihi man la a'rifuhu/man lam a'rifhu/man yujhal/man lam yusamma" kini
   `daif`, dan "lam ajidhu illa balaghan" kini `lam_ajid`. "lam ajid lahu ashlan fi al-maushulat/fi …"
   menjadi `lam_ajid`, bukan `la_asl`.
7. **"bin/ibn" sebelum hasan/sahih/gharib:** selesai (nama perawi).
8. **Bentuk yang terlewat:** selesai, kecuali yang bergantung pada salah cetak. Tambahannya: inqitha'uhu,
   inqitha'an, munqathi'ah, "laisa isnaduhu bi-muttashil", "ghair muttashil", "ghair mahfuzh", "laisa
   bi-mahfuzh", "wa shahhaha isnadahu" (sebelumnya tidak dikenali di 29 catatan kaki), "bi-isnad akhar
   jayyid/shahih/…", "wa lisy-syaikhain" dan "'inda asy-syaikhain" (`muttafaq`), "shurah at-ta'liq",
   "dun hadzihi …/dun + kata" sesudah penyebutan sumber, "wa laisa fihi/fiha/'indahu/fi … qauluhu/dzikr"
   (`sebagian`), "istaghrabahu" dan "la na'rifuhu illa min" (`gharib`), "lam aqif li-… 'ala ashl"
   (`la_asl`), "taqaddama min hadits", "qad taqaddama", "fa-taqaddama aidhan", "sa-ya'ti dzikruhu",
   "kama sa-ya'ti", "mutakallam fihi", "yatakallamuna fihi", "takallamu fihi", "kadzdzabahu + penilai",
   "nusiba ila al-wadh'", "yarwi al-maudhu'at" (`sangat_lemah`, bukan `palsu`), dan "la yashih minha
   syai'". "ath-thariq al-mutaqaddimah" (sifat jalur) bukan lagi rujukan.
9. **Pernyataan positif tentang perawi dan "mukhtalaf fihi":** diputuskan dengan dua jenis baru, yaitu
   `tsiqat` ("perawi/sanad dinilai tepercaya": rijaluhu tsiqat, rijaluhu rijal ash-shahih, ruwatuhu
   tsiqat, mustaqim al-isnad, wa huwa tsiqah, watstsaqahu; 70 catatan kaki) dan `mukhtalaf`
   ("perawi/sanad diperselisihkan": mukhtalaf fihi, ukhtulifa fi isnadihi/raf'ihi/washlihi; 32 catatan
   kaki). Keduanya bukan penilaian hadits, jadi tidak positif atau negatif dan tidak memicu tanda lemah.
   Catatan kaki seperti ini tidak lagi berteks "tanpa istilah penilaian". "ma'a ikhtilaf (lafzh)" =
   perbedaan lafaz, bukan perselisihan.
10. **Penilaian tunggal tanpa pembuka:** selesai untuk catatan kaki "hadits …" yang berakhir dengan
    penilaian ("… gharib", "… wa qala hasan gharib") dan catatan kaki yang hanya berisi penilaian
    ("(2) dha'if"). Matan yang tercetak sebagai catatan kaki ("… qala khuluq hasan") tidak terbaca.
    Istilah sebelum pembuka yang salah cetak tetap butuh patch.
11. **`refers_back`:** selesai. Rujukan yang juga menyebut sumber kini berteks "takhrij menyebut sumber
    riwayat dan merujuk ke takhrij di tempat lain". "yarwi al-maudhu'at" tidak lagi `palsu` (lihat 8).

### Butir ragu (19)

Berubah ke jenis baru atau segmen: tsiqat/mukhtalaf (#10002554, #10004070, #10008388, #10011598,
#10012840, #10013698, #10013706, #10017394, #10017840, #10020253), dibantah (#10002627, #10005053,
#10015113), dan hadits pertama saja (#10012214, #10012622, #10012762). Yang tetap: #10009288 (kini
`+bukhari` dari "qala al-Bukhari fi shahihihi"), #10015785 (dugaan salah cetak "wa wadha'ahu"; teks
rujukan kini menyebut sumber), dan #10020317 ("asyyakh lam yusammau", bentuk jamak; tidak ditebak).

## Perubahan di seluruh korpus (4.398 catatan kaki)

764 catatan kaki berubah label (istilah, rentang, atau teks). Jenis label: memuat istilah 3.376 →
3.437, hanya sumber 358 → 301, hanya rujukan 467 → 466, bukan takhrij 197 → 194. "Berbeda per jalur"
253 → 248 dan bertanda lemah 1.368 → 1.385. Setiap jenis yang hilang dan setiap jenis baru di satu
catatan kaki (500 butir) diperiksa agent dengan konteks tiga kata. Pola keliru yang ditemukan di
pemeriksaan itu sudah diperbaiki sebelum laporan ini: "dun" umum, "laisa * dzikr" bebas, "ma'a
ikhtilaf", "li-ma ukhtulifa fihi" di lafaz doa, "wa fi riwayah li-Muslim", rujukan "taqaddama" di
lafaz, "hadits hasan/maudhu'", dan "jahhalahu/dha''afahu" tanpa "wa-". Yang masih terlihat:

- Hilang karena segmen (sesuai rancangan): istilah hadits kedua dan seterusnya di 35 paragraf gabungan
  tidak lagi masuk label paragraf (mis. #10013972 dan #10014073).
- Masih keliru, jarang: "fa-laisa bi-shahih" tentang klaim tanggal (#10010768) terbaca `daif`; "qala
  khuluq hasan" dan sejenisnya bisa terbaca bila matan tanpa sumber diawali "hadits".

## Masalah ingest: rancangan, belum dikerjakan

`text_raw` tidak diubah di sesi ini (aturan teks Arab 2). Ada tiga pekerjaan ingest:

1. **Catatan kaki tergabung (35 paragraf, 122 segmen).** Contohnya #10001658 (5), #10005761 (7),
   #10012622 (6), #10013368 (7), #10013416 (6), #10013972 (6), dan #10014073 (8). Daftar lengkapnya
   dibuat ulang dengan `takhrijTerms(raw).segments`. Rancangan: saat ingest, segmen ke-2 dan seterusnya
   menjadi paragraf `foot` baru dengan **ID baru di ujung ruang seq** (`data/ids/ihya-9472.json`). ID
   segmen pertama tetap, jadi permalink lama tidak berubah dan tidak perlu pengalihan. Penanda badan
   "(N)" yang yatim ditautkan ke paragraf barunya (`footnote_ref`). Batasnya deterministik (fungsi yang
   sama dengan label, dipindah ke `packages/text` sebagai `splitMergedFootnotes`), dicatat di
   `passage_needs_review` dengan alasan baru `footnote_merged`, dan diuji dengan validasi
   "penanda yatim berkurang, tidak ada `footnote_ref` salah arah".
2. **Matan bocor ke catatan kaki** (baris baru lalu teks Ihya; agent menemukan ±10, ditambah 12 "catatan
   kaki" yang sebenarnya matan). Ini tidak bisa dipotong otomatis di setiap baris baru: dari 220 catatan
   kaki berbaris baru, 46 berlanjut dengan takhrij sungguhan sesudah baris itu. Heuristik "baris > 120
   karakter tanpa penanda takhrij" memberi 114 kandidat yang perlu dipilah. Rancangan: file patch
   `data/patches/ihya-9472-catatan-kaki.yaml` berisi `{passage_id, split_at (offset mentah),
   alasan: matan_bocor | matan_sebagai_catatan}`. Kandidatnya diusulkan dari pencocokan bigram dengan
   segmen takhrij JK000001 yang sudah dipakai ingest (bagian yang tidak cocok = kandidat matan), lalu
   dipilah agent/manusia. Saat ingest, bagian matan dipindah ke paragraf badan sesudahnya, dengan
   `passage_needs_review` = `takhrij_boundary`.
3. **Salah cetak edisi** (patch yang bisa diaudit, bukan menimpa teks): "ghair mahzhuzh" (#10007610),
   "wastaghfara bihi" (#10016109), "wastaghra bihi" (#10015996), "akhrajahu" salah cetak (#10016333),
   dugaan "wa wadha'ahu" (#10015785), dan "wa dhaffahu al-Bukhari" (#10002780). Patch teks mengubah
   `text_raw` di korpus build. Keputusan bentuknya (patch teks atau alias pola khusus edisi) perlu ADR
   sendiri.

Semua pekerjaan itu mengubah korpus (build + promote baru), jadi dikerjakan di sesi ingest tersendiri.

## Cara mengulang

- `pnpm run eval:takhrij` (`SURAU_EVAL_STATE` = folder D1 lokal yang memuat `meta`, `page`, `toc_node`,
  dan `passage` ihya-v7) → `data/reports/ihya-9472-takhrij-label.md`.
- Tes integrasi `packages/core/test/local/takhrij-label.test.ts` (D1 lokal; dilewati bila tidak ada):
  enam takhrij gold dan 40 catatan kaki tinjauan agent yang kini cocok.
- Skrip perbandingan v1/v2 atas 253 ID tidak di-commit karena membaca teks kitab dari ekspor lokal.
  Isinya: label v1 dari `git show 4c8e4dc:packages/text/src/takhrij-terms.ts` (dan `takhrij-label.ts`)
  dibandingkan dengan label sekarang memakai himpunan jenis di atas.
