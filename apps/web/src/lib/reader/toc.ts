import type { Passage, TocNode } from "@surau/core";

// Daftar isi untuk UI pembaca: pohon ramping (dikirim ke komponen klien di setiap halaman baca,
// jadi tanpa sitasi/lisensi per node), pencarian jalur untuk breadcrumb, dan bagian aktif.

export interface TocItem {
  /** `toc_node.id`, atau `passage.id` untuk subjudul kurasi (`kind: "sub"`). */
  id: number;
  /**
   * `node` = node daftar isi korpus; `sub` = subjudul kurasi pembaca (X04 W7, hanya di pohon
   * tampilan `readerToc`, tidak pernah di pohon untuk breadcrumb/bagian aktif/model halaman).
   */
  kind: "node" | "sub";
  /** Judul Arab persis dari DB (`toc_node.title_ar`, atau potongan `text_raw` subjudul). */
  title: string;
  /** Judul Indonesia terjemahan AI (X04 W8, korpus skema ≥ 7), hanya di pohon tampilan. */
  titleId?: string;
  level: number;
  /** Permalink halaman awal bagian, mis. `/kitab/ihya/1/197`. */
  href: string;
  juz: number;
  page: number;
  children: TocItem[];
}

export function slimToc(nodes: readonly TocNode[]): TocItem[] {
  return nodes.map((n) => ({
    id: n.id,
    kind: "node",
    title: n.title_ar,
    level: n.level,
    href: n.start.permalink,
    juz: n.start.juz,
    page: n.start.page_no,
    children: slimToc(n.children),
  }));
}

/** Semua node dalam urutan baca (pre-order). */
export function flattenToc(items: readonly TocItem[]): TocItem[] {
  return items.flatMap((i) => [i, ...flattenToc(i.children)]);
}

/** Jalur akar → node (termasuk node itu), atau `[]` bila tidak ada. */
export function tocPath(items: readonly TocItem[], id: number): TocItem[] {
  for (const item of items) {
    if (item.id === id) return [item];
    const sub = tocPath(item.children, id);
    if (sub.length > 0) return [item, ...sub];
  }
  return [];
}

function startsAtOrBefore(item: TocItem, juz: number, page: number): boolean {
  return item.juz < juz || (item.juz === juz && item.page <= page);
}

/**
 * Node yang mulai di halaman cetak ini, urut baca, beserta induknya (bahan `buildPageModel`, X04).
 * Halaman sambungan (gulir bersambung) memperoleh daftar yang sama lewat kueri per halaman.
 */
export function pageSections(
  items: readonly TocItem[],
  juz: number,
  page: number,
): { id: number; parentId: number | null; level: number; title: string }[] {
  const out: { id: number; parentId: number | null; level: number; title: string }[] = [];
  const visit = (nodes: readonly TocItem[], parentId: number | null) => {
    for (const n of nodes) {
      if (n.juz === juz && n.page === page) {
        out.push({ id: n.id, parentId, level: n.level, title: n.title });
      }
      visit(n.children, n.id);
    }
  };
  visit(items, null);
  return out;
}

/**
 * Bagian yang tampil di halaman ini, urut kemunculan: node paragraf badan (`toc_node_id`).
 * Halaman tanpa paragraf bernode (mis. hanya catatan kaki) memakai node terakhir dalam urutan
 * baca yang mulai di halaman ini atau sebelumnya.
 */
export function activeTocIds(
  items: readonly TocItem[],
  juz: number,
  page: number,
  body: readonly Pick<Passage, "toc_node_id">[],
): number[] {
  const ids = [
    ...new Set(body.map((p) => p.toc_node_id).filter((id): id is number => id !== null)),
  ];
  if (ids.length > 0) return ids;
  const before = flattenToc(items).filter((i) => startsAtOrBefore(i, juz, page));
  const last = before.at(-1);
  return last === undefined ? [] : [last.id];
}

/**
 * Tautan unik per bagian: halaman awal + jangkar judul (`#bab-<id>`), seperti breadcrumb. Subjudul
 * kurasi sudah membawa permalink paragrafnya (`#pN`).
 */
export function tocHref(item: Pick<TocItem, "id" | "href"> & { kind?: TocItem["kind"] }): string {
  return item.kind === "sub" ? item.href : `${item.href}#bab-${item.id}`;
}

/**
 * Satu kolom garis pemandu di kiri baris, satu per leluhur. `line` = garis tegak penuh (masih ada
 * saudara di bawah), `end` = siku melengkung ke baris ini (anak terakhir), `none` = kosong.
 * `accent` menandai jalur induk → bagian aktif: `line` = garis tegak yang dilewati jalur itu,
 * `elbow` = siku yang masuk ke baris aktif.
 */
export interface TocGuide {
  kind: "line" | "end" | "none";
  accent: "none" | "line" | "elbow";
}

export interface TocRow {
  guides: TocGuide[];
  /** Sediakan ruang chevron: node ini atau salah satu saudaranya punya anak (label tetap sejajar). */
  chevronSlot: boolean;
}

/** Garis pemandu dan ruang chevron untuk setiap node, dihitung sekali per pohon + bagian aktif. */
export function tocRows(items: readonly TocItem[], activeId?: number): Map<number, TocRow> {
  const path = activeId === undefined ? [] : tocPath(items, activeId);
  const active = path.at(-1);
  const parent = path.at(-2);
  const activeIndex = parent && active ? parent.children.indexOf(active) : -1;

  interface Step {
    item: TocItem;
    index: number;
    isLast: boolean;
    parent?: TocItem;
  }
  const rows = new Map<number, TocRow>();
  const visit = (nodes: readonly TocItem[], up: TocItem | undefined, chain: Step[]) => {
    const chevronSlot = nodes.some((n) => n.children.length > 0);
    nodes.forEach((item, index) => {
      const steps = [...chain, { item, index, isLast: index === nodes.length - 1, parent: up }];
      // Kolom j menggantung dari leluhur di tingkat j+1; langkah s adalah anaknya di jalur baris ini.
      const guides = steps.slice(1).map((s, j): TocGuide => {
        const own = j === steps.length - 2;
        const kind = s.isLast ? (own ? "end" : "none") : "line";
        let accent: TocGuide["accent"] = "none";
        if (parent !== undefined && s.parent === parent) {
          if (s.item === active) accent = own ? "elbow" : "none";
          else if (s.index < activeIndex) accent = "line";
        }
        return { kind, accent };
      });
      rows.set(item.id, { guides, chevronSlot });
      visit(item.children, item, steps);
    });
  };
  visit(items, undefined, []);
  return rows;
}
