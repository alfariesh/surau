// Teks Latin bahasa Indonesia untuk pencarian terjemahan dan ringkasan AI (S14, ADR-044).
// Terpisah dari normalisasi Arab (`normalize.ts`): aturan Arab dan NORM_VERSION tidak berlaku di
// sini. Indeks (`translation_fts`, `summary_fts`) dan kueri memakai fungsi yang SAMA
// (`latinIndexText`, `planLatinQuery`, `findLatinSpans`); setiap perubahan aturan menaikkan
// `LATIN_NORM_VERSION` dan berarti membangun ulang indeks (versi korpus baru).
//
// Langkah: token Latin (huruf Latin termasuk diakritik transliterasi + angka ASCII; apostrof di
// tengah kata ikut kata) → bentuk normal (NFKD tanpa tanda diakritik, huruf kecil, apostrof
// dibuang: mu'amalah = muamalah, ṣabr = sabr) → stopword kecil dibuang → stem ringan
// (`stemIndonesian`). Huruf Arab dan digit Arab-India (penanda catatan kaki `(١)`) bukan token.

/** Versi aturan teks Latin; disimpan di `meta.latin_norm_version` korpus. */
export const LATIN_NORM_VERSION = 1;

/** Batas kata kueri Indonesia (setelah stopword dibuang). */
export const LATIN_MAX_TERMS = 16;

// Apostrof dan tanda 'ain/hamzah transliterasi di tengah kata: ' ’ ʼ ʿ ʾ ‘ `
const JOINERS = "'’ʼʿʾ‘`";
const WORD = new RegExp(
  `[\\p{Script=Latin}0-9][\\p{Script=Latin}\\p{M}0-9]*(?:[${JOINERS}][\\p{Script=Latin}\\p{M}0-9]+)*`,
  "gu",
);
const MARKS = /\p{M}/gu;
const JOINER_CHARS = new RegExp(`[${JOINERS}]`, "g");
const HAS_JOINER = new RegExp(`[${JOINERS}]`, "u");

// Kata fungsi yang sangat sering dan tidak membawa makna pencarian (dicek pada bentuk normal,
// SEBELUM stem): preposisi + bentuk berkata gantinya (kepadanya), kata ganti orang, kata sambung,
// dan kata bantu. Kata bermakna seperti "allah", "orang", atau "hati" tetap diindeks. Karena dicek
// sebelum stem, kata turunan tetap terindeks (aku dibuang, mengaku → "aku" tetap ada).
const PREPOSITIONS = [
  "di",
  "ke",
  "dari",
  "pada",
  "kepada",
  "dalam",
  "untuk",
  "dengan",
  "terhadap",
  "oleh",
  "bagi",
  "atas",
  "daripada",
  "tentang",
  "mengenai",
  "antara",
] as const;
const PRONOUNS = [
  "aku",
  "engkau",
  "kamu",
  "kalian",
  "kami",
  "kita",
  "mereka",
  "ia",
  "dia",
] as const;
const FUNCTION_WORDS = [
  "yang",
  "dan",
  "atau",
  "serta",
  "juga",
  "itu",
  "ini",
  "itulah",
  "inilah",
  "adalah",
  "ialah",
  "merupakan",
  "ada",
  "adapun",
  "bahwa",
  "akan",
  "telah",
  "sudah",
  "sedang",
  "sedangkan",
  "tetapi",
  "namun",
  "melainkan",
  "maka",
  "lalu",
  "kemudian",
  "karena",
  "jika",
  "bila",
  "apabila",
  "agar",
  "supaya",
  "hingga",
  "sampai",
  "seperti",
  "sebagai",
  "demikian",
  "tersebut",
  "termasuk",
  "maupun",
  "meskipun",
  "walaupun",
  "hendaklah",
  "hendaknya",
  "dapat",
  "tidak",
  "tidaklah",
  "bukan",
  "bukanlah",
  "jangan",
  "janganlah",
  "apa",
  "apakah",
  "para",
  "sang",
  "si",
  "pun",
  "lah",
  "nya",
] as const;

