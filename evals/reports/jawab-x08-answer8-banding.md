# Perbandingan Jawab `answer@6` → `answer@7` → `answer@8` · x06, x07, x08 · 2026-10-26

> **Penilai semantik: agent (Claude), bukan ustadz dan bukan manusia** (ADR-105). Hasil ini tidak
> dihitung sebagai "ditinjau ustadz" di mana pun, termasuk `disetujui_oleh` dan gerbang R4.
> Keputusannya ada di ADR-106 (`answer@7`) dan ADR-109 (`answer@8`). Laporan x06 → x07:
> [`jawab-x07-answer7-banding.md`](jawab-x07-answer7-banding.md).

| | x06 | x07 | x08 |
|---|---|---|---|
| Versi | `answer@6`, pipeline@6 | `answer@7`, pipeline@8 | `answer@8`, pipeline@9 |
| Korpus · soal | `ihya-v7` · versi 1 | `ihya-v8` · versi 2 | `ihya-v8` · versi 2 |
| Biaya | — | US$0,1205 | **US$0,1167** (izin pemilik di chat, pagu US$0,50) |

Laporan kode run baru: [`jawab-x08-publik-answer8-v1.md`](jawab-x08-publik-answer8-v1.md). Penilaian per
jawaban (privat): `evals/private/jawab-runs/x08-agent-nilai-2026-10-26.jsonl`, salinan R2
`surau-evals/jawab-runs/x08-agent-nilai-2026-10-26.jsonl`.

## Hasil

| Ukuran | x06 | x07 | x08 | Syarat R4 | x08 |
|---|---|---|---|---|---|
| Benar / Kurang / Salah (agent) | 19 / 20 / 3 | 17 / 22 / 3 | 17 / 23 / **2** | — | |
| Kesetiaan (agent) | 76,2% | 83,3% | **85,7%** (36/42) | ≥ 95% | tidak lolos |
| Atribusi benar (agent) | 97,6% | 97,6% | **92,9%** (39/42) | ≥ 95% | tidak lolos |
| Bahasa Indonesia (agent, 1–5) | 3,74 | 3,45 | **3,55** | ≥ 4 | tidak lolos |
| Kalimat bernada fatwa (agent) | 1 | 0 | 0 | 0 | lolos |
| Menolak dengan benar (agent) | 8/8 | 8/8 | 8/8 | ≥ 90% | lolos |
| Status hadits benar (agent) | 4/6 | 5/6 | 5/7* | 100% | tidak lolos |
| Lokasi (kode), kunci versi 1 | 85,3% | 88,2% | 88,2% (30/34) | ≥ 90% | tidak lolos |
| Lokasi (kode), kunci versi 2 | 85,3% | 91,2% | 91,2% (31/34) | ≥ 90% | lolos |
| Kutipan valid (kode) | 100% | 100% | 100% (147/147) | 100% | lolos |

\* Penilai x08 juga memberi nilai status hadits untuk j021 (soal topik tersebar yang menyitasi takhrij);
untuk enam soal status hadits saja hasilnya 4/6 (j024 tetap keliru, j025 turun karena penilai yang
dinukil al-'Iraqi tidak dibedakan).

Pada 34 soal yang sama di ketiga run (tanpa 8 soal yang direvisi): Benar/Kurang/Salah 18/14/2 →
12/20/2 → 13/19/2, kesetiaan 27 → 29 → 29, bahasa 3,74 → 3,41 → 3,50.

**Kesimpulan: syarat R4 masih belum terpenuhi.** Menurut aturan yang ditulis sebelum run (ADR-109
butir 4: `answer@7` dipertahankan bila bahasa atau kesetiaan turun), `answer@8` dipakai karena keduanya
naik sedikit. Selisih x07 → x08 kecil dan sebagian besar masih dalam rentang derau penilai, dan
atribusi turun dua jawaban (j022, j025).

## Diagnostik kode (jumlah kalimat atau jawaban)

| Diagnostik | x07 | x08 |
|---|---|---|
| Kalimat berulang (`repeated_sentences`, jawaban) | 5 | 3 (j007, j010, j013) |
| Kalimat salinan ≥ 8 kata dari terjemahan AI paragraf yang disitasi | 102 kalimat / 31 jawaban | 81 / 27 |
| Penilaian hadits tanpa sitasi takhrij (`grading_uncited`, jawaban) | 3 | 4 |
| Istilah pipeline (jawaban) | 1 | 2 (j018 "konteks", j024 "dokumen") |
| Celah "…" (kemunculan / jawaban) | 11 / 7 | 8 / 3 |
| Pembuka meta / "saya" | 2 (j026, j039) | 1 (j029) |

Salinan terjemahan AI tetap umum walau dilarang: Haiku menyusun jawaban dengan menyalin rangkaian
kata dari terjemahan di konteks. Ini bukan selalu keliru (terjemahan menjadi parafrase yang setia),
tetapi kesalahan terjemahan AI ikut terbawa ke jawaban (T-17 tahap 3: Salah 13,3%).

## Yang berubah dari x07

- **Membaik:** penolakan di luar cakupan kembali Benar 4/4 (kalimat "Tidak ditemukan …" berdiri sendiri);
  atribusi soal atribusi 2/3/0 → 4/1/0; j017 dan j018 (Salah di x07) kini Benar dan Kurang; kalimat
  berulang, celah "…", dan pembuka meta berkurang.
- **Memburuk atau baru:**
  - j016 menjadi fallback (model tidak memberi sitasi sama sekali, sehingga pipeline menampilkan
    hasil Cari); dinilai Salah karena soal wajib dijawab.
  - j015: potongan bahasa Inggris dari terjemahan bocor ke jawaban.
  - j025, j027, j028: teks label kode "takhrij menyebut: lemah (hadits di Ihya …)" dinilai sebagai
    label mentah yang bocor ke kalimat. Ini jalur yang disengaja (isi baris "Status hadits:" diganti
    label kode, ADR-069), tetapi bunyinya kaku bagi pembaca.
  - j025: "al-'Iraqi menilai sanadnya lemah", padahal al-'Iraqi menukil penilaian Ahmad dan al-Baihaqi.
- **Tetap:** j024 Salah (takhrij kemunculan pertama tidak terambil pencarian; bagian Status hadits
  menampilkan takhrij hadits lain), lokasi gagal j021/j024.

## Keterbatasan

Penilai tiap run adalah subagen Claude yang berbeda, dengan rubrik sama dan tanpa melihat nilai run
lain. Satu run per prompt (Haiku nondeterministik). Penilaian manusia belum ada. Label status hadits di
x07 dan x08 memakai aturan istilah takhrij yang berbeda (x08 sesudah ADR-108).

## Rekomendasi (belum dikerjakan)

1. **Bunyi label kode di baris "Status hadits:"** dirumuskan untuk pembaca (mis. "Status hadits menurut
   takhrij al-'Iraqi: lemah"), bukan "takhrij menyebut: …". Perubahan kode di `takhrijLabel`/`labelText`,
   tanpa LLM.
2. **Pencarian kemunculan pertama hadits** (j024) dan **pemisahan takhrij hadits lain** dari bagian
   Status hadits bila jawaban tidak membahas hadits itu.
3. Penilaian manusia (Anas) atas sampel jawaban sebelum iterasi prompt berikutnya: selisih antar-run
   sudah sekecil derau penilai agent.
