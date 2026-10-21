import { normalizeArabic, toRawSpan } from "./normalize.ts";

// Istilah takhrij (X06, ADR-069): pengenal deterministik frasa baku penakhrij (al-'Iraqi untuk
// Ihya) di teks catatan kaki, untuk label status hadits yang dibuat sekali dan bisa ditinjau, bukan
// ringkasan bebas model per jawaban. Pencocokan per kata atas bentuk normal `normalizeArabic` (satu
// fungsi normalisasi, aturan teks-arab no. 3); setiap istilah membawa rentang mentahnya
// (`toRawSpan`), jadi frasa yang ditampilkan selalu disalin dari teks DB. Ini INDEKS istilah yang
// tertulis di takhrij, bukan penilaian hadits: satu takhrij bisa menyebut jalur sahih dan jalur
// lemah, atau penilaian ulama lain yang dinukil. Bagian sebelum penanda takhrij pertama (lafaz
// hadits yang dibahas, "حديث …") tidak dipindai, supaya kata seperti "باطل" di lafaz tidak terbaca
// sebagai penilaian. Kata kunci ditulis dalam bentuk normal (tanpa harakat, أ/إ/آ → ا, ة → ه,
// ى → ي). Naikkan versi bila aturan berubah (label yang sudah ditinjau terikat versi).

export const TAKHRIJ_TERMS_VERSION = 1;

export type TakhrijTermKind =
  /** Diriwayatkan al-Bukhari dan Muslim (متفق عليه، أخرجاه، في الصحيحين). */
  | "muttafaq"
  | "bukhari"
  | "muslim"
  | "sahih"
  | "hasan"
  /** "حسن صحيح" (istilah at-Tirmidzi). */
  | "hasan_sahih"
  /** Sanadnya baik (جيد). */
  | "jayyid"
  /** "لا بأس به": dapat diterima. */
  | "la_bas"
  | "gharib"
  | "daif"
  /** Sangat lemah: munkar, matruk, wahin, perawi pendusta, "ليس بشيء". */
  | "sangat_lemah"
  /** Palsu/batil: موضوع، باطل، مكذوب، disebut di kitab al-Maudhu'at. */
  | "palsu"
  /** Disebut di kitab perawi lemah (في الضعفاء، كتاب الضعفاء لفلان). */
  | "duafa"
  | "la_asl"
  /** Penakhrij tidak menemukannya (لم أجده، لم أقف عليه، لم أظفر له بإسناد). */
  | "lam_ajid"
  | "mursal"
  | "mawquf"
  | "muallaq"
  /** Hanya sebagian lafaz (دون قوله …): tambahan tidak ada di sumber yang disebut. */
  | "sebagian"
  /** Merujuk takhrij di tempat lain (تقدم، سيأتي في …). */
  | "rujukan";

export interface TakhrijTerm {
  kind: TakhrijTermKind;
  /** Rentang mentah (UTF-16) di teks catatan kaki. */
  start: number;
  end: number;
}

export interface TakhrijTerms {
  /**
   * `takhrij`: ada penanda takhrij (sumber, istilah, atau rujukan); `editor_note`: catatan
   * penyunting cetakan (قوله … / مصححه), bukan takhrij; `unrecognized`: tidak ada yang dikenali.
   */
  kind: "takhrij" | "editor_note" | "unrecognized";
  /** Awal bagian takhrij (offset mentah); sebelumnya = lafaz hadits yang dibahas. */
  takhrijStart: number;
  /** Menyebut sumber riwayat (أخرجه، رواه، عند فلان …). */
  sources: boolean;
  /** Istilah urut kemunculan; satu jenis bisa muncul lebih dari sekali. */
  terms: TakhrijTerm[];
}

type PatternKind = TakhrijTermKind | "source";

interface Pattern {
  kind: PatternKind;
  words: readonly string[];
  /** Proklitik yang boleh menempel di kata pertama (bawaan: tanpa, و, ف). */
  pre?: readonly string[];
  /** Kata sesudah frasa yang membatalkan (mis. "صحيح مسلم" = nama kitab). */
  notNext?: readonly string[];
  /** Kata sebelum frasa yang membatalkan (mis. "في صحيح"). */
  notPrev?: readonly string[];
  /** Frasa ini boleh menandai awal bagian takhrij. */
  opens?: boolean;
  /**
   * Kata sifat penilaian satu kata ("حسن", "صحيح", "غريب"): ditolak bila kata sesudahnya
   * bersandang ("حسن الخلق" = akhlak yang baik, di lafaz hadits), kecuali "الاسناد".
   */
  adjective?: boolean;
}

