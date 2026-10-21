-- Migration number: 0007 	 2026-10-21
-- Judul daftar isi berbahasa Indonesia (X04 bagian B W8, ADR-077): terjemahan AI judul node daftar
-- isi dan subjudul kurasi pembaca, selalu berlabel (model, versi prompt, tanggal, status tinjau;
-- teks-arab.md aturan 8). Hanya dipakai daftar isi pembaca dan kepala halaman baca yang bisa diberi
-- label; breadcrumb, <title>, OG, daftar isi MCP, dan routing Jawab tetap memakai judul Arab.

-- Judul node daftar isi (`toc_node.title_ar`).
CREATE TABLE toc_title_translation (
  toc_node_id    INTEGER NOT NULL REFERENCES toc_node (id),
  lang           TEXT NOT NULL,
  text           TEXT NOT NULL,
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  review_status  TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (review_status IN ('ai_generated', 'reviewed', 'ustadz_verified', 'rejected')),
  PRIMARY KEY (toc_node_id, lang)
) STRICT, WITHOUT ROWID;

-- Subjudul kurasi pembaca (`data/patches/<kitab>-subjudul.json`, ADR-074): satu subjudul per
-- paragraf, judulnya = paragraf utuh (+ lanjutannya) atau bagian awal/akhirnya menurut offset kurasi.
-- Subjudulnya sendiri bukan baris korpus (lapisan pembaca), jadi kuncinya paragraf yang memuatnya.
CREATE TABLE subheading_translation (
  passage_id     INTEGER NOT NULL REFERENCES passage (id),
  lang           TEXT NOT NULL,
  text           TEXT NOT NULL,
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  review_status  TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (review_status IN ('ai_generated', 'reviewed', 'ustadz_verified', 'rejected')),
  PRIMARY KEY (passage_id, lang)
) STRICT, WITHOUT ROWID;

UPDATE meta SET value = '7' WHERE key = 'schema_version';
