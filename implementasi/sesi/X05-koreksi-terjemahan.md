# X05 · Sesi sisipan: koreksi terjemahan Indonesia oleh editor dan ustadz

> **Fase:** sisipan (lepas dari Fase 4; tidak menyentuh `/tanya`, `apps/api`, maupun `packages/llm/src/jawab`) · **Status:** rencana, menunggu persetujuan pemilik
> **Prasyarat:** pemilik menjawab pertanyaan di bawah · T-17 tahap 3 (X04) sebaiknya selesai dulu, karena hasilnya menentukan antrean koreksi · X04 W1 (penyajian teks Indonesia) membantu tetapi tidak wajib
> **Perkiraan:** 1–2 percakapan agent (teknis), ditambah uji coba oleh editor sungguhan

Rencana ini ditulis di sesi audit X04 atas permintaan pemilik ("Do this task here", 2026-10-21). Belum ada implementasi.

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

### 2. Alur kerja

1. **Antrean:** paragraf dari hasil T-17 tahap 3 (Salah/Kurang), laporan pembaca jenis terjemahan, judul daftar isi dan subjudul (X04), lalu pilihan bebas editor.
2. **Editor** membuka paragraf di `/tinjau/terjemahan`:
   - Arab dari DB tampil di kanan dan hanya bisa dibaca; terjemahan sekarang di kiri.
   - Editor memilih "Sudah benar" (tanpa ubah) atau "Usulkan perbaikan" (textarea + pratinjau persis seperti pembaca + alasan wajib).
3. Setiap usulan disimpan sebagai **revisi** dengan penulis (hash), nama tampilan, waktu, alasan, `base_sha256`, dan `source_sha256` (hash `text_raw` Arab paragraf saat itu). Revisi lama tidak dihapus.
   - **Teks dasar** = revisi disetujui terakhir untuk paragraf itu bila ada (walau belum tayang), selain itu teks korpus aktif. Usulan berantai sebelum korpus baru tidak memicu 409 palsu dan tidak mengulang dari teks AI lama.
   - Paling banyak satu usulan terbuka per paragraf. Usulan kedua menunggu atau menggantikan yang pertama, dan tercatat.
4. **Ustadz/penyetuju** melihat diff kata (lama vs usulan), lalu menyetujui, meminta revisi, atau menolak. Penulis usulan tidak boleh menyetujui usulannya sendiri.
5. Revisi yang disetujui **diekspor** dan masuk korpus versi berikutnya (§3). Status di korpus diterapkan **hanya bila sha256 teks korpus = `base_sha256` konfirmasi/revisi**. Bila draf AI sudah diterjemahkan ulang, label "diperiksa/ditinjau" tidak menempel ke teks yang belum dibaca manusia.

   | Kejadian | `review_status` | Tayang bila (usul agent, pertanyaan 3) |
   |---|---|---|
   | Editor menandai "sudah benar", lalu ustadz mengonfirmasi | `ustadz_verified` | sesudah ustadz |
   | Editor mengusulkan perbaikan, lalu ustadz menyetujui | `ustadz_verified` (+ `revised`) | sesudah ustadz |
   | Editor menandai "sudah benar", tanpa ustadz | `reviewed` | hanya bila pemilik memilih opsi "editor tepercaya" |
   | Perbaikan editor tanpa ustadz | tidak tayang (`proposed`) | hanya bila pemilik memilih opsi itu, dengan label "dikoreksi editor, belum ditinjau ustadz" |

### 3. Jalan koreksi ke situs

- **Usul agent: lewat korpus (ingest).**
  - Ekspor revisi disetujui dari D1 app ke file lokal git-ignored (`data/build/reviews/…`) + salinan R2 privat (pola arsip eval S18).
  - Ingest menimpa teks AI dengan revisi itu.
  - Korpus baru dipromosikan, sehingga pembaca, pencarian, MCP, dan Jawab berubah bersamaan (K1).
  - Di git hanya ada **metadata**: ID paragraf, ID revisi, sha256 teks, `source_sha256`, status, tanggal. Tidak ada teksnya (K3). Ingest gagal bila hash di git tidak cocok dengan file ekspor, jadi koreksi tidak bisa hilang diam-diam.
  - Ekspor hanya revisi disetujui **terbaru** per paragraf.
  - Saat ingest, setiap revisi **divalidasi ulang** (§1) terhadap teks Arab dan rujukan ayat versi korpus yang sedang dibangun. Bila `source_sha256` berbeda (patch teks) atau placeholder ayat berubah (pencocok ayat diperbarui, seperti S13/X02), revisi ditandai **usang**: tidak dipakai, dilaporkan, dan kembali ke antrean editor. Terjemahan buatan editor tidak boleh menempati tempat yang kini menjadi segmen Kemenag (aturan 9).
  - Data uji di staging memakai `surau-app-staging` (`apps/web/wrangler.jsonc`), jadi tidak menyentuh produksi.
  - Sesudah korpus berisi revisi dibangun, jalankan `eval:retrieval` (gratis), karena `translation_fts` berubah.
