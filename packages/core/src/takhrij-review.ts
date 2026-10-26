// Tinjauan label status hadits (X07, ADR-070). Penilai /tinjau menyetujui label kode
// (`takhrijLabel`, ADR-069) atau mengoreksi JENIS istilahnya; tidak pernah menulis teks Arab.
// Tinjauan hanya berlaku bila versi aturan dan label kode yang ditinjau (`takhrijLabelHash`) sama
// dengan label sekarang, dan penilainya ustadz peninjau terdaftar (kunci akun + nama). Label
// tertinjau tetap menunjuk frasa Arab DB lewat rentang: koreksi hanya MEMBUANG istilah yang
// terdeteksi atau MENAMBAH jenis tanpa frasa (disebut "menurut peninjau", tanpa teks Arab).
import { TAKHRIJ_REVIEW_DECISIONS } from "@surau/db";
import type { TakhrijReview } from "@surau/db";
import { takhrijTerms } from "@surau/text";
import type { TakhrijTermKind } from "@surau/text";
import { z } from "zod";

import { evalHash } from "./eval-source.ts";
import {
  TAKHRIJ_RANGE_WITHOUT_TERMS,
  TAKHRIJ_TERM_GLOSS,
  TAKHRIJ_TERM_KINDS,
  isWeakTakhrijKind,
  takhrijLabel,
  takhrijSegmentsInScope,
  takhrijStatus,
  takhrijStatusContext,
} from "./takhrij-label.ts";
import type { TakhrijLabel } from "./takhrij-label.ts";

const clean = (s: string) => !/[\p{Cc}\p{Cf}]/u.test(s.replaceAll(/[\n\t]/g, " "));
// Nama dan catatan penilai tanpa huruf Arab: teks Arab di Surau hanya disalin dari DB (aturan
// teks-arab no. 1). Istilah dirujuk lewat sorotan atau transliterasi.
const latin = (s: string) => !/\p{Script=Arabic}/u.test(s);
const kindEnum = z.enum(TAKHRIJ_TERM_KINDS as [TakhrijTermKind, ...TakhrijTermKind[]]);

/** Masukan POST tinjauan label (route web menambah identitas Access, versi korpus, dan waktu). */
export const takhrijReviewInput = z
  .strictObject({
    passage_id: z.number().int().positive(),
    rules_version: z.number().int().positive(),
    // Hash label yang dilihat penilai: tab lama tidak boleh meninjau label yang sudah berubah.
    label_hash: z.string().regex(/^[a-f0-9]{64}$/u),
    reviewer_name: z.string().trim().min(1).max(80).refine(clean).refine(latin),
    decision: z.enum(TAKHRIJ_REVIEW_DECISIONS),
    kinds: z
      .array(kindEnum)
      .max(20)
      .refine((k) => new Set(k).size === k.length)
      .nullable(),
    note: z.string().trim().max(2000).refine(clean).refine(latin),
  })
  .refine((v) => (v.decision === "corrected") === (v.kinds !== null));
export type TakhrijReviewInput = z.infer<typeof takhrijReviewInput>;

/**
 * Sidik label kode utuh satu catatan kaki: versi aturan, jenis label, teks status, istilah +
 * rentang + arti bakunya. Arti atau kalimat status yang berubah tanpa naik versi aturan juga
 * membatalkan tinjauan (yang ditinjau penilai adalah kalimat itu).
 */
export function takhrijLabelHash(label: TakhrijLabel): Promise<string> {
  return evalHash({
    version: label.version,
    kind: label.kind,
    text: label.text,
    terms: label.terms.map((t) => [t.kind, t.char_start, t.char_end, t.gloss]),
  });
}

/** Keputusan yang dipakai Jawab: setuju (label kode tetap) atau koreksi (jenis istilah baru). */
export interface EffectiveTakhrijReview {
  decision: "approved" | "corrected";
  kinds: TakhrijTermKind[];
  reviewed_at: string;
}

/**
 * Ustadz peninjau yang ditunjuk pemilik (T-13, ADR-052/070). Keputusan dipakai Jawab ("ditinjau
 * ustadz") hanya bila nama ini DAN kunci akun Access-nya terdaftar (`TAKHRIJ_USTADZ_KEYS`, var
 * Worker): tidak setiap pengguna Access dianggap ustadz, dan nama saja bisa diketik siapa pun.
 * Menambah peninjau = PR + ADR.
 */
export const TAKHRIJ_USTADZ_REVIEWERS: readonly string[] = ["Anas"];
export const isUstadzReviewer = (name: string): boolean =>
  TAKHRIJ_USTADZ_REVIEWERS.some((n) => n.toLowerCase() === name.trim().toLowerCase());

/** `TAKHRIJ_USTADZ_KEYS` = kunci penilai (hash issuer+subjek Access, 64 hex) dipisah koma. */
export function parseUstadzKeys(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => /^[a-f0-9]{64}$/u.test(k)),
  );
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((k) => b.includes(k));

/**
 * Keputusan efektif dari baris tinjauan satu catatan kaki: hanya baris versi aturan + label yang
 * sama, oleh ustadz peninjau terdaftar (kunci di `ustadzKeys` dan nama `isUstadzReviewer`). Bila ada yang ragu, atau penilai berbeda jenis istilahnya, tidak ada yang
 * berlaku (label kode tetap "belum ditinjau"); tidak memilih satu penilai.
 */
