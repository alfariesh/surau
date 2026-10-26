// Skrip audio "Dengarkan" (X17, ADR-097 butir 6, teks-arab.md aturan 11): teks Indonesia yang
// dibacakan suara AI, disusun KODE dari Intisari yang tampil (`readDigest`), tanpa LLM baru.
// - Hanya yang tampil: gagasan yang tidak ditolak dan berjangkar, kutipan yang tidak ditahan.
//   Gagasan yang ditolak sesudah audio dibuat mengubah sha skrip, jadi audionya gugur saat ingest.
// - Tanpa huruf Arab: kutipan dibacakan lewat terjemahannya ("terjemahan AI-nya" bila belum
//   ditinjau manusia), ayat hanya disebut ("surah kedua ayat …"), placeholder ⟦QS⟧ dan penanda
//   catatan kaki tidak pernah sampai ke suara AI.
// - Narator orang ketiga, dibuka dengan sumber ("Dari kitab …"), ditutup "pintu ke kitab"; label suara AI
//   hanya berupa teks di web, layar kunci, dan metadata (ADR-102).
// - Riwayat sangat lemah, palsu, atau "tidak ada asalnya" (docs/05 §4): KUTIPAN-nya sudah ditahan
//   `readDigest` (`weak_report`); GAGASAN yang bersandar padanya (dalil `evidence`, sama dengan chip
//   di halaman) diberi kalimat tanda buatan kode. Status hadits lain tidak dibacakan.
// Segmen = satu permintaan TTS (bab pemutar = gagasan); kalimat dipecah `indonesianSentences` lalu
// dinormalisasi lisan (`spokenIndonesian`, berversi).
// Sorotan kalimat (X18, ADR-104): setiap kalimat skrip membawa `sources`, rentangnya di teks yang
// tampil di halaman (atau null untuk kalimat buatan kode). `sources` di luar sha skrip: memperbaiki
// pemetaan tidak menggugurkan audio.
import {
  SPOKEN_VERSION,
  indonesianSentences,
  numberWords,
  ordinalWords,
  spokenIndonesian,
} from "@surau/text";
import { AI_TEXT_LANG } from "@surau/db";
import type { D1Db } from "@surau/db";

import { ayahPlaceholderPattern } from "./ayah-placeholder.ts";
import { readDigest } from "./digest.ts";
import type { DigestPointView, DigestQuoteView, DigestView, Location } from "./schema.ts";
import { VERY_WEAK_TAKHRIJ_KINDS } from "./takhrij-label.ts";
import { textSha256 } from "./translation-revision.ts";

/**
 * Versi susunan skrip; naik bila kalimat baku, urutan segmen, atau aturan pemilihan berubah.
 * 2 = setiap kalimat membawa peran (narasi/kutipan/syair) untuk gaya narator (ADR-101).
 * 3 = label suara AI tidak diucapkan; pembuka hanya "Dari kitab … karya …" (ADR-102).
 */
export const SCRIPT_VERSION = 3;

/** Label suara AI dalam bentuk TEKS (metadata berkas); tidak diucapkan di audio (ADR-102). */
export const SCRIPT_LABEL = "Intisari ini dibuat AI dan dibacakan suara AI.";

/** Kalimat penutup setiap audio: Intisari pintu ke kitab, bukan penggantinya (docs/01, §12). */
export const SCRIPT_DOOR =
  "Intisari ini adalah pintu ke kitab, bukan penggantinya. Teks lengkap dan dasar setiap gagasan ada di Surau.";

/** label = kalimat sumber "Dari kitab …" (sama untuk semua Intisari satu karya, jadi audionya dipakai ulang). */
export type ScriptSegmentKind = "label" | "intro" | "point" | "quotes" | "closing";

/**
 * Peran kalimat, ditentukan KODE dari jenis bagian (bukan model): `quote` = terjemahan kutipan teks
 * atau riwayat, `poetry` = terjemahan syair, `narration` = selebihnya. Dipakai alat audio untuk
 * gaya narator yang tetap dan berversi (ADR-101); tidak mengubah kata yang dibacakan.
 */
export type SentenceRole = "narration" | "quote" | "poetry";

export interface ScriptSegment {
  kind: ScriptSegmentKind;
  /** Gagasan yang dibacakan (bab pemutar); null untuk segmen lain. */
  point_ord: number | null;
  /** Kalimat siap baca, urut, sudah dinormalisasi lisan. */
  sentences: string[];
  /** Peran setiap kalimat (panjang sama dengan `sentences`). */
  roles: SentenceRole[];
}

/** Teks tampil yang dibacakan sebuah kalimat skrip (X18). */
export type ScriptSourceField =
  | "opening"
  | "abstract"
  | "closing"
  | "point_title"
  | "point_body"
  | "quote";

