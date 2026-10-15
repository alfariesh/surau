// Penyusun ekspresi MATCH FTS5 untuk indeks `passage_fts(body, foot, sbody, sfoot)`:
// body/foot = normalizeArabic(text_raw).text, sbody/sfoot = stemText(body/foot). Pencarian memakai
// kolom stem. Aman dari injeksi sintaks: SETIAP token di-quote (operator AND/OR/NEAR/*/^/: dari
// pengguna menjadi literal), dan hasilnya dikirim sebagai SATU parameter terikat (`MATCH ?1`).

import { normalizeArabic } from "./normalize.ts";
import {
  expandQueryToken,
  isProtectedToken,
  kunyaVariants,
  queryProclitics,
  stemToken,
} from "./stem.ts";

/** Kolom indeks `passage_fts` yang boleh dipakai di filter kolom. */
export type FtsColumn = "body" | "foot" | "sbody" | "sfoot";

const FTS_COLUMNS: readonly FtsColumn[] = ["body", "foot", "sbody", "sfoot"];

/** Batas jumlah frasa alternatif hasil ekspansi (kueri FTS tetap kecil dan cepat). */
export const FTS_MAX_PHRASES = 64;

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
 * Susun ekspresi MATCH dari kueri pengguna (Arab, boleh bervokal). Kembalikan `null` bila kueri
 * kosong setelah normalisasi; kueri seperti itu tidak boleh dijalankan.
 *
 * - Satu kata: stem + varian proklitik (`expandQueryToken`), atau tiga bentuk kunyah.
 * - Frasa: hanya token pertama yang diberi varian proklitik (وحب الدنيا, لطلب العلم); token
 *   berikutnya sudah ter-stem (artikel dibuang di indeks juga). Kunyah di posisi mana pun.
 *   Kombinasi dibatasi `FTS_MAX_PHRASES`.
 */
export function buildFtsMatch(query: string, opts: FtsMatchOptions = {}): string | null {
  const columns = opts.columns ?? ["sbody", "sfoot"];
  if (columns.length === 0 || columns.some((c) => !FTS_COLUMNS.includes(c))) {
    throw new TypeError(`kolom FTS tidak dikenal: ${columns.join(", ")}`);
  }
  const filter = `{${columns.join(" ")}}`;
  const stems = normalizeArabic(query)
    .text.split(" ")
    .filter((t) => t !== "")
    .map(stemToken);
  const [first] = stems;
  if (first === undefined) return null;

  if (stems.length === 1) {
    const kunya = kunyaVariants(first);
    if (kunya.length > 1) return `${filter} : (${kunya.map(ftsQuote).join(" OR ")})`;
    const variants = expandQueryToken(first);
    if (opts.suffix === true && first.length >= 3) {
      const extra = first.endsWith("ه") ? [`${first.slice(0, -1)}ت`] : [];
      return `${filter} : (${[...variants, ...extra].map((v) => `${ftsQuote(v)}*`).join(" OR ")})`;
    }
    return `${filter} : (${variants.map(ftsQuote).join(" OR ")})`;
  }

  let phrases: string[][] = [[]];
  stems.forEach((token, i) => {
    const bases = kunyaVariants(token);
    const variants =
      i === 0 && !isProtectedToken(token)
        ? bases.flatMap((b) => queryProclitics.map((p) => p + b))
        : bases;
    phrases = phrases.flatMap((ph) => variants.map((v) => [...ph, v])).slice(0, FTS_MAX_PHRASES);
  });
  return `${filter} : (${phrases.map((p) => ftsQuote(p.join(" "))).join(" OR ")})`;
}
