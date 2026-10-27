-- Migration number: 0007 	 2026-10-27
-- Minat pembaca pada kitab kandidat "Segera hadir" di /kitab (ADR-115). Hanya hitungan agregat per
-- hari (UTC), kandidat, dan dua pilihan tetap: tidak ada baris per suara, jadi urutan atau waktu
-- suara tidak bisa ditelusuri, dan ukuran tabel terbatas (kandidat × 4 × 3 baris per hari). Tanpa
-- IP, HMAC, ID cookie, nama, email, atau teks bebas. CHECK di sini sama dengan `kitabInterestInput`.
CREATE TABLE kitab_interest (
  day       TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  candidate TEXT NOT NULL CHECK (length(candidate) BETWEEN 1 AND 64 AND candidate NOT GLOB '*[^a-z0-9-]*'),
  purpose   TEXT NOT NULL CHECK (purpose IN ('self_study', 'teaching', 'research', 'other')),
  arabic    TEXT NOT NULL CHECK (arabic IN ('beginner', 'with_help', 'fluent')),
  votes     INTEGER NOT NULL CHECK (votes > 0),
  PRIMARY KEY (day, candidate, purpose, arabic)
) STRICT, WITHOUT ROWID;
