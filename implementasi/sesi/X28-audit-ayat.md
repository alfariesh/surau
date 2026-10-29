# X28 · Audit lafaz ayat tanpa penanda

> **Fase:** Sisipan · **Status:** selesai
> **Prasyarat:** X27 (terjemahan Inggris Kitab al-'Ilm, 12 paragraf ditunda) · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent

## Tujuan

Seberapa banyak lafaz Al-Qur'an di Ihya yang tidak dikenali pencocok ayat, dan apa yang dilakukan terhadapnya: kutipan dipatch, iqtibas diberi rujukan, formula diabaikan (ADR-133).

## Langkah

1. Alat `pnpm ayat:audit` (`tools/ingest/src/quran/audit.ts`): hanya membaca D1 dan Tanzil, tanpa LLM.
2. Audit korpus produksi, lalu pemilahan dengan kode.
3. Verifikasi agen Sonnet: 278 tebakan kutipan, sampel 60 tebakan iqtibas, dan tinjau ulang 24 baris perbatasan.
4. ADR-133. Aturan 9 di `teks-arab.md` diperjelas. Skill `terjemah-inggris` diperbarui (plugin 0.2.3).
5. Laporan, daftar vonis, pembagian ulang daftar tunda Inggris, serta rencana X29 dan X30.

## Selesai bila

- [x] `pnpm verify` lolos
- [x] Laporan [data/reports/ayat-audit-2026-10-29.md](../../data/reports/ayat-audit-2026-10-29.md) dan daftar vonis tanpa huruf Arab
- [x] ADR-133, aturan 9, skill, dan plugin 0.2.3
- [x] `data/terjemah/tunda-en.md` dibagi: 3 kutipan, 9 iqtibas
- [x] Sesi X29 (patch ayat) dan X30 (rujukan iqtibas) ditulis
- [x] STATUS, LOG, dan file sesi ini sudah diperbarui

## Di luar cakupan

- Membuat patch dan memuatnya ke korpus (X29).
- Menerjemahkan 9 paragraf iqtibas yang ditunda (langkah lanjutan X27).

## Catatan hasil

- **Hasil audit:** 989 calon kuat/sedang di 768 paragraf. Terverifikasi 112 kutipan terlewat (±100 paragraf) dan 56 iqtibas. Diperkirakan ada ±70 kutipan lagi di tebakan iqtibas yang belum dicek.
- **Tebakan kode tidak bisa dipakai langsung:**
  - 81 dari 278 tebakan kutipan ternyata bukan ayat;
  - tebakan iqtibas hanya tepat ±32%.
- **Ayat yang dibaca dalam hadits:** agen cenderung menggolongkannya formula. Instruksi verifikasi harus menyebut tegas bahwa ayat yang dibaca utuh dihitung kutipan.
- **Nomor ayat dari agen** harus divalidasi kode terhadap Tanzil di X29, karena lafaz yang sama bisa ada di beberapa surat.
