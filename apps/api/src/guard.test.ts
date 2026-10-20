// Tes guard S20 (ADR-014, ADR-065) di workerd: Turnstile → cookie anon, burst, kuota harian anon/IP,
// reservasi + komit ledger (termasuk ulangan Sonnet), anggaran habis → Jawab mati (situs lain tetap),
// endpoint status, cron (reservasi basi, hapus fisik), konfigurasi produksi gagal tertutup, dan log
// tanpa IP/pertanyaan/ID anon. Anthropic dan siteverify Turnstile TIDAK pernah dipanggil sungguhan.
import {
  createExecutionContext,
  createScheduledController,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { MODELS, jawabReserveUsd, retryReserveUsd } from "@surau/llm";
import { toMicro } from "@surau/db";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import {
  BODY_1,
  ED,
  seedAiText,
  seedCore,
  seedSearchIndex,
} from "../../../packages/core/test/fixture.ts";
import { docIndex, fakeAnthropic, readSse } from "../test/fake-anthropic.ts";
import type { FakeAnswer } from "../test/fake-anthropic.ts";
import worker, { ANON_HEADER, IP_HEADER, createApp, guardConfig } from "./index.ts";
import { ANON_COOKIE, ANON_TTL_SECONDS, newAnonId, signAnon, verifyAnon } from "./keys.ts";
import { TURNSTILE_ACTION, hostnameAllowed, verifyTurnstile } from "./turnstile.ts";

const QUESTION = "Apa kata al-Ghazali tentang kesabaran?";
const SECRET = env.SURAU_API_SECRET!;
const ROUTE = { sections: [], queries: ["sabar", "صبر"], hadith: false };

beforeAll(async () => {
  // Penyimpanan D1 bisa dipakai bersama file tes lain: isi fixture hanya bila belum ada.
  const n = await env.CORPUS_DB.prepare("SELECT count(*) AS n FROM passage").first<{ n: number }>();
  if ((n?.n ?? 0) === 0) {
    await seedCore(env.CORPUS_DB);
    await seedSearchIndex(env.CORPUS_DB);
    await seedAiText(env.CORPUS_DB);
  }
});

const setSetting = (key: string, value: string) =>
  env.APP_DB.prepare("UPDATE settings SET value = ? WHERE key = ?").bind(value, key).run();

beforeEach(async () => {
  await env.APP_DB.batch([
    env.APP_DB.prepare("UPDATE settings SET value = '1' WHERE key = 'jawab_enabled'"),
    env.APP_DB.prepare("UPDATE settings SET value = '20' WHERE key = 'budget_monthly_usd'"),
    env.APP_DB.prepare("UPDATE settings SET value = '10' WHERE key = 'quota_anon_daily'"),
    env.APP_DB.prepare("UPDATE settings SET value = '30' WHERE key = 'quota_ip_daily'"),
    env.APP_DB.prepare("DELETE FROM answer_cache"),
    env.APP_DB.prepare("DELETE FROM quota_daily"),
    env.APP_DB.prepare("DELETE FROM llm_ledger"),
    env.APP_DB.prepare("DELETE FROM llm_budget"),
  ]);
});

let ipSeq = 0;
const freshIp = () => `203.0.113.${(ipSeq++ % 250) + 1}`;
const cookieFor = async (
  id = newAnonId(),
  exp = Math.floor(Date.now() / 1000) + ANON_TTL_SECONDS,
) => signAnon(SECRET, id, exp);

type Siteverify = { status?: number; body?: Record<string, unknown>; throws?: boolean };

/** Aplikasi uji: Anthropic tiruan + siteverify tiruan (mencatat request yang diterimanya). */
function setup(
  opts: {
    answer?: (n: number, docs: Parameters<typeof docIndex>[0], model: string) => FakeAnswer;
    siteverify?: () => Siteverify;
  } = {},
) {
  const fake = fakeAnthropic({
    route: () => ROUTE,
    answer:
      opts.answer ??
      ((_n, docs) => ({
        blocks: [{ text: "Jawaban.", cite: [{ doc: docIndex(docs, BODY_1), from: 0, to: 1 }] }],
      })),
  });
  const verifies: Record<string, unknown>[] = [];
  const turnstileFetch: typeof fetch = async (_url, init) => {
    verifies.push(
      JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>,
    );
    const r = opts.siteverify?.() ?? { body: { success: true, "error-codes": [] } };
    if (r.throws) throw new TypeError("jaringan");
    return Response.json(r.body ?? {}, { status: r.status ?? 200 });
  };
  const app = createApp({ anthropic: () => fake.client, editionId: ED, turnstileFetch });
  const call = async (
    path: string,
    init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
  ) => {
    const ctx = createExecutionContext();
    const res = await app.request(
      `https://api.internal${path}`,
      {
        method: init.method ?? "POST",
        headers: { "content-type": "application/json", ...init.headers },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      },
      env,
      ctx,
    );
    const events = res.headers.get("content-type")?.startsWith("text/event-stream")
      ? await readSse(res)
      : [];
    await waitOnExecutionContext(ctx);
    return { res, events };
  };
  const ask = async (headers: Record<string, string>, body: unknown = { question: QUESTION }) =>
    call("/jawab", { headers, body });
  const status = async (headers: Record<string, string> = {}) => {
    const { res } = await call("/jawab/status", { method: "GET", headers });
    return (await res.json()) as Record<string, unknown>;
  };
  return { ask, status, sent: fake.sent, verifies };
}

const lastEvent = (events: { event: string; data: unknown }[]) => events.at(-1);
const ledgerRows = async () =>
  (
    await env.APP_DB.prepare(
      "SELECT kind, status, outcome, reason, model, reserved_micro, cost_micro, estimated, requests FROM llm_ledger ORDER BY created_at, kind",
    ).all<Record<string, unknown>>()
  ).results;
const budgetRow = () =>
  env.APP_DB.prepare("SELECT cap_micro, spent_micro, reserved_micro FROM llm_budget").first<
    Record<string, number>
  >();

describe("cookie anon dan Turnstile", () => {
  test("tanpa cookie dan tanpa token → 401 challenge_required + sitekey, tanpa LLM", async () => {
    const { ask, sent, verifies } = setup();
    const { res } = await ask({ [IP_HEADER]: freshIp() });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "challenge_required",
      sitekey: env.TURNSTILE_SITE_KEY,
    });
    expect(sent).toHaveLength(0);
    expect(verifies).toHaveLength(0);
  });

  test("token sah → siteverify (remoteip + idempotency_key) → cookie 24 jam yang dipakai lagi", async () => {
    const { ask, sent, verifies } = setup();
    const ip = freshIp();
    const first = await ask({ [IP_HEADER]: ip }, { question: QUESTION, turnstile: "tok.uji-1" });
    expect(first.res.status).toBe(200);
    expect(lastEvent(first.events)?.event).toBe("done");
    expect(verifies).toHaveLength(1);
    expect(verifies[0]).toMatchObject({
      secret: env.TURNSTILE_SECRET_KEY,
      response: "tok.uji-1",
      remoteip: ip,
    });
    expect(String(verifies[0]?.idempotency_key)).toMatch(/^[0-9a-f-]{36}$/u);
    const setCookie = first.res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(new RegExp(`^${ANON_COOKIE}=v1\\.`, "u"));
    for (const attr of [
      "Max-Age=86400",
      "Path=/api/jawab",
      "HttpOnly",
      "Secure",
      "SameSite=Strict",
    ])
      expect(setCookie).toContain(attr);
    // Cookie dipakai lagi: tanpa token, tanpa siteverify, tanpa Set-Cookie baru.
    const value = /=([^;]+)/u.exec(setCookie)![1]!;
    const again = await ask(
      { [ANON_HEADER]: value, [IP_HEADER]: ip },
      { question: "Apa itu ikhlas?" },
    );
    expect(again.res.status).toBe(200);
    expect(again.res.headers.get("set-cookie")).toBeNull();
    expect(verifies).toHaveLength(1);
    expect(sent.filter((s) => s.kind === "answer")).toHaveLength(2);
  });

  test("token ditolak → 403; siteverify mati atau secret salah → 503 challenge_unavailable", async () => {
    const rejected = setup({
      siteverify: () => ({ body: { success: false, "error-codes": ["invalid-input-response"] } }),
    });
    const r1 = await rejected.ask(
      { [IP_HEADER]: freshIp() },
      { question: QUESTION, turnstile: "x" },
    );
    expect(r1.res.status).toBe(403);
    expect((await r1.res.json()) as object).toMatchObject({ error: "challenge_failed" });
    expect(r1.res.headers.get("set-cookie")).toBeNull();

    const down = setup({ siteverify: () => ({ throws: true }) });
    const r2 = await down.ask({ [IP_HEADER]: freshIp() }, { question: QUESTION, turnstile: "x" });
    expect(r2.res.status).toBe(503);
    expect(await r2.res.json()).toEqual({ error: "challenge_unavailable" });
    expect(down.verifies).toHaveLength(2); // satu ulangan dengan idempotency_key yang sama
    expect(down.verifies[0]?.idempotency_key).toBe(down.verifies[1]?.idempotency_key);

    const badSecret = setup({
      siteverify: () => ({
        status: 400,
        body: { success: false, "error-codes": ["invalid-input-secret"] },
      }),
    });
    const r3 = await badSecret.ask(
      { [IP_HEADER]: freshIp() },
      { question: QUESTION, turnstile: "x" },
    );
    expect(r3.res.status).toBe(503);
    expect(rejected.sent).toHaveLength(0);
  });

  test("cookie palsu, kedaluwarsa, atau ditandatangani secret lain dianggap tidak ada", async () => {
    const { ask } = setup();
    const now = Math.floor(Date.now() / 1000);
    const id = newAnonId();
    const bad = [
      "v1.bukan-id.1.x",
      await cookieFor(id, now - 1),
      (await cookieFor(id)).replace(/.$/u, (ch) => (ch === "A" ? "B" : "A")),
      await signAnon("secret-lain-0123456789abcdef0123456789", id, now + 3600),
      await cookieFor(id, now + ANON_TTL_SECONDS * 5),
    ];
    for (const value of bad) {
      expect(await verifyAnon(SECRET, value, now)).toBeNull();
      expect((await ask({ [ANON_HEADER]: value, [IP_HEADER]: freshIp() })).res.status).toBe(401);
    }
    expect(await verifyAnon(SECRET, await cookieFor(id), now)).toBe(id);
  });

  test("siteverify produksi mewajibkan action dan hostname; kunci uji melewati keduanya", async () => {
    const reply =
      (body: Record<string, unknown>): typeof fetch =>
      async () =>
        Response.json(body);
    const base = { token: "t", ip: null, hostnames: ["surau.org"] };
    const real = "0x4AAAAAAA-rahasia-asli";
    expect(
      await verifyTurnstile({
        ...base,
        secret: real,
        fetcher: reply({ success: true, action: TURNSTILE_ACTION, hostname: "surau.org" }),
      }),
    ).toBe("ok");
    expect(
      await verifyTurnstile({
        ...base,
        secret: real,
        fetcher: reply({ success: true, action: "login", hostname: "surau.org" }),
      }),
    ).toBe("rejected");
    expect(
      await verifyTurnstile({
        ...base,
        secret: real,
        fetcher: reply({ success: true, action: TURNSTILE_ACTION, hostname: "evil.example" }),
      }),
    ).toBe("rejected");
    expect(
      await verifyTurnstile({
        ...base,
        secret: env.TURNSTILE_SECRET_KEY!,
        fetcher: reply({ success: true, hostname: "example.com" }),
      }),
    ).toBe("ok");
    expect(
      hostnameAllowed("pr-12-surau-web.alfarieshsalman.workers.dev", [
        "alfarieshsalman.workers.dev",
      ]),
    ).toBe(true);
    expect(hostnameAllowed("surau.org.evil.example", ["surau.org"])).toBe(false);
  });
});

