// Worker Jawab Surau (S19, ADR-010, ADR-064). Satu route kerja: POST /jawab → SSE. Tanpa alamat
// publik (wrangler.jsonc): hanya surau-web yang memanggilnya lewat service binding. Guard biaya
// pengguna umum (Turnstile, kuota, ledger) menyusul di S20; di sini: sakelar `jawab_enabled`,
// validasi masukan, cache jawaban terverifikasi, dan log tanpa teks pertanyaan.
import type Anthropic from "@anthropic-ai/sdk";
import {
  getAnswerCache,
  getCorpusMeta,
  getSettings,
  putAnswerCache,
  touchAnswerCache,
} from "@surau/db";
import {
  JAWAB_PROMPT_VERSION,
  QUESTION_MAX_CHARS,
  answerCacheKey,
  createAnthropic,
  createGatewayAnthropic,
  runJawab,
} from "@surau/llm";
import type { JawabEvent, JawabResult } from "@surau/llm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import { emptyLog, resultLog } from "./log.ts";

export const BODY_MAX_BYTES = 8 * 1024;
/** Umur cache jawaban (ADR-064). Kunci juga berganti bila korpus/prompt berganti. */
export const CACHE_TTL_DAYS = 30;
const HEARTBEAT_MS = 10_000;

/** Hasil yang dikirim ke web: tanpa diagnostik (memuat kueri turunan pertanyaan) dan usage. */
export type PublicResult = Omit<JawabResult, "diagnostics" | "usage" | "cost_usd" | "latency_ms">;
export function publicResult(r: JawabResult): PublicResult {
  const { diagnostics: _d, usage: _u, cost_usd: _c, latency_ms: _l, ...rest } = r;
  return rest;
}

export const jawabRequest = z.strictObject({
  question: z
    .string()
    .trim()
    .min(3)
    .max(QUESTION_MAX_CHARS)
    .refine((s) => !/\p{Cc}/u.test(s.replaceAll(/[\n\t]/gu, " ")), "karakter kontrol"),
});

export interface AppDeps {
  /** Klien Anthropic untuk env ini; `null` = belum dikonfigurasi (secret belum dipasang). */
  anthropic: (env: Cloudflare.Env) => Anthropic | null;
  now: () => Date;
  /** Edisi daftar isi routing (tes memakai fixture edisi lain); bawaan Ihya. */
  editionId?: number;
}

export function defaultAnthropic(env: Cloudflare.Env): Anthropic | null {
  const opts = { maxRetries: 1, timeout: 60_000 };
  if (env.LLM_MODE === "gateway" && env.CF_AIG_TOKEN)
    return createGatewayAnthropic(env.AI_GATEWAY_URL, env.CF_AIG_TOKEN, opts);
  if (env.LLM_MODE === "direct" && env.ANTHROPIC_API_KEY)
    return createAnthropic(env.ANTHROPIC_API_KEY, opts);
  return null;
}

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function readBody(req: Request): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? "0") > BODY_MAX_BYTES) return null;
  const text = await req.text();
  return new TextEncoder().encode(text).byteLength > BODY_MAX_BYTES ? null : text;
}

