// Pencocok kutipan ayat (S12, ADR-040). Deterministik, tanpa LLM: bentang kandidat di text_raw
// dicocokkan ke Tanzil simple-clean setelah keduanya dinormalisasi dengan @surau/text. Bentang yang
// tidak cocok BUKAN ayat dan tidak ditautkan.
//
// Kandidat:
// 1. Bentang `{…}` (Shamela menandai ayat dengan kurung kurawal, tetapi kurung yang sama juga dipakai
//    untuk menebalkan kata di hadits/takhrij: {قال}, {ثم قال}, {وفيه}). Aturan konservatif:
//    1 kata = ditolak; 2 kata = hanya bila sama persis DAN (satu ayat utuh, atau tepat didahului
//    pengantar kuat seperti تعالى/عز وجل/قرأ/نزلت, atau diikuti "الآية", atau satu surah dengan
//    kutipan ayat sebelumnya di paragraf); ≥3 kata = cocok persis (exact), atau mirip (similar) bila
//    ≥4 kata (3 kata: syarat pengantar yang sama) dengan skor penjajaran huruf ≥ SIMILAR_MIN_SCORE.
// 2. Bentang tanpa kurung tepat sesudah frasa pengantar ("قال الله تعالى", "قوله عز وجل" …):
//    jangkar = awalan ≥3 kata yang sama persis dengan mushaf, lalu diperpanjang kata demi kata
//    selama kata berikutnya sama atau beda ejaan kecil (kata mirip di ujung dibuang: harus diikuti
//    kata yang sama persis); diterima bila ≥ CUE_MIN_TOKENS kata.
// 2b. Kutipan pendek (S13, ADR-042): 2–3 kata sama persis tepat sesudah frasa pengantar yang sama,
//    mis. "قال تعالى واسجد واقترب". 3 kata: lafaz di ≤ CUE_SHORT_MAX_PLACES letak mushaf; 2 kata:
//    satu-satunya letak, pengantarnya bukan "يقول …" (pembuka hadits qudsi), dan tidak diawali kata
//    fungsi (لا، في، قال، من، على، إلى …; mis. hadits qudsi "قال الله تعالى لا يزال"). Ditolak bila kata
//    sesudahnya lebih cocok (mirip) dengan ayat lain. Lafaz umum ("إن الله", "في بعض") tidak
//    pernah ditautkan sependek ini. Bila kutipan berlanjut dengan ejaan lain di ayat yang sama
//    (أينما/أين ما, أولوا/أولو), bentang diperpanjang (`similar`).
// 3. Kutipan tanpa tanda (S13, ADR-042): deret ≥ UNMARKED_MIN_TOKENS kata yang sama persis dengan
//    mushaf di mana pun dalam paragraf, atau ≥ UNMARKED_CUED_MIN_TOKENS kata bila tepat didahului
//    pengantar ayat (تعالى، عز وجل، قرأ، نزلت …, atau "{وقال}" yang kurungnya salah tempat). Hanya
//    cocok persis dan hanya lafaz yang SATU-SATUNYA di mushaf (lafaz berulang hanya bila tepat
//    didahului تعالى/عز وجل …). Tidak dihitung: kalimat tauhid saja,
//    deret berawal basmalah (pembuka khutbah), dan deret dalam konteks hadits/zikir (رسول، النبي،
//    وسلم، شريك dalam 16 kata sebelumnya tanpa pengantar ayat). Deret yang ditolak dilompati seluruhnya (sisa
//    ekornya tidak dicoba lagi). Mode 2b dan 3 hanya untuk paragraf badan.
//    Tujuannya: ayat yang tidak bertanda di sumber tetap dikenali, supaya tidak diterjemahkan LLM
//    (batch S13) dan tampil dengan terjemahan Kemenag.
import { normalizeArabic, toRawSpan } from "@surau/text";
import type { Normalized } from "@surau/text";

/** Skor minimal penjajaran huruf (1 = sama persis) untuk label `similar`. */
export const SIMILAR_MIN_SCORE = 0.93;
/** Kata minimal bentang tanpa kurung (sesudah frasa pengantar). */
export const CUE_MIN_TOKENS = 4;
/** Kata minimal jangkar sama persis untuk bentang tanpa kurung. */
export const CUE_ANCHOR_TOKENS = 3;
/** Kata maksimal yang diperiksa sesudah frasa pengantar. */
const CUE_MAX_TOKENS = 120;
/** Kata minimal kutipan pendek tepat sesudah frasa pengantar kuat (قال تعالى …), sama persis. */
export const CUE_SHORT_MIN_TOKENS = 2;
/** Kutipan pendek 3 kata hanya diterima bila lafaznya muncul di paling banyak sekian letak mushaf. */
export const CUE_SHORT_MAX_PLACES = 2;
/**
 * Kutipan pendek ditolak bila jendela kata sesudah pengantar cocok mirip (skor ≥ ini) dengan letak
 * LAIN di mushaf: kutipan sebenarnya berejaan lain dan lebih panjang (mis. وإذا لم يهتدوا = 46:11,
 * bukan 7:203 وإذا لم).
 */
