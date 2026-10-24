// Alur Message Batches Intisari (X15b, ADR-097, ADR-098): plan (count_tokens, gratis) → submit
// (berbayar, izin pemilik + --budget --confirm) → wait/status → collect → rejudge/retry → report.
// Memakai tanda terima, reconcile, dan pagu yang sama dengan `pnpm llm` (ADR-061), di folder sendiri
// `data/build/llm/intisari/`. Setiap hasil dinilai ulang terhadap rencana yang dibangun dari korpus
// SAAT INI: request leaf harus sama sidik bloknya, request merge/book sama sidik Intisari sumbernya,
// jadi hasil untuk teks atau anak yang sudah berubah tidak pernah dipakai.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageBatchResult } from "@anthropic-ai/sdk/resources/messages";
import {
  DIGEST_MERGE_PROMPT,
  DIGEST_SECTION_PROMPT,
  MAX_PROMPT_TOKENS,
  MODELS,
  buildDigestLeafRequest,
  buildDigestMergeRequest,
  judgeDigest,
  messageText,
  mergePointRange,
} from "@surau/llm";
import type {
  DigestSource,
  DigestStage,
  JudgedDigest,
  LeafBlock,
  ModelId,
  QuoteInspection,
  QuoteRange,
} from "@surau/llm";
import type { DigestStance } from "@surau/db";
import { z } from "zod";

import {
  MAX_ATTEMPTS,
  budgetProblem,
  downloadResults,
  inFlight,
  plannedRequest,
  printBatchStatus,
  reconcile,
  requestCost,
  retryModel,
  submit,
  unreconciledProblem,
  waitBatches,
} from "./batch.ts";
import type { PlannedRequest } from "./batch.ts";
import {
  GLOSSARY_RUNS_FILE,
  acceptedDigest,
  glossaryRun,
  readDigestStore,
  writeDigestStore,
} from "./digest-store.ts";
import type { AcceptedDigest, AcceptedPoint, AcceptedQuote, DigestStore } from "./digest-store.ts";
import {
  digestCustomId,
  digestKey,
  parseDigestCustomId,
  quoteInspector,
  quoteLocator,
  stageOf,
} from "./digest-units.ts";
import type { DigestCorpus, DigestLeafUnit, DigestNodeUnit, DigestPlan } from "./digest-units.ts";
import { mapPool } from "./pool.ts";
import {
  readBatches,
  readJsonl,
  storedUsage,
  writeBatches,
  writeJsonl,
  writeText,
} from "./store.ts";
import type { BatchKind, BatchRecord, Failure } from "./store.ts";
import { sha256 } from "./units.ts";

/** Konteks perintah Intisari: folder kerja, korpus + rencana (build lokal atau staging), klien. */
export interface DigestContext {
  dir: string;
  load: () => Promise<{ rows: DigestCorpus; plan: DigestPlan; source: string }>;
  client: () => Anthropic;
}

export const DIGEST_KIND: Readonly<Record<DigestStage, BatchKind>> = {
  leaf: "digest-leaf",
  merge: "digest-merge",
  book: "digest-book",
};

/**
 * Perkiraan token keluaran per request (thinking effort medium + JSON), untuk pagu sebelum ada
 * hasil pilot; biaya aktual selalu dari `usage` saat collect.
 */
export const DIGEST_OUTPUT_EST: Readonly<Record<string, number>> = {
  "digest-leaf": 6_000,
  "digest-merge": 6_000,
  "digest-book": 10_000,
};

const usd = (n: number) => `$${n.toFixed(3)}`;

/** Biaya definisi glosarium (API biasa) di folder yang sama: ikut pagu bersama batch Intisari. */
export function glossarySpentUsd(dir: string): number {
  return readJsonl(join(dir, GLOSSARY_RUNS_FILE), glossaryRun).reduce((a, r) => a + r.cost_usd, 0);
}

// ── Sumber merge/book ────────────────────────────────────────────────────────────────────────

interface ResolvedSource {
  customId: string;
  record: AcceptedDigest;
  key: string;
  title: string;
}

/** Kunci prompt sebuah hasil: `n<seq>` atau `n<seq>p<k>`. */
function keyOf(customId: string): string {
  const p = parseDigestCustomId(customId);
  if (p === null) throw new Error(`custom_id Intisari tidak sah: ${customId}`);
  return digestKey(p.tocNodeId, p.kind === "part" ? p.part : null);
}

export function toSource(s: ResolvedSource): DigestSource {
  const { key, record: r } = s;
  return {
    key,
    title: s.title,
    abstract: r.abstract,
    points: r.points.map((p) => ({
      id: `${key}.g${p.ord}`,
      title: p.title,
      body: p.body,
      stance: p.stance,
      kind: p.kind,
    })),
    quotes: r.quotes.map((q) => ({
      id: `${key}.q${q.ord}`,
      point: q.point_ord === null ? null : `${key}.g${q.point_ord}`,
      translation: q.translation,
    })),
    terms: r.terms,
  };
}

/**
 * sha256 Intisari sumber yang dikirim ke merge/book (judul hanya konteks, tidak ikut): hasil merge
 * yang dibuat dari sumber lain (anak diulang sesudahnya) dianggap usang.
 */
export function digestInputSha(sources: readonly DigestSource[]): string {
  return sha256(JSON.stringify(sources.map(({ title: _title, ...rest }) => rest)));
}

