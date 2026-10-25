// Worker media Surau (X17, ADR-103): GET/HEAD objek audio dari bucket R2 `surau-media`.
// Hanya kunci berbentuk `audioObjectKey` (@surau/core): `<karya>/<lang>/<node>-<sha12>.mp3`; selain
// itu 404. Kunci memuat sidik isi berkas, jadi isinya tidak pernah berubah: tipe dan Cache-Control
// ditetapkan di sini (tidak bergantung metadata unggahan). Range tidak ditangani di sini: Workers
// Caching meminta respons 200 penuh lalu memotongnya sendiri (wrangler.jsonc `cache`).

/** Pola kunci objek media, sama dengan `audioManifestTrack.r2_key` (packages/core/src/audio-manifest.ts). */
export const MEDIA_KEY = /^[a-z0-9-]+\/[a-z]{2,3}\/\d+-[0-9a-f]{12}\.mp3$/u;

/** Sama dengan `AUDIO_MIME` dan `AUDIO_CACHE_CONTROL` di @surau/core (diuji). */
export const MEDIA_MIME = "audio/mpeg";
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
  if (!MEDIA_KEY.test(key)) return notFound();
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
    "Content-Type": MEDIA_MIME,
    "Cache-Control": MEDIA_CACHE_CONTROL,
    ETag: object.httpEtag,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  if (head) {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { headers });
  }
  return new Response((object as R2ObjectBody).body, { headers });
}

export default {
  fetch: (request, env) => serveMedia(request, env.MEDIA),
} satisfies ExportedHandler<Env>;