- **Alternatif yang tidak diusulkan sekarang: overlay langsung** dari D1 app di pembaca.
  - Lebih cepat tayang, tetapi menambah kueri D1 per render dan merusak cache ISR halaman.
  - Pencarian, MCP, dan Jawab tetap memakai teks lama sampai korpus berikutnya.
  - Dipertimbangkan hanya bila jeda tayang lewat korpus terbukti terlalu lama.
- **Batch AI** tidak boleh menimpa paragraf yang punya revisi manusia (`retry`/`submit` melewatinya, dites). Bila prompt berubah dan AI menerjemahkan ulang di sekitarnya, revisi manusia tetap menang.

### 4. Label di pembaca (dan MCP)

| Status | Label pembaca (usulan) |
|---|---|
| `ai_generated` | "Terjemahan AI" (seperti sekarang / X04 W3) |
| `reviewed` | "Terjemahan AI · diperiksa editor" |
| `ustadz_verified` tanpa perubahan | "Terjemahan AI · ditinjau ustadz" |
| `ustadz_verified` dengan perubahan | "Terjemahan AI, dikoreksi · ditinjau ustadz" |

- Label tetap menyebut asal AI, karena drafnya dari AI. Nama ustadz hanya tampil bila ia setuju (pertanyaan 2).
- Label yang sama dipakai di kartu `/cari` dan kartu kutipan Tanya, lewat satu fungsi label bersama. Kartu Tanya hanya membaca status; komponennya tidak diubah selain itu.
- Ke MCP, `review_status` sudah ada. Ditambah `revised: true` dan tanggal, tanpa identitas. Kalimat instruksi MCP (`instructions.ts`) disesuaikan: terjemahan tetap "AI-based", sebagian sudah ditinjau manusia.
- Pencarian dan Jawab memakai teks baru apa adanya. Label di dokumen Jawab tidak diubah sesi ini (di luar cakupan; cukup dicatat untuk sesi Jawab).

### 5. Peran dan akses

- **Peran per fitur, diperiksa di server:**
  - *penilai jawaban*: `/tinjau` jawaban eval yang sekarang;
  - *editor terjemahan*;
  - *penyetuju terjemahan (ustadz)*.
  Editor relawan tidak otomatis bisa melihat atau menilai jawaban eval (`answer_log`/`review`), dan sebaliknya.
- **Cara memberi peran** (usul agent): aplikasi Access terpisah per peran, masing-masing dengan AUD sendiri (pola `adminIdentity` di `review-auth.ts`). Kebijakan per **email** tetap diatur pemilik di dasbor Cloudflare.
  - Pemilik tidak perlu tahu hash siapa pun.
  - Tidak ada orang yang bisa menjadi penyetuju hanya dengan mengetik nama "Ust. …".
  - Alternatif yang ditolak: daftar `reviewer_key` di `settings`, karena hash dibuat dari `sub` Access, bukan email, sehingga pemilik tidak bisa mencocokkan hash ke orang dengan aman.
  - Agent mengecek docs Access terbaru (jumlah aplikasi/pengguna paket Free) sebelum memilih, dan mencatatnya di ADR.
- Nama tampilan tetap diketik orangnya. Untuk penyetuju, nama tampilannya ditetapkan pemilik per AUD/peran, bukan diketik bebas.
- Pemeriksaan peran di server gagal-tertutup, bukan hanya disembunyikan di UI.

### 6. Editor teks

