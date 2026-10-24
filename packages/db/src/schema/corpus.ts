// Skema Zod baris DB korpus: satu skema per tabel, kolom persis sama dengan
// migrations/corpus (dijaga tes schema.test.ts lewat PRAGMA table_info). Baris D1 berisi
// number | string | null; kolom 0/1 tetap angka di sini (`flag`), bukan boolean.
import { z } from "zod";

const id = z.number().int().positive();
const int = z.number().int();
const flag = z.literal([0, 1]);

export const reviewStatus = z.enum(["ai_generated", "reviewed", "ustadz_verified", "rejected"]);
export type ReviewStatus = z.infer<typeof reviewStatus>;

export const attributionStatus = z.enum(["authentic", "disputed", "spurious"]);
export type AttributionStatus = z.infer<typeof attributionStatus>;

export const passageKind = z.enum(["body", "foot"]);
export type PassageKind = z.infer<typeof passageKind>;

export const authorRow = z.strictObject({
  id,
  name_ar: z.string(),
  name_id: z.string().nullable(),
  death_hijri: int.nullable(),
  shamela_author_id: int.nullable(),
  wikidata_id: z.string().nullable(),
});
export type AuthorRow = z.infer<typeof authorRow>;

export const workRow = z.strictObject({
  id,
  slug: z.string(),
  openiti_uri: z.string().nullable(),
  title_ar: z.string(),
  title_id: z.string().nullable(),
  author_id: id.nullable(),
  attribution_status: attributionStatus,
  original_language: z.string(),
  period: z.string().nullable(),
});
export type WorkRow = z.infer<typeof workRow>;

export const editionRow = z.strictObject({
  id,
  work_id: id,
  slug: z.string(),
  is_default: flag,
  source: z.enum(["shamela", "openiti"]),
  source_ref: z.string(),
  publisher: z.string().nullable(),
  city: z.string().nullable(),
  volumes: int.nullable(),
  license: z.string(),
  attribution: z.string(),
});
export type EditionRow = z.infer<typeof editionRow>;

export const pageRow = z.strictObject({
  id,
  edition_id: id,
  seq: id,
  juz: id,
  page_no: int.nonnegative(),
  source_page_id: int.nullable(),
});
export type PageRow = z.infer<typeof pageRow>;

export const tocNodeRow = z.strictObject({
  id,
  edition_id: id,
  parent_id: id.nullable(),
  ord: int,
  level: id,
  title_ar: z.string(),
  start_page_id: id,
  source_title_id: int.nullable(),
  patched: flag,
});
export type TocNodeRow = z.infer<typeof tocNodeRow>;

export const passageRow = z.strictObject({
  id,
  edition_id: id,
  page_id: id,
  toc_node_id: id.nullable(),
  kind: passageKind,
  ord: id,
  text_raw: z.string(),
});
export type PassageRow = z.infer<typeof passageRow>;

export const footnoteRefRow = z.strictObject({
  passage_id: id,
  char_start: int.nonnegative(),
  char_end: int.positive(),
  marker: z.string(),
  footnote_passage_id: id,
});
export type FootnoteRefRow = z.infer<typeof footnoteRefRow>;

/** Alasan sebuah paragraf ditandai perlu ditinjau oleh ingest (migrasi 0002 + 0003, ADR-032). */
export const needsReviewReason = z.enum([
  "takhrij_inline",
  "takhrij_boundary",
  "takhrij_unmatched",
  "inline_unsplit",
  "footnote_orphan",
]);
export type NeedsReviewReason = z.infer<typeof needsReviewReason>;

export const passageNeedsReviewRow = z.strictObject({
  passage_id: id,
  reason: needsReviewReason,
});
export type PassageNeedsReviewRow = z.infer<typeof passageNeedsReviewRow>;

