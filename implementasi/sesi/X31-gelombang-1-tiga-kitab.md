# X31 · Gelombang 1: tiga kitab kecil yang lengkap

> **Fase:** Sisipan (jembatan ke Fase 5 dan 7) · **Status:** X31a selesai 2026-11-27 (kode selesai 2026-11-26; Ihya diarsipkan [ADR-142](../keputusan/ADR-142.md), build tanpa Ihya lolos di Mac; langkah 8a selesai 2026-11-27 [ADR-144](../keputusan/ADR-144.md); staging berisi Bidayah sejak 2026-11-27, QA 30/30)
> **Prasyarat:** Ihya diarsipkan ([ADR-142](../keputusan/ADR-142.md), keputusan pemilik 2026-11-26): korpus bawaan hanya kitab Gelombang 1, dibangun di Mac; mesin agent tidak diperlukan lagi (ADR-135 butir 5 dicabut). Patch ayat X29 tidak tayang. X31b–X31d: X31a dan X24 selesai.
> **Tugas pemilik:** izin `corpus:load:staging` (`tools/ingest/README.md`), izin biaya per batch (aturan keras 4), izin promote korpus, T-29 untuk audio
> **Perkiraan:** X31a 1–2 percakapan, X31b 1–2, X31c 1, X31d 1–2
> **Keputusan dasar:** [ADR-135](../keputusan/ADR-135.md)

## Tujuan

Tiga kitab kecil tayang di surau.org **lengkap**, menggantikan Ihya yang diarsipkan (ADR-142): teks asli, terjemahan Indonesia, ayat dengan Kemenag, Cari, Intisari, audio (bila memenuhi kriteria di bawah), dan MCP. Satu kitab langsung tayang begitu lolos "Definisi selesai", tanpa menunggu Jawab (`/rilis 4`). Kitab pertama menjadi cetakan untuk kitab berikutnya.

| Kitab | Shamela | OpenITI (ID sama) | Ukuran | Slug (sudah dipakai di "Segera hadir", ADR-115) |
|---|---|---|---|---|
| Bidayat al-Hidayah, al-Ghazali (w. 505 H) | 12718, 46 halaman (cetak 25–70, unik) | `0505Ghazali.BidayatHidaya.Shamela0012718-ara1` | ±80 ribu karakter (±1,5% Ihya) | `bidayat-al-hidayah` |
| at-Tibyan fi Adab Hamalat al-Qur'an, an-Nawawi (w. 676 H) | 1969, 224 halaman (cetak 5–230, unik) | `0676Nawawi.Tibyan.Shamela0001969-ara1` | ±133 ribu karakter (±2,4%) | `at-tibyan` |
| al-Ajurrumiyyah, Ibnu Ajurrum (w. 723 H) | 11371, 31 halaman, **hanya 19 nomor cetak berbeda** (5–23) | `0723IbnAjrum.Ajrumiyya.Shamela0011371-ara1` | ±13 ribu karakter (±0,25%) | `al-ajurrumiyyah` |

Diukur 2026-11-26 dari drive Shamela (hanya baca, `node:sqlite`) dan GitHub OpenITI. Catatan kaki (garis pemisah, isinya belum diperiksa): Bidayah tidak ada; Tibyan 5 halaman; Ajurrumiyyah 4 halaman. Edisi Bidayah dan Tibyan bertahqiq modern (Muhammad Zainhum, Muhammad al-Hajjar), jadi catatan kaki pentahqiq perlu aturan (X31a langkah 2). Nomor cetak Ajurrumiyyah yang ganda melanggar keunikan (edisi, juz, halaman) di ADR-029 dan wajib diputuskan sebelum masuk korpus (X31a langkah 4).

## Definisi selesai per kitab

Dipakai sama untuk ketiga kitab. Butir yang tidak berlaku hanya boleh dikecualikan lewat ADR yang menyebut alasannya, dan dikutip di "Catatan hasil". Kriteria tidak boleh dilonggarkan supaya kitab tampak lolos (aturan keras 5).

