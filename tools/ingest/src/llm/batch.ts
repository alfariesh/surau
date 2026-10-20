// Alur Message Batches S13 (langkah 4, 6, 7, 9): rencana + count_tokens (gratis), kirim (berbayar,
// butuh --confirm setelah pemilik menyetujui biaya di chat), status, kumpulkan + validasi, dan ulang.
// Hasil datang dalam urutan acak: semua pencocokan lewat custom_id. Setiap hasil dibandingkan dengan
// unit yang dibangun ulang dari sumber (hash sumber), jadi hasil untuk teks yang sudah berubah ditolak.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageBatchResult,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import {
  CUSTOM_ID_PATTERN,
  MAX_PROMPT_TOKENS,
  MODELS,
  SUMMARY_LANGS,
  SUMMARY_PROMPT,
  TRANSLATE_PROMPT,
  addUsage,
  buildSummaryRequest,
  buildSummaryRound2Request,
  buildTranslateRequest,
  checkSummary,
  checkTranslation,
  contentLength,
  emptyTotals,
  isModelId,
  messageText,
  passageCustomId,
  ratesFor,
  stopProblem,
  tocRound2CustomId,
} from "@surau/llm";
import type { ModelId, SummaryLang, UsageTotals } from "@surau/llm";
import { z } from "zod";

import type { LlmContext } from "./cli.ts";
import { mapPool } from "./pool.ts";
import { REVIEW_FILE, loadReviews, rejectionFor } from "./reviews.ts";
import type { ReviewRejections } from "./reviews.ts";
import {
  acceptedSummary,
  acceptedTranslation,
  batchKind,
  failure,
  llmDir,
  readBatches,
  readJsonl,
  storedUsage,
  writeBatches,
  writeJsonl,
  writeText,
} from "./store.ts";
import type {
  AcceptedSummary,
  AcceptedTranslation,
  BatchKind,
  BatchRecord,
  Failure,
} from "./store.ts";
import {
  buildWork,
  chunkCustomId,
  parseCustomId,
  relativeHeading,
  round2InputSha,
} from "./work.ts";
import type { Work } from "./work.ts";

/** Request per batch: jauh di bawah batas 100.000 request / 256 MB (±17 KB per request). */
export const BATCH_MAX_REQUESTS = 4_000;
/** Percobaan maksimal per custom_id (1 + 2 ulangan); sesudahnya dicatat gagal. */
export const MAX_ATTEMPTS = 3;
/** Skenario baca cache prefix sistem untuk estimasi (batch: best-effort, docs 30–98%). */
export const CACHE_SCENARIOS = [0.95, 0.5, 0] as const;

export const plannedRequest = z.strictObject({
  custom_id: z.string().regex(CUSTOM_ID_PATTERN),
  kind: z.enum(["translation", "summary-r1", "summary-r2"]),
  prompt_version: z.string(),
  source_sha256: z.string().length(64),
  source_chars: z.number().int().nonnegative(),
  /** Perkiraan biaya batch request ini (skenario cache 50%), diisi `plan`; dasar pengaman anggaran. */
  est_usd: z.number().nonnegative().optional(),
  /** Putaran 2: sha256 teks ringkasan putaran 1 yang dikirim (lihat `round2InputSha`). */
  input_sha256: z.string().length(64).optional(),
  params: z.custom<MessageCreateParamsNonStreaming>((v) => typeof v === "object" && v !== null),
});
export type PlannedRequest = z.infer<typeof plannedRequest>;

interface Accepted {
  translations: Map<number, AcceptedTranslation>;
  /** Ringkasan putaran 1 yang lolos, per custom_id. */
  r1: Map<string, AcceptedSummary>;
  /** Ringkasan final per `${tocNodeId}-${lang}`. */
  final: Map<string, AcceptedSummary>;
  failures: Failure[];
}

function readAccepted(dir: string): Accepted {
  const r1 = new Map<string, AcceptedSummary>();
  for (const s of readJsonl(join(dir, "summary-r1.jsonl"), acceptedSummary)) r1.set(s.custom_id, s);
  const final = new Map<string, AcceptedSummary>();
  for (const s of readJsonl(join(dir, "summary.jsonl"), acceptedSummary)) {
    final.set(`${s.toc_node_id}-${s.lang}`, s);
  }
  const translations = new Map<number, AcceptedTranslation>();
  for (const t of readJsonl(join(dir, "translation.jsonl"), acceptedTranslation)) {
    translations.set(t.passage_id, t);
  }
  return { translations, r1, final, failures: readJsonl(join(dir, "failures.jsonl"), failure) };
}

// ── Menyusun request ─────────────────────────────────────────────────────────────────────

function translationRequest(work: Work, passageId: number, model: ModelId): PlannedRequest | null {
  const u = work.units.get(passageId);
  if (u === undefined) return null;
  return {
    custom_id: passageCustomId(passageId),
    kind: "translation",
    prompt_version: TRANSLATE_PROMPT.id,
    source_sha256: u.sourceSha256,
    source_chars: contentLength(u.masked.text),
    params: buildTranslateRequest(u, model),
  };
}

function r1Request(work: Work, customId: string, model: ModelId): PlannedRequest | null {
  const c = work.chunkById.get(customId);
  const parts = parseCustomId(customId);
  if (c === undefined || parts?.kind !== "toc") return null;
  return {
    custom_id: customId,
    kind: "summary-r1",
    prompt_version: SUMMARY_PROMPT.id,
    source_sha256: c.sourceSha256,
    source_chars: contentLength(c.text),
    params: buildSummaryRequest({ ...c, lang: parts.lang }, model),
  };
}

/** Request putaran 2; `null` bila ada potongan subpohon yang belum punya ringkasan putaran 1. */
function r2Request(
  work: Work,
  acc: Accepted,
  tocNodeId: number,
  lang: SummaryLang,
  model: ModelId,
): PlannedRequest | null {
  const n = work.nodeById.get(tocNodeId);
  if (n === undefined || !n.round2) return null;
  const children: { heading: string; summary: string }[] = [];
  for (const c of n.subtree) {
    const s = acc.r1.get(chunkCustomId(c, lang));
    if (s === undefined || s.source_sha256 !== c.sourceSha256) return null;
    children.push({ heading: relativeHeading(n, c), summary: s.text });
  }
  const input = round2InputSha(n, lang, acc.r1);
  if (input === null) return null;
  return {
    custom_id: tocRound2CustomId(tocNodeId, lang),
    kind: "summary-r2",
    prompt_version: SUMMARY_PROMPT.id,
    source_sha256: n.sourceSha256,
    input_sha256: input,
    source_chars: children.reduce((a, c) => a + c.summary.length, 0),
    params: buildSummaryRound2Request({ tocNodeId, heading: n.heading, lang, children }, model),
  };
}

