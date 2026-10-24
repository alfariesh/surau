# X08 · Sesi sisipan: koreksi terjemahan Indonesia oleh editor dan ustadz

> **Fase:** sisipan (lepas dari Fase 4; tidak menyentuh `apps/api` maupun `packages/llm/src/jawab`; di Tanya/Maknaz hanya kartu kutipan memakai fungsi label bersama) · **Status:** selesai di kode (2026-10-22, ADR-081–082; PR #120 tahap 1 + #121 tahap 2); butir manusia (uji coba ustadz, T-26) menyusul
> **Prasyarat:** nama dan gelar editor pertama untuk didaftarkan · T-17 tahap 3 (X04) sebaiknya selesai dulu, karena hasilnya menentukan antrean koreksi · X04 W1 (penyajian teks Indonesia) membantu tetapi tidak wajib
> **Perkiraan:** 2–3 percakapan agent dalam dua tahap (lihat "Tahapan"), ditambah uji coba oleh editor sungguhan

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
  - tanpa huruf Arab (istilah ditulis transliterasi). Penanda catatan kaki `(١)` memakai angka Arab-India, jadi pemeriksaan dilakukan sesudah penanda dan placeholder dibuang (`stripMarkers`, seperti `hasArabicLetters` sekarang). Pemeriksa yang sekarang hanya **peringatan** di batch AI menjadi **penolakan** untuk teks manusia;
  - kurung siku dan **petik ganda** berpasangan. Petik tunggal tidak diperiksa, karena dipakai untuk 'ain/hamzah (Mu'adz). Bila terjemahan dasar pun tidak berpasangan (kutipan lintas paragraf), cukup peringatan;
  - panjang wajar: ≤ 8.000 karakter (terjemahan terpanjang sekarang 7.966). Tanpa batas rasio ke teks Arab, karena judul pendek wajar jauh lebih panjang terjemahannya (rasio tertinggi sekarang 19×);
  - tanpa tag `<…>`, tanpa Markdown (`**`, `__`, `#` judul, `*miring*`), dan tanpa tautan `[teks](url)`.
- Pemeriksa murni ini dijadikan **satu fungsi bersama** `validateTranslationText` di `@surau/core` (atau `@surau/text`), dipakai web dan ingest. Pemeriksa yang sekarang ada di `packages/llm/src/check.ts` (`footnoteMarkerDigits`, `hasArabicLetters`, `hasMarkdown`, `stripMarkers`) dipindah ke sana, supaya web tidak menarik `@surau/llm` beserta SDK Anthropic. Dicatat di ADR.

### 2. Alur kerja (sesuai jawaban pemilik: tanpa persetujuan kedua untuk saat ini)

1. **Antrean:** paragraf dari hasil T-17 tahap 3 (Salah/Kurang), laporan pembaca jenis terjemahan, judul daftar isi dan subjudul (X04), lalu pilihan bebas editor.
2. **Editor terdaftar** (ustadz yang ditunjuk pemilik, §5) membuka paragraf di `/tinjau/terjemahan`:
   - Arab dari DB tampil di kanan dan hanya bisa dibaca; terjemahan sekarang di kiri.
   - Editor memilih "Sudah benar" (tanpa ubah) atau "Perbaiki" (textarea + pratinjau persis seperti pembaca + alasan singkat wajib).
   - Di atas textarea ada petunjuk singkat: `⟦QS 2:255⟧` adalah tempat terjemahan ayat Kemenag (jangan diubah atau diterjemahkan), dan `(١)` adalah penanda catatan kaki.