/** Penentu kesegaran hasil terhadap rencana sekarang (memo per custom_id). */
export class Freshness {
  private readonly memo = new Map<string, AcceptedDigest | null>();
  private readonly plan: DigestPlan;
  private readonly accepted: ReadonlyMap<string, AcceptedDigest>;
  private readonly titles: ReadonlyMap<number, string>;

  constructor(
    plan: DigestPlan,
    accepted: ReadonlyMap<string, AcceptedDigest>,
    titles: ReadonlyMap<number, string>,
  ) {
    this.plan = plan;
    this.accepted = accepted;
    this.titles = titles;
  }

  /** Hasil yang masih berlaku untuk sumber sekarang, atau null. */
  record(customId: string): AcceptedDigest | null {
    const known = this.memo.get(customId);
    if (known !== undefined) return known;
    this.memo.set(customId, null);
    const rec = this.accepted.get(customId) ?? null;
    const fresh = rec === null ? null : this.check(customId, rec);
    this.memo.set(customId, fresh);
    return fresh;
  }

  private check(customId: string, rec: AcceptedDigest): AcceptedDigest | null {
    const p = parseDigestCustomId(customId);
    if (p === null) return null;
    // Versi prompt baru = Intisari dibuat ulang (satu kitab tidak bercampur versi prompt); induknya
    // ikut basi lewat sidik sumber.
    if (rec.prompt_version !== currentPrompt(customId)) return null;
    if (stageOf(p.kind) === "leaf") {
      const leaf = this.plan.leafById.get(customId);
      return leaf !== undefined && leaf.sourceSha256 === rec.source_sha256 ? rec : null;
    }
    const node = this.plan.nodeById.get(p.tocNodeId);
    if (node === undefined || node.sourceSha256 !== rec.source_sha256) return null;
    const src = this.sources(node);
    if ("missing" in src) return null;
    return digestInputSha(src.sources.map(toSource)) === rec.input_sha256 ? rec : null;
  }

  /** Sumber merge/book sebuah node: potongan teksnya lalu Intisari final anak-anaknya. */
  sources(node: DigestNodeUnit): { sources: ResolvedSource[] } | { missing: string[] } {
    const want = [
      ...node.parts.map((id, i) => ({ customId: id, title: this.partTitle(node, i + 1) })),
      ...node.children.map((c) => {
        const child = this.plan.nodeById.get(c);
        if (child === undefined) throw new Error(`node anak ${c} tidak ada di rencana`);
        return { customId: child.customId, title: this.titles.get(c) ?? child.heading };
      }),
    ];
    const sources: ResolvedSource[] = [];
    const missing: string[] = [];
    for (const w of want) {
      const record = this.record(w.customId);
      if (record === null) missing.push(w.customId);
      else sources.push({ ...w, record, key: keyOf(w.customId) });
    }
    return missing.length > 0 ? { missing } : { sources };
  }

  private partTitle(node: DigestNodeUnit, part: number): string {
    const piece = node.parts.length > 1 ? `, potongan ${part} dari ${node.parts.length}` : "";
    return node.children.length > 0 ? `Teks pembuka bagian ini${piece}` : `Teks bagian ini${piece}`;
  }
}

export function titlesOf(rows: Pick<DigestCorpus, "toc_title_translation">): Map<number, string> {
  return new Map(
    rows.toc_title_translation
      .filter((t) => t.lang === "id" && t.review_status !== "rejected")
      .map((t) => [t.toc_node_id, t.text]),
  );
}

// ── Menyusun request ─────────────────────────────────────────────────────────────────────────

export function leafRequest(u: DigestLeafUnit, model: ModelId): PlannedRequest {
  return {
    custom_id: u.customId,
    kind: DIGEST_KIND.leaf,
    prompt_version: DIGEST_SECTION_PROMPT.id,
    source_sha256: u.sourceSha256,
    source_chars: u.chars,
    digest: { blocks: u.blocks.map((b) => [b.label, b.passageId, b.start, b.end]) },
    params: buildDigestLeafRequest(
      {
        heading: u.heading,
        titleId: u.titleId,
        intro: u.intro,
        part: u.part ?? 1,
        parts: u.parts,
        blocks: u.blocks,
        points: u.points,
      },
      model,
    ),
  };
}

export function mergeRequest(
  node: DigestNodeUnit,
  sources: readonly ResolvedSource[],
  model: ModelId,
  customId: string = node.customId,
): PlannedRequest {
  const src = sources.map(toSource);
  const available = src.reduce((a, s) => a + s.points.length, 0);
  return {
    custom_id: customId,
    kind: node.stage === "book" ? DIGEST_KIND.book : DIGEST_KIND.merge,
    prompt_version: DIGEST_MERGE_PROMPT.id,
    source_sha256: node.sourceSha256,
    input_sha256: digestInputSha(src),
    source_chars: src.reduce((a, s) => a + JSON.stringify(s).length, 0),
    digest: { sources: sources.map((s) => s.customId) },
    params: buildDigestMergeRequest(
      {
        heading: node.heading,
        titleId: node.titleId,
        tier: node.tier,
        sources: src,
        points: mergePointRange(node.tier, available),
      },
      model,
    ),
  };
}

/** Kunci percobaan: sidik masukan yang benar-benar dikirim (merge/book: sidik Intisari sumber). */
const attemptKey = (r: Pick<PlannedRequest, "source_sha256" | "input_sha256">) =>
  r.input_sha256 ?? r.source_sha256;

function currentPrompt(customId: string): string | null {
  const p = parseDigestCustomId(customId);
  if (p === null) return null;
  return stageOf(p.kind) === "leaf" ? DIGEST_SECTION_PROMPT.id : DIGEST_MERGE_PROMPT.id;
}

