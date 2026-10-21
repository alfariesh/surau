// Query baca dasar DB korpus. Semua fungsi menerima D1 sebagai parameter (tanpa cloudflare:*),
// memakai prepare().bind() (tanpa interpolasi nilai ke SQL), dan mem-parse baris dengan Zod.
// Pencarian FTS ada di search.ts (S11). Teks yang dikembalikan adalah `text_raw` dari DB, apa adanya.
import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import { passageIdRange } from "../ids.ts";
import type { D1Db } from "../d1.ts";
import { z } from "zod";

import {
  authorRow,
  corpusMeta,
  editionRow,
  footnoteRefRow,
  metaRow,
  pageRow,
  passageNeedsReviewRow,
  passageRow,
  tocNodeRow,
  workRow,
} from "../schema/corpus.ts";
import type {
  AuthorRow,
  CorpusMeta,
  EditionRow,
  FootnoteRefRow,
  PageRow,
  PassageNeedsReviewRow,
  PassageRow,
  TocNodeRow,
  WorkRow,
} from "../schema/corpus.ts";
import { allRows, firstRow } from "./rows.ts";

export const AUTHOR_COLS = "id, name_ar, name_id, death_hijri, shamela_author_id, wikidata_id";
export const WORK_COLS =
  "id, slug, openiti_uri, title_ar, title_id, author_id, attribution_status, original_language, period";
export const EDITION_COLS =
  "e.id, e.work_id, e.slug, e.is_default, e.source, e.source_ref, e.publisher, e.city, e.volumes, e.license, e.attribution";
const PAGE_COLS = "id, edition_id, seq, juz, page_no, source_page_id";
const TOC_COLS =
  "id, edition_id, parent_id, ord, level, title_ar, start_page_id, source_title_id, patched";
const PASSAGE_COLS = "id, edition_id, page_id, toc_node_id, kind, ord, text_raw";
const pos = z.number().int().positive();

/** Node daftar isi + letak cetak halaman awalnya (untuk sitasi tanpa query per node). */
export const tocNodeWithStartRow = tocNodeRow.extend({
  start_juz: pos,
  start_page_no: z.number().int().nonnegative(),
});
export type TocNodeWithStartRow = z.infer<typeof tocNodeWithStartRow>;

/** Paragraf + letak cetak halamannya (juz, page_no), untuk bacaan yang melintasi halaman. */
export const passageWithPageRow = passageRow.extend({
  juz: pos,
  page_no: z.number().int().nonnegative(),
});
export type PassageWithPageRow = z.infer<typeof passageWithPageRow>;

/** Edisi beserta karya dan penulisnya: bahan sitasi (karya, edisi, lisensi, atribusi). */
export interface EditionContext {
  edition: EditionRow;
  work: WorkRow;
  author: AuthorRow | null;
}

export function listWorks(db: D1Db): Promise<WorkRow[]> {
  return allRows(db.prepare(`SELECT ${WORK_COLS} FROM work ORDER BY id`), workRow);
}

export function getWorkBySlug(db: D1Db, slug: string): Promise<WorkRow | null> {
  return firstRow(db.prepare(`SELECT ${WORK_COLS} FROM work WHERE slug = ?`).bind(slug), workRow);
}

/**
 * Edisi sebuah karya berdasarkan slug URL. Tanpa `editionSlug` → edisi default
 * (`/kitab/ihya/…`); dengan `editionSlug` → `/kitab/ihya@<edisi>/…` (ADR-029).
 */
export function getEdition(
  db: D1Db,
  workSlug: string,
  editionSlug?: string,
): Promise<EditionRow | null> {
  const stmt =
    editionSlug === undefined
      ? db
          .prepare(
            `SELECT ${EDITION_COLS} FROM edition e JOIN work w ON w.id = e.work_id
             WHERE w.slug = ? AND e.is_default = 1`,
          )
          .bind(workSlug)
      : db
          .prepare(
            `SELECT ${EDITION_COLS} FROM edition e JOIN work w ON w.id = e.work_id
             WHERE w.slug = ? AND e.slug = ?`,
          )
          .bind(workSlug, editionSlug);
  return firstRow(stmt, editionRow);
}

/** Halaman cetak berdasarkan sitasi (edisi, juz, halaman). Memakai indeks `page_citation`. */
export function getPageByCitation(
  db: D1Db,
  editionId: number,
  juz: number,
  pageNo: number,
): Promise<PageRow | null> {
  return firstRow(
    db
      .prepare(`SELECT ${PAGE_COLS} FROM page WHERE edition_id = ? AND juz = ? AND page_no = ?`)
      .bind(editionId, juz, pageNo),
    pageRow,
  );
}

