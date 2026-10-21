import type { D1Db, TitleTranslations } from "@surau/db";

import { subheadingPartText, subheadingTocTargets } from "@surau/core";
import { getCorpusMeta, getFootnoteRefs, getPassagesByIds, listTitleTranslations } from "@surau/db";

import type { TocItem } from "./toc";

import { SUBHEADING_DIGEST, sha16, subheadingEntries } from "./subheadings";

// Daftar isi PEMBACA (X04 bagian B): pohon `toc_node` (sama dengan MCP) + subjudul kurasi sebagai
// anak node-nya (W7) + judul Indonesia terjemahan AI (W8, korpus skema ≥ 7). Hanya untuk tampilan
// pohon daftar isi; breadcrumb, <title>, OG, bagian aktif, dan model halaman tetap memakai pohon
// `toc_node` saja (`loadToc`), jadi judulnya tetap Arab. Daftar isi MCP dan routing Jawab tidak
// tersentuh. Judul subjudul disalin kode dari `text_raw` di offset kurasi, dan hanya bila sidik
// teksnya masih sama dengan daftar kurasi (ADR-074).

const TITLE_LANG = "id";

/** Subjudul kurasi yang siap disisipkan ke pohon. */
export interface SubheadingItem {
  /** `passage.id` paragraf subjudul (kunci judul Indonesia; tidak bertabrakan dengan id node). */
  id: number;
  seq: number;
  /** Node daftar isi pemilik paragraf (`passage.toc_node_id`). */
  parentId: number;
  title: string;
  juz: number;
  page: number;
  /** Urutan baca: `ord` paragraf di halamannya. */
  ord: number;
}

/** Label sumber judul Indonesia (kepala daftar isi): model, versi prompt, tanggal pembuatan. */
export interface TitleSource {
  models: string[];
  prompts: string[];
  /** Tanggal ISO (YYYY-MM-DD) paling awal dan paling akhir. */
  from: string;
  to: string;
}

export interface ReaderTocExtras {
  subs: SubheadingItem[];
  /** Judul Indonesia per node / per paragraf subjudul; `null` = korpus belum punya (skema < 7). */
  titles: {
    node: Map<number, string>;
    sub: Map<number, string>;
    source: TitleSource | null;
  } | null;
}

/** Subjudul kurasi dari baris paragraf DB; entri yang sidiknya tidak cocok dilewati. */
export async function subheadingItems(
  editionId: number,
  rows: readonly {
    id: number;
    toc_node_id: number | null;
    ord: number;
    juz: number;
    page_no: number;
    text_raw: string;
  }[],
  markers: readonly { passage_id: number; char_start: number; char_end: number }[],
): Promise<SubheadingItem[]> {
  const entries = subheadingEntries(editionId);
  const base = editionId * 10_000_000;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ok = new Set<number>();
  for (const [seq, e] of entries) {
    const row = byId.get(base + seq);
    if (row !== undefined && (await sha16(row.text_raw)) === e.sha) ok.add(seq);
  }
  const out: SubheadingItem[] = [];
  for (const target of subheadingTocTargets(entries)) {
    const head = byId.get(base + target.seq);
    if (head === undefined || head.toc_node_id === null || !ok.has(target.seq)) continue;
    // Lanjutan berlaku berurutan: berhenti di lanjutan pertama yang sidiknya tidak cocok.
    const parts: string[] = [];
    for (const part of target.parts) {
      const row = byId.get(base + part.seq);
      if (row === undefined || !ok.has(part.seq)) break;
      parts.push(
        subheadingPartText(
          row.text_raw,
          part,
          markers.filter((m) => m.passage_id === row.id),
        ),
      );
    }
    const title = parts.filter((p) => p !== "").join(" ");
    if (title === "") continue;
    out.push({
      id: head.id,
      seq: target.seq,
      parentId: head.toc_node_id,
      title,
      juz: head.juz,
      page: head.page_no,
      ord: head.ord,
    });
  }
  return out;
}