- **Tahap pertama: textarea biasa + validasi + pratinjau.** Tiptap/ProseMirror tidak dipasang. Gaya tampilan diatur kode, jadi tombol format justru tidak diinginkan.
- Tiptap baru dipertimbangkan bila uji coba menunjukkan editor sering merusak placeholder. Di situ ia berguna untuk menjadikan `⟦QS⟧` dan `(١)` "chip" terkunci, dengan semua tombol format dimatikan. Butuh ADR tersendiri (dependensi baru, ukuran bundel, lisensi).

## Skema (usulan, dirinci saat sesi)

- DB app, migrasi `0005_translation_revision.sql`:
  - `translation_revision` (id, passage_id, base_sha256, text, reason, author_key, author_name, created_at, status `proposed|approved|changes_requested|rejected|confirmed`, decided_by_key, decided_at, decision_note). `CHECK` pada panjang dan status.
  - Indeks per status dan per paragraf.
  - Kolom tambahan `source_sha256` dan penanda `stale` (usang).
  - DB app tidak ikut blue-green korpus (sama seperti `answer_log`).
  - `translation_revision` **tidak** ikut cron hapus fisik P-7. Ini data kerja permanen; `/privasi` diberi satu kalimat tentang nama tampilan + hash editor yang disimpan.
- Korpus, skema +1:
  - kolom `revision_id`, `revised_at` di `translation` (atau tabel `translation_provenance`);
  - `model`/`prompt_version` tetap menunjuk draf AI asalnya.
- Git: `data/reviews/ihya-9472-revisi.json` (metadata saja, divalidasi zod, tanpa teks; tes menolak entri yang memuat teks).

## Pertanyaan untuk pemilik

1. **Siapa saja editornya,** dan siapa penyetujunya (Anas/T-24 atau ustadz lain)? Boleh satu orang menjadi editor sekaligus penyetuju untuk paragraf orang lain?
2. **Nama peninjau ditampilkan publik** ("ditinjau Ust. …") atau label umum saja? (Usul agent: label umum dulu; nama hanya dengan persetujuan tertulis orangnya.)
3. **Syarat tayang:** hanya sesudah disetujui ustadz (usul agent), atau editor tepercaya boleh langsung tayang dengan label "diperiksa editor"?
4. **Kecepatan tayang:** ikut versi korpus berikutnya (usul agent; promote tetap oleh/atas izin pemilik), dan seberapa sering, misalnya tiap 2 minggu atau tiap 50 koreksi?
5. **Urutan antrean:** setuju hasil T-17 → laporan pembaca → judul daftar isi/subjudul → bebas?
6. **Ringkasan AI** (313 bagian) ikut bisa dikoreksi dengan alur yang sama, atau terjemahan paragraf dulu? (Usul agent: paragraf dulu; ringkasan sesi berikutnya.)

## Baca dulu (hanya ini)

- File ini; ADR-047 (lapisan koreksi), ADR-052 (ruang tinjau Access), ADR-034 (ISR pembaca), ADR-044 (pencarian Indonesia), ADR-049/050 (kontrak MCP).
- `.claude/rules/teks-arab.md` aturan 1, 3, 8, 9.
- `apps/web/src/lib/review-auth.ts`, `apps/web/src/app/(app)/tinjau/`, `apps/web/src/app/api/review/`, `components/review/review-client.tsx`.
- `tools/ingest/src/llm/{reviews,attach,batch}.ts`, `tools/ingest/src/search-index.ts`, `packages/core/src/page.ts`, `packages/core/src/ayah-placeholder.ts`, `packages/llm/src/check.ts`.
- Docs Cloudflare Access (JWT, grup/kebijakan) lewat `/docs-terbaru` atau MCP `cloudflare-docs`.

## Langkah

