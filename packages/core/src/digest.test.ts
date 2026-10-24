import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  BODY_1,
  BODY_2,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_ROOT,
  seedCore,
} from "../test/fixture.ts";
import { readDigest, readingMinutes } from "./digest.ts";
import { NotFound } from "./errors.ts";
import { digestView } from "./schema.ts";
import { textSha256 } from "./translation-revision.ts";

const db = env.CORPUS;
const AI = "'model-uji', 'intisari@1', '2026-10-24'";
/** Rentang "نص تجريبي" di BODY_1 (fixture buatan, bukan teks kitab). */
const SPAN = { start: BODY_1.indexOf("نص"), end: BODY_1.indexOf(" (١)") };

// Teks AI BUATAN. Kutipan hanya menunjuk rentang fixture; teks Arabnya disalin readDigest dari DB.
beforeAll(async () => {
  await seedCore(db);
  const good = await textSha256(BODY_1.slice(SPAN.start, SPAN.end));
  const whole = await textSha256(BODY_2);
  await db.batch([
    db.prepare("DELETE FROM translation WHERE passage_id = ?").bind(PASSAGES.body2),
    db
      .prepare(
        `INSERT INTO translation (passage_id, lang, text, model, prompt_version, created_at)
         VALUES (?, 'id', 'Terjemahan paragraf dua.', 'model-uji', 'translate-passage@2', '2026-10-17')`,
      )
      .bind(PASSAGES.body2),
    db.prepare(
      `INSERT INTO glossary_term (term_key, lang, label, gloss, model, prompt_version, created_at, review_status)
       VALUES ('ikhlas', 'id', 'ikhlas', 'Definisi uji.', ${AI}, 'ai_generated'),
              ('riya', 'id', 'riya''', 'Ditolak.', ${AI}, 'rejected')`,
    ),
    db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, opening, abstract, closing,
           source_sha256, model, prompt_version, created_at, review_status)
         VALUES (?1, 'id', 'book', 'children', 'Pembuka.', 'Abstrak.', 'Penutup.', ?2, ${AI}, 'ai_generated'),
                (?3, 'id', 'section', 'text', NULL, 'Ditolak.', NULL, ?2, ${AI}, 'rejected')`,
      )
      .bind(T_ROOT, "a".repeat(64), T_CHILD_B),
    db
      .prepare(
        `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body, review_status)
         VALUES (?1, 'id', 1, 'idea', 'author', 'Gagasan', 'Isi satu.', 'ai_generated'),
                (?1, 'id', 2, 'advice', 'author', 'Anjuran', 'Isi dua.', 'ai_generated'),
                (?1, 'id', 3, 'idea', 'reported', 'Ditolak', 'Isi tiga.', 'rejected')`,
      )
      .bind(T_ROOT),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?1, 'id', 1, 1, ?2, ?3, ?4), (?1, 'id', 1, 2, ?5, 0, 3), (?1, 'id', 3, 1, ?5, 0, 2)`,
      )
      .bind(T_ROOT, PASSAGES.body1, SPAN.start, SPAN.end, PASSAGES.body2),
    db
      .prepare(
        `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
           char_end, raw_sha256, kind, translation_source, translation)
         VALUES (?1, 'id', 1, 1, ?2, ?3, ?4, ?5, 'text', 'digest', 'Terjemahan kutipan uji.'),
                (?1, 'id', 2, NULL, ?6, 0, ?7, ?8, 'report', 'passage', NULL),
                (?1, 'id', 3, NULL, ?2, ?3, ?4, ?9, 'text', 'digest', 'Sidik basi.'),
                (?1, 'id', 4, 3, ?2, ?3, ?4, ?5, 'text', 'digest', 'Milik gagasan ditolak.')`,
      )
      .bind(
        T_ROOT,
        PASSAGES.body1,
        SPAN.start,
        SPAN.end,
        good,
        PASSAGES.body2,
        BODY_2.length,
        whole,
        "b".repeat(64),
      ),
    db
      .prepare(
        `INSERT INTO digest_question (toc_node_id, lang, ord, point_ord, text)
         VALUES (?1, 'id', 1, 1, 'Siapa berpendapat?'), (?1, 'id', 2, 3, 'Ditolak?')`,
      )
      .bind(T_ROOT),
    db
      .prepare(
        `INSERT INTO digest_term (toc_node_id, lang, ord, term_key)
         VALUES (?1, 'id', 1, 'riya'), (?1, 'id', 2, 'ikhlas')`,
      )
      .bind(T_ROOT),
    db
      .prepare(
        `INSERT INTO audio_track (toc_node_id, lang, voice_kind, r2_key, mime, bytes, duration_ms,
           provider, voice_id, voice_name, model, script_sha256, script_version, lexicon_version,
           chapters_json, created_at)
         VALUES (?1, 'id', 'ai', 'uji/id/intisari.mp3', 'audio/mpeg', 2048, 95000, 'elevenlabs',
           'v1', 'Narator Uji', 'eleven_v4', ?2, 1, 'lx1',
           '[{"point_ord":1,"start_ms":4000},{"point_ord":2,"start_ms":51000}]', '2026-10-24')`,
      )
      .bind(T_ROOT, "c".repeat(64)),
  ]);
});

