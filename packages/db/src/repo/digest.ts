// Intisari (X15, ADR-097): ringkasan belajar berlapis per bagian daftar isi. Tabelnya baru ada sejak
// skema 9; di korpus lama fungsi di sini mengembalikan null/kosong, bukan "no such table".
import { z } from "zod";

import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import type { D1Db } from "../d1.ts";
import { tocNodeIdRange } from "../ids.ts";
import {
  DIGEST_SCHEMA_VERSION,
  audioTrackRow,
  digestAnchorRow,
  digestPointRow,
  digestQuestionRow,
  digestQuoteRow,
  digestRow,
  digestTier,
  glossaryTermRow,
  reviewStatus,
} from "../schema/corpus.ts";
import type {
  AudioTrackRow,
  DigestPointRow,
  DigestQuestionRow,
  DigestRow,
  GlossaryTermRow,
} from "../schema/corpus.ts";
import { getCorpusMeta } from "./corpus.ts";

const DIGEST_COLS = `toc_node_id, lang, tier, basis, opening, abstract, closing, source_sha256,
  model, prompt_version, created_at, review_status`;
const ANCHOR_COLS =
  "a.toc_node_id, a.lang, a.point_ord, a.seq, a.passage_id, a.char_start, a.char_end";
const QUOTE_COLS = `q.toc_node_id, q.lang, q.ord, q.point_ord, q.passage_id, q.char_start,
  q.char_end, q.raw_sha256, q.kind, q.translation_source, q.translation, q.model, q.prompt_version,
  q.created_at, q.review_status`;
const AUDIO_COLS = `toc_node_id, lang, voice_kind, r2_key, mime, bytes, duration_ms, provider,
  voice_id, voice_name, model, script_sha256, script_version, lexicon_version, chapters_json,
  alignment_key, created_at`;

/** Letak cetak paragraf (untuk permalink jangkar dan kutipan). */
const passagePage = { juz: z.number().int().positive(), page_no: z.number().int().nonnegative() };

/** Jangkar gagasan + halaman cetak paragrafnya. */
export const digestAnchorWithPageRow = digestAnchorRow.extend(passagePage);
export type DigestAnchorWithPageRow = z.infer<typeof digestAnchorWithPageRow>;

/**
 * Kutipan + teks mentah paragraf UTUH-nya + halaman cetak. Kode (`readDigest`) yang menyalin rentang
 * kutipan dari `passage_text_raw` sesudah memeriksa sidiknya; jangan tampilkan field ini langsung.
 */
export const digestQuoteWithPassageRow = digestQuoteRow.extend({
  ...passagePage,
  passage_text_raw: z.string(),
});
export type DigestQuoteWithPassageRow = z.infer<typeof digestQuoteWithPassageRow>;

/** Rentang rujukan ayat di paragraf kutipan (kutipan yang menyentuhnya tidak ditampilkan). */
export const ayahSpanRow = z.strictObject({
  passage_id: z.number().int().positive(),
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().nonnegative(),
});
export type AyahSpanRow = z.infer<typeof ayahSpanRow>;

/** Semua baris satu Intisari, urut tampil. */
export interface DigestRows {
  digest: DigestRow;
  points: DigestPointRow[];
  anchors: DigestAnchorWithPageRow[];
  quotes: DigestQuoteWithPassageRow[];
  /** Rujukan ayat (`passage_ayah_ref`) di paragraf-paragraf kutipan. */
  ayahSpans: AyahSpanRow[];
  questions: DigestQuestionRow[];
  /** Istilah urut `digest_term.ord`. */
  terms: GlossaryTermRow[];
  /** Narator manusia dulu, lalu suara AI. */
  audio: AudioTrackRow[];
}

/** `null` bila skema korpus belum punya Intisari (galat lain dilempar ulang). */
async function unlessOldSchema<T>(db: D1Db, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    const meta = await getCorpusMeta(db).catch(() => null);
    if (meta !== null && meta.schema_version < DIGEST_SCHEMA_VERSION) return null;
    throw error;
  }
}

/**
 * Seluruh Intisari satu node daftar isi dalam satu bahasa (satu batch D1, delapan kueri), termasuk
 * yang berstatus `rejected`: pemanggil (core) yang menyaring. `null` bila tidak ada atau skema < 9.
 */
