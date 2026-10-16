# S07 · Importer Ihya (`tools/ingest`)

> **Fase:** 1 · **Status:** selesai* (2026-10-16; butir 5 lihat Catatan hasil)
> **Prasyarat:** S06 selesai · Tugas pemilik: **T-09** (drive Shamela terpasang)
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Pipeline lokal yang mengubah Ihya dari Shamela (`book/472/9472.db`) menjadi data korpus yang tervalidasi: halaman, paragraf, catatan kaki takhrij beserta tautan penandanya, dan daftar isi yang sudah diperbaiki. Matannya terbukti identik dengan rilis OpenITI berlisensi (ADR-018), dan hasilnya termuat di D1 lokal dan staging.

## Baca dulu (hanya ini)

- ADR-018 (sumber teks publik dan rantai lisensi), ARSITEKTUR-TEKNIS §3 dan §6 (pipeline), serta skema dari S06.
- [docs/03-sumber-data.md](../../docs/03-sumber-data.md): struktur Shamela dan cacat daftar isi Ihya.
- `.claude/rules/teks-arab.md` dan README `packages/text`.
- `/docs-terbaru node` (`node:sqlite` `DatabaseSync` readOnly, type stripping), `/docs-terbaru wrangler` (`d1 execute --file`, batas impor).

## Fakta sumber (sudah diverifikasi, 15 Okt 2026)

- Ihya terdiri dari 1.706 halaman (jilid 1–4: 361/386/413/546) dan 311 judul. `title.page` menunjuk ke `page.id`, bukan ke halaman cetak. `page.page` bertipe TEXT (harus di-cast).
- Paragraf dipisah `\r`, dan judul berbentuk `<span data-type="title" id=toc-N>`. Catatan kaki ada setelah **tepat 9** garis bawah `_________` (1.124 halaman), dengan penanda `(١)` berangka Arab-India.
- Sekitar **200 halaman** punya takhrij yang bercampur ke matan setelah `//` (contoh j1 h179). Bagian ini harus dipotong ke catatan kaki dan ditandai `needs_review`.
- Ada dua versi OpenITI yang dipin ke commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e` (rilis 2025.1.9):
  - `0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed`: matan identik per halaman (1.705 dari 1.706 halaman ≥0,95), tapi takhrijnya hilang.
  - `0505Ghazali.IhyaCulumDin.JK000001-ara1`: takhrij ada di dalam baris, diapit ` + `, tapi pasangannya tidak andal secara global, sehingga harus di-parse per halaman.
- Penanda halaman OpenITI `PageVxxPyyy` ada di **akhir** halaman.

## Langkah

1. Lanjutkan `tools/ingest` (paketnya sudah dibuat di S05 berisi `scripts/smoke-text.ts`, `scripts/bench-normalize.ts`, dan tes integrasi `test/ihya-text.test.ts`; Node 24, type stripping, impor `@surau/text` dan `@surau/db` untuk tipe skema). Bungkus akses SQLite di `src/sqlite.ts` (`new DatabaseSync(path, { readOnly: true })`). Jangan pernah menulis ke `/Volumes`.
2. **Sumber & lisensi:**
   - Unduh dua file OpenITI yang dipin ke `data/raw/openiti/` (git-ignored). Catat sha256-nya di `data/SOURCES.md`.
   - Buat `data/LICENSE` (CC BY-NC-SA 4.0 untuk konten turunan) dan `data/ATTRIBUTION.md` (OpenITI 2025.1.9, al-Maktaba al-Shamela, Dar al-Ma'rifah Beirut 1402/1982). Teks atribusinya ada di ADR-018.
3. **Parser Shamela** (`src/shamela/`): baca `page` dan `title`, lalu metadata karya, edisi, dan penulis dari `update/master/book.sqlite` dan `author.sqlite`. Pembersihan dan pemecahan teks **memakai fungsi `@surau/text`** (`splitFootnotes`, `cleanShamelaHtml`, `splitParagraphs`, `linkFootnotes`; S05 mengukur 4.204/4.204 penanda Ihya terhubung). Logika teks baru, termasuk pemisah takhrij `//`, ditambahkan ke `packages/text/src/shamela.ts` beserta tesnya, bukan di `tools/ingest` (satu konsep, satu tempat). Per halaman:
   - Pisahkan badan teks dan catatan kaki.
   - Pisahkan takhrij yang ada setelah `//` dan beri flag.
   - Pecah paragraf; ekstrak span judul (posisinya dicatat, teksnya tetap di DB sebagai judul).
   - Petakan penanda `(١)` di badan teks ke paragraf catatan kaki bernomor sama. Penanda yatim dicatat di laporan.
