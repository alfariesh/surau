// `pnpm ayat:audit`: audit lafaz ayat yang TIDAK punya `passage_ayah_ref` (X28). Hanya membaca korpus
// (D1 remote hanya-SELECT) dan Tanzil simple-clean lokal; tanpa LLM dan tanpa menulis ke DB.
// Setiap paragraf badan dinormalisasi (@surau/text), lalu dicari deret ≥ 3 kata yang juga deret di
// mushaf. Pembanding memakai "kerangka" kata tanpa alif (السموات = السماوات, ابراهيم = ابرهيم) supaya
// beda ejaan kecil tidak menyembunyikan kutipan. Deret yang menimpa rujukan ayat yang sudah ada
// dilewati. Hasilnya daftar calon untuk ditinjau, bukan rujukan baru: pencocok (`matcher.ts`)
// sengaja konservatif, dan lafaz umum ("إن الله على كل شيء قدير") memang bisa ucapan biasa.
//   pnpm ayat:audit [--korpus produksi|staging] [--keluar berkas.tsv] [--tanzil quran-simple-clean.txt]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { normalizeArabic, toRawSpan } from "@surau/text";

import { korpus, openRemoteCorpus } from "../content/cli.ts";

const repo = resolve(import.meta.dirname, "../../../..");

/** Kata minimal deret yang dilaporkan. */
export const AUDIT_MIN_TOKENS = 3;
/** Kata sebelum deret yang diperiksa untuk pengantar ayat. */
const CUE_WINDOW = 3;
const CUE = /^(?:تعالي|قوله|قال|يقول|وجل|عز|قرا|سبحانه|نزلت|الايه)$/u;

/** Kerangka kata: bentuk normal tanpa alif, untuk menyamakan beda ejaan rasm dan imla'. */
export const skeleton = (token: string): string => token.replaceAll("ا", "") || token;

export interface MushafIndex {
  skel: string[];
  /** Pemilik tiap token: "surah:ayah". */
  owner: string[];
  /** Kerangka 3 kata → posisi awal di mushaf. */
  grams: Map<string, number[]>;
}

export function buildMushafIndex(
  lines: readonly { surah: number; ayah: number; text: string }[],
): MushafIndex {
  const skel: string[] = [];
  const owner: string[] = [];
  for (const l of lines) {
    for (const t of normalizeArabic(l.text).text.split(" ").filter(Boolean)) {
      skel.push(skeleton(t));
      owner.push(`${l.surah}:${l.ayah}`);
    }
  }
  const grams = new Map<string, number[]>();
  for (let i = 0; i + AUDIT_MIN_TOKENS <= skel.length; i++) {
    const key = skel.slice(i, i + AUDIT_MIN_TOKENS).join(" ");
    const list = grams.get(key);
    if (list === undefined) grams.set(key, [i]);
    else list.push(i);
  }
  return { skel, owner, grams };
}

export interface AuditHit {
  /** Indeks token awal dan akhir (eksklusif) di paragraf. */
  from: number;
  to: number;
  /** Jumlah letak mushaf yang memuat deret sepanjang ini. */
  places: number;
  /** Letak pertama, "surah:ayah". */
  ayah: string;
  cue: boolean;
}

/** Deret terpanjang yang cocok mushaf, rakus dari kiri, tanpa tumpang tindih. */
export function auditTokens(tokens: readonly string[], index: MushafIndex): AuditHit[] {
  const sk = tokens.map(skeleton);
  const hits: AuditHit[] = [];
  let i = 0;
  while (i + AUDIT_MIN_TOKENS <= sk.length) {
    const starts = index.grams.get(sk.slice(i, i + AUDIT_MIN_TOKENS).join(" ")) ?? [];
    let best = 0;
    let bestStarts: number[] = [];
    for (const p of starts) {
      let n = AUDIT_MIN_TOKENS;
      while (i + n < sk.length && p + n < index.skel.length && sk[i + n] === index.skel[p + n]) n++;
      if (n > best) {
        best = n;
        bestStarts = [p];
      } else if (n === best) bestStarts.push(p);
    }
    if (best === 0) {
      i++;
      continue;
    }
    const before = tokens.slice(Math.max(0, i - CUE_WINDOW), i);
    hits.push({
      from: i,
      to: i + best,
      places: bestStarts.length,
      ayah: index.owner[bestStarts[0] ?? 0] ?? "?",
      cue: before.some((t) => CUE.test(t)),
    });
    i += best;
  }
  return hits;
}

/**
 * Formula zikir dan doa yang kebetulan berlafaz ayat (ADR-133 jenis 3): bukan kutipan, tidak
 * ditautkan. Bentuk kerangka (`skeleton`) dari bentuk normal.
 */
