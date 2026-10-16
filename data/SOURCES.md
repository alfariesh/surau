# Sumber data Surau

Berkas sumber yang dibaca pipeline ingest beserta versi dan sha256-nya. Berkas-berkas ini **tidak** masuk git (`data/raw/` dan drive Shamela pemilik); yang di-commit hanya catatan ini. Ingest memeriksa sha256 OpenITI dan gagal bila berbeda dari yang tercatat di sini (`tools/ingest/src/works/ihya.ts`). Rantai lisensi: [ATTRIBUTION.md](ATTRIBUTION.md).

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

## Teks lisensi

| Berkas | Sumber | sha256 |
|---|---|---|
| [LICENSE](LICENSE) (bagian setelah garis) | https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt, diunduh 2026-10-16 | `e66c269d4819aaab34b49ef5220c4ddab6756f21bb5180761a4eb8561f2b7bbd` |