/** Bukan percobaan (sumber berubah, atau ID asing): tidak dihitung saat mengulang. */
const NOT_AN_ATTEMPT = new Set(["stale", "stale_input", "unknown_id"]);

function failedKeys(failures: readonly Failure[]): Set<string> {
  return new Set(
    failures
      .filter(
        (f) =>
          !NOT_AN_ATTEMPT.has(f.reason) &&
          (f.prompt_version === undefined || f.prompt_version === currentPrompt(f.custom_id)),
      )
      .map((f) => `${f.custom_id}:${f.source_sha256}`),
  );
}

export interface PendingDigest {
  requests: PlannedRequest[];
  /** Node yang sumbernya belum lengkap (tunggu tahap/gelombang sebelumnya). */
  waiting: { tocNodeId: number; missing: string[] }[];
}

/**
 * Request yang masih perlu dikirim untuk satu tahap: belum ada hasil yang berlaku, belum gagal untuk
 * sumber yang sama dengan prompt saat ini (→ `retry`), dan (merge/book) semua sumbernya berlaku.
 * Tahap merge berjalan bergelombang: bab yang anaknya juga hasil merge menunggu gelombang berikut.
 * `compare` = Intisari Kitab pembanding Haiku 5.5 (pilot).
 */
export function pendingDigestRequests(
  plan: DigestPlan,
  store: DigestStore,
  titles: ReadonlyMap<number, string>,
  stage: DigestStage,
  opts: { compare?: boolean } = {},
): PendingDigest {
  const fresh = new Freshness(plan, store.accepted, titles);
  const failed = failedKeys(store.failures);
  const requests: PlannedRequest[] = [];
  const waiting: PendingDigest["waiting"] = [];
  if (stage === "leaf") {
    for (const u of plan.leaves) {
      if (fresh.record(u.customId) !== null) continue;
      if (failed.has(`${u.customId}:${u.sourceSha256}`)) continue;
      requests.push(leafRequest(u, MODELS.haiku));
    }
    return { requests, waiting };
  }
  for (const node of plan.nodes) {
    if (node.stage !== stage) continue;
    const ids = [
      { id: node.customId, model: stage === "book" ? MODELS.sonnet : MODELS.haiku },
      ...(stage === "book" && opts.compare === true
        ? [{ id: digestCustomId(node.tocNodeId, "book-compare"), model: MODELS.haiku }]
        : []),
    ].filter((x) => fresh.record(x.id) === null);
    if (ids.length === 0) continue;
    const src = fresh.sources(node);
    if ("missing" in src) {
      waiting.push({ tocNodeId: node.tocNodeId, missing: src.missing });
      continue;
    }
    for (const x of ids) {
      const r = mergeRequest(node, src.sources, x.model, x.id);
      if (!failed.has(`${x.id}:${attemptKey(r)}`)) requests.push(r);
    }
  }
  return { requests, waiting };
}

// ── count_tokens + perkiraan ─────────────────────────────────────────────────────────────────

function paramsKey(r: PlannedRequest): string {
  const p = r.params;
  return createHash("sha256")
    .update(JSON.stringify([p.model, p.system, p.messages, p.output_config ?? null]))
    .digest("hex");
}

/** Token prompt setiap request, termasuk skema keluaran (cache di counts.json). */
async function countDigest(
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
  const todo = reqs.filter((r) => !cache.has(paramsKey(r)));
  await mapPool(todo, 8, async (r) => {
    const { input_tokens } = await client.messages.countTokens({
      model: r.params.model,
      system: r.params.system,
      messages: r.params.messages,
      ...(r.params.output_config === undefined ? {} : { output_config: r.params.output_config }),
    });
    cache.set(paramsKey(r), input_tokens);
  });
  writeText(path, JSON.stringify(Object.fromEntries(cache)));
  return new Map(reqs.map((r) => [r.custom_id, cache.get(paramsKey(r)) ?? 0]));
}

/** Token prompt sistem tiap versi prompt Intisari (porsi yang bisa dibaca dari cache). */
async function systemTokens(client: Anthropic): Promise<Record<string, number>> {
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
    [DIGEST_SECTION_PROMPT.id]: (await count(DIGEST_SECTION_PROMPT.system)) - base,
    [DIGEST_MERGE_PROMPT.id]: (await count(DIGEST_MERGE_PROMPT.system)) - base,
  };
}

interface Priced {
  requests: PlannedRequest[];
  counts: Map<string, number>;
  over: PlannedRequest[];
}

async function price(
  client: Anthropic,
  dir: string,
  reqs: readonly PlannedRequest[],
): Promise<Priced> {
  const counts = await countDigest(client, dir, reqs);
  const system = await systemTokens(client);
  const over = reqs.filter((r) => (counts.get(r.custom_id) ?? 0) >= MAX_PROMPT_TOKENS);
  const requests = reqs
    .filter((r) => !over.includes(r))
    .map((r) => ({
      ...r,
      est_usd: requestCost(
        r,
        counts.get(r.custom_id) ?? 0,
        system[r.prompt_version] ?? 0,
        DIGEST_OUTPUT_EST[r.kind] ?? 6_000,
        0.5,
      ),
    }));
  return { requests, counts, over };
}

