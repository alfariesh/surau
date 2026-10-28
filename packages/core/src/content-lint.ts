// Pemeriksa teks draf konten tanpa DB (X22, standar docs/09-konten.md): bahasa narasi
// (`narrativeProblems`: tanpa huruf Arab, fatwa, sapaan, status hadits, parafrase ayat), panjang,
// judul dan soal yang tidak monoton, gagasan meta, janji manfaat, dan rujukan antarbutir. Dipakai
// luring oleh CLI (CI) dan sebagai bagian `checkContentDraft` (MCP `/redaksi`).
import { CONTENT_LIMITS, CONTENT_MODELS } from "./content-schema.ts";
import type { ContentDraft, ContentIssue } from "./content-schema.ts";
import { narrativeProblems, quoteTranslationTextProblems } from "./narrative-check.ts";

type Range = readonly [number, number];

export interface ContentLint {
  errors: ContentIssue[];
  warnings: ContentIssue[];
}

/** Jumlah kata (dipisah spasi). */
export const wordCount = (t: string): number => t.trim().split(/\s+/u).filter(Boolean).length;

const PROBLEM_MESSAGE: Readonly<Record<string, string>> = {
  empty: "teks kosong",
  arabic: "memuat huruf Arab; teks Arab hanya boleh disalin kode lewat passage_id + offset",
  placeholder: "memuat placeholder ayat atau rujukan QS bernomor",
  markdown: "memuat Markdown atau butir daftar",
  newline: "memuat baris baru",
  markup: "memuat tanda <, >, {, atau }",
  preamble: "dibuka basa-basi (Berikut ini…, Ringkasan:)",
  meta: "memuat komentar model tentang pekerjaannya",
  fatwa: "bahasa fatwa atau perintah atas nama pembaca; pakai bahasa atribusi",
  address: "menyapa pembaca (Anda/kamu); narasi selalu orang ketiga",
  first_person: "kata ganti orang pertama di narasi (aku/saya/kami/kita)",
  hadith_status:
    'menulis status hadits (mis. "hadits hasan", "sanadnya lemah"); status hanya dari takhrij yang ditampilkan kode',
  ayah_paraphrase:
    'menulis isi atau makna ayat (mis. "Allah berfirman", "ayat:", "ayat ini menyatakan"); ayat hanya tampil dari kode',
};

/** Pembuka topik datar yang dilarang untuk inti ("Bagian ini membahas …"). */
const TOPIC_OPENER =
  /^(?:bagian|teks|bab|pasal|kitab|uraian|pembahasan|tulisan)\s+ini\s+(?:membahas|berisi|adalah|menjelaskan|menguraikan|mengulas|memuat|berbicara)/iu;
/** Judul gagasan yang membicarakan babnya sendiri, bukan isi (audit 08: gagasan meta). */
const META_TITLE =
  /\b(?:bab|bagian|pasal|pembahasan|kitab|uraian|tulisan)\s+ini\b|\bbertujuan\b|\btujuan\s+(?:bab|pembahasan)\b/iu;
/** Janji manfaat atas nama Surau (docs/05 §12) di prosa: hasil yang dijanjikan kepada pembaca. */
const PROMISE =
  /\b(?:dijamin|niscaya|raihlah|kuasai(?:lah)?|kunci\s+sukses|rahasia\s+(?:sukses|bahagia)|ubah\s+hidup|hidup\s+(?:anda\s+)?lebih\s+(?:baik|bahagia|tenang)|menjadi\s+pribadi\s+(?:yang\s+)?(?:lebih|sukses|unggul))\b/iu;
/** Judul (Faedah, Jalur) lebih ketat: tujuan atau hasil ("… agar hati tenang") = janji. */
const PROMISE_TITLE = new RegExp(
  String.raw`\b(?:agar|supaya|biar|dijamin|pasti|raih|kuasai|cara\s+(?:cepat|mudah))\b|${PROMISE.source}`,
  "iu",
);
const STARTS_GHAZALI = /^al-?ghazali\b/iu;
/**
 * Judul gagasan menyebut siapa berpendapat (docs/05 §12): penulis, tokoh/kelompok yang dinukil,
 * atau kata atribusi. Boleh di awal ("Al-Ghazali membedakan …") atau di anak kalimat
 * ("…, menurut al-Ghazali"; opsi A riset 08), supaya judul tidak seragam.
 */
const HOLDER =
  /\b(?:al-?ghazali|penulis(?:nya)?|menurut|dinukil|dibantah|dikutip|kaum|golongan|kelompok|sebagian|ulama|ahli|kalangan|imam|sahabat|nabi|orang-orang)\b/iu;
const STARTS_MENURUT = /^menurut\s+al-?ghazali\b/iu;
const HONORIFIC_UPPER = /\b(?:SWT|SAW|S\.W\.T\.?|S\.A\.W\.?)(?![\p{L}])/u;

