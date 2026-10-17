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
  return {
    ayat: ayat.map(({ surah, ayah }) => ({ surah, ayah })),
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

/** Dua kata dianggap sama ejaan-bedanya kecil: biaya ≤1 dan ≤ sepertiga panjang. */
export function similarWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 3) return false;
  const d = wordDistance(a, b);
  return d <= 1 && d / Math.max(a.length, b.length) <= 1 / 3;
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

export type SpanKind = "bracketed" | "cue";

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
  reason: "one_word" | "two_words_no_cue" | "no_match" | "below_threshold" | "cross_surah";
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
  if (words.length < 3) return reject(cue ? "no_match" : "two_words_no_cue");
  if (words.length === 3 && !cue) return reject("no_match");
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
    const anchors = exactHits(index, words.slice(0, CUE_ANCHOR_TOKENS));
    let best: { length: number; exact: boolean; same: number; hits: QuranHit[] } | null = null;
    for (const a of anchors) {
      const e = extend(index, words, a.from);
      const hit = { from: a.from, to: a.from + e.length - 1 };
      if (best === null || e.length > best.length) best = { ...e, hits: [hit] };
      else if (e.length === best.length) best.hits.push(hit);
    }
    if (best === null || best.length < CUE_MIN_TOKENS) continue;
    const picked = pickCandidate(index, best.hits, preferSurah());
    if (picked === null) continue;
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
      alt: picked.alt,
      // Bentang tanpa kurung: porsi kata yang sama persis (kata lain beda ejaan kecil).
      score: Math.round((best.same / best.length) * 1000) / 1000,
      tokens: best.length,
    });
  }
  return out;
}

/** Semua kutipan ayat di satu paragraf, urut posisi. */
export function matchPassage(index: QuranIndex, raw: string): PassageMatch {
  const hasBrace = raw.includes("{");
  const n = normalizeArabic(raw);
  const hasCue = CUE_RE.test(n.text);
  CUE_RE.lastIndex = 0;
  if (!hasBrace && !hasCue) return { spans: [], rejected: [] };

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
  const cue = hasCue
    ? cueSpans(index, raw, n, spans, () => spans.findLast((s) => s.alt === 0)?.surah ?? null)
    : [];
  return {
    spans: [...spans, ...cue].sort((a, b) => a.charStart - b.charStart),
    rejected,
  };
}
