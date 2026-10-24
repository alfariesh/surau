// Pemecah kalimat teks Indonesia (terjemahan dan ringkasan AI di pembaca, X04). Deterministik dan
// hanya membaca tanda baca, tidak menebak makna: batas kalimat = `.`, `?`, atau `!` (boleh diikuti
// petik atau kurung tutup), lalu spasi, lalu huruf kapital (boleh didahului petik atau kurung
// buka); atau satu baris baru atau lebih. Singkatan yang lazim di terjemahan Surau ("saw.", "swt.",
// "ra.", "QS.", inisial satu huruf) tidak dianggap akhir kalimat, walaupun kata sesudahnya berhuruf
// kapital. Lebih baik dua kalimat tergabung daripada satu kalimat terpotong.

/** Rentang satu kalimat: `[start, end)` di teks asal, tanpa spasi di awal dan akhir. */
export interface SentenceSpan {
  start: number;
  end: number;
}

/** Singkatan (huruf kecil, tanpa titik) yang tidak mengakhiri kalimat. */
export const SENTENCE_ABBREVIATIONS: ReadonlySet<string> = new Set([
  "saw",
  "swt",
  "ra",
  "rah",
  "as",
  "qs",
  "hr",
  "dll",
  "dsb",
  "dkk",
  "hlm",
  "no",
  "w",
]);

const END = new Set([".", "?", "!"]);
const CLOSERS = new Set(['"', "”", "’", "'", ")", "]"]);
const OPENERS = new Set(['"', "“", "‘", "'", "(", "["]);
const UPPER = /\p{Lu}/u;
const SPACE = /\s/u;

/** Kata terakhir sebelum posisi `dot` (huruf Latin saja), untuk cek singkatan. */
function wordBefore(text: string, dot: number): string {
  let i = dot;
  while (i > 0 && /\p{L}/u.test(text[i - 1] as string)) i--;
  return text.slice(i, dot);
}

function isAbbreviation(text: string, dot: number): boolean {
  if (text[dot] !== ".") return false;
  const word = wordBefore(text, dot);
  if (word === "") return false;
  // Inisial satu huruf kapital (mis. "H." pada tahun Hijriah, "M." pada nama).
  if (word.length === 1 && UPPER.test(word)) return true;
  return SENTENCE_ABBREVIATIONS.has(word.toLowerCase());
}

/** Kalimat-kalimat `text`, urut, tanpa yang kosong. Teks tanpa batas = satu kalimat. */
export function indonesianSentences(text: string): SentenceSpan[] {
  const out: SentenceSpan[] = [];
  let start = 0;
  const push = (end: number) => {
    let s = start;
    let e = end;
    while (s < e && SPACE.test(text[s] as string)) s++;
    while (e > s && SPACE.test(text[e - 1] as string)) e--;
    if (e > s) out.push({ start: s, end: e });
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (ch === "\n") {
      push(i);
      while (i < text.length && SPACE.test(text[i] as string)) i++;
      start = i;
      continue;
    }
    if (END.has(ch) && !isAbbreviation(text, i)) {
      // Tanda akhir berturut-turut ("?!", "...") dan penutup petik/kurung ikut kalimat ini.
      let end = i + 1;
      while (
        end < text.length &&
        (END.has(text[end] as string) || CLOSERS.has(text[end] as string))
      ) {
        end++;
      }
      let next = end;
      let spaced = false;
      while (next < text.length && text[next] !== "\n" && SPACE.test(text[next] as string)) {
        next++;
        spaced = true;
      }
      let first = next;
      while (first < text.length && OPENERS.has(text[first] as string)) first++;
      if (spaced && first < text.length && UPPER.test(text[first] as string)) {
        push(end);
        start = next;
        i = next;
        continue;
      }
      i = end;
      continue;
    }
    i++;
  }
  push(text.length);
  return out;
}
