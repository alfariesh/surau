// Pipeline Jawab (S19, ARSITEKTUR-TEKNIS §5): routing Haiku atas daftar isi → kandidat searchText
// (RRF) → jawaban Haiku + Citations (stream) → setiap sitasi dipetakan ke ID + offset dan
// diverifikasi terhadap DB → hasil, atau turun ke Cari. Dipakai Worker `surau-api` dan runner eval
// (`tools/eval`) dengan klien Anthropic yang berbeda (gateway / langsung). Guard biaya (kuota,
// ledger, Turnstile) ada di pemanggil (S20), bukan di sini.
import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  RawMessageStreamEvent,
  TextCitation,
} from "@anthropic-ai/sdk/resources/messages";
import {
  answerPassages,
  answerToc,
  resolveEvalSource,
  reviewedTakhrijLabel,
  takhrijLabel,
  takhrijReviewsFor,
} from "@surau/core";
import type {
  AnswerPassage,
  AnswerTocNode,
  EffectiveTakhrijReview,
  ReviewedTakhrijLabel,
  SourceSpan,
  TakhrijLabelTerm,
} from "@surau/core";
import { getCorpusMeta } from "@surau/db";
import type { D1Db, TakhrijReview } from "@surau/db";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
import { MODELS } from "../client.ts";
import type { ModelId } from "../client.ts";
import { addUsage, emptyTotals, promptTokens } from "../pricing.ts";
import type { UsageTotals } from "../pricing.ts";
import {
  ANSWER_PROMPT,
  DOC_BUDGET_TOKENS,
  JAWAB_MAX_PROMPT_TOKENS,
  TRANSLATED_DOCS,
  buildAnswerRequest,
  fitDocs,
  fixedPromptTokens,
  orderBySection,
} from "./answer.ts";
import {
  ayahGlossSuspects,
  citationSpans,
  HADITH_NOT_CITED,
  HADITH_UNKNOWN,
  hadithStatements,
  hasHadithPrefix,
  pipelineTerms,
  refusalKind,
  stripArabic,
  stripCiteTags,
} from "./citations.ts";
import type { HadithStatement } from "./citations.ts";
import type { CitedSpan } from "./citations.ts";
import { buildDoc, docContext, docLabel } from "./documents.ts";
import type { AnswerDoc } from "./documents.ts";
import { fuse, pairIds, searchLists, semanticLists, withPairs } from "./retrieve.ts";
import type { SearchList, SemanticInput } from "./retrieve.ts";
import { ROUTE_PROMPT, buildRouteRequest, normalizeRoute, parseRoute, tocText } from "./route.ts";
import type { Route } from "./route.ts";

export const JAWAB_PROMPT_VERSION = `${ANSWER_PROMPT.id}+${ROUTE_PROMPT.id}`;
/**
 * Versi kode pipeline di luar prompt: pencarian kandidat (X03: 4), urutan dokumen (X05: 5), label
 * status hadits dari istilah takhrij (X06: 6), label yang ditinjau ustadz (X07: 7), konteks
 * bagian berjudul kitab + pemberitahuan status yang berdiri sendiri dibuang (ADR-106: 8), dan
 * pascaproses (pemetaan/verifikasi sitasi, `hadithCheck`). Naikkan bila perilaku itu berubah: ikut
 * kunci `answer_cache`, jadi cache lama tidak disajikan dengan aturan lama.
 */
export const JAWAB_PIPELINE_VERSION = 8;
/** Edisi default Ihya (satu-satunya kitab di Fase 4). */
export const JAWAB_EDITION_ID = 1;
export const QUESTION_MAX_CHARS = 1000;
const FALLBACK_HITS = 5;

export type JawabStage = "route" | "retrieve" | "answer" | "retry" | "verify";
/**
 * `budget` (S20): ledger menolak reservasi ulangan Sonnet (anggaran bulan ini tidak cukup).
 * `cancelled` (S20): peminta sudah pergi, jadi panggilan LLM baru (jawaban/ulangan) tidak dimulai.
 */
export type FallbackReason =
  | "no_candidates"
  | "unverified"
  | "refusal"
  | "provider_error"
  | "budget"
  | "cancelled";
/** Alasan hasil: turun ke Cari, atau jenis penolakan (`false_premise` = premis keliru). */
export type JawabReason = FallbackReason | "false_premise";

