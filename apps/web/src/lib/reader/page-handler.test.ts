import { NotFound } from "@surau/core";
import { describe, expect, it } from "vite-plus/test";

import type { PageData, PageDeps } from "./page-handler";

import { PAGE_CACHE_TTL, handlePage } from "./page-handler";

function memoryCache() {
  const store = new Map<string, Response>();
  const puts: string[] = [];
  return {
    store,
    puts,
    cache: {
      match: async (key: string) => store.get(key)?.clone(),
      put: (key: string, response: Response) => {
        puts.push(key);
        store.set(key, response);
      },
    },
  };
}

const DATA = { model: { juz: 1, pageNo: 201 }, bab: null, activeIds: [7] } as unknown as PageData;
const url = (q: string) => new Request(`https://surau.example/api/halaman?${q}`);

function deps(over: Partial<PageDeps> = {}) {
  const loads: string[] = [];
  const limited: string[] = [];
  const editions: string[] = [];
  const d: PageDeps = {
    enabled: true,
    hmacKey: "kunci-uji",
    ip: "203.0.113.7",
    limit: async (key) => {
      limited.push(key);
      return true;
    },
    limitGlobal: async () => true,
    edition: async (segment) => {
      editions.push(segment);
      return segment === "ihya" ? { id: 1, volumes: 4 } : null;
    },
    load: async (ed, juz, page) => {
      loads.push(`${ed}/${juz}/${page}`);
      return DATA;
    },
    cache: null,
    ...over,
  };
  return { d, loads, limited, editions };
}

describe("handlePage (GET /api/halaman)", () => {
  it("200: model halaman dari edisi kanonis; tanpa Cache-Control publik untuk browser", async () => {
    const { d, loads, limited } = deps();
    const res = await handlePage(url("work=ihya&juz=1&page=201"), d);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual(DATA);
    expect(loads).toEqual(["1/1/201"]);
    // Kunci batas laju = HMAC jaringan IP (bukan IP mentah).
    expect(limited[0]).toMatch(/^[0-9a-f]{32}$/);
  });

  it("parameter salah bentuk = 400 tanpa D1; karya/juz tidak ada = 404 tanpa membaca halaman", async () => {
    const { d, loads, editions } = deps();
    for (const q of [
      "work=ihya&juz=01&page=2",
      "work=ihya&juz=1",
      "juz=1&page=2",
      "work=ihya&juz=1&page=1e2",
    ]) {
      expect((await handlePage(url(q), d)).status, q).toBe(400);
    }
    expect(editions).toEqual([]);
    for (const q of [
      "work=lain&juz=1&page=2",
      "work=ihya&juz=0&page=2",
      "work=ihya&juz=5&page=2",
    ]) {
      expect((await handlePage(url(q), d)).status, q).toBe(404);
    }
    expect(loads).toEqual([]);
  });

  it("pembaca tertutup = 404; kunci HMAC belum dipasang = 503", async () => {
    expect(
      (await handlePage(url("work=ihya&juz=1&page=2"), deps({ enabled: false }).d)).status,
    ).toBe(404);
    expect(
      (await handlePage(url("work=ihya&juz=1&page=2"), deps({ hmacKey: undefined }).d)).status,
    ).toBe(503);
  });

  it("halaman yang tidak ada = 404 dan tidak menulis cache", async () => {
    const mem = memoryCache();
    const { d } = deps({
      cache: { store: mem.cache, corpus: "surau-corpus-uji" },
      load: async () => {
        throw new NotFound("Page not found");
      },
    });
    expect((await handlePage(url("work=ihya&juz=1&page=99999"), d)).status).toBe(404);
    expect(mem.puts).toEqual([]);
  });

  it("batas per klien dan global = 429 sebelum membaca D1 (edisi maupun halaman)", async () => {
    const perClient = deps({ limit: async () => false });
    expect((await handlePage(url("work=ihya&juz=1&page=2"), perClient.d)).status).toBe(429);
    expect(perClient.loads).toEqual([]);
    expect(perClient.editions).toEqual([]);
    const global = deps({ limitGlobal: async () => false });
    expect((await handlePage(url("work=ihya&juz=1&page=2"), global.d)).status).toBe(429);
    expect(global.loads).toEqual([]);
    expect(global.editions).toEqual([]);
  });

  it("cache: simpan sekali (s-maxage), permintaan berikutnya dari cache tanpa batas laju/baca", async () => {
    const mem = memoryCache();
    const first = deps({ cache: { store: mem.cache, corpus: "surau-corpus-uji" } });
    const miss = await handlePage(url("work=ihya&juz=1&page=201"), first.d);
    expect(miss.headers.get("X-Surau-Cache")).toBe("miss");
    expect(mem.puts).toHaveLength(1);
    expect(mem.store.get(mem.puts[0]!)?.headers.get("Cache-Control")).toBe(
      `public, s-maxage=${PAGE_CACHE_TTL}`,
    );
    const second = deps({
      cache: { store: mem.cache, corpus: "surau-corpus-uji" },
      limit: async () => false,
    });
    const hit = await handlePage(url("work=ihya&juz=1&page=201"), second.d);
    expect(hit.status).toBe(200);
    expect(hit.headers.get("X-Surau-Cache")).toBe("hit");
    expect(second.loads).toEqual([]);
    expect(second.editions).toEqual([]);
    // Versi korpus lain = kunci lain.
    const other = deps({ cache: { store: mem.cache, corpus: "surau-corpus-lain" } });
    expect(
      (await handlePage(url("work=ihya&juz=1&page=201"), other.d)).headers.get("X-Surau-Cache"),
    ).toBe("miss");
  });
});