- [ ] **Sumber dan lisensi:** baris ledger (ID Shamela, URI OpenITI, edisi, penerbit, tahun wafat, kelas catatan kaki, lisensi); `pnpm ingest:verify` lolos ambang; atribusi di `data/ATTRIBUTION.md`, `/lisensi`, dan `EDITION_SOURCE`
- [ ] **Korpus:** masuk build korpus Gelombang 1; peta ID `data/ids/<slug>-<shamela>.json` di-commit; ID kitab lain di korpus tidak berubah (sidik teks lolos; semula "bersama Ihya", diubah ADR-142 butir 8); `pnpm run corpus:qa staging` untuk kitab ini 30/30 (atau seluruh halaman bila kurang dari 30)
- [ ] **Pembaca:** `curl` staging/produksi `/kitab/<slug>`, satu halaman cetak `/kitab/<slug>/1/<halaman>`, dan `daftar-isi.json` → 200 dengan judul kitab yang benar; permalink paragraf, salin sitasi, dan laporan kesalahan dicek di browser
- [ ] **Ayat:** laporan ingest menyebut jumlah rujukan ayat dan yang cocok persis (Tanzil + Kemenag)
- [ ] **Hadits:** tidak ada takhrij tertaut, jadi `get_hadith_takhrij` dan kartu kutipan Intisari memakai frasa "status belum diketahui" (teks-arab aturan 6); tes atau curl membuktikan tidak ada label status untuk kitab ini
- [ ] **Terjemahan Indonesia:** cakupan ≥ 99% paragraf badan (gerbang `llmCoverage` kitab ini dinaikkan ke 0,99), berlabel "terjemahan AI", lolos validator; ayat lewat placeholder Kemenag
- [ ] **Cari:** `GET /api/search?q=<kata Arab yang ada di kitab ini>` dan satu kueri Indonesia (keduanya ditulis di "Catatan hasil" beserta hasil yang diharapkan) mengembalikan halaman kitab ini; filter per kitab bekerja (butir "eval:retrieval Ihya tidak turun" dihapus, ADR-142 butir 8)
- [ ] **Intisari:** Intisari Bab untuk setiap judul tingkat teratas daftar isi kitab (daftarnya ditetapkan di ledger saat X31a) + satu Intisari Kitab, dibuat lewat plugin `surau-redaksi`, lolos periksa tiga lapis, diimpor lewat jalur X24
- [ ] **Audio (Dengar):** dibuat bila skrip Intisari kitab itu masih bermakna tanpa huruf Arab (kriteria: setidaknya 80% gagasan tidak bergantung pada contoh atau lafaz Arab, dinilai saat menulis skrip). Bila tidak, ADR menyatakan kitab itu tanpa audio
- [ ] **MCP:** `list_works` memuat kitab ini; `read_page`, `search_text`, dan `get_section_digest` bekerja (uji lewat `bash .github/scripts/uji-mcp.sh`); instruksi server menyebut korpus umum (≤ 2.000 karakter, ADR-126)
- [ ] **Tampil:** kitab keluar dari "Segera hadir" (suara minat untuk slug ini berhenti); `/kitab` menampilkan semua kitab tayang, bukan hanya yang terbaru (ADR-115 "Tinjau ulang bila"); masuk sitemap dan OG
- [ ] **Produksi:** promote atas izin pemilik; curl produksi membuktikan butir Pembaca, Cari, Intisari, dan MCP

## Baca dulu (hanya ini)

