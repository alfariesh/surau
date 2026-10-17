// Pabrik server MCP (S16 langkah 3, ADR-011): satu `McpServer` baru per permintaan (jangan pernah
// dibagi antarpermintaan: GHSA-jm63), dengan instruksi server dan cache hint publik untuk daftar
// tool dan `server/discover` (isinya hanya berubah saat deploy).
import { McpServer } from "@modelcontextprotocol/server";

import { SERVER_INSTRUCTIONS } from "./instructions.ts";
import { registerTools } from "./tools.ts";
import type { ToolDeps } from "./tools.ts";

export const SERVER_INFO = {
  name: "surau",
  title: "Surau",
  version: "0.1.0",
  websiteUrl: "https://surau.org",
} as const;

/** Umur cache hint daftar tool dan discover: satu jam (deploy baru = daftar baru). */
export const LIST_CACHE_TTL_MS = 60 * 60 * 1000;

export function buildServer(deps: ToolDeps): McpServer {
  const server = new McpServer(
    { ...SERVER_INFO },
    {
      instructions: SERVER_INSTRUCTIONS,
      cacheHints: {
        "tools/list": { ttlMs: LIST_CACHE_TTL_MS, cacheScope: "public" },
        "server/discover": { ttlMs: LIST_CACHE_TTL_MS, cacheScope: "public" },
      },
    },
  );
  registerTools(server, deps);
  return server;
}
