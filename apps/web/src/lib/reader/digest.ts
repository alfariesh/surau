import type { DigestHeaderRow } from "@surau/db";

import { readingMinutes } from "@surau/core";

// Intisari di situs (X16, ADR-097 butir 7): kepala ringkas satu Intisari (jumlah gagasan, waktu
// baca/dengar, alamat) untuk hub, kartu ringkasan pembaca, menu ⋮, dan lencana daftar isi. Dari
// `listShownDigestHeaders`/`getShownDigestHeaders` (core: kepala db dikurangi daftar tarik ADR-127),
// bukan field baru di `SummaryView`. Korpus berskema < 9 tidak punya Intisari: daftar kepala kosong,
// jadi tidak ada lencana maupun tautan.

export interface DigestTeaser {
  nodeId: number;
  tier: DigestHeaderRow["tier"];
  /** Gagasan yang tampil (tidak ditolak, berjangkar). */
  points: number;
  /** Perkiraan waktu baca teks AI (menit, `readingMinutes` core). */
  minutes: number;
  /** Durasi audio dibulatkan ke menit (minimal 1), atau null bila belum ada audio (X17). */
  listenMinutes: number | null;
  /** `/kitab/<karya>/bab/<id>/intisari`. */
  href: string;
}

/** Alamat halaman Intisari satu bagian (`segment` = segmen karya kanonis, mis. `ihya`). */
export const digestHref = (segment: string, nodeId: number): string =>
  `/kitab/${segment}/bab/${nodeId}/intisari`;

/** Alamat hub Intisari satu karya. */
export const digestHubHref = (segment: string): string => `/kitab/${segment}/intisari`;

/** Kepala siap tampil, atau null bila Intisari itu tidak punya gagasan yang tampil. */
export function digestTeaser(row: DigestHeaderRow, segment: string): DigestTeaser | null {
  if (row.points === 0) return null;
  return {
    nodeId: row.toc_node_id,
    tier: row.tier,
    points: row.points,
    minutes: readingMinutes(row.chars),
    listenMinutes: row.audio_ms === null ? null : Math.max(1, Math.round(row.audio_ms / 60_000)),
    href: digestHref(segment, row.toc_node_id),
  };
}

/** Kepala siap tampil dari baris DB (yang tanpa gagasan tampil dibuang), urut masukan. */
export const digestTeasers = (rows: readonly DigestHeaderRow[], segment: string): DigestTeaser[] =>
  rows.flatMap((row) => digestTeaser(row, segment) ?? []);

/**
 * Intisari terdekat di jalur daftar isi (akar → bagian yang sedang dibaca): bagian terdalam yang
 * punya Intisari, untuk aksi "Buka Intisari" di menu ⋮ pembaca. Null bila tidak ada.
 */
export function nearestDigest(
  path: readonly { id: number }[],
  byNode: ReadonlyMap<number, DigestTeaser>,
): DigestTeaser | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const found = byNode.get(path[i]!.id);
    if (found !== undefined) return found;
  }
  return null;
}