describe("readDigest (X15, ADR-097)", () => {
  test("kontrak: label AI, gagasan berjangkar, sitasi, audio + bab", async () => {
    const view = await readDigest(db, T_ROOT);
    expect(view).not.toBeNull();
    expect(digestView.parse(view)).toEqual(view);
    expect(view).toMatchObject({
      label: "ai_digest",
      tier: "book",
      basis: "children",
      model: "model-uji",
      prompt_version: "intisari@1",
      opening: "Pembuka.",
      closing: "Penutup.",
      reading_minutes: 1,
    });
    expect(view?.section.permalink).toBe(`/kitab/uji/bab/${T_ROOT}`);
    expect(view?.points.map((p) => [p.ord, p.kind])).toEqual([
      [1, "idea"],
      [2, "advice"],
    ]);
    const anchors = view?.points[0]?.anchors ?? [];
    expect(anchors.map((a) => a.passage_id)).toEqual([PASSAGES.body1, PASSAGES.body2]);
    expect(anchors[0]?.location.permalink).toMatch(/^\/kitab\/uji\/1\/1#p\d+$/);
    expect(anchors[1]?.location.label).toBe("Kitab Uji, j. 1, h. 2");
    expect(view?.audio).toMatchObject({ voice_kind: "ai", duration_ms: 95000, model: "eleven_v4" });
    expect(view?.audio?.chapters.map((c) => c.point_ord)).toEqual([1, 2]);
  });

  test("kutipan disalin dari text_raw; sidik basi dan milik gagasan ditolak tidak dikirim", async () => {
    const view = await readDigest(db, T_ROOT);
    expect(view?.quotes.map((q) => q.ord)).toEqual([1, 2]);
    const [part, whole] = view?.quotes ?? [];
    expect(part?.text_raw).toBe(BODY_1.slice(SPAN.start, SPAN.end));
    expect(part?.translation).toMatchObject({
      label: "ai_translation",
      prompt_version: "intisari@1",
      human_review: null,
      text: "Terjemahan kutipan uji.",
    });
    expect(whole?.text_raw).toBe(BODY_2);
    expect(whole?.kind).toBe("report");
    expect(whole?.translation).toMatchObject({
      prompt_version: "translate-passage@2",
      text: "Terjemahan paragraf dua.",
    });
  });

  test("pertanyaan dan istilah milik yang ditolak disaring", async () => {
    const view = await readDigest(db, T_ROOT);
    expect(view?.questions.map((q) => q.text)).toEqual(["Siapa berpendapat?"]);
    expect(view?.terms.map((t) => t.key)).toEqual(["ikhlas"]);
  });

  test("tanpa Intisari atau ditolak → null; node tidak ada → NotFound", async () => {
    expect(await readDigest(db, T_CHILD_A)).toBeNull();
    expect(await readDigest(db, T_CHILD_B)).toBeNull();
    expect(await readDigest(db, T_ROOT, "en")).toBeNull();
    await expect(readDigest(db, T_ROOT + 98)).rejects.toBeInstanceOf(NotFound);
  });
});

describe("readingMinutes", () => {
  test("dibulatkan ke atas, minimal 1", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1000)).toBe(1);
    expect(readingMinutes(1001)).toBe(2);
  });
});