export const translationRow = z.strictObject({
  passage_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type TranslationRow = z.infer<typeof translationRow>;

/** Peran penulis tinjauan terjemahan di korpus (pembatalan pemilik tidak pernah sampai ke korpus). */
export const translationReviewerRole = z.enum(["ustadz", "editor"]);

/**
 * Asal tinjauan manusia satu terjemahan (X08 tahap 2, migrasi 0008, ADR-082). Nama dari daftar
 * editor terdaftar saat menyimpan; `reviewer_public` = nama boleh dikirim ke AI lain lewat MCP (situs
 * dan MCP sama: tanpa izin, keduanya menampilkan peran saja). `ai_text` = draf AI yang digantikan
 * perbaikan (hanya dibaca ruang editor). Gelar "Ust." tidak pernah untuk peran editor.
 */
const reviewerShape = {
  passage_id: id,
  lang: z.string(),
  revision_id: id,
  revised: z.union([z.literal(0), z.literal(1)]),
  reviewed_at: z.string(),
  reviewer_name: z.string().min(1).max(120),
  reviewer_short: z.string().min(1).max(80),
  reviewer_role: translationReviewerRole,
  reviewer_public: z.union([z.literal(0), z.literal(1)]),
};
const noUstadzTitle = (r: { reviewer_role: string; reviewer_short: string }) =>
  r.reviewer_role === "ustadz" || !/^\s*ust(?:adz|az|\.)?\b/iu.test(r.reviewer_short);

export const translationReviewRow = z
  .strictObject({ ...reviewerShape, ai_text: z.string().nullable() })
  .refine((r) => (r.revised === 1) === (r.ai_text !== null), "ai_text hanya untuk perbaikan")
  .refine(noUstadzTitle, "gelar ustadz hanya untuk peran ustadz");
/** Tanpa draf AI (pembaca, Cari, MCP, Maknaz). */
export const translationReviewerRow = z
  .strictObject(reviewerShape)
  .refine(noUstadzTitle, "gelar ustadz hanya untuk peran ustadz");
export type TranslationReviewerRow = z.infer<typeof translationReviewerRow>;
export type TranslationReviewRow = z.infer<typeof translationReviewRow>;

export const summaryRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type SummaryRow = z.infer<typeof summaryRow>;

/** Judul node daftar isi berbahasa Indonesia, terjemahan AI (migrasi 0007, X04 bagian B). */
export const tocTitleTranslationRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  text: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type TocTitleTranslationRow = z.infer<typeof tocTitleTranslationRow>;

/**
 * Subjudul kurasi pembaca berbahasa Indonesia, terjemahan AI; kunci = paragraf yang memuatnya.
 * `source_sha256` = sha256 judul Arab yang diterjemahkan (dicocokkan pembaca dengan judul yang tampil).
 */
export const subheadingTranslationRow = z.strictObject({
  passage_id: id,
  lang: z.string(),
  text: z.string(),
  source_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type SubheadingTranslationRow = z.infer<typeof subheadingTranslationRow>;

// ── Intisari (migrasi 0009, X15, ADR-097) ───────────────────────────────────────────────

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const ord = z.number().int().min(1).max(99);
const charStart = int.nonnegative();
/** Paragraf dan node dari edisi yang sama (formula ID ADR-029; dijaga CHECK migrasi 0009). */
const sameEdition = (r: { passage_id: number; toc_node_id: number }) =>
  Math.floor(r.passage_id / 10_000_000) === Math.floor(r.toc_node_id / 100_000);

/** Intisari Kitab (muqaddimah + kitab) atau Intisari Bab (bagian lain). */
export const digestTier = z.enum(["book", "section"]);
export type DigestTier = z.infer<typeof digestTier>;
/** Asal isi: teks Arab bagian itu, Intisari anak-anaknya, atau keduanya. */
export const digestBasis = z.enum(["text", "children", "mixed"]);
/** Gagasan, atau anjuran yang ditulis penulis sendiri (berjangkar, bukan nasihat Surau). */
export const digestPointKind = z.enum(["idea", "advice"]);
export type DigestPointKind = z.infer<typeof digestPointKind>;
/** Suara siapa: pendapat penulis, yang ia nukil, atau yang ia bantah. */
export const digestStance = z.enum(["author", "reported", "refuted"]);
export type DigestStance = z.infer<typeof digestStance>;
/** Jenis kutipan, ditentukan kode: perkataan dalam teks, riwayat (status dari takhrij), syair. */
export const digestQuoteKind = z.enum(["text", "report", "poetry"]);
export type DigestQuoteKind = z.infer<typeof digestQuoteKind>;
/** Suara audio: sintetis (berlabel "dibacakan suara AI") atau narator manusia. */
export const voiceKind = z.enum(["ai", "human"]);
export type VoiceKind = z.infer<typeof voiceKind>;

export const digestRow = z
  .strictObject({
    toc_node_id: id,
    lang: z.string(),
    tier: digestTier,
    basis: digestBasis,
    opening: z.string().nullable(),
    abstract: z.string(),
    closing: z.string().nullable(),
    source_sha256: sha256,
    model: z.string(),
    prompt_version: z.string(),
    created_at: z.string(),
    review_status: reviewStatus,
  })
  .refine(
    (r) => r.tier === "section" || (r.opening !== null && r.closing !== null),
    "Intisari Kitab wajib punya pembuka dan penutup",
  );
export type DigestRow = z.infer<typeof digestRow>;

export const digestPointRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  ord,
  kind: digestPointKind,
  stance: digestStance,
  title: z.string(),
  body: z.string(),
  review_status: reviewStatus,
});
export type DigestPointRow = z.infer<typeof digestPointRow>;

/** "Dasar teks" gagasan: rentang di `passage.text_raw` (indeks string JS, akhir eksklusif). */
export const digestAnchorRow = z
  .strictObject({
    toc_node_id: id,
    lang: z.string(),
    point_ord: ord,
    seq: z.number().int().min(1).max(9),
    passage_id: id,
    char_start: charStart,
    char_end: int,
  })
  .refine((r) => r.char_end > r.char_start, "char_end harus > char_start")
  .refine(sameEdition, "paragraf jangkar harus dari edisi node");
export type DigestAnchorRow = z.infer<typeof digestAnchorRow>;

/**
 * Kutipan pilihan: rentang `text_raw` + sidik `raw_sha256`. Terjemahan `digest` = terjemahan AI
 * kutipan ini dengan asal model-nya sendiri (Intisari induk bisa memakai kutipan anak); `passage` =
 * kutipan satu paragraf utuh, terjemahannya dari tabel `translation`.
 */
export const digestQuoteRow = z
  .strictObject({
    toc_node_id: id,
    lang: z.string(),
    ord: z.number().int().min(1).max(9),
    point_ord: ord.nullable(),
    passage_id: id,
    char_start: charStart,
    char_end: int,
    raw_sha256: sha256,
    kind: digestQuoteKind,
    translation_source: z.enum(["digest", "passage"]),
    translation: z.string().nullable(),
    model: z.string().nullable(),
    prompt_version: z.string().nullable(),
    created_at: z.string().nullable(),
    review_status: reviewStatus,
  })
  .refine((r) => r.char_end > r.char_start && r.char_end - r.char_start <= 2000, "rentang kutipan")
  .refine(sameEdition, "paragraf kutipan harus dari edisi node")
  .refine(
    (r) =>
      (r.translation_source === "digest") ===
      (r.translation !== null &&
        r.model !== null &&
        r.prompt_version !== null &&
        r.created_at !== null),
    "terjemahan + asal model hanya untuk sumber digest",
  )
  .refine(
    (r) =>
      r.translation_source === "digest" ||
      (r.model === null && r.prompt_version === null && r.created_at === null),
    "sumber passage tanpa asal model",
  );
export type DigestQuoteRow = z.infer<typeof digestQuoteRow>;

export const digestQuestionRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  ord,
  point_ord: ord,
  text: z.string(),
  review_status: reviewStatus,
});
export type DigestQuestionRow = z.infer<typeof digestQuestionRow>;

