// Judul subjudul kurasi pembaca untuk daftar isi (X04 bagian B W7–W8). Daftar kurasi
// (`data/patches/<kitab>-subjudul.json`, ADR-074) hanya memuat nomor paragraf dan offset; judulnya
// selalu disalin kode dari `text_raw` di offset itu (teks-arab.md aturan 1), dipakai bersama daftar
// isi pembaca (web) dan permintaan judul Indonesia (ingest). Tanpa teks Arab di sini.

/** Bentuk minimal entri daftar kurasi yang menentukan judul. */
export type SubheadingSpanEntry =
  | { kind: "heading"; of?: number }
  | { kind: "lead"; end: number }
  | { kind: "tail"; start: number; node?: number }
  | { kind: "plain" };

/** Satu subjudul di daftar isi pembaca: paragraf jangkarnya + bagian-bagian teks judulnya. */
export interface SubheadingTocTarget {
  /** Nomor jangkar `#pN` paragraf subjudul (kunci judul Indonesia). */
  seq: number;
  /** Paragraf penyusun judul, urut: paragraf subjudul lalu lanjutannya (`of`). */
  parts: { seq: number; start: number | null; end: number | null }[];
}

/**
 * Subjudul yang tampil sebagai baris daftar isi: subjudul utuh (tanpa `of`) beserta lanjutannya,
 * subjudul di awal paragraf, dan subjudul di akhir paragraf yang bukan judul node (`node`; node itu
 * sudah ada di daftar isi). `plain` dan lanjutan yang induknya tidak ada dilewati. Urut `seq`.
 */
export function subheadingTocTargets(
  entries: ReadonlyMap<number, SubheadingSpanEntry>,
): SubheadingTocTarget[] {
  const out = new Map<number, SubheadingTocTarget>();
  // Lanjutan bisa berantai (lanjutan dari lanjutan): cari paragraf judul pertamanya.
  const rootOf = (seq: number, depth = 0): number | null => {
    const e = entries.get(seq);
    if (e === undefined || e.kind !== "heading" || depth > entries.size) return null;
    return e.of === undefined ? seq : rootOf(e.of, depth + 1);
  };
  for (const seq of [...entries.keys()].sort((a, b) => a - b)) {
    const e = entries.get(seq)!;
    if (e.kind === "plain" || (e.kind === "tail" && e.node !== undefined)) continue;
    if (e.kind === "heading" && e.of !== undefined) {
      const root = rootOf(seq);
      const target = root === null ? undefined : out.get(root);
      target?.parts.push({ seq, start: null, end: null });
      continue;
    }
    const part =
      e.kind === "lead"
        ? { seq, start: null, end: e.end }
        : e.kind === "tail"
          ? { seq, start: e.start, end: null }
          : { seq, start: null, end: null };
    out.set(seq, { seq, parts: [part] });
  }
  return [...out.values()];
}

/**
 * Teks satu bagian judul: `text_raw[start, end)` tanpa penanda catatan kaki (rentang
 * `footnote_ref`), spasi tepi dibuang. Huruf Arab tidak diubah; hanya penanda yang dilewati.
 */
export function subheadingPartText(
  text: string,
  part: { start: number | null; end: number | null },
  markers: readonly { char_start: number; char_end: number }[] = [],
): string {
  const from = part.start ?? 0;
  const to = part.end ?? text.length;
  let out = "";
  let at = from;
  for (const m of [...markers].sort((a, b) => a.char_start - b.char_start)) {
    if (m.char_end <= at || m.char_start >= to) continue;
    out += text.slice(at, Math.max(at, m.char_start));
    at = Math.max(at, m.char_end);
  }
  out += text.slice(at, to);
  return out.trim();
}

/**
 * Judul lengkap satu subjudul daftar isi: bagian-bagian `target` disambung satu spasi, berhenti di
 * paragraf pertama yang tidak ada atau usang (`part` = null). Dipakai web dan ingest, jadi sidik
 * judul yang diterjemahkan (ingest) sama dengan judul yang tampil (web). Kosong = tidak ada judul.
 */
export function subheadingTitle(
  target: SubheadingTocTarget,
  part: (
    seq: number,
  ) => { text: string; markers: readonly { char_start: number; char_end: number }[] } | null,
): string {
  const texts: string[] = [];
  for (const p of target.parts) {
    const row = part(p.seq);
    if (row === null) break;
    texts.push(subheadingPartText(row.text, p, row.markers));
  }
  return texts.filter((t) => t !== "").join(" ");
}
