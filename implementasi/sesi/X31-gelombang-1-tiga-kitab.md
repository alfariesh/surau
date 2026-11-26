# X31 · Gelombang 1: tiga kitab kecil yang lengkap

> **Fase:** Sisipan (jembatan ke Fase 5 dan 7) · **Status:** belum
> **Prasyarat:** X31a: kode boleh di Mac, tetapi **build dan staging wajib di mesin agent** (`/home/rekanesia/surau`, ADR-135 butir 5), T-35 selesai 2026-11-26, tetapi staging berisi build X29 yang boleh ditimpa: pemilik memutuskan patch X29 ikut tayang bersama Bidayah (2026-11-26), jadi tidak ada promote X29 terpisah. Build yang memuat Ihya wajib memakai Intisari pilot lewat penukaran folder [ADR-136](../keputusan/ADR-136.md) (build biasa menghapus 19 Intisari tayang). X31b–X31d: X31a dan X24 selesai.
> **Tugas pemilik:** izin `corpus:load:staging` (`tools/ingest/README.md`), izin biaya per batch (aturan keras 4), izin promote korpus, T-29 untuk audio
> **Perkiraan:** X31a 1–2 percakapan, X31b 1–2, X31c 1, X31d 1–2
> **Keputusan dasar:** [ADR-135](../keputusan/ADR-135.md)

## Tujuan

Tiga kitab kecil tayang di surau.org **lengkap**: teks asli, terjemahan Indonesia, ayat dengan Kemenag, Cari, Intisari, audio (bila memenuhi kriteria di bawah), dan MCP. Satu kitab langsung tayang begitu lolos "Definisi selesai", tanpa menunggu Jawab (`/rilis 4`). Kitab pertama menjadi cetakan untuk kitab berikutnya.

| Kitab | Shamela | OpenITI (ID sama) | Ukuran | Slug (sudah dipakai di "Segera hadir", ADR-115) |
|---|---|---|---|---|
| Bidayat al-Hidayah, al-Ghazali (w. 505 H) | 12718, 46 halaman (cetak 25–70, unik) | `0505Ghazali.BidayatHidaya.Shamela0012718-ara1` | ±80 ribu karakter (±1,5% Ihya) | `bidayat-al-hidayah` |
| at-Tibyan fi Adab Hamalat al-Qur'an, an-Nawawi (w. 676 H) | 1969, 224 halaman (cetak 5–230, unik) | `0676Nawawi.Tibyan.Shamela0001969-ara1` | ±133 ribu karakter (±2,4%) | `at-tibyan` |
| al-Ajurrumiyyah, Ibnu Ajurrum (w. 723 H) | 11371, 31 halaman, **hanya 19 nomor cetak berbeda** (5–23) | `0723IbnAjrum.Ajrumiyya.Shamela0011371-ara1` | ±13 ribu karakter (±0,25%) | `al-ajurrumiyyah` |

Diukur 2026-11-26 dari drive Shamela (hanya baca, `node:sqlite`) dan GitHub OpenITI. Catatan kaki (garis pemisah, isinya belum diperiksa): Bidayah tidak ada; Tibyan 5 halaman; Ajurrumiyyah 4 halaman. Edisi Bidayah dan Tibyan bertahqiq modern (Muhammad Zainhum, Muhammad al-Hajjar), jadi catatan kaki pentahqiq perlu aturan (X31a langkah 2). Nomor cetak Ajurrumiyyah yang ganda melanggar keunikan (edisi, juz, halaman) di ADR-029 dan wajib diputuskan sebelum masuk korpus (X31a langkah 4).

## Definisi selesai per kitab

Dipakai sama untuk ketiga kitab. Butir yang tidak berlaku hanya boleh dikecualikan lewat ADR yang menyebut alasannya, dan dikutip di "Catatan hasil". Kriteria tidak boleh dilonggarkan supaya kitab tampak lolos (aturan keras 5).

