# X16 · Sesi sisipan: UI Intisari (hub, halaman Intisari, pembaca, daftar isi, Cari, MCP)

> **Fase:** sisipan (`apps/web`, `apps/mcp`, `packages/core`, `packages/db` hanya jalur Cari) · **Status:** belum
> **Prasyarat:** X15a di-merge (kontrak `readDigest`/`DigestView`, ADR-097) · Tugas pemilik: T-30 (tinjau tampilan)
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

1. **Rute** (ISR on-demand: `revalidate=false`, `dynamicParams=true`, `generateStaticParams()=[]`; di korpus skema < 9 → `notFound()`):
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

- [ ] Hub dan halaman Intisari tampil di Preview dengan data staging. Di korpus skema 8 halaman ini `notFound`, tanpa lencana atau tautan.
- [ ] Teks Arab kutipan sama persis dengan `text_raw` (e2e membandingkannya dengan `/api/kutipan`), dan kutipan dengan sidik basi tidak tampil.
- [ ] Setiap gagasan punya minimal satu tautan "Dasar teks" yang membuka paragrafnya.
- [ ] Label AI ada di halaman Intisari, kartu pembaca, dan kartu Cari.
- [ ] e2e + axe lolos; LCP ≤ 4,29 dtk; `eval:retrieval --gate` tidak turun.
- [ ] `pnpm verify` lolos; peninjau; T-30 disetujui pemilik; STATUS, LOG, dan berkas sesi ini diperbarui.

## Di luar cakupan

- Pemutar audio (X17); di sini hanya slot tombolnya.
- Fitur belajar (jalur 40 hari, ulas, simpan kutipan, catatan pribadi): dicatat di FASE.
- Situs /en.
- Label hadits yang ditinjau ustadz di halaman Intisari (DB app, pola `/api/kutipan`; menyusul).

## Catatan hasil

*(diisi agent di akhir sesi)*
