// Gema takhrij (X22, ADR-111): al-'Iraqi menakhrij hadits sekali, di kemunculan pertamanya. Bila
// hadits yang sama muncul lagi, paragrafnya tidak bertanda catatan kaki sama sekali (j024: j1 h48
// dan h59 tanpa penanda, takhrijnya di j1 h2), atau catatan kakinya hanya merujuk balik ("تقدم").
// Untuk soal hadits, lafaz hadits seperti itu dicari di catatan kaki lewat `searchText`, lalu
// catatan kaki yang lafaz matannya cocok (dicek kode, bukan model) ikut sebagai pasangan paragraf
// itu. Tidak ada teks yang ditulis: hanya ID catatan kaki yang ditambahkan ke dokumen.
import { InvalidQuery, isCoreError, searchText } from "@surau/core";
import type { AnswerPassage } from "@surau/core";
import type { D1Db } from "@surau/db";
import { FOOTNOTE_MARKER_SOURCE, normalizeArabic } from "@surau/text";

/** Paragraf kandidat teratas yang diperiksa lafaz haditsnya. */
export const ECHO_SCAN = 20;
/** Pencarian gema maksimal per pertanyaan (di luar `MAX_SEARCHES`; beban D1). */
export const ECHO_MAX_SEARCHES = 6;
/** Halaman per pencarian gema. */
const ECHO_SEARCH_LIMIT = 5;
/** Kata lafaz hadits yang dipakai sebagai kueri. */
const SEED_QUERY_TOKENS = 10;
/** Kata lafaz hadits yang dipakai untuk mencocokkan matan catatan kaki. */
const SEED_MATCH_TOKENS = 24;
/** Kata awal matan catatan kaki yang dicocokkan. */
const MATN_TOKENS = 8;
/** Kata matan minimal yang harus cocok, dan porsinya. */
const MATN_MIN_MATCH = 4;
const MATN_MIN_SHARE = 0.75;

const norm = (s: string) => normalizeArabic(s).text;
const FORMULA = norm("صلى الله عليه وسلم");
const MARKER = new RegExp(FOOTNOTE_MARKER_SOURCE, "gu");
/** Kata pembuka sebelum lafaz ("قال صلى الله عليه وسلم إن …", "أنه قال …"). */
const LEAD = new Set(["انه", "قال", "ان", "فقال", "وقال", "يقول"].map(norm));
/** Akhir matan di catatan kaki: kata sumber/keterangan sesudah lafaz hadits. */
const MATN_END = new Set(
  ["أخرجه", "أخرجاه", "رواه", "روياه", "أخرج", "متفق", "الحديث", "ذكره", "وذكره"].map(norm),
);
const REFERRAL = new Set(["تقدم", "وتقدم", "فتقدم", "المتقدم"].map(norm));
const MATN_END_PAIRS = new Set(["لم أجده", "لم أجد", "لم أقف"].map(norm));

/** Lafaz hadits yang takhrijnya dicari, milik paragraf `passage_id`. */
export interface EchoSeed {
  passage_id: number;
  /** Kata lafaz (bentuk normal). */
  tokens: string[];
}

/**
 * Matan catatan kaki takhrij (murni): kata sesudah "حديث" sampai kata sumber/keterangan pertama
 * (`MATN_END`, "لم أجده", atau rujukan "تقدم"). `referral` = matan berakhir pada rujukan, yaitu
 * catatan kaki yang hanya merujuk ke takhrij di tempat lain. `null` bila bukan bentuk "حديث …".
 */
export function footnoteMatn(raw: string): { tokens: string[]; referral: boolean } | null {
  const words = norm(raw).split(" ");
  const start = words.findIndex((w, i) => i < 3 && (w === "حديث" || w === "وحديث"));
  if (start < 0) return null;
  const tokens: string[] = [];
  for (let i = start + 1; i < words.length; i++) {
    const w = words[i]!;
    if (REFERRAL.has(w)) return { tokens, referral: true };
    if (MATN_END.has(w) || MATN_END_PAIRS.has(`${w} ${words[i + 1] ?? ""}`)) break;
    tokens.push(w);
  }
  return { tokens, referral: false };
}

/**
 * Lafaz hadits tanpa penanda di paragraf badan (murni): teks sesudah "صلى الله عليه وسلم" sampai
 * formula berikutnya, bila tidak ada penanda catatan kaki sebelum formula berikutnya. Lafaz yang
 * diakhiri penanda sudah bertakhrij sendiri dan dilewati.
 */
