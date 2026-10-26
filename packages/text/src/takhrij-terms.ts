import { normalizeArabic, toRawSpan } from "./normalize.ts";

// Istilah takhrij (X06, ADR-069; versi 2, ADR-108): pengenal deterministik frasa baku penakhrij
// (al-'Iraqi untuk Ihya) di teks catatan kaki, untuk label status hadits yang dibuat sekali dan bisa
// ditinjau, bukan ringkasan bebas model per jawaban. Pencocokan per kata atas bentuk normal
// `normalizeArabic` (satu fungsi normalisasi, aturan teks-arab no. 3); setiap istilah membawa
// rentang mentahnya (`toRawSpan`), jadi frasa yang ditampilkan selalu disalin dari teks DB. Ini
// INDEKS istilah yang tertulis di takhrij, bukan penilaian hadits: satu takhrij bisa menyebut jalur
// sahih dan jalur lemah, atau penilaian ulama lain yang dinukil.
//
// Lafaz hadits tidak dipindai: bagian sebelum penanda takhrij pertama ("حديث …"), dan sesudah
// pembuka, bagian lafaz yang dikutip ("من حديث فلان …", "بلفظ …", "وفي رواية …") hanya dipindai
// untuk frasa yang tidak mungkin muncul di lafaz; kata yang juga lazim di lafaz (`ambiguous`:
// "مسلم", "لا بأس به", "موضوع", "حسن" …) diabaikan di sana. Catatan kaki yang tersimpan sebagai satu
// paragraf (penanda "(N)" internal, masalah ingest) dipindai per segmen. Kata kunci ditulis dalam
// bentuk normal (tanpa harakat, أ/إ/آ → ا, ة → ه, ى → ي). Naikkan versi bila aturan berubah (label
// yang sudah ditinjau terikat versi).

export const TAKHRIJ_TERMS_VERSION = 2;

export type TakhrijTermKind =
  /** Diriwayatkan al-Bukhari dan Muslim (متفق عليه، أخرجاه، في الصحيحين، وللشيخين). */
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
  /** Tidak ditemukan sebagai sabda Nabi (لم أره/أجده مرفوعا); riwayat lain (mis. mauquf) bisa ada. */
  | "lam_ajid_marfu"
  | "mursal"
  | "mawquf"
  | "muallaq"
  /** Hanya sebagian lafaz (دون قوله …، وليس فيه قوله …): tambahan tidak ada di sumber yang disebut. */
  | "sebagian"
  /** Merujuk takhrij di tempat lain (تقدم، سيأتي في …). */
  | "rujukan"
  /** Perawi/sanad dinilai tepercaya (رجاله ثقات، رجاله رجال الصحيح): bukan penilaian hadits. */
  | "tsiqat"
  /** Perawi atau sanadnya diperselisihkan (مختلف فيه، اختلف في إسناده/رفعه). */
  | "mukhtalaf"
  /**
   * Penilaian ulama lain yang dinukil lalu dibantah penakhrij ("وصححه فلان وليس كذلك", "قال صحيح
   * الإسناد قلت بل …"): rentangnya mencakup penilaian dan bantahannya.
   */
  | "dibantah";

export interface TakhrijTerm {
  kind: TakhrijTermKind;
  /** Rentang mentah (UTF-16) di teks catatan kaki. */
  start: number;
  end: number;
  /** Indeks segmen (`TakhrijTerms.segments`) tempat istilah ini. */
  segment: number;
}

export interface TakhrijTerms {
  /**
   * `takhrij`: ada penanda takhrij (sumber, istilah, atau rujukan); `editor_note`: catatan
   * penyunting cetakan (قوله … / مصححه), bukan takhrij; `unrecognized`: tidak ada yang dikenali.
   * Dinilai dari segmen pertama.
   */
  kind: "takhrij" | "editor_note" | "unrecognized";
  /** Awal bagian takhrij segmen pertama (offset mentah); sebelumnya = lafaz hadits yang dibahas. */
  takhrijStart: number;
  /** Segmen pertama menyebut sumber riwayat (أخرجه، رواه، عند فلان …). */
  sources: boolean;
  /** Istilah urut kemunculan; satu jenis bisa muncul lebih dari sekali. */
  terms: TakhrijTerm[];
  /**
   * Rentang mentah tiap segmen, urut. Lebih dari satu bila beberapa catatan kaki tersimpan sebagai
   * satu paragraf (penanda "(N)" di tengah teks, diikuti takhrij hadits lain): tiap segmen dipindai
   * sendiri (pembuka dan lafaznya sendiri), supaya istilah hadits lain tidak tercampur.
   */
  segments: { start: number; end: number; takhrij: boolean; sources: boolean }[];
}

/** Penanda pembuka/lafaz, bukan istilah: `source` = sumber riwayat, `refute` = bantahan penakhrij. */
type PatternKind = TakhrijTermKind | "source" | "lafaz" | "refute";

type Guard = (tokens: readonly Token[], i: number, len: number) => boolean;

