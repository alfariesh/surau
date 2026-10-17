# Sumber data Surau

Berkas sumber yang dibaca pipeline ingest beserta versi dan sha256-nya. Berkas-berkas ini **tidak** masuk git (`data/raw/` dan drive Shamela pemilik); yang di-commit hanya catatan ini. Ingest memeriksa sha256 OpenITI dan sumber Al-Qur'an, dan gagal bila berbeda dari yang tercatat di sini (`tools/ingest/src/works/ihya.ts`, `tools/ingest/src/quran/source.ts`). Rantai lisensi: [ATTRIBUTION.md](ATTRIBUTION.md).

## OpenITI (dipin ke commit, diunduh 2026-10-16)

Repo `OpenITI/0525AH`, commit `e8dddd44c7998cefce72e4f37fad471634dd9d1e` (rilis 2025.1.9). Disimpan di `data/raw/openiti/`.

| Berkas | Byte | sha256 |
|---|---|---|
| `0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed` | 7.968.487 | `e60d73c72033e5ca1be5ac3bf52f5fa5057aa4a3d1c750f26b9301b6b97e8997` |
| `0505Ghazali.IhyaCulumDin.JK000001-ara1` | 9.470.821 | `0780031c3e4a55b65bdf45d7cca890869757cbedaa46a21273e9378428466018` |

Cara mengunduh ulang (dari root repo):

```bash
mkdir -p data/raw/openiti && cd data/raw/openiti
B=https://raw.githubusercontent.com/OpenITI/0525AH/e8dddd44c7998cefce72e4f37fad471634dd9d1e/data/0505Ghazali/0505Ghazali.IhyaCulumDin
curl -fLO "$B/0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed"
curl -fLO "$B/0505Ghazali.IhyaCulumDin.JK000001-ara1"
shasum -a 256 0505Ghazali.IhyaCulumDin.*
```

## Shamela lokal (drive pemilik, hanya-baca, T-09)

Lokasi `/Volumes/Elfariesh/database`. Tidak didistribusikan; dipakai untuk struktur dan diverifikasi terhadap OpenITI (ADR-018).

| Berkas | Byte | sha256 |
|---|---|---|
| `book/472/9472.db` (Ihya) | 11.022.336 | `36e66c5498b74e6d4fd7542108a29327361cf45534794d1c5a878e7bc2b7d586` |
| `update/master/book.sqlite` | 11.882.496 | `acccdb02d46b80e21eab5da4127bf42b46020f5d09e727c477d1095eb8aa8794` |
| `update/master/author.sqlite` | 8.933.376 | `0397cfc1f0c8d6dc61e13c0688e089d33f97aac6be981e3588368f49295a8a54` |

sha256 `9472.db` juga tercatat di `meta.source_hash` korpus dan di [reports/ihya-9472-validasi.md](reports/ihya-9472-validasi.md).

## Al-Qur'an: Tanzil 1.1 (diunduh 2026-10-17, S12)

Teks ayat (CC BY 3.0, hanya verbatim). Disimpan di `data/raw/tanzil/`; sha256 dipin di `tools/ingest/src/quran/source.ts` (ingest gagal bila berbeda). Format XML dipakai karena basmalah pembuka surah ada di atribut `bismillah` terpisah (format teks menempelkannya ke ayat 1).

| Berkas | Byte | sha256 |
|---|---|---|
| `quran-uthmani.xml` (tampilan) | 1.516.178 | `203f0f1bf3158b1e5be4ab9f8f6870e570aab6d9a626fe6192a70b75d4afe0fd` |
| `quran-simple-clean.xml` (pencocokan kutipan) | 926.476 | `140787b7c399b11d54bfa72c237075916084232efa8a4cddf704cc8a2a74b1fe` |

Cara mengunduh ulang (dari root repo; tanpa opsi tanda waqaf/sajdah/tatweel):