4. **Daftar isi + patch.** Buat `data/patches/ihya-9472.yaml` (di-commit; hanya ID dan struktur, tanpa teks panjang):
   - Tambahkan *Kitab at-Tafakkur* (mulai `page.id` 1582, j4 h423) dan *Kitab Dzikr al-Maut wa ma Ba'dahu* ke Rub' al-Munjiyat, lalu pindahkan subbabnya.
   - Kembalikan `title.id 170` ke level bayan.
   - Patch diterapkan secara deterministik dan setiap simpul hasil patch ditandai `patched`.
5. **Validasi otomatis** → `data/reports/ihya-9472-validasi.md` (di-commit, tanpa teks kitab):
   - 4 rub' × 10 kitab, urutan halaman monoton, tanpa judul yatim.
   - Hitung penanda tanpa catatan kaki dan sebaliknya, serta halaman dengan `//`.
   - Distribusi panjang paragraf.
   - Ingest **gagal** bila invarian struktural dilanggar.
6. **QA OpenITI** (`pnpm ingest verify-openiti`):
   - Parser mARkdown minimal: penanda halaman di akhir, gabung `~~`, buang `ms\d+`.
   - Bandingkan matan per halaman setelah normalisasi. Target ≥0,95 di ≥1.705 halaman.
   - Cocokkan takhrij dengan segmen JK per halaman. Takhrij yang tidak cocok ditandai `needs_review`.
   - Hasilnya masuk ke laporan.
7. **Keluaran:**
   - `data/build/sql/*.sql` untuk tabel korpus (tanpa FTS): statement ≤90 KB, file berurutan, tanpa `BEGIN`/`COMMIT`.
   - `data/build/surau-corpus-ihya-v1.sqlite`, dibangun dengan migrasi yang sama lewat `node:sqlite`, untuk inspeksi lokal dan cikal bakal dump terbuka.
   - Isi `meta`: `norm_version`, `corpus_version`, `schema_version`, `source_sha256`, dan `built_at`. **`built_at` diambil dari `SOURCE_DATE_EPOCH` atau tanggal commit HEAD, bukan jam sekarang**, supaya build deterministik. Cakupan hash: sha256 gabungan `data/build/sql/*.sql` (terurut) + `.sqlite`.
8. **Muat:** skrip `corpus:load:local` (`wrangler d1 execute … --local --persist-to <root>/.wrangler/state --file`, berurutan), lalu `corpus:load:staging` dengan izin pemilik. Jalankan smoke query (jumlah baris, j1 h200). Isi `page.source_page_id` dengan Shamela `page.id`.
9. **Tes:** unit test parser dengan fixture **buatan** (struktur meniru Shamela: span judul, `\r`, `_________`, `(١)`, `//`). Tes integrasi dengan sumber nyata dilewati otomatis bila `/Volumes/Elfariesh` tidak terpasang.
10. Skrip root: `ingest`, `ingest:verify`, `corpus:load:local`, `corpus:load:staging`.

## Selesai bila

- [x] `pnpm ingest ihya` menghasilkan SQL dan `.sqlite` dari nol dalam < 2 menit, dan bersifat deterministik (dua kali build menghasilkan hash yang sama)
- [x] Laporan validasi: 1.706 halaman, 4×10 kitab setelah patch, 0 judul yatim; penanda yatim dan halaman `//` dihitung
- [x] `verify-openiti`: ≥1.705/1.706 halaman ≥0,95; takhrij yang tidak cocok dengan JK ditandai `needs_review` (jumlahnya dicatat)
- [x] D1 lokal dan staging berisi Ihya; smoke query j1 h200 mengembalikan paragraf dan catatan kaki
- [ ] `git ls-files data/` hanya memuat LICENSE, ATTRIBUTION, SOURCES, patches, dan reports (tanpa teks kitab)
  - *Catatan agent:* tidak terpenuhi persis, karena ada juga `data/ids/ihya-9472.json` (peta ID tanpa teks, diwajibkan ADR-029). Bagian "tanpa teks kitab" terpenuhi. Lihat Catatan hasil.
- [x] Tes unit parser lolos; `pnpm verify` lolos
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Indeks FTS (S11). DB korpus produksi (S10). Kitab lain (Fase 5/7). Pencocokan ayat ke Tanzil (S12).

## Catatan hasil

**Dibuat:**
- `tools/ingest` (ADR-032; cara pakai di `tools/ingest/README.md`):
  - baca Shamela hanya-baca (`assertWritable` menolak apa pun di bawah `/Volumes/`, termasuk lewat symlink atau beda huruf besar-kecil);
  - pecah halaman lewat `@surau/text`;
  - daftar isi + patch YAML;
  - QA OpenITI (parser mARkdown minimal, kemiripan matan LCS token, cocok takhrij bigram vs JK000001);
  - 11 invarian, peta ID, SQL D1, `.sqlite`, laporan, dan skrip muat D1.
