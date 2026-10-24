// Request dan validasi Intisari (X15b, ADR-097, ADR-098). Tiga tahap: `leaf` (teks Arab satu bagian
// atau potongannya, sebagai blok berlabel), `merge` (Intisari Bab dari Intisari anak), dan `book`
// (Intisari Kitab). Model hanya menunjuk: blok `bN` (tahap leaf), gagasan `n<node>.g<k>` dan kutipan
// `n<node>.q<k>` anak (tahap merge/book). Rentang `text_raw`, sidik, dan teks Arab dihitung kode
// (teks-arab.md aturan 1, 11). `judgeDigest` menolak seluruh respons hanya bila bagian wajibnya cacat;
// butir opsional yang cacat (gagasan di atas minimum, kutipan, pertanyaan, istilah) dibuang
// deterministik dengan alasan tercatat.
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import { digestPointKind, digestStance } from "@surau/db";
import type { DigestPointKind, DigestQuoteKind, DigestStance, DigestTier } from "@surau/db";
import { z } from "zod";

import { DIGEST_MERGE_V1 } from "../prompts/digest-merge-v1.ts";
import {
  DIGEST_BOOK_SCHEMA,
  DIGEST_LEAF_SCHEMA,
  DIGEST_MERGE_SCHEMA,
} from "../prompts/digest-schema.ts";
import { DIGEST_SECTION_V2 } from "../prompts/digest-section-v2.ts";
import { GLOSSARY_TERM_KEYS } from "../prompts/glossary-v2.ts";
import {
  addressesReader,
  hasArabicLetters,
  hasFatwaLanguage,
  hasFirstPerson,
  hasHadithStatus,
  hasMarkdown,
  hasMetaCommentary,
  hasPreamble,
  paraphrasesAyah,
} from "./check.ts";
import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";
import { messageText, stopProblem } from "./response.ts";
import { checkSummary } from "./summarize.ts";

export const DIGEST_SECTION_PROMPT = DIGEST_SECTION_V2;
export const DIGEST_MERGE_PROMPT = DIGEST_MERGE_V1;
/** Bahasa Intisari yang dibuat sekarang (ADR-092: kolom `lang` siap untuk bahasa lain). */
export const DIGEST_LANG = "id";

export type DigestStage = "leaf" | "merge" | "book";

/** Batas keluaran per tahap: ruang thinking (effort medium) + JSON Intisari. */
export const DIGEST_MAX_TOKENS: Readonly<Record<DigestStage, number>> = {
  leaf: 16_000,
  merge: 16_000,
  book: 24_000,
};

/**
 * Batas yang diterima validator. Prompt meminta isi gagasan 40–90 kata (bab) dan 120–250 kata
 * (kitab); batas di sini memberi kelonggaran supaya gagasan yang sedikit lebih pendek atau panjang
 * tidak terbuang, tetapi keluaran yang jelas salah bentuk tetap ditolak.
 */
export const DIGEST_LIMITS = {
  bodyWords: { section: [25, 130], book: [90, 320] },
  titleWords: [3, 20],
  questionWords: [4, 40],
  questionsPerPoint: 2,
  framingWords: [15, 160],
  quotes: { section: 2, book: 3 },
  terms: { section: 5, book: 8 },
  /** Panjang kutipan (karakter `text_raw`). */
  quoteChars: [20, 400],
  translationWords: [2, 150],
  /** ID dasar per gagasan (jangkar dibatasi 9 rentang saat dimuat). */
  basisMax: 12,
} as const;

export interface CountRange {
  min: number;
  max: number;
}

/** Jumlah gagasan untuk sebuah teks menurut panjangnya (karakter Arab): "mengikuti panjang teks". */
export function leafPointRange(chars: number): CountRange {
  if (chars < 1_500) return { min: 1, max: 3 };
  if (chars < 5_000) return { min: 2, max: 5 };
  return { min: 3, max: 7 };
}

/** Jumlah gagasan Intisari gabungan: rentang tingkatnya, dibatasi gagasan sumber yang tersedia. */
export function mergePointRange(tier: DigestTier, available: number): CountRange {
  const r = tier === "book" ? { min: 5, max: 10 } : { min: 3, max: 7 };
  return { min: Math.max(1, Math.min(r.min, available)), max: r.max };
}

const rangeText = (r: CountRange) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);

