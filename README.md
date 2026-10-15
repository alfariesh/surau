# Surau

**Asisten riset kitab klasik Islam yang berpegang pada sumber.**

Surau adalah proyek nirlaba dan open source. Tujuannya membangun AI untuk ilmu agama yang setiap jawabannya bisa ditelusuri ke teks kitab aslinya: kitab, jilid, halaman cetak, dan kutipan Arab verbatim.

> Status: **tahap perencanaan**. Belum ada kode. Dokumen di folder `docs/` adalah rancangan awal per 15 Oktober 2026.

## Kenapa "Surau"

Surau adalah tempat belajar mengaji dan kitab di tradisi Nusantara, tempat orang duduk bersama sumber dan gurunya. Proyek ini ingin menjadi pintu masuk ke kitab, bukan pengganti guru.

## Apa yang dibangun

1. **v1: riset Ihya Ulumuddin.** Tanya dalam bahasa Indonesia, lalu dapat jawaban dengan kutipan Arab, terjemahan, lokasi persis, dan status hadits dari takhrij al-'Iraqi.
2. **Ruang tokoh**, dimulai dari Ruang al-Ghazali: agen yang cakupannya seluruh karya satu ulama. Agen ini berbicara *tentang* karya sang ulama, tidak berbicara *sebagai* ulama tersebut.
3. **Wiki terstruktur** berisi tokoh, karya, istilah, ayat, hadits, pendapat, dan masalah fiqih. Setiap fakta menyimpan sumber dan status review-nya.
4. **Server MCP publik** supaya AI apa pun (Claude, ChatGPT, Gemini, model lokal) bisa memakai korpus dan alat Surau.

## Prinsip inti

- **Kutipan tidak pernah ditulis oleh AI.** Kode yang menyalin teks dari sumber, dan kutipan yang tidak cocok ditolak.
- **Atribusi, bukan fatwa.** Kalimatnya "Menurut al-Ghazali dalam Ihya…", bukan "Hukumnya adalah…".
- **Setiap fakta punya sumber dan status review:** diekstrak AI → direview → diverifikasi ustadz.
- **Eval dibuat bersama ustadz.** Cakupan baru hanya ditambah setelah eval-nya lolos.
- **Terbuka:** kode, alat, dan data sejauh lisensi sumbernya mengizinkan.

## Dokumen

| Dokumen | Isi |
|---|---|
| [01 Visi & Prinsip](docs/01-visi-dan-prinsip.md) | Tujuan, siapa penggunanya, prinsip yang tidak bisa ditawar |
| [02 Arsitektur](docs/02-arsitektur.md) | Lapisan sistem, stack pilihan, opsi yang ditolak, MCP |
| [03 Sumber Data](docs/03-sumber-data.md) | Shamela, OpenITI, HuggingFace, lisensi, temuan tentang data Ihya |
| [04 Wiki & Entitas](docs/04-wiki-dan-entitas.md) | Jenis entitas, pipeline ekstraksi (LangExtract), alur review |
| [05 Kebijakan](docs/05-kebijakan.md) | Persona, atribusi, hadits, fatwa, lisensi, tata kelola (draf) |
| [06 Evaluasi](docs/06-evaluasi.md) | Set eval, metrik, syarat lolos, alat |
| [07 Roadmap](docs/07-roadmap.md) | v1 → v4 beserta syarat tiap tahap |
| [08 Biaya & Keberlanjutan](docs/08-biaya.md) | Biaya per pertanyaan, desain hemat, decision model (Jev), pendanaan |
| [Catatan riset 2026-10-15](docs/riset/2026-10-15-catatan-riset.md) | Ringkasan riset stack, model, eval, dan proyek sejenis beserta tautan sumber |

## Lisensi (rencana)

- Kode: Apache-2.0.
- Data: mengikuti lisensi sumbernya. Turunan OpenITI memakai CC BY-NC-SA 4.0. Data Shamela **tidak** diredistribusikan di repo ini sampai izinnya jelas (lihat [03 Sumber Data](docs/03-sumber-data.md)).