3. Setiap simpanan menjadi **revisi aktif** paragraf itu, langsung tanpa persetujuan kedua (keputusan pemilik). Revisi menyimpan penulis (hash), nama tampilan terdaftar, waktu, alasan, `base_sha256`, dan `source_sha256` (hash `text_raw` Arab saat itu). Revisi lama tidak dihapus; status lama menjadi `superseded`.
   - **Teks dasar** = revisi aktif terakhir bila ada (walau belum tayang), selain itu teks korpus. Koreksi berantai sebelum korpus baru tidak memicu 409 palsu dan tidak mengulang dari teks AI lama.
   - **Batalkan:** editor (atau pemilik lewat `/admin`) bisa mengembalikan ke keadaan sebelumnya. Pembatalan juga revisi baru (`reverted`) yang menunjuk revisi yang dipulihkan, jadi riwayat tetap utuh. Teks **dan label** ikut keadaan yang dipulihkan: kembali ke revisi Ust. A berarti label "dikoreksi Ust. A"; kembali ke teks AI berarti label "Terjemahan AI" tanpa nama. Pembatal tidak pernah tampil sebagai pengoreksi.
4. **Pengganti persetujuan:**
   - `/admin` mendapat daftar "koreksi terbaru" (paragraf, nama editor, alasan, diff kata). Pemilik bisa memeriksa sekilas dan membatalkan sebelum korpus berikutnya dibangun.
   - Ada tombol "batalkan semua koreksi editor X sejak tanggal T", untuk berjaga-jaga bila akun editor disalahgunakan.
   - Batas simpanan per editor ±200 per hari (gagal-tertutup, 429). Ukurannya cukup untuk kerja wajar dan menahan kerusakan massal.
   - Akun pemilik boleh terdaftar sebagai editor, tetapi disarankan hanya untuk salah ketik dan ejaan, bukan makna. Persetujuan dua orang (editor → ustadz penyetuju) tetap disiapkan di skema (`status`), tetapi tidak dipakai sampai pemilik memintanya.
5. Revisi aktif **diekspor** dan masuk korpus versi berikutnya (§3). Status di korpus diterapkan **hanya bila sha256 teks korpus = `base_sha256` revisi**. Bila draf AI sudah diterjemahkan ulang, label "diperiksa/dikoreksi" tidak menempel ke teks yang belum dibaca manusia.

   | Kejadian | `review_status` korpus | Catatan |
   |---|---|---|
   | Ustadz terdaftar menandai "sudah benar" | `ustadz_verified` | teks AI tetap |
   | Ustadz terdaftar memperbaiki | `ustadz_verified` + `revised` | teks revisi |
   | Editor terdaftar yang bukan ustadz (mis. pemilik) menandai/memperbaiki | `reviewed` (+ `revised`) | label memakai nama tanpa gelar ustadz |

### 3. Jalan koreksi ke situs

- **Usul agent: lewat korpus (ingest).**
  - Ekspor revisi aktif dari D1 app produksi (hanya **baca**) ke file lokal git-ignored (`data/build/reviews/…`) + salinan R2 privat bernama unik per ekspor (bertanggal, tidak menimpa objek lama; pola arsip eval S18).
  - sha256 berkas ekspor dicatat di `meta` korpus dan `data/SOURCES.md`, jadi setiap `ihya-vN` bisa dibangun ulang persis.
  - Ingest menimpa teks AI dengan revisi itu.
  - Korpus baru dipromosikan, sehingga pembaca, pencarian, MCP, dan Jawab berubah bersamaan (K1).
  - Di git hanya ada **metadata**: ID paragraf, ID revisi, sha256 teks, `source_sha256`, status, tanggal. Tidak ada teksnya (K3). Ingest gagal bila hash di git tidak cocok dengan file ekspor, jadi koreksi tidak bisa hilang diam-diam.
  - Ekspor hanya revisi **aktif terbaru** per paragraf (yang dibatalkan tidak ikut).
  - Saat ingest, setiap revisi **divalidasi ulang** (§1) terhadap teks Arab dan rujukan ayat versi korpus yang sedang dibangun. Bila `source_sha256` berbeda (patch teks) atau placeholder ayat berubah (pencocok ayat diperbarui, seperti S13/X02), revisi dianggap **usang**: tidak dipakai, dan dilaporkan di laporan ingest. Status usang **dihitung**, tidak ditulis balik ke DB app produksi oleh ingest (aturan keras 4: tidak menimpa data produksi). `/tinjau/terjemahan` menampilkannya di antrean dengan membandingkan `source_sha256` revisi dengan teks korpus aktif. Terjemahan buatan editor tidak boleh menempati tempat yang kini menjadi segmen Kemenag (aturan 9).
  - Data uji di staging memakai `surau-app-staging` (`apps/web/wrangler.jsonc`), jadi tidak menyentuh produksi.
  - Sesudah korpus berisi revisi dibangun, jalankan `eval:retrieval` (gratis), karena `translation_fts` berubah.
  - Rollback (`corpus:promote --switch-only ihya-v7`) menyembunyikan semua koreksi sampai korpus berikutnya. Revisi di DB app tetap aman. Aturan skema minimum `--switch-only` dicek saat skema korpus naik.
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
- Dokumen Jawab tetap memberi label "Terjemahan AI (bisa keliru…)" juga untuk teks yang sudah dikoreksi. Ini tidak keliru, hanya kurang tepat; diperbaiki di sesi Jawab (tindak lanjut, di luar cakupan).
- Ke MCP, `review_status` sudah ada. Ditambah `revised: true`, tanggal, dan `reviewer_name` (nama tampilan terdaftar, sama dengan di situs). Hash, email, atau identitas lain tidak dikirim. Field baru hanya **tambahan** (klien lama tidak rusak; kontrak ADR-049/050). Persetujuan tampil nama mencakup situs **dan** AI lain lewat MCP; bila ustadz hanya setuju untuk situs, MCP mengirim peran ("ustadz"/"editor") tanpa nama. Kalimat instruksi MCP (`instructions.ts`) disesuaikan: terjemahan tetap "AI-based", sebagian sudah dikoreksi manusia.

