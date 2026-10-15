# Log Sesi

Entri terbaru di paling atas. Satu entri per sesi (atau per hari kerja bila satu sesi butuh lebih dari satu percakapan).

Format entri:

```
## YYYY-MM-DD · SNN · Judul sesi — selesai | sebagian | terblokir
- Dikerjakan: 2–5 poin
- Verifikasi: perintah yang dijalankan → hasil (mis. `pnpm verify` → lolos, 42 tes)
- Biaya API: $x (bila ada panggilan LLM berbayar), atau –
- Keputusan: ADR-NNN (bila ada)
- Catatan untuk sesi berikutnya: …
```

---

## 2026-10-15 · S02 (lanjutan) · Repo dibuat publik — selesai

- Dikerjakan: atas permintaan pemilik, `alfariesh/surau` diubah menjadi publik (risiko lisensi HeroUI Pro dijelaskan dan diterima); persetujuan workflow untuk semua kontributor luar; proteksi `main` (wajib `verify`, berlaku untuk admin, tanpa force-push).
- Verifikasi: pindai riwayat git (file sensitif + pola token) → bersih · `gh repo view` → PUBLIC · `fork-pr-contributor-approval` → `all_external_contributors` · `gh api …/branches/main/protection` → lihat Catatan hasil S02.
- Biaya API: –
- Keputusan: ADR-025 (mengganti ADR-024 butir 7)
- Catatan untuk sesi berikutnya: semua perubahan ke `main` lewat PR yang hijau, termasuk catatan status. Jangan setujui run CI dari PR fork yang mengubah `.github/`.

## 2026-10-15 · S02 · GitHub & CI — selesai (digabung, PR #1)

- Dikerjakan: repo lama `alfariesh/surau` di-rename ke `surau-lama` (izin pemilik), repo privat baru `alfariesh/surau` dibuat dan `main` di-push; workflow `ci.yml` (`pnpm verify`, cache `node_modules`, token hanya di langkah install); `dependabot.yml`; template PR; `LICENSE` Apache-2.0; MCP `next-devtools` diuji.
- Verifikasi: `gh secret list` (Actions + Dependabot) → `HEROUI_AUTH_TOKEN` ada · PR https://github.com/alfariesh/surau/pull/1 → run [38693275094](https://github.com/alfariesh/surau/actions/runs/38693275094), [38693870081](https://github.com/alfariesh/surau/actions/runs/38693870081), [38694117242](https://github.com/alfariesh/surau/actions/runs/38694117242) semuanya success · run ketiga "Cache hit", install 2,5 dtk tanpa postinstall Pro · SHA action cocok dengan tag (`gh api git/ref/tags`) · proteksi branch → HTTP 403 (akun Free) · `nextjs_index` → 9 tool, `get_compilation_issues` → 0 masalah.
- Biaya API: –
- Keputusan: ADR-024
- Catatan untuk sesi berikutnya: tindak lanjut S01 (vite-plus 1.2.0, React 19.2.9) belum cukup umur saat S02; kerjakan di awal S03. Workflow S03 ikuti pola `ci.yml` (pin SHA, token per langkah, restore/save cache dengan kunci sama).

## 2026-10-15 · S01 · Monorepo & toolchain — selesai (1 butir tertunda)

- Dikerjakan: template dipindah ke `apps/web` (`@surau/web`); monorepo pnpm 12 dengan catalog strict, `allowBuilds`, dan `minimumReleaseAge` eksplisit; Vite+ sebagai toolchain tunggal (fmt, lint 8 plugin + type-check, test, staged + pre-commit); ESLint dibuang; Next 16.3.8 + TS 7.0.2; `apps/web/AGENTS.md` + `CLAUDE.md`; hook format PostToolUse; MCP `next-devtools` di `.mcp.json`.
- Verifikasi: `pnpm install --frozen-lockfile` dari kosong → sukses · `pnpm verify` → lolos (0 error, 0 tes, build 11 halaman) · browser `localhost:3004` → tanpa error console, desktop + ponsel · `curl /_next/mcp tools/list` → daftar tool · hook format dan `vp staged` → bekerja · `vp check` menangkap error tipe sengaja di apps/web.
- Biaya API: –
- Keputusan: ADR-023 (hasil spike, versi tertunda, `minimumReleaseAge` eksplisit, tolak build zowe, `turbopack.root`, advisory Next 16.3.8 + React RSC dan mitigasinya)
- Catatan untuk sesi berikutnya: butir "vite-plus lokal 1.2.0" belum dicentang karena 1.2.0 belum berumur 24 jam; naikkan vite-plus dan React di awal S02 (langkah 0). Uji MCP `next-devtools` di S02 setelah pemilik menyetujuinya.

## 2026-10-15 · S01 · Monorepo & toolchain — terblokir

- Dikerjakan: orientasi dan cek prasyarat. T-00 dan T-01 terverifikasi selesai (login HeroUI Pro, MCP `heroui-pro` menjawab).
- Verifikasi: `node -v` → v22.23.2 (gagal; harus v24) · `zsh -lic 'node -v'` → v24.22.0 · `pnpm -v` → 12.11.2 · `heroui-pro status` → login.
- Biaya API: –
- Keputusan: –
- Catatan untuk sesi berikutnya: aplikasi Claude perlu dibuka ulang (Cmd+Q) supaya PATH baru dari T-02 terbawa. Setelah itu mulai S01 dari langkah 1; belum ada kode yang diubah.

## 2026-10-15 · S00 · Review dokumen + setup proyek untuk agent — selesai

- Dikerjakan: review dan validasi semua dokumen `docs/` terhadap docs terbaru (riset paralel 9 area), memilih stack (lihat `KEPUTUSAN.md`), menyusun folder `implementasi/` (fase, sesi, status, konvensi), dan menyiapkan Claude Code (`CLAUDE.md`, skills, subagen, hooks, `.mcp.json`).
- Verifikasi: harga Claude dicek ke platform.claude.com/docs pricing (15 Okt 2026). Koreksi: cache read Sonnet 5.5 = $0,10/MTok (bukan $0,20). Message Batches tidak tersedia di Amazon Bedrock. Hasil verifikasi 6 lensa atas dokumen (112 temuan) sudah diterapkan.
- Biaya API: –
- Keputusan: ADR-001 s.d. ADR-022
- Catatan untuk sesi berikutnya: mulai dari S01. Butuh tugas pemilik T-00, T-01, dan T-02 (lihat TUGAS-PEMILIK.md).