/** Edisi berdasarkan ID beserta karya dan penulisnya (satu `batch`). Null bila edisi tidak ada. */
export async function getEditionContext(
  db: D1Db,
  editionId: number,
): Promise<EditionContext | null> {
  const [editions, works, authors] = await db.batch([
    db.prepare(`SELECT ${EDITION_COLS} FROM edition e WHERE e.id = ?`).bind(editionId),
    db
      .prepare(
        `SELECT ${WORK_COLS} FROM work WHERE id = (SELECT work_id FROM edition WHERE id = ?)`,
      )
      .bind(editionId),
    db
      .prepare(
        `SELECT ${AUTHOR_COLS} FROM author WHERE id =
           (SELECT w.author_id FROM work w JOIN edition e ON e.work_id = w.id WHERE e.id = ?)`,
      )
      .bind(editionId),
  ]);
  const edition = editions?.results[0];
  const work = works?.results[0];
  if (edition === undefined || work === undefined) return null;
  const author = authors?.results[0];
  return {
    edition: editionRow.parse(edition),
    work: workRow.parse(work),
    author: author === undefined ? null : authorRow.parse(author),
  };
}

/**
 * Semua edisi, dikelompokkan per karya: edisi default dulu, lalu urut ID. Tabel kecil
 * (satu baris per edisi), jadi `listWorks` cukup satu query untuk semua karya.
 */
export function listEditions(db: D1Db): Promise<EditionRow[]> {
  return allRows(
    db.prepare(`SELECT ${EDITION_COLS} FROM edition e ORDER BY e.work_id, e.is_default DESC, e.id`),
    editionRow,
  );
}

/** Penulis yang dirujuk karya mana pun (untuk `listWorks`). */
export function listWorkAuthors(db: D1Db): Promise<AuthorRow[]> {
  return allRows(
    db.prepare(
      `SELECT ${AUTHOR_COLS} FROM author WHERE id IN (SELECT author_id FROM work) ORDER BY id`,
    ),
    authorRow,
  );
}

export function getPageById(db: D1Db, id: number): Promise<PageRow | null> {
  return firstRow(db.prepare(`SELECT ${PAGE_COLS} FROM page WHERE id = ?`).bind(id), pageRow);
}

/** Semua halaman satu edisi dalam urutan cetak (juz, page_no): untuk sitemap dan navigasi (S09). */
export function listPages(db: D1Db, editionId: number): Promise<PageRow[]> {
  return allRows(
    db
      .prepare(`SELECT ${PAGE_COLS} FROM page WHERE edition_id = ? ORDER BY juz, page_no`)
      .bind(editionId),
    pageRow,
  );
}

/** Halaman sebelum dan sesudah dalam urutan cetak (juz, page_no) di edisi yang sama. */
export async function getAdjacentPages(
  db: D1Db,
  page: Pick<PageRow, "edition_id" | "juz" | "page_no">,
): Promise<{ prev: PageRow | null; next: PageRow | null }> {
  const [prev, next] = await Promise.all([
    firstRow(
      db
        .prepare(
          `SELECT ${PAGE_COLS} FROM page WHERE edition_id = ? AND (juz, page_no) < (?, ?)
           ORDER BY juz DESC, page_no DESC LIMIT 1`,
        )
        .bind(page.edition_id, page.juz, page.page_no),
      pageRow,
    ),
    firstRow(
      db
        .prepare(
          `SELECT ${PAGE_COLS} FROM page WHERE edition_id = ? AND (juz, page_no) > (?, ?)
           ORDER BY juz, page_no LIMIT 1`,
        )
        .bind(page.edition_id, page.juz, page.page_no),
      pageRow,
    ),
  ]);
  return { prev, next };
}

export function getTocNode(db: D1Db, id: number): Promise<TocNodeRow | null> {
  return firstRow(db.prepare(`SELECT ${TOC_COLS} FROM toc_node WHERE id = ?`).bind(id), tocNodeRow);
}

/**
 * Node daftar isi yang mulai di satu halaman cetak (X04, halaman sambungan gulir bersambung): satu
 * bolak-balik lewat indeks halaman + `toc_node_start`, tanpa membaca seluruh daftar isi. Urut
 * (`level`, `ord`); urutan baca disusun pemanggil dari `parent_id`.
 */
