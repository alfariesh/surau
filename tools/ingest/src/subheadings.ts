// Lapisan subjudul pembaca (X04 W4): paragraf atau bagian paragraf yang sebenarnya judul, tetapi
// tidak dikenali sebagai judul daftar isi. Hasilnya `data/patches/<kitab>-<id shamela>-subjudul.json`
// (di-commit, dipakai web) dibangun dari dua sumber:
//   1. aturan deterministik: paragraf badan pendek (< 200 karakter) yang kata pertamanya "bayan"
//      (bentuk normal `normalizeArabic`) dan bukan judul node daftar isi (aturan `headingPassages`
//      di web: teks = judul node + node mulai di halaman itu);
//   2. keputusan kurasi di `<kitab>-<id shamela>-subjudul.yaml`, ditinjau agent per paragraf:
//      pengecualian beralasan, judul terpotong yang bersambung ke paragraf berikutnya, dan subjudul
//      yang menempel di awal/akhir paragraf (dinyatakan dengan JUMLAH KATA, tanpa teks Arab).
// Keluaran hanya nomor paragraf (`#pN`), offset UTF-16 di `text_raw`, dan sidik sha256 (16 hex,
// sama dengan `data/ids/*.teks.json`) supaya web tidak memotong teks yang sudah berubah. Teks Arab
// tidak pernah ditulis atau diubah: web hanya memotong `text_raw` di offset ini (teks-arab.md 1–2).
import { indonesianSentences, normalizeArabic, toRawSpan } from "@surau/text";
import { z } from "zod";

export const SUBHEADING_FORMAT = 1;
/** Paragraf berawalan "bayan" yang lebih panjang dari ini dianggap isi, bukan judul. */
export const BAYAN_MAX_CHARS = 200;
/** Kata pembuka subjudul "bayan" dalam bentuk normal (tanpa harakat). */
const BAYAN = "بيان";

/** Paragraf badan dalam urutan baca (halaman, lalu `ord`). */
export interface SubPassage {
  /** Nomor jangkar `#pN` (= passage.id − edition_id·10⁷). */
  seq: number;
  pageId: number;
  text: string;
  tocNodeId: number | null;
  /** Terjemahan AI (bila ada), untuk menebalkan kalimat padanan subjudul. */
  translation: string | null;
  /** Rentang yang tidak boleh terpotong: penanda catatan kaki dan kutipan ayat. */
  locked: readonly { start: number; end: number }[];
}

export interface SubTocNode {
  id: number;
  title: string;
  startPageId: number;
}

const seq = z.number().int().positive();
const reason = z.string().min(10).max(300);

/** Keputusan kurasi (YAML). Semua nomor = jangkar `#pN`; tanpa teks Arab. */
export const subheadingDecisions = z.strictObject({
  /** Versi korpus tempat keputusan diperiksa (dicatat di keluaran). */
  corpus: z.string().regex(/^[a-z0-9-]+$/),
  /** Calon "bayan" yang bukan subjudul. */
  exclude: z.array(z.strictObject({ p: seq, alasan: reason })).default([]),
  /** Paragraf judul lain (bukan "bayan") yang dirender sebagai subjudul utuh. */
  heading: z.array(z.strictObject({ p: seq, alasan: reason })).default([]),
  /**
   * Judul terpotong: paragraf `p` adalah lanjutan judul di paragraf `of` (paragraf badan tepat
   * sebelumnya), dirender menyatu dengannya.
   */
  continuation: z.array(z.strictObject({ p: seq, of: seq })).default([]),
  /**
   * Subjudul menempel di AWAL paragraf: `kata` kata pertama. `terjemahan: true` = kalimat pertama
   * terjemahan AI adalah padanan subjudulnya (diperiksa per paragraf), jadi ikut ditebalkan.
   */
  lead: z
    .array(
      z.strictObject({ p: seq, kata: z.number().int().min(1).max(12), terjemahan: z.boolean() }),
    )
    .default([]),
  /** Subjudul menempel di AKHIR paragraf: `kata` kata terakhir; `terjemahan` = kalimat terakhir. */
  tail: z
    .array(
      z.strictObject({ p: seq, kata: z.number().int().min(1).max(12), terjemahan: z.boolean() }),
    )
    .default([]),
});
export type SubheadingDecisions = z.infer<typeof subheadingDecisions>;

/** Bagian terjemahan yang ditebalkan, terikat sidik teks terjemahannya. */
export interface TranslationMark {
  /** `[0, end)` (subjudul awal) atau `[start, panjang)` (subjudul akhir) di teks terjemahan. */
  start: number;
  end: number;
  sha: string;
}

export type SubheadingEntry =
  | {
      kind: "heading";
      /** "bayan" = aturan otomatis; "kurasi" = keputusan `heading`/`continuation`. */
      src: "bayan" | "kurasi";
      sha: string;
      /** Lanjutan judul di paragraf ini (`#pN`). */
      of?: number;
    }
  | { kind: "lead"; end: number; sha: string; tr?: TranslationMark }
  | { kind: "tail"; start: number; sha: string; tr?: TranslationMark };

