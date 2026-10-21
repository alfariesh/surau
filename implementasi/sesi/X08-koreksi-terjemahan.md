# X08 · Sesi sisipan: koreksi terjemahan Indonesia oleh editor dan ustadz

> **Fase:** sisipan (lepas dari Fase 4; tidak menyentuh `/tanya`, `apps/api`, maupun `packages/llm/src/jawab`) · **Status:** rencana, arah dijawab pemilik 2026-10-21 (lihat "Jawaban pemilik"), siap dikerjakan
> **Prasyarat:** nama dan gelar editor pertama untuk didaftarkan · T-17 tahap 3 (X04) sebaiknya selesai dulu, karena hasilnya menentukan antrean koreksi · X04 W1 (penyajian teks Indonesia) membantu tetapi tidak wajib
> **Perkiraan:** 1–2 percakapan agent (teknis), ditambah uji coba oleh editor sungguhan

Rencana ini ditulis di sesi audit X04 atas permintaan pemilik ("Do this task here", 2026-10-21). Belum ada implementasi. Nomor X05–X07 sudah dipakai sesi Jawab/takhrij (ADR-068–070), jadi rencana ini X08. Mekanisme peninjau mengikuti X07 (`/tinjau/takhrij`, ADR-070).

## Kenapa sesi ini ada

Ke-16.092 terjemahan Ihya berstatus `ai_generated`. Yang sudah ada:
- **Lapisan koreksi** di git (`data/reviews/ihya-9472-terjemahan.json`, ADR-047). Lapisan ini hanya bisa **menolak** hasil AI lalu meminta AI menerjemahkan ulang. Teks perbaikan dari manusia belum bisa dimasukkan.
- **Status tinjau** di skema korpus (`reviewed`, `ustadz_verified`, `rejected`) yang belum pernah terisi.
- **Ruang tinjau** `/tinjau` yang dilindungi Cloudflare Access (ADR-052), tetapi baru untuk menilai jawaban eval.

Pemilik ingin editor atau ustadz bisa memperbaiki terjemahan langsung, dengan hasil yang jujur labelnya dan bisa dilacak.

## Temuan (2026-10-21)

| # | Temuan | Bukti |
|---|---|---|
| K1 | Terjemahan dipakai di banyak tempat:<br>• pembaca (`packages/core/src/page.ts`, label `ai_translation`);<br>• kartu `/cari` (`components/search/result-card.tsx`) dan indeks `translation_fts` (dibangun saat ingest, `tools/ingest/src/search-index.ts`);<br>• MCP `read_page`/`search_text` (`review_status`, instruksi di `apps/mcp/src/instructions.ts`);<br>• kartu kutipan Tanya (`lib/kutipan-handler.ts`);<br>• dokumen Jawab ("Terjemahan AI (bisa keliru…)", `packages/llm/src/jawab/documents.ts`).<br>Koreksi yang hanya ditempel di pembaca membuat semuanya tidak sama: pencarian dan AI lain masih memakai teks lama. | grep atas kode |
| K2 | Sumber kebenaran terjemahan sekarang adalah folder lokal `data/build/llm/` di komputer pemilik (git-ignored; STATUS: "Jangan hapus"). Korpus D1 dibangun ulang dari situ setiap versi (`ihya-vN`) dan dipromosikan utuh. Status tinjau dibangun ulang tiap ingest. | `tools/ingest/src/rows.ts`, `llm/attach.ts`; STATUS S13 |
| K3 | Teks kitab dan turunannya tidak masuk git (aturan keras 3; repo publik). Lapisan koreksi sekarang sengaja tanpa teks (`reason` dilarang memuat huruf Arab). Teks terjemahan hasil koreksi manusia juga turunan kitab, jadi **tidak** disimpan di git. | `tools/ingest/src/llm/reviews.ts` |
| K4 | `/tinjau` dan `/api/review` memverifikasi JWT Access dengan gagal-tertutup di semua host, menyimpan identitas sebagai hash (`reviewer_key`, tanpa email), dan nama tampilan diketik penilai. Tabel `review` di DB app hanya untuk jawaban (`answer_log`). Peran (penilai vs penyetuju) belum ada. `/admin` memakai AUD Access terpisah. | `apps/web/src/lib/review-auth.ts`, migrasi app `0002` |
| K5 | `retry` batch LLM mengirim ulang paragraf yang ditolak ke Sonnet. Paragraf yang sudah dikoreksi manusia belum dilindungi dari tertimpa batch berikutnya. | `tools/ingest/src/llm/reviews.ts` |
| K6 | Laporan kesalahan pembaca (`feedback`, jenis `translation`) sudah ada, tetapi belum menjadi antrean kerja editor. | migrasi app `0001` |

