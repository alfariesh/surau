// Pemetaan sitasi Jawab (S19): `content_block_location` → `{passage_id, char_start, char_end}`
// lewat segmen dokumen yang dikirim, dan pembersihan teks model. Model hanya MENUNJUK blok; teks
// Arab yang tampil selalu disalin kode dari DB (aturan teks-arab no. 1). Huruf Arab yang ditulis
// model di luar sitasi dibuang dan dihitung.
import type { TextCitation } from "@anthropic-ai/sdk/resources/messages";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
import { ANSWER_FALSE_PREMISE } from "../../prompts/answer-v3.ts";
import type { AnswerDoc } from "./documents.ts";

/** Batas bentang kutipan eval/tampilan (sourceSpan @surau/core). */
export const SPAN_MAX_CHARS = 2000;

export interface CitedSpan {
  passage_id: number;
  char_start: number;
  char_end: number;
  kind: "body" | "foot";
  /** `cited_text` dari API dibandingkan dengan teks DB di bentang ini (integritas pemetaan). */
  matches_cited_text: boolean;
}

/**
 * Bentang DB untuk satu sitasi. `null` bila bukan `content_block_location` atau indeks di luar
 * dokumen yang dikirim (sitasi ini dibuang). Bentang dipangkas dari spasi tepi dan dipecah di batas
 * segmen bila lebih dari 2.000 karakter.
 */
export function citationSpans(
  citation: TextCitation,
  docs: readonly AnswerDoc[],
): CitedSpan[] | null {
  if (citation.type !== "content_block_location") return null;
  const doc = docs[citation.document_index];
  if (doc === undefined) return null;
  const { start_block_index: from, end_block_index: to } = citation;
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to <= from ||
    to > doc.segments.length
  )
    return null;
  const text = doc.passage.text_raw;
  const segs = doc.segments.slice(from, to);
  const cited = text.slice(segs[0]!.start, segs.at(-1)!.end);
  const matches = cited.trim() === citation.cited_text.trim();
  const out: CitedSpan[] = [];
  let group: { start: number; end: number } | null = null;
  const flush = () => {
    if (group === null) return;
    const raw = text.slice(group.start, group.end);
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    if (raw.trim() !== "")
      out.push({
        passage_id: doc.passage.id,
        char_start: group.start + lead,
        char_end: group.end - trail,
        kind: doc.passage.kind,
        matches_cited_text: matches,
      });
    group = null;
  };
  for (const s of segs) {
    if (group !== null && s.end - group.start > SPAN_MAX_CHARS) flush();
    group = group === null ? { start: s.start, end: s.end } : { start: group.start, end: s.end };
  }
  flush();
  return out;
}

// Huruf Arab (termasuk angka Arab-India) beserta tanda yang menempel (harakat, tatweel, dan tanda
// gabung lain: harakat ber-Script=Inherited, bukan Arabic), dalam satu rentang yang boleh dipisah
// spasi. Tanda gabung yang berdiri sendiri sesudah huruf Arab yang sudah dibuang ikut terbuang.
const ARABIC_RUN =
  /(?:[\p{Script=Arabic}\u0660-\u0669][\p{M}\u0640]*)+(?:\s+(?:[\p{Script=Arabic}\u0660-\u0669][\p{M}\u0640]*)+)*/gu;

/**
 * Buang tag `<cite …>`/`</cite>` yang kadang ditiru model di teksnya (arsip eval S21 j021); isi di
 * antaranya tetap. Sitasi yang sah hanya datang dari field `citations` API, bukan dari teks.
 */
export function stripCiteTags(text: string): string {
  return text.replaceAll(/<\/?cite\b[^<>]*>/giu, "");
}

/** Buang huruf Arab buatan model dari teks (bukan dari kutipan DB). */
export function stripArabic(text: string): { text: string; removed: number } {
  const marked = markArabic(text);
  return { text: marked.text.replaceAll(ARABIC_CUT, "…"), removed: marked.removed };
}

/**
 * Penanda bekas huruf Arab buatan model (ADR-114). Dipasang per blok saat streaming (`markArabic`),
 * dirapikan atas teks gabungan semua blok (`tidyArabicCuts`), dan tidak pernah sampai ke pembaca:
 * pratinjau menampilkannya sebagai "…".
 */
export const ARABIC_CUT = "";

/** Ganti setiap rangkaian huruf Arab buatan model dengan `ARABIC_CUT` (rangkaian berdekatan jadi satu). */
export function markArabic(text: string): { text: string; removed: number } {
  let removed = 0;
  // Angka Arab-India bukan kutipan: menjadi angka ASCII ("catatan kaki nomor (١)" → "(1)", x10
  // j025), bukan bekas. Angka yang menempel pada kata Arab tetap ikut terbuang bersama katanya.
  const marked = text
    .replace(
      /(?<![\p{Script=Arabic}\p{M}\u0640])[\u0660-\u0669]+(?![\p{Script=Arabic}\p{M}])/gu,
      (d) => [...d].map((c) => String(c.charCodeAt(0) - 0x0660)).join(""),
    )
    .replace(ARABIC_RUN, (m) => {
      removed += m.length;
      return ARABIC_CUT;
    });
  if (removed === 0) return { text: marked, removed };
  return {
    text: marked
      .replace(new RegExp(`${ARABIC_CUT}(?:[ \\t\\u00A0,;،]*${ARABIC_CUT})+`, "gu"), ARABIC_CUT)
      .replace(
        new RegExp(`[("“'‘][ \\t\\u00A0]*${ARABIC_CUT}[ \\t\\u00A0]*[)"”'’]`, "gu"),
        ARABIC_CUT,
      )
      .replace(new RegExp(`([*_]{1,3})${ARABIC_CUT}\\1`, "gu"), ARABIC_CUT),
    removed,
  };
}

