# S08 · Core tools baca (`packages/core`)

> **Fase:** 1 · **Status:** belum
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

- [ ] Semua fungsi baca punya tes unit dan lolos
- [ ] `readPage` untuk juz 1 halaman 200 (DB lokal Ihya) mengembalikan teks dan catatan kaki takhrij yang benar (dicek manual dengan sumber, dicatat di LOG tanpa menyalin teks panjang)
- [ ] `readSection` mempaginasi bagian terpanjang Ihya tanpa memotong di tengah paragraf
- [ ] Setiap keluaran punya `Citation` lengkap; README paket berisi contoh keluaran
- [ ] `packages/core/src` (di luar file tes) tidak mengimpor `next/*`, `cloudflare:*`, atau `node:*`: `grep -rn --exclude='*.test.ts' -E "from ['\"](next/|cloudflare:|node:)" packages/core/src` kosong
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Pencarian (S11). UI (S09). MCP (S16).

## Catatan hasil

*(diisi agent)*
