// Pohon daftar isi: judul Shamela (`title`) + patch yang di-commit, lalu setiap paragraf diberi
// node daftar isinya. Posisi judul diambil dari span `id=toc-N` di teks halaman; judul tanpa span
// dimulai di awal `title.page`. Node tambahan dari patch mendapat judul yang DISALIN dari paragraf
// pembukanya di halaman sumber, bukan dari teks yang ditulis di patch.
import { findQuote } from "@surau/text";

import type { TocPatch } from "./patch.ts";
import type { ParsedPage } from "./shamela/page.ts";
import type { ShamelaTitle } from "./shamela/source.ts";

export interface TocNode {
  /** Kunci stabil: `t<title.id>` atau `patch:<id>`. */
  key: string;
  sourceTitleId: number | null;
  titleAr: string;
  parentKey: string | null;
  patched: boolean;
  /** Halaman awal (indeks di `pages`). */
  pageIndex: number;
  /** Paragraf badan pertama milik node ini (indeks di `pages[pageIndex].body`). */
  bodyIndex: number;
  /** Offset judul di teks badan bersih halaman itu (0 = awal halaman). */
  offset: number;
  /** Diisi saat pohon disusun: kedalaman (akar = 1) dan urutan di antara saudara (mulai 1). */
  level: number;
  ord: number;
}

export interface TocBuild {
  /** Urutan DFS: induk selalu sebelum anaknya. */
  nodes: TocNode[];
  /** Pelanggaran struktur (ingest gagal bila tidak kosong). */
  issues: string[];
  /** `title.id` tanpa span di teks (dimulai di awal `title.page`). */
  spanless: number[];
  /** `title.id` yang span-nya ada di halaman lain dari `title.page`. */
  pageMismatch: number[];
  /** Span judul yang menunjuk `title.id` tak dikenal. */
  unknownSpans: number[];
  /** Node daftar isi tiap paragraf: `body[halaman][paragraf]`, `foot[halaman][catatan]`. */
  body: string[][];
  foot: string[][];
}

function firstBodyAt(page: ParsedPage, offset: number): number {
  const i = page.body.findIndex((d) => d.end > offset);
  return i < 0 ? page.body.length : i;
}

export function buildToc(
  titles: readonly ShamelaTitle[],
  pages: readonly ParsedPage[],
  patch: TocPatch,
): TocBuild {
  const issues: string[] = [];
  const spanless: number[] = [];
  const pageMismatch: number[] = [];
  const pageIndexById = new Map(pages.map((p, i) => [p.source.id, i]));
  const titleIds = new Set(titles.map((t) => t.id));

  const spans = new Map<number, { pageIndex: number; offset: number }[]>();
  const unknownSpans: number[] = [];
  pages.forEach((p, pageIndex) => {
    for (const t of p.titles) {
      if (!titleIds.has(t.tocId)) unknownSpans.push(t.tocId);
      spans.set(t.tocId, [...(spans.get(t.tocId) ?? []), { pageIndex, offset: t.offset }]);
    }
  });

  const nodes = new Map<string, TocNode>();
  const sourceOrder = new Map<string, number>();
  for (const t of titles) {
    const found = spans.get(t.id) ?? [];
    let at: { pageIndex: number; offset: number } | undefined;
    if (found.length > 1) issues.push(`judul ${t.id}: span muncul ${found.length} kali`);
    if (found.length >= 1) {
      at = found[0];
      if (pages[found[0]?.pageIndex ?? -1]?.source.id !== t.page) pageMismatch.push(t.id);
    } else {
      spanless.push(t.id);
      const pageIndex = pageIndexById.get(t.page);
      if (pageIndex === undefined) issues.push(`judul ${t.id} yatim: page.id ${t.page} tidak ada`);
      else at = { pageIndex, offset: 0 };
    }
    if (at === undefined) continue;
    const page = pages[at.pageIndex] as ParsedPage;
    const key = `t${t.id}`;
    if (t.parent !== 0 && !titleIds.has(t.parent)) {
      issues.push(`judul ${t.id} yatim: induk ${t.parent} tidak ada`);
    }
    nodes.set(key, {
      key,
      sourceTitleId: t.id,
      titleAr: t.content.trim(),
      parentKey: t.parent === 0 ? null : `t${t.parent}`,
      patched: false,
      pageIndex: at.pageIndex,
      bodyIndex: firstBodyAt(page, at.offset),
      offset: at.offset,
      level: 0,
      ord: 0,
    });
    sourceOrder.set(key, sourceOrder.size);
  }

  const refKey = (ref: number | string): string =>
    typeof ref === "number" ? `t${ref}` : `patch:${ref}`;
  for (const add of patch.add) {
    const key = `patch:${add.id}`;
    const pageIndex = pageIndexById.get(add.page);
    const page = pageIndex === undefined ? undefined : pages[pageIndex];
    if (pageIndex === undefined || page === undefined) {
      issues.push(`patch ${add.id}: page.id ${add.page} tidak ada`);
      continue;
    }
    let bodyIndex = -1;
    let titleAr = "";
    for (const [i, d] of page.body.entries()) {
      const hit = findQuote(d.text, add.heading);
      if (hit !== null && hit.rawStart === 0) {
        bodyIndex = i;
        titleAr = hit.rawText;
        break;
      }
    }
    if (bodyIndex < 0) {
      issues.push(
        `patch ${add.id}: tidak ada paragraf yang dibuka "${add.heading}" di page.id ${add.page}`,
      );
      continue;
    }
    nodes.set(key, {
      key,
      sourceTitleId: null,
      titleAr,
      parentKey: refKey(add.parent),
      patched: true,
      pageIndex,
      bodyIndex,
      offset: (page.body[bodyIndex] as ParsedPage["body"][number]).start,
      level: 0,
      ord: 0,
    });
    sourceOrder.set(key, sourceOrder.size);
  }
  for (const move of patch.move) {
    const parent = refKey(move.parent);
    if (!nodes.has(parent)) issues.push(`patch move: induk ${parent} tidak ada`);
    for (const id of move.titles) {
      const node = nodes.get(`t${id}`);
      if (node === undefined) {
        issues.push(`patch move: judul ${id} tidak ada`);
        continue;
      }
      node.parentKey = parent;
      node.patched = true;
    }
  }
  for (const n of nodes.values()) {
    if (n.parentKey !== null && !nodes.has(n.parentKey)) {
      issues.push(`node ${n.key} yatim: induk ${n.parentKey} tidak ada`);
      n.parentKey = null;
    }
  }

  // Saudara diurutkan menurut posisi di kitab, lalu urutan sumber.
  const children = new Map<string | null, TocNode[]>();
  for (const n of nodes.values())
    children.set(n.parentKey, [...(children.get(n.parentKey) ?? []), n]);
  for (const list of children.values()) {
    list.sort(
      (a, b) =>
        a.pageIndex - b.pageIndex ||
        a.offset - b.offset ||
        (sourceOrder.get(a.key) ?? 0) - (sourceOrder.get(b.key) ?? 0),
    );
  }
  const ordered: TocNode[] = [];
  const visit = (parent: string | null, level: number): void => {
    (children.get(parent) ?? []).forEach((n, i) => {
      n.level = level;
      n.ord = i + 1;
      ordered.push(n);
      visit(n.key, level + 1);
    });
  };
  visit(null, 1);
  if (ordered.length !== nodes.size) {
    issues.push(`${nodes.size - ordered.length} node tidak terjangkau dari akar (siklus induk)`);
  }

  // Urutan baca: node berikutnya dalam DFS tidak boleh mulai di halaman sebelum node sebelumnya.
  // (Di halaman yang sama urutannya bisa terbalik: Shamela kadang menaruh span rub' sesudah span
  // kitab pertamanya, mis. "كتاب … وهو الكتاب الأول من ربع …".)
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1] as TocNode;
    const b = ordered[i] as TocNode;
    if (b.pageIndex < a.pageIndex) issues.push(`urutan halaman tidak monoton: ${a.key} → ${b.key}`);
  }

  const { body, foot } = assignNodes(pages, ordered, issues);
  return { nodes: ordered, issues, spanless, pageMismatch, unknownSpans, body, foot };
}