### 5. Peran dan akses

- **Satu peran baru, editor terjemahan terdaftar**, diperiksa di server dan terpisah dari penilai jawaban eval (`/tinjau`) dan peninjau label takhrij (`/tinjau/takhrij`). Editor terjemahan tidak otomatis bisa melihat atau menilai jawaban eval, dan sebaliknya.
- **Cara mendaftarkan (pola X07/ADR-070):**
  - Semua masuk lewat aplikasi Access `Surau Tinjau`. Simpanan hanya diterima bila kunci akun (hash issuer + subjek Access) ada di daftar `TRANSLATION_EDITORS` di konfigurasi Worker: kunci → nama tampilan + gelar + apakah ustadz.
  - Menambah orang = PR + ADR, seperti X07.
  - Kunci seseorang dicatat sesudah ia membuka `/tinjau/terjemahan` pertama kali. Halaman menampilkan "akun Anda belum terdaftar" beserta kodenya. Orangnya mengirim kode itu ke pemilik lewat jalur yang pemilik kenal (mis. WhatsApp pribadinya), lalu pemilik meminta agent mendaftarkannya. Nama yang diketik sendiri tidak pernah dipakai.
  - Daftar ini ada di `wrangler.jsonc` (repo publik), sama seperti `TAKHRIJ_USTADZ_KEYS`. Nama memang tampil publik atas keputusan pemilik; kunci adalah hash, bukan rahasia dan bukan email.
  - Bila ustadz yang sama juga peninjau takhrij (`TAKHRIJ_USTADZ_KEYS`), kuncinya cukup dicatat sekali di daftar bersama (dirapikan di ADR).
- Pemeriksaan peran di server gagal-tertutup, bukan hanya disembunyikan di UI.

### 6. Editor teks

- **Tahap pertama: textarea biasa + validasi + pratinjau.** Tiptap/ProseMirror tidak dipasang. Gaya tampilan diatur kode, jadi tombol format justru tidak diinginkan.
- Tiptap baru dipertimbangkan bila uji coba menunjukkan editor sering merusak placeholder. Di situ ia berguna untuk menjadikan `⟦QS⟧` dan `(١)` "chip" terkunci, dengan semua tombol format dimatikan. Butuh ADR tersendiri (dependensi baru, ukuran bundel, lisensi).

## Tahapan

Supaya ustadz bisa mulai bekerja secepatnya, sesi dibagi dua. Masing-masing PR sendiri.

