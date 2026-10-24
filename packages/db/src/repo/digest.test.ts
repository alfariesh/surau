import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  BODY_1,
  BODY_2,
  ED,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_ROOT,
  seedCorpus,
} from "../../test/fixture.ts";
import { getDigest, getDigestHeaders, listDigestHeaders } from "./digest.ts";

const db = env.CORPUS;
const SHA = "a".repeat(64);
const AI = "'model-uji', 'intisari@1', '2026-10-24'";

// Teks AI BUATAN (bukan isi kitab). Kutipan menunjuk rentang fixture, bukan teks Arab ketikan.
beforeAll(async () => {
  await seedCorpus(db);
  const q1 = { start: BODY_1.indexOf("نص"), end: BODY_1.indexOf(" (١)") };
  await db.batch([
    db.prepare(
      `INSERT INTO glossary_term (term_key, lang, label, gloss, model, prompt_version, created_at)
       VALUES ('ikhlas', 'id', 'ikhlas', 'Definisi uji.', ${AI}),
              ('riya', 'id', 'riya''', 'Definisi uji kedua.', ${AI})`,
    ),
    db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, opening, abstract, closing,
           source_sha256, model, prompt_version, created_at)
         VALUES (?1, 'id', 'book', 'children', 'Pembuka uji.', 'Abstrak uji.', 'Penutup.', ?2, ${AI}),
                (?3, 'id', 'section', 'text', NULL, 'Abstrak pasal.', NULL, ?2, ${AI})`,
      )
      .bind(T_ROOT, SHA, T_CHILD_A),
    db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, abstract, source_sha256, model,
           prompt_version, created_at, review_status)
         VALUES (?1, 'id', 'section', 'text', 'Ditolak.', ?2, ${AI}, 'rejected')`,
      )
      .bind(T_CHILD_B, SHA),
    db
      .prepare(
        `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body, review_status)
         VALUES (?1, 'id', 2, 'advice', 'author', 'Anjuran', 'Isi dua.', 'ai_generated'),
                (?1, 'id', 1, 'idea', 'refuted', 'Gagasan', 'Isi satu.', 'ai_generated'),
                (?1, 'id', 3, 'idea', 'reported', 'Ditolak', 'Isi tiga.', 'rejected'),
                (?2, 'id', 1, 'idea', 'author', 'Pasal', 'Isi pasal.', 'ai_generated')`,
      )
      .bind(T_ROOT, T_CHILD_A),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?1, 'id', 1, 2, ?3, 0, 3), (?1, 'id', 1, 1, ?2, 0, 4), (?1, 'id', 2, 1, ?3, 4, 6)`,
      )
      .bind(T_ROOT, PASSAGES.body1, PASSAGES.body2),
    db
      .prepare(
        `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
           char_end, raw_sha256, kind, translation_source, translation)
         VALUES (?1, 'id', 2, NULL, ?2, 0, ?3, ?4, 'text', 'passage', NULL),
                (?1, 'id', 1, 1, ?5, ?6, ?7, ?4, 'report', 'digest', 'Terjemahan kutipan uji.')`,
      )
      .bind(T_ROOT, PASSAGES.body2, BODY_2.length, SHA, PASSAGES.body1, q1.start, q1.end),
    db
      .prepare(
        `INSERT INTO digest_question (toc_node_id, lang, ord, point_ord, text)
         VALUES (?1, 'id', 1, 2, 'Pertanyaan uji?')`,
      )
      .bind(T_ROOT),
    db
      .prepare(
        `INSERT INTO digest_term (toc_node_id, lang, ord, term_key)
         VALUES (?1, 'id', 2, 'ikhlas'), (?1, 'id', 1, 'riya')`,
      )
      .bind(T_ROOT),
    db
      .prepare(
        `INSERT INTO audio_track (toc_node_id, lang, voice_kind, r2_key, mime, bytes, duration_ms,
           provider, voice_id, voice_name, model, script_sha256, script_version, lexicon_version,
           chapters_json, created_at)
         VALUES (?1, 'id', 'ai', 'uji/id/1.mp3', 'audio/mpeg', 1000, 61000, 'elevenlabs', 'v1',
           'Narator Uji', 'eleven_v4', ?2, 1, 'lx1', '[{"point_ord":1,"start_ms":0}]', '2026-10-24')`,
      )
      .bind(T_ROOT, SHA),
  ]);
});

describe("getDigest (X15, skema 9)", () => {
  test("semua baris satu Intisari urut tampil, dengan halaman cetak dan teks paragraf kutipan", async () => {
    const rows = await getDigest(db, T_ROOT, "id");
    expect(rows?.digest).toMatchObject({ tier: "book", basis: "children", closing: "Penutup." });
    expect(rows?.points.map((p) => p.ord)).toEqual([1, 2, 3]);
    expect(rows?.points[0]).toMatchObject({ kind: "idea", stance: "refuted" });
    expect(rows?.anchors.map((a) => [a.point_ord, a.seq, a.passage_id])).toEqual([
      [1, 1, PASSAGES.body1],
      [1, 2, PASSAGES.body2],
      [2, 1, PASSAGES.body2],
    ]);
    expect(rows?.anchors[0]).toMatchObject({ juz: 1, page_no: 1 });
    expect(rows?.quotes.map((q) => q.ord)).toEqual([1, 2]);
    expect(rows?.quotes[0]).toMatchObject({ text_raw: BODY_1, juz: 1, page_no: 1, kind: "report" });
    expect(rows?.quotes[1]).toMatchObject({ text_raw: BODY_2, page_no: 2, translation: null });
    expect(rows?.questions).toHaveLength(1);
    expect(rows?.terms.map((t) => t.term_key)).toEqual(["riya", "ikhlas"]);
    expect(rows?.audio[0]).toMatchObject({ voice_kind: "ai", duration_ms: 61000 });
  });

  test("node tanpa Intisari, atau bahasa lain → null", async () => {
    expect(await getDigest(db, T_ROOT, "en")).toBeNull();
    expect(await getDigest(db, T_ROOT + 98, "id")).toBeNull();
  });

  test("CHECK menolak kutipan tanpa terjemahan, rentang terbalik, dan suara AI tanpa model", async () => {
    const quote = db
      .prepare(
        `INSERT INTO digest_quote (toc_node_id, lang, ord, passage_id, char_start, char_end,
           raw_sha256, kind, translation_source, translation)
         VALUES (?, 'id', 3, ?, 0, 2, ?, 'text', 'digest', NULL)`,
      )
      .bind(T_ROOT, PASSAGES.body1, SHA);
    await expect(quote.run()).rejects.toThrow(/CHECK constraint failed/);
    const anchor = db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?, 'id', 2, 2, ?, 5, 5)`,
      )
      .bind(T_ROOT, PASSAGES.body1);
    await expect(anchor.run()).rejects.toThrow(/CHECK constraint failed/);
    const audio = db
      .prepare(
        `INSERT INTO audio_track (toc_node_id, lang, voice_kind, r2_key, mime, bytes, duration_ms,
           provider, voice_id, voice_name, model, script_sha256, script_version, lexicon_version,
           chapters_json, created_at)
         VALUES (?, 'id', 'human', 'uji/id/2.mp3', 'audio/mpeg', 1, 1, 'manusia', 'n', 'N',
           'eleven_v4', ?, 1, 'lx1', '[]', '2026-10-24')`,
      )
      .bind(T_ROOT, SHA);
    await expect(audio.run()).rejects.toThrow(/CHECK constraint failed/);
  });
});

