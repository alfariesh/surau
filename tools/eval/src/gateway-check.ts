// Uji passthrough AI Gateway mode BYOK (S19, ADR-013 butir "uji passthrough"): request IDENTIK
// dikirim langsung ke api.anthropic.com dan lewat gateway `surau-gw`, lalu bentuk respons
// dibandingkan: event SSE, sitasi content_block_location, usage cache, keluaran JSON routing,
// header beta, dan header gateway. Berbayar (±US$0,01): hanya berjalan dengan --confirm.
// Tanpa --confirm: rencana + count_tokens gratis (kalibrasi perkiraan token).
// Kunci dibaca dari .env (ANTHROPIC_API_KEY, CF_AIG_TOKEN); nilainya tidak pernah dicetak.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  MessageCreateParamsBase,
  RawMessageStreamEvent,
  Usage,
} from "@anthropic-ai/sdk/resources/messages";
import { answerPassages, answerToc } from "@surau/core";
import type { AnswerTocNode } from "@surau/core";
import {
  MODELS,
  addUsage,
  buildAnswerRequest,
  buildDoc,
  buildRouteRequest,
  createAnthropic,
  createGatewayAnthropic,
  docContext,
  docLabel,
  emptyTotals,
  estimateTextTokens,
  fuse,
  parseRoute,
  searchLists,
  tocText,
  withPairs,
} from "@surau/llm";
import { openCorpus } from "./open-corpus.ts";

export const DEFAULT_GATEWAY_URL =
  "https://gateway.ai.cloudflare.com/v1/8be116534f7237b451f28adec91fbbbd/surau-gw/anthropic";
// Soal publik eval Jawab (j001); bukan holdout.
const QUESTION = "Bagaimana al-Ghazali menjelaskan kasih sayang guru kepada murid?";
const MAX_DOCS = 8;
/** Ukuran dokumen untuk kalibrasi perkiraan token (count_tokens gratis). */
const CALIBRATE_DOCS = [1, 4, 8, 16, 30];

const repo = resolve(import.meta.dirname, "../../..");
const { values } = parseArgs({ options: { confirm: { type: "boolean", default: false } } });

interface StreamReport {
  status: number;
  stop_reason: string | null;
  events: Record<string, number>;
  deltas: Record<string, number>;
  text_blocks: number;
  cited_blocks: number;
  citation_types: Record<string, number>;
  citation_indices_valid: boolean;
  usage: Partial<Usage>;
  ttfb_ms: number;
  total_ms: number;
  gateway_headers: Record<string, string>;
}

const arabicCount = (text: string) => (text.match(/\p{Script=Arabic}/gu) ?? []).length;
const inc = (o: Record<string, number>, k: string) => {
  o[k] = (o[k] ?? 0) + 1;
};
/** Header gateway (cf-aig-*), tanpa nilai yang bisa memuat kredensial. */
function gatewayHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    if (k.startsWith("cf-aig-") && !k.includes("authorization")) out[k] = v.slice(0, 80);
  });
  return out;
}

async function streamOnce(
  client: Anthropic,
  params: MessageCreateParamsBase,
  docs: { segments: unknown[] }[],
): Promise<StreamReport> {
  const t0 = performance.now();
  const { data, response } = await client.messages
    .create({ ...params, stream: true })
    .withResponse();
  const ttfb = performance.now() - t0;
  const r: StreamReport = {
    status: response.status,
    stop_reason: null,
    events: {},
    deltas: {},
    text_blocks: 0,
    cited_blocks: 0,
    citation_types: {},
    citation_indices_valid: true,
    usage: {},
    ttfb_ms: Math.round(ttfb),
    total_ms: 0,
    gateway_headers: gatewayHeaders(response.headers),
  };
  const cited = new Set<number>();
  for await (const e of data as AsyncIterable<RawMessageStreamEvent>) {
    inc(r.events, e.type);
    if (e.type === "message_start") r.usage = { ...e.message.usage };
    if (e.type === "content_block_start" && e.content_block.type === "text") r.text_blocks++;
    if (e.type === "content_block_delta") {
      inc(r.deltas, e.delta.type);
      if (e.delta.type === "citations_delta") {
        const c = e.delta.citation;
        inc(r.citation_types, c.type);
        cited.add(e.index);
        if (c.type === "content_block_location") {
          const doc = docs[c.document_index];
          if (
            doc === undefined ||
            c.start_block_index < 0 ||
            c.end_block_index <= c.start_block_index ||
            c.end_block_index > doc.segments.length
          )
            r.citation_indices_valid = false;
        }
      }
    }
    if (e.type === "message_delta") {
      r.stop_reason = e.delta.stop_reason;
      r.usage = { ...r.usage, ...e.usage } as Partial<Usage>;
    }
  }
  r.cited_blocks = cited.size;
  r.total_ms = Math.round(performance.now() - t0);
  return r;
}