function printEstimate(
  label: string,
  reqs: readonly PlannedRequest[],
  counts: ReadonlyMap<string, number>,
): void {
  const byModel = new Map<string, PlannedRequest[]>();
  for (const r of reqs) byModel.set(r.params.model, [...(byModel.get(r.params.model) ?? []), r]);
  for (const [model, list] of byModel) {
    const prompt = list.reduce((a, r) => a + (counts.get(r.custom_id) ?? 0), 0);
    const out = list.reduce((a, r) => a + (DIGEST_OUTPUT_EST[r.kind] ?? 0), 0);
    const cost = list.reduce((a, r) => a + (r.est_usd ?? 0), 0);
    const biggest = list.reduce(
      (m, r) =>
        (counts.get(r.custom_id) ?? 0) > m.tokens
          ? { id: r.custom_id, tokens: counts.get(r.custom_id) ?? 0 }
          : m,
      { id: "", tokens: 0 },
    );
    console.info(
      `  ${label} · ${model}: ${list.length} request · prompt ${prompt.toLocaleString("id-ID")} token (terbesar ${biggest.tokens.toLocaleString("id-ID")}, ${biggest.id}) · keluaran ±${out.toLocaleString("id-ID")} · perkiraan ${usd(cost)} (cache 50%)`,
    );
  }
}

const planPath = (dir: string, stage: DigestStage) => join(dir, `plan-${stage}.jsonl`);

export async function runDigestPlan(
  ctx: DigestContext,
  stage: DigestStage,
  opts: { compare?: boolean } = {},
): Promise<number> {
  const { rows, plan, source } = await ctx.load();
  const store = readDigestStore(ctx.dir);
  console.info(
    `Intisari (${source}): ${plan.nodes.length} node, ${plan.leaves.length} request leaf, ${plan.blocked.length} paragraf tidak dikirim (rujukan ayat tidak bisa ditandai).`,
  );
  for (const b of plan.blocked.slice(0, 10)) console.warn(`  ${b.passageId}: ${b.detail}`);
  const pending = pendingDigestRequests(plan, store, titlesOf(rows), stage, opts);
  for (const w of pending.waiting) {
    console.info(`  node ${w.tocNodeId} menunggu: ${w.missing.join(", ")}`);
  }
  if (pending.requests.length === 0) {
    console.info(`Tahap ${stage}: tidak ada request tertunda.`);
    writeJsonl(planPath(ctx.dir, stage), []);
    return 0;
  }
  const priced = await price(ctx.client(), ctx.dir, pending.requests);
  writeJsonl(planPath(ctx.dir, stage), priced.requests);
  const total = priced.requests.reduce((a, r) => a + (r.est_usd ?? 0), 0);
  writeText(
    join(ctx.dir, `plan-${stage}.json`),
    `${JSON.stringify(
      {
        created_at: new Date().toISOString(),
        stage,
        source,
        requests: priced.requests.length,
        prompt_tokens: priced.requests.reduce(
          (a, r) => a + (priced.counts.get(r.custom_id) ?? 0),
          0,
        ),
        est_usd: total,
        waiting: pending.waiting.length,
      },
      null,
      2,
    )}\n`,
  );
  console.info(
    `Tahap ${stage}: ${priced.requests.length} request (gratis: count_tokens, tanpa memanggil model)`,
  );
  printEstimate(stage, priced.requests, priced.counts);
  console.info(`  TOTAL perkiraan ${usd(total)} (cache 50%)`);
  if (priced.over.length > 0) {
    console.error(
      `${priced.over.length} request ≥ ${MAX_PROMPT_TOKENS} token tidak dimasukkan ke rencana: ${priced.over.map((r) => r.custom_id).join(", ")}`,
    );
    return 1;
  }
  console.info(
    `Rencana: ${planPath(ctx.dir, stage)} · kirim: pnpm llm intisari submit --stage ${stage} … --budget <USD> --confirm`,
  );
  return 0;
}

export async function runDigestSubmit(
  ctx: DigestContext,
  stage: DigestStage,
  confirm: boolean,
  opts: { budget?: number; limit?: number; compare?: boolean } = {},
): Promise<number> {
  const unreconciled = unreconciledProblem(ctx.dir);
  if (unreconciled !== null) {
    console.error(unreconciled);
    return 1;
  }
  const planned = readJsonl(planPath(ctx.dir, stage), plannedRequest);
  if (planned.length === 0) {
    console.error(
      `Tidak ada rencana tahap ${stage}. Jalankan dulu: pnpm llm intisari plan --stage ${stage}`,
    );
    return 1;
  }
  const { rows, plan } = await ctx.load();
  const current = new Map(
    // Pembanding Haiku ikut dicocokkan bila ada di rencana (`plan --banding` yang menentukan).
    pendingDigestRequests(plan, readDigestStore(ctx.dir), titlesOf(rows), stage, {
      compare: true,
    }).requests.map((r) => [r.custom_id, r]),
  );
  const busy = inFlight(ctx.dir);
  let stale = 0;
  const ready = planned.filter((r) => {
    const now = current.get(r.custom_id);
    if (now === undefined || attemptKey(now) !== attemptKey(r) || paramsKey(now) !== paramsKey(r)) {
      if (!busy.has(r.custom_id)) stale++;
      return false;
    }
    return !busy.has(r.custom_id);
  });
  if (stale > 0) {
    console.error(
      `${stale} request di rencana sudah tidak berlaku (sumber berubah atau sudah lolos). Jalankan ulang: pnpm llm intisari plan --stage ${stage}`,
    );
    return 1;
  }
  const reqs = opts.limit === undefined ? ready : ready.slice(0, opts.limit);
  if (reqs.length === 0) {
    console.info(`Tahap ${stage}: tidak ada request tersisa untuk dikirim.`);
    return 0;
  }
  if (reqs.some((r) => r.est_usd === undefined)) {
    console.error("Rencana tanpa perkiraan biaya; jalankan ulang plan.");
    return 1;
  }
  const est = reqs.reduce((a, r) => a + (r.est_usd ?? 0), 0);
  console.info(`Tahap ${stage}: kirim ${reqs.length} request · perkiraan ${usd(est)} (cache 50%)`);
  const problem = budgetProblem(ctx.dir, est, confirm, opts.budget, glossarySpentUsd(ctx.dir));
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
  await submit(ctx.client(), ctx.dir, reqs, `digest-${stage}`);
  console.info("Cek: pnpm llm intisari status · tunggu: … wait · sesudahnya: … collect");
  return 0;
}

