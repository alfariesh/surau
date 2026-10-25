# Tugas Pemilik

Hal-hal yang **hanya bisa dikerjakan manusia**, seperti membuat akun, login, token, pembayaran, izin, keputusan produk, dan menilai teks Arab. Agent tidak boleh login, memasukkan password, atau membuka file rahasia atas nama Anda.

**Cara pakai:**
- Agent menyebut ID tugas (misalnya **T-03**) saat sebuah sesi membutuhkannya.
- Centang `[x]` setelah selesai, atau bilang ke agent "T-03 sudah". Agent yang mencentang setelah memverifikasinya.
- **Jangan pernah menempel token atau password di chat Claude.** Semua perintah di file ini diketik di aplikasi **Terminal**, dan perintah yang meminta rahasia menyembunyikan apa yang Anda tempel.

**Cara membuka Terminal di folder Surau:** tekan `Cmd + Spasi`, ketik `Terminal`, lalu Enter. Di jendela yang muncul, ketik `cd ~/Documents/Surau`, lalu Enter. Ketik (atau tempel) perintah satu per satu, dan tekan Enter setelah tiap perintah.

---

## Mulai di sini (sebelum Sesi 1)

- [x] **T-00 · Buka repo di Claude Code pertama kali**
  1. Buka folder Surau di Claude Code. Saat muncul dialog *trust folder*, pilih percaya. Ini mengaktifkan izin, hook, dan skill proyek.
  2. Setujui server MCP proyek `cloudflare-docs` bila ditanya. Setelah Sesi 1, setujui juga `next-devtools`.
  3. Opsional: supaya agent tidak terlalu sering meminta izin, pilih mode izin *auto* di pengaturan Claude Code Anda. Mode ini tidak bisa diatur dari repo. Tindakan berisiko (push, deploy, menulis ke database online) tetap akan meminta izin.
  4. Plugin `vercel` sudah dimatikan untuk repo ini (Surau memakai Cloudflare). Bila muncul skill atau plugin `supabase`, Anda boleh mematikannya untuk repo ini lewat menu plugin, dengan memilih *Disable for me*.

- [x] **T-01 · Login HeroUI Pro dan sambungkan docs HeroUI ke Claude** (prasyarat S01)
  1. Di Terminal (folder Surau): `pnpm dlx heroui-pro@latest login`. Browser akan terbuka; login dengan GitHub.
  2. Buka https://heroui.pro/dashboard, masuk ke bagian **Tokens**, lalu buat **Personal token** dan **CI/CD token**. Simpan keduanya di password manager.
  3. Sambungkan MCP HeroUI ke Claude Code (token disimpan di pengaturan Claude milik Anda, bukan di repo). Tempel perintah ini, tekan Enter, tempel **Personal token** saat diminta (tidak akan terlihat), lalu Enter lagi:
     ```
     read -rs "T?Tempel Personal token HeroUI lalu Enter: " && claude mcp add --scope user --transport http heroui-pro https://mcp.heroui.pro/mcp --header "x-heroui-personal-token: $T"; unset T
     ```
  4. Cek dengan `claude mcp list`. Baris `heroui-pro` harus bertanda ✔.

- [x] **T-02 · Pakai Node 24 dari Vite+** (prasyarat S01) · selesai 2026-10-15 (shell agent v24.22.0)
  Saat ini perintah `node` memakai versi 22 milik tool lain, padahal Surau butuh Node 24. Perbaikannya:
  1. Di Terminal, jalankan sekali: `echo 'export PATH="$HOME/.vite-plus/bin:$PATH"' >> ~/.zshrc`
  2. Tutup **semua** jendela Terminal dan aplikasi Claude (Cmd+Q), lalu buka lagi.
  3. Di Terminal baru, `node -v` harus menampilkan `v24…`. Tool lain yang memakai Node 22 tetap punya salinannya sendiri.
  - *Catatan 2026-10-15:* langkah 1 sudah berlaku di Terminal baru (Node 24). Yang tersisa: tutup aplikasi Claude dengan **Cmd+Q** (bukan hanya menutup jendela), lalu buka lagi.

- [x] **T-13 · Ustadz pendamping (P-5)** · selesai 2026-10-18: pemilik menunjuk **Anas**. Belum merupakan persetujuan soal atau penilaian jawaban; rubrik dan penggunaan halaman dilakukan di T-24. Satu email Access diberikan privat, tidak dicatat di repo.

## Fase 0: Fondasi

