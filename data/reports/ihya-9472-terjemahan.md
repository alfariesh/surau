# Terjemahan dan ringkasan AI: Ihya' 'Ulum ad-Din (S13)

> Dibuat otomatis oleh `pnpm llm report` (`tools/ingest/src/llm`). Tanpa teks kitab: hanya angka, ID, dan permalink.

- Prompt: `translate-passage@2`, `summarize-section@2` (`packages/llm/prompts/`) · model Claude Haiku 5.5 (`claude-haiku-5-5`, effort low), ulangan refusal Claude Sonnet 5.5 · Message Batches
- Ayat yang dikenali pencocok tidak diterjemahkan model: kutipannya dikirim sebagai placeholder `⟦QS s:a⟧` dan diganti terjemahan Kemenag saat tampil (ADR-020, ADR-040, ADR-042). Ayat yang luput dari pencocok bisa ikut diterjemahkan model (sisa risiko ADR-042; lihat "Kemungkinan ayat belum ditandai").

## Cakupan

| | Lolos | Dibutuhkan | Cakupan |
|---|---|---|---|
| Terjemahan paragraf badan | 16.086 | 16.111 | 99,84% |
| Ringkasan final bahasa Indonesia | 313 | 313 | 100,00% |
| Ringkasan final bahasa Inggris | 313 | 313 | 100,00% |
| Ringkasan putaran 1 (potongan, 2 bahasa) | 630 | 630 | 100,00% |

Dibuat Claude Sonnet 5.5 (percobaan terakhir sesudah dua kali gagal, atau refusal Haiku): 276. Penolakan model (refusal): 0. Terjemahan tanpa penanda catatan kaki (diterima, dicatat; takhrij tetap tertaut di teks Arab): 320. Paragraf yang tidak boleh dikirim (rujukan ayat tak bisa ditandai): 0.

## Belum lolos (25)

| custom_id | Percobaan | Refusal | Alasan terakhir | Tautan |
|---|---|---|---|---|
| `passage-10004194` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/1/292#p4194` |
| `passage-10001022` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/1/86#p1022` |
| `passage-10006425` | 3 | – | length_ratio,meta (claude-sonnet-5-5) | `/kitab/ihya/2/81#p6425` |
| `passage-10003770` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/1/259#p3770` |
| `passage-10004262` | 3 | – | ayah_refill (claude-sonnet-5-5) | `/kitab/ihya/1/298#p4262` |
| `passage-10011880` | 3 | – | length_ratio (claude-sonnet-5-5) | `/kitab/ihya/3/11#p11880` |
| `passage-10013660` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/3/213#p13660` |
| `passage-10012157` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/3/45#p12157` |
| `passage-10014354` | 3 | – | length_ratio (claude-sonnet-5-5) | `/kitab/ihya/3/277#p14354` |
| `passage-10014036` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/3/251#p14036` |
| `passage-10013652` | 3 | – | arabic,meta (claude-sonnet-5-5) | `/kitab/ihya/3/211#p13652` |
| `passage-10013417` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/3/183#p13417` |
| `passage-10016933` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/4/176#p16933` |
| `passage-10019111` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/4/400#p19111` |
| `passage-10015553` | 3 | – | markers_extra (claude-sonnet-5-5) | `/kitab/ihya/3/379#p15553` |
| `passage-10016131` | 3 | – | placeholders (claude-sonnet-5-5) | `/kitab/ihya/4/49#p16131` |
| `passage-10016250` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/4/68#p16250` |
| `passage-10016401` | 3 | – | markers_extra (claude-sonnet-5-5) | `/kitab/ihya/4/104#p16401` |
| `passage-10015544` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/3/378#p15544` |
| `passage-10018096` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/4/317#p18096` |
| `passage-10015425` | 3 | – | arabic,length_ratio,meta (claude-sonnet-5-5) | `/kitab/ihya/3/368#p15425` |
| `passage-10017010` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/4/184#p17010` |
| `passage-10020147` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/4/496#p20147` |
| `passage-10020158` | 3 | – | meta (claude-sonnet-5-5) | `/kitab/ihya/4/498#p20158` |
| `passage-10018093` | 3 | – | ayah_refill (claude-sonnet-5-5) | `/kitab/ihya/4/316#p18093` |