class Collector implements ContentLint {
  errors: ContentIssue[] = [];
  warnings: ContentIssue[] = [];
  error(code: string, path: string, message: string): void {
    this.errors.push({ code, path, message });
  }
  warn(code: string, path: string, message: string): void {
    this.warnings.push({ code, path, message });
  }
  /** Teks narasi: masalah bahasa + panjang kata. */
  narrative(path: string, text: string, range: Range): void {
    for (const p of narrativeProblems(text)) {
      this.error(p, path, PROBLEM_MESSAGE[p] ?? p);
    }
    this.length(path, text, range);
    if (HONORIFIC_UPPER.test(text)) {
      this.warn("honorific", path, 'pakai "Allah Swt." dan "Nabi saw." (huruf kecil)');
    }
  }
  length(path: string, text: string, [lo, hi]: Range): void {
    const n = wordCount(text);
    if (n < lo || n > hi) this.error("length", path, `${n} kata; standar ${lo}–${hi} kata`);
  }
}

interface PointLike {
  judul: string;
  isi: string;
  sikap: string;
  jenis: string;
  dasar: readonly number[];
  soal: { tanya: string; jawab: string };
}

interface PointLimits {
  judul: Range;
  isi: Range;
  tanya: Range;
  jawab: Range;
}

function lintPoints(c: Collector, points: readonly PointLike[], limits: PointLimits): void {
  points.forEach((g, i) => {
    const at = `isi.gagasan[${i}]`;
    c.narrative(`${at}.judul`, g.judul, limits.judul);
    if (!HOLDER.test(g.judul)) {
      c.error(
        "title_no_holder",
        `${at}.judul`,
        'judul menyebut siapa berpendapat (docs/05 §12), mis. "…, menurut al-Ghazali"',
      );
    }
    if (META_TITLE.test(g.judul)) {
      c.error(
        "meta_title",
        `${at}.judul`,
        "judul membicarakan babnya sendiri; tulis isi gagasannya",
      );
    }
    if (/[.?!]$/u.test(g.judul.trim())) {
      c.warn("title_punctuation", `${at}.judul`, "judul tidak diakhiri tanda baca");
    }
    c.narrative(`${at}.isi`, g.isi, limits.isi);
    if (g.jenis === "advice" && g.sikap !== "author") {
      c.error("advice_not_author", `${at}.jenis`, "anjuran hanya untuk pendapat penulis sendiri");
    }
    if (new Set(g.dasar).size !== g.dasar.length) {
      c.warn("duplicate_basis", `${at}.dasar`, "passage_id ganda di dasar");
    }
    c.narrative(`${at}.soal.tanya`, g.soal.tanya, limits.tanya);
    if (!g.soal.tanya.trim().endsWith("?")) {
      c.error("no_question_mark", `${at}.soal.tanya`, "pertanyaan diakhiri tanda tanya");
    }
    c.narrative(`${at}.soal.jawab`, g.soal.jawab, limits.jawab);
    if (g.soal.jawab.trim().endsWith("?")) {
      c.error("answer_is_question", `${at}.soal.jawab`, "jawaban berupa kalimat pernyataan");
    }
  });
  // Monoton (audit 08: 119/119 judul "Al-Ghazali …", 78% soal "Menurut al-Ghazali, …").
  const n = points.length;
  const ghazali = points.filter((g) => STARTS_GHAZALI.test(g.judul.trim())).length;
  const maxGhazali = Math.max(1, Math.floor(n / 3));
  if (ghazali > maxGhazali) {
    c.error(
      "monotone_titles",
      "isi.gagasan",
      `${ghazali} dari ${n} judul dibuka "Al-Ghazali"; paling banyak ${maxGhazali}`,
    );
  }
  const menurut = points.filter((g) => STARTS_MENURUT.test(g.soal.tanya.trim())).length;
  const maxMenurut = Math.max(1, Math.floor(n / 2));
  if (menurut > maxMenurut) {
    c.error(
      "monotone_questions",
      "isi.gagasan",
      `${menurut} dari ${n} soal dibuka "Menurut al-Ghazali"; paling banyak ${maxMenurut}`,
    );
  }
  const openers = new Map<string, number>();
  for (const g of points) {
    const key = g.judul.trim().toLowerCase().split(/\s+/u).slice(0, 2).join(" ");
    openers.set(key, (openers.get(key) ?? 0) + 1);
  }
  for (const [key, count] of openers) {
    if (count > 1 && n > 2) {
      c.warn("repeated_opener", "isi.gagasan", `${count} judul dibuka "${key}"`);
    }
  }
}

interface QuoteLike {
  gagasan: number;
  passage_id: number;
  char_start: number;
  char_end: number;
  terjemahan: string;
}

function lintQuotes(c: Collector, quotes: readonly QuoteLike[], points: number): void {
  const [lo, hi] = CONTENT_LIMITS.kutipan.chars;
  quotes.forEach((q, i) => {
    const at = `isi.kutipan[${i}]`;
    if (q.gagasan > points) {
      c.error("unknown_point", `${at}.gagasan`, `gagasan ${q.gagasan} tidak ada`);
    }
    const span = q.char_end - q.char_start;
    if (span <= 0) {
      c.error("quote_range", at, "char_end harus lebih besar dari char_start");
    } else if (span < lo || span > hi) {
      c.error("quote_length", at, `${span} karakter; standar ${lo}–${hi}`);
    }
    for (const p of quoteTranslationTextProblems(q.terjemahan)) {
      c.error(p, `${at}.terjemahan`, PROBLEM_MESSAGE[p] ?? p);
    }
    c.length(`${at}.terjemahan`, q.terjemahan, CONTENT_LIMITS.kutipan.terjemahan);
  });
  const spans = quotes.map((q) => `${q.passage_id}:${q.char_start}:${q.char_end}`);
  if (new Set(spans).size !== spans.length) {
    c.error("duplicate_quote", "isi.kutipan", "kutipan ganda");
  }
}