- Skrip root: `ingest`, `ingest:verify`, `corpus:load:local`, `corpus:load:staging` (wajib `--confirm`).
- `@surau/text`: `splitInlineTakhrij` (takhrij menempel `//`, dua arah, penanda pembuka tetap di matan) dan `linkFootnoteMarkers`; fungsi tetap 100% teruji.
- `@surau/db`: migrasi korpus **0002 `passage_needs_review`** dan **0003** (lima alasan), `schema_version` 3, skema Zod. Ini **penyimpangan dari rencana**: skema v1 belum punya tempat untuk tanda `needs_review` (ADR-032 butir 2).
- Data yang di-commit (tanpa teks kitab):
  - `data/LICENSE` (CC BY-NC-SA 4.0 resmi + pengantar);
  - `data/ATTRIBUTION.md`, `data/SOURCES.md` (sha256 OpenITI + Shamela);
  - `data/patches/ihya-9472.yaml`, `data/ids/ihya-9472.json`;
  - `data/reports/ihya-9472-validasi.md` dan `-openiti.md`.
- Dependensi baru **`yaml` 2.9.1** (catalog). Alasannya: rencana sesi menetapkan patch dalam YAML, dan Node 24 tidak punya parser YAML bawaan. Paket ini tanpa dependensi, berlisensi ISC, dan bebas advisory; dipakai ketat (kunci ganda, alias, dan kunci asing ditolak).

**Bukti:**
- `rm -rf data/build && pnpm ingest ihya`: ±3 detik. Determinisme dibuktikan dua kali build dari nol pada HEAD yang sama: sha256 build identik. Buktinya diulang di HEAD akhir (lihat LOG). Tes "deterministik" di `test/pipeline.test.ts` juga memeriksanya.
- Laporan validasi: 11 invarian ✓.
  - 1.706 halaman (361/386/413/546);
  - 4 rub' × 10 kitab setelah patch;
  - 0 judul yatim, urutan monoton;
  - penanda tidak hilang; integritas lintas tabel;
  - **4.117 penanda tertaut, 0 penanda yatim**. 87 penanda ada di tengah blok takhrij yang dipotong, dan 87 catatan bawah yang tak terjangkau ditandai `footnote_orphan` (semuanya karena itu). 4.117 + 87 = 4.204, sama dengan S05;
  - **203 halaman `//`**: 130 sesudah, 64 sebelum, 9 tidak dipecah.
- `verify-openiti`: **1.705/1.706 halaman ≥0,95**. Pengecualiannya j3 h116 (0,535): 100% token matan Shamela termuat di OpenITI, yang menambahkan takhrij di dalam baris. Takhrij: **190/4.398 catatan ditandai `takhrij_unmatched`**.
- `pnpm corpus:load:local` dan `pnpm corpus:load:staging --confirm` (atas izin pemilik 2026-10-16; dimuat ulang setelah perbaikan peninjau) menghasilkan angka yang sama di kedua DB:
  - author 1, work 1, edition 1, page 1.706, toc_node 313, passage 20.509, footnote_ref 4.117, passage_needs_review 705 baris (609 paragraf unik);
  - j1 h200: 7 paragraf badan, 7 catatan kaki, 7 penanda tertaut;
  - staging: `schema_version` 3, migrasi 0001–0003.
- `git ls-files data/`: ATTRIBUTION.md, LICENSE, SOURCES.md, ids/ihya-9472.json, patches/ihya-9472.yaml, reports/ihya-9472-openiti.md, reports/ihya-9472-validasi.md. Tidak ada teks kitab; huruf Arab hanya ada pada dua kata pembuka judul di patch dan satu kata "حديث" di penjelasan metode.
- Tes: 45 tes `tools/ingest` (unit + ujung-ke-ujung dengan kitab buatan + 2 tes integrasi Ihya asli yang dilewati di CI) dan 127 tes `@surau/text`.
- `pnpm verify` lolos (angka akhir di LOG).

**Peninjau (subagen `peninjau`):** 0 blocker, 6 "perbaiki", semuanya diperbaiki:
1. 140 penanda ikut terpotong bersama takhrij. Sekarang penanda pembuka tetap di matan (+53 tautan), sisanya dihitung, dan catatan yatim ditandai `footnote_orphan`.
2. Matan di sebelah batas tebakan tidak ditandai. Sekarang ditandai `takhrij_boundary` (migrasi 0003).
3. Kunci ID berpindah arti. Sekarang kunci posisional, dan peta dibangun ulang dengan `--reset-ids`.
4. Invarian lintas tabel dari serah terima S06 belum ada. Sudah ditambahkan, bersama invarian "penanda tidak hilang".
5. Penjaga `/Volumes` dijalankan sesudah `rm` dan bisa dilewati lewat symlink atau huruf kecil. Sekarang `assertWritable` (realpath, tidak peka huruf) dipanggil sebelum setiap hapus/tulis.
6. Dokumen mengklaim terlalu banyak. Cakupan langkah 5/7/8 ditulis apa adanya, dan peringatan reset global ditambahkan.

