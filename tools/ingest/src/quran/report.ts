// Laporan pencocok ayat `data/reports/<kitab>-ayat.md` (S12). Di-commit, jadi TANPA teks kitab
// panjang: angka, rujukan juz/halaman + permalink paragraf, rujukan surah:ayat, dan potongan awal
// kutipan ≤ EXCERPT_WORDS kata (disalin dari text_raw, bukan ditulis). Deterministik: sampel acak
// memakai seed tetap.
import { passageAnchor } from "@surau/db";

import type { CorpusRows } from "../rows.ts";
import type { ReportContext } from "../report.ts";
import { CUE_ANCHOR_TOKENS, CUE_MIN_TOKENS, SIMILAR_MIN_SCORE } from "./matcher.ts";
import type { AyahSpan, RejectedSpan } from "./matcher.ts";
import { EXACT_RATIO_MIN, NUMBERING_MISMATCH_MAX } from "./rows.ts";
import type { AyatBuild } from "./rows.ts";

/** Sampel acak untuk diperiksa pemilik/ustadz (T-16). */
export const SAMPLE_SIZE = 20;
const SAMPLE_SEED = 9472;
const EXCERPT_WORDS = 6;
const LIST_MAX = 40;

const num = (n: number): string => n.toLocaleString("id-ID");
const pct = (a: number, b: number): string =>
  b === 0 ? "–" : `${((a / b) * 100).toFixed(1).replace(".", ",")}%`;