## Usulan

### 1. Format teks

- Tetap **teks polos**, seperti `translation.text` sekarang. Penanda yang boleh:
  - placeholder ayat `⟦QS s:a⟧` dan penanda catatan kaki `(١)`;
  - tanda petik kutipan;
  - **kurung siku `[…]`** untuk kata tambahan penerjemah/editor (baru). Kurung ini ditampilkan redup **hanya pada teks revisi manusia**. Kurung siku yang ditulis AI (mis. "[ayat 26]" di `#p2824`) tidak diberi gaya "tambahan penerjemah".
- Tidak ada HTML, Markdown, tebal, atau miring yang disimpan. Gaya tampilan dibuat kode (X04 W1).
- Validasi saat simpan:
  - placeholder ayat dan penanda catatan kaki dibandingkan dengan **teks Arab** paragraf (`maskAyat` + `checkPlaceholders` di `packages/core/src/ayah-placeholder.ts`), bukan dengan terjemahan dasar. Setiap placeholder wajib ada persis sekali. Penanda catatan kaki hanya boleh yang ada di teks Arab, dan editor boleh melengkapi yang hilang (320 terjemahan AI tanpa penanda, S13);
  - tanpa huruf Arab (istilah ditulis transliterasi);
  - kurung siku dan **petik ganda** berpasangan. Petik tunggal tidak diperiksa, karena dipakai untuk 'ain/hamzah (Mu'adz). Bila terjemahan dasar pun tidak berpasangan (kutipan lintas paragraf), cukup peringatan;
  - panjang wajar: ≤ 8.000 karakter (terjemahan terpanjang sekarang 7.966). Tanpa batas rasio ke teks Arab, karena judul pendek wajar jauh lebih panjang terjemahannya (rasio tertinggi sekarang 19×);
  - tanpa tag `<…>`, tanpa Markdown (`**`, `__`, `#` judul, `*miring*`), dan tanpa tautan `[teks](url)`.
- Pemeriksa murni ini dijadikan **satu fungsi bersama** `validateTranslationText` di `@surau/core` (atau `@surau/text`), dipakai web dan ingest. Pemeriksa yang sekarang ada di `packages/llm/src/check.ts` (`footnoteMarkerDigits`, `hasArabicLetters`, `hasMarkdown`, `stripMarkers`) dipindah ke sana, supaya web tidak menarik `@surau/llm` beserta SDK Anthropic. Dicatat di ADR.

### 2. Alur kerja (sesuai jawaban pemilik: tanpa persetujuan kedua untuk saat ini)

1. **Antrean:** paragraf dari hasil T-17 tahap 3 (Salah/Kurang), laporan pembaca jenis terjemahan, judul daftar isi dan subjudul (X04), lalu pilihan bebas editor.
2. **Editor terdaftar** (ustadz yang ditunjuk pemilik, §5) membuka paragraf di `/tinjau/terjemahan`:
   - Arab dari DB tampil di kanan dan hanya bisa dibaca; terjemahan sekarang di kiri.
   - Editor memilih "Sudah benar" (tanpa ubah) atau "Perbaiki" (textarea + pratinjau persis seperti pembaca + alasan singkat wajib).
3. Setiap simpanan menjadi **revisi aktif** paragraf itu, langsung tanpa persetujuan kedua (keputusan pemilik). Revisi menyimpan penulis (hash), nama tampilan terdaftar, waktu, alasan, `base_sha256`, dan `source_sha256` (hash `text_raw` Arab saat itu). Revisi lama tidak dihapus; status lama menjadi `superseded`.
   - **Teks dasar** = revisi aktif terakhir bila ada (walau belum tayang), selain itu teks korpus. Koreksi berantai sebelum korpus baru tidak memicu 409 palsu dan tidak mengulang dari teks AI lama.
   - **Batalkan:** editor (atau pemilik lewat `/admin`) bisa mengembalikan ke versi sebelumnya. Pembatalan juga revisi baru (`reverted`), jadi riwayat tetap utuh.