/** Isi yang tidak mendukung klaim: spasi, tanda baca, angka, penanda daftar/Markdown. */
export const trivial = (text: string) => /^[\s.,;:!?*_\-–—•·()\d]*$/u.test(text);

/**
 * Kata yang menuntut isi sesudahnya ("menyimpulkan bahwa …", "dalam kalimat …"): bila bekas teks
 * Arab langsung sesudah kata ini juga mengakhiri kalimatnya, isi yang dituju hilang (x09: j014,
 * j023, ADR-114). Bekas yang masih diikuti kata Latin tidak memicu ("menyebut doa … sebagai …").
 */
const NEEDS_CONTENT = new Set([
  "bahwa",
  "yaitu",
  "yakni",
  "ialah",
  "adalah",
  "berbunyi",
  "kalimat",
  "lafaz",
  "lafal",
  "sabda",
  "firman",
  "berkata",
  "mengatakan",
  "menyatakan",
  "seharusnya",
  "bersabda",
  "berfirman",
  "mengucapkan",
  "membaca",
  "berdoa",
]);
/** Rujukan lokasi dalam kurung ("(Ihya, j. 4, h. 286)"): tidak dihitung sebagai isi kalimat. */
const NOT_GLOSS = new Set(["hr", "qs", "muttafaq", "riwayat", "lihat", "artinya", "yaitu"]);
const LOCATION_REF = /\((?:[^()\n]*\bj\.\s*\d[^()\n]*)\)/gu;
/** Spasi dalam baris (tanpa baris baru), untuk regex yang disusun. */
const SP = "[ \\t\\u00A0]";
/** Sesudah bekas: akhir kalimat/baris, rujukan lokasi, koma, atau titik dua. */
const ENDS = new RegExp(`^${SP}*(?:[.!?;,:)*_]|\\(|\\n|$)`, "u");
/**
 * Padanan Latin pendek dalam kurung sesudah istilah Arab ("التوكل (tawakal)"): 1–3 kata, bukan
 * rujukan riwayat/ayat ("(HR Muslim)", "(QS …)").
 */
const LATIN_GLOSS = new RegExp(
  `^${SP}*\\((\\p{Script=Latin}[\\p{L}'’-]*(?: [\\p{L}'’-]+){0,2})\\)`,
  "u",
);

/**
 * Rapikan bekas huruf Arab (`ARABIC_CUT`) atas teks gabungan blok, supaya pembaca tidak melihat
 * lubang "…" (x09: 6 dari 42 jawaban, ADR-114). Kalimat dinilai di teks gabungan karena blok
 * Citations API sering hanya potongan kalimat; setiap karakter tetap milik bloknya, jadi sitasi
 * blok tidak bergeser. Batas kalimat: akhir kalimat sendiri (`ownEnd`) atau baris baru.
 * - Kalimat "Status hadits:": bekas menjadi "…" seperti sebelumnya (isinya ditimpa `hadithCheck`).
 * - Istilah di awal butir daftar ("- الصبر: sabar"): bekas dan titik duanya dibuang.
 * - Kalimat dibuang utuh bila bekas mengakhiri kalimat sesudah kata yang menuntut isi ("bahwa …"),
 *   sesudah titik dua, atau bila kalimatnya tinggal kurang dari tiga kata di luar rujukan lokasi.
 * - Bekas yang diikuti padanan Latin pendek dalam kurung diganti padanannya.
 * - Selain itu bekas dibuang tanpa jejak: koma sebelumnya ikut bila sesudahnya akhir kalimat,
 *   rujukan, atau baris baru; di antara dua kata tersisa satu spasi.
 * Hanya blok yang seluruh isinya terbuang bersama kalimatnya yang dibuang; blok bersitasi lain tetap,
 * walau tinggal tanda baca, supaya sitasinya tetap mendukung kalimat itu.
 */
