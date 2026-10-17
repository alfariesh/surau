# X02 · Sesi sisipan: perbaikan mutu terjemahan AI dan ayat sebelum rilis Fase 2

> **Fase:** sisipan (sesudah S15, sebelum `/rilis 2`) · **Status:** berjalan
> **Prasyarat:** S15 selesai · T-16 dan T-17 tahap 2 dinilai (diwakilkan ke agent lain atas permintaan pemilik, diperiksa ulang di sesi ini) · izin pemilik di chat (2026-10-17, "Ok go ahead"): biaya terjemahan ulang ≤ $1 dan promote korpus baru ke produksi setelah lolos QA
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Penilaian T-17 tahap 2 atas 20 sampel batch: Benar 70% (target ≥ 80%), Salah 10% (batas ≤ 10%). Penilaian T-16: 20/20 rujukan ayat cocok. Temuan yang perlu diperbaiki sebelum rilis:
- Satuan *mann* diganti "rithl" (p3031, p3032; p3033 menulis "mana").
- "Lengan baju" menjadi "siku" (p9200).
- Ungkapan tebusan *bi abi anta wa ummi* diterjemahkan sebagai sumpah ("demi ayah dan ibuku"), sistematis di ±18 dari 23 kemunculan.
- Judul bab nikah terbalik (p5351, p5354).
- "Menerima kitab dengan tangan kanan/kiri" berubah (p20304).
- Kutipan QS 54:55 terbelah di dua paragraf (p18256–p18257), sehingga tidak dikenali dan ikut diterjemahkan AI.
- Kalimat kaki halaman "Kutipan ayat tidak diterjemahkan AI" terlalu mutlak.

## Langkah

1. **Lapisan koreksi tinjauan:** `data/reviews/ihya-9472-terjemahan.json` (tanpa teks kitab) berisi paragraf yang dinilai Salah/Kurang, alasan, penilai, dan versi prompt yang ditolak. `pnpm llm rejudge` menolak hasil versi itu (`review_rejected`), dan `pnpm llm retry` mengirimnya ulang ke Sonnet 5.5.
2. **Prompt `translate-passage@3`:** aturan umum untuk satuan (tidak diganti atau dikonversi), ungkapan baku (tebusan), pakaian (lengan baju), pola judul *at-targhib fi … wa at-targhib 'anhu*, menerima kitab dengan tangan kanan/kiri, dan kalimat lanjutan dari paragraf sebelumnya.
3. **Pengenal ayat lintas paragraf:** kutipan yang mulai di ujung satu paragraf badan dan berlanjut di awal paragraf berikutnya. Aturannya sama ketatnya dengan mode tanpa tanda ADR-042 (≥ 5 kata sama persis, lafaz satu-satunya, atau ≥ 4 kata sesudah pengantar ayat), dan ditautkan sebagai dua rujukan sebagian.
4. Kalimat kaki halaman: "kutipan ayat **yang dikenali**".
5. `pnpm llm rejudge` → `plan --round 1` + `submit` (paragraf/ringkasan yang sumbernya berubah) → `retry` (koreksi tinjauan) dengan `--budget` = terpakai + $1 → `collect` → `report`.
6. Bangun `ihya-v6`, muat lokal, eval retrieval (`--gate`), muat staging, promote produksi (izin sudah ada), `corpus:qa`.
7. Nilai ulang 20 sampel T-17 yang sama dan sampel terarah. Skor lama tetap tercatat.

## Selesai bila

- [ ] Lapisan koreksi tinjauan + prompt v3 + pengenal ayat lintas paragraf teruji (`pnpm verify` lolos)
- [ ] QS 54:55 di p18256–p18257 tertaut ke ayat dan tidak diterjemahkan AI
- [ ] Semua paragraf di daftar koreksi punya terjemahan baru (prompt v3) atau sengaja tanpa terjemahan; biaya ≤ $1 di atas biaya S13
- [ ] `ihya-v6` di produksi, `corpus:qa` 30/30, eval retrieval set resmi hit@10 ≥ 90%
- [ ] 20 sampel T-17 dinilai ulang (skor lama dan baru dicatat di LOG)
- [ ] STATUS, LOG, KEPUTUSAN (ADR), TUGAS-PEMILIK, dan file sesi ini diperbarui

## Di luar cakupan

- Menerjemahkan ulang seluruh korpus atau mengubah prompt untuk semua paragraf.
- Halaman `/tinjau` dan penyimpanan tinjauan di D1 (S18).

## Catatan hasil

*(diisi agent)*
