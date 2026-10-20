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
import { answerPassages, answerToc, resolveEvalSource } from "@surau/core";
import type { AnswerPassage, AnswerTocNode, SourceSpan } from "@surau/core";
import { getCorpusMeta } from "@surau/db";
import type { D1Db } from "@surau/db";

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
} from "./answer.ts";
import { citationSpans, hadithStatements, refusalKind, stripArabic } from "./citations.ts";
import type { CitedSpan } from "./citations.ts";
import { buildDoc, docContext, docLabel } from "./documents.ts";
import type { AnswerDoc } from "./documents.ts";
import { fuse, pairIds, searchLists, withPairs } from "./retrieve.ts";
import { ROUTE_PROMPT, buildRouteRequest, parseRoute, tocText } from "./route.ts";
import type { Route } from "./route.ts";

export const JAWAB_PROMPT_VERSION = `${ANSWER_PROMPT.id}+${ROUTE_PROMPT.id}`;
/** Edisi default Ihya (satu-satunya kitab di Fase 4). */
export const JAWAB_EDITION_ID = 1;
export const QUESTION_MAX_CHARS = 1000;
const FALLBACK_HITS = 5;

export type JawabStage = "route" | "retrieve" | "answer" | "retry" | "verify";
export type FallbackReason = "no_candidates" | "unverified" | "refusal" | "provider_error";
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
  /** Ringkasan status dari takhrij, ditulis model: label `ai_extracted` sampai direview. */
  status: string;
  label: "ai_extracted";
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
  search_lists: number;
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
  truncated: boolean;
  refusals: JawabRefusal[];
  provider_error: { status: number | null; type: string } | null;
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
  return null;
}