export function unmarkedHadith(raw: string): string[][] {
  const out: string[][] = [];
  // Potongan di antara penanda: lafaz terakhir sebuah potongan diakhiri penanda (bertakhrij),
  // kecuali potongan terakhir paragraf.
  const chunks = raw.split(MARKER).filter((_, i) => i % 2 === 0);
  chunks.forEach((chunk, ci) => {
    const parts = ` ${norm(chunk)} `.split(` ${FORMULA} `).map((s) => s.trim());
    const lastMarked = ci < chunks.length - 1;
    for (let i = 1; i < parts.length; i++) {
      if (i === parts.length - 1 && lastMarked) continue;
      const words = parts[i]!.split(" ").filter((w) => w !== "");
      let lead = 0;
      while (lead < 3 && LEAD.has(words[lead] ?? "")) lead++;
      const tokens = words.slice(lead, lead + SEED_MATCH_TOKENS);
      if (tokens.length >= MATN_MIN_MATCH) out.push(tokens);
    }
  });
  return out;
}

/**
 * Lafaz yang takhrijnya dicari (murni, urut peringkat, ≤ `ECHO_MAX_SEARCHES`): lafaz tanpa penanda
 * di paragraf badan, dan matan catatan kaki yang hanya merujuk balik ("تقدم").
 */
export function echoSeeds(
  ranked: readonly number[],
  passages: ReadonlyMap<number, AnswerPassage>,
): EchoSeed[] {
  const out: EchoSeed[] = [];
  const seen = new Set<string>();
  const add = (passage_id: number, tokens: string[]) => {
    const key = tokens.slice(0, SEED_QUERY_TOKENS).join(" ");
    if (out.length < ECHO_MAX_SEARCHES && !seen.has(key)) {
      seen.add(key);
      out.push({ passage_id, tokens });
    }
  };
  for (const id of ranked.slice(0, ECHO_SCAN)) {
    const p = passages.get(id);
    if (p === undefined) continue;
    if (p.kind === "foot") {
      const matn = footnoteMatn(p.text_raw);
      if (matn?.referral && matn.tokens.length >= MATN_MIN_MATCH) add(id, matn.tokens);
    } else for (const tokens of unmarkedHadith(p.text_raw)) add(id, tokens);
  }
  return out;
}

/**
 * Skor cocok matan catatan kaki dengan lafaz (murni): jumlah dari `MATN_TOKENS` kata awal matan
 * yang ada di lafaz, atau 0 bila di bawah ambang (`MATN_MIN_MATCH` kata dan `MATN_MIN_SHARE`).
 * Catatan kaki rujukan saja ("تقدم") tidak pernah cocok: ia bukan takhrij lengkap.
 */
export function matnScore(footnoteRaw: string, seed: readonly string[]): number {
  const matn = footnoteMatn(footnoteRaw);
  if (matn === null || matn.referral) return 0;
  const head = matn.tokens.slice(0, MATN_TOKENS);
  const words = new Set(seed);
  const hit = head.filter((w) => words.has(w)).length;
  return hit >= MATN_MIN_MATCH && hit >= Math.ceil(head.length * MATN_MIN_SHARE) ? hit : 0;
}

/**
 * Pasangan gema (murni): untuk setiap lafaz, catatan kaki dengan skor tertinggi (seri: ID terkecil,
 * yaitu kemunculan lebih awal), bila belum tertaut ke paragraf itu. Hasil: paragraf → catatan kaki.
 */
export function pickEchoes(
  seeds: readonly EchoSeed[],
  found: readonly (readonly number[])[],
  passages: ReadonlyMap<number, AnswerPassage>,
): Map<number, number[]> {
  const out = new Map<number, number[]>();
  seeds.forEach((seed, i) => {
    const owner = passages.get(seed.passage_id);
    let best: { id: number; score: number } | null = null;
    for (const id of found[i] ?? []) {
      const f = passages.get(id);
      if (f?.kind !== "foot" || id === seed.passage_id) continue;
      if (owner?.footnote_ids.includes(id) || f.edition_id !== owner?.edition_id) continue;
      const score = matnScore(f.text_raw, seed.tokens);
      if (
        score > 0 &&
        (best === null || score > best.score || (score === best.score && id < best.id))
      )
        best = { id, score };
    }
    if (best === null) return;
    const list = out.get(seed.passage_id) ?? [];
    if (!list.includes(best.id)) out.set(seed.passage_id, [...list, best.id]);
  });
  return out;
}

/** Catatan kaki hasil satu pencarian gema (urut peringkat); kueri salah bentuk = kosong. */
export async function searchFootnotes(db: D1Db, seed: EchoSeed): Promise<number[]> {
  try {
    const view = await searchText(db, seed.tokens.slice(0, SEED_QUERY_TOKENS).join(" "), {
      limit: ECHO_SEARCH_LIMIT,
    });
    if (!view.ranked) return [];
    return view.results
      .flatMap((p) => p.hits)
      .filter((h) => h.kind === "foot")
      .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((h) => h.id);
  } catch (error) {
    if (error instanceof InvalidQuery || (isCoreError(error) && error.code === "not_found"))
      return [];
    throw error;
  }
}
