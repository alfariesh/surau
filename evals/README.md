# Eval Surau

Set soal untuk mengukur mutu Surau secara objektif. Prinsip dan metrik: [docs/06-evaluasi.md](../docs/06-evaluasi.md). Keputusan: ADR-015 (eval buatan sendiri) dan ADR-045 (eval retrieval S15).

| Folder | Isi | Di git? |
|---|---|---|
| `retrieval/` | Soal publik eval pencarian (`*.jsonl`, ID berawalan `r`) | ya |
| `private/` | Soal privat/holdout (`retrieval.jsonl`, ID berawalan `p`) | **tidak** (git-ignored; salinan di R2 `surau-evals`) |
| `reports/` | Laporan Markdown per run (`retrieval-<tanggal>-<korpus>[-label].md`) | ya |

## Format soal (satu soal per baris JSONL)

```json
{"id":"r01","pertanyaan":"Di mana al-Ghazali menjelaskan kewajiban seorang guru terhadap muridnya?","kueri":"kewajiban guru terhadap murid","lokasi_benar":[{"toc_node_id":100018,"label":"j1 h55"}],"jenis":"lokasi","catatan":"…","disetujui_oleh":null}
```

- `pertanyaan`: pertanyaan wajar untuk manusia. `kueri`: yang diketik pengguna di kotak Cari, dikirim apa adanya ke `searchText`.
- `lokasi_benar`: satu atau lebih lokasi. Bentuknya `{"toc_node_id", "label"}` (bagian daftar isi beserta seluruh turunannya; `label` = halaman awal bagian) atau `{"page_id", "sampai_page_id"?, "label"}` (rentang halaman cetak dalam satu jilid, mis. `"j2 h56–59"` dengan tanda pisah –). Runner mencocokkan `label` dengan DB dan gagal keras bila beda, supaya salah ketik ID tidak lolos diam-diam.
- `jenis`: `lokasi` (satu tempat pembahasan), `topik tersebar` (beberapa kitab; benar bila salah satunya muncul), atau `istilah` (istilah teknis, sering kueri Arab).
- `disetujui_oleh`: `null` = draf. Hanya soal yang disetujui pemilik/ustadz (T-12) masuk **set resmi** yang dinilai gerbang R2. Isi dengan nama dan tanggal, mis. `"Salman Alfariesh (pemilik), 2026-10-17"`.
- ID publik dan privat tidak boleh sama. ID tidak diubah setelah dipakai di laporan.

## Menjalankan

```bash
pnpm run eval:retrieval
```

- Membaca D1 lokal (`<root>/.wrangler/state/v3`, disalin dulu ke folder sementara; ARSITEKTUR §7). Isi dulu dengan `pnpm run db:migrate:local` + `pnpm corpus:load:local`.
- `--remote`: korpus **staging** lewat remote binding (`tools/eval/wrangler.jsonc`, dipakai CI). Tidak pernah menyentuh korpus produksi.
- `--label <nama>`: akhiran nama laporan. `--no-write`: tanpa berkas laporan. `--summary <berkas>`: tambahkan laporan ke berkas (CI: `$GITHUB_STEP_SUMMARY`).
- `--gate`: keluar dengan kode 1 bila set resmi belum lolos gerbang R2 (hit@10 ≥ 90%). Dipakai `/rilis` dan CI.

Hasil benar = halaman hasil yang masuk rentang lokasi benar, atau memuat paragraf cocok di bagian lokasi benar. hit@k dan MRR dihitung atas 50 halaman pertama (`limit` maksimum `searchText`), per jenis soal, per bahasa kueri, dan per set.

## Soal privat (holdout)

Sekitar sepertiga soal disimpan privat supaya tidak bocor ke data latih model dan tidak di-*overfit* saat pengembangan. Laporan dan ringkasan CI hanya menampilkan ID, jenis, dan peringkatnya, tanpa teks soal.

- Salinan resmi ada di R2 bucket privat `surau-evals` (akses r2.dev mati). Setiap revisi diunggah sebagai berkas baru (tidak menimpa): `retrieval/<tanggal>-<status>.jsonl`. Kunci yang berlaku ditulis di `PRIVATE_KEY` pada `.github/workflows/eval.yml`.
- Mengambil ke mesin ini:

```bash
pnpm wrangler r2 object get surau-evals/retrieval/2026-10-17-draf.jsonl --file evals/private/retrieval.jsonl --remote
```

- Mengunggah revisi baru (nama berkas baru, lalu perbarui `PRIVATE_KEY`):

```bash
pnpm wrangler r2 object put surau-evals/retrieval/<tanggal>-<status>.jsonl --file evals/private/retrieval.jsonl --content-type application/x-ndjson --remote
```

## CI

Workflow `eval.yml` (non-blocking) menjalankan `eval:retrieval --remote --gate` atas staging setiap PR/push yang menyentuh `packages/text`, `packages/db`, `packages/core`, `tools/eval`, atau `evals/`. Hasilnya ada di Summary job; bila gagal atau di bawah gerbang, muncul peringatan tanpa memblokir merge.
