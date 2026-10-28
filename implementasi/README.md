# Implementasi Surau

Folder ini adalah **pusat kendali pembangunan Surau**. Dokumen produk (visi, kebijakan, arsitektur konsep) ada di [`docs/`](../docs/). Folder ini berisi rencana eksekusi: urutan kerja, status terkini, dan catatan yang diperbarui agent di setiap sesi.

Surau dibangun **sepenuhnya oleh AI coding agent** (Claude Code). Pemilik proyek adalah product designer. Ia memberi arah, mengambil keputusan, dan mengerjakan tugas yang memang butuh manusia (akun, token, ustadz).

---

## Mulai di sini (sekali saja)

1. Kerjakan **T-00, T-01, dan T-02** di [TUGAS-PEMILIK.md](TUGAS-PEMILIK.md). Isinya: membuka repo di Claude Code, login HeroUI Pro, dan merapikan versi Node. Semua perintahnya diketik di aplikasi **Terminal**, bukan di chat.
2. Tutup lalu buka lagi aplikasi Claude, buka percakapan baru di folder Surau, lalu ketik **`/sesi`**.

## Untuk pemilik: cara memakai

Cukup ketik salah satu perintah ini di Claude Code (sebaiknya **buka percakapan baru untuk setiap sesi** supaya konteks agent bersih):

| Ketik | Yang terjadi |
|---|---|
| `/sesi` | Agent mengerjakan **sesi berikutnya** sampai selesai, mengecek hasilnya, memperbarui catatan, lalu melapor. |
| `/sesi 4` | Agent mengerjakan sesi 4. Prasyaratnya dicek dulu. |
| `/posisi` | Ringkasan posisi proyek dalam bahasa awam: sudah sampai mana, apa berikutnya, dan apa yang menunggu Anda. (Bukan `/status`; itu perintah bawaan Claude Code.) |
| `/rilis` | Agent menjalankan daftar periksa rilis untuk fase yang sudah selesai. |

Kalimat biasa seperti "kerjakan sesi berikutnya" juga bisa.

**Kapan Anda dibutuhkan:**
- Saat agent berhenti dengan label **MENUNGGU PEMILIK**. Daftar lengkapnya ada di [TUGAS-PEMILIK.md](TUGAS-PEMILIK.md), misalnya membuat akun, menyiapkan token, atau memilih nama domain.
- Saat agent meminta izin untuk tindakan yang keluar dari komputer Anda: deploy, push ke GitHub, atau menulis ke database produksi.
- Di akhir setiap sesi: periksa hasilnya (agent memberi tautan atau cara melihatnya), lalu jawab "ya" bila agent bertanya "Gabungkan Sesi NN ke main sekarang?". Sesi berikutnya baru bisa dimulai setelah hasil sesi sebelumnya digabung.

---

## Isi folder

| File | Isi | Siapa yang memperbarui |
|---|---|---|
| [STATUS.md](STATUS.md) | Papan status: fase sekarang, sesi berikutnya, hal yang menghambat | Agent, setiap akhir sesi |
| [FASE.md](FASE.md) | Fase rilis 0–7. Setiap fase bisa dirilis sendiri. | Agent, bila rencana berubah |
| [sesi/](sesi/) | Satu file per sesi kerja: tujuan, langkah, dan syarat selesai | Agent: dicentang dan diberi catatan |
| [STACK.md](STACK.md) | Teknologi, versi, dan **tautan docs resmi yang wajib dibaca** | Agent, setiap kali versi berubah |
| [ARSITEKTUR-TEKNIS.md](ARSITEKTUR-TEKNIS.md) | Struktur monorepo, model data, alur request, binding Cloudflare | Agent |
| [KONVENSI.md](KONVENSI.md) | Aturan kode, git, tes, penamaan, dan bahasa | Agent (perubahan dicatat di KEPUTUSAN) |
| [KEPUTUSAN.md](KEPUTUSAN.md) | Indeks keputusan teknis (ADR); isi tiap ADR ada di [keputusan/](keputusan/) (satu file per ADR) | Agent dan pemilik |
| [LOG.md](LOG.md) | Jurnal sesi bulan berjalan: apa yang dikerjakan, hasil verifikasi, biaya. Bulan sebelumnya di [log/](log/) | Agent, setiap akhir sesi |
| [TUGAS-PEMILIK.md](TUGAS-PEMILIK.md) | Hal yang hanya bisa dikerjakan manusia | Agent menambah; pemilik mencentang |