- **Tahap 1 · Simpan koreksi** (±1 percakapan): validator bersama, migrasi app `0006`, API, `/tinjau/terjemahan`, daftar koreksi + batalkan di `/admin`, pendaftaran editor. Hasilnya: ustadz sudah bisa mengoreksi dan semua tersimpan, **belum tampil** di situs. Label belum berubah, jadi belum ada klaim apa pun ke pembaca.
- **Tahap 2 · Tayangkan** (±1–2 percakapan): ekspor, ingest + skema korpus, label pembaca/`/cari`/kartu kutipan, MCP, batch melewati paragraf berevisi, korpus baru atas izin promote.

## Skema (usulan, dirinci saat sesi)

- DB app, migrasi `0006_translation_revision.sql` (`0005` sudah dipakai `takhrij_review`, X07):
  - `translation_revision` berisi:
    - id, passage_id, base_sha256, source_sha256, text (NULL untuk "sudah benar"), reason;
    - author_key, author_name (nama terdaftar saat itu), created_at;
    - `kind` `confirmed|revised|reverted` (+ `restores_id` untuk pembatalan), `status` `active|superseded` (cadangan `proposed|approved|rejected` untuk persetujuan dua orang kelak; "usang" dihitung, tidak disimpan).
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

1. Branch `sesi/x08-koreksi-terjemahan`. **Tahap 1** = langkah 2–5 (+ verifikasi langkah 9), PR sendiri. **Tahap 2** = langkah 6–9.
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

- [x] `pnpm verify` lolos; tes `validateTranslationText`:
  - placeholder ayat hilang/berubah/ganda → ditolak;
  - penanda catatan kaki yang tidak ada di Arab → ditolak, melengkapi penanda yang ada di Arab → diterima;
  - huruf Arab → ditolak, tetapi penanda `(١)` (angka Arab-India) → diterima;
  - `[` atau petik ganda tidak berpasangan → ditolak, kecuali dasar juga tidak berpasangan (peringatan);
  - petik tunggal transliterasi → diterima;
  - tag, `*miring*`, tautan Markdown → ditolak;
  - teks valid → diterima.
  Web tidak bergantung pada `@surau/llm` (cek `apps/web/package.json`).
  *Bukti (tahap 1):* `pnpm verify` → lolos (800 + 379 tes, build); `packages/core/src/translation-text.test.ts` 8 tes (semua kasus di atas + simbol Arab non-huruf U+FDFD dkk.); `grep '@surau' apps/web/package.json` → core, db, text saja.
- [x] Peran ditegakkan di server (tes dengan kunci uji, pola `review-auth.test.ts`):
  - akun Access sah yang kuncinya tidak ada di `TRANSLATION_EDITORS` tidak bisa menyimpan (403), walau mengetik nama editor;
  - token editor terjemahan tidak bisa membaca/menilai jawaban eval, dan token penilai jawaban tidak bisa mengedit terjemahan (403);
  - tanpa token Access → 401 di semua host.
  Cara pendaftaran (kunci terdaftar seperti ADR-070) tercatat di ADR, dan langkahnya di TUGAS-PEMILIK.
  *Bukti:* `apps/web/src/app/api/review/terjemahan/route.test.ts` (401 semua ruang tanpa token; 403 `not_registered` walau body memuat `author_name`; token editor → 403 di `/api/review` GET/POST, ekspor, takhrij; akun dengan `also` boleh keduanya); `canUseTinjauRoom` di core; ADR-081 §4–5; T-26.
- [x] Konflik versi (tes):
  - simpanan atas teks dasar yang sudah berubah sejak dibuka ditolak 409;
  - dua koreksi berantai sebelum korpus baru: yang kedua berdasar revisi pertama;
  - ekspor hanya memuat revisi aktif terakhir; revisi yang dibatalkan tidak ikut.
  *Bukti:* `packages/db/src/repo/translation-revision.test.ts` + `apps/web/src/lib/translation-review.test.ts` (409, berantai), `tools/ingest/src/llm/revisions.test.ts` "exportLines" (aktif saja; pembatalan → versi yang dipulihkan; kembali ke AI tidak diekspor).
