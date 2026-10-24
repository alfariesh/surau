// Bagian satu paragraf cocok di kartu Cari menurut mode baca (X11, ADR-091). Bukti tidak pernah
// hilang: teks Arab selalu tampil (rujukan + sitasi), ringkasan AI hanya ada bila jalur ringkasan
// cocok (jadi selalu tampil bila ada), dan terjemahan di mode Arab tetap tampil bila jalur
// terjemahan yang cocok (satu-satunya alasan paragraf itu muncul).

import type { SearchHit } from "@surau/core";

import type { ReadMode } from "../reader/scale";

export type HitPart = "arabic" | "translation" | "summary";

export function hitParts(
  hit: Pick<SearchHit, "matched_by"> & { hasTranslation: boolean; hasSummary: boolean },
  mode: ReadMode,
): HitPart[] {
  const translation =
    hit.hasTranslation && (mode !== "ar" || hit.matched_by.some((m) => m.path === "translation"));
  const parts: HitPart[] = ["arabic"];
  if (translation) parts.push("translation");
  if (hit.hasSummary) parts.push("summary");
  return parts;
}
