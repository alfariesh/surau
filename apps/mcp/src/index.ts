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
} from "./http-config.ts";
import { SERVER_INFO, buildServer } from "./server.ts";

// Satu handler per isolate (bus langganan + batas langganan); pabriknya dipanggil per permintaan
// dan membuat McpServer baru dengan request asli (kunci batas pemakaian) dan binding Worker.
const handler = createMcpHandler(
  (ctx) => buildServer({ env, db: env.CORPUS_DB, request: ctx.requestInfo, siteUrl: env.SITE_URL }),
  {
    legacy: "stateless",
    maxRequestBodySize: MAX_REQUEST_BODY,
    maxSubscriptions: MAX_SUBSCRIPTIONS,
    // Hanya nama error: pesan bisa memuat potongan body permintaan (masukan pengguna, P-7).
    onerror: (error) => console.warn(JSON.stringify({ event: "mcp_error", error: error.name })),
  },
);

function info(siteUrl: string): Response {
  return Response.json(
    {
      name: SERVER_INFO.title,
      description:
        "Surau MCP server: classical Islamic texts with verbatim Arabic, citations, takhrij and labelled Indonesian aids. Read-only, no sign-in.",
      mcp_endpoint: new URL(MCP_PATH, "https://mcp.surau.org").href,
      website: siteUrl,
      license: `${siteUrl}/lisensi`,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === MCP_PATH) {
      const rejected = originValidationResponse(request, ALLOWED_ORIGIN_HOSTS);
      if (rejected !== undefined) return rejected;
      return handler.fetch(request);
    }
    if (pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
      return info(env.SITE_URL);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
