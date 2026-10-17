// Konstanta HTTP Worker MCP (S16). Terpisah dari src/index.ts: modul entrypoint Workers hanya
// boleh mengekspor handler.
import { localhostAllowedHostnames } from "@modelcontextprotocol/server";

export const MCP_PATH = "/mcp";
export const MAX_REQUEST_BODY = 64 * 1024;
/** Aliran `subscriptions/listen` terbuka per isolate; server ini tidak pernah mengirim perubahan. */
export const MAX_SUBSCRIPTIONS = 16;

/** Origin browser yang boleh memanggil endpoint (hostname saja, tanpa skema/port). */
export const ALLOWED_ORIGIN_HOSTS = [
  "surau.org",
  "www.surau.org",
  "mcp.surau.org",
  ...localhostAllowedHostnames(),
];
