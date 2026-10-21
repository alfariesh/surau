// Worker Jawab Surau (S19–S20; ADR-010, ADR-064, ADR-065). Route kerja: `POST /jawab` → SSE dan
// `GET /jawab/status`. Tanpa alamat publik (wrangler.jsonc): hanya surau-web yang memanggilnya lewat
// service binding, dan web meneruskan nilai cookie anon (`x-surau-anon`) serta IP klien
// (`x-surau-ip`). Guard S20 berurutan: masukan → sakelar + secret → cookie anon / Turnstile → burst
// → kuota harian → cache → reservasi anggaran → pipeline (ulangan Sonnet direservasi terpisah) →
// komit biaya aktual. Log tanpa teks pertanyaan, tanpa IP, tanpa ID anon.
import type Anthropic from "@anthropic-ai/sdk";
import {
  JAWAB_BODY_MAX_BYTES,
  TAKHRIJ_TERMS_VERSION,
  evalHash,
  jawabRequest,
  parseUstadzKeys,
} from "@surau/core";
import type { JawabRequest, JawabStatus } from "@surau/core";
import {
  EMPTY_LEDGER_USAGE,
  MICRO,
  budgetPeriod,
  consumeQuota,
  getAnswerCache,
  getBudget,
  getCorpusMeta,
  getSettings,
  getTakhrijReviews,
  markBudgetWarning,
  putAnswerCache,
  quotaDay,
  quotaUsed,
  reserveBudget,
  settleLedger,
  takhrijReviewsChangedSince,
  toMicro,
  touchAnswerCache,
} from "@surau/db";
import type { D1Db, LedgerOutcome, LedgerUsage } from "@surau/db";
import {
  JAWAB_PIPELINE_VERSION,
  JAWAB_PROMPT_VERSION,
  MODELS,
  answerCacheKey,
  createAnthropic,
  createGatewayAnthropic,
  answerWorstUsd,
  jawabReserveUsd,
  retryReserveUsd,
  routeWorstUsd,
  runJawab,
} from "@surau/llm";
import type { JawabEvent, JawabResult, ModelId, UsageTotals } from "@surau/llm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { runCron } from "./cron.ts";
import {
  ANON_TTL_SECONDS,
  SECRET_MIN_LENGTH,
  anonSetCookie,
  cacheKey,
  newAnonId,
  quotaSubjects,
  signAnon,
  verifyAnon,
} from "./keys.ts";
import { emptyLog, rejectedLog, resultLog } from "./log.ts";
import { TURNSTILE_TEST_SECRETS, verifyTurnstile } from "./turnstile.ts";

export const BODY_MAX_BYTES = JAWAB_BODY_MAX_BYTES;
/** Umur cache jawaban (ADR-064). Kunci juga berganti bila korpus/prompt berganti. */
export const CACHE_TTL_DAYS = 30;
const HEARTBEAT_MS = 10_000;
/** Header internal dari surau-web (service binding); tidak pernah datang dari internet. */
export const ANON_HEADER = "x-surau-anon";
export const IP_HEADER = "x-surau-ip";

/** Hasil yang dikirim ke web: tanpa diagnostik (memuat kueri turunan pertanyaan) dan usage. */
export type PublicResult = Omit<JawabResult, "diagnostics" | "usage" | "cost_usd" | "latency_ms">;
export function publicResult(r: JawabResult): PublicResult {
  const { diagnostics: _d, usage: _u, cost_usd: _c, latency_ms: _l, ...rest } = r;
  return rest;
}

/** Skema masukan bersama web dan Worker (`@surau/core`). */
export { jawabRequest };

export interface AppDeps {
  /** Klien Anthropic untuk env ini; `null` = belum dikonfigurasi (secret belum dipasang). */
  anthropic: (env: Cloudflare.Env) => Anthropic | null;
  now: () => Date;
  /** Edisi daftar isi routing (tes memakai fixture edisi lain); bawaan Ihya. */
  editionId?: number;
  /** `fetch` untuk siteverify Turnstile (tes menyuntikkan tiruan; bawaan `fetch` global). */
  turnstileFetch?: typeof fetch;
  /** UUID baris ledger (tes). */
  uuid?: () => string;
}

