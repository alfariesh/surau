# 07 · Roadmap

| Versi | Isi | Syarat lanjut |
|---|---|---|
| **v1a: Ihya, mode Cari** | Ingest Ihya dari Shamela lokal (pohon diperbaiki, takhrij ditautkan, teks mentah + ternormalisasi). Batch sekali jalan: ringkasan Indonesia + Inggris per bagian. Core tools (`daftar_isi`, `baca_bagian`, `cari`, `status_hadits`). UI pencarian + pembaca kitab. Terjemahan Indonesia per paragraf lewat batch Haiku 5.5 (±$0,5 untuk seluruh Ihya). **Tanpa LLM per pertanyaan.** | Lokasi benar ≥ 90% pada set eval retrieval |
| **v1b: Ihya, mode Jawab** | Haiku 5.5: memilih bagian dari daftar isi yang di-cache, lalu menjawab dengan Citations (dokumen *custom content* per paragraf). Fallback Sonnet 5.5 bila terjadi refusal. Uji Jev sebagai gerbang "tidak ditemukan" dan cek sitasi. Set eval 50–100 soal bersama ustadz; model murah vs. frontier diadu. Pengaman anggaran: batas belanja, sakelar mati, Turnstile/BotID, kuota. Halaman transparansi biaya. | Kutipan valid 100%, lokasi benar ≥ 90%, penolakan ≥ 90%, biaya per jawaban tercatat |
| **v1.5: MCP** | Server MCP publik, hanya-baca, pembungkus tipis atas core tools. Dokumentasi + batas kuota. | Eval v1 lolos |
| **v2: Ruang al-Ghazali** | 21 karya dari Shamela + karya yang kurang dari OpenITI. Metadata atribusi, periode, dan bahasa asli. Deduplikasi tumpang tindih dengan Ihya. Agen orang ketiga. | Eval khusus, direview ahli karya al-Ghazali |
| **v3: Wiki** | Pilot LangExtract di satu kitab Ihya. Entitas tingkat A dan B. Tokoh dari tabel penulis Shamela + Wikidata. Kartu UI dan indeks tematik. Antrean review. | Presisi ekstraksi disepakati bersama ustadz |
| **v4: Kurikulum & keterbukaan** | Kitab kurikulum pesantren (±92 kitab dari daftar CSV), entitas tingkat C (qaul, hukum) dengan review wajib, ruang tokoh lain, rilis dataset dan benchmark terbuka. | Kapasitas review ustadz mencukupi |

## Langkah terdekat (v1a)

1. Inisialisasi repo (monorepo TS) dan skema database multi-karya.
2. Importer Shamela, dengan validasi pohon dan perbaikan manual untuk Ihya.
3. Normalisasi Arab dan peta offset.
4. Core tools dan uji unitnya.
5. Ukur jumlah token Arab di Haiku 5.5 (`count_tokens`, gratis), lalu perbarui `FAKTOR_TOKEN_ARAB` di kalkulator.
6. Batch Haiku 5.5: ringkasan per bagian (Indonesia + Inggris) dan terjemahan per paragraf. Pastikan setiap request di bawah 100k token.
7. Draf 20 soal eval retrieval pertama, lalu direview ustadz.

## Keputusan yang masih terbuka

- Siapa ustadz pertama untuk eval dan dewan pengawas?
- Bentuk organisasi nirlaba (yayasan/perkumpulan). Badan hukum membuka program kredit (AWS, Microsoft, Google for Nonprofits). Lihat [08 Biaya](08-biaya.md).
- Anggaran bulanan maksimal untuk AI sebelum ada pendanaan (misalnya $20/bulan), sebagai dasar sakelar mati.
- Izin data Shamela untuk publikasi.
- Bahasa dokumentasi publik (Indonesia saja, atau ditambah Inggris dan Arab).
