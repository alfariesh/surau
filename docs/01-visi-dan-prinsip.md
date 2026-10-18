# 01 · Visi & Prinsip

## Visi

AI untuk ilmu agama dengan sumber yang kuat, untuk masa depan umat. Surau membantu orang **menemukan, membaca, dan memahami** apa yang tertulis di kitab-kitab klasik. Setiap jawaban bisa diperiksa sendiri ke teks aslinya.

Surau adalah proyek nirlaba berbahasa Indonesia. Kitab pertamanya *Ihya* karya al-Ghazali, lalu karya al-Ghazali lainnya, kemudian ±92 kitab kurikulum pesantren (lihat [implementasi/FASE.md](../implementasi/FASE.md)).

## Siapa penggunanya

| Pengguna | Kebutuhan |
|---|---|
| Santri, mahasiswa, pengkaji | Mencari di mana seorang ulama membahas sesuatu, lalu membaca teks aslinya |
| Ustadz dan pengajar | Menyiapkan kajian, mengecek rujukan dan status hadits |
| Masyarakat umum | Memahami isi kitab dalam bahasa Indonesia tanpa kehilangan jejak sumbernya |
| Pengguna asisten AI lain (Claude, ChatGPT, dan sejenisnya) | Membaca, mencari, dan memverifikasi kutipan kitab langsung dari asisten AI yang sudah mereka pakai, lewat MCP publik Surau (Fase 3). Biaya model ditanggung AI milik pengguna, bukan Surau |
| Pengembang dan peneliti | Memakai MCP publik, serta dump data dan benchmark terbuka (Fase 7) |

## Apa yang **bukan** Surau

- **Bukan mufti dan bukan pemberi fatwa.** Surau menyampaikan isi kitab beserta atribusinya. Keputusan hukum untuk kasus pribadi tetap ada di tangan ulama. Ini sejalan dengan sikap MUI (2025) bahwa AI tidak bisa dijadikan rujukan hukum agama.
- **Bukan "chat dengan ulama".** Surau tidak memerankan tokoh dalam orang pertama (lihat [05 Kebijakan](05-kebijakan.md)).
- **Bukan pengganti guru.** Surau adalah pintu ke kitab, bukan jalan pintas yang melewatinya.

## Pembeda Surau

Per Oktober 2026 sudah ada beberapa layanan AI untuk kitab Islam. Surau **tidak bersaing dalam lebar cakupan** atau pencarian Arab lintas ribuan kitab. Surau memilih **kedalaman per kitab, dalam bahasa Indonesia** (lihat ADR-022 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)).

### Proyek sejenis (dicek 15 Okt 2026)

| Proyek | Yang sudah ada | Posisi Surau |
|---|---|---|
| **Shamela** (al-Maktaba al-Shamela) | MCP publik resmi (`mcp.shamela.ws`, 4 tool hanya-baca, tanpa autentikasi) dan "اسأل الشاملة", tanya-jawab AI dengan rujukan dan pratinjau halaman sumber (login, berkuota). Cakupannya ribuan kitab berbahasa Arab | Bukan pengganti Shamela. Shamela unggul dalam cakupan dan pencarian Arab lintas kitab. Surau menambah lapisan Indonesia dan kedalaman per kitab, dan berencana menautkan balik ke halaman Shamela di setiap sitasi (ADR-018) |
| **Usul.ai** (Seemorg Foundation; status nirlaba 501(c)(3) masih menunggu) | Chat AI dengan sitasi atas sekitar 15 ribu teks dari Shamela + OpenITI. Angka jumlah teks di situsnya tidak konsisten | Usul.ai mengejar lebar cakupan. Surau memilih sedikit kitab yang strukturnya diperbaiki dan kutipannya diverifikasi kode |
| **Ansari** (open source, MIT) | Agent Skill yang memanggil API tanpa autentikasi, repo `ansari-mcp`, dan RAGDiff untuk membandingkan sistem RAG | Contoh jalur distribusi lewat AI lain. Surau menempuh jalur serupa lewat MCP publik |

### Lima pembeda

