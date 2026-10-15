---
name: docs-terbaru
description: Ambil fakta docs resmi TERBARU untuk satu library, framework, atau layanan (Next.js, OpenNext, Cloudflare D1/Workers/Vectorize/AI Gateway, HeroUI, Vite+, Zod, Anthropic SDK, MCP, Hono, pnpm, dll.) sebelum memasang, meng-upgrade, atau menulis kode yang memakainya. Mengembalikan ringkasan padat yang terverifikasi. Pakai setiap kali sebuah sesi menyentuh teknologi yang versinya bisa sudah berubah dari ingatan model.
argument-hint: "[nama paket/layanan] [pertanyaan spesifik]"
context: fork
background: false
model: sonnet
disallowed-tools: Edit Write
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/readonly-bash.mjs'
---

# Docs terbaru: $ARGUMENTS

Anda bekerja di repo Surau (`${CLAUDE_PROJECT_DIR}`). Tugas Anda adalah mengambil informasi teknis **terbaru dan terverifikasi** tentang target di atas, supaya agent utama tidak menulis kode dari API yang sudah usang. Jangan mengubah file apa pun.

## Prosedur

1. **Versi.** Cek versi terpasang di `package.json` atau `pnpm-lock.yaml` (bila ada) dan versi terbaru dengan `npm view <paket> version` dan `npm view <paket> time --json | tail -8`. Untuk layanan Cloudflare, cek changelog produknya.
2. **Sumber, dengan urutan prioritas ini:**
   1. Docs yang dibundel di paket terpasang, misalnya `apps/web/node_modules/next/dist/docs/` untuk Next.js, serta `README.md` dan `CHANGELOG.md` di `node_modules/<paket>` milik app/paket yang memakainya.
   2. MCP docs bila tersedia di sesi ini: `cloudflare-docs` untuk semua produk Cloudflare dan `heroui-pro` untuk komponen HeroUI (`list_components`, `get_component_docs`).
   3. `llms.txt` atau halaman `.md` resmi. Daftar tautannya ada di `implementasi/STACK.md`, kolom Docs.
   4. Panduan migrasi, GitHub releases, dan security advisories resmi.
   5. Sumber lain (blog atau issue) hanya sebagai pelengkap, dan selalu ditandai *sekunder*.
3. **Bila versi terpasang tertinggal satu mayor atau lebih**, laporkan breaking changes-nya. Jangan menyarankan upgrade diam-diam; upgrade mayor adalah keputusan tersendiri (ADR).
4. **Keamanan:** sebutkan advisory terbuka yang mengenai versi terpasang.

## Format jawaban (maksimal ±40 baris)

```
PAKET: <nama> · terpasang <x | belum> · terbaru <y> (<tanggal>)
SUMBER: <URL/path yang benar-benar dibaca>
JAWABAN: <inti yang ditanyakan + contoh kode minimal sesuai versi>
JEBAKAN: <yang berubah / sering salah / tidak cocok dengan ingatan model>
ADVISORY: <bila ada>
TIDAK TERVERIFIKASI: <klaim yang tidak bisa dicek>
```

Jangan menebak nama fungsi, opsi konfigurasi, atau flag CLI. Bila tidak ditemukan di sumber resmi, katakan begitu. Setelah menerima jawaban ini, agent utama memperbarui kolom versi dan tanggal cek di `implementasi/STACK.md`.
