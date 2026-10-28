// read_digest: Intisari satu bagian daftar isi (X15, ADR-097). Teks AI (pembuka, abstrak, gagasan,
// pertanyaan, istilah) selalu berlabel; teks Arab kutipan disalin kode dari `text_raw` paragrafnya
// (teks-arab.md aturan 1) dan hanya tampil bila sidiknya masih sama dengan saat Intisari dibangun
// dan rentangnya tidak menyentuh rujukan ayat.
import {
  AI_TEXT_LANG,
  audioChapters,
  getDigest,
  getFootnoteRefs,
  getPassagesByIds,
  getTocNode,
  getTranslations,
  passageAnchor,
} from "@surau/db";
import type { AyahSpanRow, D1Db, DigestQuoteWithPassageRow, DigestRows } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { reviewersFor, translationView } from "./page.ts";
import { sectionPermalink } from "./permalink.ts";
import { loadAyahRefs, quranForRefs } from "./quran.ts";
import { readDigestInput } from "./schema.ts";
import type {
  DigestAudioView,
  DigestAyahEvidence,
  DigestEvidenceView,
  DigestHadithEvidence,
  DigestPointView,
  DigestQuoteTakhrij,
  DigestQuoteView,
  DigestTakhrijStatus,
  DigestView,
  TranslationView,
} from "./schema.ts";
import { VERY_WEAK_TAKHRIJ_KINDS, takhrijLabel } from "./takhrij-label.ts";
import { hasArabicLetters } from "./translation-text.ts";
import { textSha256 } from "./translation-revision.ts";

/** Kecepatan baca teks Intisari (karakter per menit): pelan, karena isinya bahan belajar. */
export const DIGEST_READ_CHARS_PER_MINUTE = 1000;

/**
 * Tingkat Intisari (Ihya): muqaddimah (akar tanpa anak) dan kitab (tingkat 2) = Intisari Kitab;
 * selebihnya, termasuk rub' yang dibuat dari kitab-kitabnya, Intisari Bab. Satu aturan untuk
 * pipeline batch (X15) dan pemeriksa draf konten (X22).
 */
export function digestTierOf(level: number, hasChildNodes: boolean): "book" | "section" {
  return level === 2 || (level === 1 && !hasChildNodes) ? "book" : "section";
}

/** Jumlah gagasan untuk sebuah teks menurut panjangnya (karakter Arab): "mengikuti panjang teks". */
export function leafPointRange(chars: number): { min: number; max: number } {
  if (chars < 1_500) return { min: 1, max: 3 };
  if (chars < 5_000) return { min: 2, max: 5 };
  return { min: 3, max: 7 };
}

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
  const valid: { q: DigestQuoteWithPassageRow; text: string }[] = [];
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
    valid.push({ q, text });
  }
  const takhrij = await quoteTakhrij(
    db,
    cite,
    valid.map((v) => v.q),
  );
  for (const { q, text } of valid) {
    const linked = takhrij.get(q.ord) ?? [];
    // Riwayat sangat lemah, palsu, atau tanpa asal tidak pernah jadi kutipan pilihan (ADR-097):
    // validator X15b menolaknya; ini lapis kedua saat dibaca, dari label takhrij yang sama.
    if (linked.some((t) => t.status.terms.some((term) => VERY_WEAK_TAKHRIJ_KINDS.has(term.kind)))) {
      withheld.push({ ord: q.ord, reason: "weak_report" });
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
      takhrij: linked,
    });
  }
  withheld.sort((a, b) => a.ord - b.ord);
  return { quotes, withheld };
}

/** Label status buatan kode atas teks catatan kaki (`takhrijLabel`, ADR-069), belum ditinjau. */
function takhrijStatusOf(text: string): DigestTakhrijStatus {
  const label = takhrijLabel(text);
  return {
    label: "rule_extracted",
    kind: label.kind,
    text: label.text,
    weak: label.weak,
    mixed: label.mixed,
    terms: label.terms,
    version: label.version,
  };
}

/**
 * Takhrij milik setiap kutipan (X16): penanda di dalam rentang kutipan atau tepat sesudahnya
 * (`markerInAnchor`), dengan teks catatan kakinya dari DB dan label kodenya. Per `ord` kutipan.
 */
async function quoteTakhrij(
  db: D1Db,
  cite: CiteContext,
  quotes: readonly DigestQuoteWithPassageRow[],
): Promise<Map<number, DigestQuoteTakhrij[]>> {
  const out = new Map<number, DigestQuoteTakhrij[]>();
  if (quotes.length === 0) return out;
  const refs = await getFootnoteRefs(db, [...new Set(quotes.map((q) => q.passage_id))]);
  const owned = quotes.flatMap((q) =>
    refs
      .filter((r) => r.passage_id === q.passage_id && markerInAnchor(q.passage_text_raw, q, r))
      .map((r) => ({ q, r })),
  );
  if (owned.length === 0) return out;
  const feet = new Map(
    (await getPassagesByIds(db, [...new Set(owned.map((o) => o.r.footnote_passage_id))])).map(
      (p) => [p.id, p],
    ),
  );
  for (const { q, r } of owned) {
    const foot = feet.get(r.footnote_passage_id);
    if (foot === undefined) continue;
    out.set(q.ord, [
      ...(out.get(q.ord) ?? []),
      {
        marker: r.marker,
        char_start: r.char_start,
        char_end: r.char_end,
        footnote: {
          id: foot.id,
          anchor: passageAnchor(foot.id),
          text_raw: foot.text_raw,
          location: cite.location(foot.juz, foot.page_no, foot.id),
        },
        status: takhrijStatusOf(foot.text_raw),
      },
    ]);
  }
  return out;
}

