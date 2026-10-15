// Surau — normalisasi teks Arab untuk pencarian (FTS5 / D1) + peta offset mentah<->normal.
// Prinsip: teks mentah (bervokal, ber-HTML) TIDAK PERNAH diubah di DB. Yang diindeks adalah
// "bentuk cocok" (match form): token huruf/angka dipisah satu spasi. Setiap karakter bentuk
// cocok menyimpan indeks karakter mentah asalnya, sehingga span hasil cari/verifikasi kutipan
// bisa dipetakan balik ke teks mentah yang persis (untuk disalin verbatim, bukan ditulis LLM).

export interface NormalizeOptions {
  /** ؤ -> و, ئ -> ي (default true). Menyamakan ejaan مسئول/مسؤول, شيء/شىء. */
  hamzaSeats?: boolean;
  /** Hapus penanda catatan kaki "(١)" di badan teks (default true). */
  dropFootnoteRefs?: boolean;
}

export interface Normalized {
  /** Bentuk cocok: token dipisah satu spasi, tanpa spasi di awal/akhir. */
  text: string;
  /** map[j] = indeks (UTF-16) di string mentah asal karakter normal ke-j. Panjang = text.length. */
  map: Int32Array;
}

// Tanda yang dibuang (kategori Mn Arab + tatweel + karakter lebar-nol).
// U+0610–U+061A tanda kehormatan kecil, U+064B–U+065F harakat, U+0670 alif khanjariyah,
// U+06D6–U+06ED tanda waqaf/Qur'ani, U+0640 tatweel, U+200B–U+200F ZW*/LRM/RLM, U+FEFF BOM.
const DROP = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;

const LETTER_MAP: Record<string, string> = {
  "\u0622": "\u0627", // آ -> ا
  "\u0623": "\u0627", // أ -> ا
  "\u0625": "\u0627", // إ -> ا
  "\u0671": "\u0627", // ٱ -> ا
  "\u0672": "\u0627",
  "\u0673": "\u0627",
  "\u0649": "\u064A", // ى -> ي
  "\u06CC": "\u064A", // ی (Persia) -> ي
  "\u06A9": "\u0643", // ک -> ك
  "\u0629": "\u0647", // ة -> ه
};
const HAMZA_SEAT_MAP: Record<string, string> = { "\u0624": "\u0648", "\u0626": "\u064A" }; // ؤ->و, ئ->ي
// Ligatur ﷺ dan sejenisnya diekspansi agar bisa dicari sebagai kata.
const EXPAND: Record<string, string> = {
  "\uFDFA": "صلي الله عليه وسلم",
  "\uFDFB": "جل جلاله",
  "\uFDF2": "الله",
};

const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

export function normalizeArabic(raw: string, opts: NormalizeOptions = {}): Normalized {
  const hamzaSeats = opts.hamzaSeats ?? true;
  const dropRefs = opts.dropFootnoteRefs ?? true;
  const out: string[] = [];
  const map: number[] = [];
  let pendingSpace = false; // pemisah tertunda; dikolaps jadi satu spasi
  let spaceAt = 0;
  const emit = (s: string, at: number) => {
    if (pendingSpace && out.length > 0) { out.push(" "); map.push(spaceAt); }
    pendingSpace = false;
    for (const c of s) { out.push(c); map.push(at); }
  };
  const sep = (at: number) => { if (!pendingSpace) { pendingSpace = true; spaceAt = at; } };

  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    // 1) tag HTML -> pemisah
    if (ch === "<") {
      const end = raw.indexOf(">", i);
      if (end !== -1 && /^<\/?[a-zA-Z]/.test(raw.slice(i, i + 3))) { sep(i); i = end + 1; continue; }
    }
    // 2) penanda catatan kaki (١) / (12) -> dibuang
    if (dropRefs && ch === "(") {
      const m = /^\(\s*[\u0660-\u06690-9]{1,4}\s*\)/.exec(raw.slice(i, i + 10));
      if (m) { sep(i); i += m[0].length; continue; }
    }
    // 3) harakat/tatweel/ZW -> dibuang tanpa jejak (tidak memutus kata)
    if (DROP.test(ch)) { i++; continue; }
    // 4) ekspansi ligatur
    if (EXPAND[ch]) { sep(i); emit(EXPAND[ch], i); sep(i); i++; continue; }
    // 5) penyeragaman huruf + angka Arab-India -> ASCII
    let c = LETTER_MAP[ch] ?? (hamzaSeats ? HAMZA_SEAT_MAP[ch] : undefined) ?? ch;
    const cp = c.codePointAt(0)!;
    if (cp >= 0x0660 && cp <= 0x0669) c = String(cp - 0x0660);
    else if (cp >= 0x06F0 && cp <= 0x06F9) c = String(cp - 0x06F0);
    if (isWordChar(c)) emit(c.toLowerCase(), i);
    else sep(i); // tanda baca, spasi, \r, {}, garis ___ -> pemisah
    i++;
  }
  return { text: out.join(""), map: Int32Array.from(map) };
}