describe("burst dan kuota harian", () => {
  test("burst: pertanyaan ke-4 dalam 60 detik dari anon yang sama → 429", async () => {
    const { ask } = setup();
    const headers = { [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() };
    for (let i = 0; i < 3; i++)
      expect((await ask(headers, { question: `Pertanyaan burst ke-${i}?` })).res.status).toBe(200);
    const { res } = await ask(headers, { question: "Pertanyaan burst ke-4?" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
  });

  test("kuota anon habis → 429 quota_exceeded (anon), tanpa LLM", async () => {
    await setSetting("quota_anon_daily", "1");
    const { ask, sent } = setup();
    const headers = { [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() };
    expect((await ask(headers)).res.status).toBe(200);
    const before = sent.length;
    const { res } = await ask(headers, { question: "Apa itu tawakal?" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "quota_exceeded", scope: "anon" });
    expect(sent).toHaveLength(before);
  });

  test("kuota jaringan IP habis menolak anon-id baru dari IP yang sama", async () => {
    await setSetting("quota_ip_daily", "1");
    const { ask } = setup();
    const ip = freshIp();
    expect((await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: ip })).res.status).toBe(200);
    const { res } = await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: ip });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "quota_exceeded", scope: "ip" });
    // IPv6: satu /64 = satu jaringan.
    await env.APP_DB.prepare("DELETE FROM quota_daily").run();
    expect(
      (await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: "2001:db8:1:2::a" })).res.status,
    ).toBe(200);
    expect(
      (await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: "2001:db8:1:2:ffff::b" })).res
        .status,
    ).toBe(429);
  });

  test("kuota tersimpan hanya sebagai HMAC: tanpa IP mentah atau ID anon", async () => {
    const { ask } = setup();
    const id = newAnonId();
    await ask({ [ANON_HEADER]: await cookieFor(id), [IP_HEADER]: "192.0.2.77" });
    const dump = JSON.stringify(
      (await env.APP_DB.prepare("SELECT * FROM quota_daily").all()).results,
    );
    expect(dump).not.toContain("192.0.2.77");
    expect(dump).not.toContain(id);
    expect(dump).toMatch(/"subject":"[0-9a-f]{64}"/u);
  });
});