- [ ] **Sumber dan lisensi:** baris ledger (ID Shamela, URI OpenITI, edisi, penerbit, tahun wafat, kelas catatan kaki, lisensi); `pnpm ingest:verify` lolos ambang; atribusi di `data/ATTRIBUTION.md`, `/lisensi`, dan `EDITION_SOURCE`
- [ ] **Korpus:** masuk build korpus bersama Ihya; peta ID `data/ids/<slug>-<shamela>.json` di-commit; ID Ihya tidak berubah (sidik teks lolos); `pnpm run corpus:qa staging` untuk kitab ini 30/30 (atau seluruh halaman bila kurang dari 30)
- [ ] **Pembaca:** `curl` staging/produksi `/kitab/<slug>`, satu halaman cetak `/kitab/<slug>/1/<halaman>`, dan `daftar-isi.json` → 200 dengan judul kitab yang benar; permalink paragraf, salin sitasi, dan laporan kesalahan dicek di browser
- [ ] **Ayat:** laporan ingest menyebut jumlah rujukan ayat dan yang cocok persis (Tanzil + Kemenag)
- [ ] **Hadits:** tidak ada takhrij tertaut, jadi `get_hadith_takhrij` dan kartu kutipan Intisari memakai frasa "status belum diketahui" (teks-arab aturan 6); tes atau curl membuktikan tidak ada label status untuk kitab ini
- [ ] **Terjemahan Indonesia:** cakupan ≥ 99% paragraf badan (gerbang `llmCoverage` kitab ini dinaikkan ke 0,99), berlabel "terjemahan AI", lolos validator; ayat lewat placeholder Kemenag
- [ ] **Cari:** `GET /api/search?q=<kata Arab yang ada di kitab ini>` dan satu kueri Indonesia (keduanya ditulis di "Catatan hasil" beserta hasil yang diharapkan) mengembalikan halaman kitab ini; filter per kitab bekerja; laporan `pnpm run eval:retrieval` untuk Ihya tidak turun
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
8. Di mesin agent: build, lalu `corpus:load:staging` **atas izin pemilik**, `corpus:qa staging` untuk Bidayah, dan cek pembaca serta Cari di staging.

**Selesai bila:**
- [ ] `pnpm verify` lolos
- [ ] build memuat Ihya + Bidayah; sidik teks membuktikan ID Ihya tidak berubah
- [ ] `pnpm run corpus:qa staging` Bidayah 30/30
- [ ] `curl` staging `/kitab/bidayat-al-hidayah/1/25` → 200, dan satu kueri Arab Bidayah di `/api/search` mengembalikan halaman Bidayah
- [ ] ADR catatan kaki, ADR versi korpus (berikut penyimpangan reset), dan keputusan halaman ganda Ajurrumiyyah tertulis
- [ ] STATUS, LOG, dan bagian ini diperbarui

## X31b · Bidayat al-Hidayah lengkap (cetakan)

1. **Terjemahan Indonesia:** batch API yang sudah ada (`pnpm llm`, validator S13/X21, sudah per karya sejak X31a) dengan `--budget`. Perkiraan di bawah US$1; angka pastinya dari mode rencana (gratis), lalu **izin pemilik** sebelum `--confirm`. Alternatif tanpa biaya API: skill plugin terjemahan Indonesia (belum ada; skill `terjemah-inggris` bisa jadi contoh), hanya bila pemilik memilihnya.
2. **Ringkasan bab** pembaca ikut batch yang sama atau dimatikan per karya; tulis pilihannya.
3. **Intisari** (setelah X24): skill plugin `surau-redaksi` dan instruksi `/redaksi` dibuat umum, tidak lagi menyebut Ihya saja (contoh tetap boleh dari Ihya). Buat Intisari Bab untuk setiap judul di ledger dan satu Intisari Kitab, periksa tiga lapis, lalu impor lewat jalur X24.
4. **Audio:** nilai kriteria audio; bila lolos, skrip Intisari → ElevenLabs (T-29, **izin biaya**), sorotan kalimat (X18) bila timestamps tersedia.
5. **Terjemahan Inggris** (opsional, bukan syarat selesai): lewat skill `terjemah-inggris` bila antrean X26 berjalan.
6. Promote atas izin pemilik. Promote ini juga menayangkan patch ayat X29 (keputusan pemilik 2026-11-26), jadi sebelum promote: 153 paragraf Ihya yang terjemahannya gugur oleh patch diterjemahkan ulang di batch yang sama dengan langkah 1, dan cek X29 (rujukan ayat 2.693, terjemahan Ihya ≥ 99%) ikut di curl produksi.
7. Tulis **catatan cetakan** di "Catatan hasil": urutan langkah yang ternyata perlu, waktu, dan biaya nyata.

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
- Perbaikan Ihya selain bug yang merusak tampilan (daftar parkir di ADR-135)
- Rilis Fase 5 atau Fase 7 (gelombang ini tidak mengklaim syarat rilis keduanya; lihat ADR-135 "Menyimpang dari rencana")
- Kitab lain (al-Munqidz, Mutammimah, syarah), Jalur, Faedah, halaman `/en`
- OCR dan kitab tanpa versi OpenITI

## Catatan hasil

*(diisi agent di akhir setiap bagian)*