function request(
  model: ModelId,
  system: string,
  schema: Record<string, unknown>,
  maxTokens: number,
  user: string,
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: maxTokens,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral", ttl: "1h" } }],
    messages: [{ role: "user", content: user }],
  };
}

// ── Tahap leaf: teks Arab sebagai blok ───────────────────────────────────────────────────────

export interface DigestBlockInput {
  label: string;
  /** Nomor paragraf di permintaan ini (1…). */
  paragraph: number;
  /** Judul atau subjudul (tidak boleh jadi dasar tunggal atau kutipan). */
  heading: boolean;
  /** Teks blok bertanda ayat (`maskAyat`). */
  text: string;
}

export interface DigestLeafInput {
  /** Jalur judul daftar isi (teks Arab dari DB). */
  heading: string;
  /** Judul Indonesia node (terjemahan AI), bila ada. */
  titleId: string | null;
  /** Teks milik bagian INDUK sebelum subbagiannya (bukan seluruh bagian). */
  intro: boolean;
  part: number;
  parts: number;
  blocks: readonly DigestBlockInput[];
  points: CountRange;
}

export function digestLeafUserText(input: DigestLeafInput): string {
  const lines: string[] = [];
  let paragraph: number | null = null;
  for (const b of input.blocks) {
    if (b.paragraph !== paragraph) {
      if (paragraph !== null) lines.push("</p>");
      lines.push(`<p n="${b.paragraph}">`);
      paragraph = b.paragraph;
    }
    lines.push(`[${b.label}${b.heading ? " judul" : ""}] ${b.text}`);
  }
  if (paragraph !== null) lines.push("</p>");
  const what = input.intro
    ? "teks pembuka bagian ini (sebelum subbagian-subbagiannya)"
    : "bagian ini";
  const piece = input.parts > 1 ? `, potongan ${input.part} dari ${input.parts}` : "";
  return [
    `<bagian>\n${input.heading}${input.titleId === null ? "" : `\nJudul Indonesia: ${input.titleId}`}\n</bagian>`,
    `<teks>\n${lines.join("\n")}\n</teks>`,
    `Tulis Intisari ${what}${piece}: ${rangeText(input.points)} gagasan, jumlahnya mengikuti banyaknya gagasan di teks.`,
  ].join("\n");
}

export function buildDigestLeafRequest(
  input: DigestLeafInput,
  model: ModelId = MODELS.haiku,
): MessageCreateParamsNonStreaming {
  return request(
    model,
    DIGEST_SECTION_PROMPT.system,
    DIGEST_LEAF_SCHEMA,
    DIGEST_MAX_TOKENS.leaf,
    digestLeafUserText(input),
  );
}

// ── Tahap merge/book: dari Intisari anak ─────────────────────────────────────────────────────

export interface DigestSourcePoint {
  /** `n<node>.g<k>` atau `n<node>p<k>.g<k>`. */
  id: string;
  title: string;
  body: string;
  stance: DigestStance;
  kind: DigestPointKind;
}

export interface DigestSourceQuote {
  /** `n<node>.q<k>`. */
  id: string;
  /** ID gagasan sumber yang diperkuat, atau null. */
  point: string | null;
  translation: string;
}

export interface DigestSource {
  /** `n<node>` (Intisari final anak) atau `n<node>p<k>` (teks bagian ini sendiri). */
  key: string;
  title: string;
  abstract: string;
  points: readonly DigestSourcePoint[];
  quotes: readonly DigestSourceQuote[];
  terms: readonly string[];
}

export interface DigestMergeInput {
  heading: string;
  titleId: string | null;
  tier: DigestTier;
  sources: readonly DigestSource[];
  points: CountRange;
}

const attr = (s: string) => s.replaceAll('"', "'").replaceAll(/\s+/gu, " ");

