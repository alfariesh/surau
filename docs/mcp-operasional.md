# MCP Surau · uji klien dan pemantauan S17

Panduan pengguna: **https://surau.org/mcp**. Server: **https://mcp.surau.org/mcp**, Streamable HTTP tanpa autentikasi. Kontrak dan perintah pengembang: [apps/mcp/README.md](../apps/mcp/README.md). Keputusan: ADR-050.

## Uji klien · 17 Oktober 2026

Laporan ini menyimpan alamat dan hasil pemeriksaan, bukan teks kitab atau transkrip lengkap.

| Klien | Uji dan bukti | Hasil |
|---|---|---|
| Claude.ai | Pemilik menambahkan connector tanpa login, lalu meminta “Gunakan Surau untuk mencari adab murid kepada guru. Baca salah satu halaman hasilnya dan sertakan tautan sumber.” Konfirmasi di chat S17: **“Berhasil, hasil dan tautan muncul”**. | Pencarian dan pembacaan dikonfirmasi pemilik (T-18); transkrip dan nama pemanggilan tool tidak diperiksa langsung agent. |
| Claude Code **2.1.299** | CLI `--print --model haiku --effort low --max-budget-usd 0.10 --no-session-persistence --strict-mcp-config --mcp-config … --setting-sources '' --tools '' --allowedTools mcp__surau__search_text mcp__surau__read_page`; hanya server Surau. Konfigurasi diberikan sebagai argumen, tidak dipasang ke dotfile pemilik. | `connected`; `search_text({query: "adab murid kepada guru", limit: 1})` → `read_page({edition_id: 1, juz: 1, page_no: 48})`, keduanya sukses, tanpa penolakan izin. Hasil tool diperiksa langsung: sitasi j.1 h.48, permalink `https://surau.org/kitab/ihya/1/48`, `license.name = CC BY-NC-SA 4.0`, atribusi terisi. Biaya dilaporkan CLI **US$0,00344562**, izin pemilik ≤ US$0,10. |
| Cloudflare AI Playground | [Model mode](https://playground.ai.cloudflare.com/models), model demo Workers AI `@cf/zai-org/glm-4.7-flash`; Custom MCP → Add server → URL Surau, tanpa header. UI nyata menunjukkan **Ready**, **7 tools**, dan dua panggilan **Completed**. | `search_text` kueri sama, limit 1 → `read_page` edisi 1 j.1 h.48; tautan dan lisensi muncul. Tanpa memasukkan API key atau menyalakan layanan berbayar. |
| MCP Inspector **2.11.0** | `bash .github/scripts/uji-mcp.sh https://mcp.surau.org/mcp` | `tools/list` 7 tool, `tools/call` semua tool (Arab + Indonesia), halaman tidak ada → `not_found`, kueri kosong → error validasi, Origin asing → 403, di **modern 2026-07-28 dan legacy 2025-11-25**. |
| Claude Desktop, ChatGPT | Panduan dicocokkan dengan docs resmi terbaru; tidak mengklaim pengujian akun nyata. | Belum diuji langsung; ketersediaan mengikuti akun/organisasi. |

`pnpm verify` setelah ruang cache lokal dipulihkan: **466 tes Node + 210 tes Workers lolos**, termasuk integrasi `apps/mcp/src/index.test.ts` di dua era yang memeriksa lisensi + atribusi semua tool, sitasi setiap hasil berteks dan permalink absolut (list_works hanya metadata edisi). Build `/mcp` statis dan bundel MCP lolos. Peninjau kode: tanpa temuan. Uji pertama terganggu timeout dan ENOSPC; hanya cache Next/hasil tes dibersihkan, tanpa menghapus korpus atau data batch.

**Preview PR #43**, commit `5d0c6e6`: CI `verify`, `preview` dan `preview mcp` hijau. `BASE_URL=https://pr-43.surau.org pnpm test:e2e` di CI: **99 lolos, 1 dilewati** (pintasan keyboard desktop dilewati di ponsel), termasuk panduan, aksesibilitas dua tema dan navigasi pembaca. Log Preview: **501 request, 0 error**, termasuk 23 clientDisconnected. Ringkasan memakai slug `__unknown__` sebagai cadangan, sehingga trafik Preview lain dalam jendela itu mungkin ikut terhitung (ADR-031). Bukti: [CI/preview](https://github.com/alfariesh/surau/actions/runs/39043047128), [verify](https://github.com/alfariesh/surau/actions/runs/39043047143). E2E Next dev lokal masih 97 lolos/1 dilewati/2 gagal navigasi ke 1/201 (RSC 200, console React script tag); penyebab belum ditetapkan, tetapi kasus yang sama lolos di deployment Workers.

### Hasil baik dan keterbatasan klien

- Baik: pencarian Indonesia menunjuk j.1 h.48, lalu kedua klien membaca halaman itu. Sitasi, lisensi dan atribusi terbawa tanpa model Surau di server.
- Keterbatasan nyata: jawaban akhir Playground hanya menyebut keberhasilan `search_text`, walaupun log UI menunjukkan `read_page` juga **Completed**. Claude Code menampilkan judul Arab walaupun prompt uji meminta keluaran tanpa Arab; tidak memanggil `verify_quote` karena uji dibatasi dua tool. Hasil ini **bukan** bukti semua jawaban AI selalu mematuhi instruksi atau semua kutipan terverifikasi. Panduan menjelaskan tanggung jawab AI pengguna dan meminta verifikasi sebelum kutipan ditampilkan.
- Uji negatif server: halaman yang tidak ada dan kutipan yang tidak cocok menghasilkan kegagalan yang eksplisit; izin, error transport, dan status hadits yang tidak diketahui tidak boleh diubah menjadi klaim berhasil.
- Deskripsi tool S16 sudah menjelaskan ukuran hasil dan alur cari → baca → `verify_quote`; hasil uji tidak menunjukkan kesalahan kontrak yang memerlukan perubahan deskripsi. Panduan menekankan `read_section` untuk bacaan panjang. Ukuran S16: `read_page` median ±11,1 ribu token; keberhasilan j.1 h.48 tidak membuktikan semua halaman muat di setiap klien.

## Pemantauan 17–24 Oktober 2026 (WIB)

**Status: dimulai; satu minggu belum teramati.** Batas pemakaian S16 dipertahankan sampai ada bukti kebutuhan perubahan. WAF T-19 aktif. Pisahkan trafik tes/Preview dari penggunaan publik.

Pemantauan harian pukul **09.00 WIB** selama tujuh kali dijadwalkan di chat ini melalui automation **Pantau MCP Surau selama satu minggu** (`pantau-mcp-surau-selama-satu-minggu`). Hanya memberi tahu bila ada perubahan bermakna, kegagalan, tindakan dibutuhkan atau ringkasan akhir. Akses Cloudflare/disk/runtime tetap harus tersedia saat jadwal berjalan; automation bukan bukti bahwa pengamatan sudah terjadi.

### Volume per tool dan error

Sejak deploy S17, callback tool mencatat satu objek Workers Logs:

```json
{"event":"mcp_tool","tool":"search_text","outcome":"ok","duration_ms":12}
```

Contoh di atas hanya bentuk event, bukan pengukuran produksi. Tidak mencatat argumen, hasil, alamat halaman, teks/kueri, pesan error, IP, atau identitas pengguna. `outcome`: `ok`, `rate_limited`, `unavailable`, kode error core, atau `internal_error`. Galat limiter juga menghasilkan `internal_error`, bukan detail internal.

Cloudflare → Workers & Pages → **surau-mcp → Observability → Overview**: pilih rentang waktu, filter `event = mcp_tool`, visualization **Count**, **Group By tool + outcome**, lalu **Run**. Durasi: Average/P95 `duration_ms`. Sampling log konfigurasi tetap 1; retensi Workers Logs saat dicek 7 hari, jadi simpan agregat harian sebelum habis. Event ini menghitung callback yang lolos validasi SDK, **bukan** JSON-RPC invalid, tool tak dikenal, gagal transport/Origin/WAF, atau total HTTP. Untuk itu baca metrik request/error Worker dan WAF secara terpisah. Hasil `isError` dapat memakai HTTP 200: status HTTP saja tidak cukup.

**Titik awal:** sebelum deploy S17 tidak ada event per tool; volumenya tidak bisa direkonstruksi dari log HTTP saja. Angka per tool belum tersedia pada hari pertama ini. Uji Claude.ai tidak membuktikan batas per IP Anthropic cukup saat pengguna ramai.

### D1 dan biaya

Perintah baca-saja dari root:

```sh
pnpm exec wrangler d1 info surau-corpus-ihya-v6 -c apps/mcp/wrangler.jsonc --json
pnpm exec wrangler d1 insights surau-corpus-ihya-v6 -c apps/mcp/wrangler.jsonc --time-period 1d --sort-type sum --sort-by reads --sort-direction DESC --limit 5 --json
```

Snapshot 17 Oktober, sekitar 21:48 WIB (`d1 info`, jendela bergulir 24 jam): **365.605 rows_read**, **1.134 read_queries**, 145.771 rows_written, 82 write_queries. Ini seluruh DB bersama web/MCP, termasuk ingest, smoke dan uji hari itu; **bukan biaya khusus MCP** dan bukan angka penggunaan publik saja.

`d1 insights --time-period 1d`: kueri hitung seluruh tabel 2 kali, total **204.656 baris baca**; daftar isi 30 kali × **939 baris** = 28.170; pola pencarian Indonesia 6 kali × rata-rata **237 baris** = 1.422. Jendela insights dan info tidak harus persis sama; daftar lima teratas tidak mencakup seluruh kueri. Belum ada alasan dari snapshot ini untuk mengubah rate limit atau memoisasi daftar isi.

Tarif Paid yang dicek: **25 miliar** baris baca/bulan termasuk, lalu **US$0,001 per juta**. 365.605 baris setara sekitar **US$0,000366** pada tarif marginal bila kuota termasuk sudah habis; tagihan sebenarnya memerlukan pemakaian seluruh akun, kuota, tulis/penyimpanan dan biaya Workers/log. Jangan memakai jumlah kueri sebagai biaya baca. Koreksi catatan lama STACK: kuota Paid adalah 25 **miliar**, bukan 25 juta.

### Tindak lanjut

- Ambil agregat harian per tool/outcome dan metrik error Worker, `rows_read_24h`, serta status smoke endpoint; simpan tanggal, zona waktu, periode, dan bedakan data tidak tersedia dari angka nol.
- Selidiki `internal_error`/`unavailable`, 429/WAF, `rate_limited` yang berulang pada penggunaan normal, atau kenaikan rows_read yang tidak sebanding pemakaian. Ubah batas melalui PR dengan bukti; jangan menghapus/menimpa data produksi.
- Pada 24 Oktober: simpulkan kestabilan dan kebutuhan batas/memoisasi, lalu tutup pemantauan. Bila data hilang karena retensi atau akses dashboard tak tersedia, tulis keterbatasannya; jangan klaim satu minggu lolos.
- Registry, Anthropic Directory, dan Agent Skill Surau opsional, belum diajukan. `/rilis 3` dipanggil pemilik setelah seluruh gerbang R3 dan tinjauan panduan terpenuhi; tag rilis fase tidak dibuat di sesi ini.

## Sumber resmi yang dibaca · 17 Oktober 2026

- [Claude remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) dan [Claude Code MCP](https://code.claude.com/docs/en/mcp). Menu dan ketersediaan dapat berubah.
- [ChatGPT Add custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server), [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt), [Developer mode](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels). Docs saat dicek memakai Plugins; tidak menjanjikan matriks paket.
- [Cloudflare test remote MCP](https://developers.cloudflare.com/agents/model-context-protocol/guides/test-remote-mcp-server/); label tombol disesuaikan hasil UI nyata.
- [Workers structured logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/), [D1 analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