- [ADR-135](../keputusan/ADR-135.md) (lingkup), [ADR-018](../keputusan/ADR-018.md) (rantai OpenITI), [ADR-029](../keputusan/ADR-029.md) (formula ID per edisi, slug beku, kitab satu jilid = juz 1, pasangan halaman unik), [ADR-115](../keputusan/ADR-115.md) ("Segera hadir")
- Riset korpus 2026-10-27 di branch `riset/ringkasan-buku-pecahan-produk` (belum di `main`): `docs/riset/2026-10-27-ringkasan-buku-dan-pecahan-produk/07-korpus-dan-data.md` §2.1–2.5 (ledger, gerbang G0–G8, catatan kaki, lisensi). Baca dari branch itu bila belum digabung, tanpa menggabungkannya diam-diam
- `tools/ingest/src/works/ihya.ts` (`WorkConfig`), `tools/ingest/src/cli.ts`, `tools/ingest/src/pipeline.ts`, `tools/ingest/src/load.ts`, `tools/ingest/README.md`, [ARSITEKTUR-TEKNIS](../ARSITEKTUR-TEKNIS.md) §ingest
- `apps/web/src/content/works.ts`, `apps/web/src/content/kitab-mendatang.ts`, `apps/mcp/src/instructions.ts`, `apps/mcp/src/redaksi-instructions.ts`, `plugins/surau-redaksi/skills/*/SKILL.md`, [docs/05-kebijakan.md](../../docs/05-kebijakan.md) (instruksi server direview ustadz)
- [.claude/rules/teks-arab.md](../../.claude/rules/teks-arab.md) aturan 1, 3, 6, 8, 9, 11

## X31a · Fondasi multi-kitab + korpus Bidayat al-Hidayah (tanpa LLM)

1. **Ledger kitab:** `data/kitab/ledger.yaml` (tanpa teks kitab), satu baris per kitab untuk Ihya dan ketiga kitab ini, dengan kolom di "Definisi selesai" butir pertama ditambah daftar judul tingkat teratas (dasar Intisari Bab). Tes memastikan setiap `WorkConfig` punya baris ledger.
2. **ADR catatan kaki** (ADR baru): kelas `classical` / `modern_editor` / `unknown`; usulan default: catatan kaki pentahqiq modern **tidak tampil**, yang tidak diketahui ditahan, takhrij klasik tampil. Periksa isi catatan kaki Tibyan dan Ajurrumiyyah (hanya baca) untuk menetapkan kelasnya.
3. **Build korpus multi-kitab:** `pnpm ingest` membangun satu `.sqlite` berisi beberapa karya (`WorkConfig[]`); `corpus_version` tidak lagi berawalan `ihya-` (usulan `surau-v10`; tetapkan di ADR). **Menyimpang dari rencana:** `tools/ingest/README.md` dan ARSITEKTUR-TEKNIS menulis "kitab kedua butuh reset per edisi". Usulan di sini tetap reset penuh, karena setiap build selalu memuat semua kitab, sehingga memuat ulang staging (`load.ts` menimpa DB yang sama) tetap utuh. Tulis penyimpangan ini di ADR versi korpus dan perbarui kedua dokumen itu. Gerbang `expect` tetap per karya. Field khas Ihya dijadikan opsional: `rub`, `kitabPerRub`, `openiti.takhrij`, `subheadings`, `patch`, `ayahPatch`.
4. **Nomor halaman ganda Ajurrumiyyah:** putuskan sekarang (bukan di X31d) lewat patch atau aturan penomoran, karena ADR-029 mewajibkan pasangan (edisi, juz, halaman) unik. Cek juga OpenITI untuk penanda halamannya.
5. **`WorkConfig` Bidayah** (`tools/ingest/src/works/bidayah.ts`): ID karya dan edisi baru; penulis memakai `author.id` yang sama dengan Ihya (al-Ghazali); slug `bidayat-al-hidayah`; satu jilid (juz 1); `llmCoverage: 0` sampai X31b.
6. **Alat yang masih khusus Ihya** dijadikan per karya: `tools/ingest/src/cli.ts` (`IHYA`, `IHYA_AUDIO_MANIFEST`), `tools/ingest/src/qa.ts` (impor `IHYA`, seed 9472), `tools/ingest/src/llm/cli.ts` (`expectedRows(IHYA…)`), dan `tools/ingest/src/llm/digest-cli.ts`. Audit sisanya dengan `git grep -n -i -E "'ihya'|\"ihya\"|IHYA|9472|edition_id 1" -- apps packages tools plugins`. Perbaiki yang membuat kitab kedua salah tampil atau salah atribusi (catatan takhrij al-'Iraqi hanya untuk `ihya/dar-al-marifah`, filter rub'/kitab di Cari, `CITE_AUTHOR`, instruksi MCP). Yang khusus Ihya dan benar dibiarkan.
7. **Web dan MCP:** entri `works.ts` (blurb, sitasi, penerbit, sumber edisi, `/lisensi`); Bidayah keluar dari "Segera hadir"; `/kitab` mendaftar semua kitab tayang; `list_works` memuat dua karya. Instruksi MCP: hanya baris korpus dan kalimat takhrij yang diubah menjadi umum. Perubahan faktual ini ditandai untuk ditinjau ustadz kemudian (ADR-135 butir 8). Sitemap memuat halaman Bidayah.
8a. ✅ (2026-11-27, ADR-144) **Persiapan sebelum staging tanpa Ihya** (temuan peninjau 2026-11-26, ADR-142 Dampak). Tanpa langkah ini muat staging gagal, dan CI Preview setiap PR menjadi merah:
   - smoke D1 di `tools/ingest/src/d1.ts` (`SMOKE_PAGE`: Ihya j1 h200 + catatan kaki; dipakai `corpus:load:*` dan promote) dijadikan per kitab, dengan halaman contoh di `WorkConfig` dan cek catatan kaki hanya untuk kitab `classical`;
   - e2e Preview (`apps/web/e2e/*`, 9 spec memakai `/kitab/ihya/…`) dan `.github/scripts/uji-mcp.sh` (Preview + deploy) tidak lagi bergantung pada Ihya: pindah ke Bidayah, atau dilewati bila kitabnya tidak ada;
   - buktikan dengan `pnpm corpus:load:local` lalu `pnpm test:e2e` lokal.
