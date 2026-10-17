# Surau

**Asisten riset kitab klasik Islam yang berpegang pada sumber.**

Surau adalah proyek nirlaba dan open source. Tujuannya membangun AI untuk ilmu agama yang setiap jawabannya bisa ditelusuri ke teks kitab aslinya: kitab, jilid, halaman cetak, dan kutipan Arab verbatim. Pembedanya: bahasa Indonesia di semua lapisan, kedalaman per kitab (struktur diperbaiki, takhrij tertaut, ayat dengan terjemahan Kemenag), kutipan yang diverifikasi kode, permalink halaman cetak yang stabil, review ustadz, dan biaya yang transparan (lihat ADR-022 di [implementasi/KEPUTUSAN.md](implementasi/KEPUTUSAN.md)).

> Status per 17 Oktober 2026: **Pembaca Ihya dan Cari sudah dirilis** di [surau.org](https://surau.org). MCP publik tersedia untuk uji klien; panduan ada di [surau.org/mcp](https://surau.org/mcp), rilis Fase 3 menyusul gerbang S17. Posisi terkini di [STATUS.md](implementasi/STATUS.md).

## Pakai Surau dari AI Anda

Tambahkan server MCP Streamable HTTP **https://mcp.surau.org/mcp**, tanpa autentikasi. Di Claude Code:

```sh
claude mcp add --transport http surau https://mcp.surau.org/mcp
```

Minta AI mencari di Surau, membaca konteks hasilnya, memeriksa kutipan dengan `verify_quote`, dan menyertakan sitasi serta tautan. Jawaban akhir dibuat AI pengguna dan masih bisa keliru. [Panduan Claude.ai, Desktop, Code dan ChatGPT](https://surau.org/mcp) · [tool dan batas pemakaian](apps/mcp/README.md) · [bukti uji dan pemantauan](docs/mcp-operasional.md).

## Kenapa "Surau"

Surau adalah tempat belajar mengaji dan kitab di tradisi Nusantara, tempat orang duduk bersama sumber dan gurunya. Proyek ini ingin menjadi pintu masuk ke kitab, bukan pengganti guru.

## Apa yang dibangun

Setiap fase bisa dirilis sendiri. Rinciannya ada di [FASE.md](implementasi/FASE.md).

| Fase | Nama | Yang bisa dipakai publik |
|---|---|---|
| 0 | Fondasi | Situs "Surau, segera hadir" dengan halaman tentang, prinsip, dan status |
| 1 | Pembaca Ihya | Ihya Ulumuddin lengkap: daftar isi, halaman cetak, takhrij al-'Iraqi, permalink. Tanpa LLM. |
| 2 | Cari | Pencarian Arab dan Indonesia, ayat dengan terjemahan Kemenag, terjemahan dan ringkasan AI berlabel |
| 3 | MCP publik | Korpus Surau bisa dipakai dari Claude, ChatGPT, dan AI lain |
| 4 | Jawab | Tanya-jawab dengan kutipan Arab terverifikasi, berkuota, dengan rem biaya |
| 5 | Ruang al-Ghazali | 21+ karya al-Ghazali; agen berbicara *tentang* karyanya, bukan *sebagai* al-Ghazali |
| 6 | Wiki | Kartu tokoh, istilah, hadits, dan indeks tematik, masing-masing dengan sumber dan status review |
| 7 | Kurikulum & data terbuka | ±92 kitab, dump data, dan benchmark terbuka |

## Prinsip inti

- **Kutipan tidak pernah ditulis oleh AI.** Kode yang menyalin teks dari sumber, dan kutipan yang tidak cocok ditolak.
- **Ayat dan terjemahannya dari sumber resmi, tidak diterjemahkan AI.** Teks ayat dari Tanzil, terjemahan Kemenag dari data pemilik (ADR-040).
- **Atribusi, bukan fatwa.** Kalimatnya "Menurut al-Ghazali dalam Ihya…", bukan "Hukumnya adalah…".
- **Setiap fakta punya sumber dan status review:** diekstrak AI → direview → diverifikasi ustadz.
- **Eval dibuat bersama ustadz.** Cakupan baru hanya ditambah setelah eval-nya lolos.
- **Tetap berguna walau anggaran AI habis.** Jawab mati, Pembaca dan Cari tetap berjalan.
- **Terbuka:** kode, alat, dan data sejauh lisensi sumbernya mengizinkan.

## Cara kerja proyek

Surau dibangun sepenuhnya oleh AI coding agent (Claude Code). Pemilik proyek, seorang product designer, memberi arah, mengambil keputusan, dan mengerjakan tugas yang butuh manusia (akun, token, ustadz). Pekerjaan dipecah menjadi sesi (S01–S21 untuk Fase 0–4) yang masing-masing muat dalam satu percakapan. Pemilik cukup mengetik `/sesi` untuk menjalankan sesi berikutnya dan `/posisi` untuk melihat posisi proyek. Panduan lengkapnya ada di [implementasi/README.md](implementasi/README.md). Stack ringkasnya: TypeScript di semua tempat, Next.js 16 di Cloudflare Workers, dan Cloudflare D1 (SQLite + FTS5); versi dan alasannya ada di [STACK.md](implementasi/STACK.md) serta ADR-002, ADR-005, dan ADR-007.

## Dokumen

| Dokumen | Isi |
|---|---|
| [Implementasi](implementasi/README.md) | Pusat kendali pembangunan: cara memakai `/sesi`, isi folder, siklus kerja agent |
| [Status](implementasi/STATUS.md) | Fase sekarang, sesi berikutnya, dan hal yang menunggu pemilik |
| [Fase](implementasi/FASE.md) | Fase rilis 0–7, sesi S01–S21, dan syarat rilis tiap fase |
| [Keputusan](implementasi/KEPUTUSAN.md) | Log keputusan teknis ADR-001–022 dan keputusan yang menunggu pemilik (P-1–P-7) |
| [01 Visi & Prinsip](docs/01-visi-dan-prinsip.md) | Tujuan, siapa penggunanya, prinsip yang tidak bisa ditawar |
| [02 Arsitektur](docs/02-arsitektur.md) | Lapisan sistem, stack, opsi yang ditolak, MCP |
| [03 Sumber Data](docs/03-sumber-data.md) | Shamela, OpenITI, Tanzil, terjemahan Kemenag, lisensi, dan temuan tentang data Ihya |
| [04 Wiki & Entitas](docs/04-wiki-dan-entitas.md) | Jenis entitas, tingkat risiko, pipeline ekstraksi, alur review |
| [05 Kebijakan](docs/05-kebijakan.md) | Kutipan, atribusi, Al-Qur'an, hadits, persona, lisensi, privasi, MCP, tata kelola (draf) |
| [06 Evaluasi](docs/06-evaluasi.md) | Set eval, metrik, syarat lolos, alat |
| [07 Roadmap](docs/07-roadmap.md) | Peta Fase 0–7 dan keputusan yang masih terbuka |
| [08 Biaya & Keberlanjutan](docs/08-biaya.md) | Biaya per pertanyaan, desain hemat, pengaman anggaran, pendanaan |
| [Riset stack implementasi](docs/riset/2026-10-15-riset-stack-implementasi.md) | Hasil riset stack per 15 Okt 2026 yang menjadi dasar ADR, beserta tautan sumber |
| [Riset pencarian Arab](docs/riset/2026-10-15-pencarian-arab/README.md) | Eksperimen FTS5 atas teks Ihya: normalisasi, klitik, ukuran indeks, prototipe kode |
| [Catatan riset 2026-10-15](docs/riset/2026-10-15-catatan-riset.md) | Ringkasan riset model, eval, dan proyek sejenis beserta tautan sumber |

## Lisensi

- **Status:** usulan ADR-021 di [KEPUTUSAN.md](implementasi/KEPUTUSAN.md), masih menunggu keputusan pemilik (P-6).
- **Kode:** Apache-2.0 ([`LICENSE`](LICENSE)), berlaku sejak S02.
- **Konten turunan** (teks, terjemahan dan ringkasan AI, indeks, dump): CC BY-NC-SA 4.0 di `data/LICENSE`, dibuat di sesi S07. Tanpa iklan, paywall, atau penjualan akses konten.
- **Data Shamela mentah tidak diredistribusikan** dan tidak pernah masuk git.
- **Atribusi** dicatat di `data/ATTRIBUTION.md`: teks Ihya dari OpenITI 2025.1.9 (CC BY-NC-SA 4.0), digitalisasi asal al-Maktaba al-Shamela, edisi Dar al-Ma'rifah (tampil di setiap halaman, ADR-018); teks ayat dari Tanzil (CC BY 3.0, verbatim); terjemahan dan transliterasi Kemenag dari data pemilik (ADR-040).
- Komponen HeroUI Pro di aplikasi web berlisensi komersial dan tidak ikut lisensi di atas. Untuk mem-build `apps/web` dibutuhkan lisensi HeroUI Pro sendiri. Repo ini dibuat publik atas keputusan pemilik dengan risiko lisensi yang diterima (ADR-025).