// ── Kumpulkan + nilai ────────────────────────────────────────────────────────────────────────

const batchResult = z.looseObject({
  custom_id: z.string(),
  result: z.looseObject({ type: z.string() }),
});

const sameRange = (a: { passage_id: number; char_start: number; char_end: number }, b: typeof a) =>
  a.passage_id === b.passage_id && a.char_start === b.char_start && a.char_end === b.char_end;

/** Jangkar dari blok dasar (urut blok): blok bersambung di paragraf yang sama digabung, maks. 9. */
export function anchorsFromBlocks(
  labels: readonly string[],
  leaf: DigestLeafUnit,
): AcceptedPoint["anchors"] {
  const order = new Map(leaf.blocks.map((b, i) => [b.label, i]));
  const blocks = labels
    .map((l) => leaf.blocks[order.get(l) ?? -1])
    .filter((b) => b !== undefined)
    .toSorted((a, b) => (order.get(a.label) ?? 0) - (order.get(b.label) ?? 0));
  const out: AcceptedPoint["anchors"] = [];
  for (const b of blocks) {
    const last = out.at(-1);
    if (last !== undefined && last.passage_id === b.passageId && last.char_end === b.start) {
      last.char_end = b.end;
    } else out.push({ passage_id: b.passageId, char_start: b.start, char_end: b.end });
  }
  return out.slice(0, 9);
}

/**
 * Jangkar gagasan merge/book dari jangkar gagasan sumbernya: bergiliran (jangkar pertama setiap
 * sumber dulu, lalu yang kedua, …) supaya setiap gagasan sumber terwakili, tanpa duplikat, maks. 9.
 */
export function anchorsFromPoints(
  lists: readonly AcceptedPoint["anchors"][],
): AcceptedPoint["anchors"] {
  const out: AcceptedPoint["anchors"] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && out.length < 9; i++) {
    for (const l of lists) {
      const a = l[i];
      if (a === undefined || out.some((x) => sameRange(x, a))) continue;
      out.push({ ...a });
      if (out.length >= 9) break;
    }
  }
  return out;
}

interface JudgeInput {
  plan: DigestPlan;
  rows: DigestCorpus;
  accepted: ReadonlyMap<string, AcceptedDigest>;
  titles: ReadonlyMap<number, string>;
  inspect: (range: QuoteRange) => QuoteInspection;
  locate: (range: QuoteRange, start: string, end: string) => QuoteRange | string;
  passages: ReadonlyMap<number, { text_raw: string }>;
}

type ItemVerdict = { accepted: AcceptedDigest } | { failure: Failure };

