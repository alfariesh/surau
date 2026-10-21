# X07 · Sesi sisipan: antrean tinjauan label status hadits di `/tinjau`

> **Fase:** sisipan Fase 4 (sesudah X06, sebelum `/rilis 4`) · **Status:** selesai
> **Prasyarat:** X06 selesai (ADR-069), S18 `/tinjau` + Access (ADR-052) · tanpa biaya LLM
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Sejak X06 status hadits di Jawab adalah label kode dari istilah yang tertulis di teks takhrij al-'Iraqi (`rule_extracted`, "dikenali otomatis dari teks takhrij, belum ditinjau"). Syarat R4 butuh tinjauan ustadz (Anas, T-24). Membaca jawaban satu per satu terlalu berat; yang perlu ditinjau cukup **label per catatan kaki**: satu keputusan berlaku untuk setiap jawaban yang mengutip takhrij itu.

## Baca dulu (hanya ini)

- ADR-052 (tinjauan disimpan di DB app, Access + JWT), ADR-069 (label kode), `.claude/rules/teks-arab.md` no. 1 dan 6.
- Kode `/tinjau` (`apps/web/src/app/(app)/tinjau`, `api/review`), skema DB app (`packages/db/migrations/app`).

## Langkah

1. Tabel tinjauan label di DB app (bukan korpus blue-green): `passage_id` catatan kaki + `rules_version` + sidik label, keputusan setuju/koreksi (jenis istilah)/ragu, catatan, penilai, waktu. Migrasi app.
2. Halaman antrean `/tinjau/takhrij`: urutan prioritas (paling sering dikutip Jawab, lalu berbeda per jalur), teks takhrij Arab dari DB dengan istilah disorot lewat rentangnya + arti baku, tombol setuju/koreksi.
3. Pipeline/UI Tanya: label disetujui tampil "ditinjau ustadz", koreksi menggantikan label otomatis; tidak pernah teks Arab yang bukan dari DB.
4. Tes, `peninjau`, `pnpm verify`, dokumen, PR.

## Selesai bila

- [x] Anas bisa membuka antrean di `/tinjau/takhrij` dan menyetujui/mengoreksi label (route + halaman di balik Access `Surau Tinjau` dan verifikasi JWT; diuji dengan tes route + pratinjau komponen di browser lokal desktop/ponsel/gelap; login nyata Anas tetap T-24)
- [x] Keputusan tersimpan di DB app (`takhrij_review`, migrasi app 0005, tes D1 workerd) dan dipakai Jawab (`surau-api`: label `ustadz_reviewed`/`ustadz_corrected`, baris status ikut label tertinjau, cache basi bila tinjauan berubah; tes Worker)
- [x] `pnpm verify` lolos
- [ ] PR di-merge (squash) setelah CI hijau — dicentang sesudah merge

## Di luar cakupan

- Label di tool MCP `get_hadith_takhrij`; kalimat penilaian bebas model yang bersitasi takhrij (ADR-069 Konsekuensi).
- Memilih rentang frasa untuk jenis istilah yang ditambahkan penilai (jenis tambahan tampil tanpa teks Arab).
- Memuat arsip eval ke `answer_log` produksi untuk mengisi prioritas "paling sering dikutip" (perlu aba-aba pemilik, karena ikut menambah antrean jawaban Anas).

## Catatan hasil

- **DB app** `takhrij_review` (0005): satu baris per (catatan kaki, versi aturan, penilai), `label_hash` = sidik label kode yang dilihat penilai (jenis + istilah + rentang). Koreksi hanya kode jenis istilah (`kinds_json`), tidak ada teks Arab dari penilai. Tanpa kedaluwarsa (anotasi korpus, bukan data pengguna).
- **Aturan berlaku** (`effectiveTakhrijReview`, core): hanya bila versi aturan dan sidik label sama dengan label sekarang, dan nama penilai = ustadz peninjau yang ditunjuk pemilik (`TAKHRIJ_USTADZ_REVIEWERS` = Anas; uji pemilik/Agent QA tersimpan tetapi tidak dipakai). Ragu atau beda pendapat antarpenilai = tidak berlaku.
- **Label tertinjau** (`reviewedTakhrijLabel`): setuju = label kode utuh; koreksi = istilah terdeteksi yang tidak dipilih dibuang, jenis tambahan tanpa frasa (`added`), teks status disusun kode dengan aturan yang sama (`takhrijStatus`). Sitasi sebagian memakai tinjauan hanya bila memuat semua istilah yang ditinjau.
- **Pipeline `pipeline@7`**: tinjauan dimuat dari DB app untuk catatan kaki yang dikutip (`takhrijReviews`, gagal = label kode); klaim `label` = `rule_extracted` | `ustadz_reviewed` | `ustadz_corrected` + `added_terms`; diagnostik `hadith_reviewed`, `takhrij_reviews_error`. Cache: entri yang takhrijnya ditinjau sesudah di-cache tidak disajikan (`created_at` = waktu permintaan). Tanda kelemahan `/api/kutipan` ikut label tertinjau.
- **Antrean** (`lib/takhrij-queue.ts`): label 4.201 catatan kaki takhrij dihitung sekali per isolate per versi korpus; urut kutipan Jawab (`answer_log` tanpa contoh agent + `answer_cache` × sajian), lalu `mixed`, lalu urutan kitab; filter belum/ragu/sudah per penilai; label berubah = kembali ke "belum". Refaktor `takhrijLabel` terbukti identik atas 13.194 kombinasi (catatan kaki × rentang) korpus `ihya-v7`.
- **Untuk sesi berikutnya:** prioritas "paling sering dikutip" di produksi baru berisi data setelah Jawab menyala atau arsip eval dimuat ke `answer_log`; tambah peninjau = PR + ADR; label MCP.
- Biaya API sesi: US$0.
