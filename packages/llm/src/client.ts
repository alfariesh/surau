// Klien Anthropic tipis (ADR-013). Kunci API selalu diberikan pemanggil: skrip lokal membacanya dari
// `.env` (tools/*), Worker dari secret (S19). Paket ini tidak membaca environment atau file.
import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  /** Semua ingest dan Jawab (ADR-013). */
  haiku: "claude-haiku-5-5",
  /** Ulangan sisi klien bila Haiku 5.5 menolak (`stop_reason: refusal`); tanpa fallback server. */
  sonnet: "claude-sonnet-5-5",
} as const;
export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export function isModelId(m: string): m is ModelId {
  return m === MODELS.haiku || m === MODELS.sonnet;
}

/** Batas request Haiku 5.5 bertarif murah, dicek dengan `countTokens` sebelum batch dikirim. */
export const MAX_PROMPT_TOKENS = 100_000;

export function createAnthropic(apiKey: string, opts: { maxRetries?: number } = {}): Anthropic {
  if (apiKey === "") throw new Error("ANTHROPIC_API_KEY kosong");
  // OpenTelemetry otomatis SDK dimatikan: Surau tidak mengirim trace ke mana pun.
  return new Anthropic({ apiKey, maxRetries: opts.maxRetries ?? 4, openTelemetry: false });
}