const termKey = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .max(64);

/** Istilah glosarium berkunci; definisi AI satu kali per istilah per bahasa. */
export const glossaryTermRow = z.strictObject({
  term_key: termKey,
  lang: z.string(),
  label: z.string(),
  gloss: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  review_status: reviewStatus,
});
export type GlossaryTermRow = z.infer<typeof glossaryTermRow>;

export const digestTermRow = z.strictObject({
  toc_node_id: id,
  lang: z.string(),
  ord,
  term_key: termKey,
});
export type DigestTermRow = z.infer<typeof digestTermRow>;

/** Bab pemutar audio: gagasan kunci + detik mulainya, urut waktu. */
export const audioChapters = z.array(
  z.strictObject({ point_ord: ord, start_ms: int.nonnegative() }),
);
export type AudioChapters = z.infer<typeof audioChapters>;

/** Audio "Dengarkan" satu Intisari (X17): objek MP3 di R2 media publik, tidak pernah ditimpa. */
export const audioTrackRow = z
  .strictObject({
    toc_node_id: id,
    lang: z.string(),
    voice_kind: voiceKind,
    r2_key: z.string().min(1),
    mime: z.literal("audio/mpeg"),
    bytes: id,
    duration_ms: id,
    provider: z.string(),
    voice_id: z.string(),
    voice_name: z.string(),
    model: z.string().nullable(),
    script_sha256: sha256,
    script_version: id,
    lexicon_version: z.string(),
    chapters_json: z.string(),
    alignment_key: z.string().nullable(),
    created_at: z.string(),
  })
  .refine((r) => (r.voice_kind === "ai") === (r.model !== null), "model hanya untuk suara AI")
  .refine((r) => {
    try {
      return audioChapters.safeParse(JSON.parse(r.chapters_json)).success;
    } catch {
      return false;
    }
  }, "chapters_json = [{point_ord, start_ms}]");