export function digestMergeUserText(input: DigestMergeInput): string {
  const sources = input.sources.map((s) =>
    [
      `<intisari kunci="${s.key}" judul="${attr(s.title)}">`,
      `<abstrak>${s.abstract}</abstrak>`,
      ...s.points.map(
        (p) =>
          `<gagasan id="${p.id}" sikap="${p.stance}" jenis="${p.kind}">${p.title}. ${p.body}</gagasan>`,
      ),
      ...s.quotes.map(
        (q) =>
          `<kutipan id="${q.id}"${q.point === null ? "" : ` gagasan="${q.point}"`}>${q.translation}</kutipan>`,
      ),
      ...(s.terms.length > 0 ? [`<istilah>${s.terms.join(", ")}</istilah>`] : []),
      "</intisari>",
    ].join("\n"),
  );
  const ask =
    input.tier === "book"
      ? `Tulis Intisari Kitab: pembuka, abstrak, ${rangeText(input.points)} gagasan (120–250 kata per gagasan), dua atau tiga kutipan dari sumber, istilah, dan penutup.`
      : `Tulis Intisari Bab: abstrak, ${rangeText(input.points)} gagasan (40–90 kata per gagasan), nol sampai dua kutipan dari sumber, dan istilah.`;
  return [
    `<bagian>\n${input.heading}${input.titleId === null ? "" : `\nJudul Indonesia: ${input.titleId}`}\n</bagian>`,
    `<sumber>\n${sources.join("\n")}\n</sumber>`,
    ask,
  ].join("\n");
}

/** Intisari Bab (Haiku 5.5) atau Intisari Kitab (Sonnet 5.5, ADR-097; Haiku untuk pembanding pilot). */
export function buildDigestMergeRequest(
  input: DigestMergeInput,
  model: ModelId = input.tier === "book" ? MODELS.sonnet : MODELS.haiku,
): MessageCreateParamsNonStreaming {
  const book = input.tier === "book";
  return request(
    model,
    DIGEST_MERGE_PROMPT.system,
    book ? DIGEST_BOOK_SCHEMA : DIGEST_MERGE_SCHEMA,
    book ? DIGEST_MAX_TOKENS.book : DIGEST_MAX_TOKENS.merge,
    digestMergeUserText(input),
  );
}

// ── Validasi ─────────────────────────────────────────────────────────────────────────────────

/** Letak satu blok tahap leaf (rentang `text_raw` paragrafnya, akhir eksklusif). */
export interface LeafBlock {
  passageId: number;
  start: number;
  end: number;
  heading: boolean;
  /** Blok memuat rujukan ayat (placeholder ⟦QS⟧). */
  ayah: boolean;
}

export interface QuoteRange {
  passageId: number;
  start: number;
  end: number;
}

export interface QuoteInspection {
  /** Ditentukan kode, bukan model (ADR-097). */
  kind: DigestQuoteKind;
  /** Alasan kutipan tidak boleh dipilih (mis. takhrij "palsu"), atau null. */
  banned: string | null;
}

export type DigestJudgeContext =
  | {
      stage: "leaf";
      blocks: ReadonlyMap<string, LeafBlock>;
      points: CountRange;
      inspectQuote: (range: QuoteRange) => QuoteInspection;
      /**
       * Cari penunjuk Arab "awal"/"akhir" (digest-section@2) di rentang blok kutipan dan kembalikan
       * rentang `text_raw` persisnya, atau alasan gagal. Tanpa penunjuk (v1) = rentang blok utuh.
       */
      locateQuote?: (range: QuoteRange, start: string, end: string) => QuoteRange | string;
    }
  | {
      stage: "merge" | "book";
      points: CountRange;
      /** ID gagasan sumber → sikapnya. */
      sourcePoints: ReadonlyMap<string, DigestStance>;
      sourceQuotes: ReadonlySet<string>;
    };

export interface JudgedPoint {
  kind: DigestPointKind;
  stance: DigestStance;
  title: string;
  body: string;
  /** Label blok (leaf) atau ID gagasan sumber (merge/book), tanpa duplikat. */
  basis: string[];
  questions: string[];
}

export type JudgedQuote =
  | {
      origin: "text";
      /** Nomor gagasan tersimpan (1…). */
      point: number;
      blocks: [from: string, to: string];
      range: QuoteRange;
      quoteKind: DigestQuoteKind;
      translation: string;
    }
  | { origin: "child"; point: number; id: string };

export interface DroppedItem {
  item: string;
  reason: string;
}

export interface JudgedDigest {
  opening: string | null;
  abstract: string;
  closing: string | null;
  points: JudgedPoint[];
  quotes: JudgedQuote[];
  terms: string[];
  dropped: DroppedItem[];
}

export type DigestVerdict =
  | { ok: true; digest: JudgedDigest }
  | { ok: false; reason: string; details: string[] };

