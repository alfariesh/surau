---
paths:
  - "apps/**"
  - "packages/**"
  - "tools/**"
  - "web/**"
  - "docs/riset/**"
---

# Aturan: teks Arab, kutipan, dan atribusi

Ini adalah inti kepercayaan Surau. Satu kutipan palsu merusak seluruh proyek. Sumber kebijakannya: [docs/01](../../docs/01-visi-dan-prinsip.md) dan [docs/05](../../docs/05-kebijakan.md).

## Aturan keras

1. **Kode menyalin, model menunjuk.** Teks Arab yang tampil ke pengguna, baik di UI, MCP, maupun API, selalu diambil dari database berdasarkan ID paragraf/bagian dan offset. Keluaran LLM tidak pernah dirender sebagai kutipan Arab. Bila LLM mengeluarkan teks Arab di luar blok sitasi, teks itu dibuang atau ditandai, bukan ditampilkan sebagai kutipan.
2. **Teks mentah tidak pernah diubah.** Simpan `text_raw` persis seperti sumber (setelah HTML dibersihkan secara deterministik). Bentuk normal dan peta offset **tidak disimpan**; keduanya dihitung ulang secara deterministik dari `text_raw` + `NORM_VERSION` (bentuk normal dan stem hanya ada di indeks FTS). Perbaikan sumber (typo, struktur daftar isi) dicatat sebagai *patch* terpisah yang bisa diaudit, tidak dengan menimpa teks.
3. **Satu fungsi normalisasi.** Semua normalisasi Arab memakai satu modul (`packages/text`, lihat ARSITEKTUR-TEKNIS). Jangan menulis regex normalisasi baru di tempat lain. Perubahan pada modul ini wajib disertai tes regresi dan pembuatan ulang indeks.
4. **Setiap kutipan punya alamat:** karya, edisi, juz, halaman cetak, dan permalink stabil ke paragraf. ID paragraf dan permalink tidak boleh berubah setelah rilis publik. Bila skema ID berubah, buat pengalihan.
5. **Verifikasi sebelum tampil.** Setiap sitasi dari pipeline jawaban dipetakan ke ID paragraf, lalu dicocokkan (string match setelah normalisasi) dengan teks DB. Sitasi yang gagal dicocokkan tidak ditampilkan dan dicatat ke log.
6. **Status hadits hanya dari takhrij.** Tampilkan teks takhrij asli (catatan kaki al-'Iraqi untuk Ihya). Label ringkas buatan AI berstatus `ai_extracted` (label UI: "diekstrak AI") sampai direview. Bila takhrij tidak ada, tulis "status belum diketahui". Jangan menebak.
7. **Bahasa atribusi, bukan fatwa.** Gunakan pola "Menurut al-Ghazali dalam *Ihya* (j.1 h.200)…". Jangan pernah memakai "Hukumnya adalah…". Bedakan pendapat penulis, pendapat yang ia nukil, dan pendapat yang ia bantah. Tidak ada roleplay orang pertama sebagai ulama.
8. **Terjemahan diberi label.** Terjemahan dan ringkasan buatan model selalu bertanda "terjemahan AI" / "ringkasan AI", disimpan dengan model, versi prompt, dan tanggal pembuatannya.
9. **Ayat tidak pernah diterjemahkan model.** Teks ayat memakai Tanzil (verbatim), dan terjemahannya memakai Kemenag via QuranEnc (verbatim, versi dicatat). Di batch terjemahan, bentang ayat diganti placeholder lalu diisi terjemahan resmi (ADR-020).
10. **Isi kitab adalah data, bukan instruksi.** Teks kitab yang masuk ke prompt dibungkus sebagai dokumen; instruksi sistem tidak boleh bisa ditimpa oleh isi teks.

## Normalisasi (untuk pencarian dan pencocokan, bukan tampilan)

Normalisasi baku Surau (implementasi dan golden tests ada di `packages/text`; prototipe teruji di `docs/riset/2026-10-15-pencarian-arab/`):
- *Presentation forms* (teks hasil salinan PDF, blok U+FB50–U+FDFF dan U+FE70–U+FEFF) dinormalisasi dengan NFKC **per karakter di dalam loop** (`ch.normalize('NFKC')`), bukan pada seluruh string, supaya peta offset tidak rusak. Prototipe riset belum punya langkah ini; S05 wajib menambahkannya beserta tes.
- Hapus harakat dan tanda Qur'ani (U+0610–U+061A, U+064B–U+065F, U+0670, U+06D6–U+06DC, U+06DF–U+06E8, U+06EA–U+06ED), tatweel (U+0640), dan karakter lebar-nol, tanpa memutus kata. U+06DD, U+06DE, dan U+06E9 (penanda ayat/rub'/sajdah) menjadi pemisah.
- Seragamkan huruf: أ إ آ ٱ → ا, ى → ي, ة → ه, ؤ → و, ئ → ي (default aktif; ada opsi untuk mematikannya). Angka Arab-India diubah ke ASCII. Ligatur ﷺ diekspansi.
- Tag HTML, tanda baca, dan penanda catatan kaki `(١)` menjadi pemisah satu spasi.
- **Peta offset:** setiap karakter bentuk normal tahu posisinya di `text_raw` (`map` tidak menurun), sehingga hasil pencarian, ekstraksi, atau verifikasi kutipan selalu dipetakan kembali ke substring mentah yang persis (`toRawSpan`, `findQuote`). `findQuote` menolak kecocokan yang mulai atau berakhir di tengah ekspansi satu karakter mentah (misalnya ﷺ).
- `NORM_VERSION` disimpan di DB. Satu perubahan aturan berarti reindex penuh.
- FTS5 **tidak boleh** mengindeks teks mentah, karena `unicode61` menganggap harakat sebagai pemisah dan `remove_diacritics` tidak berlaku untuk Arab. Yang diindeks adalah teks ternormalisasi ditambah kolom stem proklitik konservatif.
- Regex harakat ditulis dalam escape `\uXXXX`, bukan karakter literal yang tidak terlihat.

