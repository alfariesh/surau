// Query revisi terjemahan (X08, ADR-081; migrasi app 0006). Setiap simpanan menambah baris; baris
// lama tidak pernah ditimpa selain status 'active' → 'superseded'. Simpan = satu batch D1 (transaksi):
// revisi aktif yang dilihat editor digantikan dan revisi baru disisipkan, atau tidak sama sekali.
import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import type { D1Db } from "../d1.ts";
import { z } from "zod";

import {
  translationRevisionRow,
  translationRevisionWrite,
} from "../schema/translation-revision.ts";
import type {
  TranslationRevisionRow,
  TranslationRevisionWrite,
} from "../schema/translation-revision.ts";
import { allRows } from "./rows.ts";

const COLS =
  "id, passage_id, lang, kind, text, reason, restores_id, supersedes_id, base_sha256, draft_sha256, source_sha256, author_key, author_name, author_short, author_role, author_public, status, corpus_version, created_at";

export type SaveTranslationRevisionResult =
  | { ok: true; id: number }
  | {
      ok: false;
      /** `conflict` = revisi aktif sudah bukan yang dilihat editor; `limit` = batas harian habis. */
      reason: "conflict" | "limit";
    };

export interface SaveTranslationRevisionOptions {
  /** ID revisi aktif yang dilihat editor (`null` = belum ada revisi aktif, teks korpus). */
  expectedActiveId: number | null;
  /** Batas simpanan penulis ini sejak `dayStart` (`null` = tanpa batas, mis. pembatalan pemilik). */
  dailyLimit: number | null;
  /** Awal hari batas (ISO). */
  dayStart: string;
}

const COUNT_SINCE =
  "(SELECT COUNT(*) FROM translation_revision WHERE author_key = ?5 AND created_at >= ?6)";

/**
 * Simpan revisi baru sebagai revisi aktif paragraf. Atomik: revisi aktif yang diharapkan diubah
 * menjadi 'superseded' dan revisi baru disisipkan dalam satu transaksi; bila revisi aktif sudah
 * berbeda (simpanan lain lebih dulu) atau batas harian habis, tidak ada yang berubah.
 */
export async function saveTranslationRevision(
  db: D1Db,
  input: TranslationRevisionWrite,
  opts: SaveTranslationRevisionOptions,
): Promise<SaveTranslationRevisionResult> {
  const r = translationRevisionWrite.parse(input);
  const limitOk = `(?4 IS NULL OR ${COUNT_SINCE} < ?4)`;
  const shared = [
    r.passage_id,
    r.lang,
    opts.expectedActiveId,
    opts.dailyLimit,
    r.author_key,
    opts.dayStart,
  ];
  const [, inserted] = await db.batch([
    db
      .prepare(
        `UPDATE translation_revision SET status = 'superseded'
         WHERE passage_id = ?1 AND lang = ?2 AND status = 'active' AND id = ?3 AND ${limitOk}`,
      )
      .bind(...shared),
    db
      .prepare(
        `INSERT INTO translation_revision (passage_id, lang, kind, text, reason, restores_id,
           supersedes_id, base_sha256, draft_sha256, source_sha256, author_key, author_name,
           author_short, author_role, author_public, status, corpus_version, created_at)
         SELECT ?1, ?2, ?7, ?8, ?9, ?10, ?3, ?11, ?12, ?13, ?5, ?14, ?15, ?16, ?17, 'active', ?18, ?19
         WHERE NOT EXISTS (SELECT 1 FROM translation_revision
                           WHERE passage_id = ?1 AND lang = ?2 AND status = 'active')
           AND ${limitOk}`,
      )
      .bind(
        ...shared,
        r.kind,
        r.text,
        r.reason,
        r.restores_id,
        r.base_sha256,
        r.draft_sha256,
        r.source_sha256,
        r.author_name,
        r.author_short,
        r.author_role,
        r.author_public,
        r.corpus_version,
        r.created_at,
      ),
  ]);
  if (inserted?.meta?.changes === 1) {
    const id = z.number().int().positive().parse(inserted.meta.last_row_id);
    return { ok: true, id };
  }
  if (
    opts.dailyLimit !== null &&
    (await countTranslationRevisionsSince(db, r.author_key, opts.dayStart)) >= opts.dailyLimit
  )
    return { ok: false, reason: "limit" };
  return { ok: false, reason: "conflict" };
}

/** Jumlah simpanan seorang penulis sejak `since` (ISO), semua jenis. */
export async function countTranslationRevisionsSince(
  db: D1Db,
  authorKey: string,
  since: string,
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM translation_revision WHERE author_key = ?1 AND created_at >= ?2",
    )
    .bind(authorKey, since)
    .first();
  return z.strictObject({ n: z.number().int().nonnegative() }).parse(row).n;
}