/**
 * Asal satu kalimat skrip di halaman: rentang [start, end) di teks field itu persis seperti di
 * `DigestView` (judul/isi gagasan per `ord` gagasan, terjemahan kutipan per `ord` kutipan).
 */
export interface ScriptSource {
  field: ScriptSourceField;
  /** `ord` gagasan (point_*) atau kutipan (quote); null untuk pembuka, ringkasan, penutup. */
  ord: number | null;
  start: number;
  end: number;
}

export interface DigestScript {
  node_id: number;
  lang: string;
  script_version: number;
  spoken_version: number;
  segments: ScriptSegment[];
  /**
   * Sejajar `segments[i].sentences`: asal tiap kalimat di halaman, atau null untuk kalimat buatan
   * kode (label, "Gagasan pertama", pengantar kutipan, tanda riwayat). Tidak ikut sha.
   */
  sources: (ScriptSource | null)[][];
  /** Jumlah karakter teks segmen (sebelum leksikon lafal). */
  chars: number;
  /** sha256 bentuk kanonik skrip: kunci kecocokan audio ↔ Intisari di ingest. */
  sha256: string;
}

/** Skrip melanggar aturan 11 (huruf Arab, placeholder ayat, atau tanda yang dibaca khusus mesin). */
export class ScriptError extends Error {
  override name = "ScriptError";
}

/** Teks yang dikirim ke TTS untuk satu segmen. */
export const segmentText = (segment: ScriptSegment): string => segment.sentences.join(" ");

/**
 * Karakter yang tidak boleh sampai ke suara AI dalam bentuk apa pun: semua karakter berskrip Arab
 * (termasuk angka Arab-India dan ligatur ﷺ), placeholder ayat ⟦ ⟧, dan kurung siku (tag audio v4).
 */
const TTS_FORBIDDEN = /[\p{Script_Extensions=Arabic}⟦⟧[\]]/u;

/** Skrip juga tanpa garis miring: `/…/` di teks yang dikirim hanya boleh berasal dari lafal leksikon. */
const FORBIDDEN = /[\p{Script_Extensions=Arabic}⟦⟧[\]/]/u;

/**
 * Karakter pertama yang tidak boleh dibacakan suara AI, atau null. Dipakai juga alat audio untuk
 * memeriksa teks AKHIR yang dikirim (sesudah leksikon), karena leksikon diterapkan sesudah skrip.
 */
export function unspeakableChar(text: string): string | null {
  return TTS_FORBIDDEN.exec(text)?.[0] ?? null;
}

/** Penanda catatan kaki berangka Arab-India "(١)"; angka ASCII dalam kurung = bilangan biasa. */
const FOOTNOTE_MARKER = /\(\s*[\u0660-\u0669\u06F0-\u06F9]{1,4}\s*\)/gu;

const KIND_INTRO: Readonly<Record<DigestQuoteView["kind"], string>> = {
  text: "Teks kitab",
  report: "Sebuah riwayat",
  poetry: "Sebait syair",
};

/** Teks Latin yang aman dibacakan, atau null (kosong atau berhuruf Arab). */
const latin = (text: string | null | undefined): string | null =>
  text === null || text === undefined || text.trim() === "" || FORBIDDEN.test(text)
    ? null
    : text.trim();

/** Kalimat skrip sebelum normalisasi lisan, dengan asalnya di halaman (null = buatan kode). */
interface Line {
  text: string;
  source: ScriptSource | null;
  role: SentenceRole;
}

const made = (...texts: string[]): Line[] =>
  texts.map((text) => ({ text, source: null, role: "narration" }));

/**
 * Kalimat-kalimat teks tulis (sebelum normalisasi lisan), sesudah penanda/placeholder dirapikan.
 * `from` = asal teks di halaman: rentang kalimat dipetakan balik ke teks aslinya (`at` = posisi
 * `raw` di teks field itu dan `length` = batas akhirnya, untuk judul yang dipangkas dan diberi titik).
 */
function sentencesOf(
  raw: string | null,
  from: { field: ScriptSourceField; ord: number | null; at?: number; length?: number } | null,
  role: SentenceRole = "narration",
): Line[] {
  if (raw === null) return [];
  const { text, starts, ends } = speakable(raw);
  const at = from?.at ?? 0;
  const limit = from?.length ?? Number.POSITIVE_INFINITY;
  return indonesianSentences(text).map((s) => ({
    text: text.slice(s.start, s.end),
    role,
    source:
      from === null
        ? null
        : {
            field: from.field,
            ord: from.ord,
            start: Math.min(at + starts[s.start]!, limit),
            end: Math.min(at + ends[s.end - 1]!, limit),
          },
  }));
}

