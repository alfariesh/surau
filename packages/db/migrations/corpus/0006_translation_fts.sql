-- Migration number: 0006 	 2026-10-17
-- Pencarian bahasa Indonesia (S14, ADR-044): indeks FTS5 atas terjemahan AI paragraf dan ringkasan
-- AI bagian (bahasa `id`). Yang diindeks hanya teks AI: placeholder ayat ⟦QS s:a⟧ dibuang, jadi
-- terjemahan Kemenag tidak ikut (ayat tidak pernah dicari sebagai teks buatan model). Isi kolom
-- `terms` = `latinIndexText` (@surau/text: token Latin → bentuk normal → tanpa stopword → stem
-- ringan), dihitung ingest; sisi kueri memakai fungsi yang sama (`planLatinQuery`). Turunan seperti
-- passage_fts: contentless, diisi ulang setiap pemuatan korpus, versi aturannya di
-- meta.latin_norm_version.

-- rowid = translation.passage_id (lang 'id'): filter per edisi lewat rentang rowid (ADR-005).
CREATE VIRTUAL TABLE translation_fts USING fts5 (
  terms,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- rowid = summary.toc_node_id (lang 'id').
CREATE VIRTUAL TABLE summary_fts USING fts5 (
  terms,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Ringkasan bagian yang mulai di satu halaman (readPage) tanpa memindai seluruh daftar isi.
CREATE INDEX toc_node_start ON toc_node (start_page_id);

UPDATE meta SET value = '6' WHERE key = 'schema_version';