/** Revisi aktif untuk sekumpulan paragraf (≤99 ID per kueri, satu batch). */
export async function getActiveTranslationRevisions(
  db: D1Db,
  passageIds: readonly number[],
): Promise<TranslationRevisionRow[]> {
  const unique = [...new Set(passageIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const results = await db.batch(
    chunk(unique, D1_MAX_PARAMS - 1).map((part) =>
      db
        .prepare(
          `SELECT ${COLS} FROM translation_revision
           WHERE status = 'active' AND passage_id IN (${placeholders(part.length)})
           ORDER BY passage_id`,
        )
        .bind(...part),
    ),
  );
  return results.flatMap((r) => r.results.map((row) => translationRevisionRow.parse(row)));
}

/** Semua revisi aktif (ekspor ke korpus, status antrean). */
export function listActiveTranslationRevisions(db: D1Db): Promise<TranslationRevisionRow[]> {
  return allRows(
    db.prepare(
      `SELECT ${COLS} FROM translation_revision WHERE status = 'active' ORDER BY passage_id`,
    ),
    translationRevisionRow,
  );
}

/** Riwayat satu paragraf, terbaru dulu (paling banyak 200 baris). */
export function getTranslationRevisionHistory(
  db: D1Db,
  passageId: number,
): Promise<TranslationRevisionRow[]> {
  return allRows(
    db
      .prepare(
        `SELECT ${COLS} FROM translation_revision WHERE passage_id = ?1 ORDER BY id DESC LIMIT 200`,
      )
      .bind(passageId),
    translationRevisionRow,
  );
}

/** Revisi menurut ID (≤100 ID per kueri, satu batch). */
export async function getTranslationRevisionsByIds(
  db: D1Db,
  ids: readonly number[],
): Promise<TranslationRevisionRow[]> {
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const results = await db.batch(
    chunk(unique).map((part) =>
      db
        .prepare(
          `SELECT ${COLS} FROM translation_revision WHERE id IN (${placeholders(part.length)})`,
        )
        .bind(...part),
    ),
  );
  return results.flatMap((r) => r.results.map((row) => translationRevisionRow.parse(row)));
}

/** Revisi terbaru semua editor (/admin), terbaru dulu; `beforeId` = halaman berikutnya. */
export function listRecentTranslationRevisions(
  db: D1Db,
  limit: number,
  beforeId: number | null = null,
): Promise<TranslationRevisionRow[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("limit 1..100");
  return allRows(
    db
      .prepare(
        `SELECT ${COLS} FROM translation_revision
         WHERE ?1 IS NULL OR id < ?1 ORDER BY id DESC LIMIT ?2`,
      )
      .bind(beforeId, limit),
    translationRevisionRow,
  );
}

/** Revisi seorang penulis sejak `since` (ISO), urut ID (batalkan massal di /admin). */
export function listTranslationRevisionsByAuthorSince(
  db: D1Db,
  authorKey: string,
  since: string,
): Promise<TranslationRevisionRow[]> {
  return allRows(
    db
      .prepare(
        `SELECT ${COLS} FROM translation_revision
         WHERE author_key = ?1 AND created_at >= ?2 ORDER BY id`,
      )
      .bind(authorKey, since),
    translationRevisionRow,
  );
}

const editorSeenRow = z.strictObject({
  author_key: z.string().regex(/^[a-f0-9]{64}$/u),
  author_name: z.string(),
  n: z.number().int().positive(),
  last_at: z.string(),
});
export type TranslationEditorSeen = z.infer<typeof editorSeenRow>;

/** Editor yang pernah menyimpan revisi (bukan pembatalan pemilik), untuk pilihan batalkan massal. */
export function listTranslationRevisionAuthors(db: D1Db): Promise<TranslationEditorSeen[]> {
  return allRows(
    db.prepare(
      `SELECT author_key, MAX(author_name) AS author_name, COUNT(*) AS n, MAX(created_at) AS last_at
       FROM translation_revision WHERE author_role <> 'admin'
       GROUP BY author_key ORDER BY last_at DESC LIMIT 50`,
    ),
    editorSeenRow,
  );
}

const countRow = z.strictObject({ passage_id: z.number().int().positive(), n: z.number().int() });

export interface TranslationQueueSignals {
  /** Laporan pembaca jenis terjemahan yang belum selesai, per paragraf. */
  reports: Map<number, number>;
  /**
   * Seberapa sering paragraf dikutip Maknaz: jawaban eval PUBLIK di `answer_log` (bukan soal
   * privat/holdout, bukan contoh `agent-draft`) satu per jawaban, jawaban `answer_cache` satu + jumlah
   * sajian ulangnya. Hanya baris yang belum kedaluwarsa; tanpa teks pertanyaan.
   */
  cited: Map<number, number>;
}

/** Sinyal antrean koreksi dari DB app dalam satu batch (X08). */
export async function translationQueueSignals(
  db: D1Db,
  now: string,
): Promise<TranslationQueueSignals> {
  const [reports, cited] = await db.batch([
    db.prepare(
      `SELECT passage_id, COUNT(*) AS n FROM feedback
       WHERE kind = 'translation' AND status IN ('new', 'triaged') AND passage_id > 0
       GROUP BY passage_id`,
    ),
    db
      .prepare(
        `SELECT pid AS passage_id, SUM(w) AS n FROM (
           SELECT DISTINCT 'l:' || a.id AS src, json_extract(c.value, '$.passage_id') AS pid, 1 AS w
           FROM answer_log a, json_each(a.answer_json, '$.citations') c
           WHERE a.expires_at > ?1 AND a.private = 0 AND a.model <> 'agent-draft'
           UNION
           SELECT DISTINCT 'c:' || k.key, json_extract(c.value, '$.passage_id'), 1 + k.hits
           FROM answer_cache k, json_each(k.result_json, '$.citations') c
           WHERE k.expires_at > ?1
         ) WHERE typeof(pid) = 'integer' AND pid > 0 GROUP BY pid`,
      )
      .bind(now),
  ]);
  const toMap = (rows: unknown[] | undefined) =>
    new Map((rows ?? []).map((r) => countRow.parse(r)).map((r) => [r.passage_id, r.n]));
  return { reports: toMap(reports?.results), cited: toMap(cited?.results) };
}