function judgeItem(
  input: JudgeInput,
  planned: PlannedRequest,
  message: Message,
  batch: { id: string; ended_at: string },
): ItemVerdict {
  const text = messageText(message);
  const usage = storedUsage(message.usage);
  const fail = (reason: string, details: string[] = []): ItemVerdict => ({
    failure: {
      custom_id: planned.custom_id,
      batch_id: batch.id,
      model: message.model,
      reason,
      details,
      output: text === "" ? null : text,
      at: batch.ended_at,
      source_sha256: attemptKey(planned),
      prompt_version: planned.prompt_version,
      usage,
    },
  });
  const parts = parseDigestCustomId(planned.custom_id);
  if (parts === null) return fail("unknown_id");
  const base = {
    custom_id: planned.custom_id,
    toc_node_id: parts.tocNodeId,
    lang: "id" as const,
    model: message.model,
    prompt_version: planned.prompt_version,
    created_at: batch.ended_at,
    batch_id: batch.id,
    usage,
  };
  if (stageOf(parts.kind) === "leaf") {
    const leaf = input.plan.leafById.get(planned.custom_id);
    if (leaf === undefined || leaf.sourceSha256 !== planned.source_sha256) {
      return fail("stale", ["teks bagian berubah sejak request dibuat"]);
    }
    const stored = planned.digest?.blocks ?? [];
    const same =
      stored.length === leaf.blocks.length &&
      stored.every(([l, p, s, e], i) => {
        const b = leaf.blocks[i];
        return (
          b !== undefined && b.label === l && b.passageId === p && b.start === s && b.end === e
        );
      });
    if (!same) return fail("stale", ["peta blok di catatan request berbeda dengan blok sekarang"]);
    const blocks = new Map<string, LeafBlock>(
      leaf.blocks.map((b) => [
        b.label,
        { passageId: b.passageId, start: b.start, end: b.end, heading: b.heading, ayah: b.ayah },
      ]),
    );
    const v = judgeDigest(message, {
      stage: "leaf",
      blocks,
      points: leaf.points,
      inspectQuote: input.inspect,
      locateQuote: input.locate,
    });
    if (!v.ok) return fail(v.reason, v.details);
    return {
      accepted: acceptedDigest.parse({
        ...base,
        stage: "leaf",
        part: leaf.part,
        tier: "section",
        basis: "text",
        source_sha256: leaf.sourceSha256,
        input_sha256: null,
        opening: null,
        abstract: v.digest.abstract,
        closing: null,
        points: leafPoints(v.digest, leaf),
        quotes: leafQuotes(v.digest, input, planned, message, batch),
        terms: v.digest.terms,
        dropped: v.digest.dropped,
      }),
    };
  }
  const node = input.plan.nodeById.get(parts.tocNodeId);
  if (node === undefined || node.sourceSha256 !== planned.source_sha256) {
    return fail("stale", ["teks subpohon berubah sejak request dibuat"]);
  }
  const fresh = new Freshness(input.plan, input.accepted, input.titles);
  const src = fresh.sources(node);
  if ("missing" in src)
    return fail("stale_input", [`sumber tidak berlaku: ${src.missing.join(", ")}`]);
  const ids = src.sources.map((s) => s.customId);
  const sent = planned.digest?.sources ?? [];
  const sources = src.sources.map(toSource);
  if (
    sent.length !== ids.length ||
    sent.some((id, i) => id !== ids[i]) ||
    digestInputSha(sources) !== planned.input_sha256
  ) {
    return fail("stale_input", ["Intisari sumber berubah atau diulang sesudah request dibuat"]);
  }
  const sourcePoints = new Map<string, AcceptedPoint>();
  const sourceStances = new Map<string, DigestStance>();
  const sourceQuotes = new Map<string, AcceptedQuote>();
  for (const s of src.sources) {
    for (const p of s.record.points) {
      sourcePoints.set(`${s.key}.g${p.ord}`, p);
      sourceStances.set(`${s.key}.g${p.ord}`, p.stance);
    }
    for (const q of s.record.quotes) sourceQuotes.set(`${s.key}.q${q.ord}`, q);
  }
  const stage = node.stage === "book" ? "book" : "merge";
  const v = judgeDigest(message, {
    stage,
    points: mergePointRange(node.tier, sourcePoints.size),
    sourcePoints: sourceStances,
    sourceQuotes: new Set(sourceQuotes.keys()),
  });
  if (!v.ok) return fail(v.reason, v.details);
  return {
    accepted: acceptedDigest.parse({
      ...base,
      stage,
      part: null,
      tier: node.tier,
      basis: node.basis,
      source_sha256: node.sourceSha256,
      input_sha256: planned.input_sha256,
      opening: v.digest.opening,
      abstract: v.digest.abstract,
      closing: v.digest.closing,
      points: v.digest.points.map((p, i) => ({
        ord: i + 1,
        kind: p.kind,
        stance: p.stance,
        title: p.title,
        body: p.body,
        basis: p.basis,
        anchors: anchorsFromPoints(p.basis.map((id) => sourcePoints.get(id)?.anchors ?? [])),
        questions: p.questions,
      })),
      quotes: v.digest.quotes.flatMap((q, j) => {
        if (q.origin !== "child") return [];
        const s = sourceQuotes.get(q.id);
        return s === undefined ? [] : [{ ...s, ord: j + 1, point_ord: q.point }];
      }),
      terms: v.digest.terms,
      dropped: v.digest.dropped,
    }),
  };
}

function leafPoints(d: JudgedDigest, leaf: DigestLeafUnit): AcceptedPoint[] {
  return d.points.map((p, i) => ({
    ord: i + 1,
    kind: p.kind,
    stance: p.stance,
    title: p.title,
    body: p.body,
    basis: p.basis,
    anchors: anchorsFromBlocks(p.basis, leaf),
    questions: p.questions,
  }));
}

function leafQuotes(
  d: JudgedDigest,
  input: JudgeInput,
  planned: PlannedRequest,
  message: Message,
  batch: { ended_at: string },
): AcceptedQuote[] {
  const out: AcceptedQuote[] = [];
  for (const q of d.quotes) {
    if (q.origin !== "text") continue;
    const p = input.passages.get(q.range.passageId);
    if (p === undefined) throw new Error(`paragraf ${q.range.passageId} tidak ada`);
    out.push({
      ord: out.length + 1,
      point_ord: q.point,
      passage_id: q.range.passageId,
      char_start: q.range.start,
      char_end: q.range.end,
      raw_sha256: sha256(p.text_raw.slice(q.range.start, q.range.end)),
      kind: q.quoteKind,
      translation: q.translation,
      model: message.model,
      prompt_version: planned.prompt_version,
      created_at: batch.ended_at,
      origin: planned.custom_id,
    });
  }
  return out;
}

export interface DigestRebuild {
  accepted: number;
  failures: number;
  /** Hasil per batch yang dinilai di cakupan ini. */
  outcomes: Map<string, { accepted: number; invalid: number; failed: number }>;
}

/**
 * Bangun ulang hasil lolos dan kegagalan dari hasil mentah semua batch yang sudah dikumpulkan, dengan
 * aturan validasi dan rencana SAAT INI (gratis; `collect` dan `rejudge`). Hanya node dalam cakupan
 * rencana yang dinilai; hasil node lain dibawa apa adanya, supaya rejudge satu kitab tidak menghapus
 * hasil kitab lain. Urutan: tahap leaf, lalu merge (anak sebelum induk), lalu book; untuk custom_id
 * yang sama, hasil batch yang lebih baru menimpa yang lama.
 */
