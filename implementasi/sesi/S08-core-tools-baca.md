# S08 · Core tools baca (`packages/core`)

> **Fase:** 1 · **Status:** selesai* (2026-10-16; *butir 4 lewat tafsiran ADR-033 butir 2)
> **Prasyarat:** S07 selesai (D1 lokal berisi Ihya) · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent

## Tujuan

Satu-satunya pintu ke data untuk membaca: fungsi bertipe yang mengembalikan teks mentah dari DB beserta sitasi lengkap. Fungsi ini nanti dipakai bersama oleh web (S09), MCP (S16), dan Jawab (S19).

## Baca dulu (hanya ini)

- ARSITEKTUR-TEKNIS §4 (daftar core tools) dan §3.3 (permalink), serta ADR permalink dari S06.
- `.claude/rules/teks-arab.md`, bagian *Aturan keras*.
- KONVENSI: *Struktur* (core tanpa `next/*` atau `cloudflare:*`) dan *TypeScript* (Zod di batas).
- `/docs-terbaru zod` (v4).

## Langkah

1. Buat `packages/core` (`@surau/core`), bergantung pada `@surau/text`, `@surau/db`, dan `zod`.
2. Buat skema Zod untuk input dan output: `Citation` (karya, edisi, juz, halaman, permalink, lisensi/atribusi), `Passage` (id, kind, `text_raw`, penanda catatan kaki), `TocNode`, `PageView`, dan `SectionView` (dengan cursor paginasi).
3. Buat fungsi berikut:
   - `listWorks`, `getWork`
   - `getToc(editionId, nodeId?, depth?)`
   - `readPage(editionId, juz, pageNo)`: paragraf badan teks + catatan kaki + tautan penanda→catatan kaki.
   - `readSection(nodeId, cursor?)`: paginasi berdasarkan perkiraan ukuran ±4–6 ribu token, dengan heuristik karakter yang dicatat.
   - `buildCitation`
4. Setiap keluaran memuat `text_raw` persis dari DB. **Tidak ada** transformasi teks di core selain pemisahan struktur.
5. Error bertipe: `NotFound` dan `InvalidCitation`, dengan pesan yang tidak membocorkan internal.
6. Tes dengan `@cloudflare/vitest-plugin` terhadap D1 lokal (fixture kecil dari S06), ditambah satu tes integrasi opsional terhadap DB lokal berisi Ihya penuh. Tes integrasi ini memakai D1 lokal bersama (`getPlatformProxy` dengan `persist` yang sama, ARSITEKTUR §7) dan dilewati bila DB tidak ada, misalnya di CI.
7. Kontrak stabil: bentuk keluaran ini akan menjadi kontrak MCP. Tulis contoh JSON keluaran di README paket.

## Selesai bila

- [x] Semua fungsi baca punya tes unit dan lolos: `pnpm exec vp test --project core` → 48 tes (11 file, workerd); query baru di `@surau/db` → 55 tes `--project db`
- [x] `readPage` untuk juz 1 halaman 200 (DB lokal Ihya) mengembalikan teks dan catatan kaki takhrij yang benar (dicek manual dengan sumber, dicatat di LOG tanpa menyalin teks panjang): dibandingkan dengan Shamela 9472 (readOnly) + tes integrasi `packages/core/test/local/ihya.test.ts`
- [x] `readSection` mempaginasi bagian terpanjang Ihya tanpa memotong di tengah paragraf: node 100180 (4.608 paragraf, 1.683.966 karakter) → 278 potongan, setiap paragraf tepat sekali dan `text_raw` sama dengan DB
- [x]* Setiap keluaran punya `Citation` lengkap; README paket berisi contoh keluaran. *`readPage`/`readSection`/`getToc` punya `citation`; paragraf membawa `location` (sitasi penuh = `citation.source` + `location`, atau `buildCitation`); `listWorks`/`getWork` tidak berhalaman, jadi hanya lisensi + atribusi per edisi (ADR-033 butir 2)
- [x] `packages/core/src` (di luar file tes) tidak mengimpor `next/*`, `cloudflare:*`, atau `node:*`: `grep -rn --exclude='*.test.ts' -E "from ['\"](next/|cloudflare:|node:)" packages/core/src` kosong (exit 1)
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Pencarian (S11). UI (S09). MCP (S16).

