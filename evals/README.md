# Eval Surau

Set soal untuk mengukur mutu Surau secara objektif. Prinsip dan metrik: [docs/06-evaluasi.md](../docs/06-evaluasi.md). Keputusan: ADR-015 (eval buatan sendiri) dan ADR-045 (eval retrieval S15).

| Folder | Isi | Di git? |
|---|---|---|
| `retrieval/` | Soal publik eval pencarian (`*.jsonl`, ID berawalan `r`) | ya |
| `jawab/` | Draf soal Jawab publik; [panduan runner](jawab/README.md) | ya |
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
- `--gate`: keluar dengan kode 2 bila set resmi belum lolos gerbang R2 (≥ 20 soal disetujui dan hit@10 ≥ 90%); galat lain keluar 1. Dengan `--gate` berkas soal privat wajib ada, kecuali diberi `--publik-saja` (dipakai CI bila unduhan R2 gagal). Dipakai `/rilis` dan CI.

Hasil benar = halaman hasil yang masuk rentang lokasi benar, atau memuat paragraf cocok di bagian lokasi benar. hit@k dan MRR dihitung atas 50 halaman pertama (`limit` maksimum `searchText`), per jenis soal, per bahasa kueri (menurut hurufnya: arab, indonesia, campuran), dan per set. Hasil tanpa peringkat (kueri Arab yang semua katanya sangat umum, urutan kitab) dihitung gagal.

## Soal privat (holdout)

Sekitar sepertiga soal disimpan privat supaya tidak bocor ke data latih model dan tidak di-*overfit* saat pengembangan. Laporan, ringkasan CI, dan pesan galat runner hanya menampilkan ID, jenis, dan peringkatnya, tanpa teks soal.

Aturan holdout (ADR-045):
- Kegagalan soal privat hanya dianalisis per kategori (kosakata, normalisasi, peringkat). Perbaikan dirancang, diuji, dan dijelaskan memakai soal publik; teks soal privat tidak pernah ditulis di kode, tes, komentar, pesan commit, atau dokumen.
- Soal privat yang terlanjur dipakai untuk merancang perbaikan, atau yang topiknya tertulis di tempat publik, dianggap terbakar: dipindah ke set publik (ID `r` baru), lalu bila perlu diganti soal privat baru yang ditulis sebelum pernah dijalankan. Contoh 2026-10-17: p03 → r03 (pengganti p31) dan p12 → r12.
- Salinan teks soal privat retrieval hanya ada di `evals/private/` (mesin pemilik), R2 `surau-evals`, dan halaman tinjauan T-12 (artifact claude.ai privat milik pemilik). Jangan membuat salinan baru tanpa mencatatnya di sini.

- Salinan resmi ada di R2 bucket privat `surau-evals` (akses r2.dev mati). Setiap revisi diunggah sebagai berkas baru (tidak menimpa): `retrieval/<tanggal>-<status>.jsonl`. Kunci yang berlaku ditulis di `PRIVATE_KEY` pada `.github/workflows/eval.yml`.
- Mengambil ke mesin ini:

```bash
pnpm wrangler r2 object get surau-evals/retrieval/2026-10-17-resmi-2.jsonl --file evals/private/retrieval.jsonl --remote
```

- Mengunggah revisi baru (nama berkas baru, lalu perbarui `PRIVATE_KEY`):

```bash
pnpm wrangler r2 object put surau-evals/retrieval/<tanggal>-<status>.jsonl --file evals/private/retrieval.jsonl --content-type application/x-ndjson --remote
```

## CI

Workflow `eval.yml` (non-blocking) menjalankan `eval:retrieval --remote --gate` atas staging setiap PR/push yang menyentuh `packages/text`, `packages/db`, `packages/core`, `tools/eval`, atau `evals/`. Hasilnya ada di Summary job; bila gagal atau di bawah gerbang, muncul peringatan tanpa memblokir merge.

## Penyimpanan privat S18

18 soal Jawab baru berada di `evals/private/jawab.jsonl`. Arsip/SQL/plan/judge lokal berada di `evals/private/jawab-runs/`; ekspor tinjauan harus disimpan di folder privat ini. Jangan menaruh salinannya di artifact publik atau log CI.

Cadangan sudah diunggah ke R2 privat `surau-evals/jawab/2026-10-19-draf-v1.jsonl`; antrean `s18-tinjau-v1` tersimpan di D1 `surau-app` yang hanya dibaca melalui Access `/tinjau`. Pemilik mengizinkan kedua penyimpanan privat pada 2026-10-19. Unggahan R2 selesai tanpa menimpa kunci lama; pengisian D1 selesai setelah migrasi/deploy PR #48. Agregat terverifikasi: 60 soal, 18 privat, 30 contoh kalibrasi; 0 review saat seed.

