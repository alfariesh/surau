import { JAWAB_BODY_MAX_BYTES, ipKey, ipNetwork, jawabRequest } from "@surau/core";

// Logika /api/jawab (S19–S20), dipisah dari route supaya bisa dites tanpa Workers (pola
// feedback-handler). Web hanya penerus tipis ke Worker `surau-api` lewat service binding (ADR-010):
// tanpa CORS, satu origin. Semua guard biaya (Turnstile, cookie anon, burst, kuota harian, ledger)
// ada di surau-api (S20, ADR-065); di sini hanya pagar murah sebelum service binding.
// POST: route menyala → Origin sama → JSON → ukuran → skema bersama (`@surau/core`) → batas per
// klien (HMAC jaringan IP) → batas global → teruskan `{question, turnstile?}`.
// GET (status untuk UI): route menyala → batas per klien → teruskan.
// Yang diteruskan ke surau-api hanya: nilai cookie `surau_anon` dan IP klien sebagai header internal
// (Worker tujuan tidak punya alamat publik, jadi header ini tidak bisa dipalsukan dari internet).
// Yang dikembalikan: body + status + Set-Cookie `surau_anon` saja. Teks pertanyaan tidak di-log dan
// tidak masuk URL (P-7): selalu di body POST.

export { JAWAB_BODY_MAX_BYTES };
export const ANON_COOKIE = "surau_anon";
const UPSTREAM = "https://surau-api.internal";

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

/** Nilai cookie anon dari header Cookie (format diperiksa ulang di surau-api). */
export function anonCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (header === null) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== ANON_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return /^[A-Za-z0-9._-]{1,200}$/u.test(value) ? value : null;
  }
  return null;
}

function internalHeaders(request: Request, ip: string | null): Headers {
  const headers = new Headers();
  const anon = anonCookie(request);
  if (anon !== null) headers.set("x-surau-anon", anon);
  if (ip !== null && ip !== "") headers.set("x-surau-ip", ip);
  return headers;
}

/** Body + status dari surau-api; header lain dibuang, kecuali Set-Cookie anon (Path=/api/jawab). */
function relay(upstream: Response): Response {
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    "Cache-Control": "no-store, no-transform",
    "X-Content-Type-Options": "nosniff",
  });
  const cookie = upstream.headers.get("set-cookie");
  if (cookie !== null && cookie.startsWith(`${ANON_COOKIE}=`)) headers.set("Set-Cookie", cookie);
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function clientAllowed(deps: JawabDeps): Promise<Response | null> {
  if (deps.hmacKey === undefined || deps.hmacKey === "") return json(503, { error: "unavailable" });
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });
  return null;
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
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = jawabRequest.safeParse(body);
  if (!parsed.success) return json(400, { error: "invalid" });
  const blocked = await clientAllowed(deps);
  if (blocked !== null) return blocked;

  // Request baru (bukan request browser yang diteruskan): header asli seperti Cookie dan
  // Cloudflare-Workers-Version-Overrides tidak ikut ke surau-api.
  const headers = internalHeaders(request, deps.ip);
  headers.set("content-type", "application/json");
  const upstream = await deps.forward(
    new Request(`${UPSTREAM}/jawab`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.data),
      signal: request.signal,
    }),
  );
  return relay(upstream);
}

/** GET /api/jawab: status Jawab untuk UI (tersedia, perlu Turnstile, sisa kuota), tanpa biaya LLM. */
export async function handleJawabStatus(request: Request, deps: JawabDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  const blocked = await clientAllowed(deps);
  if (blocked !== null) return blocked;
  const upstream = await deps.forward(
    new Request(`${UPSTREAM}/jawab/status`, {
      method: "GET",
      headers: internalHeaders(request, deps.ip),
      signal: request.signal,
    }),
  );
  return relay(upstream);
}