/** Request yang masih perlu dikirim untuk satu putaran (yang sudah lolos dengan hash sama dilewati). */
export function pendingRequests(work: Work, acc: Accepted, round: 1 | 2): PlannedRequest[] {
  const out: PlannedRequest[] = [];
  // Yang pernah gagal untuk sumber yang SAMA diulang lewat `retry` (hitungan percobaan, refusal →
  // Sonnet), bukan di sini. Kegagalan untuk sumber lama (hash beda) tidak dihitung.
  const failed = new Set(acc.failures.map((f) => `${f.custom_id}:${f.source_sha256}`));
  if (round === 1) {
    for (const u of work.units.values()) {
      if (acc.translations.get(u.passageId)?.source_sha256 === u.sourceSha256) continue;
      if (failed.has(`${passageCustomId(u.passageId)}:${u.sourceSha256}`)) continue;
      const r = translationRequest(work, u.passageId, MODELS.haiku);
      if (r !== null) out.push(r);
    }
    for (const c of work.chunks) {
      for (const lang of SUMMARY_LANGS) {
        const id = chunkCustomId(c, lang);
        if (acc.r1.get(id)?.source_sha256 === c.sourceSha256) continue;
        if (failed.has(`${id}:${c.sourceSha256}`)) continue;
        const r = r1Request(work, id, MODELS.haiku);
        if (r !== null) out.push(r);
      }
    }
    return out;
  }
  for (const n of work.nodes) {
    if (!n.round2) continue;
    for (const lang of SUMMARY_LANGS) {
      if (acc.final.get(`${n.tocNodeId}-${lang}`)?.source_sha256 === n.sourceSha256) continue;
      if (failed.has(`${tocRound2CustomId(n.tocNodeId, lang)}:${n.sourceSha256}`)) continue;
      const r = r2Request(work, acc, n.tocNodeId, lang, MODELS.haiku);
      if (r !== null) out.push(r);
    }
  }
  return out;
}

// ── count_tokens + estimasi ──────────────────────────────────────────────────────────────

function paramsKey(p: MessageCreateParamsNonStreaming): string {
  return createHash("sha256")
    .update(JSON.stringify([p.model, p.system, p.messages]))
    .digest("hex");
}

/** Hitung token prompt setiap request (cache di counts.json supaya rencana ulang tidak menghitung ulang). */
async function countAll(
  client: Anthropic,
  dir: string,
  reqs: readonly PlannedRequest[],
): Promise<Map<string, number>> {
  const path = join(dir, "counts.json");
  const cache = new Map<string, number>(
    existsSync(path)
      ? Object.entries(
          z.record(z.string(), z.number()).parse(JSON.parse(readFileSync(path, "utf8"))),
        )
      : [],
  );
  const todo = reqs.filter((r) => !cache.has(paramsKey(r.params)));
  let saved = Date.now();
  await mapPool(
    todo,
    16,
    async (r) => {
      const { input_tokens } = await client.messages.countTokens({
        model: r.params.model,
        system: r.params.system,
        messages: r.params.messages,
      });
      cache.set(paramsKey(r.params), input_tokens);
      if (Date.now() - saved > 10_000) {
        saved = Date.now();
        writeText(path, JSON.stringify(Object.fromEntries(cache)));
      }
    },
    (done) => {
      if (done % 200 === 0 || done === todo.length) {
        process.stdout.write(`\rcount_tokens ${done}/${todo.length}`);
      }
    },
  );
  if (todo.length > 0) process.stdout.write("\n");
  writeText(path, JSON.stringify(Object.fromEntries(cache)));
  return new Map(reqs.map((r) => [r.custom_id, cache.get(paramsKey(r.params)) ?? 0]));
}

interface OutputRates {
  /** Token keluaran (termasuk thinking) per karakter Arab, terjemahan. */
  translationPerChar: number;
  /** Token keluaran per request ringkasan. */
  summaryPerRequest: number;
  source: string;
}

/** Laju keluaran dari uji kecil (langkah 5); nilai cadangan konservatif bila belum ada. */
export function outputRates(dir: string): OutputRates {
  const path = join(dir, "sample", `results-${TRANSLATE_PROMPT.id.replace("@", "-v")}.jsonl`);
  const rows = readJsonl(
    path,
    z.looseObject({
      kind: z.string(),
      source_chars: z.number(),
      usage: z.looseObject({ output_tokens: z.number() }),
    }),
  );
  const tr = rows.filter((r) => r.kind === "translation");
  const sm = rows.filter((r) => r.kind === "summary");
  if (tr.length === 0 || sm.length === 0) {
    return {
      translationPerChar: 1.2,
      summaryPerRequest: 900,
      source: "cadangan (uji kecil belum ada)",
    };
  }
  const sum = (l: typeof rows, f: (r: (typeof rows)[number]) => number) =>
    l.reduce((a, r) => a + f(r), 0);
  return {
    translationPerChar: sum(tr, (r) => r.usage.output_tokens) / sum(tr, (r) => r.source_chars),
    summaryPerRequest: sum(sm, (r) => r.usage.output_tokens) / sm.length,
    source: `uji kecil ${TRANSLATE_PROMPT.id} (${tr.length} terjemahan, ${sm.length} ringkasan)`,
  };
}

export interface Estimate {
  requests: number;
  promptTokens: number;
  outputTokens: number;
  systemTokens: number;
  maxPrompt: { custom_id: string; tokens: number };
  /** Biaya batch per skenario baca cache prefix sistem. */
  costUsd: Record<string, number>;
}

function expectedOutput(r: PlannedRequest, rates: OutputRates): number {
  return r.kind === "translation"
    ? Math.ceil(r.source_chars * rates.translationPerChar)
    : Math.ceil(rates.summaryPerRequest);
}

/** Biaya batch satu request (USD) untuk porsi baca cache prefix sistem `h`. */
function requestCost(
  r: PlannedRequest,
  prompt: number,
  system: number,
  out: number,
  h: number,
): number {
  const model = isModelId(r.params.model) ? r.params.model : MODELS.haiku;
  const x = ratesFor(model, prompt);
  const perMillion =
    (prompt - system) * x.input +
    system * (h * x.cacheRead + (1 - h) * x.cacheWrite1h) +
    out * x.output;
  return (perMillion / 1_000_000) * 0.5;
}

function estimate(
  reqs: readonly PlannedRequest[],
  counts: Map<string, number>,
  systemTokens: Record<string, number>,
  rates: OutputRates,
): Estimate {
  const cost: Record<string, number> = {};
  let promptTokens = 0;
  let outputTokens = 0;
  let sys = 0;
  let maxPrompt = { custom_id: "", tokens: 0 };
  for (const h of CACHE_SCENARIOS) cost[String(h)] = 0;
  for (const r of reqs) {
    const prompt = counts.get(r.custom_id) ?? 0;
    const system = systemTokens[r.prompt_version] ?? 0;
    const out = expectedOutput(r, rates);
    promptTokens += prompt;
    outputTokens += out;
    sys += system;
    if (prompt > maxPrompt.tokens) maxPrompt = { custom_id: r.custom_id, tokens: prompt };
    for (const h of CACHE_SCENARIOS) {
      cost[String(h)] = (cost[String(h)] ?? 0) + requestCost(r, prompt, system, out, h);
    }
  }
  return {
    requests: reqs.length,
    promptTokens,
    outputTokens,
    systemTokens: sys,
    maxPrompt,
    costUsd: cost,
  };
}