export type AudioTrackRow = z.infer<typeof audioTrackRow>;

/** Stem sangat umum di `passage_fts` (migrasi 0004, S11): pengaman pencarian kata umum. */
export const termStatRow = z.strictObject({
  term: z.string().min(1),
  df: id,
});
export type TermStatRow = z.infer<typeof termStatRow>;

// ── Al-Qur'an (migrasi 0005, S12, ADR-040) ─────────────────────────────────────────────

const surahNo = z.number().int().min(1).max(114);
const ayahNo = z.number().int().positive();

export const quranSourceKind = z.enum(["text", "translation", "transliteration"]);
export type QuranSourceKind = z.infer<typeof quranSourceKind>;

/** ID baris `quran_source` yang diisi ingest (S12); dipakai juga core untuk memilih teks tampilan. */
export const QURAN_SOURCE = {
  uthmani: "tanzil-uthmani",
  simpleClean: "tanzil-simple-clean",
  translation: "kemenag-id",
  transliteration: "kemenag-latin",
} as const;

export const quranSourceRow = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  kind: quranSourceKind,
  lang: z.string(),
  name: z.string(),
  version: z.string(),
  license: z.string(),
  attribution: z.string(),
  url: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type QuranSourceRow = z.infer<typeof quranSourceRow>;

export const quranSurahRow = z.strictObject({
  surah: surahNo,
  name_ar: z.string(),
  name_latin: z.string(),
  revelation: z.enum(["makkah", "madinah"]),
  ayah_count: ayahNo,
});
export type QuranSurahRow = z.infer<typeof quranSurahRow>;

export const quranAyahRow = z.strictObject({
  surah: surahNo,
  ayah: ayahNo,
  juz: z.number().int().min(1).max(30),
  text_uthmani: z.string(),
  text_index: z.string(),
});
export type QuranAyahRow = z.infer<typeof quranAyahRow>;

export const quranTranslationRow = z.strictObject({
  surah: surahNo,
  ayah: ayahNo,
  source_id: z.string(),
  text: z.string(),
  /** JSON `[{ marker, text }]` (catatan kaki terjemahan, verbatim) atau null. */
  footnotes: z.string().nullable(),
});
export type QuranTranslationRow = z.infer<typeof quranTranslationRow>;

/** Isi kolom `quran_translation.footnotes` setelah di-parse. */
export const quranFootnotes = z.array(z.strictObject({ marker: z.string(), text: z.string() }));
export type QuranFootnotes = z.infer<typeof quranFootnotes>;

export const ayahMatch = z.enum(["exact", "similar"]);
export type AyahMatch = z.infer<typeof ayahMatch>;

export const passageAyahRefRow = z.strictObject({
  passage_id: id,
  char_start: int.nonnegative(),
  char_end: int.positive(),
  surah: surahNo,
  ayah_from: ayahNo,
  ayah_to: ayahNo,
  match: ayahMatch,
  partial: flag,
  bracketed: flag,
  alt_count: int.nonnegative(),
});
export type PassageAyahRefRow = z.infer<typeof passageAyahRefRow>;

