-- Migration number: 0004 	 2026-10-21
-- S20: pengaman biaya Jawab (ADR-014, ADR-065). Tanpa teks pertanyaan, tanpa IP mentah, dan tanpa
-- ID cookie polos: subjek kuota = HMAC dengan kunci harian turunan secret Worker, jadi baris hari
-- berbeda tidak bisa ditautkan tanpa secret. Uang disimpan sebagai mikro-USD bulat (1 USD =
-- 1.000.000), supaya penjumlahan dan pembandingan plafon tidak terkena galat pembulatan.

-- Angka P-4 (usulan, dipakai karena belum dijawab pemilik); diubah dari /admin.
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('budget_monthly_usd', '20'),
  ('quota_anon_daily', '10'),
  ('quota_ip_daily', '30');
-- Tanggal UTC terakhir hapus fisik P-7 berhasil (cron: sekali per hari, diulang bila gagal).
INSERT OR IGNORE INTO settings (key, value) VALUES ('purge_day', '');

-- Kuota harian (hari UTC). Dihapus fisik setelah 7 hari (P-7, cron surau-api).
CREATE TABLE quota_daily (
  day     TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  scope   TEXT NOT NULL CHECK (scope IN ('anon', 'ip')),
  subject TEXT NOT NULL CHECK (length(subject) = 64),
  used    INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY (day, scope, subject)
) STRICT, WITHOUT ROWID;

-- Anggaran per bulan kalender UTC (spend cap Anthropic juga direset tanggal 1). Rem utama Jawab:
-- reservasi hanya berhasil bila spent + reserved + perkiraan <= cap (satu batch D1 = transaksi).
CREATE TABLE llm_budget (
  period         TEXT PRIMARY KEY CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  cap_micro      INTEGER NOT NULL CHECK (cap_micro >= 0),
  spent_micro    INTEGER NOT NULL DEFAULT 0 CHECK (spent_micro >= 0),
  reserved_micro INTEGER NOT NULL DEFAULT 0 CHECK (reserved_micro >= 0),
  -- Pertama kali pemakaian melewati 80% plafon (peringatan dicatat sekali per bulan).
  warned_at      TEXT,
  updated_at     TEXT NOT NULL
) STRICT, WITHOUT ROWID;

-- Satu baris per panggilan berbiaya: `jawab` (routing + jawaban Haiku) dan `retry` (ulangan
-- Sonnet). Tanpa teks pertanyaan atau jawaban. `estimated` = 1 bila biaya aktual tidak diketahui
-- (batal, galat, reservasi basi) dan reservasi dihitung terpakai. Dihapus setelah 24 bulan (P-7).
CREATE TABLE llm_ledger (
  id                 TEXT PRIMARY KEY CHECK (length(id) = 36),
  kind               TEXT NOT NULL CHECK (kind IN ('jawab', 'retry')),
  period             TEXT NOT NULL REFERENCES llm_budget (period),
  created_at         TEXT NOT NULL,
  settled_at         TEXT,
  status             TEXT NOT NULL CHECK (status IN ('reserved', 'committed', 'expired')),
  outcome            TEXT CHECK (outcome IN ('answer', 'not_found', 'fallback', 'aborted', 'error')),
  reason             TEXT CHECK (reason IS NULL OR length(reason) <= 32),
  model              TEXT CHECK (model IS NULL OR length(model) <= 64),
  reserved_micro     INTEGER NOT NULL CHECK (reserved_micro >= 0),
  cost_micro         INTEGER CHECK (cost_micro >= 0),
  estimated          INTEGER NOT NULL DEFAULT 0 CHECK (estimated IN (0, 1)),
  requests           INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  input_tokens       INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens      INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0 CHECK (cache_read_tokens >= 0),
  cache_write_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cache_write_tokens >= 0),
  CHECK ((status = 'reserved') = (settled_at IS NULL)),
  CHECK (status = 'reserved' OR cost_micro IS NOT NULL)
) STRICT;
CREATE INDEX llm_ledger_open ON llm_ledger (status, created_at);
CREATE INDEX llm_ledger_period ON llm_ledger (period, created_at);

-- Pembersihan fisik terjadwal (cron surau-api) memakai indeks ini.
CREATE INDEX feedback_resolved ON feedback (resolved_at) WHERE resolved_at IS NOT NULL;