const pointOut = z.strictObject({
  judul: z.string(),
  isi: z.string(),
  sikap: digestStance,
  jenis: digestPointKind,
  dasar: z.array(z.string()),
  pertanyaan: z.array(z.string()),
});
const leafOut = z.strictObject({
  abstrak: z.string(),
  gagasan: z.array(pointOut),
  kutipan: z.array(
    z.strictObject({
      dari: z.string(),
      sampai: z.string(),
      // digest-section@2; tidak ada di keluaran v1 (rentang blok utuh).
      awal: z.string().optional(),
      akhir: z.string().optional(),
      gagasan: z.number().int(),
      terjemahan: z.string(),
    }),
  ),
  istilah: z.array(z.string()),
});
const mergeQuoteOut = z.strictObject({ id: z.string(), gagasan: z.number().int() });
const mergeOut = z.strictObject({
  abstrak: z.string(),
  gagasan: z.array(pointOut),
  kutipan: z.array(mergeQuoteOut),
  istilah: z.array(z.string()),
});
const bookOut = mergeOut.extend({ pembuka: z.string(), penutup: z.string() });

const words = (t: string) => t.trim().split(/\s+/u).filter(Boolean).length;
const within = (n: number, [lo, hi]: readonly [number, number]) => n >= lo && n <= hi;
const unique = <T>(list: readonly T[]) => [...new Set(list)];

/**
 * Masalah satu teks narasi Intisari berbahasa Indonesia (abstrak, pembuka, penutup, judul dan isi
 * gagasan, pertanyaan); kosong = lolos.
 */
export function narrativeProblems(text: string): string[] {
  const t = text.trim();
  if (t === "") return ["empty"];
  const out: string[] = [];
  if (hasArabicLetters(t)) out.push("arabic");
  if (t.includes("⟦") || /\bQS\s*\d/u.test(t)) out.push("placeholder");
  if (hasMarkdown(t) || /^\s*[-*•]\s/mu.test(t)) out.push("markdown");
  if (/[\r\n]/u.test(t)) out.push("newline");
  // Tag atau kurung kurawal: masuk mentah ke prompt induk (<gagasan>, <kutipan>) dan ke halaman.
  if (/[<>{}]/u.test(t)) out.push("markup");
  if (hasPreamble(t)) out.push("preamble");
  if (hasMetaCommentary(t, "id")) out.push("meta");
  if (hasFatwaLanguage(t)) out.push("fatwa");
  if (addressesReader(t)) out.push("address");
  if (hasFirstPerson(t)) out.push("first_person");
  if (hasHadithStatus(t)) out.push("hadith_status");
  if (paraphrasesAyah(t)) out.push("ayah_paraphrase");
  return out;
}

/**
 * Masalah terjemahan kutipan. Ia menerjemahkan kata penulis, jadi "aku"/"kami" boleh; teks Arab,
 * placeholder, Markdown, komentar model, dan isi ayat tetap tidak.
 */
export function quoteTranslationProblems(text: string): string[] {
  const t = text.trim();
  if (t === "") return ["empty"];
  const out: string[] = [];
  if (hasArabicLetters(t)) out.push("arabic");
  if (t.includes("⟦") || /\bQS\s*\d/u.test(t)) out.push("placeholder");
  if (hasMarkdown(t)) out.push("markdown");
  if (/[\r\n]/u.test(t)) out.push("newline");
  if (hasPreamble(t)) out.push("preamble");
  if (hasMetaCommentary(t, "id")) out.push("meta");
  if (paraphrasesAyah(t)) out.push("ayah_paraphrase");
  if (!within(words(t), DIGEST_LIMITS.translationWords)) out.push("length");
  return out;
}

function framingProblems(text: string): string[] {
  const out = narrativeProblems(text);
  if (!within(words(text), DIGEST_LIMITS.framingWords)) out.push("length");
  return out;
}

function questionProblems(text: string): string[] {
  const out = narrativeProblems(text);
  if (!text.trim().endsWith("?")) out.push("no_question_mark");
  if (!within(words(text), DIGEST_LIMITS.questionWords)) out.push("length");
  return out;
}

type PointOut = z.infer<typeof pointOut>;

