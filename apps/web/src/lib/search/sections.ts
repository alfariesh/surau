import type { D1Db } from "@surau/db";

import { getToc, getWork } from "@surau/core";

// Pilihan filter "Bagian kitab" di /cari (S14): rub' (level 1) dan kitab (level 2) Ihya, judul Arab
// persis dari DB. Server saja.

/** Karya yang dicari halaman Cari (satu-satunya kitab saat ini). */
export const SEARCH_WORK = "ihya";

export interface SectionOption {
  id: number;
  /** Judul Arab persis dari `toc_node.title_ar`. */
  title: string;
  children: SectionOption[];
}

export async function loadSearchSections(db: D1Db): Promise<SectionOption[]> {
  const work = await getWork(db, SEARCH_WORK);
  const edition = work.editions.find((e) => e.is_default) ?? work.editions[0];
  if (edition === undefined) return [];
  const toc = await getToc(db, edition.id, { depth: 2 });
  return toc.nodes.map((n) => ({
    id: n.id,
    title: n.title_ar,
    children: n.children.map((c) => ({ id: c.id, title: c.title_ar, children: [] })),
  }));
}

/** Rub' dan kitab terpilih dari nilai `bagian`: node level 1, node level 2, atau tidak dikenal. */
export function selectedSection(
  options: readonly SectionOption[],
  section: number | null,
): { rub: SectionOption | null; kitab: SectionOption | null } {
  if (section === null) return { rub: null, kitab: null };
  for (const rub of options) {
    if (rub.id === section) return { rub, kitab: null };
    const kitab = rub.children.find((c) => c.id === section);
    if (kitab !== undefined) return { rub, kitab };
  }
  return { rub: null, kitab: null };
}
