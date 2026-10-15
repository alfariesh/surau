---
name: posisi
description: Ringkas posisi proyek Surau untuk pemilik dalam bahasa awam, yaitu fase sekarang, sesi berikutnya, hal yang menunggu pemilik, dan apa yang sudah bisa dicoba. Pakai saat pemilik bertanya "sudah sampai mana", "posisi", "status proyek", atau "apa selanjutnya", atau mengetik /posisi.
disallowed-tools: Edit Write
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/readonly-bash.mjs'
---

# /posisi: posisi proyek dalam bahasa awam

Skill ini hanya membaca. Jangan mengubah file apa pun.

1. Baca `implementasi/STATUS.md`, tiga entri teratas `implementasi/LOG.md`, butir yang belum dicentang di `implementasi/TUGAS-PEMILIK.md`, dan tabel "Keputusan yang menunggu pemilik" di `implementasi/KEPUTUSAN.md`.
2. Cek `git status` dan `git log --oneline -5` untuk memastikan catatan sesuai dengan kenyataan. Bila tidak sesuai (misalnya STATUS bilang sesi selesai tapi ada perubahan yang belum di-commit atau belum digabung ke main), sebutkan.
3. Jawab dengan format ini, maksimal ±14 baris, tanpa istilah teknis yang tidak perlu:

```
Fase sekarang: <N · nama>, <x dari y sesi selesai>
Sudah bisa dicoba: <apa dan di mana; atau "belum ada">
Terakhir dikerjakan: <sesi + 1 kalimat>
Berikutnya: Sesi NN · <judul> (<1 kalimat apa yang akan dibuat>). Ketik /sesi.
Menunggu Anda: <tugas pemilik yang memblokir, dengan langkah singkat; atau "tidak ada">
Keputusan untuk Anda: <P-NN yang wajib dijawab dan belum dijawab; atau "tidak ada">
Rilis berikutnya: <nama rilis fase ini + apa yang akan bisa dipakai publik>
Sesi sisipan: <X01: menunggu gerbang / siap; tanggal terakhir dicek>
```
