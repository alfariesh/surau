import { ipKey, ipNetwork } from "@surau/core";

// Logika POST /api/jawab (S19), dipisah dari route supaya bisa dites tanpa Workers (pola
// feedback-handler). Web hanya penerus tipis ke Worker `surau-api` lewat service binding (ADR-010):
// tanpa CORS, satu origin. Urutan: route menyala → Origin sama → JSON → ukuran → bentuk masukan →
// batas per klien (HMAC jaringan IP, IP mentah tidak keluar dari fungsi ini) → batas global →
// teruskan. Teks pertanyaan tidak di-log dan tidak masuk URL (P-7): selalu di body POST.
// Guard biaya pengguna umum (Turnstile, kuota harian, ledger) menyusul di S20; sampai itu ada, route
// ini MATI di produksi (`JAWAB_ROUTE_ENABLED` "0").

export const JAWAB_BODY_MAX_BYTES = 8 * 1024;
const QUESTION_MAX = 1000;

export interface JawabDeps {
  enabled: boolean;
  hmacKey: string | undefined;
  ip: string | null;
  limit: (key: string) => Promise<boolean>;
  limitGlobal: () => Promise<boolean>;
  /** `env.API.fetch` (service binding surau-api). */
  forward: (request: Request) => Promise<Response>;
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readLimited(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? "0") > max) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).byteLength > max ? null : text;
}

export async function handleJawab(request: Request, deps: JawabDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  if (!sameOrigin(request)) return json(403, { error: "forbidden_origin" });
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "unsupported_media_type" });
  }
  const raw = await readLimited(request, JAWAB_BODY_MAX_BYTES);
  if (raw === null) return json(413, { error: "too_large" });
  let question: unknown;
  try {
    question = (JSON.parse(raw) as { question?: unknown }).question;
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (typeof question !== "string" || question.trim().length < 3 || question.length > QUESTION_MAX)
    return json(400, { error: "invalid" });
  if (deps.hmacKey === undefined || deps.hmacKey === "") return json(503, { error: "unavailable" });
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });

  // Request baru (bukan request browser yang diteruskan): header asli seperti cookie dan
  // Cloudflare-Workers-Version-Overrides tidak ikut ke surau-api.
  const upstream = await deps.forward(
    new Request("https://surau-api.internal/jawab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
      signal: request.signal,
    }),
  );
  const upstreamType = upstream.headers.get("content-type") ?? "application/json";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstreamType,
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