export interface JawabCitation {
  n: number;
  passage_id: number;
  char_start: number;
  char_end: number;
  kind: "body" | "foot";
  label: string;
  permalink: string;
}
export interface JawabBlock {
  text: string;
  /** Nomor `n` sitasi terverifikasi yang mendukung blok ini. */
  citations: number[];
}
export interface JawabHadith {
  passage_id: number;
  footnote: SourceSpan;
  /**
   * Status dari istilah yang tertulis di teks takhrij, dibuat KODE (`takhrijLabel`, X06/ADR-069),
   * bukan tulisan model. `rule_extracted` = belum ditinjau; `ustadz_reviewed` = label kode disetujui
   * penilai /tinjau; `ustadz_corrected` = jenis istilahnya dikoreksi penilai (teks status disusun
   * kode dari jenis koreksi, X07/ADR-070).
   */
  status: string;
  label: "rule_extracted" | "ustadz_reviewed" | "ustadz_corrected";
  /** Versi aturan istilah (`TAKHRIJ_TERMS_VERSION`): tinjauan label terikat versi. */
  rules_version: number;
  /** Istilah penilaian positif dan negatif sekaligus (jalur/lafaz berbeda). */
  mixed: boolean;
  /** Istilah di teks takhrij: rentang mentah di catatan kaki + arti baku. */
  terms: TakhrijLabelTerm[];
  /** Koreksi saja: jenis istilah dari penilai yang tidak punya frasa baku di teks (tanpa Arab). */
  added_terms: { kind: string; gloss: string }[];
}
export interface JawabSearchHit extends SourceSpan {
  label: string;
  permalink: string;
}
export interface JawabRefusal {
  model: ModelId;
  category: string | null;
}
export interface JawabDiagnostics {
  route: Route | null;
  /** Daftar yang digabung RRF: pencarian D1 ditambah daftar makna bila `semanticSearch` diisi. */
  search_lists: number;
  /** Bagian tambahan dari ringkasan AI bagian (routing kedua tanpa LLM, X03), urut pencarian. */
  summary_sections: number[];
  /** Pencarian makna (X13): tidak ada bila `semanticSearch` tidak diberikan. */
  semantic?: { hits: number; footnote_hits: number; error: boolean };
  candidates: number;
  docs: number;
  doc_tokens_est: number;
  prompt_tokens: number | null;
  over_prompt_limit: boolean;
  citations_total: number;
  citations_valid: number;
  /** Sitasi gagal (indeks di luar dokumen, bentang tidak cocok DB, atau verifikasi gagal). */
  citations_dropped: number;
  blocks_dropped: number;
  arabic_removed: number;
  /** Kalimat "Status hadits:" tanpa takhrij tersitasi, diganti `HADITH_UNKNOWN`. */
  hadith_unsupported: number;
  /** Pernyataan status bertakhrij yang isinya diganti teks label (X06). */
  hadith_labeled: number;
  /** Istilah pipeline ("dokumen", "dilampirkan", "terjemahan AI") di jawaban akhir (pipeline@8). */
  pipeline_terms: number;
  /** Kalimat calon parafrase ayat: rujukan QS + penanda makna/kutipan (pipeline@8, heuristik). */
  ayah_gloss_suspect: number;
  /** Klaim status yang labelnya disetujui/dikoreksi penilai (X07). */
  hadith_reviewed: number;
  /** Tinjauan label gagal dimuat (DB app); label kode dipakai. */
  takhrij_reviews_error: boolean;
  truncated: boolean;
  refusals: JawabRefusal[];
  /**
   * Galat penyedia: `status` HTTP (null = timeout, koneksi putus, atau galat di tengah stream;
   * request itu mungkin sudah ditagih), tahap, dan model panggilan yang gagal (ledger S20).
   */
  provider_error: {
    status: number | null;
    type: string;
    stage: "route" | "answer";
    model: ModelId;
  } | null;
}
export interface JawabResult {
  outcome: "answer" | "not_found" | "fallback";
  reason: JawabReason | null;
  text: string;
  blocks: JawabBlock[];
  citations: JawabCitation[];
  hadith: JawabHadith[];
  /** Hasil Cari pengganti (fallback) atau pelengkap (not_found). */
  search: JawabSearchHit[];
  model: ModelId | null;
  prompt_version: string;
  corpus_version: string;
  cost_usd: number;
  latency_ms: number;
  usage: UsageTotals;
  diagnostics: JawabDiagnostics;
}
export type JawabEvent =
  | { type: "stage"; stage: JawabStage }
  /** Pratinjau blok terverifikasi; `done`/`fallback` yang menentukan isi akhir. */
  | { type: "block"; block: JawabBlock; citations: JawabCitation[] }
  /** Buang pratinjau sebelumnya (ulangan dengan model lain). */
  | { type: "reset" }
  | { type: "done"; result: JawabResult }
  | { type: "fallback"; result: JawabResult };

export interface JawabDeps {
  corpus: D1Db;
  anthropic: Anthropic;
  /** Header tambahan per request (mis. `cf-aig-metadata`). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
  emit?: (event: JawabEvent) => void | Promise<void>;
  now?: () => number;
  /** Edisi yang daftar isinya dikirim ke routing (bawaan Ihya, edisi 1). */
  editionId?: number;
  /**
   * Dipanggil sebelum ulangan Sonnet (biaya tambahan, S20) dengan salinan pemakaian sejauh ini.
   * `false` = anggaran tidak cukup → `fallback` alasan `budget` tanpa memanggil Sonnet.
   */
  beforeRetry?: (usageSoFar: UsageTotals) => Promise<boolean>;
  /**
   * `true` = peminta sudah pergi (S20): panggilan LLM yang sedang berjalan diselesaikan, tetapi
   * panggilan baru (jawaban, ulangan Sonnet) tidak dimulai → `fallback` alasan `cancelled`.
   */
  isCancelled?: () => boolean;
  /**
   * Hanya eval (X05): rute routing tersimpan dari arsip eval dipakai ulang tanpa panggilan routing,
   * supaya dua versi tahap jawaban dibandingkan atas dokumen yang sama. `null` = tanpa rute
   * (pencarian pertanyaan saja). Worker `surau-api` tidak pernah mengisinya.
   */
  savedRoute?: Route | null;
  /**
   * Pencarian makna (X13, ADR-093/094): ID paragraf terdekat dengan pertanyaan, urut kemiripan;
   * `footnotes` (catatan kaki saja) hanya diminta bila routing menandai soal hadits. Belum diisi
   * Worker sampai indeks embedding ada; galat = tanpa daftar makna (dicatat di diagnostik),
   * jawaban tetap berjalan dengan pencarian kata.
   */
  semanticSearch?: (
    question: string,
    opts: { footnotes: boolean },
  ) => Promise<{ passages: number[]; footnotes: number[] }>;
  /**
   * Tinjauan label takhrij (X07) untuk catatan kaki yang disitasi, dari DB app (`surau-api`), dan
   * kunci akun ustadz peninjau terdaftar. Tanpa ini (eval, tes) label kode dipakai apa adanya.
   * Galat pemuatan = label kode ("belum ditinjau").
   */
  takhrijReviews?: {
    load: (footnoteIds: number[]) => Promise<TakhrijReview[]>;
    ustadzKeys: ReadonlySet<string>;
  };
}

// Daftar isi per versi korpus disimpan di isolate: sama untuk semua pertanyaan (313 node Ihya).
const tocMemo = new Map<string, { text: string; nodes: Map<number, AnswerTocNode> }>();
async function loadToc(db: D1Db, corpusVersion: string, editionId: number) {
  const memoKey = `${corpusVersion}:${editionId}`;
  const hit = tocMemo.get(memoKey);
  if (hit) return hit;
  const nodes = await answerToc(db, editionId);
  const value = { text: tocText(nodes), nodes: new Map(nodes.map((n) => [n.id, n])) };
  if (tocMemo.size >= 2) tocMemo.clear();
  tocMemo.set(memoKey, value);
  return value;
}

interface ProviderFailure {
  status: number | null;
  kind: "timeout" | "connection" | "api";
}
function providerFailure(error: unknown): ProviderFailure | null {
  if (error instanceof Anthropic.APIUserAbortError) return null;
  if (error instanceof Anthropic.APIConnectionTimeoutError)
    return { status: null, kind: "timeout" };
  if (error instanceof Anthropic.APIConnectionError) return { status: null, kind: "connection" };
  if (error instanceof Anthropic.APIError)
    return { status: typeof error.status === "number" ? error.status : null, kind: "api" };
  // Body stream yang putus di tengah jawaban dibungkus `MessageStream` menjadi `AnthropicError`
  // dasar (bukan APIError/APIConnectionError): tetap galat penyedia, turun ke Cari (S20 peninjau).
  if (error instanceof Anthropic.AnthropicError) return { status: null, kind: "connection" };
  return null;
}