async function main() {
  if (existsSync(join(repo, ".env"))) process.loadEnvFile(join(repo, ".env"));
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const token = process.env.CF_AIG_TOKEN ?? "";
  const gatewayUrl = process.env.SURAU_AI_GATEWAY_URL ?? DEFAULT_GATEWAY_URL;
  if (apiKey === "") throw new Error(".env tidak memuat ANTHROPIC_API_KEY (T-11).");
  const direct = createAnthropic(apiKey, { maxRetries: 0 });

  const corpus = await openCorpus(repo, false);
  try {
    const db = corpus.db;
    const nodes = await answerToc(db, 1);
    const toc = new Map<number, AnswerTocNode>(nodes.map((n) => [n.id, n]));
    const tocString = tocText(nodes);
    const ranked = fuse(await searchLists(db, QUESTION, null));
    const passages = new Map((await answerPassages(db, ranked)).map((p) => [p.id, p]));
    const labels = new Map([...passages.values()].map((p) => [p.id, docLabel(p)]));
    const allDocs = withPairs(ranked, passages).map((id) => {
      const p = passages.get(id)!;
      return buildDoc(p, docContext(p, toc, labels));
    });
    const docs = allDocs.slice(0, MAX_DOCS);
    const answer = buildAnswerRequest(docs, QUESTION);
    const route = buildRouteRequest(tocString, QUESTION);

    // Kalibrasi gratis: perkiraan vs count_tokens.
    const [answerCount, routeCount] = await Promise.all([
      direct.messages.countTokens({
        model: answer.model,
        system: answer.system!,
        messages: answer.messages,
      }),
      direct.messages.countTokens({
        model: route.model,
        system: route.system!,
        messages: route.messages,
      }),
    ]);
    const docEstimate = docs.reduce((n, d) => n + d.tokens, 0);
    const sizes = [];
    for (const k of CALIBRATE_DOCS) {
      const subset = allDocs.slice(0, k);
      const req = buildAnswerRequest(subset, QUESTION);
      const counted = await direct.messages.countTokens({
        model: req.model,
        system: req.system!,
        messages: req.messages,
      });
      sizes.push({
        docs: subset.length,
        blocks: subset.reduce((n, d) => n + d.segments.length, 0),
        arabic_chars: subset.reduce((n, d) => n + arabicCount(d.passage.text_raw + d.context), 0),
        other_chars: subset.reduce(
          (n, d) =>
            n +
            (d.passage.text_raw + d.context).length -
            arabicCount(d.passage.text_raw + d.context),
          0,
        ),
        estimate: subset.reduce((n, d) => n + d.tokens, 0),
        counted: counted.input_tokens,
      });
    }
    const calibration = {
      docs: docs.length,
      blocks: docs.reduce((n, d) => n + d.segments.length, 0),
      doc_tokens_estimate: docEstimate,
      answer_prompt_counted: answerCount.input_tokens,
      route_prompt_counted: routeCount.input_tokens,
      toc_chars: tocString.length,
      toc_estimate: estimateTextTokens(tocString),
      sizes,
    };
    if (!values.confirm) {
      console.log(
        JSON.stringify(
          {
            plan: true,
            calibration,
            note: "count_tokens gratis; tambahkan --confirm untuk uji berbayar (±US$0,01)",
          },
          null,
          2,
        ),
      );
      return;
    }

    if (token === "")
      throw new Error(
        ".env tidak memuat CF_AIG_TOKEN. Tambahkan token gateway (T-14) lewat Terminal.",
      );
    const gateway = createGatewayAnthropic(gatewayUrl, token, { maxRetries: 0 });
    const totals = emptyTotals();
    const run = async (label: string, client: Anthropic) => {
      const first = await streamOnce(client, answer, docs);
      const second = await streamOnce(client, answer, docs);
      const t0 = performance.now();
      const { data: routed, response: routeRes } = await client.messages
        .create(route)
        .withResponse();
      const routeMs = Math.round(performance.now() - t0);
      const beta = await client.beta.messages.create({
        model: MODELS.haiku,
        max_tokens: 256,
        betas: ["cache-diagnosis-2026-04-07"],
        diagnostics: { previous_message_id: null },
        output_config: { effort: "low" },
        messages: [{ role: "user", content: "Balas dengan satu kata: siap" }],
      });
      for (const s of [first, second])
        addUsage(totals, MODELS.haiku, s.usage as Usage, { batch: false });
      addUsage(totals, MODELS.haiku, routed.usage, { batch: false });
      addUsage(totals, MODELS.haiku, beta.usage, { batch: false });
      const parsed = parseRoute(routed, new Set(toc.keys()));
      return {
        label,
        first,
        second,
        route: {
          status: routeRes.status,
          stop_reason: routed.stop_reason,
          parsed_ok: parsed !== null,
          sections: parsed?.sections.length ?? 0,
          queries: parsed?.queries.length ?? 0,
          usage: routed.usage,
          ms: routeMs,
          gateway_headers: gatewayHeaders(routeRes.headers),
        },
        beta_diagnostics_field: "diagnostics" in beta,
      };
    };
    const a = await run("direct", direct);
    const b = await run("gateway", gateway);
    const same = (x: Record<string, number>, y: Record<string, number>) =>
      Object.keys({ ...x, ...y }).every((k) => (x[k] ?? 0) > 0 === (y[k] ?? 0) > 0);
    const checks = {
      status_200: [a.first, a.second, b.first, b.second].every((s) => s.status === 200),
      event_types_same: same(a.first.events, b.first.events),
      delta_types_same: same(a.first.deltas, b.first.deltas),
      citations_delta_both:
        (a.first.deltas.citations_delta ?? 0) > 0 && (b.first.deltas.citations_delta ?? 0) > 0,
      only_content_block_location:
        Object.keys({ ...a.first.citation_types, ...b.first.citation_types }).join() ===
        "content_block_location",
      citation_indices_valid: [a.first, a.second, b.first, b.second].every(
        (s) => s.citation_indices_valid,
      ),
      cache_read_second_direct: (a.second.usage.cache_read_input_tokens ?? 0) > 0,
      cache_read_second_gateway: (b.second.usage.cache_read_input_tokens ?? 0) > 0,
      cache_creation_field_gateway: b.first.usage.cache_creation !== undefined,
      route_json_both: a.route.parsed_ok && b.route.parsed_ok,
      beta_header_both: a.beta_diagnostics_field && b.beta_diagnostics_field,
      gateway_headers_present: Object.keys(b.first.gateway_headers).length > 0,
    };
    console.log(
      JSON.stringify(
        { calibration, checks, direct: a, gateway: b, cost_usd: Number(totals.costUsd.toFixed(6)) },
        null,
        2,
      ),
    );
  } finally {
    await corpus.dispose();
  }
}

try {
  await main();
} catch (error) {
  // Jangan cetak body API (bisa memuat isi request) atau header.
  const e = error as { status?: unknown; name?: unknown; message?: unknown };
  // Galat pemrograman (bukan API) aman dicetak lengkap.
  if (error instanceof ReferenceError || error instanceof TypeError) console.error(error);
  console.error(
    typeof e.status === "number"
      ? `Gagal: HTTP ${e.status} (${typeof e.name === "string" ? e.name : "galat"}).`
      : error instanceof Error && error.constructor === Error
        ? error.message
        : `Gagal: ${typeof e.name === "string" ? e.name : "galat"}.`,
  );
  process.exitCode = 1;
}
