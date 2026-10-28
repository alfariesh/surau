import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import { listDigestHeaders } from "@surau/db";

import {
  BODY_1,
  BODY_2,
  ED,
  FOOT_1,
  FOOT_2,
  PASSAGES,
  QURAN_TRANSLATION_1_2,
  T_CHILD_A,
  T_CHILD_B,
  T_LONG,
  T_ROOT,
  seedCore,
} from "../test/fixture.ts";
import { markerInAnchor, readDigest, readingMinutes } from "./digest.ts";
import { withdrawFromHeaders } from "./digest-withdrawal.ts";
import type { DigestWithdrawal } from "./digest-withdrawal.ts";
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
                (?1, 'id', 2, 2, ?5, 0, ?6), (?1, 'id', 3, 1, ?5, 0, ?6), (?1, 'id', 5, 1, ?5, 0, ?6)`,
      )
      // Gagasan 2, 3 (ditolak), dan 5 (berhuruf Arab) berjangkar ke seluruh BODY_2 (rujukan ayat
      // fixture): hanya gagasan 2 yang boleh menyumbang dalil.
      .bind(T_ROOT, PASSAGES.body1, SPAN.start, SPAN.end, PASSAGES.body2, BODY_2.length),
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
           chapters_json, alignment_key, created_at)
         VALUES (?1, 'id', 'ai', 'uji/id/intisari.mp3', 'audio/mpeg', 2048, 95000, 'elevenlabs',
           'v1', 'Narator Uji', 'eleven_v4', ?2, 1, 'lx1',
           '[{"point_ord":1,"start_ms":4000},{"point_ord":2,"start_ms":51000}]',
           'uji/id/1-0123456789ab.align.json', '2026-10-24')`,
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
    expect(view?.audio?.alignment_key).toBe("uji/id/1-0123456789ab.align.json");
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
    // Takhrij per kutipan (X16): penanda tepat sesudah rentang ikut; paragraf utuh memuat keduanya.
    expect(part?.takhrij.map((t) => [t.marker, t.footnote.id])).toEqual([["١", PASSAGES.foot1]]);
    expect(whole?.takhrij.map((t) => t.marker)).toEqual(["١", "٢"]);
    expect(whole?.takhrij[0]?.footnote.text_raw).toBe(FOOT_1);
    expect(whole?.takhrij[0]?.status).toMatchObject({
      label: "rule_extracted",
      kind: "not_takhrij",
    });
    // Yang ditolak (sendiri atau lewat gagasannya) tidak masuk daftar tahan.
    expect(view?.withheld_quotes).toEqual([
      { ord: 3, reason: "stale" },
      { ord: 5, reason: "ayah" },
    ]);
  });

  test("riwayat yang takhrijnya 'tidak ada asalnya' tidak tampil sebagai kutipan (weak_report, X16)", async () => {
    // Teks takhrij BUATAN sementara di catatan kaki (٢); dipulihkan sesudah tes.
    await db
      .prepare("UPDATE passage SET text_raw = ? WHERE id = ?")
      .bind("(٢) حديث تجريبي لا أصل له", PASSAGES.foot2)
      .run();
    onTestFinished(async () => {
      await db
        .prepare("UPDATE passage SET text_raw = ? WHERE id = ?")
        .bind(FOOT_2, PASSAGES.foot2)
        .run();
    });
    const view = await readDigest(db, T_ROOT);
    // Kutipan 2 = BODY_1 utuh, memuat penanda (٢): ditahan; kutipan 1 hanya sampai (١): tetap.
    expect(view?.quotes.map((q) => q.ord)).toEqual([1, 6]);
    expect(view?.withheld_quotes).toEqual([
      { ord: 2, reason: "weak_report" },
      { ord: 3, reason: "stale" },
      { ord: 5, reason: "ayah" },
    ]);
  });

  test("dalil dari jangkar gagasan yang tampil: ayat + teks Kemenag, takhrij + label kode (X16)", async () => {
    const ev = (await readDigest(db, T_ROOT))?.evidence;
    // Rujukan ayat fixture (QS 1:2–3) ada di BODY_2: hanya gagasan 2 yang tampil menjangkarnya.
    expect(
      ev?.ayat.map((a) => [a.point_ords, a.passage_id, a.surah, a.ayah_from, a.ayah_to]),
    ).toEqual([[[2], PASSAGES.body2, 1, 2, 3]]);
    expect(ev?.ayat[0]?.label).toBe("QS Al-Ula [1]: 2–3");
    expect(ev?.ayat[0]?.location.label).toBe("Kitab Uji, j. 1, h. 2");
    // Teks ayat dan terjemahan dari tabel Kemenag (verbatim), bukan teks model.
    expect(ev?.quran?.ayat.map((a) => a.ayah)).toEqual([2, 3]);
    expect(ev?.quran?.ayat[0]?.translation?.text).toBe(QURAN_TRANSLATION_1_2);
    // Penanda (١) tepat sesudah akhir jangkar gagasan 1 milik jangkar itu; (٢) di luar jangkar mana pun.
    expect(ev?.hadith.map((h) => [h.point_ords, h.passage_id, h.marker, h.footnote.id])).toEqual([
      [[1], PASSAGES.body1, "١", PASSAGES.foot1],
    ]);
    expect(ev?.hadith[0]?.footnote.text_raw).toBe(FOOT_1);
    expect(ev?.hadith[0]?.footnote.location.permalink).toMatch(/^\/kitab\/uji\/1\/1#p\d+$/);
    // Catatan kaki buatan bukan teks takhrij: label kode tetap ada, tanpa menebak status.
    expect(ev?.hadith[0]?.status).toMatchObject({
      label: "rule_extracted",
      kind: "not_takhrij",
      weak: false,
      terms: [],
    });
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

describe("daftar tarik Intisari (ADR-127)", () => {
  /** Tarik gagasan 2 Intisari T_ROOT versi '2026-10-24' (fixture di atas). */
  const pull = (createdAt = "2026-10-24"): DigestWithdrawal[] => [
    {
      toc_node_id: T_ROOT,
      lang: "id",
      ord: 2,
      digest_created_at: createdAt,
      digest_prompt_version: "intisari@1",
      verdict: "salah",
      reason: "Alasan uji.",
      reviewer: "tes",
      source: "tes",
      assessed: "2026-10-25",
      date: "2026-10-28",
      audio_r2_key: "uji/id/intisari.mp3",
    },
  ];

  test("readDigest: gagasan tertarik, dalilnya, dan audio tidak dikirim", async () => {
    const view = await readDigest(db, T_ROOT, "id", pull());
    expect(digestView.parse(view)).toEqual(view);
    expect(view?.points.map((p) => p.ord)).toEqual([1]);
    // Ayat fixture hanya dijangkar gagasan 2: ikut hilang.
    expect(view?.evidence.ayat).toEqual([]);
    expect(view?.questions.map((q) => q.point_ord)).toEqual([1]);
    expect(view?.audio).toBeNull();
    const chars = ["Pembuka.", "Abstrak.", "Penutup.", "Gagasan", "Isi satu."]
      .map((t) => t.length)
      .reduce((a, b) => a + b, 0);
    expect(view?.reading_minutes).toBe(readingMinutes(chars));
  });

  test("readDigest: entri untuk versi Intisari lain (dibangun ulang) tidak berlaku", async () => {
    const view = await readDigest(db, T_ROOT, "id", pull("2026-11-01"));
    expect(view?.points.map((p) => p.ord)).toEqual([1, 2]);
    expect(view?.audio).not.toBeNull();
    expect(await readDigest(db, T_ROOT, "id", [])).toEqual(await readDigest(db, T_ROOT, "id"));
  });

  test("kepala: jumlah gagasan, panjang teks, dan audio dikurangi; node lain utuh", async () => {
    const heads = await listDigestHeaders(db, ED, "id");
    const before = heads.find((h) => h.toc_node_id === T_ROOT);
    // Kepala db tidak memeriksa huruf Arab: gagasan 5 ikut dihitung (3), hanya gagasan 2 yang ditarik.
    expect(before).toMatchObject({ points: 3, audio_ms: 95000 });
    const after = await withdrawFromHeaders(db, heads, "id", pull());
    expect(after.find((h) => h.toc_node_id === T_ROOT)).toEqual({
      ...before,
      points: 2,
      chars: (before?.chars ?? 0) - "Anjuran".length - "Isi dua.".length,
      audio_ms: null,
    });
    const others = (rows: typeof heads) => rows.filter((h) => h.toc_node_id !== T_ROOT);
    expect(others(after)).toEqual(others(heads));
    expect(await withdrawFromHeaders(db, heads, "id", pull("2026-11-01"))).toEqual(heads);
    expect(await withdrawFromHeaders(db, heads, "en", pull())).toEqual(heads);
  });
});

describe("markerInAnchor (X16)", () => {
  const text = "كلام أول. (١) كلام ثان (٢) وآخر";
  const m1 = { char_start: text.indexOf("(١)"), char_end: text.indexOf("(١)") + 3 };
  const m2 = { char_start: text.indexOf("(٢)"), char_end: text.indexOf("(٢)") + 3 };
  const span = (a: string, b: string) => ({
    char_start: text.indexOf(a),
    char_end: text.indexOf(b),
  });

  test("penanda di dalam jangkar milik jangkar itu", () => {
    expect(markerInAnchor(text, { char_start: 0, char_end: text.length }, m2)).toBe(true);
  });

  test("penanda di awal jangkar menutup kalimat sebelumnya, bukan milik jangkar", () => {
    expect(markerInAnchor(text, span("(١)", "وآخر"), m1)).toBe(false);
    expect(markerInAnchor(text, span("(١)", "وآخر"), m2)).toBe(true);
  });

  test("penanda tepat sesudah akhir jangkar (hanya spasi/tanda baca di antaranya) ikut", () => {
    expect(markerInAnchor(text, { char_start: 0, char_end: m1.char_start - 1 }, m1)).toBe(true);
    // Ada kata di antaranya: bukan milik jangkar.
    expect(markerInAnchor(text, { char_start: 0, char_end: 4 }, m1)).toBe(false);
  });
});

describe("readingMinutes", () => {
  test("dibulatkan ke atas, minimal 1", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1000)).toBe(1);
    expect(readingMinutes(1001)).toBe(2);
  });
});