- [x] Riwayat dan batalkan: setiap simpanan tersimpan; tidak ada `UPDATE` yang menimpa teks revisi (tes repository); batalkan membuat revisi `reverted` dan mengembalikan teks **dan nama label** keadaan yang dipulihkan (tes: kembali ke AI → tanpa nama); `/admin` menampilkan koreksi terbaru dan bisa membatalkan semua koreksi satu editor sejak tanggal tertentu (tes route); simpanan ke-201 seorang editor dalam sehari → 429 (tes).
  *Bukti:* `packages/db/src/repo/translation-revision.test.ts` (UPDATE teks/penulis ditolak pemicu DB, hanya `active`→`superseded`), `apps/web/src/lib/translation-review.test.ts` (batalkan memulihkan label penulis pertama lalu draf AI tanpa nama; simpanan ke-201 → `limit`; batalkan massal + lewati yang diubah editor lain), `apps/web/src/app/api/admin/terjemahan/route.test.ts`, dan route terjemahan (429).
- [x] Ekspor + ingest:
  - korpus uji memuat teks revisi untuk paragraf uji;
  - `review_status` dan `reviewer_name` sesuai tabel §2;
  - hash di metadata git cocok;
  - ingest gagal bila file ekspor hilang atau hash berbeda (tes);
  - revisi dengan `source_sha256` beda atau placeholder ayat yang kini tidak cocok dianggap usang dan tidak dimuat, tanpa menulis ke DB app produksi (tes);
  - sha256 berkas ekspor tercatat di `meta` korpus (tes);
  - status hanya diterapkan bila hash teks korpus = `base_sha256` (tes: draf AI diganti → label kembali "Terjemahan AI");
  - file metadata git tidak memuat teks (tes skema).
  *Bukti:* `tools/ingest/src/llm/revisions.test.ts` (8 tes: status per peran, `ai_text`, hash, berkas hilang/hash/isi beda = gagal, usang `source_changed`/`invalid_text`/`draft_changed` tanpa menulis DB app, `revisionMetaRows`, skema menolak field teks). E2E lokal: `review:export-terjemahan --lokal` → `pnpm ingest ihya` ("3 revisi: 1 sudah benar + 2 perbaikan dimuat; usang 0") → `meta.revisions_sha256` = sha256 berkas ekspor, `translation_review` 3 baris, `translation_fts` mengenai kata dari teks revisi.
- [x] Konsistensi K1: untuk paragraf uji, pembaca, `/api/search` (kata dari teks revisi), dan MCP `read_page` lokal menampilkan teks yang sama (perintah + keluaran dicatat); `eval:retrieval --gate` atas korpus uji tidak turun dari `ihya-v7`.
  *Bukti (lokal, korpus uji skema 8):* `/kitab/ihya/1/200` → teks perbaikan p2826 + "Terjemahan AI · dikoreksi Ust. Anas" (+ "diperiksa" p2829), popover nama lengkap + tanggal, `[…]` redup (desktop + ponsel 375 px); `/api/search?q=<kata revisi>` → p2826 `ustadz_verified` + `human_review`; MCP lokal `read_page` j1/200 → teks + `human_review` sama, tanpa hash/email/draf; `pnpm run eval:retrieval --gate` → 31 soal hit@1 64,5% · hit@5 96,8% · hit@10 100% · MRR 0,795, sama persis dengan laporan `ihya-v6` dan `ihya-v8` (laporan `ihya-v7` tidak ada di repo; teks v7 = v6).
- [x] Batch AI melewati paragraf berevisi (`plan`/`retry` tidak memasukkannya; tes).
  *Bukti:* `tools/ingest/src/llm/batch.test.ts` "X08: paragraf yang ditinjau manusia…" (rencana tanpa paragraf itu, rencana lama usang, ulangan tidak dikirim) + `withoutReviewed` di `runPlan`/`runSubmit`/`runRetry`.
