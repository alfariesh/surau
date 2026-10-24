// read_digest: Intisari satu bagian daftar isi (X15, ADR-097). Teks AI (pembuka, abstrak, gagasan,
// pertanyaan, istilah) selalu berlabel; teks Arab kutipan disalin kode dari `text_raw` paragrafnya
// (teks-arab.md aturan 1) dan hanya tampil bila sidiknya masih sama dengan saat Intisari dibangun
// dan rentangnya tidak menyentuh rujukan ayat.
import { AI_TEXT_LANG, audioChapters, getDigest, getTocNode, getTranslations } from "@surau/db";
import type { AyahSpanRow, D1Db, DigestQuoteWithPassageRow, DigestRows } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { reviewersFor, translationView } from "./page.ts";
import { sectionPermalink } from "./permalink.ts";
import { readDigestInput } from "./schema.ts";
import type {
  DigestAudioView,
  DigestPointView,
  DigestQuoteView,
  DigestView,
  TranslationView,
} from "./schema.ts";
import { hasArabicLetters } from "./translation-text.ts";
import { textSha256 } from "./translation-revision.ts";

/** Kecepatan baca teks Intisari (karakter per menit): pelan, karena isinya bahan belajar. */
export const DIGEST_READ_CHARS_PER_MINUTE = 1000;

/** Perkiraan waktu baca teks AI (menit, dibulatkan ke atas, minimal 1). */
export function readingMinutes(chars: number): number {
  return Math.max(1, Math.ceil(chars / DIGEST_READ_CHARS_PER_MINUTE));
}

/**
 * Lapis pertahanan aturan 1: teks AI yang memuat huruf Arab tidak pernah ditampilkan (validator
 * pipeline sudah menolaknya; ini menjaga bila baris lolos dengan cara lain).
 */
const clean = (...texts: (string | null)[]): boolean =>
  texts.every((t) => t === null || !hasArabicLetters(t));

type Withheld = DigestView["withheld_quotes"][number];

/** Teks kutipan bila rentangnya masih sah dan sidiknya cocok dengan `text_raw` sekarang. */
async function verifiedQuote(q: DigestQuoteWithPassageRow): Promise<string | null> {
  if (q.char_end > q.passage_text_raw.length) return null;
  const text = q.passage_text_raw.slice(q.char_start, q.char_end);
  return (await textSha256(text)) === q.raw_sha256 ? text : null;
}

const touchesAyah = (q: DigestQuoteWithPassageRow, spans: readonly AyahSpanRow[]): boolean =>
  spans.some(
    (r) => r.passage_id === q.passage_id && q.char_start < r.char_end && r.char_start < q.char_end,
  );

async function quoteViews(
  db: D1Db,
  rows: DigestRows,
  cite: CiteContext,
  shownPoints: ReadonlySet<number>,
): Promise<{ quotes: DigestQuoteView[]; withheld: Withheld[] }> {
  const lang = rows.digest.lang;
  const candidates = rows.quotes.filter(
    (q) => q.review_status !== "rejected" && (q.point_ord === null || shownPoints.has(q.point_ord)),
  );
  // Terjemahan paragraf hanya untuk kutipan yang benar-benar satu paragraf utuh.
  const whole = (q: DigestQuoteWithPassageRow) =>
    q.char_start === 0 && q.char_end === q.passage_text_raw.length;
  const passageIds = candidates
    .filter((q) => q.translation_source === "passage" && whole(q))
    .map((q) => q.passage_id);
  const translations = (await getTranslations(db, passageIds, lang)).filter(
    (t) => t.review_status !== "rejected" && clean(t.text),
  );
  const reviewers = await reviewersFor(db, translations, lang);
  const passageTranslation = new Map(
    translations.map((t) => [t.passage_id, translationView(t, reviewers.get(t.passage_id))]),
  );
  const quotes: DigestQuoteView[] = [];
  const withheld: Withheld[] = [];
  for (const q of candidates) {
    const text = await verifiedQuote(q);
    if (text === null) {
      withheld.push({ ord: q.ord, reason: "stale" });
      continue;
    }
    if (touchesAyah(q, rows.ayahSpans)) {
      withheld.push({ ord: q.ord, reason: "ayah" });
      continue;
    }
    let translation: TranslationView | null = null;
    if (q.translation_source === "passage") {
      translation = whole(q) ? (passageTranslation.get(q.passage_id) ?? null) : null;
    } else if (
      q.translation !== null &&
      q.model !== null &&
      q.prompt_version !== null &&
      q.created_at !== null &&
      clean(q.translation)
    ) {
      translation = {
        label: "ai_translation",
        lang,
        model: q.model,
        prompt_version: q.prompt_version,
        created_at: q.created_at,
        review_status: q.review_status,
        human_review: null,
        text: q.translation,
      };
    }
    quotes.push({
      ord: q.ord,
      point_ord: q.point_ord,
      kind: q.kind,
      passage_id: q.passage_id,
      char_start: q.char_start,
      char_end: q.char_end,
      text_raw: text,
      location: cite.location(q.juz, q.page_no, q.passage_id),
      translation,
    });
  }
  return { quotes, withheld };
}

