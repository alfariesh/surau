import { createKitabInterest } from "@surau/db";

import { UPCOMING_SLUGS } from "../../../content/kitab-mendatang";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { handleMinat } from "../../../lib/minat-handler";

// Suara minat kitab kandidat "Segera hadir" di /kitab (ADR-115). Pengaman ada di handleMinat; di
// sini hanya merangkai binding. Kunci HMAC sama dengan /api/feedback (IP_HMAC_KEY).
const DEV_HMAC_KEY = "surau-dev-only";

export async function POST(request: Request): Promise<Response> {
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  return handleMinat(request, {
    enabled: readerEnabled(env),
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    candidates: UPCOMING_SLUGS,
    limit: async (key) => (await env.MINAT_LIMITER.limit({ key })).success,
    limitGlobal: async () => (await env.MINAT_GLOBAL_LIMITER.limit({ key: "global" })).success,
    insert: (input) => createKitabInterest(env.APP_DB, input),
  });
}