const W = ["", "و", "ف"] as const;
const WB = ["", "و", "ف", "ب", "وب", "فب"] as const;
const WL = ["", "و", "ف", "ل", "ول", "فل"] as const;
/** Kata sesudah "صحيح"/"حسن" yang menandakan nama kitab atau nama orang, bukan penilaian. */
const BOOK_OR_NAME = ["مسلم", "البخاري", "ابن", "ابي", "بن", "الترمذي", "ابو"];
const NEGATION = ["ليس", "غير", "وليس", "فليس"];
/**
 * Kata sebelum "البخاري"/"مسلم" yang menandakan bukan penyebutan riwayatnya: syarat ("على شرط"),
 * tidak meriwayatkan ("ولم يخرجه"), penilaian olehnya ("وضعفه البخاري", "قال البخاري"), atau
 * nama orang ("أبو مسلم", "بن مسلم").
 */
const NOT_SOURCE_BEFORE = [
  "شرط",
  "ولا",
  "يخرجه",
  "يخرجاه",
  "يخرجها",
  "قال",
  "وقال",
  "ضعفه",
  "وضعفه",
  "ابو",
  "ابي",
  "ابا",
  "بن",
  "ابن",
];
/** Penghimpun yang lazim disebut tanpa kata kerja ("عند الترمذي", "وللطبراني"). */
const COLLECTORS = [
  "البخاري",
  "مسلم",
  "الترمذي",
  "النسايي",
  "احمد",
  "الطبراني",
  "الحاكم",
  "البيهقي",
  "الدارقطني",
  "البزار",
  "ابي",
  "ابن",
];

const p = (
  kind: PatternKind,
  phrase: string,
  extra: Omit<Pattern, "kind" | "words"> = {},
): Pattern => ({ kind, words: phrase.split(" "), ...extra });

