// Batas pemakaian per tool (S16 langkah 6, ADR-011, ADR-014): Rate Limiting binding dengan kunci
// `HMAC(jaringan IP):tool`, bukan IP mentah. search_text juga dibatasi global, karena D1 korpus
// dipakai bersama web. Batas habis = hasil tool `isError` (model melihat pesannya), bukan HTTP 429.
import { ipKey, ipNetwork } from "@surau/core";

export interface Limiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface GuardEnv {
  MCP_TOOL_LIMITER: Limiter;
  MCP_SEARCH_LIMITER: Limiter;
  MCP_SEARCH_GLOBAL_LIMITER: Limiter;
  /** Secret Worker; tanpa ini setiap tool menjawab `unavailable` (gagal tertutup). */
  IP_HMAC_KEY?: string;
}

export type GuardResult = "ok" | "rate_limited" | "unavailable";

/** IP klien dari Cloudflare; permintaan tanpa header (tes in-process) berbagi satu ember. */
export function clientIp(request: Request | undefined): string {
  return request?.headers.get("cf-connecting-ip") ?? "unknown";
}

export async function guardTool(
  env: GuardEnv,
  request: Request | undefined,
  tool: string,
): Promise<GuardResult> {
  if (env.IP_HMAC_KEY === undefined || env.IP_HMAC_KEY === "") return "unavailable";
  const key = `${await ipKey(env.IP_HMAC_KEY, ipNetwork(clientIp(request)))}:${tool}`;
  if (tool === "search_text") {
    if (!(await env.MCP_SEARCH_LIMITER.limit({ key })).success) return "rate_limited";
    if (!(await env.MCP_SEARCH_GLOBAL_LIMITER.limit({ key: "global" })).success) {
      return "rate_limited";
    }
    return "ok";
  }
  return (await env.MCP_TOOL_LIMITER.limit({ key })).success ? "ok" : "rate_limited";
}
