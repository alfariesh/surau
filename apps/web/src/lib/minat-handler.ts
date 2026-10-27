import { ipKey, ipNetwork } from "@surau/core";
import type { KitabInterestInput } from "@surau/db";
import { kitabInterestArabic, kitabInterestPurpose } from "@surau/db";

import { z } from "zod";

import { readLimited, sameOrigin } from "./feedback-handler";

// Logika POST /api/minat-kitab (ADR-115): satu suara minat untuk kitab kandidat "Segera hadir".
// Pengaman sama dengan /api/feedback: pembaca terbuka → Origin sama → JSON → ukuran body → skema
// → honeypot → batas per klien (HMAC jaringan IP, tidak disimpan) → batas global → simpan. Yang
// disimpan hanya slug kandidat dan dua pilihan tetap; tanpa IP, HMAC, cookie, atau teks bebas.

export const MINAT_BODY_MAX_BYTES = 1024;

const minatRequest = z.strictObject({
  candidate: z.string().max(64),
  purpose: kitabInterestPurpose,
  arabic: kitabInterestArabic,
  website: z.string().max(200).default(""),
});

export interface MinatDeps {
  enabled: boolean;
  /** Kunci HMAC untuk IP; `undefined` = suara dimatikan (503) sampai secret dipasang. */
  hmacKey: string | undefined;
  ip: string | null;
  /** Slug kandidat yang sedang tampil; slug lain ditolak. */
  candidates: ReadonlySet<string>;
  limit: (key: string) => Promise<boolean>;
  limitGlobal: () => Promise<boolean>;
  insert: (input: KitabInterestInput) => Promise<void>;
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleMinat(request: Request, deps: MinatDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  if (!sameOrigin(request)) return json(403, { error: "forbidden_origin" });
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "unsupported_media_type" });
  }
  const raw = await readLimited(request, MINAT_BODY_MAX_BYTES);
  if (raw === null) return json(413, { error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = minatRequest.safeParse(body);
  if (!parsed.success || !deps.candidates.has(parsed.data.candidate)) {
    return json(400, { error: "invalid" });
  }
  const f = parsed.data;

  // Honeypot terisi: jawab seolah berhasil, tanpa menyimpan apa pun.
  if (f.website.trim() !== "") return json(201, { ok: true });

  if (deps.hmacKey === undefined || deps.hmacKey === "") {
    return json(503, { error: "unavailable" });
  }
  const allowed = await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")));
  if (!allowed) return json(429, { error: "rate_limited" });
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });

  await deps.insert({ candidate: f.candidate, purpose: f.purpose, arabic: f.arabic });
  return json(201, { ok: true });
}
