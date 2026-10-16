// Penyusun sitasi. Semua sitasi dirakit dari baris DB (edisi + karya + penulis + halaman), tidak
// pernah dari teks bebas. `buildCitation` adalah pintu untuk pemanggil yang hanya punya ID
// paragraf (Jawab S19: indeks blok → passage_id → sitasi).
import { getEditionContext, getPassageById } from "@surau/db";
import type { D1Db, EditionContext } from "@surau/db";

import { NotFound, parseInput } from "./errors.ts";
import { pagePermalink, passagePermalink } from "./permalink.ts";
import type { EditionPath } from "./permalink.ts";
import { buildCitationInput } from "./schema.ts";
import type { Citation, CitationSource, Location } from "./schema.ts";

/** Bahan sitasi satu edisi, dihitung sekali per panggilan core tool. */
export interface CiteContext {
  source: CitationSource;
  path: EditionPath;
  location(juz: number, pageNo: number, passageId?: number): Location;
  citation(juz: number, pageNo: number, passageId?: number): Citation;
}

export function citeContext(ctx: EditionContext): CiteContext {
  const { edition, work, author } = ctx;
  const source: CitationSource = {
    work: {
      slug: work.slug,
      title_ar: work.title_ar,
      title_id: work.title_id,
      author:
        author === null
          ? null
          : { name_ar: author.name_ar, name_id: author.name_id, death_hijri: author.death_hijri },
      attribution_status: work.attribution_status,
    },
    edition: {
      id: edition.id,
      slug: edition.slug,
      is_default: edition.is_default === 1,
      publisher: edition.publisher,
      city: edition.city,
    },
    license: edition.license,
    attribution: edition.attribution,
  };
  const path: EditionPath = {
    workSlug: work.slug,
    editionSlug: edition.slug,
    isDefault: edition.is_default === 1,
  };
  // Label memakai judul Indonesia (transliterasi) bila ada; edisi non-default diberi nama edisinya
  // supaya dua sitasi dari edisi berbeda tidak terbaca sama.
  const title = work.title_id ?? work.title_ar;
  const editionNote = path.isDefault ? "" : ` (${edition.publisher ?? edition.slug})`;
  const location = (juz: number, pageNo: number, passageId?: number): Location => ({
    juz,
    page_no: pageNo,
    permalink:
      passageId === undefined
        ? pagePermalink(path, juz, pageNo)
        : passagePermalink(path, juz, pageNo, passageId),
    label: `${title}${editionNote}, j. ${juz}, h. ${pageNo}`,
  });
  return {
    source,
    path,
    location,
    citation: (juz, pageNo, passageId) => ({ source, ...location(juz, pageNo, passageId) }),
  };
}

/** Konteks sitasi sebuah edisi; `NotFound` bila edisi tidak ada. */
export async function loadCiteContext(db: D1Db, editionId: number): Promise<CiteContext> {
  const ctx = await getEditionContext(db, editionId);
  if (ctx === null) throw new NotFound(`Edition not found: ${editionId}`);
  return citeContext(ctx);
}

/**
 * Sitasi lengkap satu paragraf (karya, edisi, juz, halaman cetak, permalink ke jangkar paragraf,
 * lisensi, atribusi). `NotFound` bila paragraf tidak ada; `InvalidCitation` bila ID salah bentuk.
 */
export async function buildCitation(db: D1Db, passageId: number): Promise<Citation> {
  const { passage_id } = parseInput(buildCitationInput, { passage_id: passageId });
  const row = await getPassageById(db, passage_id);
  if (row === null) throw new NotFound(`Passage not found: ${passage_id}`);
  const cite = await loadCiteContext(db, row.edition_id);
  return cite.citation(row.juz, row.page_no, row.id);
}