4. **Pengganti persetujuan:** `/admin` mendapat daftar "koreksi terbaru" (paragraf, nama editor, alasan, diff kata). Pemilik bisa memeriksa sekilas dan membatalkan sebelum korpus berikutnya dibangun. Persetujuan dua orang (editor → ustadz penyetuju) tetap disiapkan di skema (`status`), tetapi tidak dipakai sampai pemilik memintanya.
5. Revisi aktif **diekspor** dan masuk korpus versi berikutnya (§3). Status di korpus diterapkan **hanya bila sha256 teks korpus = `base_sha256` revisi**. Bila draf AI sudah diterjemahkan ulang, label "diperiksa/dikoreksi" tidak menempel ke teks yang belum dibaca manusia.

   | Kejadian | `review_status` korpus | Catatan |
   |---|---|---|
   | Ustadz terdaftar menandai "sudah benar" | `ustadz_verified` | teks AI tetap |
   | Ustadz terdaftar memperbaiki | `ustadz_verified` + `revised` | teks revisi |
   | Editor terdaftar yang bukan ustadz (mis. pemilik) menandai/memperbaiki | `reviewed` (+ `revised`) | label memakai nama tanpa gelar ustadz |

### 3. Jalan koreksi ke situs

- **Usul agent: lewat korpus (ingest).**
  - Ekspor revisi aktif dari D1 app ke file lokal git-ignored (`data/build/reviews/…`) + salinan R2 privat (pola arsip eval S18).
  - Ingest menimpa teks AI dengan revisi itu.
  - Korpus baru dipromosikan, sehingga pembaca, pencarian, MCP, dan Jawab berubah bersamaan (K1).
  - Di git hanya ada **metadata**: ID paragraf, ID revisi, sha256 teks, `source_sha256`, status, tanggal. Tidak ada teksnya (K3). Ingest gagal bila hash di git tidak cocok dengan file ekspor, jadi koreksi tidak bisa hilang diam-diam.
  - Ekspor hanya revisi **aktif terbaru** per paragraf (yang dibatalkan tidak ikut).
  - Saat ingest, setiap revisi **divalidasi ulang** (§1) terhadap teks Arab dan rujukan ayat versi korpus yang sedang dibangun. Bila `source_sha256` berbeda (patch teks) atau placeholder ayat berubah (pencocok ayat diperbarui, seperti S13/X02), revisi ditandai **usang**: tidak dipakai, dilaporkan, dan kembali ke antrean editor. Terjemahan buatan editor tidak boleh menempati tempat yang kini menjadi segmen Kemenag (aturan 9).
  - Data uji di staging memakai `surau-app-staging` (`apps/web/wrangler.jsonc`), jadi tidak menyentuh produksi.
  - Sesudah korpus berisi revisi dibangun, jalankan `eval:retrieval` (gratis), karena `translation_fts` berubah.
- **Alternatif yang tidak diusulkan sekarang: overlay langsung** dari D1 app di pembaca.
  - Lebih cepat tayang, tetapi menambah kueri D1 per render dan merusak cache ISR halaman.
  - Pencarian, MCP, dan Jawab tetap memakai teks lama sampai korpus berikutnya.
  - Dipertimbangkan hanya bila jeda tayang lewat korpus terbukti terlalu lama.
- **Batch AI** tidak boleh menimpa paragraf yang punya revisi manusia (`retry`/`submit` melewatinya, dites). Bila prompt berubah dan AI menerjemahkan ulang di sekitarnya, revisi manusia tetap menang.

### 4. Label di pembaca (dan MCP)

Pemilik memutuskan **nama editor ditampilkan**. Nama dan gelar diambil dari daftar terdaftar (§5), bukan diketik bebas.

| Status | Label pembaca (usulan) |
|---|---|
| `ai_generated` | "Terjemahan AI" (seperti sekarang / X04 W3) |
| diperiksa tanpa perubahan | "Terjemahan AI · diperiksa {nama}", mis. "diperiksa Ust. Fulan" |
| diperbaiki | "Terjemahan AI · dikoreksi {nama}" |

