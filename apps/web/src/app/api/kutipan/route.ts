import { getEnv } from "../../../lib/cloudflare";
import { handleKutipan } from "../../../lib/kutipan-handler";

// GET /api/kutipan (S21): teks kutipan Arab dari DB untuk kartu sitasi /tanya (lihat
// lib/kutipan-handler.ts). Batas per klien memakai limiter pencarian (60/menit per jaringan IP).
const DEV_HMAC_KEY = "surau-dev-only";

export async function GET(request: Request): Promise<Response> {
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  return handleKutipan(request, {
    db: env.CORPUS_DB,
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.SEARCH_LIMITER.limit({ key })).success,
  });
}
