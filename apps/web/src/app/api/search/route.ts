import { searchText } from "@surau/core";

import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { serverTiming, timedD1 } from "../../../lib/d1-timing";
import { handleSearch } from "../../../lib/search-handler";

// Pencarian Arab (S11): GET /api/search?q=&edition=&limit=&offset=&expand=1 → `SearchView`
// @surau/core (JSON). Dipakai UI Cari (S14). Pengaman ada di handleSearch; di sini hanya merangkai
// binding. `Server-Timing`: waktu SQL D1 (jumlah `meta.duration`) dan total handler; di Preview juga
// bolak-balik dan baris dibaca (`SEARCH_TIMING_DETAIL`, S11 langkah 6). Korpus tanpa indeks pencarian (ihya-v1) → 503, bukan "kosong".
const DEV_HMAC_KEY = "surau-dev-only";

export async function GET(request: Request): Promise<Response> {
  const started = performance.now();
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  const { db, timing } = timedD1(env.CORPUS_DB);
  const response = await handleSearch(request, {
    enabled: readerEnabled(env),
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.SEARCH_LIMITER.limit({ key })).success,
    limitGlobal: async () => (await env.SEARCH_GLOBAL_LIMITER.limit({ key: "global" })).success,
    search: (query, opts) => searchText(db, query, opts),
  });
  const detail = env.SEARCH_TIMING_DETAIL === "1" || dev;
  response.headers.set("Server-Timing", serverTiming(timing, performance.now() - started, detail));
  return response;
}