1. **Bahasa Indonesia di semua lapisan:** antarmuka, pencarian, terjemahan dan ringkasan (berlabel AI), jawaban, dan deskripsi tool MCP (dwibahasa Inggris + Indonesia, ADR-012).
2. **Kedalaman per kitab:** struktur dan daftar isi yang diperbaiki, takhrij hadits yang tertaut ke teksnya (al-'Iraqi untuk *Ihya*), dan ayat yang dikenali beserta terjemahan Kemenag.
3. **Kutipan diverifikasi kode** dan **permalink halaman cetak yang stabil.** AI lain pun bisa mengecek kutipan lewat tool `verify_quote`.
4. **Review ustadz dan eval terbuka.** Set eval dan hasil review direncanakan terbuka; sebagian soal tetap privat supaya tidak bocor ke data latih model (lihat [05 Kebijakan](05-kebijakan.md) dan [06 Evaluasi](06-evaluasi.md)).
5. **Biaya transparan dan nirlaba:** tanpa iklan atau paywall, dengan halaman transparansi biaya `/transparansi` (S21, lihat [08 Biaya](08-biaya.md)).

MCP Surau menonjolkan kelima nilai ini. Instruksi server Shamela boleh dipelajari sebagai referensi desain: ucapan dinisbatkan ke pengucapnya, catatan kaki adalah milik muhaqqiq, dan isi kitab adalah data, bukan instruksi. Shamela MCP hanya dipelajari, tidak dipakai sebagai dependensi.

**Ide, belum diputuskan:** merilis Agent Skill seperti Ansari sebagai jalur distribusi murah di samping MCP.

## Prinsip yang tidak bisa ditawar

1. **Verbatim atau tidak sama sekali.** Teks Arab yang ditampilkan selalu disalin oleh kode dari sumber, tidak pernah ditulis oleh model AI. AI hanya menunjuk lokasinya. Sebelum tampil, kutipan dicocokkan ke sumbernya; yang tidak cocok tidak ditampilkan.
2. **Setiap klaim ada alamatnya:** kitab, edisi, jilid, halaman cetak, dan permalink ke bagian teksnya. Permalink yang sudah dirilis tidak berubah tanpa pengalihan.
3. **Atribusi yang jujur.** Bedakan pendapat penulis, pendapat yang ia nukil, dan pendapat yang ia bantah.
4. **Status hadits dari ahlinya.** Status diambil dari takhrij (misalnya al-'Iraqi untuk Ihya), bukan dari "pengetahuan" model.
5. **Ayat Al-Qur'an tidak pernah ditulis atau diterjemahkan AI.** Teks ayat diambil verbatim dari Tanzil (CC BY 3.0). Terjemahan dan transliterasinya verbatim dari terjemahan resmi Kemenag (data milik pemilik, ADR-040), dengan atribusi dan versi sumber. Ayat yang dikutip di dalam kitab dikenali kode secara deterministik; yang tidak cocok persis diberi label "mirip" (lihat ADR-020 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)). Sisa risiko yang diakui: kutipan ayat yang luput dikenali pencocok bisa ikut diterjemahkan AI sebagai bagian kalimat terjemahan paragraf. Kasus yang ditemukan diperbaiki lewat pencocok dan lapisan koreksi tinjauan (ADR-042, ADR-047), dan UI hanya mengklaim "kutipan ayat yang dikenali".
6. **Berani bilang "tidak ditemukan".** Menolak menjawab dengan benar adalah fitur, dan diukur di eval.
7. **Data adalah aset utama.** Model dan framework akan berganti, tetapi korpus, struktur, review ustadz, dan set eval harus awet dan terbuka.
8. **Konten terbuka, tidak dijual.** Kode berlisensi Apache-2.0. Konten turunan (teks, terjemahan dan ringkasan AI, indeks, dan dump) berlisensi CC BY-NC-SA 4.0 di `data/LICENSE`. Setiap respons MCP dan API memuat lisensi dan atribusinya. Tidak ada iklan, paywall, atau penjualan akses atas konten; donasi tetap boleh (lihat ADR-021, masih menunggu persetujuan pemilik di P-6).
9. **Tidak terkunci pada satu vendor.** Model AI bisa diganti, dan pemilihannya ditentukan oleh hasil eval kita sendiri. Infrastruktur dipusatkan di Cloudflare supaya sederhana (ADR-002), tetapi data tetap portabel: SQLite biasa dan dump terbuka yang dibangun pipeline (ADR-005).
10. **Ustadz ada di dalam lingkaran.** Prompt sistem, kebijakan penolakan, dan data tingkat tinggi direview oleh ahli. Sampel jawaban dinilai ustadz lewat halaman `/tinjau` (ADR-015).