export function tidyArabicCuts<B extends { text: string }>(
  blocks: readonly B[],
): { blocks: B[]; dropped_sentences: number; dropped_blocks: number } {
  if (!blocks.some((b) => b.text.includes(ARABIC_CUT)))
    return { blocks: [...blocks], dropped_sentences: 0, dropped_blocks: 0 };
  const units: string[] = [];
  const owner: number[] = [];
  blocks.forEach((b, i) => {
    for (const u of b.text.split("")) {
      units.push(u);
      owner.push(i);
    }
  });
  // Pernyataan status hadits (label beserta isinya, juga di baris/butir sesudah label) tidak pernah
  // dirapikan: bekasnya menjadi "…" seperti sebelumnya dan isinya ditimpa `hadithCheck`.
  const shown = units.join("").replaceAll(ARABIC_CUT, "…");
  for (const st of hadithStatements(shown))
    for (let i = st.start; i < st.end; i++) if (units[i] === ARABIC_CUT) units[i] = "…";
  const inDropped = new Set<number>();
  const del = (start: number, end: number) => {
    units.splice(start, end - start);
    owner.splice(start, end - start);
  };
  // Sambungan sesudah penghapusan: spasi sebelum tanda baca dan titik ganda yang baru terbentuk.
  const seam = (p: number) => {
    if (p > 0 && /[ \t ]/u.test(units[p - 1] ?? "") && /[.,;!?)]/u.test(units[p] ?? ""))
      del(p - 1, p);
    else if (p > 0 && /[.!?]/u.test(units[p - 1] ?? "") && units[p] === ".") del(p, p + 1);
  };
  let droppedSentences = 0;
  for (;;) {
    const t = units.join("");
    const at = t.indexOf(ARABIC_CUT);
    if (at === -1) break;
    const before = t.slice(0, at);
    const after = t.slice(at + 1);
    const lineStart = before.lastIndexOf("\n") + 1;
    const nl = t.indexOf("\n", at);
    const lineEnd = nl === -1 ? t.length : nl;
    const s = sentencesIn(t, lineStart, lineEnd).find((x) => x.start <= at && at < x.ownEnd);
    const start = s?.start ?? lineStart;
    const end = s?.ownEnd ?? lineEnd;
    const sentence = t.slice(start, end);
    if (hasHadithPrefix(t.slice(lineStart, end))) {
      units[at] = "…";
      continue;
    }
    if (
      new RegExp(`^${SP}*(?:[-*•·–]|\\d{1,2}[.)])?${SP}*$`, "u").test(before.slice(lineStart)) &&
      new RegExp(`^${SP}*:`, "u").test(after)
    ) {
      del(at, at + 1 + new RegExp(`^${SP}*:${SP}*`, "u").exec(after)![0].length);
      continue;
    }
    const lead = /(\p{L}+)[ \t ]*$/u.exec(before)?.[1]?.toLowerCase();
    const ends = ENDS.test(after);
    const words =
      sentence.replace(LOCATION_REF, " ").match(/\p{Script=Latin}[\p{L}'’-]*/gu)?.length ?? 0;
    // Judul dan butir daftar memang pendek: selama masih ada kata Latin, hanya bekasnya yang dibuang.
    const short =
      words > 0 &&
      new RegExp(`^${SP}*(?:#{1,6}${SP}|[-*•·–]${SP}|\\d{1,2}[.)]${SP}|\\*\\*)`, "u").test(
        t.slice(lineStart, lineEnd),
      );
    const colon = new RegExp(`:${SP}*$`, "u").test(before);
    if (
      (words < 3 && !short) ||
      (ends && (colon || (lead !== undefined && NEEDS_CONTENT.has(lead))))
    ) {
      const trailing = new RegExp(`^${SP}*`, "u").exec(t.slice(end))![0].length;
      // Kalimat terakhir di baris/teks: spasi sebelumnya ikut terbuang.
      const last = end + trailing === t.length || t[end + trailing] === "\n";
      const leading = last
        ? new RegExp(`${SP}*$`, "u").exec(t.slice(lineStart, start))![0].length
        : 0;
      for (let i = start; i < end; i++) inDropped.add(owner[i]!);
      // Seluruh baris terbuang (mis. satu butir daftar): baris barunya ikut, tanpa baris kosong.
      const whole =
        start - leading === lineStart ||
        new RegExp(`^${SP}*$`, "u").test(t.slice(lineStart, start - leading));
      if (whole && end + trailing === lineEnd && nl !== -1) del(lineStart, lineEnd + 1);
      else if (whole && end + trailing === lineEnd && lineStart > 0) del(lineStart - 1, lineEnd);
      else del(start - leading, end + trailing);
      droppedSentences++;
      continue;
    }
    const gloss = LATIN_GLOSS.exec(after);
    if (gloss !== null && !NOT_GLOSS.has(/\p{L}+/u.exec(gloss[1]!)![0].toLowerCase())) {
      // "التوكل (tawakal)" → "tawakal": buang bekas, spasi, dan kurungnya.
      del(at + gloss[0].length, at + 1 + gloss[0].length);
      del(at, at + 1 + gloss[0].indexOf("(") + 1);
      continue;
    }
    if (ends) {
      const lead0 = new RegExp(`${SP}*,?${SP}*$`, "u").exec(before.slice(lineStart))![0].length;
      del(at - lead0, at + 1);
      seam(at - lead0);
      continue;
    }
    // Di antara dua kata: satu spasi tetap.
    const lead0 = new RegExp(`${SP}*$`, "u").exec(before.slice(lineStart))![0].length;
    const after0 = new RegExp(`^${SP}*`, "u").exec(after)![0].length;
    if (lead0 > 0) del(at, at + 1 + after0);
    else del(at, at + 1);
  }
  const out: B[] = [];
  let droppedBlocks = 0;
  blocks.forEach((b, i) => {
    const text = units.filter((_, k) => owner[k] === i).join("");
    if (text === "" && b.text !== "" && inDropped.has(i)) droppedBlocks++;
    else out.push({ ...b, text });
  });
  return { blocks: out, dropped_sentences: droppedSentences, dropped_blocks: droppedBlocks };
}

/**
 * Istilah mekanisme pipeline yang bocor ke pembaca ("dokumen yang dilampirkan", "terjemahan AI
 * yang disertakan"; penilaian agent 2026-10-26: ±15 dari 42 jawaban x06). Hanya diagnostik: kata
 * "dokumen" bisa sah di kalimat lain, jadi tidak dibuang.
 */
const PIPELINE_TERMS =
  /(?<!\p{L})(?:dokumen|lampiran|dilampirkan|konteks|terjemahan AI)(?!\p{L})/giu;

/** Jumlah istilah pipeline di jawaban (diagnostik `pipeline_terms`). */
export function pipelineTerms(text: string): number {
  return [...text.matchAll(PIPELINE_TERMS)].length;
}

/** "QS 98:5", "QS. 98:5", "QS Al-Baqarah [2]: 153", "QS Ali 'Imran (3): 7", "QS Al-Baqarah: 153". */
const QS_REF = /(?<!\p{L})QS\.?\s*[^\n:.;]{0,40}?:\s*\d{1,3}/u;
const GLOSS =
  /(?<!\p{L})(?:artinya|berarti|bermakna|maknanya|berbunyi|bunyinya|terjemahnya)(?!\p{L})|"[^"\n]{12,}"|“[^”\n]{12,}”/iu;