/** Ulangan SDK per panggilan (retry gateway mati, ADR-064); dipakai juga hitungan biaya galat. */
export const ANTHROPIC_MAX_RETRIES = 1;

export function defaultAnthropic(env: Cloudflare.Env): Anthropic | null {
  const opts = { maxRetries: ANTHROPIC_MAX_RETRIES, timeout: 60_000 };
  if (env.LLM_MODE === "gateway" && env.CF_AIG_TOKEN)
    return createGatewayAnthropic(env.AI_GATEWAY_URL, env.CF_AIG_TOKEN, opts);
  if (env.LLM_MODE === "direct" && env.ANTHROPIC_API_KEY)
    return createAnthropic(env.ANTHROPIC_API_KEY, opts);
  return null;
}

/** Sitekey uji resmi Turnstile (lolos/gagal/interaktif); tidak boleh dipakai produksi. */
const TEST_SITEKEY = /^[123]x0{20}[A-F]{2}$/u;
/** Lingkungan yang boleh memakai kunci uji Turnstile. */
const TEST_ENVIRONMENTS: ReadonlySet<string> = new Set(["staging", "test", "development"]);

export interface GuardConfig {
  secret: string;
  turnstileSecret: string;
  siteKey: string;
  hostnames: string[];
}

/** Konfigurasi guard; `null` = belum lengkap (Jawab mati, gagal tertutup). */
export function guardConfig(env: Cloudflare.Env): GuardConfig | null {
  const secret = env.SURAU_API_SECRET ?? "";
  const turnstileSecret = (env.TURNSTILE_SECRET_KEY ?? "").trim();
  const siteKey = (env.TURNSTILE_SITE_KEY ?? "").trim();
  const hostnames = (env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h !== "");
  if (
    secret.length < SECRET_MIN_LENGTH ||
    turnstileSecret === "" ||
    siteKey === "" ||
    hostnames.length === 0
  )
    return null;
  // Kunci uji menerima token apa pun dan hostname localhost tidak boleh untuk pengunjung sungguhan:
  // keduanya hanya diizinkan di lingkungan non-produksi yang disebut eksplisit (daftar izin, jadi
  // salah ketik ENVIRONMENT tetap gagal tertutup).
  const nonProduction = TEST_ENVIRONMENTS.has(env.ENVIRONMENT);
  if (
    !nonProduction &&
    (TURNSTILE_TEST_SECRETS.has(turnstileSecret) ||
      TEST_SITEKEY.test(siteKey) ||
      hostnames.some((h) => h === "localhost" || h.endsWith(".localhost")))
  )
    return null;
  return { secret, turnstileSecret, siteKey, hostnames };
}

const json = (status: number, body: Record<string, unknown>, cookie: string | null = null) => {
  const headers = new Headers({ "cache-control": "no-store" });
  if (cookie !== null) headers.append("set-cookie", cookie);
  return Response.json(body, { status, headers });
};

async function readBody(req: Request): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? "0") > BODY_MAX_BYTES) return null;
  const text = await req.text();
  return new TextEncoder().encode(text).byteLength > BODY_MAX_BYTES ? null : text;
}

function ledgerUsage(u: UsageTotals): LedgerUsage {
  return {
    requests: u.requests,
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_tokens: u.cache_read_input_tokens,
    cache_write_tokens: u.cache_creation_input_tokens,
  };
}

function minusUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    requests: a.requests - b.requests,
    input_tokens: a.input_tokens - b.input_tokens,
    output_tokens: a.output_tokens - b.output_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens - b.cache_read_input_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens - b.cache_creation_input_tokens,
    costUsd: Math.max(0, a.costUsd - b.costUsd),
  };
}