export function listTocNodesStartingAt(
  db: D1Db,
  editionId: number,
  juz: number,
  pageNo: number,
): Promise<TocNodeRow[]> {
  const cols = TOC_COLS.split(", ")
    .map((c) => `t.${c}`)
    .join(", ");
  return allRows(
    db
      .prepare(
        `SELECT ${cols} FROM toc_node t JOIN page p ON p.id = t.start_page_id
         WHERE p.edition_id = ? AND p.juz = ? AND p.page_no = ?
         ORDER BY t.level, t.ord, t.id`,
      )
      .bind(editionId, juz, pageNo),
    tocNodeRow,
  );
}

/** Anak langsung sebuah node daftar isi, atau akar edisi bila `parentId` = null. Urut `ord`. */
export function getTocChildren(
  db: D1Db,
  editionId: number,
  parentId: number | null,
): Promise<TocNodeRow[]> {
  const stmt =
    parentId === null
      ? db
          .prepare(
            `SELECT ${TOC_COLS} FROM toc_node WHERE edition_id = ? AND parent_id IS NULL ORDER BY ord`,
          )
          .bind(editionId)
      : db
          .prepare(
            `SELECT ${TOC_COLS} FROM toc_node WHERE edition_id = ? AND parent_id = ? ORDER BY ord`,
          )
          .bind(editionId, parentId);
  return allRows(stmt, tocNodeRow);
}

/**
 * Seluruh daftar isi satu edisi beserta letak cetak halaman awal setiap node. Urut
 * (`parent_id`, `ord`); pohon disusun pemanggil. Ihya: 313 node, jadi satu query lebih murah
 * daripada satu query per tingkat.
 */
export function listTocNodes(db: D1Db, editionId: number): Promise<TocNodeWithStartRow[]> {
  return allRows(
    db
      .prepare(
        `SELECT t.id, t.edition_id, t.parent_id, t.ord, t.level, t.title_ar, t.start_page_id,
                t.source_title_id, t.patched, p.juz AS start_juz, p.page_no AS start_page_no
         FROM toc_node t JOIN page p ON p.id = t.start_page_id
         WHERE t.edition_id = ? ORDER BY t.parent_id IS NOT NULL, t.parent_id, t.ord`,
      )
      .bind(editionId),
    tocNodeWithStartRow,
  );
}

/**
 * Paragraf sebuah bagian daftar isi **beserta semua sub-bagiannya**, dalam urutan baca: halaman
 * (juz, page_no), lalu badan teks sebelum catatan kaki, lalu `ord`. `from` = halaman pertama yang
 * diambil (inklusif; paginasi keyset `readSection`). Paling banyak `limit` baris.
 */