interface RawBlock {
  text: string;
  citations: TextCitation[];
}

export interface JawabCandidates {
  lists: SearchList[];
  /** Paragraf hasil RRF, sebelum pasangan takhrij ditambahkan. */
  ranked: number[];
  /** Paragraf kandidat beserta pasangannya. */
  passages: Map<number, AnswerPassage>;
  /**
   * Dokumen jawaban: urutan RRF + pasangan dipangkas anggaran token, lalu dikelompokkan per bagian
   * (`orderBySection`, X05); kosong = tanpa kandidat.
   */
  docs: AnswerDoc[];
}

/**
 * Langkah 2 tanpa LLM: pencarian, RRF, pasangan takhrij, dan dokumen dalam anggaran token.
 * Dipakai pipeline dan pengukuran gratis `eval:jawab kandidat` atas rute tersimpan, jadi
 * keduanya selalu menghitung kandidat yang sama.
 */
export async function jawabCandidates(
  db: D1Db,
  question: string,
  route: Route | null,
  toc: ReadonlyMap<number, AnswerTocNode>,
  editionId: number = JAWAB_EDITION_ID,
  /**
   * Peringkat paragraf dari pencarian makna (X13, ADR-093); kosong = tanpa daftar makna.
   * `footnotes` = peringkat catatan kaki saja (ADR-094), dipakai hanya bila `route.hadith`.
   * `limit`/`weight`/`footnoteLimit` hanya diubah eval saat mengukur varian.
   */
  semantic: SemanticInput = { ids: [] },
): Promise<JawabCandidates> {
  const lists = [
    ...(await searchLists(db, question, route, editionId)),
    ...semanticLists(route, semantic),
  ];
  const ranked = fuse(lists);
  const first = await answerPassages(db, ranked);
  const missing = pairIds(first).filter((id) => !ranked.includes(id));
  const extra = missing.length ? await answerPassages(db, missing) : [];
  const passages = new Map([...first, ...extra].map((p) => [p.id, p]));
  const order = withPairs(ranked, passages);
  const labels = new Map([...passages.values()].map((p) => [p.id, docLabel(p)]));
  const budget = Math.min(
    DOC_BUDGET_TOKENS,
    JAWAB_MAX_PROMPT_TOKENS - fixedPromptTokens(question) - 2000,
  );
  const docs = orderBySection(
    fitDocs(
      order.map((id, i) => {
        const p = passages.get(id)!;
        const shown = i < TRANSLATED_DOCS ? p : { ...p, translation: null };
        return buildDoc(shown, docContext(shown, toc, labels));
      }),
      budget,
    ),
  );
  return { lists, ranked, passages, docs };
}