- Label tetap menyebut asal AI, karena drafnya dari AI. Gelar "Ust." hanya untuk akun yang didaftarkan pemilik sebagai ustadz. Pemilik atau editor lain tampil dengan namanya saja, jadi label tidak pernah mengklaim tinjauan ustadz yang tidak ada.
- Nama di label bisa diketuk untuk melihat tanggal koreksi. Tidak ada tautan profil atau kontak.
- Persetujuan orangnya agar namanya tampil dicatat di TUGAS-PEMILIK sebelum namanya didaftarkan.
- Label yang sama dipakai di kartu `/cari` dan kartu kutipan Tanya/Maknaz, lewat satu fungsi label bersama. Kartu Tanya hanya membaca status; komponennya tidak diubah selain itu.
- Ke MCP, `review_status` sudah ada. Ditambah `revised: true`, tanggal, dan `reviewer_name` (nama tampilan terdaftar, sama dengan di situs). Hash, email, atau identitas lain tidak dikirim. Kalimat instruksi MCP (`instructions.ts`) disesuaikan: terjemahan tetap "AI-based", sebagian sudah dikoreksi manusia.

### 5. Peran dan akses

- **Satu peran baru, editor terjemahan terdaftar**, diperiksa di server dan terpisah dari penilai jawaban eval (`/tinjau`) dan peninjau label takhrij (`/tinjau/takhrij`). Editor terjemahan tidak otomatis bisa melihat atau menilai jawaban eval, dan sebaliknya.
- **Cara mendaftarkan (pola X07/ADR-070):**
  - Semua masuk lewat aplikasi Access `Surau Tinjau`. Simpanan hanya diterima bila kunci akun (hash issuer + subjek Access) ada di daftar `TRANSLATION_EDITORS` di konfigurasi Worker: kunci → nama tampilan + gelar + apakah ustadz.
  - Menambah orang = PR + ADR, seperti X07.
  - Kunci seseorang dicatat sesudah ia membuka `/tinjau/terjemahan` pertama kali. Halaman menampilkan "akun Anda belum terdaftar" beserta kodenya, lalu pemilik mendaftarkannya setelah memastikan langsung bahwa itu memang orangnya. Nama yang diketik sendiri tidak pernah dipakai.
  - Bila ustadz yang sama juga peninjau takhrij (`TAKHRIJ_USTADZ_KEYS`), kuncinya cukup dicatat sekali di daftar bersama (dirapikan di ADR).
- Pemeriksaan peran di server gagal-tertutup, bukan hanya disembunyikan di UI.

### 6. Editor teks

- **Tahap pertama: textarea biasa + validasi + pratinjau.** Tiptap/ProseMirror tidak dipasang. Gaya tampilan diatur kode, jadi tombol format justru tidak diinginkan.
- Tiptap baru dipertimbangkan bila uji coba menunjukkan editor sering merusak placeholder. Di situ ia berguna untuk menjadikan `⟦QS⟧` dan `(١)` "chip" terkunci, dengan semua tombol format dimatikan. Butuh ADR tersendiri (dependensi baru, ukuran bundel, lisensi).

## Skema (usulan, dirinci saat sesi)

- DB app, migrasi `0006_translation_revision.sql` (`0005` sudah dipakai `takhrij_review`, X07):
  - `translation_revision` berisi:
    - id, passage_id, base_sha256, source_sha256, text (NULL untuk "sudah benar"), reason;
    - author_key, author_name (nama terdaftar saat itu), created_at;
    - `kind` `confirmed|revised|reverted`, `status` `active|superseded|stale` (cadangan `proposed|approved|rejected` untuk persetujuan dua orang kelak).
  - `CHECK` pada panjang, jenis, dan status.
  - Indeks per paragraf dan per waktu (daftar "koreksi terbaru" di `/admin`).
  - DB app tidak ikut blue-green korpus (sama seperti `answer_log`).
  - `translation_revision` **tidak** ikut cron hapus fisik P-7. Ini data kerja permanen; `/privasi` diberi satu kalimat tentang nama tampilan + hash editor yang disimpan.
- Korpus, skema +1:
  - kolom `revision_id`, `revised_at`, `reviewer_name` di `translation` (atau tabel `translation_provenance`);
  - `model`/`prompt_version` tetap menunjuk draf AI asalnya.
- Git: `data/reviews/ihya-9472-revisi.json` (metadata saja: ID, hash, jenis, nama tampilan, tanggal; divalidasi zod; tes menolak entri yang memuat teks terjemahan).

## Jawaban pemilik (2026-10-21)

