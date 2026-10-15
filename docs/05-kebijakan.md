# 05 · Kebijakan (DRAF: perlu direview ustadz/dewan pengawas)

## 1. Kutipan

- Teks Arab yang ditampilkan **selalu disalin oleh kode** dari sumber, berdasarkan ID bagian dan posisi karakter. Model AI tidak pernah menulis kutipan Arab sendiri.
  - Di v1, mekanismenya memakai Citations bawaan Claude: setiap paragraf kitab dikirim sebagai satu blok dokumen; Claude menunjuk blok yang dikutip; kode memetakan blok itu ke ID paragraf lalu menampilkan teks dari database.
- Sebelum tampil, setiap kutipan dicocokkan ke sumbernya (setelah normalisasi). Kutipan yang tidak cocok ditolak dan tidak ditampilkan.
- Setiap kutipan disertai kitab, edisi, juz, halaman cetak, dan permalink.
- Terjemahan selalu ditandai sebagai **terjemahan AI**, kecuali berasal dari terjemahan resmi yang berlisensi.

## 2. Atribusi dan bukan-fatwa

- Gunakan bahasa atribusi: "Menurut al-Ghazali dalam *Ihya* (j.1 h.200)…". Jangan pakai bahasa putusan seperti "Hukumnya adalah…".
- **Jangan menggabungkan pendapat lintas sumber menjadi satu "hukum Islam".** Tampilkan siapa berpendapat apa, termasuk khilaf bila ada.
- Bedakan dengan jelas tiga hal: pendapat penulis, pendapat yang ia nukil, dan pendapat yang ia bantah.
- Untuk pertanyaan tentang kasus pribadi (masalah keluarga, harta, ibadah tertentu), sampaikan isi kitab yang relevan lalu sarankan bertanya kepada ulama setempat.
- Surau memosisikan diri sebagai **asisten riset**, sejalan dengan sikap MUI (2025) bahwa AI tidak bisa dijadikan rujukan hukum agama.

## 3. Persona dan Ruang Tokoh

- **Tidak ada roleplay orang pertama** ("Aku, al-Ghazali, berpendapat…"). Alasannya:
  - Itu sama dengan menaruh kata-kata di mulut ulama, dan menisbatkan ucapan tanpa sumber adalah perkara serius.
  - Pandangan ulama bisa berkembang sepanjang hidupnya (contoh: *Tahafut* vs. *Munqidh* dan *Ihya*). Satu persona akan meratakannya.
  - Risiko kesalahpahaman dan penolakan publik tinggi.
- **Ruang Tokoh** (misalnya "Ruang Kitab al-Ghazali"): agen yang cakupannya karya-karya seorang ulama.
  - Berbicara dalam orang ketiga.
  - Menunjukkan perbedaan antar karya dan antar periode.
  - Sang ulama hanya "berbicara" lewat kutipan verbatim.
- **Metadata wajib per karya** di Ruang Tokoh: status atribusi (sahih/diperdebatkan/palsu), periode, dan bahasa asli. Karya yang atribusinya diperdebatkan diberi label di setiap jawaban.
- **Visual:** jangan memakai wajah atau ilustrasi sosok ulama. Gunakan simbol kitab atau perpustakaan.

## 4. Hadits

- Status hadits diambil dari takhrij yang sudah ada (misalnya al-'Iraqi untuk Ihya), dengan **teks takhrij asli** ditampilkan.
- Label ringkas (dhaif, maudhu', dan sebagainya) yang dibuat AI berstatus `diekstrak_ai` sampai direview.
- Bila tidak ada takhrij, tampilkan "status belum diketahui". **Jangan menebak.**
- Hadits yang berstatus sangat lemah, palsu, atau "tidak ada asalnya" diberi tanda yang jelas setiap kali dikutip.

## 5. Menolak menjawab

Jawab "tidak ditemukan di kitab yang dicakup" bila:
- tidak ada bagian relevan yang ditemukan;
- pertanyaannya berpremis keliru (misalnya menanyakan pendapat yang tidak pernah ditulis sang ulama); atau
- pertanyaannya di luar cakupan ruang/agen.

Kemampuan menolak ini diukur di setiap eval.

## 6. Wiki dan data terstruktur

- Setiap fakta menyimpan sumber (bagian + posisi) dan status review-nya.
- Fakta tingkat C (qaul + sikap, masalah & hukum, label hadits) **wajib** direview ustadz sebelum ditampilkan sebagai terverifikasi.
- Koreksi dari ustadz tidak boleh tertimpa oleh proses ekstraksi ulang. Ekstraksi baru hanya menambah kandidat, tidak menghapus hasil review.

## 7. Lisensi

- Kode: Apache-2.0.
- Data turunan OpenITI: CC BY-NC-SA 4.0.
- Data Shamela tidak diredistribusikan sampai ada izin.
- Set eval dan data hasil review ustadz: rencananya dirilis terbuka (misalnya CC BY-SA). Sebagian soal eval disimpan privat supaya benchmark tidak bocor ke data latih model.

## 8. Privasi

- Pertanyaan pengguna bisa sangat pribadi. Data identitas dihapus dari trace sebelum disimpan di alat eval.
- Tidak ada pelatihan model memakai pertanyaan pengguna tanpa persetujuan.

## 9. Tata kelola

- **Dewan pengawas:** ustadz/ulama yang mereview kebijakan ini, prompt sistem, kebijakan penolakan, dan sampel jawaban secara berkala.
- **Log koreksi publik:** setiap koreksi data atau jawaban dicatat secara terbuka.
- **Jalur pelaporan:** pengguna bisa melaporkan jawaban yang keliru langsung dari UI.
