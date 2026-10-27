import { ipKey } from "@surau/core";
import type { KitabInterestInput } from "@surau/db";

import { describe, expect, it } from "vite-plus/test";

import type { MinatDeps } from "./minat-handler";

import { UPCOMING_SLUGS } from "../content/kitab-mendatang";
import { handleMinat } from "./minat-handler";

const ORIGIN = "https://surau.example";

function deps(over: Partial<MinatDeps> = {}) {
  const saved: KitabInterestInput[] = [];
  const keys: string[] = [];
  const d: MinatDeps = {
    enabled: true,
    hmacKey: "kunci-uji",
    ip: "203.0.113.7",
    candidates: UPCOMING_SLUGS,
    limit: async (key) => {
      keys.push(key);
      return true;
    },
    limitGlobal: async () => true,
    insert: async (input) => {
      saved.push(input);
    },
    ...over,
  };
  return { d, saved, keys };
}

const GOOD = { candidate: "al-waraqat", purpose: "teaching", arabic: "with_help", website: "" };

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/minat-kitab`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/minat-kitab (ADR-115)", () => {
  it("suara sah disimpan hanya berisi slug + dua pilihan; kunci rate limit = HMAC(IP)", async () => {
    const { d, saved, keys } = deps();
    const res = await handleMinat(post(GOOD), d);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(saved).toEqual([{ candidate: "al-waraqat", purpose: "teaching", arabic: "with_help" }]);
    expect(keys).toEqual([await ipKey("kunci-uji", "203.0.113.7")]);
    expect(JSON.stringify(saved)).not.toContain("203.0.113.7");
  });

  it("menolak kandidat yang tidak tampil, pilihan di luar daftar, dan kolom tambahan (400)", async () => {
    const { d, saved } = deps();
    for (const bad of [
      { ...GOOD, candidate: "ihya" },
      { ...GOOD, purpose: "lainnya" },
      { ...GOOD, arabic: "" },
      { ...GOOD, email: "budi@contoh.id" },
    ]) {
      expect((await handleMinat(post(bad), d)).status, JSON.stringify(bad)).toBe(400);
    }
    expect(saved).toEqual([]);
  });

  it("Origin lain (403), bukan JSON (415), terlalu besar (413), JSON rusak (400)", async () => {
    const { d, saved } = deps();
    expect((await handleMinat(post(GOOD, { origin: "https://jahat.example" }), d)).status).toBe(
      403,
    );
    expect((await handleMinat(post(GOOD, { "content-type": "text/plain" }), d)).status).toBe(415);
    expect((await handleMinat(post({ ...GOOD, website: "x".repeat(2000) }), d)).status).toBe(413);
    expect((await handleMinat(post("{bukan json"), d)).status).toBe(400);
    expect(saved).toEqual([]);
  });

  it("honeypot terisi: 201 tanpa menyimpan", async () => {
    const { d, saved } = deps();
    expect((await handleMinat(post({ ...GOOD, website: "http://spam" }), d)).status).toBe(201);
    expect(saved).toEqual([]);
  });

  it("pembaca tertutup (404), tanpa kunci HMAC (503), batas per klien/global (429)", async () => {
    expect((await handleMinat(post(GOOD), deps({ enabled: false }).d)).status).toBe(404);
    expect((await handleMinat(post(GOOD), deps({ hmacKey: undefined }).d)).status).toBe(503);
    const perClient = deps({ limit: async () => false });
    expect((await handleMinat(post(GOOD), perClient.d)).status).toBe(429);
    const global = deps({ limitGlobal: async () => false });
    expect((await handleMinat(post(GOOD), global.d)).status).toBe(429);
    expect([...perClient.saved, ...global.saved]).toEqual([]);
  });
});
