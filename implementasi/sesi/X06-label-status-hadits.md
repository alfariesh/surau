# X06 · Sesi sisipan: status hadits dari label istilah takhrij

> **Fase:** sisipan Fase 4 (sesudah X05, sebelum `/rilis 4`) · **Status:** berjalan
> **Prasyarat:** S21, X03, X05 selesai · izin pemilik di chat untuk satu eval publik berbayar (±US$0,11)
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Syarat R4 "status hadits benar 100%" belum terbukti: sejak S21 status hadits ditulis model sebagai kalimat bebas, dan metrik eval mencocokkan string gold persis (selalu 0). Review ustadz (Anas, T-24) belum bisa diminta dalam waktu dekat, jadi status dibuat dari label per catatan kaki takhrij yang deterministik, bisa diaudit, dan mudah ditinjau nanti.

## Baca dulu (hanya ini)

- `.claude/rules/teks-arab.md` no. 1 dan 6, ADR-066 butir 1, ADR-052, ADR-068.
- `evals/README.md` (aturan holdout).

## Langkah

1. Kosakata label kecil yang tetap + pengenal frasa Arab baku al-'Iraqi (deterministik, dengan rentang mentah).
2. Ukur gratis: berapa dari 4.398 catatan kaki yang terlabel; periksa sampel acak.
3. Sisanya: batch AI dengan izin biaya bila perlu (ternyata tidak perlu, lihat ADR-069 butir 8).
4. Pipeline Jawab memakai label untuk status hadits; metrik eval status hadits berbasis label; `peninjau`; SATU eval publik berbayar setelah izin pemilik.
5. Antrean tinjauan label di `/tinjau`: tindak lanjut (di luar sesi ini).

## Selesai bila

- [ ] Persentase terlabel deterministik vs AI tercatat di ADR baru
- [ ] Label status di jawaban selalu dari tabel label + frasa Arab dari DB
- [ ] Kutipan valid tetap 100%
- [ ] Metrik status hadits eval publik tercatat sebelum/sesudah
- [ ] Biaya per jawaban tetap ±US$0,002–0,003
- [ ] `pnpm verify` lolos
- [ ] STATUS, LOG, dan file sesi ini sudah diperbarui
- [ ] PR di-merge (squash) setelah CI hijau

## Di luar cakupan

- Antrean tinjauan label di `/tinjau` dan label di tool MCP `get_hadith_takhrij` (tindak lanjut).
- Prompt jawaban (tidak diubah), pencarian/lokasi, kalibrasi judge, holdout.

## Catatan hasil

*(diisi agent di akhir sesi)*
