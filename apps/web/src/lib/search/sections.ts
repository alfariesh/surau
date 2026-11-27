import type { D1Db } from "@surau/db";

import type { SectionOption } from "./section-pick";

import { getToc, listWorks } from "@surau/core";

// Pilihan filter "Bagian kitab" di /cari (S14): node level 1 dan level 2 daftar isi, judul Arab
// persis dari DB. Server saja (mengimpor @surau/core); bentuk data dan pemilihannya ada di
// section-pick.ts supaya komponen klien tidak menarik inti.
//
// Semula selalu Ihya (`SEARCH_WORK`), sehingga /cari gagal (500) di korpus tanpa Ihya (X31a langkah
// 8a, ADR-142). Kini bagian diambil dari satu-satunya karya di korpus. Dengan lebih dari satu karya,
// daftar bagian per karya belum dibangun (ADR-087), jadi pemilih hanya menawarkan "Semua kitab";
// dibangun saat korpus berisi dua kitab (X31c).

export async function loadSearchSections(db: D1Db): Promise<SectionOption[]> {
  const { works } = await listWorks(db);
  if (works.length !== 1) return [];
  const editions = works[0]!.editions;
  const edition = editions.find((e) => e.is_default) ?? editions[0];
  if (edition === undefined) return [];
  const toc = await getToc(db, edition.id, { depth: 2 });
  return toc.nodes.map((n) => ({
    id: n.id,
    title: n.title_ar,
    children: n.children.map((c) => ({ id: c.id, title: c.title_ar, children: [] })),
  }));
}