Terjemahan yang belum ada: 25 paragraf (0,16%), termasuk 0 yang terblokir.

## Kemungkinan ayat belum ditandai (6)

Paragraf yang belum lolos karena model menulis placeholder ayat yang tidak ada di teks bertanda: model mengenali kutipan Qur'an yang luput dari pencocok (ejaan lain, lafaz berulang, ≤3 kata). Rujukan di sini tebakan model, **bukan** rujukan terverifikasi; bahan perbaikan pencocok (ADR-042) di sesi berikut.

| Paragraf | Permalink | Placeholder tebakan model |
|---|---|---|
| 10003770 | `/kitab/ihya/1/259#p3770` | ⟦QS 4:64⟧ |
| 10012157 | `/kitab/ihya/3/45#p12157` | ⟦QS 6:110⟧ |
| 10014036 | `/kitab/ihya/3/251#p14036` | ⟦QS 18:82⟧ |
| 10013417 | `/kitab/ihya/3/183#p13417` | ⟦QS 12:92⟧ |
| 10016933 | `/kitab/ihya/4/176#p16933` | ⟦QS 38:88⟧ |
| 10016131 | `/kitab/ihya/4/49#p16131` | ⟦QS 16:41⟧ |

## Biaya aktual (tarif batch, dari `usage`)