/** Inti: satu kalimat atributif, bukan pembuka topik datar. */
function lintCore(c: Collector, text: string, range: Range): void {
  c.narrative("isi.inti", text, range);
  if (TOPIC_OPENER.test(text.trim())) {
    c.error(
      "topic_opener",
      "isi.inti",
      'inti tidak dibuka "Bagian/Teks ini membahas"; tulis isinya',
    );
  }
  const sentences = text
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .filter(Boolean);
  if (sentences.length > 1) c.error("not_one_sentence", "isi.inti", "inti satu kalimat");
}

/** Semua masalah teks satu draf yang sudah lolos skema. */
export function lintContent(d: ContentDraft): ContentLint {
  const c = new Collector();
  const model = d.asal.model;
  if (model !== null && !(CONTENT_MODELS as readonly string[]).includes(model)) {
    c.warn("unknown_model", "asal.model", `model "${model}" tidak dikenal; pastikan pemilih model`);
  }
  switch (d.jenis) {
    case "intisari-bab": {
      const L = CONTENT_LIMITS.intisariBab;
      lintCore(c, d.isi.inti, L.inti);
      c.narrative("isi.ringkasan", d.isi.ringkasan, L.ringkasan);
      if (TOPIC_OPENER.test(d.isi.ringkasan.trim())) {
        c.warn("topic_opener", "isi.ringkasan", "ringkasan dibuka pembuka topik datar");
      }
      lintPoints(c, d.isi.gagasan, L);
      lintQuotes(c, d.isi.kutipan, d.isi.gagasan.length);
      break;
    }
    case "intisari-kitab": {
      const L = CONTENT_LIMITS.intisariKitab;
      lintCore(c, d.isi.inti, L.inti);
      c.narrative("isi.pembuka", d.isi.pembuka, L.pembuka);
      c.narrative("isi.ringkasan", d.isi.ringkasan, L.ringkasan);
      c.narrative("isi.penutup", d.isi.penutup, L.penutup);
      for (const [path, text] of [
        ["isi.pembuka", d.isi.pembuka],
        ["isi.penutup", d.isi.penutup],
      ] as const) {
        if (PROMISE.test(text)) c.error("promise", path, "janji manfaat atas nama Surau dilarang");
      }
      const [lo, hi] = L.gagasan;
      if (d.isi.gagasan.length < lo || d.isi.gagasan.length > hi) {
        c.error(
          "point_count",
          "isi.gagasan",
          `${d.isi.gagasan.length} gagasan; standar ${lo}–${hi}`,
        );
      }
      lintPoints(c, d.isi.gagasan, L);
      lintQuotes(c, d.isi.kutipan, d.isi.gagasan.length);
      break;
    }
    case "faedah": {
      const L = CONTENT_LIMITS.faedah;
      d.isi.butir.forEach((b, i) => {
        const at = `isi.butir[${i}]`;
        c.narrative(`${at}.judul`, b.judul, L.judul);
        c.narrative(`${at}.konteks`, b.konteks, L.konteks);
        if (PROMISE_TITLE.test(b.judul) || PROMISE.test(b.konteks)) {
          c.error("promise", at, "janji manfaat atas nama Surau dilarang");
        }
      });
      const ids = d.isi.butir.map((b) => b.passage_id);
      if (new Set(ids).size !== ids.length) {
        c.error("duplicate_passage", "isi.butir", "passage_id ganda");
      }
      break;
    }
    case "jalur": {
      const L = CONTENT_LIMITS.jalur;
      c.narrative("isi.judul", d.isi.judul, L.judul);
      c.narrative("isi.deskripsi", d.isi.deskripsi, L.deskripsi);
      for (const [path, text, re] of [
        ["isi.judul", d.isi.judul, PROMISE_TITLE],
        ["isi.deskripsi", d.isi.deskripsi, PROMISE],
      ] as const) {
        if (re.test(text))
          c.error("promise", path, "judul dan deskripsi menyebut isi, bukan janji");
      }
      d.isi.hari.forEach((h, i) => {
        if (h.hari !== i + 1) {
          c.error("day_order", `isi.hari[${i}].hari`, `hari ke-${i + 1} tertulis ${h.hari}`);
        }
        c.narrative(`isi.hari[${i}].pengantar`, h.pengantar, L.pengantar);
      });
      const sections = d.isi.hari.map((h) => h.section_id);
      if (new Set(sections).size !== sections.length) {
        c.error("duplicate_section", "isi.hari", "satu bagian hanya untuk satu hari");
      }
      break;
    }
  }
  return c;
}
