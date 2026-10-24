-- Migration number: 0009 	 2026-10-24
-- Intisari (X15, ADR-097): ringkasan belajar berlapis per bagian daftar isi, untuk dibaca atau
-- didengarkan (audio "Dengarkan", X17). Isinya teks buatan model yang selalu berlabel (model, versi
-- prompt, tanggal, status tinjau; teks-arab.md aturan 8). Model hanya MENUNJUK teks kitab: jangkar
-- gagasan dan kutipan disimpan sebagai rentang di `passage.text_raw` (indeks string JS, akhir
-- eksklusif, sama dengan `footnote_ref`), dan teks Arab yang tampil selalu disalin kode dari
-- `text_raw` (aturan 1). Dalil (ayat dan takhrij) tidak disimpan: dihitung kode dari jangkar saat
-- dibaca. Diisi pipeline `pnpm llm intisari` (X15b); `audio_track` diisi dari metadata audio
-- ter-commit (X17). Kosong di korpus sampai saat itu.

-- Satu Intisari per node daftar isi per bahasa. `abstract` juga menjadi `summary.text` node itu
-- bila lolos validasi ringkasan (ADR-097), jadi Cari, Jawab, dan MCP memakai ringkasan yang sama.
CREATE TABLE digest (
  toc_node_id    INTEGER NOT NULL REFERENCES toc_node (id),
  lang           TEXT NOT NULL,
  -- book = Intisari Kitab (muqaddimah + kitab-kitab Ihya); section = Intisari Bab (bagian lain).
  tier           TEXT NOT NULL CHECK (tier IN ('book', 'section')),
  -- Asal isi: text = teks Arab bagian itu; children = Intisari anak-anaknya; mixed = keduanya.
  basis          TEXT NOT NULL CHECK (basis IN ('text', 'children', 'mixed')),
  -- Pembuka "apa yang dibahas" (wajib untuk tier book, opsional untuk section).
  opening        TEXT,
  abstract       TEXT NOT NULL,
  -- Penutup "inti kitab" (tier book).
  closing        TEXT,
  -- sha256 masukan model (blok teks, atau sha Intisari anak): hasil basi gugur saat ingest.
  source_sha256  TEXT NOT NULL CHECK (length(source_sha256) = 64),
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  review_status  TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (review_status IN ('ai_generated', 'reviewed', 'ustadz_verified', 'rejected')),
  PRIMARY KEY (toc_node_id, lang)
) STRICT, WITHOUT ROWID;

