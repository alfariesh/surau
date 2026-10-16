// Permalink publik (ARSITEKTUR §3.3, ADR-029), sebagai path relatif: domain belum diputuskan
// (P-2), jadi apps/* atau MCP (S16) menambahkan origin. Satu URL kanonis: edisi default tanpa
// `@<edisi>`, edisi lain dengan `@<edisi>`. Jangkar paragraf `#p<seq>` (bukan `ord`).
import { passageAnchor } from "@surau/db";

/** Identitas URL sebuah edisi: slug karya + slug edisi + apakah edisi default. */
export interface EditionPath {
  workSlug: string;
  editionSlug: string;
  isDefault: boolean;
}

/** `/kitab/ihya` (edisi default) atau `/kitab/ihya@<edisi>`. */
export function editionPermalink(edition: EditionPath): string {
  const work = encodeURIComponent(edition.workSlug);
  return edition.isDefault
    ? `/kitab/${work}`
    : `/kitab/${work}@${encodeURIComponent(edition.editionSlug)}`;
}

/** `/kitab/ihya/1/200`. */
export function pagePermalink(edition: EditionPath, juz: number, pageNo: number): string {
  return `${editionPermalink(edition)}/${juz}/${pageNo}`;
}

/** `/kitab/ihya/1/200#p2824`: halaman cetak + jangkar paragraf yang dibekukan. */
export function passagePermalink(
  edition: EditionPath,
  juz: number,
  pageNo: number,
  passageId: number,
): string {
  return `${pagePermalink(edition, juz, pageNo)}#${passageAnchor(passageId)}`;
}

/** `/kitab/ihya/bab/100074`. */
export function sectionPermalink(edition: EditionPath, nodeId: number): string {
  return `${editionPermalink(edition)}/bab/${nodeId}`;
}
