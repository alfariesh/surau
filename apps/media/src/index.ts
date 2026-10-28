// Worker media Surau (X17, ADR-103): GET/HEAD objek audio dari bucket R2 `surau-media`.
// Hanya kunci berbentuk `audioObjectKey` (@surau/core): `<karya>/<lang>/<node>-<sha12>.mp3`, dan
// timestamps sorotan kalimat `alignmentObjectKey` (X18, ADR-104): `<…>-<sha12>.align.json`; selain
// itu 404. Timestamps dibaca halaman Intisari lewat `fetch` lintas asal, jadi diberi
// `Access-Control-Allow-Origin: *` (isinya publik dan immutable; `<audio>` tidak butuh CORS).
// Kunci memuat sidik isi berkas, jadi isinya tidak pernah berubah: tipe dan Cache-Control ditetapkan
// di sini (tidak bergantung metadata unggahan). Range tidak ditangani di sini: Workers
// Caching meminta respons 200 penuh lalu memotongnya sendiri (wrangler.jsonc `cache`).

/** Pola kunci objek media, sama dengan `audioManifestTrack.r2_key` (packages/core/src/audio-manifest.ts). */
export const MEDIA_KEY = /^[a-z0-9-]+\/[a-z]{2,3}\/\d+-[0-9a-f]{12}\.mp3$/u;

/** Pola kunci timestamps, sama dengan `ALIGNMENT_KEY` (packages/core/src/audio-alignment.ts). */
export const ALIGN_KEY = /^[a-z0-9-]+\/[a-z]{2,3}\/\d+-[0-9a-f]{12}\.align\.json$/u;

/** Sama dengan `AUDIO_MIME`, `ALIGNMENT_MIME`, dan `AUDIO_CACHE_CONTROL` di @surau/core (diuji). */
export const MEDIA_MIME = "audio/mpeg";
export const ALIGN_MIME = "application/json";
export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

const notFound = () =>
  new Response("Not found", {
    status: 404,
    // Tidak disimpan: objek yang baru diunggah harus langsung terbaca.
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function serveMedia(request: Request, bucket: R2Bucket): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
    });
  }
  const key = new URL(request.url).pathname.slice(1);
  const align = ALIGN_KEY.test(key);
  if (!align && !MEDIA_KEY.test(key)) return notFound();
  const head = request.method === "HEAD";
  let object: R2Object | null;
  try {
    object = head ? await bucket.head(key) : await bucket.get(key);
  } catch {
    // R2 sedang bermasalah: galat sementara tidak boleh tersimpan di cache tepi.
    return new Response("Unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  if (object === null) return notFound();
  const headers = new Headers({
    "Content-Type": align ? ALIGN_MIME : MEDIA_MIME,
    "Cache-Control": MEDIA_CACHE_CONTROL,
    ETag: object.httpEtag,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  if (align) headers.set("Access-Control-Allow-Origin", "*");
  if (head) {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { headers });
  }
  return new Response((object as R2ObjectBody).body, { headers });
}

/**
 * Objek yang dihapus dari R2 karena naskahnya memuat gagasan Intisari yang ditarik (ADR-127, izin
 * pemilik 2026-10-28). Cache Worker dibagi lintas versi (`cross_version_cache`) dan objek media
 * immutable 1 tahun, jadi salinan di cache tepi harus dibuang lewat `POST /_purge-ditarik`. Endpoint
 * itu tanpa masukan: hanya kunci di daftar ini yang bisa dipurge, dan mengulanginya tidak berbahaya.
 */
export const PURGED_KEYS: readonly string[] = [
  "ihya/id/100007-65113d52a871.mp3",
  "ihya/id/100017-b81d9fe0c222.mp3",
];
export const PURGE_PATH = "/_purge-ditarik";

/** Buang salinan cache `PURGED_KEYS` (POST tidak pernah di-cache, jadi selalu sampai ke Worker). */
export async function purgeWithdrawn(cache: CacheContext | undefined): Promise<Response> {
  const json = (body: unknown, status: number) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (cache === undefined) return json({ success: false, errors: ["no cache context"] }, 503);
  const result = await cache.purge({ pathPrefixes: PURGED_KEYS.map((k) => `/${k}`) });
  return json({ ...result, keys: PURGED_KEYS }, result.success ? 200 : 502);
}

export default {
  fetch: (request, env, ctx) =>
    request.method === "POST" && new URL(request.url).pathname === PURGE_PATH
      ? purgeWithdrawn(ctx.cache)
      : serveMedia(request, env.MEDIA),
} satisfies ExportedHandler<Env>;
