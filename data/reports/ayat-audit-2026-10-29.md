# Audit lafaz ayat tanpa penanda · Ihya · 2026-10-29

Sesi X28, keputusan [ADR-133](../../implementasi/keputusan/ADR-133.md). Laporan ini tidak memuat teks kitab. Daftar vonis (ID paragraf, offset, nomor ayat, catatan) ada di [ayat-audit-2026-10-29-vonis.tsv](ayat-audit-2026-10-29-vonis.tsv).

## Cara

1. `pnpm ayat:audit --korpus produksi` (`tools/ingest/src/quran/audit.ts`) membaca semua paragraf badan Ihya di D1 produksi (hanya SELECT) dan Tanzil simple-clean lokal. Tidak ada LLM.
2. Setiap paragraf dicari deret ≥ 3 kata yang juga deret di mushaf. Pembanding memakai kerangka kata tanpa alif. Deret yang menimpa `passage_ayah_ref` yang sudah ada dilewati.
3. Kelas: **kuat** (≥ 5 kata, atau 4 kata dengan ≤ 2 letak di mushaf atau pengantar ayat), **sedang** (4 kata, atau 3 kata dengan pengantar dan ≤ 3 letak), **lemah** (sisanya, kebanyakan frasa umum).
4. Kode menebak jenis (`guessKind`): formula bila cocok daftar `FORMULAS`, kutipan bila ada pengantar atau ≥ 7 kata, selain itu iqtibas.
5. Calon kuat/sedang bertebakan kutipan (278) diverifikasi lima agen Sonnet dengan konteks segar. Sampel acak 60 dari tebakan iqtibas diverifikasi satu agen lagi. Baris "formula" yang mungkin ayat yang dibaca (24) ditinjau ulang dengan kriteria ADR-133 yang dipertegas: ayat yang dibaca utuh apa adanya (bacaan salat, doa berlafaz ayat, ayat yang dibaca Nabi dalam hadits) dihitung kutipan.

## Angka

| | Jumlah |
|---|---|
| Calon kuat | 709 |
| Calon sedang | 280 |
| Calon lemah (tidak ditinjau) | 4.364 |
| Paragraf dengan calon kuat/sedang | 768 |

Tebakan kode atas calon kuat/sedang: formula 242, iqtibas 469, kutipan 278.

**Vonis agen atas 278 tebakan kutipan:**

| Vonis | Jumlah |
|---|---|
| kutipan | 101 |
| iqtibas | 37 |
| formula (zikir, doa, matan hadits) | 59 |
| bukan ayat (kebetulan) | 81 |

**Sampel 60 dari 469 tebakan iqtibas:** iqtibas 19, formula 22, kutipan 10, bukan 9.
- Jadi tebakan iqtibas dari kode hanya tepat ±32%.
- Sekitar 17% ternyata kutipan. Bila proporsi ini berlaku untuk semuanya, ada **±70 kutipan lagi** di 409 tebakan iqtibas yang belum diverifikasi.

**Hasil terverifikasi saat ini** (berkas vonis):
- 112 kutipan: 101 + 10 dari sampel + 1 istirja' yang diubah sesuai ADR-133 butir 1;
- 56 iqtibas (termasuk 10000386 dari daftar tunda, dinilai agen utama).

## Temuan

- **Kutipan yang terlewat memang ada dan cukup banyak.** Ada ±100 paragraf dengan lafaz ayat yang disajikan sebagai Al-Qur'an tetapi tanpa `passage_ayah_ref`. Terjemahan AI Indonesia yang tayang menerjemahkan lafaz itu dengan model, bukan dengan Kemenag. Ini yang diperbaiki X29.
- **Tebakan kode kasar.** "Bukan ayat" tinggi (81/278) karena deret 3–4 kata seperti "yaum al-qiyamah tsumma" muncul di mushaf dan di prosa biasa. Patch ayat tidak boleh dibuat dari tebakan kode tanpa verifikasi.
- **Formula dan matan hadits** adalah kelompok terbesar di sampel iqtibas. Contohnya tahlil, doa wudu, nama surat bacaan salat, dan potongan sabda Nabi yang berlafaz mirip ayat.
- **Nomor ayat dari agen perlu dicek ulang oleh kode.** Agen beberapa kali mengoreksi letak tebakan pencocok (mis. 19:59, bukan 7:169; 64:15, bukan 8:28; 24:35 untuk parafrase ayat cahaya). Lafaz yang sama bisa ada di beberapa surat (6:4/36:46, 5:54/57:21/62:4). X29 harus memvalidasi setiap entri terhadap Tanzil.
- **Kasus perbatasan:** doa iftitah (6:79), doa saat melihat Ka'bah (27:59), zikir dari 39:46 dan 60:4, dan istirja'. Semua kini dihitung kutipan karena dibaca sebagai lafaz ayat. Satu-dua baris bisa dinilai lain oleh ustadz. ADR-133 meminta tinjau ulang bila beda lebih dari 10%.

## Belum dicakup

- 409 tebakan iqtibas dan 242 tebakan formula yang belum diverifikasi agen.
- 4.364 calon lemah.
- Paragraf catatan kaki (takhrij) tidak diaudit.

## Akibat untuk terjemahan Inggris

Daftar tunda [data/terjemah/tunda-en.md](../terjemah/tunda-en.md) dibagi ulang:
- 3 paragraf berisi kutipan (10000385, 10000693, 10000765) menunggu X29;
- 9 paragraf iqtibas boleh diterjemahkan sekarang.
