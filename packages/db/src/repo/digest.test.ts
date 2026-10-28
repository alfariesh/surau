import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  AYAH_REF,
  BODY_1,
  BODY_2,
  ED,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_ROOT,
  seedCorpus,
} from "../../test/fixture.ts";
import type { D1Db } from "../d1.ts";
import { pageId, passageId } from "../ids.ts";
import {
  getDigest,
  getDigestHeaders,
  getDigestHeadersOnPath,
  getDigestPointSizes,
  listDigestHeaders,
} from "./digest.ts";

const db = env.CORPUS;
const SHA = "a".repeat(64);
const AI = "'model-uji', 'intisari@1', '2026-10-24'";
/** Paragraf buatan di edisi lain (ED + 1), untuk CHECK edisi jangkar/kutipan. */
const OTHER_PASSAGE = passageId(ED + 1, 1);

// Teks AI BUATAN (bukan isi kitab). Kutipan menunjuk rentang fixture, bukan teks Arab ketikan.
beforeAll(async () => {
  await seedCorpus(db);
  const q1 = { start: BODY_1.indexOf("نص"), end: BODY_1.indexOf(" (١)") };
  await db.batch([
    db
      .prepare(
        "INSERT INTO page (id, edition_id, seq, juz, page_no, source_page_id) VALUES (?, ?, 1, 1, 1, NULL)",
      )
      .bind(pageId(ED + 1, 1), ED + 1),
    db
      .prepare(
        "INSERT INTO passage (id, edition_id, page_id, toc_node_id, kind, ord, text_raw) VALUES (?, ?, ?, NULL, 'body', 1, 'نص تجريبي')",
      )
      .bind(OTHER_PASSAGE, ED + 1, pageId(ED + 1, 1)),
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
                (?1, 'id', 4, 'idea', 'author', 'Tanpa jangkar', 'Isi empat.', 'ai_generated'),
                (?2, 'id', 1, 'idea', 'author', 'Pasal', 'Isi pasal.', 'ai_generated')`,
      )
      .bind(T_ROOT, T_CHILD_A),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?1, 'id', 1, 2, ?3, 0, 3), (?1, 'id', 1, 1, ?2, 0, 4), (?1, 'id', 2, 1, ?3, 4, 6),
                (?1, 'id', 3, 1, ?3, 0, 2), (?4, 'id', 1, 1, ?3, 0, 2)`,
      )
      .bind(T_ROOT, PASSAGES.body1, PASSAGES.body2, T_CHILD_A),
    db
      .prepare(
        `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
           char_end, raw_sha256, kind, translation_source, translation, model, prompt_version,
           created_at)
         VALUES (?1, 'id', 2, NULL, ?2, 0, ?3, ?4, 'text', 'passage', NULL, NULL, NULL, NULL),
                (?1, 'id', 1, 1, ?5, ?6, ?7, ?4, 'report', 'digest', 'Terjemahan kutipan uji.',
                 'model-kutipan', 'intisari-bab@1', '2026-10-23')`,
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
           'Narator Uji', 'eleven_v4', ?2, 1, 'lx1', '[{"point_ord":1,"start_ms":0}]', '2026-10-24'),
                (?1, 'id', 'human', 'uji/id/1-manusia.mp3', 'audio/mpeg', 1000, 58000, 'manusia',
           'n1', 'Narator Manusia', NULL, ?2, 1, 'lx1', '[]', '2026-10-24')`,
      )
      .bind(T_ROOT, SHA),
  ]);
});

describe("getDigest (X15, skema 9)", () => {
  test("semua baris satu Intisari urut tampil, dengan halaman cetak, paragraf kutipan, dan ayat", async () => {
    const rows = await getDigest(db, T_ROOT, "id");
    expect(rows?.digest).toMatchObject({ tier: "book", basis: "children", closing: "Penutup." });
    expect(rows?.points.map((p) => p.ord)).toEqual([1, 2, 3, 4]);
    expect(rows?.points[0]).toMatchObject({ kind: "idea", stance: "refuted" });
    expect(rows?.anchors.map((a) => [a.point_ord, a.seq, a.passage_id])).toEqual([
      [1, 1, PASSAGES.body1],
      [1, 2, PASSAGES.body2],
      [2, 1, PASSAGES.body2],
      [3, 1, PASSAGES.body2],
    ]);
    expect(rows?.anchors[0]).toMatchObject({ juz: 1, page_no: 1 });
    expect(rows?.quotes.map((q) => q.ord)).toEqual([1, 2]);
    expect(rows?.quotes[0]).toMatchObject({
      passage_text_raw: BODY_1,
      juz: 1,
      page_no: 1,
      kind: "report",
      model: "model-kutipan",
      prompt_version: "intisari-bab@1",
      review_status: "ai_generated",
    });
    expect(rows?.quotes[1]).toMatchObject({
      passage_text_raw: BODY_2,
      page_no: 2,
      translation: null,
      model: null,
    });
    // Rujukan ayat fixture ada di BODY_2 (paragraf kutipan 2), bukan di BODY_1.
    expect(rows?.ayahSpans).toEqual([
      {
        passage_id: AYAH_REF.passage_id,
        char_start: AYAH_REF.char_start,
        char_end: AYAH_REF.char_end,
      },
    ]);
    expect(rows?.questions[0]).toMatchObject({ point_ord: 2, review_status: "ai_generated" });
    expect(rows?.terms.map((t) => t.term_key)).toEqual(["riya", "ikhlas"]);
    expect(rows?.audio.map((a) => a.voice_kind)).toEqual(["human", "ai"]);
  });

  test("node tanpa Intisari, atau bahasa lain → null", async () => {
    expect(await getDigest(db, T_ROOT, "en")).toBeNull();
    expect(await getDigest(db, T_ROOT + 98, "id")).toBeNull();
  });

  test("CHECK menolak data yang melanggar kontrak", async () => {
    const quote = (source: string, translation: string | null, model: string | null) =>
      db
        .prepare(
          `INSERT INTO digest_quote (toc_node_id, lang, ord, passage_id, char_start, char_end,
             raw_sha256, kind, translation_source, translation, model, prompt_version, created_at)
           VALUES (?, 'id', 3, ?, 0, 2, ?, 'text', ?, ?, ?, ?, ?)`,
        )
        .bind(
          T_ROOT,
          PASSAGES.body1,
          SHA,
          source,
          translation,
          model,
          model === null ? null : "p@1",
          model === null ? null : "2026-10-24",
        );
    // Terjemahan digest tanpa terjemahan / tanpa asal model; sumber passage dengan asal model.
    await expect(quote("digest", null, null).run()).rejects.toThrow(/CHECK constraint failed/);
    await expect(quote("digest", "Teks.", null).run()).rejects.toThrow(/CHECK constraint failed/);
    await expect(quote("passage", null, "m").run()).rejects.toThrow(/CHECK constraint failed/);
    const anchor = (passage: number, start: number, end: number) =>
      db
        .prepare(
          `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
           VALUES (?, 'id', 2, 2, ?, ?, ?)`,
        )
        .bind(T_ROOT, passage, start, end);
    await expect(anchor(PASSAGES.body1, 5, 5).run()).rejects.toThrow(/CHECK constraint failed/);
    // Paragraf edisi lain: permalink "Dasar teks" akan salah edisi.
    await expect(anchor(OTHER_PASSAGE, 0, 2).run()).rejects.toThrow(/CHECK constraint failed/);
    // Intisari Kitab tanpa pembuka/penutup.
    const book = db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, abstract, source_sha256, model,
           prompt_version, created_at)
         VALUES (?, 'en', 'book', 'children', 'Abstract.', ?, ${AI})`,
      )
      .bind(T_ROOT, SHA);
    await expect(book.run()).rejects.toThrow(/CHECK constraint failed/);
    const audio = db
      .prepare(
        `INSERT INTO audio_track (toc_node_id, lang, voice_kind, r2_key, mime, bytes, duration_ms,
           provider, voice_id, voice_name, model, script_sha256, script_version, lexicon_version,
           chapters_json, created_at)
         VALUES (?, 'id', 'human', 'uji/id/2.mp3', 'audio/mpeg', 1, 1, 'manusia', 'n', 'N',
           'eleven_v4', ?, 1, 'lx1', '[]', '2026-10-24')`,
      )
      .bind(T_CHILD_A, SHA);
    await expect(audio.run()).rejects.toThrow(/CHECK constraint failed/);
  });
});

