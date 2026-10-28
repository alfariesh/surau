// Daftar tarik Intisari (ADR-127): gagasan yang dinilai Salah dan masih tayang di korpus produksi
// ditahan saat dibaca, tanpa mengubah D1/R2. Berkas di git (`data/reviews/ihya-9472-intisari-tolak.json`,
// tanpa teks kitab) dibaca `readDigest`, kepala Intisari, dan jalur gagasan Cari; MCP dan audio ikut
// karena memakai fungsi yang sama. Setiap entri hanya berlaku bila `created_at` Intisari-nya masih sama
// dengan yang dinilai: Intisari yang dibangun ulang (v2) tidak pernah terpotong di `ord` yang usang.
// Node yang punya gagasan tertarik juga kehilangan audionya, karena naskah audio memuat gagasan itu.
import {
  getDigestHeaders,
  getDigestHeadersOnPath,
  getDigestPointSizes,
  listDigestHeaders,
} from "@surau/db";
import type { D1Db, DigestHeaderRow } from "@surau/db";
import { z } from "zod";

import raw from "../../../data/reviews/ihya-9472-intisari-tolak.json" with { type: "json" };

const id = z.number().int().positive();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const digestWithdrawal = z.strictObject({
  toc_node_id: id,
  lang: z.string().min(2),
  /** `digest_point.ord` yang ditarik. */
  ord: id,
  /** `digest.created_at` saat dinilai (penjaga: entri mati sendiri bila Intisari dibangun ulang). */
  digest_created_at: z.string().min(10),
  digest_prompt_version: z.string(),
  verdict: z.literal("salah"),
  reason: z.string().min(1),
  reviewer: z.string().min(1),
  /** Laporan penilaian di repo. */
  source: z.string().min(1),
  assessed: day,
  /** Tanggal ditarik. */
  date: day,
  /** Objek R2 audio yang ikut ditahan (tidak dihapus; menghapusnya butuh izin pemilik). */
  audio_r2_key: z.string().nullable(),
});
export type DigestWithdrawal = z.infer<typeof digestWithdrawal>;

export const digestWithdrawalFile = z.strictObject({
  format: z.literal(1),
  edition: id,
  corpus: z.string(),
  entries: z.array(digestWithdrawal),
  /** Audit Intisari induk (merge/Kitab) yang mungkin dibangun dari gagasan tertarik. */
  parents_checked: z.array(z.strictObject({ toc_node_id: id, date: day, result: z.string() })),
});

/** Daftar tarik yang berlaku di situs. */
export const DIGEST_WITHDRAWALS: readonly DigestWithdrawal[] =
  digestWithdrawalFile.parse(raw).entries;

/** `ord` gagasan yang ditarik dari satu Intisari (versi `createdAt`); kosong bila tidak ada. */
export function withdrawnOrds(
  nodeId: number,
  lang: string,
  createdAt: string,
  withdrawals: readonly DigestWithdrawal[] = DIGEST_WITHDRAWALS,
): ReadonlySet<number> {
  return new Set(
    withdrawals
      .filter(
        (w) => w.toc_node_id === nodeId && w.lang === lang && w.digest_created_at === createdAt,
      )
      .map((w) => w.ord),
  );
}

/**
 * Kepala Intisari dikurangi gagasan yang ditarik: jumlah gagasan, panjang teks (waktu baca), dan
 * audio (null). Satu kueri tambahan hanya bila ada kepala yang terkena.
 */
export async function withdrawFromHeaders(
  db: D1Db,
  rows: readonly DigestHeaderRow[],
  lang: string,
  withdrawals: readonly DigestWithdrawal[] = DIGEST_WITHDRAWALS,
): Promise<DigestHeaderRow[]> {
  const hit = new Map(
    rows.flatMap((r) => {
      const ords = withdrawnOrds(r.toc_node_id, lang, r.created_at, withdrawals);
      return ords.size === 0 ? [] : [[r.toc_node_id, ords] as const];
    }),
  );
  if (hit.size === 0) return [...rows];
  const sizes = (await getDigestPointSizes(db, [...hit.keys()], lang)).filter(
    (s) => hit.get(s.toc_node_id)?.has(s.ord) === true,
  );
  return rows.map((r) => {
    if (!hit.has(r.toc_node_id)) return r;
    const gone = sizes.filter((s) => s.toc_node_id === r.toc_node_id);
    return {
      ...r,
      points: r.points - gone.length,
      chars: r.chars - gone.reduce((sum, s) => sum + s.chars, 0),
      audio_ms: null,
    };
  });
}

/** `listDigestHeaders` (db) dengan daftar tarik diterapkan; pakai ini untuk tampilan. */
export const listShownDigestHeaders = async (
  db: D1Db,
  editionId: number,
  lang: string,
): Promise<DigestHeaderRow[]> =>
  withdrawFromHeaders(db, await listDigestHeaders(db, editionId, lang), lang);

/** `getDigestHeaders` (db) dengan daftar tarik diterapkan. */
export const getShownDigestHeaders = async (
  db: D1Db,
  tocNodeIds: readonly number[],
  lang: string,
): Promise<DigestHeaderRow[]> =>
  withdrawFromHeaders(db, await getDigestHeaders(db, tocNodeIds, lang), lang);

/** `getDigestHeadersOnPath` (db) dengan daftar tarik diterapkan. */
export const getShownDigestHeadersOnPath = async (
  db: D1Db,
  tocNodeId: number,
  lang: string,
): Promise<DigestHeaderRow[]> =>
  withdrawFromHeaders(db, await getDigestHeadersOnPath(db, tocNodeId, lang), lang);