- [x] **T-03 · Putuskan repo GitHub publik atau privat (P-1)** (dibutuhkan S02; bila tidak dijawab, dipakai **privat**) · selesai 2026-10-15: semula privat, lalu **publik** atas keputusan pemilik dengan risiko lisensi diterima (ADR-025). Repo lama menjadi `surau-lama`. Langkah 2 (email ke HeroUI) tetap disarankan.
  Lisensi HeroUI Pro melarang mempublikasikan komponen dan template Pro. Usulannya:
  1. Mulai **privat**.
  2. Kirim email ke `support@heroui.pro` memakai draf di [lampiran](#lampiran-draf-email-ke-heroui).

  **Penting:** repo ini akan menyimpan template HeroUI Pro di riwayat git, jadi repo ini **tidak boleh sekadar diubah menjadi publik**. Bila nanti ingin publik tanpa izin HeroUI, kita membuat repo publik baru dari kode yang sudah ditulis ulang, tanpa riwayat lama. Selama privat, CI memakai kuota menit GitHub Actions akun Anda. Untuk akun gratis kuotanya sekitar 2.000 menit/bulan, dan itu cukup untuk proyek ini; angka pastinya bisa dicek di GitHub → Settings → Billing.

- [x] **T-04 · Simpan token CI HeroUI di GitHub** (dibutuhkan S02, setelah repo dibuat) · selesai 2026-10-15 (diverifikasi `gh secret list` + `--app dependabot`)
  Di Terminal (folder Surau), jalankan dua perintah berikut satu per satu. Tempel **CI/CD token** dari T-01 setiap kali diminta:
  ```
  gh secret set HEROUI_AUTH_TOKEN
  gh secret set HEROUI_AUTH_TOKEN --app dependabot
  ```
  Perintah kedua dibutuhkan supaya pembaruan otomatis dari Dependabot juga bisa di-build.

- [x] **T-05 · Login Cloudflare + aktifkan R2** (dibutuhkan S03) · selesai 2026-10-15 (dicek agent: `wrangler whoami` OK, bucket R2 berhasil dibuat; budget alert langkah 3 tidak bisa dicek agent)
  1. Di Terminal: `pnpm dlx wrangler@latest login`. Browser terbuka; setujui akses.
  2. Di dash.cloudflare.com → **R2 Object Storage**, aktifkan R2 (sekali saja, dengan menyetujui ketentuannya).
  3. Disarankan: **Manage Account → Billing → Billable Usage → Create budget alert**. Isi ambang $10 dan email Anda. Satu alert ini sudah mencakup Workers, D1, dan R2.

- [x] **T-06 · Token Cloudflare untuk GitHub Actions** (dibutuhkan S03) · selesai 2026-10-15 (dicek agent: `gh secret list` → kedua secret ada; preview PR #4 sukses)
  1. Buka dash.cloudflare.com → **My Profile → API Tokens → Create Token → Create Custom Token**.
  2. Beri izin: *Account › Workers Scripts › Edit*, *Account › D1 › Edit*, *Account › Workers R2 Storage › Edit*, *Account › Account Settings › Read*, dan *Zone › Workers Routes › Edit*. Di bagian **Zone Resources**, pilih *All zones from an account*, supaya domain yang ditambahkan nanti otomatis tercakup.
  3. Di Terminal, jalankan `gh secret set CLOUDFLARE_API_TOKEN` lalu tempel tokennya.
  4. Untuk Account ID, jalankan `pnpm dlx wrangler@latest whoami`, salin *Account ID*-nya, lalu jalankan `gh secret set CLOUDFLARE_ACCOUNT_ID` dan tempel ID itu.

- [x] **T-07 · Pilih dan siapkan domain (P-2, wajib dijawab)** (dibutuhkan S03; sebelum itu situs bisa jalan di alamat `*.workers.dev`) · **selesai 2026-10-17:** `surau.org` di Cloudflare (NS `ned`/`raquel.ns.cloudflare.com`), `https://surau.org` sudah menyajikan Worker web, Preview PR di `pr-N.surau.org`. Kode masih memakai alamat `workers.dev` (`SITE_URL`, `deploy.yml`) sampai dipindah agent
  Daftarkan domain di Cloudflare Registrar, atau pindahkan DNS domain yang sudah ada ke Cloudflare. Beri tahu agent nama domainnya.

- [x] **T-08 · Arah desain (P-3)** (dibutuhkan S04) · **selesai 2026-10-15:** pemilik memilih Opsi A · Zaitun (hijau zaitun, kertas hangat, Noto Naskh Arabic); lihat ADR-027
  Anda product designer, jadi bagian ini milik Anda. Tentukan:
  - font Arab (usulan: Noto Naskh Arabic, dengan Amiri sebagai opsi);
  - warna aksen;
  - nuansa umum.

  Opsional: buat Design System di editor HeroUI Pro (heroui.pro → Design Systems), dan agent akan mengimpornya lewat MCP.

## Fase 1: Pembaca

- [ ] **T-09 · Pasang drive data Shamela** (setiap kali sesi membangun ulang korpus: S07, S10–S14) · terpenuhi untuk S07, S10, dan S13 (2026-10-17)
  Pastikan drive `Elfariesh` terpasang, sehingga `/Volumes/Elfariesh/database` bisa dibuka.

- [x] **T-10 · Setujui sumber teks dan lisensi konten, lalu beri tahu Shamela (P-6, wajib dijawab)** (sebelum rilis Fase 1, S10) · selesai 2026-10-16 (dijawab di chat S10): ADR-018 + ADR-021 **disetujui**; email ke Shamela **sudah terkirim** (jawaban ditunggu, tidak memblokir); kontak koreksi/takedown = tombol "Laporkan kesalahan" + GitHub Issues dulu (email menyusul bila ada); retensi laporan kesalahan = sampai ditangani + 12 bulan. Bila Shamela membalas, teruskan isinya ke agent untuk dicatat.
  1. **Yang perlu Anda pahami:**
     - Teks dan catatan kaki Ihya diambil dari salinan Shamela di drive Anda.
     - Dasar hukumnya adalah rilis OpenITI berlisensi CC BY-NC-SA 4.0, yang isinya terbukti identik untuk 1.705 dari 1.706 halaman.
     - Risikonya: Shamela tidak memberi izin pakai ulang, dan sebagian catatan kaki takhrij tidak ada di versi OpenITI tersebut.
     - Bila Shamela keberatan, kita beralih ke teks OpenITI saja, sehingga sebagian takhrij hilang.
     - Konten Surau berlisensi CC BY-NC-SA 4.0: tanpa iklan dan tanpa paywall.

     Detailnya ada di ADR-018 dan ADR-021 di KEPUTUSAN.md. Bila setuju, bilang ke agent "setuju ADR-018 dan ADR-021".
  2. Kirim email pemberitahuan ke pengelola al-Maktaba al-Shamela lewat halaman kontak shamela.ws. Drafnya ada di [lampiran](#lampiran-draf-email-ke-shamela). Simpan jawabannya; agent akan mencatatnya.
  3. Siapkan alamat email kontak publik untuk koreksi dan takedown.
  4. Putuskan retensi **laporan kesalahan** dari pengguna (bagian dari P-7; usulan: disimpan sampai ditangani + 12 bulan).

- [x] **T-21 · Izinkan token CI membaca analytics Worker** (dibutuhkan sebelum S09, ±3 menit) · selesai 2026-10-16 (dicek agent: run Preview PR #16 meng-query GraphQL tanpa error izin) · supaya CI bisa melaporkan error Worker Preview di setiap PR (ADR-031)
  Token yang sama dari T-06 cukup diberi satu izin tambahan; nilainya tidak berubah, jadi secret GitHub tidak perlu diisi ulang.
  1. Buka dash.cloudflare.com → ikon profil di kanan atas → **My Profile → API Tokens**.
  2. Di daftar **API Tokens**, cari token yang Anda buat di T-06 (untuk GitHub Actions). Klik **⋯** di ujung barisnya → **Edit**.
  3. Di bagian **Permissions**, klik **+ Add more**. Pilih *Account* → *Account Analytics* → *Read*.
  4. Klik **Continue to summary** → **Update Token**.
  5. Bila Cloudflare ternyata menampilkan token **baru**, jalankan di Terminal (folder Surau) `gh secret set CLOUDFLARE_API_TOKEN` lalu tempel token itu. Bila tidak, langkah ini dilewati.
  6. Bilang ke agent "T-21 sudah". Agent memeriksa langkah *Ringkasan log Preview* di CI PR berikutnya: peringatan "Token CI butuh izin Account Analytics Read" harus hilang dan berganti tabel jumlah request/error.

- [x] **T-22 · Tinjau tampilan pembaca kitab (S09)** (sebelum rilis Fase 1, ±10 menit) · selesai 2026-10-16: pemilik menyatakan tampilan pembaca OK (chat S10)
  Pembaca belum dibuka di situs utama (ditutup sampai S10). Lihat di Preview khusus (data staging): **https://pembaca-surau-web.alfarieshsalman.workers.dev/kitab/ihya/1/200**.
  1. Buka tautan di ponsel dan di laptop.
  2. Coba: ketuk penanda (١) di teks Arab (takhrij muncul), tombol **Berikutnya/Sebelumnya** (atau panah ← → di laptop), **Daftar isi**, **Lompat**, **Salin sitasi**, tombol **−/+** ukuran huruf, dan tema gelap.
  3. Bilang ke agent "tampilan pembaca OK", atau tulis apa yang ingin diubah (boleh dengan tangkapan layar). Agent mencentang butir "Pemilik menyetujui tampilan" di S09.

- [x] **T-15 · Cocokkan 10 halaman dengan edisi cetak** · selesai 2026-10-16: pemilik melaporkan 10/10 oke (chat S10; hasil di `data/reports/ihya-9472-qa-manusia.md`) (dibutuhkan S10 / sebelum `/rilis 1` **dan sebelum S11**, ±30 menit; bisa diwakilkan ke ustadz/santri yang membaca Arab)
  Daftarnya siap di [data/reports/ihya-9472-qa-manusia.md](../data/reports/ihya-9472-qa-manusia.md) (buka di GitHub supaya tautannya bisa diklik). Setiap halaman punya tiga tautan: Surau, Shamela, dan pindaian archive.org (sudah diarahkan ke halaman yang tepat; bila meleset, geser satu-dua halaman). Cek apakah teks dan catatan kakinya sama, lalu kirim ke agent "T-15: 1 cocok, 2 cocok, …" atau catatan singkat per nomor.

## Fase 2: Cari

- [x] **T-11 · Akun API Anthropic dengan rem biaya (P-4)** (dibutuhkan S13) · selesai 2026-10-17 (dicek agent di S13: kunci di `.env` berfungsi untuk `count_tokens` dan Message Batches; spend limit workspace tidak bisa dicek agent). Kunci `surau-prod` tetap untuk T-14.
  1. Buka platform.claude.com. Pastikan akunnya berbentuk **Organization**. Di **Settings → Workspaces → Create workspace**, buat dua workspace:
     - `surau-dev`: untuk terjemahan batch dan eval di Mac Anda, dengan spend limit ±$40/bulan.
     - `surau-prod`: untuk fitur Tanya online di Fase 4, dengan spend limit ±$25/bulan.
  2. Di **Billing**, matikan **auto-reload**.
  3. Buat API key di workspace `surau-dev`, lalu simpan ke file `.env` dengan perintah ini di Terminal (folder Surau). Tempel kuncinya saat diminta (tidak akan terlihat):
     ```
     read -rs "K?Tempel API key surau-dev lalu Enter: " && printf 'ANTHROPIC_API_KEY=%s\n' "$K" > .env && chmod 600 .env; unset K
     ```
     File `.env` tidak pernah masuk git, dan agent tidak membacanya.
  4. Kunci workspace `surau-prod` **tidak** disimpan di Mac maupun di Worker. Anda menempelnya sendiri di Cloudflare **AI Gateway → Provider Keys** saat T-14.
  5. Bila Anda berlangganan Claude Max/Team, tautkan kredit API bulanannya ke organisasi ini (claude.ai → Settings → Billing).

- [x] **T-16 · Cek 20 sampel ayat** (dibutuhkan S12, ±20 menit; bisa diwakilkan) · **dinilai agent 2026-10-17:** 20/20 rujukan cocok ([laporan](../data/reports/ihya-9472-review-prarilis-f2-2026-10-17.md)); pemilik meneruskan penilaian agent lain ("Itu hasil dari agent lain. Jika salah anda bisa koreksi jadi itu bukan kebenaran mutlak"); diperiksa ulang agent X02. **diterima pemilik saat `/rilis 2` (2026-10-17, ADR-048)**
  Agent memberi 20 kutipan ayat yang dikenali di Ihya beserta rujukan surah:ayat. Cek apakah rujukannya benar.
  1. Buka [data/reports/ihya-9472-ayat.md](../data/reports/ihya-9472-ayat.md) di GitHub, bagian **20 sampel acak**.
  2. Untuk tiap baris, buka permalink-nya di link preview PR S12 (atau di situs setelah korpus baru dipromosikan, S14). Kutipan ayatnya berwarna hijau lembut dengan label kecil "QS s:a" sesudahnya. Ketuk labelnya untuk melihat teks ayat dan terjemahan Kemenag.
  3. Bandingkan kutipan di kitab dengan teks ayat di popup. Rujukan surah:ayat-nya benar?
  4. Kirim hasilnya ke agent di chat, misalnya "T-16: 1–20 benar kecuali no. 4 (bukan ayat)". Agent mencatatnya di file sesi S12.

- [ ] **T-17 · Nilai sampel terjemahan AI** (dibutuhkan S13, dua kali ±30 menit; bisa diwakilkan) · tahap 1 selesai 2026-10-17 ("sampel layak") · **tahap 2 dinilai agent 2026-10-17:** 14 Benar, 4 Kurang, 2 Salah (70%, di bawah target 80%); pemilik meneruskan penilaian agent lain ("Itu hasil dari agent lain. Jika salah anda bisa koreksi jadi itu bukan kebenaran mutlak"). Temuan diperbaiki di X02 (27 paragraf diterjemahkan ulang, ADR-047), sehingga sampel yang sama kini 20/20 Benar (bias, penilai agent X02). **Penyimpangan target 80% diterima pemilik saat `/rilis 2` (2026-10-17, ADR-048).** **Tahap 3 siap dinilai (X04, 2026-10-21):** 60 sampel acak BARU berstrata (pra-registrasi + daftar ID di-commit sebelum halaman dibuat: `data/reports/ihya-9472-t17-tahap3.md`, `data/reviews/ihya-9472-t17-tahap3-sampel.json`), halaman nilai buta (tanpa model/versi/status koreksi). Penilai: manusia yang bisa membaca Arab (Anda, Anas, atau orang yang Anda tunjuk), bukan agent. Langkah tahap 3 di bawah butir 3
  Agent memberi 20 terjemahan uji (sebelum batch penuh), lalu 20 hasil batch. Beri nilai Benar, Kurang, atau Salah, beserta catatan singkat.
  1. Buka halaman nilai yang dikirim agent di chat S13 (file lokal `data/build/llm/qa/review-batch.html`; bisa dibuka dari panel file aplikasi Claude atau browser). Isinya 20 paragraf acak hasil batch penuh: teks Arab, terjemahan AI, dan (kotak hijau) terjemahan ayat Kemenag. Ada juga 5 contoh ringkasan bagian (tidak ikut dinilai).
  2. Untuk tiap nomor 1–20, nilai: **Benar** (makna tepat), **Kurang** (makna benar tapi ada yang janggal/hilang), atau **Salah** (makna keliru).
  3. Kirim ke agent, misalnya "T-17 tahap 2: 1–20 B kecuali 4 K (istilah kurang tepat), 11 S (subjek tertukar)". Target: Benar ≥ 80%, Salah ≤ 10%; bila Salah > 10%, agent memperbaiki prompt dan mengulang paragraf yang terdampak.
  **Tahap 3 (±60–90 menit, boleh dicicil):**
  1. Buka file `data/build/llm/qa/t17-tahap3.html` di folder Surau (dari panel file aplikasi Claude, atau klik dua kali di Finder: terbuka di browser). File ini tidak masuk git karena berisi teks kitab.
  2. Isi **Nama penilai** di atas (formulir terkunci sampai nama diisi). Untuk tiap nomor 1–60: baca teks Arab, lalu terjemahan AI di bawahnya; pilih **Benar**, **Kurang**, atau **Salah**. Untuk Kurang/Salah, centang kategorinya (mis. *istilah fikih/tasawuf*, *bagian hilang*) dan tulis catatan singkat bila perlu. Kotak hijau = terjemahan Kemenag, tidak dinilai. Tautan "konteks di Surau" membuka paragraf itu di pembaca.
  3. Isian tersimpan otomatis di browser yang sama, **per nama penilai**, jadi bisa ditutup dan dilanjutkan nanti: buka lagi di browser yang sama, lalu tekan **Lanjutkan sebagai <nama Anda>** (formulir tidak pernah terisi sendiri saat dibuka).
  4. Bila selesai (atau berhenti di tengah), tekan **Salin hasil** lalu tempel ke chat agent ("T-17 tahap 3: …"), atau tekan **Unduh hasil** dan beri tahu agent letak filenya. Agent menghitung persentase per strata dan tertimbang (`pnpm t17 hasil`) dan menerapkan aturan keputusan yang sudah ditulis sebelumnya (lolos / terjemahan ulang terarah / luas).
  5. Bila ada penilai kedua, nomor 1–20 dinilai keduanya (untuk mengukur kesepakatan). Di komputer yang sama: tekan **Penilai baru**, isi nama penilai kedua, lalu nilai; isian penilai pertama tidak ditampilkan dan tidak tertimpa (penilai kedua jangan menekan tombol *Lanjutkan sebagai* milik penilai pertama). Kirim hasil keduanya; agent menghitung kesepakatan + kappa (`pnpm t17 hasil a b`).

- [x] **T-23 · Tinjau tampilan Cari dan terjemahan di pembaca (S14)** (±10 menit) · selesai 2026-10-17: pemilik menyatakan "Cari ok sudah ok" (chat S14, di situs utama setelah promote `ihya-v5`)
  Buka di ponsel dan laptop (data staging, versi `ihya-v5`): **https://pr-33-surau-web.alfarieshsalman.workers.dev/cari**
  1. Ketik **sabar**, lalu **adab murid kepada guru**, lalu **الصبر**. Cek kartu hasil: teks Arab asli dengan kata yang tersorot, label **Terjemahan AI**, dan (bila ada) **Ringkasan AI**.
  2. Coba filter **Bagian kitab** (pilih satu rub', lalu satu kitab), dan **Muat lebih banyak** di bawah.
  3. Ketuk **Buka di pembaca** di salah satu hasil: paragraf tujuan ditandai, kata yang dicari tersorot, dan di bawah setiap paragraf Arab ada **Terjemahan AI** (ayat Al-Qur'an memakai terjemahan Kemenag berlabel). Coba centang/hapus **Tampilkan terjemahan AI**, dan buka **Ringkasan AI bagian ini** di awal bab.
  4. Dari halaman mana pun tekan **⌘K** (laptop) atau ikon kaca pembesar di atas (ponsel), ketik kata, tekan Enter.
  5. Bilang ke agent "tampilan Cari OK", atau tulis apa yang ingin diubah (boleh dengan tangkapan layar). Agent mencentang butir "pemilik menyetujui tampilan" di S14.

- [x] **T-12 · Setujui soal eval pencarian** (dibutuhkan S15) · **selesai 2026-10-17:** ke-31 soal disetujui pemilik di chat ("Ya setujui semua"); berbagi tautan halaman tinjauan ditutup pemilik (dikonfirmasi saat `/rilis 2`, 2026-10-17)
  Agent menyusun ±30 soal ("di mana al-Ghazali membahas X?") beserta jawaban lokasinya. Anda (atau ustadz) mengecek dan menyetujui minimal 20 soal.
  **Siap ditinjau (2026-10-17):** buka https://claude.ai/artifact/3BoaNKz2uL7e1ymEEaCPnH (hanya bisa dibuka akun Anda) → isi nama → untuk tiap soal klik **Setuju / Perlu diubah / Tolak** (tautan "Buka di Surau ↗" membuka halaman kitabnya). Pilihan tersimpan otomatis; agent membacanya dari halaman itu.

## Fase 3: MCP

- [x] **T-19 · Aturan WAF untuk MCP** (dibutuhkan S16; agent memandu) · **selesai 2026-10-17:** aturan rate limiting `MCP per IP` (URI Path equals `/mcp`, IP, 200 permintaan / 10 detik → Block 10 detik, Active) dibuat agent di dashboard atas permintaan pemilik di chat; dicek: `uji-mcp.sh https://mcp.surau.org/mcp daftar` lolos dan situs 200
  Satu aturan rate limiting sebagai pagar luar untuk alamat MCP. Worker sudah punya batas sendiri per tool (ADR-049); aturan ini menahan banjir permintaan sebelum sampai ke Worker. Plan Free hanya boleh **satu** aturan dan hanya bisa memfilter path (bukan subdomain), jadi aturan berlaku untuk path `/mcp` di seluruh `surau.org` (situs web tidak memakai path itu). Sekitar 3 menit:
  1. Buka https://dash.cloudflare.com → pilih domain **surau.org**.
  2. Menu kiri **Security** → **Security rules** (di sebagian akun: **WAF**) → tombol **Create rule** → pilih **Rate limiting rules**.
  3. **Rule name:** `MCP per IP`.
  4. **If incoming requests match…:** Field **URI Path**, Operator **equals**, Value `/mcp`.
  5. **With the same characteristics:** biarkan **IP**.
  6. **When rate exceeds:** Requests `200`, Period `10 seconds`.
  7. **Then take action:** **Block**, Duration `10 seconds`.
  8. Klik **Deploy**. Beri tahu agent "T-19 selesai"; agent mengecek bahwa `https://mcp.surau.org/mcp` tetap menjawab.

- [x] **T-18 · Uji Surau dari Claude.ai** (S17) · **selesai 2026-10-17:** pemilik mengonfirmasi “Berhasil, hasil dan tautan muncul” untuk permintaan mencari adab murid kepada guru, membaca salah satu hasil, dan menyertakan tautan. Transkrip tidak diperiksa langsung agent; [bukti dan batas uji](../docs/mcp-operasional.md).
  Panduan [surau.org/mcp](https://surau.org/mcp): **Customize → Connectors → + Add → Add custom connector** (tampilan lain: Settings → Connectors), nama Surau, URL `https://mcp.surau.org/mcp`, autentikasi *No sign in*. Dua contoh lanjutan (baca j.1 h.200 dan verifikasi kutipan/takhrij) tersedia di panduan; pemilik juga mengonfirmasi “Panduan jelas; contoh lanjutan juga berhasil” di S17 (2026-10-17).

## Fase 4: Jawab

- [x] **T-14 · Pengaman Fase 4** · secret produksi `surau-api` lengkap 2026-10-21 (`CF_AIG_TOKEN`, `TURNSTILE_SECRET_KEY`, `SURAU_API_SECRET`; dicek pemilik dengan `wrangler secret list`) (bagian Cloudflare Access dibutuhkan S18; sisanya S19–S20; agent memandu langkah demi langkah)
  - Widget **Turnstile** (mode Managed) untuk domain produksi dan preview. **Dibuat 2026-10-20:** `Surau`, site key `0x4AAAAAAFdyEf4rqoAMrG1j`, hostnames `surau.org` dan `alfarieshsalman.workers.dev` (termasuk subdomain preview); pre-clearance OFF. Secret belum dipasang ke Worker.
  - **AI Gateway** dengan gateway bernama `surau-gw`:
    - **Dibuat 2026-10-20:** authenticated ON, collect logs OFF, cache OFF, retry OFF, rate limit 50/menit (fixed), spend limit US$1/hari (sliding, semua provider/model), Require Provider Credentials ON (tanpa fallback Unified Billing untuk provider pihak ketiga). BYOK Anthropic sudah diisi pemilik dan ditandai valid oleh dashboard; token `surau-api-gateway` dibuat setelah persetujuan pemilik (AI Gateway Run, cakupan seluruh akun), sudah disalin pemilik; belum dipasang ke Worker; belum diuji end-to-end dengan permintaan model.
    - aktifkan *Authenticated Gateway*;
    - tempel kunci workspace `surau-prod` di **Provider Keys** (mode BYOK);
    - atur spend limit harian dan rate limit;
    - buat token gateway.
  - **Cloudflare Zero Trust** (Free): bagian S18 selesai 2026-10-18, **Surau Tinjau** melindungi `/tinjau` dan `/api/review` pada domain utama, One-time PIN, satu email yang diberikan pemilik. **2026-10-20:** aplikasi `Surau Admin` dibuat untuk `surau.org/admin` dan `surau.org/api/admin`, kebijakan `Pemilik Surau` hanya email pemilik yang dikonfirmasi di chat, One-time PIN, sesi 24 jam. Wildcard preview disetujui pemilik dan tersimpan: `*-surau-web.alfarieshsalman.workers.dev/admin` + `/api/admin` pada `Surau Admin`, serta `/tinjau` + `/api/review` pada `Surau Tinjau` (kebijakan penilai yang sudah ada). Gerbang login terverifikasi di Chrome: produksi `/admin`, preview PR-33 `/admin` dan `/api/review` mengarah ke aplikasi login yang sesuai. Login admin sampai selesai belum diuji; halaman admin dibangun di S20. Login nyata/penilaian Anas masih T-24.
  - **S19 (2026-10-20):** token gateway disimpan pemilik di `.env` (`CF_AIG_TOKEN`, untuk uji lokal) dan dipasang sebagai secret `surau-api-staging` ("Success"). Uji passthrough gateway lolos (ADR-064); pemilik melihat biaya Haiku tercatat di Analytics. **Masih perlu:** secret yang sama untuk Worker produksi `surau-api` setelah PR S19 di-merge (Worker dibuat `deploy.yml`), dengan perintah di Terminal (folder Surau): `grep '^CF_AIG_TOKEN=' .env | cut -d= -f2- | tr -d '\n' | pnpm wrangler secret put CF_AIG_TOKEN --name surau-api`. Tanpa secret ini Jawab produksi menjawab `not_configured`, dan sampai S20 memang tetap mati.
  - **Secrets Worker** yang Anda jalankan sendiri di Terminal (folder Surau). **Daftar final S20 (2026-10-21, ADR-065)** — hanya untuk Worker produksi `surau-api`, dan hanya perlu sebelum Jawab dibuka di `/rilis 4`:
    1. `CF_AIG_TOKEN` (token gateway, sudah ada di `.env` Anda): `grep '^CF_AIG_TOKEN=' .env | cut -d= -f2- | tr -d '\n' | pnpm wrangler secret put CF_AIG_TOKEN --name surau-api`
    2. `TURNSTILE_SECRET_KEY` (widget `Surau`): bila sudah Anda simpan di `.env`, `grep '^TURNSTILE_SECRET_KEY=' .env | cut -d= -f2- | tr -d '\n' | pnpm wrangler secret put TURNSTILE_SECRET_KEY --name surau-api`. Bila belum: buka dash.cloudflare.com → **Turnstile** → widget **Surau** → **Settings** → salin **Secret key**, lalu jalankan `pnpm wrangler secret put TURNSTILE_SECRET_KEY --name surau-api` dan tempel saat diminta (tidak terlihat).
    3. Cek: `pnpm wrangler secret list --name surau-api` harus menampilkan `CF_AIG_TOKEN`, `SURAU_API_SECRET`, dan `TURNSTILE_SECRET_KEY`.
    - `SURAU_API_SECRET` (acak, sumber kunci HMAC cookie/cache/kuota) **sudah dipasang agent** di `surau-api` dan `surau-api-staging` (2026-10-21, nilai acak tidak pernah ditampilkan). `ANON_COOKIE_SECRET` dan `IP_HASH_SECRET` di rencana lama **tidak diperlukan** (diganti satu secret berturunan HKDF). Staging memakai kunci uji Turnstile di `vars`, jadi tidak butuh secret Turnstile.
  - Putuskan **P-7** (penyimpanan pertanyaan dan jawaban) bila belum. **S20 memakai usulan** (kuota 7 hari, cache 30 hari, ledger 24 bulan, laporan ditangani + 12 bulan); pertanyaan pengguna umum tetap tidak disimpan sampai Anda dan dewan memutuskan.
  - **P-4 (usulan dipakai S20):** plafon US$20/bulan, 10 pertanyaan/hari per pengunjung, 30/hari per jaringan. Bisa Anda ubah kapan saja di https://surau.org/admin (login PIN email pemilik).

- [ ] **T-24 · Persetujuan soal dan uji tinjau oleh Anas (S18)** · ditunda oleh pemilik, tidak menghambat dev S19 (ADR-054); 60 evaluasi Agent QA S18 sudah tersedia
  1. Buka [surau.org/tinjau](https://surau.org/tinjau), masuk memakai email yang sudah terdaftar dan PIN dari email. Bila email Anas berbeda, berikan kepada agent untuk penambahan Access; jangan bagikan PIN.
  Login produksi sudah dikonfirmasi pemilik. Ulasan j001 bernama Agent QA hanya uji teknis; Anas boleh menggantinya dengan penilaiannya sendiri.
  2. Ikuti [panduan tinjau](../docs/tinjau-operasional.md). Anas mengisi namanya sendiri, memeriksa sumber, lalu menyimpan minimal **10 penilaian uji**; coba muat ulang untuk memastikan tersimpan.
  3. Prioritas tinjauan kunci (X13, ADR-093/094): **j018, j019, j021, j023** gagal "lokasi" karena kuncinya menuntut halaman yang mungkin tidak wajib (j1 h55 dipakai di j018/j019/j021; j1 h13 di j018; j4 h290 vs h292 di j023). Setujui setidaknya **50 dari 60 draf soal** setelah memeriksa pertanyaan dan kunci; tandai yang perlu diperbaiki. Nilai sekitar **30 Contoh evaluasi** (Benar/Kurang/Salah, bahasa 1–5, kesetiaan, atribusi, alasan) untuk kalibrasi judge.
  4. Beri tahu agent setelah selesai agar ekspor privat, golden set, kesepakatan dan status S18 diperbarui. **Saat ini: 0 persetujuan dan 0 penilaian manusia.** Contoh agent dan QA tidak dihitung.
  5. **Label status hadits (X07):** buka [surau.org/tinjau/takhrij](https://surau.org/tinjau/takhrij) (login sama), isi nama **Anas**, lalu setujui atau koreksi label per catatan kaki takhrij dari atas daftar ([panduan](../docs/tinjau-operasional.md#tinjau-label-status-hadits-x07)). Sesudah keputusan pertama Anas tersimpan, ketik ke agent: **"daftarkan akun Anas sebagai peninjau label"** (agent menunjukkan nama + waktu keputusan pertama untuk Anda pastikan, lalu membuka PR). Sejak itu keputusannya dipakai Jawab ("ditinjau ustadz"/"dikoreksi ustadz"); sebelumnya tersimpan saja. Mulai dengan ±20 butir teratas; laporkan istilah yang sering keliru agar aturannya diperbaiki.

- [ ] **T-26 · Daftarkan Anas sebagai editor terjemahan + uji coba 10 paragraf (X08, ADR-081)** · bisa dimulai sesudah PR X08 tahap 1 ter-deploy
  1. **Persetujuan nama (pemilik):** pastikan Anas setuju namanya tampil sebagai "Ust. Anas" di label terjemahan situs dan "Ust. Anas Lc." di riwayat serta di jawaban AI lain lewat MCP. Bila ia hanya setuju untuk situs, sebutkan "nama tidak untuk MCP". Catat jawabannya di chat ke agent.
  2. **Anas** membuka https://surau.org/tinjau/terjemahan dengan login yang sama seperti `/tinjau` (email + PIN dari email; jangan kirim PIN ke siapa pun). Halaman menampilkan "Akun ini belum terdaftar" dan sebuah **Kode akun**. Ia menekan **Salin kode**, lalu mengirim kode itu ke WhatsApp pribadi pemilik. Kode ini bukan rahasia dan bukan email.
  3. **Pemilik** mengetik ke agent: "daftarkan kode `<tempel kode>` sebagai editor terjemahan Ust. Anas Lc., ustadz, nama boleh di MCP: ya/tidak, juga boleh menilai jawaban dan label takhrij". Agent membuka PR (+ ADR) lalu menggabungkannya.
  4. **Anas** memuat ulang halaman, lalu mengoreksi atau menandai benar **≥10 paragraf** dari daftar "Belum ditinjau" (cara di halaman, bagian "Cara mengoreksi", dan di `docs/tinjau-operasional.md`). Laporkan kendala ke pemilik.
  5. **Pemilik** melihat sekilas di https://surau.org/admin → *Koreksi terjemahan terbaru* (bisa dibatalkan dari situ).
  6. Koreksi tampil di situs lewat korpus berikutnya: ketik ke agent "bangun korpus dengan koreksi terjemahan" (±sebulan sekali atau sesudah ≥50 koreksi); promote ke produksi tetap menunggu izin Anda.

- [ ] **T-27 · Pilih sumber terjemahan ayat Inggris dan (bila mau) minta izin penerbit (draf, ADR-092)** · syarat pertama sebelum fase bahasa Inggris dijadwalkan; tidak menghambat pekerjaan lain
  Hasil riset ada di [docs/riset/2026-10-24-terjemahan-ayat-inggris.md](../docs/riset/2026-10-24-terjemahan-ayat-inggris.md). Rekomendasinya: **Pickthall (1930, domain publik) sebagai sumber awal**, Wahiduddin Khan (tertulis "copyright free") sebagai cadangan modern setelah konfirmasi, dan Clear Quran / Saheeh International hanya bila penerbit memberi izin tertulis. Agent tidak mengirim email atau menghubungi pihak luar.
  1. **Baca bagian 4 (Rekomendasi) dan 7 (Keputusan) dokumen riset** (±5 menit). Tabel di bagian 2 menunjukkan siapa pemegang hak tiap terjemahan.
  2. **Putuskan lalu ketik ke agent** salah satu: "T-27: pakai Pickthall sebagai sumber awal" · "T-27: tunggu izin Saheeh/Clear Quran dulu" · atau catatan Anda sendiri. Agent mencatatnya sebagai ADR baru.
  3. **(Opsional, disarankan) Konfirmasi Wahiduddin Khan.** Salin **Email 1** di bawah, ganti `<nama>`, `<email>`, dan `<tautan situs>`, kirim dari email Anda ke **info@goodwordbooks.com** dengan tembusan **info@cpsglobal.org**. Simpan balasannya (tangkapan layar atau teruskan ke agent: "T-27 balasan Goodword: …").
  4. **(Opsional) Izin Clear Quran.** Buka https://theclearquran.org/contact, pilih jenis pertanyaan **Licensing & Copyright**, tempel **Email 2A**, setelah mengganti `<nama>`, `<email>`, `<tautan situs>`. Surau bukan organisasi 501(c)(3), jadi pengecualian 10% mereka tidak berlaku; jawabannya bisa "tidak" atau tanpa balasan. Jangan kirim berulang.
  5. **(Opsional) Izin Saheeh International.** Pemegang hak di cetakan = Abul-Qasim Publishing House dan Al-Muntada Al-Islami. Alamat kontaknya belum ditemukan. Cari di halaman hak cipta edisi cetak resmi Saheeh International (atau tanya Dar-us-Salam), lalu kirim **Email 2B** (ganti `<nama>`, `<email>`, `<tautan situs>`, dan nama pemegang hak yang Anda temukan). **Jangan memakai alamat dari situs yang tidak jelas.**
  6. **(Opsional, permintaan baru, bergantung pada kesediaan Anas dan terpisah dari T-24)** Tanyakan apakah Ust. Anas bersedia membaca contoh 20 ayat (agent menyiapkannya sesudah langkah 2) untuk menilai apakah Pickthall (dan Wahiduddin Khan) layak dipakai. Ini penilaian bahasa dan keandalan, bukan persetujuan hukum.
  7. Teruskan setiap balasan penerbit ke agent. Hanya balasan tertulis yang dihitung sebagai izin. **Clear Quran dan Saheeh** tidak boleh masuk situs maupun dump sebelum ada izin tertulis. **Pickthall** tidak membutuhkannya (status domain publik-nya masih diperiksa agent). **Wahiduddin Khan** sebaiknya menunggu balasan Goodword.
  8. **Bila Anda memilih jalur QuranEnc** (Noor/Saheeh atau Rowwad; keputusan 4 di dokumen riset), katakan ke agent. Langkah email ke QuranEnc ditambahkan di sini, dan Anda yang mengirimnya.

- [ ] **T-25 · Lihat dan setujui tampilan Tanya (S21)** · syarat "pemilik menyetujui tampilan" sebelum `/rilis 4`
  1. Ketik ke agent: **"siapkan Preview Tanya"**. Agent membuka PR kecil supaya ada alamat Preview (`pr-NNN.surau.org/tanya`, data staging), menyalakan Jawab staging sebentar selama Anda mencoba (biaya ±US$0,003 per pertanyaan), lalu mematikannya lagi. (Preview PR #100 sudah terhapus otomatis sesudah digabung; di https://surau.org/tanya Tanya masih tampil "belum dibuka" sampai `/rilis 4`.)
  2. Periksa: layar percakapan Maknaz (ADR-071, ADR-073): hilal di tengah, chip contoh pertanyaan, bulan yang "terbang" ke balasan pertama, orb yang berganti bentuk per tahap + teks berkilau, gelembung pertanyaan beraksen; kotak berbentuk widget dengan sumber jawaban di kepalanya; satu catatan tetap "Surau adalah asisten riset, bukan pemberi fatwa." (di atas sebelum bertanya, di bawah kotak sesudahnya; ADR-090); bertanya juga dari Beranda (segmen Maknaz, kotak "terbang" menjadi gelembung) dan dari tombol "Tanyakan … ke Maknaz" di hasil Cari (ADR-086, ADR-087); jawaban dengan nomor kutipan [n], kalimat redup tanpa kutipan, kartu kutipan Arab (huruf dan harakat rapi, kanan-ke-kiri), status hadits, tombol salin dan "Laporkan jawaban keliru", pertanyaan kedua di percakapan yang sama, dan tampilan di ponsel.
  3. Buka juga https://surau.org/transparansi dan https://surau.org/privasi (setelah PR digabung).
  4. Beri tahu agent: "T-25 setuju" atau catatan perbaikannya.
  - Bersama T-24 (Anas): review prompt sistem, kebijakan penolakan, dan ≥20 sampel jawaban nyata di `/tinjau` (agent bisa memuat 42 jawaban eval S21 ke `/tinjau` atas aba-aba Anda).

- [ ] **T-20 · (Opsional) Laporan biaya harian otomatis** (S20)
  Buat *Admin API key* di platform.claude.com (khusus Organization), lalu simpan sendiri dengan `pnpm wrangler secret put ANTHROPIC_ADMIN_KEY --name surau-api`. Isinya dipakai untuk mencocokkan biaya harian dan mengirim email peringatan saat pemakaian lewat 80%.

## Intisari + Dengar (X15–X17, ADR-097)

- [ ] **T-31 · Uji dengar suara Intisari + QA sampel pilot** · bagian 1 bisa sekarang; bagian 2 sesudah pilot X15b
  1. **Dengarkan dua contoh** yang dibuat agent di chat 24 Oktober: ringkasan Muqaddimah + istilah (ikhlas, riya', 'ujub, tawakkal, al-Ghazali, shallallahu 'alaihi wa sallam), dibacakan **Jefri** (pria, tenang menjelaskan) dan **Gendhis** (perempuan, tenang dan ramah). Di kartu suara Anda bisa mengganti suara, misalnya Mizan, Leya, atau Bayu. Setiap ganti memakai ±600 kredit dari paket Starter.
  1b. *(Sesudah T-29, dengan izin Anda di chat, ±900 karakter)* **Uji gaya narator** (ADR-101): agent memutar contoh A (tanpa gaya) lalu B (gaya "khidmat": kutipan lebih tenang dan khidmat, syair lebih lembut). Nilai: lebih jelas, atau malah terdengar berakting? Ketik "gaya: A" atau "gaya: B".
  2. **Pilih satu suara** untuk semua Intisari (satu suara per Intisari menjaga biaya dan konsistensi; cadangan boleh disebut), lalu catat istilah yang lafalnya salah. Ketik ke agent: "T-31 suara: <nama>; lafal salah: …".
  3. *(Opsional, disarankan untuk jangka panjang)* **Suara milik Surau sendiri.** Suara dari Voice Library bisa ditarik pemiliknya, sehingga kitab berikutnya tidak bisa dibacakan dengan suara yang sama. Tulis ke agent satu deskripsi suara (misalnya "pria Indonesia 40-an, tenang, hangat, artikulasi jelas, tempo sedang") dan satu kalimat contoh. Agent membuat 3 pratinjau (Voice Design) untuk Anda pilih.
  4. **Sesudah pilot X15b:** buka halaman QA yang dikirim agent, lalu nilai tiap gagasan: Benar/Kurang/Salah, setia pada paragraf sumbernya, atribusinya tepat, dan tanpa nada fatwa. Gerbangnya ≤ 5% "Salah". Ajak Ust. Anas bila bisa.

- [ ] **T-29 · Kunci API ElevenLabs untuk pembuatan audio (X17)** · sebelum pilot audio X17; kuota produksi diputuskan sesudah pilot
  1. Buka https://elevenlabs.io dan masuk ke akun Anda (paket Starter).
  2. Buka **Developers → API Keys → Create API Key**. Beri nama `surau-tts`, aktifkan pembatasan akses, lalu izinkan **Text to Speech**, **Voices: Read**, dan **User: Read** (X17: dua yang terakhir dipakai `pnpm audio plan` untuk membaca nama suara dan sisa kuota; tanpa keduanya alat tetap jalan, hanya kuota tidak terlihat). Isi **batas kredit**, misalnya 60.000 untuk pilot.
  3. Salin kuncinya. **Jangan tempel di chat Claude.**
  4. Di panel Terminal aplikasi Claude (folder Surau), ketik baris di bawah. Saat diminta, tempel kunci lalu tekan Enter. Isinya tidak terlihat.
     `printf 'Tempel kunci lalu Enter: '; read -rs K; printf 'ELEVENLABS_API_KEY=%s\n' "$K" >> .env; unset K; echo`
  5. Bilang ke agent: "T-29 sudah". Agent tidak membuka `.env`. Bila kuncinya belum terbaca, alat `pnpm audio` sendiri yang memberi tahu.
  6. **Kuota produksi (sesudah pilot):** Starter (±75 ribu karakter per bulan lewat API) hanya cukup untuk pilot. Semua audio Intisari Ihya butuh ±1,3 juta karakter (≈ US$104 dengan v4). Pilihannya:
     - naik ke **Pro** satu bulan (US$99, ±1,24 juta karakter) ditambah isi ulang kecil;
     - **Creator** beberapa bulan (US$22 per bulan, ±275 ribu karakter);
     - **ElevenLabs Impact Program** (12 bulan Pro gratis) bila Surau berbadan hukum nirlaba.
     Ketik pilihan Anda ke agent.
  - Tidak dipakai: `npx @elevenlabs/cli onboard init`. Perintah itu menulis berkas `.env.local` dan folder `~/.elevenlabs`, lalu menyuruh `npm install`, yang bentrok dengan pnpm repo ini (ADR-097).

- [ ] **T-32 · Sambungkan domain audio `media.surau.org` (X17)** · sebelum audio pilot diunggah; ±2 menit
  Bucket R2 `surau-media` sudah dibuat agent (kosong, akses r2.dev mati). Domainnya perlu *Zone ID* surau.org, yang tidak bisa dibaca agent tanpa membuka berkas kredensial. Pilih salah satu:
  - **A (agent yang menyambungkan):** buka https://dash.cloudflare.com → klik **surau.org** → halaman **Overview**, kolom kanan bagian **API** → salin **Zone ID** → tempel di chat agent. Zone ID **bukan rahasia** (bukan token).
  - **B (lewat dashboard):** **R2 object storage** → bucket **surau-media** → **Settings** → **Custom Domains** → **Add** → ketik `media.surau.org` → **Continue** → **Connect Domain**. Lalu bilang ke agent "T-32 sudah".
  Agent lalu memeriksa domainnya (HEAD/Range) sebelum mengunggah audio pertama.

- [ ] **T-30 · Lihat dan setujui tampilan Intisari (X16)** · dua tahap: tampilan sekarang (data contoh), isi sesudah pilot X15b
  0. **Tahap 1 (sekarang):** lihat tangkapan layar di `implementasi/sesi/bukti/X16/` (ponsel, laptop, gelap) atau buka Preview `pr-138.surau.org/dev/intisari` dan `…/dev/intisari?tier=section` selama PR #138 belum di-merge. Isinya data contoh (teks Arab kalimat contoh, bukan kitab); yang dinilai tata letak, label AI, dan urutan bagian.
  1. **Tahap 2 (sesudah X15b memuat pilot ke staging):** agent mengirim tautan Preview baru (`pr-NNN.surau.org/kitab/ihya/intisari`, data staging). Buka di ponsel dan laptop, mode terang dan gelap.
  2. Periksa:
     - hub 41 kitab;
     - satu Intisari Kitab dan satu Intisari Bab, berisi gagasan bernomor dengan "Dasar teks", kartu kutipan Arab + terjemahan + jilid/halaman, istilah, dalil, dan "Uji pemahaman";
     - label AI;
     - kartu ringkasan di pembaca dan menu ⋮ "Buka Intisari";
     - lencana di daftar isi;
     - hasil Cari.
  3. Ketik ke agent "T-30 setuju" atau catatan perbaikannya.

- [ ] **T-28 · Data kitab di mesin tempat agent bekerja (X15c)** · hanya untuk membangun korpus `ihya-v9`; pilot tidak menunggu ini
  Agent sekarang bekerja di komputer yang belum punya drive Shamela (`Elfariesh`), folder `data/raw` (OpenITI, Tanzil, Kemenag), dan `data/build/llm` (hasil batch AI lama yang sudah dibayar). Tanpa ketiganya, korpus baru tidak bisa dibangun dan terjemahan lama harus dibayar ulang. **Jangan hapus folder-folder itu di Mac Anda.** Saat X15c dimulai, agent memandu langkahnya: menyambungkan drive, menyalin folder, atau menjalankan ingest di Mac.

---

## Lampiran: draf email ke HeroUI

> **Subject:** Using HeroUI Pro in an open-source non-profit project
>
> Hi HeroUI team,
>
> I hold a HeroUI Pro license (account: <email>). I'm building **Surau**, a non-profit, open-source (Apache-2.0) research assistant for classical Islamic texts. I'd like to confirm what is allowed under the Pro Terms (Section 9):
>
> 1. May a **public** GitHub repository contain application code that imports `@heroui-pro/react` (the Pro package itself is installed via your authenticated postinstall and is never committed)?
> 2. May our app code that was originally **derived from the Pro chat template** be published in that public repo, if it has been substantially rewritten into our own product UI?
> 3. Contributors without a Pro license won't be able to build the web app. Is there a recommended approach (e.g., a contributor license or keeping `apps/web` private)?
>
> Thank you!

## Lampiran: draf email untuk T-27 (izin terjemahan ayat Inggris)

> **Email 1 · ke Goodword Books / CPS (Maulana Wahiduddin Khan)**
> **Subject:** Confirming free use of the Quran English translation by Maulana Wahiduddin Khan in a non-profit project
>
> Dear Goodword Books / CPS team,
>
> I'm building **Surau**, a non-profit, ad-free, open-source research assistant for classical Islamic texts (<tautan situs>). We plan an English-language site and want to display the English Quran translation by Maulana Wahiduddin Khan and Prof. Farida Khanam, verbatim and unmodified, with full attribution.
>
> The title page of the edition published on cpsglobal.org states: "This translation of the Quran is copyright free." Could you please confirm in writing that we may:
> 1. display the translation verbatim on our non-profit website (no ads, no sales);
> 2. store it in our database and offer it, unmodified, inside a downloadable open dataset licensed CC BY-NC-SA 4.0 (the translation itself keeps its own terms, which we will state as "copyright free, Goodword Books");
> 3. serve it unmodified through our public API;
> 4. credit "Maulana Wahiduddin Khan, translated with Prof. Farida Khanam, Goodword Books" and link to your site.
>
> Which edition and year should we cite as the source?
>
> Thank you, and jazakumullahu khayran.
> <nama> · <email> · <tautan situs>

> **Email 2A · ke Al-Furqaan Foundation (Clear Quran)** (kirim lewat formulir; sebut juga Furqaan Institute dan Book of Signs Foundation)
> **Subject:** Permission request: non-profit use of The Clear Quran in an open research project
>
> Dear Al-Furqaan Foundation (Furqaan Institute / Book of Signs Foundation),
>
> I'm building **Surau**, a non-profit, ad-free, open-source research assistant for classical Islamic texts that links every answer to the original book page (<tautan situs>). We are preparing an English-language site. Quran verses are never machine-translated; we only show an official human translation verbatim.
>
> We would like written permission to use **The Clear Quran by Dr. Mustafa Khattab** as that translation. Specifically, to:
> 1. display it verbatim, unmodified, and with full attribution on our non-profit website;
> 2. store it in our database;
> 3. include it, unmodified, in a downloadable data dump (the dump's own content is CC BY-NC-SA 4.0, but your translation would remain under your terms, which we would state clearly);
> 4. serve it unmodified through our public API.
>
> We understand Surau is not a U.S. 501(c)(3) organization, so the educational excerpt exception does not apply, and we are asking for a separate permission covering the full text. If a license with different terms (for example display-only, without the data dump) would suit you better, we would gladly work within it.
>
> Thank you for your time.
> <nama> · <email> · <tautan situs>

> **Email 2B · ke pemegang hak Saheeh International** (Abul-Qasim Publishing House / Al-Muntada Al-Islami; ganti dengan nama yang Anda temukan)
> **Subject:** Permission request: non-profit use of Saheeh International in an open research project
>
> Dear <nama pemegang hak>,
>
> I'm building **Surau**, a non-profit, ad-free, open-source research assistant for classical Islamic texts that links every answer to the original book page (<tautan situs>). We are preparing an English-language site. Quran verses are never machine-translated; we only show an official human translation verbatim.
>
> We would like written permission to use **the Saheeh International translation** as that translation. Specifically, to:
> 1. display it verbatim, unmodified, and with full attribution on our non-profit website;
> 2. store it in our database;
> 3. include it, unmodified, in a downloadable data dump (the dump's own content is CC BY-NC-SA 4.0, but your translation would remain under your terms, which we would state clearly);
> 4. serve it unmodified through our public API.
>
> We are asking for a permission covering the full text. If a license with different terms (for example display-only, without the data dump) would suit you better, we would gladly work within it.
>
> Thank you for your time.
> <nama> · <email> · <tautan situs>


## Lampiran: draf email ke Shamela

> **الموضوع:** إشعار باستخدام نص «إحياء علوم الدين» (الكتاب رقم 9472) في مشروع غير ربحي
>
> السلام عليكم ورحمة الله وبركاته،
>
> نعمل على مشروع «سُراو» (Surau)، وهو مساعد بحثي غير ربحي ومفتوح المصدر للقراء الإندونيسيين، يتيح قراءة كتاب «إحياء علوم الدين» (طبعة دار المعرفة) والبحث فيه، مع إحالة دقيقة إلى الجزء والصفحة.
>
> النص والحواشي (تخريج العراقي) مأخوذة من نسخة الشاملة (الكتاب رقم 9472). ونستند في الترخيص إلى إصدار OpenITI 2025.1.9 (رخصة CC BY-NC-SA 4.0) المطابق له في المتن، ونذكر المكتبة الشاملة مصدرًا للرقمنة، ونضع رابطًا إلى صفحة الشاملة المقابلة في كل صفحة من صفحات الكتاب عندنا. لا يوجد في المشروع أي إعلانات أو اشتراكات مدفوعة.
>
> نود إعلامكم بذلك، ونرجو التكرم بإبداء أي ملاحظة أو اعتراض أو شرط ترونه مناسبًا، وسنلتزم به.
>
> جزاكم الله خيرًا،
> <nama> — <email> — <tautan situs>