/** PRNG deterministik (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Located {
  passageId: number;
  kind: "body" | "foot";
  where: string;
  permalink: string;
  excerpt: (start: number, end: number) => string;
}

function locator(rows: CorpusRows, workSlug: string): (passageId: number) => Located {
  const pages = new Map(rows.page.map((p) => [p.id, p]));
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  return (passageId) => {
    const p = passages.get(passageId);
    const page = p === undefined ? undefined : pages.get(p.page_id);
    if (p === undefined || page === undefined) throw new Error(`paragraf ${passageId} tak dikenal`);
    return {
      passageId,
      kind: p.kind,
      where: `j${page.juz} h${page.page_no}${p.kind === "foot" ? " (catatan kaki)" : ""}`,
      permalink: `/kitab/${workSlug}/${page.juz}/${page.page_no}#${passageAnchor(passageId)}`,
      excerpt: (start, end) => {
        const words = p.text_raw.slice(start, end).split(/\s+/).filter(Boolean);
        const head = words.slice(0, EXCERPT_WORDS).join(" ");
        return words.length > EXCERPT_WORDS ? `${head} …` : head;
      },
    };
  };
}

function refLabel(surahNames: Map<number, string>, s: AyahSpan): string {
  const range = s.ayahTo > s.ayahFrom ? `${s.ayahFrom}–${s.ayahTo}` : String(s.ayahFrom);
  return `QS ${surahNames.get(s.surah) ?? "?"} [${s.surah}]: ${range}`;
}

function spanKind(s: AyahSpan): string {
  const score = String(s.score).replace(".", ",");
  return [
    s.match === "exact"
      ? "persis"
      : s.kind === "bracketed"
        ? `mirip (huruf ${score})`
        : `mirip (kata persis ${score})`,
    s.kind === "bracketed" ? "{…}" : "tanpa kurung",
    s.partial ? "sebagian ayat" : "ayat utuh",
    ...(s.alt > 0 ? [`+${s.alt} letak lain`] : []),
  ].join(", ");
}

const REJECT_LABEL: Record<RejectedSpan["reason"], string> = {
  one_word: "1 kata (disaring)",
  two_words_no_cue: "2 kata tanpa pengantar (disaring)",
  short_inexact: "2–3 kata, tidak persis (cocok mirip tidak dicoba)",
  no_match: "tidak ditemukan, persis maupun mirip",
  below_threshold: `kemiripan < ${String(SIMILAR_MIN_SCORE).replace(".", ",")}`,
  cross_surah: "melintasi batas surah",
};

export function ayatReport(ctx: ReportContext, ayat: AyatBuild, rows: CorpusRows): string {
  const { config } = ctx;
  const s = ayat.stats;
  const at = locator(rows, config.work.slug);
  const surahNames = new Map(rows.quran_surah.map((x) => [x.surah, x.name_latin]));
  const all = ayat.matches.flatMap((m) => m.spans.map((span) => ({ m, span })));
  const random = rng(SAMPLE_SEED);
  const pool = [...all];
  const sample: typeof all = [];
  while (sample.length < SAMPLE_SIZE && pool.length > 0) {
    sample.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }
  sample.sort((a, b) => a.m.passageId - b.m.passageId || a.span.charStart - b.span.charStart);
  const similar = all.filter((x) => x.span.match === "similar");
  const unmatched = ayat.matches.flatMap((m) =>
    m.rejected
      .filter((r) => r.reason !== "one_word" && r.reason !== "two_words_no_cue")
      .map((r) => ({ m, r })),
  );
  const row = (x: { m: { passageId: number }; span: AyahSpan }, i?: number): string => {
    const l = at(x.m.passageId);
    return [
      ...(i === undefined ? [] : [String(i + 1)]),
      l.where,
      `\`${l.permalink}\``,
      refLabel(surahNames, x.span),
      spanKind(x.span),
      l.excerpt(x.span.charStart, x.span.charEnd),
      ...(i === undefined ? [] : [""]),
    ].join(" | ");
  };
  const sources = rows.quran_source
    .map((q) => `\`${q.id}\` ${q.name} ${q.version} (sha256 \`${q.sha256.slice(0, 12)}…\`)`)
    .join("; ");

  const lines = [
    `# Laporan ayat: ${config.work.titleId} (Shamela ${config.shamelaBook})`,
    "",
    "> Dibuat otomatis oleh `pnpm ingest ihya` (`tools/ingest/src/quran`, S12). Jangan disunting tangan.",
    `> Tanpa teks kitab panjang: rujukan juz/halaman, permalink paragraf, rujukan surah:ayat, dan ≤${EXCERPT_WORDS} kata awal kutipan.`,
    "",
    `- Korpus: \`${config.corpusVersion}\` · NORM_VERSION ${ctx.normVersion}`,
    `- Sumber Qur'an: ${sources}`,
    `- Ambang: \`{…}\` mirip = skor penjajaran **huruf** ≥ ${String(SIMILAR_MIN_SCORE).replace(".", ",")} (alif/waw/ya/hamzah dan ه/ت = setengah biaya); tanpa kurung: jangkar ${CUE_ANCHOR_TOKENS} kata persis, minimal ${CUE_MIN_TOKENS} kata, skornya = porsi **kata** yang sama persis (metrik berbeda, jadi bisa < ${String(SIMILAR_MIN_SCORE).replace(".", ",")}). Aturan lengkap: ADR-040.`,
    "",
    "## Ringkasan",
    "",
    "| | Jumlah |",
    "|---|---|",
    `| Bentang \`{…}\` di teks | ${num(s.bracketedSpans)} |`,
    `| Disaring sebelum pencocokan (1 kata: ${num(s.rejectedByReason.one_word)}; 2 kata tanpa pengantar: ${num(s.rejectedByReason.two_words_no_cue)}) | ${num(s.filtered)} |`,
    `| **Tervalidasi** (dicocokkan ke mushaf) | **${num(s.validated)}** |`,
    `| · cocok persis (\`exact\`) | ${num(s.exact)} (${pct(s.exact, s.validated)}) |`,
    `| · mirip, beda ejaan (\`similar\`) | ${num(s.similar)} (${pct(s.similar, s.validated)}) |`,
    `| · tidak cocok: tidak ditautkan (bisa ayat berejaan jauh berbeda; dibiarkan, tidak ditebak) | ${num(s.unmatched)} (${pct(s.unmatched, s.validated)}) |`,
    `| Kutipan tanpa kurung sesudah pengantar (قال تعالى …): persis / mirip | ${num(s.cueExact)} / ${num(s.cueSimilar)} |`,
    `| **Rujukan ayat** (\`passage_ayah_ref\`) | **${num(rows.passage_ayah_ref.length)}** di ${num(s.passages)} paragraf |`,
    `| · sebagian ayat (\`partial\`) | ${num(s.partial)} |`,
    `| · lebih dari satu ayat | ${num(s.multiAyah)} |`,
    `| · lafaz yang sama ada di letak lain (\`alt_count\` > 0) | ${num(s.withAlternatives)} |`,
    "",
    `Gerbang S12: cocok persis ≥ ${Math.round(EXACT_RATIO_MIN * 100)}% dari bentang \`{…}\` tervalidasi → ${pct(s.exact, s.validated)} ${s.exactRatio >= EXACT_RATIO_MIN ? "✓" : "✗"}.`,
    "",
    "## Cek silang penomoran ayat",
    "",
    `Teks Imlaei QUL (berkas Kemenag) dibandingkan dengan Tanzil simple-clean per ayat setelah normalisasi: ${num(ayat.numberingMismatch.length)} ayat beda ejaan (batas ${NUMBERING_MISMATCH_MAX}): ${ayat.numberingMismatch.join(", ") || "–"}. Jumlah ayat per surah sama di Tanzil, terjemahan, transliterasi, dan metadata surah, jadi terjemahan Kemenag tertaut ke nomor ayat yang sama.`,
    "",
    `## ${SAMPLE_SIZE} sampel acak untuk diperiksa (T-16)`,
    "",
    "Buka permalink (situs atau `pnpm dev`), cocokkan kutipan dengan rujukannya, lalu isi kolom **Benar?** (ya / tidak + catatan).",
    "",
    "| # | Letak | Permalink | Rujukan | Jenis | Awal kutipan | Benar? |",
    "|---|---|---|---|---|---|---|",
    ...sample.map((x, i) => `| ${row(x, i)} |`),
    "",
    `## Cocok mirip (\`similar\`, ${num(similar.length)}${similar.length > LIST_MAX ? `, ${LIST_MAX} pertama` : ""})`,
    "",
    "| Letak | Permalink | Rujukan | Jenis | Awal kutipan |",
    "|---|---|---|---|---|",
    ...similar.slice(0, LIST_MAX).map((x) => `| ${row(x)} |`),
    "",
    `## Bentang \`{…}\` tervalidasi yang tidak cocok (${num(unmatched.length)})`,
    "",
    "| Letak | Permalink | Kata | Alasan | Awal bentang |",
    "|---|---|---|---|---|",
    ...unmatched.slice(0, LIST_MAX).map(({ m, r }) => {
      const l = at(m.passageId);
      const why =
        r.score === null
          ? REJECT_LABEL[r.reason]
          : `${REJECT_LABEL[r.reason]} (${String(r.score).replace(".", ",")})`;
      return `| ${l.where} | \`${l.permalink}\` | ${r.tokens} | ${why} | ${l.excerpt(r.charStart, r.charEnd)} |`;
    }),
    "",
  ];
  return lines.join("\n");
}