export const metaRow = z.strictObject({
  key: z.string(),
  value: z.string(),
});
export type MetaRow = z.infer<typeof metaRow>;

/**
 * Isi tabel `meta` setelah ingest. `schema_version` diisi migrasi; sisanya diisi ingest (S07):
 * `norm_version` = `NORM_VERSION` @surau/text saat indeks dibangun.
 */
export const corpusMeta = z.object({
  schema_version: z.coerce.number().int().positive(),
  norm_version: z.coerce.number().int().positive().optional(),
  corpus_version: z.string().optional(),
  built_at: z.string().optional(),
  source_hash: z.string().optional(),
  /** `LATIN_NORM_VERSION` @surau/text saat indeks Indonesia dibangun (skema ≥ 6, S14). */
  latin_norm_version: z.coerce.number().int().positive().optional(),
  /** sha256 berkas ekspor revisi terjemahan manusia yang dimuat (skema ≥ 8, X08). */
  revisions_sha256: z.string().optional(),
  /** Jumlah revisi manusia yang diterapkan (skema ≥ 8, X08). */
  revisions_count: z.coerce.number().int().nonnegative().optional(),
});
export type CorpusMeta = z.infer<typeof corpusMeta>;

/** Versi skema korpus yang dibuat migrasi di repo ini (= nilai `meta.schema_version` terbaru). */
export const CORPUS_SCHEMA_VERSION = 9;

/** Skema korpus pertama yang punya indeks `passage_fts` terisi dan `term_stat` (S11, migrasi 0004). */
export const SEARCH_SCHEMA_VERSION = 4;

/** Skema korpus pertama yang punya tabel Qur'an dan `passage_ayah_ref` (S12, migrasi 0005). */
export const QURAN_SCHEMA_VERSION = 5;

/**
 * Skema korpus pertama yang punya indeks Indonesia `translation_fts`/`summary_fts` dan indeks
 * `toc_node_start` (S14, migrasi 0006).
 */
export const LATIN_SEARCH_SCHEMA_VERSION = 6;

/**
 * Skema korpus pertama yang punya judul daftar isi Indonesia `toc_title_translation` +
 * `subheading_translation` (X04 bagian B, migrasi 0007).
 */
export const TITLE_SCHEMA_VERSION = 7;

/**
 * Skema korpus pertama yang punya asal tinjauan manusia terjemahan `translation_review` (X08 tahap 2,
 * migrasi 0008). Korpus lama tidak pernah berstatus tinjauan manusia, jadi pembaca tidak perlu cek.
 */
export const REVIEW_SCHEMA_VERSION = 8;

/**
 * Skema korpus pertama yang punya tabel Intisari (`digest*`, `glossary_term`, `audio_track`) dan
 * indeks `digest_point_fts` (X15, migrasi 0009, ADR-097). Di korpus lama fitur Intisari tidak ada.
 */
export const DIGEST_SCHEMA_VERSION = 9;

/** Tabel biasa korpus → skema barisnya (passage_fts tidak termasuk: tabel virtual turunan). */
export const corpusTables = {
  author: authorRow,
  work: workRow,
  edition: editionRow,
  page: pageRow,
  toc_node: tocNodeRow,
  passage: passageRow,
  footnote_ref: footnoteRefRow,
  passage_needs_review: passageNeedsReviewRow,
  translation: translationRow,
  translation_review: translationReviewRow,
  summary: summaryRow,
  toc_title_translation: tocTitleTranslationRow,
  subheading_translation: subheadingTranslationRow,
  glossary_term: glossaryTermRow,
  digest: digestRow,
  digest_point: digestPointRow,
  digest_anchor: digestAnchorRow,
  digest_quote: digestQuoteRow,
  digest_question: digestQuestionRow,
  digest_term: digestTermRow,
  audio_track: audioTrackRow,
  term_stat: termStatRow,
  quran_source: quranSourceRow,
  quran_surah: quranSurahRow,
  quran_ayah: quranAyahRow,
  quran_translation: quranTranslationRow,
  passage_ayah_ref: passageAyahRefRow,
  meta: metaRow,
} as const;