/** Judul gagasan dibacakan sebagai kalimat sendiri: beri titik bila belum berakhir tanda baca. */
const asSentence = (text: string): string => (/[.?!]["”’')\]]*$/u.test(text) ? text : `${text}.`);

/** "jilid satu, halaman dua ratus" dari letak cetak. */
const where = (loc: Location): string =>
  `jilid ${numberWords(loc.juz)}, halaman ${numberWords(loc.page_no)}`;

/**
 * Teks Indonesia siap dipecah dan dinormalisasi: penanda catatan kaki dibuang, placeholder ayat
 * hanya disebut (teks ayat dan terjemahannya tidak pernah dibacakan mesin). Berlaku untuk semua teks
 * AI, karena `readDigest` meloloskan teks yang berpenanda/berplaceholder (keduanya bukan huruf Arab).
 */
function speakable(raw: string): { text: string; starts: number[]; ends: number[] } {
  // Satu lintasan untuk kedua pola (tidak tumpang tindih), dengan peta balik per karakter keluaran:
  // `starts[i]`/`ends[i]` = rentang di `raw` yang menghasilkan karakter ke-i (seluruh penanda untuk
  // karakter pengganti), sehingga kalimat dipetakan ke teks yang tampil (X18).
  const pattern = new RegExp(`${FOOTNOTE_MARKER.source}|${ayahPlaceholderPattern().source}`, "gu");
  let text = "";
  const starts: number[] = [];
  const ends: number[] = [];
  const keep = (from: number, to: number) => {
    text += raw.slice(from, to);
    for (let i = from; i < to; i++) {
      starts.push(i);
      ends.push(i + 1);
    }
  };
  let last = 0;
  for (const m of raw.matchAll(pattern)) {
    const s = m[1] as string | undefined;
    const [a, b] = [m[2], m[3] as string | undefined];
    keep(last, m.index);
    const out =
      s === undefined
        ? " "
        : b === undefined
          ? `(ayat Al-Qur'an, QS ${s}:${a})`
          : `(ayat Al-Qur'an, QS ${s}:${a}-${b})`;
    text += out;
    for (let i = 0; i < out.length; i++) {
      starts.push(m.index);
      ends.push(m.index + m[0].length);
    }
    last = m.index + m[0].length;
  }
  keep(last, raw.length);
  return { text, starts, ends };
}

function quoteSentences(q: DigestQuoteView): Line[] {
  if (q.translation === null) return [];
  const role: SentenceRole = q.kind === "poetry" ? "poetry" : "quote";
  const body = sentencesOf(q.translation.text, { field: "quote", ord: q.ord }, role);
  if (body.length === 0) return [];
  // Terjemahan diberi label (aturan 8): AI kecuali sudah ditinjau atau dikoreksi manusia.
  const label = q.translation.human_review === null ? "terjemahan AI-nya" : "terjemahannya";
  return [...made(`${KIND_INTRO[q.kind]} di ${where(q.location)}, yang ${label}:`), ...body];
}

const list = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} dan ${items.at(-1)}`;

// Glosa lisan sendiri, tidak ikut arti tampilan `TAKHRIJ_TERM_GLOSS` (bunyinya berubah di ADR-111):
// mengubah kalimat skrip mengubah sha skrip audio yang sudah direkam, jadi itu keputusan
// `SCRIPT_VERSION` tersendiri.
// Kuncinya wajib = `VERY_WEAK_TAKHRIJ_KINDS` (dikunci tes), supaya tanda lisan tidak hilang diam-diam.
export const SPOKEN_WEAK_GLOSS: Readonly<Record<string, string>> = {
  sangat_lemah: "sangat lemah",
  palsu: "palsu/batil",
  la_asl: "tidak ada asalnya",
};

/**
 * Tanda lisan untuk gagasan yang bersandar pada riwayat sangat lemah, palsu, atau tanpa asal
 * (docs/05 §4 dan §12): dari dalil `evidence` yang sama dengan chip di halaman Intisari, dengan
 * glosa tetap buatan kode (bukan teks model).
 */
function weakMark(view: DigestView, p: DigestPointView): Line[] {
  const glosses = new Set<string>();
  for (const h of view.evidence.hadith) {
    if (!h.point_ords.includes(p.ord)) continue;
    for (const term of h.status.terms) {
      const spoken = SPOKEN_WEAK_GLOSS[term.kind];
      if (VERY_WEAK_TAKHRIJ_KINDS.has(term.kind) && spoken !== undefined) glosses.add(spoken);
    }
  }
  if (glosses.size === 0) return [];
  return made(
    `Gagasan ini bersandar pada riwayat yang catatan takhrijnya memuat penilaian ${list([...glosses])}; penilaian ini dikenali otomatis dari teks takhrij dan belum ditinjau.`,
  );
}

/** Segmen dari kalimat tulis: dinormalisasi lisan; kalimat yang kosong sesudahnya dibuang (dengan asal dan perannya). */
function segment(
  kind: ScriptSegmentKind,
  point_ord: number | null,
  lines: readonly Line[],
): { segment: ScriptSegment; sources: (ScriptSource | null)[] } {
  const kept = lines
    .map((l) => ({ ...l, text: spokenIndonesian(l.text) }))
    .filter((l) => l.text !== "");
  return {
    // Urutan kunci = bentuk kanonik sha skrip (sama dengan sebelum `sources` ada).
    segment: {
      kind,
      point_ord,
      sentences: kept.map((l) => l.text),
      roles: kept.map((l) => l.role),
    },
    sources: kept.map((l) => l.source),
  };
}

function check(segments: readonly ScriptSegment[]): void {
  for (const [i, segment] of segments.entries()) {
    for (const sentence of segment.sentences) {
      const bad = FORBIDDEN.exec(sentence);
      if (bad !== null) {
        throw new ScriptError(
          `segmen ${i} (${segment.kind}) memuat "${bad[0]}" yang tidak boleh dibacakan suara AI`,
        );
      }
    }
  }
}

/**
 * Skrip audio sebuah Intisari. Melempar `ScriptError` bila ada teks yang tidak boleh dibacakan mesin
 * (pertahanan berlapis di atas `readDigest`).
 */
export async function digestScript(view: DigestView): Promise<DigestScript> {
  const author = latin(view.source.work.author?.name_id);
  const work = latin(view.source.work.title_id);
  const quotesOf = (ord: number | null) => view.quotes.filter((q) => q.point_ord === ord);
  const quoteBlock = (quotes: readonly DigestQuoteView[]) =>
    quotes.flatMap((q) => quoteSentences(q));

  // Label suara AI TIDAK diucapkan (keputusan pemilik, ADR-102): cukup label teks di web, layar kunci,
  // dan metadata berkas. Segmen pembuka hanya menyebut sumbernya, bila judul Latinnya ada.
  const built = [
    ...(work === null
      ? []
      : [
          segment(
            "label",
            null,
            made(`Dari kitab ${work}${author === null ? "" : ` karya ${author}`}.`),
          ),
        ]),
    segment("intro", null, [
      ...sentencesOf(view.opening, { field: "opening", ord: null }),
      ...sentencesOf(view.abstract, { field: "abstract", ord: null }),
    ]),
  ];
  for (const [i, p] of view.points.entries()) {
    const advice = p.kind === "advice";
    const anchor = p.anchors[0]?.location;
    const title = p.title.trim();
    built.push(
      segment("point", p.ord, [
        ...made(`Gagasan ${ordinalWords(i + 1)}.`),
        ...(advice
          ? made(
              `Anjuran yang ditulis ${author ?? "penulis"} sendiri${anchor === undefined ? "" : `, di ${where(anchor)}`}.`,
            )
          : []),
        ...sentencesOf(asSentence(title), {
          field: "point_title",
          ord: p.ord,
          at: p.title.indexOf(title),
          length: p.title.indexOf(title) + title.length,
        }),
        ...sentencesOf(p.body, { field: "point_body", ord: p.ord }),
        ...weakMark(view, p),
        ...(advice ? made("Untuk kasus pribadi, tanyakan kepada ulama.") : []),
        ...quoteBlock(quotesOf(p.ord)),
      ]),
    );
  }
  const general = quoteBlock(quotesOf(null));
  if (general.length > 0) {
    built.push(segment("quotes", null, [...made("Kutipan pilihan."), ...general]));
  }
  built.push(
    segment("closing", null, [
      ...(view.closing === null
        ? []
        : [...made("Penutup."), ...sentencesOf(view.closing, { field: "closing", ord: null })]),
      ...sentencesOf(SCRIPT_DOOR, null),
    ]),
  );
  const segments = built.map((b) => b.segment);
  check(segments);

  const node_id = view.section.id;
  const payload = {
    script_version: SCRIPT_VERSION,
    spoken_version: SPOKEN_VERSION,
    node_id,
    lang: view.lang,
    segments,
  };
  return {
    ...payload,
    sources: built.map((b) => b.sources),
    chars: segments.reduce((n, s) => n + segmentText(s).length, 0),
    sha256: await textSha256(JSON.stringify(payload)),
  };
}

/**
 * Intisari + skripnya dari korpus: satu-satunya jalan yang dipakai alat audio (saat membuat) dan
 * ingest (saat mencocokkan sha), supaya keduanya membangun skrip yang sama persis. null bila node
 * belum punya Intisari yang tampil.
 */
export async function loadDigestScript(
  db: D1Db,
  nodeId: number,
  lang: string = AI_TEXT_LANG,
): Promise<{ view: DigestView; script: DigestScript } | null> {
  const view = await readDigest(db, nodeId, lang);
  if (view === null) return null;
  return { view, script: await digestScript(view) };
}