export function getSectionPassages(
  db: D1Db,
  nodeId: number,
  from: { juz: number; page_no: number } | null,
  limit: number,
): Promise<PassageWithPageRow[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit tidak sah: ${limit}`);
  return allRows(
    db
      .prepare(
        `WITH RECURSIVE sub(id) AS (
           SELECT id FROM toc_node WHERE id = ?1
           UNION ALL SELECT t.id FROM toc_node t JOIN sub ON t.parent_id = sub.id
         )
         SELECT p.id, p.edition_id, p.page_id, p.toc_node_id, p.kind, p.ord, p.text_raw,
                pg.juz, pg.page_no
         FROM passage p JOIN page pg ON pg.id = p.page_id
         WHERE p.toc_node_id IN (SELECT id FROM sub) AND (pg.juz, pg.page_no) >= (?2, ?3)
         ORDER BY pg.juz, pg.page_no, p.kind = 'foot', p.ord
         LIMIT ?4`,
      )
      .bind(nodeId, from?.juz ?? 0, from?.page_no ?? 0, limit),
    passageWithPageRow,
  );
}

/** Paragraf berdasarkan ID beserta letak cetak halamannya (untuk `buildCitation`). */
export function getPassageById(db: D1Db, id: number): Promise<PassageWithPageRow | null> {
  return firstRow(
    db
      .prepare(
        `SELECT p.id, p.edition_id, p.page_id, p.toc_node_id, p.kind, p.ord, p.text_raw,
                pg.juz, pg.page_no
         FROM passage p JOIN page pg ON pg.id = p.page_id WHERE p.id = ?`,
      )
      .bind(id),
    passageWithPageRow,
  );
}

/**
 * Paragraf berdasarkan banyak ID beserta letak cetak halamannya (Jawab S19: kandidat dokumen).
 * ID unik diurutkan; dipecah per ≤100 parameter dalam satu `batch`. ID yang tidak ada dilewati.
 */
export async function getPassagesByIds(
  db: D1Db,
  ids: readonly number[],
): Promise<PassageWithPageRow[]> {
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS).map((part) =>
    db
      .prepare(
        `SELECT p.id, p.edition_id, p.page_id, p.toc_node_id, p.kind, p.ord, p.text_raw,
                pg.juz, pg.page_no
         FROM passage p JOIN page pg ON pg.id = p.page_id
         WHERE p.id IN (${placeholders(part.length)}) ORDER BY p.id`,
      )
      .bind(...part),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => passageWithPageRow.parse(row)));
}

const footnoteTextRow = z.strictObject({ id: pos, text_raw: z.string() });
export type FootnoteTextRow = z.infer<typeof footnoteTextRow>;

/**
 * Teks catatan kaki satu edisi, urut ID, per halaman keyset (`afterId` = ID terakhir halaman
 * sebelumnya). Antrean tinjauan label status hadits (X07) menghitung label semua catatan kaki.
 */
export function listFootnoteTexts(
  db: D1Db,
  editionId: number,
  afterId = 0,
  limit = 1000,
): Promise<FootnoteTextRow[]> {
  const { min, max } = passageIdRange(editionId);
  z.number().int().min(1).max(2000).parse(limit);
  return allRows(
    db
      .prepare(
        `SELECT id, text_raw FROM passage
         WHERE id >= ? AND id <= ? AND id > ? AND kind = 'foot' ORDER BY id LIMIT ?`,
      )
      .bind(min, max, afterId, limit),
    footnoteTextRow,
  );
}

/** Paragraf satu halaman: badan teks dulu, lalu catatan kaki, masing-masing urut `ord`. */
// `kind = 'foot'` (0/1) dipakai, bukan urutan alfabet `kind`, supaya jenis baru tidak menyela.
export function getPassagesByPage(db: D1Db, pageId: number): Promise<PassageRow[]> {
  return allRows(
    db
      .prepare(`SELECT ${PASSAGE_COLS} FROM passage WHERE page_id = ? ORDER BY kind = 'foot', ord`)
      .bind(pageId),
    passageRow,
  );
}

/**
 * Penanda catatan kaki untuk sekumpulan paragraf badan teks. Daftar ID dipecah per
 * ≤100 parameter (batas D1) dan dikirim dalam satu `batch`.
 */
export async function getFootnoteRefs(
  db: D1Db,
  passageIds: readonly number[],
): Promise<FootnoteRefRow[]> {
  // Diurutkan dulu supaya hasil gabungan antarpotongan tetap urut passage_id.
  const unique = [...new Set(passageIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS).map((ids) =>
    db
      .prepare(
        `SELECT passage_id, char_start, char_end, marker, footnote_passage_id FROM footnote_ref
         WHERE passage_id IN (${placeholders(ids.length)}) ORDER BY passage_id, char_start`,
      )
      .bind(...ids),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => footnoteRefRow.parse(row)));
}

/**
 * Kebalikan `getFootnoteRefs`: penanda yang MENUNJUK sekumpulan catatan kaki (paragraf badan
 * mana yang dirujuk takhrij itu). Urut (`footnote_passage_id`, `passage_id`, `char_start`).
 */
export async function getFootnoteRefsTo(
  db: D1Db,
  footnoteIds: readonly number[],
): Promise<FootnoteRefRow[]> {
  const unique = [...new Set(footnoteIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS).map((ids) =>
    db
      .prepare(
        `SELECT passage_id, char_start, char_end, marker, footnote_passage_id FROM footnote_ref
         WHERE footnote_passage_id IN (${placeholders(ids.length)})
         ORDER BY footnote_passage_id, passage_id, char_start`,
      )
      .bind(...ids),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => footnoteRefRow.parse(row)));
}

/**
 * Tanda "perlu ditinjau" dari ingest (ADR-032) untuk sekumpulan paragraf, urut (`passage_id`,
 * `reason`). Dipecah per ≤100 parameter seperti `getFootnoteRefs`. Ini tanda pipeline, bukan
 * hasil review manusia (itu di DB app, ARSITEKTUR §3.2).
 */
export async function getNeedsReview(
  db: D1Db,
  passageIds: readonly number[],
): Promise<PassageNeedsReviewRow[]> {
  const unique = [...new Set(passageIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS).map((ids) =>
    db
      .prepare(
        `SELECT passage_id, reason FROM passage_needs_review
         WHERE passage_id IN (${placeholders(ids.length)}) ORDER BY passage_id, reason`,
      )
      .bind(...ids),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => passageNeedsReviewRow.parse(row)));
}

/** Isi tabel `meta` sebagai objek bertipe (schema_version, norm_version, …). */
export async function getCorpusMeta(db: D1Db): Promise<CorpusMeta> {
  const rows = await allRows(db.prepare("SELECT key, value FROM meta"), metaRow);
  return corpusMeta.parse(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}
