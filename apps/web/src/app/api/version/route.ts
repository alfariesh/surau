import { NORM_VERSION } from "@surau/text";

// Versi aturan yang dipakai build ini. Klien (MCP, eval) bisa membandingkan `normVersion` dengan
// `meta.norm_version` korpus: bila berbeda, indeks FTS dan kueri tidak sinkron (reindex).
// Juga bukti bahwa paket workspace TS mentah (@surau/text) ter-bundle oleh Next + OpenNext.
export function GET(): Response {
  return Response.json({ normVersion: NORM_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
