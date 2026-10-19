-- S18: hanya evaluasi terkurasi; belum menerima pertanyaan pengguna umum.
-- Snapshot jawaban tidak boleh diubah setelah ditinjau. DB app tidak ikut blue-green korpus.
CREATE TABLE answer_log (
  id TEXT PRIMARY KEY NOT NULL,
  run_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_hash TEXT NOT NULL CHECK (length(question_hash) = 64),
  answer_hash TEXT NOT NULL CHECK (length(answer_hash) = 64),
  corpus_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,
  private INTEGER NOT NULL CHECK (private IN (0, 1)),
  question_json TEXT NOT NULL CHECK (json_valid(question_json) AND length(question_json) <= 24000),
  answer_json TEXT NOT NULL CHECK (json_valid(answer_json) AND length(answer_json) <= 48000),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (run_id, question_id),
  CHECK (expires_at > created_at)
) STRICT;
CREATE INDEX answer_log_recent ON answer_log (created_at DESC, id);
CREATE INDEX answer_log_expiry ON answer_log (expires_at);

CREATE TABLE review (
  answer_id TEXT NOT NULL REFERENCES answer_log(id) ON DELETE CASCADE,
  reviewer_key TEXT NOT NULL CHECK (length(reviewer_key) = 64),
  reviewer_name TEXT NOT NULL CHECK (length(reviewer_name) BETWEEN 1 AND 80),
  question_verdict TEXT CHECK (question_verdict IN ('approved', 'revise', 'rejected')),
  verdict TEXT CHECK (verdict IN ('benar', 'kurang', 'salah')),
  language_score INTEGER CHECK (language_score BETWEEN 1 AND 5),
  faithfulness INTEGER CHECK (faithfulness IN (0, 1)),
  attribution INTEGER CHECK (attribution IN (0, 1)),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 2000),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (answer_id, reviewer_key),
  CHECK (question_verdict IS NOT NULL OR verdict IS NOT NULL),
  CHECK ((verdict IS NULL AND language_score IS NULL AND faithfulness IS NULL AND attribution IS NULL)
    OR (verdict IS NOT NULL AND language_score IS NOT NULL))
) STRICT, WITHOUT ROWID;