export function rebuildDigests(dir: string, plan: DigestPlan, rows: DigestCorpus): DigestRebuild {
  const previous = readDigestStore(dir);
  const store: DigestStore = { accepted: new Map(), failures: [] };
  const inScope = (id: string) => {
    const p = parseDigestCustomId(id);
    return p !== null && plan.scope.has(p.tocNodeId);
  };
  for (const [id, a] of previous.accepted) if (!inScope(id)) store.accepted.set(id, a);
  for (const f of previous.failures) if (!inScope(f.custom_id)) store.failures.push(f);

  const batches = readBatches(dir)
    .filter((b) => b.collected_at !== null && b.ended_at !== null)
    .toSorted((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const order = new Map(plan.nodes.map((n, i) => [n.tocNodeId, i]));
  const items: {
    batch: BatchRecord;
    customId: string;
    planned: PlannedRequest | undefined;
    result: unknown;
  }[] = [];
  for (const b of batches) {
    const planned = new Map(
      readJsonl(join(dir, "requests", `${b.id}.jsonl`), plannedRequest).map((r) => [
        r.custom_id,
        r,
      ]),
    );
    for (const r of readJsonl(join(dir, "results", `${b.id}.jsonl`), batchResult)) {
      if (!inScope(r.custom_id)) continue;
      items.push({
        batch: b,
        customId: r.custom_id,
        planned: planned.get(r.custom_id),
        result: r.result,
      });
    }
  }
  // Leaf dulu, lalu merge/book menurut pascaurut rencana (bukan menurut tahap): Intisari rub' (merge)
  // bergantung pada Intisari Kitab anaknya (book), jadi urutan tahap saja akan membuatnya basi.
  const rank = (id: string) => {
    const p = parseDigestCustomId(id);
    if (p === null) return [2, 0];
    return stageOf(p.kind) === "leaf" ? [0, 0] : [1, order.get(p.tocNodeId) ?? 0];
  };
  items.sort((x, y) => {
    const [a1 = 0, a2 = 0] = rank(x.customId);
    const [b1 = 0, b2 = 0] = rank(y.customId);
    return a1 - b1 || a2 - b2;
  });

  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const input: JudgeInput = {
    plan,
    rows,
    accepted: store.accepted,
    titles: titlesOf(rows),
    inspect: quoteInspector(rows),
    locate: quoteLocator(rows),
    passages,
  };
  const outcomes = new Map<string, { accepted: number; invalid: number; failed: number }>();
  for (const it of items) {
    const o = outcomes.get(it.batch.id) ?? { accepted: 0, invalid: 0, failed: 0 };
    outcomes.set(it.batch.id, o);
    const endedAt = it.batch.ended_at ?? it.batch.created_at;
    const base = {
      custom_id: it.customId,
      batch_id: it.batch.id,
      details: [],
      output: null,
      at: endedAt,
      source_sha256: it.planned === undefined ? "" : attemptKey(it.planned),
      ...(it.planned === undefined ? {} : { prompt_version: it.planned.prompt_version }),
      usage: null,
    };
    if (it.planned === undefined) {
      store.failures.push({ ...base, model: it.batch.model, reason: "unknown_id" });
      o.failed++;
      continue;
    }
    const result = it.result as MessageBatchResult;
    if (result.type !== "succeeded") {
      const reason = result.type === "errored" ? `errored:${result.error.error.type}` : result.type;
      store.failures.push({ ...base, model: String(it.planned.params.model), reason });
      o.failed++;
      continue;
    }
    const v = judgeItem(input, it.planned, result.message, { id: it.batch.id, ended_at: endedAt });
    if ("failure" in v) {
      store.failures.push(v.failure);
      o.invalid++;
    } else {
      store.accepted.set(it.customId, v.accepted);
      o.accepted++;
    }
  }
  writeBatches(
    dir,
    readBatches(dir).map((b) => {
      const o = outcomes.get(b.id);
      return o === undefined ? b : { ...b, outcome: o };
    }),
  );
  writeDigestStore(dir, store);
  return { accepted: store.accepted.size, failures: store.failures.length, outcomes };
}

function printRebuild(dir: string, r: DigestRebuild): void {
  for (const b of readBatches(dir)) {
    const o = r.outcomes.get(b.id);
    if (o === undefined) continue;
    console.info(`  ${b.name}: lolos ${o.accepted}, ditolak ${o.invalid}, gagal API ${o.failed}`);
  }
  console.info(`Intisari lolos (semua cakupan): ${r.accepted} · kegagalan tercatat: ${r.failures}`);
}

export async function runDigestCollect(ctx: DigestContext): Promise<number> {
  const pending = await downloadResults(ctx.client(), ctx.dir);
  const { rows, plan } = await ctx.load();
  printRebuild(ctx.dir, rebuildDigests(ctx.dir, plan, rows));
  if (pending > 0) console.info(`${pending} batch belum selesai; ulangi collect nanti.`);
  return 0;
}

export async function runDigestRejudge(ctx: DigestContext): Promise<number> {
  const { rows, plan } = await ctx.load();
  printRebuild(ctx.dir, rebuildDigests(ctx.dir, plan, rows));
  return 0;
}

export async function runDigestWait(ctx: DigestContext): Promise<number> {
  return waitBatches(ctx.client(), ctx.dir);
}

export async function runDigestStatus(ctx: DigestContext): Promise<number> {
  return printBatchStatus(ctx.client(), ctx.dir);
}

export async function runDigestReconcile(ctx: DigestContext, chosenId?: string): Promise<number> {
  const r = await reconcile(ctx.client(), ctx.dir, chosenId === undefined ? {} : { chosenId });
  console.info(
    `reconcile: ${r.status}${"record" in r ? ` (${r.record.id})` : ""}${"ids" in r ? ` (${r.ids.join(", ")})` : ""}${"reason" in r ? `: ${r.reason}` : ""}`,
  );
  return r.status === "none-open" || r.status === "adopted" || r.status === "released" ? 0 : 1;
}

// ── Ulangan ──────────────────────────────────────────────────────────────────────────────────

export interface DigestRetry {
  requests: PlannedRequest[];
  givenUp: string[];
}

/**
 * Request ulangan untuk kegagalan yang belum lolos (sumber dan prompt saat ini). Haiku diulang, lalu
 * Sonnet 5.5 untuk refusal atau percobaan terakhir (`retryModel`, ADR-043); Intisari Kitab selalu
 * Sonnet; pembanding Haiku tidak dinaikkan dan menyerah sesudah dua percobaan.
 */
export function digestRetries(
  plan: DigestPlan,
  store: DigestStore,
  titles: ReadonlyMap<number, string>,
  busy: ReadonlySet<string>,
): DigestRetry {
  const fresh = new Freshness(plan, store.accepted, titles);
  const relevant = store.failures.filter(
    (f) =>
      !NOT_AN_ATTEMPT.has(f.reason) &&
      (f.prompt_version === undefined || f.prompt_version === currentPrompt(f.custom_id)) &&
      fresh.record(f.custom_id) === null,
  );
  // Hanya percobaan untuk masukan TERBARU yang dihitung (anak diulang = masukan baru, jatah baru).
  const latest = new Map<string, { key: string; at: string }>();
  for (const f of relevant) {
    const l = latest.get(f.custom_id);
    if (l === undefined || f.at >= l.at)
      latest.set(f.custom_id, { key: f.source_sha256, at: f.at });
  }
  const state = new Map<
    string,
    { attempts: number; refusal: boolean; sonnet: number; key: string }
  >();
  for (const f of relevant) {
    const key = latest.get(f.custom_id)?.key;
    if (key !== f.source_sha256) continue;
    const s = state.get(f.custom_id) ?? { attempts: 0, refusal: false, sonnet: 0, key };
    s.attempts++;
    s.refusal ||= f.reason === "refusal";
    s.sonnet += f.model === MODELS.sonnet ? 1 : 0;
    state.set(f.custom_id, s);
  }
  const requests: PlannedRequest[] = [];
  const givenUp: string[] = [];
  for (const [id, s] of state) {
    if (busy.has(id)) continue;
    const p = parseDigestCustomId(id);
    if (p === null) continue;
    let model: ModelId | null;
    if (p.kind === "book-compare") model = s.attempts >= 2 ? null : MODELS.haiku;
    else if (p.kind === "book") model = s.attempts >= MAX_ATTEMPTS ? null : MODELS.sonnet;
    else
      model = retryModel({
        attempts: s.attempts,
        refusal: s.refusal,
        sonnet: s.sonnet,
        summary: false,
      });
    if (model === null) {
      givenUp.push(id);
      continue;
    }
    if (stageOf(p.kind) === "leaf") {
      const leaf = plan.leafById.get(id);
      if (leaf !== undefined && leaf.sourceSha256 === s.key)
        requests.push(leafRequest(leaf, model));
      continue;
    }
    const node = plan.nodeById.get(p.tocNodeId);
    if (node === undefined) continue;
    const src = fresh.sources(node);
    if ("missing" in src) continue;
    const r = mergeRequest(node, src.sources, model, id);
    if (attemptKey(r) === s.key) requests.push(r);
  }
  return { requests, givenUp };
}

export async function runDigestRetry(
  ctx: DigestContext,
  confirm: boolean,
  opts: { budget?: number } = {},
): Promise<number> {
  const unreconciled = unreconciledProblem(ctx.dir);
  if (unreconciled !== null) {
    console.error(unreconciled);
    return 1;
  }
  const { rows, plan } = await ctx.load();
  const { requests, givenUp } = digestRetries(
    plan,
    readDigestStore(ctx.dir),
    titlesOf(rows),
    inFlight(ctx.dir),
  );
  console.info(
    `Ulangan Intisari: ${requests.length} request (${requests.filter((r) => r.params.model === MODELS.sonnet).length} ke Sonnet 5.5); menyerah: ${givenUp.length}${givenUp.length > 0 ? ` (${givenUp.join(", ")})` : ""}`,
  );
  if (requests.length === 0) return 0;
  const priced = await price(ctx.client(), ctx.dir, requests);
  const est = priced.requests.reduce((a, r) => a + (r.est_usd ?? 0), 0);
  console.info(`Perkiraan ulangan ${usd(est)} (cache 50%)`);
  for (const r of priced.over) {
    console.error(
      `  ${r.custom_id}: prompt ≥ ${MAX_PROMPT_TOKENS} token, tidak diulang (pecah dulu).`,
    );
  }
  const problem = budgetProblem(ctx.dir, est, confirm, opts.budget, glossarySpentUsd(ctx.dir));
  if (problem !== null) {
    console.error(problem);
    return 1;
  }
  if (!confirm) {
    console.info("Belum dikirim (berbayar). Tambahkan --budget <USD> --confirm.");
    return 0;
  }
  const n = readBatches(ctx.dir).filter((b) => b.name.includes("-retry")).length + 1;
  await submit(ctx.client(), ctx.dir, priced.requests, `retry${n}`);
  return 0;
}