export const CUE_SHORT_CONFLICT_SCORE = 0.85;
const CUE_SHORT_WINDOW = 6;
// Kutipan pendek 2 kata yang diawali kata fungsi hampir selalu kalimat biasa atau hadits qudsi
// (قال الله تعالى لا يزال العبد…, قال الله تعالى في الزبور…), bukan ayat. Bentuk normal.
const SHORT_FUNCTION_START = new Set([
  "لا",
  "في",
  "قال",
  "من",
  "علي",
  "الي",
  "عن",
  "ان",
  "او",
  "ثم",
]);
/** Kata minimal kutipan tanpa tanda (tanpa kurung, tanpa frasa pengantar), sama persis. */
export const UNMARKED_MIN_TOKENS = 5;
/** Kata minimal kutipan tanpa tanda yang tepat didahului kata kutip (قال، قوله، تعالى …). */
export const UNMARKED_CUED_MIN_TOKENS = 4;

export interface IndexAyah {
  surah: number;
  ayah: number;
  /** Tanzil simple-clean (verbatim). */
  text: string;
}

export interface QuranIndex {
  ayat: readonly { surah: number; ayah: number }[];
  /** Token ternormalisasi seluruh mushaf, urut. */
  tokens: string[];
  /** Indeks ayat (di `ayat`) pemilik tiap token. */
  tokenAyah: Int32Array;
  firstToken: Int32Array;
  lastToken: Int32Array;
  /** `" " + tokens.join(" ") + " "`. */
  text: string;
  /** Deret UNMARKED_CUED_MIN_TOKENS token (digabung spasi) → awal token di mushaf. */
  grams: Map<string, number[]>;
  /** Offset karakter di `text` → indeks token. */
  tokenAt: Map<number, number>;
  postings: Map<string, number[]>;
}

export function buildQuranIndex(ayat: readonly IndexAyah[]): QuranIndex {
  const tokens: string[] = [];
  const owner: number[] = [];
  const first = new Int32Array(ayat.length);
  const last = new Int32Array(ayat.length);
  ayat.forEach((a, i) => {
    const toks = normalizeArabic(a.text).text.split(" ").filter(Boolean);
    if (toks.length === 0) throw new Error(`ayat ${a.surah}:${a.ayah} kosong setelah normalisasi`);
    first[i] = tokens.length;
    for (const t of toks) {
      tokens.push(t);
      owner.push(i);
    }
    last[i] = tokens.length - 1;
  });
  const tokenAt = new Map<number, number>();
  const postings = new Map<string, number[]>();
  let text = " ";
  tokens.forEach((t, i) => {
    tokenAt.set(text.length, i);
    text += `${t} `;
    const list = postings.get(t);
    if (list === undefined) postings.set(t, [i]);
    else list.push(i);
  });
  const grams = new Map<string, number[]>();
  for (let i = 0; i + UNMARKED_CUED_MIN_TOKENS <= tokens.length; i++) {
    const key = tokens.slice(i, i + UNMARKED_CUED_MIN_TOKENS).join(" ");
    const list = grams.get(key);
    if (list === undefined) grams.set(key, [i]);
    else list.push(i);
  }
  return {
    ayat: ayat.map(({ surah, ayah }) => ({ surah, ayah })),
    grams,
    tokens,
    tokenAyah: Int32Array.from(owner),
    firstToken: first,
    lastToken: last,
    text,
    tokenAt,
    postings,
  };
}

// ── Kemiripan huruf ──────────────────────────────────────────────────────────────────────

// Huruf "lemah" (alif, waw, ya, hamzah): beda ejaan mushaf vs imlaei paling sering di sini
// (أولوا/أولو, السموات/السماوات, مسئولا/مسؤولا, يراءون/يراؤون). Ganti/sisip/hapus = setengah biaya.
const WEAK = new Set(["ا", "و", "ي", "ء"]);

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  if (WEAK.has(a) && WEAK.has(b)) return 0.5;
  // Ta marbuthah (dinormalisasi ه) ↔ ta maftuhah rasm mushaf (نعمه/نعمت, رحمه/رحمت).
  if ((a === "ه" && b === "ت") || (a === "ت" && b === "ه")) return 0.5;
  return 1;
}
const indelCost = (c: string): number => (WEAK.has(c) ? 0.5 : 1);

/** Biaya edit berbobot dua kata utuh. */
export function wordDistance(a: string, b: string): number {
  let prev = [0];
  for (let j = 1; j <= b.length; j++) {
    prev[j] = (prev[j - 1] as number) + indelCost(b[j - 1] as string);
  }
  for (let i = 1; i <= a.length; i++) {
    const ca = a[i - 1] as string;
    const cur = [(prev[0] as number) + indelCost(ca)];
    for (let j = 1; j <= b.length; j++) {
      const cb = b[j - 1] as string;
      cur[j] = Math.min(
        (prev[j - 1] as number) + subCost(ca, cb),
        (prev[j] as number) + indelCost(ca),
        (cur[j - 1] as number) + indelCost(cb),
      );
    }
    prev = cur;
  }
  return prev[b.length] as number;
}

/**
 * Dua kata dianggap beda ejaan kecil: biaya ≤ 0,5 (satu huruf lemah/ه-ت), atau ≤ 1 untuk kata
 * ≥ 5 huruf; selalu ≤ sepertiga panjang. Kata pendek yang beda satu huruf kuat (ربك/ربه: kata
 * ganti berbeda) TIDAK dianggap mirip.
 */