8. ✅ (2026-11-27) Di Mac (ADR-142; semula mesin agent): build, lalu `corpus:load:staging` **atas izin pemilik**, `corpus:qa staging` untuk Bidayah, dan cek pembaca serta Cari di staging.

**Selesai bila:**
- [x] `pnpm verify` lolos
- [ ] ~~build memuat Ihya + Bidayah; sidik teks membuktikan ID Ihya tidak berubah~~ diganti ADR-142 butir 8 (Ihya diarsipkan; tidak dicentang)
- [x] build bawaan (Bidayah) lolos semua gerbang: `pnpm ingest korpus` di Mac → 1 kitab, semua invarian ✓, 0,8 dtk, sha256 `95d8cccc…` (2026-11-26)
- [x] `pnpm run corpus:qa staging` Bidayah 30/30: `corpus:qa staging --kitab bidayat-al-hidayah` → 30/30 cocok byte demi byte (seed 12718), baris korpus cocok (2026-11-27)
- [x] `curl` staging `/kitab/bidayat-al-hidayah/1/25` → 200, dan satu kueri Arab Bidayah di `/api/search` mengembalikan halaman Bidayah: `pnpm dev:remote` (D1 = `surau-corpus-staging`) → `/kitab`, `/kitab/bidayat-al-hidayah`, `/1/25`, `daftar-isi.json`, `/cari?q=الهداية` = 200; `/api/search?q=الهداية` → 7 hasil, pertama "Bidayat al-Hidayah, j. 1, h. 27"; `الصلاة` → 35; Preview tetap `pembaca` `/kitab/bidayat-al-hidayah/1/25` = 200 (2026-11-27)
- [x] ADR catatan kaki, ADR versi korpus (berikut penyimpangan reset), dan keputusan halaman ganda Ajurrumiyyah tertulis (ADR-137, ADR-138, ADR-139)
- [x] STATUS, LOG, dan bagian ini diperbarui

## X31b · Bidayat al-Hidayah lengkap (cetakan)

