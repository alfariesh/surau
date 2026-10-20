// Penyusun ekspresi MATCH FTS5 untuk indeks `passage_fts(body, foot, sbody, sfoot)`:
// body/foot = normalizeArabic(text_raw).text, sbody/sfoot = stemText(body/foot). Pencarian memakai
// kolom stem. Aman dari injeksi sintaks: SETIAP token di-quote (operator AND/OR/NEAR/*/^/: dari
// pengguna menjadi literal), dan hasilnya dikirim sebagai SATU parameter terikat (`MATCH ?1`).

import { normalizeArabic } from "./normalize.ts";
import {
  expandQueryToken,
  isCanonicalArticleStem,
  isProtectedToken,
  kunyaVariants,
  lamMergedVariant,
  queryProclitics,
  stemToken,
} from "./stem.ts";

/** Kolom indeks `passage_fts` yang boleh dipakai di filter kolom. */
export type FtsColumn = "body" | "foot" | "sbody" | "sfoot";

const FTS_COLUMNS: readonly FtsColumn[] = ["body", "foot", "sbody", "sfoot"];

/** Batas jumlah frasa alternatif hasil ekspansi (kueri FTS tetap kecil dan cepat). */
export const FTS_MAX_PHRASES = 64;

/**
 * Batas jumlah token kueri. Pertahanan berlapis: batas panjang input tetap divalidasi Zod di batas
 * sistem, tetapi kueri ribuan token tidak boleh sampai menghasilkan string MATCH raksasa (batas D1).
 */
export const FTS_MAX_TOKENS = 32;

export interface FtsMatchOptions {
  /**
   * Cocokkan awalan (`"صبر"*`) untuk menangkap sufiks pronomina/tanwin (صبره, صبرهم, صبرا).
   * Hanya untuk kueri satu kata. Stem berakhiran ه (dari ة) juga dicari sebagai ت (نيه → نيت*),
   * karena ta marbuthah ditulis ت sebelum sufiks (نيته). Default `false`.
   */
  suffix?: boolean;
  /** Kolom yang dicari. Default `["sbody", "sfoot"]`. */
  columns?: readonly FtsColumn[];
}

/** Quote satu string sebagai literal FTS5 (`"` digandakan). */
export function ftsQuote(s: string): string {
  return `"${s.replaceAll('"', '""')}"`;
}

/**
 * Rencana kueri: bentuk yang dicari di kolom stem, dipakai bersama oleh penyusun `MATCH`
 * (`ftsMatchExpression`) dan penyorot teks mentah (`findPlanSpans`), supaya yang disorot persis
 * yang dicocokkan indeks.
 */
export interface FtsQueryPlan {
  /** Stem tiap token kueri (setelah normalisasi), urut. Dasar pengaman kata umum (`term_stat`). */
  stems: string[];
  /** Frasa alternatif: urutan token di kolom stem. Kueri satu kata = frasa satu token. */
  phrases: string[][];
  /** Token terakhir dicocokkan sebagai awalan (opsi `suffix`, hanya kueri satu kata). */
  prefix: boolean;
}

/**
 * Susun rencana kueri dari kueri pengguna (Arab, boleh bervokal). `null` bila kueri kosong setelah
 * normalisasi; kueri seperti itu tidak boleh dijalankan.
 *
 * - Satu kata: stem + varian proklitik (`expandQueryToken`), atau tiga bentuk kunyah.
 * - Frasa: hanya token pertama yang diberi varian proklitik (وحب الدنيا, لطلب العلم); token
 *   berikutnya sudah ter-stem (artikel dibuang di indeks juga). Kunyah di posisi mana pun.
 *   Kombinasi dibatasi `FTS_MAX_PHRASES`.
 */
export function planFtsQuery(
  query: string,
  opts: Pick<FtsMatchOptions, "suffix"> = {},
): FtsQueryPlan | null {
  const tokens = normalizeArabic(query)
    .text.split(" ")
    .filter((t) => t !== "");
  const stems = tokens.map(stemToken);
  const [first] = stems;
  if (first === undefined) return null;
  if (stems.length > FTS_MAX_TOKENS) {
    throw new RangeError(`kueri terlalu panjang: ${stems.length} token (maks ${FTS_MAX_TOKENS})`);
  }

  if (stems.length === 1) {
    const kunya = kunyaVariants(first);
    if (kunya.length > 1) return { stems, phrases: kunya.map((k) => [k]), prefix: false };
    // Varian lam melebur (لليل untuk الليل, #61): hanya untuk token berartikel, tanpa proklitik.
    const lam = lamMergedVariant(tokens[0] ?? "");
    const variants = [...expandQueryToken(first), ...(lam === null ? [] : [lam])];
    if (opts.suffix === true && first.length >= 3) {
      const extra =
        first.endsWith("ه") && !isProtectedToken(first) ? [`${first.slice(0, -1)}ت`] : [];
      return { stems, phrases: [...variants, ...extra].map((v) => [v]), prefix: true };
    }
    return { stems, phrases: variants.map((v) => [v]), prefix: false };
  }

  let phrases: string[][] = [[]];
  stems.forEach((token, i) => {
    const bases = kunyaVariants(token);
    // Proklitik hanya untuk token pertama yang bisa memakainya; stem kanonis ال + kata fungsi
    // sudah mencakup semua bentuk berklitiknya. Varian lam melebur (#61) tanpa proklitik.
    const withProclitics =
      i === 0 && !isProtectedToken(token) && !isCanonicalArticleStem(token)
        ? bases.flatMap((b) => queryProclitics.map((p) => p + b))
        : bases;
    const lam = lamMergedVariant(tokens[i] ?? "");
    const variants = lam === null ? withProclitics : [...withProclitics, lam];
    phrases = phrases.flatMap((ph) => variants.map((v) => [...ph, v])).slice(0, FTS_MAX_PHRASES);
  });
  return { stems, phrases, prefix: false };
}

function columnFilter(columns: readonly FtsColumn[]): string {
  if (columns.length === 0 || columns.some((c) => !FTS_COLUMNS.includes(c))) {
    throw new TypeError(`kolom FTS tidak dikenal: ${columns.join(", ")}`);
  }
  return `{${columns.join(" ")}}`;
}

/** Ekspresi MATCH dari rencana kueri; setiap frasa di-quote (`ftsQuote`). */
export function ftsMatchExpression(
  plan: FtsQueryPlan,
  columns: readonly FtsColumn[] = ["sbody", "sfoot"],
): string {
  const star = plan.prefix ? "*" : "";
  const alternatives = plan.phrases.map((p) => `${ftsQuote(p.join(" "))}${star}`);
  return `${columnFilter(columns)} : (${alternatives.join(" OR ")})`;
}

/**
 * Susun ekspresi MATCH dari kueri pengguna (Arab, boleh bervokal). Kembalikan `null` bila kueri
 * kosong setelah normalisasi; kueri seperti itu tidak boleh dijalankan. Aturan ekspansi:
 * `planFtsQuery`.
 */
export function buildFtsMatch(query: string, opts: FtsMatchOptions = {}): string | null {
  const columns = opts.columns ?? ["sbody", "sfoot"];
  columnFilter(columns);
  const plan = planFtsQuery(query, opts);
  return plan === null ? null : ftsMatchExpression(plan, columns);
}