interface RawBlock {
  text: string;
  citations: TextCitation[];
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
    hadith_unsupported: 0,
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
  const toc = await loadToc(db, corpusVersion, deps.editionId ?? JAWAB_EDITION_ID);
  let route: Route | null = null;
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
    diagnostics.provider_error = { status: failure.status, type: failure.kind };
    await emit({ type: "stage", stage: "retrieve" });
    ranked = fuse(await searchLists(db, question, null));
    passages = new Map((await answerPassages(db, ranked)).map((p) => [p.id, p]));
    return fallback("provider_error", null);
  }
  diagnostics.route = route;

  // 2. Kandidat.
  await emit({ type: "stage", stage: "retrieve" });
  const lists = await searchLists(db, question, route);
  diagnostics.search_lists = lists.length;
  ranked = fuse(lists);
  diagnostics.candidates = ranked.length;
  const first = await answerPassages(db, ranked);
  const missing = pairIds(first).filter((id) => !ranked.includes(id));
  const extra = missing.length ? await answerPassages(db, missing) : [];
  passages = new Map([...first, ...extra].map((p) => [p.id, p]));
  const order = withPairs(ranked, passages);
  if (order.length === 0) {
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
  const labels = new Map([...passages.values()].map((p) => [p.id, docLabel(p)]));
  const budget = Math.min(
    DOC_BUDGET_TOKENS,
    JAWAB_MAX_PROMPT_TOKENS - fixedPromptTokens(question) - 2000,
  );
  const docs = fitDocs(
    order.map((id, i) => {
      const p = passages.get(id)!;
      const shown = i < TRANSLATED_DOCS ? p : { ...p, translation: null };
      return buildDoc(shown, docContext(shown, toc.nodes, labels));
    }),
    budget,
  );
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
  let pending: JawabBlock[] = [];
  const processBlock = async (raw: RawBlock) => {
    const cleaned = stripArabic(raw.text);
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
    // Klaim yang semua sitasinya gagal tidak ditampilkan (ARSITEKTUR §5 butir 7).
    if (total > 0 && ns.length === 0) {
      diagnostics.blocks_dropped++;
      return;
    }
    if (cleaned.text.trim() === "" && ns.length === 0) return;
    const block: JawabBlock = { text: cleaned.text, citations: ns };
    kept.push(block);
    // Kalimat status hadits baru diputuskan di akhir (`hadithCheck`): tidak dipratinjau.
    if (block.text.includes(ANSWER_HADITH_PREFIX)) return;
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

  await emit({ type: "stage", stage: "answer" });
  let model: ModelId = MODELS.haiku;
  let message: Message | null = null;
  for (const candidate of [MODELS.haiku, MODELS.sonnet] as const) {
    model = candidate;
    try {
      message = await attempt(candidate);
    } catch (error) {
      const failure = providerFailure(error);
      if (failure === null) throw error;
      diagnostics.provider_error = { status: failure.status, type: failure.kind };
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
    if (candidate === MODELS.haiku) await emit({ type: "stage", stage: "retry" });
  }
  if (message === null || message.stop_reason === "refusal") return fallback("refusal", model);
  diagnostics.truncated = message.stop_reason === "max_tokens";

  // 4. Hasil.
  await emit({ type: "stage", stage: "verify" });
  const checked = hadithCheck(kept, [...verified.values()], passages);
  diagnostics.hadith_unsupported = checked.unsupported;
  const citations = checked.citations;
  diagnostics.citations_valid = citations.length;
  const text = checked.blocks
    .map((b) => b.text)
    .join("")
    .trim();
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

/** Pengganti kalimat status hadits yang tidak didukung takhrij tersitasi (aturan teks-arab no. 6). */
export const HADITH_UNKNOWN = `${ANSWER_HADITH_PREFIX} belum diketahui (tidak ada takhrij al-'Iraqi yang tersitasi untuk kalimat ini).`;

/**
 * Klaim status hadits: kalimat "Status hadits: …" yang didukung sitasi catatan kaki terverifikasi
 * (di kalimat itu, atau takhrij yang disitasi di paragraf yang sama: terdekat sebelum, lalu sesudah).
 * `passage_id` = paragraf badan yang merujuk catatan kaki itu (takhrij tertaut, S16). Kalimat
 * status yang TIDAK didukung diganti `HADITH_UNKNOWN` di blok jawaban, sehingga status tanpa
 * takhrij tidak pernah tampil (temuan peninjau S19). Sitasi yang tak lagi dirujuk blok dibuang.
 */
export function hadithCheck(
  blocks: readonly JawabBlock[],
  citations: readonly JawabCitation[],
  passages: ReadonlyMap<number, AnswerPassage>,
): {
  claims: JawabHadith[];
  blocks: JawabBlock[];
  citations: JawabCitation[];
  unsupported: number;
} {
  const claims: JawabHadith[] = [];
  const full = blocks.map((b) => b.text).join("");
  let offset = 0;
  const ranges = blocks.map((b) => {
    const r = { start: offset, end: offset + b.text.length, block: b };
    offset = r.end;
    return r;
  });
  const footOf = (ns: readonly number[]) =>
    ns
      .map((n) => citations.find((x) => x.n === n))
      .filter((c): c is JawabCitation => c !== undefined && c.kind === "foot");
  const unpaired: { start: number; end: number }[] = [];
  for (const st of hadithStatements(full)) {
    let foots = footOf(
      ranges
        .filter((r) => r.end > st.start && r.start < st.end + 1)
        .flatMap((r) => r.block.citations),
    );
    // Kalimat status tanpa sitasi sendiri: pakai takhrij yang disitasi di paragraf yang sama,
    // yang terdekat sebelumnya, atau bila tidak ada, yang terdekat sesudahnya (model sering
    // menyitasi takhrij di kalimat sebelum atau sesudah "Status hadits:").
    if (foots.length === 0) {
      const paragraphStart = full.lastIndexOf("\n\n", st.start) + 1;
      const nextBreak = full.indexOf("\n\n", st.end);
      const paragraphEnd = nextBreak < 0 ? full.length : nextBreak;
      const before = ranges.filter((r) => r.start >= paragraphStart - 1 && r.end <= st.start);
      const after = ranges.filter((r) => r.start >= st.end && r.start < paragraphEnd);
      const prev = footOf(before.flatMap((r) => r.block.citations)).at(-1);
      const nextFoot = footOf(after.flatMap((r) => r.block.citations))[0];
      const pick = prev ?? nextFoot;
      foots = pick ? [pick] : [];
    }
    let paired = false;
    for (const c of foots) {
      const body = passages.get(c.passage_id)?.referenced_by[0];
      if (body === undefined) continue;
      paired = true;
      if (
        claims.some(
          (h) => h.footnote.passage_id === c.passage_id && h.footnote.char_start === c.char_start,
        )
      )
        continue;
      claims.push({
        passage_id: body,
        footnote: { passage_id: c.passage_id, char_start: c.char_start, char_end: c.char_end },
        status: st.status,
        label: "ai_extracted",
      });
    }
    if (!paired)
      unpaired.push({ start: st.start, end: full[st.end] === "." ? st.end + 1 : st.end });
  }
  // Ganti dari belakang supaya offset kalimat sebelumnya tetap berlaku.
  const texts = blocks.map((b) => b.text);
  for (const u of [...unpaired].reverse()) {
    ranges.forEach((r, i) => {
      if (r.end <= u.start || r.start >= u.end) return;
      const ls = Math.max(u.start, r.start) - r.start;
      const le = Math.min(u.end, r.end) - r.start;
      const insert = u.start >= r.start && u.start < r.end ? HADITH_UNKNOWN : "";
      texts[i] = texts[i]!.slice(0, ls) + insert + texts[i]!.slice(le);
    });
  }
  const kept = blocks
    .map((b, i) => ({ text: texts[i]!, citations: b.citations }))
    .filter((b) => b.text.trim() !== "");
  const used = new Set(kept.flatMap((b) => b.citations));
  return {
    claims: claims.slice(0, 5),
    blocks: kept,
    citations: citations.filter((c) => used.has(c.n)),
    unsupported: unpaired.length,
  };
}

/** Klaim status hadits saja (lihat `hadithCheck`). */
export function hadithClaims(
  blocks: readonly JawabBlock[],
  citations: readonly JawabCitation[],
  passages: ReadonlyMap<number, AnswerPassage>,
): JawabHadith[] {
  return hadithCheck(blocks, citations, passages).claims;
}

export type { AnswerDoc };
