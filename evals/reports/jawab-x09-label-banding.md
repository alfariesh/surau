# Perbandingan Jawab x08 → x09: bunyi label status hadits (ADR-111) · 2026-10-27

> **Penilai semantik: agent (Claude), bukan ustadz dan bukan manusia** (ADR-105). Hasil ini tidak
> dihitung sebagai "ditinjau ustadz" di mana pun, termasuk `disetujui_oleh` dan gerbang R4.
> Laporan sebelumnya: [`jawab-x08-answer8-banding.md`](jawab-x08-answer8-banding.md).

| | x08 | x09 |
|---|---|---|
| Versi | `answer@8`, pipeline@9 | `answer@8`, **pipeline@11** (label ADR-111 + gema takhrij ADR-112) |
| Korpus · soal | `ihya-v8` · versi 2 | **`ihya-v9`** · versi 2 |
| Biaya jawaban | US$0,1167 | US$0,1181 (42 jawaban yang dinilai); seluruh percobaan ±US$0,16 (izin pemilik di chat 2026-10-27) |

Laporan kode: [`jawab-x09-publik-label-v3.md`](jawab-x09-publik-label-v3.md). Penilaian per jawaban
(privat): `evals/private/jawab-runs/x09-agent-nilai-2026-10-27.jsonl`, salinan R2
`surau-evals/jawab-runs/x09-agent-nilai-2026-10-27.jsonl`. Tiga subagen menilai 14 jawaban masing-masing
terhadap teks Arab D1 staging (`ihya-v9`), tanpa melihat nilai run lain.

## Jalannya run (terbuka)

Run ini tidak berjalan mulus. 42 jawaban yang dinilai hanya berasal dari butir 2 dan 3 di bawah, dan
semuanya memakai kode, prompt, dan korpus yang sama (`answer@8+answer-route@2+pipeline@11`, `ihya-v9`).
Setiap percobaan dijalankan dengan pagu terburuk US$0,50 (penjaga kode menghitung soal yang gagal dengan
biaya maksimum). Semua pengulangan masih dalam satu izin pemilik, dan biaya nyata seluruhnya ±US$0,16:

1. `x09-publik-label-v1` (korpus `ihya-v8`) terhenti di 15 soal. Korpus staging diganti ke `ihya-v9`
   oleh sesi lain di tengah run, sehingga dua soal gagal dan dihitung biaya terburuk sampai pagu habis.
   Run ini **tidak dipakai**.
2. `x09-publik-label-v2` (`ihya-v9`): 19 jawaban, lalu terhenti lagi karena dua galat koneksi D1 remote
   (j003, j021). Kedua soal itu dijalankan ulang satu per satu dan berhasil.
3. `x09-publik-label-v2-lanjutan`: 21 soal sisanya. Koneksi D1 putus-putus di tengah run, dan run
   berhenti sesudah jawaban terakhir sebelum arsip dan diagnostiknya tertulis. Tiga jawaban di tengah
   run (j027, j028, j029; j026 di antaranya berhasil) jatuh ke "Surau tidak dapat memverifikasi kutipan"
   karena verifikasi gagal membaca DB. Ketiganya dijalankan ulang (`x09-dbg3-hadits-1`), dan jawaban
   ulangan itu yang dinilai. Tidak ada soal lain yang diulang. Arsip gabungan: `x09-gabung-v3.jsonl`
   (privat). Run `x09-publik-gema-*` di folder yang sama milik sesi lain (ADR-112), bukan bagian laporan
   ini dan tidak termasuk ±US$0,16.

Diagnostik kode per jawaban (kalimat berulang, salinan terjemahan) tidak lengkap untuk run gabungan ini,
jadi tidak dibandingkan.

## Hasil

| Ukuran | x08 | x09 | Syarat R4 |
|---|---|---|---|
| Benar / Kurang / Salah (agent) | 17 / 23 / 2 | **22 / 13 / 7** | — |
| Kesetiaan (agent) | 85,7% (36/42) | **71,4%** (30/42) | ≥ 95% |
| Atribusi benar (agent) | 92,9% (39/42) | **97,6%** (41/42) | ≥ 95% |
| Bahasa Indonesia (agent, 1–5) | 3,55 | **3,36** | ≥ 4 |
| Kalimat bernada fatwa (agent) | 0 | 0 | 0 |
| Menolak dengan benar (agent) | 8/8 | 8/8 | ≥ 90% |
| Status hadits benar, 6 soal status (agent) | 4/6 | 4/6 | 100% |
| Status hadits (kode) | 5/6 | 5/6 | 100% |
| Lokasi (kode), kunci versi 2 | 91,2% (31/34) | 85,3% (29/34) | ≥ 90% |
| Kutipan valid (kode) | 100% | 100% (142/142) | 100% |