export const ID_STOPWORDS: ReadonlySet<string> = new Set([
  ...PREPOSITIONS,
  ...PREPOSITIONS.flatMap((p) => [`${p}nya`, `${p}mu`, `${p}ku`]),
  ...PRONOUNS,
  ...PRONOUNS.flatMap((p) => [`${p}lah`, `${p}pun`]),
  ...FUNCTION_WORDS,
]);

/**
 * Kata pembingkai pertanyaan (S15, ADR-045): membentuk pertanyaan pengguna ("cara …", "bagaimana
 * …", "di mana al-Ghazali membahas …") tetapi jarang ada di teks jawaban, jadi mewajibkannya (AND)
 * membuang bagian yang tepat. Temuan eval S15 (soal r03): "cara khusyuk dalam salat" hanya cocok 5
 * halaman (yang memuat "cara") dan bab khusyuk tidak masuk 50 teratas. HANYA dibuang dari kueri, dan
 * hanya bila masih ada kata lain; indeks tidak berubah, jadi `LATIN_NORM_VERSION` tetap. Dicek pada
 * bentuk normal sebelum stem, dan hanya untuk token tanpa apostrof ("ma'na" = makna, bukan "mana").
 * "al" dan "imam" ikut dibuang hanya bila menempel tepat sebelum "ghazali" (`planLatinQuery`);
 * "imam" sendiri tetap dicari (imamah salat adalah topik).
 */
export const ID_QUERY_FRAMING: ReadonlySet<string> = new Set([
  "cara",
  "caranya",
  "bagaimana",
  "bagaimanakah",
  "mengapa",
  "kenapa",
  "dimana",
  "dimanakah",
  "mana",
  "manakah",
  "bolehkah",
  "siapa",
  "siapakah",
  "kapan",
  "kapankah",
  "menurut",
  "membahas",
  "dibahas",
  "pembahasan",
  "menjelaskan",
  "dijelaskan",
  "penjelasan",
  "menerangkan",
  "diterangkan",
  "ghazali",
]);

/**
 * Ejaan lain istilah keagamaan → ejaan baku terjemahan (glosarium `glossary-v1`, KBBI). Dipakai di
 * indeks DAN kueri sebelum stem, jadi "taubat" menemukan "tobat" dan "shalat" menemukan "salat".
 * Hanya varian ejaan, bukan sinonim.
 */
export const ID_VARIANTS: ReadonlyMap<string, string> = new Map([
  ["taubat", "tobat"],
  ["taubah", "tobat"],
  ["shalat", "salat"],
  ["sholat", "salat"],
  ["solat", "salat"],
  ["shalah", "salat"],
  ["dzikir", "zikir"],
  ["dzikr", "zikir"],
  ["zikr", "zikir"],
  ["wudhu", "wudu"],
  ["wudlu", "wudu"],
  ["shadaqah", "sedekah"],
  ["sadaqah", "sedekah"],
  ["shodaqoh", "sedekah"],
  ["sodaqoh", "sedekah"],
  ["ghibah", "gibah"],
  ["ridha", "rida"],
  ["ridho", "rida"],
  ["takabbur", "takabur"],
  ["tawakkal", "tawakal"],
  ["tawakkul", "tawakal"],
  ["taqwa", "takwa"],
  ["makrifat", "marifat"],
  ["marifah", "marifat"],
  ["khusyu", "khusyuk"],
  ["tawaduk", "tawadhu"],
  ["tawadu", "tawadhu"],
  ["itikaf", "iktikaf"],
  ["tahajjud", "tahajud"],
  ["qanaah", "kanaah"],
  ["ijma", "ijmak"],
  ["qiyas", "kias"],
  ["fiqh", "fikih"],
  ["fiqih", "fikih"],
  ["hadits", "hadis"],
  ["hadith", "hadis"],
  ["sunnah", "sunah"],
  ["ikhlash", "ikhlas"],
  ["niyyah", "niat"],
  ["niyat", "niat"],
  ["akherat", "akhirat"],
  ["syaitan", "setan"],
  ["syetan", "setan"],
  ["syaithan", "setan"],
  ["roh", "ruh"],
  ["dunya", "dunia"],
  ["sabr", "sabar"],
  ["shabr", "sabar"],
  ["syukr", "syukur"],
  ["zuhd", "zuhud"],
  ["tawhid", "tauhid"],
]);

