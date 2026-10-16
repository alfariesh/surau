-- Migration number: 0002 	 2026-10-16
-- Paragraf yang perlu ditinjau manusia (S07, ADR-032). Ini tanda dari pipeline ingest bahwa batas
-- atau sumber sebuah paragraf meragukan, BUKAN hasil review: hasil review manusia tetap disimpan di
-- DB app (ARSITEKTUR-TEKNIS §3.2). Dibangun ulang bersama korpus; satu paragraf bisa punya >1 alasan.
CREATE TABLE passage_needs_review (
  passage_id INTEGER NOT NULL REFERENCES passage (id),
  -- takhrij_inline: takhrij yang menempel ke matan lewat `//`, dipotong ke catatan kaki
  --   (batas akhirnya tidak selalu pasti, jadi bisa ikut membawa matan);
  -- takhrij_unmatched: catatan kaki yang tidak ditemukan di takhrij OpenITI JK000001 halaman itu;
  -- inline_unsplit: paragraf badan memuat `//`, tetapi takhrijnya tidak dikenali (tidak dipecah).
  reason     TEXT NOT NULL CHECK (reason IN ('takhrij_inline', 'takhrij_unmatched', 'inline_unsplit')),
  PRIMARY KEY (passage_id, reason)
) STRICT, WITHOUT ROWID;

UPDATE meta SET value = '2' WHERE key = 'schema_version';
