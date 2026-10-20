import { ipKey, ipNetwork } from "@surau/core";
import type { FeedbackInput } from "@surau/db";

import { describe, expect, it } from "vite-plus/test";

import type { FeedbackDeps } from "./feedback-handler";

import { handleFeedback } from "./feedback-handler";

const ORIGIN = "https://surau.example";

function deps(over: Partial<FeedbackDeps> = {}) {
  const saved: FeedbackInput[] = [];
  const keys: string[] = [];
  const d: FeedbackDeps = {
    enabled: true,
    hmacKey: "kunci-uji",
    ip: "203.0.113.7",
    limit: async (key) => {
      keys.push(key);
      return true;
    },
    limitGlobal: async () => true,
    corpusVersion: async () => "ihya-v1",
    insert: async (input) => {
      saved.push(input);
      return saved.length;
    },
    ...over,
  };
  return { d, saved, keys };
}

const GOOD = {
  kind: "text",
  message: "Ada huruf yang terpotong di paragraf kedua.",
  path: "/kitab/ihya/1/200",
  passage_id: 10002826,
  website: "",
};

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/feedback`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  it("laporan sah disimpan tanpa IP, dengan versi korpus; kunci rate limit = HMAC(IP)", async () => {
    const { d, saved, keys } = deps();
    const res = await handleFeedback(post(GOOD), d);

    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(saved).toEqual([
      {
        kind: "text",
        message: GOOD.message,
        path: GOOD.path,
        passage_id: GOOD.passage_id,
        page_id: null,
        corpus_version: "ihya-v1",
      },
    ]);
    expect(keys).toEqual([await ipKey("kunci-uji", "203.0.113.7")]);
    expect(keys[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(saved)).not.toContain("203.0.113.7");
  });

  it("email dan nomor telepon di pesan disamarkan sebelum disimpan (S20)", async () => {
    const { d, saved } = deps();
    const res = await handleFeedback(
      post({
        ...GOOD,
        message: "Salah ketik. Hubungi saya di budi@contoh.id atau 0812 3456 7890.",
      }),
      d,
    );
    expect(res.status).toBe(201);
    expect(saved[0]?.message).toBe("Salah ketik. Hubungi saya di [email] atau [nomor].");
  });

  it("jenis translation (terjemahan/ringkasan AI, #73) diterima dan disimpan apa adanya", async () => {
    const { d, saved } = deps();
    const res = await handleFeedback(post({ ...GOOD, kind: "translation" }), d);
    expect(res.status).toBe(201);
    expect(saved.map((s) => s.kind)).toEqual(["translation"]);
  });

  it("menolak Origin lain atau tanpa Origin (403)", async () => {
    const { d, saved } = deps();
    expect((await handleFeedback(post(GOOD, { origin: "https://jahat.example" }), d)).status).toBe(
      403,
    );
    const noOrigin = new Request(`${ORIGIN}/api/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(GOOD),
    });
    expect((await handleFeedback(noOrigin, d)).status).toBe(403);
    expect(saved).toEqual([]);
  });

  it("body bukan JSON (415), terlalu besar (413), JSON rusak/skema salah (400)", async () => {
    const { d, saved } = deps();
    expect((await handleFeedback(post(GOOD, { "content-type": "text/plain" }), d)).status).toBe(
      415,
    );
    const big = { ...GOOD, message: "ا".repeat(9000) };
    expect((await handleFeedback(post(big), d)).status).toBe(413);
    expect((await handleFeedback(post("{bukan json"), d)).status).toBe(400);
    for (const bad of [
      { ...GOOD, kind: "answer" },
      { ...GOOD, message: "" },
      { ...GOOD, message: "x".repeat(2001) },
      { ...GOOD, path: "/kitab/ihya/1/200?q=rahasia" },
      { ...GOOD, path: "/tentang" },
      { ...GOOD, extra: 1 },
    ]) {
      expect((await handleFeedback(post(bad), d)).status, JSON.stringify(bad).slice(0, 60)).toBe(
        400,
      );
    }
    expect(saved).toEqual([]);
  });

  it("honeypot terisi: dijawab 201 tetapi tidak disimpan dan tidak memakai kuota", async () => {
    const { d, saved, keys } = deps();
    const res = await handleFeedback(post({ ...GOOD, website: "https://spam.example" }), d);
    expect(res.status).toBe(201);
    expect(saved).toEqual([]);
    expect(keys).toEqual([]);
  });

  it("rate limit habis (429), kunci HMAC belum dipasang (503), pembaca tertutup (404)", async () => {
    expect((await handleFeedback(post(GOOD), deps({ limit: async () => false }).d)).status).toBe(
      429,
    );
    expect((await handleFeedback(post(GOOD), deps({ hmacKey: undefined }).d)).status).toBe(503);
    expect((await handleFeedback(post(GOOD), deps({ enabled: false }).d)).status).toBe(404);
  });

  it("HMAC deterministik per kunci dan berbeda antar-IP", async () => {
    expect(await ipKey("a", "1.1.1.1")).toBe(await ipKey("a", "1.1.1.1"));
    expect(await ipKey("a", "1.1.1.1")).not.toBe(await ipKey("a", "1.1.1.2"));
    expect(await ipKey("a", "1.1.1.1")).not.toBe(await ipKey("b", "1.1.1.1"));
  });

  it("batas global habis → 429 tanpa menyimpan; ditolak per klien → global tidak disentuh", async () => {
    const { d, saved, keys } = deps({ limitGlobal: async () => false });
    expect((await handleFeedback(post(GOOD), d)).status).toBe(429);
    expect(saved).toEqual([]);
    expect(keys).toHaveLength(1);
    let globalCalls = 0;
    const limited = deps({
      limit: async () => false,
      limitGlobal: async () => {
        globalCalls++;
        return true;
      },
    });
    expect((await handleFeedback(post(GOOD), limited.d)).status).toBe(429);
    expect(globalCalls).toBe(0);
  });

  it("kunci per klien: IPv6 satu /64 = satu kunci, IPv4 per alamat", async () => {
    expect(ipNetwork("2001:db8:abcd:12::1")).toBe("2001:db8:abcd:12::/64");
    expect(ipNetwork("2001:0db8:abcd:0012:ffff:1:2:3")).toBe("2001:db8:abcd:12::/64");
    expect(ipNetwork("2001:db8::")).toBe("2001:db8:0:0::/64");
    expect(ipNetwork("::1")).toBe("0:0:0:0::/64");
    expect(ipNetwork("203.0.113.7")).toBe("203.0.113.7");
    expect(ipNetwork("bukan-ip")).toBe("bukan-ip");
    expect(ipNetwork("::ffff:198.51.100.9")).toBe("::ffff:198.51.100.9");
    const a = deps({ ip: "2001:db8:abcd:12::1" });
    const b = deps({ ip: "2001:db8:abcd:12:9999::7" });
    await handleFeedback(post(GOOD), a.d);
    await handleFeedback(post(GOOD), b.d);
    expect(a.keys[0]).toBe(b.keys[0]);
    expect(a.keys[0]).toBe(await ipKey("kunci-uji", "2001:db8:abcd:12::/64"));
  });
});
