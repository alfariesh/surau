import { describe, expect, test } from "vite-plus/test";

import { MODELS, createAnthropic, createGatewayAnthropic } from "./client.ts";

const GW =
  "https://gateway.ai.cloudflare.com/v1/0123456789abcdef0123456789abcdef/surau-gw/anthropic";
const OK = {
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: MODELS.haiku,
  content: [{ type: "text", text: "ok", citations: null }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
};

function capture() {
  const calls: { url: string; headers: Headers }[] = [];
  const fake: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    return Response.json(OK);
  };
  return { calls, fake };
}

const ask = {
  model: MODELS.haiku,
  max_tokens: 16,
  messages: [{ role: "user" as const, content: "hai" }],
};

describe("klien gateway BYOK", () => {
  test("token di cf-aig-authorization; x-api-key dan Authorization tidak terkirim", async () => {
    const { calls, fake } = capture();
    await createGatewayAnthropic(GW, "rahasia-uji", { fetch: fake }).messages.create(ask);
    const [call] = calls;
    expect(call?.url).toBe(`${GW}/v1/messages`);
    expect(call?.headers.get("cf-aig-authorization")).toBe("Bearer rahasia-uji");
    expect(call?.headers.get("cf-aig-collect-log-payload")).toBe("false");
    expect(call?.headers.has("x-api-key")).toBe(false);
    expect(call?.headers.has("authorization")).toBe(false);
    expect(call?.headers.get("anthropic-version")).toBeTruthy();
  });

  test("URL gateway lain atau token kosong ditolak", () => {
    expect(() => createGatewayAnthropic("https://api.anthropic.com", "t")).toThrow("URL gateway");
    expect(() => createGatewayAnthropic(GW, "")).toThrow("CF_AIG_TOKEN");
  });

  test("klien langsung tetap memakai x-api-key", async () => {
    const { calls, fake } = capture();
    await createAnthropic("kunci-uji", { fetch: fake }).messages.create(ask);
    expect(calls[0]?.headers.get("x-api-key")).toBe("kunci-uji");
    expect(calls[0]?.url).toBe("https://api.anthropic.com/v1/messages");
  });
});
