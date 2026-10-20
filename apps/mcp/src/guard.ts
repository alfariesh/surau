// Batas pemakaian per tool (S16 langkah 6, ADR-011, ADR-014): Rate Limiting binding dengan kunci
// `HMAC(jaringan IP):tool`, bukan IP mentah, lalu batas global (kunci tetap) yang terpisah untuk
// search_text dan untuk tool baca lain: D1 korpus dipakai bersama web, dan daftar isi + read_section
// membaca seluruh pohon daftar isi (±1.000 baris) di setiap panggilan. Batas habis = hasil tool
// `isError` (model melihat pesannya), bukan HTTP 429.
import { ipKey, ipNetwork } from "@surau/core";

export interface Limiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface GuardEnv {
  MCP_TOOL_LIMITER: Limiter;
  MCP_READ_GLOBAL_LIMITER: Limiter;
  MCP_SEARCH_LIMITER: Limiter;
  MCP_SEARCH_GLOBAL_LIMITER: Limiter;
  /** Secret Worker; tanpa ini setiap tool menjawab `not_configured` (gagal tertutup). */
  IP_HMAC_KEY?: string;
}

/**
 * `not_configured` (secret hilang) sengaja beda dari kode core `unavailable` (korpus tanpa indeks /
 * NORM_VERSION beda): penanganannya beda, telemetrinya tidak boleh menyatu (#74).
 */
export type GuardResult = "ok" | "rate_limited" | "not_configured";

/** IP klien dari Cloudflare; permintaan tanpa header (tes in-process) berbagi satu ember. */
export function clientIp(request: Request | undefined): string {
  return request?.headers.get("cf-connecting-ip") ?? "unknown";
}

export async function guardTool(
  env: GuardEnv,
  request: Request | undefined,
  tool: string,
): Promise<GuardResult> {
  if (env.IP_HMAC_KEY === undefined || env.IP_HMAC_KEY === "") return "not_configured";
  const key = `${await ipKey(env.IP_HMAC_KEY, ipNetwork(clientIp(request)))}:${tool}`;
  if (tool === "search_text") {
    if (!(await env.MCP_SEARCH_LIMITER.limit({ key })).success) return "rate_limited";
    if (!(await env.MCP_SEARCH_GLOBAL_LIMITER.limit({ key: "global" })).success) {
      return "rate_limited";
    }
    return "ok";
  }
  if (!(await env.MCP_TOOL_LIMITER.limit({ key })).success) return "rate_limited";
  return (await env.MCP_READ_GLOBAL_LIMITER.limit({ key: "global" })).success
    ? "ok"
    : "rate_limited";
}
