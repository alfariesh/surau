// Tautan publik dan peta unit kerja LLM (S13) yang dipakai bersama oleh perintah batch, laporan, dan
// ingest. Semua dibangun ulang dari baris korpus, jadi hash sumbernya sama di semua tempat.
import { passagePermalink, sectionPermalink } from "@surau/core";
import type { EditionPath } from "@surau/core";
import {
  SUMMARY_LANGS,
  parseCustomId,
  passageCustomId,
  tocCustomId,
  tocRound2CustomId,
} from "@surau/llm";
import type { SummaryLang } from "@surau/llm";

import type { CorpusRows } from "../rows.ts";
import { IHYA } from "../works/ihya.ts";
import type { AcceptedSummary } from "./store.ts";
import {
  HEADING_SEPARATOR,
  MEASURED_TOKENS_PER_CHAR,
  sha256,
  summaryPlan,
  translationUnits,
} from "./units.ts";
import type { SummaryChunk, SummaryNode, TranslationUnit, UnitIssue } from "./units.ts";

export const IHYA_PATH: EditionPath = {
  workSlug: IHYA.work.slug,
  editionSlug: IHYA.edition.slug,
  isDefault: true,
};

export function links(rows: Pick<CorpusRows, "page" | "passage">): {
  passage: (id: number) => string;
  section: (id: number) => string;
} {
  const page = new Map(rows.page.map((p) => [p.id, p]));
  const pageOf = new Map(rows.passage.map((p) => [p.id, p.page_id]));
  return {
    passage: (id) => {
      const pg = page.get(pageOf.get(id) ?? 0);
      if (pg === undefined) throw new Error(`paragraf ${id} tidak ada`);
      return passagePermalink(IHYA_PATH, pg.juz, pg.page_no, id);
    },
    section: (id) => sectionPermalink(IHYA_PATH, id),
  };
}

/** custom_id ringkasan putaran 1 sebuah potongan (final daun tanpa -p<k>). */
export function chunkCustomId(c: SummaryChunk, lang: SummaryLang): string {
  return c.final ? tocCustomId(c.tocNodeId, lang) : tocCustomId(c.tocNodeId, lang, c.part);
}

export interface Work {
  units: Map<number, TranslationUnit>;
  blocked: UnitIssue[];
  chunks: SummaryChunk[];
  /** custom_id putaran 1 → potongan (kedua bahasa). */
  chunkById: Map<string, SummaryChunk>;
  nodes: SummaryNode[];
  nodeById: Map<number, SummaryNode>;
}

export function buildWork(rows: CorpusRows): Work {
  const t = translationUnits(rows);
  const plan = summaryPlan(rows, { tokensPerChar: MEASURED_TOKENS_PER_CHAR });
  const chunkById = new Map<string, SummaryChunk>();
  for (const c of plan.chunks)
    for (const lang of SUMMARY_LANGS) chunkById.set(chunkCustomId(c, lang), c);
  return {
    units: new Map(t.units.map((u) => [u.passageId, u])),
    blocked: t.blocked,
    chunks: plan.chunks,
    chunkById,
    nodes: plan.nodes,
    nodeById: new Map(plan.nodes.map((n) => [n.tocNodeId, n])),
  };
}

/** Judul potongan relatif terhadap simpul induknya, untuk daftar masukan putaran 2. */
export function relativeHeading(node: SummaryNode, c: SummaryChunk): string {
  const own = c.tocNodeId === node.tocNodeId;
  const rel = own
    ? "(pembuka bagian ini)"
    : c.heading.startsWith(node.heading + HEADING_SEPARATOR)
      ? c.heading.slice(node.heading.length + HEADING_SEPARATOR.length)
      : c.heading;
  return c.parts > 1 ? `${rel} (potongan ${c.part} dari ${c.parts})` : rel;
}

/**
 * sha256 masukan ringkasan putaran 2 sebuah simpul: teks ringkasan putaran 1 di subpohonnya (urut
 * baca) yang masih sah untuk sumber saat ini. `null` bila ada yang belum ada. Ringkasan putaran 2
 * yang dibuat dari masukan lain (anak ditolak/diulang sesudahnya) dianggap usang.
 */
export function round2InputSha(
  node: SummaryNode,
  lang: SummaryLang,
  r1: ReadonlyMap<string, AcceptedSummary>,
): string | null {
  const texts: string[] = [];
  for (const c of node.subtree) {
    const s = r1.get(chunkCustomId(c, lang));
    if (s === undefined || s.source_sha256 !== c.sourceSha256) return null;
    texts.push(s.text);
  }
  return sha256(texts.join("\n"));
}

/** Semua custom_id yang dibutuhkan supaya korpus lengkap (dasar cakupan laporan). */
export function expectedIds(work: Work): {
  translation: string[];
  summaryFinal: { id: string; tocNodeId: number; lang: SummaryLang }[];
} {
  return {
    translation: [...work.units.keys()].map((id) => passageCustomId(id)),
    summaryFinal: work.nodes.flatMap((n) =>
      SUMMARY_LANGS.map((lang) => ({
        id: n.round2 ? tocRound2CustomId(n.tocNodeId, lang) : tocCustomId(n.tocNodeId, lang),
        tocNodeId: n.tocNodeId,
        lang,
      })),
    ),
  };
}

export { parseCustomId };