- [ ] Tahap 1 bisa di-merge sendiri: koreksi tersimpan di DB app staging lewat `/tinjau/terjemahan`, dan pembaca belum berubah (cek HTML j1/200 sama dengan sebelum).
  *Hasil (belum dicentang, penyimpangan terbuka):* "lewat `/tinjau/terjemahan`" di staging tidak bisa dibuktikan agent: Preview belum dilindungi Access (gagal tertutup) dan login `surau.org/tinjau` butuh PIN email pemilik. Yang terbukti: (a) DB app staging `surau-app-staging` (migrasi 0006 + pemicu): 3 revisi uji tersimpan lewat repository + core yang sama dengan route (CAS batch, `last_row_id`), konflik ditolak, lalu dibuang (0 baris); (b) UI + route + lib ujung-ke-ujung di `next dev` lokal (halaman sementara tanpa Access, D1 lokal): simpan perbaikan, validasi langsung, batalkan, ponsel, gelap; (c) `<main>` j1/200 kode `main` vs tahap 1 identik byte demi byte (95.863 byte). Bukti penuh lewat UI staging/produksi = langkah 2–4 T-26 (Anas).
- [x] Label pembaca, kartu `/cari`, dan kartu kutipan Tanya/Maknaz sesuai tabel §4 lewat satu fungsi label. Gelar "Ust." hanya untuk akun terdaftar sebagai ustadz (tes komponen + tangkapan layar). Kurung siku redup hanya pada teks revisi (tes). MCP `read_page` memuat `review_status` + `revised` + `reviewer_name` tanpa hash/email, dan klien yang mengabaikan field baru tetap berfungsi (tes kontrak).
  *Bukti:* `apps/web/src/lib/translation-label.ts` dipakai pembaca, `result-card.tsx`, `answer-view.tsx`; tes `translation-label.test.ts`, `passage-translation.test.tsx` (popover, `[…]` redup hanya perbaikan, AI/diperiksa tanpa gaya), `kutipan-handler.test.ts`; gelar: `parseTranslationEditors` + Zod korpus menolak "Ust." untuk editor; tangkapan layar lokal j1/200 (desktop, ponsel). MCP: field ada di `human_review` (`revised`, `reviewer_name`, `reviewer_role`, `reviewed_at`; ADR-082 §5, satu objek supaya hemat token) + `review_status`; `apps/mcp/src/index.test.ts` "tinjauan manusia aditif…" (tanpa hash/email, skema klien lama tetap lolos).
- [x] Tidak ada email atau identitas mentah di DB/log (cek skema + `grep` diff); teks Arab di UI tinjau berasal dari DB.
  *Bukti:* skema `translation_revision` hanya `author_key` (hash) + nama terdaftar; log hanya `{event, action}`; `git diff origin/main | grep -E "email|payload.sub|cf-connecting-ip"` → hanya komentar/teks UI; panel Arab = `item.arabic` = `passage.text_raw` (`reviewPassages`).
- [x] ADR baru, STATUS, LOG, TUGAS-PEMILIK, dan file sesi ini diperbarui.
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

