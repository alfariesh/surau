-- Migration number: 0005 	 2026-10-21
-- X07: tinjauan label status hadits (ADR-070). Label dibuat kode dari istilah yang tertulis di teks
-- takhrij (ADR-069); penilai /tinjau (Access) menyetujui atau mengoreksi JENIS istilahnya per catatan
-- kaki. DB app, bukan korpus blue-green: catatan kaki dirujuk lewat passage_id stabil (ADR-029),
-- tanpa FOREIGN KEY (beda DB). Penilai tidak pernah menulis teks Arab: koreksi hanya kode jenis
-- istilah; frasa Arab yang tampil selalu disalin dari DB lewat rentangnya (teks-arab no. 1 dan 6).
-- Tinjauan berlaku hanya bila versi aturan DAN label kode yang ditinjau (label_hash: jenis label +
-- istilah + rentang) sama dengan label sekarang; teks atau aturan berubah = kembali ke antrean.
CREATE TABLE takhrij_review (
  passage_id     INTEGER NOT NULL CHECK (passage_id > 0),
  rules_version  INTEGER NOT NULL CHECK (rules_version > 0),
  label_hash     TEXT NOT NULL CHECK (length(label_hash) = 64),
  reviewer_key   TEXT NOT NULL CHECK (length(reviewer_key) = 64),
  reviewer_name  TEXT NOT NULL CHECK (length(reviewer_name) BETWEEN 1 AND 80),
  decision       TEXT NOT NULL CHECK (decision IN ('approved', 'corrected', 'unsure')),
  -- Jenis istilah yang benar menurut penilai (koreksi saja): array JSON kode istilah.
  kinds_json     TEXT CHECK (kinds_json IS NULL OR (json_valid(kinds_json)
                   AND json_type(kinds_json) = 'array' AND length(kinds_json) <= 600)),
  note           TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 2000),
  corpus_version TEXT NOT NULL CHECK (length(corpus_version) BETWEEN 1 AND 80),
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (passage_id, rules_version, reviewer_key),
  CHECK ((decision = 'corrected') = (kinds_json IS NOT NULL))
) STRICT, WITHOUT ROWID;
-- Cache jawaban (answer_cache) dianggap basi bila tinjauan catatan kaki yang dikutipnya berubah
-- sesudah jawaban itu di-cache (surau-api): pencarian per catatan kaki + waktu.
CREATE INDEX takhrij_review_updated ON takhrij_review (passage_id, updated_at);
