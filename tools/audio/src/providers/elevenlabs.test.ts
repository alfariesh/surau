import { describe, expect, test } from "vite-plus/test";

import { TtsError } from "../provider.ts";
import { ELEVENLABS_API, ElevenLabs } from "./elevenlabs.ts";

interface Call {
  url: string;
  init: RequestInit | undefined;
}

/** fetch tiruan: jawaban berurutan, semua panggilan dicatat. */
function fakeFetch(responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
    const next = responses.shift();
    if (next === undefined) throw new Error("tidak ada jawaban tiruan lagi");
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { fn, calls };
}

const audio = (headers: Record<string, string> = {}) =>
  new Response(Uint8Array.of(0xff, 0xfb, 0x50, 0xc4), { status: 200, headers });
const errorJson = (status: number, code: string) =>
  new Response(JSON.stringify({ detail: { code, message: `pesan ${code}` } }), { status });

const client = (responses: (Response | Error)[], sleeps: number[] = []) => {
  const fetcher = fakeFetch(responses);
  return {
    eleven: new ElevenLabs({
      apiKey: "kunci-uji",
      fetch: fetcher.fn,
      sleep: async (ms) => void sleeps.push(ms),
    }),
    calls: fetcher.calls,
  };
};

const REQ = { text: "Halo.", voiceId: "suara/1", languageCode: "id", previousRequestIds: [] };

describe("ElevenLabs REST (eleven_v4)", () => {
  test("permintaan: endpoint, format 64 kbps, kunci di header, stitching ≤ 3 id", async () => {
    const { eleven, calls } = client([audio({ "request-id": "req-9", "character-cost": "5" })]);
    const result = await eleven.synthesize({ ...REQ, previousRequestIds: ["a", "b", "c", "d"] });
    expect(result).toMatchObject({ requestId: "req-9", characterCost: 5 });
    expect(result.audio).toHaveLength(4);
    const call = calls[0]!;
    expect(call.url).toBe(
      `${ELEVENLABS_API}/v1/text-to-speech/suara%2F1?output_format=mp3_44100_64`,
    );
    expect(new Headers(call.init?.headers).get("xi-api-key")).toBe("kunci-uji");
    expect(JSON.parse(call.init?.body as string)).toEqual({
      text: "Halo.",
      model_id: "eleven_v4",
      language_code: "id",
      previous_request_ids: ["b", "c", "d"],
    });
  });

  test("tanpa id sebelumnya: field stitching tidak dikirim; header biaya tak sah = null", async () => {
    const { eleven, calls } = client([audio({ "character-cost": "x" })]);
    const result = await eleven.synthesize(REQ);
    expect(result).toMatchObject({ requestId: null, characterCost: null });
    expect(JSON.parse(calls[0]!.init?.body as string)).not.toHaveProperty("previous_request_ids");
  });

  test("429 antre dan 503 diulang dengan jeda; galat lain tidak", async () => {
    const sleeps: number[] = [];
    const { eleven, calls } = client(
      [
        errorJson(429, "concurrent_limit_exceeded"),
        new Response("sibuk", { status: 503 }),
        audio(),
      ],
      sleeps,
    );
    await eleven.synthesize(REQ);
    expect(calls).toHaveLength(3);
    expect(sleeps).toEqual([1000, 2000]);

    const credits = client([errorJson(402, "insufficient_credits")]);
    const error = await credits.eleven.synthesize(REQ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TtsError);
    expect(error).toMatchObject({
      status: 402,
      code: "insufficient_credits",
      retryable: false,
      charged: "no",
    });
    expect(credits.calls).toHaveLength(1);
  });

  test("jaringan putus atau 5xx = mungkin tertagih, tidak diulang; 422 validasi", async () => {
    const network = client([new TypeError("fetch failed")]);
    await expect(network.eleven.synthesize(REQ)).rejects.toMatchObject({
      charged: "unknown",
      retryable: false,
    });
    expect(network.calls).toHaveLength(1);
    const server = client([new Response("galat", { status: 500 })]);
    await expect(server.eleven.synthesize(REQ)).rejects.toMatchObject({
      status: 500,
      charged: "unknown",
    });
    const invalid = client([
      new Response(JSON.stringify({ detail: [{ loc: ["text"] }] }), { status: 422 }),
    ]);
    await expect(invalid.eleven.synthesize(REQ)).rejects.toMatchObject({
      code: "validation_error",
    });
    const long = client([]);
    await expect(
      long.eleven.synthesize({ ...REQ, text: "a".repeat(10_001) }),
    ).rejects.toMatchObject({
      code: "text_too_long",
    });
  });

  test("kuota dan suara: null bila kunci tidak berizin (401/403)", async () => {
    const ok = client([
      new Response(
        JSON.stringify({
          character_count: 1000,
          character_limit: 75000,
          next_character_count_reset_unix: 1_793_000_000,
          tier: "starter",
        }),
      ),
      new Response(JSON.stringify({ voice_id: "v1", name: "Narator", category: "generated" })),
    ]);
    expect(await ok.eleven.quota()).toEqual({
      used: 1000,
      limit: 75000,
      resetsAt: new Date(1_793_000_000_000).toISOString(),
      tier: "starter",
    });
    expect(await ok.eleven.voice("v1")).toEqual({
      voiceId: "v1",
      name: "Narator",
      category: "generated",
    });
    const denied = client([new Response("", { status: 401 }), new Response("", { status: 403 })]);
    expect(await denied.eleven.quota()).toBeNull();
    expect(await denied.eleven.voice("v1")).toBeNull();
    const missing = client([errorJson(404, "voice_not_found")]);
    await expect(missing.eleven.voice("x")).rejects.toMatchObject({ status: 404 });
    expect(() => new ElevenLabs({ apiKey: " " })).toThrow(/kosong/u);
  });
});