export async function getDigest(
  db: D1Db,
  tocNodeId: number,
  lang: string,
): Promise<DigestRows | null> {
  const rows = await unlessOldSchema(db, async () => {
    const [digest, points, anchors, quotes, ayahSpans, questions, terms, audio] = await db.batch([
      db
        .prepare(`SELECT ${DIGEST_COLS} FROM digest WHERE toc_node_id = ?1 AND lang = ?2`)
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT toc_node_id, lang, ord, kind, stance, title, body, review_status FROM digest_point
           WHERE toc_node_id = ?1 AND lang = ?2 ORDER BY ord`,
        )
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT ${ANCHOR_COLS}, pg.juz, pg.page_no FROM digest_anchor a
           JOIN passage p ON p.id = a.passage_id JOIN page pg ON pg.id = p.page_id
           WHERE a.toc_node_id = ?1 AND a.lang = ?2 ORDER BY a.point_ord, a.seq`,
        )
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT ${QUOTE_COLS}, p.text_raw AS passage_text_raw, pg.juz, pg.page_no
           FROM digest_quote q
           JOIN passage p ON p.id = q.passage_id JOIN page pg ON pg.id = p.page_id
           WHERE q.toc_node_id = ?1 AND q.lang = ?2 ORDER BY q.ord`,
        )
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT r.passage_id, r.char_start, r.char_end FROM passage_ayah_ref r
           WHERE r.passage_id IN (SELECT passage_id FROM digest_quote
             WHERE toc_node_id = ?1 AND lang = ?2)
           ORDER BY r.passage_id, r.char_start`,
        )
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT toc_node_id, lang, ord, point_ord, text, review_status FROM digest_question
           WHERE toc_node_id = ?1 AND lang = ?2 ORDER BY ord`,
        )
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT g.term_key, g.lang, g.label, g.gloss, g.model, g.prompt_version, g.created_at,
             g.review_status
           FROM digest_term t JOIN glossary_term g ON g.term_key = t.term_key AND g.lang = t.lang
           WHERE t.toc_node_id = ?1 AND t.lang = ?2 ORDER BY t.ord`,
        )
        .bind(tocNodeId, lang),
      db
        .prepare(
          `SELECT ${AUDIO_COLS} FROM audio_track WHERE toc_node_id = ?1 AND lang = ?2
           ORDER BY voice_kind = 'human' DESC`,
        )
        .bind(tocNodeId, lang),
    ]);
    const head = digest?.results[0];
    if (head === undefined) return null;
    return {
      digest: digestRow.parse(head),
      points: (points?.results ?? []).map((r) => digestPointRow.parse(r)),
      anchors: (anchors?.results ?? []).map((r) => digestAnchorWithPageRow.parse(r)),
      quotes: (quotes?.results ?? []).map((r) => digestQuoteWithPassageRow.parse(r)),
      ayahSpans: (ayahSpans?.results ?? []).map((r) => ayahSpanRow.parse(r)),
      questions: (questions?.results ?? []).map((r) => digestQuestionRow.parse(r)),
      terms: (terms?.results ?? []).map((r) => glossaryTermRow.parse(r)),
      audio: (audio?.results ?? []).map((r) => audioTrackRow.parse(r)),
    };
  });
  return rows ?? null;
}

/**
 * Ringkasan satu Intisari untuk lencana daftar isi, kartu pembaca, dan halaman hub: jumlah gagasan
 * dan panjang teks AI (perkiraan waktu baca dihitung core), serta durasi audio (narator manusia
 * dulu, seperti `readDigest`). Intisari yang `rejected`, dan gagasan yang `rejected` atau tanpa
 * jangkar, tidak dihitung (sama dengan yang tampil di `readDigest`).
 */
export const digestHeaderRow = z.strictObject({
  toc_node_id: z.number().int().positive(),
  tier: digestTier,
  review_status: reviewStatus,
  /** Waktu bangun Intisari (penjaga daftar tarik core, ADR-127). */
  created_at: z.string(),
  points: z.number().int().nonnegative(),
  chars: z.number().int().nonnegative(),
  audio_ms: z.number().int().positive().nullable(),
});
export type DigestHeaderRow = z.infer<typeof digestHeaderRow>;

/** Gagasan yang tampil: tidak ditolak dan punya minimal satu jangkar. */
const SHOWN_POINT = `p.toc_node_id = d.toc_node_id AND p.lang = d.lang
  AND p.review_status <> 'rejected'
  AND EXISTS (SELECT 1 FROM digest_anchor a WHERE a.toc_node_id = p.toc_node_id
    AND a.lang = p.lang AND a.point_ord = p.ord)`;

const HEADER_SELECT = `SELECT d.toc_node_id, d.tier, d.review_status, d.created_at,
  (SELECT count(*) FROM digest_point p WHERE ${SHOWN_POINT}) AS points,
  length(coalesce(d.opening, '')) + length(d.abstract) + length(coalesce(d.closing, ''))
    + coalesce((SELECT sum(length(p.title) + length(p.body)) FROM digest_point p
        WHERE ${SHOWN_POINT}), 0) AS chars,
  (SELECT a.duration_ms FROM audio_track a WHERE a.toc_node_id = d.toc_node_id
     AND a.lang = d.lang ORDER BY a.voice_kind = 'human' DESC LIMIT 1) AS audio_ms
FROM digest d`;