/**
 * Kalimat yang menyebut rujukan ayat sekaligus penanda makna/kutipan ("ikhlas berarti …, lihat
 * QS 98:5"): calon parafrase ayat oleh model (j019). Heuristik untuk diagnostik dan eval, bukan
 * penyaring: parafrase makna tidak bisa dideteksi pasti tanpa membandingkan arti, dan kalimat
 * yang menjelaskan penalaran al-Ghazali di sekitar ayat juga bisa tertangkap.
 */
export function ayahGlossSuspects(text: string): number {
  return sentencesIn(text, 0, text.length)
    .map((s) => text.slice(s.start, s.end))
    .filter((s) => QS_REF.test(s) && GLOSS.test(s)).length;
}

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) ?? [];

/** Rangkaian kata berurutan sepanjang `n`, digabung spasi. */
const shinglesOf = (w: readonly string[], n: number) =>
  Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(" "));

/** Panjang rangkaian kata yang sama yang dihitung sebagai isi berulang. */
const REPEAT_SHINGLE = 6;
/**
 * Rumus atribusi dan lokasi yang wajar berulang ("Menurut al-Ghazali dalam Ihya (j. 1, h. 5)").
 * Varian lain ("j. 1 h. 5", "hlm.") tidak ditangkap; diagnostik ini heuristik.
 */
const ATTRIBUTION =
  /(?:menurut\s+)?al-ghazali\s+dalam\s+ihya|\(?(?:ihya\s+)?j\.\s*\d+,\s*h\.\s*\d+(?:[–-]\d+)?\)?/giu;

/**
 * Pasangan kalimat (semua pasangan, bukan hanya bersebelahan) dalam satu paragraf yang berbagi
 * rangkaian ≥ 6 kata persis (run x07 j007/j008/
 * j012: parafrase model lalu terjemahan AI yang sama, "puasa khusus al-khusus adalah puasa hati").
 * Diagnostik `repeated_sentences`, tidak menyaring.
 */
export function repeatedSentences(raw: string): number {
  // Teks buatan kode (pemberitahuan pengganti, baris label status) wajar berulang: tidak dihitung.
  const text = withoutNotices(raw).replace(
    new RegExp(`${ANSWER_HADITH_PREFIX}[^\\n]*`, "gu"),
    (m) => " ".repeat(m.length),
  );
  let n = 0;
  let offset = 0;
  for (const para of text.split(/\n\s*\n/u)) {
    const from = text.indexOf(para, offset);
    offset = from + para.length;
    const sets = sentencesIn(text, from, from + para.length).map(
      (s) =>
        new Set(
          shinglesOf(words(text.slice(s.start, s.end).replace(ATTRIBUTION, " ")), REPEAT_SHINGLE),
        ),
    );
    for (let a = 0; a < sets.length; a++)
      for (let b = a + 1; b < sets.length; b++) if ([...sets[a]!].some((g) => sets[b]!.has(g))) n++;
  }
  return n;
}

/** Panjang rangkaian kata yang dihitung sebagai salinan terjemahan. */
const COPY_SHINGLE = 8;

/**
 * Kalimat jawaban yang memuat rangkaian ≥ 8 kata persis dari terjemahan AI dokumen (salinan, bukan
 * uraian; run x07 j010 "Ketahuilah bahwa batasan ghibah adalah …"). Diagnostik `translation_copy`.
 */
export function translationCopies(text: string, translations: readonly string[]): number {
  const shingles = new Set(translations.flatMap((t) => shinglesOf(words(t), COPY_SHINGLE)));
  if (shingles.size === 0) return 0;
  return sentencesIn(text, 0, text.length).filter((s) =>
    shinglesOf(words(text.slice(s.start, s.end)), COPY_SHINGLE).some((g) => shingles.has(g)),
  ).length;
}

const GRADING_TERM =
  /(?<!\p{L})(?:lemah|dha'?if|da'?if|palsu|maudhu'?|mawdu'?|munkar|matruk|sahih|shahih|hasan|tidak ada asal(?:nya)?|tidak (?:ditemukan|didapati) sanad(?:nya)?|tanpa sanad)(?!\p{L})/iu;
const HADITH_SUBJECT = /(?<!\p{L})(?:hadits|hadis|riwayat|sanad)(?!\p{L})/iu;

/**
 * Kalimat penilaian hadits (istilah derajat + kata hadits/riwayat/sanad) di luar baris label kode
 * yang bloknya tidak menyitasi catatan kaki takhrij mana pun: penilaian tulisan model yang tidak
 * dipaksa `hadithCheck` (risiko yang diterima ADR-106/ADR-110). Dihitung per blok jawaban.
 */
