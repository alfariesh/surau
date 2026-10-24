// Penyimpanan kerja Intisari (X15b) di data/build/llm/intisari/ (git-ignored, JANGAN dihapus: hasil
// batch berbayar dan tidak deterministik). Isinya mengikuti pola `store.ts`:
//   requests/<batch_id>.jsonl  request terkirim (params + peta blok/sumber)
//   results/<batch_id>.jsonl   hasil mentah batch persis seperti diterima
//   batches.json, submitting.json, counts.json, plan-<tahap>.jsonl/.json
//   digest.jsonl               Intisari yang LOLOS, sudah diselesaikan menjadi rentang `text_raw`
//                              (satu baris per custom_id; dibangun ulang `collect`/`rejudge`)
//   failures.jsonl             respons yang ditolak + alasannya (bahan `retry`)
//   glossary.jsonl, glossary-runs.jsonl   definisi glosarium yang lolos + buku biaya (API biasa)
//   qa/                        halaman QA pemilik (T-31), berisi teks kitab
import { join } from "node:path";

import { digestBasis, digestPointKind, digestQuoteKind, digestStance, digestTier } from "@surau/db";
import { z } from "zod";

import { failure, llmDir, readJsonl, usageSchema, writeJsonl } from "./store.ts";
import type { Failure } from "./store.ts";

export function digestDir(repo: string): string {
  return join(llmDir(repo), "intisari");
}

const range = {
  passage_id: z.number().int().positive(),
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().positive(),
};

/** Kutipan yang sudah diselesaikan: rentang + sidik + terjemahan dengan asal model-nya sendiri. */
export const acceptedQuote = z.strictObject({
  ord: z.number().int().positive(),
  point_ord: z.number().int().positive().nullable(),
  ...range,
  raw_sha256: z.string().length(64),
  kind: digestQuoteKind,
  translation: z.string().min(1),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  /** custom_id request leaf yang memilih kutipan ini (asal terjemahannya). */
  origin: z.string(),
});
export type AcceptedQuote = z.infer<typeof acceptedQuote>;

export const acceptedPoint = z.strictObject({
  ord: z.number().int().positive(),
  kind: digestPointKind,
  stance: digestStance,
  title: z.string().min(1),
  body: z.string().min(1),
  /** Label blok (leaf) atau ID gagasan sumber (merge/book) yang ditunjuk model. */
  basis: z.array(z.string()),
  /** Jangkar yang dihitung kode (≤ 9), urut. */
  anchors: z.array(z.strictObject(range)).min(1).max(9),
  questions: z.array(z.string()),
});
export type AcceptedPoint = z.infer<typeof acceptedPoint>;

/** Satu Intisari (atau potongan) yang lolos `judgeDigest`. */
export const acceptedDigest = z.strictObject({
  custom_id: z.string(),
  toc_node_id: z.number().int().positive(),
  lang: z.literal("id"),
  stage: z.enum(["leaf", "merge", "book"]),
  /** Potongan teks node (null = Intisari final node). */
  part: z.number().int().positive().nullable(),
  tier: digestTier,
  basis: digestBasis,
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  batch_id: z.string().nullable(),
  /** Sidik berjenjang saat request dibuat (`DigestLeafUnit`/`DigestNodeUnit.sourceSha256`). */
  source_sha256: z.string().length(64),
  /** merge/book: sha256 Intisari sumber yang dikirim (`digestInputSha`). */
  input_sha256: z.string().length(64).nullable(),
  opening: z.string().nullable(),
  abstract: z.string().min(1),
  closing: z.string().nullable(),
  points: z.array(acceptedPoint).min(1),
  quotes: z.array(acceptedQuote),
  terms: z.array(z.string()),
  dropped: z.array(z.strictObject({ item: z.string(), reason: z.string() })),
  usage: usageSchema,
});
export type AcceptedDigest = z.infer<typeof acceptedDigest>;

export const DIGEST_FILE = "digest.jsonl";
export const DIGEST_FAILURES_FILE = "failures.jsonl";

export interface DigestStore {
  /** custom_id → hasil lolos terakhir. */
  accepted: Map<string, AcceptedDigest>;
  failures: Failure[];
}

export function readDigestStore(dir: string): DigestStore {
  const accepted = new Map<string, AcceptedDigest>();
  for (const a of readJsonl(join(dir, DIGEST_FILE), acceptedDigest)) accepted.set(a.custom_id, a);
  return { accepted, failures: readJsonl(join(dir, DIGEST_FAILURES_FILE), failure) };
}

export function writeDigestStore(dir: string, store: DigestStore): void {
  writeJsonl(
    join(dir, DIGEST_FILE),
    [...store.accepted.values()].toSorted((a, b) => (a.custom_id < b.custom_id ? -1 : 1)),
  );
  writeJsonl(join(dir, DIGEST_FAILURES_FILE), store.failures);
}

/** Definisi glosarium yang lolos (`pnpm llm glosarium`). */
export const acceptedGloss = z.strictObject({
  term_key: z.string(),
  lang: z.literal("id"),
  label: z.string(),
  gloss: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  /** sha256 entri glosarium (sumber, label, padanan) yang didefinisikan: usang bila entri berubah. */
  source_sha256: z.string().length(64),
});
export type AcceptedGloss = z.infer<typeof acceptedGloss>;

export const GLOSSARY_FILE = "glossary.jsonl";
export const GLOSSARY_RUNS_FILE = "glossary-runs.jsonl";

export const glossaryRun = z.strictObject({
  at: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  request_id: z.string().nullable(),
  keys: z.array(z.string()),
  stop_reason: z.string().nullable(),
  usage: usageSchema,
  cost_usd: z.number().nonnegative(),
  accepted: z.number().int().nonnegative(),
  rejected: z.record(z.string(), z.string()),
  problems: z.array(z.string()),
});
export type GlossaryRun = z.infer<typeof glossaryRun>;