// Urutan tidak penting: frasa terpanjang menang di posisi yang sama, lalu yang lebih awal.
const PATTERNS: readonly Pattern[] = [
  // ── Sumber riwayat ──
  ...[
    "اخرجه",
    "اخرجها",
    "اخرجهما",
    "اخرجوه",
    "اخرج",
    "خرجه",
    "رواه",
    "رواها",
    "رواهما",
    "رووه",
    "رويناه",
    "روي",
    "ذكره",
    "اورده",
    "اسنده",
    "وصله",
  ].map((w) => p("source", w, { pre: W, opens: true })),
  // "من حديث فلان" (jalur sahabat) dan "عند/ولـ + nama penghimpun": tanpa kata kerja.
  p("source", "من حديث", { pre: W, opens: true }),
  ...COLLECTORS.flatMap((c) => [
    // "عند البخاري/مسلم" = riwayat al-Bukhari/Muslim (sama dengan "رواه مسلم", "ولمسلم").
    p(c === "البخاري" ? "bukhari" : c === "مسلم" ? "muslim" : "source", `عند ${c}`, {
      pre: W,
      opens: true,
    }),
    p("source", `ل${c.startsWith("ال") ? c.slice(1) : c}`, { pre: ["و", "ف"], opens: true }),
  ]),
  p("source", "ولهما", { pre: [""], opens: true }),
  // ── al-Bukhari dan Muslim ──
  // "وأصله في الصحيحين/متفق عليه" = hanya asalnya; "ليس في الصحيحين" = negasi.
  ...["متفق عليه", "اخرجاه", "خرجاه", "اتفقا عليه", "في الصحيحين"].map((w) =>
    p("muttafaq", w, { opens: true, notPrev: ["اصله", "واصله", ...NEGATION] }),
  ),
  p("muttafaq", "الشيخان", { pre: W }),
  p("bukhari", "البخاري", { pre: W, notPrev: NOT_SOURCE_BEFORE }),
  p("bukhari", "للبخاري", { pre: W }),
  p("muslim", "مسلم", { pre: WL, notPrev: NOT_SOURCE_BEFORE, notNext: ["بن"] }),
  // ── Penilaian ──
  p("hasan_sahih", "حسن صحيح"),
  // Kata kerja ("وصححه الترمذي") boleh diikuti nama; kata sifat "صحيح" tidak ("صحيح مسلم").
  ...["صحيح", "صححه", "صححاه", "صححهما", "تصحيحه"].map((w) =>
    p("sahih", w, {
      pre: W,
      notPrev: ["في", ...NEGATION],
      ...(w === "صحيح" ? { notNext: BOOK_OR_NAME, adjective: true } : {}),
    }),
  ),
  // "إسناده/سنده + penilaian" juga membuka takhrij (catatan kaki lanjutan: "(٧) وإسناده ضعيف").
  ...["اسناده صحيح", "سنده صحيح", "اسنادهما صحيح", "صحيح الاسناد"].map((w) =>
    p("sahih", w, { pre: WB, opens: true }),
  ),
  // "على شرط مسلم/البخاري/الشيخين/شرطهما" satu frasa (penilaian al-Hakim), bukan riwayat Muslim.
  ...[
    "علي شرط البخاري ومسلم",
    "علي شرط مسلم",
    "علي شرط البخاري",
    "علي شرط الشيخين",
    "علي شرطهما",
    "علي شرط",
  ].map((w) => p("sahih", w, { pre: WB })),
  ...["اسناده ضعيف", "سنده ضعيف", "اسنادهما ضعيف"].map((w) =>
    p("daif", w, { pre: W, opens: true }),
  ),
  // "بإسناد/بسند + penilaian": khas takhrij, boleh membuka takhrij tanpa kata kerja.
  ...["اسناد", "سند", "اسنادين", "اسانيد"].flatMap((s) => [
    p("sahih", `${s} صحيح`, { pre: ["ب", "وب"], opens: true }),
    p("sahih", `${s} صحيحين`, { pre: ["ب", "وب"], opens: true }),
    p("hasan", `${s} حسن`, { pre: ["ب", "وب"], opens: true }),
    p("jayyid", `${s} جيد`, { pre: ["ب", "وب"], opens: true }),
    p("daif", `${s} ضعيف`, { pre: ["ب", "وب"], opens: true }),
    p("daif", `${s} ضعيفين`, { pre: ["ب", "وب"], opens: true }),
    p("sangat_lemah", `${s} ضعيف جدا`, { pre: ["ب", "وب"], opens: true }),
  ]),
  ...["اسناده جيد", "سنده جيد", "جيد الاسناد"].map((w) =>
    p("jayyid", w, { pre: W, opens: w !== "جيد الاسناد" }),
  ),
  ...["لا باس به", "لا باس باسناده", "ليس به باس"].map((w) => p("la_bas", w, { pre: W })),
  p("hasan", "حسن", {
    pre: W,
    notPrev: ["ابو", "ابي", "ابا", ...NEGATION],
    notNext: BOOK_OR_NAME,
    adjective: true,
  }),
  // "حسنه" juga bentuk normal "حسنة" ("سنة حسنة" di lafaz): hanya "وحسنه/فحسنه".
  p("hasan", "حسنه", { pre: ["و", "ف"], notPrev: NEGATION }),
  ...["حسناه", "تحسينه"].map((w) => p("hasan", w, { pre: W, notPrev: NEGATION })),
  ...["اسناده حسن", "سنده حسن", "اسنادهما حسن"].map((w) => p("hasan", w, { pre: WB, opens: true })),
  p("gharib", "غريب", { pre: W, notPrev: NEGATION, adjective: true }),
  // "غريب بهذا اللفظ/السياق": membuka takhrij (غريب sendirian bisa lafaz hadits: "كأنك غريب").
  p("gharib", "غريب بهذا", { pre: W, opens: true }),
  p("gharib", "حديث غريب", { pre: W, opens: true }),
  ...[
    "ضعيف",
    "ضعيفه",
    "ضعيفان",
    "ضعيفين",
    "ضعاف",
    "ضعفه",
    "ضعفوه",
    "ضعفها",
    "ضعفاء",
    "تضعيفه",
    "ضعيفا",
    "مجهول",
    "مجهوله",
    "مجهولا",
    "جهاله",
    "منقطع",
    "منقطعا",
    "انقطاع",
    "معلول",
  ].map((w) => p("daif", w, { pre: WB, notPrev: NEGATION })),
  // "واعله" = dan menyatakannya cacat; "فاعله" = pelakunya (bukan ف + اعله), jadi tanpa ف/ب.
  p("daif", "اعله", { pre: ["", "و"] }),
  ...[
    "فيه ضعف",
    "اسناده ضعف",
    "اسنادهما ضعف",
    "سنده ضعف",
    "ضعف اسناده",
    "ضعف سنده",
    "ليس بالقوي",
    "ليس اسناده بالقوي",
    "اسناده ليس بالقوي",
    "ليس اسناده بذاك",
    "ليس بذاك",
    "فيه لين",
    "لين الحديث",
    "لا يصح",
    "لم يصح",
    "لا يثبت",
    "لم يثبت",
    "تكلم فيه",
    "فيه نظر",
    "معضل",
    "معضلا",
    "غير ثابت",
    "ليس بثابت",
    "ضعف ابن معين",
    "ضعف البيهقي",
    "ضعف الترمذي",
    "ضعف الدارقطني",
    "ضعف النسايي",
    "ضعف احمد",
    "احد الضعفاء",
    "جهله",
    "اضطراب",
    "مضطرب",
  ].map((w) => p("daif", w, { pre: W })),
  ...["في الضعفاء", "كتاب الضعفاء"].map((w) => p("duafa", w, { pre: W })),
  // "لا يعرف إلا …" = hanya dikenal lewat …, bukan "tidak dikenal".
  ...["من لا يعرف", "لا يعرف"].map((w) => p("daif", w, { pre: W, notNext: ["الا"] })),
  ...[
    "ضعيف جدا",
    "شديد الضعف",
    "ليس بشيء",
    "واه",
    "منكر",
    "منكره",
    "مناكير",
    "متروك",
    "متروكا",
    "ساقط",
    "كذاب",
    "وضاع",
    "متهم",
    "يضع الحديث",
  ].map((w) => p("sangat_lemah", w, { pre: WB, notPrev: NEGATION, notNext: ["ونكير"] })),
  ...["موضوع", "موضوعه", "موضوعا", "الموضوعات", "مكذوب", "مختلق", "باطل", "باطله"].map((w) =>
    p("palsu", w, { pre: WB, notPrev: NEGATION }),
  ),
  ...[
    "لا اصل له",
    "ليس له اصل",
    "لم اجد له اصلا",
    "لا اعرف له اصلا",
    "لم ار له اصلا",
    "لم اقف له علي اصل",
    "لم اجد له علي اصل",
  ].map((w) => p("la_asl", w, { pre: W, opens: true })),
  // Varian yang lebih panjang supaya frasa yang ditampilkan memuat keterangannya.
  ...[
    "لم اظفر له باسناد",
    "لم اجد له اسنادا",
    "لم اره مرفوعا",
    "لم اجده مرفوعا",
    "لم اجده هكذا",
    "لم اجده بهذا اللفظ",
    "لم اجده بهذا السياق",
  ].map((w) => p("lam_ajid", w, { pre: W, opens: true })),
  ...[
    "لم اجده",
    "لم اجد",
    "لم اقف",
    "لم اظفر",
    "لم اره",
    "لم ار له اسنادا",
    "لم اعرفه",
    "لا اعرفه",
    "لم يجده",
  ].map((w) => p("lam_ajid", w, { pre: W, opens: true, notNext: ["الا"] })),
  ...["مرسل", "مرسلا", "مرسله", "المراسيل"].map((w) => p("mursal", w, { pre: WB })),
  ...["موقوف", "موقوفا", "موقوفه"].map((w) => p("mawquf", w, { pre: WB })),
  ...["تعليقا", "معلقا", "علقه", "بغير اسناد", "بلا اسناد", "بدون اسناد"].map((w) =>
    p("muallaq", w, { pre: WB, opens: true }),
  ),
  ...["دون قوله", "دون ذكر", "دون الزياده", "بدون قوله", "بدون ذكر"].map((w) =>
    p("sebagian", w, { pre: W }),
  ),
  // "ما تقدم من ذنبه" = lafaz hadits yang sangat lazim, bukan rujukan.
  // Tanpa ف: "فتقدم" lazim sebagai kata kerja di lafaz ("lalu ia maju").
  ...["تقدم", "تقدما", "تقدمت", "المتقدم", "المتقدمه"].map((w) =>
    p("rujukan", w, { pre: ["", "و"], opens: true, notPrev: ["ما", "وما"], notNext: ["من"] }),
  ),
  // Rujukan ke depan hanya "سيأتي/يأتي في …" ("سيأتي على الناس زمان" = lafaz).
  ...["سياتي في", "ياتي في الباب", "ياتي في الذي", "ياتي بعده", "ياتي في كتاب", "سياتي بعده"].map(
    (w) => p("rujukan", w, { pre: ["", "و"], opens: true }),
  ),
];

