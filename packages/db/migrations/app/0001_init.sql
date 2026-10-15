-- Migration number: 0001 	 2026-10-15
-- Skema DB aplikasi Surau (S06). DB ini TIDAK ikut blue-green korpus: apa pun hasil manusia
-- (laporan, review) disimpan di sini dan merujuk korpus lewat ID stabil (ADR-029).
-- Tanpa tabel virtual (ADR-005), supaya export dan Time Travel tetap mudah.
-- Tabel kuota dan ledger biaya menyusul di S20 (migrasi baru).

-- Sakelar operasional. Nilai disimpan sebagai teks; maknanya divalidasi Zod per kunci.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
) STRICT, WITHOUT ROWID;

INSERT INTO settings (key, value) VALUES ('jawab_enabled', '0');

-- Laporan kesalahan dari UI (S09+). Tanpa PII: tidak ada IP, email, atau nama (docs/05 §6, P-7).
-- passage_id/page_id merujuk korpus tanpa FOREIGN KEY (beda DB).
CREATE TABLE feedback (
  id             INTEGER PRIMARY KEY,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  kind           TEXT NOT NULL CHECK (kind IN ('text', 'citation', 'toc', 'translation', 'answer', 'other')),
  passage_id     INTEGER,
  page_id        INTEGER,
  -- Path halaman tempat laporan dibuat (tanpa query string).
  path           TEXT CHECK (path IS NULL OR (length(path) <= 300 AND path GLOB '/*' AND path NOT GLOB '*[?#]*')),
  message        TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  corpus_version TEXT,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'fixed', 'rejected')),
  resolved_at    TEXT
) STRICT;

CREATE INDEX feedback_status ON feedback (status, created_at);
