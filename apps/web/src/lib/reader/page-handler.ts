import { ipKey, ipNetwork, isCoreError, uintSegment } from "@surau/core";
import { z } from "zod";

import type { SearchCache } from "../search-handler";

import type { PageModel } from "./page-model";

import { PAGE_MODEL_VERSION } from "./page-model";

// Logika GET /api/halaman (X04 W6, gulir bersambung): model siap render satu halaman cetak tanpa
// daftar isi lengkap. Dipisah dari route supaya bisa dites tanpa Workers. Urutan sama dengan
// /api/search (ADR-048): pembaca terbuka → parameter (Zod) → karya/edisi + batas juz SEBELUM
// membaca halaman → cache (Cache API, bila ada) → batas per klien (HMAC jaringan IP) → batas global
// → baca → simpan ke cache. Alamat tidak sah atau tidak ada = 404 tanpa menulis cache.

/** Umur salinan cache: isi halaman tetap per versi korpus, dan versi korpus + model ada di kunci. */
export const PAGE_CACHE_TTL = 7 * 24 * 60 * 60;

export const pageParams = z.object({
  work: z.string().min(1).max(130),
  juz: uintSegment,
  page: uintSegment,
});

/** Isi respons: model halaman + judul bab terdalam dan bagian aktif (judul navbar, daftar isi). */
export interface PageData {
  model: PageModel;
  /** Judul Arab node daftar isi paragraf pertama halaman ini (DB), atau null. */
  bab: string | null;
  /** Node daftar isi yang tampil di halaman ini (urut), untuk menyorot daftar isi. */
  activeIds: number[];
}

export interface PageDeps {
  enabled: boolean;
  hmacKey: string | undefined;
  ip: string | null;
  limit: (key: string) => Promise<boolean>;
  limitGlobal: () => Promise<boolean>;
  /** Edisi kanonis dari segmen karya (`ihya`), atau null (tidak ada / bukan bentuk kanonis). */
  edition: (segment: string) => Promise<{ id: number; volumes: number | null } | null>;
  load: (editionId: number, juz: number, page: number) => Promise<PageData>;
  cache: { store: SearchCache; corpus: string } | null;
}

function json(status: number, body: unknown, cache?: "hit" | "miss"): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (cache !== undefined) headers["X-Surau-Cache"] = cache;
  return Response.json(body, { status, headers });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handlePage(request: Request, deps: PageDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  const url = new URL(request.url);
  const parsed = pageParams.safeParse({
    work: url.searchParams.get("work") ?? undefined,
    juz: url.searchParams.get("juz") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) return json(400, { error: "invalid" });
  if (deps.hmacKey === undefined || deps.hmacKey === "") return json(503, { error: "unavailable" });
  const { work, juz, page } = parsed.data;

  const edition = await deps.edition(work);
  if (edition === null || juz < 1 || (edition.volumes !== null && juz > edition.volumes)) {
    return json(404, { error: "not_found" });
  }
  const key =
    deps.cache === null
      ? null
      : `${url.origin}/__cache/halaman/${await sha256Hex(
          `${deps.cache.corpus}\n${PAGE_MODEL_VERSION}\n${edition.id}\n${juz}\n${page}`,
        )}`;
  if (key !== null && deps.cache !== null) {
    const hit = await deps.cache.store.match(key);
    if (hit !== undefined) return json(200, await hit.json(), "hit");
  }
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });

  let data: PageData;
  try {
    data = await deps.load(edition.id, juz, page);
  } catch (error) {
    if (isCoreError(error))
      return json(error.code === "not_found" ? 404 : 400, { error: error.code });
    throw error;
  }
  if (key !== null && deps.cache !== null) {
    deps.cache.store.put(
      key,
      Response.json(data, { headers: { "Cache-Control": `public, s-maxage=${PAGE_CACHE_TTL}` } }),
    );
    return json(200, data, "miss");
  }
  return json(200, data);
}
