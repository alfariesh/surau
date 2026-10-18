// Lapisan koreksi tinjauan terjemahan AI (X02). Berkas di git (`data/reviews/…`, tanpa teks kitab)
// mencatat paragraf yang dinilai Salah/Kurang oleh peninjau, alasannya, dan versi prompt yang
// ditolak. `rebuild` (collect/rejudge) menolak hasil versi itu untuk paragraf tersebut
// (`review_rejected`), sehingga ingest tidak memuatnya dan `retry` mengirimnya ulang ke Sonnet 5.5
// dengan prompt saat ini. Hasil versi prompt lain (mis. sesudah perbaikan) tidak ikut ditolak; bila
// hasil baru juga keliru, tambahkan entri baru yang menolak versi itu.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

/** Berkas koreksi tinjauan Ihya (relatif ke root repo). */
export const REVIEW_FILE = "data/reviews/ihya-9472-terjemahan.json";

const reviewEntry = z.strictObject({
  passage_id: z.number().int().positive(),
  verdict: z.enum(["salah", "kurang"]),
  /** Alasan singkat dalam bahasa Indonesia; tanpa kutipan teks kitab (tanpa huruf Arab). */
  reason: z
    .string()
    .min(1)
    .refine((r) => !/\p{Script=Arabic}/u.test(r), {
      message: "alasan tidak boleh memuat huruf Arab (tulis transliterasi)",
    }),
});

export const reviewFile = z.strictObject({
  reviews: z.array(
    z.strictObject({
      reviewer: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
      /** Dasar tinjauan, mis. "T-17 tahap 2 (20 sampel acak batch)". */
      basis: z.string().min(1),
      /** Versi prompt yang hasilnya ditolak, mis. "translate-passage@2". */
      rejects_prompt: z.string().min(1),
      entries: z.array(reviewEntry).min(1),
    }),
  ),
});
export type ReviewFile = z.infer<typeof reviewFile>;

export interface ReviewRejection {
  passageId: number;
  verdict: "salah" | "kurang";
  reason: string;
  reviewer: string;
  date: string;
  rejectsPrompt: string;
}

/** Penolakan per paragraf (satu paragraf boleh punya beberapa, mis. v2 lalu v3). */
export type ReviewRejections = ReadonlyMap<number, readonly ReviewRejection[]>;

export function parseReviews(data: unknown): ReviewRejections {
  const out = new Map<number, ReviewRejection[]>();
  for (const r of reviewFile.parse(data).reviews) {
    for (const e of r.entries) {
      const list = out.get(e.passage_id) ?? [];
      if (list.some((x) => x.rejectsPrompt === r.rejects_prompt)) {
        throw new Error(`koreksi ganda untuk passage ${e.passage_id} (${r.rejects_prompt})`);
      }
      list.push({
        passageId: e.passage_id,
        verdict: e.verdict,
        reason: e.reason,
        reviewer: r.reviewer,
        date: r.date,
        rejectsPrompt: r.rejects_prompt,
      });
      out.set(e.passage_id, list);
    }
  }
  return out;
}

/** Baca berkas koreksi; tidak ada berkas = tanpa koreksi. */
export function loadReviews(repo: string): ReviewRejections {
  const file = join(repo, REVIEW_FILE);
  if (!existsSync(file)) return new Map();
  return parseReviews(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

/** Penolakan yang berlaku untuk hasil paragraf ini dengan versi prompt ini, atau `null`. */
export function rejectionFor(
  reviews: ReviewRejections,
  passageId: number,
  promptVersion: string,
): ReviewRejection | null {
  return reviews.get(passageId)?.find((r) => r.rejectsPrompt === promptVersion) ?? null;
}
