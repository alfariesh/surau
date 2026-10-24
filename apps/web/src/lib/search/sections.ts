import type { D1Db } from "@surau/db";

import type { SectionOption } from "./section-pick";

import { getToc, getWork } from "@surau/core";

// Pilihan filter "Bagian kitab" di /cari (S14): rub' (level 1) dan kitab (level 2) Ihya, judul Arab
// persis dari DB. Server saja (mengimpor @surau/core); bentuk data dan pemilihannya ada di
// section-pick.ts supaya komponen klien tidak menarik inti.

/** Karya yang dicari halaman Cari (satu-satunya kitab saat ini). */
export const SEARCH_WORK = "ihya";

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
