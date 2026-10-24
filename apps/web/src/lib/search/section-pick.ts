// Bagian kitab untuk pemilih sumber (ADR-087): bentuk data + pemilihan, tanpa impor @surau/core
// supaya aman dipakai komponen klien (SearchBox, SourcePicker). Pemuatnya: sections.ts (server).

export interface SectionOption {
  id: number;
  /** Judul Arab persis dari `toc_node.title_ar`. */
  title: string;
  children: SectionOption[];
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