export async function runJawab(deps: JawabDeps, question: string): Promise<JawabResult> {
  const now = deps.now ?? (() => performance.now());
  const started = now();
  const emit = async (e: JawabEvent) => {
    await deps.emit?.(e);
  };
  const db = deps.corpus;
  const usage = emptyTotals();
  const reqOpts = {
    ...(deps.signal ? { signal: deps.signal } : {}),
    ...(deps.headers ? { headers: deps.headers } : {}),
  };
  const meta = await getCorpusMeta(db);
  const corpusVersion = meta.corpus_version ?? "unknown";
  const diagnostics: JawabDiagnostics = {
    route: null,
    search_lists: 0,
    summary_sections: [],
    candidates: 0,
    docs: 0,
    doc_tokens_est: 0,
    prompt_tokens: null,
    over_prompt_limit: false,
    citations_total: 0,
    citations_valid: 0,
    citations_dropped: 0,
    blocks_dropped: 0,
    arabic_removed: 0,
    pipeline_terms: 0,
    ayah_gloss_suspect: 0,
    hadith_unsupported: 0,
    hadith_labeled: 0,
    hadith_reviewed: 0,
    takhrij_reviews_error: false,
    truncated: false,
    refusals: [],
    provider_error: null,
  };
  let passages = new Map<number, AnswerPassage>();
  let ranked: number[] = [];
  const base = (): Omit<
    JawabResult,
    "outcome" | "reason" | "text" | "blocks" | "citations" | "hadith" | "search" | "model"
  > => ({
    prompt_version: JAWAB_PROMPT_VERSION,
    corpus_version: corpusVersion,
    cost_usd: usage.costUsd,
    latency_ms: now() - started,
    usage,
    diagnostics,
  });
  const searchHits = (): JawabSearchHit[] =>
    ranked
      .map((id) => passages.get(id))
      .filter((p): p is AnswerPassage => p !== undefined && p.kind === "body")
      .slice(0, FALLBACK_HITS)
      .map((p) => {
        let end = Math.min(p.text_raw.length, 300);
        if (end < p.text_raw.length) {
          const space = p.text_raw.lastIndexOf(" ", end);
          if (space > 0) end = space;
        }
        return {
          passage_id: p.id,
          char_start: 0,
          char_end: end,
          label: p.location.label,
          permalink: p.location.permalink,
        };
      });
  const fallback = async (reason: FallbackReason, model: ModelId | null): Promise<JawabResult> => {
    const result: JawabResult = {
      outcome: "fallback",
      reason,
      text: "",
      blocks: [],
      citations: [],
      hadith: [],
      search: searchHits(),
      model,
      ...base(),
    };
    await emit({ type: "fallback", result });
    return result;
  };

  // 1. Routing.
  await emit({ type: "stage", stage: "route" });
  const editionId = deps.editionId ?? JAWAB_EDITION_ID;
  const toc = await loadToc(db, corpusVersion, editionId);
  let route: Route | null = null;
  if (deps.savedRoute !== undefined) {
    // Rute tersimpan (eval) dibersihkan dengan aturan yang sama dengan keluaran routing.
    route =
      deps.savedRoute === null ? null : normalizeRoute(deps.savedRoute, new Set(toc.nodes.keys()));
  } else {
    try {
      const msg = await deps.anthropic.messages.create(
        buildRouteRequest(toc.text, question),
        reqOpts,
      );
      addUsage(usage, MODELS.haiku, msg.usage, { batch: false });
      if (msg.stop_reason === "refusal")
        diagnostics.refusals.push({
          model: MODELS.haiku,
          category: msg.stop_details?.category ?? null,
        });
      route = parseRoute(msg, new Set(toc.nodes.keys()));
    } catch (error) {
      const failure = providerFailure(error);
      if (failure === null) throw error;
      diagnostics.provider_error = {
        status: failure.status,
        type: failure.kind,
        stage: "route",
        model: MODELS.haiku,
      };
      await emit({ type: "stage", stage: "retrieve" });
      ranked = fuse(await searchLists(db, question, null, editionId));
      passages = new Map((await answerPassages(db, ranked)).map((p) => [p.id, p]));
      return fallback("provider_error", null);
    }
  }
  diagnostics.route = route;

  // 2. Kandidat.
  await emit({ type: "stage", stage: "retrieve" });
  let semantic = { passages: [] as number[], footnotes: [] as number[] };
  if (deps.semanticSearch) {
    try {
      semantic = await deps.semanticSearch(question, { footnotes: route?.hadith === true });
      diagnostics.semantic = {
        hits: semantic.passages.length,
        footnote_hits: semantic.footnotes.length,
        error: false,
      };
    } catch {
      diagnostics.semantic = { hits: 0, footnote_hits: 0, error: true };
    }
  }
  const found = await jawabCandidates(db, question, route, toc.nodes, editionId, {
    ids: semantic.passages,
    footnotes: semantic.footnotes,
  });
  diagnostics.search_lists = found.lists.length;
  diagnostics.summary_sections = [
    ...new Set(
      found.lists
        .map((l) => l.section_id)
        .filter((id): id is number => id !== null && !(route?.sections ?? []).includes(id)),
    ),
  ];
  ranked = found.ranked;
  diagnostics.candidates = ranked.length;
  passages = found.passages;
  const docs = found.docs;
  if (docs.length === 0) {
    const result: JawabResult = {
      outcome: "not_found",
      reason: "no_candidates",
      text: ANSWER_NOT_FOUND,
      blocks: [{ text: ANSWER_NOT_FOUND, citations: [] }],
      citations: [],
      hadith: [],
      search: [],
      model: null,
      ...base(),
    };
    await emit({ type: "done", result });
    return result;
  }
  diagnostics.docs = docs.length;
  diagnostics.doc_tokens_est = docs.reduce((n, d) => n + d.tokens, 0);

  // 3. Jawaban (Haiku, lalu Sonnet sekali bila Haiku menolak).
  const verified = new Map<string, JawabCitation>();
  const verifySpan = async (span: CitedSpan): Promise<JawabCitation | null> => {
    // `cited_text` dicek dulu: sitasi yang teksnya tidak cocok tidak boleh lolos lewat entri lama.
    if (!span.matches_cited_text) return null;
    const key = `${span.passage_id}:${span.char_start}:${span.char_end}`;
    const known = verified.get(key);
    if (known) return known;
    const source = await resolveEvalSource(db, {
      passage_id: span.passage_id,
      char_start: span.char_start,
      char_end: span.char_end,
    });
    if (source === null) return null;
    const c: JawabCitation = {
      n: verified.size + 1,
      passage_id: span.passage_id,
      char_start: span.char_start,
      char_end: span.char_end,
      kind: span.kind,
      label: source.citation.label,
      permalink: source.citation.permalink,
    };
    verified.set(key, c);
    return c;
  };
  const kept: JawabBlock[] = [];
  let previewing = false;
  // Begitu "Status hadits:" muncul, semua blok sesudahnya tidak dipratinjau: isi statusnya bisa
  // berada di blok berikutnya, dan baru diputuskan `hadithCheck` di hasil akhir.
  let holdPreview = false;
  let pending: JawabBlock[] = [];
  const processBlock = async (raw: RawBlock) => {
    const cleaned = stripArabic(stripCiteTags(raw.text));
    diagnostics.arabic_removed += cleaned.removed;
    const ns: number[] = [];
    let total = 0;
    let dropped = 0;
    for (const citation of raw.citations) {
      total++;
      const spans = citationSpans(citation, docs);
      if (spans === null || spans.length === 0) {
        dropped++;
        continue;
      }
      let ok = 0;
      for (const span of spans) {
        const c = await verifySpan(span);
        if (c !== null) {
          ok++;
          if (!ns.includes(c.n)) ns.push(c.n);
        }
      }
      if (ok < spans.length) dropped++;
    }
    diagnostics.citations_total += total;
    diagnostics.citations_dropped += dropped;
    // Klaim yang semua sitasinya gagal tidak ditampilkan (ARSITEKTUR §5 butir 9).
    if (total > 0 && ns.length === 0) {
      diagnostics.blocks_dropped++;
      return;
    }
    if (cleaned.text.trim() === "" && ns.length === 0) return;
    const block: JawabBlock = { text: cleaned.text, citations: ns };
    kept.push(block);
    // Diperiksa atas gabungan teks: awalan bisa terbelah di dua blok ("Status " | "hadits: …").
    if (!holdPreview && hasHadithPrefix(kept.map((b) => b.text).join(""))) holdPreview = true;
    if (holdPreview) return;
    const cites = () => [...verified.values()].filter((c) => block.citations.includes(c.n));
    if (ns.length > 0 && !previewing) {
      previewing = true;
      for (const b of pending) await emit({ type: "block", block: b, citations: [] });
      pending = [];
    }
    if (previewing) await emit({ type: "block", block, citations: cites() });
    else pending.push(block);
  };

  const attempt = async (model: ModelId): Promise<Message> => {
    const params = buildAnswerRequest(docs, question, model);
    const stream = deps.anthropic.messages.stream(params, reqOpts);
    const open = new Map<number, RawBlock>();
    for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
      if (event.type === "content_block_start" && event.content_block.type === "text")
        open.set(event.index, {
          text: event.content_block.text,
          citations: [...(event.content_block.citations ?? [])],
        });
      else if (event.type === "content_block_delta") {
        const b = open.get(event.index);
        if (b === undefined) continue;
        if (event.delta.type === "text_delta") b.text += event.delta.text;
        else if (event.delta.type === "citations_delta") b.citations.push(event.delta.citation);
      } else if (event.type === "content_block_stop") {
        const b = open.get(event.index);
        if (b !== undefined) {
          open.delete(event.index);
          await processBlock(b);
        }
      }
    }
    const message = await stream.finalMessage();
    addUsage(usage, model, message.usage, { batch: false });
    const prompt = promptTokens(message.usage);
    diagnostics.prompt_tokens = Math.max(diagnostics.prompt_tokens ?? 0, prompt);
    if (prompt > JAWAB_MAX_PROMPT_TOKENS) diagnostics.over_prompt_limit = true;
    return message;
  };

  if (deps.isCancelled?.()) return fallback("cancelled", null);
  await emit({ type: "stage", stage: "answer" });
  let model: ModelId = MODELS.haiku;
  let message: Message | null = null;
  for (const candidate of [MODELS.haiku, MODELS.sonnet] as const) {
    if (candidate === MODELS.sonnet && deps.isCancelled?.()) return fallback("cancelled", model);
    if (
      candidate === MODELS.sonnet &&
      deps.beforeRetry !== undefined &&
      !(await deps.beforeRetry({ ...usage }))
    )
      return fallback("budget", model);
    model = candidate;
    try {
      message = await attempt(candidate);
    } catch (error) {
      const failure = providerFailure(error);
      if (failure === null) throw error;
      diagnostics.provider_error = {
        status: failure.status,
        type: failure.kind,
        stage: "answer",
        model: candidate,
      };
      return fallback("provider_error", candidate);
    }
    if (message.stop_reason !== "refusal") break;
    diagnostics.refusals.push({
      model: candidate,
      category: message.stop_details?.category ?? null,
    });
    // Hasil percobaan yang ditolak tidak dipakai, termasuk sitasi yang sempat terverifikasi.
    kept.length = 0;
    pending = [];
    verified.clear();
    if (previewing) await emit({ type: "reset" });
    previewing = false;
    holdPreview = false;
    if (candidate === MODELS.haiku) await emit({ type: "stage", stage: "retry" });
  }
  if (message === null || message.stop_reason === "refusal") return fallback("refusal", model);
  diagnostics.truncated = message.stop_reason === "max_tokens";

  // 4. Hasil.
  await emit({ type: "stage", stage: "verify" });
  const reviews = await loadReviews(deps, [...verified.values()], passages).catch(() => {
    diagnostics.takhrij_reviews_error = true;
    return new Map<number, EffectiveTakhrijReview>();
  });
  const checked = hadithCheck(kept, [...verified.values()], passages, reviews);
  diagnostics.hadith_unsupported = checked.unsupported;
  diagnostics.hadith_labeled = checked.labeled;
  diagnostics.hadith_reviewed = checked.claims.filter((h) => h.label !== "rule_extracted").length;
  // Status hadits tidak stabil sesudah pemeriksaan ulang: jangan tampilkan apa pun (ragu = tahan).
  if (checked.unresolved) return fallback("unverified", model);
  const citations = checked.citations;
  diagnostics.citations_valid = citations.length;
  const text = checked.blocks
    .map((b) => b.text)
    .join("")
    .trim();
  diagnostics.pipeline_terms = pipelineTerms(text);
  diagnostics.ayah_gloss_suspect = ayahGlossSuspects(text);
  const refusal = refusalKind(text);
  const notFound = refusal !== null;
  if (!notFound && citations.length === 0) return fallback("unverified", model);
  const result: JawabResult = {
    outcome: notFound ? "not_found" : "answer",
    reason: refusal === "false_premise" ? "false_premise" : null,
    text,
    blocks: checked.blocks,
    citations,
    hadith: checked.claims,
    search: notFound ? searchHits() : [],
    model,
    ...base(),
  };
  await emit({ type: "done", result });
  return result;
}

