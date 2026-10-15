# S20 · Pengaman biaya & penyalahgunaan

> **Fase:** 4 · **Status:** belum (garis besar)
> **Prasyarat:** S19 selesai · Tugas pemilik: **T-14** (Turnstile, AI Gateway `surau-gw`, Cloudflare Access, secrets), **P-4** (angka anggaran dan kuota), **P-7** (retensi). Opsional: **T-20** (Admin key untuk rekonsiliasi biaya).
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Jawab tidak bisa membangkrutkan proyek. Ada rem berlapis yang teruji, dan bila anggaran habis, Surau otomatis tetap berjalan sebagai mesin pencari.

## Baca dulu

- ADR-014 (desain lengkap 4 lapis + Turnstile + kuota), [docs/08](../../docs/08-biaya.md#pengaman-anggaran), dan [docs/05](../../docs/05-kebijakan.md#8-privasi) (privasi).
- `/docs-terbaru` untuk Turnstile (siteverify, kunci uji), Rate Limiting binding, D1 (`UPSERT … RETURNING`), Cron Triggers, dan Cloudflare Access.

## Langkah (garis besar)

1. Tabel app: `settings`, `llm_budget`, `llm_ledger`, dan `quota_daily`.
2. **Urutan guard di `POST /api/jawab`:**
   1. `jawab_enabled`.
   2. Cookie anonim HMAC. Bila tidak ada, minta token Turnstile, jalankan siteverify (`remoteip`, `idempotency_key`), lalu terbitkan cookie 24 jam.
   3. Burst dibatasi binding per anon-id.
   4. Kuota harian D1 per anon-id **dan** per HMAC(IP/64, salt harian). IP mentah tidak pernah disimpan.
   5. Estimasi token, tolak bila > batas, lalu reservasi anggaran atomik.
   6. Panggil LLM.
   7. Komit biaya aktual di `ctx.waitUntil`.
3. Cron `*/10` melepas reservasi basi. Cron harian membuat periode baru, dan bila memakai akun organisasi + Admin key, merekonsiliasi dengan Cost API dan mengirim email peringatan saat >80%.
4. Spend limit AI Gateway harian (mode BYOK, diatur pemilik), bila uji S19 membuktikan harga Haiku 5.5 dikenali; bila tidak, kirim header `cf-aig-custom-cost`. Ledger D1 tetap rem otoritatif. Semua kegagalan penyedia (400 limit, 429, 5xx, "credit balance too low") turun ke Cari.
5. `/admin` (Cloudflare Access): sakelar Jawab, ringkasan biaya bulan ini, kuota, dan laporan kesalahan terbaru.
6. **Tes:** reservasi bersamaan (tidak bisa melewati cap), kuota habis, Turnstile gagal (kunci uji), sakelar mati → UI menampilkan Cari, dan kebocoran reservasi dibereskan cron.
7. Perbarui kebijakan privasi sesuai P-7 (Turnstile, AI Gateway tanpa payload, apa yang disimpan dan berapa lama), lalu cek kebijakan retensi data API Anthropic dengan `/docs-terbaru` dan sebutkan di kebijakan privasi.

## Selesai bila

- [ ] Semua tes guard lolos, termasuk simulasi anggaran habis → Jawab mati otomatis → situs tetap berfungsi
- [ ] Tidak ada IP mentah atau pertanyaan pengguna di log (diperiksa)
- [ ] `/admin` hanya bisa dibuka pemilik
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
