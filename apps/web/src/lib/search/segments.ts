// Potongan teks hasil Cari (S14) menjadi segmen untuk dirender: teks biasa, sorotan (<mark>), dan
// placeholder ayat ⟦QS s:a⟧ di teks AI (dirender sebagai label rujukan, bukan teks model).
// Semua teks segmen adalah irisan persis teks masukan: untuk potongan Arab, irisan `text_raw`
// (sorotan hanya membungkus, tidak mengubah huruf).

export type TextSegment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string }
  | { kind: "ayah"; ref: string; text: string };

export interface Range {
  char_start: number;
  char_end: number;
}

const PLACEHOLDER = /⟦QS (\d{1,3}:\d{1,3}(?:-\d{1,3})?)⟧/g;

/**
 * Pecah `snippet` (yang dimulai di `offset` teks utuh) menurut sorotan berkoordinat teks utuh.
 * Sorotan di luar potongan dipotong; yang tumpang tindih atau terbalik dilewati.
 */
export function markSegments(
  snippet: string,
  offset: number,
  highlights: readonly Range[],
): TextSegment[] {
  const out: TextSegment[] = [];
  let at = 0;
  const sorted = [...highlights].sort((a, b) => a.char_start - b.char_start);
  for (const h of sorted) {
    const start = Math.max(h.char_start - offset, at);
    const end = Math.min(h.char_end - offset, snippet.length);
    if (end <= start) continue;
    if (start > at) out.push({ kind: "text", text: snippet.slice(at, start) });
    out.push({ kind: "mark", text: snippet.slice(start, end) });
    at = end;
  }
  if (at < snippet.length) out.push({ kind: "text", text: snippet.slice(at) });
  return out;
}

/** Seperti `markSegments`, lalu placeholder ayat di segmen teks dipisah menjadi segmen `ayah`. */
export function aiSegments(
  snippet: string,
  offset: number,
  highlights: readonly Range[],
): TextSegment[] {
  return markSegments(snippet, offset, highlights).flatMap((s): TextSegment[] => {
    if (s.kind !== "text") return [s];
    const parts: TextSegment[] = [];
    let at = 0;
    for (const m of s.text.matchAll(PLACEHOLDER)) {
      if (m.index > at) parts.push({ kind: "text", text: s.text.slice(at, m.index) });
      parts.push({ kind: "ayah", ref: (m[1] ?? "").replace("-", "–"), text: m[0] });
      at = m.index + m[0].length;
    }
    if (at < s.text.length) parts.push({ kind: "text", text: s.text.slice(at) });
    return parts;
  });
}

/**
 * Tautan ke paragraf di pembaca dengan kueri di `?q=` (pembaca menyorot kata yang dicari):
 * `/kitab/ihya/1/200#p2824` → `/kitab/ihya/1/200?q=sabar#p2824`.
 */
export function readerHref(permalink: string, query: string): string {
  const hash = permalink.indexOf("#");
  const path = hash < 0 ? permalink : permalink.slice(0, hash);
  const fragment = hash < 0 ? "" : permalink.slice(hash);
  return `${path}?${new URLSearchParams({ q: query }).toString()}${fragment}`;
}

/** URL halaman Cari yang bisa dibagikan: `?q=` dan (bila ada) `bagian=` (node daftar isi). */
export function searchPageHref(query: string, section: number | null): string {
  const params = new URLSearchParams();
  if (query.trim() !== "") params.set("q", query.trim());
  if (section !== null) params.set("bagian", String(section));
  const qs = params.toString();
  return qs === "" ? "/cari" : `/cari?${qs}`;
}

/** URL API untuk satu halaman hasil. */
export function searchApiUrl(
  query: string,
  section: number | null,
  offset: number,
  limit: number,
): string {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (section !== null) params.set("section", String(section));
  if (offset > 0) params.set("offset", String(offset));
  return `/api/search?${params.toString()}`;
}

/** Nilai `bagian` dari URL: bilangan bulat positif, selain itu null. */
export function parseSection(raw: string | null): number | null {
  if (raw === null || !/^[1-9]\d{0,8}$/.test(raw)) return null;
  return Number(raw);
}