describe("ledger anggaran", () => {
  test("jawaban biasa: reservasi biaya terburuk lalu komit biaya aktual dari usage", async () => {
    const { ask } = setup();
    expect(
      (await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() })).res.status,
    ).toBe(200);
    // Tiruan: routing 1.000 masuk + 100 keluar, jawaban 1.000 + 120 (Haiku $0,1/$0,5 per juta).
    expect(await ledgerRows()).toEqual([
      {
        kind: "jawab",
        status: "committed",
        outcome: "answer",
        reason: null,
        model: MODELS.haiku,
        reserved_micro: toMicro(jawabReserveUsd()),
        cost_micro: 310,
        estimated: 0,
        requests: 2,
      },
    ]);
    expect(await budgetRow()).toEqual({
      cap_micro: 20_000_000,
      spent_micro: 310,
      reserved_micro: 0,
    });
  });

  test("jawaban dari cache tidak mereservasi atau menambah biaya", async () => {
    const { ask } = setup();
    const headers = { [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() };
    await ask(headers);
    await ask(headers);
    expect(await ledgerRows()).toHaveLength(1);
    expect((await budgetRow())?.spent_micro).toBe(310);
  });

  test("ulangan Sonnet direservasi terpisah; biaya dibagi per model", async () => {
    const { ask } = setup({
      answer: (n, docs) =>
        n === 0
          ? { blocks: [{ text: "x" }], stop: "refusal" }
          : {
              blocks: [
                { text: "Sonnet.", cite: [{ doc: docIndex(docs, BODY_1), from: 0, to: 1 }] },
              ],
            },
    });
    const { events } = await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() });
    expect(lastEvent(events)?.event).toBe("done");
    const rows = await ledgerRows();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.kind === "jawab")).toMatchObject({
      model: MODELS.haiku,
      reason: "retried",
      cost_micro: 310,
      requests: 2,
    });
    // Sonnet: 1.000 × $2 + 120 × $10 per juta = $0,0032.
    expect(rows.find((r) => r.kind === "retry")).toMatchObject({
      model: MODELS.sonnet,
      reserved_micro: toMicro(retryReserveUsd()),
      cost_micro: 3200,
      requests: 1,
    });
    expect(await budgetRow()).toMatchObject({ spent_micro: 3510, reserved_micro: 0 });
  });

  test("anggaran tidak cukup untuk ulangan Sonnet → fallback budget tanpa memanggil Sonnet", async () => {
    // Plafon $1 dengan $0,90 sudah terpakai: sisa $0,10 cukup untuk reservasi Haiku (±$0,016),
    // tidak untuk reservasi Sonnet ($0,24).
    await setSetting("budget_monthly_usd", "1");
    const period = new Date().toISOString().slice(0, 7);
    await env.APP_DB.prepare(
      "INSERT INTO llm_budget (period, cap_micro, spent_micro, updated_at) VALUES (?, 1000000, 900000, '2026-10-01T00:00:00Z')",
    )
      .bind(period)
      .run();
    const { ask, sent } = setup({ answer: () => ({ blocks: [{ text: "x" }], stop: "refusal" }) });
    const { events } = await ask({ [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() });
    const last = lastEvent(events);
    expect(last?.event).toBe("fallback");
    expect((last!.data as { result: { reason: string } }).result.reason).toBe("budget");
    expect(sent.filter((s) => s.model === MODELS.sonnet)).toHaveLength(0);
    expect(await ledgerRows()).toHaveLength(1);
  });
});