export interface SubheadingFile {
  format: typeof SUBHEADING_FORMAT;
  edition: number;
  corpus: string;
  /** Kunci = nomor jangkar `#pN` (teks), urut naik. */
  entries: Record<string, SubheadingEntry>;
}

export const subheadingFile = z.strictObject({
  format: z.literal(SUBHEADING_FORMAT),
  edition: z.number().int().positive(),
  corpus: z.string(),
  entries: z.record(
    z.string().regex(/^\d+$/),
    z.union([
      z.strictObject({
        kind: z.literal("heading"),
        src: z.enum(["bayan", "kurasi"]),
        sha: z.string().regex(/^[0-9a-f]{16}$/),
        of: seq.optional(),
      }),
      z.strictObject({
        kind: z.literal("lead"),
        end: z.number().int().positive(),
        sha: z.string().regex(/^[0-9a-f]{16}$/),
        tr: z
          .strictObject({
            start: z.number().int().nonnegative(),
            end: z.number().int().positive(),
            sha: z.string().regex(/^[0-9a-f]{16}$/),
          })
          .optional(),
      }),
      z.strictObject({
        kind: z.literal("tail"),
        start: z.number().int().positive(),
        sha: z.string().regex(/^[0-9a-f]{16}$/),
        tr: z
          .strictObject({
            start: z.number().int().nonnegative(),
            end: z.number().int().positive(),
            sha: z.string().regex(/^[0-9a-f]{16}$/),
          })
          .optional(),
      }),
    ]),
  ),
});

/** Token bentuk normal beserta posisinya di teks normal. */
function tokens(text: string) {
  const norm = normalizeArabic(text);
  const out: { word: string; start: number; end: number }[] = [];
  let at = 0;
  for (const word of norm.text === "" ? [] : norm.text.split(" ")) {
    out.push({ word, start: at, end: at + word.length });
    at += word.length + 1;
  }
  return { norm, tokens: out };
}

/** Kata pertama paragraf (bentuk normal), atau "" bila tidak ada huruf. */
export function firstWord(text: string): string {
  return tokens(text).tokens[0]?.word ?? "";
}

/**
 * Offset potong di `text_raw`: akhir kata ke-`words` dari depan (`from = "start"`, termasuk harakat
 * yang menempel), atau awal kata ke-`words` dari belakang (`from = "end"`). `null` bila jumlah kata
 * paragraf tidak lebih dari `words` (tidak ada sisa teks).
 */
export function wordCut(text: string, words: number, from: "start" | "end"): number | null {
  const { norm, tokens: list } = tokens(text);
  if (words < 1 || list.length <= words) return null;
  if (from === "start") {
    const last = list[words - 1]!;
    return toRawSpan(text, norm, last.start, last.end)[1];
  }
  const first = list[list.length - words]!;
  return toRawSpan(text, norm, first.start, first.end)[0];
}

/** Paragraf yang teksnya sama dengan judul node-nya dan node itu mulai di halamannya (= h2 web). */
function isTocHeading(p: SubPassage, nodes: ReadonlyMap<number, SubTocNode>): boolean {
  if (p.tocNodeId === null) return false;
  const node = nodes.get(p.tocNodeId);
  return node !== undefined && node.startPageId === p.pageId && p.text.trim() === node.title.trim();
}

/** Calon subjudul "bayan" (aturan 1), urut baca. */
export function bayanCandidates(
  passages: readonly SubPassage[],
  nodes: readonly SubTocNode[],
): number[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return passages
    .filter(
      (p) =>
        p.text.length < BAYAN_MAX_CHARS && firstWord(p.text) === BAYAN && !isTocHeading(p, byId),
    )
    .map((p) => p.seq);
}

export interface SubheadingBuild {
  file: SubheadingFile;
  /** Keputusan yang tidak bisa diterapkan (harus diperbaiki sebelum keluaran ditulis). */
  problems: string[];
  stats: {
    bayanCandidates: number;
    bayanExcluded: number;
    bayanHeadings: number;
    kurasiHeadings: number;
    continuations: number;
    lead: number;
    tail: number;
  };
}

const inside = (pos: number, spans: SubPassage["locked"]) =>
  spans.some((s) => pos > s.start && pos < s.end);