describe("kepala Intisari", () => {
  test("listDigestHeaders: tanpa yang ditolak/tanpa jangkar; panjang teks; audio narator manusia dulu", async () => {
    const heads = await listDigestHeaders(db, ED, "id");
    expect(heads.map((h) => h.toc_node_id)).toEqual([T_ROOT, T_CHILD_A]);
    const root = heads[0];
    // Gagasan 3 ditolak, gagasan 4 tanpa jangkar: tidak dihitung.
    expect(root).toMatchObject({ tier: "book", points: 2, audio_ms: 58000 });
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

  test("getDigestPointSizes (ADR-127): panjang judul + isi gagasan yang tampil saja", async () => {
    const sizes = await getDigestPointSizes(db, [T_ROOT, T_CHILD_B, T_ROOT + 98], "id");
    // Gagasan 3 ditolak, gagasan 4 tanpa jangkar, Intisari T_CHILD_B ditolak: tidak ikut.
    expect(sizes).toEqual([
      { toc_node_id: T_ROOT, ord: 1, chars: "Gagasan".length + "Isi satu.".length },
      { toc_node_id: T_ROOT, ord: 2, chars: "Anjuran".length + "Isi dua.".length },
    ]);
    expect(await getDigestPointSizes(db, [], "id")).toEqual([]);
    expect(await getDigestPointSizes(db, [T_ROOT], "en")).toEqual([]);
  });

  test("getDigestHeaders: hanya node yang diminta; edisi lain kosong", async () => {
    const heads = await getDigestHeaders(db, [T_CHILD_A, T_CHILD_B, T_ROOT + 98], "id");
    expect(heads.map((h) => h.toc_node_id)).toEqual([T_CHILD_A]);
    expect(await getDigestHeaders(db, [], "id")).toEqual([]);
    expect(await listDigestHeaders(db, ED + 1, "id")).toEqual([]);
  });

  test("getDigestHeadersOnPath (X16): node sendiri lalu leluhur, terdekat dulu; yang ditolak dilewati", async () => {
    const path = async (id: number) =>
      (await getDigestHeadersOnPath(db, id, "id")).map((h) => h.toc_node_id);
    expect(await path(T_CHILD_A)).toEqual([T_CHILD_A, T_ROOT]);
    // Intisari T_CHILD_B ditolak peninjau: yang terdekat = Intisari Kitab induknya.
    expect(await path(T_CHILD_B)).toEqual([T_ROOT]);
    expect(await path(T_ROOT)).toEqual([T_ROOT]);
    expect(await getDigestHeadersOnPath(db, T_ROOT, "en")).toEqual([]);
  });
});

describe("korpus lama", () => {
  test("skema < 9 → null/kosong; galat lain di skema 9 diteruskan", async () => {
    const fake = (schema: number): D1Db => ({
      prepare(sql: string) {
        const stmt = {
          bind: () => stmt,
          all: async () => {
            if (sql.includes("FROM meta"))
              return { results: [{ key: "schema_version", value: String(schema) }] };
            throw new Error("D1_ERROR: no such table: digest");
          },
          first: async () => null,
        };
        return stmt;
      },
      batch: async () => {
        throw new Error("D1_ERROR: no such table: digest");
      },
    });
    expect(await getDigest(fake(8), T_ROOT, "id")).toBeNull();
    expect(await listDigestHeaders(fake(7), ED, "id")).toEqual([]);
    expect(await getDigestHeaders(fake(8), [T_ROOT], "id")).toEqual([]);
    expect(await getDigestHeadersOnPath(fake(8), T_ROOT, "id")).toEqual([]);
    expect(await getDigestPointSizes(fake(8), [T_ROOT], "id")).toEqual([]);
    await expect(getDigest(fake(9), T_ROOT, "id")).rejects.toThrow(/no such table/);
    await expect(listDigestHeaders(fake(9), ED, "id")).rejects.toThrow(/no such table/);
  });
});