1. **Alat batch per kitab lalu terjemahan Indonesia:** jadikan `pnpm llm`, `pnpm llm intisari`, dan alat audio per kitab (`--kitab`, folder kerja `WorkConfig.llm.dir`, tautan dan laporan per kitab; dipindah dari X31a, ADR-137 butir 8). Lalu batch API yang sudah ada (validator S13/X21) dengan `--budget`. Perkiraan di bawah US$1; angka pastinya dari mode rencana (gratis), lalu **izin pemilik** sebelum `--confirm`. Alternatif tanpa biaya API: skill plugin terjemahan Indonesia (belum ada; skill `terjemah-inggris` bisa jadi contoh), hanya bila pemilik memilihnya.
2. **Ringkasan bab** pembaca ikut batch yang sama atau dimatikan per karya; tulis pilihannya.
3. **Intisari** (setelah X24): tetapkan `intisari_bab` Bidayah di ledger dan putuskan glosarium milik korpus atau per kitab (ADR-137). Skill plugin `surau-redaksi` dan instruksi `/redaksi` dibuat umum, tidak lagi menyebut Ihya saja (contoh tetap boleh dari Ihya). Buat Intisari Bab untuk setiap judul di ledger dan satu Intisari Kitab, periksa tiga lapis, lalu impor lewat jalur X24.
4. **Audio:** nilai kriteria audio; bila lolos, skrip Intisari → ElevenLabs (T-29, **izin biaya**), sorotan kalimat (X18) bila timestamps tersedia.
5. **Terjemahan Inggris** (opsional, bukan syarat selesai): lewat skill `terjemah-inggris` bila antrean X26 berjalan.
6. **Tampil:** tambahkan rincian atribusi Bidayah ke `EDITION_CREDITS` (/lisensi), hentikan suara minat untuk slug ini di `/api/minat-kitab`, ubah status ledger ke `tayang` (syarat promote, ADR-137 butir 6), dan pertimbangkan label "Halaman 25" tanpa "Juz 1" untuk kitab satu jilid.
7. **Promote pertama Gelombang 1 = situs dibuka lagi** (ADR-142 butir 3 dan 7), atas izin pemilik. Ihya sudah diturunkan 2026-11-26 lewat `READER_ENABLED` "0" (web) dan `KITAB_OPEN` "0" (MCP). Di PR promote, kembalikan keduanya ke "1". Di PR yang sama atau sebelumnya:
   - landing (`apps/web/src/lib/landing-data.ts`: `LANDING_WORK`, `HERO_QUOTE`, `SEARCH_DEMO_IDS` diganti paragraf Bidayah, disalin kode dari DB; teks `i18n/id/landing.ts`);
   - halaman MCP (`i18n/id/mcp.ts`), `/lisensi` dan `data/ATTRIBUTION.md` (Ihya ditandai diarsipkan), daftar audio `apps/media`, sitemap;
   - CI produksi: `.github/workflows/deploy.yml` (cek `/kitab/ihya/1/200` dan `uji-mcp.sh … redaksi` dengan section Ihya; bila gagal, deploy MCP tidak jalan) dan `eval.yml` (eval Cari Ihya di staging);
   - rollback sesudah promote ini = revert PR promote (binding dan kode web sekaligus), bukan hanya `--switch-only`;
   - URL lama `/kitab/ihya/…`: putuskan halaman "diarsipkan" dengan `noindex` atau 410, lalu tulis pilihannya di sini.

   - kembalikan tautan pembaca di halaman `/mcp` (dihapus saat Ihya diturunkan; string `readerLink` masih ada) dan contoh prompt bila perlu;
   - `/redaksi` produksi ikut tertutup selama `KITAB_OPEN` "0", dan D1 produksi belum berisi Bidayah. Karena itu Intisari Bidayah (langkah 3) dibuat dengan plugin yang mengarah ke Preview atau MCP lokal berdata staging; tetapkan caranya di langkah 3.

   Patch ayat X29 dan terjemahan ulang 153 paragraf Ihya **dibatalkan** (ADR-142 butir 6).
8. Tulis **catatan cetakan** di "Catatan hasil": urutan langkah yang ternyata perlu, waktu, dan biaya nyata.

**Selesai bila:** semua butir "Definisi selesai" untuk Bidayah tercentang dengan bukti perintah · catatan cetakan tertulis · biaya nyata tercatat di LOG.

## X31c · at-Tibyan

