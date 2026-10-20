import { getEnv } from "../../../lib/cloudflare";
import { handleJawab } from "../../../lib/jawab-handler";

// POST /api/jawab (S19): penerus SSE ke Worker surau-api (service binding API). Route handler biasa,
// bukan Server Action (ADR-003). Produksi mati (`JAWAB_ROUTE_ENABLED` "0") sampai guard S20.
// `next dev`: binding API tersambung ke `pnpm --filter @surau/api dev` lewat dev registry wrangler.
const DEV_HMAC_KEY = "surau-dev-only";

export async function POST(request: Request): Promise<Response> {
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  return handleJawab(request, {
    enabled: env.JAWAB_ROUTE_ENABLED === "1" || dev,
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await env.JAWAB_LIMITER.limit({ key })).success,
    limitGlobal: async () => (await env.JAWAB_GLOBAL_LIMITER.limit({ key: "global" })).success,
    forward: (r) => env.API.fetch(r),
  });
}