describe("anggaran habis → Jawab mati otomatis, situs tetap berjalan", () => {
  test("POST 503 budget, status available=false, kesehatan Worker tetap OK", async () => {
    await setSetting("budget_monthly_usd", "0");
    const { ask, status, sent } = setup();
    const cookie = await cookieFor();
    const { res } = await ask({ [ANON_HEADER]: cookie, [IP_HEADER]: freshIp() });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "budget" });
    expect(sent).toHaveLength(0);
    expect(await status({ [ANON_HEADER]: cookie })).toMatchObject({
      available: false,
      reason: "budget",
    });
    const health = await createApp().request("https://api.internal/health", {}, env);
    expect(health.status).toBe(200);
    // Bulan berikutnya otomatis terbuka lagi (periode baru dengan plafon dari pengaturan).
    await setSetting("budget_monthly_usd", "20");
    await env.APP_DB.prepare("DELETE FROM llm_budget").run();
    expect(await status({ [ANON_HEADER]: cookie })).toMatchObject({ available: true });
  });

  test("permintaan bersamaan di ujung plafon tidak bisa bersama-sama melewatinya", async () => {
    const reserve = toMicro(jawabReserveUsd());
    // Sisa anggaran pas untuk 2 reservasi.
    const period = new Date().toISOString().slice(0, 7);
    await env.APP_DB.prepare(
      "INSERT INTO llm_budget (period, cap_micro, spent_micro, updated_at) VALUES (?, ?, ?, '2026-10-01T00:00:00Z')",
    )
      .bind(period, 20_000_000, 20_000_000 - 2 * reserve)
      .run();
    const { ask } = setup();
    const results = await Promise.all(
      Array.from({ length: 6 }, async (_, i) =>
        ask(
          { [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() },
          { question: `Pertanyaan bersamaan nomor ${i}?` },
        ),
      ),
    );
    expect(results.filter((r) => r.res.status === 200)).toHaveLength(2);
    expect(results.filter((r) => r.res.status === 503)).toHaveLength(4);
    const b = await budgetRow();
    expect(b!.spent_micro + b!.reserved_micro).toBeLessThanOrEqual(b!.cap_micro);
  });
});