export function uncitedGradings(
  blocks: readonly { text: string; citations: readonly number[] }[],
  isFoot: (n: number) => boolean,
): number {
  return blocks.filter(
    (b) =>
      !b.text.trimStart().startsWith(ANSWER_HADITH_PREFIX) &&
      !NOTICES.some((n) => b.text.includes(n)) &&
      GRADING_TERM.test(b.text) &&
      HADITH_SUBJECT.test(b.text) &&
      !b.citations.some(isFoot),
  ).length;
}

/**
 * Jenis penolakan baku: `not_found` (prompt `answer@1`+) atau `false_premise` (`answer@3`+), bila
 * kalimat bakunya ada di paragraf pertama (model kadang menulis satu kalimat pengantar dulu);
 * `null` bila jawaban biasa. Kalimat baku di paragraf berikutnya tidak dihitung.
 */
export function refusalKind(text: string): "not_found" | "false_premise" | null {
  const first = text.trimStart().split(/\n\s*\n/u)[0] ?? "";
  const flat = first.replaceAll(/[*_#>]/gu, "");
  if (flat.includes(ANSWER_NOT_FOUND.slice(0, -1))) return "not_found";
  if (flat.includes(ANSWER_FALSE_PREMISE.slice(0, -1))) return "false_premise";
  return null;
}

/** Jawaban diawali salah satu kalimat penolakan baku. */
export function isNotFound(text: string): boolean {
  return refusalKind(text) !== null;
}

/** Pengganti kalimat status hadits yang tidak didukung takhrij tersitasi (aturan teks-arab no. 6). */
export const HADITH_UNKNOWN = `${ANSWER_HADITH_PREFIX} belum diketahui (tidak ada takhrij al-'Iraqi yang tersitasi untuk kalimat ini).`;

/**
 * Pengganti NETRAL (peninjau S21 putaran 3–4): dipakai bila jawaban menyitasi takhrij di tempat
 * lain, karena "belum diketahui" bisa keliru (takhrijnya ada) dan menunjuk takhrij pada kutipan bisa
 * menunjuk takhrij hadits lain; juga untuk pernyataan yang takhrijnya ambigu atau diklaim kelompok
 * lain. Sejak X06 menunjuk bagian "Status hadits" (status tiap takhrij yang dikutip beserta lokasi
 * haditsnya), TANPA mengaitkannya dengan kalimat ini (bagian itu bisa hanya memuat hadits lain,
 * peninjau X06). Sejak pipeline@8 tanpa "tidak dipastikan": sesudah takhrij disampaikan benar,
 * kata itu terbaca bertentangan (penilaian agent 2026-10-26, j025–j029). Pemberitahuan yang
 * berdiri sendiri satu baris dibuang bila bagian "Status hadits" berisi (`hadithCheck`); tanpa klaim
 * status sama sekali, `hadithCheck` memakai `HADITH_UNKNOWN`.
 */
export const HADITH_NOT_CITED = `${ANSWER_HADITH_PREFIX} lihat bagian "Status hadits", yang memuat status tiap takhrij yang dikutip beserta lokasi haditsnya.`;

const NOTICES = [HADITH_UNKNOWN, HADITH_NOT_CITED] as const;
/** Pemberitahuan pengganti dimulai di `pos`: bukan label dan bukan pernyataan (tidak diperiksa ulang). */
const noticeAt = (text: string, pos: number) => NOTICES.some((n) => text.startsWith(n, pos));
const withoutNotices = (line: string) =>
  NOTICES.reduce((acc, n) => acc.replaceAll(n, " ".repeat(n.length)), line);

export interface HadithStatement {
  /**
   * Isi KALIMAT itu saja, ringkas (≤120 karakter). Sejak X06 tidak lagi menjadi status yang tampil:
   * status klaim dibuat kode dari istilah takhrij (`takhrijLabel`), kalimatnya diganti teks label.
   */
  status: string;
  /**
   * Awal rentang penggantian: awalan "Status hadits:" (termasuk penanda Markdown yang menempel)
   * untuk kalimat label, atau awal kalimat untuk kalimat lain/butir (penanda daftar tetap tampil).
   */
  start: number;
  /** Akhir rentang penggantian (eksklusif, termasuk tanda baca): akhir kalimat yang sadar singkatan. */
  end: number;
  /**
   * Akhir rentang KEPEMILIKAN sitasi (eksklusif): akhir kalimat terdekat (`nearestEnd`), sehingga
   * sitasi kalimat sesudahnya tidak ikut dihitung milik pernyataan ini.
   */
  ownEnd: number;
  /**
   * Kelompok: kalimat-kalimat dari satu baris label atau satu butir (dianggap satu hadits). Satu
   * takhrij boleh disitasi beberapa kalimat dalam SATU kelompok; dua kelompok = konflik.
   */
  group: number;
  /** Pernyataan model sendiri berbunyi "belum/tidak diketahui": penggantinya tetap "belum diketahui". */
  unknown: boolean;
  /** Rentang penggantian dimulai di awalan "Status hadits:" (bukan kalimat butir/lanjutan). */
  prefixed: boolean;
}

const HADITH_WORD = "[hḥ]ad[iī](?:ts|th|st|s|t)";
const WORD = "[\\p{L}'’ʻ-]+";
const LABEL_HEAD = "(?<![\\p{L}\\p{N}])(?:status|derajat|kualitas)";

/**
 * Label status hadits yang toleran (S21, ADR-064 butir 7, tiga putaran peninjau S21):
 * - "Status/Derajat/Kualitas", ≤2 kata sisipan ("Status masing-masing hadits"), "hadits/hadis/
 *   hadist/hadith/ḥadīts", bentuk ulang ("hadits-hadits"), akhiran "-nya", lalu ≤8 kata, koma, satu
 *   kurung, atau kutipan sebelum pemisah ("tersebut adalah sebagai berikut", "(menurut al-'Iraqi)");
 *   pemisah titik dua (biasa/lebar), "—", "–", atau "-" berspasi;
 * - baris label tanpa pemisah ("**Status hadits**", "Status hadits ini"): hanya di awal baris dan
 *   ≤2 kata sesudah kata hadits, supaya kalimat biasa yang kebetulan berakhir di "… derajat hadits
 *   tersebut dalam catatan kaki" tidak menjadi label;
 * - "Status:"/"Statusnya:" tanpa kata hadits (wajib titik dua). "Derajat:"/"Kualitas:" tanpa kata
 *   hadits TIDAK, karena lazim untuk tingkatan amal ("tiga derajat: puasa umum, …").
 * Penanda tebal/miring hanya ikut bila menempel pada label ("**Status"), supaya penanda daftar "* "
 * tidak ikut terganti. Batas kata Unicode (garis bawah dianggap huruf oleh `\b`).
 */
const HEAD_HADITH = `${LABEL_HEAD}(?:${SP}+${WORD}){0,2}?${SP}+${HADITH_WORD}(?:-${HADITH_WORD})?(?:nya)?(?![\\p{L}\\p{N}])`;
/** Tepat sesudah awal baris (+ penanda daftar/tebal opsional): syarat label tanpa pemisah. */
const AT_LINE_START = `(?<=(?:^|\\n)${SP}*(?:(?:[-*•·–]|\\d{1,2}[.)]|[a-z][.)])${SP}+)?(?:[*_]{1,3})?)`;
const PREFIX_SOURCE =
  `(?:[*_]{1,3}(?=\\p{L}))?(?:` +
  `${HEAD_HADITH}(?:${SP}*,?${SP}+(?:\\([^()\\n]{0,80}\\)|"[^"\\n]{0,80}"|“[^”\\n]{0,80}”|${WORD})){0,8}?` +
  `${SP}*(?:[*_]{1,3}${SP}*)?(?:[:\\uFF1A]|[—–]|-(?=${SP}))` +
  `|${AT_LINE_START}${HEAD_HADITH}(?:${SP}+${WORD}){0,2}?${SP}*(?:[*_]{1,3})?(?=${SP}*\\r?(?:\\n|$))` +
  `|(?<![\\p{L}\\p{N}])status(?:nya)?(?![\\p{L}\\p{N}])${SP}*(?:[*_]{1,3}${SP}*)?[:\\uFF1A]` +
  `)(?:${SP}*[*_]{1,3})?`;
const prefixRe = (flags: string) => new RegExp(PREFIX_SOURCE, flags);

/** Ada awalan status hadits (untuk menahan pratinjau sejak awalan muncul, juga bila terbelah). */
export function hasHadithPrefix(text: string): boolean {
  return prefixRe("iu").test(text);
}

/** Singkatan yang titiknya bukan akhir kalimat (HR. Bukhari, w. 505 H, saw., dkk., no. 12). */
const ABBREVIATIONS = new Set([
  "al",
  "ibn",
  "bin",
  "hr",
  "r",
  "ra",
  "w",
  "saw",
  "swt",
  "as",
  "dkk",
  "dll",
  "dsb",
  "no",
  "h",
  "hlm",
  "j",
  "jil",
  "juz",
  "cet",
  "qs",
]);

/**
 * Indeks akhir kalimat (posisi tanda baca) atau `limit`, versi KONSERVATIF (rentang terpanjang,
 * untuk penggantian). Titik sesudah angka atau ")" ADALAH akhir kalimat (format lokasi
 * "(j. 1, h. 5)." wajib di prompt), kecuali tepat sesudah singkatan yang dikenal atau rangkaian
 * huruf bertitik ("r.a", "s.a.w").
 */
function sentenceEnd(text: string, from: number, limit: number): number {
  const re = /[.!?](?=\s|$)/gu;
  re.lastIndex = from;
  for (let m = re.exec(text); m !== null && m.index < limit; m = re.exec(text)) {
    if (text[m.index] !== ".") return m.index;
    const before = text.slice(from, m.index);
    const word = /(\p{L}+)$/u.exec(before)?.[1]?.toLowerCase();
    if (word !== undefined && ABBREVIATIONS.has(word)) continue;
    if (/(?:^|[\s(])(?:\p{L}\.)+\p{L}$/u.test(before)) continue;
    return m.index;
  }
  return limit;
}

/** Singkatan rujukan yang biasanya diikuti nama/angka berhuruf besar ("HR. Muslim", "QS. Al-…"). */
const CITE_ABBREVIATIONS = new Set(["hr", "no", "h", "hlm", "j", "jil", "juz", "w", "cet", "qs"]);

/**
 * Akhir kalimat TERDEKAT (untuk kepemilikan sitasi dan pemenggalan kalimat): tanda baca yang
 * diikuti akhir baris/teks, atau spasi + huruf besar/penanda tebal/kutip pembuka — juga sesudah
 * singkatan seperti "saw." atau "dkk." — kecuali singkatan rujukan ("HR. Muslim"). Kurung sesudah
 * titik ("r.a. (w. 59 H)") bukan awal kalimat baru. Tidak pernah melewati akhir konservatif.
 */
function nearestEnd(text: string, from: number, limit: number): number {
  const conservative = sentenceEnd(text, from, limit);
  const re = /[.!?]/gu;
  re.lastIndex = from;
  for (let m = re.exec(text); m !== null && m.index < conservative; m = re.exec(text)) {
    if (/^[ \t\u00A0\r]*$/u.test(text.slice(m.index + 1, limit))) return m.index;
    if (!/^[ \t\u00A0]+[\p{Lu}*_"“‘]/u.test(text.slice(m.index + 1, m.index + 4))) continue;
    const word = /(\p{L}+)$/u.exec(text.slice(from, m.index))?.[1]?.toLowerCase();
    if (text[m.index] === "." && word !== undefined && CITE_ABBREVIATIONS.has(word)) continue;
    return m.index;
  }
  return conservative;
}

interface Sentence {
  start: number;
  ownEnd: number;
  end: number;
}

/** Kalimat-kalimat dalam [from, to), dipenggal di akhir kalimat terdekat. */
function sentencesIn(text: string, from: number, to: number): Sentence[] {
  const out: Sentence[] = [];
  let at = from;
  while (at < to) {
    while (at < to && /\s/u.test(text[at]!)) at++;
    if (at >= to) break;
    const ownEnd = Math.min(nearestEnd(text, at, to) + 1, to);
    const end = Math.max(ownEnd, Math.min(sentenceEnd(text, at, to) + 1, to));
    out.push({ start: at, ownEnd, end });
    at = ownEnd;
  }
  return out;
}

const cleanStatus = (raw: string) =>
  raw
    .replace(/^\s*(?:[-*•·–]|\d{1,2}[.)]|[a-z][.)])\s+/u, "")
    .replace(/[*_]/gu, "")
    .trim()
    .replace(/[.;,:!?]+$/u, "")
    .trim();

/** Potong ±120 karakter di batas kata, dengan elipsis bila terpotong. */
function shortStatus(status: string): string {
  if (status.length <= 120) return status;
  const cut = status.slice(0, 120);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Penanda butir daftar di awal baris ("- ", "* ", "• ", "1. ", "a) "). */
const LIST_MARKER = /^[ \t\u00A0]*(?:[-*•·–]|\d{1,2}[.)]|[a-z][.)])[ \t\u00A0]+/u;
/** Isi baris sebelum label: hanya spasi dan (opsional) penanda daftar. */
const LINE_LEAD = /^[ \t\u00A0]*(?:(?:[-*•·–]|\d{1,2}[.)]|[a-z][.)])[ \t\u00A0]+)?$/u;
const isBlank = (s: string) => /^[ \t\u00A0\r*_]*$/u.test(s);

