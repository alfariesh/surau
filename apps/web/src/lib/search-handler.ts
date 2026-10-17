import type { SearchTextInput, SearchView } from "@surau/core";

import { SEARCH_QUERY_MAX, isCoreError, searchCacheKey, uintSegment } from "@surau/core";
import { z } from "zod";

import { ipKey, ipNetwork } from "./client-key";

// Logika GET /api/search (S11 langkah 5, S14 langkah 8), dipisah dari route supaya bisa dites tanpa
// Workers. Urutan: pembaca terbuka → parameter (Zod; kueri ≤200 karakter) → cache hasil (bila ada)
// → batas per klien (kunci = HMAC jaringan IP, sama dengan /api/feedback) → batas global →
// searchText → simpan ke cache. Error core dipetakan ke status HTTP; error lain (D1 gagal)
// dibiarkan naik sebagai 500 tanpa detail. Kueri pengguna tidak pernah dicatat (log Worker
// menghapus query string, P-7) dan kunci cache adalah hash rencana kueri, bukan teksnya.

/** Umur salinan cache: korpus tidak berubah per versi, dan versi korpus ada di kunci. */
export const SEARCH_CACHE_TTL = 7 * 24 * 60 * 60;

/** Cache hasil (Cache API Workers per data center): `put` tidak ditunggu (waitUntil). */
export interface SearchCache {
  match: (key: string) => Promise<Response | undefined>;
  put: (key: string, response: Response) => void;
}

export interface SearchDeps {
  enabled: boolean;
  /** Kunci HMAC untuk IP; `undefined` = pencarian dimatikan (503) sampai secret dipasang. */
  hmacKey: string | undefined;
  /** IP klien (`cf-connecting-ip`), atau `null` bila tidak diketahui. */
  ip: string | null;
  /** Batas per klien; `key` = HMAC jaringan IP. */
  limit: (key: string) => Promise<boolean>;
  /** Batas bersama semua klien (kunci tetap): plafon beban D1 dari banyak alamat. */
  limitGlobal: () => Promise<boolean>;
  search: (query: string, opts: Omit<SearchTextInput, "query">) => Promise<SearchView>;
  /**
   * Cache hasil + versi korpus untuk kuncinya; `null` = tanpa cache (Preview, dev, atau versi
   * korpus tidak diketahui).
   */
  cache: { store: SearchCache; corpus: string } | null;
}

const flag = z.enum(["0", "1"]).transform((v) => v === "1");

/** Parameter URL (`?q=&edition=&section=&limit=&offset=&expand=1`); parameter lain diabaikan. */
export const searchParams = z.object({
  q: z.string().min(1).max(SEARCH_QUERY_MAX),
  edition: uintSegment.optional(),
  section: uintSegment.optional(),
  limit: uintSegment.optional(),
  offset: uintSegment.optional(),
  expand: flag.optional(),
});

function json(status: number, body: unknown, cache?: "hit" | "miss"): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (cache !== undefined) headers["X-Surau-Cache"] = cache;
  return Response.json(body, { status, headers });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** URL kunci Cache API: origin permintaan + hash (versi korpus + rencana kueri ternormalisasi). */
async function cacheUrl(origin: string, corpus: string, planKey: string): Promise<string> {
  return `${origin}/__cache/search/${await sha256Hex(`${corpus}\n${planKey}`)}`;
}

const STATUS: Record<string, number> = {
  invalid_query: 400,
  invalid_citation: 400,
  not_found: 404,
  unavailable: 503,
};

export async function handleSearch(request: Request, deps: SearchDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  const url = new URL(request.url);
  // Nilai pertama per nama; nama yang tidak dikenal tidak ikut (Zod membuangnya).
  const raw = Object.fromEntries(
    ["q", "edition", "section", "limit", "offset", "expand"]
      .map((k) => [k, url.searchParams.get(k)] as const)
      .filter(([, v]) => v !== null),
  );
  const parsed = searchParams.safeParse(raw);
  if (!parsed.success) return json(400, { error: "invalid" });
  const p = parsed.data;

  if (deps.hmacKey === undefined || deps.hmacKey === "") {
    return json(503, { error: "unavailable" });
  }
  const opts = {
    edition_id: p.edition,
    section_id: p.section,
    limit: p.limit,
    offset: p.offset,
    expand: p.expand,
  };
  const planKey = deps.cache === null ? null : searchCacheKey(p.q, opts);
  const key =
    deps.cache === null || planKey === null
      ? null
      : await cacheUrl(url.origin, deps.cache.corpus, planKey);
  if (key !== null && deps.cache !== null) {
    const hit = await deps.cache.store.match(key);
    if (hit !== undefined) {
      // Kueri lain dengan rencana yang sama: hanya `query` yang berbeda.
      const view = (await hit.json()) as SearchView;
      return json(200, { ...view, query: p.q }, "hit");
    }
  }
  // Per klien dulu: permintaan yang ditolak per klien tidak memakan kuota global (satu jaringan
  // paling banyak memakai 60 dari 300 per menit).
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });

  try {
    const view = await deps.search(p.q, opts);
    if (key !== null && deps.cache !== null) {
      deps.cache.store.put(
        key,
        Response.json(view, {
          headers: { "Cache-Control": `public, s-maxage=${SEARCH_CACHE_TTL}` },
        }),
      );
      return json(200, view, "miss");
    }
    return json(200, view);
  } catch (error) {
    if (isCoreError(error)) {
      const status = STATUS[error.code] ?? 400;
      // Pesan core adalah kontrak publik (Inggris, tanpa SQL/isi DB); aman diteruskan.
      return json(status, { error: error.code, message: error.message });
    }
    throw error;
  }
}
