# Terjemahan dan ringkasan AI: Ihya' 'Ulum ad-Din (S13)

> Dibuat otomatis oleh `pnpm llm report` (`tools/ingest/src/llm`). Tanpa teks kitab: hanya angka, ID, dan permalink.

- Prompt: `translate-passage@2`, `summarize-section@2` (`packages/llm/prompts/`) · model Claude Haiku 5.5 (`claude-haiku-5-5`, effort low), ulangan refusal Claude Sonnet 5.5 · Message Batches
- Ayat tidak pernah diterjemahkan model: kutipan ayat dikirim sebagai placeholder `⟦QS s:a⟧` dan diganti terjemahan Kemenag saat tampil (ADR-020, ADR-040, ADR-042).

## Cakupan

| | Lolos | Dibutuhkan | Cakupan |
|---|---|---|---|
| Terjemahan paragraf badan | 16.102 | 16.111 | 99,94% |
| Ringkasan final bahasa Indonesia | 313 | 313 | 100,00% |
| Ringkasan final bahasa Inggris | 313 | 313 | 100,00% |
| Ringkasan putaran 1 (potongan, 2 bahasa) | 630 | 630 | 100,00% |

Dibuat Claude Sonnet 5.5 (percobaan terakhir sesudah dua kali gagal, atau refusal Haiku): 173. Penolakan model (refusal): 0. Terjemahan tanpa penanda catatan kaki (diterima, dicatat; takhrij tetap tertaut di teks Arab): 330. Paragraf yang tidak boleh dikirim (rujukan ayat tak bisa ditandai): 0.

## Belum lolos (9)

| custom_id | Percobaan | Refusal | Alasan terakhir | Tautan |
|---|---|---|---|---|
| `passage-10004194` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/1/292#p4194` |
| `passage-10003770` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/1/259#p3770` |
| `passage-10012157` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/3/45#p12157` |
| `passage-10014354` | 3 | – | length_ratio (claude-sonnet-5-5) | `/kitab/ihya/3/277#p14354` |
| `passage-10014036` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/3/251#p14036` |
| `passage-10013652` | 3 | – | arabic (claude-sonnet-5-5) | `/kitab/ihya/3/211#p13652` |
| `passage-10013417` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/3/183#p13417` |
| `passage-10016131` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/4/49#p16131` |
| `passage-10016401` | 3 | – | markers_extra (claude-sonnet-5-5) | `/kitab/ihya/4/104#p16401` |

Terjemahan yang belum ada: 9 paragraf (0,06%).

## Kemungkinan ayat belum ditandai (5)

Paragraf yang belum lolos karena model menulis placeholder ayat yang tidak ada di teks bertanda: model mengenali kutipan Qur'an yang luput dari pencocok (ejaan lain, lafaz berulang, ≤3 kata). Rujukan di sini tebakan model, **bukan** rujukan terverifikasi; bahan perbaikan pencocok (ADR-042) di sesi berikut.

| Paragraf | Permalink | Placeholder tebakan model |
|---|---|---|
| 10003770 | `/kitab/ihya/1/259#p3770` | ⟦QS 4:64⟧ |
| 10012157 | `/kitab/ihya/3/45#p12157` | ⟦QS 6:110⟧ |
| 10014036 | `/kitab/ihya/3/251#p14036` | ⟦QS 18:82⟧ |
| 10013417 | `/kitab/ihya/3/183#p13417` | ⟦QS 12:92⟧ |
| 10016131 | `/kitab/ihya/4/49#p16131` | ⟦QS 16:41⟧ |

## Biaya aktual (tarif batch, dari `usage`)

