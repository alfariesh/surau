// Normalisasi lisan teks Indonesia untuk suara AI (Dengarkan, X17, ADR-097 butir 6). Deterministik dan
// berversi: teks yang dibacakan mesin = `spokenIndonesian(teks Intisari)`, jadi perubahan aturan di
// sini mengubah skrip audio (sha skrip berubah, audio lama gugur saat ingest). Naikkan `SPOKEN_VERSION`
// setiap kali keluaran untuk masukan yang sama berubah.
//
// Yang diubah hanya bentuk tulis yang dibaca salah oleh mesin: angka, tahun Hijriah/Masehi, letak
// cetak ("j. 3, h. 204"), gelar kehormatan yang disingkat ("saw.", "ra."), rujukan ayat ("QS 2:255",
// hanya disebut), singkatan umum, serta `[ ]` dan `/` yang punya arti khusus bagi suara AI. Huruf Arab TIDAK disentuh atau dibuang di sini: teks yang masih
// berhuruf Arab ditolak penyusun skrip (teks-arab.md aturan 11), bukan diam-diam dibersihkan.

/** Versi aturan normalisasi lisan (disimpan bersama skrip audio). */
export const SPOKEN_VERSION = 1;

const ONES = [
  "nol",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
] as const;

const SCALES: readonly (readonly [number, string])[] = [
  [1e12, "triliun"],
  [1e9, "miliar"],
  [1e6, "juta"],
  [1e3, "ribu"],
];

/** 1–99 dalam kata. */
function below100(n: number): string {
  if (n < 10) return ONES[n] as string;
  if (n === 10) return "sepuluh";
  if (n === 11) return "sebelas";
  if (n < 20) return `${ONES[n - 10]} belas`;
  const ones = n % 10;
  return `${ONES[Math.floor(n / 10)]} puluh${ones === 0 ? "" : ` ${ONES[ones]}`}`;
}

/** 1–999 dalam kata. */
function below1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds === 1) parts.push("seratus");
  else if (hundreds > 1) parts.push(`${ONES[hundreds]} ratus`);
  if (rest > 0) parts.push(below100(rest));
  return parts.join(" ");
}

/** Bilangan bulat 0 sampai di bawah 1.000 triliun dalam kata ("seribu seratus sebelas"). */
export function numberWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 1e15) {
    throw new RangeError(`bilangan di luar jangkauan: ${n}`);
  }
  if (n === 0) return "nol";
  const parts: string[] = [];
  let rest = n;
  for (const [scale, name] of SCALES) {
    const q = Math.floor(rest / scale);
    if (q === 0) continue;
    parts.push(scale === 1e3 && q === 1 ? "seribu" : `${below1000(q)} ${name}`);
    rest %= scale;
  }
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(" ");
}

/** Bilangan tingkat: 1 → "pertama", 2 → "kedua", 40 → "keempat puluh". */
export function ordinalWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError(`bilangan tingkat tidak sah: ${n}`);
  return n === 1 ? "pertama" : `ke${numberWords(n)}`;
}

/** Angka tertulis ("505", "1.200") menjadi kata; titik = pemisah ribuan (ejaan Indonesia). */
const digitsWords = (digits: string): string => {
  const plain = digits.replaceAll(".", "");
  const n = Number(plain);
  // Di luar jangkauan kata (≥ 1.000 triliun): dibaca per digit, bukan galat.
  return Number.isSafeInteger(n) && n < 1e15
    ? numberWords(n)
    : plain
        .split("")
        .map((d) => ONES[Number(d)])
        .join(" ");
};

/** Bilangan tingkat dari angka tertulis; "ke-0" atau angka raksasa dibaca "ke" + angkanya. */
const ordinalOf = (digits: string): string => {
  const n = Number(digits);
  return Number.isSafeInteger(n) && n >= 1 && n < 1e15
    ? ordinalWords(n)
    : `ke ${digitsWords(digits)}`;
};

/** Angka di belakang koma dibaca per digit: "2,25" → "dua koma dua lima". */
const decimalWords = (whole: string, frac: string): string =>
  `${digitsWords(whole)} koma ${frac
    .split("")
    .map((c) => ONES[Number(c)])
    .join(" ")}`;

const era = (e: string): string => (e === "H" ? "Hijriah" : "Masehi");

/** Bentuk penuh gelar kehormatan yang disingkat (kunci = singkatan tanpa titik akhir). */
const HONORIFIC: Readonly<Record<string, string>> = {
  saw: "shallallahu 'alaihi wa sallam",
  "s.a.w": "shallallahu 'alaihi wa sallam",
  SAW: "shallallahu 'alaihi wa sallam",
  swt: "subhanahu wa ta'ala",
  "s.w.t": "subhanahu wa ta'ala",
  SWT: "subhanahu wa ta'ala",
  rah: "rahimahullah",
  ra: "radhiyallahu 'anhu",
  "r.a": "radhiyallahu 'anhu",
  as: "'alaihissalam",
  "a.s": "'alaihissalam",
};