/** Token Latin di teks asli: rentang `[start, end)` + bentuk normal. */
export interface LatinToken {
  start: number;
  end: number;
  norm: string;
}

/** Bentuk normal satu kata: tanpa diakritik dan apostrof, huruf kecil. */
export function normalizeLatinWord(word: string): string {
  return word.normalize("NFKD").replace(MARKS, "").replace(JOINER_CHARS, "").toLowerCase();
}

/** Semua token Latin di `text` dalam urutan teks (rentang = indeks string JS di teks asli). */
export function latinTokens(text: string): LatinToken[] {
  const out: LatinToken[] = [];
  for (const m of text.matchAll(WORD)) {
    const norm = normalizeLatinWord(m[0]);
    if (norm !== "") out.push({ start: m.index, end: m.index + m[0].length, norm });
  }
  return out;
}

// ── Stem ringan (algoritme Tala 2003, seperti IndonesianStemmer Lucene) ───────────────────────
// Partikel (-kah/-lah/-tah/-pun) → kata ganti milik (-ku/-mu/-nya) → awalan + akhiran (me-, pe-,
// di-, ter-, ke-, ber-, per-; -kan/-an/-i), hanya selama kata masih > 2 suku kata (jumlah vokal).
// Tanpa kamus kata dasar, jadi ada salah potong yang diketahui (menikah → ikah); karena indeks dan
// kueri memakai fungsi yang sama, salah potong hanya merugikan bila dua kata berbeda bertabrakan.
// Kata dasar berakhiran mirip partikel/kata ganti dilindungi daftar kecil di bawah.

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** Akhiran kata dasar yang mirip partikel: jangan dipotong (sedekah ≠ sede + kah). */
const PARTICLE_ROOTS = [
  "llah", // allah, abdullah, rasulullah
  "sedekah",
  "masalah",
  "sekolah",
  "istilah",
  "salah",
  "kalah",
  "nikah",
  "berkah",
  "nafkah",
  "jumlah",
  "olah",
  "ampun",
] as const;

/** Akhiran kata dasar yang mirip kata ganti milik: jangan dipotong (berilmu ≠ beril + mu). */
const POSSESSIVE_ROOTS = [
  "ilmu",
  "temu",
  "tamu",
  "jamu",
  "ramu",
  "laku",
  "buku",
  "suku",
  "aku",
  "ragu",
  "tanya", // bertanya ≠ berta + nya
  "punya",
] as const;

/**
 * Kata yang awalannya TIDAK dibuang karena kata dasarnya bertabrakan dengan kata lain yang
 * bermakna jauh (ditemukan saat meninjau kosakata terjemahan Ihya, ADR-044): perhatian ≠ hati,
 * berdiri ≠ diri, kedudukan ≠ duduk, pendapat ≠ dapat, penduduk ≠ duduk, permata ≠ mata.
 */
const KEEP_PREFIX = [
  "perhati",
  "berdiri",
  "terdiri",
  "keduduk",
  "penduduk",
  "pendapat",
  "permata",
] as const;

const FIRST_PREFIX = { MENG: 1, PENG: 2, DI: 4, TER: 8, KE: 16 } as const;
const SECOND_PREFIX = { BER: 32, PE: 64 } as const;

class Stem {
  word: string;
  syllables: number;
  flags = 0;

  constructor(word: string) {
    this.word = word;
    // Kata sudah a–z murni (dicek `stemIndonesian`): satu karakter = satu unit kode.
    this.syllables = word.split("").filter((c) => VOWELS.has(c)).length;
  }

  private cutEnd(n: number): true {
    this.word = this.word.slice(0, -n);
    this.syllables--;
    return true;
  }

  private cutStart(n: number, flag: number, replace = ""): true {
    this.word = replace + this.word.slice(n);
    this.syllables--;
    this.flags |= flag;
    return true;
  }

  private vowelAt(i: number): boolean {
    return VOWELS.has(this.word[i] ?? "");
  }

