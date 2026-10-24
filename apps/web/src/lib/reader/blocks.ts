import { verseBounds } from "@surau/core";

import type { PassageSegment } from "./segments";

// Tata letak di dalam satu paragraf (X04 W4): subjudul yang menempel di awal/akhir paragraf (offset
// dari daftar kurasi) dan bait syair (dua *syatr* dipisah " ... " di sumber). Teks hanya dipotong di
// offset: gabungan teks semua blok selalu sama persis dengan `text_raw` (diuji), termasuk pemisah
// bait yang tetap ada di DOM (disembunyikan secara visual, ikut tersalin).

// Aturan bait syair satu sumber di @surau/core (dipakai juga jenis kutipan Intisari, X15b).
export { SYATR_MAX_CHARS, VERSE_SEPARATOR, verseBounds } from "@surau/core";

export type BlockKind = "text" | "subheading" | "syatr" | "syatr-sep";

export interface Block {
  kind: BlockKind;
  segments: PassageSegment[];
}

/**
 * Potong segmen paragraf (`splitPassage`) di offset `bounds` (naik, di dalam teks) menjadi
 * `bounds.length + 1` kelompok. Label ayat (`ayah-end`) tetap di kelompok tempat kutipannya
 * berakhir. `null` bila ada batas yang jatuh di tengah penanda catatan kaki.
 */
export function cutSegments(
  segments: readonly PassageSegment[],
  bounds: readonly number[],
): PassageSegment[][] | null {
  const groups: PassageSegment[][] = [[]];
  let next = 0;
  // Pindah ke kelompok berikutnya untuk setiap batas yang sudah dilewati posisi `at`.
  const reach = (at: number) => {
    while (next < bounds.length && (bounds[next] as number) <= at) {
      groups.push([]);
      next++;
    }
  };
  const current = () => groups[groups.length - 1] as PassageSegment[];
  let pos = 0;
  for (const s of segments) {
    if (s.kind === "ayah-end") {
      current().push(s);
      continue;
    }
    const end = pos + s.text.length;
    const inner = bounds.filter((b) => b > pos && b < end);
    if (s.kind === "marker") {
      if (inner.length > 0) return null;
      reach(pos);
      current().push(s);
      pos = end;
      continue;
    }
    reach(pos);
    let at = pos;
    for (const b of inner) {
      current().push({ ...s, text: s.text.slice(at - pos, b - pos) });
      at = b;
      reach(at);
    }
    if (end > at) current().push({ ...s, text: s.text.slice(at - pos) });
    pos = end;
  }
  reach(pos);
  return groups.length === bounds.length + 1 ? groups : null;
}

export type SubSpan = { kind: "lead"; end: number } | { kind: "tail"; start: number };

/**
 * Blok tampil satu paragraf: subjudul awal/akhir (offset kurasi), bait syair, atau satu blok teks.
 * Bila potongan tidak sah (offset di luar teks atau di tengah penanda), paragraf tampil utuh.
 */
export function passageBlocks(
  textRaw: string,
  segments: readonly PassageSegment[],
  sub: SubSpan | null,
): Block[] {
  const whole: Block[] = [{ kind: "text", segments: [...segments] }];
  if (sub !== null) {
    const at = sub.kind === "lead" ? sub.end : sub.start;
    if (at <= 0 || at >= textRaw.length) return whole;
    const groups = cutSegments(segments, [at]);
    if (groups === null) return whole;
    const [a = [], b = []] = groups;
    return sub.kind === "lead"
      ? [
          { kind: "subheading", segments: a },
          { kind: "text", segments: b },
        ]
      : [
          { kind: "text", segments: a },
          { kind: "subheading", segments: b },
        ];
  }
  const bounds = verseBounds(textRaw);
  if (bounds === null) return whole;
  const groups = cutSegments(segments, bounds);
  if (groups === null) return whole;
  return groups.map((g, i) => ({ kind: i % 2 === 0 ? "syatr" : "syatr-sep", segments: g }));
}

/** Gabungan teks blok (tanpa label ayat): harus sama dengan `text_raw` (dipakai tes). */
export function blocksText(blocks: readonly Block[]): string {
  return blocks
    .flatMap((b) => b.segments)
    .map((s) => (s.kind === "ayah-end" ? "" : s.text))
    .join("");
}