Batch kalibrasi hanya mengirim **30 contoh publik** dan potongan sumber kitab ke Anthropic atas izin pemilik (pagu US$1); tidak mengirim 18 holdout. Sejak #69 hal ini dijaga kode: `judge-plan` (yang sudah memanggil `countTokens`, artinya isi soal sudah terkirim ke Anthropic) dan `judge-submit` menolak arsip yang memuat jawaban privat, kecuali dengan `--termasuk-privat`. Opsi itu hanya dipakai dengan izin pemilik, dan salinan barunya wajib dicatat di bagian ini. Untuk judge, buat arsip dengan `baseline --publik-saja`. Plan dan hasil yang memuat sumber disimpan privat. Salinan server Anthropic mengikuti kebijakan retensi API vendor, terpisah dari app. Retensi app 12 bulan, expiry baca aktif, penghapusan fisik manual sampai S20. Inventaris ini wajib diperbarui bila dibuat salinan lain.

**S19 (2026-10-20, izin pemilik di chat: biaya ≤ US$3 termasuk holdout sekali):** `eval:jawab answer` menjalankan pipeline Jawab (sama dengan Worker `surau-api`) dan mengirim **teks pertanyaan** + paragraf Ihya kandidat ke Anthropic (klien langsung, `.env`). Soal publik v1–v5 dipakai untuk iterasi prompt. **18 holdout dikirim sekali** (`s19-holdout-v4`, prompt `answer@4`) dan hanya dibaca agregatnya; holdout tidak dikirim ke judge. Judge `s19-publik-v4-judge` hanya memuat 42 soal publik. Arsip per soal (`evals/private/jawab-runs/s19-*`, termasuk `*-diagnostik-publik.jsonl` tanpa soal privat) tetap lokal privat dan belum disalin ke R2. Laporan agregat: `evals/reports/jawab-s19-*.md`.

**X03 (2026-10-21, izin pemilik di chat):** satu run publik `x03-publik-lokasi-v1` (42 soal publik, tanpa holdout; teks pertanyaan + paragraf Ihya kandidat dikirim ke Anthropic). Arsip di folder privat yang sama. `eval:jawab kandidat` hanya membaca arsip diagnostik publik dan tidak memanggil LLM.

**X05 (2026-10-21, izin pemilik di chat):** `x05-publik-jawaban-v1` (42 soal publik) dan ulangan `x05-publik-tolak-v1` (8 soal jebakan publik), tanpa holdout; teks pertanyaan + paragraf Ihya kandidat dikirim ke Anthropic (panggilan jawaban saja). `eval:jawab answer --rute <diagnostik>` memakai ulang rute routing arsip publik, jadi tidak ada panggilan routing; arsipnya bertanda `+rute-tersimpan` dan biaya/latensinya tanpa routing. `--rute` ditolak bersama `--termasuk-privat`. Arsip di folder privat yang sama.

**X06 (2026-10-21, izin pemilik di chat):** satu run publik `x06-publik-takhrij-v1` (42 soal publik, tanpa holdout, rute dari `x05-publik-jawaban-v1`; teks pertanyaan + paragraf Ihya kandidat dikirim ke Anthropic). Arsip di folder privat yang sama. `eval:jawab hadits` dan `eval:takhrij` gratis dan tidak memanggil LLM.

**Agent pengganti ustadz (2026-10-26, ADR-105, izin pemilik di chat):** tanpa panggilan LLM. 42 jawaban `x06-publik-takhrij-v1` diekspor dari `answer_log` `surau-app` ke `evals/private/jawab-runs/x06-publik-takhrij-v1-answer-log.jsonl`. Penilaian agent per jawaban (`x06-agent-nilai-2026-10-26.jsonl`) dan per soal holdout (`evals/private/jawab-agent-tinjau-2026-10-26.jsonl`) disalin ke R2 `surau-evals/jawab-runs/x06-agent-nilai-2026-10-26.jsonl` dan `surau-evals/jawab/2026-10-26-tinjau-agent-privat.jsonl` (kunci baru). Teks 18 holdout dibaca satu subagen sesi Claude Code (diproses Anthropic seperti percakapan agent, tanpa API terpisah); subagen itu hanya melaporkan ID + kategori ke sesi induk. Penilaian soal publik di `jawab/tinjauan/agent-2026-10-26.jsonl` (subfolder, supaya tidak terbaca sebagai berkas soal). Jangan memakai berkas agent ini sebagai `--reviews`/golden resmi.

Pemulihan holdout memakai:

```bash
pnpm wrangler r2 object get surau-evals/jawab/2026-10-19-draf-v1.jsonl --file evals/private/jawab.jsonl --remote
```

Ambil hanya bila file lokal belum ada. Jangan menimpa revisi lokal atau kunci R2 yang sudah dipakai laporan. Golden set resmi belum tersedia: semua 60 soal S18 masih draf sampai T-24.

Ulasan agent sementara S18 tersimpan di D1 dengan identitas Agent QA S18; arsip `s18-agent-qa-v1-{reviews,export}.jsonl` dan SQL berada di `evals/private/jawab-runs/`. Ekspor lokal hanya memuat snapshot dan ulasan agent, bukan seluruh ulasan produksi. [Laporan agregat](reports/jawab-s18-agent-qa-v1.md) tidak memuat isi holdout.