interface Pattern {
  kind: PatternKind;
  words: readonly string[];
  /** Proklitik yang boleh menempel di kata pertama (bawaan: tanpa, و, ف). */
  pre?: readonly string[];
  /** Kata sesudah frasa yang membatalkan (mis. "صحيح مسلم" = nama kitab). */
  notNext?: readonly string[];
  /** Kata sebelum frasa yang membatalkan (mis. "في صحيح"). */
  notPrev?: readonly string[];
  /** Syarat konteks tambahan (mis. "مسلم" tanpa proklitik hanya sesudah kata kerja sumber). */
  ok?: Guard;
  /** Frasa ini boleh menandai awal bagian takhrij. */
  opens?: boolean;
  /**
   * Kata sifat penilaian satu kata ("حسن", "صحيح", "غريب"): ditolak bila kata sesudahnya
   * bersandang ("حسن الخلق" = akhlak yang baik, di lafaz hadits), kecuali "الاسناد".
   */
  adjective?: boolean;
  /** Juga lazim di lafaz hadits: diabaikan di bagian lafaz yang dikutip sesudah pembuka. */
  ambiguous?: boolean;
  /**
   * Sesudah frasa ini dimulai bagian lafaz yang dikutip; `skip` = jumlah kata sesudah frasa yang
   * masih bukan lafaz ("ولفظ مسلم …": nama penghimpun).
   */
  lafaz?: { skip: number };
  /** Membantah penilaian tepat sebelumnya bila ada (`resolveRefutations`). */
  refutes?: boolean;
}

const W = ["", "و", "ف"] as const;
const WB = ["", "و", "ف", "ب", "وب", "فب"] as const;
/** Kata sebelum "حسن"/"صحيح"/"غريب" yang menandakan nama orang ("عبد الله بن حسن"). */
const NAME_BEFORE = ["ابو", "ابي", "ابا", "بن", "ابن", "بنت", "ام"];
/** Kata sesudah "صحيح"/"حسن" yang menandakan nama kitab atau nama orang, bukan penilaian. */
const BOOK_OR_NAME = ["مسلم", "البخاري", "ابن", "ابي", "بن", "الترمذي", "ابو"];
const NEGATION = ["ليس", "غير", "وليس", "فليس"];
/** Kata kerja sumber riwayat (dengan و/ف): pembuka takhrij. */
const SOURCE_VERBS = [
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
];
const SOURCE_PREV = new Set([
  ...SOURCE_VERBS.flatMap((v) => W.map((q) => q + v)),
  "اخرجاه",
  ...["زاد", "لفظ", "انفرد", "علقه", "في"].flatMap((v) => W.map((q) => q + v)),
  "به",
  "بها",
  "روايه",
  "وروايه",
  "بلفظ",
  "بطوله",
  "علقها",
  "افراد",
  "واقتصر",
]);
/**
 * Kata sebelum "البخاري"/"مسلم" yang menandakan bukan penyebutan riwayatnya: syarat ("على شرط"),
 * tidak meriwayatkan ("ولم يخرجه", "ولم يقل"), penilaian olehnya ("وضعفه البخاري", "قال البخاري"),
 * atau nama orang ("أبو مسلم", "بن مسلم").
 */
const NOT_SOURCE_BEFORE = [
  "شرط",
  "ولا",
  "يخرجه",
  "يخرجاه",
  "يخرجها",
  "يقل",
  "يذكرها",
  "يذكره",
  "قال",
  "وقال",
  "قاله",
  "ضعفه",
  "وضعفه",
  "ابو",
  "ابي",
  "ابا",
  "بن",
  "ابن",
];
/** "البخاري في التاريخ/الأدب …" = kitab al-Bukhari selain Sahih. */
const BUKHARI_OTHER_BOOKS = ["التاريخ", "الادب", "خلق", "جزء", "القراءه", "رفع", "الضعفاء"];
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
/** Penilai yang lazim disebut sesudah "وقال" ("وقال الترمذي حسن"): akhir bagian lafaz. */
const CRITICS = new Set([
  ...COLLECTORS,
  "ابو",
  "العقيلي",
  "الذهبي",
  "المنذري",
  "النووي",
  "الخطيب",
  "البغوي",
  "شيخنا",
  "المصنف",
  "يحيي",
  "شعبه",
  "مالك",
  "الجمهور",
  "جماعه",
]);
/** Kata yang menutup bagian lafaz yang dikutip (pernyataan penakhrij dimulai lagi). */
const LAFAZ_END = new Set([
  "الحديث",
  "قلت",
  "وقلت",
  "رجاله",
  "ورجاله",
  "اسناده",
  "واسناده",
  "سنده",
  "وسنده",
  "اسنادهما",
  "واسنادهما",
  "وكلها",
  "وكلاهما",
  "لفظ",
  "زاد",
  "وزاد",
]);

const p = (
  kind: PatternKind,
  phrase: string,
  extra: Omit<Pattern, "kind" | "words"> = {},
): Pattern => ({ kind, words: phrase.split(" "), ...extra });

const tokenAt = (t: readonly Token[], i: number): string | undefined => t[i]?.text;
/** "مسلم"/"البخاري" tanpa proklitik: hanya sesudah kata kerja sumber ("أخرجه مسلم", "زاد مسلم"). */
const afterSourceVerb: Guard = (t, i) => SOURCE_PREV.has(tokenAt(t, i - 1) ?? "");
const notOtherBukhariBook: Guard = (t, i, len) =>
  !(tokenAt(t, i + len) === "في" && BUKHARI_OTHER_BOOKS.includes(tokenAt(t, i + len + 1) ?? ""));
/** "لا بأس به" sesudah "قال فلان" (1–2 kata nama) atau "أرجو أنه": penilaian, bukan lafaz. */
const saidBySomeone: Guard = (t, i) =>
  [2, 3].some((k) => ["قال", "وقال"].includes(tokenAt(t, i - k) ?? "")) ||
  (tokenAt(t, i - 1) === "انه" && tokenAt(t, i - 2) === "ارجو");

