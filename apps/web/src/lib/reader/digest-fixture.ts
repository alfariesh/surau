import type { DigestView, TranslationView } from "@surau/core";

import { TAKHRIJ_TERMS_VERSION, TAKHRIJ_TERM_GLOSS, takhrijStatus } from "@surau/core";

import type { DigestTeaser } from "./digest";

// Fixture Intisari BUATAN untuk /dev/intisari (X16): pratinjau komponen dan e2e tanpa D1. Teks Arab
// di sini kalimat contoh netral (bukan teks kitab, bukan Shamela, bukan teks Al-Qur'an; KONVENSI
// §Tes), "ayat" memakai surah buatan bernama "Uji", dan teks takhrij buatan tidak menyebut perawi
// atau penakhrij nyata. Teks Indonesia juga contoh, bukan keluaran model. Bentuknya dijaga
// `digestView.parse` di tes.

const ED_PATH = "/kitab/uji";
// Rumus ID ADR-029 untuk edisi buatan 99: node = edisi·100.000 + urutan, paragraf = edisi·10⁷ + urutan.
const NODE = 9_900_001;
const CHILD = 9_900_002;
const P1 = 990_000_001;
const P2 = 990_000_002;
const FOOT = 990_000_003;

const location = (page: number, passage: number) => ({
  juz: 1,
  page_no: page,
  permalink: `${ED_PATH}/1/${page}#p${passage % 10_000_000}`,
  label: `Kitab Uji, j. 1, h. ${page}`,
});

const AI = {
  lang: "id",
  model: "claude-haiku-5-5",
  prompt_version: "digest-section@1",
  created_at: "2026-10-24",
  review_status: "ai_generated",
} as const;

const quoteTranslation = (text: string): TranslationView => ({
  label: "ai_translation",
  ...AI,
  human_review: null,
  text,
});

/** Paragraf contoh (text_raw buatan) tempat kutipan dan jangkar menunjuk. */
export const FIXTURE_TEXT = {
  p1: "هذا نص تجريبي أول للاقتباس في صفحة الاختبار",
  p2: "وهذا نص تجريبي ثان فيه مثال على رواية (١)",
  foot: "(١) نص تجريبي للتخريج فيه كلمة ضعيف",
} as const;

const weakAt = FIXTURE_TEXT.foot.indexOf("ضعيف");
const status = takhrijStatus(["daif"]);

/** Takhrij contoh penanda (١) di paragraf 2: dipakai dalil dan kutipan riwayat. */
const takhrij: DigestView["quotes"][number]["takhrij"][number] = {
  marker: "١",
  char_start: FIXTURE_TEXT.p2.indexOf("(١)"),
  char_end: FIXTURE_TEXT.p2.indexOf("(١)") + 3,
  footnote: { id: FOOT, anchor: "p3", text_raw: FIXTURE_TEXT.foot, location: location(2, FOOT) },
  status: {
    label: "rule_extracted",
    kind: status.kind,
    text: status.text,
    weak: true,
    mixed: status.mixed,
    terms: [
      {
        kind: "daif",
        char_start: weakAt,
        char_end: weakAt + "ضعيف".length,
        gloss: TAKHRIJ_TERM_GLOSS.daif,
      },
    ],
    version: TAKHRIJ_TERMS_VERSION,
  },
};

const evidence: DigestView["evidence"] = {
  ayat: [
    {
      point_ords: [1],
      passage_id: P1,
      char_start: 0,
      char_end: 9,
      surah: 1,
      ayah_from: 2,
      ayah_to: 2,
      match: "exact",
      partial: false,
      bracketed: true,
      alt_count: 0,
      label: "QS Uji [1]: 2",
      location: location(1, P1),
    },
  ],
  hadith: [
    {
      point_ords: [2],
      passage_id: P2,
      ...takhrij,
      location: location(2, P2),
    },
  ],
  quran: {
    surahs: [
      { surah: 1, name_ar: "سورة تجريبية", name_latin: "Uji", revelation: "makkah", ayah_count: 3 },
    ],
    ayat: [
      {
        surah: 1,
        ayah: 2,
        juz: 1,
        text: "كَلِمَةٌ تَجْرِيبِيَّةٌ",
        translation: { text: "Terjemahan contoh (bukan teks Al-Qur'an).", footnotes: [] },
        transliteration: null,
      },
    ],
    sources: [
      {
        id: "uji-teks",
        kind: "text",
        name: "Teks Uji",
        version: "0",
        license: "contoh",
        attribution: "Fixture pengembangan Surau",
        url: "https://github.com/alfariesh/surau",
      },
      {
        id: "uji-terjemahan",
        kind: "translation",
        name: "Terjemahan Uji",
        version: "0",
        license: "contoh",
        attribution: "Fixture pengembangan Surau",
        url: "https://github.com/alfariesh/surau",
      },
    ],
  },
};

const base: Pick<
  DigestView,
  | "label"
  | "section"
  | "source"
  | "lang"
  | "model"
  | "prompt_version"
  | "created_at"
  | "review_status"
  | "audio"
  | "withheld_quotes"
> = {
  label: "ai_digest",
  section: { id: NODE, title_ar: "كتاب تجريبي", level: 2, permalink: `${ED_PATH}/bab/${NODE}` },
  source: {
    work: {
      slug: "uji",
      title_ar: "كتاب الاختبار",
      title_id: "Kitab Uji",
      author: null,
      attribution_status: "authentic",
    },
    edition: { id: 99, slug: "uji", is_default: true, publisher: null, city: null },
    license: "CC BY-NC-SA 4.0",
    attribution: "Teks contoh untuk pengembangan Surau (bukan teks kitab).",
  },
  ...AI,
  audio: null,
  withheld_quotes: [],
};