1. **Editor:** "Editor itu ustaz" (nama persis dan gelarnya didaftarkan saat sesi; pemilik juga bisa menjadi editor, dan labelnya memakai nama tanpa gelar ustadz).
2. **Nama ditampilkan:** "Nama ustaz ditampilkan" (§4).
3. **Tanpa persetujuan kedua:** "gak perlu approval buat saat ini" (§2). Pengaman yang tersisa: validasi otomatis, riwayat + batalkan, dan daftar "koreksi terbaru" di `/admin`.
4. **Kecepatan tayang:** "gak terlalu sering". Usul agent: korpus baru **sebulan sekali, atau lebih cepat bila sudah ≥ 50 koreksi**, dengan promote tetap atas izin pemilik.
5. **Urutan antrean:** belum dijawab, jadi dipakai usul agent: hasil T-17 → laporan pembaca → judul daftar isi/subjudul → bebas.
6. **Ringkasan AI:** "apa saran anda? Saya ikut". Dipakai usul agent: terjemahan paragraf dulu; ringkasan AI di sesi berikutnya dengan alur yang sama.

## Baca dulu (hanya ini)

- File ini; ADR-047 (lapisan koreksi), ADR-052 (ruang tinjau Access), ADR-070 (tinjauan takhrij: kunci akun ustadz terdaftar, sidik label), ADR-034 (ISR pembaca), ADR-044 (pencarian Indonesia), ADR-049/050 (kontrak MCP).
- `.claude/rules/teks-arab.md` aturan 1, 3, 8, 9.
- `packages/core/src/takhrij-review.ts` (pola peninjau terdaftar), `apps/web/src/lib/review-auth.ts`, `apps/web/src/app/(app)/tinjau/`, `apps/web/src/app/api/review/`, `components/review/review-client.tsx`.
- `tools/ingest/src/llm/{reviews,attach,batch}.ts`, `tools/ingest/src/search-index.ts`, `packages/core/src/page.ts`, `packages/core/src/ayah-placeholder.ts`, `packages/llm/src/check.ts`.
- Docs Cloudflare Access (JWT, grup/kebijakan) lewat `/docs-terbaru` atau MCP `cloudflare-docs`.

## Langkah

1. Branch `sesi/x08-koreksi-terjemahan`.
2. Pindahkan pemeriksa teks murni ke `validateTranslationText` (§1). Lalu migrasi app `0006` + repository bertipe + tes (jenis/status, `CHECK`, revisi berantai, batalkan).
3. API `/api/review/terjemahan` (GET antrean/paragraf, POST simpan "sudah benar"/perbaikan/batalkan), dengan Access + daftar editor terdaftar di server, batas ukuran, validasi teks (§1), dan konflik versi dasar (409 bila teks dasar berubah sejak dibuka).
4. UI `/tinjau/terjemahan`:
   - antrean, panel Arab (dari DB, hanya baca), textarea + pratinjau + pesan validasi, riwayat + tombol batalkan, untuk ponsel dan desktop;
   - pesan "akun belum terdaftar" + kode untuk didaftarkan pemilik;
   - komponen HeroUI lewat MCP `heroui-pro`.
5. `/admin`: daftar "koreksi terbaru" + batalkan.
6. Ekspor `pnpm review:export-terjemahan` → file lokal git-ignored + R2 privat + metadata git. Ingest memakai revisi (cek hash, validasi ulang, tandai usang), `translation_fts` ikut teks baru, dan batch melewati paragraf berevisi.
7. Label pembaca, `/cari`, kartu kutipan, dan MCP (`revised`, `reviewer_name`), dengan tes kontrak MCP.
8. Uji ujung-ke-ujung di staging (`surau-app-staging`): 3 paragraf uji dengan identitas editor uji (kunci tes, atau akun pemilik yang didaftarkan sementara di staging). Data uji ditandai lalu dibuang. Alurnya: ekspor → `ihya-vN` lokal/staging → pembaca, `/api/search`, dan MCP lokal menampilkan teks baru dengan label nama.
9. `pnpm verify`, e2e, `peninjau`, ADR baru, STATUS/LOG/TUGAS-PEMILIK (tugas baru: undang ustadz ke Access `Surau Tinjau`, catat persetujuan tampil nama, daftarkan kuncinya, uji coba 10 paragraf).

## Selesai bila

