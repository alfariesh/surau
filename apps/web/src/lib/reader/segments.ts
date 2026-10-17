import type { AyahRef, FootnoteRef } from "@surau/core";

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

// ── Kutipan ayat (S12) ─────────────────────────────────────────────────────────────────────
// Potongan teks/penanda di dalam kutipan ayat diberi indeks rujukannya (untuk gaya halus), dan
// sesudah akhir setiap kutipan disisipkan segmen `ayah-end` (tempat label rujukan "QS 2:255").
// Teks tetap hanya dipotong di offset DB: gabungan semua `text` = `text_raw` (diuji).

export type PassageSegment =
  | (Extract<Segment, { kind: "text" }> & { ayah: number | null })
  | (Extract<Segment, { kind: "marker" }> & { ayah: number | null })
  | { kind: "ayah-end"; ayah: number };

/**
 * Rujukan ayat yang bisa dirender: urut, di dalam teks, tidak kosong, tidak tumpang tindih, dan
 * batasnya tidak jatuh di tengah penanda catatan kaki. Sisanya dibiarkan sebagai teks biasa.
 */
export function usableAyahRefs(
  textRaw: string,
  footnoteRefs: readonly FootnoteRef[],
  ayahRefs: readonly AyahRef[],
): AyahRef[] {
  const inMarker = (pos: number) =>
    footnoteRefs.some((f) => pos > f.char_start && pos < f.char_end);
  const out: AyahRef[] = [];
  let at = 0;
  for (const a of ayahRefs.toSorted((x, y) => x.char_start - y.char_start)) {
    if (a.char_start < at || a.char_end > textRaw.length || a.char_end <= a.char_start) continue;
    if (inMarker(a.char_start) || inMarker(a.char_end)) continue;
    out.push(a);
    at = a.char_end;
  }
  return out;
}

export function splitPassage(
  textRaw: string,
  footnoteRefs: readonly FootnoteRef[],
  ayahRefs: readonly AyahRef[],
): { segments: PassageSegment[]; ayat: AyahRef[] } {
  const ayat = usableAyahRefs(textRaw, footnoteRefs, ayahRefs);
  const owner = (start: number, end: number): number | null => {
    const i = ayat.findIndex((a) => start >= a.char_start && end <= a.char_end);
    return i === -1 ? null : i;
  };
  const endsAt = new Map(ayat.map((a, i) => [a.char_end, i]));
  const bounds = [...new Set(ayat.flatMap((a) => [a.char_start, a.char_end]))].sort(
    (x, y) => x - y,
  );
  const segments: PassageSegment[] = [];
  const closeAt = (pos: number) => {
    const i = endsAt.get(pos);
    if (i !== undefined) segments.push({ kind: "ayah-end", ayah: i });
  };
  let pos = 0;
  for (const s of splitByFootnotes(textRaw, footnoteRefs)) {
    const end = pos + s.text.length;
    if (s.kind === "marker") {
      segments.push({ ...s, ayah: owner(pos, end) });
    } else {
      let at = pos;
      for (const b of [...bounds.filter((b) => b > pos && b < end), end]) {
        segments.push({ kind: "text", text: textRaw.slice(at, b), ayah: owner(at, b) });
        if (b < end) closeAt(b);
        at = b;
      }
    }
    pos = end;
    closeAt(pos);
  }
  return { segments, ayat };
}