function pointProblems(p: PointOut, ctx: DigestJudgeContext, tier: DigestTier): string[] {
  const out: string[] = [];
  for (const x of narrativeProblems(p.judul)) out.push(`title_${x}`);
  if (!within(words(p.judul), DIGEST_LIMITS.titleWords)) out.push("title_length");
  for (const x of narrativeProblems(p.isi)) out.push(`body_${x}`);
  if (!within(words(p.isi), DIGEST_LIMITS.bodyWords[tier])) out.push("body_length");
  // Anjuran hanya yang ditulis penulis sendiri (docs/05 §12).
  if (p.jenis === "advice" && p.sikap !== "author") out.push("advice_not_author");
  const basis = unique(p.dasar);
  if (basis.length === 0) out.push("no_basis");
  if (basis.length > DIGEST_LIMITS.basisMax) out.push("basis_over_limit");
  if (ctx.stage === "leaf") {
    const unknown = basis.filter((b) => !ctx.blocks.has(b));
    if (unknown.length > 0) out.push(`unknown_block:${unknown.join("+")}`);
    else if (basis.length > 0 && basis.every((b) => ctx.blocks.get(b)?.heading === true))
      out.push("heading_only");
  } else {
    const unknown = basis.filter((b) => !ctx.sourcePoints.has(b));
    if (unknown.length > 0) out.push(`unknown_point:${unknown.join("+")}`);
    else {
      // Pendapat yang dibantah tidak pernah menjadi pendapat penulis (atau sebaliknya).
      const stances = new Set(basis.map((b) => ctx.sourcePoints.get(b)));
      const flip =
        (p.sikap === "author" && stances.size === 1 && stances.has("refuted")) ||
        (p.sikap === "refuted" && !stances.has("refuted"));
      if (flip) out.push("stance_flip");
    }
  }
  return out;
}

type LeafQuoteOut = z.infer<typeof leafOut>["kutipan"][number];
type MergeQuoteOut = z.infer<typeof mergeQuoteOut>;

function leafQuote(
  q: LeafQuoteOut,
  ctx: Extract<DigestJudgeContext, { stage: "leaf" }>,
  taken: readonly JudgedQuote[],
): Omit<Extract<JudgedQuote, { origin: "text" }>, "origin" | "point"> | string {
  const a = ctx.blocks.get(q.dari);
  const b = ctx.blocks.get(q.sampai);
  if (a === undefined) return `unknown_block:${q.dari}`;
  if (b === undefined) return `unknown_block:${q.sampai}`;
  if (a.passageId !== b.passageId) return "cross_paragraph";
  if (b.start < a.start) return "reversed";
  const blocks = [...ctx.blocks.values()].filter(
    (x) => x.passageId === a.passageId && x.start >= a.start && x.end <= b.end,
  );
  if (blocks.some((x) => x.heading)) return "heading";
  if (blocks.some((x) => x.ayah)) return "ayah";
  let range: QuoteRange = { passageId: a.passageId, start: a.start, end: b.end };
  if (q.awal !== undefined || q.akhir !== undefined) {
    if (ctx.locateQuote === undefined) return "pointer_unsupported";
    const found = ctx.locateQuote(range, q.awal ?? "", q.akhir ?? "");
    if (typeof found === "string") return found;
    // Penunjuk harus di blok yang disebut: awal di blok "dari", akhir di blok "sampai".
    const outside =
      found.passageId !== range.passageId ||
      found.start < range.start ||
      found.end > range.end ||
      found.start >= a.end ||
      found.end <= b.start ||
      found.start >= found.end;
    if (outside) return "pointer_outside_blocks";
    range = found;
  }
  if (!within(range.end - range.start, DIGEST_LIMITS.quoteChars)) return "length";
  const overlaps = taken.some(
    (x) =>
      x.origin === "text" &&
      x.range.passageId === range.passageId &&
      x.range.start < range.end &&
      range.start < x.range.end,
  );
  if (overlaps) return "overlap";
  const tp = quoteTranslationProblems(q.terjemahan);
  if (tp.length > 0) return `translation_${tp.join("+")}`;
  const inspected = ctx.inspectQuote(range);
  if (inspected.banned !== null) return `banned:${inspected.banned}`;
  return {
    blocks: [q.dari, q.sampai],
    range,
    quoteKind: inspected.kind,
    translation: q.terjemahan.trim(),
  };
}

/**
 * Nilai satu respons Intisari. Gagal bila berhenti tidak normal (structured output yang tidak
 * `end_turn` bisa tidak sesuai skema), JSON/skema rusak, abstrak (atau pembuka/penutup Intisari
 * Kitab) cacat, atau gagasan yang tersisa kurang dari minimum.
 */
