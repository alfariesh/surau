import { normalizeArabic } from "./normalize.ts";
import { queryProclitics } from "./stem.ts";

// Deteksi istilah kelemahan di teks takhrij (S21, docs/05 §4: hadits sangat lemah, palsu, atau "tidak
// ada asalnya" diberi tanda jelas setiap kali dikutip). Pencocokan kata kunci atas bentuk normal
// `normalizeArabic` (satu fungsi normalisasi, aturan teks-arab no. 3), BUKAN penilaian hadits:
// takhrij bisa menyebut satu jalur lemah lalu jalur lain yang sahih, atau "tidak menemukannya dengan
// lafaz ini". UI karena itu menyebutnya "memuat istilah kelemahan" dan mengarahkan ke teks takhrij.
// Kata kunci ditulis dalam bentuk normal (tanpa harakat, أ/إ/آ → ا, ة → ه, ى → ي).
// Batas yang diketahui (ihya-v7, 2026-10-21): 1.346 dari 4.398 catatan kaki bertanda; dari 522 yang
// menyebut "متفق عليه", 21 bertanda, kebanyakan takhrij campuran (satu jalur sahih, jalur lain
// lemah), sebagian kecil karena lafaz hadits itu sendiri memuat kata kunci (mis. "باطل" dalam syair
// Labid). Negasi "ليس ب…"/"غير …" tidak dihitung.

/** Kata tunggal (sesudah proklitik و/ف/ب dibuang; tanpa "ال" kecuali tertulis). */
const WEAK_WORDS: ReadonlySet<string> = new Set([
  // ضعيف dan turunannya (lemah)
  "ضعيف",
  "ضعيفه",
  "ضعيفان",
  "ضعيفين",
  "ضعاف",
  "ضعفه",
  "ضعفوه",
  "ضعفها",
  "ضعفاء",
  "الضعفاء",
  "تضعيف",
  "تضعيفه",
  "ضعيفا",
  // موضوع (palsu); "الموضوعات" = kitab hadits palsu (mis. Ibn al-Jawzi)
  "موضوع",
  "موضوعه",
  "موضوعا",
  "الموضوعات",
  "مكذوب",
  "مختلق",
  // باطل, منكر (tanpa "ال": "المنكر" = kemungkaran dalam matan), متروك, مجهول, منقطع
  "باطل",
  "باطله",
  "منكر",
  "منكره",
  "مناكير",
  "متروك",
  "متروكا",
  "المتروك",
  "مجهول",
  "مجهوله",
  "مجهولا",
  "جهاله",
  "منقطع",
  "منقطعا",
  "انقطاع",
  "انقطاعه",
  "ساقط",
  // perawi pendusta/pemalsu; "واه" = sangat lemah (kata utuh, bukan bagian dari "رواه")
  "كذاب",
  "كذبه",
  "وضاع",
  "الوضاع",
  "متهم",
  "واه",
  // ber-'illat (cacat tersembunyi)
  "اعله",
  "معلول",
]);

/** Frasa (beberapa kata, dicocokkan utuh per kata; kata pertama boleh berproklitik و/ف). */
const WEAK_PHRASES: readonly string[] = [
  "لا اصل له",
  "ليس له اصل",
  // "tidak menemukan(nya)": asal/sanad tidak ditemukan penakhrij (bisa juga "dengan lafaz ini")
  "لم اجد له اصلا",
  "لم اجده",
  "لم اجد",
  "لم اقف",
  "لم اظفر",
  "لم اره",
  "لم اعرفه",
  "لا اعرفه",
  "لا يصح",
  "لم يصح",
  "لا يثبت",
  "لم يثبت",
  "لا يعرف",
  "يضع الحديث",
  // "ضعف" sendirian juga berarti "lipat" ("سبعمائة ضعف") atau lemah fisik di lafaz hadits, jadi
  // hanya dalam bentuk khas takhrij: "فيه ضعف", "في إسناده ضعف", "وضعف إسناده", "ضعف ابن معين".
  "فيه ضعف",
  "اسناده ضعف",
  "اسنادهما ضعف",
  "سنده ضعف",
  "سندهما ضعف",
  "ضعف اسناده",
  "ضعف سنده",
  "ضعف رواته",
  "ضعف ابن معين",
  "ضعف البيهقي",
  "ضعف الترمذي",
  "ضعف الدارقطني",
  "ضعف النسايي",
  "ضعف احمد",
  // "sangat lemah", "bukan apa-apa", "tidak kuat", "ada kelemahan"
  "شديد الضعف",
  "ليس بشيء",
  "ليس بالقوي",
  "فيه لين",
  "لين الحديث",
];

/** Kata sebelumnya yang meniadakan: "ليس بكذاب" (bukan pendusta), "غير ضعيف". */
const NEGATIONS: ReadonlySet<string> = new Set(["ليس", "غير"]);

/** Kata utuh yang kebetulan berbentuk proklitik + kata kunci: فاعله ("pelakunya") ≠ ف + اعله. */
const NOT_WEAK: ReadonlySet<string> = new Set(["فاعله"]);

/** "منكر ونكير" = nama dua malaikat kubur, bukan penilaian "munkar". */
const isAngelName = (tokens: readonly string[], i: number) =>
  tokens[i] === "منكر" && tokens[i + 1] === "ونكير";

/** Kata kunci, langsung atau sesudah proklitik tanpa artikel (daftar yang sama dengan pencarian). */
function weakWord(token: string): boolean {
  if (NOT_WEAK.has(token)) return false;
  if (WEAK_WORDS.has(token)) return true;
  return queryProclitics.some(
    (p) =>
      p !== "" &&
      token.length > p.length + 2 &&
      token.startsWith(p) &&
      WEAK_WORDS.has(token.slice(p.length)),
  );
}

/**
 * Apakah teks takhrij (mentah, dari DB) memuat istilah kelemahan / "tidak ada asalnya" / "tidak
 * ditemukan"? Heuristik kata kunci untuk tanda peringatan, bukan status hadits.
 */
export function takhrijHasWeakTerms(raw: string): boolean {
  const text = normalizeArabic(raw).text;
  if (text === "") return false;
  const tokens = text.split(" ");
  const negated = (i: number) => {
    const prev = tokens[i - 1] ?? "";
    return NEGATIONS.has(prev) || (/^[وف]/u.test(prev) && NEGATIONS.has(prev.slice(1)));
  };
  if (tokens.some((t, i) => weakWord(t) && !negated(i) && !isAngelName(tokens, i))) return true;
  const padded = ` ${text} `;
  return WEAK_PHRASES.some((phrase) =>
    queryProclitics.some((p) => padded.includes(` ${p}${phrase} `)),
  );
}
