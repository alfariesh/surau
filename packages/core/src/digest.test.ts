import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  BODY_1,
  BODY_2,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_LONG,
  T_ROOT,
  seedCore,
} from "../test/fixture.ts";
import { readDigest, readingMinutes } from "./digest.ts";
import { NotFound } from "./errors.ts";
import { digestView } from "./schema.ts";
import { textSha256 } from "./translation-revision.ts";

const db = env.CORPUS;
const AI = "'model-uji', 'intisari@1', '2026-10-24'";
const SHA = "a".repeat(64);
/** Rentang "نص تجريبي" di BODY_1 (fixture buatan, bukan teks kitab). */
const SPAN = { start: BODY_1.indexOf("نص"), end: BODY_1.indexOf(" (١)") };
/** Huruf Arab di teks AI: tidak boleh pernah tampil (aturan 1). */
const ARABIC = "نص";

// Teks AI BUATAN. Kutipan hanya menunjuk rentang fixture; teks Arabnya disalin readDigest dari DB.
beforeAll(async () => {
  await seedCore(db);
  const part = await textSha256(BODY_1.slice(SPAN.start, SPAN.end));
  const whole1 = await textSha256(BODY_1);
  const whole2 = await textSha256(BODY_2);
  const quote = (
    ord: number,
    point: number | null,
    passage: number,
    [start, end]: [number, number],
    sha: string,
    source: "digest" | "passage",
    status = "ai_generated",
  ) =>
    db
      .prepare(
        `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
           char_end, raw_sha256, kind, translation_source, translation, model, prompt_version,
           created_at, review_status)
         VALUES (?, 'id', ?, ?, ?, ?, ?, ?, 'text', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        T_ROOT,
        ord,
        point,
        passage,
        start,
        end,
        sha,
        source,
        ...(source === "digest"
          ? [`Terjemahan kutipan ${ord}.`, "model-kutipan", "intisari-bab@1", "2026-10-23"]
          : [null, null, null, null]),
        status,
      );
  await db.batch([
    db
      .prepare("DELETE FROM translation WHERE passage_id IN (?, ?)")
      .bind(PASSAGES.body1, PASSAGES.body2),
    db
      .prepare(
        `INSERT INTO translation (passage_id, lang, text, model, prompt_version, created_at)
         VALUES (?, 'id', 'Terjemahan paragraf satu.', 'model-uji', 'translate-passage@2', '2026-10-17')`,
      )
      .bind(PASSAGES.body1),
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
                (?3, 'id', 'section', 'text', NULL, 'Ditolak.', NULL, ?2, ${AI}, 'rejected'),
                (?4, 'id', 'section', 'text', NULL, ?5, NULL, ?2, ${AI}, 'ai_generated')`,
      )
      .bind(T_ROOT, SHA, T_CHILD_B, T_LONG, `Abstrak dengan huruf ${ARABIC}.`),
    db
      .prepare(
        `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body, review_status)
         VALUES (?1, 'id', 1, 'idea', 'author', 'Gagasan', 'Isi satu.', 'ai_generated'),
                (?1, 'id', 2, 'advice', 'author', 'Anjuran', 'Isi dua.', 'ai_generated'),
                (?1, 'id', 3, 'idea', 'reported', 'Ditolak', 'Isi tiga.', 'rejected'),
                (?1, 'id', 4, 'idea', 'author', 'Tanpa jangkar', 'Isi empat.', 'ai_generated'),
                (?1, 'id', 5, 'idea', 'author', 'Berhuruf Arab', ?2, 'ai_generated')`,
      )
      .bind(T_ROOT, `Isi ${ARABIC}.`),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?1, 'id', 1, 1, ?2, ?3, ?4), (?1, 'id', 1, 2, ?5, 0, 3), (?1, 'id', 2, 1, ?2, 0, 3),
                (?1, 'id', 3, 1, ?5, 0, 2), (?1, 'id', 5, 1, ?5, 0, 2)`,
      )
      .bind(T_ROOT, PASSAGES.body1, SPAN.start, SPAN.end, PASSAGES.body2),
    quote(1, 1, PASSAGES.body1, [SPAN.start, SPAN.end], part, "digest"),
    quote(2, null, PASSAGES.body1, [0, BODY_1.length], whole1, "passage"),
    // Sidik basi: teks berubah sesudah Intisari dibangun.
    quote(3, null, PASSAGES.body1, [SPAN.start, SPAN.end], "b".repeat(64), "digest"),
    // Milik gagasan yang ditolak.
    quote(4, 3, PASSAGES.body1, [SPAN.start, SPAN.end], part, "digest"),
    // Seluruh BODY_2 memuat rujukan ayat fixture (QS 1:2–3): tidak boleh tampil.
    quote(5, null, PASSAGES.body2, [0, BODY_2.length], whole2, "digest"),
    // Sumber `passage` tetapi bukan paragraf utuh: terjemahan paragraf tidak dipakai.
    quote(6, null, PASSAGES.body1, [SPAN.start, SPAN.end], part, "passage"),
    // Ditolak peninjau sendiri.
    quote(7, null, PASSAGES.body1, [SPAN.start, SPAN.end], part, "digest", "rejected"),
    db
      .prepare(
        `INSERT INTO digest_question (toc_node_id, lang, ord, point_ord, text, review_status)
         VALUES (?1, 'id', 1, 1, 'Siapa berpendapat?', 'ai_generated'),
                (?1, 'id', 2, 3, 'Milik gagasan ditolak?', 'ai_generated'),
                (?1, 'id', 3, 1, 'Ditolak sendiri?', 'rejected'),
                (?1, 'id', 4, 2, ?2, 'ai_generated')`,
      )
      .bind(T_ROOT, `Pertanyaan ${ARABIC}?`),
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
    const anchors = view?.points[0]?.anchors ?? [];
    expect(anchors.map((a) => a.passage_id)).toEqual([PASSAGES.body1, PASSAGES.body2]);
    expect(anchors[0]?.location.permalink).toMatch(/^\/kitab\/uji\/1\/1#p\d+$/);
    expect(anchors[1]?.location.label).toBe("Kitab Uji, j. 1, h. 2");
    expect(view?.audio).toMatchObject({ voice_kind: "ai", duration_ms: 95000, model: "eleven_v4" });
    expect(view?.audio?.chapters.map((c) => c.point_ord)).toEqual([1, 2]);
  });

  test("gagasan: yang ditolak, tanpa jangkar, atau berhuruf Arab tidak dikirim", async () => {
    const view = await readDigest(db, T_ROOT);
    expect(view?.points.map((p) => [p.ord, p.kind])).toEqual([
      [1, "idea"],
      [2, "advice"],
    ]);
  });

  test("kutipan disalin dari text_raw; basi dan menyentuh ayat ditahan; asal terjemahan per kutipan", async () => {
    const view = await readDigest(db, T_ROOT);
    expect(view?.quotes.map((q) => q.ord)).toEqual([1, 2, 6]);
    const [part, whole, partial] = view?.quotes ?? [];
    expect(part?.text_raw).toBe(BODY_1.slice(SPAN.start, SPAN.end));
    // Asal terjemahan = milik kutipan (bisa dari Intisari anak), bukan milik Intisari ini.
    expect(part?.translation).toMatchObject({
      label: "ai_translation",
      model: "model-kutipan",
      prompt_version: "intisari-bab@1",
      created_at: "2026-10-23",
      human_review: null,
      text: "Terjemahan kutipan 1.",
    });
    expect(whole?.text_raw).toBe(BODY_1);
    expect(whole?.translation).toMatchObject({
      prompt_version: "translate-passage@2",
      text: "Terjemahan paragraf satu.",
    });
    // Sumber `passage` tetapi hanya sebagian paragraf: tanpa terjemahan, bukan terjemahan paragraf.
    expect(partial?.translation).toBeNull();
    // Yang ditolak (sendiri atau lewat gagasannya) tidak masuk daftar tahan.
    expect(view?.withheld_quotes).toEqual([
      { ord: 3, reason: "stale" },
      { ord: 5, reason: "ayah" },
    ]);
  });

  test("pertanyaan dan istilah yang ditolak, milik gagasan ditolak, atau berhuruf Arab disaring", async () => {
    const view = await readDigest(db, T_ROOT);
    expect(view?.questions.map((q) => q.text)).toEqual(["Siapa berpendapat?"]);
    expect(view?.terms.map((t) => t.key)).toEqual(["ikhlas"]);
  });

  test("tanpa Intisari, ditolak, atau teks utama berhuruf Arab → null; node tidak ada → NotFound", async () => {
    expect(await readDigest(db, T_CHILD_A)).toBeNull();
    expect(await readDigest(db, T_CHILD_B)).toBeNull();
    expect(await readDigest(db, T_LONG)).toBeNull();
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