export function similarWord(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter < 3) return false;
  const d = wordDistance(a, b);
  return (d <= 0.5 || (d <= 1 && shorter >= 5)) && d / Math.max(a.length, b.length) <= 1 / 3;
}

/**
 * Penjajaran semi-global: seluruh `pattern` dijajarkan ke potongan mana pun dari `text`.
 * Kembalikan biaya minimal dan rentang [start, end) di `text`.
 */
export function semiGlobal(
  pattern: string,
  text: string,
): { cost: number; start: number; end: number } {
  const n = text.length;
  let prev = new Float64Array(n + 1);
  let prevStart = Int32Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Float64Array(n + 1);
  let curStart = new Int32Array(n + 1);
  for (const pc of pattern) {
    cur[0] = (prev[0] as number) + indelCost(pc);
    curStart[0] = 0;
    for (let j = 1; j <= n; j++) {
      const tc = text[j - 1] as string;
      const diag = (prev[j - 1] as number) + subCost(pc, tc);
      const up = (prev[j] as number) + indelCost(pc);
      const left = (cur[j - 1] as number) + indelCost(tc);
      if (diag <= up && diag <= left) {
        cur[j] = diag;
        curStart[j] = prevStart[j - 1] as number;
      } else if (up <= left) {
        cur[j] = up;
        curStart[j] = prevStart[j] as number;
      } else {
        cur[j] = left;
        curStart[j] = curStart[j - 1] as number;
      }
    }
    [prev, cur] = [cur, prev];
    [prevStart, curStart] = [curStart, prevStart];
  }
  let cost = Number.POSITIVE_INFINITY;
  let end = 0;
  for (let j = 0; j <= n; j++) {
    if ((prev[j] as number) < cost) {
      cost = prev[j] as number;
      end = j;
    }
  }
  return { cost, start: prevStart[end] as number, end };
}

// ── Hasil cocok ──────────────────────────────────────────────────────────────────────────

export interface QuranHit {
  /** Rentang token mushaf [from, to] (inklusif). */
  from: number;
  to: number;
}

export interface AyahLocation {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  /** Kutipan tidak menutup ayat awal–akhir secara utuh. */
  partial: boolean;
}

/** Letak ayat dari rentang token; `null` bila melintasi batas surah. */
export function locate(index: QuranIndex, hit: QuranHit): AyahLocation | null {
  const a0 = index.tokenAyah[hit.from] as number;
  const a1 = index.tokenAyah[hit.to] as number;
  const first = index.ayat[a0];
  const last = index.ayat[a1];
  if (first === undefined || last === undefined || first.surah !== last.surah) return null;
  return {
    surah: first.surah,
    ayahFrom: first.ayah,
    ayahTo: last.ayah,
    partial: hit.from !== index.firstToken[a0] || hit.to !== index.lastToken[a1],
  };
}

/** Semua letak di mushaf tempat deretan token ini muncul persis (batas kata). */
export function exactHits(index: QuranIndex, tokens: readonly string[]): QuranHit[] {
  if (tokens.length === 0) return [];
  const needle = ` ${tokens.join(" ")} `;
  const hits: QuranHit[] = [];
  for (let at = index.text.indexOf(needle); at !== -1; at = index.text.indexOf(needle, at + 1)) {
    const from = index.tokenAt.get(at + 1);
    if (from !== undefined) hits.push({ from, to: from + tokens.length - 1 });
  }
  return hits;
}

export interface Candidate {
  hit: QuranHit;
  loc: AyahLocation;
}

/**
 * Pilih satu letak dari beberapa letak berlafaz sama: ayat utuh lebih dulu, lalu surah yang sama
 * dengan rujukan sebelumnya di paragraf (`preferSurah`), lalu urutan mushaf. `alt` = letak lain.
 */
export function pickCandidate(
  index: QuranIndex,
  hits: readonly QuranHit[],
  preferSurah: number | null,
): { best: Candidate; alt: number } | null {
  const cands: Candidate[] = [];
  for (const hit of hits) {
    const loc = locate(index, hit);
    if (loc !== null) cands.push({ hit, loc });
  }
  if (cands.length === 0) return null;
  const rank = (c: Candidate): number[] => [
    c.loc.partial ? 1 : 0,
    preferSurah !== null && c.loc.surah === preferSurah ? 0 : 1,
    c.hit.from,
  ];
  cands.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      const d = (ra[i] as number) - (rb[i] as number);
      if (d !== 0) return d;
    }
    return 0;
  });
  return { best: cands[0] as Candidate, alt: cands.length - 1 };
}

/** Kandidat letak (awal token mushaf) untuk pencocokan mirip: suara berbobot per diagonal. */
function fuzzyStarts(index: QuranIndex, tokens: readonly string[]): number[] {
  const votes = new Map<number, number>();
  const total = index.tokens.length;
  tokens.forEach((t, i) => {
    const ps = index.postings.get(t);
    if (ps === undefined || ps.length > 3000) return;
    const w = Math.log(total / ps.length);
    for (const p of ps) votes.set(p - i, (votes.get(p - i) ?? 0) + w);
  });
  const smoothed = [...votes.keys()].map((d) => ({
    d,
    v: (votes.get(d - 1) ?? 0) + (votes.get(d) ?? 0) + (votes.get(d + 1) ?? 0),
  }));
  smoothed.sort((a, b) => b.v - a.v || a.d - b.d);
  return smoothed.slice(0, 8).map((s) => s.d);
}