-- Gagasan kunci, urut `ord`. Status tinjau per baris supaya koreksi manusia kelak (pola ADR-082)
-- bisa per gagasan.
CREATE TABLE digest_point (
  toc_node_id   INTEGER NOT NULL,
  lang          TEXT NOT NULL,
  ord           INTEGER NOT NULL CHECK (ord BETWEEN 1 AND 99),
  -- idea = gagasan; advice = anjuran yang ditulis al-Ghazali sendiri (berjangkar, bukan nasihat Surau).
  kind          TEXT NOT NULL CHECK (kind IN ('idea', 'advice')),
  -- Suara siapa: author = pendapat penulis; reported = yang ia nukil; refuted = yang ia bantah.
  stance        TEXT NOT NULL CHECK (stance IN ('author', 'reported', 'refuted')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (review_status IN ('ai_generated', 'reviewed', 'ustadz_verified', 'rejected')),
  PRIMARY KEY (toc_node_id, lang, ord),
  FOREIGN KEY (toc_node_id, lang) REFERENCES digest (toc_node_id, lang)
) STRICT, WITHOUT ROWID;

-- "Dasar teks" sebuah gagasan: 1–9 rentang paragraf yang ditunjuk model (lewat ID blok), dihitung
-- kode. Bisa di bagian lain (subbagian) untuk Intisari yang dibuat dari anak-anaknya.
CREATE TABLE digest_anchor (
  toc_node_id INTEGER NOT NULL,
  lang        TEXT NOT NULL,
  point_ord   INTEGER NOT NULL,
  seq         INTEGER NOT NULL CHECK (seq BETWEEN 1 AND 9),
  passage_id  INTEGER NOT NULL REFERENCES passage (id),
  char_start  INTEGER NOT NULL CHECK (char_start >= 0),
  char_end    INTEGER NOT NULL,
  PRIMARY KEY (toc_node_id, lang, point_ord, seq),
  FOREIGN KEY (toc_node_id, lang, point_ord) REFERENCES digest_point (toc_node_id, lang, ord),
  CHECK (char_end > char_start)
) STRICT, WITHOUT ROWID;

-- Gagasan mana yang bersandar pada sebuah paragraf (dari paragraf ke Intisari; jalur Cari).
CREATE INDEX digest_anchor_passage ON digest_anchor (passage_id);

-- Kutipan pilihan: rentang teks Arab yang disalin dari `text_raw` (bukan teks model).
-- `raw_sha256` = sha256 `text_raw.slice(char_start, char_end)` saat dibangun; pembaca tidak
-- menampilkan kutipan yang sidiknya tidak cocok lagi.
CREATE TABLE digest_quote (
  toc_node_id        INTEGER NOT NULL,
  lang               TEXT NOT NULL,
  ord                INTEGER NOT NULL CHECK (ord BETWEEN 1 AND 9),
  -- Gagasan yang diperkuat kutipan ini; NULL = kutipan pilihan umum.
  point_ord          INTEGER,
  passage_id         INTEGER NOT NULL REFERENCES passage (id),
  char_start         INTEGER NOT NULL CHECK (char_start >= 0),
  char_end           INTEGER NOT NULL,
  raw_sha256         TEXT NOT NULL CHECK (length(raw_sha256) = 64),
  -- Ditentukan kode, bukan model: text = perkataan dalam teks; report = riwayat (status dari
  -- takhrij); poetry = syair.
  kind               TEXT NOT NULL CHECK (kind IN ('text', 'report', 'poetry')),
  -- digest = terjemahan AI kutipan ini (`translation` terisi); passage = kutipan satu paragraf utuh,
  -- terjemahannya diambil dari tabel `translation` saat dibaca (label tinjauan manusia ikut).
  translation_source TEXT NOT NULL CHECK (translation_source IN ('digest', 'passage')),
  translation        TEXT,
  PRIMARY KEY (toc_node_id, lang, ord),
  FOREIGN KEY (toc_node_id, lang) REFERENCES digest (toc_node_id, lang),
  FOREIGN KEY (toc_node_id, lang, point_ord) REFERENCES digest_point (toc_node_id, lang, ord),
  CHECK (char_end > char_start AND char_end - char_start <= 2000),
  CHECK ((translation_source = 'digest') = (translation IS NOT NULL))
) STRICT, WITHOUT ROWID;

-- Pertanyaan ingatan per gagasan ("siapa berpendapat apa"), bahan fitur ulas kelak.
CREATE TABLE digest_question (
  toc_node_id INTEGER NOT NULL,
  lang        TEXT NOT NULL,
  ord         INTEGER NOT NULL CHECK (ord BETWEEN 1 AND 99),
  point_ord   INTEGER NOT NULL,
  text        TEXT NOT NULL,
  PRIMARY KEY (toc_node_id, lang, ord),
  FOREIGN KEY (toc_node_id, lang, point_ord) REFERENCES digest_point (toc_node_id, lang, ord)
) STRICT, WITHOUT ROWID;

-- Istilah berkunci (glosarium sebagai data, ADR-097): definisi AI ditulis sekali per istilah per
-- bahasa; model Intisari hanya memilih kunci (enum), tidak menulis definisi.
CREATE TABLE glossary_term (
  term_key       TEXT NOT NULL CHECK (term_key GLOB '[a-z]*' AND term_key NOT GLOB '*[^a-z0-9-]*'),
  lang           TEXT NOT NULL,
  label          TEXT NOT NULL,
  gloss          TEXT NOT NULL,
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  review_status  TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (review_status IN ('ai_generated', 'reviewed', 'ustadz_verified', 'rejected')),
  PRIMARY KEY (term_key, lang)
) STRICT, WITHOUT ROWID;

CREATE TABLE digest_term (
  toc_node_id INTEGER NOT NULL,
  lang        TEXT NOT NULL,
  ord         INTEGER NOT NULL CHECK (ord BETWEEN 1 AND 99),
  term_key    TEXT NOT NULL,
  PRIMARY KEY (toc_node_id, lang, ord),
  UNIQUE (toc_node_id, lang, term_key),
  FOREIGN KEY (toc_node_id, lang) REFERENCES digest (toc_node_id, lang),
  FOREIGN KEY (term_key, lang) REFERENCES glossary_term (term_key, lang)
) STRICT, WITHOUT ROWID;

-- Audio "Dengarkan" (X17): satu berkas MP3 per Intisari per jenis suara di bucket R2 media publik
-- (objek tidak pernah ditimpa; kunci memuat sha skrip). Sumber kebenarannya metadata ter-commit
-- `data/audio/<kitab>-audio.json`; ingest memuat baris hanya bila `script_sha256` sama dengan skrip
-- yang dibangun ulang dari Intisari di build itu, jadi audio basi gugur sendiri.
CREATE TABLE audio_track (
  toc_node_id     INTEGER NOT NULL,
  lang            TEXT NOT NULL,
  -- ai = suara sintetis (berlabel "dibacakan suara AI"); human = narator manusia.
  voice_kind      TEXT NOT NULL CHECK (voice_kind IN ('ai', 'human')),
  r2_key          TEXT NOT NULL UNIQUE,
  mime            TEXT NOT NULL CHECK (mime = 'audio/mpeg'),
  bytes           INTEGER NOT NULL CHECK (bytes > 0),
  duration_ms     INTEGER NOT NULL CHECK (duration_ms > 0),
  provider        TEXT NOT NULL,
  voice_id        TEXT NOT NULL,
  voice_name      TEXT NOT NULL,
  -- Model TTS (NULL untuk narator manusia).
  model           TEXT,
  script_sha256   TEXT NOT NULL CHECK (length(script_sha256) = 64),
  script_version  INTEGER NOT NULL CHECK (script_version > 0),
  lexicon_version TEXT NOT NULL,
  -- Bab pemutar: [{"point_ord": n, "start_ms": t}, …], urut waktu.
  chapters_json   TEXT NOT NULL CHECK (json_valid(chapters_json)),
  -- Objek R2 timestamps per kalimat (opsional, untuk sorotan teks).
  alignment_key   TEXT,
  created_at      TEXT NOT NULL,
  PRIMARY KEY (toc_node_id, lang, voice_kind),
  FOREIGN KEY (toc_node_id, lang) REFERENCES digest (toc_node_id, lang),
  CHECK ((voice_kind = 'ai') = (model IS NOT NULL))
) STRICT, WITHOUT ROWID;

-- Indeks Indonesia gagasan kunci (lang 'id'), pola `summary_fts` (ADR-044): rowid =
-- toc_node_id·100 + ord, terms = `latinIndexText` judul + isi gagasan.
CREATE VIRTUAL TABLE digest_point_fts USING fts5 (
  terms,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 2'
);

UPDATE meta SET value = '9' WHERE key = 'schema_version';
