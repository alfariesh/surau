-- Migration number: 0001 	 2026-10-15
-- Skema korpus Surau v1 (S06). DB korpus hanya-baca, dibangun ulang pipeline, diganti blue-green
-- (ADR-005). Teks mentah tidak pernah diubah; bentuk normal + stem hanya ada di passage_fts (ADR-009).
-- Formula ID dan aturan stabilitas: ADR-029. Satu perubahan skema = satu file migrasi baru.
-- Semua tabel STRICT: tipe kolom dijaga SQLite, bukan hanya oleh Zod di sisi baca.

CREATE TABLE author (
  id                INTEGER PRIMARY KEY,
  name_ar           TEXT NOT NULL,
  name_id           TEXT,
  death_hijri       INTEGER,
  shamela_author_id INTEGER UNIQUE,
  wikidata_id       TEXT UNIQUE
) STRICT;

CREATE TABLE work (
  id                 INTEGER PRIMARY KEY,
  -- Segmen URL publik (/kitab/<slug>/…). Tidak boleh berubah setelah rilis (ADR-029).
  slug               TEXT NOT NULL UNIQUE CHECK (slug GLOB '[a-z]*' AND slug NOT GLOB '*[^a-z0-9-]*'),
  openiti_uri        TEXT UNIQUE,
  title_ar           TEXT NOT NULL,
  title_id           TEXT,
  author_id          INTEGER REFERENCES author (id),
  -- docs/05 §3: sahih / diperdebatkan / palsu.
  attribution_status TEXT NOT NULL CHECK (attribution_status IN ('authentic', 'disputed', 'spurious')),
  original_language  TEXT NOT NULL DEFAULT 'ar',
  period             TEXT
) STRICT;

CREATE TABLE edition (
  id          INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 899999),
  work_id     INTEGER NOT NULL REFERENCES work (id),
  -- Segmen URL edisi non-default (/kitab/<work>@<slug>/…).
  slug        TEXT NOT NULL CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*'),
  is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  source      TEXT NOT NULL CHECK (source IN ('shamela', 'openiti')),
  source_ref  TEXT NOT NULL,
  publisher   TEXT,
  city        TEXT,
  volumes     INTEGER,
  license     TEXT NOT NULL,
  attribution TEXT NOT NULL,
  UNIQUE (work_id, slug)
) STRICT;

-- Tepat satu edisi default per karya (dipakai URL tanpa @edisi).
CREATE UNIQUE INDEX edition_default ON edition (work_id) WHERE is_default = 1;

-- Unit sitasi: satu halaman cetak. id = edition_id·10⁵ + seq (ADR-029).
CREATE TABLE page (
  id             INTEGER PRIMARY KEY,
  edition_id     INTEGER NOT NULL REFERENCES edition (id),
  seq            INTEGER NOT NULL CHECK (seq BETWEEN 1 AND 99999),
  juz            INTEGER NOT NULL CHECK (juz >= 1),
  page_no        INTEGER NOT NULL CHECK (page_no >= 0),
  -- ID halaman di sumber (Shamela page.id) untuk tautan "lihat di Shamela" dan QA.
  source_page_id INTEGER,
  CHECK (id = edition_id * 100000 + seq)
) STRICT;

-- Permalink /kitab/<work>/<juz>/<page_no> harus menunjuk tepat satu halaman.
CREATE UNIQUE INDEX page_citation ON page (edition_id, juz, page_no);

-- Pohon daftar isi. id = edition_id·10⁵ + seq (ADR-029); urutan tampil memakai `ord`, bukan id.
CREATE TABLE toc_node (
  id              INTEGER PRIMARY KEY,
  edition_id      INTEGER NOT NULL REFERENCES edition (id),
  parent_id       INTEGER REFERENCES toc_node (id),
  ord             INTEGER NOT NULL,
  level           INTEGER NOT NULL CHECK (level >= 1),
  title_ar        TEXT NOT NULL,
  start_page_id   INTEGER NOT NULL REFERENCES page (id),
  source_title_id INTEGER,
  -- 1 bila node ini diubah/ditambah oleh file patch (data/patches/).
  patched         INTEGER NOT NULL DEFAULT 0 CHECK (patched IN (0, 1)),
  CHECK (id BETWEEN edition_id * 100000 + 1 AND edition_id * 100000 + 99999)
) STRICT;

-- Anak sebuah node (atau akar bila parent_id IS NULL) per edisi, sudah terurut.
CREATE INDEX toc_node_children ON toc_node (edition_id, parent_id, ord);

-- Paragraf. id = edition_id·10⁷ + seq, supaya filter per edisi memakai rentang rowid (ADR-005).
CREATE TABLE passage (
  id          INTEGER PRIMARY KEY,
  edition_id  INTEGER NOT NULL REFERENCES edition (id),
  page_id     INTEGER NOT NULL REFERENCES page (id),
  toc_node_id INTEGER REFERENCES toc_node (id),
  kind        TEXT NOT NULL CHECK (kind IN ('body', 'foot')),
  -- Urutan dalam halaman per jenis, mulai 1. Jangkar publik #p<ord> / #f<ord> (ADR-029).
  ord         INTEGER NOT NULL CHECK (ord >= 1),
  -- Teks mentah persis (HTML dibersihkan deterministik oleh @surau/text). Tidak pernah diubah.
  text_raw    TEXT NOT NULL,
  CHECK (id BETWEEN edition_id * 10000000 + 1 AND edition_id * 10000000 + 9999999),
  UNIQUE (page_id, kind, ord)
) STRICT;

-- readSection (S08) mengambil paragraf per bagian daftar isi. Urutan baca diambil dari halaman
-- (juz, page_no) lalu (kind, ord), tidak pernah dari id (ADR-029).
CREATE INDEX passage_toc ON passage (toc_node_id);

-- Penanda (١) di badan teks → paragraf catatan kaki takhrij. Offset = indeks string JS (UTF-16)
-- di passage.text_raw, rentang [char_start, char_end). Penanda yatim tidak disimpan (masuk laporan).
CREATE TABLE footnote_ref (
  passage_id          INTEGER NOT NULL REFERENCES passage (id),
  char_start          INTEGER NOT NULL CHECK (char_start >= 0),
  char_end            INTEGER NOT NULL,
  marker              TEXT NOT NULL,
  footnote_passage_id INTEGER NOT NULL REFERENCES passage (id),
  PRIMARY KEY (passage_id, char_start),
  CHECK (char_end > char_start)
) STRICT, WITHOUT ROWID;

-- Fase 2 (S13): terjemahan AI per paragraf, selalu berlabel. Kosong sampai S13.
CREATE TABLE translation (
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

-- Fase 2 (S13): ringkasan AI per bagian daftar isi, selalu berlabel. Kosong sampai S13.
CREATE TABLE summary (
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

-- Metadata build. norm_version, corpus_version, built_at, source_hash diisi ingest (S07);
-- schema_version diisi migrasi dan dinaikkan oleh setiap migrasi korpus berikutnya
-- (kode memeriksanya sebelum memakai tabel baru, ARSITEKTUR-TEKNIS §7 aturan 5).
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT, WITHOUT ROWID;

INSERT INTO meta (key, value) VALUES ('schema_version', '1');

-- Indeks FTS turunan (diisi S11). rowid = passage.id. body/foot = normalizeArabic(text_raw),
-- sbody/sfoot = stem dari bentuk normal. Contentless: teks tidak disalin dua kali.
-- Riset: docs/riset/2026-10-15-pencarian-arab.
CREATE VIRTUAL TABLE passage_fts USING fts5 (
  body, foot, sbody, sfoot,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 0'
);
