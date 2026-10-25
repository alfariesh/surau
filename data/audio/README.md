# Metadata audio Intisari ("Dengarkan", X17, ADR-097/100)

`<kitab>-audio.json` adalah sumber kebenaran baris `audio_track` korpus. Berkas ini ditulis
`pnpm audio manifest` dan dibaca `pnpm ingest`. Isinya tanpa teks: kunci objek di bucket R2
publik `surau-media` (`media.surau.org`, Worker `surau-media`, ADR-103), sidik dan ukuran berkas, durasi, suara AI, versi
skrip/lisan/leksikon, dan bab (awal setiap gagasan).

- Kunci objek memuat sidik isi berkas (`ihya/id/<node>-<sha12>.mp3`), jadi objek tidak pernah
  ditimpa. Track lama tetap disimpan sebagai riwayat.
- Ingest hanya memuat track yang `script_sha256`-nya sama dengan skrip yang dibangun ulang dari
  Intisari di build itu. Gagasan yang ditolak atau Intisari yang berubah menggugurkan audionya.
- `pnpm audio verify` memeriksa setiap objek: HEAD, Range, dan sha256 isi.
