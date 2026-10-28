# X24 · Halaman Faedah dan Jalur

> **Fase:** Sisipan · **Status:** belum
> **Prasyarat:** X23 selesai (pembangun baris konten dan migrasi korpus) · Tugas pemilik: WhatsApp Channel "Faedah Surau" (tugas baru saat sesi ini), izin promote
> **Perkiraan:** 1 percakapan agent

## Tujuan

Unit Faedah dan Jalur `siap` di `data/konten/` tampil di situs: halaman Faedah dengan tombol "Salin untuk WhatsApp" (teks pos dibuat kode) dan halaman Jalur 7 hari dengan centang selesai di perangkat.

## Baca dulu (hanya ini)

- [docs/09-konten.md](../../docs/09-konten.md) §5.3–5.4, [docs/redaksi-operasional.md](../../docs/redaksi-operasional.md), [ADR-123](../keputusan/ADR-123.md)
- Hasil X23 (pembangun baris dan gerbang build konten)

## Langkah

1. Migrasi korpus: tabel `faedah` (passage_id, section_id, judul, konteks, tema, asal) dan `jalur` + `jalur_hari` (slug, judul, deskripsi; hari, section_id, pengantar). Gerbang build sama dengan X23.
2. Halaman `/kitab/<karya>/faedah` (daftar) dan per butir: judul, terjemahan AI paragraf yang disalin kode (label "Terjemahan AI"), sitasi, tautan `#pN`, tombol **Salin untuk WhatsApp**. Teks pos: judul, terjemahan, "— al-Ghazali, Ihya' 'Ulum ad-Din, j. x, h. y (terjemahan AI, belum ditinjau)", tautan. Tanpa huruf Arab.
3. Halaman `/jalur/<slug>`: tujuh hari dengan pengantar, menit baca (dari kepala Intisari), tombol Baca Intisari dan Baca teks lengkap, centang selesai di `localStorage` (dicatat di `/privasi`), penafian "bukan pengganti guru". Tanpa streak, sertifikat, atau peringkat.
4. OG per Faedah dan per Jalur; sitemap; tautan dari beranda dan hub Intisari.
5. Build, staging, promote atas izin pemilik.

## Selesai bila

- [ ] `pnpm verify` lolos; tes teks pos WhatsApp (tanpa huruf Arab, sitasi lengkap, label AI)
- [ ] Faedah pilot dan Jalur Kitab al-'Ilm tampil di staging, lalu di produksi sesudah promote
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Pengiriman otomatis ke WhatsApp (pemilik memposting manual); kartu gambar (OG) bertulisan Arab.