/** Antara jangkar dan penanda hanya spasi atau tanda baca (tanpa huruf/angka). */
const NO_WORDS = /^[\s\p{P}]*$/u;
/** Jarak terjauh penanda sesudah akhir jangkar yang masih milik kalimat terakhir jangkar itu. */
const MARKER_TAIL = 3;

/**
 * Penanda catatan kaki milik jangkar: di dalam rentangnya (bukan di awal, yang menutup kalimat
 * sebelum jangkar), atau tepat sesudah akhirnya (blok `segmentText` bisa berakhir di titik sebelum
 * penanda kalimat itu).
 */
export function markerInAnchor(
  text: string,
  anchor: { char_start: number; char_end: number },
  marker: { char_start: number; char_end: number },
): boolean {
  const { char_start: as, char_end: ae } = anchor;
  const { char_start: ms, char_end: me } = marker;
  if (ms >= as && me <= ae) return !NO_WORDS.test(text.slice(as, ms));
  return ms >= ae && ms - ae <= MARKER_TAIL && NO_WORDS.test(text.slice(ae, ms));
}

/**
 * Dalil dari jangkar gagasan yang tampil (X16): rujukan ayat yang beririsan dengan jangkar, dan
 * penanda takhrij milik jangkar beserta teks catatan kakinya + label istilah kode (`takhrijLabel`,
 * status `rule_extracted`). Teks ayat dan terjemahan Kemenag lewat `quranForRefs`. Dua bolak-balik
 * D1; tidak ada yang disimpan.
 */
async function evidenceView(
  db: D1Db,
  cite: CiteContext,
  points: readonly DigestPointView[],
): Promise<DigestEvidenceView> {
  const anchors = points.flatMap((p) => p.anchors.map((a) => ({ ...a, point_ord: p.ord })));
  const passageIds = [...new Set(anchors.map((a) => a.passage_id))];
  if (passageIds.length === 0) return { ayat: [], hadith: [], quran: null };
  const [ayahBy, refs] = await Promise.all([
    loadAyahRefs(db, passageIds),
    getFootnoteRefs(db, passageIds),
  ]);
  const anchorsOf = (passageId: number) => anchors.filter((a) => a.passage_id === passageId);

  const ayat: DigestAyahEvidence[] = [];
  for (const passageId of passageIds) {
    for (const ref of ayahBy?.get(passageId) ?? []) {
      const ords = anchorsOf(passageId)
        .filter((a) => ref.char_start < a.char_end && a.char_start < ref.char_end)
        .map((a) => a.point_ord);
      if (ords.length === 0) continue;
      const own = anchorsOf(passageId)[0]!;
      ayat.push({
        point_ords: [...new Set(ords)].sort((a, b) => a - b),
        passage_id: passageId,
        ...ref,
        location: own.location,
      });
    }
  }

  const candidates = refs.filter((r) => anchorsOf(r.passage_id).length > 0);
  const [rows, quran] = await Promise.all([
    getPassagesByIds(db, [...passageIds, ...candidates.map((r) => r.footnote_passage_id)]),
    quranForRefs(db, ayat),
  ]);
  const texts = new Map(rows.map((p) => [p.id, p]));
  const hadith: DigestHadithEvidence[] = [];
  for (const ref of candidates) {
    const body = texts.get(ref.passage_id);
    const foot = texts.get(ref.footnote_passage_id);
    if (body === undefined || foot === undefined) continue;
    const ords = anchorsOf(ref.passage_id)
      .filter((a) => markerInAnchor(body.text_raw, a, ref))
      .map((a) => a.point_ord);
    if (ords.length === 0) continue;
    hadith.push({
      point_ords: [...new Set(ords)].sort((a, b) => a - b),
      passage_id: ref.passage_id,
      marker: ref.marker,
      char_start: ref.char_start,
      char_end: ref.char_end,
      location: cite.location(body.juz, body.page_no, body.id),
      footnote: {
        id: foot.id,
        anchor: passageAnchor(foot.id),
        text_raw: foot.text_raw,
        location: cite.location(foot.juz, foot.page_no, foot.id),
      },
      status: takhrijStatusOf(foot.text_raw),
    });
  }
  const byText = (
    a: { passage_id: number; char_start: number },
    b: { passage_id: number; char_start: number },
  ) => a.passage_id - b.passage_id || a.char_start - b.char_start;
  ayat.sort(byText);
  hadith.sort(byText);
  return { ayat, hadith, quran };
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
    alignment_key: track.alignment_key,
  };
}

/**
 * Intisari sebuah node daftar isi dalam bahasa teks AI situs. `NotFound` bila node tidak ada; `null`
 * bila node itu belum punya Intisari, Intisari-nya ditolak peninjau, teks utamanya memuat huruf Arab,
 * atau skema korpus < 9. Gagasan yang ditolak atau tanpa jangkar tidak dikirim, begitu pula kutipan
 * dan pertanyaan miliknya; kutipan dan pertanyaan yang ditolak sendiri juga tidak. Dalil
 * (`evidence`) dihitung dari jangkar gagasan yang dikirim saja.
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
  const [{ quotes, withheld }, evidence] = await Promise.all([
    quoteViews(db, rows, cite, shown),
    evidenceView(db, cite, points),
  ]);
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
    evidence,
    audio: audioView(rows),
    withheld_quotes: withheld,
  };
}