/**
 * Bentuk penuh + titik kalimat bila singkatan itu juga mengakhiri kalimat ("… oleh Nabi saw."):
 * `space` = spasi sebelum huruf kapital berikutnya, `last` = "" bila singkatan ada di akhir teks.
 */
const honorific = (abbr: string, space?: string, last?: string): string =>
  `${HONORIFIC[abbr]}${space !== undefined ? `.${space}` : last !== undefined ? "." : ""}`;

/** Bukan huruf/angka/apostrof di kiri: singkatan berdiri sendiri, bukan potongan kata ("Umara."). */
const L = String.raw`(?<![\p{L}\p{N}'])`;
/** Bukan huruf/angka di kanan. */
const R = String.raw`(?![\p{L}\p{N}])`;
/**
 * Akhir kalimat sesudah singkatan bertitik: spasi + huruf kapital (grup 1), atau akhir teks (grup 2
 * kosong). Grup opsional yang cocok kosong ditolak regex JS, jadi alternatif kosong ditulis eksplisit.
 */
const END = String.raw`(?:(\s+)(?=\p{Lu})|(?=\s*$)()|)`;
/** Sesudah nama (kata berawal huruf kapital, boleh bertanda hubung: "ash-Shiddiq"). */
const AFTER_NAME = String.raw`(?<=\p{Lu}[\p{Ll}'-]*\s)`;
const NUM = String.raw`\d{1,3}(?:\.\d{3})+|\d+`;

type Rule = readonly [RegExp, (...groups: (string | undefined)[]) => string];

const rule = (source: string, replace: Rule[1]): Rule => [new RegExp(source, "gu"), replace];

/**
 * Aturan berurutan: yang lebih khusus lebih dulu (letak cetak dan tahun sebelum angka biasa). Setiap
 * aturan menerima grup tangkapannya; grup yang tidak ikut cocok = undefined.
 */