/** Petakan span [nStart, nEnd) di bentuk normal ke span mentah [rStart, rEnd). */
export function toRawSpan(raw: string, n: Normalized, nStart: number, nEnd: number): [number, number] {
  const rStart = n.map[nStart];
  let rEnd = n.map[nEnd - 1] + 1;
  // sertakan harakat/tatweel yang menempel di huruf terakhir (mis. الصَّبْرُ -> sampai dhammah)
  while (rEnd < raw.length && DROP.test(raw[rEnd])) rEnd++;
  return [rStart, rEnd];
}

// ---------------------------------------------------------------------------
// Stemming ringan: HANYA membuang proklitik (و/ف + ب/ك/ل + ال / لل). Tidak menyentuh sufiks.
// Deterministik, tanpa kamus; dipakai identik saat indeks & saat query.
const PROTECTED = new Map<string, string>([
  ["الله", "الله"], ["لله", "الله"], ["والله", "الله"], ["بالله", "الله"], ["فالله", "الله"],
  ["تالله", "الله"], ["وبالله", "الله"], ["ولله", "الله"], ["فلله", "الله"], ["اللهم", "اللهم"],
  ["الذي", "الذي"], ["التي", "التي"], ["الذين", "الذين"], ["اللذين", "اللذين"], ["اللتين", "اللتين"],
  ["اللاتي", "اللاتي"], ["اللائي", "اللائي"], ["اللايي", "اللاتي"],
]);

// Varian KONSERVATIF (dipakai): و/ف dibuang HANYA bila diikuti artikel (ال/لل/بال/كال);
// ب/ك/ل dibuang HANYA bersama artikel. Tidak ada kata dasar yang terpotong (فضيله tetap فضيله).
// Proklitik tanpa artikel (وصبر, بصبر) ditangani di sisi query lewat expandQueryToken().
export function stemToken(tok: string): string {
  const p = PROTECTED.get(tok);
  if (p) return p;
  let t = tok;
  if ((t[0] === "و" || t[0] === "ف") && /^(ال|لل|بال|كال)/.test(t.slice(1))) t = t.slice(1);
  for (const pre of ["بال", "كال", "لل", "ال"]) {
    if (t.startsWith(pre) && t.length - pre.length >= 2) { t = t.slice(pre.length); break; }
  }
  return t;
}

// Varian AGRESIF (Larkey light10, hanya prefiks) — untuk pembanding eksperimen saja.
export function stemTokenAggressive(tok: string): string {
  const p = PROTECTED.get(tok);
  if (p) return p;
  let t = tok;
  if ((t[0] === "و" || t[0] === "ف") && t.length >= 4) t = t.slice(1);
  for (const pre of ["بال", "كال", "لل", "ال"]) {
    if (t.startsWith(pre) && t.length - pre.length >= 2) { t = t.slice(pre.length); break; }
  }
  return t;
}

/** Ekspansi sisi-query: stem s -> {s, وs, فs, بs, كs, لs, وبs, فبs, ولs, فلs} (dicari di kolom stem). */
export function expandQueryToken(stem: string): string[] {
  if (PROTECTED.has(stem) || stem.length < 3) return [stem];
  const pre = ["", "و", "ف", "ب", "ك", "ل", "وب", "فب", "ول", "فل", "وك"];
  return pre.map((p) => p + stem);
}