function audioView(rows: DigestRows): DigestAudioView | null {
  const track = rows.audio[0];
  if (track === undefined) return null;
  return {
    r2_key: track.r2_key,
    duration_ms: track.duration_ms,
    voice_kind: track.voice_kind,
    voice_name: track.voice_name,
    provider: track.provider,
    model: track.model,
    created_at: track.created_at,
    // Sudah divalidasi `audioTrackRow` saat dibaca dari DB.
    chapters: audioChapters.parse(JSON.parse(track.chapters_json)),
  };
}

/**
 * Intisari sebuah node daftar isi dalam bahasa teks AI situs. `NotFound` bila node tidak ada; `null`
 * bila node itu belum punya Intisari, Intisari-nya ditolak peninjau, teks utamanya memuat huruf Arab,
 * atau skema korpus < 9. Gagasan yang ditolak atau tanpa jangkar tidak dikirim, begitu pula kutipan
 * dan pertanyaan miliknya; kutipan dan pertanyaan yang ditolak sendiri juga tidak.
 */
export async function readDigest(
  db: D1Db,
  nodeId: number,
  lang: string = AI_TEXT_LANG,
): Promise<DigestView | null> {
  const input = parseInput(readDigestInput, { node_id: nodeId });
  const node = await getTocNode(db, input.node_id);
  if (node === null) throw new NotFound(`Section not found: ${input.node_id}`);
  const [cite, rows] = await Promise.all([
    loadCiteContext(db, node.edition_id),
    getDigest(db, node.id, lang),
  ]);
  if (rows === null || rows.digest.review_status === "rejected") return null;
  const { digest } = rows;
  if (!clean(digest.opening, digest.abstract, digest.closing)) return null;
  const points: DigestPointView[] = rows.points
    .filter((p) => p.review_status !== "rejected" && clean(p.title, p.body))
    .map((p) => ({
      ord: p.ord,
      kind: p.kind,
      stance: p.stance,
      title: p.title,
      body: p.body,
      review_status: p.review_status,
      anchors: rows.anchors
        .filter((a) => a.point_ord === p.ord)
        .map((a) => ({
          passage_id: a.passage_id,
          char_start: a.char_start,
          char_end: a.char_end,
          location: cite.location(a.juz, a.page_no, a.passage_id),
        })),
    }))
    // Setiap gagasan wajib menunjuk paragraf sumbernya (docs/05 §12).
    .filter((p) => p.anchors.length > 0);
  const shown = new Set(points.map((p) => p.ord));
  const chars = [
    digest.opening,
    digest.abstract,
    digest.closing,
    ...points.flatMap((p) => [p.title, p.body]),
  ]
    .map((s) => s?.length ?? 0)
    .reduce((a, b) => a + b, 0);
  const { quotes, withheld } = await quoteViews(db, rows, cite, shown);
  return {
    label: "ai_digest",
    section: {
      id: node.id,
      title_ar: node.title_ar,
      level: node.level,
      permalink: sectionPermalink(cite.path, node.id),
    },
    source: cite.source,
    tier: digest.tier,
    basis: digest.basis,
    lang: digest.lang,
    model: digest.model,
    prompt_version: digest.prompt_version,
    created_at: digest.created_at,
    review_status: digest.review_status,
    opening: digest.opening,
    abstract: digest.abstract,
    closing: digest.closing,
    points,
    quotes,
    questions: rows.questions
      .filter((q) => q.review_status !== "rejected" && shown.has(q.point_ord) && clean(q.text))
      .map((q) => ({ ord: q.ord, point_ord: q.point_ord, text: q.text })),
    terms: rows.terms
      .filter((t) => t.review_status !== "rejected" && clean(t.label, t.gloss))
      .map((t) => ({
        key: t.term_key,
        label: t.label,
        gloss: t.gloss,
        lang: t.lang,
        model: t.model,
        prompt_version: t.prompt_version,
        created_at: t.created_at,
        review_status: t.review_status,
      })),
    reading_minutes: readingMinutes(chars),
    audio: audioView(rows),
    withheld_quotes: withheld,
  };
}