| Batch | Request | Lolos / ditolak / gagal API | Input | Baca cache | Tulis cache | Keluaran | Biaya |
|---|---|---|---|---|---|---|---|
| 01-summary-r1 (`msgbatch_01KzT78WprzRwFkNRJyceKyz`) | 668 | 389 / 279 / 0 | 6.439.120 | 2.487.680 | 108.836 | 395.674 | $0.4442 |
| 02-translation (`msgbatch_01TFjf1yXrB1D3xUbcP3WXzi`) | 4.000 | 3.790 / 210 / 0 | 1.969.723 | 17.355.660 | 4.340 | 973.026 | $0.4290 |
| 03-summary-r1-retry (`msgbatch_01VbqGSHrsjGP6WU7DuChzqL`) | 11 | 4 / 7 / 0 | 14.325 | 42.757 | 0 | 7.249 | $0.0027 |
| 04-translation (`msgbatch_01VSZu8vbC6YHWABh5WAN3Bs`) | 4.000 | 3.877 / 123 / 0 | 1.452.300 | 17.360.000 | 0 | 739.649 | $0.3443 |
| 05-translation (`msgbatch_01TCS6WBn4dkVD7x4fWofNax`) | 4.000 | 3.868 / 132 / 0 | 2.035.998 | 17.360.000 | 0 | 1.109.233 | $0.4659 |
| 06-translation (`msgbatch_01TB1Jb1rrT3jw6NdCV5h8yG`) | 4.000 | 3.790 / 210 / 0 | 2.507.250 | 17.360.000 | 0 | 1.479.818 | $0.5821 |
| 07-translation (`msgbatch_01FSJGHGVe5ukcpFD7TyazWy`) | 207 | 180 / 27 / 0 | 209.121 | 898.380 | 0 | 148.284 | $0.0520 |
| 08-summary-r1 (`msgbatch_0142nvxoJoyKi4thc3gj6K3K`) | 230 | 196 / 34 / 0 | 4.289.257 | 894.010 | 0 | 138.170 | $0.2535 |
| 09-summary-r1-retry (`msgbatch_018YGyhaspLF9YJbkD1PVSKo`) | 7 | 6 / 1 / 0 | 34.356 | 27.209 | 0 | 4.385 | $0.0030 |
| 10-translation-retry (`msgbatch_01LBFDVcNxua2mKE92v3YVYX`) | 383 | 177 / 206 / 0 | 389.637 | 1.662.220 | 0 | 305.477 | $0.1042 |
| 11-translation-retry (`msgbatch_01He4nkWuiw9hHE3tj7uqDJs`) | 181 | 167 / 14 / 0 | 201.635 | 781.200 | 4.340 | 130.691 | $0.9028 |
| 12-summary-r1-retry (`msgbatch_014RC78z7H3TJTkQxKAD2H15`) | 1 | 0 / 1 / 0 | 773 | 0 | 3.887 | 753 | $0.0123 |
| 13-summary-r2 (`msgbatch_015z3T6JVGaanNEJ1m5TvfNx`) | 178 | 140 / 38 / 0 | 885.957 | 691.886 | 0 | 302.236 | $0.1233 |
| 14-translation (`msgbatch_01AKYrRj48fSk7HGtz6zKMUc`) | 17 | 11 / 6 / 0 | 10.615 | 73.780 | 0 | 7.088 | $0.0027 |
| 15-summary-r1 (`msgbatch_012fmhrKBBJBZ6rHyrUAXYDz`) | 26 | 18 / 8 / 0 | 702.575 | 101.062 | 0 | 12.672 | $0.0388 |
| 16-summary-r1-retry (`msgbatch_01LgBsoGcnYUtu71Zn31K1qD`) | 4 | 4 / 0 / 0 | 9.697 | 15.548 | 0 | 1.480 | $0.0009 |
| 17-translation-retry (`msgbatch_018rxxt8Btb98wusdp92mQwe`) | 177 | 108 / 69 / 0 | 123.030 | 768.180 | 0 | 68.902 | $0.0893 |
| 18-translation-retry (`msgbatch_01HqNtxb4bcWGHTya5PXakmZ`) | 68 | 60 / 8 / 0 | 53.521 | 295.120 | 0 | 26.026 | $0.1941 |
| 19-summary-r2-retry (`msgbatch_011EdteW72NNufhbWqr3pZyV`) | 1 | 1 / 0 / 0 | 6.243 | 3.887 | 0 | 1.373 | $0.0007 |
| 20-summary-r1-retry (`msgbatch_01JqhXiU5RmW2o7ot7e5qJBA`) | 1 | 1 / 0 / 0 | 773 | 3.887 | 0 | 352 | $0.0027 |
| 21-translation-retry (`msgbatch_011J87UTfidjkKga5BCpotST`) | 3 | 0 / 3 / 0 | 1.352 | 13.020 | 0 | 527 | $0.0046 |
| 22-summary-r2 (`msgbatch_01CB4gCCtcHvWxwar5SbKD8M`) | 174 | 160 / 14 / 0 | 794.487 | 676.338 | 0 | 293.362 | $0.1164 |
| 23-summary-r2 (`msgbatch_018CL8ubT2Sni3aQ9pSRSxZs`) | 3 | 3 / 0 / 0 | 80.772 | 11.661 | 0 | 4.178 | $0.0051 |
| 24-summary-r1-retry (`msgbatch_014t4NSbtjstDRxNxyAoEn4Q`) | 4 | 4 / 0 / 0 | 4.543 | 15.548 | 0 | 1.287 | $0.0006 |
| 25-translation-retry (`msgbatch_01YBJwPBZ9ernTBUtV1UmL5Q`) | 6 | 4 / 2 / 0 | 4.107 | 26.040 | 0 | 2.922 | $0.0015 |
| 26-translation-retry (`msgbatch_01AuUmb4AqcJZt7XXXpyHYj6`) | 2 | 2 / 0 / 0 | 2.145 | 8.680 | 0 | 1.120 | $0.0082 |
| 27-summary-r2 (`msgbatch_018jFDX96h72mFE8fj5p4ra1`) | 9 | 8 / 1 / 0 | 202.280 | 34.983 | 0 | 16.576 | $0.0144 |
| 28-translation (`msgbatch_015k3m4JUu9zLxNsV8paTTb9`) | 5 | 5 / 0 / 0 | 2.144 | 21.700 | 0 | 1.089 | $0.0005 |
| 29-summary-r1 (`msgbatch_0188zLYWCYKSynrp3Nni9op2`) | 8 | 8 / 0 / 0 | 306.032 | 31.096 | 0 | 3.851 | $0.0164 |
| 30-summary-r1-retry (`msgbatch_013Z838cAMvCGTghdjjAmMQa`) | 2 | 0 / 2 / 0 | 4.488 | 7.774 | 0 | 1.379 | $0.0006 |
| 31-translation-retry (`msgbatch_01MbEo2ChfTteD9fTFe7z57J`) | 55 | 27 / 28 / 0 | 53.007 | 238.700 | 0 | 42.905 | $0.0499 |
| 32-summary-r1-retry (`msgbatch_01WsfQTVRHMC5bGuYbDkHxye`) | 2 | 2 / 0 / 0 | 4.488 | 3.887 | 3.887 | 566 | $0.0153 |
| 33-translation-retry (`msgbatch_01CM6Go2RH1ZxDEswNpAypw3`) | 26 | 20 / 6 / 0 | 26.390 | 112.840 | 0 | 18.270 | $0.1234 |
| 34-summary-r2 (`msgbatch_011CLzm9vYqik1XbPngGc95i`) | 14 | 14 / 0 / 0 | 204.550 | 54.418 | 0 | 24.884 | $0.0167 |
| 35-summary-r2 (`msgbatch_01Qjjb6BK9oKThXAEgmg5eGJ`) | 6 | 6 / 0 / 0 | 171.260 | 23.322 | 0 | 10.615 | $0.0113 |
| **Total** | 18.479 | | 23.197.951 | 79.462.473 | 125.290 | 6.276.069 | **$4.4336** |

