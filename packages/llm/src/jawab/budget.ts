// Perkiraan biaya TERBURUK satu pertanyaan Jawab untuk reservasi ledger (S20, ADR-065). Sengaja
// berlebih: seluruh prompt dihitung dengan tarif tertinggi (tulis cache 1 jam) dan keluaran sebesar
// `max_tokens`, supaya reservasi selalu >= biaya aktual dan plafon bulanan tidak terlewati oleh
// permintaan yang sedang berjalan. Biaya aktual (dari `usage`) yang dikomit sesudahnya.
import { MODELS } from "../client.ts";
import type { ModelId } from "../client.ts";
import { costUsd } from "../pricing.ts";
import { ANSWER_MAX_TOKENS, JAWAB_MAX_PROMPT_TOKENS } from "./answer.ts";
import { ROUTE_MAX_TOKENS } from "./route.ts";

/**
 * Batas atas prompt routing: sistem + daftar isi Ihya (±11,8 ribu token, ADR-064) + pertanyaan
 * ≤1.000 karakter. Bila korpus bertambah kitab (daftar isi membesar), angka ini wajib dinaikkan.
 */
export const ROUTE_PROMPT_TOKENS_MAX = 16_000;

function worstCase(model: ModelId, prompt: number, output: number): number {
  return costUsd(
    model,
    { input_tokens: 0, cache_creation_input_tokens: prompt, output_tokens: output },
    { batch: false },
  );
}

/** Reservasi awal: routing + jawaban Haiku (USD). */
export function jawabReserveUsd(): number {
  return (
    worstCase(MODELS.haiku, ROUTE_PROMPT_TOKENS_MAX, ROUTE_MAX_TOKENS) +
    worstCase(MODELS.haiku, JAWAB_MAX_PROMPT_TOKENS, ANSWER_MAX_TOKENS)
  );
}

/** Reservasi tambahan sebelum ulangan Sonnet (USD). */
export function retryReserveUsd(): number {
  return worstCase(MODELS.sonnet, JAWAB_MAX_PROMPT_TOKENS, ANSWER_MAX_TOKENS);
}