| Batch | Request | Lolos / ditolak / gagal API | Input | Baca cache | Tulis cache | Keluaran | Biaya |
|---|---|---|---|---|---|---|---|
| 01-summary-r1 (`msgbatch_01KzT78WprzRwFkNRJyceKyz`) | 668 | 391 / 277 / 0 | 6.439.120 | 2.487.680 | 108.836 | 395.674 | $0.4442 |
| 02-translation (`msgbatch_01TFjf1yXrB1D3xUbcP3WXzi`) | 4.000 | 3.828 / 172 / 0 | 1.969.723 | 17.355.660 | 4.340 | 973.026 | $0.4290 |
| 03-summary-r1-retry (`msgbatch_01VbqGSHrsjGP6WU7DuChzqL`) | 11 | 4 / 7 / 0 | 14.325 | 42.757 | 0 | 7.249 | $0.0027 |
| 04-translation (`msgbatch_01VSZu8vbC6YHWABh5WAN3Bs`) | 4.000 | 3.923 / 77 / 0 | 1.452.300 | 17.360.000 | 0 | 739.649 | $0.3443 |
| 05-translation (`msgbatch_01TCS6WBn4dkVD7x4fWofNax`) | 4.000 | 3.924 / 76 / 0 | 2.035.998 | 17.360.000 | 0 | 1.109.233 | $0.4659 |
| 06-translation (`msgbatch_01TB1Jb1rrT3jw6NdCV5h8yG`) | 4.000 | 3.866 / 134 / 0 | 2.507.250 | 17.360.000 | 0 | 1.479.818 | $0.5821 |
| 07-translation (`msgbatch_01FSJGHGVe5ukcpFD7TyazWy`) | 207 | 187 / 20 / 0 | 209.121 | 898.380 | 0 | 148.284 | $0.0520 |
| 08-summary-r1 (`msgbatch_0142nvxoJoyKi4thc3gj6K3K`) | 230 | 228 / 2 / 0 | 4.289.257 | 894.010 | 0 | 138.170 | $0.2535 |
| 09-summary-r1-retry (`msgbatch_018YGyhaspLF9YJbkD1PVSKo`) | 7 | 6 / 1 / 0 | 34.356 | 27.209 | 0 | 4.385 | $0.0030 |
| 10-translation-retry (`msgbatch_01LBFDVcNxua2mKE92v3YVYX`) | 383 | 202 / 181 / 0 | 389.637 | 1.662.220 | 0 | 305.477 | $0.1042 |
| 11-translation-retry (`msgbatch_01He4nkWuiw9hHE3tj7uqDJs`) | 181 | 172 / 9 / 0 | 201.635 | 781.200 | 4.340 | 130.691 | $0.9028 |
| 12-summary-r1-retry (`msgbatch_014RC78z7H3TJTkQxKAD2H15`) | 1 | 1 / 0 / 0 | 773 | 0 | 3.887 | 753 | $0.0123 |
| 13-summary-r2 (`msgbatch_015z3T6JVGaanNEJ1m5TvfNx`) | 178 | 178 / 0 / 0 | 885.957 | 691.886 | 0 | 302.236 | $0.1233 |
| **Total** | 17.866 | | 20.429.452 | 76.921.002 | 121.403 | 5.734.645 | **$3.7193** |

Estimasi rencana (cache 95% / 50% / 0%): putaran 1 $1.9401 / $4.2421 / $6.7999; putaran 2 $0.0820 / $0.1116 / $0.1444.

## QA terjemahan: 20 sampel acak (T-17 tahap 2)

Dinilai pemilik atau ustadz: **B**enar / **K**urang / **S**alah. Teks dan terjemahan ada di halaman nilai lokal (`data/build/llm/qa/review-batch.html`, tidak di-commit).

| # | Paragraf | Permalink | Model | Nilai | Catatan |
|---|---|---|---|---|---|
| 1 | 10001224 | `/kitab/ihya/1/101#p1224` | claude-haiku-5-5 | | |
| 2 | 10003030 | `/kitab/ihya/1/210#p3030` | claude-haiku-5-5 | | |
| 3 | 10003079 | `/kitab/ihya/1/212#p3079` | claude-haiku-5-5 | | |
| 4 | 10003231 | `/kitab/ihya/1/223#p3231` | claude-haiku-5-5 | | |
| 5 | 10003481 | `/kitab/ihya/1/239#p3481` | claude-haiku-5-5 | | |
| 6 | 10006293 | `/kitab/ihya/2/72#p6293` | claude-haiku-5-5 | | |
| 7 | 10006864 | `/kitab/ihya/2/111#p6864` | claude-haiku-5-5 | | |
| 8 | 10009151 | `/kitab/ihya/2/240#p9151` | claude-haiku-5-5 | | |
| 9 | 10009197 | `/kitab/ihya/2/242#p9197` | claude-haiku-5-5 | | |
| 10 | 10009864 | `/kitab/ihya/2/271#p9864` | claude-haiku-5-5 | | |
| 11 | 10010518 | `/kitab/ihya/2/302#p10518` | claude-haiku-5-5 | | |
| 12 | 10010781 | `/kitab/ihya/2/318#p10781` | claude-haiku-5-5 | | |
| 13 | 10013000 | `/kitab/ihya/3/146#p13000` | claude-haiku-5-5 | | |
| 14 | 10015283 | `/kitab/ihya/3/355#p15283` | claude-haiku-5-5 | | |
| 15 | 10016883 | `/kitab/ihya/4/172#p16883` | claude-haiku-5-5 | | |
| 16 | 10017165 | `/kitab/ihya/4/198#p17165` | claude-haiku-5-5 | | |
| 17 | 10018258 | `/kitab/ihya/4/335#p18258` | claude-haiku-5-5 | | |
| 18 | 10018733 | `/kitab/ihya/4/369#p18733` | claude-haiku-5-5 | | |
| 19 | 10019962 | `/kitab/ihya/4/482#p19962` | claude-haiku-5-5 | | |
| 20 | 10020304 | `/kitab/ihya/4/520#p20304` | claude-haiku-5-5 | | |