/** Kepala Intisari seluruh edisi, urut `toc_node_id` (rentang ID edisi, ADR-005). */
export async function listDigestHeaders(
  db: D1Db,
  editionId: number,
  lang: string,
): Promise<DigestHeaderRow[]> {
  const range = tocNodeIdRange(editionId);
  const rows = await unlessOldSchema(db, async () => {
    const { results } = await db
      .prepare(
        `${HEADER_SELECT} WHERE d.lang = ?1 AND d.toc_node_id BETWEEN ?2 AND ?3
           AND d.review_status <> 'rejected' ORDER BY d.toc_node_id`,
      )
      .bind(lang, range.min, range.max)
      .all();
    return results.map((r) => digestHeaderRow.parse(r));
  });
  return rows ?? [];
}

/** Kepala Intisari sejumlah node (mis. bagian yang mulai di satu halaman baca), urut `toc_node_id`. */
export async function getDigestHeaders(
  db: D1Db,
  tocNodeIds: readonly number[],
  lang: string,
): Promise<DigestHeaderRow[]> {
  const unique = [...new Set(tocNodeIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const rows = await unlessOldSchema(db, async () => {
    const stmts = chunk(unique, D1_MAX_PARAMS - 1).map((ids) =>
      db
        .prepare(
          `${HEADER_SELECT} WHERE d.lang = ? AND d.toc_node_id IN (${placeholders(ids.length)})
             AND d.review_status <> 'rejected' ORDER BY d.toc_node_id`,
        )
        .bind(lang, ...ids),
    );
    const results = await db.batch(stmts);
    return results.flatMap((r) => r.results.map((row) => digestHeaderRow.parse(row)));
  });
  return rows ?? [];
}

/**
 * Kepala Intisari node ini dan leluhurnya, terdekat dulu (X16: menu ⋮ pembaca "Buka Intisari"
 * menunjuk Intisari terdekat dari bagian yang sedang dibaca). Satu kueri rekursif ke atas pohon;
 * kosong bila tidak ada atau skema < 9.
 */
export async function getDigestHeadersOnPath(
  db: D1Db,
  tocNodeId: number,
  lang: string,
): Promise<DigestHeaderRow[]> {
  const rows = await unlessOldSchema(db, async () => {
    const { results } = await db
      .prepare(
        `WITH RECURSIVE up(id, parent_id, depth) AS (
           SELECT id, parent_id, 0 FROM toc_node WHERE id = ?2
           UNION ALL
           SELECT t.id, t.parent_id, up.depth + 1 FROM toc_node t JOIN up ON t.id = up.parent_id
         )
         ${HEADER_SELECT} JOIN up ON up.id = d.toc_node_id
         WHERE d.lang = ?1 AND d.review_status <> 'rejected' ORDER BY up.depth`,
      )
      .bind(lang, tocNodeId)
      .all();
    return results.map((r) => digestHeaderRow.parse(r));
  });
  return rows ?? [];
}

/** Panjang teks satu gagasan yang tampil (judul + isi), untuk kepala yang disesuaikan core. */
export const digestPointSizeRow = z.strictObject({
  toc_node_id: z.number().int().positive(),
  ord: z.number().int().positive(),
  chars: z.number().int().nonnegative(),
});
export type DigestPointSizeRow = z.infer<typeof digestPointSizeRow>;

/**
 * Panjang judul + isi gagasan yang tampil (tidak ditolak, berjangkar; sama dengan kepala) di
 * sejumlah node, urut node lalu `ord`. Dipakai core untuk mengurangi gagasan yang ditarik dari kepala
 * Intisari (ADR-127); kosong bila skema < 9.
 */
export async function getDigestPointSizes(
  db: D1Db,
  tocNodeIds: readonly number[],
  lang: string,
): Promise<DigestPointSizeRow[]> {
  const unique = [...new Set(tocNodeIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const rows = await unlessOldSchema(db, async () => {
    const stmts = chunk(unique, D1_MAX_PARAMS - 1).map((ids) =>
      db
        .prepare(
          `SELECT p.toc_node_id, p.ord, length(p.title) + length(p.body) AS chars
           FROM digest_point p JOIN digest d ON d.toc_node_id = p.toc_node_id AND d.lang = p.lang
           WHERE d.lang = ? AND d.toc_node_id IN (${placeholders(ids.length)}) AND ${SHOWN_POINT}
           ORDER BY p.toc_node_id, p.ord`,
        )
        .bind(lang, ...ids),
    );
    const results = await db.batch(stmts);
    return results.flatMap((r) => r.results.map((row) => digestPointSizeRow.parse(row)));
  });
  return rows ?? [];
}
