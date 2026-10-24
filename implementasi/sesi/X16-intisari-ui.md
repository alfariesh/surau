# X16 · Sesi sisipan: UI Intisari (hub, halaman Intisari, pembaca, daftar isi, Cari, MCP)

> **Fase:** sisipan (`apps/web`, `apps/mcp`, `packages/core`, `packages/db` hanya jalur Cari) · **Status:** selesai (kode; PR #138 di main `4ffb9ab`, ADR-099); data nyata menunggu X15b langkah 9; T-30 menunggu pemilik
> **Prasyarat:** X15a di-merge (kontrak `readDigest`/`DigestView`, ADR-097); data nyata di staging dari X15b langkah 9 · Tugas pemilik: T-30 (tinjau tampilan)
> **Perkiraan:** 1–2 percakapan agent · $0 LLM · tanpa korpus baru (fixture dulu; data nyata dari pilot X15b / `ihya-v9`)

## Tujuan

Pembaca bisa membuka hub Intisari dan Intisari tiap kitab atau bab. Isinya gagasan kunci yang tertaut ke paragraf sumber, kartu kutipan Arab dari DB beserta terjemahannya, istilah, dalil (ayat dan takhrij), dan pertanyaan ingatan. Pembaca juga bisa membuka Intisari dari pembaca, daftar isi, dan Cari. Peneliti dan AI lain bisa mengambilnya lewat MCP.

## Kenapa sesi ini ada

Lihat [X15](X15-intisari.md) dan ADR-097. Persona: pekerja kota yang sibuk, awam (tidak membaca Arab), dan peneliti (butuh jejak ke paragraf, dalil, takhrij). Intisari adalah pintu ke kitab, bukan penggantinya (docs/01, docs/05 §12).

## Baca dulu (hanya ini)

- ADR-097, ADR-091 (mode baca), ADR-079 (LCP ≤ 4,29 dtk), ADR-034/038 (ISR on-demand), ADR-035 (CSS HeroUI per komponen), ADR-055 (Typography)
- `apps/web/CLAUDE.md`, `.claude/rules/teks-arab.md` (aturan 1, 6, 8, 9, 11), [docs/05 §12](../../docs/05-kebijakan.md#12-intisari-dan-suara-ai)
- `packages/core/src/digest.ts` + `schema.ts` (`DigestView`), `packages/db/src/repo/digest.ts` (`listDigestHeaders`, `getDigestHeaders`)
- `apps/web/src/components/reader/section-summary.tsx` (versi X14), `lib/reader/page-model.ts`, `lib/reader/toc.ts`, `components/reader/toc-tree.tsx`, `lib/kutipan-handler.ts` (pola kartu kutipan)
- Docs Next di `apps/web/node_modules/next/dist/docs/` (rute + ISR); MCP `heroui-pro` sebelum memakai komponen HeroUI baru

## Langkah

1. **Rute** (ISR on-demand: `revalidate=false`, `dynamicParams=true`, `generateStaticParams()=[]`; di korpus skema < 9 → `notFound()`; `dengar.json` milik X17):
   - `(app)/kitab/[work]/intisari/page.tsx`: hub. Isinya 41 Intisari Kitab per rub', dengan durasi baca/dengar dan tanda "sudah dibaca" (localStorage, dicatat di `/privasi`).
   - `(app)/kitab/[work]/bab/[id]/intisari/page.tsx`: halaman Intisari. Tata letak "Kitab" bila `tier` book.
   - `(app)/dev/intisari/page.tsx`: halaman fixture (`force-dynamic`, noindex, pola `dev/buku`) untuk e2e tanpa D1.
2. **Data:**
   - `lib/reader/data.ts` mendapat `loadDigest` dan `loadDigestHeaders`.
   - **Dalil dihitung core dari jangkar**, tanpa LLM: ayat lewat `quranForRefs` dan `getAyahRefs`, hadits lewat `footnote_ref` paragraf jangkar + `takhrijLabel` (status `rule_extracted`, dengan teks takhrij asli).
   - Field `evidence` di `DigestView` bersifat aditif; kontrak MCP hanya bertambah.
3. **Komponen** `components/intisari/*`:
   - kepala + label AI (model, versi prompt, tanggal, status);
   - pembuka/abstrak;
   - daftar gagasan bernomor (judul + isi + lencana sikap + "Dasar teks" → permalink `#pN`; anjuran dengan catatan "tanyakan ulama untuk kasus pribadi");
   - kartu kutipan (`ArabicText` dari `text_raw`, terjemahan berlabel, jilid/halaman, jenis; riwayat menampilkan label takhrij);
   - chip istilah;
   - chip dalil;
   - "Uji pemahaman" (pertanyaan terlipat);
   - penutup + "Lanjut ke teks lengkap" + catatan "belajar bersama guru".
   - Tombol ▶ Dengarkan disiapkan sebagai slot untuk X17.
   - Tipografi lewat `Typography`, ikon dari `src/icons`, string di `i18n/id/intisari.ts`.
4. **Pembaca:**
   - Kartu ringkasan (`section-summary.tsx`) berisi abstrak + "N gagasan · ± M menit · Buka Intisari", lewat `getDigestHeaders` (bukan field baru di `SummaryView`).
   - Menu ⋮ mendapat "Buka Intisari bagian ini".
   - `PAGE_MODEL_VERSION` naik. Mode Arab tetap menyembunyikan kartu (`data-tr-aid`).
5. **Daftar isi:** flag Intisari per node (`lib/reader/toc.ts`) + lencana "Intisari · N mnt" di `toc-tree.tsx`, dari `listDigestHeaders` yang dimuat bersama daftar isi (ISR).
6. **Cari:**
   - Jalur `digest_point_fts` dipetakan ke paragraf jangkar pertama gagasan (`packages/db/src/repo/search.ts`, `packages/core/src/search.ts`), dan `SEARCH_RESULT_VERSION` naik ke 3.
   - Kartu hasil menampilkan judul gagasan yang cocok + "Buka Intisari".
   - Bagian ini menunggu X15b mengisi indeksnya.
7. **MCP:** tool baru `get_section_digest` (`apps/mcp/src/tools.ts`, `instructions.ts`, tes kontrak). Isinya kutipan dari DB, label AI, jangkar, dan dalil; `read_page` tidak dibebani.
8. **Tes:**
   - unit komponen;
   - e2e `intisari.spec.ts` (fixture + Preview data staging) + axe;
   - `pnpm ukur:lcp` untuk j1/200 dan satu halaman Intisari ≤ 4,29 dtk;
   - tangkapan layar ponsel/desktop/gelap untuk T-30.

## Selesai bila

- [ ] Hub dan halaman Intisari tampil di Preview dengan data staging. Di korpus skema < 9 halaman ini `notFound`, tanpa lencana atau tautan. *(Bagian kedua terbukti: Preview pr-138 + `pnpm dev:remote` atas staging skema 7 → hub/halaman 404, tanpa lencana/tautan; e2e "tanpa Intisari" lolos. Bagian pertama menunggu data pilot X15b langkah 9.)*
- [ ] Teks Arab kutipan sama persis dengan `text_raw` (e2e membandingkannya dengan `/api/kutipan`), dan kutipan dengan sidik basi tidak tampil. *(e2e "dengan Intisari" sudah ditulis, dilewati sampai `daftar-isi.json` menandai node berintisari; sidik basi ditahan `readDigest`, tes core X15a; kartu merender `text_raw` apa adanya, tes unit `digest-page.test.tsx`.)*
- [x] Setiap gagasan punya minimal satu tautan "Dasar teks" yang membuka paragrafnya. *(core tidak mengirim gagasan tanpa jangkar; `digest-page.test.tsx` + e2e fixture: setiap `li#gagasan-N` punya `a[data-basis]` ke `#pN`.)*
- [x] Label AI ada di halaman Intisari, kartu pembaca, dan kartu Cari. *(`digest-page.test.tsx`, `page-text.test.tsx` (baris Intisari di kartu Ringkasan AI), `result-card.test.tsx`; e2e fixture.)*
- [x] e2e + axe lolos; LCP ≤ 4,29 dtk; `eval:retrieval --gate` tidak turun. *(CI commit `6af024a`: `preview` sukses = e2e penuh di Preview termasuk `intisari.spec.ts` + axe; tes "dengan Intisari" dilewati karena staging tanpa data, dicatat di butir 1–2. `preview mcp` sukses (8 tool), `eval retrieval` sukses. LCP ponsel Preview median j1/200 3,49/3,29 dtk, `/dev/intisari` 3,37/3,69 dtk, `bukti/X16/lcp-pr138.md`; CI `eval retrieval` hijau; e2e lokal 12 lolos/2 dilewati dengan axe; e2e Preview CI: lihat PR #138.)*
- [ ] `pnpm verify` lolos; peninjau; T-30 disetujui pemilik; STATUS, LOG, dan berkas sesi ini diperbarui.

Berkas bersama dengan X17 yang dikerjakan bergantian: `src/i18n/privacy.ts` / halaman `/privasi` (penyimpanan lokal) dan `globals.css`.

## Di luar cakupan

- Pemutar audio (X17); di sini hanya slot tombolnya.
- Fitur belajar (jalur 40 hari, ulas, simpan kutipan, catatan pribadi): dicatat di FASE.
- Situs /en.
- Label hadits yang ditinjau ustadz di halaman Intisari (DB app, pola `/api/kutipan`; menyusul).

## Catatan hasil

*(2026-10-24, PR #138, ADR-099; di-merge ke `main` sebagai `4ffb9ab` pukul 23:21 UTC atas permintaan pemilik. CI commit terakhir `6af024a` hijau semua: `verify`, `eval retrieval`, `preview` (e2e + axe), `preview mcp`.)*

**Dibuat:**
- **core:** `DigestView.evidence` (aditif) = dalil dari jangkar gagasan yang tampil:
  - ayat = `passage_ayah_ref` yang beririsan dengan jangkar + `quranForRefs`;
  - hadits = penanda takhrij milik jangkar (`markerInAnchor`) + `takhrijLabel` (`rule_extracted`) + teks takhrij asli.
- **core + db, jalur Cari `digest`:** gagasan dipetakan ke jangkar seq terkecil; gagasan yang ditolak atau tanpa jangkar disaring sebelum diberi peringkat. Opt-in `searchText(…, { digest: true })` untuk Cari situs, MCP, dan eval retrieval; Jawab tidak. Korpus tanpa indeks: satu kueri gagal per isolate lalu diingat. `SEARCH_RESULT_VERSION` 3, `digestPermalink`, `getDigestHeadersOnPath`.
- **web, rute:** hub `/kitab/<karya>/intisari`, `/kitab/<karya>/bab/<id>/intisari` (ISR on-demand, 404 di skema < 9 atau tanpa Intisari), dan `/dev/intisari` (fixture tanpa D1; var `DEV_PAGES` "1" hanya di Preview).
- **web, komponen** `components/intisari/*`:
  - label AI (model, versi prompt, tanggal, status);
  - gagasan bernomor + lencana sikap + anjuran dengan catatan "tanyakan kepada ulama";
  - Dasar teks → `#pN`;
  - kartu kutipan (`data-quote-range` untuk e2e) dengan takhrij-nya sendiri (`DigestQuoteView.takhrij`) atau "status belum diketahui"; riwayat sangat lemah/palsu/tanpa asal ditahan (`weak_report`);
  - istilah, dalil, "Uji pemahaman" terlipat;
  - penutup + "Lanjut ke teks lengkap" + catatan guru;
  - daftar Intisari Bab (tata letak Kitab);
  - slot ▶ untuk X17.
- **web, pembaca:**
  - kartu Ringkasan AI + "Intisari AI · N gagasan · ± M menit · Buka Intisari" (`PageModel.digests`, `PAGE_MODEL_VERSION` 7);
  - menu ⋮ "Buka Intisari bagian ini/kitab ini" (ikut halaman sambungan);
  - lencana daftar isi (penanda, bukan tautan kedua);
  - tombol "Intisari kitab ini" di halaman karya;
  - kartu Cari gagasan.
- Tanda "sudah dibaca" (localStorage `surau:intisari:read:v1`) tercatat di `/privasi`.
- **MCP:** tool `get_section_digest` (delapan tool), `search_text` ikut jalur gagasan, instruksi butir 7.

**Bukti:**
- Tes:
  - unit core/db/mcp lolos (termasuk dalil, jalur `dp`, memo, tool MCP);
  - unit web 52 lolos (halaman fixture, kartu ringkasan, model halaman, kepala, tanda baca);
  - e2e `intisari.spec.ts` lokal 12 lolos / 2 dilewati (staging tanpa data), termasuk axe terang + gelap dan urutan heading di desktop + ponsel;
  - CI PR #138: `verify` dan `eval retrieval` hijau.
- Staging (skema 7) lewat `pnpm dev:remote` dan Preview: hub dan halaman Intisari 404; pembaca dan halaman karya tanpa lencana atau tautan.

**Peninjau:** 1 blocker (`uji-mcp.sh` masih 7 tool), 3 penting (takhrij per kutipan, `/api/halaman` di skema < 9, jalur cadangan Cari di D1 sungguhan), dan 10 kecil. Semua dikerjakan sebelum merge (lihat LOG).

**Belum / utang:**
- Data nyata: staging masih `ihya-v8` skema 7, dan X15b langkah 9 belum berjalan. Butir 1–2 "Selesai bila" dan e2e "dengan Intisari" (membandingkan kutipan dengan `/api/kutipan`) baru teruji sesudah pilot dimuat. Deploy ulang Preview sesudahnya (memo isolate + ISR).
- Label hadits tinjauan ustadz (DB app) di halaman Intisari menyusul (di luar cakupan).
- `eval:retrieval --gate` diulang sesudah data nyata (gerbang X15c), karena jalur gagasan baru berpengaruh bila indeksnya terisi.
- X17 mengisi `ListenSlot` (kontrak di catatan bersama dan ADR-099 butir 9).

**Pesan untuk sesi berikutnya:** sesudah X15b memuat pilot ke staging, buka Preview baru (push kosong ke PR mana pun), lalu jalankan `pnpm test:e2e` dengan `BASE_URL` Preview. Tes "dengan Intisari" akan aktif sendiri.
