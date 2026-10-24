# Pencarian makna lokal (X13, ADR-093)

Prototipe gratis untuk mengukur apakah embedding membantu kandidat Jawab, sebelum membayar Workers AI + Vectorize. Bukan bagian pipeline, tidak dijalankan CI, dan dependensinya tidak dipasang di workspace.

- Model: `Xenova/bge-m3` ONNX q8 (`@huggingface/transformers` 4.3.1), model yang sama dengan `@cf/baai/bge-m3` di Workers AI, presisi lebih rendah. CLS + normalisasi, ≤ 512 token.
- Teks per paragraf (`mix`): terjemahan AI bila ada, selain itu Arab. Catatan kaki takhrij tidak punya terjemahan, jadi di-embed dalam bahasa Arab.
- 2026-10-24: 20.509 paragraf `ihya-v8`, ±2,17 juta token, 66 menit di CPU 16 inti.

Langkah (di folder kosong di luar repo, mis. scratchpad):

```bash
npm install @huggingface/transformers@4.3.1
# korpus.jsonl: ekspor {id, ar, tr} dari korpus staging (SELECT p.id, p.text_raw, t.text …), tidak masuk git
node embed.mjs korpus.jsonl . mix
node rank.mjs . <repo>/evals/jawab/ihya-draf-v1.jsonl makna-publik.jsonl mix
pnpm run eval:jawab kandidat --tanpa-rute --remote --semantik makna-publik.jsonl
```

Vektor (84 MB) disimpan di `data/build/makna/` (git-ignored). Peringkat 42 soal publik (hanya ID paragraf) ada di `evals/jawab/makna/x13-bge-m3-q8-publik.jsonl`. Soal privat hanya diberi peringkat dengan `--privat` untuk run holdout berbayar yang sudah diizinkan pemilik, dan keluarannya disimpan di `evals/private/`.