Bahasa per jenis soal (x08 → x09): lokasi+isi 3,29 → 3,35; topik tersebar 3,67 → 3,33; status hadits
3,00 → 2,83; di luar cakupan 5,00 → 4,00; premis keliru 3,50 → 3,25; atribusi 3,80 → 3,60.

**Kesimpulan: bunyi label baru tidak menaikkan skor bahasa.** Baris "Status hadits:" buatan kode hanya
ada di teks 3 jawaban (j026, j028, j029), dan label kode di bagian Status hadits ada di 7 jawaban (j006,
j025–j029, j039), jadi pengaruhnya ke rata-rata kecil. Penilaian penilai atas bunyinya campuran: j026
dinilai terbaca cukup wajar, sedangkan j006 masih terasa seperti deretan label bertitik koma. Penurunan bahasa dan kesetiaan berasal dari hal lain (di bawah), dan sebagian
masih dalam rentang derau penilai, Haiku yang nondeterministik, serta perubahan korpus `ihya-v9` dan
pipeline@11 yang ikut di run ini.

## Temuan tentang label status hadits

- **Regresi dari ADR-111 (j029).** Arti `lam_ajid` "tidak ditemukan sanad atau lafaznya" terlalu luas
  untuk frasa "لم أظفر له بإسناد" (sanadnya tidak kutemukan): lafaznya justru ada pada Ibn 'Abd al-Barr.
  Baris label jadi bertentangan dengan paragraf jawaban yang sudah tepat. Status hadits j029 turun ke
  keliru karena ini.
- j025 naik ke benar (x08: keliru).
- j024 tetap keliru: takhrij kemunculan pertama (10000010, j1 h2) tidak terambil walau ada gema takhrij
  (ADR-112); jawaban hanya memakai catatan kaki rujukan silang di j3 h389.
- Baris pemberitahuan `HADITH_NOT_CITED` ("Status hadits: lihat bagian "Status hadits", …") di j025 dan
  j027 dinilai label sistem yang melingkar dan menurunkan skor bahasa.
- "sumbernya hanya memuat sebagian lafaz" (`sebagian`, j026) dan "diriwayatkan mursal; diriwayatkan
  mauquf" (j006, terbaca seolah lafaz yang sama) masih kaku. Label juga tidak menyebut siapa penilai
  yang dinukil (j025) atau pada siapa riwayat itu mauquf (j028).

## Penyebab lain yang menonjol (bukan label)

1. **Elipsis "…" sisa pembuangan teks Arab tulisan model** (`stripArabic`) di 6 jawaban (j008, j014,
   j023, j024, j029, j035). Di j014 kesimpulan intinya ikut hilang.
2. **Kesimpulan negatif palsu** karena paragraf gold tidak terambil: j004, j016, j019.
3. **Kalimat penyimpul dibaca terbalik**: j011, j013, j014, j020.
4. Transliterasi Arab tulisan model (j004, j028, j038), kalimat berulang (j010, j034), salinan
   terjemahan kaku (j023, j036).

## Keterbatasan

Penilai x08 dan x09 adalah subagen yang berbeda, dengan rubrik yang sama. Dua kemunduran kode tidak dijelaskan
label: "tidak salah menolak" 34/34 → 33/34 (j019, yang di x08 Benar, kini menolak) dan lokasi topik
tersebar 5/6 → 3/6 (lokasi turun di bawah syarat R4). j019 berasal dari run v2 yang juga mengalami galat
D1, jadi pencarian yang diam-diam melemah karena D1 tidak stabil tidak bisa disingkirkan. Satu run per versi. x09
menggabungkan tiga perubahan (label, gema takhrij, korpus `ihya-v9`), jadi efek label saja tidak bisa
dipisahkan. Konvensi kecil berbeda antarpenilai (misalnya `location_ok` untuk soal di luar cakupan).
Run `x09-publik-gema-*` sesi lain, dengan kode dan korpus yang sama, mendapat status hadits kode 6/6
(j024 benar) dan lokasi 32/34, sedangkan run ini 5/6 dan 29/34: selisih antar-run sebesar itu adalah
derau, bukan efek label.
Penilaian manusia belum ada.

## Rekomendasi

1. Perbaiki arti `lam_ajid` supaya tidak menambah klaim "lafaz" (regresi j029), idealnya dengan
   memisahkan frasa "sanad tidak ditemukan" dan "lafaz ini tidak ditemukan" di aturan istilah.
2. Elipsis `stripArabic` adalah cacat bahasa terbesar yang terukur. Perbaikannya di prompt (larangan
   menulis teks Arab sudah ada) atau di kode (membuang kalimat yang tinggal elipsis).
3. Penilaian manusia (Anas) sebelum iterasi prompt berikutnya. Selisih antar-run sudah sebesar derau
   penilai agent.
