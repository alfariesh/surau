# Tinjauan prarilis Fase 2 — 17 Oktober 2026

**Rekomendasi agent: tunda `/rilis 2` dan S16 sampai temuan terjemahan diperbaiki dan dinilai ulang.** Pemeriksaan 20 rujukan T-16 cocok; penilaian T-17 di bawah target Benar ≥80%. Ini tinjauan AI kedua untuk membantu pemilik, bukan persetujuan pemilik atau verifikasi ustadz. Checklist tugas pemilik belum ditutup.

## Sumber dan batas pemeriksaan

- [Artefak yang dikirim pemilik](https://claude.ai/artifact/3BoaNKz2uL7e1ymEEaCPnH) berjudul **Soal Eval Pencarian**: 31 soal T-12, bukan hasil penilaian T-16/T-17. Tampilan anonim baca saja menunjukkan 0 penilaian dan meminta masuk untuk melihat data; angka itu tidak membatalkan persetujuan pemilik yang sudah tercatat di proyek.
- Sampel resmi: `ihya-9472-ayat.md` (20 baris T-16) dan `ihya-9472-terjemahan.md` (20 baris T-17), di direktori ini. Tidak mengganti sampel ketika menemukan kesalahan.
- Membaca 20 pasangan Arab–Indonesia di `data/build/llm/qa/review-batch.html`, mencocokkan semuanya dengan SQLite `data/build/surau-corpus-ihya-v5.sqlite`, dan membaca konteks sekitar bagian yang meragukan. Seluruh teks sumber dan terjemahan cocok; untuk nomor 5, placeholder QS 7:16 diganti Kemenag dan isi penggantinya juga cocok.
- SHA-256 SQLite yang diperiksa: `5834b099634d0f55b4017f7091fb9dab80d7322024a8308fc0513faab713e2e1`.
- T-16: membaca bentang kutipan beserta konteks dalam korpus; membandingkan dengan ayat rujukan. Teks `quran_ayah.text_index` untuk semua rujukan sampel juga cocok dengan berkas Tanzil `data/raw/tanzil/quran-simple-clean.xml`.
- Memastikan kesalahan satuan pada p3032 masih tampil di situs produksi melalui browser. Pemeriksaan 40 sampel selebihnya berbasis korpus lokal; tidak mengklaim sudah membuka seluruh popup produksi.
- Ini pemeriksaan kesetiaan terjemahan terhadap sumber, bukan penetapan hukum atau pemeriksaan kesahihan semua hadis dalam kitab. Lima contoh ringkasan di halaman QA tidak masuk skor 20 terjemahan.

## T-16 — 20/20 rujukan cocok

| No. | Paragraf | Rujukan | Penilaian |
|---|---|---|---|
| 1 | p1262 | 41:21 | Cocok dengan kutipan dan konteks pengantar ayat. |
| 2 | p1452 | 27:90 | Cocok; kutipan sebagian ayat. |
| 3 | p2354 | 1:1 | Cocok dalam konteks bacaan salat. Basmalah juga ada di 27:30; `alt_count=1` sudah tercatat. |
| 4 | p5097 | 24:61 | Cocok; pengantar eksplisit ayat makan menguatkan kutipan dua kata. |
| 5 | p7757 | 24:61 | Cocok; pembahasan makan di rumah saudara/teman. |
| 6 | p10408 | 5:83 | Cocok. |
| 7 | p11799 | 74:31 | Cocok. |
| 8 | p12347 | 10:7 | Cocok. |
| 9 | p13055 | 49:6 | Rujukan cocok; ejaan بنبأ/بنبإ berbeda, bukan salah nomor ayat. |
| 10 | p13111 | 49:12 | Cocok. |
| 11 | p13480 | 57:21 | Cocok; lafaz سابقوا, bukan وسارعوا pada 3:133. |
| 12 | p13745 | 3:14 | Cocok. |
| 13 | p14474 | 87:16–17 | Kedua ayat cocok berurutan. |
| 14 | p15446 | 18:104 | Cocok. |
| 15 | p16250 | 53:29–30 | Cocok; kutipan melintasi batas kedua ayat. |
| 16 | p17455 | 4:77 | Bentang yang disampel adalah قل متاع الدنيا قليل (offset 419–438). Di paragraf yang sama juga ada kutipan lain dari ayat ini. |
| 17 | p17559 | 28:83 | Cocok. |
| 18 | p17845 | 14:12 | Cocok. |
| 19 | p18498 | 10:7 | Cocok. |
| 20 | p20289 | 5:116 | Cocok. |

Hasil ini mendukung ketepatan rujukan yang sudah ditemukan pada sampel tersebut. Tidak mengukur ayat yang luput dan tidak mencakup audit tambahan 832 rujukan mode S13. Sampel T-17 nomor 17 justru memperlihatkan ayat yang luput.

## T-17 tahap 2 — penilaian agent

Rubrik mengikuti TUGAS-PEMILIK: B = makna tepat; K = makna utama benar tetapi ada yang janggal/hilang; S = makna keliru. **14 B (70%), 4 K (20%), 2 S (10%)**. Syarat Benar ≥80% belum tercapai; Salah berada tepat pada batas ≤10%, bukan melebihinya. Ini bukan dasar mengklaim aturan otomatis “Salah >10%” telah terpicu.

| No. | Paragraf | Nilai | Alasan |
|---|---|---|---|
| 1 | p1225 | B | Makna pengakuan ketidakmampuan mengenal Allah tersampaikan. |
| 2 | p3032 | S | Sumber menyebut ثمانمائة من (800 mann), tetapi terjemahan menambahkan satuan rithl. Pergantian unit mengubah besaran. |
| 3 | p3081 | B | Segera sesudah haul dan batas waktu zakat fitrah tersampaikan. |
| 4 | p3232 | B | Penentuan kadar melalui ijtihad dan anjuran wara' tersampaikan. |
| 5 | p3482 | K | Akhir keluaran mengandung tanda `(` tambahan: “Tidak pernah terlihat(”. Sumber memang terputus; keterputusan sumber sendiri bukan kesalahan model. Pilihan “Semoga” untuk غفر لهم tidak dijadikan kesalahan pasti karena bentuk ini dapat dipakai sebagai doa. |
| 6 | p6294 | B | Kewajiban belajar fikih bagi pencari penghasilan tersampaikan. |
| 7 | p6865 | B | Makna utama pengembalian barang karena kekhawatiran transaksi saat azan cocok. Konteks sebelum/sesudahnya memang mengkritik kehati-hatian berlebihan. Sebaiknya perjelas bahwa pembelian hari Jumat adalah transaksi sebelumnya oleh penjual. |
| 8 | p9153 | B | Makna tawaduk sebagai manfaat pergaulan cocok; akhir “dan tidak” mengikuti sumber yang terputus. |
| 9 | p9200 | S | كميك menunjuk kedua lengan baju, bukan kedua siku. اضرب juga berubah dari pukulkan/tebaskan menjadi letakkan. |
| 10 | p9870 | B | Perbandingan tenggorokan, benda mati, dan makhluk hidup tersampaikan. |
| 11 | p10521 | B | Adab menyimak dengan hati hadir dan menjaga pandangan tersampaikan. |
| 12 | p10786 | B | Berkurangnya kehormatan/wibawa akibat tindakan langsung dan sulitnya memberi batas tersampaikan; sumber berupa lanjutan kalimat. |
| 13 | p13002 | B | Pembelaan terhadap Muslim yang digibahi dan rujukan ke pembahasan terdahulu tersampaikan. |
| 14 | p15283 | B | Penjelasan pakaian sederhana/rendah mutunya tersampaikan; ejaan transliterasi dapat dirapikan. |
| 15 | p16882 | B | Pelaku yang melihat tanda lalu membeli/membagikan gula dan badam sesuai konteks p16881. “Saudaranya” dapat diperjelas menjadi “saudaranya sesama pengkaji/sahabatnya”. |
| 16 | p17158 | K | بأبي أنت وأمي adalah ungkapan pengorbanan/penghormatan, tetapi menjadi “demi ayah dan ibuku”, yang terdengar sebagai sumpah. Detail kain yang sebelumnya dikenakan Nabi juga hilang. Alur utama kisah masih tepat. |
| 17 | p18257 | K | Awal sumber melanjutkan في مقعد pada p18256; model menjadikannya kalimat baru “Sesungguhnya mereka ...”, mengubah konstruksi dan subjek dari konteks tunggal. Terpisah dari skor bahasa, potongan QS 54:55 ini belum diberi rujukan dan diterjemahkan AI. |
| 18 | p18732 | B | Makna bahwa niat tidak mengubah maksiat menjadi ketaatan tersampaikan. |
| 19 | p19961 | B | Rangkaian cerita dan penuturnya tersampaikan; ini bukan pengesahan historis riwayatnya. |
| 20 | p20304 | K | أبيمينه يأخذ كتابه أو شماله adalah menerima kitab dengan tangan kanan/kiri; keluaran menggantinya dengan “diberikan dari sebelah kanan/kiri”. “Saat membaca” juga menambahkan kegiatan yang tidak dinyatakan sumber. Bagian timbangan tetap tersampaikan. |

Nilai K nomor 5 terutama masalah kerapian dan dapat diputuskan B oleh peninjau manusia. Dalam pembacaan lebih longgar itu, Benar menjadi 75%, masih di bawah target 80%. Jangan menaikkan skor dengan mengganti nomor sampel atau memasukkan lima ringkasan tambahan.

## Temuan yang perlu ditangani sebelum rilis

1. **Satuan berubah pada p3032 (j1 h210), juga p3031 di halaman yang sama.** Pertahankan “800 mann” sesuai sumber; jangan mengganti atau mengonversi unit tanpa dasar yang eksplisit. Terjemahan p3033 menggunakan “mana”, sehingga ada ketidakkonsistenan di dalam satu rangkaian. [Situs produksi p3032](https://surau-web.alfarieshsalman.workers.dev/kitab/ihya/1/210#p3032). Lisan al-Arab membedakan mann dari rithl, menyebut satu mann sebagai dua rithl: [entri منن](https://www.islamweb.net/amp/ar/library/content/122/7983/%D9%85%D9%86%D9%86). Ini pemeriksaan unit dalam teks, bukan konversi ke ukuran zakat masa kini.
2. **Objek dan tindakan berubah pada p9200 (j2 h243).** Usulan frasa: “Pukulkan kedua lengan bajumu ke dinding, lalu katakan: Tuhanku adalah Allah.” Keterangan makna simbolis perlu dipisahkan dari terjemahan literal. [Lisan al-Arab, entri yang memuat كُمّ](https://ar.wikisource.org/wiki/%D9%84%D8%B3%D8%A7%D9%86_%D8%A7%D9%84%D8%B9%D8%B1%D8%A8/%D9%83%D9%85%D8%AA%D9%84_-) mendefinisikannya sebagai bagian pakaian tempat tangan masuk/keluar.
3. **QS 54:55 terbelah di p18256–p18257 (j4 h335).** Sumber mushaf: في مقعد صدق عند مليك مقتدر. Kedua paragraf tidak memiliki baris `passage_ayah_ref`; hasil AI mengambil alih terjemahannya. Perbaikan perlu mempertimbangkan kutipan lintas paragraf tanpa mengubah teks Arab atau ID. Ini bukti konkret risiko ADR-042 yang sudah dicatat, bukan klaim baru bahwa seluruh pencocok rusak. Footer produksi masih mengatakan tanpa pembatas “Kutipan ayat tidak diterjemahkan AI”; sesuaikan menjadi klaim tentang kutipan **yang berhasil dikenali**, sambil memperbaiki kasus ini.
4. **Makna judul terbalik dalam artefak T-12, r11 / p5351 (j2 h21).** الترغيب في النكاح والترغيب عنه ditampilkan sebagai “Anjuran untuk Menikah dan Celaan terhadap Tidak Menikah”. Semestinya “Anjuran menikah dan anjuran menjauhinya”. Kesalahan sama ada di terjemahan korpus lokal. Lokasi hasil pencarian dapat benar walaupun terjemahannya salah. Ini di luar 20 sampel; tidak dimasukkan ke penyebut skor.
5. **Ungkapan pada p17158 dan ketepatan tangan kanan/kiri pada p20304.** Perbaiki kedua nilai K semantik. Untuk بأبي أنت وأمي, lihat penjelasan “فداك أبي وأمي” dalam [Mirqat al-Mafatih](https://www.islamweb.com/ar/library/content/79/4742/%D8%A8%D8%A7%D8%A8-%D8%B1%D8%AD%D9%85%D8%A9-%D8%A7%D9%84%D9%84%D9%87).

## Makna hasil pencarian dan tindak lanjut

Laporan retrieval resmi mencatat hit@10 100% pada 31 soal, hit@1 64,5%, serta 8/13 lokasi untuk topik tersebar. Saya setuju gerbang pencarian tertulis lolos berdasarkan laporan itu; evaluasi retrieval tidak dijalankan ulang dalam tinjauan ini. Angka tersebut tidak membuktikan ketepatan semua terjemahan atau kelengkapan semua lokasi. Artefak juga masih memakai label p12, sedangkan set resmi sudah memindahkannya menjadi r12; sebaiknya perbarui artefak saat menyiapkan bukti rilis.

Urutan yang disarankan: perbaiki temuan makna dan ayat → bangun korpus berikutnya melalui alur proyek → nilai ulang 20 sampel yang sama, lalu tambah sampel terarah untuk satuan, ungkapan, negasi/arah makna, dan ayat lintas paragraf → catat keputusan pemilik → `/rilis 2` → S16 (tetap memerlukan T-07/domain). Jangan menimpa riwayat skor sebelum perbaikan dengan skor setelah perbaikan.

Catatan kecil alat QA: pembuka HTML menyebut “25 paragraf acak”, padahal isinya 20 terjemahan dan 5 ringkasan. `tools/ingest/src/llm/report.ts:246` menghitung `items.length` setelah menambah ringkasan. Sampel terjemahan juga mengganti paragraf tanpa keluaran dengan paragraf berikutnya yang punya keluaran (`report.ts:96`); skor terjemahan karena itu tidak mengukur kegagalan cakupan, yang harus dibaca terpisah dari laporan batch.

Tinjauan ini hanya menambah laporan. Tidak ada perubahan korpus, prompt, produksi, status persetujuan manusia, pengiriman batch berbayar, atau rilis.
