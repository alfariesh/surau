// Harga token Anthropic untuk estimasi dan pencatatan biaya aktual (S13; ledger Jawab menyusul di
// S20). USD per 1 juta token, dicek 2026-10-17 di https://platform.claude.com/docs/en/about-claude/pricing.
// Haiku 5.5 punya dua tarif menurut panjang prompt: di atas 100k token (termasuk baca dan tulis
// cache) SEMUA tarif request itu naik 5×. Message Batches = 50% dari semua tarif, bertumpuk dengan
// pengali cache.
import type { Usage } from "@anthropic-ai/sdk/resources/messages";

import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";

export interface Rates {
  input: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
  output: number;
}

/** Batas panjang prompt tarif murah Haiku 5.5 (inklusif). */
export const HAIKU_SHORT_PROMPT_MAX = 100_000;

const HAIKU_SHORT: Rates = {
  input: 0.1,
  cacheWrite5m: 0.125,
  cacheWrite1h: 0.2,
  cacheRead: 0.01,
  output: 0.5,
};
const HAIKU_LONG: Rates = {
  input: 0.5,
  cacheWrite5m: 0.625,
  cacheWrite1h: 1,
  cacheRead: 0.05,
  output: 2.5,
};
// Baca cache Sonnet 5.5 = 0,05× input (bukan 0,1×), dicek di halaman harga resmi.
const SONNET: Rates = { input: 2, cacheWrite5m: 2.5, cacheWrite1h: 4, cacheRead: 0.1, output: 10 };

/** Token prompt sebuah request (dasar pemilihan tarif Haiku 5.5). */
export function promptTokens(usage: UsageLike): number {
  return (
    usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0)
  );
}

export function ratesFor(model: ModelId, prompt: number): Rates {
  if (model === MODELS.sonnet) return SONNET;
  return prompt > HAIKU_SHORT_PROMPT_MAX ? HAIKU_LONG : HAIKU_SHORT;
}

/** Bagian `Usage` yang dipakai hitungan biaya (hasil batch, respons biasa, atau estimasi). */
export type UsageLike = Pick<Usage, "input_tokens" | "output_tokens"> &
  Partial<
    Pick<Usage, "cache_read_input_tokens" | "cache_creation_input_tokens" | "cache_creation">
  >;

/**
 * Biaya satu request dalam USD. Tulis cache dipisah 5 menit / 1 jam bila `cache_creation` ada;
 * tanpa rincian itu dianggap 1 jam (tarif lebih mahal: estimasi tidak meremehkan biaya).
 */
export function costUsd(model: ModelId, usage: UsageLike, opts: { batch: boolean }): number {
  const r = ratesFor(model, promptTokens(usage));
  const written = usage.cache_creation_input_tokens ?? 0;
  const w5 = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const w1 =
    usage.cache_creation === undefined || usage.cache_creation === null ? written : written - w5;
  const perMillion =
    usage.input_tokens * r.input +
    (usage.cache_read_input_tokens ?? 0) * r.cacheRead +
    w5 * r.cacheWrite5m +
    w1 * r.cacheWrite1h +
    usage.output_tokens * r.output;
  return (perMillion / 1_000_000) * (opts.batch ? 0.5 : 1);
}

export interface UsageTotals {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  costUsd: number;
}

export function emptyTotals(): UsageTotals {
  return {
    requests: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    costUsd: 0,
  };
}

/** Tambahkan satu request ke total (mutasi `t`, dikembalikan untuk rantai). */
export function addUsage(
  t: UsageTotals,
  model: ModelId,
  usage: UsageLike,
  opts: { batch: boolean },
): UsageTotals {
  t.requests += 1;
  t.input_tokens += usage.input_tokens;
  t.output_tokens += usage.output_tokens;
  t.cache_read_input_tokens += usage.cache_read_input_tokens ?? 0;
  t.cache_creation_input_tokens += usage.cache_creation_input_tokens ?? 0;
  t.costUsd += costUsd(model, usage, opts);
  return t;
}