export function createApp(deps: Partial<AppDeps> = {}) {
  const anthropicFor = deps.anthropic ?? defaultAnthropic;
  const now = deps.now ?? (() => new Date());
  const app = new Hono<{ Bindings: Cloudflare.Env }>();

  app.get("/health", (c) => c.json({ ok: true, environment: c.env.ENVIRONMENT }));

  app.post("/jawab", async (c) => {
    const env = c.env;
    const log = (entry: object) => console.info(JSON.stringify(entry));
    if (!(c.req.header("content-type") ?? "").toLowerCase().startsWith("application/json"))
      return json(415, { error: "unsupported_media_type" });
    const raw = await readBody(c.req.raw);
    if (raw === null) return json(413, { error: "too_large" });
    let parsed: z.infer<typeof jawabRequest>;
    try {
      parsed = jawabRequest.parse(JSON.parse(raw));
    } catch {
      return json(400, { error: "invalid" });
    }
    const settings = await getSettings(env.APP_DB);
    if (!settings.jawab_enabled) {
      log(emptyLog(env.ENVIRONMENT, "disabled", "switch_off"));
      return json(503, { error: "disabled" });
    }
    const anthropic = anthropicFor(env);
    if (anthropic === null) {
      log(emptyLog(env.ENVIRONMENT, "disabled", "not_configured"));
      return json(503, { error: "not_configured" });
    }
    const question = parsed.question;
    const meta = await getCorpusMeta(env.CORPUS_DB);
    // `built_at` ikut kunci: korpus yang dimuat ulang tanpa versi baru (staging) tidak memakai
    // sitasi lama dari cache.
    const corpusKey = `${meta.corpus_version ?? "unknown"}@${meta.built_at ?? ""}`;
    const key = await answerCacheKey(question, corpusKey, JAWAB_PROMPT_VERSION);
    const cached = await getAnswerCache(env.APP_DB, key, now().toISOString());

    return streamSSE(c, async (stream) => {
      const send = (event: string, data: unknown) =>
        stream.writeSSE({ event, data: JSON.stringify(data) });
      if (cached !== null) {
        c.executionCtx.waitUntil(touchAnswerCache(env.APP_DB, key));
        await send("done", {
          result: JSON.parse(cached.result_json) as PublicResult,
          cached: true,
        });
        log({
          ...emptyLog(env.ENVIRONMENT, cached.outcome, null),
          cached: true,
          model: cached.model,
          prompt_version: cached.prompt_version,
          corpus_version: cached.corpus_version,
        });
        return;
      }
      const controller = new AbortController();
      stream.onAbort(() => controller.abort());
      const heartbeat = setInterval(() => {
        if (!stream.aborted) void stream.write(": hb\n\n");
      }, HEARTBEAT_MS);
      const emit = async (e: JawabEvent) => {
        if (stream.aborted) return;
        if (e.type === "stage") await send("stage", { stage: e.stage });
        else if (e.type === "block")
          await send("block", { block: e.block, citations: e.citations });
        else if (e.type === "reset") await send("reset", {});
        else if (e.type === "done")
          await send("done", { result: publicResult(e.result), cached: false });
        else await send("fallback", { result: publicResult(e.result) });
      };
      try {
        const result = await runJawab(
          {
            corpus: env.CORPUS_DB,
            anthropic,
            emit,
            signal: controller.signal,
            ...(deps.editionId === undefined ? {} : { editionId: deps.editionId }),
            headers: {
              "cf-aig-metadata": JSON.stringify({ app: "surau-api", env: env.ENVIRONMENT }),
            },
          },
          question,
        );
        log(resultLog(env.ENVIRONMENT, result, false));
        // Hanya hasil utuh yang di-cache: jawaban terpotong (`max_tokens`) atau prompt di atas batas
        // tidak disajikan ulang selama 30 hari.
        const complete = !result.diagnostics.truncated && !result.diagnostics.over_prompt_limit;
        if (complete && result.outcome !== "fallback" && result.model !== null) {
          const created = now();
          const expires = new Date(created.getTime() + CACHE_TTL_DAYS * 86_400_000);
          c.executionCtx.waitUntil(
            putAnswerCache(env.APP_DB, {
              key,
              corpus_version: result.corpus_version,
              prompt_version: result.prompt_version,
              model: result.model,
              outcome: result.outcome,
              result_json: JSON.stringify(publicResult(result)),
              created_at: created.toISOString(),
              expires_at: expires.toISOString(),
            }).catch((error: unknown) => {
              // Mis. CHECK panjang result_json; hanya nama galat yang dicatat.
              log({
                event: "jawab_cache_error",
                name: error instanceof Error ? error.name : "unknown",
              });
            }),
          );
        }
      } catch (error) {
        if (controller.signal.aborted) {
          // Klien membatalkan: request Anthropic ikut dibatalkan; biaya parsial tidak diketahui di
          // sini (lihat Analytics gateway), tetapi kejadiannya tercatat.
          log(emptyLog(env.ENVIRONMENT, "aborted", null));
        } else {
          // Pesan internal (bisa memuat isi) tidak pernah dikirim ke klien atau log.
          log(emptyLog(env.ENVIRONMENT, "error", error instanceof Error ? error.name : "unknown"));
          await send("error", { error: "internal" });
        }
      } finally {
        clearInterval(heartbeat);
      }
    });
  });

  app.notFound(() => json(404, { error: "not_found" }));
  app.onError((error) => {
    console.error(JSON.stringify({ event: "jawab_error", name: error.name }));
    return json(500, { error: "internal" });
  });
  return app;
}

export default { fetch: createApp().fetch } satisfies ExportedHandler<Cloudflare.Env>;