/** Tinjauan efektif untuk catatan kaki takhrij yang disitasi (kosong bila tidak ada pemuat). */
async function loadReviews(
  deps: JawabDeps,
  citations: readonly JawabCitation[],
  passages: ReadonlyMap<number, AnswerPassage>,
): Promise<Map<number, EffectiveTakhrijReview>> {
  const footnotes = [
    ...new Map(
      citations
        .filter((c) => c.kind === "foot")
        .flatMap((c) => {
          const p = passages.get(c.passage_id);
          return p === undefined ? [] : [[p.id, p] as const];
        }),
    ).values(),
  ];
  const source = deps.takhrijReviews;
  if (source === undefined || source.ustadzKeys.size === 0 || footnotes.length === 0)
    return new Map();
  return takhrijReviewsFor(
    footnotes,
    await source.load(footnotes.map((f) => f.id)),
    source.ustadzKeys,
  );
}

/** Batas putaran pemeriksaan ulang; bila belum stabil, jawaban tidak ditampilkan (fallback). */
const HADITH_MAX_PASSES = 6;

/**
 * Klaim status hadits (aturan teks-arab no. 6, ADR-066 butir 1, ADR-069): setiap pernyataan status
 * (per kalimat, lihat `hadithStatements`) hanya sah bila KALIMAT ITU SENDIRI menyitasi catatan kaki
 * takhrij terverifikasi (sesuai prompt: "kalimat itu sendiri harus bersitasi ke dokumen
 * takhrij"); tidak ada pemasangan dengan takhrij dari kalimat lain (peninjau S21: celah "meminjam"
 * takhrij hadits lain). `passage_id` = paragraf badan yang merujuk catatan kaki itu (S16).
 * Sejak X06 isi pernyataan yang sah DIGANTI teks label dari istilah teks takhrij (`takhrijLabel`,
 * dibuat kode), dengan sitasi takhrijnya; kalimat penilaian lanjutan untuk takhrij yang sama dalam
 * satu kelompok dibuang. Klaim (`claims`) dibuat dari STRUKTUR, bukan dari kalimat: setiap
 * catatan kaki takhrij yang disitasi jawaban akhir mendapat satu klaim berlabel, dipasangkan ke
 * paragraf badan yang penandanya merujuk catatan kaki itu (`takhrijClaims`). Jadi status di
 * `claims` dan di baris "Status hadits:" yang bersitasi takhrij tidak pernah tulisan model, dan
 * klaim tidak pernah dipasangkan ke paragraf hadits lain; kalimat penilaian bebas lain di jawaban
 * tetap klaim bersitasi biasa (ADR-069). Pernyataan yang tidak
 * didukung diganti pemberitahuan (blok tersendiri tanpa sitasi). Teks hasil penggantian diperiksa
 * ulang sampai stabil; klaim selalu dihitung dari teks akhir. Bila tetap belum stabil sesudah
 * `HADITH_MAX_PASSES` putaran, `unresolved` = true dan pipeline tidak menampilkan jawaban.
 * Pemberitahuan: "belum diketahui" bila model sendiri menulis begitu atau jawaban tidak menyitasi
 * takhrij sama sekali; selain itu pemberitahuan netral `HADITH_NOT_CITED` (tidak menunjuk takhrij
 * mana pun, karena takhrij yang tersitasi bisa milik hadits lain).
 */