async function systemTokenCounts(client: Anthropic): Promise<Record<string, number>> {
  const count = async (system?: string) =>
    (
      await client.messages.countTokens({
        model: MODELS.haiku,
        ...(system === undefined ? {} : { system }),
        messages: [{ role: "user", content: "." }],
      })
    ).input_tokens;
  const base = await count();
  return {
    [TRANSLATE_PROMPT.id]: (await count(TRANSLATE_PROMPT.system)) - base,
    [SUMMARY_PROMPT.id]: (await count(SUMMARY_PROMPT.system)) - base,
  };
}

const usd = (n: number) => `$${n.toFixed(2)}`;

export async function runPlan(ctx: LlmContext, round: 1 | 2): Promise<number> {
  const dir = llmDir(ctx.repo);
  const work = buildWork(ctx.rows());
  if (work.blocked.length > 0) {
    console.error(
      `${work.blocked.length} paragraf punya rujukan ayat yang tidak bisa ditandai; tidak boleh dikirim ke LLM:`,
    );
    for (const b of work.blocked.slice(0, 10)) console.error(`  ${b.passageId}: ${b.detail}`);
  }
  const acc = readAccepted(dir);
  const reqs = pendingRequests(work, acc, round);
  if (reqs.length === 0) {
    console.info(`Putaran ${round}: tidak ada request tertunda.`);
    return 0;
  }
  const client = ctx.client();
  const counts = await countAll(client, dir, reqs);
  const over = reqs.filter((r) => (counts.get(r.custom_id) ?? 0) >= MAX_PROMPT_TOKENS);
  const system = await systemTokenCounts(client);
  const rates = outputRates(dir);
  const byKind = new Map<BatchKind, PlannedRequest[]>();
  for (const r of reqs) byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r]);
  const estimates = Object.fromEntries(
    [...byKind].map(([k, list]) => [k, estimate(list, counts, system, rates)]),
  );
  const total = estimate(reqs, counts, system, rates);
  // Request ≥ MAX_PROMPT_TOKENS tidak masuk berkas rencana sama sekali (tarif 5× dan harus dipecah
  // dulu), jadi submit tidak mungkin mengirimnya walau peringatan di bawah terlewat (#78).
  const tooBig = new Set(over.map((r) => r.custom_id));
  writeJsonl(
    join(dir, `plan-r${round}.jsonl`),
    reqs
      .filter((r) => !tooBig.has(r.custom_id))
      .map((r) => {
        const prompt = counts.get(r.custom_id) ?? 0;
        const sys = system[r.prompt_version] ?? 0;
        return { ...r, est_usd: requestCost(r, prompt, sys, expectedOutput(r, rates), 0.5) };
      }),
  );
  writeText(
    join(dir, `plan-r${round}.json`),
    `${JSON.stringify({ created_at: new Date().toISOString(), round, rates, total, byKind: estimates }, null, 2)}\n`,
  );

  console.info(`Putaran ${round}: ${reqs.length} request (laju keluaran dari ${rates.source})`);
  for (const [k, e] of Object.entries(estimates)) {
    console.info(
      `  ${k}: ${e.requests} request · prompt ${e.promptTokens.toLocaleString("id-ID")} token (sistem ${e.systemTokens.toLocaleString("id-ID")}) · keluaran ±${e.outputTokens.toLocaleString("id-ID")} · ` +
        CACHE_SCENARIOS.map((h) => `cache ${h * 100}% ${usd(e.costUsd[String(h)] ?? 0)}`).join(
          " / ",
        ),
    );
  }
  console.info(
    `  TOTAL: ` +
      CACHE_SCENARIOS.map((h) => `cache ${h * 100}% ${usd(total.costUsd[String(h)] ?? 0)}`).join(
        " / ",
      ) +
      ` · prompt terbesar ${total.maxPrompt.tokens.toLocaleString("id-ID")} token (${total.maxPrompt.custom_id})`,
  );
  if (over.length > 0) {
    console.error(
      `${over.length} request ≥ ${MAX_PROMPT_TOKENS} token: tidak dimasukkan ke rencana; pecah dulu.`,
    );
    return 1;
  }
  console.info(
    `Rencana: data/build/llm/plan-r${round}.jsonl · kirim: pnpm llm submit --round ${round} --budget <USD> --confirm`,
  );
  return 0;
}

// ── Kirim ─────────────────────────────────────────────────────────────────────────────────

function modelOf(reqs: readonly PlannedRequest[]): string {
  const models = new Set(reqs.map((r) => r.params.model));
  return models.size === 1 ? ([...models][0] ?? "") : "mixed";
}

// ── Tanda terima pengiriman (#63) ─────────────────────────────────────────────────────────
// POST batch (puluhan MB) bisa timeout/putus SETELAH server menerimanya. Karena itu catatan
// "sedang mengirim" (request + perkiraan biaya + PID pengirim) ditulis SEBELUM `batches.create`, dan
// dilepas begitu batch tercatat di batches.json. Selama catatan itu ada, submit/retry menolak kirim
// (kirim ulang = tagihan ganda) sampai `pnpm llm reconcile` mencocokkannya dengan daftar batch server.

/** Batas tunggu satu POST batch (eksplisit; bawaan SDK juga 10 menit). */
export const SUBMIT_TIMEOUT_MS = 10 * 60_000;
/**
 * Umur minimal catatan sebelum "tidak ada di server" dipercaya: lebih lama dari batas tunggu POST,
 * supaya reconcile di terminal lain tidak melepas catatan pengiriman yang masih berjalan.
 */
export const RECONCILE_MIN_AGE_MS = SUBMIT_TIMEOUT_MS + 5 * 60_000;
/** Batch di server boleh dianggap milik catatan bila dibuat dalam jendela ini sejak `started_at`. */
const RECONCILE_WINDOW_MS = { before: 60_000, after: SUBMIT_TIMEOUT_MS + 5 * 60_000 };

const submittingRecord = z.strictObject({
  name: z.string(),
  kind: batchKind,
  model: z.string(),
  prompt_version: z.string(),
  requests: z.number().int().positive(),
  est_usd: z.number().nonnegative(),
  started_at: z.string(),
  /** PID proses pengirim: selama hidup, reconcile tidak menyentuh catatan. */
  pid: z.number().int().positive(),
  /** Request yang dikirim, relatif ke folder llm. */
  file: z.string(),
});
export type SubmittingRecord = z.infer<typeof submittingRecord>;

const submittingPath = (dir: string) => join(dir, "submitting.json");

export function readSubmitting(dir: string): SubmittingRecord | null {
  const path = submittingPath(dir);
  if (!existsSync(path)) return null;
  return submittingRecord.parse(JSON.parse(readFileSync(path, "utf8")));
}

/** Proses `pid` masih hidup (sinyal 0 hanya memeriksa; EPERM = hidup milik pengguna lain). */
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Pesan galat bila ada pengiriman yang belum tercatat; submit/retry tidak boleh jalan. */
export function unreconciledProblem(dir: string): string | null {
  const r = readSubmitting(dir);
  if (r === null) return null;
  return (
    `Pengiriman ${r.name} (${r.requests} request, ±${usd(r.est_usd)}, mulai ${r.started_at}) belum tercatat: ` +
    "batch mungkin sudah diterima server. Jalankan pnpm llm reconcile (gratis) sebelum mengirim lagi."
  );
}

/**
 * Catat batch yang sudah ada di server lalu lepas catatan. Idempoten: aman diulang setelah proses
 * mati di langkah mana pun (request sudah dipindah, batch sudah tercatat). `part` (dari memori
 * pengirim) dipakai bila berkas catatan tidak ada lagi.
 */
