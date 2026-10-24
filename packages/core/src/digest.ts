// read_digest: Intisari satu bagian daftar isi (X15, ADR-097). Teks AI (pembuka, abstrak, gagasan,
// pertanyaan, istilah) selalu berlabel; teks Arab kutipan disalin kode dari `text_raw` paragrafnya
// (teks-arab.md aturan 1) dan hanya tampil bila sidiknya masih sama dengan saat Intisari dibangun.
import { AI_TEXT_LANG, audioChapters, getDigest, getTocNode, getTranslations } from "@surau/db";
import type { D1Db, DigestQuoteWithPassageRow, DigestRows } from "@surau/db";

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
import { textSha256 } from "./translation-revision.ts";

/** Kecepatan baca teks Intisari (karakter per menit): pelan, karena isinya bahan belajar. */
export const DIGEST_READ_CHARS_PER_MINUTE = 1000;

/** Perkiraan waktu baca teks AI (menit, dibulatkan ke atas, minimal 1). */
export function readingMinutes(chars: number): number {
  return Math.max(1, Math.ceil(chars / DIGEST_READ_CHARS_PER_MINUTE));
}

/** Kutipan yang rentangnya masih sah dan sidiknya cocok dengan `text_raw` sekarang. */
async function verifiedQuote(q: DigestQuoteWithPassageRow): Promise<string | null> {
  if (q.char_end > q.text_raw.length) return null;
  const text = q.text_raw.slice(q.char_start, q.char_end);
  return (await textSha256(text)) === q.raw_sha256 ? text : null;
}

async function quoteViews(
  db: D1Db,
  rows: DigestRows,
  cite: CiteContext,
  shownPoints: ReadonlySet<number>,
): Promise<DigestQuoteView[]> {
  const { digest } = rows;
  const quotes = rows.quotes.filter((q) => q.point_ord === null || shownPoints.has(q.point_ord));
  const whole = quotes.filter((q) => q.translation_source === "passage").map((q) => q.passage_id);
  const translations = (await getTranslations(db, whole, digest.lang)).filter(
    (t) => t.review_status !== "rejected",
  );
  const reviewers = await reviewersFor(db, translations, digest.lang);
  const passageTranslation = new Map(
    translations.map((t) => [t.passage_id, translationView(t, reviewers.get(t.passage_id))]),
  );
  const views: DigestQuoteView[] = [];
  for (const q of quotes) {
    const text = await verifiedQuote(q);
    if (text === null) continue;
    const translation: TranslationView | null =
      q.translation_source === "passage"
        ? (passageTranslation.get(q.passage_id) ?? null)
        : {
            label: "ai_translation",
            lang: digest.lang,
            model: digest.model,
            prompt_version: digest.prompt_version,
            created_at: digest.created_at,
            review_status: digest.review_status,
            human_review: null,
            text: q.translation ?? "",
          };
    views.push({
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
  return views;
}

function audioView(rows: DigestRows): DigestAudioView | null {
  const track = rows.audio[0];
  if (track === undefined) return null;
  const chapters = audioChapters.safeParse(JSON.parse(track.chapters_json));
  return {
    r2_key: track.r2_key,
    duration_ms: track.duration_ms,
    voice_kind: track.voice_kind,
    voice_name: track.voice_name,
    provider: track.provider,
    model: track.model,
    created_at: track.created_at,
    chapters: chapters.success ? chapters.data : [],
  };
}

/**
 * Intisari sebuah node daftar isi dalam bahasa teks AI situs. `NotFound` bila node tidak ada; `null`
 * bila node itu belum punya Intisari, Intisari-nya ditolak peninjau, atau skema korpus < 9.
 * Gagasan yang ditolak tidak dikirim, begitu pula pertanyaan dan kutipan miliknya.
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
  const points: DigestPointView[] = rows.points
    .filter((p) => p.review_status !== "rejected")
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
    }));
  const shown = new Set(points.map((p) => p.ord));
  const chars = [
    digest.opening,
    digest.abstract,
    digest.closing,
    ...points.flatMap((p) => [p.title, p.body]),
  ]
    .map((s) => s?.length ?? 0)
    .reduce((a, b) => a + b, 0);
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
    quotes: await quoteViews(db, rows, cite, shown),
    questions: rows.questions
      .filter((q) => shown.has(q.point_ord))
      .map((q) => ({
        ord: q.ord,
        point_ord: q.point_ord,
        text: q.text,
      })),
    terms: rows.terms
      .filter((t) => t.review_status !== "rejected")
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
  };
}