export function hadithCheck(
  blocks: readonly JawabBlock[],
  citations: readonly JawabCitation[],
  passages: ReadonlyMap<number, AnswerPassage>,
  reviews: ReadonlyMap<number, EffectiveTakhrijReview> = new Map(),
): {
  claims: JawabHadith[];
  blocks: JawabBlock[];
  citations: JawabCitation[];
  unsupported: number;
  /** Pernyataan bertakhrij yang isinya diganti teks label (termasuk kalimat lanjutan dibuang). */
  labeled: number;
  unresolved: boolean;
} {
  const byN = new Map(citations.map((c) => [c.n, c]));
  const isFoot = (n: number) => byN.get(n)?.kind === "foot";
  let current = blocks.map((b) => ({ ...b }));
  let unsupported = 0;
  let labeled = 0;
  for (let pass = 0; pass < HADITH_MAX_PASSES; pass++) {
    const { unpaired, relabel } = pairStatements(current, byN, passages, reviews);
    if (unpaired.length === 0 && relabel.length === 0) {
      const used = new Set(current.flatMap((b) => b.citations));
      const claims = takhrijClaims(
        citations.filter((c) => used.has(c.n)),
        passages,
        reviews,
      );
      // Tanpa klaim status sama sekali (tidak ada takhrij tersitasi yang berpemilik), pemberitahuan
      // yang menunjuk bagian "Status hadits" menjadi "belum diketahui".
      // Dengan klaim, pemberitahuan yang berdiri sendiri satu baris dibuang: bagian "Status
      // hadits" sudah memuat status dari takhrij, dan kalimat itu terbaca bertentangan dengan isi
      // jawaban (penilaian agent 2026-10-26, j025–j029). Di butir daftar atau di tengah paragraf
      // pemberitahuan tetap ada, supaya tidak meninggalkan butir kosong atau kalimat rumpang.
      if (claims.length === 0)
        current = current.map((b) =>
          b.citations.length === 0 && b.text.trim() === HADITH_NOT_CITED
            ? { ...b, text: b.text.replace(HADITH_NOT_CITED, HADITH_UNKNOWN) }
            : b,
        );
      else current = dropStandaloneNotices(current);
      return {
        claims,
        blocks: current,
        citations: citations.filter((c) => used.has(c.n)),
        unsupported,
        labeled,
        unresolved: false,
      };
    }
    unsupported += unpaired.length;
    labeled += relabel.length;
    current = replaceRanges(current, [...unpaired, ...relabel], isFoot);
  }
  const used = new Set(current.flatMap((b) => b.citations));
  return {
    claims: [],
    blocks: current,
    citations: citations.filter((c) => used.has(c.n)),
    unsupported,
    labeled,
    unresolved: true,
  };
}

/**
 * Buang blok pemberitahuan `HADITH_NOT_CITED` yang menempati satu baris sendiri (tanpa penanda
 * daftar, tanpa teks lain di baris itu), beserta baris kosong yang ditinggalkannya.
 */
function dropStandaloneNotices(blocks: readonly JawabBlock[]): JawabBlock[] {
  const out = blocks.map((b) => ({ ...b }));
  for (let i = out.length - 1; i >= 0; i--) {
    const b = out[i]!;
    if (b.citations.length > 0 || b.text.trim() !== HADITH_NOT_CITED) continue;
    const before = out
      .slice(0, i)
      .map((x) => x.text)
      .join("");
    const after = out
      .slice(i + 1)
      .map((x) => x.text)
      .join("");
    if (!/(?:^|\n)[ \t\u00A0]*$/u.test(before) || !/^[ \t\u00A0]*(?:\r?\n|$)/u.test(after))
      continue;
    out.splice(i, 1);
    // Rapikan baris kosong: blok sesudahnya kehilangan baris baru di depannya bila sebelumnya
    // sudah berakhir dengan baris baru; di akhir jawaban spasi tepi blok sebelumnya dibuang.
    const prev = out[i - 1];
    const next = out[i];
    if (next === undefined) {
      if (prev !== undefined) prev.text = prev.text.trimEnd();
    } else if (prev === undefined || /\n[ \t\u00A0]*$/u.test(prev.text)) {
      // Pemisah paragraf yang tersisa = yang terpanjang dari kedua sisi (biasanya satu baris kosong).
      const lead = /^\s*/u.exec(next.text)![0].split("\n").length - 1;
      const trail = prev === undefined ? 0 : /\s*$/u.exec(prev.text)![0].split("\n").length - 1;
      next.text =
        "\n".repeat(prev === undefined ? 0 : Math.max(0, lead - trail)) +
        next.text.replace(/^\s+/u, "");
    }
  }
  return out.filter((b) => b.text !== "" || b.citations.length > 0);
}

interface Span {
  start: number;
  end: number;
  /** Teks pengganti: `HADITH_UNKNOWN`/`HADITH_NOT_CITED`, teks label, atau "" (dibuang). */
  notice: string;
  /** Sitasi blok pengganti: takhrij untuk teks label, kosong untuk pemberitahuan. */
  citations: number[];
}

/**
 * Rentang yang diganti untuk status tak didukung: penanda Markdown di depan s.d. akhir kalimat.
 * Pernyataan model yang sendiri berbunyi "belum diketahui" tetap diganti "belum diketahui";
 * selain itu pemberitahuan netral (lihat `HADITH_NOT_CITED`).
 */
function replacementRange(full: string, st: HadithStatement): Span {
  return {
    start: markdownStart(full, st),
    end: st.end,
    notice: st.unknown ? HADITH_UNKNOWN : HADITH_NOT_CITED,
    citations: [],
  };
}

const markdownStart = (full: string, st: HadithStatement) => {
  let start = st.start;
  while (start > 0 && /[*_]/u.test(full[start - 1]!)) start--;
  return start;
};

/**
 * Label untuk BAGIAN catatan kaki yang disitasi (biasanya seluruhnya): batas lafaz dinilai dari teks
 * utuh, istilah dan teks status hanya dari bagian itu, supaya setiap istilah yang disebut status
 * punya frasa Arab di potongan yang ditampilkan. Tinjauan penilai (X07) berlaku bila bagian itu
 * memuat semua istilah yang ditinjau (`reviewedTakhrijLabel`).
 */
const citedLabel = (
  footnote: AnswerPassage,
  c: { char_start: number; char_end: number },
  reviews: ReadonlyMap<number, EffectiveTakhrijReview>,
): ReviewedTakhrijLabel =>
  reviewedTakhrijLabel(footnote.text_raw, reviews.get(footnote.id) ?? null, {
    start: c.char_start,
    end: c.char_end,
  });

