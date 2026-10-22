-- Migration number: 0006 	 2026-10-22
-- X08: koreksi terjemahan Indonesia oleh editor terdaftar (ADR-081). DB app, bukan korpus
-- blue-green: paragraf dirujuk lewat passage_id stabil (ADR-029), tanpa FOREIGN KEY (beda DB).
-- Setiap simpanan = satu baris baru; baris lama tidak pernah ditimpa. Satu-satunya UPDATE adalah
-- status 'active' → 'superseded' saat revisi baru menggantikannya. Editor tidak pernah menulis teks
-- Arab (`text` ditolak bila memuat huruf Arab; teks Arab tetap dari korpus).
--   kind = 'confirmed': "sudah benar" atas draf AI (text NULL);
--   kind = 'revised':   teks perbaikan (text wajib, alasan wajib);
--   kind = 'reverted':  pembatalan; keadaan yang dipulihkan = revisi `restores_id` (confirmed/revised)
--                       atau draf AI bila NULL. Pembatal tidak pernah tampil sebagai pengoreksi.
-- base_sha256 = sha256 teks yang dilihat editor (konflik versi), draft_sha256 = sha256 draf AI yang
-- mendasari rantai, source_sha256 = sha256 text_raw Arab saat itu (revisi usang bila teks berubah).
-- Identitas: author_key = hash issuer+subjek Access (tanpa email); nama tampilan + gelar dari daftar
-- editor terdaftar (TRANSLATION_EDITORS) saat itu, bukan ketikan bebas. Status 'proposed'/'approved'/
-- 'rejected' disiapkan untuk persetujuan dua orang kelak (belum dipakai). Tidak ikut hapus fisik P-7:
-- ini data kerja permanen (catatan di /privasi).
CREATE TABLE translation_revision (
  id             INTEGER PRIMARY KEY,
  passage_id     INTEGER NOT NULL CHECK (passage_id > 0),
  lang           TEXT NOT NULL CHECK (lang = 'id'),
  kind           TEXT NOT NULL CHECK (kind IN ('confirmed', 'revised', 'reverted')),
  text           TEXT CHECK (text IS NULL OR length(text) BETWEEN 1 AND 8000),
  reason         TEXT NOT NULL DEFAULT '' CHECK (length(reason) <= 500),
  restores_id    INTEGER CHECK (restores_id IS NULL OR restores_id > 0),
  supersedes_id  INTEGER CHECK (supersedes_id IS NULL OR supersedes_id > 0),
  base_sha256    TEXT NOT NULL CHECK (length(base_sha256) = 64),
  draft_sha256   TEXT NOT NULL CHECK (length(draft_sha256) = 64),
  source_sha256  TEXT NOT NULL CHECK (length(source_sha256) = 64),
  author_key     TEXT NOT NULL CHECK (length(author_key) = 64),
  author_name    TEXT NOT NULL CHECK (length(author_name) BETWEEN 1 AND 120),
  author_short   TEXT NOT NULL CHECK (length(author_short) BETWEEN 1 AND 80),
  author_role    TEXT NOT NULL CHECK (author_role IN ('ustadz', 'editor', 'admin')),
  author_public  INTEGER NOT NULL CHECK (author_public IN (0, 1)),
  status         TEXT NOT NULL
    CHECK (status IN ('active', 'superseded', 'proposed', 'approved', 'rejected')),
  corpus_version TEXT NOT NULL CHECK (length(corpus_version) BETWEEN 1 AND 80),
  created_at     TEXT NOT NULL,
  CHECK ((kind = 'revised') = (text IS NOT NULL)),
  CHECK (kind = 'reverted' OR restores_id IS NULL),
  CHECK (kind <> 'revised' OR length(trim(reason)) > 0),
  CHECK (author_role <> 'admin' OR kind = 'reverted')
) STRICT;
-- Paling banyak satu revisi aktif per paragraf (simpanan bersamaan: yang kalah gagal, bukan dua aktif).
CREATE UNIQUE INDEX translation_revision_active
  ON translation_revision (passage_id, lang) WHERE status = 'active';
-- Riwayat per paragraf, daftar "koreksi terbaru" /admin, batas harian + batalkan per editor.
CREATE INDEX translation_revision_passage ON translation_revision (passage_id, id);
CREATE INDEX translation_revision_recent ON translation_revision (created_at);
CREATE INDEX translation_revision_author ON translation_revision (author_key, created_at);