export interface FuzzyResult {
  score: number;
  hits: QuranHit[];
}

/** Cocok mirip untuk deretan token (bentang berkurung): skor terbaik + semua letak berlafaz sama. */
export function fuzzyMatch(index: QuranIndex, tokens: readonly string[]): FuzzyResult | null {
  const pattern = tokens.join("");
  if (pattern.length === 0) return null;
  let best: FuzzyResult | null = null;
  let bestText = "";
  const seen = new Set<string>();
  for (const d of fuzzyStarts(index, tokens)) {
    const w0 = Math.max(0, d - 3);
    const w1 = Math.min(index.tokens.length, d + tokens.length + 3);
    let str = "";
    const ownerTok: number[] = [];
    for (let k = w0; k < w1; k++) {
      for (const c of index.tokens[k] as string) {
        str += c;
        ownerTok.push(k);
      }
    }
    if (str.length === 0) continue;
    const r = semiGlobal(pattern, str);
    if (r.end <= r.start) continue;
    const hit = { from: ownerTok[r.start] as number, to: ownerTok[r.end - 1] as number };
    const key = `${hit.from}-${hit.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Jangkar: minimal separuh token bentang sama persis dengan token mushaf di rentang cocok.
    const matched = index.tokens.slice(hit.from, hit.to + 1);
    const inWindow = new Set(matched);
    if (tokens.filter((t) => inWindow.has(t)).length / tokens.length < 0.5) continue;
    const score = Math.round((1 - r.cost / pattern.length) * 1000) / 1000;
    const text = matched.join(" ");
    if (best === null || score > best.score) {
      best = { score, hits: [hit] };
      bestText = text;
    }
  }
  // Letak alternatif = semua letak lain dengan lafaz mushaf yang sama persis (ayat berulang).
  if (best !== null) best.hits = exactHits(index, bestText.split(" "));
  return best;
}

// ── Bentang di paragraf ──────────────────────────────────────────────────────────────────

export type SpanKind = "bracketed" | "cue" | "cue_short" | "unmarked";

export interface AyahSpan {
  /** Offset di text_raw, [charStart, charEnd). */
  charStart: number;
  charEnd: number;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  match: "exact" | "similar";
  partial: boolean;
  kind: SpanKind;
  /** Letak lain di mushaf dengan lafaz yang sama. */
  alt: number;
  /** Berkurung: skor penjajaran huruf; tanpa kurung: porsi kata sama persis (1 = persis). */
  score: number;
  tokens: number;
}

/** Bentang `{…}` yang ditolak (untuk laporan). */
export interface RejectedSpan {
  charStart: number;
  charEnd: number;
  tokens: number;
  /**
   * Disaring sebelum dicocokkan: `one_word`, `two_words_no_cue`. Tervalidasi tetapi tidak cocok
   * (tidak ditautkan; bisa saja ayat dengan ejaan jauh berbeda, dibiarkan, bukan ditebak):
   * `short_inexact` (2–3 kata tidak persis, cocok mirip tidak dicoba), `no_match`,
   * `below_threshold`, `cross_surah`.
   */
  reason:
    | "one_word"
    | "two_words_no_cue"
    | "short_inexact"
    | "no_match"
    | "below_threshold"
    | "cross_surah";
  score: number | null;
}

export interface PassageMatch {
  spans: AyahSpan[];
  rejected: RejectedSpan[];
}

// Frasa pengantar ayat, dalam bentuk ternormalisasi. Diikuti kutipan tanpa kurung.
const CUE_RE =
  /(?:^| )(?:و|ف|ل)?(?:قال|يقول|قوله|قول)(?: الله| ربنا| ربكم| ربك)?(?: تبارك)? (?:تعالي|عز وجل|سبحانه وتعالي|سبحانه|جل جلاله|جل وعلا|جل ذكره)(?= |$)/g;
// Pengantar kuat tepat sebelum bentang berkurung pendek (2–3 kata), di dua kata terakhir. "قوله"
// saja tidak cukup: dipakai juga untuk lafaz hadits ("الحديث إلى قوله {حميد مجيد}").
const NEAR_CUE_RE =
  /(?:^| )(?:تعالي|وجل|سبحانه|قرا|وقرا|فقرا|اقرءوا|اقروا|تلا|فتلا|نزلت|فنزلت|وانزل|فانزل)(?= |$)/;
const AFTER_CUE_RE = /^ ?(?:الايه|الايات)(?= |$)/;

interface TokenSpan {
  token: string;
  /** Rentang di teks ternormalisasi. */
  start: number;
  end: number;
}

function tokenize(n: Normalized, from: number, to: number): TokenSpan[] {
  const out: TokenSpan[] = [];
  const re = /[^ ]+/g;
  re.lastIndex = from;
  for (let m = re.exec(n.text); m !== null && m.index < to; m = re.exec(n.text)) {
    const end = m.index + m[0].length;
    if (end > to) break;
    out.push({ token: m[0], start: m.index, end });
  }
  return out;
}

/** Indeks normal pertama yang posisinya di mentah ≥ rawPos (normal "sesudah" rawPos). */
function normAtOrAfter(n: Normalized, rawPos: number): number {
  let lo = 0;
  let hi = n.map.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((n.map[mid] as number) < rawPos) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function hasNearCue(n: Normalized, rawOpen: number, rawClose: number): boolean {
  const at = normAtOrAfter(n, rawOpen);
  const before = n.text
    .slice(Math.max(0, at - 40), at)
    .trim()
    .split(" ")
    .slice(-2)
    .join(" ");
  const after = n.text.slice(normAtOrAfter(n, rawClose), normAtOrAfter(n, rawClose) + 20);
  return NEAR_CUE_RE.test(before) || AFTER_CUE_RE.test(after);
}

function bracketed(
  index: QuranIndex,
  raw: string,
  n: Normalized,
  open: number,
  close: number,
  preferSurah: number | null,
): AyahSpan | RejectedSpan {
  const from = normAtOrAfter(n, open + 1);
  const to = normAtOrAfter(n, close);
  const toks = tokenize(n, from, to);
  const words = toks.map((t) => t.token);
  const firstTok = toks[0];
  const lastTok = toks.at(-1);
  // Rentang mentah = isi kurung tanpa spasi tepi (kurung sendiri bukan teks ayat).
  const [charStart, charEnd] =
    firstTok === undefined || lastTok === undefined
      ? [open + 1, close]
      : toRawSpan(raw, n, firstTok.start, lastTok.end);
  const reject = (reason: RejectedSpan["reason"], score: number | null = null): RejectedSpan => ({
    charStart,
    charEnd,
    tokens: words.length,
    reason,
    score,
  });
  if (words.length < 2) return reject("one_word");
  const cue = hasNearCue(n, open, close);
  const exact = pickCandidate(index, exactHits(index, words), preferSurah);
  if (exact !== null) {
    const fullAyah = !exact.best.loc.partial && exact.best.loc.ayahFrom === exact.best.loc.ayahTo;
    const sameSurah = preferSurah !== null && exact.best.loc.surah === preferSurah;
    if (words.length === 2 && !fullAyah && !cue && !sameSurah) {
      return reject("two_words_no_cue", 1);
    }
    return {
      charStart,
      charEnd,
      ...loc(exact.best.loc),
      match: "exact",
      kind: "bracketed",
      alt: exact.alt,
      score: 1,
      tokens: words.length,
    };
  }
  if (exactHits(index, words).length > 0) return reject("cross_surah");
  if (words.length < 3) return reject(cue ? "short_inexact" : "two_words_no_cue");
  if (words.length === 3 && !cue) return reject("short_inexact");
  const fuzzy = fuzzyMatch(index, words);
  if (fuzzy === null) return reject("no_match");
  if (fuzzy.score < SIMILAR_MIN_SCORE) return reject("below_threshold", fuzzy.score);
  const picked = pickCandidate(index, fuzzy.hits, preferSurah);
  if (picked === null) return reject("cross_surah", fuzzy.score);
  return {
    charStart,
    charEnd,
    ...loc(picked.best.loc),
    match: "similar",
    kind: "bracketed",
    alt: picked.alt,
    score: fuzzy.score,
    tokens: words.length,
  };
}

function loc(l: AyahLocation): Pick<AyahSpan, "surah" | "ayahFrom" | "ayahTo" | "partial"> {
  return { surah: l.surah, ayahFrom: l.ayahFrom, ayahTo: l.ayahTo, partial: l.partial };
}

/** Panjang kecocokan dari token mushaf `start` ke depan (sama persis atau ejaan mirip). */
function extend(
  index: QuranIndex,
  words: readonly string[],
  start: number,
): { length: number; exact: boolean; same: number } {
  // Panjang kecocokan sampai kata terakhir yang SAMA PERSIS: kata mirip di ujung (ولما/ولا,
  // وهذا/واذا, الي/الا) sering kata penulis sendiri sesudah kutipan, jadi tidak dihitung.
  let k = 0;
  let lastExact = 0;
  while (k < words.length && start + k < index.tokens.length) {
    const q = index.tokens[start + k] as string;
    const w = words[k] as string;
    if (q === w) {
      k++;
      lastExact = k;
      continue;
    }
    if (k < CUE_ANCHOR_TOKENS || !similarWord(w, q)) break;
    k++;
  }
  let same = 0;
  for (let i = 0; i < lastExact; i++) {
    if (index.tokens[start + i] === words[i]) same++;
  }
  return { length: lastExact, exact: same === lastExact, same };
}

function cueSpans(
  index: QuranIndex,
  raw: string,
  n: Normalized,
  taken: readonly { charStart: number; charEnd: number }[],
  preferSurah: () => number | null,
): AyahSpan[] {
  const out: AyahSpan[] = [];
  for (const m of n.text.matchAll(CUE_RE)) {
    const cueEnd = (m.index ?? 0) + m[0].length;
    const rawCueEnd = toRawSpan(raw, n, m.index ?? 0, cueEnd)[1];
    // Kutipan berhenti di kurung kurawal berikutnya (bentang berkurung ditangani terpisah).
    const brace = raw.indexOf("{", rawCueEnd);
    const rawLimit = brace === -1 ? raw.length : brace;
    if (/^[\s:،؛.-]*\{/.test(raw.slice(rawCueEnd, rawCueEnd + 8))) continue;
    const toks = tokenize(n, cueEnd, normAtOrAfter(n, rawLimit)).slice(0, CUE_MAX_TOKENS);
    const words = toks.map((t) => t.token);
    if (words.length < CUE_MIN_TOKENS) continue;
    // Setiap jangkar diperpanjang sendiri; yang bersaing hanya yang terpanjang DAN paling banyak
    // kata sama persis, jadi label exact/similar dan skor selalu milik letak yang dipilih.
    const runs = exactHits(index, words.slice(0, CUE_ANCHOR_TOKENS)).map((a) => {
      const e = extend(index, words, a.from);
      return { ...e, hit: { from: a.from, to: a.from + e.length - 1 } };
    });
    const length = Math.max(0, ...runs.map((r) => r.length));
    if (length < CUE_MIN_TOKENS) continue;
    const longest = runs.filter((r) => r.length === length);
    const sameMax = Math.max(...longest.map((r) => r.same));
    const top = longest.filter((r) => r.same === sameMax);
    const picked = pickCandidate(
      index,
      top.map((r) => r.hit),
      preferSurah(),
    );
    const best = top.find((r) => r.hit.from === picked?.best.hit.from);
    if (picked === null || best === undefined) continue;
    // Letak lain = lafaz mushaf yang identik dengan letak terpilih (bukan sekadar sama panjang).
    const mushaf = index.tokens.slice(best.hit.from, best.hit.to + 1);
    const alt = pickCandidate(index, exactHits(index, mushaf), null)?.alt ?? 0;
    const firstTok = toks[0] as TokenSpan;
    const lastTok = toks[best.length - 1] as TokenSpan;
    const [charStart, charEnd] = toRawSpan(raw, n, firstTok.start, lastTok.end);
    if (taken.some((t) => charStart < t.charEnd && t.charStart < charEnd)) continue;
    if (out.some((t) => charStart < t.charEnd && t.charStart < charEnd)) continue;
    out.push({
      charStart,
      charEnd,
      ...loc(picked.best.loc),
      match: best.exact ? "exact" : "similar",
      kind: "cue",
      alt,
      // Bentang tanpa kurung: porsi kata yang sama persis (kata lain beda ejaan kecil).
      score: Math.round((best.same / best.length) * 1000) / 1000,
      tokens: best.length,
    });
  }
  return out;
}

/**
 * Perpanjang kecocokan dari kata sumber `start` / token mushaf `mushafFrom + start`, melewati beda
 * ejaan: kata mirip (`similarWord`), satu kata sumber = dua kata mushaf (أينما = أين ما), atau dua
 * kata sumber = satu kata mushaf. Berakhir di kata terakhir yang sama persis (kata mirip di ujung
 * biasanya kata penulis sendiri). `same` = jumlah kata sumber yang sama persis.
 */
function extendVariants(
  index: QuranIndex,
  words: readonly string[],
  start: number,
  mushafFrom: number,
): { length: number; mushafEnd: number; same: number } {
  let i = start;
  let q = mushafFrom + start;
  let same = start;
  let best = { length: start, mushafEnd: mushafFrom + start - 1, same: start };
  while (i < words.length && q < index.tokens.length) {
    const w = words[i] as string;
    const m = index.tokens[q] as string;
    const m2 = index.tokens[q + 1] ?? "";
    if (w === m) {
      i += 1;
      q += 1;
      same += 1;
      best = { length: i, mushafEnd: q - 1, same };
      continue;
    }
    if (similarWord(w, m)) {
      i += 1;
      q += 1;
    } else if (m2 !== "" && w === m + m2) {
      i += 1;
      q += 2;
    } else if (i + 1 < words.length && w + (words[i + 1] as string) === m) {
      i += 2;
      q += 1;
    } else {
      break;
    }
  }
  return best;
}

function shortCueSpans(
  index: QuranIndex,
  raw: string,
  n: Normalized,
  taken: readonly { charStart: number; charEnd: number }[],
  preferSurah: () => number | null,
): AyahSpan[] {
  const out: AyahSpan[] = [];
  for (const m of n.text.matchAll(CUE_RE)) {
    const cueEnd = (m.index ?? 0) + m[0].length;
    const rawCueEnd = toRawSpan(raw, n, m.index ?? 0, cueEnd)[1];
    if (/^[\s:،؛.-]*\{/.test(raw.slice(rawCueEnd, rawCueEnd + 8))) continue;
    const brace = raw.indexOf("{", rawCueEnd);
    const rawLimit = brace === -1 ? raw.length : brace;
    // Seluruh kata sampai kurung berikutnya (untuk perpanjangan); jangkar persis hanya 2–3 kata awal.
    const allToks = tokenize(n, cueEnd, normAtOrAfter(n, rawLimit)).slice(0, CUE_MAX_TOKENS);
    const allWords = allToks.map((t) => t.token);
    const words = allWords.slice(0, CUE_MIN_TOKENS);
    if (words.length < CUE_SHORT_MIN_TOKENS) continue;
    // Deret terpanjang (< CUE_MIN_TOKENS; yang lebih panjang milik mode pengantar biasa) yang
    // sama persis di mushaf mulai kata pertama sesudah pengantar.
    let len = 0;
    let hits: QuranHit[] = [];
    for (let k = Math.min(words.length, CUE_MIN_TOKENS - 1); k >= CUE_SHORT_MIN_TOKENS; k--) {
      const h = exactHits(index, words.slice(0, k));
      if (h.length > 0) {
        len = k;
        hits = h;
        break;
      }
    }
    if (len === 0) continue;
    if (hits.length > (len === 2 ? 1 : CUE_SHORT_MAX_PLACES)) continue;
    if (len === 2 && /(?:^| )(?:و|ف)?يقول(?= )/.test(m[0])) continue;
    if (len === 2 && SHORT_FUNCTION_START.has(words[0] as string)) continue;
    const picked = pickCandidate(index, hits, preferSurah());
    if (picked === null) continue;
    // Jendela lebih panjang yang cocok mirip di letak lain = kutipan berejaan lain, bukan ini.
    const window = allWords.slice(0, CUE_SHORT_WINDOW);
    if (window.length > len) {
      const fuzzy = fuzzyMatch(index, window);
      const at = picked.best.hit;
      if (
        fuzzy !== null &&
        fuzzy.score >= CUE_SHORT_CONFLICT_SCORE &&
        fuzzy.hits.every((h) => h.to < at.from || h.from > at.to)
      ) {
        continue;
      }
    }
    // Kutipan sering berlanjut dengan ejaan lain di ayat yang sama (أينما/أين ما, أولوا/أولو):
    // perpanjang di letak terpilih supaya sisa ayat tidak tertinggal di luar placeholder.
    const short = { length: len, mushafEnd: picked.best.hit.to, same: len };
    const ext = extendVariants(index, allWords, len, picked.best.hit.from);
    const extLoc =
      ext.length >= CUE_MIN_TOKENS
        ? locate(index, { from: picked.best.hit.from, to: ext.mushafEnd })
        : null;
    // Perpanjangan yang melintasi batas surah (locate null) dibuang; bentang pendek tetap sah.
    const used = extLoc === null ? short : ext;
    const where = extLoc ?? picked.best.loc;
    const [charStart, charEnd] = toRawSpan(
      raw,
      n,
      (allToks[0] as TokenSpan).start,
      (allToks[used.length - 1] as TokenSpan).end,
    );
    if (taken.some((t) => charStart < t.charEnd && t.charStart < charEnd)) continue;
    out.push({
      charStart,
      charEnd,
      ...loc(where),
      match: used.same === used.length ? "exact" : "similar",
      kind: "cue_short",
      alt: picked.alt,
      score: Math.round((used.same / used.length) * 1000) / 1000,
      tokens: used.length,
    });
  }
  return out;
}

// Kata pengantar ayat tepat sebelum kutipan tanpa tanda yang cukup untuk ambang 4 kata (bentuk
// normal). "قال/قوله/يقول" saja TIDAK cukup (dipakai juga untuk hadits dan ucapan orang), kecuali
// "قال/وقال" yang dikurung sumber ({وقال}: kurung ayat yang salah tempat).
const QURAN_CUE_WORD_RE = /^(?:و|ف|ك|ل)?(?:تعالي|وجل|سبحانه|قرا|تلا|نزلت|انزل)$/;
const BRACED_SAID_RE = /^(?:و|ف)?قال$/;
// Token penanda konteks hadits atau zikir: deret Qur'ani tanpa tanda sesudahnya (tanpa pengantar
// ayat di antaranya) dianggap lafaz hadits/zikir, bukan kutipan ayat. "شريك" = zikir
// "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد …" (lafaznya kebetulan sama dengan 64:1).
const HADITH_CONTEXT = new Set(["رسول", "النبي", "وسلم", "صلعم", "شريك"]);
const HADITH_LOOKBACK = 16;
// Deret yang sama persis dengan mushaf tetapi di Ihya hampir selalu zikir atau lafaz hadits.
// Istirja' dan hasbalah = ucapan/zikir (2:156, 3:173), bukan kutipan ayat di Ihya.
const UNMARKED_SKIP = new Set([
  "لا اله الا الله",
  "لا اله الا هو",
  "انا لله وانا اليه راجعون",
  "حسبنا الله ونعم الوكيل",
]);
// Basmalah di awal deret tanpa tanda = pembuka kitab/khutbah/surat, bukan kutipan 1:1–2.
const BASMALAH = "بسم الله الرحمن الرحيم";

/** Ada penanda hadits dalam beberapa kata sebelum `i` tanpa pengantar ayat di antaranya. */
function inHadith(words: readonly string[], i: number): boolean {
  for (let k = i - 1; k >= Math.max(0, i - HADITH_LOOKBACK); k--) {
    const w = words[k] as string;
    if (QURAN_CUE_WORD_RE.test(w)) return false;
    if (HADITH_CONTEXT.has(w)) return true;
  }
  return false;
}

function unmarkedSpans(
  index: QuranIndex,
  raw: string,
  n: Normalized,
  taken: readonly { charStart: number; charEnd: number }[],
  preferSurah: () => number | null,
): AyahSpan[] {
  const toks = tokenize(n, 0, n.text.length);
  const words = toks.map((t) => t.token);
  const blocked = toks.map((t) => {
    const [s, e] = toRawSpan(raw, n, t.start, t.end);
    return taken.some((x) => s < x.charEnd && x.charStart < e);
  });
  const out: AyahSpan[] = [];
  const gram = UNMARKED_CUED_MIN_TOKENS;
  let i = 0;
  while (i + gram <= words.length) {
    const starts = blocked.slice(i, i + gram).includes(true)
      ? undefined
      : index.grams.get(words.slice(i, i + gram).join(" "));
    if (starts === undefined) {
      i++;
      continue;
    }
    // Perpanjang setiap letak ke kanan selama kata sama persis; yang dipakai hanya yang terpanjang.
    let best = 0;
    let hits: QuranHit[] = [];
    for (const from of starts) {
      let len = gram;
      while (
        i + len < words.length &&
        !blocked[i + len] &&
        from + len < index.tokens.length &&
        index.tokens[from + len] === words[i + len]
      ) {
        len++;
      }
      if (len > best) {
        best = len;
        hits = [];
      }
      if (len === best) hits.push({ from, to: from + len - 1 });
    }
    const run = words.slice(i, i + best);
    const prev = i > 0 ? (toks[i - 1] as TokenSpan) : null;
    const prevWord = prev === null ? "" : (words[i - 1] as string);
    const prevRaw = prev === null ? [0, 0] : toRawSpan(raw, n, prev.start, prev.end);
    // "{وقال}" atau "{ثم قال}": kurung ayat yang salah tempat membungkus kata pengantarnya.
    const prevBraced =
      prev !== null &&
      /\{[^{}]{0,8}$/.test(raw.slice(Math.max(0, prevRaw[0] - 9), prevRaw[0])) &&
      /^\s*\}/.test(raw.slice(prevRaw[1], prevRaw[1] + 2));
    const cued = QURAN_CUE_WORD_RE.test(prevWord) || (prevBraced && BRACED_SAID_RE.test(prevWord));
    const min = cued ? UNMARKED_CUED_MIN_TOKENS : UNMARKED_MIN_TOKENS;
    // Hanya lafaz yang SATU-SATUNYA di mushaf: untuk lafaz yang berulang (إن الله غفور رحيم di 12
    // letak) letak mana pun yang dipilih praktis sembarang, dan terjemahan "ayat lengkap" jadi
    // salah konteks.
    const alt = best < min ? 1 : (pickCandidate(index, exactHits(index, run), null)?.alt ?? 0);
    if (best < min) {
      i++;
      continue;
    }
    // Lafaz berulang hanya diterima bila tepat didahului pengantar ayat (تعالى، عز وجل …): itu jelas
    // kutipan, dan letaknya dipilih dengan aturan S12 (ayat utuh, surah kutipan sebelumnya).
    const quranCued = QURAN_CUE_WORD_RE.test(prevWord);
    const picked =
      (alt > 0 && !quranCued) ||
      UNMARKED_SKIP.has(run.join(" ")) ||
      run.join(" ").startsWith(BASMALAH) ||
      inHadith(words, i)
        ? null
        : pickCandidate(index, hits, preferSurah());
    if (picked === null) {
      // Seluruh deret ditolak: ekornya (mis. "الله الرحمن الرحيم الحمد لله" sesudah بسم) bukan
      // kutipan tersendiri.
      i += best;
      continue;
    }
    const [charStart, charEnd] = toRawSpan(
      raw,
      n,
      (toks[i] as TokenSpan).start,
      (toks[i + best - 1] as TokenSpan).end,
    );
    out.push({
      charStart,
      charEnd,
      ...loc(picked.best.loc),
      match: "exact",
      kind: "unmarked",
      alt,
      score: 1,
      tokens: best,
    });
    i += best;
  }
  return out;
}

export interface MatchOptions {
  /**
   * Mode S13 (kutipan pendek sesudah pengantar dan tanpa tanda, ADR-042). Hanya untuk paragraf
   * badan: catatan kaki tidak diterjemahkan, jadi mode yang lebih longgar hanya menambah risiko.
   */
  extended?: boolean;
}

/** Semua kutipan ayat di satu paragraf, urut posisi. */
export function matchPassage(
  index: QuranIndex,
  raw: string,
  opts: MatchOptions = {},
): PassageMatch {
  const extended = opts.extended ?? true;
  const n = normalizeArabic(raw);
  const hasCue = CUE_RE.test(n.text);
  CUE_RE.lastIndex = 0;

  const spans: AyahSpan[] = [];
  const rejected: RejectedSpan[] = [];
  let preferSurah: number | null = null;
  for (const m of raw.matchAll(/\{([^{}]*)\}/g)) {
    const open = m.index ?? 0;
    const r = bracketed(index, raw, n, open, open + m[0].length - 1, preferSurah);
    if ("surah" in r) {
      spans.push(r);
      if (r.alt === 0) preferSurah = r.surah;
    } else {
      rejected.push(r);
    }
  }
  const lastSurah = (list: readonly AyahSpan[]) => () =>
    list.findLast((s) => s.alt === 0)?.surah ?? null;
  const cue = hasCue ? cueSpans(index, raw, n, spans, lastSurah(spans)) : [];
  const short =
    extended && hasCue
      ? shortCueSpans(index, raw, n, [...spans, ...cue], lastSurah([...spans, ...cue]))
      : [];
  const marked = [...spans, ...cue, ...short];
  const unmarked = extended ? unmarkedSpans(index, raw, n, marked, lastSurah(marked)) : [];
  return {
    spans: [...marked, ...unmarked].sort((a, b) => a.charStart - b.charStart),
    rejected,
  };
}