function adopt(
  dir: string,
  r: SubmittingRecord,
  id: string,
  createdAt: string,
  part?: readonly PlannedRequest[],
): BatchRecord {
  const target = join(dir, "requests", `${id}.jsonl`);
  const source = join(dir, r.file);
  if (!existsSync(target)) {
    if (part !== undefined) writeJsonl(target, part);
    else renameSync(source, target);
  }
  rmSync(source, { force: true });
  const batches = readBatches(dir);
  let rec = batches.find((b) => b.id === id);
  if (rec === undefined) {
    rec = {
      name: r.name,
      id,
      kind: r.kind,
      model: r.model,
      prompt_version: r.prompt_version,
      requests: r.requests,
      created_at: createdAt,
      ended_at: null,
      collected_at: null,
      usage: null,
      outcome: null,
    };
    writeBatches(dir, [...batches, rec]);
  }
  rmSync(submittingPath(dir), { force: true });
  return rec;
}

export async function submit(
  client: Anthropic,
  dir: string,
  reqs: readonly PlannedRequest[],
  label: string,
): Promise<BatchRecord[]> {
  const problem = unreconciledProblem(dir);
  if (problem !== null) throw new Error(problem);
  const made: BatchRecord[] = [];
  const byKind = new Map<BatchKind, PlannedRequest[]>();
  for (const r of reqs) byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r]);
  for (const [kind, list] of byKind) {
    for (let i = 0; i < list.length; i += BATCH_MAX_REQUESTS) {
      const part = list.slice(i, i + BATCH_MAX_REQUESTS);
      const ids = new Set(part.map((r) => r.custom_id));
      if (ids.size !== part.length) throw new Error(`custom_id ganda dalam satu batch (${kind})`);
      const startedAt = new Date().toISOString();
      const receipt: SubmittingRecord = {
        // Nomor urut global (01-translation, 02-summary-r1, …): nama unik walau dikirim bertahap.
        name: `${String(readBatches(dir).length + 1).padStart(2, "0")}-${kind}${label.startsWith("retry") ? "-retry" : ""}`,
        kind,
        model: modelOf(part),
        prompt_version: part[0]?.prompt_version ?? "",
        requests: part.length,
        est_usd: part.reduce((a, r) => a + (r.est_usd ?? 0), 0),
        started_at: startedAt,
        pid: process.pid,
        file: join("requests", `submitting-${startedAt.replace(/[:.]/g, "-")}.jsonl`),
      };
      writeJsonl(join(dir, receipt.file), part);
      writeText(submittingPath(dir), `${JSON.stringify(receipt, null, 2)}\n`);
      // Tanpa ulang otomatis: ulangan SDK atas POST yang sudah diterima membuat batch ganda yang ikut
      // ditagih. Bila gagal, catatan di atas tetap ada dan kiriman berikutnya ditolak sampai reconcile.
      let rec: BatchRecord;
      try {
        const b = await client.messages.batches.create(
          { requests: part.map((r) => ({ custom_id: r.custom_id, params: r.params })) },
          { maxRetries: 0, timeout: SUBMIT_TIMEOUT_MS },
        );
        rec = adopt(dir, receipt, b.id, b.created_at, part);
      } catch (error) {
        console.error(
          `Pengiriman ${receipt.name} gagal, tidak jelas hasilnya, atau belum tercatat. Jalankan pnpm llm reconcile (gratis) sebelum mengirim lagi.`,
        );
        throw error;
      }
      made.push(rec);
      console.info(`  dikirim ${rec.name}: ${rec.id} (${part.length} request)`);
    }
  }
  return made;
}

export type ReconcileResult =
  | { status: "none-open" }
  | { status: "adopted"; record: BatchRecord }
  | { status: "released" }
  | { status: "busy"; pid: number }
  | { status: "too-early" }
  | { status: "ambiguous"; ids: string[] }
  | { status: "rejected"; reason: string };

/**
 * Cocokkan catatan "sedang mengirim" dengan daftar batch di server (gratis, terbaru dulu).
 * Kandidat = belum tercatat, jumlah request sama, dibuat dalam jendela waktu, dan (bila sudah
 * selesai) hasil pertamanya ber-custom_id milik catatan, supaya batch lain di workspace yang sama
 * (mis. tools/eval) tidak ikut diadopsi. Satu kandidat → dicatat. Tidak ada → catatan dilepas
 * (aman kirim ulang) hanya bila pengirimnya sudah mati dan catatan cukup tua. Lebih dari satu →
 * pilih sendiri dengan `chosenId`.
 */
export async function reconcile(
  client: Anthropic,
  dir: string,
  opts: { now?: number; alive?: (pid: number) => boolean; chosenId?: string } = {},
): Promise<ReconcileResult> {
  const r = readSubmitting(dir);
  if (r === null) return { status: "none-open" };
  if ((opts.alive ?? processAlive)(r.pid)) return { status: "busy", pid: r.pid };
  const start = Date.parse(r.started_at);
  const known = new Set(readBatches(dir).map((b) => b.id));
  const ours = new Set(readJsonl(join(dir, r.file), plannedRequest).map((q) => q.custom_id));
  const candidates: { id: string; created_at: string }[] = [];
  for await (const b of client.messages.batches.list({ limit: 100 })) {
    const t = Date.parse(b.created_at);
    if (t < start - RECONCILE_WINDOW_MS.before) break;
    if (opts.chosenId !== undefined && b.id !== opts.chosenId) continue;
    if (known.has(b.id) || t > start + RECONCILE_WINDOW_MS.after) continue;
    const c = b.request_counts;
    const total = c.processing + c.succeeded + c.errored + c.canceled + c.expired;
    if (total !== r.requests) continue;
    if (b.processing_status === "ended" && ours.size > 0) {
      let first: string | undefined;
      for await (const res of await client.messages.batches.results(b.id)) {
        first = res.custom_id;
        break;
      }
      if (first !== undefined && !ours.has(first)) continue;
    }
    candidates.push({ id: b.id, created_at: b.created_at });
  }
  if (opts.chosenId !== undefined && candidates.length === 0) {
    return {
      status: "rejected",
      reason: `${opts.chosenId} tidak cocok dengan catatan (sudah tercatat, jumlah request beda, di luar jendela waktu, atau hasilnya milik kiriman lain).`,
    };
  }
  if (candidates.length > 1) return { status: "ambiguous", ids: candidates.map((c) => c.id) };
  const [found] = candidates;
  if (found !== undefined) {
    return { status: "adopted", record: adopt(dir, r, found.id, found.created_at) };
  }
  if ((opts.now ?? Date.now()) - start < RECONCILE_MIN_AGE_MS) return { status: "too-early" };
  rmSync(join(dir, r.file), { force: true });
  rmSync(submittingPath(dir), { force: true });
  return { status: "released" };
}