/**
 * Paragraf badan mengikuti judul terakhir yang dimulai di atau sebelum paragraf itu. Bila beberapa
 * judul dimulai di paragraf yang sama (mis. "كتاب … من ربع …"), node terdalam yang dipakai.
 * Catatan kaki ikut paragraf badan pertama yang merujuknya; takhrij menempel ikut paragraf asalnya;
 * sisanya ikut paragraf badan terakhir di halaman itu.
 */
function assignNodes(
  pages: readonly ParsedPage[],
  ordered: readonly TocNode[],
  issues: string[],
): { body: string[][]; foot: string[][] } {
  const switches = ordered
    .map((n, dfs) => ({ n, dfs }))
    .sort(
      (a, b) => a.n.pageIndex - b.n.pageIndex || a.n.bodyIndex - b.n.bodyIndex || a.dfs - b.dfs,
    );
  const parentOf = new Map(ordered.map((n) => [n.key, n.parentKey]));
  const isAncestor = (key: string, of: string | null): boolean => {
    let k = of === null ? null : (parentOf.get(of) ?? null);
    for (; k !== null; k = parentOf.get(k) ?? null) if (k === key) return true;
    return false;
  };
  let next = 0;
  let current: string | null = null;
  const take = (pageIndex: number, bodyIndex: number): void => {
    let best: { n: TocNode; dfs: number } | undefined;
    while (next < switches.length) {
      const s = switches[next] as (typeof switches)[number];
      if (s.n.pageIndex > pageIndex || (s.n.pageIndex === pageIndex && s.n.bodyIndex > bodyIndex))
        break;
      next++;
      // Span judul induk yang muncul sesudah judul anaknya yang sedang berjalan (mis. rub' sesudah
      // kitab pertamanya) tidak memindah paragraf ke induk.
      if (isAncestor(s.n.key, current)) continue;
      if (
        best === undefined ||
        s.n.level > best.n.level ||
        (s.n.level === best.n.level && s.dfs > best.dfs)
      ) {
        best = s;
      }
    }
    if (best !== undefined) current = best.n.key;
  };

  const body: string[][] = [];
  const foot: string[][] = [];
  pages.forEach((page, pageIndex) => {
    const nodesOfBody = page.body.map((_, bodyIndex) => {
      take(pageIndex, bodyIndex);
      if (current === null)
        issues.push(`page.id ${page.source.id}: paragraf sebelum judul pertama`);
      return current ?? "";
    });
    const fallback = nodesOfBody.at(-1) ?? current ?? "";
    body.push(nodesOfBody);
    foot.push(
      page.foot.map((f, footIndex) => {
        const link = page.links.find((l) => l.foot === footIndex);
        if (link !== undefined) return nodesOfBody[link.body] as string;
        const origin = f.line < 0 ? -1 : page.body.findIndex((d) => d.line === f.line);
        return origin >= 0 ? (nodesOfBody[origin] as string) : fallback;
      }),
    );
  });
  return { body, foot };
}