function titleSource(t: TitleTranslations): TitleSource | null {
  const rows = [...t.toc, ...t.sub].filter((r) => r.review_status !== "rejected");
  if (rows.length === 0) return null;
  const dates = rows.map((r) => r.created_at.slice(0, 10)).sort();
  return {
    models: [...new Set(rows.map((r) => r.model))].sort(),
    prompts: [...new Set(rows.map((r) => r.prompt_version))].sort(),
    from: dates[0]!,
    to: dates.at(-1)!,
  };
}

async function loadExtras(db: D1Db, editionId: number): Promise<ReaderTocExtras> {
  const seqs = [...subheadingEntries(editionId).keys()];
  const ids = seqs.map((s) => editionId * 10_000_000 + s);
  const [rows, refs, titles] = await Promise.all([
    getPassagesByIds(db, ids),
    getFootnoteRefs(db, ids),
    listTitleTranslations(db, editionId, TITLE_LANG),
  ]);
  const subs = await subheadingItems(editionId, rows, refs);
  if (titles === null) return { subs, titles: null };
  const shown = <R extends { review_status: string; text: string }>(list: readonly R[]) =>
    list.filter((r) => r.review_status !== "rejected" && r.text.trim() !== "");
  return {
    subs,
    titles: {
      node: new Map(shown(titles.toc).map((r) => [r.toc_node_id, r.text])),
      sub: new Map(shown(titles.sub).map((r) => [r.passage_id, r.text])),
      source: titleSource(titles),
    },
  };
}

// Memo per isolate, seperti memo daftar isi core (#66): kunci = isi `meta` korpus + edisi + sidik
// daftar kurasi. Tanpa ketiga nilai meta (fixture, korpus lama tanpa meta lengkap) tidak di-memo.
const MEMO_MAX = 8;
const memo = new Map<string, ReaderTocExtras>();

export async function readerTocExtras(db: D1Db, editionId: number): Promise<ReaderTocExtras> {
  let key: string | null = null;
  try {
    const meta = await getCorpusMeta(db);
    if (meta.corpus_version && meta.built_at && meta.source_hash) {
      key = `${meta.corpus_version}|${meta.built_at}|${meta.source_hash}|${editionId}|${SUBHEADING_DIGEST}`;
    }
  } catch {
    key = null;
  }
  const hit = key === null ? undefined : memo.get(key);
  if (hit !== undefined) return hit;
  const extras = await loadExtras(db, editionId);
  if (key !== null) {
    if (memo.size >= MEMO_MAX && !memo.has(key)) memo.clear();
    memo.set(key, extras);
  }
  return extras;
}

/**
 * Pohon daftar isi pembaca: subjudul disisipkan sebagai anak node pemiliknya, SEBELUM anak node
 * (paragraf milik node itu sendiri selalu mendahului judul anak pertamanya), urut baca; judul
 * Indonesia dipasang bila ada. `segment` = segmen karya kanonis untuk permalink paragraf.
 */
export function readerToc(
  toc: readonly TocItem[],
  extras: ReaderTocExtras,
  segment: string,
): TocItem[] {
  const subsOf = new Map<number, SubheadingItem[]>();
  for (const s of extras.subs) subsOf.set(s.parentId, [...(subsOf.get(s.parentId) ?? []), s]);
  for (const list of subsOf.values()) {
    list.sort((a, b) => a.juz - b.juz || a.page - b.page || a.ord - b.ord);
  }
  const node = extras.titles?.node;
  const sub = extras.titles?.sub;
  const visit = (items: readonly TocItem[]): TocItem[] =>
    items.map((item) => {
      const titleId = node?.get(item.id);
      const subs = (subsOf.get(item.id) ?? []).map((s): TocItem => ({
        id: s.id,
        kind: "sub",
        title: s.title,
        ...(sub?.has(s.id) ? { titleId: sub.get(s.id)! } : {}),
        level: item.level + 1,
        href: `/kitab/${segment}/${s.juz}/${s.page}#p${s.seq}`,
        juz: s.juz,
        page: s.page,
        children: [],
      }));
      return {
        ...item,
        ...(titleId === undefined ? {} : { titleId }),
        children: [...subs, ...visit(item.children)],
      };
    });
  return visit(toc);
}
