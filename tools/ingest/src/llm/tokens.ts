// S13 langkah 2: ukur token teks Arab Ihya di tokenizer Claude Haiku 5.5 (count_tokens, gratis) pada
// paragraf acak ber-seed, lalu bandingkan dengan o200k (riset 2026-10-15: ±0,39 token/karakter).
// Laporan (angka saja, tanpa teks kitab): data/reports/ihya-9472-token.md.
import { join } from "node:path";

import { MODELS, SUMMARY_PROMPT, TRANSLATE_PROMPT } from "@surau/llm";

import { samplePages } from "../qa-sample.ts";
import type { LlmContext } from "./cli.ts";
import { mapPool } from "./pool.ts";
import { writeText } from "./store.ts";

/** Token o200k per karakter teks Ihya (docs/riset/2026-10-15-catatan-riset.md, tes lokal). */
export const O200K_TOKENS_PER_CHAR = 0.39;
export const TOKEN_SAMPLE_SEED = 9472;

export interface TokenSample {
  passageId: number;
  chars: number;
  tokens: number;
}

export function tokenStats(samples: readonly TokenSample[]): {
  chars: number;
  tokens: number;
  perChar: number;
  factor: number;
  medianPerChar: number;
} {
  const chars = samples.reduce((a, s) => a + s.chars, 0);
  const tokens = samples.reduce((a, s) => a + s.tokens, 0);
  const per = samples.map((s) => s.tokens / s.chars).toSorted((a, b) => a - b);
  const mid = per.length === 0 ? 0 : (per[Math.floor((per.length - 1) / 2)] ?? 0);
  const perChar = chars === 0 ? 0 : tokens / chars;
  return { chars, tokens, perChar, factor: perChar / O200K_TOKENS_PER_CHAR, medianPerChar: mid };
}

export async function runTokens(ctx: LlmContext, n: number): Promise<number> {
  const rows = ctx.rows();
  const client = ctx.client();
  const body = rows.passage.filter((p) => p.kind === "body");
  const picked = new Set(
    samplePages(
      body.map((p) => p.id),
      n,
      TOKEN_SAMPLE_SEED,
    ),
  );
  const sample = body.filter((p) => picked.has(p.id));
  const count = async (content: string, system?: string) =>
    (
      await client.messages.countTokens({
        model: MODELS.haiku,
        ...(system === undefined ? {} : { system }),
        messages: [{ role: "user", content }],
      })
    ).input_tokens;

  // Overhead pembungkus pesan: pesan "." dihitung, lalu dikurangi (tanpa token titik itu sendiri).
  const base = (await count(".")) - 1;
  const samples = await mapPool(sample, 8, async (p) => ({
    passageId: p.id,
    chars: p.text_raw.length,
    tokens: (await count(p.text_raw)) - base,
  }));
  const stats = tokenStats(samples);
  const translateSystem = (await count(".", TRANSLATE_PROMPT.system)) - base - 1;
  const summarySystem = (await count(".", SUMMARY_PROMPT.system)) - base - 1;

  const lines = [
    "# Token Arab Ihya di tokenizer Claude (S13)",
    "",
    `Diukur ${new Date().toISOString().slice(0, 10)} dengan \`messages.countTokens\` (model \`${MODELS.haiku}\`, gratis) pada ${samples.length} paragraf badan acak (seed ${TOKEN_SAMPLE_SEED}, \`samplePages\`). Teks = \`text_raw\` persis; overhead pembungkus pesan (${base} token) dikurangkan. Pembanding: o200k ±${O200K_TOKENS_PER_CHAR} token/karakter (riset 2026-10-15).`,
    "",
    "| Ukuran | Nilai |",
    "|---|---|",
    `| Karakter sampel | ${stats.chars.toLocaleString("id-ID")} |`,
    `| Token Claude | ${stats.tokens.toLocaleString("id-ID")} |`,
    `| Token Claude per karakter (total) | ${stats.perChar.toFixed(3)} |`,
    `| Token Claude per karakter (median per paragraf) | ${stats.medianPerChar.toFixed(3)} |`,
    `| **Faktor terhadap o200k** (\`FAKTOR_TOKEN_ARAB\`) | **${stats.factor.toFixed(2)}** |`,
    `| Prompt sistem \`${TRANSLATE_PROMPT.id}\` | ${translateSystem} token |`,
    `| Prompt sistem \`${SUMMARY_PROMPT.id}\` | ${summarySystem} token |`,
    "",
    `Prompt sistem ≥512 token = prefix bisa di-cache (minimum Haiku 5.5).`,
    "",
  ];
  writeText(join(ctx.repo, "data/reports/ihya-9472-token.md"), lines.join("\n"));
  console.info(lines.slice(4, 14).join("\n"));
  return 0;
}