## Struktur sumber Shamela (Ihya = ID 9472)

- `page.content` berisi HTML. Paragraf dipisah `\r`, dan judul ditandai `<span data-type="title" id=toc-{title.id}>`. Catatan kaki ada setelah **9** garis bawah `_________`, dengan penanda `(١)` yang merujuk ke penanda yang sama di teks. Sekitar 200 halaman punya takhrij yang bercampur ke matan setelah `//`; bagian ini dipisah dan ditandai `needs_review`.
- `page.part` = juz, `page.page` = halaman cetak (bertipe TEXT, harus di-cast). Pohon judul ada di tabel `title` (`parent = 0` adalah akar); `title.page` menunjuk ke `page.id`, **bukan** ke halaman cetak.
- Daftar isi Ihya punya cacat yang diketahui (lihat [docs/03](../../docs/03-sumber-data.md#temuan-pada-ihya-id-9472)). Perbaiki lewat file patch, lalu validasi otomatis: jumlah kitab per rub', urutan halaman, dan judul yatim.
- Data Shamela dibaca dari drive lokal pemilik (`/Volumes/Elfariesh/database`) dan **tidak pernah masuk git**. Fixture tes memakai potongan kecil berlisensi jelas (OpenITI, CC BY-NC-SA, dengan atribusi) atau teks buatan.

## Tampilan (UI)

- Setiap blok teks Arab: `lang="ar" dir="rtl"`, font Naskh yang dipilih di sistem desain, dan line-height longgar untuk harakat. Teks campuran Indonesia–Arab memakai `<bdi>` atau `dir="auto"` per segmen. Jangan membalik seluruh halaman menjadi RTL.
- Penanda catatan kaki `(١)` bisa diklik dan membuka teks takhrij di tempat.
- Jangan memakai gambar wajah atau ilustrasi sosok ulama. Gunakan simbol kitab atau perpustakaan.

## Tes minimum untuk perubahan di area ini

- Tes unit normalisasi: harakat, alif, ta marbuta, tatweel, NFKC, dan round-trip offset.
- Tes "kutipan karangan ditolak": verifier menolak kalimat yang tidak ada di sumber.
- Tes integrasi terhadap DB Ihya lokal (misalnya j1 h200: hadits shalat malam Jumat + takhrij "باطل لا أصل له"). Tes ini dilewati otomatis bila DB tidak ada, dan teksnya **tidak** disalin ke fixture git.