export async function runReconcile(ctx: LlmContext, chosenId?: string): Promise<number> {
  const result = await reconcile(
    ctx.client(),
    llmDir(ctx.repo),
    chosenId === undefined ? {} : { chosenId },
  );
  switch (result.status) {
    case "none-open":
      console.info("Tidak ada pengiriman yang menggantung.");
      return 0;
    case "adopted":
      console.info(
        `Batch ${result.record.id} ditemukan di server dan dicatat sebagai ${result.record.name}. Lanjut: pnpm llm wait · collect.`,
      );
      return 0;
    case "released":
      console.info("Tidak ada batch yang cocok di server: catatan dilepas, boleh kirim ulang.");
      return 0;
    case "busy":
      console.error(
        `Proses pengirim (PID ${result.pid}) masih berjalan; tunggu selesai, lalu ulangi reconcile.`,
      );
      return 1;
    case "too-early":
      console.error(
        `Pengiriman dimulai kurang dari ${RECONCILE_MIN_AGE_MS / 60_000} menit lalu; batch bisa belum tampil di server. Ulangi nanti.`,
      );
      return 1;
    case "ambiguous":
      console.error(
        `Lebih dari satu batch cocok (${result.ids.join(", ")}). Periksa di Console Anthropic, lalu: pnpm llm reconcile --id <batch>. Jangan kirim ulang.`,
      );
      return 1;
    case "rejected":
      console.error(result.reason);
      return 1;
  }
}

/** custom_id yang sedang diproses di batch yang belum dikumpulkan (jangan dikirim dua kali). */
function inFlight(dir: string): Set<string> {
  const ids = new Set<string>();
  for (const b of readBatches(dir)) {
    if (b.collected_at !== null) continue;
    for (const r of readJsonl(join(dir, "requests", `${b.id}.jsonl`), plannedRequest)) {
      ids.add(r.custom_id);
    }
  }
  return ids;
}

export interface SubmitOptions {
  /** Hanya jenis ini (mis. `translation`), untuk pengiriman bertahap. */
  kind?: BatchKind;
  /** Kirim paling banyak N request dari rencana (urutan rencana). */
  limit?: number;
  /**
   * Pengaman anggaran yang disetujui pemilik (USD): tolak bila biaya aktual batch yang sudah
   * dikumpulkan + perkiraan batch yang masih diproses + perkiraan request ini (cache 50%)
   * melebihinya. Wajib bersama `--confirm` (#62).
   */
  budget?: number;
}

/** Biaya aktual semua batch yang sudah dikumpulkan (USD, dari `usage`). */
export function spentUsd(dir: string): number {
  return readBatches(dir).reduce((a, b) => a + (b.usage?.costUsd ?? 0), 0);
}

/**
 * Perkiraan biaya batch yang sudah dikirim tetapi belum dikumpulkan (USD, dari `est_usd` request
 * yang disimpan saat kirim). `usage` baru diisi `collect`, jadi tanpa ini batch yang masih diproses
 * terhitung $0 dan dua kiriman bertahap bisa melewati pagu bersama (#62). `unknown` = request tanpa
 * perkiraan (catatan lama); pengaman menolak kirim selama ada.
 */
export function pendingUsd(dir: string): { usd: number; unknown: number } {
  let usd = 0;
  let unknown = 0;
  for (const b of readBatches(dir)) {
    if (b.collected_at !== null) continue;
    for (const r of readJsonl(join(dir, "requests", `${b.id}.jsonl`), plannedRequest)) {
      if (r.est_usd === undefined) unknown++;
      else usd += r.est_usd;
    }
  }
  // Pengiriman yang belum tercatat (#63) mungkin sudah ditagih: ikut dihitung.
  usd += readSubmitting(dir)?.est_usd ?? 0;
  return { usd, unknown };
}

/**
 * Pengaman anggaran `submit`/`retry` (#62): pesan galat, atau null bila boleh lanjut. `--confirm`
 * tanpa `--budget` ditolak, karena setiap kiriman berbayar butuh pagu yang disetujui pemilik.
 */
export function budgetProblem(
  dir: string,
  est: number,
  confirm: boolean,
  budget: number | undefined,
): string | null {
  const spent = spentUsd(dir);
  const pending = pendingUsd(dir);
  const committed = spent + pending.usd;
  console.info(
    `Sudah terpakai ${usd(spent)} · masih diproses ±${usd(pending.usd)} · kiriman ini ±${usd(est)}`,
  );
  if (budget !== undefined && committed + est > budget) {
    return `Melebihi anggaran yang disetujui ${usd(budget)} (${usd(spent)} + ${usd(pending.usd)} + ${usd(est)}). Tanya pemilik dulu.`;
  }
  if (!confirm) return null;
  if (budget === undefined) {
    return "--confirm wajib bersama --budget <USD> (anggaran yang disetujui pemilik di chat).";
  }
  if (pending.unknown > 0) {
    return `${pending.unknown} request di batch yang belum dikumpulkan tanpa perkiraan biaya; jalankan pnpm llm collect dulu.`;
  }
  return null;
}

/**
 * Request rencana yang masih perlu dikirim SEKARANG: sumbernya sama dengan korpus saat ini, belum
 * lolos untuk sumber itu, belum gagal untuk sumber itu (→ `retry`), dan tidak sedang diproses.
 */
export function submittable(
  work: Work,
  acc: Accepted,
  busy: ReadonlySet<string>,
  planned: readonly PlannedRequest[],
): { ready: PlannedRequest[]; stale: number } {
  const failed = new Set(acc.failures.map((f) => `${f.custom_id}:${f.source_sha256}`));
  let stale = 0;
  const ready = planned.filter((r) => {
    const sha = currentSha(work, r.custom_id);
    if (sha !== r.source_sha256) {
      stale++;
      return false;
    }
    if (busy.has(r.custom_id) || failed.has(`${r.custom_id}:${sha}`)) return false;
    const parts = parseCustomId(r.custom_id);
    if (parts?.kind === "passage")
      return acc.translations.get(parts.passageId)?.source_sha256 !== sha;
    if (parts?.kind === "toc" && parts.round === 1)
      return acc.r1.get(r.custom_id)?.source_sha256 !== sha;
    if (parts?.kind === "toc")
      return acc.final.get(`${parts.tocNodeId}-${parts.lang}`)?.source_sha256 !== sha;
    return false;
  });
  return { ready, stale };
}