Ikuti cetakan X31b. Tambahan:
- Terapkan kelas catatan kaki dari ADR X31a; catatan kaki pentahqiq modern tidak tampil.
- Banyak hadits dan atsar tanpa takhrij tertaut, jadi berlaku frasa "status belum diketahui". Penilaian hadits yang ditulis an-Nawawi sendiri di matan adalah bagian teks, bukan label Surau.
- Bab tentang Al-Qur'an padat ayat: laporkan cakupan pencocokan Tanzil. Kutipan yang terlewat ditangani dengan pola patch ayat (ADR-134) hanya bila jumlahnya berarti, sebagai langkah terpisah.
- Daftar isi 127 judul untuk 224 halaman: cek judul yatim dan kedalaman daftar isi.

**Selesai bila:** semua butir "Definisi selesai" untuk Tibyan tercentang dengan bukti perintah · biaya nyata tercatat di LOG.

## X31d · al-Ajurrumiyyah

Ikuti cetakan X31b. Keputusan berikut wajib ditulis sebagai ADR sebelum batch:
- **Contoh Arab di terjemahan.** Kitab nahwu penuh contoh kalimat Arab, sedangkan model tidak boleh menulis huruf Arab (aturan keras 1). Usulan: contoh diganti placeholder berbasis offset, terjemahan menyebut placeholder itu, lalu kode menyisipkan potongan `text_raw` asli saat tampil. ADR wajib menetapkan:
  - (a) **Siapa yang menentukan rentang contoh:** deterministik, dengan normalisasi lewat `packages/text` (aturan 3). Bila model menunjuk, hanya lewat ID/offset yang diverifikasi kode.
  - (b) **Sintaks placeholder baru** yang berbeda dari `⟦QS s:a⟧`, supaya `checkPlaceholders` dan `translationSegments` tidak tertukar. Contoh yang berupa ayat tetap memakai QS + Kemenag (aturan 9).
  - (c) **Filter TTS** membuang placeholder baru (aturan 11).
  - (d) **Transliterasi Latin contoh oleh model:** boleh atau dilarang, dan validatornya.
  - (e) **Instruksi MCP dan indeks Cari Indonesia** menangani placeholder baru (instruksi tetap ≤ 2.000 karakter).
  - Uji pada 5 paragraf sebelum batch.
