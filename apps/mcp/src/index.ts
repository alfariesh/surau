// Worker `surau-mcp` (S16): MCP publik read-only di mcp.surau.org/mcp. Stateless dual-era
// (ADR-011): klien spesifikasi 2025-11-25 (`initialize`) dan 2026-07-28 (`server/discover`)
// dilayani handler yang sama. Urutan: path → Origin (403 bila asing; tanpa Origin lolos) →
// handler SDK (batas body 64 KiB → 413) → tool (batas pemakaian per tool, lalu core).
import { createMcpHandler, originValidationResponse } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";

import {
  ALLOWED_ORIGIN_HOSTS,
  MAX_REQUEST_BODY,
  MAX_SUBSCRIPTIONS,
  MCP_PATH,
  REDAKSI_PATH,
} from "./http-config.ts";
import { SERVER_INFO, buildServer } from "./server.ts";
import { errorLabel } from "./telemetry.ts";
import type { McpEndpoint } from "./tools.ts";

// Satu handler per isolate (bus langganan + batas langganan); pabriknya dipanggil per permintaan
// dan membuat McpServer baru dengan request asli (kunci batas pemakaian) dan binding Worker.
function handlerFor(endpoint: McpEndpoint) {
  return createMcpHandler(
    (ctx) =>
      buildServer({
        endpoint,
        env,
        db: env.CORPUS_DB,
        request: ctx.requestInfo,
        siteUrl: env.SITE_URL,
      }),
    {
      legacy: "stateless",
      maxRequestBodySize: MAX_REQUEST_BODY,
      maxSubscriptions: MAX_SUBSCRIPTIONS,
      // Hanya label statis (nama kelas, jenis dari awalan pesan SDK, kode): pesannya bisa memuat
      // potongan body permintaan (masukan pengguna, P-7), jadi tidak pernah dicatat (#74).
      onerror: (error) =>
        console.warn(JSON.stringify({ event: "mcp_error", endpoint, ...errorLabel(error) })),
    },
  );
}

const handler = handlerFor("mcp");
// Endpoint penulis konten (X22, ADR-125): tidak diiklankan di info `/`.
const redaksiHandler = handlerFor("redaksi");

function info(siteUrl: string, requestUrl: string): Response {
  return Response.json(
    {
      name: SERVER_INFO.title,
      description:
        "Surau MCP server: classical Islamic texts with verbatim Arabic, citations, takhrij and labelled Indonesian aids. Read-only, no sign-in.",
      // Dari host permintaan: Preview dan `wrangler dev` menunjuk dirinya sendiri (#75).
      mcp_endpoint: new URL(MCP_PATH, requestUrl).href,
      website: siteUrl,
      license: `${siteUrl}/lisensi`,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { hostname, pathname } = new URL(request.url);
    // Produksi hanya di mcp.surau.org: Version URL workers.dev (binding produksi, di luar WAF zona)
    // ditolak. Preview mengosongkan PUBLIC_HOST (#64, ADR-062).
    if (env.PUBLIC_HOST !== "" && hostname !== env.PUBLIC_HOST) {
      return new Response("Not found", { status: 404 });
    }
    if (pathname === MCP_PATH || pathname === REDAKSI_PATH) {
      const rejected = originValidationResponse(request, ALLOWED_ORIGIN_HOSTS);
      if (rejected !== undefined) return rejected;
      return (pathname === MCP_PATH ? handler : redaksiHandler).fetch(request);
    }
    if (pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
      return info(env.SITE_URL, request.url);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