/** Bangun berkas subjudul dari paragraf (urut baca), daftar isi, dan keputusan kurasi. */
export function buildSubheadings(
  edition: number,
  passages: readonly SubPassage[],
  nodes: readonly SubTocNode[],
  decisions: SubheadingDecisions,
  sha16: (text: string) => string,
): SubheadingBuild {
  const problems: string[] = [];
  const bySeq = new Map(passages.map((p, i) => [p.seq, { p, i }]));
  const entries = new Map<number, SubheadingEntry>();
  const taken = new Set<number>();
  const claim = (s: number, what: string): SubPassage | null => {
    const hit = bySeq.get(s);
    if (hit === undefined) {
      problems.push(`${what} p${s}: bukan paragraf badan di korpus ini`);
      return null;
    }
    if (taken.has(s)) {
      problems.push(`${what} p${s}: paragraf sudah punya keputusan lain`);
      return null;
    }
    taken.add(s);
    return hit.p;
  };

  const candidates = bayanCandidates(passages, nodes);
  const candidateSet = new Set(candidates);
  const excluded = new Set<number>();
  for (const e of decisions.exclude) {
    if (!candidateSet.has(e.p))
      problems.push(`exclude p${e.p}: bukan calon "bayan" (keputusan usang?)`);
    else excluded.add(e.p);
  }
  const leadSeqs = new Set(decisions.lead.map((d) => d.p));

  for (const s of candidates) {
    // Calon "bayan" yang ternyata subjudul awal (isi menyusul di paragraf yang sama) diatur `lead`.
    if (excluded.has(s) || leadSeqs.has(s)) continue;
    const p = claim(s, "bayan");
    if (p !== null) entries.set(s, { kind: "heading", src: "bayan", sha: sha16(p.text) });
  }
  for (const d of decisions.heading) {
    if (candidateSet.has(d.p) && !excluded.has(d.p)) {
      problems.push(`heading p${d.p}: sudah subjudul otomatis "bayan"`);
      continue;
    }
    const p = claim(d.p, "heading");
    if (p !== null) entries.set(d.p, { kind: "heading", src: "kurasi", sha: sha16(p.text) });
  }
  for (const d of decisions.continuation) {
    const head = entries.get(d.of);
    if (head === undefined || head.kind !== "heading") {
      problems.push(`continuation p${d.p}: p${d.of} bukan subjudul utuh`);
      continue;
    }
    const at = bySeq.get(d.p);
    const before = bySeq.get(d.of);
    if (at === undefined || before === undefined || at.i !== before.i + 1) {
      problems.push(`continuation p${d.p}: bukan paragraf badan tepat sesudah p${d.of}`);
      continue;
    }
    const p = claim(d.p, "continuation");
    if (p !== null)
      entries.set(d.p, { kind: "heading", src: "kurasi", sha: sha16(p.text), of: d.of });
  }
  const mark = (
    p: SubPassage,
    which: "first" | "last",
    wanted: boolean,
  ): TranslationMark | undefined => {
    if (!wanted) return undefined;
    if (p.translation === null) {
      problems.push(`p${p.seq}: terjemahan: true, tetapi paragraf tanpa terjemahan`);
      return undefined;
    }
    const sentences = indonesianSentences(p.translation);
    if (sentences.length < 2) {
      problems.push(`p${p.seq}: terjemahan hanya satu kalimat; subjudulnya tidak bisa dipisah`);
      return undefined;
    }
    const s = which === "first" ? sentences[0]! : sentences.at(-1)!;
    return { start: s.start, end: s.end, sha: sha16(p.translation) };
  };
  for (const d of decisions.lead) {
    const p = claim(d.p, "lead");
    if (p === null) continue;
    const end = wordCut(p.text, d.kata, "start");
    if (end === null || inside(end, p.locked)) {
      problems.push(`lead p${d.p}: ${d.kata} kata tidak menyisakan isi atau memotong penanda/ayat`);
      continue;
    }
    const tr = mark(p, "first", d.terjemahan);
    entries.set(d.p, { kind: "lead", end, sha: sha16(p.text), ...(tr ? { tr } : {}) });
  }
  for (const d of decisions.tail) {
    const p = claim(d.p, "tail");
    if (p === null) continue;
    const start = wordCut(p.text, d.kata, "end");
    if (start === null || inside(start, p.locked)) {
      problems.push(`tail p${d.p}: ${d.kata} kata tidak menyisakan isi atau memotong penanda/ayat`);
      continue;
    }
    const tr = mark(p, "last", d.terjemahan);
    entries.set(d.p, { kind: "tail", start, sha: sha16(p.text), ...(tr ? { tr } : {}) });
  }

  const sorted = [...entries.entries()].sort((a, b) => a[0] - b[0]);
  const values = sorted.map(([, e]) => e);
  return {
    file: {
      format: SUBHEADING_FORMAT,
      edition,
      corpus: decisions.corpus,
      entries: Object.fromEntries(sorted.map(([s, e]) => [String(s), e])),
    },
    problems,
    stats: {
      bayanCandidates: candidates.length,
      bayanExcluded: excluded.size,
      bayanHeadings: values.filter((e) => e.kind === "heading" && e.src === "bayan").length,
      kurasiHeadings: values.filter(
        (e) => e.kind === "heading" && e.src === "kurasi" && e.of === undefined,
      ).length,
      continuations: values.filter((e) => e.kind === "heading" && e.of !== undefined).length,
      lead: values.filter((e) => e.kind === "lead").length,
      tail: values.filter((e) => e.kind === "tail").length,
    },
  };
}