/** Pola per bentuk kata pertama (dengan proklitiknya): pencocokan tidak memindai semua pola. */
const BY_HEAD = new Map<string, Pattern[]>();
for (const pat of PATTERNS) {
  const first = pat.words[0]!;
  for (const q of pat.pre ?? W) {
    if (q !== "" && first.length < 2) continue;
    const key = q + first;
    BY_HEAD.set(key, [...(BY_HEAD.get(key) ?? []), pat]);
  }
}

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokensOf(text: string): Token[] {
  const out: Token[] = [];
  let at = 0;
  for (const t of text.split(" ")) {
    if (t !== "") out.push({ text: t, start: at, end: at + t.length });
    at += t.length + 1;
  }
  return out;
}

/** Panjang frasa `pat` yang cocok mulai token `i` (0 = tidak cocok); kata pertama sudah cocok. */
function matchAt(tokens: readonly Token[], i: number, pat: Pattern): number {
  for (let k = 1; k < pat.words.length; k++) if (tokens[i + k]?.text !== pat.words[k]) return 0;
  const next = tokens[i + pat.words.length]?.text;
  if (next !== undefined && pat.notNext?.includes(next)) return 0;
  const prev = tokens[i - 1]?.text;
  if (prev !== undefined && pat.notPrev?.includes(prev)) return 0;
  if (pat.adjective && next !== undefined && next.startsWith("ال") && next !== "الاسناد") return 0;
  return pat.words.length;
}

