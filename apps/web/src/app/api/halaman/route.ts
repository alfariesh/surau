import { getWork, isCoreError, readPage } from "@surau/core";
import {
  AI_TEXT_LANG,
  getDigestHeaders,
  getDigestHeadersOnPath,
  getTocNode,
  listTocNodesStartingAt,
} from "@surau/db";

import type { SearchCache } from "../../../lib/search-handler";

import { getContext, readerEnabled } from "../../../lib/cloudflare";
import { serverTiming, timedD1 } from "../../../lib/d1-timing";
import { digestTeasers } from "../../../lib/reader/digest";
import { handlePage } from "../../../lib/reader/page-handler";
import { buildPageModel } from "../../../lib/reader/page-model";
import { editionSegment, parseWorkSegment, resolveEdition } from "../../../lib/reader/work-segment";

// Halaman sambungan gulir bersambung (X04 W6): GET /api/halaman?work=ihya&juz=1&page=201 → model
// siap render (`PageData`, JSON). Membaca halaman + node daftar isi yang mulai di halaman itu saja
// (bukan seluruh daftar isi, ±82–93% baris D1 render halaman). Pengaman di handlePage (tanpa baca D1
// sebelum batas laju); di sini hanya merangkai binding. Cache sama dengan /api/search: Cache API per data center, hanya bila
// `SEARCH_CACHE_CORPUS` (nama DB korpus produksi) terisi; Preview dan `next dev` tanpa cache.
const DEV_HMAC_KEY = "surau-dev-only";

/**
 * Edisi kanonis per segmen, diingat per isolate dan per korpus (hanya segmen kanonis yang
 * ditemukan, jadi varian ejaan/encoding tidak menumpuk memori): halaman sambungan berikutnya tidak
 * membaca karya/edisi lagi.
 */
const editionMemo = new Map<string, { id: number; volumes: number | null }>();
const EDITION_MEMO_MAX = 64;

function workersCache(ctx: ExecutionContext): SearchCache | null {
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
  const response = await handlePage(request, {
    enabled: readerEnabled(env),
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.PAGE_LIMITER.limit({ key })).success,
    limitGlobal: async () => (await env.PAGE_GLOBAL_LIMITER.limit({ key: "global" })).success,
    edition: async (segment) => {
      // Hanya segmen kanonis (`ihya`, `ihya@<edisi non-default>`): halaman baca selalu memakainya.
      const parsed = parseWorkSegment(segment);
      if (parsed === null) return null;
      const memoKey = `${env.SEARCH_CACHE_CORPUS ?? ""}\n${segment}`;
      const known = editionMemo.get(memoKey);
      if (known !== undefined) return known;
      try {
        const work = await getWork(db, parsed.workSlug);
        const resolved = resolveEdition(work, parsed.editionSlug);
        // Hanya bentuk kanonis (yang dikirim pembaca): varian lain = 404, tidak di-memo/di-cache.
        if (resolved.kind !== "ok" || editionSegment(work, resolved.edition) !== segment) {
          return null;
        }
        const found = { id: resolved.edition.id, volumes: resolved.edition.volumes };
        if (editionMemo.size >= EDITION_MEMO_MAX) editionMemo.clear();
        editionMemo.set(memoKey, found);
        return found;
      } catch (error) {
        if (isCoreError(error)) return null;
        throw error;
      }
    },
    load: async (editionId, juz, page) => {
      const segment = new URL(request.url).searchParams.get("work") ?? "";
      const [view, nodes] = await Promise.all([
        readPage(db, editionId, juz, page),
        listTocNodesStartingAt(db, editionId, juz, page),
      ]);
      const activeIds = [
        ...new Set(view.body.flatMap((p) => (p.toc_node_id === null ? [] : [p.toc_node_id]))),
      ];
      const first = activeIds[0];
      // Intisari (X16): kepala bagian yang mulai di halaman ini (kartu ringkasan) dan Intisari
      // terdekat dari bagian paragraf pertamanya (menu ⋮). Korpus skema < 9: keduanya kosong.
      const [node, sectionHeads, pathHeads] = await Promise.all([
        first === undefined ? null : getTocNode(db, first),
        getDigestHeaders(
          db,
          nodes.map((n) => n.id),
          AI_TEXT_LANG,
        ),
        first === undefined ? [] : getDigestHeadersOnPath(db, first, AI_TEXT_LANG),
      ]);
      const model = await buildPageModel(view, {
        editionId,
        sections: nodes.map((n) => ({
          id: n.id,
          parentId: n.parent_id,
          level: n.level,
          title: n.title_ar,
        })),
        digests: digestTeasers(sectionHeads, segment),
      });
      const digest = digestTeasers(pathHeads, segment)[0] ?? null;
      return { model, bab: node?.title_ar ?? null, activeIds, digest };
    },
    cache: store === null ? null : { store, corpus: env.SEARCH_CACHE_CORPUS },
  });
  const detail = env.SEARCH_TIMING_DETAIL === "1" || dev;
  response.headers.set("Server-Timing", serverTiming(timing, performance.now() - started, detail));
  return response;
}