```bash
mkdir -p data/raw/tanzil && cd data/raw/tanzil
curl -fsS -o quran-uthmani.xml 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=xml&agree=true'
curl -fsS -o quran-simple-clean.xml 'https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=xml&agree=true'
shasum -a 256 quran-*.xml
```

## Al-Qur'an: terjemahan dan transliterasi Kemenag (salinan pemilik, S12)

Diekstrak pemilik dari dump database Surau lama (tabel Al-Qur'an saja, tanpa data pengguna) ke folder `surau-quran-kemenag` pada 2026-10-17, lalu disalin ke `data/raw/kemenag/`. Asal data: Qur'an Kemenag (https://quran.kemenag.go.id), diimpor operator lama 2026-06-03. Keputusan pemakaian: ADR-040.

| Berkas | Isi yang dipakai | Byte | sha256 |
|---|---|---|---|
| `kemenag-terjemahan-id.json` | terjemahan 6.236 ayat + catatan kaki (678 ayat) | 1.867.230 | `6569af2c35183be2dec884ef2532bbeabf285959b9b8aa2d0b66a0e319aa6154` |
| `kemenag-transliterasi-latin.json` | transliterasi Latin 6.236 ayat | 971.483 | `bb02c07b9bad6b8fa006c4e10307eb043027b6a890f825b445585c93ad2e018e` |
| `surah.json` | nama Latin, jenis wahyu, jumlah ayat 114 surah (metadata QUL) | 68.590 | `2f527c1cfb93465cd1cdc17af54e136b2a4781c47ed7432754e28b17c04b5eec` |
| `quran-arab.json` | hanya nomor juz per ayat + cek silang penomoran (teks Arab QUL di berkas ini **tidak** dipakai) | 3.290.193 | `80d9cc72bece1381102caab7851f503c726f60e8605bf575bb5cf9e8889ba028` |

Tidak dipakai: pengantar surah QUL (`surah-info-id-QUL-bukan-terbukti-kemenag.json`, bukan dari Kemenag).

## Teks lisensi

| Berkas | Sumber | sha256 |
|---|---|---|
| [LICENSE](LICENSE) (bagian setelah garis) | https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt, diunduh 2026-10-16 | `e66c269d4819aaab34b49ef5220c4ddab6756f21bb5180761a4eb8561f2b7bbd` |

## Korpus D1 produksi

Versi korpus yang pernah dipasang di produksi (blue-green, ADR-005, ADR-036). Binding aktif: `CORPUS_DB` top-level di `apps/web/wrangler.jsonc`. DB di tabel ini **tidak pernah dihapus atau dimuat ulang** (`corpus:promote` dan `corpus:load` menolaknya); DB berstatus *rollback* adalah tujuan `pnpm run corpus:promote <versi> --switch-only`. Prosedur: [tools/ingest/README.md](../tools/ingest/README.md#korpus-produksi-blue-green).

| Versi | DB D1 (apac) | ID | Dibuat | sha256 build (`data/build/<versi>.sha256`) | `meta.built_at` | QA | Status |
|---|---|---|---|---|---|---|---|
| `ihya-v1` | `surau-corpus-ihya-v1` | `41e3033e-3aa0-456c-9d60-b8967f57e89d` | 2026-10-16 (S10) | `2d2d87d732c37e3f8fdc7beda1209965a28d63f6bd2c1ab3f06069668d3caf68` | 2026-10-16T12:55:55Z | 30/30 ([laporan](reports/ihya-9472-qa-surau-corpus-ihya-v1.md)) | **aktif** |

Sebelum `ihya-v1`, produksi menunjuk korpus staging dengan pembaca tertutup (ADR-034), jadi `ihya-v1` belum punya target rollback: bila bermasalah, pakai **tutup darurat** (`READER_ENABLED = "0"` lewat PR). Korpus staging tidak pernah menjadi produksi karena isinya dimuat ulang setiap sesi (S11: FTS; S12: `ihya-v3` dengan tabel ayat, skema 5, sha256 build `c8940386758696e9d4cc6e421c4a8cc9e28076bbd4d6594ecf2bf0b9148bbd80`).
