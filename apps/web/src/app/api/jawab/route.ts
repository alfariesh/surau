import { getEnv } from "../../../lib/cloudflare";
import { handleJawab, handleJawabStatus } from "../../../lib/jawab-handler";
import type { JawabDeps } from "../../../lib/jawab-handler";

// /api/jawab (S19–S20): penerus ke Worker surau-api (service binding API). Route handler biasa,
// bukan Server Action (ADR-003). POST = pertanyaan (SSE), GET = status untuk UI. Guard biaya ada di
// surau-api (ADR-065). Produksi mati (`JAWAB_ROUTE_ENABLED` "0") sampai `/rilis 4`.
// `next dev`: binding API tersambung ke `pnpm --filter @surau/api dev` lewat dev registry wrangler.
const DEV_HMAC_KEY = "surau-dev-only";

async function deps(request: Request, limiter: "post" | "status"): Promise<JawabDeps> {
  const env = await getEnv();
  const dev = process.env.NODE_ENV === "development";
  const perClient = limiter === "post" ? env.JAWAB_LIMITER : env.JAWAB_STATUS_LIMITER;
  const global = limiter === "post" ? env.JAWAB_GLOBAL_LIMITER : env.JAWAB_STATUS_GLOBAL_LIMITER;
  return {
    enabled: env.JAWAB_ROUTE_ENABLED === "1" || dev,
    hmacKey: env.IP_HMAC_KEY ?? (dev ? DEV_HMAC_KEY : undefined),
    ip: request.headers.get("cf-connecting-ip") ?? (dev ? "127.0.0.1" : null),
    limit: async (key) => (await perClient.limit({ key })).success,
    limitGlobal: async () => (await global.limit({ key: "global" })).success,
    forward: (r) => env.API.fetch(r),
  };
}

export async function POST(request: Request): Promise<Response> {
  return handleJawab(request, await deps(request, "post"));
}

export async function GET(request: Request): Promise<Response> {
  return handleJawabStatus(request, await deps(request, "status"));
}
