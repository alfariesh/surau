import type { SearchTextInput, SearchView } from "@surau/core";

import { SEARCH_QUERY_MAX, isCoreError, uintSegment } from "@surau/core";
import { z } from "zod";

import { ipKey, ipNetwork } from "./client-key";

// Logika GET /api/search (S11 langkah 5), dipisah dari route supaya bisa dites tanpa Workers.
// Urutan: pembaca terbuka → parameter (Zod; kueri ≤200 karakter) → batas per klien (kunci = HMAC
// jaringan IP, sama dengan /api/feedback) → batas global → searchText. Error core dipetakan ke
// status HTTP; error lain (D1 gagal) dibiarkan naik sebagai 500 tanpa detail. Kueri pengguna tidak
// pernah dicatat (log Worker menghapus query string, P-7).

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
}

const flag = z.enum(["0", "1"]).transform((v) => v === "1");

/** Parameter URL (`?q=&edition=&limit=&offset=&expand=1`); parameter lain diabaikan. */
export const searchParams = z.object({
  q: z.string().min(1).max(SEARCH_QUERY_MAX),
  edition: uintSegment.optional(),
  limit: uintSegment.optional(),
  offset: uintSegment.optional(),
  expand: flag.optional(),
});

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
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
    ["q", "edition", "limit", "offset", "expand"]
      .map((k) => [k, url.searchParams.get(k)] as const)
      .filter(([, v]) => v !== null),
  );
  const parsed = searchParams.safeParse(raw);
  if (!parsed.success) return json(400, { error: "invalid" });
  const p = parsed.data;

  if (deps.hmacKey === undefined || deps.hmacKey === "") {
    return json(503, { error: "unavailable" });
  }
  // Per klien dulu: permintaan yang ditolak per klien tidak memakan kuota global (satu jaringan
  // paling banyak memakai 60 dari 300 per menit).
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });

  try {
    const view = await deps.search(p.q, {
      edition_id: p.edition,
      limit: p.limit,
      offset: p.offset,
      expand: p.expand,
    });
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