  particle(): boolean {
    const w = this.word;
    if (this.syllables <= 2 || PARTICLE_ROOTS.some((r) => w.endsWith(r))) return false;
    return /(?:kah|lah|tah|pun)$/.test(w) && this.cutEnd(3);
  }

  possessive(): boolean {
    const w = this.word;
    if (this.syllables <= 2 || POSSESSIVE_ROOTS.some((r) => w.endsWith(r))) return false;
    if (w.endsWith("nya")) return this.cutEnd(3);
    return (w.endsWith("ku") || w.endsWith("mu")) && this.cutEnd(2);
  }

  keepsPrefix(): boolean {
    return KEEP_PREFIX.some((k) => this.word.startsWith(k));
  }

  firstPrefix(): boolean {
    if (this.syllables <= 2 || this.keepsPrefix()) return false;
    const w = this.word;
    const { MENG, PENG, DI, TER, KE } = FIRST_PREFIX;
    if (w.startsWith("meng")) return this.cutStart(4, MENG);
    if (w.startsWith("meny") && this.vowelAt(4)) return this.cutStart(4, MENG, "s");
    if (w.startsWith("men") || w.startsWith("mem")) return this.cutStart(3, MENG);
    if (w.startsWith("me")) return this.cutStart(2, MENG);
    if (w.startsWith("peng")) return this.cutStart(4, PENG);
    if (w.startsWith("peny") && this.vowelAt(4)) return this.cutStart(4, PENG, "s");
    if (w.startsWith("pen") && this.vowelAt(3)) return this.cutStart(3, PENG, "t");
    if (w.startsWith("pen") || w.startsWith("pem")) return this.cutStart(3, PENG);
    if (w.startsWith("di")) return this.cutStart(2, DI);
    if (w.startsWith("ter")) return this.cutStart(3, TER);
    if (w.startsWith("ke")) return this.cutStart(2, KE);
    return false;
  }

  secondPrefix(): boolean {
    if (this.syllables <= 2 || this.keepsPrefix()) return false;
    const w = this.word;
    const { BER, PE } = SECOND_PREFIX;
    if (w.startsWith("ber")) return this.cutStart(3, BER);
    if (w === "belajar") return this.cutStart(3, BER);
    if (/^be[^aeiou]er/.test(w)) return this.cutStart(2, BER);
    if (w.startsWith("per")) return this.cutStart(3, 0);
    if (w === "pelajar") return this.cutStart(3, 0);
    if (w.startsWith("pe")) return this.cutStart(2, PE);
    return false;
  }

  suffix(): boolean {
    if (this.syllables <= 2) return false;
    const w = this.word;
    const f = this.flags;
    const { MENG, PENG, DI, TER, KE } = FIRST_PREFIX;
    const { BER, PE } = SECOND_PREFIX;
    if (w.endsWith("kan") && (f & (KE | PENG | PE)) === 0) return this.cutEnd(3);
    if (w.endsWith("an") && (f & (DI | MENG | TER)) === 0) return this.cutEnd(2);
    if (w.endsWith("i") && !w.endsWith("si") && (f & (BER | KE | PENG)) === 0) {
      return this.cutEnd(1);
    }
    return false;
  }
}

/**
 * Stem ringan satu kata NORMAL (`normalizeLatinWord`). Kata berisi angka, atau bukan huruf a–z,
 * dikembalikan apa adanya.
 */
export function stemIndonesian(word: string): string {
  if (!/^[a-z]+$/.test(word)) return word;
  const s = new Stem(word);
  s.particle();
  s.possessive();
  if (s.firstPrefix()) {
    if (s.suffix()) s.secondPrefix();
  } else {
    s.secondPrefix();
    s.suffix();
  }
  return s.word;
}

/** Istilah indeks satu token normal: `null` bila stopword; ejaan lain diseragamkan sebelum dan sesudah stem. */
export function latinTerm(norm: string): string | null {
  if (ID_STOPWORDS.has(norm)) return null;
  const stem = stemIndonesian(ID_VARIANTS.get(norm) ?? norm);
  // Juga sesudah stem: bertaubat → taubat → tobat, shalatnya → shalat → salat.
  return ID_VARIANTS.get(stem) ?? stem;
}