const RULES: readonly Rule[] = [
  // Gelar kehormatan. "ra."/"as." hanya sesudah nama, karena bentuk perempuan/jamak ditulis penuh
  // oleh pipeline Intisari (X15b) dan "as" bisa kata biasa.
  rule(`${L}(s\\.a\\.w|saw|s\\.w\\.t|swt|rah)\\.${END}`, (a, space, last) =>
    honorific(a as string, space, last),
  ),
  rule(`${L}(SAW|SWT)${R}`, (a) => honorific(a as string)),
  rule(`${AFTER_NAME}(r\\.a|ra|a\\.s|as)\\.${END}`, (a, space, last) =>
    honorific(a as string, space, last),
  ),
  // Wafat/lahir + tahun: "w. 505 H" → "wafat tahun lima ratus lima Hijriah".
  rule(`${L}w\\.\\s?(?=\\d)`, () => "wafat tahun "),
  rule(`${L}l\\.\\s?(?=\\d)`, () => "lahir tahun "),
  // Abad dan tahun: "abad ke-5 H", "505 H/1111 M", "450–505 H", "505 H", "1111 M".
  rule(`${L}ke-(\\d+)\\s?([HM])${R}`, (n, e) => `${ordinalOf(n as string)} ${era(e as string)}`),
  rule(
    String.raw`(\d+)\s?H\s?\/\s?(\d+)\s?M${R}`,
    (h, m) => `${digitsWords(h as string)} Hijriah atau ${digitsWords(m as string)} Masehi`,
  ),
  rule(
    String.raw`(\d+)\s?[–-]\s?(\d+)\s?([HM])${R}`,
    (a, b, e) =>
      `${digitsWords(a as string)} sampai ${digitsWords(b as string)} ${era(e as string)}`,
  ),
  rule(String.raw`(\d+)\s?([HM])${R}`, (y, e) => `${digitsWords(y as string)} ${era(e as string)}`),
  // Letak cetak: "j. 3, h. 204", "j.3 h.204", "jld. 3 hlm. 204", lalu bagian yang berdiri sendiri.
  rule(
    `${L}(?:j|jld|jil)\\.\\s?(${NUM}),?\\s(?:h|hlm|hal)\\.\\s?(${NUM})`,
    (j, h) => `jilid ${digitsWords(j as string)}, halaman ${digitsWords(h as string)}`,
  ),
  rule(`${L}(?:j|jld|jil)\\.\\s?(${NUM})`, (j) => `jilid ${digitsWords(j as string)}`),
  rule(`${L}(?:h|hlm|hal)\\.\\s?(${NUM})`, (h) => `halaman ${digitsWords(h as string)}`),
  // Rujukan ayat, hanya disebut: "QS 2:255" → "surah kedua ayat …", "QS al-Baqarah [2]: 255".
  rule(
    String.raw`${L}Q\.?S\.?\s?(\d+)\s?:\s?(\d+)(?:\s?[–-]\s?(\d+))?`,
    (s, a, b) =>
      `surah ${ordinalOf(s as string)} ayat ${digitsWords(a as string)}${
        b === undefined ? "" : ` sampai ${digitsWords(b)}`
      }`,
  ),
  rule(
    String.raw`${L}Q\.?S\.?\s([^\d:[\]/]{2,40}?)\s?(?:\[\d+\]|\/\s?\d+)?\s?:\s?(\d+)(?:\s?[–-]\s?(\d+))?`,
    (name, a, b) =>
      `surah ${(name as string).trim()} ayat ${digitsWords(a as string)}${
        b === undefined ? "" : ` sampai ${digitsWords(b)}`
      }`,
  ),
  rule(`${L}Q\\.?S\\.?(?=\\s)`, () => "surah"),
  rule(`${L}HR\\.?(?=\\s)`, () => "diriwayatkan oleh"),
  // Bilangan tingkat, persen, desimal, rentang, lalu angka biasa.
  rule(`${L}ke-(\\d+)${R}`, (n) => ordinalOf(n as string)),
  // Pecahan fikih ("zakat 1/40", "wasiat 1/3") dibaca "per", bukan "atau".
  rule(
    String.raw`(?<![\d.,/])(\d+)\s?\/\s?(\d+)(?![\d/])`,
    (a, b) => `${digitsWords(a as string)} per ${digitsWords(b as string)}`,
  ),
  rule(`(${NUM})(?:,(\\d+))?\\s?%`, (n, d) =>
    d === undefined
      ? `${digitsWords(n as string)} persen`
      : `${decimalWords(n as string, d)} persen`,
  ),
  rule(`(?<![\\d.,])(${NUM}),(\\d+)(?![\\d,])`, (n, d) => decimalWords(n as string, d as string)),
  rule(
    `(?<!\\d)(${NUM})\\s?[–-]\\s?(${NUM})(?!\\d)`,
    (a, b) => `${digitsWords(a as string)} sampai ${digitsWords(b as string)}`,
  ),
  rule(`(?<!\\d)(${NUM})(?!\\d)`, (n) => digitsWords(n as string)),
  // Singkatan umum dan simbol.
  rule(`${L}dll\\.`, () => "dan lain-lain"),
  rule(`${L}dsb\\.`, () => "dan sebagainya"),
  rule(`${L}dkk\\.`, () => "dan kawan-kawan"),
  rule(`${L}mis\\.`, () => "misalnya"),
  rule(`${L}tsb\\.`, () => "tersebut"),
  rule(String.raw`\s?&\s?`, () => " dan "),
  rule(String.raw`\s?±\s?`, () => " sekitar "),
  // Suara AI v4 membaca `[…]` sebagai tag audio dan `/…/` sebagai lafal IPA (docs ElevenLabs,
  // dicek 2026-10-24): kurung siku penerjemah menjadi kurung biasa, garis miring menjadi "atau".
  rule(String.raw`\[`, () => "("),
  rule(String.raw`\]`, () => ")"),
  rule(String.raw`(?<=\p{L})\s?\/\s?(?=\p{L})`, () => " atau "),
  rule(String.raw`\s?\/\s?`, () => " "),
];

/** Huruf Latin bertanda transliterasi (ḥ, ā, ṣ) → huruf dasar; ʿ ʾ ‘ ’ → apostrof; “ ” → ". */
function plainLatin(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[ʿʾ‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .normalize("NFC");
}

/**
 * Teks Indonesia siap dibacakan suara AI: transliterasi bertanda disederhanakan, angka dan tahun
 * menjadi kata, letak cetak dan gelar kehormatan ditulis penuh, simbol Markdown dibuang, spasi
 * dirapikan. Hasilnya tetap teks biasa (tanpa tag); jeda antarbagian diatur penyusun skrip.
 */
export function spokenIndonesian(text: string): string {
  let out = plainLatin(text).replace(/[*_#~|`]/gu, "");
  for (const [pattern, replace] of RULES) {
    out = out.replace(pattern, (...args: unknown[]) => {
      // args = [cocok, grup1, …, grupN, offset, teks]; offset = angka pertama sesudah grup.
      const end = args.findIndex((a, i) => i > 0 && typeof a === "number");
      return replace(...(args.slice(1, end) as (string | undefined)[]));
    });
  }
  return out
    .replace(/[ \t]+/gu, " ")
    .replace(/ ([,.;:!?])/gu, "$1")
    .trim();
}