Pengaturan agent ada di luar folder ini: [`CLAUDE.md`](../CLAUDE.md), [`.claude/skills/`](../.claude/skills/) (`sesi`, `posisi`, `rilis`, `docs-terbaru`), [`.claude/agents/peninjau.md`](../.claude/agents/peninjau.md), [`.claude/rules/teks-arab.md`](../.claude/rules/teks-arab.md), [`.claude/settings.json`](../.claude/settings.json) (izin + hook), dan [`.mcp.json`](../.mcp.json) (docs Cloudflare; MCP HeroUI dipasang pemilik di level user lewat T-01; `next-devtools` ditambahkan di S01).

---

## Untuk agent: siklus satu sesi

Prosedur lengkapnya ada di skill [`/sesi`](../.claude/skills/sesi/SKILL.md). Ringkasnya:

1. **Orientasi.** Baca `STATUS.md`, file sesi target, dan dokumen konteks yang ditautkan di file sesi itu. Jangan membaca semua dokumen.
2. **Cek prasyarat.** Sesi sebelumnya harus selesai dan tugas pemilik yang dibutuhkan sudah dicentang. Bila belum, berhenti, tandai **MENUNGGU PEMILIK** di STATUS, dan jelaskan dengan bahasa awam apa yang perlu dilakukan pemilik.
3. **Cek docs terbaru** untuk setiap teknologi yang disentuh sesi ini (skill `/docs-terbaru`). Versi dan API di ingatan model bisa usang.
4. **Kerjakan** di branch `sesi/sNN-slug` dengan commit kecil yang jelas.
5. **Verifikasi** setiap butir "Selesai bila" dengan menjalankan perintahnya, bukan dengan asumsi.
6. **Catat.** Centang file sesi dan isi bagian *Catatan hasil*. Perbarui `STATUS.md`, tambahkan entri ke `LOG.md`, catat keputusan baru di `KEPUTUSAN.md`, dan perbarui versi di `STACK.md`.
7. **Gabungkan** ke `main` setelah pemilik setuju: lewat PR yang CI-nya hijau, atau secara lokal sebelum ada remote (S01).
8. **Lapor** ke pemilik dengan bahasa awam: apa yang sekarang bisa dilihat atau dicoba, apa yang belum, dan apa berikutnya.

### Rencana bergulir

- Sesi untuk fase yang sedang berjalan dan fase berikutnya ditulis **rinci**. Fase yang lebih jauh ditulis **garis besar**. Langkah pertama sesi pertama sebuah fase adalah merinci sesi-sesi fase itu.
- Agent boleh memecah, menggabung, atau menambah sesi bila temuan di lapangan menuntutnya. Setiap perubahan dicatat di `KEPUTUSAN.md` dan `LOG.md`, dan nomor sesi yang sudah selesai tidak diubah.
- Satu sesi harus muat dalam satu percakapan agent (kira-kira 1–3 jam kerja agent) dan berakhir dalam keadaan **hijau**: tes lolos, build lolos, tidak ada pekerjaan setengah jadi di `main`.

### Prinsip yang tidak boleh dilanggar

Ringkasan dari [docs/01](../docs/01-visi-dan-prinsip.md) dan [docs/05](../docs/05-kebijakan.md). Detailnya ada di aturan [`.claude/rules/teks-arab.md`](../.claude/rules/teks-arab.md), yang dimuat otomatis saat agent membuka kode.

1. Teks Arab yang tampil **selalu disalin oleh kode** dari database. Model AI tidak pernah menulis kutipan dan tidak pernah menerjemahkan ayat.
2. Setiap kutipan punya alamat: kitab, edisi, juz, halaman cetak, dan permalink.
3. Bahasa atribusi, bukan fatwa.
4. Data Shamela dan teks kitab mentah **tidak pernah** masuk ke git. Konten turunan berlisensi CC BY-NC-SA 4.0 (ADR-021).
5. Setiap fase bisa dirilis sendiri dan aplikasi tetap berguna walau anggaran AI habis.