1. Branch `sesi/x05-koreksi-terjemahan`; catat jawaban pemilik di file ini.
2. Pindahkan pemeriksa teks murni ke `validateTranslationText` (§1). Lalu migrasi app `0005` + repository bertipe + tes (status, `CHECK`, satu usulan terbuka per paragraf, teks dasar berantai).
3. API `/api/review/terjemahan` (GET antrean/paragraf, POST usulan/konfirmasi, POST keputusan), dengan Access + peran di server, batas ukuran, validasi teks (§1), konflik versi dasar (409 bila terjemahan dasar berubah).
4. UI `/tinjau/terjemahan`: antrean, panel Arab (dari DB, hanya baca), textarea + pratinjau + pesan validasi, diff untuk penyetuju, ponsel dan desktop. Komponen HeroUI lewat MCP `heroui-pro`.
5. Ekspor `pnpm review:export-terjemahan` → file lokal git-ignored + R2 privat + metadata git; ingest memakai revisi (cek hash), `translation_fts` ikut teks baru, batch melewati paragraf berevisi.
6. Label pembaca dan MCP (`revised`), tes kontrak MCP.
7. Uji ujung-ke-ujung di staging (`surau-app-staging`): 3 paragraf uji. Usulan dibuat dengan identitas editor uji, persetujuan dengan identitas penyetuju **berbeda**: email kedua pemilik di aplikasi Access staging, atau jalur tes dengan kunci uji bila Access staging belum ada. Data uji ditandai lalu dibuang. Alurnya: ekspor → `ihya-vN` lokal/staging → pembaca, `/api/search`, dan MCP lokal menampilkan teks baru.
8. `pnpm verify`, e2e, `peninjau`, ADR baru, STATUS/LOG/TUGAS-PEMILIK (tugas baru: undang editor/penyetuju ke Access, uji coba 10 paragraf).

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
  - token editor tidak bisa menyetujui (403);
  - token editor tidak bisa membaca/menilai jawaban eval, dan token penilai jawaban tidak bisa mengedit terjemahan (403);
  - penulis tidak bisa menyetujui usulannya sendiri;
  - tanpa token Access → 401 di semua host.
  Cara pemberian peran (aplikasi Access per peran) tercatat di ADR dan langkahnya di TUGAS-PEMILIK.
- [ ] Konflik versi (tes):
  - usulan atas teks dasar yang sudah berubah ditolak 409;
  - dua usulan berantai (kedua dibuat sesudah yang pertama disetujui, sebelum korpus baru) diterima dengan dasar = revisi pertama;
  - ekspor hanya memuat revisi kedua.
- [ ] Riwayat: setiap usulan/keputusan tersimpan; tidak ada `UPDATE` yang menimpa teks revisi (tes repository).
- [ ] Ekspor + ingest:
  - korpus uji memuat teks revisi untuk paragraf uji;
  - `review_status` sesuai tabel §2;
  - hash di metadata git cocok;
  - ingest gagal bila file ekspor hilang atau hash berbeda (tes);
  - revisi dengan `source_sha256` beda atau placeholder ayat yang kini tidak cocok ditandai usang dan tidak dimuat (tes);
  - status hanya diterapkan bila hash teks korpus = `base_sha256` (tes: draf AI diganti → label kembali "Terjemahan AI");
  - file metadata git tidak memuat teks (tes skema).
- [ ] Konsistensi K1: untuk paragraf uji, pembaca, `/api/search` (kata dari teks revisi), dan MCP `read_page` lokal menampilkan teks yang sama (perintah + keluaran dicatat); `eval:retrieval --gate` atas korpus uji tidak turun dari `ihya-v7`.
- [ ] Batch AI melewati paragraf berevisi (`plan`/`retry` tidak memasukkannya; tes).
- [ ] Label pembaca, kartu `/cari`, dan kartu kutipan Tanya sesuai tabel §4 lewat satu fungsi label (tes komponen + tangkapan layar). Kurung siku redup hanya pada teks revisi (tes). MCP `read_page` memuat `review_status` + `revised` (tes kontrak).
- [ ] Tidak ada email atau identitas mentah di DB/log (cek skema + `grep` diff); teks Arab di UI tinjau berasal dari DB.
- [ ] ADR baru, STATUS, LOG, TUGAS-PEMILIK, dan file sesi ini diperbarui.
- [ ] (Manusia, boleh menyusul) Uji coba editor sungguhan: ≥ 10 paragraf dari antrean T-17 dikoreksi dan disetujui, lalu tayang di produksi lewat korpus berikutnya atas izin promote.

## Di luar cakupan

- Mengedit teks Arab (tetap lewat laporan + patch), takhrij, atau terjemahan ayat Kemenag.
- Editor teks kaya (Tiptap) dan format tersimpan apa pun.
- Overlay langsung di pembaca tanpa korpus baru.
- Koreksi ringkasan AI (kecuali pemilik memutuskan lain di pertanyaan 6).
- Usulan koreksi dari pembaca anonim (tetap lewat formulir laporan).
- Mengubah label/prompt di pipeline Jawab.
- LLM berbayar apa pun.

## Catatan hasil

*(diisi agent di akhir sesi pelaksanaan)*