/**
 * Istilah takhrij di teks catatan kaki (mentah, dari DB): sumber, istilah penilaian, dan rujukan,
 * masing-masing dengan rentang mentahnya. Lihat komentar modul untuk batasnya.
 */
export function takhrijTerms(raw: string): TakhrijTerms {
  const n = normalizeArabic(raw);
  const tokens = tokensOf(n.text);
  const empty: TakhrijTerms = { kind: "unrecognized", takhrijStart: 0, sources: false, terms: [] };
  if (tokens.length === 0) return empty;
  // Catatan penyunting dibuka "قوله"; "مصححه" hanya menandai catatan penyunting bila tidak ada
  // penanda takhrij (takhrij yang ditutup catatan penyunting tetap takhrij).
  if (tokens[0]?.text === "قوله") return { ...empty, kind: "editor_note" };
  // Semua kecocokan, frasa terpanjang dulu di setiap posisi.
  const found: { kind: PatternKind; i: number; len: number; opens: boolean }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let best: { pat: Pattern; len: number; opens: boolean } | null = null;
    for (const pat of BY_HEAD.get(tokens[i]!.text) ?? []) {
      const len = matchAt(tokens, i, pat);
      if (len === 0 || (best !== null && len < best.len)) continue;
      const opens = pat.opens === true;
      if (best === null || len > best.len) best = { pat, len, opens };
      else {
        // Panjang sama: istilah penilaian/kitab menang atas penanda sumber ("وللبخاري"), dan
        // frasa tetap membuka takhrij bila salah satu polanya membuka.
        if (best.pat.kind === "source" && pat.kind !== "source") best.pat = pat;
        best.opens ||= opens;
      }
    }
    if (best !== null) {
      found.push({ kind: best.pat.kind, i, len: best.len, opens: best.opens });
      i += best.len - 1;
    }
  }
  const opener = found.find((f) => f.opens);
  if (opener === undefined)
    return tokens.some((t) => t.text === "مصححه") ? { ...empty, kind: "editor_note" } : empty;
  const inTakhrij = found.filter((f) => f.i >= opener.i);
  const rawSpan = (f: { i: number; len: number }) =>
    toRawSpan(raw, n, tokens[f.i]!.start, tokens[f.i + f.len - 1]!.end);
  const terms = inTakhrij
    .filter((f): f is typeof f & { kind: TakhrijTermKind } => f.kind !== "source")
    .map((f) => {
      const [start, end] = rawSpan(f);
      return { kind: f.kind, start, end };
    });
  return {
    kind: "takhrij",
    takhrijStart: rawSpan(opener)[0],
    sources: inTakhrij.some((f) => ["source", "muttafaq", "bukhari", "muslim"].includes(f.kind)),
    terms,
  };
}
