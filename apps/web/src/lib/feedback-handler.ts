import { ipKey, ipNetwork, redactPii } from "@surau/core";
import type { FeedbackInput } from "@surau/db";

import { ZodError } from "zod";

import { FEEDBACK_BODY_MAX_BYTES } from "./feedback";
import { feedbackRequest } from "./feedback-schema";

// Logika POST /api/feedback, dipisah dari route supaya bisa dites tanpa Workers (ADR-034).
// Urutan pengaman: pembaca terbuka → Origin sama → JSON → ukuran body → skema Zod → honeypot →
// batas per klien (kunci HMAC(jaringan IP): IPv4 penuh, IPv6 per /64; IP mentah tidak pernah keluar
// dari fungsi ini) → batas global → simpan. Batas global (kunci tetap) menahan spam dari banyak
// alamat sekaligus (temuan peninjau rilis Fase 1; Rate Limiting dihitung per lokasi CF); dicek
// sesudah batas per klien supaya satu klien tidak menghabiskannya (S11).

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
  // Per klien dulu: permintaan yang sudah ditolak per klien tidak memakan kuota global, jadi satu
  // jaringan tidak bisa menghabiskan batas global untuk semua orang (temuan peninjau S11).
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });

  try {
    await deps.insert({
      kind: f.kind,
      // Email, nomor telepon/NIK, dan tautan luar yang ikut terketik disamarkan sebelum disimpan
      // (docs/05 §8, S20); /admin hanya pernah melihat teks yang sudah disamarkan.
      message: redactPii(f.message).text,
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
