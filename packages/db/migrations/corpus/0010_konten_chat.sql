-- Migration number: 0010 	 2026-11-27
-- Konten turunan dari chat (X24, ADR-125 butir 3 dan Konsekuensi): Intisari standar v2 punya inti
-- satu kalimat di kepala halaman (`digest.lead`) dan jawaban satu kalimat untuk setiap soal
-- (`digest_question.answer`). Keduanya teks Indonesia buatan AI, boleh kosong: Intisari batch lama
-- (X15b) tidak punya inti maupun jawaban. Pembaca menangani skema 9 (kolom tidak ada) dan 10.
ALTER TABLE digest ADD COLUMN lead TEXT CHECK (lead IS NULL OR length(lead) BETWEEN 1 AND 400);
ALTER TABLE digest_question ADD COLUMN answer TEXT
  CHECK (answer IS NULL OR length(answer) BETWEEN 1 AND 400);

UPDATE meta SET value = '10' WHERE key = 'schema_version';
