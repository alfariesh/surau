import { describe, expect, it } from "vite-plus/test";

import type { JawabDeps } from "./jawab-handler";

import { JAWAB_BODY_MAX_BYTES, anonCookie, handleJawab, handleJawabStatus } from "./jawab-handler";

const ORIGIN = "https://surau.example";

function deps(over: Partial<JawabDeps> = {}) {
  const forwarded: Request[] = [];
  const d: JawabDeps = {
    enabled: true,
    hmacKey: "kunci-uji",
    ip: "203.0.113.7",
    limit: async () => true,
    limitGlobal: async () => true,
    forward: async (r) => {
      forwarded.push(r);
      return new Response('event: done\ndata: {"result":{}}\n\n', {
        headers: { "content-type": "text/event-stream", "set-cookie": "x=1" },
      });
    },
    ...over,
  };
  return { d, forwarded };
}

function req(body: unknown, init: { origin?: string | null; type?: string; cookie?: string } = {}) {
  const headers = new Headers({ "content-type": init.type ?? "application/json" });
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  headers.set("cookie", init.cookie ?? "rahasia=1");
  return new Request(`${ORIGIN}/api/jawab`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/jawab", () => {
  it("mati (produksi sebelum S20) → 404 tanpa meneruskan", async () => {
    const { d, forwarded } = deps({ enabled: false });
    expect((await handleJawab(req({ question: "Apa itu sabar?" }), d)).status).toBe(404);
    expect(forwarded).toHaveLength(0);
  });

  it("Origin asing, bukan JSON, terlalu besar, atau pertanyaan tidak sah ditolak", async () => {
    const { d, forwarded } = deps();
    expect(
      (
        await handleJawab(
          req({ question: "Apa itu sabar?" }, { origin: "https://lain.example" }),
          d,
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleJawab(req({ question: "Apa itu sabar?" }, { origin: null }), d)).status,
    ).toBe(403);
    expect((await handleJawab(req("x", { type: "text/plain" }), d)).status).toBe(415);
    expect((await handleJawab(req({ question: "x".repeat(JAWAB_BODY_MAX_BYTES) }), d)).status).toBe(
      413,
    );
    expect((await handleJawab(req("{rusak"), d)).status).toBe(400);
    expect((await handleJawab(req({ question: "ab" }), d)).status).toBe(400);
    expect((await handleJawab(req({ question: 42 }), d)).status).toBe(400);
    expect(forwarded).toHaveLength(0);
  });

  it("batas per klien dan global → 429; secret HMAC kosong → 503", async () => {
    expect(
      (await handleJawab(req({ question: "Apa itu sabar?" }), deps({ limit: async () => false }).d))
        .status,
    ).toBe(429);
    expect(
      (
        await handleJawab(
          req({ question: "Apa itu sabar?" }),
          deps({ limitGlobal: async () => false }).d,
        )
      ).status,
    ).toBe(429);
    expect(
      (await handleJawab(req({ question: "Apa itu sabar?" }), deps({ hmacKey: undefined }).d))
        .status,
    ).toBe(503);
  });

  it("isian asing ditolak (skema bersama dengan surau-api, S20)", async () => {
    const { d, forwarded } = deps();
    expect((await handleJawab(req({ question: "Apa itu sabar?", lain: 1 }), d)).status).toBe(400);
    expect(forwarded).toHaveLength(0);
  });

  it("meneruskan request BARU: hanya cookie anon + IP sebagai header internal, tanpa Cookie asli", async () => {
    const { d, forwarded } = deps();
    const res = await handleJawab(
      req(
        { question: "Apa itu sabar?", turnstile: "tok.123" },
        { cookie: "rahasia=1; surau_anon=v1.abc.123.sig; lain=2" },
      ),
      d,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
    // Set-Cookie selain `surau_anon` dari Worker tidak diteruskan.
    expect(res.headers.has("set-cookie")).toBe(false);
    expect(await res.text()).toContain("event: done");
    const [f] = forwarded;
    expect(f?.url).toBe("https://surau-api.internal/jawab");
    expect(f?.headers.has("cookie")).toBe(false);
    expect(f?.headers.get("x-surau-anon")).toBe("v1.abc.123.sig");
    expect(f?.headers.get("x-surau-ip")).toBe("203.0.113.7");
    expect(await f?.json()).toEqual({ question: "Apa itu sabar?", turnstile: "tok.123" });
  });

  it("Set-Cookie anon dari surau-api diteruskan ke browser", async () => {
    const cookie =
      "surau_anon=v1.x.1.y; Max-Age=86400; Path=/api/jawab; HttpOnly; Secure; SameSite=Strict";
    const { d } = deps({
      forward: async () =>
        new Response("event: done\ndata: {}\n\n", {
          headers: { "content-type": "text/event-stream", "set-cookie": cookie },
        }),
    });
    const res = await handleJawab(req({ question: "Apa itu sabar?" }), d);
    expect(res.headers.get("set-cookie")).toBe(cookie);
  });

  it("nilai cookie anon yang aneh tidak diteruskan", () => {
    const r = (cookie: string) => new Request(`${ORIGIN}/api/jawab`, { headers: { cookie } });
    expect(anonCookie(r("surau_anon=v1.a-b_c.12.Zz"))).toBe("v1.a-b_c.12.Zz");
    expect(anonCookie(r("surau_anon=<script>"))).toBeNull();
    expect(anonCookie(r("lain=1"))).toBeNull();
  });

  it("status Worker (mis. 503 sakelar mati) diteruskan", async () => {
    const { d } = deps({
      forward: async () => Response.json({ error: "disabled" }, { status: 503 }),
    });
    const res = await handleJawab(req({ question: "Apa itu sabar?" }), d);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "disabled" });
  });
});

describe("GET /api/jawab (status)", () => {
  it("mati → 404; nyala → diteruskan ke /jawab/status dengan header internal", async () => {
    const off = deps({ enabled: false });
    expect((await handleJawabStatus(new Request(`${ORIGIN}/api/jawab`), off.d)).status).toBe(404);
    const { d, forwarded } = deps({
      forward: async (r) => {
        forwarded.push(r);
        return Response.json({ available: true, challenge: true });
      },
    });
    const res = await handleJawabStatus(
      new Request(`${ORIGIN}/api/jawab`, { headers: { cookie: "surau_anon=v1.q.9.z" } }),
      d,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true, challenge: true });
    expect(forwarded[0]?.url).toBe("https://surau-api.internal/jawab/status");
    expect(forwarded[0]?.method).toBe("GET");
    expect(forwarded[0]?.headers.get("x-surau-anon")).toBe("v1.q.9.z");
  });

  it("batas per klien → 429", async () => {
    const { d } = deps({ limit: async () => false });
    expect((await handleJawabStatus(new Request(`${ORIGIN}/api/jawab`), d)).status).toBe(429);
  });
});
