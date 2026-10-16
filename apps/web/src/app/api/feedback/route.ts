import { createFeedback, getCorpusMeta } from "@surau/db";

import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { handleFeedback } from "../../../lib/feedback-handler";

// Laporan kesalahan teks dari pembaca kitab (S09 langkah 8). Route handler biasa, bukan Server
// Action (ADR-003). Pengaman lengkap ada di handleFeedback; di sini hanya merangkai binding.
// Kunci HMAC: secret IP_HMAC_KEY (produksi: `wrangler secret put`, Preview: base config Preview);
// `next dev` memakai kunci tetap khusus pengembangan.
const DEV_HMAC_KEY = "surau-dev-only";

export async function POST(request: Request): Promise<Response> {
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  return handleFeedback(request, {
    enabled: readerEnabled(env),
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.FEEDBACK_LIMITER.limit({ key })).success,
    corpusVersion: async () => (await getCorpusMeta(env.CORPUS_DB)).corpus_version ?? null,
    insert: (input) => createFeedback(env.APP_DB, input),
  });
}