## Catatan hasil

**Yang dibuat**
- `packages/core` (`@surau/core`): `listWorks`, `getWork`, `getToc`, `readPage`, `readSection`, `buildCitation`; skema Zod masukan + keluaran (`src/schema.ts`, calon kontrak MCP, bisa diubah ke JSON Schema); error bertipe `NotFound`/`InvalidCitation`; permalink ADR-029 sebagai path relatif; cursor base64url. README berisi contoh JSON dari Ihya (teks kitab diganti "…").
- `@surau/db`: `getEditionContext`, `listEditions`, `listWorkAuthors`, `listTocNodes`, `getSectionPassages`, `getPassageById`, `getNeedsReview` (repository `passage_needs_review` yang dijanjikan ADR-032).
- Tes: project Vitest `core` (workerd, fixture S06 + bagian panjang sintetis) dan tes integrasi Ihya di project `node` (`getPlatformProxy` pada salinan state di folder sementara; dilewati di CI).
- Dependensi baru: tidak ada di luar catalog. `@surau/core` memakai `zod`, `@surau/db`, `@surau/text` (belum diimpor; untuk S11), dan devDependency yang sama dengan `packages/db` + `@types/node`/`wrangler` untuk tes integrasi.

**Penyimpangan dari rencana (ADR-033)**
- Tanda tangan: `db` parameter pertama; `getToc(db, editionId, { nodeId?, depth? })`; `buildCitation(db, passageId)`; `readSection` memuat node **beserta subpohonnya**. ARSITEKTUR §4 diperbarui.
- Paginasi per **blok** (paragraf badan + catatan kaki yang pertama dirujuknya), bukan per halaman utuh: potong di batas halaman bila jatuh di 4–6 ribu token, kalau tidak di antara blok. Percobaan per halaman utuh memberi 38% potongan <4.000 token.
- Di luar cakupan: `apps/web/next.config.ts` kini memberi proxy dev path `.wrangler/state/v3` (sebelumnya tanpa `v3`, sehingga web kelak melihat D1 kosong). ARSITEKTUR §7 aturan 1–2 diperbarui.

**Utang teknis**
- Heuristik 1 token ≈ 2 karakter JSON belum dikalibrasi dengan `count_tokens` (S16).
- Cakupan baris `packages/core` belum terukur (coverage v8 tidak jalan di workerd, sama dengan ADR-029). Plugin 1.4.3 menyebut perbaikannya; coba saat Dependabot mengusulkan.
- Takhrij yang dipotong dari matan (tanpa `footnote_ref`) ikut blok terakhir halaman, bukan paragraf asalnya; di halaman terbelah bisa muncul satu potongan sesudah matannya.
- Penanda ke catatan kaki milik node lain belum dijaga invarian ingest (Ihya: 0).
- `getSectionPassages` membaca seluruh subpohon sebelum `LIMIT` (Rub': ±4.600 baris per panggilan).

**Pesan untuk S09**
- Pakai `readPage`/`getToc`/`readSection` langsung dengan `env.CORPUS_DB`. Kode `NotFound` → 404, `InvalidCitation` → 400; `uintSegment` untuk segmen angka URL.
- Validasi kepemilikan edisi untuk `/kitab/ihya/bab/<id>` di rute: bandingkan `citation.source.work.slug` dan `edition.is_default` dengan URL; edisi non-default memakai `/kitab/ihya@<slug>/bab/<id>`.
- `pnpm dev` sudah membaca D1 lokal yang sama dengan `corpus:load:local` (`.wrangler/state/v3`) begitu binding D1 ditambahkan.
- `needs_review` per paragraf sudah ada di keluaran (untuk penanda "perlu ditinjau" di UI).