describe("ElevenLabs timestamps + forced alignment (X18)", () => {
  const ALIGN = {
    characters: ["H", "a", "i", "."],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.35],
  };
  const json = (body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers });

  test("with-timestamps: endpoint, audio base64, alignment teks yang dikirim", async () => {
    const { eleven, calls } = client([
      json(
        { audio_base64: Buffer.from([0xff, 0xfb]).toString("base64"), alignment: ALIGN },
        { "request-id": "r1", "character-cost": "4" },
      ),
    ]);
    const result = await eleven.synthesize({ ...REQ, timestamps: true });
    expect(calls[0]!.url).toBe(
      `${ELEVENLABS_API}/v1/text-to-speech/suara%2F1/with-timestamps?output_format=mp3_44100_64`,
    );
    expect(new Headers(calls[0]!.init?.headers).get("accept")).toBe("application/json");
    expect([...result.audio]).toEqual([0xff, 0xfb]);
    expect(result.alignment).toEqual(ALIGN);
    expect(result).toMatchObject({ requestId: "r1", characterCost: 4 });
  });

  test("alignment null atau rusak → null (cadangan forced alignment); badan bukan JSON → audio kosong", async () => {
    const { eleven } = client([
      json({ audio_base64: "", alignment: null }),
      json({ audio_base64: "", alignment: { ...ALIGN, character_end_times_seconds: [1] } }),
      new Response("bukan json", { status: 200 }),
    ]);
    expect((await eleven.synthesize({ ...REQ, timestamps: true })).alignment).toBeNull();
    expect((await eleven.synthesize({ ...REQ, timestamps: true })).alignment).toBeNull();
    const broken = await eleven.synthesize({ ...REQ, timestamps: true });
    expect(broken.audio).toHaveLength(0);
    expect(broken.alignment).toBeNull();
  });

  test("forced alignment: multipart file + text, kata bertimestamp, galat jaringan = mungkin tertagih", async () => {
    const { eleven, calls } = client([
      json({
        words: [
          { text: "Halo", start: 0.1, end: 0.4, loss: 0.1 },
          { text: " ", start: 0.4, end: 0.5 },
          { text: 3, start: 0, end: 0 },
        ],
        loss: 0.12,
      }),
      new TypeError("putus"),
    ]);
    const result = await eleven.align(Uint8Array.of(1, 2, 3), "Halo dunia.");
    expect(calls[0]!.url).toBe(`${ELEVENLABS_API}/v1/forced-alignment`);
    const form = calls[0]!.init?.body as FormData;
    expect(form.get("text")).toBe("Halo dunia.");
    expect((form.get("file") as Blob).size).toBe(3);
    expect(result).toEqual({
      words: [
        { text: "Halo", start: 0.1, end: 0.4 },
        { text: " ", start: 0.4, end: 0.5 },
      ],
      loss: 0.12,
    });
    await expect(eleven.align(Uint8Array.of(1), "x")).rejects.toMatchObject({ charged: "unknown" });
  });
});