/**
 * Istilah penilaian hadits (Latin/Indonesia), juga kata ingkar umum ("tidak ditemukan sanadnya").
 * Dipakai untuk kalimat tambahan di baris/butir status dan paragraf di bagian status.
 */
const GRADING =
  /(?<!\p{L})(?:s[h]?[aoā]h[iī]h|ṣaḥīḥ|[hḥ]asan|[dḍ][hl]?[aoā]['ʿ’‘ʻ]?[iīy]f|lemah|palsu|dusta|ma[uw][dḍ]h?[uū]|mun(?:g)?kar|matr[uū]k|munq[aā][tṭ]h?[iī]|majh[uū]l|b[aā][tṭ]h?il|mursal|ma[uw]q[uū]f|marf[uū]|muttafaq|mu['ʿ’‘ʻ]?allaq|gharib|jayyid|kuat|hujjah|tidak|tanpa|belum)(?!\p{L})/iu;

/** Pernyataan model yang sendiri menyatakan statusnya belum/tidak diketahui atau tidak bisa ditentukan. */
const UNKNOWN_STATEMENT =
  /^(?:masih\s+)?(?:belum|tidak)\s+(?:diketahui|dapat\s+(?:ditentukan|dipastikan|diketahui))(?!\p{L})/iu;

/** Kata yang boleh ada di kalimat pengantar daftar ("sebagai berikut", "menurut al-'Iraqi:"). */
const INTRO_WORDS = new Set([
  "sebagai",
  "berikut",
  "berikutnya",
  "rincian",
  "rinciannya",
  "ringkasan",
  "ringkasnya",
  "menurut",
  "adalah",
  "ialah",
  "yaitu",
  "yakni",
  "ini",
  "itu",
  "tersebut",
  "dari",
  "dalam",
  "di",
  "bawah",
  "takhrij",
  "catatan",
  "kaki",
  "al-'iraqi",
  "al-’iraqi",
  "al-‘iraqi",
  "al-ʻiraqi",
  "al-iraqi",
  "masing-masing",
  "tiap",
  "tiap-tiap",
  "setiap",
  "semua",
  "para",
  "hadits",
  "hadis",
  "sbb",
]);

