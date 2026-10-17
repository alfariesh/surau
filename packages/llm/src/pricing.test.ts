import { describe, expect, test } from "vite-plus/test";

import { MODELS } from "./client.ts";
import { addUsage, costUsd, emptyTotals, promptTokens, ratesFor } from "./pricing.ts";

const M = 1_000_000;

describe("harga token", () => {
  test("Haiku 5.5 batch: 50% dari tarif ≤100k", () => {
    const usage = { input_tokens: 50_000, output_tokens: 10_000 };
    expect(costUsd(MODELS.haiku, usage, { batch: false })).toBeCloseTo(
      (50_000 * 0.1 + 10_000 * 0.5) / M,
    );
    expect(costUsd(MODELS.haiku, usage, { batch: true })).toBeCloseTo(
      ((50_000 * 0.1 + 10_000 * 0.5) / M) * 0.5,
    );
  });

  test("satu juta token dalam satu request = tarif >100k", () => {
    expect(
      costUsd(MODELS.haiku, { input_tokens: M, output_tokens: 0 }, { batch: false }),
    ).toBeCloseTo(0.5);
  });

  test("tarif >100k dipilih dari total prompt termasuk cache", () => {
    expect(ratesFor(MODELS.haiku, 100_000).input).toBe(0.1);
    expect(ratesFor(MODELS.haiku, 100_001).input).toBe(0.5);
    const usage = { input_tokens: 1_000, output_tokens: 0, cache_read_input_tokens: 99_500 };
    expect(promptTokens(usage)).toBe(100_500);
    expect(costUsd(MODELS.haiku, usage, { batch: false })).toBeCloseTo(
      (1_000 * 0.5 + 99_500 * 0.05) / M,
    );
  });

  test("tulis cache 5 menit dan 1 jam dipisah; tanpa rincian dianggap 1 jam", () => {
    const split = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 3_000,
      cache_creation: { ephemeral_5m_input_tokens: 1_000, ephemeral_1h_input_tokens: 2_000 },
    };
    expect(costUsd(MODELS.haiku, split, { batch: false })).toBeCloseTo(
      (1_000 * 0.125 + 2_000 * 0.2) / M,
    );
    const lump = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 3_000 };
    expect(costUsd(MODELS.haiku, lump, { batch: false })).toBeCloseTo((3_000 * 0.2) / M);
  });

  test("Sonnet 5.5: baca cache 0,05× input, tanpa tarif konteks panjang", () => {
    expect(ratesFor(MODELS.sonnet, 500_000)).toMatchObject({
      input: 2,
      cacheRead: 0.1,
      output: 10,
    });
  });

  test("akumulasi total", () => {
    const t = emptyTotals();
    addUsage(t, MODELS.haiku, { input_tokens: 10, output_tokens: 5 }, { batch: true });
    addUsage(
      t,
      MODELS.haiku,
      { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 7 },
      {
        batch: true,
      },
    );
    expect(t).toMatchObject({
      requests: 2,
      input_tokens: 20,
      output_tokens: 10,
      cache_read_input_tokens: 7,
    });
    expect(t.costUsd).toBeGreaterThan(0);
  });
});
