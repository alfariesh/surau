# S20 · Pengaman biaya & penyalahgunaan

> **Fase:** 4 · **Status:** berjalan (mulai 2026-10-21)
> **Prasyarat:** S19 selesai · Tugas pemilik: **T-14** (Turnstile, AI Gateway `surau-gw`, Cloudflare Access, secrets), **P-4** (angka anggaran dan kuota), **P-7** (retensi). Opsional: **T-20** (Admin key untuk rekonsiliasi biaya).
> **Status prasyarat (2026-10-21):** S19 merge (#98). T-14: widget Turnstile, gateway `surau-gw`, dan aplikasi Access `Surau Admin` sudah dibuat pemilik; secret produksi (`TURNSTILE_SECRET_KEY`, `CF_AIG_TOKEN`, dan secret baru S20) belum dipasang, dan itu tidak menghambat pengembangan karena Jawab produksi tetap mati sampai `/rilis 4`. P-4 dan P-7 belum dijawab, jadi dipakai usulan (STATUS: "Dipakai usulan bila tidak dijawab"). T-20 tidak dikerjakan (opsional). Pemilik menyetujui semua tindakan sesi ini di chat (2026-10-20 malam).
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

## Langkah (rinci, 2026-10-21)

Docs dicek 2026-10-21 (`/docs-terbaru`): Turnstile (siteverify JSON/form, `idempotency_key`, kunci uji, `hostname`/`action`), Rate Limiting binding (`ratelimits` tidak diwariskan ke `env.staging`), Cron Triggers (`triggers` diwariskan; tes `createScheduledController`), D1 (`batch` = transaksi berurutan; `INSERT … SELECT … WHERE` + UPSERT; batas 100 parameter), Cloudflare Access (JWT header, AUD per aplikasi: `Surau Admin` = `a7f9…65a4`), retensi data API Anthropic.

Angka P-4 (usulan dipakai): plafon **US$20/bulan** (bulan kalender UTC), **10 Jawab/hari per pengunjung** (anon-id), **30/hari per jaringan IP** (HMAC, longgar karena CGNAT), burst **3 per 60 detik** per anon-id. Staging punya plafon sendiri di `surau-app-staging`.

1. **Migrasi app 0004:** `settings` baru (`budget_monthly_usd` 20, `quota_anon_daily` 10, `quota_ip_daily` 30), `quota_daily` (hari UTC, lingkup `anon`/`ip`, subjek = HMAC hari itu, jumlah), `llm_budget` (per bulan: plafon, terpakai, tereservasi, dalam mikro-USD bulat), `llm_ledger` (satu baris per pertanyaan Jawab: reservasi, biaya aktual, token, model, hasil; tanpa teks pertanyaan). Repo bertipe di `packages/db` + tes workerd (reservasi bersamaan tidak bisa melewati plafon).
2. **Kunci:** satu secret Worker baru `SURAU_API_SECRET` (acak 32 byte). Kunci turunan HKDF: tanda tangan cookie `surau_anon`, kunci HMAC `answer_cache` (menggantikan SHA-256 polos, utang S19), dan kunci kuota harian (subjek anon/IP tidak bisa ditautkan lintas hari tanpa secret). Secret hilang → `not_configured` (Jawab mati, gagal tertutup).
3. **Guard di `surau-api` `POST /jawab`** (web tetap penerus tipis: Origin sama, batas body, batas per IP/global yang sudah ada, meneruskan `{question, turnstile}` + cookie anon + IP lewat header internal service binding, dan meneruskan `Set-Cookie`), urutannya:
   1. validasi masukan (415/413/400);
   2. `jawab_enabled` (503 `disabled`) dan secret lengkap (503 `not_configured`; kunci uji Turnstile di produksi juga ditolak);
   3. cookie anon HMAC 24 jam; bila tidak ada/kedaluwarsa: token Turnstile wajib (401 `challenge_required` + sitekey), siteverify (`remoteip`, `idempotency_key`, timeout 5 dtk, cek `hostname` akhiran + `action` "jawab") → cookie baru (`HttpOnly; Secure; SameSite=Strict; Path=/api/jawab`); gagal → 403 `challenge_failed`;
   4. burst binding `JAWAB_BURST` per anon-id (429 `rate_limited`);
   5. kuota harian anon **dan** IP dalam satu statement atomik (keduanya naik atau tidak sama sekali; 429 `quota_exceeded` + lingkup);
   6. cache jawaban (tanpa biaya LLM);
   7. reservasi anggaran atomik sebesar biaya terburuk routing + jawaban Haiku (tarif tulis-cache 1 jam untuk seluruh prompt 40 ribu token + `max_tokens` penuh); gagal → 503 `budget` (UI turun ke Cari);
   8. pipeline; sebelum ulangan Sonnet, reservasi tambahan biaya terburuk Sonnet (gagal → `fallback` alasan `budget`);
   9. komit biaya aktual di `ctx.waitUntil`. Batal klien atau galat tak terduga → reservasi dihitung terpakai (biaya aktual tidak diketahui, perkiraan konservatif, ditandai `estimated`).
4. **`GET /jawab/status`** (web `GET /api/jawab`): `{available, reason, challenge, sitekey, quota}` tanpa biaya, untuk UI S21 (Cari bila Jawab mati/anggaran habis/kuota habis; Turnstile hanya saat diminta).
5. **Cron `*/10 * * * *` di `surau-api`** (staging mewarisinya): reservasi basi (>10 menit) → `expired` dan dihitung terpakai; periode bulan berjalan dipastikan ada; peringatan 80% sekali per bulan (event log). Sekali sehari (putaran pertama setelah 00.00 UTC): hapus fisik `answer_cache` dan `answer_log` kedaluwarsa (tinjauan ikut terhapus), `quota_daily` > 7 hari, `feedback` selesai (`fixed`/`rejected`) > 12 bulan, `llm_ledger` > 24 bulan. Rekonsiliasi Cost API dan email peringatan **tidak** dibuat (T-20 opsional belum ada); dicatat sebagai sisa.
6. **Galat penyedia** (400 saldo habis/limit, 429 spend limit gateway, 5xx, timeout) → `fallback/provider_error` + Cari (sudah ada S19; tes ditambah untuk 400 dan 429). Spend limit gateway US$1/hari sudah aktif (T-14) dan harga Haiku dikenali (ADR-064), jadi `cf-aig-custom-cost` tidak dipakai. Ledger D1 tetap rem utama.
7. **`/admin`** (web, Cloudflare Access `Surau Admin` + validasi JWT di aplikasi dengan AUD admin, gagal tertutup): sakelar Jawab, ringkasan biaya bulan ini (plafon, terpakai, tereservasi, jumlah per hasil), kuota hari ini (agregat saja), pengaturan plafon dan kuota, serta laporan kesalahan terbaru (ubah status). Mutasi lewat `POST /api/admin` (Origin sama + JWT; Zod).
8. **Privasi:** penyamaran PII (email, nomor telepon, NIK/nomor panjang, URL) di `packages/core`, dipakai untuk pesan `feedback` sekarang dan arsip laporan jawaban S21. Pertanyaan pengguna umum **tetap tidak** disimpan ke `answer_log` (butuh keputusan pemilik + dewan, docs/05 Pertanyaan terbuka). Perbarui docs/05 §8 (tabel retensi, Turnstile, AI Gateway tanpa log, retensi Anthropic 30 hari, tanpa pelatihan) dan halaman publik `/privasi`.
9. **Tes:** reservasi bersamaan tidak melewati plafon; kuota habis (anon dan IP); Turnstile gagal/kosong/uji; sakelar mati; anggaran habis → `budget` dan status `available: false` (situs lain tetap jalan); reservasi bocor dibereskan cron; log tanpa IP/pertanyaan; `/admin` menolak tanpa JWT, JWT aplikasi Tinjau, dan JWT kedaluwarsa.

## Selesai bila

- [ ] Semua tes guard lolos, termasuk simulasi anggaran habis → Jawab mati otomatis → situs tetap berfungsi
- [ ] Tidak ada IP mentah atau pertanyaan pengguna di log (diperiksa)
- [ ] `/admin` hanya bisa dibuka pemilik
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Menyalakan Jawab di produksi (`JAWAB_ROUTE_ENABLED`, `jawab_enabled`): keputusan `/rilis 4` setelah S21.
- UI `/tanya`, Turnstile di browser, tombol laporan jawaban, `/transparansi` (S21).
- Rekonsiliasi Cost API + email peringatan (T-20 opsional), login pengguna (ADR-016).
- Celah status hadits ADR-064 butir 7 (wajib sebelum S21 membuka Jawab; dikerjakan di awal S21).

## Catatan hasil

*(diisi agent)*
