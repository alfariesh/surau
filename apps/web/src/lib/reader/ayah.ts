import type { AyahRef } from "@surau/core";

// Label rujukan ayat yang dipakai komponen server (terjemahan AI) dan klien (chip rujukan).

/** "QS 2:255" / "QS 2:255–257": label ringkas di dalam teks Arab. */
export function shortAyahLabel(r: Pick<AyahRef, "surah" | "ayah_from" | "ayah_to">): string {
  return `QS ${r.surah}:${r.ayah_to > r.ayah_from ? `${r.ayah_from}–${r.ayah_to}` : r.ayah_from}`;
}