interface Reserved {
  id: string;
  amountMicro: number;
}
interface RetryReserved extends Reserved {
  /** Pemakaian routing + Haiku sebelum ulangan Sonnet. */
  before: UsageTotals;
}

/**
 * Galat penyedia TANPA status HTTP (timeout, koneksi putus, galat di tengah stream): request itu
 * mungkin sudah ditagih, dan SDK bisa mengulangnya sekali (`maxRetries`). Biaya terburuk panggilan
 * itu × percobaan dihitung terpakai (`estimated`), konservatif. Galat berstatus HTTP (400/429/5xx)
 * = request ditolak penyedia, tidak ditagih.
 */
export function unknownProviderCost(r: JawabResult): { model: ModelId; micro: number } | null {
  const pe = r.diagnostics.provider_error;
  if (r.reason !== "provider_error" || pe === null || pe.status !== null) return null;
  const usd = pe.stage === "route" ? routeWorstUsd() : answerWorstUsd(pe.model);
  return { model: pe.model, micro: toMicro(usd * (1 + ANTHROPIC_MAX_RETRIES)) };
}

/** Selisih jam antar-Worker (web menulis tinjauan, api menulis cache): tinjauan sekitar waktu cache = basi. */
const REVIEW_CLOCK_SKEW_MS = 5_000;

/**
 * Hasil cache yang masih boleh disajikan (X07): bila tinjauan label (oleh ustadz peninjau
 * terdaftar) salah satu takhrij yang diklaimnya berubah sesudah jawaban di-cache, label di hasil
 * itu bisa usang ("ditinjau ustadz" yang sudah dikoreksi), jadi tidak disajikan dan pipeline
 * dijalankan ulang (hasil baru menimpa cache). Galat DB = anggap basi (`onError` mencatat namanya).
 */
export async function freshCachedResult(
  db: D1Db,
  resultJson: string,
  createdAt: string,
  ustadzKeys: ReadonlySet<string>,
  onError: (error: unknown) => void = () => {},
): Promise<PublicResult | null> {
  const result = JSON.parse(resultJson) as PublicResult;
  const footnotes = (result.hadith ?? []).map((h) => h.footnote.passage_id);
  if (footnotes.length === 0) return result;
  const since = new Date(Date.parse(createdAt) - REVIEW_CLOCK_SKEW_MS).toISOString();
  const changed = await takhrijReviewsChangedSince(db, footnotes, since, ustadzKeys).catch(
    (error: unknown) => {
      onError(error);
      return true;
    },
  );
  return changed ? null : result;
}

/** Komit biaya aktual satu pertanyaan (baris `jawab`, dan baris `retry` bila Sonnet dipanggil). */
async function commitResult(
  db: D1Db,
  primary: Reserved,
  retry: RetryReserved | null,
  r: JawabResult,
  now: string,
): Promise<void> {
  const outcome: LedgerOutcome = r.outcome;
  const unknown = unknownProviderCost(r);
  const extra = (model: ModelId) =>
    unknown !== null && unknown.model === model ? unknown.micro : 0;
  const haikuUsage = retry === null ? r.usage : retry.before;
  const haikuExtra = extra(MODELS.haiku);
  await settleLedger(db, {
    id: primary.id,
    outcome,
    reason: retry === null ? r.reason : "retried",
    model: haikuUsage.requests > 0 || haikuExtra > 0 ? MODELS.haiku : null,
    costMicro: toMicro(haikuUsage.costUsd) + haikuExtra,
    estimated: haikuExtra > 0,
    usage: ledgerUsage(haikuUsage),
    now,
  });
  if (retry === null) return;
  const after = minusUsage(r.usage, retry.before);
  const sonnetExtra = extra(MODELS.sonnet);
  await settleLedger(db, {
    id: retry.id,
    outcome,
    reason: r.reason,
    model: MODELS.sonnet,
    costMicro: toMicro(after.costUsd) + sonnetExtra,
    estimated: sonnetExtra > 0,
    usage: ledgerUsage(after),
    now,
  });
}