describe("status", () => {
  test("mati, belum dikonfigurasi, perlu tantangan, dan sisa kuota", async () => {
    const { status, ask } = setup();
    await setSetting("jawab_enabled", "0");
    expect(await status()).toEqual({
      available: false,
      reason: "disabled",
      challenge: false,
      sitekey: null,
      quota: null,
    });
    await setSetting("jawab_enabled", "1");
    const unconfigured = await createApp({ anthropic: () => null }).request(
      "https://api.internal/jawab/status",
      {},
      env,
    );
    expect(await unconfigured.json()).toMatchObject({ available: false, reason: "not_configured" });
    expect(await status()).toEqual({
      available: true,
      reason: null,
      challenge: true,
      sitekey: env.TURNSTILE_SITE_KEY,
      quota: null,
    });
    await setSetting("quota_anon_daily", "1");
    const headers = { [ANON_HEADER]: await cookieFor(), [IP_HEADER]: freshIp() };
    expect(await status(headers)).toMatchObject({
      available: true,
      challenge: false,
      quota: { used: 0, limit: 1 },
    });
    await ask(headers);
    expect(await status(headers)).toMatchObject({
      available: false,
      reason: "quota",
      quota: { used: 1, limit: 1 },
    });
  });
});

describe("konfigurasi gagal tertutup", () => {
  const base = {
    ...env,
    SURAU_API_SECRET: "x".repeat(32),
    TURNSTILE_SECRET_KEY: "0x4AAAAAAA-rahasia-asli",
    TURNSTILE_SITE_KEY: "0x4AAAAAAFdyEf4rqoAMrG1j",
    TURNSTILE_HOSTNAMES: "surau.org",
    ENVIRONMENT: "production",
  } as Cloudflare.Env;

  test("produksi menolak secret/sitekey uji, localhost, dan secret pendek", () => {
    expect(guardConfig(base)).not.toBeNull();
    expect(
      guardConfig({ ...base, TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" }),
    ).toBeNull();
    expect(guardConfig({ ...base, TURNSTILE_SITE_KEY: "1x00000000000000000000AA" })).toBeNull();
    expect(guardConfig({ ...base, TURNSTILE_HOSTNAMES: "surau.org,localhost" })).toBeNull();
    expect(guardConfig({ ...base, SURAU_API_SECRET: "pendek" })).toBeNull();
    expect(guardConfig({ ...base, TURNSTILE_SECRET_KEY: undefined })).toBeNull();
    // Staging/tes boleh memakai kunci uji.
    expect(
      guardConfig({
        ...base,
        ENVIRONMENT: "staging",
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      }),
    ).not.toBeNull();
  });

  test("secret HMAC hilang → 503 not_configured sebelum Turnstile", async () => {
    const fake = fakeAnthropic({ route: () => ROUTE, answer: () => ({ blocks: [] }) });
    const res = await createApp({ anthropic: () => fake.client }).request(
      "https://api.internal/jawab",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: QUESTION, turnstile: "x" }),
      },
      { ...env, SURAU_API_SECRET: undefined } as Cloudflare.Env,
      createExecutionContext(),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_configured" });
  });
});

