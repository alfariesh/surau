// Skrip audio "Dengarkan" (X17, ADR-097 butir 6, teks-arab.md aturan 11): teks Indonesia yang
// dibacakan suara AI, disusun KODE dari Intisari yang tampil (`readDigest`), tanpa LLM baru.
// - Hanya yang tampil: gagasan yang tidak ditolak dan berjangkar, kutipan yang tidak ditahan.
//   Gagasan yang ditolak sesudah audio dibuat mengubah sha skrip, jadi audionya gugur saat ingest.
// - Tanpa huruf Arab: kutipan dibacakan lewat terjemahannya, ayat hanya disebut ("surah kedua ayat
//   …"), placeholder ⟦QS⟧ dan penanda catatan kaki tidak pernah sampai ke suara AI.
// - Narator orang ketiga, diawali kalimat label suara AI, ditutup "pintu ke kitab" (docs/05 §12).
// - Riwayat yang takhrijnya memuat penilaian sangat lemah, palsu, atau "tidak ada asalnya" sudah
//   ditahan `readDigest` (`weak_report`, X16), jadi tidak pernah dibacakan; status hadits lain tidak
//   dibacakan (halaman Intisari menampilkannya bersama teks takhrij aslinya).
// Segmen = satu permintaan TTS (bab pemutar = gagasan); kalimat dipecah `indonesianSentences` lalu
// dinormalisasi lisan (`spokenIndonesian`, berversi).
import {
  FOOTNOTE_MARKER_SOURCE,
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
import type { DigestQuoteView, DigestView, Location } from "./schema.ts";
import { textSha256 } from "./translation-revision.ts";

/** Versi susunan skrip; naik bila kalimat baku, urutan segmen, atau aturan pemilihan berubah. */
export const SCRIPT_VERSION = 1;

/** Kalimat label di awal setiap audio (docs/05 §12; sama di halaman, layar kunci, dan ID3). */
export const SCRIPT_LABEL = "Intisari ini dibuat AI dan dibacakan suara AI.";

/** Kalimat penutup setiap audio: Intisari pintu ke kitab, bukan penggantinya (docs/01, §12). */
export const SCRIPT_DOOR =
  "Intisari ini adalah pintu ke kitab, bukan penggantinya. Teks lengkap dan dasar setiap gagasan ada di Surau.";

/** label = kalimat label + sumber (sama untuk semua Intisari satu karya, jadi audionya bisa dipakai ulang). */
export type ScriptSegmentKind = "label" | "intro" | "point" | "quotes" | "closing";

export interface ScriptSegment {
  kind: ScriptSegmentKind;
  /** Gagasan yang dibacakan (bab pemutar); null untuk segmen lain. */
  point_ord: number | null;
  /** Kalimat siap baca, urut, sudah dinormalisasi lisan. */
  sentences: string[];
}

export interface DigestScript {
  node_id: number;
  lang: string;
  script_version: number;
  spoken_version: number;
  segments: ScriptSegment[];
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
 * Huruf/tanda yang tidak boleh sampai ke suara AI: semua karakter berskrip Arab (termasuk angka
 * Arab-India dan ligatur ﷺ), placeholder ayat ⟦ ⟧, kurung siku (tag audio v4), garis miring (IPA).
 */
const FORBIDDEN = /[\p{Script_Extensions=Arabic}⟦⟧[\]/]/u;

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

/** Kalimat-kalimat teks tulis (sebelum normalisasi lisan). */
function sentencesOf(text: string | null): string[] {
  if (text === null) return [];
  return indonesianSentences(text).map((s) => text.slice(s.start, s.end));
}

/** Judul gagasan dibacakan sebagai kalimat sendiri: beri titik bila belum berakhir tanda baca. */
const asSentence = (text: string): string => (/[.?!]["”’')\]]*$/u.test(text) ? text : `${text}.`);

/** "jilid satu, halaman dua ratus" dari letak cetak. */
const where = (loc: Location): string =>
  `jilid ${numberWords(loc.juz)}, halaman ${numberWords(loc.page_no)}`;

/**
 * Terjemahan kutipan siap dibacakan: penanda catatan kaki dibuang, placeholder ayat hanya disebut
 * (teks ayat dan terjemahannya tidak pernah dibacakan mesin).
 */
function speakableTranslation(text: string): string {
  return text
    .replace(new RegExp(FOOTNOTE_MARKER_SOURCE, "g"), " ")
    .replace(ayahPlaceholderPattern(), (_m, s: string, a: string, b: string | undefined) =>
      b === undefined ? `(ayat Al-Qur'an, QS ${s}:${a})` : `(ayat Al-Qur'an, QS ${s}:${a}-${b})`,
    );
}

function quoteSentences(q: DigestQuoteView): string[] {
  if (q.translation === null) return [];
  const body = sentencesOf(speakableTranslation(q.translation.text));
  if (body.length === 0) return [];
  return [`${KIND_INTRO[q.kind]} di ${where(q.location)}, yang terjemahan bebasnya:`, ...body];
}

const spoken = (sentences: readonly string[]): string[] =>
  sentences.map((s) => spokenIndonesian(s)).filter((s) => s !== "");

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

  const segments: ScriptSegment[] = [
    {
      kind: "label",
      point_ord: null,
      sentences: spoken([
        SCRIPT_LABEL,
        ...(work === null
          ? []
          : [`Dari kitab ${work}${author === null ? "" : ` karya ${author}`}.`]),
      ]),
    },
    {
      kind: "intro",
      point_ord: null,
      sentences: spoken([...sentencesOf(view.opening), ...sentencesOf(view.abstract)]),
    },
  ];
  for (const [i, p] of view.points.entries()) {
    const advice = p.kind === "advice";
    const anchor = p.anchors[0]?.location;
    segments.push({
      kind: "point",
      point_ord: p.ord,
      sentences: spoken([
        `Gagasan ${ordinalWords(i + 1)}.`,
        ...(advice
          ? [
              `Anjuran yang ditulis ${author ?? "penulis"} sendiri${anchor === undefined ? "" : `, di ${where(anchor)}`}.`,
            ]
          : []),
        ...sentencesOf(asSentence(p.title.trim())),
        ...sentencesOf(p.body),
        ...(advice ? ["Untuk kasus pribadi, tanyakan kepada ulama."] : []),
        ...quoteBlock(quotesOf(p.ord)),
      ]),
    });
  }
  const general = quoteBlock(quotesOf(null));
  if (general.length > 0) {
    segments.push({
      kind: "quotes",
      point_ord: null,
      sentences: spoken(["Kutipan pilihan.", ...general]),
    });
  }
  segments.push({
    kind: "closing",
    point_ord: null,
    sentences: spoken([
      ...(view.closing === null ? [] : ["Penutup.", ...sentencesOf(view.closing)]),
      ...sentencesOf(SCRIPT_DOOR),
    ]),
  });
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