const CLAIM_LABEL = {
  rule: "rule_extracted",
  approved: "ustadz_reviewed",
  corrected: "ustadz_corrected",
} as const satisfies Record<ReviewedTakhrijLabel["review"], JawabHadith["label"]>;

/**
 * Teks label satu pernyataan (kode): status tiap takhrij + lokasi haditsnya (halaman catatan kaki =
 * halaman penandanya), supaya label di butir daftar tetap jelas milik hadits mana. Awalan
 * "Status hadits:" hanya bila pernyataannya berawalan.
 */
function labelText(
  st: HadithStatement,
  cited: readonly { c: JawabCitation; footnote: AnswerPassage }[],
  reviews: ReadonlyMap<number, EffectiveTakhrijReview>,
): string {
  const body = cited
    .map(
      ({ c, footnote }) =>
        `${citedLabel(footnote, c, reviews).text} (hadits di Ihya j. ${footnote.location.juz}, h. ${footnote.location.page_no})`,
    )
    .join("; ");
  return st.prefixed ? `${ANSWER_HADITH_PREFIX} ${body}.` : `${body}.`;
}

/** Klaim status dari label takhrij (kode); `passage_id` = paragraf badan yang merujuknya. */
function claimOf(
  body: number,
  c: JawabCitation,
  footnote: AnswerPassage,
  reviews: ReadonlyMap<number, EffectiveTakhrijReview>,
): JawabHadith {
  const label = citedLabel(footnote, c, reviews);
  return {
    passage_id: body,
    footnote: { passage_id: c.passage_id, char_start: c.char_start, char_end: c.char_end },
    status: label.text,
    label: CLAIM_LABEL[label.review],
    rules_version: label.version,
    mixed: label.mixed,
    terms: label.terms,
    added_terms: label.added,
  };
}

/**
 * Sitasi catatan kaki yang sungguh takhrij (bukan catatan penyunting/teks tak dikenali), dinilai
 * dari teks catatan kaki UTUH: segmen catatan kaki panjang tanpa penanda pembuka tetap takhrij.
 */
function isTakhrijCitation(
  c: JawabCitation | undefined,
  passages: ReadonlyMap<number, AnswerPassage>,
): c is JawabCitation {
  if (c?.kind !== "foot") return false;
  const footnote = passages.get(c.passage_id);
  return footnote !== undefined && takhrijLabel(footnote.text_raw).kind !== "not_takhrij";
}

/**
 * Klaim status dari struktur (X06): satu per catatan kaki takhrij yang disitasi (urut nomor
 * sitasi), dengan paragraf badan pertama yang merujuknya; catatan kaki tanpa paragraf perujuk atau
 * yang bukan takhrij (catatan penyunting, teks tak dikenali) dilewati.
 */
function takhrijClaims(
  cited: readonly JawabCitation[],
  passages: ReadonlyMap<number, AnswerPassage>,
  reviews: ReadonlyMap<number, EffectiveTakhrijReview>,
): JawabHadith[] {
  const seen = new Set<number>();
  const out: JawabHadith[] = [];
  for (const c of [...cited].sort((a, b) => a.n - b.n)) {
    if (!isTakhrijCitation(c, passages) || seen.has(c.passage_id)) continue;
    seen.add(c.passage_id);
    const footnote = passages.get(c.passage_id)!;
    const body = footnote.referenced_by[0];
    if (body === undefined) continue;
    out.push(claimOf(body, c, footnote, reviews));
  }
  return out;
}

/** Tanda baca, spasi, dan penanda Markdown/daftar di tepi blok: tidak dihitung "menyentuh". */
const EDGE = /[\s.,;:!?*_\-–—•·()]/u;
/** Ada isi (bukan hanya tanda baca, spasi, atau penanda). */
const CONTENT = /[^\s.,;:!?*_\-–—•·()]/u;

/**
 * Satu putaran: setiap pernyataan (selain pemberitahuan pengganti) dipasangkan dengan catatan kaki
 * takhrij yang disitasi blok-blok yang ISINYA (tanpa tanda baca/spasi di tepi) menyentuh rentang
 * kepemilikannya ([start, ownEnd)). Kelompok = kalimat dari satu baris label atau satu butir
 * (satu hadits). Blok bersitasi yang menyentuh lebih dari satu kelompok ambigu; catatan kaki (per
 * `passage_id`) yang disitasi lebih dari satu kelompok tidak mendukung siapa pun. Satu pernyataan
 * boleh menyitasi beberapa takhrij; satu label per (kelompok, takhrij). Pernyataan yang sah dan
 * isinya belum sama dengan teks label masuk `relabel`; kalimat lanjutan yang semua takhrijnya
 * sudah berlabel di kelompoknya dibuang (`relabel` dengan teks kosong).
 */
