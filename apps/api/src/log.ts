// Event log `jawab` (Workers Logs, retensi 7 hari): metrik saja. Teks pertanyaan, kueri routing
// (turunan pertanyaan), teks jawaban, IP, ID/cookie anon, token Turnstile, dan isi kitab TIDAK
// pernah dicatat (docs/05 §8, P-7). Penolakan guard S20 = outcome `rejected` + kode alasan.
import type { JawabResult } from "@surau/llm";

export interface JawabLog {
  event: "jawab";
  environment: string;
  outcome: JawabResult["outcome"] | "disabled" | "error" | "rejected";
  reason: string | null;
  cached: boolean;
  model: string | null;
  prompt_version: string | null;
  corpus_version: string | null;
  latency_ms: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  prompt_tokens: number | null;
  docs: number;
  candidates: number;
  citations_total: number;
  citations_valid: number;
  citations_dropped: number;
  blocks_dropped: number;
  arabic_removed: number;
  hadith_unsupported: number;
  truncated: boolean;
  refusals: { model: string; category: string | null }[];
  provider_error: JawabResult["diagnostics"]["provider_error"];
}

export function resultLog(environment: string, r: JawabResult, cached: boolean): JawabLog {
  const d = r.diagnostics;
  return {
    event: "jawab",
    environment,
    outcome: r.outcome,
    reason: r.reason,
    cached,
    model: r.model,
    prompt_version: r.prompt_version,
    corpus_version: r.corpus_version,
    latency_ms: Math.round(r.latency_ms),
    cost_usd: Number(r.cost_usd.toFixed(6)),
    input_tokens: r.usage.input_tokens,
    output_tokens: r.usage.output_tokens,
    cache_read_input_tokens: r.usage.cache_read_input_tokens,
    cache_creation_input_tokens: r.usage.cache_creation_input_tokens,
    prompt_tokens: d.prompt_tokens,
    docs: d.docs,
    candidates: d.candidates,
    citations_total: d.citations_total,
    citations_valid: d.citations_valid,
    citations_dropped: d.citations_dropped,
    blocks_dropped: d.blocks_dropped,
    arabic_removed: d.arabic_removed,
    hadith_unsupported: d.hadith_unsupported,
    truncated: d.truncated,
    refusals: d.refusals,
    provider_error: d.provider_error,
  };
}

export function emptyLog(
  environment: string,
  outcome: JawabLog["outcome"],
  reason: string | null,
): JawabLog {
  return {
    event: "jawab",
    environment,
    outcome,
    reason,
    cached: false,
    model: null,
    prompt_version: null,
    corpus_version: null,
    latency_ms: 0,
    cost_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    prompt_tokens: null,
    docs: 0,
    candidates: 0,
    citations_total: 0,
    citations_valid: 0,
    citations_dropped: 0,
    blocks_dropped: 0,
    arabic_removed: 0,
    hadith_unsupported: 0,
    truncated: false,
    refusals: [],
    provider_error: null,
  };
}

/** Alasan penolakan guard S20 (sebelum pipeline). */
export type RejectReason =
  | "challenge_required"
  | "challenge_failed"
  | "challenge_unavailable"
  | "rate_limited"
  | "quota_anon"
  | "quota_ip"
  | "budget";

export function rejectedLog(environment: string, reason: RejectReason): JawabLog {
  return emptyLog(environment, "rejected", reason);
}
