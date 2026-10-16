import type { FootnoteRef } from "@surau/core";

// Memecah `text_raw` paragraf badan menjadi potongan teks biasa dan penanda catatan kaki `(١)`.
// Hanya memotong di offset dari DB (footnote_ref); tidak ada karakter yang diubah, ditambah, atau
// dibuang, jadi gabungan semua `text` selalu sama persis dengan `text_raw` (diuji).

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "marker"; text: string; marker: string; footnoteId: number; charStart: number };

export function splitByFootnotes(textRaw: string, refs: readonly FootnoteRef[]): Segment[] {
  const sorted = refs.toSorted((a, b) => a.char_start - b.char_start);
  const segments: Segment[] = [];
  let at = 0;
  for (const ref of sorted) {
    // Offset di luar teks atau tumpang tindih = data rusak: biarkan sebagai teks biasa, jangan
    // menebak. Penanda lain tetap dipotong.
    if (ref.char_start < at || ref.char_end > textRaw.length || ref.char_end <= ref.char_start) {
      continue;
    }
    if (ref.char_start > at)
      segments.push({ kind: "text", text: textRaw.slice(at, ref.char_start) });
    segments.push({
      kind: "marker",
      text: textRaw.slice(ref.char_start, ref.char_end),
      marker: ref.marker,
      footnoteId: ref.footnote_id,
      charStart: ref.char_start,
    });
    at = ref.char_end;
  }
  if (at < textRaw.length) segments.push({ kind: "text", text: textRaw.slice(at) });
  return segments;
}
