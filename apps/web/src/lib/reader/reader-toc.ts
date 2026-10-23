import type { D1Db, ReviewStatus, TitleTranslations } from "@surau/db";

import { subheadingTitle, subheadingTocTargets } from "@surau/core";
import {
  TITLE_SCHEMA_VERSION,
  getCorpusMeta,
  getFootnoteRefs,
  getPassagesByIds,
  listTitleTranslations,
  passageId,
} from "@surau/db";

import type { TocItem } from "./toc";

import { SUBHEADING_DIGEST, sha16, sha256, subheadingEntries } from "./subheadings";

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
  /** Status tinjau judul yang tampil (label "belum ditinjau" / "sudah ditinjau" …). */
  statuses: ReviewStatus[];
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
  const pid = (seq: number) => passageId(editionId, seq);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ok = new Set<number>();
  for (const [seq, e] of entries) {
    const row = byId.get(pid(seq));
    if (row !== undefined && (await sha16(row.text_raw)) === e.sha) ok.add(seq);
  }
  const out: SubheadingItem[] = [];
  for (const target of subheadingTocTargets(entries)) {
    const head = byId.get(pid(target.seq));
    if (head === undefined || head.toc_node_id === null || !ok.has(target.seq)) continue;
    // Sama dengan ingest (`titleUnits`): lanjutan berhenti di yang pertama tidak cocok sidiknya.
    const title = subheadingTitle(target, (seq) => {
      const row = byId.get(pid(seq));
      return row === undefined || !ok.has(seq)
        ? null
        : { text: row.text_raw, markers: markers.filter((m) => m.passage_id === row.id) };
    });
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

function titleSource(
  rows: readonly {
    model: string;
    prompt_version: string;
    created_at: string;
    review_status: ReviewStatus;
  }[],
): TitleSource | null {
  if (rows.length === 0) return null;
  const dates = rows.map((r) => r.created_at.slice(0, 10)).sort();
  return {
    models: [...new Set(rows.map((r) => r.model))].sort(),
    prompts: [...new Set(rows.map((r) => r.prompt_version))].sort(),
    statuses: [...new Set(rows.map((r) => r.review_status))].sort(),
    from: dates[0]!,
    to: dates.at(-1)!,
  };
}

/**
 * Judul Indonesia yang tampil: bukan `rejected`, tidak kosong, dan untuk subjudul hanya bila sidik
 * judul Arab yang diterjemahkan sama dengan judul yang tampil sekarang (daftar kurasi bisa berubah
 * tanpa korpus baru; temuan peninjau X04 bagian B).
 */
export async function shownTitles(
  titles: TitleTranslations,
  subs: readonly SubheadingItem[],
): Promise<NonNullable<ReaderTocExtras["titles"]>> {
  const usable = <R extends { review_status: string; text: string }>(list: readonly R[]) =>
    list.filter((r) => r.review_status !== "rejected" && r.text.trim() !== "");
  const arabic = new Map(subs.map((s) => [s.id, s.title]));
  const sub = [];
  for (const r of usable(titles.sub)) {
    const title = arabic.get(r.passage_id);
    if (title !== undefined && (await sha256(title)) === r.source_sha256) sub.push(r);
  }
  const toc = usable(titles.toc);
  return {
    node: new Map(toc.map((r) => [r.toc_node_id, r.text])),
    sub: new Map(sub.map((r) => [r.passage_id, r.text])),
    source: titleSource([...toc, ...sub]),
  };
}

async function loadExtras(
  db: D1Db,
  editionId: number,
  schema: number | null,
): Promise<ReaderTocExtras> {
  const ids = [...subheadingEntries(editionId).keys()].map((s) => passageId(editionId, s));
  // Korpus lama (skema < 7, mis. ihya-v7): kueri judul tidak dijalankan sama sekali (tanpa galat
  // "no such table" di log); meta tak terbaca = coba, `listTitleTranslations` menanganinya.
  const wantTitles = schema === null || schema >= TITLE_SCHEMA_VERSION;
  const [rows, refs, titles] = await Promise.all([
    getPassagesByIds(db, ids),
    getFootnoteRefs(db, ids),
    wantTitles ? listTitleTranslations(db, editionId, TITLE_LANG) : Promise.resolve(null),
  ]);
  const subs = await subheadingItems(editionId, rows, refs);
  if (titles === null) return { subs, titles: null };
  return { subs, titles: await shownTitles(titles, subs) };
}

// Memo per isolate, seperti memo daftar isi core (#66): kunci = isi `meta` korpus + edisi + sidik
// daftar kurasi. Tanpa ketiga nilai meta (fixture, korpus lama tanpa meta lengkap) tidak di-memo.
const MEMO_MAX = 8;
const memo = new Map<string, ReaderTocExtras>();

export async function readerTocExtras(db: D1Db, editionId: number): Promise<ReaderTocExtras> {
  let key: string | null = null;
  let schema: number | null = null;
  try {
    const meta = await getCorpusMeta(db);
    schema = meta.schema_version;
    if (meta.corpus_version && meta.built_at && meta.source_hash) {
      key = `${meta.corpus_version}|${meta.built_at}|${meta.source_hash}|${editionId}|${SUBHEADING_DIGEST}`;
    }
  } catch {
    key = null;
  }
  const hit = key === null ? undefined : memo.get(key);
  if (hit !== undefined) return hit;
  const extras = await loadExtras(db, editionId, schema);
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