const FORMULAS = [
  "لا اله الا الله",
  "ان لا اله الا",
  "الذي لا اله الا هو",
  "بسم الله الرحمن الرحيم",
  "له الملك وله الحمد",
  "وهو علي كل شيء قدير",
  "ما شاء الله لا",
  "بالله من الشيطان الرجيم",
  "رضي الله عنهم",
  "ان شاء الله",
  "الحمد لله رب العالمين",
  "لا شريك له",
  "من كان يؤمن بالله واليوم الاخر",
  "في سبيل الله",
  "صلي الله عليه",
  "سبحان الله",
].map((f) => f.split(" ").map(skeleton).join(" "));

/** Dugaan jenis (ADR-133): kutipan terlewat, iqtibas, atau formula. Diverifikasi sebelum dipatch. */
export function guessKind(
  tokens: readonly string[],
  h: AuditHit,
): "kutipan" | "iqtibas" | "formula" {
  const span = tokens.slice(h.from, h.to).map(skeleton).join(" ");
  const n = h.to - h.from;
  if (FORMULAS.some((f) => ` ${span} `.includes(` ${f} `) && f.split(" ").length >= n - 1))
    return "formula";
  return h.cue || n >= 7 ? "kutipan" : "iqtibas";
}

/** Kelas calon: kuat (hampir pasti kutipan), sedang (perlu dilihat), lemah (mungkin frasa umum). */
export function grade(h: AuditHit): "kuat" | "sedang" | "lemah" {
  const n = h.to - h.from;
  if (n >= 5 || (n >= 4 && (h.places <= 2 || h.cue))) return "kuat";
  if (n === 4 || (n === 3 && h.cue && h.places <= 3)) return "sedang";
  return "lemah";
}

interface Row {
  id: number;
  toc_node_id: number | null;
  text_raw: string;
}

async function main() {
  const { values } = parseArgs({
    options: {
      korpus: { type: "string", default: "produksi" },
      keluar: { type: "string" },
      tanzil: { type: "string", default: join(repo, "data/raw/tanzil/quran-simple-clean.txt") },
    },
  });
  const tanzil = readFileSync(values.tanzil, "utf8");
  const lines = tanzil
    .split("\n")
    .filter((l) => /^\d+\|\d+\|/u.test(l))
    .map((l) => {
      const [s, a, ...rest] = l.split("|");
      return { surah: Number(s), ayah: Number(a), text: rest.join("|") };
    });
  const index = buildMushafIndex(lines);
  const corpus = await openRemoteCorpus(korpus.parse(values.korpus));
  try {
    const refs = new Map<number, [number, number][]>();
    const refRows = (
      await corpus.db.prepare("SELECT passage_id, char_start, char_end FROM passage_ayah_ref").all()
    ).results as { passage_id: number; char_start: number; char_end: number }[];
    for (const r of refRows)
      refs.set(r.passage_id, [...(refs.get(r.passage_id) ?? []), [r.char_start, r.char_end]]);
    const out: string[] = [
      "grade	kind	passage_id	toc_node_id	char_start	char_end	tokens	places	ayah	cue	text	context",
    ];
    const counts = { kuat: 0, sedang: 0, lemah: 0 };
    const passages = new Set<number>();
    let last = 0;
    for (;;) {
      const rows = (
        await corpus.db
          .prepare(
            "SELECT id, toc_node_id, text_raw FROM passage WHERE edition_id = 1 AND kind = 'body' AND id > ? ORDER BY id LIMIT 1500",
          )
          .bind(last)
          .all()
      ).results as Row[];
      if (rows.length === 0) break;
      for (const p of rows) {
        const norm = normalizeArabic(p.text_raw);
        const tokens = norm.text.split(" ");
        const offsets: number[] = [];
        let at = 0;
        for (const t of tokens) {
          offsets.push(at);
          at += t.length + 1;
        }
        for (const h of auditTokens(tokens, index)) {
          const nStart = offsets[h.from] ?? 0;
          const nEnd = (offsets[h.to - 1] ?? 0) + (tokens[h.to - 1]?.length ?? 0);
          const [rs, re] = toRawSpan(p.text_raw, norm, nStart, nEnd);
          if ((refs.get(p.id) ?? []).some(([a, b]) => rs < b && re > a)) continue;
          const g = grade(h);
          counts[g]++;
          if (g !== "lemah") passages.add(p.id);
          const context = p.text_raw.slice(
            Math.max(0, rs - 120),
            Math.min(p.text_raw.length, re + 60),
          );
          out.push(
            [
              g,
              guessKind(tokens, h),
              p.id,
              p.toc_node_id ?? "",
              rs,
              re,
              h.to - h.from,
              h.places,
              h.ayah,
              h.cue ? 1 : 0,
              p.text_raw.slice(rs, re),
              context.replaceAll(/\s+/gu, " "),
            ].join("\t"),
          );
        }
      }
      last = rows.at(-1)?.id ?? last;
    }
    const file = values.keluar ?? join(repo, "data/build/ayat-audit.tsv");
    writeFileSync(file, `${out.join("\n")}\n`);
    console.log(JSON.stringify({ ...counts, paragraf_kuat_sedang: passages.size, berkas: file }));
  } finally {
    await corpus.dispose();
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
