// Stem proklitik KONSERVATIF untuk kolom stem FTS (sbody/sfoot) dan sisi kueri. Hanya membuang
// konjungsi و/ف + preposisi ب/ك/ل bila menempel pada artikel ال; tidak menyentuh sufiks. Alasannya:
// riset 2026-10-15 menunjukkan stem agresif (Larkey light10) merusak kata dasar berawalan و/ف
// (فضيله → ضيله, وجوب → جوب), sedangkan proklitik tanpa artikel (وصبر, بصبر) cukup ditangani di
// sisi kueri lewat `expandQueryToken`. Masukan = token yang sudah dinormalisasi (`normalizeArabic`).

// Kata yang tidak boleh dipotong artikelnya (memotong ال dari الذي → ذي bertabrakan dengan kata
// lain), beserta bentuk berklitik lafaz Allah yang ejaannya tidak beraturan (لله = ل + الله).
const PROTECTED: ReadonlyMap<string, string> = new Map([
  ["الله", "الله"],
  ["لله", "الله"],
  ["والله", "الله"],
  ["بالله", "الله"],
  ["فالله", "الله"],
  ["تالله", "الله"],
  ["وبالله", "الله"],
  ["ولله", "الله"],
  ["فلله", "الله"],
  ["اللهم", "اللهم"],
  ["الذي", "الذي"],
  ["التي", "التي"],
  ["الذين", "الذين"],
  ["اللذين", "اللذين"],
  ["اللتين", "اللتين"],
  ["اللذان", "اللذان"],
  ["اللتان", "اللتان"],
  ["اللاتي", "اللاتي"],
  ["اللايي", "اللايي"], // اللائي setelah ئ → ي
  ["اللواتي", "اللواتي"],
]);

/** `true` bila token termasuk kata yang dilindungi dari stem (lafaz Allah, isim maushul). */
export function isProtectedToken(token: string): boolean {
  return PROTECTED.has(token);
}

const CONJ_BEFORE_ARTICLE = /^[وف](?:ال|لل|بال|كال)/;
const ARTICLE_PREFIXES = ["بال", "كال", "لل", "ال"] as const;

/** Bentuk dasar kata dilindungi yang diawali ب/ك/ل (بالذي → الذي, للذين → الذين). */
function protectedBase(t: string): string | undefined {
  const direct = PROTECTED.get(t);
  if (direct !== undefined) return direct;
  if (t.startsWith("بال") || t.startsWith("كال")) return PROTECTED.get(t.slice(1));
  if (t.startsWith("لل")) return PROTECTED.get(`ا${t.slice(1)}`);
  return undefined;
}

/**
 * Stem satu token ternormalisasi: والصبر/بالصبر/للصبر/فالصبر → صبر; وصبر tetap وصبر.
 * Sisa minimal 2 huruf (الا = إلا tidak dipotong menjadi ا). Identik di sisi indeks dan kueri.
 */
export function stemToken(token: string): string {
  const protectedForm = protectedBase(token);
  if (protectedForm !== undefined) return protectedForm;
  let t = token;
  if (CONJ_BEFORE_ARTICLE.test(t)) {
    t = t.slice(1);
    const afterConj = protectedBase(t);
    if (afterConj !== undefined) return afterConj;
  }
  for (const prefix of ARTICLE_PREFIXES) {
    if (t.startsWith(prefix) && t.length - prefix.length >= 2) return t.slice(prefix.length);
  }
  return t;
}

/** Stem setiap token teks ternormalisasi (dipisah spasi). Dipakai untuk kolom sbody/sfoot. */
export function stemText(normText: string): string {
  return normText
    .split(" ")
    .filter((t) => t !== "")
    .map(stemToken)
    .join(" ");
}

// Proklitik yang mungkin menempel pada kata TANPA artikel; urutan ini juga urutan keluaran.
const QUERY_PROCLITICS = ["", "و", "ف", "ب", "ك", "ل", "وب", "فب", "ول", "فل", "وك"] as const;

/**
 * Ekspansi sisi kueri untuk satu stem: صبر → صبر, وصبر, فصبر, بصبر, … (dicari di kolom stem).
 * Ini pasangan `stemToken`: indeks tidak membuang proklitik tanpa artikel, jadi kueri yang
 * menambahkannya. Stem < 3 huruf dan kata dilindungi tidak diekspansi (terlalu banyak hit acak).
 */
export function expandQueryToken(stem: string): string[] {
  if (PROTECTED.has(stem) || stem.length < 3) return [stem];
  return QUERY_PROCLITICS.map((p) => p + stem);
}

/** Daftar proklitik kueri (dipakai penyusun frasa FTS), diawali string kosong. */
export const queryProclitics: readonly string[] = QUERY_PROCLITICS;

// Kunyah ditulis bervariasi menurut i'rab: ابو (marfu'), ابي (majrur), ابا (manshub). Teks Ihya
// menulis أبي هريرة 812× sedangkan pengguna mengetik أبو هريرة, jadi ketiganya disamakan di kueri.
const KUNYA_FORMS = ["ابو", "ابي", "ابا"] as const;

/** Varian kunyah sebuah token: ابو → [ابو, ابي, ابا]; token lain → [token]. */
export function kunyaVariants(token: string): string[] {
  return (KUNYA_FORMS as readonly string[]).includes(token) ? [...KUNYA_FORMS] : [token];
}
