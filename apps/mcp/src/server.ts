// Pabrik server MCP (S16 langkah 3, ADR-011): satu `McpServer` baru per permintaan (jangan pernah
// dibagi antarpermintaan: GHSA-jm63), dengan instruksi server dan cache hint publik untuk daftar
// tool dan `server/discover` (isinya hanya berubah saat deploy).
import { McpServer } from "@modelcontextprotocol/server";

import { SERVER_INSTRUCTIONS } from "./instructions.ts";
import { REDAKSI_INSTRUCTIONS } from "./redaksi-instructions.ts";
import { REDAKSI_TOOLS } from "./redaksi-tools.ts";
import { TOOLS, registerTools } from "./tools.ts";
import type { ToolDeps } from "./tools.ts";

export const SERVER_INFO = {
  name: "surau",
  title: "Surau",
  version: "0.1.0",
  websiteUrl: "https://surau.org",
} as const;

/** Umur cache hint daftar tool dan discover: satu jam (deploy baru = daftar baru). */
export const LIST_CACHE_TTL_MS = 60 * 60 * 1000;

/** Server `/redaksi` (X22): nama, instruksi, dan daftar tool sendiri. */
export const REDAKSI_SERVER_INFO = {
  name: "surau-redaksi",
  title: "Surau Redaksi",
  version: "0.1.0",
  websiteUrl: "https://surau.org",
} as const;

export function buildServer(deps: ToolDeps): McpServer {
  const redaksi = deps.endpoint === "redaksi";
  const server = new McpServer(
    // websiteUrl dari SITE_URL Worker, bukan konstanta produksi (#75).
    { ...(redaksi ? REDAKSI_SERVER_INFO : SERVER_INFO), websiteUrl: deps.siteUrl },
    {
      // Daftar tool statis dan server ini tidak pernah mengirim notifikasi perubahan. Tanpa nilai
      // eksplisit SDK mengiklankan listChanged: true, sehingga klien modern membuka aliran
      // `subscriptions/listen` sia-sia yang dibatasi MAX_SUBSCRIPTIONS per isolate (#65).
      capabilities: { tools: { listChanged: false } },
      instructions: redaksi ? REDAKSI_INSTRUCTIONS : SERVER_INSTRUCTIONS,
      cacheHints: {
        "tools/list": { ttlMs: LIST_CACHE_TTL_MS, cacheScope: "public" },
        "server/discover": { ttlMs: LIST_CACHE_TTL_MS, cacheScope: "public" },
      },
    },
  );
  registerTools(server, deps, redaksi ? REDAKSI_TOOLS : TOOLS);
  return server;
}