Saran opsional yang diterapkan:
- kode mati di `takhrijStartBefore` dibuang;
- "اخرج"/"لم أقف" ikut dikenali sebagai atribusi;
- `ReviewReason` diambil dari `@surau/db`;
- keluaran lama dihapus di awal build;
- rasio di bawah ambang dihitung eksak;
- muat staging wajib `--confirm`;
- paragraf tanpa node dilaporkan validasi, tidak crash.

Saran yang **tidak** diterapkan: mensyaratkan kata atribusi untuk takhrij "sesudah `//`". Ke-130 kasusnya memang takhrij, dan 7 di antaranya tanpa kata itu sehingga akan gagal dipisah (ADR-032 butir 3).

**Butir 5 tidak dicentang:** `data/ids/` (peta ID kunci → seq, tanpa teks) ikut di-commit karena ADR-029 butir 3 mewajibkannya dan catatan S06 menugaskannya ke S07. Kriteria tidak diubah. Bila pemilik ingin `data/` persis seperti kriteria, peta ini bisa dipindah, tetapi ADR-029 dan ARSITEKTUR §3.3 harus diubah dulu.

**Utang teknis / catatan:**
- **Batas akhir takhrij "sesudah `//`" tidak pasti** (sumber dan OpenITI sama-sama tidak menandainya). 23 potongan ≥400 karakter mungkin ikut membawa matan; daftarnya ada di laporan validasi. Semua potongan ditandai `takhrij_inline`. Perbaikan per paragraf sebaiknya lewat patch setelah dicek dengan pindaian (T-15/S10).
- 87 penanda di tengah blok takhrij tidak ditautkan. Teksnya utuh di paragraf takhrij, dan catatan bawahnya ditandai `footnote_orphan`.
- Kunci paragraf berbasis indeks baris: menyisipkan baris di tengah halaman sumber menggeser kunci sesudahnya. Ini diterima sebelum rilis; manifes ID dicek di S10.
- `0000-reset.sql` mengosongkan seluruh DB korpus. Kitab kedua butuh reset per edisi; `passage_fts` wajib ikut dikosongkan di S11.
- `tools/ingest` tidak masuk ukuran cakupan (hanya `packages/*/src`); diuji lewat 45 tes.
- `meta.source_hash` memakai nama kunci skema S06, bukan `source_sha256` dari teks langkah 7 (ADR-032 butir 9).
- **Kejadian saat sesi:** proses lain di folder yang sama (kemungkinan sesi atau aplikasi yang menggabungkan PR #18) memindah checkout ke `main` dan menarik PR #18 di tengah pekerjaan, sehingga 4 commit awal sempat tercatat di `main` lokal. Commit itu dipindah ke `sesi/s07-importer-ihya`, dan `main` lokal dikembalikan sama dengan `origin/main` tanpa kehilangan apa pun. Sesi paralel sebaiknya memakai worktree terpisah.

**Untuk sesi berikutnya:**
- **S08:**
  - D1 lokal sudah berisi Ihya (`pnpm corpus:load:local` bila `.wrangler/state` dihapus; `data/build` dibangun ulang dengan `pnpm ingest ihya`, butuh drive).
  - Core tools sebaiknya ikut mengembalikan `passage_needs_review` per paragraf (mis. `needsReview: reason[]`), supaya UI/MCP bisa memberi label "perlu ditinjau".
  - Daftar isi: 313 node, 15 di antaranya `patched`. Jangkar `#p<seq>` diambil dari peta ID.
  - Catatan kaki bisa memuat `\n` (220 catatan multi-baris).
  - Takhrij menempel bisa jadi tujuan `footnote_ref`.
- **S09:** tampilkan label untuk paragraf `needs_review` (terutama `takhrij_inline` dan `takhrij_boundary`) dan tautan `shamela.ws/book/9472/<source_page_id>`.
- **S10:**
  - Pilih halaman T-15 dari daftar `//` panjang, `footnote_orphan`, dan j3 h116.
  - `corpus:load` produksi memakai file SQL yang sama. Impor remote memblokir DB ±1 menit, jadi lakukan blue-green.
  - Tulis prosedur rollback di README `tools/ingest`.