export function stemText(normText: string): string {
  return normText.split(" ").filter(Boolean).map(stemToken).join(" ");
}

// ---------------------------------------------------------------------------
// Pemisahan badan teks vs catatan kaki Shamela (garis "_________" di baris sendiri).
export function splitFootnotes(raw: string): { body: string; footnotes: string; footStart: number } {
  const m = /\r?\n?\r?_{5,}\r?\n?/.exec(raw);
  if (!m) return { body: raw, footnotes: "", footStart: raw.length };
  return { body: raw.slice(0, m.index), footnotes: raw.slice(m.index + m[0].length), footStart: m.index + m[0].length };
}

// ---------------------------------------------------------------------------
// Verifikasi kutipan: cari kutipan (bisa bervokal/tanpa vokal) di teks mentah; kembalikan
// substring mentah yang persis (beserta harakat aslinya) — inilah yang ditampilkan ke user.
export function findQuote(raw: string, quote: string): { rawStart: number; rawEnd: number; rawText: string } | null {
  const n = normalizeArabic(raw);
  const q = normalizeArabic(quote).text;
  if (!q) return null;
  // batas kata: cocok harus mulai/akhir di batas token
  let from = 0;
  while (true) {
    const idx = n.text.indexOf(q, from);
    if (idx === -1) return null;
    const okL = idx === 0 || n.text[idx - 1] === " ";
    const okR = idx + q.length === n.text.length || n.text[idx + q.length] === " ";
    if (okL && okR) {
      const [rs, re] = toRawSpan(raw, n, idx, idx + q.length);
      return { rawStart: rs, rawEnd: re, rawText: raw.slice(rs, re) };
    }
    from = idx + 1;
  }
}

// ---------------------------------------------------------------------------
// Penyusun ekspresi MATCH FTS5 (aman dari injeksi sintaks: setiap token di-quote).
// Skema indeks yang diasumsikan: fts5(body, foot, sbody, sfoot) — body/foot = bentuk normal,
// sbody/sfoot = stemText(bentuk normal). Pencarian dilakukan di kolom stem.
const KUNYA = ["ابو", "ابي", "ابا"];
const PHRASE_PRE = ["", "و", "ف", "ب", "ك", "ل", "وب", "فب", "ول", "فل", "وك"];
const ftsQuote = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function buildFtsMatch(query: string, opts: { suffix?: boolean; columns?: string } = {}): string | null {
  const cols = opts.columns ?? "{sbody sfoot}";
  const st = normalizeArabic(query).text.split(" ").filter(Boolean).map(stemToken);
  if (st.length === 0) return null;
  if (st.length === 1) {
    const s = st[0];
    if (KUNYA.includes(s)) return `${cols} : (${KUNYA.map(ftsQuote).join(" OR ")})`;
    const vars = expandQueryToken(s);
    if (opts.suffix && s.length >= 3) {
      // sufiks pronomina/tanwin: صبر* -> صبره, صبرهم, صبرا; ة->ت sebelum sufiks: نيه -> نيت*
      const extra = s.endsWith("ه") ? [s.slice(0, -1) + "ت"] : [];
      return `${cols} : (${[...vars, ...extra].map((v) => ftsQuote(v) + "*").join(" OR ")})`;
    }
    return `${cols} : (${vars.map(ftsQuote).join(" OR ")})`;
  }
  // Frasa: hanya token pertama yang diberi varian proklitik (وحب الدنيا, لطلب العلم);
  // token berikutnya sudah ter-stem (ال dibuang). Kunyah ابو/ابي/ابا di posisi mana pun. Maks 64 frasa.
  let phrases: string[][] = [[]];
  st.forEach((t, i) => {
    const base = KUNYA.includes(t) ? KUNYA : [t];
    const vs = i === 0 && !PROTECTED.has(t) ? base.flatMap((b) => PHRASE_PRE.map((p) => p + b)) : base;
    phrases = phrases.flatMap((ph) => vs.map((v) => [...ph, v])).slice(0, 64);
  });
  return `${cols} : (${phrases.map((p) => ftsQuote(p.join(" "))).join(" OR ")})`;
}
