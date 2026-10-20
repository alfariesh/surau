// Verifikasi token Turnstile di server (S20, ADR-014, ADR-065). Docs dicek 2026-10-21: siteverify
// menerima JSON, token ≤2.048 karakter, sekali pakai, berlaku 300 detik; `idempotency_key` membuat
// retry aman; kegagalan token = HTTP 200 `success: false`, salah secret = 400. Kunci uji Cloudflare
// menerima token apa pun dan menjawab hostname "example.com" tanpa `action`, jadi cek hostname/action
// dilewati untuk kunci uji, dan kunci uji DITOLAK di produksi (gagal tertutup).

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Secret uji resmi (lolos, gagal, token terpakai). Boleh di staging/tes, tidak di produksi. */
export const TURNSTILE_TEST_SECRETS: ReadonlySet<string> = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

/** `action` widget Jawab (UI S21 memakai nilai yang sama). */
export const TURNSTILE_ACTION = "jawab";

export type TurnstileOutcome = "ok" | "rejected" | "unavailable";

interface SiteverifyResponse {
  success?: unknown;
  "error-codes"?: unknown;
  hostname?: unknown;
  action?: unknown;
}

export interface TurnstileCheck {
  secret: string;
  token: string;
  ip: string | null;
  /** Hostname yang diizinkan (cocok persis atau sebagai akhiran subdomain). */
  hostnames: readonly string[];
  fetcher?: typeof fetch;
}

export function hostnameAllowed(hostname: string, allowed: readonly string[]): boolean {
  const h = hostname.toLowerCase();
  return allowed.some((a) => {
    const x = a.trim().toLowerCase();
    return x !== "" && (h === x || h.endsWith(`.${x}`));
  });
}

export async function verifyTurnstile(c: TurnstileCheck): Promise<TurnstileOutcome> {
  const fetcher = c.fetcher ?? fetch;
  const secret = c.secret.trim();
  const body: Record<string, string> = {
    secret,
    response: c.token,
    idempotency_key: crypto.randomUUID(),
  };
  if (c.ip !== null && c.ip !== "") body.remoteip = c.ip;
  let result: SiteverifyResponse | null = null;
  // Satu ulangan dengan idempotency_key yang sama bila jaringan/5xx gagal.
  for (let attempt = 0; attempt < 2 && result === null; attempt++) {
    try {
      const res = await fetcher(SITEVERIFY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (res.status < 500) result = (await res.json()) as SiteverifyResponse;
    } catch {
      // Jaringan putus, timeout, atau JSON rusak: coba sekali lagi.
    }
  }
  if (result === null) return "unavailable";
  const codes = Array.isArray(result["error-codes"])
    ? result["error-codes"].filter((x): x is string => typeof x === "string")
    : [];
  // Salah konfigurasi di pihak kita (secret salah/kosong) atau galat Cloudflare: bukan salah
  // pengunjung, jadi Jawab tidak tersedia, bukan "tantangan gagal".
  if (codes.some((x) => x === "internal-error" || x.endsWith("input-secret"))) return "unavailable";
  if (result.success !== true) return "rejected";
  if (TURNSTILE_TEST_SECRETS.has(secret)) return "ok";
  const hostname = typeof result.hostname === "string" ? result.hostname : "";
  return result.action === TURNSTILE_ACTION && hostnameAllowed(hostname, c.hostnames)
    ? "ok"
    : "rejected";
}
