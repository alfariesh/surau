-- Migration number: 0008 	 2026-10-22
-- Koreksi terjemahan manusia di korpus (X08 tahap 2, ADR-082). Revisi editor terdaftar disimpan di
-- DB app (`translation_revision`, ADR-081), diekspor, lalu diterapkan ingest ke korpus berikutnya:
-- `translation.text` = teks perbaikan (pembaca, Cari/`translation_fts`, MCP, dan Jawab berubah
-- bersamaan), `translation.review_status` = 'ustadz_verified' (akun ustadz terdaftar) atau
-- 'reviewed' (editor lain). `model`/`prompt_version`/`created_at` tetap menunjuk draf AI asalnya.
-- Tabel ini = asal tinjauan per paragraf: nama dari daftar editor terdaftar saat menyimpan (bukan
-- ketikan), izin nama dikirim lewat MCP, dan draf AI yang digantikan (perbaikan saja; hanya dibaca
-- ruang editor, tidak pernah ditampilkan publik). Baris ada bila dan hanya bila status tinjauan
-- terjemahannya 'reviewed'/'ustadz_verified' (dicek ingest).
CREATE TABLE translation_review (
  passage_id      INTEGER NOT NULL,
  lang            TEXT NOT NULL,
  revision_id     INTEGER NOT NULL CHECK (revision_id > 0),
  revised         INTEGER NOT NULL CHECK (revised IN (0, 1)),
  reviewed_at     TEXT NOT NULL,
  reviewer_name   TEXT NOT NULL CHECK (length(reviewer_name) BETWEEN 1 AND 120),
  reviewer_short  TEXT NOT NULL CHECK (length(reviewer_short) BETWEEN 1 AND 80),
  reviewer_role   TEXT NOT NULL CHECK (reviewer_role IN ('ustadz', 'editor')),
  reviewer_public INTEGER NOT NULL CHECK (reviewer_public IN (0, 1)),
  ai_text         TEXT,
  PRIMARY KEY (passage_id, lang),
  FOREIGN KEY (passage_id, lang) REFERENCES translation (passage_id, lang),
  CHECK ((revised = 1) = (ai_text IS NOT NULL))
) STRICT, WITHOUT ROWID;

UPDATE meta SET value = '8' WHERE key = 'schema_version';