export async function runSubmit(
  ctx: LlmContext,
  round: 1 | 2,
  confirm: boolean,
  opts: SubmitOptions = {},
): Promise<number> {
  const dir = llmDir(ctx.repo);
  const unreconciled = unreconciledProblem(dir);
  if (unreconciled !== null) {
    console.error(unreconciled);
    return 1;
  }
  const path = join(dir, `plan-r${round}.jsonl`);
  const planned = readJsonl(path, plannedRequest);
  if (planned.length === 0) {
    console.error(`Tidak ada rencana di ${path}. Jalankan dulu: pnpm llm plan --round ${round}`);
    return 1;
  }
  const work = buildWork(ctx.rows());
  const { ready, stale } = submittable(work, readAccepted(dir), inFlight(dir), planned);
  if (stale > 0) {
    console.error(
      `${stale} request di rencana sudah usang (sumber berubah). Jalankan ulang: pnpm llm plan --round ${round}`,
    );
    return 1;
  }
  const remaining = ready.filter((r) => opts.kind === undefined || r.kind === opts.kind);
  const reqs = opts.limit === undefined ? remaining : remaining.slice(0, opts.limit);
  if (reqs.length === 0) {
    console.info(`Putaran ${round}: tidak ada request tersisa untuk dikirim.`);
    return 0;
  }
  const missing = reqs.filter((r) => r.est_usd === undefined).length;
  if (missing > 0) {
    console.error(
      `${missing} request di rencana tanpa perkiraan biaya. Jalankan ulang: pnpm llm plan --round ${round}`,
    );
    return 1;
  }
  const est = reqs.reduce((a, r) => a + (r.est_usd ?? 0), 0);
  console.info(
    `Putaran ${round}: kirim ${reqs.length} dari ${remaining.length} request tersisa · perkiraan ${usd(est)} (cache 50%)`,
  );
  const problem = budgetProblem(dir, est, confirm, opts.budget);
  if (problem !== null) {
    console.error(problem);
    return 1;
  }
  if (!confirm) {
    console.info(
      "Belum dikirim. BERBAYAR: kirim hanya setelah pemilik menyetujui biaya di chat, lalu tambahkan --budget <USD> --confirm.",
    );
    return 0;
  }
  await submit(ctx.client(), dir, reqs, `r${round}`);
  console.info("Cek: pnpm llm status · tunggu: pnpm llm wait · setelah selesai: pnpm llm collect");
  return 0;
}

