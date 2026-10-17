// `custom_id` Message Batches (S13). Aturan API: ^[a-zA-Z0-9_-]{1,64}$ dan unik per batch. Hasil
// batch datang dalam urutan acak, jadi ID ini satu-satunya kunci untuk mencocokkan hasil ke paragraf
// atau bagian daftar isi.
//   passage-<id>             terjemahan satu paragraf
//   toc-<id>-<lang>          ringkasan final simpul daun yang muat dalam satu request (putaran 1)
//   toc-<id>-<lang>-p<k>     ringkasan potongan ke-k (mulai 1) dari paragraf milik simpul itu sendiri
//                            (simpul daun terlalu panjang, atau pengantar simpul induk); putaran 1
//   toc-<id>-<lang>-r2       ringkasan final simpul dari ringkasan putaran 1 di bawahnya (putaran 2)

export const CUSTOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export const SUMMARY_LANGS = ["id", "en"] as const;
export type SummaryLang = (typeof SUMMARY_LANGS)[number];

export type CustomIdParts =
  | { kind: "passage"; passageId: number }
  | { kind: "toc"; tocNodeId: number; lang: SummaryLang; part: number | null; round: 1 | 2 };

function positiveInt(n: number, what: string): number {
  if (!Number.isSafeInteger(n) || n < 1)
    throw new Error(`${what} bukan bilangan bulat positif: ${n}`);
  return n;
}

function checked(id: string): string {
  if (!CUSTOM_ID_PATTERN.test(id)) throw new Error(`custom_id tidak sah: ${id}`);
  return id;
}

export function passageCustomId(passageId: number): string {
  return checked(`passage-${positiveInt(passageId, "passage id")}`);
}

/** Ringkasan putaran 1: tanpa `part` = ringkasan final daun; dengan `part` = potongan ke-k. */
export function tocCustomId(tocNodeId: number, lang: SummaryLang, part?: number): string {
  const base = `toc-${positiveInt(tocNodeId, "toc_node id")}-${lang}`;
  return checked(part === undefined ? base : `${base}-p${positiveInt(part, "potongan")}`);
}

export function tocRound2CustomId(tocNodeId: number, lang: SummaryLang): string {
  return checked(`toc-${positiveInt(tocNodeId, "toc_node id")}-${lang}-r2`);
}

const PASSAGE = /^passage-([1-9]\d*)$/;
const TOC = /^toc-([1-9]\d*)-(id|en)(?:-p([1-9]\d*)|-(r2))?$/;

/** Kebalikan pembuat ID di atas; `null` untuk ID yang bukan buatan Surau. */
export function parseCustomId(id: string): CustomIdParts | null {
  const p = PASSAGE.exec(id);
  if (p !== null) return { kind: "passage", passageId: Number(p[1]) };
  const t = TOC.exec(id);
  if (t === null) return null;
  return {
    kind: "toc",
    tocNodeId: Number(t[1]),
    lang: t[2] as SummaryLang,
    part: t[3] === undefined ? null : Number(t[3]),
    round: t[4] === "r2" ? 2 : 1,
  };
}