Biaya yang disetujui pemilik: ±$6 (batas berhenti $7,20). Estimasi rencana TERAKHIR (sisa yang dikirim saat itu; cache 95% / 50% / 0%): putaran 1 $0.0176 / $0.0198 / $0.0223; putaran 2 $0.0098 / $0.0108 / $0.0119.

## QA terjemahan: 20 sampel acak (T-17 tahap 2)

Dinilai pemilik atau ustadz: **B**enar / **K**urang / **S**alah. Teks dan terjemahan ada di halaman nilai lokal (`data/build/llm/qa/review-batch.html`, tidak di-commit).

| # | Paragraf | Permalink | Model | Nilai | Catatan |
|---|---|---|---|---|---|
| 1 | 10001225 | `/kitab/ihya/1/101#p1225` | claude-haiku-5-5 | | |
| 2 | 10003032 | `/kitab/ihya/1/210#p3032` | claude-haiku-5-5 | | |
| 3 | 10003081 | `/kitab/ihya/1/212#p3081` | claude-haiku-5-5 | | |
| 4 | 10003232 | `/kitab/ihya/1/223#p3232` | claude-haiku-5-5 | | |
| 5 | 10003482 | `/kitab/ihya/1/239#p3482` | claude-haiku-5-5 | | |
| 6 | 10006294 | `/kitab/ihya/2/72#p6294` | claude-haiku-5-5 | | |
| 7 | 10006865 | `/kitab/ihya/2/111#p6865` | claude-haiku-5-5 | | |
| 8 | 10009153 | `/kitab/ihya/2/240#p9153` | claude-haiku-5-5 | | |
| 9 | 10009200 | `/kitab/ihya/2/243#p9200` | claude-haiku-5-5 | | |
| 10 | 10009870 | `/kitab/ihya/2/272#p9870` | claude-haiku-5-5 | | |
| 11 | 10010521 | `/kitab/ihya/2/302#p10521` | claude-haiku-5-5 | | |
| 12 | 10010786 | `/kitab/ihya/2/319#p10786` | claude-haiku-5-5 | | |
| 13 | 10013002 | `/kitab/ihya/3/146#p13002` | claude-haiku-5-5 | | |
| 14 | 10015283 | `/kitab/ihya/3/355#p15283` | claude-haiku-5-5 | | |
| 15 | 10016882 | `/kitab/ihya/4/172#p16882` | claude-haiku-5-5 | | |
| 16 | 10017158 | `/kitab/ihya/4/197#p17158` | claude-haiku-5-5 | | |
| 17 | 10018257 | `/kitab/ihya/4/335#p18257` | claude-haiku-5-5 | | |
| 18 | 10018732 | `/kitab/ihya/4/368#p18732` | claude-haiku-5-5 | | |
| 19 | 10019961 | `/kitab/ihya/4/482#p19961` | claude-haiku-5-5 | | |
| 20 | 10020304 | `/kitab/ihya/4/520#p20304` | claude-haiku-5-5 | | |
