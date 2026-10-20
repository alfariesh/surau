# S21 · UI Tanya, transparansi biaya & rilis Fase 4

> **Fase:** 4 · **Status:** sebagian (2026-10-21; PR #100, ADR-066) · butir manusia (ustadz, persetujuan tampilan) dan syarat R4 belum terpenuhi
> **Prasyarat:** S20 selesai · Tugas pemilik: review ustadz atas prompt, kebijakan penolakan, dan sampel jawaban (T-13)
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Halaman Tanya yang jujur: jawaban Indonesia dengan kartu kutipan Arab verbatim, label "terjemahan AI", status hadits dari takhrij, tombol lapor, dan halaman transparansi biaya. Semua syarat R4 terpenuhi.

## Baca dulu

- [docs/05](../../docs/05-kebijakan.md) (seluruhnya), syarat R4 di FASE.md, dan riwayat git template chat HeroUI (komponen thread/composer, sebelum dihapus di S04).
- MCP `heroui-pro`: komponen Chat (`ChatConversation`, `ChatMessage`, `ChatSource`/`ChatSources` dengan `sourceType="document"`, `PromptInput`) dan `@heroui-pro/react/markdown` (penjelasan Indonesia saja).

## Langkah (garis besar)

1. `/tanya`: streaming jawaban dari `/api/jawab`.
   - Penjelasan Indonesia dirender sebagai Markdown, dengan penanda sitasi `[n]` dipetakan ke kartu.
   - Kartu kutipan memuat `ArabicText` dari DB + terjemahan + lokasi + tautan pembaca.
   - **Kutipan Arab tidak pernah lewat Markdown.**
2. Label tetap: "Surau adalah asisten riset, bukan pemberi fatwa." Untuk pertanyaan kasus pribadi, arahkan ke ulama setempat ([docs/05](../../docs/05-kebijakan.md) §2).
3. Keadaan khusus:
   - "Tidak ditemukan di kitab yang dicakup" disertai saran Cari.
   - Kuota habis, Jawab dimatikan, atau anggaran habis → arahkan ke Cari.
   - Turnstile (`interaction-only`) hanya saat diminta server.
4. Tombol "Laporkan jawaban keliru" menulis ke `feedback` dan muncul di `/admin` dan `/tinjau`.
5. `/transparansi`: biaya AI, hosting, dan jumlah pertanyaan bulan ini (dari ledger), serta cara berdonasi (tanpa iklan atau paywall, sesuai klausul NC).
6. Eval final: `pnpm run eval:jawab` (berbayar, dengan izin) memenuhi target R4. Ustadz mereview prompt sistem, kebijakan penolakan, dan ≥20 sampel jawaban di `/tinjau`.
7. E2E: tanya → jawaban dengan kutipan → klik kutipan membuka pembaca. Uji juga sakelar mati.
8. Sarankan `/rilis 4`.

## Langkah (rinci, 2026-10-21)

Prasyarat: S20 selesai (PR #99, ADR-065). Pemilik menyetujui semua tindakan sesi ini di chat (2026-10-20 malam); biaya LLM sesi ini dibatasi agent **≤ US$0,50** (eval ulang + uji staging). Review ustadz (T-13/T-24) dan persetujuan tampilan oleh pemilik tidak bisa dikerjakan agent malam ini, jadi dua butir itu tetap terbuka.

1. **Status hadits (wajib sebelum Jawab dibuka, ADR-064 butir 7):** deteksi toleran (Status/status, hadits/hadis, penanda tebal di dalam/luar, spasi sebelum titik dua), awalan + baris baru (status di baris berikutnya), singkatan (HR., w., r.a., saw., dkk., no., h., j.) tidak memotong kalimat, status yang tidak didukung takhrij diganti sampai akhir baris, pemasangan paragraf lebih ketat (paragraf yang menyitasi >1 paragraf badan wajib menyitasi takhrij sendiri), dan penahanan pratinjau dari gabungan teks (awalan yang terbelah di dua blok). Tes regresi; `JAWAB_PIPELINE_VERSION` naik; eval ulang 42 soal publik (berbayar kecil).
2. **`GET /api/kutipan`** (web): teks Arab + label lokasi + permalink untuk rentang `{passage_id, char_start, char_end}` dari hasil Jawab, disalin kode dari DB dan diverifikasi (`resolveEvalSource`), plus terjemahan AI paragrafnya (berlabel). Maks 20 rentang, batas per klien.
3. **`/tanya`** (klien, HeroUI OSS: TextArea, Button, Card, Chip, Alert): status Jawab → komposer → Turnstile `interaction-only` hanya bila server meminta (sitekey dari status) → SSE (`stage`, `block`, `reset`, `done`, `fallback`, `error`) → hasil. Penjelasan Indonesia per blok: blok bersitasi dengan penanda `[n]`, blok tanpa sitasi tampil redup dengan keterangan (ADR-064); kartu kutipan Arab dari DB (bukan Markdown). Label tetap "asisten riset, bukan pemberi fatwa" + saran bertanya ke ulama setempat untuk kasus pribadi. Status hadits: label "diekstrak AI" + teks takhrij asli dari DB; status sangat lemah/palsu diberi tanda jelas.
4. **Keadaan khusus:** `not_found` (kalimat baku + hasil Cari), `fallback` (tidak terverifikasi/penyedia/anggaran/klien pergi → hasil Cari), galat sebelum stream (`disabled`, `not_configured`, `budget`, `quota_exceeded`, `rate_limited`, tantangan gagal) → pesan + tautan Cari dengan pertanyaan yang sama.
5. **Laporkan jawaban keliru:** formulir kecil → `POST /api/feedback` jenis `answer`, pesan berisi komentar + pertanyaan + awal jawaban, disamarkan `redactPii` dan dipotong 2.000 karakter (persetujuan eksplisit pengguna saat melapor); tampil di `/admin`. Integrasi `/tinjau` (answer_log) ditunda dan dicatat.
6. **`/transparansi`:** biaya AI bulan ini dan sebelumnya dari ledger (terpakai, perkiraan, jumlah pertanyaan berbiaya), plafon, biaya hosting tetap (Workers Paid US$5/bulan), prinsip tanpa iklan/paywall (klausul NC), dan cara mendukung.
7. **Navigasi:** menu "Tanya" tetap "segera" di produksi sampai `/rilis 4`; halaman `/tanya` bisa dibuka langsung dan menampilkan keadaan "belum dibuka" bila rute produksi mati.
8. **Uji:** tes unit/komponen, e2e Playwright `/tanya` (keadaan mati di Preview), dan uji manual ujung ke ujung di Preview dengan sakelar staging dinyalakan sementara (tantangan uji → cookie → jawaban → kartu kutipan → buka pembaca), lalu sakelar dimatikan lagi. Sarankan `/rilis 4` hanya bila syarat R4 terpenuhi (diperkirakan belum: lokasi dan kesetiaan di bawah target).

## Selesai bila

- [ ] Semua syarat R4 (FASE.md) terpenuhi dan tercatat dengan angka — **belum** (angka di Catatan hasil: lokasi 73,5% < 90%, kesetiaan/atribusi/bahasa belum terukur oleh judge terkalibrasi atau ustadz)
- [ ] Review ustadz atas prompt, kebijakan, dan sampel tercatat (nama dan tanggal) — **belum** (T-24 ditunda pemilik, ADR-054)
- [ ] E2E lolos; pemilik menyetujui tampilan — **E2E lolos** (CI Preview + uji manual staging), **persetujuan pemilik belum** (T-25)
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

- **Dibuat:** deteksi status hadits toleran + `JAWAB_PIPELINE_VERSION` 2 (`packages/llm/src/jawab/citations.ts`, `pipeline.ts`); `/tanya` (`components/tanya/*`, `lib/tanya/model.ts`, Turnstile sesuai permintaan, SSE, blok bersitasi vs penghubung, kartu kutipan, status hadits AI + tanda lemah, laporan jawaban); `GET /api/kutipan` (teks Arab dari DB); laporan jawaban lewat `/api/feedback` (jenis `answer` hanya dari `/tanya`); `/transparansi` (biaya AI per bulan dari ledger); tautan sidebar + sitemap; e2e `apps/web/e2e/tanya.spec.ts`; T-25; ADR-066. Perbaikan S20 yang ikut: tanda tangan cookie anon wajib base64 kanonis (tes perusakan yang kadang lolos di CI).
- **Bukti:**
  - Status hadits: tes unit (variasi penulisan, baris baru, singkatan, ganti sampai akhir baris, dua paragraf badan) + tes Worker (awalan terbelah di dua blok tidak bocor ke pratinjau). Eval ulang `s21-publik-hadits-v1` (42 soal publik, US$0,1167): kutipan valid **100%** (171/171), lokasi **73,5%** (25/34), penolakan tepat 100% (8/8), tidak salah menolak 97,1% (33/34), tanpa pola fatwa 100%; 5 kalimat status hadits → 2 didukung takhrij, 3 "belum diketahui", **0 tanpa takhrij yang tampil**. Laporan: `evals/reports/jawab-s21-publik-hadits-v1.md`.
  - UI: tes render server (`answer-view.test.tsx`), pengurai SSE (`model.test.ts`), `/api/kutipan` (`kutipan-handler.test.ts`), transparansi (`transparency-data.test.ts`), laporan jawaban (`feedback-handler.test.ts`). CSS HeroUI lengkap (`heroui-css.test.ts`).
  - Uji ujung ke ujung di Preview `pr-100.surau.org/tanya` (sakelar `surau-app-staging` dinyalakan sebentar lalu dimatikan, biaya ±US$0,003): status `challenge: true` → Turnstile uji lolos → jawaban bertahap ("Menyusun jawaban…") → hasil Claude Haiku 5.5 dengan penanda [n], kalimat penghubung redup, kartu kutipan Arab dari DB (RTL, Naskh) + terjemahan AI berlabel → "Buka di pembaca" ke `/kitab/ihya/4/62#p16215` (paragraf yang sama); pertanyaan ulang di ponsel 375 px "Dari jawaban tersimpan", kuota 2 dari 10; ledger staging 2.792 µ$ `committed`.
  - `pnpm verify` + CI PR #100: lihat LOG.
- **Biaya LLM S21:** ±US$0,12 (eval ulang US$0,1167 + uji staging ±US$0,003), di bawah batas agent US$0,50.
- **Belum / ditunda:** syarat R4 (lokasi < 90%, judge belum terkalibrasi, kualitas bahasa belum dinilai); review ustadz (T-24) dan persetujuan tampilan pemilik (T-25); laporan jawaban ke `/tinjau` (`answer_log`) menunggu keputusan pemilik + dewan soal penyimpanan pertanyaan; menu "Tanya" tetap "segera" dan `/tanya` `noindex` sampai `/rilis 4`; `/rilis 4` **belum disarankan**.
- **Pesan untuk sesi berikutnya:** hambatan mutu terbesar tetap pencarian (lokasi gold tidak masuk dokumen ±25%); usul sesi sisipan pencarian makna/routing dua langkah sebelum `/rilis 4`; muat 42 jawaban eval S21 ke `/tinjau` saat Anas siap (T-24); tes batas laju MCP (`apps/mcp/src/index.test.ts` "tool baca") sesekali gagal bila melewati pergantian menit (jendela tetap) — perlu dibuat tahan waktu.
