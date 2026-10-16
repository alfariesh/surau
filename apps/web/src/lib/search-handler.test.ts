import type { SearchTextInput, SearchView } from "@surau/core";

import { InvalidQuery, NotFound, Unavailable } from "@surau/core";
import { describe, expect, it } from "vite-plus/test";

import type { SearchDeps } from "./search-handler";

import { handleSearch } from "./search-handler";

const BASE = "https://surau.example/api/search";

const VIEW: SearchView = {
  query: "الصبر",
  terms: ["صبر"],
  edition_id: null,
  ranked: true,
  warning: null,
  common_terms: [],
  total_pages: 0,
  total_hits: 0,
  limit: 20,
  offset: 0,
  results: [],
};

function deps(over: Partial<SearchDeps> = {}) {
  const calls: { query: string; opts: Omit<SearchTextInput, "query"> }[] = [];
  const keys: string[] = [];
  const d: SearchDeps = {
    enabled: true,
    hmacKey: "kunci-uji",
    ip: "203.0.113.7",
    limit: async (key) => {
      keys.push(key);
      return true;
    },
    limitGlobal: async () => true,
    search: async (query, opts) => {
      calls.push({ query, opts });
      return { ...VIEW, query };
    },
    ...over,
  };
  return { d, calls, keys };
}

const get = (qs: string) => new Request(`${BASE}?${qs}`);

describe("handleSearch", () => {
  it("meneruskan kueri dan opsi ke searchText; JSON + no-store", async () => {
    const { d, calls, keys } = deps();
    const res = await handleSearch(
      get(`q=${encodeURIComponent("الصبر")}&edition=1&limit=5&offset=10&expand=1&utm=x`),
      d,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(((await res.json()) as SearchView).query).toBe("الصبر");
    expect(calls).toEqual([
      { query: "الصبر", opts: { edition_id: 1, limit: 5, offset: 10, expand: true } },
    ]);
    // Kunci rate limit = HMAC, bukan IP mentah.
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(keys[0]).not.toContain("203.0.113.7");
  });

  it("parameter salah → 400 tanpa menyentuh searchText", async () => {
    for (const qs of [
      "",
      "q=",
      `q=${"ص".repeat(201)}`,
      "q=x&edition=01",
      "q=x&limit=-1",
      "q=x&offset=1e2",
      "q=x&expand=ya",
    ]) {
      const { d, calls } = deps();
      const res = await handleSearch(get(qs), d);
      expect(res.status, qs).toBe(400);
      expect(calls).toEqual([]);
    }
  });

  it("pembaca tertutup → 404; kunci HMAC tidak ada → 503; batas klien → 429", async () => {
    expect((await handleSearch(get("q=x"), deps({ enabled: false }).d)).status).toBe(404);
    expect((await handleSearch(get("q=x"), deps({ hmacKey: undefined }).d)).status).toBe(503);
    const limited = deps({ limit: async () => false });
    const res = await handleSearch(get("q=x"), limited.d);
    expect(res.status).toBe(429);
    expect(limited.calls).toEqual([]);
    // Batas global habis → 429. Ditolak per klien → kuota global tidak disentuh, jadi satu
    // jaringan tidak bisa menghabiskan batas global untuk semua orang.
    const global = deps({ limitGlobal: async () => false });
    expect((await handleSearch(get("q=x"), global.d)).status).toBe(429);
    expect(global.calls).toEqual([]);
    let globalCalls = 0;
    const perClient = deps({
      limit: async () => false,
      limitGlobal: async () => {
        globalCalls++;
        return true;
      },
    });
    expect((await handleSearch(get("q=x"), perClient.d)).status).toBe(429);
    expect(globalCalls).toBe(0);
  });

  it("error core → status HTTP + kode; error lain dilempar (500 tanpa detail)", async () => {
    const cases = [
      [new InvalidQuery("Invalid limit"), 400, "invalid_query"],
      [new NotFound("Edition not found: 9"), 404, "not_found"],
      [new Unavailable("Search is not available for this corpus version"), 503, "unavailable"],
    ] as const;
    for (const [error, status, code] of cases) {
      const res = await handleSearch(get("q=x"), deps({ search: () => Promise.reject(error) }).d);
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: code, message: error.message });
    }
    await expect(
      handleSearch(get("q=x"), deps({ search: () => Promise.reject(new Error("D1 mati")) }).d),
    ).rejects.toThrow("D1 mati");
  });
});
