-- Migration number: 0004 	 2026-10-16
-- Stem yang sangat umum di indeks passage_fts (S11, ADR-039): pengaman pencarian. Kueri yang
-- SEMUA stem-nya ada di sini (الله, من, قال …) tidak diranking penuh (membaca dan mengurutkan
-- seluruh daftar dokumennya mahal pada skala banyak kitab); searchText mengembalikan peringatan
-- dan hasil terbatas. Dihitung ingest dari fts5vocab: df = jumlah paragraf yang memuat stem itu di
-- kolom sbody/sfoot. Turunan indeks seperti passage_fts: diisi ulang setiap pemuatan korpus.
CREATE TABLE term_stat (
  term TEXT PRIMARY KEY,
  df   INTEGER NOT NULL CHECK (df > 0)
) STRICT, WITHOUT ROWID;

UPDATE meta SET value = '4' WHERE key = 'schema_version';