/** Tunggu sampai semua batch yang belum dikumpulkan selesai (poll tiap menit), lalu keluar. */
export async function runWait(ctx: LlmContext): Promise<number> {
  const dir = llmDir(ctx.repo);
  const client = ctx.client();
  for (;;) {
    const open = readBatches(dir).filter((b) => b.collected_at === null);
    const states = await Promise.all(open.map((b) => client.messages.batches.retrieve(b.id)));
    const busy = states.filter((s) => s.processing_status !== "ended");
    const done = states.reduce(
      (a, s) => a + s.request_counts.succeeded + s.request_counts.errored,
      0,
    );
    const all = states.reduce(
      (a, s) =>
        a +
        s.request_counts.processing +
        s.request_counts.succeeded +
        s.request_counts.errored +
        s.request_counts.canceled +
        s.request_counts.expired,
      0,
    );
    console.info(
      `${new Date().toISOString()} · ${open.length - busy.length}/${open.length} batch selesai · ${done}/${all} request`,
    );
    if (busy.length === 0) return 0;
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

export async function runStatus(ctx: LlmContext): Promise<number> {
  const dir = llmDir(ctx.repo);
  const client = ctx.client();
  const unreconciled = unreconciledProblem(dir);
  if (unreconciled !== null) console.error(unreconciled);
  const batches = readBatches(dir);
  for (const b of batches) {
    if (b.collected_at !== null) {
      console.info(
        `${b.name} ${b.id}: dikumpulkan ${b.collected_at} · ${JSON.stringify(b.outcome)}`,
      );
      continue;
    }
    const s = await client.messages.batches.retrieve(b.id);
    const c = s.request_counts;
    console.info(
      `${b.name} ${b.id}: ${s.processing_status} · proses ${c.processing}, sukses ${c.succeeded}, error ${c.errored}, kedaluwarsa ${c.expired}, batal ${c.canceled}`,
    );
  }
  return 0;
}

// ── Kumpulkan + validasi ─────────────────────────────────────────────────────────────────

interface Verdict {
  accepted: AcceptedTranslation | AcceptedSummary | null;
  failure: Failure | null;
}

function judge(
  work: Work,
  planned: PlannedRequest,
  message: Message,
  batch: { id: string; ended_at: string },
): Verdict {
  const model = message.model;
  const usage = storedUsage(message.usage);
  const fail = (reason: string, details: string[], output: string | null): Verdict => ({
    accepted: null,
    failure: {
      custom_id: planned.custom_id,
      batch_id: batch.id,
      model,
      reason,
      details,
      output,
      at: batch.ended_at,
      source_sha256: planned.source_sha256,
      usage,
    },
  });
  const text = messageText(message);
  const stop = stopProblem(message);
  if (stop !== null) return fail(stop, [], text === "" ? null : text);
  const parts = parseCustomId(planned.custom_id);
  if (parts?.kind === "passage") {
    const u = work.units.get(parts.passageId);
    if (u === undefined || u.sourceSha256 !== planned.source_sha256) {
      return fail("stale", ["teks/rujukan ayat paragraf berubah sejak request dibuat"], text);
    }
    const c = checkTranslation(text, u);
    if (!c.ok) return fail(`invalid:${c.problems.join(",")}`, c.details, text);
    return {
      failure: null,
      accepted: {
        passage_id: u.passageId,
        lang: "id",
        text: c.text,
        model,
        prompt_version: planned.prompt_version,
        created_at: batch.ended_at,
        source_sha256: u.sourceSha256,
        batch_id: batch.id,
        markers_missing: c.markersMissing,
        usage,
      },
    };
  }
  if (parts?.kind !== "toc") return fail("unknown_id", [], text);
  const current =
    parts.round === 1
      ? work.chunkById.get(planned.custom_id)?.sourceSha256
      : work.nodeById.get(parts.tocNodeId)?.sourceSha256;
  if (current !== planned.source_sha256) {
    return fail("stale", ["teks bagian berubah sejak request dibuat"], text);
  }
  const c = checkSummary(text, parts.lang);
  if (!c.ok) return fail(`invalid:${c.problems.join(",")}`, [], text);
  return {
    failure: null,
    accepted: {
      custom_id: planned.custom_id,
      toc_node_id: parts.tocNodeId,
      lang: parts.lang,
      part: parts.part,
      round: parts.round,
      text: text.trim(),
      model,
      prompt_version: planned.prompt_version,
      created_at: batch.ended_at,
      source_sha256: planned.source_sha256,
      input_sha256: planned.input_sha256 ?? null,
      batch_id: batch.id,
      usage,
    },
  };
}

const batchResult = z.looseObject({
  custom_id: z.string(),
  result: z.looseObject({ type: z.string() }),
});

/**
 * Bangun ulang semua hasil yang lolos dan kegagalan dari hasil mentah semua batch yang sudah
 * dikumpulkan, dengan aturan validasi dan unit sumber SAAT INI (gratis; dipakai `collect` dan
 * `rejudge`). Urut waktu kirim: hasil batch yang lebih baru menimpa yang lama untuk custom_id sama.
 */
export function rebuild(
  dir: string,
  work: Work,
  reviews: ReviewRejections = new Map(),
): { accepted: number; failures: number } {
  const batches = readBatches(dir).toSorted((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const translations = new Map<number, AcceptedTranslation>();
  const r1 = new Map<string, AcceptedSummary>();
  const final = new Map<string, AcceptedSummary>();
  const failures: Failure[] = [];
  for (const b of batches) {
    if (b.collected_at === null || b.ended_at === null) continue;
    const endedAt = b.ended_at;
    const planned = new Map(
      readJsonl(join(dir, "requests", `${b.id}.jsonl`), plannedRequest).map((r) => [
        r.custom_id,
        r,
      ]),
    );
    let accepted = 0;
    let invalid = 0;
    let failed = 0;
    for (const r of readJsonl(join(dir, "results", `${b.id}.jsonl`), batchResult)) {
      const p = planned.get(r.custom_id);
      const base = {
        custom_id: r.custom_id,
        batch_id: b.id,
        details: [],
        output: null,
        at: endedAt,
        source_sha256: p?.source_sha256 ?? "",
        usage: null,
      };
      if (p === undefined) {
        failures.push({ ...base, model: b.model, reason: "unknown_id" });
        failed++;
        continue;
      }
      const result = r.result as unknown as MessageBatchResult;
      if (result.type !== "succeeded") {
        const reason =
          result.type === "errored" ? `errored:${result.error.error.type}` : result.type;
        failures.push({ ...base, model: String(p.params.model), reason });
        failed++;
        continue;
      }
      const v = judge(work, p, result.message, { id: b.id, ended_at: endedAt });
      if (v.failure !== null) {
        failures.push(v.failure);
        invalid++;
        continue;
      }
      const a = v.accepted;
      // Koreksi tinjauan (X02): hasil versi prompt yang ditolak peninjau untuk paragraf ini tidak
      // dipakai; dicatat sebagai kegagalan di posisi kronologisnya supaya `retry` mengirim ulang.
      const rejected =
        a !== null && "passage_id" in a
          ? rejectionFor(reviews, a.passage_id, a.prompt_version)
          : null;
      if (a !== null && "passage_id" in a && rejected !== null) {
        failures.push({
          custom_id: r.custom_id,
          batch_id: b.id,
          model: a.model,
          reason: "review_rejected",
          details: [
            `${rejected.verdict}: ${rejected.reason} (${rejected.reviewer}, ${rejected.date})`,
          ],
          output: a.text,
          at: endedAt,
          source_sha256: a.source_sha256,
          usage: a.usage,
          prompt_version: a.prompt_version,
        });
        invalid++;
        continue;
      }
      accepted++;
      if (a === null) continue;
      if ("passage_id" in a) translations.set(a.passage_id, a);
      else if (a.round === 1) {
        r1.set(a.custom_id, a);
        if (a.part === null) final.set(`${a.toc_node_id}-${a.lang}`, a);
      } else final.set(`${a.toc_node_id}-${a.lang}`, a);
    }
    b.outcome = { accepted, invalid, failed };
  }
  // Ringkasan putaran 2 yang masukannya (teks ringkasan putaran 1) sudah berubah = usang: dibuang
  // dan dijadwalkan ulang oleh `plan --round 2`. Tidak dihitung sebagai percobaan gagal (hash beda).
  for (const [key, a] of final) {
    if (a.round !== 2) continue;
    const n = work.nodeById.get(a.toc_node_id);
    const input = n === undefined ? null : round2InputSha(n, a.lang, r1);
    if (input !== null && input === a.input_sha256) continue;
    final.delete(key);
    failures.push({
      custom_id: a.custom_id,
      batch_id: a.batch_id,
      model: a.model,
      reason: "stale_input",
      details: ["ringkasan putaran 1 di bawahnya berubah atau ditolak"],
      output: a.text,
      at: a.created_at,
      source_sha256: a.input_sha256 ?? "",
      usage: a.usage,
    });
  }
  writeBatches(
    dir,
    readBatches(dir).map((b) => batches.find((x) => x.id === b.id) ?? b),
  );
  writeJsonl(
    join(dir, "translation.jsonl"),
    [...translations.values()].toSorted((a, b) => a.passage_id - b.passage_id),
  );
  writeJsonl(join(dir, "summary-r1.jsonl"), [...r1.values()]);
  writeJsonl(join(dir, "summary.jsonl"), [...final.values()]);
  writeJsonl(join(dir, "failures.jsonl"), failures);
  return { accepted: translations.size + r1.size + final.size, failures: failures.length };
}

export async function runCollect(ctx: LlmContext): Promise<number> {
  const dir = llmDir(ctx.repo);
  const client = ctx.client();
  const batches = readBatches(dir);
  let pending = 0;
  for (const b of batches) {
    if (b.collected_at !== null) continue;
    const s = await client.messages.batches.retrieve(b.id);
    if (s.processing_status !== "ended") {
      pending++;
      console.info(`${b.name}: masih ${s.processing_status}`);
      continue;
    }
    // Hasil mentah disimpan persis seperti diterima; biaya aktual dari `usage` hasil succeeded,
    // dengan tarif model yang DIMINTA (bukan tebakan dari ID di respons).
    const models = new Map(
      readJsonl(join(dir, "requests", `${b.id}.jsonl`), plannedRequest).map((r) => [
        r.custom_id,
        r.params.model,
      ]),
    );
    const raw: unknown[] = [];
    const totals: UsageTotals = emptyTotals();
    for await (const r of await client.messages.batches.results(b.id)) {
      raw.push(r);
      if (r.result.type === "succeeded") {
        const asked = models.get(r.custom_id) ?? r.result.message.model;
        if (!isModelId(asked))
          throw new Error(`model tidak dikenal untuk ${r.custom_id}: ${asked}`);
        addUsage(totals, asked, r.result.message.usage, { batch: true });
      }
    }
    writeJsonl(join(dir, "results", `${b.id}.jsonl`), raw);
    b.ended_at = s.ended_at ?? new Date().toISOString();
    b.collected_at = new Date().toISOString();
    b.usage = totals;
    writeBatches(dir, batches);
    console.info(
      `${b.name}: ${raw.length} hasil · biaya ${usd(totals.costUsd)} (baca cache ${totals.cache_read_input_tokens.toLocaleString("id-ID")}, tulis ${totals.cache_creation_input_tokens.toLocaleString("id-ID")})`,
    );
  }
  printRebuild(dir, buildWork(ctx.rows()), ctx.repo);
  if (pending > 0) console.info(`${pending} batch belum selesai; ulangi collect nanti.`);
  return 0;
}

function printRebuild(dir: string, work: Work, repo: string): void {
  const reviews = loadReviews(repo);
  rebuild(dir, work, reviews);
  if (reviews.size > 0) console.info(`Koreksi tinjauan: ${reviews.size} paragraf (${REVIEW_FILE})`);
  // Salah ketik ID di berkas koreksi tidak boleh diam saja.
  const unknown = [...reviews.keys()].filter((id) => !work.units.has(id));
  if (unknown.length > 0) {
    console.warn(
      `Koreksi tinjauan untuk paragraf yang bukan unit terjemahan: ${unknown.join(", ")}`,
    );
  }
  for (const b of readBatches(dir)) {
    if (b.outcome === null) continue;
    console.info(
      `  ${b.name}: lolos ${b.outcome.accepted}, ditolak ${b.outcome.invalid}, gagal API ${b.outcome.failed}`,
    );
  }
}

/** Nilai ulang semua hasil mentah dengan aturan dan sumber saat ini (tanpa API, gratis). */
export function runRejudge(ctx: LlmContext): number {
  printRebuild(llmDir(ctx.repo), buildWork(ctx.rows()), ctx.repo);
  return 0;
}

// ── Ulangan ───────────────────────────────────────────────────────────────────────────────

/** custom_id gagal yang belum pernah lolos, dengan jumlah percobaan dan apakah pernah ditolak model. */
export interface RetryState {
  attempts: number;
  refusal: boolean;
  /** Ditolak peninjau (X02): ulangan langsung ke Sonnet 5.5, hitungan mulai dari awal sekali. */
  reviewed?: boolean;
  /**
   * Peninjau menolak hasil versi prompt SAAT INI: mengulang dengan prompt yang sama tidak menolong
   * (dan berbayar), jadi tidak diulang sampai ada versi prompt baru.
   */
  needsNewPrompt?: boolean;
  /** Jumlah percobaan yang memakai Sonnet 5.5. */
  sonnet: number;
  summary: boolean;
}

/** sha256 sumber SAAT INI untuk sebuah custom_id (null bila unitnya tidak ada lagi). */
function currentSha(work: Work, customId: string): string | null {
  const parts = parseCustomId(customId);
  if (parts === null) return null;
  if (parts.kind === "passage") return work.units.get(parts.passageId)?.sourceSha256 ?? null;
  if (parts.round === 1) return work.chunkById.get(customId)?.sourceSha256 ?? null;
  return work.nodeById.get(parts.tocNodeId)?.sourceSha256 ?? null;
}

/**
 * custom_id yang gagal untuk sumber saat ini dan belum lolos, dengan jumlah percobaan dan apakah
 * pernah ditolak model. Kegagalan untuk sumber lama (hash berbeda) tidak dihitung: unit itu
 * dijadwalkan ulang sebagai request baru oleh `plan`.
 */
export function unresolved(work: Work, acc: Accepted): Map<string, RetryState> {
  const out = new Map<string, RetryState>();
  for (const f of acc.failures) {
    const sha = currentSha(work, f.custom_id);
    if (sha === null || f.source_sha256 !== sha) continue;
    const parts = parseCustomId(f.custom_id);
    if (parts === null) continue;
    const done =
      parts.kind === "passage"
        ? acc.translations.get(parts.passageId)?.source_sha256 === sha
        : parts.round === 1
          ? acc.r1.get(f.custom_id)?.source_sha256 === sha
          : acc.final.get(`${parts.tocNodeId}-${parts.lang}`)?.source_sha256 === sha;
    if (done) continue;
    // Ditolak peninjau (X02). Versi prompt lama: hitungan mulai dari awal dan langsung ke Sonnet 5.5
    // (sekali per versi yang ditolak, jadi terbatas). Versi prompt saat ini: tidak diulang.
    if (f.reason === "review_rejected") {
      const prev = out.get(f.custom_id);
      out.set(
        f.custom_id,
        f.prompt_version === TRANSLATE_PROMPT.id
          ? {
              attempts: (prev?.attempts ?? 0) + 1,
              refusal: prev?.refusal ?? false,
              sonnet: (prev?.sonnet ?? 0) + (f.model === MODELS.sonnet ? 1 : 0),
              summary: false,
              needsNewPrompt: true,
            }
          : { attempts: 1, refusal: false, reviewed: true, sonnet: 0, summary: false },
      );
      continue;
    }
    const prev = out.get(f.custom_id) ?? {
      attempts: 0,
      refusal: false,
      sonnet: 0,
      summary: parts.kind === "toc",
    };
    out.set(f.custom_id, {
      ...prev,
      attempts: prev.attempts + 1,
      refusal: prev.refusal || f.reason === "refusal",
      sonnet: prev.sonnet + (f.model === MODELS.sonnet ? 1 : 0),
      summary: prev.summary,
    });
  }
  return out;
}

/**
 * Model ulangan untuk satu custom_id; `null` = menyerah. Haiku 5.5 tanpa fallback server (ADR-013):
 * penolakan diulang di sisi klien dengan Sonnet 5.5. Percobaan terakhir juga ke Sonnet 5.5
 * (ADR-043): di batch S13 keluaran Haiku pada paragraf sulit yang dua kali gagal tetap rusak. Menyerah
 * hanya setelah Sonnet ikut dicoba.
 */
export function retryModel(s: RetryState): ModelId | null {
  if (s.needsNewPrompt === true) return null;
  // Ringkasan mendapat dua percobaan Sonnet: satu ringkasan anak yang gagal menghalangi ringkasan
  // putaran 2 semua induknya (S13: ringkasan Inggris bagian doa terus ditulis dalam bahasa Indonesia).
  if (s.attempts >= MAX_ATTEMPTS && s.sonnet >= (s.summary ? 2 : 1)) return null;
  return s.refusal || s.reviewed === true || s.attempts >= MAX_ATTEMPTS - 1
    ? MODELS.sonnet
    : MODELS.haiku;
}

export async function runRetry(
  ctx: LlmContext,
  confirm: boolean,
  opts: { budget?: number } = {},
): Promise<number> {
  const dir = llmDir(ctx.repo);
  const unreconciled = unreconciledProblem(dir);
  if (unreconciled !== null) {
    console.error(unreconciled);
    return 1;
  }
  const work = buildWork(ctx.rows());
  const acc = readAccepted(dir);
  const todo = unresolved(work, acc);
  const busy = inFlight(dir);
  const reqs: PlannedRequest[] = [];
  const givenUp: string[] = [];
  for (const [id, s] of todo) {
    if (busy.has(id)) continue;
    const model = retryModel(s);
    if (model === null) {
      givenUp.push(id);
      continue;
    }
    const parts = parseCustomId(id);
    const r =
      parts?.kind === "passage"
        ? translationRequest(work, parts.passageId, model)
        : parts?.kind === "toc" && parts.round === 1
          ? r1Request(work, id, model)
          : parts?.kind === "toc"
            ? r2Request(work, acc, parts.tocNodeId, parts.lang, model)
            : null;
    if (r !== null) reqs.push(r);
  }
  const sonnet = reqs.filter((r) => r.params.model === MODELS.sonnet).length;
  console.info(
    `Ulangan: ${reqs.length} request (${sonnet} ke Sonnet 5.5: refusal atau percobaan terakhir); menyerah (sesudah Sonnet ikut dicoba): ${givenUp.length}`,
  );
  if (reqs.length === 0) return 0;
  // Perkiraan biaya ulangan (count_tokens gratis, cache 50%): ulangan Sonnet ±20× Haiku.
  const client = ctx.client();
  const counts = await countAll(client, dir, reqs);
  const system = await systemTokenCounts(client);
  const rates = outputRates(dir);
  // Perkiraan disimpan per request (requests/<id>.jsonl), supaya pagu kiriman berikutnya menghitung
  // ulangan ini selama belum dikumpulkan (#62).
  const priced = reqs.map((r) => ({
    ...r,
    est_usd: requestCost(
      r,
      counts.get(r.custom_id) ?? 0,
      system[r.prompt_version] ?? 0,
      expectedOutput(r, rates),
      0.5,
    ),
  }));
  const est = priced.reduce((a, r) => a + r.est_usd, 0);
  console.info(`Perkiraan ulangan ${usd(est)} (cache 50%)`);
  const problem = budgetProblem(dir, est, confirm, opts.budget);
  if (problem !== null) {
    console.error(problem);
    return 1;
  }
  if (!confirm) {
    console.info(
      "Belum dikirim (berbayar, termasuk dalam biaya batch yang disetujui). Tambahkan --budget <USD> --confirm.",
    );
    return 0;
  }
  const n = readBatches(dir).filter((b) => b.name.includes("-retry")).length + 1;
  await submit(client, dir, priced, `retry${n}`);
  return 0;
}

export { readAccepted };
export type { Accepted };