/**
 * Isi kolom indeks FTS untuk satu teks: stem setiap token Latin non-stopword, dipisah spasi.
 * Pemanggil membuang dulu bagian yang bukan teks AI (placeholder ayat `⟦QS s:a⟧`).
 */
export function latinIndexText(text: string): string {
  return latinTokens(text)
    .map((t) => latinTerm(t.norm))
    .filter((t): t is string => t !== null)
    .join(" ");
}

/** Rencana kueri Indonesia: kata yang dicari (tanpa stopword) dan stem-nya (unik, urut kueri). */
export interface LatinQueryPlan {
  words: string[];
  stems: string[];
}

/**
 * Rencana kueri Indonesia dari bagian Latin kueri. `null` bila tidak ada kata yang dicari (kosong
 * atau hanya stopword). Kata pembingkai pertanyaan (`ID_QUERY_FRAMING`) dibuang bila ada kata
 * lain. Lebih dari `LATIN_MAX_TERMS` kata → RangeError.
 */
export function planLatinQuery(query: string): LatinQueryPlan | null {
  const tokens = latinTokens(query);
  const framing = tokens.map(
    (t) => ID_QUERY_FRAMING.has(t.norm) && !HAS_JOINER.test(query.slice(t.start, t.end)),
  );
  // "al-Ghazali", "Imam al-Ghazali": artikel dan gelar yang menempel (spasi/tanda hubung saja).
  for (const [i, t] of tokens.entries()) {
    if (t.norm !== "ghazali" || framing[i] !== true) continue;
    for (let j = i; j > 0; j--) {
      const prev = tokens[j - 1];
      const cur = tokens[j];
      if (prev === undefined || cur === undefined) break;
      if (prev.norm !== "al" && prev.norm !== "imam") break;
      if (!/^[\s\-\u2010-\u2013]*$/u.test(query.slice(prev.end, cur.start))) break;
      framing[j - 1] = true;
    }
  }
  const found: { norm: string; term: string; framing: boolean }[] = [];
  for (const [i, t] of tokens.entries()) {
    const term = latinTerm(t.norm);
    if (term !== null) found.push({ norm: t.norm, term, framing: framing[i] === true });
  }
  // Kata pembingkai dibuang hanya bila masih ada kata lain ("cara" saja tetap dicari).
  const kept = found.some((f) => !f.framing) ? found.filter((f) => !f.framing) : found;
  const words = kept.map((f) => f.norm);
  const stems: string[] = [];
  for (const f of kept) if (!stems.includes(f.term)) stems.push(f.term);
  if (stems.length === 0) return null;
  if (words.length > LATIN_MAX_TERMS) {
    throw new RangeError(`kueri terlalu panjang: ${words.length} kata (maks ${LATIN_MAX_TERMS})`);
  }
  return { words, stems };
}

/**
 * Ekspresi MATCH FTS5: `all` = setiap stem harus ada (AND), `any` = salah satu (OR). Setiap stem
 * dikutip sebagai string FTS5, jadi masukan pengguna tidak pernah menjadi sintaks.
 */
export function latinMatchExpression(plan: LatinQueryPlan, mode: "all" | "any"): string {
  return plan.stems.map((s) => `"${s}"`).join(mode === "all" ? " " : " OR ");
}

/**
 * Kemunculan stem kueri di `text` (token yang stem-nya sama), urut, paling banyak `limit`. Rentang
 * = indeks string JS di teks asli, jadi `text.slice(start, end)` adalah kata persis di teks.
 */
export function findLatinSpans(
  text: string,
  plan: LatinQueryPlan,
  limit: number = Number.POSITIVE_INFINITY,
): { start: number; end: number }[] {
  const want = new Set(plan.stems);
  const out: { start: number; end: number }[] = [];
  for (const t of latinTokens(text)) {
    if (out.length >= limit) break;
    const term = latinTerm(t.norm);
    if (term !== null && want.has(term)) out.push({ start: t.start, end: t.end });
  }
  return out;
}
