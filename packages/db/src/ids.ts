// Formula ID korpus (ADR-029). ID diturunkan dari edisi + nomor urut, sehingga filter per edisi
// cukup memakai rentang rowid (ADR-005) dan ID tetap sama selama sumber + patch sama.
// Urutan tampil TIDAK pernah diambil dari ID: halaman memakai (juz, page_no), paragraf memakai
// (kind, ord), daftar isi memakai `ord`. Setelah rilis publik ID dibekukan; unit baru mendapat
// nomor urut setelah yang terbesar, dan ID yang hilang dialihkan (tabel redirect, ADR-029).

/**
 * Nomor edisi 1..899.999. Pilihan konservatif yang sama dengan CHECK di migrasi; batas keras
 * aritmetikanya ±900 juta (2⁵³ / 10⁷), jauh di atas kebutuhan.
 */
export const EDITION_ID_MAX = 899_999;
/** Halaman dan node daftar isi per edisi: id = edition_id·10⁵ + seq. */
export const PAGE_STRIDE = 100_000;
/** Paragraf per edisi: id = edition_id·10⁷ + seq. */
export const PASSAGE_STRIDE = 10_000_000;

function assertEdition(editionId: number): void {
  if (!Number.isInteger(editionId) || editionId < 1 || editionId > EDITION_ID_MAX) {
    throw new RangeError(`edition_id harus 1..${EDITION_ID_MAX}: ${editionId}`);
  }
}

function compose(editionId: number, seq: number, stride: number): number {
  assertEdition(editionId);
  if (!Number.isInteger(seq) || seq < 1 || seq >= stride) {
    throw new RangeError(`seq harus 1..${stride - 1}: ${seq}`);
  }
  return editionId * stride + seq;
}

export function pageId(editionId: number, seq: number): number {
  return compose(editionId, seq, PAGE_STRIDE);
}

export function tocNodeId(editionId: number, seq: number): number {
  return compose(editionId, seq, PAGE_STRIDE);
}

export function passageId(editionId: number, seq: number): number {
  return compose(editionId, seq, PASSAGE_STRIDE);
}

/** Rentang rowid paragraf satu edisi, `[min, max]` inklusif (filter FTS per kitab). */
export function passageIdRange(editionId: number): { min: number; max: number } {
  assertEdition(editionId);
  return {
    min: editionId * PASSAGE_STRIDE + 1,
    max: editionId * PASSAGE_STRIDE + PASSAGE_STRIDE - 1,
  };
}

/** Rentang ID node daftar isi satu edisi, `[min, max]` inklusif (filter `summary_fts` per kitab). */
export function tocNodeIdRange(editionId: number): { min: number; max: number } {
  assertEdition(editionId);
  return { min: editionId * PAGE_STRIDE + 1, max: editionId * PAGE_STRIDE + PAGE_STRIDE - 1 };
}

/** Edisi pemilik sebuah ID halaman/node daftar isi. */
export function editionOfPageId(id: number): number {
  return Math.floor(id / PAGE_STRIDE);
}

/** Edisi pemilik sebuah ID paragraf. */
export function editionOfPassageId(id: number): number {
  return Math.floor(id / PASSAGE_STRIDE);
}

/** Jangkar publik paragraf (`#p<seq>`, ADR-029): stabil karena seq dibekukan, berbeda dari `ord`. */
export function passageAnchor(id: number): string {
  return `p${id % PASSAGE_STRIDE}`;
}
