// Terjemahan ulang terarah (X21, ADR-109). Berkas `data/reviews/ihya-9472-terjemahan-ulang.json` (di
// git, tanpa teks kitab) memilih paragraf yang diterjemahkan ulang dengan prompt dan model tertentu,
// menurut aturan panjang teks Arab (strata T-17: sedang ≥ 100, panjang ≥ 500) dan jilid. Berbeda dari
// lapisan koreksi tinjauan (`reviews.ts`), hasil lama TIDAK ditolak: terjemahan lama tetap dimuat
// sampai hasil baru lolos validasi (di `rebuild`, hasil batch yang lebih baru menimpa yang lama hanya
// bila lolos). Paragraf yang revisi manusianya masih berlaku tidak disentuh (`withoutReviewed`).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { TRANSLATE_PROMPT, TRANSLATE_PROMPTS, isModelId } from "@surau/llm";
import type { ModelId } from "@surau/llm";
import { z } from "zod";

import type { CorpusRows } from "../rows.ts";
import type { AcceptedTranslation } from "./store.ts";

/** Berkas pilihan terjemahan ulang Ihya (relatif ke root repo). */
export const RETRANSLATE_FILE = "data/reviews/ihya-9472-terjemahan-ulang.json";

const entry = z.strictObject({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  /** Dasar keputusan, mis. "T-17 tahap 3 + uji X21; izin pemilik di chat". Tanpa huruf Arab. */
  basis: z
    .string()
    .min(1)
    .refine((r) => !/\p{Script=Arabic}/u.test(r), { message: "tanpa huruf Arab" }),
  /** Versi prompt tujuan; entri yang bukan prompt aktif (`TRANSLATE_PROMPT`) dilewati sebagai riwayat. */
  prompt: z.string().min(1),
  model: z.string().refine(isModelId, { message: "model tidak dikenal" }),
  /** Panjang minimal teks Arab paragraf (`text_raw`, karakter UTF-16), sama dengan strata T-17. */
  min_chars: z.number().int().nonnegative(),
  /** Batasi ke jilid ini (kosong = semua jilid). */
  juz: z.array(z.number().int().positive()).optional(),
});

export const retranslateFile = z.strictObject({ entries: z.array(entry) });
export type RetranslateFile = z.infer<typeof retranslateFile>;

export interface RetranslateTarget {
  /** `id` entri berkas yang memilih paragraf ini (entri terakhir menang). */
  entry: string;
  prompt: string;
  model: ModelId;
}

/** Paragraf yang dipilih → prompt dan model tujuannya. */
export type Retranslation = ReadonlyMap<number, RetranslateTarget>;

export const NO_RETRANSLATION: Retranslation = new Map();

/** Pilih paragraf badan menurut entri berkas. Prompt tujuan harus prompt aktif. */
export function selectRetranslation(
  input: unknown,
  rows: Pick<CorpusRows, "page" | "passage">,
): Retranslation {
  const file: RetranslateFile = retranslateFile.parse(input);
  const juz = new Map(rows.page.map((p) => [p.id, p.juz]));
  const out = new Map<number, RetranslateTarget>();
  for (const e of file.entries) {
    if (e.prompt !== TRANSLATE_PROMPT.id) {
      // Entri riwayat (prompt sudah dinaikkan sesudahnya) tidak boleh mematikan plan/submit/retry;
      // prompt yang tidak dikenal sama sekali adalah salah tulis dan ditolak.
      if (!(e.prompt in TRANSLATE_PROMPTS)) {
        throw new Error(
          `${RETRANSLATE_FILE}: entri ${e.id} memakai prompt tak dikenal ${e.prompt}`,
        );
      }
      console.warn(
        `${RETRANSLATE_FILE}: entri ${e.id} (${e.prompt}) dilewati, prompt aktif ${TRANSLATE_PROMPT.id}`,
      );
      continue;
    }
    for (const p of rows.passage) {
      if (p.kind !== "body" || p.text_raw.length < e.min_chars) continue;
      if (e.juz !== undefined && !e.juz.includes(juz.get(p.page_id) ?? -1)) continue;
      out.set(p.id, { entry: e.id, prompt: e.prompt, model: e.model as ModelId });
    }
  }
  return out;
}

/** Baca berkas pilihan; tidak ada berkas = tanpa terjemahan ulang. */
export function loadRetranslation(
  repo: string,
  rows: Pick<CorpusRows, "page" | "passage">,
): Retranslation {
  const path = join(repo, RETRANSLATE_FILE);
  if (!existsSync(path)) return NO_RETRANSLATION;
  return selectRetranslation(JSON.parse(readFileSync(path, "utf8")) as unknown, rows);
}

/**
 * Terjemahan paragraf ini sudah memenuhi pilihan: ada untuk sumber saat ini, dan (bila dipilih)
 * dibuat dengan prompt tujuan. Terjemahan lama yang sumbernya sama tetap dimuat, tetapi belum
 * "selesai" sampai hasil prompt tujuan lolos.
 */
export function translationDone(
  accepted: Pick<AcceptedTranslation, "source_sha256" | "prompt_version"> | undefined,
  sha: string,
  target: RetranslateTarget | undefined,
): boolean {
  if (accepted === undefined || accepted.source_sha256 !== sha) return false;
  return target === undefined || accepted.prompt_version === target.prompt;
}
