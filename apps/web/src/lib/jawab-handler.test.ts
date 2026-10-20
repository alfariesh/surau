import { describe, expect, it } from "vite-plus/test";

import type { JawabDeps } from "./jawab-handler";

import { JAWAB_BODY_MAX_BYTES, handleJawab } from "./jawab-handler";

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

function req(body: unknown, init: { origin?: string | null; type?: string } = {}) {
  const headers = new Headers({ "content-type": init.type ?? "application/json" });
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  headers.set("cookie", "rahasia=1");
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

  it("meneruskan request BARU (tanpa cookie) dan mengalirkan SSE apa adanya, tanpa Set-Cookie", async () => {
    const { d, forwarded } = deps();
    const res = await handleJawab(req({ question: "Apa itu sabar?", lain: 1 }), d);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
    expect(res.headers.has("set-cookie")).toBe(false);
    expect(await res.text()).toContain("event: done");
    const [f] = forwarded;
    expect(f?.url).toBe("https://surau-api.internal/jawab");
    expect(f?.headers.has("cookie")).toBe(false);
    expect(await f?.json()).toEqual({ question: "Apa itu sabar?" });
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