/** Intisari Kitab contoh: pembuka, tiga gagasan (pendapat, nukilan, anjuran), kutipan, dalil. */
export const FIXTURE_BOOK: DigestView = {
  ...base,
  tier: "book",
  basis: "children",
  prompt_version: "digest-book@1",
  model: "claude-sonnet-5-5",
  opening:
    "Contoh pembuka Intisari Kitab: kitab ini membahas hubungan ilmu dan amal, lalu adab orang yang belajar.",
  abstract:
    "Contoh abstrak. Menurut penulis, amal yang benar berangkat dari ilmu. Ia menukil pendapat yang menyamakan banyak bicara dengan banyak ilmu, lalu menyarankan murid memulai dari yang wajib.",
  closing:
    "Contoh penutup: inti kitab ini adalah bahwa ilmu menuntun amal, dan ilmu dicari dengan adab.",
  points: [
    {
      ord: 1,
      kind: "idea",
      stance: "author",
      title: "Ilmu mendahului amal",
      body: "Menurut penulis, amal yang benar berangkat dari ilmu; tanpa ilmu, niat baik pun bisa salah arah.",
      review_status: "ai_generated",
      anchors: [{ passage_id: P1, char_start: 0, char_end: 20, location: location(1, P1) }],
    },
    {
      ord: 2,
      kind: "idea",
      stance: "reported",
      title: "Pendapat yang dinukil penulis",
      body: "Penulis menukil pendapat sebagian orang bahwa banyak bicara tanda banyak ilmu, lalu menimbangnya.",
      review_status: "ai_generated",
      anchors: [
        { passage_id: P2, char_start: 0, char_end: 30, location: location(2, P2) },
        { passage_id: P1, char_start: 21, char_end: 40, location: location(1, P1) },
      ],
    },
    {
      ord: 4,
      kind: "advice",
      stance: "author",
      title: "Mulai dari yang wajib",
      body: "Penulis menyarankan murid mendahulukan ilmu yang wajib bagi dirinya sebelum yang lain.",
      review_status: "ai_generated",
      anchors: [{ passage_id: P2, char_start: 5, char_end: 25, location: location(2, P2) }],
    },
  ],
  quotes: [
    {
      ord: 1,
      point_ord: 1,
      kind: "text",
      passage_id: P1,
      char_start: 0,
      char_end: FIXTURE_TEXT.p1.length,
      text_raw: FIXTURE_TEXT.p1,
      location: location(1, P1),
      translation: quoteTranslation("Ini teks contoh pertama untuk kutipan di halaman uji."),
      takhrij: [],
    },
    {
      ord: 2,
      point_ord: null,
      kind: "report",
      passage_id: P2,
      char_start: 0,
      char_end: FIXTURE_TEXT.p2.indexOf(" (١)"),
      text_raw: FIXTURE_TEXT.p2.slice(0, FIXTURE_TEXT.p2.indexOf(" (١)")),
      location: location(2, P2),
      translation: quoteTranslation("Dan ini teks contoh kedua berisi contoh riwayat."),
      takhrij: [takhrij],
    },
  ],
  questions: [
    { ord: 1, point_ord: 1, text: "Menurut penulis, apa yang mendahului amal?" },
    { ord: 2, point_ord: 4, text: "Apa yang penulis sarankan untuk dipelajari lebih dulu?" },
  ],
  terms: [
    {
      key: "ilmu",
      label: "'ilm",
      gloss: "Pengetahuan; di sini pengetahuan agama yang menuntun amal (definisi contoh).",
      ...AI,
      prompt_version: "glossary@1",
    },
    {
      key: "adab",
      label: "adab",
      gloss: "Tata krama dan sikap batin dalam belajar (definisi contoh).",
      ...AI,
      prompt_version: "glossary@1",
    },
  ],
  reading_minutes: 4,
  evidence,
};

/** Intisari Bab contoh: abstrak + dua gagasan, tanpa pembuka/penutup. */
export const FIXTURE_SECTION: DigestView = {
  ...base,
  section: { id: CHILD, title_ar: "باب تجريبي", level: 3, permalink: `${ED_PATH}/bab/${CHILD}` },
  tier: "section",
  basis: "text",
  opening: null,
  abstract:
    "Contoh abstrak Intisari Bab: bagian ini menjelaskan bahwa ilmu menuntun amal, dengan satu contoh riwayat.",
  closing: null,
  points: FIXTURE_BOOK.points.slice(0, 2),
  quotes: FIXTURE_BOOK.quotes.slice(0, 1),
  questions: FIXTURE_BOOK.questions.slice(0, 1),
  terms: FIXTURE_BOOK.terms.slice(0, 1),
  reading_minutes: 2,
  evidence,
};

/** Intisari Bab anak Intisari Kitab contoh (tata letak Kitab). */
export const FIXTURE_CHILDREN: { teaser: DigestTeaser; title: string; titleId?: string }[] = [
  {
    teaser: {
      nodeId: CHILD,
      tier: "section",
      points: 2,
      minutes: 2,
      listenMinutes: null,
      href: "/dev/intisari?tier=section",
    },
    title: "باب تجريبي",
    titleId: "Bab Uji",
  },
];