function pairStatements(
  blocks: readonly JawabBlock[],
  byN: ReadonlyMap<number, JawabCitation>,
  passages: ReadonlyMap<number, AnswerPassage>,
  reviews: ReadonlyMap<number, EffectiveTakhrijReview>,
): { unpaired: Span[]; relabel: Span[] } {
  const full = blocks.map((b) => b.text).join("");
  let offset = 0;
  const ranges = blocks.map((b) => {
    let start = offset;
    let end = offset + b.text.length;
    offset = end;
    while (start < end && EDGE.test(full[start]!)) start++;
    while (end > start && EDGE.test(full[end - 1]!)) end--;
    return { start, end, citations: b.citations };
  });
  const statements = hadithStatements(full);
  const touches = (r: { start: number; end: number }, st: HadithStatement) =>
    r.end > r.start && r.end > st.start && r.start < st.ownEnd;
  // Blok bersitasi yang menyentuh pernyataan dari lebih dari satu KELOMPOK: tidak jelas takhrijnya
  // milik hadits mana, jadi tidak dipakai siapa pun. Dua kalimat satu kelompok tidak ambigu.
  const ambiguous = new Set(
    ranges.filter(
      (r) =>
        r.citations.length > 0 &&
        new Set(statements.filter((st) => touches(r, st)).map((st) => st.group)).size > 1,
    ),
  );
  const owned = statements.map((st) => [
    ...new Map(
      ranges
        .filter((r) => !ambiguous.has(r) && touches(r, st))
        .flatMap((r) => r.citations)
        .map((n) => byN.get(n))
        .filter((c): c is JawabCitation => isTakhrijCitation(c, passages))
        .map((c) => [c.passage_id, c]),
    ).values(),
  ]);
  // Takhrij (per paragraf catatan kaki) yang disitasi lebih dari satu KELOMPOK (baris label/butir):
  // paling banyak satu yang benar, jadi tidak mendukung siapa pun. Dalam satu kelompok boleh.
  const groupsOf = new Map<number, Set<number>>();
  statements.forEach((st, k) => {
    for (const c of owned[k]!) {
      const set = groupsOf.get(c.passage_id) ?? new Set<number>();
      set.add(st.group);
      groupsOf.set(c.passage_id, set);
    }
  });
  const claimed = new Set<string>();
  const unpaired: Span[] = [];
  const relabel: Span[] = [];
  statements.forEach((st, k) => {
    const fresh: JawabCitation[] = [];
    let supported = false;
    for (const c of owned[k]!) {
      const footnote = passages.get(c.passage_id);
      const body = footnote?.referenced_by[0];
      if (footnote === undefined || body === undefined || groupsOf.get(c.passage_id)!.size > 1)
        continue;
      supported = true;
      // Satu klaim per (kelompok, takhrij); takhrij yang sudah berlabel di kelompok ini tidak
      // diulang di kalimat lanjutan.
      const key = `${st.group}:${c.passage_id}`;
      if (claimed.has(key)) continue;
      claimed.add(key);
      fresh.push(c);
    }
    if (!supported) {
      unpaired.push(replacementRange(full, st));
      return;
    }
    // Isi pernyataan = teks label (kode); kalimat lanjutan tanpa takhrij baru dibuang beserta
    // spasi di depannya (bukan baris baru). Sitasi paragraf hadits pemilik takhrij yang ada di
    // kalimat itu ikut dipertahankan pada blok label.
    let start = markdownStart(full, st);
    const cited = fresh.map((c) => ({ c, footnote: passages.get(c.passage_id)! }));
    const text = cited.length === 0 ? "" : labelText(st, cited, reviews);
    if (text === "") while (start > 0 && /[ \t\u00A0]/u.test(full[start - 1]!)) start--;
    const owners = new Set(cited.flatMap(({ footnote }) => footnote.referenced_by));
    const bodyNs = ranges
      .filter((r) => touches(r, st))
      .flatMap((r) => r.citations)
      .filter((n) => {
        const b = byN.get(n);
        return b?.kind === "body" && owners.has(b.passage_id);
      });
    const keep = text === "" ? [] : [...new Set([...fresh.map((c) => c.n), ...bodyNs])];
    if (full.slice(start, st.end) !== text)
      relabel.push({ start, end: st.end, notice: text, citations: keep });
  });
  return { unpaired, relabel };
}

/** Potongan yang isinya hanya spasi, tanda baca, angka, atau penanda daftar/Markdown. */
const trivial = (text: string) => /^[\s.,;:!?*_\-–—•·()\d]*$/u.test(text);

/**
 * Ganti rentang dengan blok pengganti: pemberitahuan (`HADITH_UNKNOWN`/`HADITH_NOT_CITED`, TANPA
 * sitasi, digabung bila bertumpuk atau hanya dipisah spasi) supaya penanda [n] blok asli tidak
 * menempel padanya; teks label dengan sitasi takhrijnya sendiri (X06, tidak digabung); atau teks
 * kosong (dibuang). Potongan blok yang tersisa: bila bagian yang diganti memuat isi blok, sitasi
 * takhrij DIBUANG (tidak jelas milik pernyataan mana, peninjau S21), sitasi lain tetap; potongan
 * yang isinya remeh tanpa sitasi; potongan kosong dibuang. Pengganti yang langsung diikuti teks
 * diberi spasi.
 */
function replaceRanges(
  blocks: readonly JawabBlock[],
  spans: readonly Span[],
  isFoot: (n: number) => boolean,
): JawabBlock[] {
  if (spans.length === 0) return blocks.map((b) => ({ ...b }));
  const full = blocks.map((b) => b.text).join("");
  const merged: Span[] = [];
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    // Pemberitahuan bertumpuk atau hanya dipisah spasi (bukan baris baru): satu saja. Teks label
    // (bersitasi) tidak pernah digabung.
    if (
      last !== undefined &&
      last.citations.length === 0 &&
      s.citations.length === 0 &&
      /^[ \t\u00A0]*$/u.test(full.slice(last.end, Math.max(last.end, s.start)))
    ) {
      last.end = Math.max(last.end, s.end);
      if (s.notice !== last.notice) last.notice = HADITH_NOT_CITED;
    } else merged.push({ ...s });
  }
  const notice = (u: Span) =>
    u.notice !== "" && u.end < full.length && !/\s/u.test(full[u.end]!) ? `${u.notice} ` : u.notice;
  const out: JawabBlock[] = [];
  let offset = 0;
  for (const b of blocks) {
    const rs = offset;
    const re = offset + b.text.length;
    offset = re;
    const hits = merged.filter((u) => u.end > rs && u.start < re);
    if (hits.length === 0) {
      out.push({ ...b });
      continue;
    }
    // Bila bagian yang diganti memuat ISI blok (bukan hanya tanda baca/spasi), sitasi takhrij blok
    // itu tidak jelas milik bagian mana: potongan sisanya tidak membawanya (peninjau S21).
    const removedContent = hits.some((u) =>
      CONTENT.test(full.slice(Math.max(u.start, rs), Math.min(u.end, re))),
    );
    const piece = (text: string) => {
      if (text === "") return;
      const kept = removedContent ? b.citations.filter((n) => !isFoot(n)) : b.citations;
      out.push({ text, citations: trivial(text) ? [] : kept });
    };
    let cursor = rs;
    for (const u of hits) {
      if (u.start > cursor) piece(b.text.slice(cursor - rs, Math.min(u.start, re) - rs));
      if (u.start >= rs && u.start < re && u.notice !== "")
        out.push({ text: notice(u), citations: u.citations });
      cursor = Math.max(cursor, Math.min(u.end, re));
    }
    if (cursor < re) piece(b.text.slice(cursor - rs));
  }
  return out;
}

/** Klaim status hadits saja (lihat `hadithCheck`). */
export function hadithClaims(
  blocks: readonly JawabBlock[],
  citations: readonly JawabCitation[],
  passages: ReadonlyMap<number, AnswerPassage>,
  reviews?: ReadonlyMap<number, EffectiveTakhrijReview>,
): JawabHadith[] {
  return hadithCheck(blocks, citations, passages, reviews).claims;
}

export { HADITH_NOT_CITED, HADITH_UNKNOWN };
export type { AnswerDoc };