- **Istilah nahwu:** glosarium (fa'il, maf'ul bih, i'rab, dan seterusnya) dipakai konsisten di terjemahan dan Intisari.
- **Audio:** usulan default **tanpa audio**, karena suara AI tidak membacakan huruf Arab (aturan 11) dan Intisari nahwu tanpa contoh kemungkinan tidak lolos kriteria audio. Alternatif (rekaman manusia berlisensi jelas) diputuskan pemilik.
- **Mutammimah** (Shamela 4234) dan syarah tidak termasuk.

**Selesai bila:** ADR contoh Arab tertulis dan uji 5 paragraf lolos sebelum batch · semua butir "Definisi selesai" tercentang dengan bukti perintah (audio lewat ADR bila dikecualikan) · biaya nyata tercatat di LOG.

## Selesai bila (seluruh X31)

- [ ] X31a–X31d selesai menurut kriteria masing-masing
- [ ] `pnpm verify` lolos di setiap PR; CI hijau sebelum merge
- [ ] STATUS, LOG, FASE, dan file sesi ini diperbarui; kartu X31a–X31d di papan dipindah sesuai status

## Di luar cakupan

- Jawab/Maknaz dan syarat R4 (eval, judge, label status hadits): tetap mati dan tidak dikerjakan di gelombang ini (ADR-135)
- Semua pekerjaan Ihya: Ihya diarsipkan (ADR-142), termasuk patch ayat X29
- Rilis Fase 5 atau Fase 7 (gelombang ini tidak mengklaim syarat rilis keduanya; lihat ADR-135 "Menyimpang dari rencana")
- Kitab lain (al-Munqidz, Mutammimah, syarah), Jalur, Faedah, halaman `/en`
- OCR dan kitab tanpa versi OpenITI

## Catatan hasil

### X31a (2026-11-26, kode; build staging = T-36)

- **Ingest multi-kitab** (ADR-137): `pnpm ingest korpus [--kitab …]` membangun setiap kitab sendiri lalu menggabungkan barisnya ke satu `surau-corpus-kitab-v10.sqlite`. `WorkConfig` di `tools/ingest/src/works/config.ts`, daftar kitab `works/index.ts`, Bidayah `works/bidayah.ts` (karya 2, edisi 2 `maktabat-madbuli`, pengarang 1 dipakai bersama).
- **Bidayah lolos semua gerbang di Mac:** 46 halaman (cetak 25–70), 46 judul, 391 paragraf, matan 46/46 = OpenITI, 24 rujukan ayat, tanpa catatan kaki. Peta ID dan sidik teks di-commit (`data/ids/bidayat-al-hidayah-12718*.json`), jadi ID Bidayah sudah beku.
- **Ihya:** Intisari dibaca dari folder pilot (`intisari-pilot-x15b-cadangan-2026-10-27`) dengan gerbang ≥ 19, sehingga penukaran folder ADR-136 tidak perlu lagi. Tes lokal Ihya kini ikut menyalin patch ayat X29 (sebelumnya gagal sejak X29 karena berkas itu tidak disalin).
- **Pratinjau lokal** (D1 lokal, Ihya tanpa data AI + Bidayah): pembaca `/kitab/bidayat-al-hidayah/1/25` tampil dengan daftar isi; `/kitab` menampilkan "Semua kitab" dan Bidayah keluar dari "Segera hadir"; `/api/search` menemukan Bidayah dengan sitasi "Bidayat al-Hidayah, j. 1, h. 26". Bukti: `implementasi/sesi/bukti/X31a/`.
- **Alat:** `corpus:qa --kitab <slug>` (seed bawaan = ID Shamela kitab; halaman < `--n` = semua). Instruksi MCP umum ("the works in list_works"), 1.974 byte.
- **Menyimpang dari rencana (ditulis terbuka):** `intisari_bab` di ledger belum diisi untuk Bidayah. Daftar judul yang mendapat Intisari Bab lebih tepat ditetapkan bersama pembuatan Intisari di X31b (langkah 3), saat struktur 46 judul dibaca utuh. Rincian /lisensi Bidayah juga ditahan sampai X31b supaya produksi tidak menyebut kitab yang belum tayang.
- **Perbaikan dari peninjau:** pengaman promote (ledger `tayang`, `--kitab-baru`), kunci glosarium `(term_key, lang)`, ID diterima di luar edisi = galat, revisi X08 di luar build dilaporkan, tes CI gabung dua kitab dari fixture buatan (`test/corpus-merge.test.ts`: skema Shamela lama, `part` kosong, tanpa takhrij, ID ganda, batas bawah Intisari).
- **Dipindah ke X31b (terbuka, ADR-137 butir 8):** alat batch LLM (`pnpm llm`, `pnpm llm intisari`) dan alat audio masih khusus Ihya (±45 tempat: folder kerja, tautan, laporan). Baru dibutuhkan saat batch Bidayah.
- **Temuan untuk X31c/X31d:** catatan kaki Tibyan dan Ajurrumiyyah dari pentahqiq modern (ADR-138, tidak dimuat); Ajurrumiyyah 31 halaman Shamela = 19 nomor cetak, digabung per nomor (ADR-139). Berkas Shamela 12718 dan 11371 tidak punya kolom `is_deleted`; sudah didukung.
- **Catatan:** Next.js 16.4.2 menampilkan peringatan kerentanan keamanan saat `next dev` (rujukan advisori npm). Tidak ditindaklanjuti di sesi ini; diusulkan sebagai sesi terpisah.
- **Berikutnya (semula):** T-36 (build + staging di mesin agent), lalu X24, lalu X31b.

### X31a lanjutan: Ihya diarsipkan (2026-11-26, ADR-142)

- **Keputusan pemilik:** tiga kitab kecil dulu, Ihya diarsipkan dan turun dari surau.org. Waktunya: saat promote pertama Gelombang 1, kecuali pemilik minta lebih awal. T-36 dibatalkan.
- **Kode:**
  - ledger mendapat status `arsip`, dan Ihya kini `arsip`;
  - `CORPUS` bawaan = `[BIDAYAH]`;
  - promote menolak build yang menghilangkan kitab berstatus `tayang` (`droppedReleasedWorks`).
- **Bukti:**
  - `pnpm ingest korpus` di Mac → korpus `kitab-v10` berisi 1 kitab, semua gerbang ✓, sha256 `95d8cccc…`;
  - `vp test tools/ingest/src/works` → 5 tes lolos.
- **Peninjau:** smoke D1, e2e Preview, dan `uji-mcp.sh` masih khusus Ihya, jadi ditambahkan langkah 8a sebelum muat staging. `pnpm ingest ihya` kini ditolak dengan saran, `corpus:qa` wajib `--kitab`, tes lokal Ihya dilewati bila korpus lokal tanpa Ihya, dan tes pengaman promote memakai ledger sintetis.
- **Berikutnya:** langkah 8a, lalu muat staging + `corpus:qa staging --kitab bidayat-al-hidayah` (izin pemilik), lalu X24, lalu X31b.

### X31a langkah 8a (2026-11-27, ADR-144)

- **Smoke D1 per kitab:** `WorkConfig.smoke` (halaman contoh, kata cari, catatan kaki hanya untuk kitab `classical`). Ihya tetap j1 h200 + catatan kaki (rollback ke `ihya-v9` diperiksa seperti dulu); Bidayah h25 + الهداية.
- **e2e Preview:** `e2e/korpus.ts` melewati tes data Ihya bila Ihya tidak ada; `bidayah.spec.ts` baru (pembaca, sitasi, daftar isi, `/kitab`, `/api/search`); a11y memeriksa halaman Bidayah.
- **`uji-mcp.sh`:** data uji dipilih dari `list_works` (Bidayah bila ada, selain itu Ihya).
- **Temuan dan perbaikan:** `/cari` gagal 500 di korpus tanpa Ihya (`SEARCH_WORK = "ihya"`); kini memakai satu-satunya karya di korpus. Filter bagian untuk banyak kitab menyusul paling lambat X31c.
- **Bukti:** `pnpm corpus:load:local` → smoke lolos (`kitab-v10`) · `pnpm test:e2e` lokal (D1 = Bidayah saja) → 134 lolos, 172 dilewati, 2 gagal di `smoke.spec.ts` "aset ilustrasi" (header `immutable` hanya di runtime Workers, tidak terkait) · `uji-mcp.sh` lokal mode `lengkap` dan `redaksi` → lolos kedua era · `pnpm verify` → lolos.
- **Peninjau (0 blocker, 4 perbaikan dikerjakan):** skrip debug terhapus; e2e hanya melewati tes bila `daftar-isi.json` = 404 (status lain = gagal); tes penjaga "korpus memuat minimal satu kitab uji" (tidak pernah dilewati); teks rencana promote dan ARSITEKTUR-TEKNIS diperbarui; tes ledger mewajibkan kata contoh tetap kueri FTS.
- **Utang untuk X31b:** tes pembaca yang kini dilewati (subjudul, terjemahan, mode baca, gulir bersambung, Intisari data) ditulis ulang ke Bidayah setelah datanya ada; `deploy.yml` (cek `/kitab/ihya/1/200`, `uji-mcp.sh … redaksi` produksi) diubah di PR promote.
- **Berikutnya (semula):** muat staging, QA, cek pembaca dan Cari.

### X31a staging (2026-11-27, izin pemilik di chat: "Ya")

- PR #248 (langkah 8a) di-merge sesudah CI hijau (verify, preview e2e 7 mnt terhadap staging lama berisi Ihya, preview mcp).
- `pnpm corpus:load:staging --confirm` → `surau-corpus-staging` = `kitab-v10` (Bidayah saja; Ihya tidak lagi di staging), smoke per kitab lolos.
- `corpus:qa staging --kitab bidayat-al-hidayah` → 30/30. Pembaca, daftar isi, `/kitab`, `/cari`, dan `/api/search` di data staging → lolos (rincian di "Selesai bila").
- **Akibat:** Preview setiap PR kini berisi Bidayah. PR lama yang belum memuat ADR-144 (mis. Dependabot #243, #231) akan gagal e2e Preview sampai di-rebase ke `main`.
- **X31a selesai.** Berikutnya X24 (impor Intisari), lalu X31b (terjemahan Bidayah: izin biaya).
