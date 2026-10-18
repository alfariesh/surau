import { searchText } from "@surau/core";

import type { SearchCache } from "../../../lib/search-handler";

import { getContext, readerEnabled } from "../../../lib/cloudflare";
import { serverTiming, timedD1 } from "../../../lib/d1-timing";
import { handleSearch } from "../../../lib/search-handler";

// Pencarian Arab + Indonesia (S11, S14): GET /api/search?q=&edition=&limit=&offset=&expand=1 →
// `SearchView` @surau/core (JSON). Dipakai UI Cari. Pengaman ada di handleSearch; di sini hanya
// merangkai binding. `Server-Timing`: waktu SQL D1 (jumlah `meta.duration`) dan total handler; di
// Preview juga bolak-balik dan baris dibaca (`SEARCH_TIMING_DETAIL`, S11 langkah 6). Korpus tanpa
// indeks yang dibutuhkan → 503, bukan "kosong". Cache hasil (S14 langkah 8): Cache API per data
// center, hanya bila `SEARCH_CACHE_CORPUS` (nama DB korpus produksi, diganti `corpus:promote`)
// terisi; Preview dan `next dev` tanpa cache.
const DEV_HMAC_KEY = "surau-dev-only";

function workersCache(ctx: ExecutionContext): SearchCache | null {
  // `caches.default` hanya ada di runtime Workers (bukan `next dev` di Node).
  const cache = typeof caches === "undefined" ? undefined : (caches as { default?: Cache }).default;
  if (cache === undefined) return null;
  return {
    match: (key) => cache.match(key),
    put: (key, response) => ctx.waitUntil(cache.put(key, response)),
  };
}

export async function GET(request: Request): Promise<Response> {
  const started = performance.now();
  const { env, ctx } = await getContext();
  const dev = process.env.NODE_ENV === "development";
  const store = dev || !env.SEARCH_CACHE_CORPUS ? null : workersCache(ctx);
  const { db, timing } = timedD1(env.CORPUS_DB);
  const response = await handleSearch(request, {
    enabled: readerEnabled(env),
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.SEARCH_LIMITER.limit({ key })).success,
    limitGlobal: async () => (await env.SEARCH_GLOBAL_LIMITER.limit({ key: "global" })).success,
    search: (query, opts) => searchText(db, query, opts),
    cache: store === null ? null : { store, corpus: env.SEARCH_CACHE_CORPUS },
  });
  const detail = env.SEARCH_TIMING_DETAIL === "1" || dev;
  response.headers.set("Server-Timing", serverTiming(timing, performance.now() - started, detail));
  return response;
}