describe("kepala Intisari", () => {
  test("listDigestHeaders: tanpa yang ditolak; gagasan + panjang teks + durasi audio", async () => {
    const heads = await listDigestHeaders(db, ED, "id");
    expect(heads.map((h) => h.toc_node_id)).toEqual([T_ROOT, T_CHILD_A]);
    const root = heads[0];
    expect(root).toMatchObject({ tier: "book", points: 2, audio_ms: 61000 });
    const chars = [
      "Pembuka uji.",
      "Abstrak uji.",
      "Penutup.",
      "Gagasan",
      "Isi satu.",
      "Anjuran",
      "Isi dua.",
    ]
      .map((s) => s.length)
      .reduce((a, b) => a + b, 0);
    expect(root?.chars).toBe(chars);
    expect(heads[1]).toMatchObject({ tier: "section", points: 1, audio_ms: null });
  });

  test("getDigestHeaders: hanya node yang diminta; edisi lain kosong", async () => {
    const heads = await getDigestHeaders(db, [T_CHILD_A, T_CHILD_B, T_ROOT + 98], "id");
    expect(heads.map((h) => h.toc_node_id)).toEqual([T_CHILD_A]);
    expect(await getDigestHeaders(db, [], "id")).toEqual([]);
    expect(await listDigestHeaders(db, ED + 1, "id")).toEqual([]);
  });
});