- [ ] `pnpm verify` lolos; tes `validateTranslationText`:
  - placeholder ayat hilang/berubah/ganda → ditolak;
  - penanda catatan kaki yang tidak ada di Arab → ditolak, melengkapi penanda yang ada di Arab → diterima;
  - huruf Arab → ditolak;
  - `[` atau petik ganda tidak berpasangan → ditolak, kecuali dasar juga tidak berpasangan (peringatan);
  - petik tunggal transliterasi → diterima;
  - tag, `*miring*`, tautan Markdown → ditolak;
  - teks valid → diterima.
  Web tidak bergantung pada `@surau/llm` (cek `apps/web/package.json`).
- [ ] Peran ditegakkan di server (tes dengan kunci uji, pola `review-auth.test.ts`):
  - akun Access sah yang kuncinya tidak ada di `TRANSLATION_EDITORS` tidak bisa menyimpan (403), walau mengetik nama editor;
  - token editor terjemahan tidak bisa membaca/menilai jawaban eval, dan token penilai jawaban tidak bisa mengedit terjemahan (403);
  - tanpa token Access → 401 di semua host.
  Cara pendaftaran (kunci terdaftar seperti ADR-070) tercatat di ADR, dan langkahnya di TUGAS-PEMILIK.
- [ ] Konflik versi (tes):
  - simpanan atas teks dasar yang sudah berubah sejak dibuka ditolak 409;
  - dua koreksi berantai sebelum korpus baru: yang kedua berdasar revisi pertama;
  - ekspor hanya memuat revisi aktif terakhir; revisi yang dibatalkan tidak ikut.
- [ ] Riwayat dan batalkan: setiap simpanan tersimpan; tidak ada `UPDATE` yang menimpa teks revisi (tes repository); batalkan membuat revisi `reverted` dan mengembalikan teks sebelumnya (tes); `/admin` menampilkan koreksi terbaru (tes route).
- [ ] Ekspor + ingest:
  - korpus uji memuat teks revisi untuk paragraf uji;
  - `review_status` dan `reviewer_name` sesuai tabel §2;
  - hash di metadata git cocok;
  - ingest gagal bila file ekspor hilang atau hash berbeda (tes);
  - revisi dengan `source_sha256` beda atau placeholder ayat yang kini tidak cocok ditandai usang dan tidak dimuat (tes);
  - status hanya diterapkan bila hash teks korpus = `base_sha256` (tes: draf AI diganti → label kembali "Terjemahan AI");
  - file metadata git tidak memuat teks (tes skema).
- [ ] Konsistensi K1: untuk paragraf uji, pembaca, `/api/search` (kata dari teks revisi), dan MCP `read_page` lokal menampilkan teks yang sama (perintah + keluaran dicatat); `eval:retrieval --gate` atas korpus uji tidak turun dari `ihya-v7`.
- [ ] Batch AI melewati paragraf berevisi (`plan`/`retry` tidak memasukkannya; tes).
- [ ] Label pembaca, kartu `/cari`, dan kartu kutipan Tanya/Maknaz sesuai tabel §4 lewat satu fungsi label. Gelar "Ust." hanya untuk akun terdaftar sebagai ustadz (tes komponen + tangkapan layar). Kurung siku redup hanya pada teks revisi (tes). MCP `read_page` memuat `review_status` + `revised` + `reviewer_name` tanpa hash/email (tes kontrak).
- [ ] Tidak ada email atau identitas mentah di DB/log (cek skema + `grep` diff); teks Arab di UI tinjau berasal dari DB.
- [ ] ADR baru, STATUS, LOG, TUGAS-PEMILIK, dan file sesi ini diperbarui.
- [ ] (Manusia, boleh menyusul) Uji coba ustadz sungguhan: ≥ 10 paragraf dari antrean dikoreksi atau ditandai benar, lalu tayang di produksi lewat korpus berikutnya atas izin promote, dengan label nama.

## Di luar cakupan

- Mengedit teks Arab (tetap lewat laporan + patch), takhrij, atau terjemahan ayat Kemenag.
- Editor teks kaya (Tiptap) dan format tersimpan apa pun.
- Overlay langsung di pembaca tanpa korpus baru.
- Koreksi ringkasan AI (sesi berikutnya, jawaban pemilik no. 6).
- Persetujuan dua orang (skema disiapkan, tidak dipakai; jawaban pemilik no. 3).
- Usulan koreksi dari pembaca anonim (tetap lewat formulir laporan).
- Mengubah label/prompt di pipeline Jawab.
- LLM berbayar apa pun.

## Catatan hasil

*(diisi agent di akhir sesi pelaksanaan)*