export function effectiveTakhrijReview(
  label: TakhrijLabel,
  hash: string,
  rows: readonly TakhrijReview[],
  ustadzKeys: ReadonlySet<string>,
): EffectiveTakhrijReview | null {
  if (label.kind === "not_takhrij") return null;
  const valid = rows.filter(
    (r) =>
      r.rules_version === label.version &&
      r.label_hash === hash &&
      ustadzKeys.has(r.reviewer_key) &&
      isUstadzReviewer(r.reviewer_name),
  );
  if (valid.length === 0 || valid.some((r) => r.decision === "unsure")) return null;
  const detected = [...new Set(label.terms.map((t) => t.kind))];
  const known = new Set<string>(TAKHRIJ_TERM_KINDS);
  const sets = valid.map((r) =>
    r.decision === "approved" ? detected : (r.kinds ?? []).filter((k) => known.has(k)),
  ) as TakhrijTermKind[][];
  const first = sets[0]!;
  if (!sets.every((s) => sameSet(s, first))) return null;
  return {
    decision: sameSet(first, detected) ? "approved" : "corrected",
    kinds: first,
    reviewed_at: valid
      .map((r) => r.updated_at)
      .sort()
      .at(-1)!,
  };
}

/** Label setelah tinjauan: `review` = asal label; `added` = jenis dari penilai tanpa frasa DB. */
export interface ReviewedTakhrijLabel extends TakhrijLabel {
  review: "rule" | "approved" | "corrected";
  added: { kind: TakhrijTermKind; gloss: string }[];
}

/**
 * Label untuk (bagian) catatan kaki dengan tinjauan efektif. Untuk sitasi sebagian, tinjauan
 * diterapkan pada istilah di bagian itu: istilah yang ditolak penilai TIDAK PERNAH tampil lagi,
 * jenis tambahan penilai disebut "menurut peninjau", dan setiap istilah "takhrij menyebut" tetap
 * punya frasa Arab di potongan yang ditampilkan.
 */
export function reviewedTakhrijLabel(
  raw: string,
  review: EffectiveTakhrijReview | null,
  range?: { start: number; end: number },
): ReviewedTakhrijLabel {
  const rule = takhrijLabel(raw, range);
  const found = takhrijTerms(raw);
  const segs = takhrijSegmentsInScope(found, range);
  // Tinjauan menilai label catatan kaki utuh = segmen pertama; sitasi di segmen lain (hadits lain
  // yang tergabung di paragraf yang sama) tidak ikut tinjauan itu.
  if (review === null || rule.kind === "not_takhrij" || !segs.includes(0))
    return { ...rule, review: "rule", added: [] };
  if (review.decision === "approved") return { ...rule, review: "approved", added: [] };
  const chosen = new Set(review.kinds);
  const scoped = found.terms.filter((t) => segs.includes(t.segment));
  const inRange = (t: { start: number; end: number }) =>
    range === undefined || (t.start >= range.start && t.end <= range.end);
  const picked = scoped.filter((t) => inRange(t) && chosen.has(t.kind));
  const terms = rule.terms.filter((t) => chosen.has(t.kind));
  const detected = new Set(scoped.map((t) => t.kind));
  const added = TAKHRIJ_TERM_KINDS.filter((k) => chosen.has(k) && !detected.has(k));
  const ctx = takhrijStatusContext(found, segs, range, (s) =>
    picked.filter((t) => t.segment === s),
  );
  const status = takhrijStatus(
    terms.map((t) => t.kind),
    added,
    // Jenis tambahan penilai tidak punya segmen: "berbeda per jalur" dihitung dari semua jenis.
    added.length > 0 ? { ...ctx, mixed: undefined } : ctx,
  );
  // Bagian yang dikutip tanpa istilah yang dipilih, padahal catatan kaki utuhnya memuat.
  const outside =
    range !== undefined &&
    status.kind !== "terms" &&
    scoped.some((t) => chosen.has(t.kind) && t.kind !== "rujukan");
  return {
    ...rule,
    ...status,
    ...(outside ? { kind: "sources_only" as const, text: TAKHRIJ_RANGE_WITHOUT_TERMS } : {}),
    weak: [...terms.map((t) => t.kind), ...added].some(isWeakTakhrijKind),
    terms,
    review: "corrected",
    added: added.map((kind) => ({ kind, gloss: TAKHRIJ_TERM_GLOSS[kind] })),
  };
}

/** Tinjauan efektif per catatan kaki (teks dari DB korpus, baris dari DB app). */
export async function takhrijReviewsFor(
  footnotes: readonly { id: number; text_raw: string }[],
  rows: readonly TakhrijReview[],
  ustadzKeys: ReadonlySet<string>,
): Promise<Map<number, EffectiveTakhrijReview>> {
  const byPassage = new Map<number, TakhrijReview[]>();
  for (const r of rows) byPassage.set(r.passage_id, [...(byPassage.get(r.passage_id) ?? []), r]);
  const out = new Map<number, EffectiveTakhrijReview>();
  for (const f of footnotes) {
    const list = byPassage.get(f.id);
    if (list === undefined) continue;
    const label = takhrijLabel(f.text_raw);
    const review = effectiveTakhrijReview(label, await takhrijLabelHash(label), list, ustadzKeys);
    if (review !== null) out.set(f.id, review);
  }
  return out;
}
