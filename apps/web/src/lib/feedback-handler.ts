import type { FeedbackInput } from "@surau/db";

import { ZodError } from "zod";

import { FEEDBACK_BODY_MAX_BYTES } from "./feedback";
import { feedbackRequest } from "./feedback-schema";

// Logika POST /api/feedback, dipisah dari route supaya bisa dites tanpa Workers (ADR-034).
// Urutan pengaman: pembaca terbuka → Origin sama → JSON → ukuran body → skema Zod → honeypot →
// batas global → batas per klien (kunci HMAC(jaringan IP): IPv4 penuh, IPv6 per /64; IP mentah
// tidak pernah keluar dari fungsi ini) → simpan. Batas global (kunci tetap) menahan spam dari
// banyak alamat sekaligus (temuan peninjau rilis Fase 1; Rate Limiting dihitung per lokasi CF).

export interface FeedbackDeps {
  enabled: boolean;
  /** Kunci HMAC untuk IP; `undefined` = laporan dimatikan (503) sampai secret dipasang. */
  hmacKey: string | undefined;
  /** IP klien (`cf-connecting-ip`), atau `null` bila tidak diketahui. */
  ip: string | null;
  /** Batas per klien; `key` = HMAC jaringan IP. */
  limit: (key: string) => Promise<boolean>;
  /** Batas bersama semua klien (kunci tetap). */
  limitGlobal: () => Promise<boolean>;
  corpusVersion: () => Promise<string | null>;
  insert: (input: FeedbackInput) => Promise<number>;
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

/** Baca body sampai `max` byte; `null` bila lebih (tanpa membaca sisanya). */
async function readLimited(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > max) return null;
  if (request.body === null) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Jaringan klien untuk rate limit: IPv4 apa adanya, IPv6 dipotong ke /64 (satu pelanggan biasanya
 * memegang satu /64 utuh, jadi alamat penuh mudah diganti-ganti). Masukan tak dikenal dikembalikan.
 */
export function ipNetwork(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::", 2) as [string, string?];
  const h = head === "" ? [] : head.split(":");
  const t = ip.includes("::") ? (tail === "" ? [] : tail.split(":")) : [];
  // IPv4 tersemat (`::ffff:1.2.3.4`) dikembalikan utuh, supaya tidak berbagi satu kunci /64.
  if (h.length + t.length > 8 || [...h, ...t].some((g) => g.includes("."))) return ip;
  const groups = ip.includes("::")
    ? [...h, ...Array<string>(8 - h.length - t.length).fill("0"), ...t]
    : h;
  if (groups.length !== 8) return ip;
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/** HMAC-SHA256(kunci, ip) → 32 karakter hex. Kunci rate limit tanpa menyimpan/mengirim IP mentah. */
export async function ipKey(secret: string, ip: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(ip)));
  return Array.from(sig.subarray(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleFeedback(request: Request, deps: FeedbackDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  if (!sameOrigin(request)) return json(403, { error: "forbidden_origin" });
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "unsupported_media_type" });
  }
  const raw = await readLimited(request, FEEDBACK_BODY_MAX_BYTES);
  if (raw === null) return json(413, { error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = feedbackRequest.safeParse(body);
  if (!parsed.success) return json(400, { error: "invalid" });
  const f = parsed.data;

  // Honeypot terisi: jawab seolah berhasil, tanpa menyimpan apa pun.
  if (f.website.trim() !== "") return json(201, { ok: true });

  if (deps.hmacKey === undefined || deps.hmacKey === "") {
    return json(503, { error: "unavailable" });
  }
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });

  try {
    await deps.insert({
      kind: f.kind,
      message: f.message,
      path: f.path,
      passage_id: f.passage_id,
      page_id: null,
      corpus_version: await deps.corpusVersion(),
    });
  } catch (error) {
    if (error instanceof ZodError) return json(400, { error: "invalid" });
    throw error;
  }
  return json(201, { ok: true });
}
