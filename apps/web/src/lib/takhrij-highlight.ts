// Potongan teks takhrij untuk sorotan istilah (X07): teks SELALU potongan `text_raw` DB lewat
// rentang istilah (aturan teks-arab no. 1); tidak ada teks yang disusun ulang.
export interface HighlightTerm {
  char_start: number;
  char_end: number;
  gloss: string;
}

export type HighlightPiece = { text: string; term: null } | { text: string; term: HighlightTerm };

/** Bagi teks menjadi potongan biasa dan potongan istilah (urut; tumpang tindih/di luar teks dilewati). */
export function highlightPieces(text: string, terms: readonly HighlightTerm[]): HighlightPiece[] {
  const out: HighlightPiece[] = [];
  let cursor = 0;
  for (const term of [...terms].sort((a, b) => a.char_start - b.char_start)) {
    if (term.char_start < cursor || term.char_end > text.length || term.char_end <= term.char_start)
      continue;
    if (term.char_start > cursor)
      out.push({ text: text.slice(cursor, term.char_start), term: null });
    out.push({ text: text.slice(term.char_start, term.char_end), term });
    cursor = term.char_end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), term: null });
  return out;
}
