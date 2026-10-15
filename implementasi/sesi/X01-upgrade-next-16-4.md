# X01 · Sesi sisipan: upgrade Next.js 16.4 + React 19.3

> **Fase:** sisipan (bisa dikerjakan kapan saja setelah S03) · **Status:** belum, **gerbang SIAP** (2026-10-15: OpenNext 1.20.12 mendukung Next 16.4; paket boleh dipasang mulai 16 Okt 14:51 WIB)
> **Prasyarat:** S03 selesai **dan** gerbang di bawah terpenuhi · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent (pendek)

## Kenapa sesi ini ada

Per 15 Okt 2026, Surau memakai Next **16.3.8** (ADR-003), karena `@opennextjs/cloudflare` 1.20.11 rusak di Next 16.4 (issue #1448: semua halaman error `loadManifest(preview-props.json)`). Patch-nya sudah di-merge di `opennextjs-aws` (PR #1285), tapi belum dirilis. Next 16.4.1 menambal 3 advisory (RCE `use cache`, RCE image optimizer, DoS Server Actions) yang hanya kita mitigasi dengan mematikan fiturnya. Begitu OpenNext merilis dukungan, kita naik.

## Gerbang (cek dengan `/docs-terbaru`)

- Release notes `@opennextjs/cloudflare` menyebut dukungan Next 16.4, dan issue #1448 sudah ditutup.
- Versi Next 16.4.x terbaru berumur ≥24 jam (`minimumReleaseAge` pnpm).
- Tidak ada advisory baru yang terbuka untuk versi target.

Skill `/sesi` mengecek gerbang ini paling lambat setiap 7 hari (langkah 0.4), mencatat tanggal ceknya di STATUS.md, dan menandai sesi ini **siap** bila gerbangnya terpenuhi. `/posisi` hanya melaporkannya.

## Langkah

1. Branch `sesi/x01-next-16-4`. Naikkan `next`, `react`, `react-dom`, dan `@opennextjs/cloudflare` lewat catalog. Baca catatan rilis Next 16.4 di `apps/web/node_modules/next/dist/docs/` dan https://nextjs.org/blog/next-16-4. Pertimbangkan `next upgrade --agent`, tapi baca dulu setiap perubahannya.
2. Pertahankan larangan ADR-003. Hanya **evaluasi** apakah `cacheComponents` bisa diaktifkan, dan itu pun hanya bila PR OpenNext #1318 sudah dirilis. Bila diaktifkan, tulis ADR baru.
3. `pnpm verify` lalu `pnpm --filter @surau/web preview` (workerd). Smoke test semua rute yang ada beserta e2e.
4. Deploy ke preview PR, cek Workers Logs, lalu merge dengan izin.
5. Perbarui ADR-003 (status, versi), STACK.md, dan STATUS.md.

## Selesai bila

- [ ] Next 16.4.x dan React 19.3.x terpasang; `pnpm verify`, preview workerd, dan e2e lolos
- [ ] Tidak ada error di Workers Logs setelah deploy preview
- [ ] ADR-003, STACK, STATUS, LOG, dan file ini diperbarui

## Catatan hasil

*(diisi agent)*