**2026-10-22 · dikerjakan dalam satu percakapan, dua PR** (tahap 1 #120 sudah di `main` dan ter-deploy; tahap 2 #121). Biaya LLM US$0, tanpa korpus baru, teks Arab selalu dari DB.

**Yang dibuat**
- **Tahap 1 (ADR-081):** `validateTranslationText` (core), `translation_revision` (DB app 0006, hanya bertambah + pemicu, satu aktif per paragraf, batch atomik 409/429), `TRANSLATION_EDITORS` + peran ruang tinjau, `/tinjau/terjemahan`, `/admin` koreksi terbaru (diff kata) + batalkan + batalkan massal (dengan konfirmasi), `/privasi`, panduan `docs/tinjau-operasional.md`, T-26.
- **Tahap 2 (ADR-082):** `pnpm review:export-terjemahan` (lokal/staging/produksi; berkas git-ignored + R2 privat `surau-revisi`, metadata tanpa teks `data/reviews/ihya-9472-revisi.json` — **belum ada**, dibuat saat ekspor pertama), ingest `applyRevisions` + korpus skema 8 `translation_review`, `human_review` di core/MCP, label bersama, batch AI melewati paragraf berevisi, smoke skema 8.

**Antrean awal (diminta pemilik, alasan di ADR-081 §7):** laporan pembaca jenis terjemahan (sekarang 0) → dikutip Maknaz → paragraf badan urut baca mulai Mukadimah/Kitab al-'Ilm → catatan kaki (belum punya terjemahan AI). **T-17 tahap 3 belum dinilai** (jawaban pemilik: jangan tunggu): hasil Salah/Kurang dimasukkan ke depan antrean setelah dinilai (`pnpm t17 hasil` belum menulis berkas; perlu tambahan kecil).

**Editor pertama (pemilik, 2026-10-22):** Anas, gelar tampil "Ust."; label "dikoreksi Ust. Anas" dan nama lengkap "Ust. Anas Lc." di rincian/riwayat/MCP (tafsiran atas dua contoh pemilik; ubah di satu entri bila keliru). Kunci akunnya belum diketahui (belum pernah menyimpan tinjauan apa pun di produksi): pendaftaran = T-26.

**Penyimpangan (terbuka)**
- Butir "Tahap 1 bisa di-merge sendiri … lewat `/tinjau/terjemahan` di staging" tidak dicentang: Access tidak bisa dilewati agent (Preview gagal tertutup, PIN email pemilik). Dibuktikan sebagian: DB staging lewat repository yang sama, UI lewat pratinjau lokal, HTML pembaca identik. Bukti penuh = T-26.
- MCP memakai satu objek `human_review` (bukan field datar `revised`/`reviewer_name`) supaya `search_text` tetap hemat token.
- Tanpa izin nama, situs juga menampilkan peran saja (rencana §4 membolehkan nama di situs saja): lebih ketat, persetujuan dua tingkat menyusul bila diminta.
- Judul daftar isi/subjudul (tabel terpisah) belum bisa dikoreksi: menyusul bersama ringkasan AI.
- Butir "status hanya diterapkan bila hash teks korpus = `base_sha256`" berlaku untuk "sudah benar"; **perbaikan** tetap dimuat walau draf AI di sekitarnya berubah (rencana §3: revisi manusia menang; dicatat `draftChanged`).
- `meta.revisions_count` = revisi di berkas ekspor (bukan yang dimuat), supaya `corpus:qa` deterministik.

**Peninjau:** tahap 1: 0 blocker, 7 penting + 6 kecil (semua dikerjakan, ADR-081). Tahap 2: 1 blocker (cache `/api/search` lama tanpa `human_review` → `SEARCH_RESULT_VERSION` 2 + label tahan field hilang), 4 penting (validasi ingest dengan dasar draf; perlindungan batch hanya untuk revisi yang masih berlaku agar paragraf tidak kehilangan terjemahan; `revisions_count` deterministik untuk `corpus:qa`; ekspor uji ditolak ingest tanpa `SURAU_REVISI_UJI=1` + tes repo), 10 kecil, 3 saran; semua dikerjakan kecuali saran kunci per edisi (sebelum kitab kedua).

**Utang / pesan untuk sesi berikutnya**
- Korpus berikutnya (`ihya-v9`) = skema 8: `db:migrate:staging` sebelum `corpus:load:staging`; urutan: ekspor → commit metadata → ingest → muat + cek → `eval:retrieval --gate` → promote atas izin (tools/ingest/README.md). Catat `revisions_sha256` di `data/SOURCES.md`.
- Ekspor dulu sebelum batch AI (revisi yang belum diekspor belum terlindung dari `plan/submit/retry`).
- Dokumen Jawab (`packages/llm/src/jawab/documents.ts`) masih "Terjemahan AI (bisa keliru…)" untuk teks yang dikoreksi.
- `TRANSLATION_EDITORS` dan `TAKHRIJ_USTADZ_KEYS` terpisah (menyatukannya menyentuh `apps/api`).
- Lencana pembaca: popover HTML bawaan (tanpa JS) diposisikan di tengah layar; cukup untuk sekarang.