/** Kalimat pengantar daftar: hanya berisi kata pengantar (daftar putih, peninjau S21). */
function isIntro(inline: string): boolean {
  const words = inline
    .toLowerCase()
    .replaceAll(/[*_\r:：.,;()"“”]/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
  return words.length > 0 && words.every((w) => INTRO_WORDS.has(w));
}

interface Item {
  start: number;
  end: number;
}

/**
 * Butir sesudah baris label (sampai `limit` = awalan berikutnya; baris yang memuat awalan lain
 * menghentikan pencarian):
 * - "first" (baris label kosong): baris isi pertama selalu butir (juga sesudah baris kosong);
 * - "first"/"section" (baris label pengantar): baris berpenanda daftar, baris tanpa penanda tepat
 *   sesudah butir = lanjutan butir, dan paragraf sesudah baris kosong yang memuat istilah penilaian;
 * - "tight" (baris label sudah berisi status): hanya baris berpenanda daftar yang rapat (tanpa baris
 *   kosong) dan memuat istilah penilaian, supaya daftar biasa sesudahnya tidak ikut.
 */
function itemsAfter(
  text: string,
  from: number,
  limit: number,
  mode: "first" | "section" | "tight",
): Item[] {
  const items: Item[] = [];
  let at = from;
  let afterBlank = false;
  let expectFirst = mode === "first";
  while (at < limit && text[at] === "\n") {
    const lineStart = at + 1;
    const nl = text.indexOf("\n", lineStart);
    const lineEnd = nl < 0 ? text.length : nl;
    const line = text.slice(lineStart, lineEnd);
    if (lineStart >= limit || lineEnd > limit || prefixRe("iu").test(withoutNotices(line))) break;
    at = lineEnd;
    if (isBlank(line)) {
      if (mode === "tight") break;
      afterBlank = true;
      continue;
    }
    const marker = LIST_MARKER.exec(line);
    // Baris pemberitahuan pengganti (putaran ulang) tetap bagian dari bagian status, tetapi kata
    // "belum/tidak" di dalamnya tidak dihitung istilah penilaian.
    const grading = NOTICES.some((n) => line.includes(n)) || GRADING.test(withoutNotices(line));
    if (marker !== null && (mode !== "tight" || grading))
      items.push({ start: lineStart + marker[0].length, end: lineEnd });
    else if (expectFirst) items.push({ start: lineStart, end: lineEnd });
    else if (mode !== "tight" && !afterBlank && items.length > 0) items.at(-1)!.end = lineEnd;
    else if (mode !== "tight" && afterBlank && grading)
      items.push({ start: lineStart, end: lineEnd });
    else break;
    expectFirst = false;
    afterBlank = false;
  }
  return items;
}

/**
 * Pernyataan status hadits di teks gabungan, satu per KALIMAT:
 * - kalimat sesudah label "Status hadits: …" (status = isi kalimat itu saja), ditambah kalimat
 *   berikutnya di baris yang sama yang memuat istilah penilaian;
 * - butir/paragraf sesudah label yang mengakhiri baris atau berupa pengantar, atau sesudah label di
 *   awal baris (lihat `itemsAfter`): kalimat pertama tiap butir selalu pernyataan, kalimat
 *   berikutnya bila memuat istilah penilaian. Kalimat pengantar ("sebagai berikut:") sebelum butir
 *   bukan pernyataan.
 * Setiap pernyataan wajib menyitasi takhrijnya sendiri (`hadithCheck`).
 */
export function hadithStatements(text: string): HadithStatement[] {
  const out: HadithStatement[] = [];
  let groups = 0;
  const push = (start: number, from: number, s: Sentence, group: number) => {
    if (noticeAt(text, s.start) || noticeAt(text, start)) return;
    const status = cleanStatus(text.slice(from, s.ownEnd));
    if (status !== "")
      out.push({
        status: shortStatus(status),
        start,
        end: s.end,
        ownEnd: s.ownEnd,
        group,
        unknown: UNKNOWN_STATEMENT.test(status),
        prefixed: start !== from,
      });
  };
  const prefixes = [...text.matchAll(prefixRe("giu"))]
    .filter((m) => !noticeAt(text, m.index))
    .map((m) => ({ start: m.index, bodyStart: m.index + m[0].length }));
  prefixes.forEach((p, i) => {
    const nextPrefix = prefixes[i + 1]?.start ?? text.length;
    const nl = text.indexOf("\n", p.bodyStart);
    const lineEnd = Math.min(nl < 0 ? text.length : nl, nextPrefix);
    const inline = withoutNotices(text.slice(p.bodyStart, lineEnd));
    const blank = isBlank(inline);
    const atLineStart = LINE_LEAD.test(
      text.slice(text.lastIndexOf("\n", p.start - 1) + 1, p.start),
    );
    const intro = !blank && isIntro(inline);
    // Label yang mengakhiri baris atau berupa pengantar selalu membuka butir di bawahnya (juga
    // "Adapun status hadits-hadits …:"); mode rapat hanya untuk label di awal baris, supaya awalan
    // di dalam butir daftar tidak menelan butir saudaranya.
    const items =
      blank || intro
        ? itemsAfter(text, lineEnd, nextPrefix, blank ? "first" : "section")
        : atLineStart
          ? itemsAfter(text, lineEnd, nextPrefix, "tight")
          : [];
    if (!blank && !(intro && items.length > 0)) {
      const group = groups++;
      sentencesIn(text, p.bodyStart, lineEnd).forEach((s, k) => {
        if (k === 0) push(p.start, p.bodyStart, s, group);
        else if (GRADING.test(text.slice(s.start, s.ownEnd))) push(s.start, s.start, s, group);
      });
    }
    for (const it of items) {
      const group = groups++;
      sentencesIn(text, it.start, it.end).forEach((s, k) => {
        if (k === 0 || GRADING.test(text.slice(s.start, s.ownEnd)))
          push(s.start, s.start, s, group);
      });
    }
  });
  return out;
}
