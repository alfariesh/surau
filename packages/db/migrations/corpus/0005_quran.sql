-- Migration number: 0005 	 2026-10-17
-- Ayat Al-Qur'an dan rujukannya di paragraf kitab (S12, ADR-020, ADR-040). Teks ayat = Tanzil 1.1
-- verbatim (uthmani untuk tampilan, simple-clean untuk pencocokan); terjemahan dan transliterasi =
-- Kemenag RI verbatim. Model tidak pernah menulis atau menerjemahkan ayat: semua teks di sini
-- disalin pipeline dari berkas sumber yang sha256-nya dipin di data/SOURCES.md.

-- Sumber teks Qur'an: satu baris per berkas sumber (versi, lisensi, atribusi wajib).
CREATE TABLE quran_source (
  id          TEXT PRIMARY KEY CHECK (id GLOB '[a-z]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  kind        TEXT NOT NULL CHECK (kind IN ('text', 'translation', 'transliteration')),
  lang        TEXT NOT NULL,
  name        TEXT NOT NULL,
  version     TEXT NOT NULL,
  license     TEXT NOT NULL,
  attribution TEXT NOT NULL,
  url         TEXT NOT NULL,
  sha256      TEXT NOT NULL CHECK (length(sha256) = 64)
) STRICT, WITHOUT ROWID;

CREATE TABLE quran_surah (
  surah      INTEGER PRIMARY KEY CHECK (surah BETWEEN 1 AND 114),
  name_ar    TEXT NOT NULL,
  -- Nama Latin untuk label rujukan ("QS Al-Baqarah [2]: 255").
  name_latin TEXT NOT NULL,
  revelation TEXT NOT NULL CHECK (revelation IN ('makkah', 'madinah')),
  ayah_count INTEGER NOT NULL CHECK (ayah_count > 0)
) STRICT;

-- Penomoran Kufah (6.236 ayat), sama di Tanzil dan Kemenag. Basmalah pembuka surah tidak termasuk
-- teks ayat 1 (kecuali al-Fatihah 1:1), sesuai atribut `bismillah` terpisah di XML Tanzil.
CREATE TABLE quran_ayah (
  surah        INTEGER NOT NULL REFERENCES quran_surah (surah),
  ayah         INTEGER NOT NULL CHECK (ayah > 0),
  juz          INTEGER NOT NULL CHECK (juz BETWEEN 1 AND 30),
  -- Tanzil Uthmani 1.1, verbatim (tampilan).
  text_uthmani TEXT NOT NULL,
  -- Tanzil Simple Clean 1.1, verbatim (dasar pencocokan kutipan; dinormalisasi saat dipakai).
  text_index   TEXT NOT NULL,
  PRIMARY KEY (surah, ayah)
) STRICT, WITHOUT ROWID;

-- Terjemahan dan transliterasi per ayat (jenisnya dari quran_source.kind). `text` verbatim,
-- termasuk penanda catatan kaki seperti "1)"; isi catatan kakinya di `footnotes` (JSON).
CREATE TABLE quran_translation (
  surah     INTEGER NOT NULL,
  ayah      INTEGER NOT NULL,
  source_id TEXT NOT NULL REFERENCES quran_source (id),
  text      TEXT NOT NULL,
  footnotes TEXT CHECK (footnotes IS NULL OR json_valid(footnotes)),
  PRIMARY KEY (surah, ayah, source_id),
  FOREIGN KEY (surah, ayah) REFERENCES quran_ayah (surah, ayah)
) STRICT, WITHOUT ROWID;

-- Kutipan ayat di paragraf kitab, dikenali deterministik oleh ingest (pencocokan ke Tanzil).
-- [char_start, char_end) = potongan text_raw yang cocok. `match`: exact = sama persis setelah
-- normalisasi, similar = beda ejaan kecil (ambang di ADR-040). `partial`: kutipan tidak menutup ayat
-- awal–akhir secara utuh. `bracketed`: bentang bertanda {…} di sumber (0 = dikenali dari frasa
-- pengantar seperti "قال تعالى"). `alt_count`: jumlah letak lain di mushaf dengan lafaz yang sama.
CREATE TABLE passage_ayah_ref (
  passage_id INTEGER NOT NULL REFERENCES passage (id),
  char_start INTEGER NOT NULL CHECK (char_start >= 0),
  char_end   INTEGER NOT NULL CHECK (char_end > char_start),
  surah      INTEGER NOT NULL,
  ayah_from  INTEGER NOT NULL,
  ayah_to    INTEGER NOT NULL CHECK (ayah_to >= ayah_from),
  match      TEXT NOT NULL CHECK (match IN ('exact', 'similar')),
  partial    INTEGER NOT NULL CHECK (partial IN (0, 1)),
  bracketed  INTEGER NOT NULL CHECK (bracketed IN (0, 1)),
  alt_count  INTEGER NOT NULL CHECK (alt_count >= 0),
  PRIMARY KEY (passage_id, char_start),
  FOREIGN KEY (surah, ayah_from) REFERENCES quran_ayah (surah, ayah),
  FOREIGN KEY (surah, ayah_to) REFERENCES quran_ayah (surah, ayah)
) STRICT, WITHOUT ROWID;

UPDATE meta SET value = '5' WHERE key = 'schema_version';
