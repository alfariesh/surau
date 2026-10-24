# X04 · Sesi sisipan: mutu baca pembaca Ihya (tanpa bergantung pada AI)

> **Fase:** sisipan (lepas dari Fase 4; tidak menyentuh `/tanya`, `apps/api`, maupun `packages/llm/src/jawab`) · **Status:** bagian A selesai sebagian (2026-10-21, PR #115: 4 butir *Selesai bila* belum lolos, dicatat apa adanya) + T-17 tahap 3 siap dinilai; **bagian B selesai** (2026-10-21/22, PR #116 + PR promote, ADR-077–078: 4 dari 4 butir lolos; `ihya-v8` di produksi atas izin pemilik)
> **Prasyarat:** pemilik menjawab pertanyaan desain di bawah (dijawab 2026-10-21, lihat *Jawaban pemilik*) · izin biaya judul daftar isi (≤ US$1) · izin promote korpus baru (bagian B)
> **Perkiraan:** 2 percakapan agent. Bagian A (tampilan, $0, tanpa korpus baru) dan bagian B (struktur + judul Indonesia, korpus baru). Bila bagian A menghabiskan satu percakapan, bagian B menjadi sesi sisipan bernomor berikutnya yang masih bebas (X05–X08 sudah dipakai).

Nomor X03 sudah dipakai sesi kandidat Jawab (ADR-067, PR #102), jadi sesi ini X04.

## Kenapa sesi ini ada

Jawab/Tanya masih tertutup (R4 belum terpenuhi, T-24 tertunda) dan kredit AI terbatas (US$20/bulan). Karena itu nilai Surau hari ini ada di **pembaca**. Pembaca Ihya (rilis F1) sudah lengkap fiturnya, tetapi terasa seperti dinding teks per halaman cetak. Penyebabnya bukan teks Arabnya, melainkan penyajian: sebagian besar subjudul tidak dikenali, terjemahan terlalu rapat dan kecil, label AI berulang, dan daftar isi hanya Arab serta bolong di 19 kitab.

Batas yang tidak berubah: teks Arab tidak diubah atau diketik model, harakat tidak ditambah, dan semua perbaikan Arab hanya penyajian serta segmentasi berdasarkan offset `text_raw` atau patch yang bisa diaudit (`.claude/rules/teks-arab.md` aturan 1–2).

## Temuan audit (2026-10-21)

Sumber bukti: produksi https://surau.org (korpus `ihya-v7`) di browser aplikasi, desktop (lebar panel ±800 px, diukur juga di 1440 px) dan ponsel (375×812); kode `apps/web`; korpus lokal `data/build/surau-corpus-ihya-v7.sqlite` (dibuka read-only dengan `node:sqlite`); dan sumber Shamela `9472.db` serta dua file OpenITI (read-only). Tangkapan layar ada di [`bukti/X04/`](bukti/X04/).

### A. Struktur teks

| # | Temuan | Bukti |
|---|---|---|
| A1 | **Sebagian besar subjudul "bayan" tidak masuk daftar isi.** Ada 271 paragraf pendek (< 200 karakter) yang diawali *bayan*. Sebanyak 80 di antaranya sama persis dengan judul node daftar isi, jadi sudah tampil sebagai judul. **191 sisanya** (8.418 karakter) tampil sebagai paragraf biasa: ukuran sama, rata kanan, lengkap dengan blok "Terjemahan AI". Daftar isi punya 102 node *bayan*. | j3/202 `#p13553` ([05](bukti/X04/05-ponsel-bayan-sebagai-paragraf.jpg)); hitungan `node:sqlite` atas `passage` |
| A2 | **19 dari 40 kitab tidak punya subbab sama sekali** di daftar isi. Bagian terpanjang tanpa anak: Kitab al-Halal wal-Haram 70 halaman, Kitab Adab al-Ulfah 65, Kitab Dzamm al-Jah 63, Kitab Afat al-Lisan 58. Median bagian daun 3 halaman, p90 19 halaman, 15 bagian > 30 halaman. Paragraf *bayan* terbanyak justru ada di kitab-kitab ini (mis. node 100177: 21): 13 dari 19 kitab itu punya calon subjudul *bayan*; 6 lainnya tidak. | [06](bukti/X04/06-ponsel-daftar-isi-arab-tanpa-subbab.jpg); `toc_node` ihya-v7 (313 node: level 1–6 = 5/40/93/156/11/8) |
| A3 | **Subjudul yang menempel di awal paragraf** (mis. *lailat al-khamis*, *lailat al-jum'ah*, *lailat as-sabt* di j1/200 `#p2825`–`#p2827`). Sumbernya memang tanpa penanda: Shamela memisah paragraf dengan `\r` tanpa `<span data-type="title">`, dan kedua file OpenITI (`JK000001`, `Shamela0009472`) juga hanya `# ` biasa. Jadi pemisahan hanya bisa lewat daftar kurasi (passage + offset akhir subjudul), bukan aturan otomatis. Pola hari dalam pekan: 15 paragraf (j1/197–200). Pola ordinal (*al-awwal*, *ats-tsani*, … di awal paragraf > 200 karakter): 323, sebagian besar butir daftar, bukan judul. | [02](bukti/X04/02-desktop-subjudul-menempel.jpg); `page.content` Shamela id 200 |
| A4 | **Terjemahan ikut menjadikan subjudul kalimat.** Terjemahan `#p2825` mulai "Salat malam Kamis. Abu Hurairah …", jadi pembaca Indonesia juga tidak melihat batas subbab. | [02](bukti/X04/02-desktop-subjudul-menempel.jpg) |
| A5 | **Syair dirender seperti prosa.** 450 paragraf memuat pemisah bait ` ... ` (460 pemisah). Bisa ditata sebagai dua *syatr* di offset pemisah yang sudah ada, tanpa mengubah teks. | `passage.text_raw` |
| A6 | **Paragraf panjang.** 160 paragraf ≥ 2.000 karakter, 618 antara 1.000–1.999. Teks Shamela hampir tanpa titik, jadi paragraf tidak bisa dipecah tanpa menebak. Tidak diusulkan dipecah; yang bisa dibantu hanya jarak dan ritme baca. | distribusi panjang `passage` |
| A7 | **Takhrij jauh dari haditsnya.** Di ponsel, j1/200 setinggi 6.644 px (8,2 layar). Penanda pertama ada di y = 367 px, judul catatan kaki di y = 4.953 px, jadi ±5,7 layar. Penanda `(١)` sudah membuka takhrij di tempat (popover), sehingga ini masalah keterlihatan, bukan fungsi. | [07](bukti/X04/07-ponsel-catatan-kaki-jauh.jpg); ukur `getBoundingClientRect` |
| A8 | **Belum ada mode baca bersambung.** `/kitab/ihya/bab/<id>` hanya mengalihkan (307) ke halaman awal bagian. Membaca satu bab berarti membalik halaman cetak satu per satu; `readSection` (paginasi 4–6 ribu token) hanya dipakai MCP. | `app/(app)/kitab/[work]/bab/[id]/page.tsx` |

### B. Tipografi dan tata letak

Ukuran diukur dengan `getComputedStyle` di j1/200 (CPL = karakter per baris = panjang teks ÷ jumlah baris).

| Elemen | Desktop (kolom 792 px) | Ponsel (kolom 343 px) | Catatan |
|---|---|---|---|
| Arab (Noto Naskh) | 22,5 px / tinggi baris 45 px (2,0), rata kanan-kiri, CPL 74–91 | 22,5 px / 45 px, 15 baris untuk `#p2824` | Ukuran dan harakat nyaman. Di ponsel, rata kanan-kiri melebarkan spasi antarkata secara mencolok ([03](bukti/X04/03-ponsel-1-200-atas.jpg)). |
| Terjemahan AI | **14 px** / 24 px, CPL **94–113** (judul pendek 182) | 14 px, **24 baris** untuk `#p2824` (Arab 15 baris) | Lebih kecil dari teks UI (16 px) padahal bagi sebagian besar pembaca ini teks utama. CPL desktop jauh di atas rentang nyaman ±60–75. Terjemahan rata-rata 1,91× panjang Arabnya. |
| Label "Terjemahan AI" | 12 px, baris sendiri, di setiap paragraf | sama | 7 label di j1/200; rata-rata 9,4 paragraf badan per halaman, jadi ±16 ribu label di seluruh kitab, ditambah catatan kaki halaman ("Terjemahan dan ringkasan AI belum ditinjau…"). |
| Jarak antarparagraf | `gap-3` (12 px) antara akhir terjemahan dan paragraf Arab berikutnya | sama | Batas paragraf nyaris hilang, jadi Arab–Indonesia–Arab terasa satu blok ([01](bukti/X04/01-desktop-1-200-atas.jpg), [04](bukti/X04/04-ponsel-terjemahan-24-baris.jpg)). |
| Judul bab | h2 23,4 px, tengah, ornamen | sama | Hanya untuk 207 paragraf yang teksnya sama persis dengan judul node. |
| Kontras | teks `lab(10.7)` di kertas `lab(98.3)`; label muted `lab(38.6)` | sama | Lolos AA; tidak perlu diubah. |

Yang sudah ada dan tetap dipakai: panel Tampilan (ukuran Arab 85–150%, 4 font Arab, jarak baris, perataan, kertas terang/sepia/gelap, sakelar terjemahan), mode fokus/header ringkas, ⌘K, permalink paragraf `#pN`, "Salin sitasi paragraf" (sitasi + tautan), laporan kesalahan.

Yang belum ada: ukuran huruf terjemahan, tata letak berdampingan, terjemahan dilipat per paragraf, dan batas lebar kolom terjemahan.

Teks Indonesia sendiri (hitungan atas 16.092 terjemahan dan 313 ringkasan `ihya-v7`) seluruhnya tampil sebagai teks polos:
- 6.404 terjemahan (40%) memuat tanda petik ganda lurus `"` untuk kutipan langsung (sabda, perkataan ulama), dan 2.982 memuat petik tunggal.
- Ringkasan AI rata-rata ±1.100 karakter tanpa satu pun jeda paragraf (0 dari 313).
- Belum ada pemenggalan kata maupun pencegahan kata yatim di baris terakhir.
- Hanya 4 terjemahan yang memuat tanda `*`/`_` mirip Markdown; teks itu tetap ditampilkan apa adanya.

### C. Label "Terjemahan AI"

Setiap paragraf punya baris label sendiri. Ini memenuhi aturan 8 (selalu berlabel), tetapi labelnya menjadi elemen paling sering di halaman dan memecah ritme baca. Kejujurannya bisa dipertahankan dengan cara lain, karena terjemahan juga berbeda bahasa, huruf, dan warna, serta bergaris tepi. Usulan W3 di bawah.

### D. Daftar isi

Daftar isi (sidebar desktop, sheet ponsel, halaman `/kitab/ihya`) hanya menampilkan judul Arab ([06](bukti/X04/06-ponsel-daftar-isi-arab-tanpa-subbab.jpg)). Pembaca Indonesia tidak bisa menavigasi tanpa membaca Arab. Bahan yang sudah ada di korpus:
- **207 dari 313 node** punya paragraf judul yang sudah berterjemahan AI (teks paragraf = judul node). Contoh hasilnya: "Kitab Ilmu", "Bab Kedua: Tentang Ilmu yang Terpuji dan Tercela, …". Gayanya tidak seragam (kapital, titik dua, "tentang"), dan ada yang keliru: judul pasal ketiga Kitab Qawa'id al-'Aqa'id diterjemahkan "yang kami terjemahkan di Quds", padahal maksudnya judul risalah.
- **106 node** (3.825 karakter Arab) belum punya padanan Indonesia: 5 node level 1 (Muqaddimah + 4 rub'), 23 kitab, 20 bab, 55 subbab, 3 lainnya.
- **191 calon subjudul *bayan* baru** (A1) semuanya sudah berterjemahan paragraf ("Penjelasan tentang …").

### E. Mutu terjemahan isi

- 16.092 terjemahan: Haiku 5.5 `translate-passage@2` 15.788 (98%), Sonnet 5.5 296 (ulangan dan koreksi X02), Haiku v3/v4 8. Semua `ai_generated`.
- Pengukuran terakhir yang tidak bias: T-17 tahap 2 = 70% Benar dari 20 sampel, dinilai agent lain (bukan agent yang memperbaiki) sebelum perbaikan X02, lalu diteruskan pemilik. Angka 20/20 sesudah X02 bias (sampel yang sama, penilainya agent yang memperbaiki). Mutu 16 ribu terjemahan lain belum diukur ulang.
- Temuan kecil dari audit: terjemahan `#p2824` menambahkan "[ayat 26]" yang tidak ada di teks (kutipan "qul allahumma malik al-mulk … ila akhir al-ayah" tidak dikenali pencocok ayat). Ini bukan alasan menerjemahkan ulang; masuk ke daftar pola yang dinilai.
- Menerjemahkan ulang penuh dengan Sonnet 5.5 (batch) ±**US$40,49** menurut `python3 scripts/hitung_biaya.py`, atau ±US$65 bila memakai selisih aktual/kalkulator S13 (±1,6×). Itu 2–3 kali anggaran AI bulanan. Karena itu terjemahan ulang hanya diusulkan **sesudah** pengukuran T-17 tahap 3 di bawah, dan hanya untuk strata yang terbukti buruk.

### F. Fitur ringan tanpa login

- **Tautan ke paragraf:** permalink `#pN` sudah ada dan disorot saat dibuka. Menu ⋮ hanya punya "Salin sitasi paragraf" (sitasi + tautan). Belum ada "Bagikan" (lembar bagi ponsel, `navigator.share`) maupun "Salin tautan" saja.
- **Lanjutkan membaca:** belum ada. `localStorage` sudah dipakai untuk preferensi tampilan (`surau:reader-*`), jadi pola dan penanganan mode privatnya sudah tersedia.

## Usulan (paket kerja)

Prioritas = dampak ke kenyamanan baca ÷ risiko. Bagian A tidak butuh korpus baru maupun LLM.

**Bagian A: tampilan ($0, hanya `apps/web`)**

- **W1 · Ritme dan tipografi.**
  - Terjemahan naik ke 16–17 px, tinggi baris ±1,7, lebar maksimum ±68ch.
  - Ukuran terjemahan ikut skala tersendiri di panel Tampilan.
  - Jarak antarparagraf 1,5–2 rem; terjemahan menempel ke Arab-nya, berjarak dari paragraf berikutnya.
  - Ponsel < 640 px: bawaan "Rata kanan" (pilihan rata kanan-kiri tetap ada), atau `text-wrap: pretty`. Diputuskan dengan tangkapan layar sebelum/sesudah.
  - **Penyajian teks Indonesia (disetujui pemilik 2026-10-21, "setuju").** Semuanya lewat kode yang deterministik dan diuji; model tidak diminta menulis markup, dan isi kata tidak berubah:
    - *Kutipan langsung:* pasangan `"…"` yang seimbang dalam satu segmen AI dirender dengan petik melengkung “…” dan warna sedikit berbeda (tidak miring). Segmen dengan petik tidak berpasangan dibiarkan apa adanya. Segmen ayat Kemenag tidak disentuh.
    - *Subjudul tebal:* hanya terjemahan paragraf yang ada di daftar kurasi subjudul (W4). Untuk subjudul menempel, yang ditebalkan hanya kalimat pertama terjemahan, dan hanya bila kalimat itu memang padanan subjudulnya (diperiksa per paragraf saat kurasi, bukan aturan otomatis).
    - *Ringkasan AI:* dipecah menjadi paragraf per 2–3 kalimat saat dibuka penuh (pemecah kalimat sederhana di titik + spasi + huruf kapital, dengan pengecualian singkatan seperti "saw.", "swt.", "ra.").
    - *Pemenggalan dan baris yatim:* `hyphens: auto` pada teks `lang="id"` (bila browser mendukung bahasa Indonesia) dan `text-wrap: pretty`.
    - *Sengaja tidak dilakukan:* huruf miring untuk istilah Arab (banyak sudah baku KBBI, jadi hasilnya tidak konsisten), menebalkan nama atau "kata kunci" (memilih penekanan sama dengan menafsir), mengubah "Pertama… Kedua…" menjadi daftar bernomor (441 paragraf; mengubah susunan yang tidak ada di teks Arab), dan mengganti "saw." dengan simbol Arab.
- **W2 · Tata letak Arab–terjemahan** (pilihan di panel Tampilan, disimpan per browser):
  - (a) *Berselang-seling*: bawaan sekarang.
  - (b) *Terjemahan dilipat*: tombol kecil "Terjemahan" di bawah paragraf, buka per paragraf atau semua.
  - (c) *Berdampingan* di layar ≥ 1280 px: grid dua kolom per paragraf, Arab kanan dan Indonesia kiri, jadi barisnya otomatis sejajar per paragraf.
  - (d) *Arab saja*: sakelar yang sudah ada.
  - Mode "Indonesia saja" **tidak** diusulkan, karena teks Arab adalah rujukan utama (docs/01).
- **W3 · Label AI yang jujur tapi tenang.**
  - Satu catatan di awal teks halaman: "Terjemahan Indonesia di halaman ini dibuat AI dan belum ditinjau manusia; teks Arab adalah rujukannya", dengan tautan ke penjelasan. Bisa ditutup, dan pilihan itu diingat browser.
  - Per paragraf, baris label diganti lencana kecil bertulisan **"Terjemahan AI"** di akhir terjemahan (pola `.ai-badge` yang sudah dipakai di judul bab). Teks lencana tidak disingkat menjadi "AI", dan lencana tetap tampil walaupun catatan halaman sudah ditutup (aturan 8, docs/05).
  - Teks pembaca layar per paragraf tetap "Terjemahan AI: …", dan `title` berisi penjelasan lengkap.
  - Menyalin teks terjemahan menambahkan "(Terjemahan AI, surau.org/…#pN)" untuk segmen AI saja. Segmen ayat tetap berlabel "Terjemahan Kemenag" (aturan 9), jadi label salinan disusun per segmen (`translationSegments`).
  - Perubahan bentuk label dicatat di ADR baru.
  - Kartu Cari, ringkasan AI, dan kaki halaman tidak berubah.
- **W4 · Subjudul tanpa data baru.**
  - 191 paragraf *bayan* pendek di luar daftar isi (A1) ditata sebagai subjudul (h3, tebal, rata tengah, terjemahan satu baris seperti judul bab). Daftar kurasi berupa ID paragraf disimpan di `data/patches/` (bukan aturan regex di UI), diperiksa agent, dan dites.
  - Subjudul yang menempel (A3) memakai daftar kurasi (ID paragraf + offset akhir subjudul). Bagian awalnya dirender tebal atau di baris sendiri. Gabungan teks yang dirender wajib sama byte demi byte dengan `text_raw` (tes).
  - Syair (A5) ditata dua *syatr* di offset ` ... `. Pemisah tetap ada di DOM (disembunyikan secara visual, ikut tersalin), jadi tes round-trip tetap membandingkan seluruh `text_raw`.
- **W5 · Fitur ringan.**
  - "Bagikan tautan paragraf" di menu ⋮: `navigator.share` di ponsel, salin URL `#pN` di desktop.
  - "Lanjutkan membaca": `localStorage` `surau:last-read:ihya` = {juz, halaman, jangkar paragraf terlihat terakhir, waktu}. Kartu ditampilkan di `/kitab/ihya` dan `/kitab` (dan beranda bila disetujui). Hanya di browser, tanpa cookie atau server; `/privasi` diberi satu kalimat.
- **W6 · Gulir bersambung.**
  - Di akhir halaman cetak, halaman berikutnya dimuat di bawah dengan pemisah tipis "j.1 h.201". URL diganti `history.replaceState` ke halaman yang sedang dibaca, jadi permalink dan sitasi tetap per halaman cetak.
  - Data lewat route handler ber-cache yang hanya membaca halaman, tanpa daftar isi. Juz/halaman divalidasi sebelum membaca D1, alamat tidak sah dijawab 404 tanpa menulis cache, dan batas laju mengikuti pola `/api/search` (ADR-048). Daftar isi menyumbang 93% baris D1 render halaman (S10), jadi biaya baca D1 per halaman tambahan ±7% dari render penuh.
  - Butuh merapikan render paragraf di `page.tsx` menjadi komponen bersama.
  - Halaman per bab (`/kitab/ihya/bab/<id>/baca`) tidak diusulkan sekarang. Bagian terpanjang 70 halaman (±600 paragraf + terjemahan) terlalu berat untuk satu render Worker (risiko memori OpenNext #1455).

**Bagian B: data (korpus baru, LLM kecil berbayar)**

- **W7 · Subjudul *bayan* di daftar isi pembaca.** Disimpan sebagai lapisan patch terpisah, bukan node `toc_node` baru. Daftar isi MCP dan routing Jawab (`ROUTE_PROMPT_TOKENS_MAX` 16 ribu, routing kedua dari ringkasan per node, ADR-067) memakai `toc_node`; menambah ±191 node akan mengubah perilaku Jawab dan butuh eval berbayar. Pembaca menampilkannya sebagai anak di pohon daftar isi. Promosi ke `toc_node` (untuk MCP/Jawab) menjadi keputusan sesi Jawab berikutnya.
- **W8 · Judul daftar isi Indonesia.**
  - Kolom/tabel baru di korpus (mis. `toc_title_translation`), dengan model, versi prompt, tanggal, dan `review_status`.
  - Tampil di daftar isi sebagai baris Indonesia dengan judul Arab di bawahnya (atau sebaliknya, keputusan pemilik), plus satu label "Judul Indonesia: terjemahan AI" di kepala daftar isi.
  - Glosarium istilah tetap (kitab, rub', bab, *bayan* → "Penjelasan …") ditulis di prompt. Prompt menerima pohon per rub' supaya gayanya seragam.
  - Breadcrumb, judul tab (`<title>`), dan metadata/OG **tetap memakai judul Arab** (atau Arab + transliterasi), karena di tempat itu label AI tidak bisa ikut. Judul Indonesia hanya tampil di tempat yang bisa diberi label: daftar isi dan kepala halaman baca (dengan lencana "Terjemahan AI").
- **W9 · T-17 tahap 3** (rancangan di bawah). Penilaian manusia dan $0 LLM. Hasilnya menentukan perlu tidaknya terjemahan ulang terarah (sesi terpisah, izin biaya sendiri).

## Biaya LLM

Dihitung dengan `python3 scripts/hitung_biaya.py` (bagian X04 ditambahkan di sesi audit ini; asumsi tertulis di skrip):

| Pekerjaan | Token masuk | Token keluar | Sonnet 5.5 langsung | Haiku 5.5 batch |
|---|---|---|---|---|
| Judul Indonesia untuk 106 node yang belum punya | ±12,7 rb | ±4,5 rb | US$0,07 | US$0,002 |
| Semua 313 node (gaya seragam) | ±18,4 rb | ±13,1 rb | US$0,17 | US$0,004 |
| 313 node + 191 subjudul *bayan* baru | ±24,4 rb | ±21,2 rb | **US$0,26** | US$0,007 |
| Pembanding: terjemahan ulang Ihya penuh, Sonnet batch | | | US$40,49 (±US$65 dengan faktor aktual S13) | (Haiku US$2,19) |

Rekomendasi: Sonnet 5.5 langsung (bukan batch), karena jumlahnya kecil, hasilnya langsung, dan judul paling sering dilihat. Pagu **US$1**: ±3× perkiraan, karena biaya aktual S13 ±1,6× kalkulator. Bagian A dan T-17 tahap 3 = $0. **Tidak ada yang dikirim tanpa izin pemilik di chat.**

## Rancangan T-17 tahap 3 (pengukuran tanpa bias)

Tujuan: memperkirakan mutu seluruh 16.092 terjemahan, bukan sampel yang sudah diperbaiki.

1. **Pra-registrasi.** Seed baru, ukuran sampel, strata, rubrik, dan aturan keputusan di bawah di-commit **sebelum** ada yang melihat sampelnya. Seed tidak boleh diganti sesudah melihat hasil.
2. **Populasi:** semua terjemahan `lang = 'id'` di korpus produksi, termasuk yang pernah dikoreksi. Tidak ada pengecualian manual.
3. **Sampel 60, berstrata menurut panjang Arab:** < 100 karakter (5.617 terjemahan), 100–499 (8.132), ≥ 500 (2.343), masing-masing 20. Estimasi keseluruhan diberi bobot populasi strata. Seed baru (bukan `QA_SEED` 9473), memakai `samplePages` yang sudah ada.
4. **Buta:** halaman nilai (pembuat halaman QA `tools/ingest/src/llm/report.ts`, file HTML lokal, bukan artifact publik) tidak menampilkan model, versi prompt, atau status koreksi. Urutannya diacak.
5. **Penilai:** manusia yang bisa membaca Arab (pemilik, Anas, atau orang yang ditunjuk pemilik). **Bukan agent** yang merancang perbaikan. Bila ada dua penilai, 20 nomor dinilai keduanya untuk mengukur kesepakatan.
6. **Rubrik:** Benar / Kurang / Salah (definisi T-17), ditambah kategori kesalahan: makna terbalik/negasi, pelaku tertukar, istilah fikih/tasawuf, bagian hilang, tambahan yang tidak ada di teks, nama/angka/satuan, ayat/hadits. Waktu ±60–90 menit.
7. **Laporan:** persentase Benar dan Salah per strata dan tertimbang, dengan interval Wilson 95% (n = 60 → ±8–12 poin).
8. **Aturan keputusan** memakai estimasi titik tertimbang dan target T-17 yang sudah tercatat (Benar ≥ 80%, Salah ≤ 10%; `TUGAS-PEMILIK.md`), tanpa ambang baru:
   - **Lolos** (Benar ≥ 80% dan Salah ≤ 10%): tidak ada terjemahan ulang massal; kesalahan yang ditemukan masuk lapisan koreksi (ADR-047). Bila batas atas interval Salah > 10%, hasilnya ditandai "belum pasti" dan diusulkan tambahan 40 sampel dengan seed lanjutan yang sama.
   - **Tidak lolos, Salah ≤ 15%** (termasuk Benar < 80% dengan Salah rendah): usulan terjemahan ulang **terarah** untuk strata/kategori yang dominan, dengan perkiraan biaya dan izin.
   - **Salah > 15%:** usulan terjemahan ulang luas (Sonnet ±US$40–65 penuh, atau per rub') sebagai keputusan anggaran pemilik.

## Pertanyaan desain untuk pemilik

1. **Tata letak bawaan Arab–terjemahan:** tetap berselang-seling, terjemahan dilipat, atau berdampingan di layar lebar? (Usul agent: berselang-seling dengan W1, plus pilihan dilipat dan berdampingan di panel Tampilan.)
2. **Label AI:** setuju satu catatan di awal halaman + lencana kecil "AI" per paragraf, menggantikan baris "Terjemahan AI" di setiap paragraf?
3. **Subjudul yang menempel** (mis. malam Kamis di j1/200): ditebalkan di awal paragraf, atau dipindah ke baris sendiri seperti judul kecil?
4. **Membaca bersambung:** gulir bersambung antarhalaman cetak (usul agent), atau halaman khusus per bab?
5. **Daftar isi Indonesia:**
   - (a) Pakai terjemahan judul yang sudah ada ($0, 207 node, gaya tidak seragam) + 106 baru (±$0,07), atau (b) terjemahkan ulang semua judul + subjudul dengan gaya seragam (±$0,26, pagu $1)? (Usul agent: b.)
   - Mana di atas: Indonesia atau Arab?
6. **Takhrij:** cukup popup penanda + daftar di bawah halaman (sekarang), atau juga tombol "Takhrij" yang bisa dibuka sesudah paragraf?
7. **T-17 tahap 3:** siapa penilainya (Anda, Anas, atau orang lain), dan setuju 60 sampel (±60–90 menit)?
8. **Lanjutkan membaca:** tampil juga di beranda, atau cukup di `/kitab`?

### Jawaban pemilik (2026-10-21)

Pemilik di chat: "Untuk 8 pertanyaan desain X04 saya ikut usulan agent semua. Sekalian siapkan halaman nilai T-17 tahap 3 (60 sampel)." Untuk pertanyaan yang belum memuat usulan tertulis (3, 5 posisi, 6, 7 penilai, 8), agent memutuskan di sesi ini dan menuliskannya di bawah.

1. **Tata letak:** bawaan berselang-seling (dengan W1), plus pilihan *terjemahan dilipat* dan *berdampingan* (layar ≥ 1280 px) di panel Tampilan. *Arab saja* tetap lewat sakelar terjemahan.
2. **Label AI:** satu catatan di awal teks halaman (bisa ditutup, diingat browser) + lencana kecil per terjemahan. Teks lencana tetap **"Terjemahan AI"** (W3: tidak disingkat menjadi "AI").
3. **Subjudul menempel:** di **baris sendiri** seperti judul kecil, masih di dalam paragrafnya (teks tetap satu `text_raw`, dipotong hanya di offset kurasi). Alasan: batas subbab terlihat saat memindai, seperti kitab cetak; menebalkan di tengah aliran teks lebih mudah terlewat.
4. **Membaca bersambung:** gulir bersambung antarhalaman cetak (W6).
5. **Daftar isi Indonesia (bagian B):** opsi (b), semua judul + subjudul diterjemahkan ulang dengan gaya seragam (±US$0,26, pagu US$1); **Indonesia di atas, Arab di bawahnya** (urutan pertama W8). Opsi berbiaya ini ikut disetujui lewat jawaban yang sama; tetap tidak ada yang dikirim di bagian A.
6. **Takhrij:** tetap popover penanda + daftar di bawah halaman, tanpa tombol baru (tidak ada paket kerja untuk tombol takhrij; A7 masalah keterlihatan, bukan fungsi).
7. **T-17 tahap 3:** 60 sampel. Penilai = manusia yang bisa membaca Arab (pemilik, Anas, atau orang yang ditunjuk pemilik; namanya diisi di halaman nilai), bukan agent.
8. **Lanjutkan membaca:** tampil juga di beranda, selain `/kitab` dan `/kitab/ihya` ("dan beranda bila disetujui" di W5).

## Baca dulu (hanya ini)

- File ini, ADR-034 (ISR pembaca), ADR-035 (CSS HeroUI per komponen), ADR-047 (lapisan koreksi), ADR-067 (routing Jawab dari ringkasan per node).
- `.claude/rules/teks-arab.md` (aturan 1, 2, 8), `data/patches/ihya-9472.yaml`.
- `apps/web/src/app/(app)/kitab/[work]/[juz]/[page]/page.tsx`, `components/reader/*`, `lib/reader/*`, `app/globals.css` (bagian pembaca).
- HeroUI lewat MCP `heroui-pro` untuk komponen baru (Disclosure, Toast); docs Next di `apps/web/node_modules/next/dist/docs/` untuk route handler + cache.

## Langkah

1. Branch `sesi/x04-mutu-baca`. Catat jawaban pemilik atas pertanyaan desain di file ini.
2. **Bagian A:**
   1. W1 + W3 (CSS, `passage-translation.tsx`, `i18n/id.ts`); tangkapan layar sebelum/sesudah desktop + ponsel, terang + gelap.
   2. W2 (panel Tampilan, preferensi baru di `lib/reader/scale.ts` + skrip awal).
   3. W4. Buat skrip kandidat **deterministik** yang hanya mengeluarkan ID paragraf dan offset dari `text_raw`, tanpa menulis teks Arab. Agent memeriksa kandidat dengan membaca paragraf dari DB, lalu menyimpan daftarnya di `data/patches/`. Renderer memotong di offset dan diuji round-trip (gabungan teks = `text_raw`).
   4. W5, lalu W6.
   5. `pnpm verify`, e2e + axe, ukur LCP ponsel di Preview, `peninjau`, merge.
3. **Bagian B:**
   1. W7: lapisan subjudul pembaca.
   2. W8: migrasi korpus (skema +1), prompt `translate-toc-title@1` di `packages/llm` dengan validasi (satu judul per ID, tanpa huruf Arab di keluaran, panjang wajar). Kirim **sesudah izin** dengan `--budget` = pagu.
   3. Bangun `ihya-v8`, `corpus:qa`, muat staging, lalu promote produksi atas izin pemilik (classifier mode otomatis menolak promote; pemilik menjalankannya atau mengizinkan).
3. **T-17 tahap 3:** commit pra-registrasi + daftar sampel, buat halaman nilai, kirim ke penilai. Hasilnya dicatat ketika masuk (boleh sesudah sesi ditutup).
4. ADR baru (penyajian subjudul, label AI, judul daftar isi), STATUS, LOG, file sesi ini.

## Selesai bila

Setiap butir dibuktikan dengan perintah atau tangkapan layar; angka "sebelum" dari audit ini.

**Bagian A**
- [x] `pnpm verify` lolos; `pnpm test:e2e` (termasuk axe) lolos di Preview. *Bukti: `pnpm verify` lokal → exit 0 (749 + 345 tes, build termasuk `/api/halaman`), diulang sesudah dua putaran perbaikan peninjau; CI PR #115 hijau (pertama 145 e2e Preview lolos; commit `3adf7ba`: verify, eval retrieval, preview, preview mcp hijau, e2e Preview 152 lolos, 5 dilewati, 1 flaky = klik tombol ayat sebelum hidrasi, tesnya kini mengulang klik); commit terakhir dicek hijau sebelum merge. `reader-x04.spec.ts` kini 12 skenario (lokal: 19 lolos, 5 dilewati di ponsel) + axe untuk halaman sambungan dan tata letak dilipat/berdampingan.*
- [x] Terjemahan di j1/200: ukuran ≥ 16 px (sebelum 14 px), CPL desktop ≤ 75 (sebelum 94–113), jarak antarparagraf ≥ 24 px (sebelum 12 px); diukur dengan `getComputedStyle` di Preview dan dicatat. *Bukti (pr-115.surau.org, 1440 px): 17 px / tinggi baris 28,9 px, CPL 69–73 (4 terjemahan pertama), jarak antarparagraf 28 px; ponsel 375 px: 16 px. Tangkapan `bukti/X04/08`.*
- [x] Label: di j1/200 hanya ada 1 catatan AI di awal teks + 1 lencana "Terjemahan AI" per terjemahan, tanpa baris label terpisah (sebelum 7 baris). Lencana tetap tampil sesudah catatan ditutup (e2e). Setiap blok terjemahan tetap punya teks pembaca layar "Terjemahan AI" (tes komponen). Teks terjemahan yang disalin memuat label AI + permalink untuk segmen AI, dan label Kemenag untuk segmen ayat (tes). *Bukti Preview: 1 catatan, 7 lencana untuk 7 blok terjemahan (6 badan + 1 judul), 7 awalan sr-only, 0 baris label lama; e2e `reader-x04` (catatan ditutup → muat ulang → lencana tetap; salin → "(Terjemahan AI, …#p2824)"); `passage-translation.test.tsx`, `id-text.test.ts` (`labelledCopy`, label Kemenag).*
- [x] Pilihan tata letak sesuai jawaban pemilik tersedia dan tersimpan per browser (e2e: ganti pilihan → muat ulang → tetap). *Bukti: e2e "tata letak terjemahan tersimpan per browser" (Dilipat → muat ulang → tetap, tombol membuka per paragraf); berdampingan dicek di browser (kolom 792 px: Arab kanan 376 px, Indonesia kiri 376 px).*
- [ ] Subjudul: semua ID di daftar kurasi *bayan* dirender sebagai subjudul (target ≥ 180 dari 191 kandidat di luar daftar isi; sisanya dicatat alasannya; 80 yang sudah menjadi judul node tetap h2). j3/202 `#p13553` tampil sebagai heading (cek HTML Preview). Daftar subjudul menempel memuat 15 paragraf pola hari pekan (j1/197–200). Semua lolos tes round-trip `text_raw` byte demi byte. *Belum dicentang (sebagian): 186 dari 191 calon* bayan *dirender sebagai subjudul (5 dikecualikan dengan alasan: butir daftar pembuka kitab), 80 judul node tetap h2, j3/202 `#p13553` = heading di HTML Preview (`bukti/X04/09`), round-trip seluruh 231 entri lolos (`subheadings.test.ts`). Tetapi daftar hari pekan memuat **14**, bukan 15: kemunculan ke-15 (p2811) ternyata lanjutan hadits p2804 yang terpotong pergantian halaman, bukan subjudul (alasan di `ihya-9472-subjudul.yaml`). Kriteria tidak diubah.*
- [ ] Syair: paragraf dengan ` ... ` tampil per *syatr* (tes round-trip yang sama, contoh di Preview). *Belum dicentang (sebagian): 437 dari 450 paragraf badan tampil per syatr (contoh Preview j4/107 `#p16417`: 1 baris bait, 2 syatr, pemisah ` ... ` tetap di DOM); 13 sisanya bait yang menempel di tengah prosa (bagian > 80 karakter), dibiarkan sebaris karena batas baitnya tidak bisa diketahui tanpa menebak (ADR-074). Round-trip 450 paragraf lolos.*
- [x] Teks Indonesia: kutipan berpasangan tampil dengan petik melengkung dan gaya kutipan; teks yang dirender (tanpa tag) sama kata demi kata dengan `translation.text`, kecuali bentuk tanda petik (tes); petik tidak berpasangan dan segmen Kemenag tidak berubah (tes). Ringkasan AI yang dibuka penuh terbagi ≥ 2 paragraf bila > 3 kalimat (tes pemecah, termasuk "saw."). `hyphens: auto` dan `text-wrap: pretty` aktif di teks `lang="id"` pembaca (`getComputedStyle` di Preview). *Bukti: `id-text.test.ts` (kutipan, petik ganjil, offset tebal), `passage-translation.test.tsx` (segmen Kemenag), `sentences.test.ts` + `summaryParagraphs` ("saw."); Preview: `hyphens: auto`, `text-wrap: pretty` di `.passage-translation-body`. Pemenggalan nyata bergantung kamus bahasa Indonesia browser.*
- [x] "Bagikan tautan paragraf" bekerja (e2e: URL `#pN` yang disalin = permalink paragraf). "Lanjutkan membaca" muncul di `/kitab/ihya` sesudah membuka satu halaman, dan tidak error bila `localStorage` diblokir (e2e). *Bukti: e2e `reader-x04` (3 skenario) lolos lokal dan di Preview.*
- [ ] Gulir bersambung: dari j1/200, halaman 201 termuat di bawah; URL berganti ke `/kitab/ihya/1/201` saat dibaca; tanpa daftar isi di respons data (cek `rows_read` lokal per halaman tambahan ≤ 15% render penuh). *Belum dicentang (sebagian): halaman 201 termuat dan URL/judul tab berganti (e2e lokal + Preview); respons tanpa daftar isi lengkap (hanya node yang mulai di halaman itu). Tetapi `rows_read` lokal j1/201 = **203** vs render penuh dingin **1.152** = **17,6%** (> 15%): sisanya bacaan isi halaman itu sendiri (paragraf 55, terjemahan 47, penanda 31, ayat 29, tanda tinjau 27), yang juga dibayar render penuh. Perkiraan 7% di rencana mengandaikan daftar isi = 93% render (S10); di `ihya-v7` lokal daftar isi ±82%.*
- [ ] LCP ponsel median di Preview tidak lebih buruk dari baseline (3,9 dtk, ADR-035) + 10%. *Tidak lolos: Lighthouse 13.5.0 ponsel, berselang-seling n=5: Preview PR #115 median **6,11 dtk** (5,62–6,22, performa 76) vs produksi `main` saat ini median **5,66 dtk** (5,43–5,86, performa 77). Baseline 3,9 dtk (Preview, 2026-10-16) sudah tidak berlaku untuk `main` sendiri; X04 menambah ±0,45 dtk (+8%) terhadap produksi. CLS ±0,05 berasal dari pertukaran font web (juga terjadi di produksi, 0–0,077). Usul sesi kinerja terpisah.*
- [x] Teks Arab tidak berubah: tes yang ada (verifikasi kutipan, QA korpus) tetap lolos, dan tidak ada string Arab baru di `apps/web` selain dari DB (`rg` atas diff). *Bukti: `pnpm verify` lolos (termasuk tes verifikasi kutipan core/MCP); grep Arab atas `git diff origin/main...HEAD -- apps/web`: tidak ada string Arab di kode yang tampil, hanya komentar penanda (١) dan data tes buatan; berkas `data/` yang di-commit tanpa huruf Arab; tes round-trip seluruh daftar kurasi + 450 paragraf syair = `text_raw` byte demi byte.*

**Bagian B**
- [x] Daftar isi pembaca menampilkan subjudul *bayan*; jumlah kitab tanpa subbab turun dari 19 ke ≤ 6 (6 kitab tanpa calon *bayan*; hitung dari data pohon). Daftar isi MCP dan routing Jawab tidak berubah (`get_table_of_contents` = 313 node, tes kontrak MCP lolos). *Bukti: unit pohon pembaca atas `ihya-v8` (`titleUnits`, logika sama dengan `readerToc`): 209 subjudul, kitab tanpa anak **6 dari 40** (anak node saja: 19). Browser lokal j3/202: kitab Dzamm ad-Dunya (tanpa subbab di korpus) → subjudul "Penjelasan tercelanya dunia" dst. bertaut `#p13553`, `#p13653`, …; e2e `reader-x04b` (subjudul `#p13553` di pohon samping). `getToc` atas `ihya-v8` lokal = **313 node**, field node tidak bertambah (tanpa judul Indonesia); `git diff origin/main` kosong untuk `apps/mcp`, `apps/api`, `packages/llm/src/jawab`; tes MCP ikut `pnpm verify`.*
- [x] Semua 313 node (dan subjudul, bila dipilih) punya judul Indonesia berlabel AI dengan model + versi prompt + tanggal; biaya aktual ≤ pagu yang diizinkan (dicatat di LOG). *Bukti: `pnpm ingest ihya` → invarian "Judul daftar isi Indonesia … 522/522 (100,00%): node 313, subjudul 209"; baris `toc_title_translation`/`subheading_translation` berisi `claude-sonnet-5-5`, `translate-toc-title@2`, `created_at` 2026-10-21, `ai_generated`; label di kepala pohon menyebut model, versi prompt, dan tanggal. Biaya aktual **US$0,4117** (10 request, `toc-title-runs.jsonl`) ≤ pagu US$1.*
- [x] Breadcrumb, `<title>`, dan metadata/OG halaman baca tidak memuat judul Indonesia tanpa label (cek HTML Preview j1/200); judul Indonesia di daftar isi dan kepala halaman berlabel "Terjemahan AI". *Bukti (HTML `pr-116.surau.org/kitab/ihya/1/200`, staging = `ihya-v8`): `<title>` dan `og:title` = "القسم الثاني ما يتكرر بتكرر الأسابيع · Ihya' 'Ulum ad-Din j. 1 h. 200 · Surau" (judul Arab dari DB); JSON-LD breadcrumb tidak memuat judul Indonesia bagian itu ("Bagian Kedua: Yang berulang dengan berulangnya pekan"); kepala halaman = judul Indonesia + lencana "Terjemahan AI" + judul Arab; kepala pohon daftar isi = satu catatan "Terjemahan AI" dengan Claude Sonnet 5.5, `translate-toc-title@2`, 21 Oktober 2026. e2e `reader-x04b` memeriksa hal yang sama di j3/202.*
- [x] `ihya-v8` di produksi atas izin, `corpus:qa` 30/30, eval retrieval `--gate` hit@10 tidak turun dari `ihya-v7` (100%). *Bukti: pemilik di chat 2026-10-22 "Ya saya promote ihya v8"; `corpus:promote ihya-v8 --confirm` (muatan pertama putus InternalError Cloudflare, diulang `--reload` ke DB baru) → smoke = build (semua tabel + meta, j1 h200); `corpus:qa ihya-v8` → **30/30** byte demi byte ([laporan](../../data/reports/ihya-9472-qa-surau-corpus-ihya-v8.md)); binding `CORPUS_DB` web/MCP/API + `SEARCH_CACHE_CORPUS` → `surau-corpus-ihya-v8` lewat PR promote (tayang sesudah merge + deploy). Eval retrieval `--gate` v8 hit@10 **100%**, hit@1 64,5%, MRR 0,795 = v7.*

**T-17 tahap 3**
- [x] Pra-registrasi (seed, 60 sampel, strata, rubrik, aturan keputusan) di-commit sebelum halaman nilai dibuat; daftar ID sampel ikut di-commit. *Bukti: commit 86528c7 (pra-registrasi) → 46a3a41 (alat) → 011d0a8 (60 ID, `data/reviews/ihya-9472-t17-tahap3-sampel.json`); halaman nilai dibuat sesudahnya (tidak di git).*
- [x] Halaman nilai tidak menampilkan model, versi prompt, atau status koreksi (cek HTML). *Bukti: `grep -i -E "haiku|sonnet|claude-|translate-passage|prompt_version|ai_generated|review_status"` atas `data/build/llm/qa/t17-tahap3.html` hanya mengenai kata Indonesia biasa di terjemahan ("panjang", "sedang"), tidak ada label model/versi/status/strata.*
- [ ] Hasil penilai manusia + interval Wilson + keputusan menurut aturan tercatat di LOG dan TUGAS-PEMILIK (boleh menyusul sesudah sesi).

**Umum**
- [x] ADR baru, STATUS, LOG, FASE, dan file sesi ini diperbarui. *(Bagian A: ADR-074–076, STATUS, LOG, FASE, STACK, TUGAS-PEMILIK T-17. Bagian B: ADR-077, ADR-078, STATUS, LOG, FASE, STACK, file ini.)*

## Di luar cakupan

- Mengubah, menormalkan, atau menambah harakat pada teks Arab; memecah paragraf `text_raw`.
- Terjemahan ulang isi (menunggu hasil T-17 tahap 3, sesi dan izin terpisah).
- `/tanya`, `apps/api`, `packages/llm/src/jawab`, daftar isi MCP, dan routing Jawab. Promosi subjudul ke `toc_node` diputuskan sesi Jawab.
- Halaman baca per bab, akun/login, sinkron posisi baca antarperangkat, penanda/catatan pengguna, audio.
- Pencocok ayat (temuan "[ayat 26]" dicatat untuk T-17 dan ADR-042, bukan diperbaiki di sini).

## Catatan hasil

*Audit (2026-10-21, sesi audit + rencana; belum ada implementasi):*
- Dibuat: file ini, tangkapan layar `bukti/X04/01–07`, dan bagian X04 di `scripts/hitung_biaya.py` (judul daftar isi + pembanding terjemahan ulang Sonnet).
- Angka struktur diambil dari `ihya-v7` lokal dengan `node:sqlite` read-only. Sumber Shamela dan OpenITI hanya dibaca untuk memastikan subjudul A3 memang tanpa penanda di sumber.
- Temuan kecil di luar cakupan: sidebar daftar isi di j1/200 menyorot "al-Qism ats-Tsalits" (node terakhir yang tampil), padahal sebagian besar halaman masih "al-Qism ats-Tsani". Perilaku `activeIds.at(-1)` ini disengaja (S09), tetapi bisa dipertimbangkan di W6.

*Bagian A + T-17 tahap 3 (2026-10-21, PR #115, ADR-074, ADR-075, ADR-076):*
- **Dibuat:** kurasi subjudul tanpa teks Arab (`data/patches/ihya-9472-subjudul.{yaml,json}`, `pnpm subjudul`; 186/191 *bayan*, 22 lanjutan judul, 16 subjudul di awal + 6 di akhir paragraf), model halaman siap render (`buildPageModel`) + komponen bersama `PageText`, tipografi/label/tata letak terjemahan (W1–W3), syair per syatr (437/450), bagikan tautan + Lanjutkan membaca (W5), gulir bersambung (`/api/halaman`, rate limit 1009/1010 + 2009/2010, W6), pemecah kalimat Indonesia (`@surau/text` `indonesianSentences`), `listTocNodesStartingAt` (`@surau/db`), alat T-17 (`pnpm t17`).
- **T-17 tahap 3:** pra-registrasi + 60 ID sampel di-commit sebelum halaman nilai; halaman nilai buta di `data/build/llm/qa/t17-tahap3.html` (checkout utama, tidak di git), isian tersimpan otomatis di browser **per nama penilai** (tombol *Penilai baru*; isian tanpa nama ikut ke nama pertama yang diketik), formulir selalu kosong dan terkunci saat dibuka sampai nama diisi, isian tersimpan dibuka lewat *Lanjutkan sebagai …*, isian versi halaman sebelumnya dipindahkan otomatis; tombol Salin/Unduh hasil. Menunggu penilai manusia; hasil dihitung `pnpm t17 hasil <berkas> [berkas penilai 2]` (validasi Zod, sidik sampel `344d2b8f695d`, kesepakatan + kappa nomor 1–20; baris tertimbang disembunyikan selama ada strata tanpa nilai). Klarifikasi bertanggal di pra-registrasi (sebelum hasil): tambahan 40 sampel bila "belum pasti" = 13/14/13.
- **Belum lolos (dicatat apa adanya, kriteria tidak diubah):** hari pekan 14 bukan 15 (p2811 bukan subjudul); syair 437/450 (13 bait di tengah prosa); `rows_read` halaman sambungan 17,6% (> 15%) dari render penuh dingin; LCP ponsel Preview 6,11 dtk vs baseline 3,9 dtk (produksi `main` sendiri kini 5,66 dtk).
- **Penyimpangan rencana:** kurasi diperluas dengan judul terpotong (lanjutan) dan subjudul di akhir paragraf yang ditemukan saat meninjau calon (ADR-074); ambang berdampingan memakai lebar kolom (≥ 48rem, container query) bukan lebar layar 1280 px, karena kolom teks maksimal ±792 px dengan daftar isi; perataan "Otomatis" menjadi bawaan baru (ponsel rata kanan) dengan pilihan lama tetap ada.
- **Peninjau** (`git diff origin/main...HEAD`): **1 blocker + 9 perbaikan + 10 saran.** Blocker: menu ⋮ → *Salin sitasi paragraf* di halaman sambungan menyebut juz/halaman halaman pertama (`j.1 h.200` dengan tautan `…/1/201#pN`) → kini juz/halaman diambil dari permalink paragraf (`citeForPath`, tes unit + e2e). Perbaikan yang dikerjakan: `/api/halaman` tidak membaca D1 sebelum cache dan batas laju (memo edisi per isolate; tes menghitung panggilan edisi); Back sesudah `replaceState` menampilkan halaman yang ditunjuk URL (`router.replace` saat URL ≠ halaman yang dirender; e2e, dan tanpa perbaikan e2e itu gagal: "Halaman 200" di URL /1/201); salinan berlabel melewati `script`/`style`/elemen tak terlihat; laporan halaman memakai halaman terbaca dan atribusi ayat tampil per halaman sambungan; sorotan daftar isi lewat store modul (sheet ponsel); kunci cache memuat sidik daftar kurasi (`PAGE_MODEL_VERSION = 2.<FNV-1a>`), label i18n tidak lagi di model; T-17 per penilai + penjaga alat (`sampel --force`, korpus DB = korpus sampel, sidik sampel di hasil, Zod, kappa); klarifikasi bertanggal pra-registrasi. Saran yang dikerjakan: `ayahPlaceholderPattern` dari core, escape `\uXXXX` untuk harakat di tes (komentar Arab dibuat ulang dari escape-nya), syair hanya di paragraf badan, `aria-keyshortcuts` di navigasi halaman, nama wilayah catatan kaki unik + axe dengan halaman sambungan termuat dan tata letak dilipat/berdampingan (j3/202), jangkar bagian tanpa celah, Lanjutkan membaca per karya di halaman karya, `escapeHtml` di HTML bagikan, ringkasan AI berlabel saat disalin; nomor ADR dicek ulang terhadap `origin/main` sebelum merge.
- **Peninjau, tinjauan ulang commit perbaikan** (`git show 3adf7ba`): 0 blocker, 2 perbaikan di halaman nilai T-17, keduanya dikerjakan: (1) halaman memuat isian penilai terakhir saat dibuka, sehingga penilai kedua bisa melihat nilai penilai pertama; kini formulir kosong dan terkunci sampai nama diisi, isian dibuka lewat *Lanjutkan sebagai …*; (2) isian versi halaman pertama tidak terbaca; kini dipindahkan otomatis (digabung per nomor). Saran yang dikerjakan: ganti nama bertanya dulu (pindahkan isian atau penilai baru), `maxlength` sama dengan batas Zod, `autocomplete` mati; tidak memuat halaman sambungan saat sedang dialihkan sesudah Back; `aria-keyshortcuts` di navigasi bawah hanya bila tujuannya sama dengan ←/→; `/api/halaman` hanya menerima segmen karya kanonis (varian encoding = 404, memo dibatasi); komentar `PAGE_MODEL_VERSION` (naikkan juga saat logika isi berubah); klarifikasi T-17 dipindah ke bawah *Hasil* sesuai pra-registrasi + butir bertanggal baru; nama ringkasan AI unik (dari label yang terlihat). Tes baru: syair hanya di badan + label placeholder ayat tidak sah (unit), salin seluruh halaman tanpa isi skrip dan atribusi ayat di halaman sambungan (e2e; uji mutasi: tanpa penyaring, e2e salin gagal), h1 tetap halaman pertama sesudah `replaceState`. Alur halaman nilai dicek dengan Playwright (skrip sementara, 20 pemeriksaan lolos): pemindahan dari dua versi lama, kunci formulir, penilai kedua tidak melihat isian pertama, ganti nama OK/Batal, isian tanpa nama; satu bug ditemukan di sini dan diperbaiki (klik *Lanjutkan sebagai* sesudah mengedit nama hilang karena daftar digambar ulang saat blur).
- **Utang teknis / pesan untuk sesi berikutnya:**
  - Bagian B (W7 subjudul di daftar isi pembaca, W8 judul daftar isi Indonesia, pagu US$1 sudah disetujui lewat jawaban desain 5) memakai daftar kurasi ini sebagai sumber. Sekalian perbaiki node daftar isi p16599/p18644 (menunjuk butir daftar pembuka, ADR-074) dan pertimbangkan judul *syathr*/*rukn*/*bab* lain yang menempel.
  - Korpus baru: `pnpm subjudul --periksa` lalu `--cek`; entri dengan sidik berubah diabaikan web (aman), tetapi subjudulnya hilang sampai dikurasi ulang.
  - LCP ponsel sudah ±5,7 dtk di produksi sebelum X04 (font Noto Naskh tanpa preload, CSS global bertambah, tekstur kertas): layak sesi kinerja sendiri.
  - Sorotan daftar isi ikut halaman sambungan, tetapi leluhur yang tertutup tidak dibuka otomatis (`defaultExpandedKeys`).
  - Uji header `/aset` di `smoke.spec.ts` gagal di `next dev` (header dari `public/_headers` hanya di Workers); di Preview lolos.
  - Catatan AI dan catatan tinjau di kaki halaman masih menurut halaman pertama (label per terjemahan dan tanda tinjau per paragraf tetap ada di halaman sambungan).
  - Satu e2e flaky di Preview (CI `3adf7ba`: klik tombol ayat j1/119 sebelum hidrasi, popover tidak terbuka; lolos saat diulang). Tes kini mengulang klik (`toPass`), seperti tes klik lain. Pembaca memuat lebih banyak JS sejak X04, jadi waktu hidrasi ikut diukur di sesi kinerja LCP ponsel.
- **Tangkapan sesudah:** `bukti/X04/08` (desktop j1/200), `09` (ponsel j3/202 *bayan* sebagai subjudul), `10` (ponsel gelap, subjudul malam Kamis di baris sendiri + terjemahan bertebal).

*Bagian B (2026-10-21/22, PR #116, ADR-077, ADR-078):*
- **Dibuat:**
  - Daftar isi pembaca (`loadReaderToc`, `lib/reader/reader-toc.ts`): pohon `toc_node` + 209 subjudul kurasi sebagai anak node, bertaut `#pN`; judul disalin kode dari `text_raw` (`subheadingTitle`, `@surau/core`, dipakai web dan ingest), dimemo per isolate.
  - Judul node salah tempat: kurasi `node_tail` (butir daftar p16599/p18644 → teks biasa, judul di akhir p16600/p18645 → h2 + jangkar, hanya bila butirnya juga terverifikasi) dan judul node = paragraf pertama node di halaman awalnya yang sama dengan judul (8 node; jangkar + ringkasan ikut pindah).
  - Skema korpus 7 (`toc_title_translation`, `subheading_translation` + `source_sha256`), `listTitleTranslations`, prompt `translate-toc-title@2` + validasi (`packages/llm`), `pnpm llm judul` (pagu per request terburuk, uji kecil `--limit`), pemuatan + invarian cakupan di ingest, korpus `ihya-v8`.
  - Tampilan: Indonesia di atas Arab di pohon (sidebar, sheet ponsel, halaman karya) + satu catatan "Terjemahan AI" (model, prompt, tanggal, status tinjau) di kepala pohon; judul bagian aktif di kepala halaman dengan lencana. Breadcrumb, `<title>`, OG, judul ringkas, MCP, Jawab tetap Arab.
- **Biaya:** US$0,4117 dari pagu US$1. Uji kelompok pertama dengan v1 (US$0,0443) menunjukkan "tarjamah" diterjemahkan "terjemahan" dan "Tentang …"; v2 memperbaiki keduanya dan seluruh judul memakai v2. Dua judul terpanjang ditolak batas 220 karakter, lalu batas validasi dinaikkan ke 320 dan keduanya dikirim ulang (US$0,0044).
- **Penyimpangan rencana:** prompt di-cache dengan glosarium istilah (±4,5 ribu token per request), jadi biaya ±1,6× perkiraan US$0,26; perbaikan 8 node berjangkar terlalu awal ditambahkan (ditemukan saat memeriksa j4/142); tidak ada patch `toc_node` (judul dan halaman awal node sudah benar; memindah paragraf ke node lain akan membuat ringkasan AI usang).
- **Peninjau** (`git diff origin/main...HEAD`, sekali putus karena batas penggunaan lalu dilanjutkan): **0 blocker, 1 perbaikan, 8 saran.** Perbaikan dikerjakan: terjemahan subjudul terikat `source_sha256` judul Arab (tes: daftar kurasi berubah → judul Indonesia tidak dipasang); migrasi 0007 belum pernah di produksi, jadi diubah di tempat dan staging dipulihkan (dua tabel + catatan migrasi 0007 dihapus di `surau-corpus-staging`, lalu dimuat ulang). Saran dikerjakan: label status tinjau dari data (bukan teks tetap), `node_tail` hanya bila butir `plain` terverifikasi (tes: butir usang → satu h2), `node_tail` wajib sehalaman, kueri judul dilewati di skema < 7 (tanpa galat "no such table" di log produksi), `passageId()` menggantikan rumus ID, CSS (Arab tidak diperkecil, lipatan judul Indonesia rapat), tes korpus lokal 8 node + p16600/p18645, skema keluaran dipindah ke `prompts/toc-title-schema.ts`.
- **Utang teknis / pesan untuk sesi berikutnya:**
  - **Promote `ihya-v8`** dikerjakan 2026-10-22 atas izin pemilik (PR promote; rollback: `pnpm run corpus:promote ihya-v7 --switch-only` + PR). `surau-corpus-ihya-v7` tetap ada sebagai target rollback.
  - HTML halaman baca j1/200 +38% (gzip +50%, 41 → 61 KB) karena pohon daftar isi 522 baris berjudul ganda ikut terkirim: usul pemuatan malas pohon di sesi kinerja LCP.
  - Subjudul di daftar isi tidak ikut disorot sebagai bagian aktif; leluhur yang tertutup tidak dibuka otomatis (utang bagian A).
  - Judul Indonesia memakai gaya v2; pola keliru yang ditemukan pembaca/T-17 → v3 + kirim ulang dalam pagu baru, atau koreksi lewat X08.
