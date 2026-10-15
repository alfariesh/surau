// Query baca dasar DB korpus. Semua fungsi menerima D1 sebagai parameter (tanpa cloudflare:*),
// memakai prepare().bind() (tanpa interpolasi nilai ke SQL), dan mem-parse baris dengan Zod.
// FTS belum di sini (S11). Teks yang dikembalikan adalah `text_raw` dari DB, apa adanya.
import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import type { D1Db } from "../d1.ts";
import {
  corpusMeta,
  editionRow,
  footnoteRefRow,
  metaRow,
  pageRow,
  passageRow,
  tocNodeRow,
  workRow,
} from "../schema/corpus.ts";
import type {
  CorpusMeta,
  EditionRow,
  FootnoteRefRow,
  PageRow,
  PassageRow,
  TocNodeRow,
  WorkRow,
} from "../schema/corpus.ts";
import { allRows, firstRow } from "./rows.ts";

const WORK_COLS =
  "id, slug, openiti_uri, title_ar, title_id, author_id, attribution_status, original_language, period";
const EDITION_COLS =
  "e.id, e.work_id, e.slug, e.is_default, e.source, e.source_ref, e.publisher, e.city, e.volumes, e.license, e.attribution";
const PAGE_COLS = "id, edition_id, seq, juz, page_no, source_page_id";
const TOC_COLS =
  "id, edition_id, parent_id, ord, level, title_ar, start_page_id, source_title_id, patched";
const PASSAGE_COLS = "id, edition_id, page_id, toc_node_id, kind, ord, text_raw";

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

export function getPageById(db: D1Db, id: number): Promise<PageRow | null> {
  return firstRow(db.prepare(`SELECT ${PAGE_COLS} FROM page WHERE id = ?`).bind(id), pageRow);
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

/** Paragraf satu halaman: badan teks dulu, lalu catatan kaki, masing-masing urut `ord`. */
export function getPassagesByPage(db: D1Db, pageId: number): Promise<PassageRow[]> {
  return allRows(
    db
      .prepare(`SELECT ${PASSAGE_COLS} FROM passage WHERE page_id = ? ORDER BY kind, ord`)
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
  const unique = [...new Set(passageIds)];
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

/** Isi tabel `meta` sebagai objek bertipe (schema_version, norm_version, …). */
export async function getCorpusMeta(db: D1Db): Promise<CorpusMeta> {
  const rows = await allRows(db.prepare("SELECT key, value FROM meta"), metaRow);
  return corpusMeta.parse(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}
