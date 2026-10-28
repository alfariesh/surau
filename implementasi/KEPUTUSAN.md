# Log Keputusan (ADR)

Setiap keputusan teknis yang tidak bisa ditebak dari kode dicatat di sini, lengkap dengan alasan dan alternatif yang ditolak. Keputusan **tidak dihapus**. Bila berubah, tulis ADR baru dan tandai yang lama "diganti oleh ADR-xxx".

Status: **diterima** (berlaku) · **sementara** (berlaku, tapi menunggu data/izin tertentu) · **diusulkan** (menunggu pemilik) · **diganti**.

Indeks ini memuat semua ADR. Isi tiap ADR ada di file sendiri di folder [keputusan/](keputusan/), satu file per ADR. Tautan di kolom Berkas mengarah ke file masing-masing.

## Daftar ADR

| Nomor | Judul | Status | Tanggal | Berkas |
|---|---|---|---|---|
| 001 | Cara kerja: folder `implementasi/` + sesi + skill `/sesi` | diterima | 2026-10-15 | [keputusan/ADR-001.md](keputusan/ADR-001.md) |
| 002 | Hosting: Cloudflare Workers, bukan Vercel | diterima | 2026-10-15 | [keputusan/ADR-002.md](keputusan/ADR-002.md) |
| 003 | Frontend: Next.js 16 App Router + OpenNext di Workers | sementara | 2026-10-15 | [keputusan/ADR-003.md](keputusan/ADR-003.md) |
| 004 | UI: HeroUI v3 OSS + HeroUI Pro (versi dipin persis) | sementara | 2026-10-15 | [keputusan/ADR-004.md](keputusan/ADR-004.md) |
| 005 | Database: Cloudflare D1 (SQLite) + FTS5, bukan Supabase/Postgres | diterima | 2026-10-15 | [keputusan/ADR-005.md](keputusan/ADR-005.md) |
| 006 | Embedding/vektor ditunda sampai eval membuktikan perlu | diterima | 2026-10-15 | [keputusan/ADR-006.md](keputusan/ADR-006.md) |
| 007 | Satu bahasa: TypeScript di semua tempat; Go dan Python tidak dipakai di awal | diterima | 2026-10-15 | [keputusan/ADR-007.md](keputusan/ADR-007.md) |
| 008 | Monorepo pnpm 12 + Vite+ sebagai toolchain tunggal, TypeScript 7, Node 24 | sementara | 2026-10-15 | [keputusan/ADR-008.md](keputusan/ADR-008.md) |
| 009 | Tanpa ORM di Fase 0–4: migrasi SQL `wrangler d1 migrations` + repository bertipe (Zod) | diterima | 2026-10-15 | [keputusan/ADR-009.md](keputusan/ADR-009.md) |
| 010 | Tiga Worker berbagi `packages/core`; `surau-api` tanpa route publik | diterima | 2026-10-15 | [keputusan/ADR-010.md](keputusan/ADR-010.md) |
| 011 | MCP: `@modelcontextprotocol/server` v2, stateless dual-era, tanpa paket `agents` | diterima | 2026-10-15 | [keputusan/ADR-011.md](keputusan/ADR-011.md) |
| 012 | Nama di kode dan MCP berbahasa Inggris; dokumen dan UI berbahasa Indonesia | diterima | 2026-10-15 | [keputusan/ADR-012.md](keputusan/ADR-012.md) |
| 013 | LLM: Claude Haiku 5.5 lewat AI Gateway; batch langsung ke Anthropic | sementara | 2026-10-15 | [keputusan/ADR-013.md](keputusan/ADR-013.md) |
| 014 | Pengaman biaya dan penyalahgunaan berlapis | diterima | 2026-10-15 | [keputusan/ADR-014.md](keputusan/ADR-014.md) |
| 015 | Observabilitas bawaan Cloudflare; eval dan anotasi buatan sendiri | diterima | 2026-10-15 | [keputusan/ADR-015.md](keputusan/ADR-015.md) |
| 016 | Autentikasi: Better Auth + D1, ditunda sampai setelah Jawab | diterima | 2026-10-15 | [keputusan/ADR-016.md](keputusan/ADR-016.md) |
| 017 | CI/CD: GitHub Actions + wrangler; Worker Previews per PR | diterima | 2026-10-15 | [keputusan/ADR-017.md](keputusan/ADR-017.md) |
| 018 | Sumber teks Ihya: struktur dari Shamela lokal, lisensi lewat OpenITI | diterima (pemilik, 2026-10-16) | 2026-10-15 | [keputusan/ADR-018.md](keputusan/ADR-018.md) |
| 019 | Urutan fase: MCP dirilis sebelum Jawab | diterima | 2026-10-15 | [keputusan/ADR-019.md](keputusan/ADR-019.md) |
| 020 | Al-Qur'an: teks Tanzil, terjemahan Kemenag via QuranEnc, tidak pernah diterjemahkan LLM | diterima | 2026-10-15 | [keputusan/ADR-020.md](keputusan/ADR-020.md) |
| 021 | Lisensi konten: CC BY-NC-SA 4.0, terpisah dari kode Apache-2.0 | diterima (pemilik, 2026-10-16) | 2026-10-15 | [keputusan/ADR-021.md](keputusan/ADR-021.md) |
| 022 | Posisi produk terhadap Shamela AI dan MCP | diterima | 2026-10-15 | [keputusan/ADR-022.md](keputusan/ADR-022.md) |
| 023 | Hasil spike toolchain S01: Vite+ dan TS7 lolos, dengan penyesuaian versi dan konfigurasi | diterima | 2026-10-15 | [keputusan/ADR-023.md](keputusan/ADR-023.md) |
| 024 | GitHub & CI: repo privat baru, cache `node_modules` terpisah, token sempit, Dependabot dengan cadangan manual, tanpa proteksi branch | diterima | 2026-10-15 | [keputusan/ADR-024.md](keputusan/ADR-024.md) |
| 025 | Repo `alfariesh/surau` publik sementara (kuota CI privat habis), risiko lisensi HeroUI Pro diterima pemilik | sementara | 2026-10-15 | [keputusan/ADR-025.md](keputusan/ADR-025.md) |
| 026 | Deploy web: OpenNext 1.20.11 di Worker `surau-web`, cache R2 + regional, Preview per PR lewat `wrangler preview` | diterima | 2026-10-15 | [keputusan/ADR-026.md](keputusan/ADR-026.md) |
| 027 | Identitas visual dan fondasi UI web: palet Zaitun, Plus Jakarta Sans + Noto Naskh Arabic, next-themes, Playwright + axe | diterima | 2026-10-15 | [keputusan/ADR-027.md](keputusan/ADR-027.md) |
| 028 | Paket `@surau/text`: aturan NORM_VERSION 1, pembersih HTML Shamela, cakupan tes, `/api/version` | diterima | 2026-10-15 | [keputusan/ADR-028.md](keputusan/ADR-028.md) |
| 029 | Skema data v1: formula ID, permalink publik, aturan stabilitas, dan tes D1 di workerd | diterima | 2026-10-15 | [keputusan/ADR-029.md](keputusan/ADR-029.md) |
| 030 | Upgrade Next 16.4.1 + React 19.3.1 + OpenNext 1.20.12 (sesi X01); larangan ADR-003 tetap | diterima | 2026-10-16 | [keputusan/ADR-030.md](keputusan/ADR-030.md) |
| 031 | Log Worker Preview dibaca CI lewat GraphQL Analytics (`workersInvocationsAdaptive`), bukan Tail Worker | diterima | 2026-10-16 | [keputusan/ADR-031.md](keputusan/ADR-031.md) |
| 032 | Importer Ihya (S07): keluaran build, `passage_needs_review`, pemisahan takhrij `//`, daftar isi + patch, peta ID | diterima | 2026-10-16 | [keputusan/ADR-032.md](keputusan/ADR-032.md) |
| 033 | Core tools baca (S08): kontrak keluaran, sitasi, error bertipe, paginasi `readSection` per blok | diterima | 2026-10-16 | [keputusan/ADR-033.md](keputusan/ADR-033.md) |
| 034 | UI pembaca (S09): rute ISR on-demand, pembaca tertutup di produksi, takhrij HoverCard/Popover, laporan berpengaman, `keep_names: false` | diterima | 2026-10-16 | [keputusan/ADR-034.md](keputusan/ADR-034.md) |
| 035 | CSS HeroUI diimpor selektif per komponen; pohon daftar isi ternyata sudah terkirim sekali | diterima | 2026-10-16 | [keputusan/ADR-035.md](keputusan/ADR-035.md) |
| 036 | Korpus produksi blue-green (S10): `corpus:promote`, QA sampel byte demi byte, `preview_database_id` untuk lokal, `/lisensi`, migrasi app di deploy | diterima | 2026-10-16 | [keputusan/ADR-036.md](keputusan/ADR-036.md) |
| 037 | Rilis Fase 1: pembaca dibuka di produksi, penyimpangan S07 butir 5 diterima, pengaman path acak dan batas laporan global | diterima | 2026-10-16 | [keputusan/ADR-037.md](keputusan/ADR-037.md) |
| 038 | Antrean revalidasi no-op untuk ISR `revalidate = false` (opennextjs-aws#1250); breadcrumb bab membungkus di ponsel | diterima | 2026-10-16 | [keputusan/ADR-038.md](keputusan/ADR-038.md) |
| 039 | Pencarian Arab (S11): indeks kolom stem saja, `term_stat` >10%, pengaman kata umum di ekspresi MATCH, hasil per halaman dalam satu bolak-balik D1, korpus `ihya-v2` | diterima | 2026-10-17 | [keputusan/ADR-039.md](keputusan/ADR-039.md) |
| 040 | Ayat (S12): teks Tanzil (XML), terjemahan + transliterasi Kemenag dari data pemilik (menggantikan QuranEnc), pencocok deterministik `{…}` + frasa pengantar, korpus `ihya-v3` (skema 5), penanda ayat S13 | diterima (pemilik, 2026-10-17) | 2026-10-17 | [keputusan/ADR-040.md](keputusan/ADR-040.md) |
| 041 | Pohon daftar isi: `NavigationTree` react-aria + garis pemandu sendiri menggantikan `FileTree` HeroUI Pro; satu bagian aktif. Sampul kitab 3D (`Book`) dan kartu kitab `Widget` | diterima | 2026-10-17 | [keputusan/ADR-041.md](keputusan/ADR-041.md) |
| 042 | Pencocok ayat S13: kutipan pendek sesudah pengantar dan kutipan tanpa tanda (hanya lafaz satu-satunya di mushaf, paragraf badan) | diterima | 2026-10-17 | [keputusan/ADR-042.md](keputusan/ADR-042.md) |
| 043 | Batch terjemahan & ringkasan AI (S13): satu request per paragraf, prompt v2, ringkasan dua putaran, validasi berlapis, kirim bertahap, korpus `ihya-v4` | diterima | 2026-10-17 | [keputusan/ADR-043.md](keputusan/ADR-043.md) |
| 044 | Cari bahasa Indonesia (S14): indeks terjemahan/ringkasan AI dengan stem ringan, gabungan RRF tiga jalur dalam satu batch, cache hasil per versi korpus, filter bagian, korpus `ihya-v5` (skema 6) | diterima | 2026-10-17 | [keputusan/ADR-044.md](keputusan/ADR-044.md) |
| 045 | Eval retrieval (S15): soal JSONL publik + holdout privat di R2, runner `searchText` atas D1 lokal/staging, gerbang R2 = hit@10 ≥ 90% atas ≥20 soal disetujui, kata pembingkai kueri Indonesia | diterima | 2026-10-17 | [keputusan/ADR-045.md](keputusan/ADR-045.md) |
| 046 | Embedding/vektor tetap ditunda setelah eval S15 (hit@10 ≥ 90%); S15b tidak dijadwalkan | diterima | 2026-10-17 | [keputusan/ADR-046.md](keputusan/ADR-046.md) |
| 047 | Mutu terjemahan AI sebelum rilis Fase 2 (X02): lapisan koreksi tinjauan, prompt `translate-passage@3`, pencocok ayat lintas paragraf, korpus `ihya-v6` | diterima | 2026-10-17 | [keputusan/ADR-047.md](keputusan/ADR-047.md) |
| 048 | Rilis Fase 2: T-16/T-17 penilaian agent diterima, target 80% T-17 dilewati secara sadar, batas global pencarian 1.200/menit | diterima | 2026-10-17 | [keputusan/ADR-048.md](keputusan/ADR-048.md) |
| 049 | MCP publik (S16): Worker `surau-mcp` stateless dual-era di `mcp.surau.org/mcp`, tujuh tool di atas core, amplop lisensi + permalink absolut, `search_text` dipadatkan, kalibrasi token `readSection`, batas `HMAC(IP):tool` + batas global | diterima | 2026-10-17 | [keputusan/ADR-049.md](keputusan/ADR-049.md) |
| 050 | Panduan MCP dan pemantauan tanpa isi pertanyaan | diterapkan di S17 | 2026-10-17 | [keputusan/ADR-050.md](keputusan/ADR-050.md) |
| 051 | Rilis Fase 3: MCP publik | diterima | 2026-10-17 | [keputusan/ADR-051.md](keputusan/ADR-051.md) |
| 052 | Eval Jawab dan ruang tinjau terautentikasi | diterima | 2026-10-19 | [keputusan/ADR-052.md](keputusan/ADR-052.md) |
| 053 | Tata letak satu lebar, daftar isi halaman teks, panel Tampilan pembaca, kertas sepia, judul ringkas di navbar | diterima | 2026-10-19 | [keputusan/ADR-053.md](keputusan/ADR-053.md) |
| 054 | Evaluasi agent sementara tanpa menghambat pengembangan | diterima | 2026-10-19 | [keputusan/ADR-054.md](keputusan/ADR-054.md) |
| 055 | Tipografi UI memakai Typography HeroUI | diterima | 2026-10-20 | [keputusan/ADR-055.md](keputusan/ADR-055.md) |
| 056 | Font UI HarmonyOS Sans menggantikan Plus Jakarta Sans | diganti oleh ADR-080 | 2026-10-20 | [keputusan/ADR-056.md](keputusan/ADR-056.md) |
| 057 | Aset visual: skill `aset` dengan mesin iso-glow (MIT) bertoken Surau; tiga ilustrasi prinsip di Beranda | diterima | 2026-10-19 | [keputusan/ADR-057.md](keputusan/ADR-057.md) |
| 058 | Tekstur kertas dipanggang jadi tile AVIF statis (mask CSS), bukan shader WebGL saat runtime | diterima | 2026-10-20 | [keputusan/ADR-058.md](keputusan/ADR-058.md) |
| 059 | Stabilitas ID paragraf dijaga sidik teks yang di-commit, diperiksa saat ingest | diterima | 2026-10-20 | [keputusan/ADR-059.md](keputusan/ADR-059.md) |
| 060 | Deploy produksi melewati push yang hanya mengubah prosa | diterima | 2026-10-20 | [keputusan/ADR-060.md](keputusan/ADR-060.md) |
| 061 | Tanda terima sebelum mengirim batch LLM, dan `pnpm llm reconcile` | diterima | 2026-10-20 | [keputusan/ADR-061.md](keputusan/ADR-061.md) |
| 062 | Satu alamat publik produksi: workers.dev web dimatikan, MCP menolak host selain mcp.surau.org | diterima | 2026-10-20 | [keputusan/ADR-062.md](keputusan/ADR-062.md) |
| 063 | Stem Arab: artikel tidak dipotong bila sisanya kata fungsi dua huruf, varian lam melebur untuk kueri berartikel; NORM_VERSION 2, korpus `ihya-v7` | diterima | 2026-10-20 | [keputusan/ADR-063.md](keputusan/ADR-063.md) |
| 064 | Pipeline Jawab (S19): AI Gateway BYOK lolos uji, routing + Citations per paragraf, verifikasi kutipan ke DB, Worker `surau-api` tanpa alamat publik | diterima | 2026-10-20 | [keputusan/ADR-064.md](keputusan/ADR-064.md) |
| 065 | Pengaman biaya Jawab (S20): semua guard di `surau-api`, satu secret HMAC berturunan HKDF, ledger mikro-USD dengan reservasi atomik terpisah untuk Sonnet, cron tunggal, `/admin` Access + JWT, P-4/P-7 usulan | diterima | 2026-10-21 | [keputusan/ADR-065.md](keputusan/ADR-065.md) |
| 066 | UI Tanya (S21): status hadits toleran, teks jawaban per blok tanpa Markdown, kartu kutipan dari `/api/kutipan`, Turnstile sesuai permintaan, laporan jawaban, `/transparansi`; rilis Fase 4 belum layak | diterima | 2026-10-21 | [keputusan/ADR-066.md](keputusan/ADR-066.md) |
| 067 | Kandidat Jawab (X03): RRF berbobot (pertanyaan ×3), bagian 3 halaman, bagian dari ringkasan AI sebagai routing kedua, pertanyaan panjang dipotong per kata; diukur gratis atas rute tersimpan | diterima | 2026-10-21 | [keputusan/ADR-067.md](keputusan/ADR-067.md) |
| 068 | Tahap jawaban Jawab (X05): dokumen dikelompokkan per bagian (urut kitab), prompt `answer@6`, eval atas rute routing tersimpan (`--rute`) | diterima | 2026-10-21 | [keputusan/ADR-068.md](keputusan/ADR-068.md) |
| 069 | Status hadits dari label istilah takhrij (X06): pengenal frasa baku deterministik, label kode per catatan kaki, klaim dari struktur catatan kaki, tanda kelemahan dari label yang sama, metrik "Takhrij" berbasis label | diterima | 2026-10-21 | [keputusan/ADR-069.md](keputusan/ADR-069.md) |
| 070 | Tinjauan label status hadits (X07): tabel `takhrij_review` di DB app terikat sidik label + versi aturan, antrean `/tinjau/takhrij`, label tertinjau dipakai Jawab hanya dari akun + nama ustadz peninjau terdaftar | diterima | 2026-10-21 | [keputusan/ADR-070.md](keputusan/ADR-070.md) |
| 071 | Nama agent AI Surau: **Maknaz** (pengganti "Tanya" di tampilan) | diterima | 2026-10-21 | [keputusan/ADR-071.md](keputusan/ADR-071.md) |
| 072 | Orb tahap di halaman Tanya: satu orb titik yang berganti bentuk per tahap Jawab, komponen kanvas sendiri (bukan paket `thinking-orbs`) | diterima | 2026-10-21 | [keputusan/ADR-072.md](keputusan/ADR-072.md) |
| 073 | Halaman Tanya sebagai percakapan: komponen chat HeroUI Pro (template chat), setiap pertanyaan tetap dijawab terpisah | diterima | 2026-10-21 | [keputusan/ADR-073.md](keputusan/ADR-073.md) |
| 074 | Struktur teks pembaca (X04 W4): daftar kurasi subjudul tanpa teks Arab, syair per syatr, dan model halaman siap render | diterima | 2026-10-21 | [keputusan/ADR-074.md](keputusan/ADR-074.md) |
| 075 | Label AI dan penyajian terjemahan di pembaca (X04 W1–W3): satu catatan halaman + lencana per terjemahan, label saat menyalin, tipografi terjemahan, tata letak pilihan | diterima | 2026-10-21 | [keputusan/ADR-075.md](keputusan/ADR-075.md) |
| 076 | Gulir bersambung, Lanjutkan membaca, dan Bagikan tautan paragraf (X04 W5–W6) | diterima | 2026-10-21 | [keputusan/ADR-076.md](keputusan/ADR-076.md) |
| 077 | Judul daftar isi Indonesia (X04 bagian B W8): tabel korpus skema 7, prompt `translate-toc-title@2` (Sonnet 5.5, API biasa, pagu), label di kepala daftar isi, korpus `ihya-v8` | diterima | 2026-10-21 | [keputusan/ADR-077.md](keputusan/ADR-077.md) |
| 078 | Daftar isi pembaca dengan subjudul kurasi (X04 bagian B W7) dan judul node yang salah tempat (butir daftar pembuka, jangkar sumber terlalu awal) | diterima | 2026-10-21 | [keputusan/ADR-078.md](keputusan/ADR-078.md) |
| 079 | Kinerja pembaca ponsel (X09): pangkas byte sebelum cat pertama — font UI tanpa preload, tekstur kertas ditunda di kunjungan pertama, pohon daftar isi ringkas + `/kitab/<karya>/daftar-isi.json` (ISR), JS dimuat saat dibutuhkan, kamus i18n per bagian; `experimental.inlineCss` ditolak | diterima | 2026-10-22 | [keputusan/ADR-079.md](keputusan/ADR-079.md) |
| 080 | Font UI Google Sans (OFL, `next/font/google`) menggantikan HarmonyOS Sans | diterima | 2026-10-22 | [keputusan/ADR-080.md](keputusan/ADR-080.md) |
| 081 | Koreksi terjemahan tahap 1 (X08): revisi manusia di DB app (`translation_revision`, hanya bertambah), editor terdaftar `TRANSLATION_EDITORS` dengan peran ruang tinjau, `/tinjau/terjemahan`, daftar koreksi + batalkan di `/admin`, pemeriksa teks bersama `validateTranslationText` | diterima | 2026-10-22 | [keputusan/ADR-081.md](keputusan/ADR-081.md) |
| 082 | Koreksi terjemahan tahap 2 (X08): tayang lewat korpus — ekspor revisi (berkas lokal + R2 privat, metadata tanpa teks di git), ingest memvalidasi ulang + `translation_review` (skema 8), label bersama "Terjemahan AI · dikoreksi/diperiksa {nama}", `human_review` aditif di MCP, batch AI melewati paragraf berevisi | diterima | 2026-10-22 | [keputusan/ADR-082.md](keputusan/ADR-082.md) |
| 083 | Rapikan pembaca (X10): skrip preferensi mentah, baris aktif daftar isi = subjudul kurasi + cabang terbuka terkendali, kaki per halaman cetak (`PageFoot`), catatan AI menurut konten AI yang belum ditinjau manusia, rincian label lewat CSS anchor positioning | diterima | 2026-10-22 | [keputusan/ADR-083.md](keputusan/ADR-083.md) |
| 084 | Navbar ringkas: judul halaman masuk ke navbar saat digulir (semua halaman), ikon Cari + menu ⋮ (tema Terang/Gelap/Sistem + aksi halaman) | diterima | 2026-10-22 | [keputusan/ADR-084.md](keputusan/ADR-084.md) |
| 085 | Mockup buku tunggal seperti hardcover: papan sampul di sisi halaman, sampul menjorok, bayangan lantai, pratinjau `/dev/buku` | diterima | 2026-10-22 | [keputusan/ADR-085.md](keputusan/ADR-085.md) |
| 086 | Beranda fokus cari: rak kitab → sambutan → satu kotak cari (Cari/Maknaz) → prinsip; pertanyaan Maknaz dititipkan di memori tab dan kotak "menjadi" gelembung lewat React `<ViewTransition>` | diterima | 2026-10-23 | [keputusan/ADR-086.md](keputusan/ADR-086.md) |
| 087 | Halaman Cari memakai kotak Beranda: `SearchBox` bersama, pemilih bagian kitab bertingkat (pilihan tunggal) menggantikan dinding chip, jembatan "Tanyakan … ke Maknaz" di hasil | diterima | 2026-10-24 | [keputusan/ADR-087.md](keputusan/ADR-087.md) |
| 088 | Menu Cari dihapus dari sidebar: kotak cari ada di Beranda, /cari = halaman hasil di bawah Beranda | diterima | 2026-10-24 | [keputusan/ADR-088.md](keputusan/ADR-088.md) |
| 089 | `pnpm dev:remote`: dev lokal membaca korpus staging lewat remote binding D1 | diterima | 2026-10-24 | [keputusan/ADR-089.md](keputusan/ADR-089.md) |
| 090 | Halaman Maknaz (/tanya) sesudah Beranda baru: pembuka umum, satu catatan tetap yang berpindah, kotak berbentuk widget Beranda | diterima | 2026-10-24 | [keputusan/ADR-090.md](keputusan/ADR-090.md) |
| 091 | Mode baca Arab · Keduanya · Terjemahan untuk seluruh situs (X11): satu preferensi `surau:read-mode` → `<html data-read-mode>`, bantuan terjemahan bertanda `data-tr-aid`, Cari dan Maknaz ikut mode tanpa menyembunyikan bukti, posisi baca dijaga | diterima | 2026-10-24 | [keputusan/ADR-091.md](keputusan/ADR-091.md) |
| 092 | Arsitektur bahasa: bahasa situs (locale) adalah dimensi URL, mode baca adalah preferensi pembaca; daftar bagian yang masih terkunci "id" untuk fase bahasa Inggris | diterima | 2026-10-24 | [keputusan/ADR-092.md](keputusan/ADR-092.md) |
| 093 | Pencarian makna untuk kandidat Jawab (X13): satu daftar RRF tambahan dari embedding `bge-m3` (k 20, bobot 2), diukur gratis dengan embedding lokal; kandidat naik tetapi lokasi jawaban eval berbayar tetap 85,3%, jadi produksi (Workers AI + Vectorize) ditunda | kode kait diterima, produksi ditunda | 2026-10-24 | [keputusan/ADR-093.md](keputusan/ADR-093.md) |
| 094 | Daftar makna takhrij untuk soal hadits (X13 lanjutan): catatan kaki terdekat (k 10) sebagai daftar RRF kedua, hanya bila routing menandai soal hadits; j018 diserahkan ke tinjauan gold | diterima (kode, mati di Worker) | 2026-10-24 | [keputusan/ADR-094.md](keputusan/ADR-094.md) |
| 095 | Petunjuk mode baca sekali tampil, Ringkasan AI ikut kata cari, dan ukur LCP per mode sebagai perintah repo (X14) | diterima | 2026-10-24 | [keputusan/ADR-095.md](keputusan/ADR-095.md) |
| 096 | Landing page publik di `/`, Beranda pindah ke `/home`; hero bergaya template buku (Primer) + bagian bergaya ElevenLabs yang menonjolkan AI lewat simulasi berdata asli | diterima | 2026-10-24 | [keputusan/ADR-096.md](keputusan/ADR-096.md) |
| 097 | Intisari (ringkasan belajar berlapis) + Dengar (audio ElevenLabs v4): dua tingkat, model data korpus skema 9, kode menyalin kutipan, audio tanpa huruf Arab | diterima (kontrak X15a; pipeline, UI, audio menyusul X15b–X17) | 2026-10-24 | [keputusan/ADR-097.md](keputusan/ADR-097.md) |
| 098 | Pipeline Intisari (X15b): blok berlabel dari `text_raw`, tiga tahap tanpa meratakan subpohon, validator di `@surau/llm`, glosarium berkunci, pilot dari staging (SELECT saja) | diterima | 2026-10-24 | [keputusan/ADR-098.md](keputusan/ADR-098.md) |
| 099 | UI Intisari (X16): halaman + hub ISR, dalil dihitung core dari jangkar, kepala Intisari bersama ekstra daftar isi, lencana daftar isi tanpa tautan kedua, jalur Cari gagasan opt-in dengan memo isolate, fixture `/dev/intisari` di Preview | diterima | 2026-10-24 | [keputusan/ADR-099.md](keputusan/ADR-099.md) |
| 100 | Dengar (X17): skrip audio deterministik dari Intisari yang tampil, ElevenLabs v4 lewat REST, MP3 CBR bersambung dengan kunci bersidik isi, pemutar global berlabel suara AI | diterima (kode + infrastruktur; pilot berbayar menunggu T-29, T-31, izin pemilik) | 2026-10-25 | [keputusan/ADR-100.md](keputusan/ADR-100.md) |
| 101 | Gaya narator Dengar: tag audio v4 dari daftar tetap, dipilih kode per peran kalimat, bawaan polos sampai uji dengar A/B | diterima (kode; pemakaian menunggu T-31) | 2026-10-25 | [keputusan/ADR-101.md](keputusan/ADR-101.md) |
| 102 | Label suara AI hanya sebagai teks, tidak diucapkan di audio | diterima (keputusan pemilik) | 2026-10-25 | [keputusan/ADR-102.md](keputusan/ADR-102.md) |
| 103 | media.surau.org dilayani Worker `surau-media` (R2 binding + Workers Caching), bukan domain kustom R2 langsung | diterima | 2026-10-25 | [keputusan/ADR-103.md](keputusan/ADR-103.md) |
| 104 | Sorotan kalimat mengikuti audio Intisari (X18): timestamps per kalimat di objek R2 immutable, dua sumber waktu (with-timestamps TTS dan forced alignment), sorotan Highlight API + gulir + ketuk-untuk-lompat | diterima (kode; uji berbayar dan objek nyata menunggu T-29, T-32, izin pemilik) | 2026-10-25 | [keputusan/ADR-104.md](keputusan/ADR-104.md) |
| 105 | Agent menggantikan penilaian ustadz untuk sementara (Jawab, label takhrij, T-17 tahap 3), dicatat terpisah dan tidak pernah berlabel ustadz | diterima (permintaan pemilik; penerimaan sebagai syarat R4 diputuskan di `/rilis 4`) | 2026-10-26 | [keputusan/ADR-105.md](keputusan/ADR-105.md) |
| 106 | Mutu Jawab dari penilaian agent: prompt `answer@7`, pipeline@8, versi soal 2 | diterima | 2026-10-26 | [keputusan/ADR-106.md](keputusan/ADR-106.md) |
| 107 | Pencocok ayat: kutipan Qur'ani di konteks hadits diterima bila ada kata wahyu, ≥ 8 kata, atau satu ayat utuh (X21) | diterima | 2026-10-26 | [keputusan/ADR-107.md](keputusan/ADR-107.md) |
| 108 | Label status hadits aturan versi 2: segmen per catatan kaki tergabung, lafaz yang dikutip tidak dipindai untuk kata ambigu, penilaian yang dibantah, empat jenis baru | diterima | 2026-10-26 | [keputusan/ADR-108.md](keputusan/ADR-108.md) |
| 109 | Terjemahan ulang terarah Ihya (X21): Sonnet 5.5 + `translate-passage@5` untuk strata sedang + panjang, mekanisme pilihan yang mempertahankan terjemahan lama, pagu US$36 | diterima (pemilik, chat 2026-10-26) | 2026-10-26 | [keputusan/ADR-109.md](keputusan/ADR-109.md) |
| 110 | Bahasa jawaban Jawab: prompt `answer@8`, pipeline@9 (diagnostik kalimat berulang dan salinan terjemahan) | diterima | 2026-10-26 | [keputusan/ADR-110.md](keputusan/ADR-110.md) |
| 111 | Bunyi label status hadits untuk pembaca: "dinilai lemah, menurut takhrij al-'Iraqi", pipeline@10 | diterima | 2026-10-26 | [keputusan/ADR-111.md](keputusan/ADR-111.md) |
| 112 | Gema takhrij: takhrij kemunculan pertama hadits ikut ke dokumen Jawab, pipeline@11 | diterima | 2026-10-26 | [keputusan/ADR-112.md](keputusan/ADR-112.md) |
| 113 | Aturan istilah takhrij versi 3: empat jenis "tidak ditemukan" dipisah, pipeline@12 | diterima | 2026-10-27 | [keputusan/ADR-113.md](keputusan/ADR-113.md) |
| 114 | Bekas huruf Arab buatan model dirapikan, bukan dibiarkan "…", pipeline@13 | diterima | 2026-10-27 | [keputusan/ADR-114.md](keputusan/ADR-114.md) |
| 115 | Kitab kandidat "Segera hadir" di /kitab dengan suara minat anonim, tanpa email | diterima | 2026-10-27 | [keputusan/ADR-115.md](keputusan/ADR-115.md) |
| 116 | Kutipan Arab bersitasi sesudah kalimat status hadits: sitasinya pindah ke kalimat itu, pipeline@15 | diterima | 2026-10-27 | [keputusan/ADR-116.md](keputusan/ADR-116.md) |
| 117 | Catatan keputusan dan jurnal dipecah: satu file per ADR, arsip log per bulan | diterima | 2026-10-28 | [keputusan/ADR-117.md](keputusan/ADR-117.md) |
| 118 | Evaluasi vinext dan TanStack Redact: tetap Next 16 + OpenNext, ditinjau ulang bila pemicunya terpenuhi | diganti oleh ADR-119 | 2026-10-27 | [keputusan/ADR-118.md](keputusan/ADR-118.md) |
| 119 | Evaluasi vinext diukur ulang: vinext jadi kandidat migrasi (LCP ponsel lokal halaman kitab 1,7–2,1× lebih cepat, hidrasi +1,1 dtk), produksi tetap Next sampai gerbang Preview lolos; Redact tidak dipasang | diganti oleh ADR-121 | 2026-10-28 | [keputusan/ADR-119.md](keputusan/ADR-119.md) |
| 120 | STATUS.md dipangkas: bagian Sekarang diringkas, teks lama dipindah apa adanya ke arsip | diterima | 2026-10-28 | [keputusan/ADR-120.md](keputusan/ADR-120.md) |
| 121 | Gerbang Preview vinext (ADR-119 tahap 1): vinext tidak dimigrasi; LCP ponsel yang sama tampaknya bisa didapat di Next dengan menunda skrip sampai CSS selesai | diterima | 2026-10-28 | [keputusan/ADR-121.md](keputusan/ADR-121.md) |
| 122 | Konfigurasi project tes workerd memakai `defineProject` dari Vite+ | diterima | 2026-10-28 | [keputusan/ADR-122.md](keputusan/ADR-122.md) |
| 123 | Uji model jawaban Maknaz: Sonnet 5.5 menaikkan kesetiaan dan atribusi tetapi ±17× lebih mahal; produksi tetap Haiku sampai pemilik memutuskan | sementara | 2026-10-28 | [keputusan/ADR-123.md](keputusan/ADR-123.md) |
| 124 | Skrip Next ditunda sampai CSS selesai (pembungkus Worker OpenNext): gerbang Preview tidak lolos di LCP Lighthouse j3/202, tidak digabung | diganti oleh ADR-128 | 2026-10-28 | [keputusan/ADR-124.md](keputusan/ADR-124.md) |
| 125 | Konten turunan lewat Claude Desktop + plugin `surau-redaksi`: format `surau-konten/1`, cek otomatis tiga lapis, endpoint MCP `/redaksi` | diterima | 2026-10-28 | [keputusan/ADR-125.md](keputusan/ADR-125.md) |
| 126 | Instruksi server MCP publik dipadatkan menjadi ≤ 2.000 karakter (klien claude.ai memotong di ±2.048); isi kedelapan aturan tetap, urutan menurut kepentingan | diterima | 2026-10-28 | [keputusan/ADR-126.md](keputusan/ADR-126.md) |
| 127 | Daftar tarik Intisari di repo: gagasan Salah ditahan saat dibaca (web, Cari, MCP, audio) tanpa mengubah D1/R2 | diterima | 2026-10-28 | [keputusan/ADR-127.md](keputusan/ADR-127.md) |
| 128 | Penundaan skrip Next ditolak: gerbang kedua (n=15) juga tidak lolos di LCP Lighthouse; PR #206 ditutup | diterima | 2026-10-28 | [keputusan/ADR-128.md](keputusan/ADR-128.md) |
| 129 | Lokasi gold Jawab: pembobotan daftar sempit ditolak, pemberitahuan status hadits jadi kalimat biasa (pipeline@16), pencarian makna diukur ulang (lokasi 85,3% → 88,2%, belum ≥ 90%) | diterima | 2026-10-28 | [keputusan/ADR-129.md](keputusan/ADR-129.md) |

## Cara menambah ADR baru

1. Ambil nomor berikutnya yang bebas: `git fetch origin main`, lalu cari nomor tertinggi di `origin/main` (`git show origin/main:implementasi/KEPUTUSAN.md`, dan daftar `implementasi/keputusan/` di `origin/main`). Pakai nomor sesudahnya.
2. Buat **satu** file baru `implementasi/keputusan/ADR-NNN.md` dengan format di bawah.
3. Tambahkan **satu** baris ke tabel "Daftar ADR" di atas, urut menurut nomor.

Format ADR baru (isi file ADR):

```
## ADR-NNN · Judul — status · YYYY-MM-DD
**Konteks:** … **Keputusan:** … **Ditolak:** … **Konsekuensi:** … **Tinjau ulang bila:** …
```

Semua fakta versi dicek ke docs/registry resmi pada 15 Okt 2026 (riset paralel 9 area). Rangkumannya ada di [STACK.md](STACK.md).

---

## Keputusan yang menunggu pemilik

**Wajib dijawab pemilik:** P-2 (P-5 dijawab 2026-10-18: Anas; P-6 dijawab 2026-10-16). **Bila tidak dijawab, usulan CTO dipakai:** P-1, P-3, P-4, dan P-7. Pemilik tetap boleh mengubahnya kapan saja.

| ID | Pertanyaan (bahasa awam) | Usulan CTO | Dibutuhkan saat |
|---|---|---|---|
| P-1 | Kode di GitHub **terbuka untuk umum atau privat**? Lisensi HeroUI Pro (Terms §9) melarang mempublikasikan komponen dan template Pro, sedangkan `web/` adalah turunan template chat Pro. | **Privat.** Minta izin tertulis ke support@heroui.pro. Repo ini menyimpan template Pro di riwayat git, jadi repo ini **tidak boleh sekadar diubah menjadi publik**. Bila kelak ingin publik tanpa izin HeroUI, buat repo publik baru dari kode yang sudah ditulis ulang, tanpa riwayat lama. Lihat ADR-004. | S02 |
| P-2 | Nama domain Surau | Pemilik memilih; daftar lewat Cloudflare Registrar | S03 |
| P-3 | Font Arab utama | **Dijawab 2026-10-15:** Noto Naskh Arabic, palet Zaitun (Opsi A, ADR-027). | S04 |
| P-4 | Plafon biaya AI per bulan, dan jatah tanya gratis per pengunjung per hari | $20/bulan untuk Tanya online, 10 pertanyaan/hari per pengunjung. Batch dan eval memakai workspace terpisah (`surau-dev`, ±$40/bulan). | S13, Fase 4 |
| P-5 | Siapa ustadz pertama untuk eval dan review | **Anas** ditunjuk pemilik 2026-10-18 (T-13); persetujuan/penilaian nyata T-24 | Rilis Fase 4 (dianjurkan sudah ada sejak Fase 2) |
| P-6 | Sumber teks publik dan lisensi konten | **Dijawab 2026-10-16 (S10):** ADR-018 + ADR-021 disetujui; email pemberitahuan ke Shamela sudah dikirim pemilik (jawaban ditunggu). Kontak koreksi/takedown: formulir laporan + GitHub Issues. | Rilis Fase 1 |
| P-7 | Bolehkah Surau menyimpan pertanyaan dan jawaban pengguna (tanpa alamat IP atau data pribadi) untuk memperbaiki mutu, dan berapa lama? | Pertanyaan + jawaban (`answer_log`) 12 bulan; laporan kesalahan (`feedback`) sampai ditangani + 12 bulan; penghitung kuota harian 7 hari; catatan biaya (`llm_ledger`) 24 bulan. Semua diumumkan di kebijakan privasi. **`feedback` dijawab 2026-10-16 (S10): sampai ditangani + 12 bulan, diumumkan di `/lisensi#privasi`.** | Retensi `feedback`: rilis Fase 1. Sisanya: S18, S20 |


---
