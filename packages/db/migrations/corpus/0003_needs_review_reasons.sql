-- Migration number: 0003 	 2026-10-16
-- Alasan tinjau tambahan untuk passage_needs_review (S07, temuan peninjau; ADR-032 butir 2).
-- SQLite tidak bisa mengubah CHECK, jadi tabel dibuat ulang. Isinya turunan ingest (diisi ulang
-- setiap pemuatan korpus), jadi tidak ada data yang perlu dipindahkan.
DROP TABLE passage_needs_review;

CREATE TABLE passage_needs_review (
  passage_id INTEGER NOT NULL REFERENCES passage (id),
  -- takhrij_inline: takhrij yang menempel ke matan lewat `//`, dipotong ke catatan kaki
  --   (batas akhirnya tidak selalu pasti, jadi bisa ikut membawa matan);
  -- takhrij_boundary: potongan matan di sebelah takhrij yang dipotong (batasnya ditebak, jadi
  --   sisa takhrij bisa tertinggal di matan);
  -- takhrij_unmatched: catatan kaki yang tidak ditemukan di takhrij OpenITI JK000001 halaman itu;
  -- inline_unsplit: paragraf badan memuat `//`, tetapi takhrijnya tidak dikenali (tidak dipecah);
  -- footnote_orphan: catatan kaki bagian bawah halaman yang tidak dirujuk penanda mana pun di matan.
  reason     TEXT NOT NULL CHECK (reason IN (
    'takhrij_inline', 'takhrij_boundary', 'takhrij_unmatched', 'inline_unsplit', 'footnote_orphan'
  )),
  PRIMARY KEY (passage_id, reason)
) STRICT, WITHOUT ROWID;

UPDATE meta SET value = '3' WHERE key = 'schema_version';
