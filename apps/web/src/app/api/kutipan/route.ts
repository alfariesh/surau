import { TAKHRIJ_TERMS_VERSION, parseUstadzKeys } from "@surau/core";
import { getTakhrijReviews } from "@surau/db";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { handleKutipan } from "../../../lib/kutipan-handler";

// GET /api/kutipan (S21): teks kutipan Arab dari DB untuk kartu sitasi /tanya (lihat
// lib/kutipan-handler.ts). Pagar sama dengan Cari: sakelar pembaca, batas per klien (60/menit per
// jaringan IP), lalu batas global bersama.
const DEV_HMAC_KEY = "surau-dev-only";

export async function GET(request: Request): Promise<Response> {
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  return handleKutipan(request, {
    enabled: readerEnabled(env),
    db: env.CORPUS_DB,
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.SEARCH_LIMITER.limit({ key })).success,
    limitGlobal: async () => (await env.SEARCH_GLOBAL_LIMITER.limit({ key: "global" })).success,
    reviews: {
      load: (ids) => getTakhrijReviews(env.APP_DB, ids, TAKHRIJ_TERMS_VERSION),
      ustadzKeys: parseUstadzKeys(env.TAKHRIJ_USTADZ_KEYS),
    },
  });
}
