# Redaksi Surau (`surau-redaksi`)

Plugin Claude untuk membuat **konten turunan Surau** dari kitab klasik: Intisari Bab, Intisari Kitab, Faedah, dan Jalur 7 hari, serta **terjemahan Inggris per paragraf** (ADR-132). Dipakai di Claude Desktop atau claude.ai (paket berbayar), juga di Cowork dan Claude Code.

Prinsipnya: **kode menyalin, model menunjuk.** Draf hanya berisi teks Indonesia, ID paragraf, dan offset; teks Arab, ayat, dan terjemahan Faedah disalin kode dari database Surau. Setiap draf diperiksa otomatis sebelum terbit.

- Standar dan rangka konten: [docs/09-konten.md](../../docs/09-konten.md)
- Pedoman produksi (alur, peran, aturan): [docs/redaksi-operasional.md](../../docs/redaksi-operasional.md)
- Keputusan: [ADR-125](../../implementasi/keputusan/ADR-125.md)

## Isi plugin

| Skill | Gunanya |
|---|---|
| `pedoman-redaksi` | Aturan bersama: Arab lewat offset, atribusi bukan fatwa, ayat dan status hadits tidak ditulis, format berkas |
| `intisari-bab` | Intisari satu bab/sub-bab: inti, ringkasan, gagasan berjangkar, soal berjawaban, kutipan |
| `intisari-kitab` | Intisari satu Kitab dari Intisari Bab anak-anaknya |
| `faedah` | Butir satu paragraf untuk WhatsApp Channel (terjemahan disalin kode) |
| `jalur` | Jalur baca 7 hari, satu bagian ber-Intisari per hari |
| `periksa-draf` | Periksa mandiri: baca ulang sumber, nilai Benar/Kurang/Salah |
| `terjemah-inggris` | Terjemahan Inggris per paragraf dari teks Arab (Sonnet), ayat sebagai placeholder, format `surau-terjemah/1` |

Konektor: `surau-redaksi` → `https://mcp.surau.org/redaksi` (tanpa login, hanya-baca, tanpa LLM): delapan tool baca Surau ditambah `check_content_draft`, `list_faedah_candidates`, `list_translation_units`, dan `check_translation_draft`.

## Memasang (Claude Desktop atau claude.ai)

1. **Settings > Capabilities**: nyalakan **Code execution and file creation**.
2. **Customize > Plugins > Add > Add marketplace**, isi `alfariesh/surau`, lalu nyalakan **Sync automatically**.
3. Di daftar plugin marketplace **surau**, pasang **Redaksi Surau**.
4. Buka plugin itu, tab **Connectors**, lalu **Connect** konektor `surau-redaksi` (tanpa login).
5. Saat membuat konten, matikan konektor "Surau" publik di percakapan itu supaya tool tidak ganda.

Cadangan bila marketplace tidak bisa ditambahkan: minta agen menjalankan `pnpm plugin:paket`, lalu **Customize > Plugins > Add > Upload plugin** dan pilih `surau-redaksi.plugin`.

Di Claude Code: `/plugin marketplace add alfariesh/surau`, lalu `/plugin install surau-redaksi@surau`.

## Memakai

Buka chat baru, pilih model (Opus untuk Intisari, Sonnet cukup untuk Faedah/Jalur), lalu ketik misalnya:

- "Buat Intisari Bab 100007"
- "Buat Intisari Kitab al-'Ilm (100003)"
- "Pilih 7 Faedah dari bab 100008"
- "Susun Jalur 7 hari Kitab al-'Ilm"
- "Terjemahkan bab 100007 ke bahasa Inggris" (pilih model Sonnet)

Claude membaca teks lewat konektor, menulis draf, menjalankan pemeriksa sampai lolos, memeriksa ulang setiap butir, lalu membuat berkas JSON untuk diunduh. Unduh berkasnya, lalu di Claude Code (repo Surau) ketik "impor konten dari Downloads" (atau "impor terjemahan dari Downloads").

## Lisensi

Instruksi plugin: Apache-2.0, sama dengan kode Surau. Teks kitab dan konten turunannya, termasuk contoh di `skills/*/references/contoh.json` yang diturunkan dari *Ihya' 'Ulum ad-Din* (edisi Dar al-Ma'rifah, teks OpenITI), berlisensi **CC BY-NC-SA 4.0**: nonkomersial, berbagi serupa, dan wajib atribusi (karya, edisi, juz, halaman, dan Surau).
