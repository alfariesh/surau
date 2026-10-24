// Bagian satu paragraf cocok di kartu Cari menurut mode baca (X11, ADR-091), dalam urutan tampil.
// Bukti tidak pernah hilang: teks Arab selalu tampil (rujukan + sitasi), ringkasan AI hanya ada bila
// jalur ringkasan cocok (jadi selalu tampil bila ada), dan terjemahan di mode Arab tetap tampil bila
// jalur terjemahan yang cocok (satu-satunya alasan paragraf itu muncul). Mode Terjemahan menaruh
// terjemahan lebih dulu. Gagasan Intisari (X16) sama dengan ringkasan: hanya ada bila jalurnya cocok,
// jadi selalu tampil bila ada, sesudah ringkasan.

import type { SearchHit } from "@surau/core";

import type { ReadMode } from "../reader/scale";

export type HitPart = "arabic" | "translation" | "summary" | "digest";

export function hitParts(
  hit: Pick<SearchHit, "matched_by"> & {
    hasTranslation: boolean;
    hasSummary: boolean;
    hasDigest?: boolean;
  },
  mode: ReadMode,
): HitPart[] {
  const translation =
    hit.hasTranslation && (mode !== "ar" || hit.matched_by.some((m) => m.path === "translation"));
  // Mode Terjemahan: terjemahan lebih dulu sebagai teks utama, Arab tetap tampil di bawahnya.
  const parts: HitPart[] =
    mode === "tr" && translation
      ? ["translation", "arabic"]
      : translation
        ? ["arabic", "translation"]
        : ["arabic"];
  if (hit.hasSummary) parts.push("summary");
  if (hit.hasDigest === true) parts.push("digest");
  return parts;
}