/**
 * Galat tak terduga (bug, bukan galat penyedia): biaya aktual tidak diketahui, jadi seluruh
 * reservasi dihitung terpakai (`estimated`). Konservatif: plafon tidak terlewati oleh biaya yang
 * tidak tercatat. Klien yang memutus koneksi TIDAK masuk ke sini: pipeline diselesaikan di latar.
 */
async function commitUnknown(db: D1Db, reserved: Reserved[], now: string): Promise<void> {
  for (const r of reserved)
    await settleLedger(db, {
      id: r.id,
      outcome: "error",
      reason: null,
      model: null,
      costMicro: r.amountMicro,
      estimated: true,
      usage: EMPTY_LEDGER_USAGE,
      now,
    });
}

export function createApp(deps: Partial<AppDeps> = {}) {
  const anthropicFor = deps.anthropic ?? defaultAnthropic;
  const now = deps.now ?? (() => new Date());
  const uuid = deps.uuid ?? (() => crypto.randomUUID());
  const app = new Hono<{ Bindings: Cloudflare.Env }>();
  const log = (entry: object) => console.info(JSON.stringify(entry));

  app.get("/health", (c) => c.json({ ok: true, environment: c.env.ENVIRONMENT }));

  // Status untuk UI (S21): apakah Jawab bisa dipakai sekarang, perlu Turnstile, dan sisa kuota.
  // Tanpa biaya LLM dan tanpa menulis apa pun.
  app.get("/jawab/status", async (c) => {
    const env = c.env;
    const off = (reason: JawabStatus["reason"]): JawabStatus => ({
      available: false,
      reason,
      challenge: false,
      sitekey: null,
      quota: null,
    });
    const settings = await getSettings(env.APP_DB);
    if (!settings.jawab_enabled) return json(200, { ...off("disabled") });
    const cfg = guardConfig(env);
    if (cfg === null || anthropicFor(env) === null) return json(200, { ...off("not_configured") });
    const at = now();
    const anon = await verifyAnon(
      cfg.secret,
      c.req.header(ANON_HEADER) ?? null,
      Math.floor(at.getTime() / 1000),
    );
    const budget = await getBudget(env.APP_DB, budgetPeriod(at));
    const cap = budget?.cap_micro ?? settings.budget_monthly_usd * MICRO;
    const committed = (budget?.spent_micro ?? 0) + (budget?.reserved_micro ?? 0);
    if (committed + toMicro(jawabReserveUsd()) > cap) {
      const status: JawabStatus = { ...off("budget"), sitekey: cfg.siteKey };
      return json(200, { ...status });
    }
    // Kuota jaringan IP diperiksa juga tanpa cookie, supaya pengunjung tidak diminta Turnstile lalu
    // ditolak 429 (temuan peninjau). Tanpa cookie, subjek anon diisi ID kosong yang tidak pernah
    // dipakai (hitungan anon-nya diabaikan).
    const day = quotaDay(at);
    const used = await quotaUsed(
      env.APP_DB,
      day,
      await quotaSubjects(cfg.secret, day, anon ?? "", c.req.header(IP_HEADER) ?? null),
    );
    const quota: JawabStatus["quota"] =
      anon === null ? null : { used: used.anon, limit: settings.quota_anon_daily };
    if (
      (anon !== null && used.anon >= settings.quota_anon_daily) ||
      used.ip >= settings.quota_ip_daily
    ) {
      const status: JawabStatus = { ...off("quota"), sitekey: cfg.siteKey, quota };
      return json(200, { ...status });
    }
    const status: JawabStatus = {
      available: true,
      reason: null,
      challenge: anon === null,
      sitekey: cfg.siteKey,
      quota,
    };
    return json(200, { ...status });
  });

  app.post("/jawab", async (c) => {
    const env = c.env;
    if (!(c.req.header("content-type") ?? "").toLowerCase().startsWith("application/json"))
      return json(415, { error: "unsupported_media_type" });
    const raw = await readBody(c.req.raw);
    if (raw === null) return json(413, { error: "too_large" });
    let parsed: JawabRequest;
    try {
      parsed = jawabRequest.parse(JSON.parse(raw));
    } catch {
      return json(400, { error: "invalid" });
    }

    // 1. Sakelar dan konfigurasi (gagal tertutup).
    const settings = await getSettings(env.APP_DB);
    if (!settings.jawab_enabled) {
      log(emptyLog(env.ENVIRONMENT, "disabled", "switch_off"));
      return json(503, { error: "disabled" });
    }
    const cfg = guardConfig(env);
    const anthropic = anthropicFor(env);
    if (cfg === null || anthropic === null) {
      log(emptyLog(env.ENVIRONMENT, "disabled", "not_configured"));
      return json(503, { error: "not_configured" });
    }
    const at = now();
    const nowIso = at.toISOString();
    const nowSec = Math.floor(at.getTime() / 1000);
    const ip = c.req.header(IP_HEADER) ?? null;

    // 2. Cookie anon 24 jam; tanpa cookie sah, token Turnstile wajib dan ditukar cookie baru.
    let anon = await verifyAnon(cfg.secret, c.req.header(ANON_HEADER) ?? null, nowSec);
    let cookie: string | null = null;
    if (anon === null) {
      if (parsed.turnstile === undefined) {
        log(rejectedLog(env.ENVIRONMENT, "challenge_required"));
        return json(401, { error: "challenge_required", sitekey: cfg.siteKey });
      }
      const verdict = await verifyTurnstile({
        secret: cfg.turnstileSecret,
        token: parsed.turnstile,
        ip,
        hostnames: cfg.hostnames,
        ...(deps.turnstileFetch ? { fetcher: deps.turnstileFetch } : {}),
      });
      if (verdict === "unavailable") {
        log(rejectedLog(env.ENVIRONMENT, "challenge_unavailable"));
        return json(503, { error: "challenge_unavailable" });
      }
      if (verdict === "rejected") {
        log(rejectedLog(env.ENVIRONMENT, "challenge_failed"));
        return json(403, { error: "challenge_failed", sitekey: cfg.siteKey });
      }
      anon = newAnonId();
      cookie = anonSetCookie(await signAnon(cfg.secret, anon, nowSec + ANON_TTL_SECONDS));
    }

    // 3. Burst per anon-id (binding Rate Limiting, jendela 60 detik, per lokasi).
    if (!(await env.JAWAB_BURST.limit({ key: anon })).success) {
      log(rejectedLog(env.ENVIRONMENT, "rate_limited"));
      return json(429, { error: "rate_limited" }, cookie);
    }

    // 4. Kuota harian anon DAN jaringan IP (satu statement atomik; subjek = HMAC harian).
    const day = quotaDay(at);
    const quota = await consumeQuota(
      env.APP_DB,
      day,
      await quotaSubjects(cfg.secret, day, anon, ip),
      { anon: settings.quota_anon_daily, ip: settings.quota_ip_daily },
    );
    if (!quota.ok) {
      log(rejectedLog(env.ENVIRONMENT, quota.scope === "anon" ? "quota_anon" : "quota_ip"));
      return json(429, { error: "quota_exceeded", scope: quota.scope }, cookie);
    }

    // 5. Cache jawaban terverifikasi (tanpa biaya LLM). Kunci = HMAC (S20), bukan SHA-256 polos.
    const question = parsed.question;
    const meta = await getCorpusMeta(env.CORPUS_DB);
    // `built_at` ikut kunci: korpus yang dimuat ulang tanpa versi baru (staging) tidak memakai
    // sitasi lama dari cache.
    const corpusKey = `${meta.corpus_version ?? "unknown"}@${meta.built_at ?? ""}`;
    // Daftar ustadz peninjau ikut kunci: mendaftarkan peninjau baru membuat label tertinjaunya
    // langsung dipakai, bukan menunggu cache lama kedaluwarsa (X07).
    const ustadzKeys = parseUstadzKeys(env.TAKHRIJ_USTADZ_KEYS);
    const ustadzTag = (await evalHash([...ustadzKeys].sort())).slice(0, 12);
    const key = await answerCacheKey(
      question,
      corpusKey,
      `${JAWAB_PROMPT_VERSION}+pipeline@${JAWAB_PIPELINE_VERSION}+ustadz@${ustadzTag}`,
      await cacheKey(cfg.secret),
    );
    const cached = await getAnswerCache(env.APP_DB, key, nowIso);
    if (cookie !== null) c.header("Set-Cookie", cookie);
    const cachedResult =
      cached === null
        ? null
        : await freshCachedResult(
            env.APP_DB,
            cached.result_json,
            cached.created_at,
            ustadzKeys,
            (error) =>
              log({
                event: "jawab_review_check_error",
                name: error instanceof Error ? error.name : "unknown",
              }),
          );
    // Cache ada tetapi tinjauan takhrijnya berubah: dijalankan ulang (biaya satu jawaban).
    if (cached !== null && cachedResult === null)
      log({ event: "jawab_cache_stale", environment: env.ENVIRONMENT });
    if (cached !== null && cachedResult !== null) {
      return streamSSE(c, async (stream) => {
        c.executionCtx.waitUntil(touchAnswerCache(env.APP_DB, key));
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ result: cachedResult, cached: true }),
        });
        log({
          ...emptyLog(env.ENVIRONMENT, cached.outcome, null),
          cached: true,
          model: cached.model,
          prompt_version: cached.prompt_version,
          corpus_version: cached.corpus_version,
        });
      });
    }

    // 6. Reservasi anggaran atomik sebesar biaya terburuk routing + jawaban Haiku.
    const period = budgetPeriod(at);
    const capMicro = settings.budget_monthly_usd * MICRO;
    const primary: Reserved = { id: uuid(), amountMicro: toMicro(jawabReserveUsd()) };
    const reserved = await reserveBudget(env.APP_DB, {
      id: primary.id,
      kind: "jawab",
      period,
      capMicro,
      amountMicro: primary.amountMicro,
      now: nowIso,
    });
    if (!reserved) {
      log(rejectedLog(env.ENVIRONMENT, "budget"));
      return json(503, { error: "budget" }, cookie);
    }

    // 7. Pipeline + komit biaya aktual.
    return streamSSE(c, async (stream) => {
      const send = (event: string, data: unknown) =>
        stream.writeSSE({ event, data: JSON.stringify(data) });
      // Klien yang memutus koneksi TIDAK membatalkan pipeline (temuan peninjau S20): bila dibatalkan,
      // biaya aktualnya tidak diketahui dan harus dihitung sebesar reservasi, sehingga putus-sambung
      // berulang bisa menghabiskan plafon dengan biaya semu. Pipeline diselesaikan di latar
      // (`waitUntil`), biaya nyatanya dikomit, dan hasil utuh masuk cache.
      let clientGone = false;
      stream.onAbort(() => {
        clientGone = true;
      });
      const heartbeat = setInterval(() => {
        if (!stream.aborted) void stream.write(": hb\n\n");
      }, HEARTBEAT_MS);
      // Pemegang (bukan `let`) supaya pengisian dari callback tetap terbaca TypeScript.
      const ledger: { retry: RetryReserved | null } = { retry: null };
      const logError = (event: string) => (error: unknown) =>
        log({ event, name: error instanceof Error ? error.name : "unknown" });
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
      const work = (async () => {
        try {
          const result = await runJawab(
            {
              corpus: env.CORPUS_DB,
              anthropic,
              emit,
              ...(deps.editionId === undefined ? {} : { editionId: deps.editionId }),
              headers: {
                "cf-aig-metadata": JSON.stringify({ app: "surau-api", env: env.ENVIRONMENT }),
              },
              // Klien sudah pergi: panggilan yang sedang berjalan diselesaikan, panggilan baru tidak.
              isCancelled: () => clientGone,
              // Tinjauan label takhrij (X07) dari DB app; gagal dimuat = label kode.
              takhrijReviews: {
                load: (ids) => getTakhrijReviews(env.APP_DB, ids, TAKHRIJ_TERMS_VERSION),
                ustadzKeys,
              },
              // Ulangan Sonnet = biaya tambahan: direservasi terpisah sebelum dipanggil.
              beforeRetry: async (before) => {
                const retry: RetryReserved = {
                  id: uuid(),
                  amountMicro: toMicro(retryReserveUsd()),
                  before,
                };
                const ok = await reserveBudget(env.APP_DB, {
                  id: retry.id,
                  kind: "retry",
                  period,
                  capMicro,
                  amountMicro: retry.amountMicro,
                  now: now().toISOString(),
                });
                if (ok) ledger.retry = retry;
                return ok;
              },
            },
            question,
          );
          log({ ...resultLog(env.ENVIRONMENT, result, false), client_gone: clientGone });
          const settledAt = now().toISOString();
          await commitResult(env.APP_DB, primary, ledger.retry, result, settledAt).catch(
            logError("jawab_ledger_error"),
          );
          const warned = await markBudgetWarning(env.APP_DB, period, settledAt).catch(
            (error: unknown) => {
              logError("jawab_budget_warning_error")(error);
              return null;
            },
          );
          if (warned !== null)
            console.warn(
              JSON.stringify({
                event: "jawab_budget_warning",
                environment: env.ENVIRONMENT,
                period,
                used_pct: Math.round(
                  ((warned.spent_micro + warned.reserved_micro) / Math.max(warned.cap_micro, 1)) *
                    100,
                ),
              }),
            );
          // Hanya hasil utuh yang di-cache: jawaban terpotong (`max_tokens`) atau prompt di atas
          // batas tidak disajikan ulang selama 30 hari.
          const complete = !result.diagnostics.truncated && !result.diagnostics.over_prompt_limit;
          if (complete && result.outcome !== "fallback" && result.model !== null) {
            // Waktu permintaan, bukan waktu selesai: tinjauan label yang tersimpan selama pipeline
            // berjalan (sesudah tinjauan dimuat) membuat entri ini basi (`freshCachedResult`).
            const created = at;
            const expires = new Date(created.getTime() + CACHE_TTL_DAYS * 86_400_000);
            // Mis. CHECK panjang result_json; hanya nama galat yang dicatat.
            await putAnswerCache(env.APP_DB, {
              key,
              corpus_version: result.corpus_version,
              prompt_version: result.prompt_version,
              model: result.model,
              outcome: result.outcome,
              result_json: JSON.stringify(publicResult(result)),
              created_at: created.toISOString(),
              expires_at: expires.toISOString(),
            }).catch(logError("jawab_cache_error"));
          }
        } catch (error) {
          // Galat tak terduga (bug): reservasi dihitung terpakai. Pesan internal (bisa memuat isi)
          // tidak pernah dikirim ke klien atau log.
          await commitUnknown(
            env.APP_DB,
            ledger.retry === null ? [primary] : [primary, ledger.retry],
            now().toISOString(),
          ).catch(logError("jawab_ledger_error"));
          log(emptyLog(env.ENVIRONMENT, "error", error instanceof Error ? error.name : "unknown"));
          if (!stream.aborted) await send("error", { error: "internal" });
        } finally {
          clearInterval(heartbeat);
        }
      })();
      // Tetap berjalan sampai selesai walau klien sudah pergi (batas waitUntil ±30 dtk sesudah
      // respons berakhir; reservasi yang tidak sempat dikomit dibereskan cron).
      c.executionCtx.waitUntil(work);
      await work;
    });
  });

  app.notFound(() => json(404, { error: "not_found" }));
  app.onError((error) => {
    console.error(JSON.stringify({ event: "jawab_error", name: error.name }));
    return json(500, { error: "internal" });
  });
  return app;
}

export default {
  fetch: createApp().fetch,
  async scheduled(controller, env) {
    await runCron(env, new Date(controller.scheduledTime));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
