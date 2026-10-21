// Penyimpanan kerja LLM (S13) di data/build/llm/ (git-ignored, JANGAN dihapus: hasil batch berbayar
// dan tidak deterministik; ingest korpus membacanya). Isi:
//   requests/<nama>.jsonl      request yang dikirim (custom_id + params), untuk audit
//   results/<batch_id>.jsonl   hasil mentah batch persis seperti diterima
//   batches.json               daftar batch yang dikirim (nama, id, jenis, status)
//   translation.jsonl          terjemahan yang LOLOS validasi (satu baris per paragraf)
//   summary.jsonl              ringkasan final yang lolos (satu baris per simpul × bahasa)
//   summary-r1.jsonl           ringkasan putaran 1 yang lolos (masukan putaran 2)
//   failures.jsonl             keluaran yang ditolak + alasannya (bahan ulangan)
//   sample/                    uji kecil lewat API biasa (langkah 5)
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { z } from "zod";

import { assertWritable } from "../sqlite.ts";

export function llmDir(repo: string): string {
  return join(repo, "data/build/llm");
}

export function readJsonl<T>(path: string, schema: z.ZodType<T>): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l, i) => {
      try {
        return schema.parse(JSON.parse(l));
      } catch (error) {
        throw new Error(`${path}:${i + 1}: baris tidak sah`, { cause: error });
      }
    });
}

function ensureDir(path: string): string {
  mkdirSync(dirname(assertWritable(path)), { recursive: true });
  return path;
}

export function writeJsonl(path: string, rows: readonly unknown[]): void {
  writeFileSync(ensureDir(path), rows.map((r) => `${JSON.stringify(r)}\n`).join(""));
}

export function appendJsonl(path: string, rows: readonly unknown[]): void {
  if (rows.length === 0) return;
  appendFileSync(ensureDir(path), rows.map((r) => `${JSON.stringify(r)}\n`).join(""));
}

/** Atomik (tulis ke berkas sementara lalu rename): proses yang mati di tengah tidak meninggalkan JSON
 * terpotong di batches.json/submitting.json, yang dibaca semua perintah termasuk pemulihan (#63). */
export function writeText(path: string, text: string): void {
  const tmp = `${ensureDir(path)}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

export const usageSchema = z.strictObject({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_input_tokens: z.number().nullable(),
  cache_creation_input_tokens: z.number().nullable(),
  cache_creation: z
    .strictObject({ ephemeral_5m_input_tokens: z.number(), ephemeral_1h_input_tokens: z.number() })
    .nullable(),
});
export type StoredUsage = z.infer<typeof usageSchema>;

/** Bagian `usage` respons yang disimpan (dasar biaya aktual; field lain SDK tidak dibawa). */
export function storedUsage(u: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens: number; ephemeral_1h_input_tokens: number } | null;
}): StoredUsage {
  return {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_input_tokens: u.cache_read_input_tokens ?? null,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? null,
    cache_creation:
      u.cache_creation === undefined || u.cache_creation === null
        ? null
        : {
            ephemeral_5m_input_tokens: u.cache_creation.ephemeral_5m_input_tokens,
            ephemeral_1h_input_tokens: u.cache_creation.ephemeral_1h_input_tokens,
          },
  };
}

/** Satu terjemahan yang lolos validasi (masukan ingest → tabel `translation`). */
export const acceptedTranslation = z.strictObject({
  passage_id: z.number().int().positive(),
  lang: z.literal("id"),
  text: z.string().min(1),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  source_sha256: z.string().length(64),
  batch_id: z.string().nullable(),
  /** Penanda catatan kaki yang tidak ada di terjemahan (diterima, dicatat). */
  markers_missing: z.array(z.string()),
  usage: usageSchema,
});
export type AcceptedTranslation = z.infer<typeof acceptedTranslation>;

/** Satu ringkasan yang lolos (putaran 1 atau final). */
export const acceptedSummary = z.strictObject({
  custom_id: z.string(),
  toc_node_id: z.number().int().positive(),
  lang: z.enum(["id", "en"]),
  /** null = ringkasan final simpul; angka = potongan ke-k putaran 1. */
  part: z.number().int().positive().nullable(),
  round: z.union([z.literal(1), z.literal(2)]),
  text: z.string().min(1),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  source_sha256: z.string().length(64),
  /** Putaran 2: sha256 teks ringkasan putaran 1 yang menjadi masukannya (`round2InputSha`). */
  input_sha256: z.string().length(64).nullable(),
  batch_id: z.string().nullable(),
  usage: usageSchema,
});
export type AcceptedSummary = z.infer<typeof acceptedSummary>;

export const failure = z.strictObject({
  custom_id: z.string(),
  batch_id: z.string().nullable(),
  model: z.string(),
  /** refusal | max_tokens | no_text | errored:<tipe> | expired | canceled | invalid:<masalah,…> */
  reason: z.string(),
  details: z.array(z.string()),
  output: z.string().nullable(),
  at: z.string(),
  /** sha256 sumber request yang gagal: kegagalan untuk sumber lama tidak dihitung percobaan. */
  source_sha256: z.string(),
  /**
   * Versi prompt request yang gagal (semua kegagalan sejak #70; dulu hanya `review_rejected`, X02).
   * Percobaan dihitung per versi prompt: versi baru mendapat jatah percobaan baru. Kosong pada
   * berkas lama yang belum dibangun ulang (`rejudge`) = dianggap versi saat ini.
   */
  prompt_version: z.string().optional(),
  usage: usageSchema.nullable(),
});
export type Failure = z.infer<typeof failure>;

export const batchKind = z.enum(["translation", "summary-r1", "summary-r2"]);
export type BatchKind = z.infer<typeof batchKind>;

const totals = z.strictObject({
  requests: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_input_tokens: z.number(),
  cache_creation_input_tokens: z.number(),
  costUsd: z.number(),
});

export const batchRecord = z.strictObject({
  name: z.string(),
  id: z.string(),
  kind: batchKind,
  /** Model request (ulangan refusal memakai Sonnet 5.5; "mixed" bila campur). */
  model: z.string(),
  prompt_version: z.string(),
  requests: z.number().int().positive(),
  created_at: z.string(),
  /** Diisi `collect` setelah hasil dibaca dan divalidasi. */
  ended_at: z.string().nullable(),
  collected_at: z.string().nullable(),
  /** Token + biaya aktual (tarif batch) dari `usage` semua hasil `succeeded`. */
  usage: totals.nullable(),
  /** Jumlah hasil: lolos, ditolak validasi, gagal di API (errored/expired/canceled). */
  outcome: z
    .strictObject({ accepted: z.number(), invalid: z.number(), failed: z.number() })
    .nullable(),
});
export type BatchRecord = z.infer<typeof batchRecord>;

export function readBatches(dir: string): BatchRecord[] {
  const path = join(dir, "batches.json");
  if (!existsSync(path)) return [];
  return z.array(batchRecord).parse(JSON.parse(readFileSync(path, "utf8")));
}

export function writeBatches(dir: string, batches: readonly BatchRecord[]): void {
  writeText(join(dir, "batches.json"), `${JSON.stringify(batches, null, 2)}\n`);
}