/** "ضعفه/كذبه + nama penilai" = kata kerja penilaian, bukan "kelemahannya/dustanya". */
const nextIsCritic: Guard = (t, i, len) => CRITICS.has(tokenAt(t, i + len) ?? "");

/** Kata sebelum "دون …" yang menandakan penyebutan sumber ("رواه مسلم دون آخره", "متفق عليه دون"). */
const AFTER_SOURCE = new Set([
  ...COLLECTORS,
  "عليه",
  "داود",
  "ماجه",
  "الحديث",
  "ذكره",
  "فذكره",
  "مختصر",
  "مختصرا",
  "نحوه",
  "بنحوه",
  "منه",
  "تقدم",
]);

const ISNAD = ["اسناد", "سند", "اسنادين", "اسانيد"];

// Urutan tidak penting: frasa terpanjang menang di posisi yang sama, lalu yang lebih awal. Kata "*"
// cocok dengan satu kata apa pun.
const PATTERNS: readonly Pattern[] = [
  // ── Sumber riwayat ──
  ...SOURCE_VERBS.map((w) => p("source", w, { pre: W, opens: true })),
  // "من حديث/من رواية فلان …" (jalur sahabat, lalu biasanya lafaznya) dan "عند/ولـ + penghimpun".
  p("source", "من حديث", { pre: W, opens: true, lafaz: { skip: 0 } }),
  p("source", "من روايه", { pre: W, opens: true, lafaz: { skip: 0 } }),
  ...COLLECTORS.flatMap((c) => [
    // "عند البخاري/مسلم" = riwayat al-Bukhari/Muslim (sama dengan "رواه مسلم", "ولمسلم").
    p(c === "البخاري" ? "bukhari" : c === "مسلم" ? "muslim" : "source", `عند ${c}`, {
      pre: W,
      opens: true,
    }),
    p("source", `ل${c.startsWith("ال") ? c.slice(1) : c}`, { pre: ["و", "ف"], opens: true }),
  ]),
  p("source", "ولهما", { pre: [""], opens: true }),
  // ── Penanda lafaz yang dikutip (bukan sumber, bukan istilah) ──
  ...["بلفظ", "بلفظه", "ولفظه", "لفظه", "ولفظهما", "بنحوه"].map((w) =>
    p("lafaz", w, { pre: [""], lafaz: { skip: 0 } }),
  ),
  // "وفي رواية لمسلم/له …": kata sesudahnya penghimpun, lalu lafaz.
  ...["في روايه", "وفي روايه"].map((w) => p("lafaz", w, { pre: [""], lafaz: { skip: 1 } })),
  // "ولفظ مسلم …", "واللفظ له …": kata sesudahnya nama penghimpun, lalu lafaz.
  ...["ولفظ", "واللفظ"].map((w) => p("lafaz", w, { pre: [""], lafaz: { skip: 1 } })),
  // ── al-Bukhari dan Muslim ──
  // "وأصله في الصحيحين/متفق عليه" = hanya asalnya; "ليس في الصحيحين" = negasi.
  ...["متفق عليه", "اخرجاه", "خرجاه", "اتفقا عليه", "في الصحيحين"].map((w) =>
    p("muttafaq", w, { opens: true, notPrev: ["اصله", "واصله", ...NEGATION] }),
  ),
  p("muttafaq", "الشيخان", { pre: W }),
  p("muttafaq", "للشيخين", { pre: W, opens: true }),
  p("muttafaq", "عند الشيخين", { pre: W, opens: true }),
  p("bukhari", "البخاري", {
    pre: [""],
    notPrev: NOT_SOURCE_BEFORE,
    ok: (t, i, len) => afterSourceVerb(t, i, len) && notOtherBukhariBook(t, i, len),
  }),
  p("bukhari", "البخاري", { pre: ["و", "ف"], notPrev: NOT_SOURCE_BEFORE, ok: notOtherBukhariBook }),
  p("bukhari", "للبخاري", { pre: W }),
  // "قال البخاري في صحيحه" = penyebutan di Sahih (biasanya mu'allaq), bukan penilaian olehnya.
  p("bukhari", "قال البخاري في صحيحه", { pre: W }),
  // "مسلم" tanpa proklitik hanya sesudah kata kerja sumber: "رجل مسلم", "كل مسلم" = lafaz.
  p("muslim", "مسلم", { pre: [""], notNext: ["بن"], ok: afterSourceVerb, ambiguous: true }),
  p("muslim", "مسلم", { pre: ["و", "ف", "ول", "فل"], notPrev: NOT_SOURCE_BEFORE, notNext: ["بن"] }),
  p("muslim", "لمسلم", {
    pre: [""],
    ok: (t, i) =>
      ["روايه", "واللفظ", "اللفظ", "لفظ", "وهو", "وهي", "الحديث", "والحديث"].includes(
        tokenAt(t, i - 1) ?? "",
      ),
    ambiguous: true,
  }),
  // ── Penilaian ──
  p("hasan_sahih", "حسن صحيح", { notPrev: NAME_BEFORE }),
  // Kata kerja ("وصححه الترمذي") boleh diikuti nama; kata sifat "صحيح" tidak ("صحيح مسلم").
  p("sahih", "صحيح", {
    pre: W,
    notPrev: ["في", ...NEGATION, ...NAME_BEFORE],
    notNext: BOOK_OR_NAME,
    adjective: true,
    ambiguous: true,
  }),
  ...["صححه", "صححاه", "صححهما", "تصحيحه"].map((w) =>
    p("sahih", w, { pre: W, notPrev: ["في", ...NEGATION] }),
  ),
  // "إسناده/سنده + penilaian" juga membuka takhrij (catatan kaki lanjutan: "(٧) وإسناده ضعيف").
  ...["اسناده صحيح", "سنده صحيح", "اسنادهما صحيح", "صحيح الاسناد", "صحح اسناده"].map((w) =>
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
  // "بإسناد/بسند (آخر) + penilaian": khas takhrij, boleh membuka takhrij tanpa kata kerja.
  ...ISNAD.flatMap((s) =>
    [s, `${s} اخر`].flatMap((h) => [
      p("sahih", `${h} صحيح`, { pre: ["ب", "وب"], opens: true }),
      p("sahih", `${h} صحيحين`, { pre: ["ب", "وب"], opens: true }),
      p("hasan", `${h} حسن`, { pre: ["ب", "وب"], opens: true }),
      p("jayyid", `${h} جيد`, { pre: ["ب", "وب"], opens: true }),
      p("la_bas", `${h} لا باس به`, { pre: ["ب", "وب"], opens: true }),
      p("daif", `${h} ضعيف`, { pre: ["ب", "وب"], opens: true }),
      p("daif", `${h} ضعيفين`, { pre: ["ب", "وب"], opens: true }),
      p("daif", `${h} فيه ضعف`, { pre: ["ب", "وب"], opens: true }),
      p("sangat_lemah", `${h} ضعيف جدا`, { pre: ["ب", "وب"], opens: true }),
    ]),
  ),
  ...["اسناده جيد", "سنده جيد", "جيد الاسناد"].map((w) =>
    p("jayyid", w, { pre: W, opens: w !== "جيد الاسناد" }),
  ),
  ...["اسناده لا باس به", "لا باس باسناده", "ليس باسناده باس"].map((w) => p("la_bas", w, { pre: W })),
  // "لا بأس به" juga lafaz ("ليس بحرام ولا بأس به") dan ucapan yang dikutip: hanya sesudah "قال فلان".
  ...["لا باس به", "ليس به باس"].map((w) =>
    p("la_bas", w, { pre: W, ok: saidBySomeone, ambiguous: true }),
  ),
  p("hasan", "حسن", {
    pre: W,
    notPrev: [...NAME_BEFORE, ...NEGATION],
    notNext: BOOK_OR_NAME,
    adjective: true,
    ambiguous: true,
  }),
  // "حسنه" juga bentuk normal "حسنة" ("سنة حسنة" di lafaz): hanya "وحسنه/فحسنه".
  p("hasan", "حسنه", { pre: ["و", "ف"], notPrev: NEGATION }),
  ...["حسناه", "تحسينه"].map((w) => p("hasan", w, { pre: W, notPrev: NEGATION })),
  ...["اسناده حسن", "سنده حسن", "اسنادهما حسن"].map((w) => p("hasan", w, { pre: WB, opens: true })),
  p("gharib", "غريب", {
    pre: W,
    notPrev: [...NEGATION, ...NAME_BEFORE],
    adjective: true,
    ambiguous: true,
  }),
  // "غريب بهذا اللفظ/السياق": membuka takhrij (غريب sendirian bisa lafaz hadits: "كأنك غريب").
  p("gharib", "غريب بهذا", { pre: W, opens: true }),
  p("gharib", "حديث غريب", { pre: W, opens: true }),
  // "وقال حديث حسن/صحيح/موضوع": penilaian, juga sesudah lafaz yang dikutip.
  p("hasan", "حديث حسن", { pre: W, notNext: BOOK_OR_NAME }),
  p("hasan_sahih", "حديث حسن صحيح", { pre: W }),
  p("sahih", "حديث صحيح", { pre: W, notNext: BOOK_OR_NAME }),
  ...["حديث موضوع", "حديث باطل"].map((w) => p("palsu", w, { pre: W })),
  ...["استغربه", "استغرباه"].map((w) => p("gharib", w, { pre: W })),
  // Rumusan gharib at-Tirmidzi: "لا نعرفه إلا من هذا الوجه/من حديث فلان".
  p("gharib", "لا نعرفه الا من", { pre: W }),
  ...[
    "ضعيف",
    "ضعيفه",
    "ضعيفان",
    "ضعيفين",
    "ضعاف",
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
    "منقطعه",
    "انقطاع",
    "انقطاعه",
    "انقطاعا",
    "معلول",
  ].map((w) => p("daif", w, { pre: WB, notPrev: NEGATION })),
  // "وضعفه فلان" = melemahkannya; "ضعفه"/"بضعفه" tanpa و/ف juga "kelemahannya" (lafaz).
  p("daif", "ضعفه", { pre: ["و", "ف"], notPrev: NEGATION }),
  p("daif", "ضعفه", { pre: [""], notPrev: NEGATION, ok: nextIsCritic }),
  p("daif", "ضعفه", { pre: ["", "ب", "وب", "فب"], notPrev: NEGATION, ambiguous: true }),
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
    "ليس اسناده بمتصل",
    "ليس اسناده بالمتصل",
    "ليس بمتصل",
    "غير متصل",
    "غير محفوظ",
    "ليس بمحفوظ",
    "فيه لين",
    "لين الحديث",
    "تكلم فيه",
    "متكلم فيه",
    "يتكلمون فيه",
    "تكلموا فيه",
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
    "اضطراب",
    "مضطرب",
    // Perawi yang tidak dikenal: "فيه من لا أعرفه" = lemah, bukan "tidak ditemukan".
    "من لا اعرفه",
    "من لم اعرفه",
    "من لا يعرف",
    "من يجهل",
    "من لم يسم",
  ].map((w) => p("daif", w, { pre: W })),
  // "وجهله فلان" = menyatakannya majhul; "جهله" tanpa و juga "kebodohannya" (lafaz).
  p("daif", "جهله", { pre: ["و"] }),
  p("daif", "جهله", { pre: [""], ok: nextIsCritic }),
  ...["لا يصح", "لم يصح", "لا يثبت", "لم يثبت"].map((w) => p("daif", w, { pre: W })),
  ...["لا يصح منها شيء", "لا يصح فيه شيء", "لا يصح منه شيء"].map((w) => p("daif", w, { pre: W })),
  ...["في الضعفاء", "كتاب الضعفاء"].map((w) => p("duafa", w, { pre: W })),
  // "لا يعرف إلا …" = hanya dikenal lewat …, bukan "tidak dikenal".
  p("daif", "لا يعرف", { pre: W, notNext: ["الا"] }),
  ...[
    "ضعيف جدا",
    "شديد الضعف",
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
    "يروي الموضوعات",
    "نسب الي الوضع",
    "متهم بالوضع",
  ].map((w) => p("sangat_lemah", w, { pre: WB, notPrev: NEGATION, notNext: ["ونكير"] })),
  p("sangat_lemah", "ليس بشيء", { pre: W, ambiguous: true }),
  // "وكذبه فلان" = mendustakan perawi; tanpa و juga "dustanya" (lafaz).
  p("sangat_lemah", "كذبه", { pre: ["و"] }),
  p("sangat_lemah", "كذبه", { pre: [""], ok: nextIsCritic }),
  // "الموضوعات" = kitab al-Maudhu'at; "يروي الموضوعات" = sifat perawi (di atas).
  p("palsu", "الموضوعات", { pre: WB, notPrev: [...NEGATION, "يروي"] }),
  // Kata tunggal juga lafaz: "وثيابه موضوعة على المشجب" = diletakkan (bagian lafaz dilewati).
  ...["موضوع", "موضوعه", "موضوعا", "مكذوب", "مختلق", "باطل", "باطله"].map((w) =>
    p("palsu", w, { pre: WB, notPrev: NEGATION, ambiguous: true }),
  ),
  ...[
    "لا اصل له",
    "ليس له اصل",
    "لم اجد له اصلا",
    "لا اعرف له اصلا",
    "لم ار له اصلا",
    "لم اقف له علي اصل",
    "لم اجد له علي اصل",
    // "لم أقف لأوله على أصل": tidak ada asal untuk bagian awalnya.
    "لم اقف * علي اصل",
  ].map((w) => p("la_asl", w, { pre: W, opens: true })),
  // "لم أجد له أصلا في الموصولات": tidak ditemukan yang bersambung, bukan tidak ada asal sama sekali.
  p("lam_ajid", "لم اجد له اصلا في", { pre: W, opens: true }),
  p("lam_ajid_marfu", "لم اجد له اصلا في حديث مرفوع", { pre: W, opens: true }),
  ...[
    "لم اره مرفوعا",
    "لم اجده مرفوعا",
    "لم اقف عليه مرفوعا",
    "لم اجد له اصلا مرفوعا",
    "لم اقف له علي اصل مرفوعا",
  ].map((w) => p("lam_ajid_marfu", w, { pre: W, opens: true })),
  // Varian yang lebih panjang supaya frasa yang ditampilkan memuat keterangannya.
  ...[
    "لم اظفر له باسناد",
    "لم اجد له اسنادا",
    "لم اجده هكذا",
    "لم اجده بهذا اللفظ",
    "لم اجده بهذا السياق",
    "لم اجده الا بلاغا",
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
  ...["تعليقا", "معلقا", "علقه", "صوره التعليق", "بغير اسناد", "بلا اسناد", "بدون اسناد"].map((w) =>
    p("muallaq", w, { pre: WB, opens: true }),
  ),
  ...["دون قوله", "دون ذكر", "دون الزياده", "دون هذه", "بدون قوله", "بدون ذكر"].map((w) =>
    p("sebagian", w, { pre: W }),
  ),
  // "رواه مسلم دون آخره/دون الاستثناء": "دون" sesudah sumber; "من دون الله" = lafaz.
  p("sebagian", "دون", {
    pre: [""],
    ok: (t, i) => AFTER_SOURCE.has(tokenAt(t, i - 1) ?? ""),
    notNext: ["الله", "ذلك", "ما", "غيره"],
    ambiguous: true,
  }),
  // "وليس فيه/في الحديثين/عنده قوله …" = tambahan itu tidak ada di sumber yang disebut.
  ...["فيه", "فيها", "عنده", "عندهما", "في *"].flatMap((where) =>
    ["قوله", "ذكر"].map((what) => p("sebagian", `ليس ${where} ${what}`, { pre: W })),
  ),
  // "ما تقدم من ذنبه" = lafaz hadits yang sangat lazim, bukan rujukan.
  // Tanpa ف: "فتقدم" lazim sebagai kata kerja di lafaz ("lalu ia maju").
  ...["تقدم", "تقدما", "تقدمت", "المتقدم", "المتقدمه"].map((w) =>
    p("rujukan", w, {
      pre: ["", "و"],
      opens: true,
      // "طريقه المتقدمة أحسن" = sifat jalur, bukan rujukan.
      notPrev: ["ما", "وما", "طريقه", "الطريق", "طريق"],
      notNext: ["من"],
    }),
  ),
  // "قد تقدم", "تقدم من حديث …" (rujukan ke takhrij hadits lain), "فتقدم أيضا".
  ...["قد تقدم", "تقدم من حديث", "تقدم ايضا", "تقدم في"].map((w) =>
    p("rujukan", w, { pre: W, opens: true, notPrev: ["ما", "وما"] }),
  ),
  // Rujukan ke depan hanya "سيأتي/يأتي في …" ("سيأتي على الناس زمان" = lafaz).
  ...[
    "سياتي في",
    "سياتي ذكره",
    "كما سياتي",
    "ياتي في الباب",
    "ياتي في الذي",
    "ياتي بعده",
    "ياتي في كتاب",
    "سياتي بعده",
  ].map((w) => p("rujukan", w, { pre: ["", "و"], opens: true })),
  // ── Perawi/sanad tepercaya dan yang diperselisihkan (bukan penilaian hadits) ──
  ...[
    "رجاله ثقات",
    "رجاله رجال الصحيح",
    "رجاله موثقون",
    "رجال اسناده ثقات",
    "رواته ثقات",
    "اسناده ثقات",
    "مستقيم الاسناد",
    "وهو ثقه",
  ].map((w) => p("tsiqat", w, { pre: W })),
  // "ووثقه فلان" = menilainya tepercaya (normal "وثقه" juga "dan tepercaya").
  p("tsiqat", "وثقه", { pre: ["", "و"] }),
  // "مع اختلاف (لفظ)" = perbedaan lafaz, bukan perselisihan perawi.
  ...["مختلف فيه", "مختلف في الاحتجاج به", "اختلف في اسناده", "اختلف في رفعه", "اختلف في وصله"].map(
    (w) => p("mukhtalaf", w, { pre: W }),
  ),
  // "اهدني لما اختلف فيه من الحق" = lafaz doa.
  p("mukhtalaf", "اختلف فيه", { pre: W, notPrev: ["لما", "ما", "فيما"], ambiguous: true }),
  // ── Bantahan penakhrij atas penilaian yang dinukil (`resolveRefutations`) ──
  ...["ليس كذلك", "ليس كما قال", "قلت بل", "لم يصب"].map((w) =>
    p("refute", w, { pre: W, refutes: true }),
  ),
  // "قال الحاكم صحيح الإسناد قلت فيه فلان … يروي الموضوعات": "قلت" sesudah penilaian positif dan
  // sebelum penilaian lemah = bantahan penakhrij.
  p("refute", "قلت", { pre: W, refutes: true }),
  // Tanpa penilaian di dekatnya, ini penilaian lemah tersendiri.
  ...["فيه نظر", "ليس بجيد", "ليس بصحيح"].map((w) => p("daif", w, { pre: W, refutes: true })),
];

/** Bukan istilah: penanda sumber, lafaz, dan bantahan. */
const NON_TERMS: ReadonlySet<PatternKind> = new Set(["source", "lafaz", "refute"]);

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
function matchAt(tokens: readonly Token[], i: number, end: number, pat: Pattern): number {
  if (i + pat.words.length > end) return 0;
  for (let k = 1; k < pat.words.length; k++)
    if (pat.words[k] !== "*" && tokens[i + k]!.text !== pat.words[k]) return 0;
  const len = pat.words.length;
  const next = i + len < end ? tokens[i + len]!.text : undefined;
  if (next !== undefined && pat.notNext?.includes(next)) return 0;
  const prev = tokens[i - 1]?.text;
  if (prev !== undefined && pat.notPrev?.includes(prev)) return 0;
  if (pat.adjective && next !== undefined && next.startsWith("ال") && next !== "الاسناد") return 0;
  if (pat.ok !== undefined && !pat.ok(tokens, i, len)) return 0;
  return len;
}

/** Jenis yang bisa dibantah: penilaian, bukan keterangan sumber/lafaz/rujukan. */
const REFUTABLE: ReadonlySet<PatternKind> = new Set([
  "sahih",
  "hasan",
  "hasan_sahih",
  "jayyid",
  "la_bas",
  "gharib",
  "daif",
  "sangat_lemah",
  "palsu",
  "tsiqat",
]);
/**
 * Penilaian yang bisa dibantah sebagai "terlalu baik" ("وصححه فلان وليس بجيد", "رجاله ثقات قلت فيه
 * …"). Termasuk `tsiqat`, walaupun di label (core) `tsiqat` bukan penilaian positif hadits.
 */
const FAVORABLE_KINDS: ReadonlySet<PatternKind> = new Set([
  "sahih",
  "hasan",
  "hasan_sahih",
  "jayyid",
  "la_bas",
  "tsiqat",
]);
const NEGATIVE_KINDS: ReadonlySet<PatternKind> = new Set(["daif", "sangat_lemah", "palsu"]);
/** Kata kerja penilaian yang menyebut penilainya ("وضعفه المنذري"): penilaian orang lain. */
const ATTRIBUTED_VERBS = new Set(["ضعفه", "ضعفوه", "اعله", "جهله", "كذبه", "صححه", "حسنه"]);
/** Jarak kata maksimum antara penilaian dan bantahannya ("وصححه القرطبي في التذكرة وليس كذلك"). */
const REFUTE_GAP = 4;

interface Found {
  kind: PatternKind;
  i: number;
  len: number;
  opens: boolean;
  refutes: boolean;
}

/** Frasa terpanjang yang cocok di token `i` (`ambiguous`: hanya pola yang juga lazim di lafaz). */
function bestAt(
  tokens: readonly Token[],
  i: number,
  to: number,
  ambiguous: boolean,
): { pat: Pattern; len: number; opens: boolean } | null {
  let best: { pat: Pattern; len: number; opens: boolean } | null = null;
  if (i >= to) return null;
  for (const pat of BY_HEAD.get(tokens[i]!.text) ?? []) {
    if ((pat.ambiguous === true) !== ambiguous) continue;
    const len = matchAt(tokens, i, to, pat);
    if (len === 0 || (best !== null && len < best.len)) continue;
    const opens = pat.opens === true;
    if (best === null || len > best.len) best = { pat, len, opens };
    else {
      // Panjang sama: istilah penilaian/kitab menang atas penanda sumber ("وللبخاري"), dan
      // frasa tetap membuka takhrij bila salah satu polanya membuka.
      if (NON_TERMS.has(best.pat.kind) && !NON_TERMS.has(pat.kind)) best.pat = pat;
      best.opens ||= opens;
    }
  }
  return best;
}

/** Semua kecocokan dalam token [from, to), dengan bagian lafaz yang dikutip. */
function scan(tokens: readonly Token[], from: number, to: number): Found[] {
  const found: Found[] = [];
  /** Di dalam lafaz yang dikutip: pola `ambiguous` diabaikan. Mulai di `lafazFrom`. */
  let lafazFrom = Infinity;
  const strongAt = (j: number) => bestAt(tokens, j, to, false);
  const judgmentAt = (j: number) =>
    [strongAt(j), bestAt(tokens, j, to, true)].some(
      (b) => b !== null && !NON_TERMS.has(b.pat.kind),
    );
  /** Sesudah kata ambigu langsung ada pernyataan penakhrij lagi ("… ولا يصح وللنسائي …"). */
  const takhrijResumes = (j: number) =>
    j >= to ||
    LAFAZ_END.has(tokens[j]!.text) ||
    strongAt(j) !== null ||
    (tokens[j]!.text.startsWith("و") && CRITICS.has(tokens[j]!.text.slice(1)));
  for (let i = from; i < to; i++) {
    const tok = tokens[i]!.text;
    const inLafaz = i >= lafazFrom;
    let best = strongAt(i);
    const weak = best === null ? bestAt(tokens, i, to, true) : null;
    if (weak !== null) {
      if (!inLafaz || takhrijResumes(i + weak.len)) best = weak;
      else {
        i += weak.len - 1;
        continue;
      }
    }
    if (best !== null) {
      found.push({
        kind: best.pat.kind,
        i,
        len: best.len,
        opens: best.opens,
        refutes: best.pat.refutes === true,
      });
      // Kata di jendela `skip` ("وفي رواية لمسلم …": nama penghimpun) tidak membatalkan lafaz
      // yang dimulai sesudahnya.
      if (best.pat.lafaz) lafazFrom = i + best.len + best.pat.lafaz.skip;
      else if (i >= lafazFrom) lafazFrom = Infinity;
      i += best.len - 1;
      continue;
    }
    if (!inLafaz) continue;
    // Pernyataan penakhrij dimulai lagi: "… الحديث", "قلت", "وإسناده …", "وقال …", "قال
    // الترمذي …", "وهو موضوع".
    const next = tokens[i + 1]?.text ?? "";
    if (
      LAFAZ_END.has(tok) ||
      tok === "وقال" ||
      (tok === "قال" && (CRITICS.has(next) || judgmentAt(i + 1))) ||
      (["وهو", "وهي", "هو", "وهذا"].includes(tok) && judgmentAt(i + 1))
    )
      lafazFrom = Infinity;
  }
  return resolveRefutations(tokens, found);
}

/**
 * "وصححه فلان وليس كذلك", "قال صحيح الإسناد قلت بل منقطع", "وقال إنه معضل وفيه نظر": penilaian
 * yang dinukil lalu dibantah penakhrij menjadi satu istilah `dibantah` (penilaian + bantahan), bukan
 * istilah penilaiannya. Bantahan tanpa penilaian di dekatnya dibuang.
 */
/** Penilaian `f` dinukil dari orang lain: kata kerja penilaian, atau "قال" ≤ 3 kata sebelumnya. */
function attributed(tokens: readonly Token[], f: Found): boolean {
  const head = tokens[f.i]!.text.replace(/^[وف]/, "");
  if (ATTRIBUTED_VERBS.has(head)) return true;
  for (let k = f.i - 1; k >= Math.max(0, f.i - 3); k--)
    if (["قال", "وقال"].includes(tokens[k]!.text)) return true;
  return false;
}

function resolveRefutations(tokens: readonly Token[], found: Found[]): Found[] {
  const out: Found[] = [];
  for (const [n, f] of found.entries()) {
    if (!f.refutes) {
      out.push(f);
      continue;
    }
    const prev = out.at(-1);
    const near =
      prev !== undefined && REFUTABLE.has(prev.kind) && f.i - (prev.i + prev.len) <= REFUTE_GAP;
    // "قلت" saja hanya membantah penilaian baik yang langsung disusul penilaian lemah. "فيه نظر",
    // "ليس بجيد/بصحيح" membantah penilaian baik, atau penilaian lemah yang dinukil dari orang lain
    // ("وضعفه المنذري وليس بجيد", "وقال إنه معضل وفيه نظر"); sesudah penilaian lemah penakhrij
    // sendiri ("منكر وليس بصحيح") itu penguatan, jadi keduanya tetap istilah lemah.
    const bare = f.kind === "refute" && f.len === 1 && tokens[f.i]!.text.endsWith("قلت");
    const favorable = prev !== undefined && FAVORABLE_KINDS.has(prev.kind);
    const refutes =
      near &&
      (bare
        ? favorable && NEGATIVE_KINDS.has(found[n + 1]?.kind ?? "source")
        : f.kind === "refute" || favorable || attributed(tokens, prev));
    if (refutes) out[out.length - 1] = { ...prev, kind: "dibantah", len: f.i + f.len - prev.i };
    else if (f.kind !== "refute") out.push(f);
  }
  return out;
}

/**
 * Tanpa penanda takhrij, penilaian di akhir catatan kaki "حديث …" ("حديث النهي عن … غريب", "…
 * وقال حسن غريب") tetap takhrij: penilaian al-'Iraqi yang berdiri sendiri. Juga catatan kaki yang
 * isinya hanya penilaian ("(٢) ضعيف"). Matan yang tercetak sebagai catatan kaki ("وعن فلان … قال
 * خلق حسن") tidak.
 */
function closingJudgment(
  tokens: readonly Token[],
  from: number,
  to: number,
  found: readonly Found[],
): Found | undefined {
  let k = found.length - 1;
  const judgment = (f: Found | undefined) =>
    f !== undefined && !NON_TERMS.has(f.kind) && f.kind !== "rujukan" && f.kind !== "sebagian";
  if (!judgment(found[k]) || found[k]!.i + found[k]!.len !== to) return undefined;
  while (k > 0 && judgment(found[k - 1]) && found[k - 1]!.i + found[k - 1]!.len === found[k]!.i)
    k--;
  const head = found[k]!;
  return tokens[from]?.text === "حديث" || head.i === from ? head : undefined;
}

const MARKER = /\(\s*[0-9٠-٩]+\s*\)/g;

/** Batas segmen mentah: awal teks + setiap penanda "(N)" internal yang diikuti "حديث". */
function segmentStarts(raw: string): number[] {
  const starts = [0];
  for (const m of raw.matchAll(MARKER)) {
    if (m.index === 0 || raw.slice(0, m.index).trim() === "") continue;
    // Jendela mentah cukup lebar untuk "حديث" berharakat/bertatweel.
    const after = normalizeArabic(raw.slice(m.index + m[0].length, m.index + m[0].length + 40));
    if (after.text.trim().startsWith("حديث")) starts.push(m.index);
  }
  return starts;
}

/**
 * Istilah takhrij di teks catatan kaki (mentah, dari DB): sumber, istilah penilaian, dan rujukan,
 * masing-masing dengan rentang mentahnya. Lihat komentar modul untuk batasnya.
 */
export function takhrijTerms(raw: string): TakhrijTerms {
  const n = normalizeArabic(raw);
  const tokens = tokensOf(n.text);
  const rawStartOf = (t: Token) => n.map[t.start]!;
  const rawSpan = (f: { i: number; len: number }) =>
    toRawSpan(raw, n, tokens[f.i]!.start, tokens[f.i + f.len - 1]!.end);
  const starts = segmentStarts(raw);
  const segments: TakhrijTerms["segments"] = [];
  const terms: TakhrijTerm[] = [];
  let first: { kind: TakhrijTerms["kind"]; takhrijStart: number } | null = null;
  let tok = 0;
  for (const [s, rawStart] of starts.entries()) {
    const rawEnd = starts[s + 1] ?? raw.length;
    const from = tok;
    while (tok < tokens.length && rawStartOf(tokens[tok]!) < rawEnd) tok++;
    const found = scan(tokens, from, tok);
    // Pembuka: penanda takhrij pertama. Tanpa penanda, istilah penilaian di akhir catatan kaki
    // ("… غريب") tetap takhrij (penilaian al-'Iraqi yang berdiri sendiri).
    let opener = found.find((f) => f.opens);
    if (opener === undefined) opener = closingJudgment(tokens, from, tok, found);
    let kind: TakhrijTerms["kind"] = "takhrij";
    if (from < tokens.length && tokens[from]!.text === "قوله") kind = "editor_note";
    else if (opener === undefined)
      kind = tokens.slice(from, tok).some((t) => t.text === "مصححه")
        ? "editor_note"
        : "unrecognized";
    const inTakhrij = kind === "takhrij" ? found.filter((f) => f.i >= opener!.i) : [];
    for (const f of inTakhrij) {
      if (NON_TERMS.has(f.kind)) continue;
      const [start, end] = rawSpan(f);
      terms.push({ kind: f.kind as TakhrijTermKind, start, end, segment: s });
    }
    const sources = inTakhrij.some((f) =>
      ["source", "muttafaq", "bukhari", "muslim"].includes(f.kind),
    );
    segments.push({ start: rawStart, end: rawEnd, takhrij: kind === "takhrij", sources });
    first ??= { kind, takhrijStart: opener === undefined ? 0 : rawSpan(opener)[0] };
  }
  const head = first ?? { kind: "unrecognized" as const, takhrijStart: 0 };
  return {
    kind: head.kind,
    takhrijStart: head.kind === "takhrij" ? head.takhrijStart : 0,
    sources: segments[0]?.sources ?? false,
    terms,
    segments,
  };
}
