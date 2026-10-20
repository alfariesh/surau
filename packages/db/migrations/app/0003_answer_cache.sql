-- Migration number: 0003 	 2026-10-20
-- S19: cache jawaban Jawab terverifikasi. Kunci = SHA-256(versi korpus + versi prompt + pertanyaan
-- ternormalisasi); teks pertanyaan TIDAK disimpan (P-7 belum menerima pertanyaan pengguna umum,
-- ADR-064). Isi = hasil publik (jawaban, sitasi ID + offset, hadits, hasil Cari), tanpa diagnostik.
-- Berganti otomatis bila korpus atau prompt berganti (kunci baru). Kedaluwarsa disaring saat baca;
-- penghapusan fisik terjadwal menyusul di S20 (sama dengan answer_log).
CREATE TABLE answer_cache (
  key TEXT PRIMARY KEY NOT NULL CHECK (length(key) = 64),
  corpus_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('answer', 'not_found')),
  result_json TEXT NOT NULL CHECK (json_valid(result_json) AND length(result_json) <= 64000),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  CHECK (expires_at > created_at)
) STRICT, WITHOUT ROWID;
CREATE INDEX answer_cache_expiry ON answer_cache (expires_at);
