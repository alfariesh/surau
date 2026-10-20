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

/** Endpoint langsung Anthropic (tanpa gateway). */
export const ANTHROPIC_API_URL = "https://api.anthropic.com";

export interface ClientOptions {
  maxRetries?: number;
  /** Milidetik (SDK TypeScript). */
  timeout?: number;
  /** Pengganti `fetch` (tes). */
  fetch?: typeof fetch;
}

export function createAnthropic(apiKey: string, opts: ClientOptions = {}): Anthropic {
  if (apiKey === "") throw new Error("ANTHROPIC_API_KEY kosong");
  // OpenTelemetry otomatis SDK dimatikan: Surau tidak mengirim trace ke mana pun. `baseURL`
  // eksplisit: ANTHROPIC_BASE_URL di environment tidak boleh membelokkan panggilan langsung.
  return new Anthropic({
    apiKey,
    baseURL: ANTHROPIC_API_URL,
    maxRetries: opts.maxRetries ?? 4,
    openTelemetry: false,
    ...(opts.timeout === undefined ? {} : { timeout: opts.timeout }),
    ...(opts.fetch === undefined ? {} : { fetch: opts.fetch }),
  });
}

/**
 * Klien lewat Cloudflare AI Gateway mode BYOK (ADR-013, uji S19): kunci Anthropic disimpan di
 * Provider Keys gateway, Worker hanya memegang token gateway. Header `x-api-key` sengaja DIHAPUS
 * (nilai null di `defaultHeaders`): docs BYOK menyatakan header kredensial penyedia diteruskan ke
 * Anthropic, jadi placeholder akan ditolak dan token gateway tidak boleh ikut ke sana.
 * `apiKey` diisi string tetap supaya SDK tidak mencari kredensial lain (profil/env).
 * Payload tidak dicatat di log gateway (`cf-aig-collect-log-payload: false`, docs/05 §8).
 */
export function createGatewayAnthropic(
  baseURL: string,
  token: string,
  opts: ClientOptions = {},
): Anthropic {
  if (token === "") throw new Error("CF_AIG_TOKEN kosong");
  if (
    !/^https:\/\/gateway\.ai\.cloudflare\.com\/v1\/[0-9a-f]{32}\/[a-z0-9-]+\/anthropic$/u.test(
      baseURL,
    )
  )
    throw new Error("URL gateway tidak sah");
  return new Anthropic({
    apiKey: "byok-unused",
    baseURL,
    maxRetries: opts.maxRetries ?? 1,
    openTelemetry: false,
    defaultHeaders: {
      "x-api-key": null,
      "cf-aig-authorization": `Bearer ${token}`,
      "cf-aig-collect-log-payload": "false",
    },
    ...(opts.timeout === undefined ? {} : { timeout: opts.timeout }),
    ...(opts.fetch === undefined ? {} : { fetch: opts.fetch }),
  });
}