export function judgeDigest(
  message: Pick<Message, "content" | "stop_reason">,
  ctx: DigestJudgeContext,
): DigestVerdict {
  const fail = (reason: string, details: string[] = []): DigestVerdict => ({
    ok: false,
    reason,
    details,
  });
  const stop = stopProblem(message);
  if (stop !== null) return fail(stop);
  if (message.stop_reason !== "end_turn") return fail(`stop:${String(message.stop_reason)}`);
  let raw: unknown;
  try {
    raw = JSON.parse(messageText(message));
  } catch {
    return fail("invalid:json");
  }
  const tier: DigestTier = ctx.stage === "book" ? "book" : "section";
  const parsed =
    ctx.stage === "leaf"
      ? leafOut.safeParse(raw)
      : ctx.stage === "merge"
        ? mergeOut.safeParse(raw)
        : bookOut.safeParse(raw);
  if (!parsed.success) {
    return fail(
      "invalid:schema",
      parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
  const out = parsed.data;
  const dropped: DroppedItem[] = [];
  const drop = (item: string, reason: string): void => {
    dropped.push({ item, reason });
  };

  const abstractProblems = unique([
    ...checkSummary(out.abstrak, DIGEST_LANG).problems,
    ...narrativeProblems(out.abstrak),
  ]);
  if (abstractProblems.length > 0) return fail("invalid:abstract", abstractProblems);
  let opening: string | null = null;
  let closing: string | null = null;
  if (ctx.stage === "book") {
    const book = out as z.infer<typeof bookOut>;
    const po = framingProblems(book.pembuka);
    if (po.length > 0) return fail("invalid:opening", po);
    const pc = framingProblems(book.penutup);
    if (pc.length > 0) return fail("invalid:closing", pc);
    opening = book.pembuka.trim();
    closing = book.penutup.trim();
  }

  const points: JudgedPoint[] = [];
  /** Nomor gagasan di keluaran model (1…) → nomor tersimpan (1…). */
  const kept = new Map<number, number>();
  out.gagasan.forEach((p, i) => {
    const item = `gagasan ${i + 1}`;
    const problems = pointProblems(p, ctx, tier);
    if (problems.length > 0) return drop(item, problems.join(","));
    if (points.length >= ctx.points.max) return drop(item, "over_limit");
    const questions: string[] = [];
    p.pertanyaan.forEach((q, k) => {
      const qp = questionProblems(q);
      if (qp.length > 0) drop(`${item} pertanyaan ${k + 1}`, qp.join(","));
      else if (questions.length >= DIGEST_LIMITS.questionsPerPoint)
        drop(`${item} pertanyaan ${k + 1}`, "over_limit");
      else questions.push(q.trim());
    });
    points.push({
      kind: p.jenis,
      stance: p.sikap,
      title: p.judul.trim(),
      body: p.isi.trim(),
      basis: unique(p.dasar),
      questions,
    });
    kept.set(i + 1, points.length);
  });
  if (points.length < ctx.points.min) {
    return fail(
      "invalid:too_few_points",
      dropped.map((d) => `${d.item}: ${d.reason}`),
    );
  }

  const quotes: JudgedQuote[] = [];
  const maxQuotes = DIGEST_LIMITS.quotes[tier];
  const rawQuotes: readonly (LeafQuoteOut | MergeQuoteOut)[] = out.kutipan;
  rawQuotes.forEach((q, j) => {
    const item = `kutipan ${j + 1}`;
    const point = kept.get(q.gagasan);
    if (point === undefined) return drop(item, "point_missing");
    if (quotes.length >= maxQuotes) return drop(item, "over_limit");
    if (ctx.stage === "leaf") {
      const r = leafQuote(q as LeafQuoteOut, ctx, quotes);
      if (typeof r === "string") return drop(item, r);
      quotes.push({ origin: "text", point, ...r });
      return;
    }
    const id = (q as MergeQuoteOut).id;
    if (!ctx.sourceQuotes.has(id)) return drop(item, `unknown_quote:${id}`);
    if (quotes.some((x) => x.origin === "child" && x.id === id)) return drop(item, "duplicate");
    quotes.push({ origin: "child", point, id });
  });

  const terms: string[] = [];
  const known = new Set(GLOSSARY_TERM_KEYS);
  out.istilah.forEach((t, k) => {
    const item = `istilah ${k + 1}`;
    if (!known.has(t)) drop(item, `unknown_term:${t}`);
    else if (terms.includes(t)) drop(item, "duplicate");
    else if (terms.length >= DIGEST_LIMITS.terms[tier]) drop(item, "over_limit");
    else terms.push(t);
  });

  return {
    ok: true,
    digest: { opening, abstract: out.abstrak.trim(), closing, points, quotes, terms, dropped },
  };
}