describe("cron", () => {
  test("reservasi basi dibereskan (dihitung terpakai); hapus fisik hanya di putaran harian", async () => {
    const period = new Date().toISOString().slice(0, 7);
    await env.APP_DB.batch([
      env.APP_DB.prepare(
        "INSERT INTO llm_budget (period, cap_micro, reserved_micro, updated_at) VALUES (?, 20000000, 5000, '2026-10-01T00:00:00Z')",
      ).bind(period),
      env.APP_DB.prepare(
        `INSERT INTO llm_ledger (id, kind, period, created_at, status, reserved_micro)
         VALUES ('00000000-0000-4000-8000-0000000000aa', 'jawab', ?, '2000-01-01T00:00:00.000Z', 'reserved', 5000)`,
      ).bind(period),
      env.APP_DB.prepare(
        `INSERT INTO answer_cache (key, corpus_version, prompt_version, model, outcome, result_json, created_at, expires_at)
         VALUES (?, 'v', 'p', 'm', 'answer', '{}', '2000-01-01T00:00:00Z', '2000-02-01T00:00:00Z')`,
      ).bind("c".repeat(64)),
    ]);
    const run = async (at: Date) => {
      const ctx = createExecutionContext();
      await worker.scheduled(
        createScheduledController({ scheduledTime: at.getTime(), cron: "*/10 * * * *" }),
        env,
      );
      await waitOnExecutionContext(ctx);
    };
    const now = new Date();
    const notDaily = new Date(now);
    notDaily.setUTCHours(13, 20, 0, 0);
    await run(notDaily);
    expect(await budgetRow()).toMatchObject({ reserved_micro: 0, spent_micro: 5000 });
    expect(await ledgerRows()).toEqual([
      expect.objectContaining({ status: "expired", cost_micro: 5000, estimated: 1 }),
    ]);
    const cacheCount = () =>
      env.APP_DB.prepare("SELECT count(*) AS n FROM answer_cache").first<{ n: number }>();
    expect(await cacheCount()).toEqual({ n: 1 });
    const daily = new Date(now);
    daily.setUTCHours(0, 0, 0, 0);
    await run(daily);
    expect(await cacheCount()).toEqual({ n: 0 });
  });
});

describe("log tanpa data pribadi", () => {
  const lines: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    lines.length = 0;
  });

  test("alur lengkap (tantangan, jawaban, kuota habis) tidak mencatat IP, pertanyaan, ID, token", async () => {
    for (const level of ["info", "warn", "error", "log"] as const)
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    await setSetting("quota_anon_daily", "1");
    const { ask } = setup();
    const ip = "192.0.2.199";
    const question = "Rahasia pribadi saya tentang warisan keluarga?";
    await ask({ [IP_HEADER]: ip }, { question });
    const first = await ask({ [IP_HEADER]: ip }, { question, turnstile: "token-rahasia-123" });
    const cookie = /=([^;]+)/u.exec(first.res.headers.get("set-cookie") ?? "")?.[1] ?? "";
    const id = cookie.split(".")[1] ?? "";
    await ask(
      { [ANON_HEADER]: cookie, [IP_HEADER]: ip },
      { question: "Pertanyaan kedua rahasia?" },
    );
    const all = lines.join("\n");
    expect(all).toContain('"outcome":"rejected"');
    expect(all).toContain('"outcome":"answer"');
    for (const secret of [ip, question, "warisan", "token-rahasia-123", id, cookie, "rahasia?"])
      expect(all.includes(secret), secret).toBe(false);
  });
});
