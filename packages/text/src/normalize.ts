// Normalisasi teks Arab untuk pencarian dan pencocokan (bukan untuk tampilan), dengan peta offset
// normal→mentah. Teks mentah di DB tidak pernah diubah; bentuk normal dihitung ulang dari
// `text_raw` + NORM_VERSION kapan pun dibutuhkan (ADR-009). Aturan lengkap:
// `.claude/rules/teks-arab.md` bagian *Normalisasi*. Prototipe: docs/riset/2026-10-15-pencarian-arab.

/**
 * Versi aturan normalisasi dan stem. Disimpan di `meta.norm_version` korpus.
 *
 * Naikkan angka ini bila keluaran `normalizeArabic` atau `stemToken` berubah untuk input apa pun,
 * karena indeks FTS dan kueri harus memakai aturan yang identik. Kenaikan = reindex penuh.
 * Aturan perubahannya ada di README paket.
 */
export const NORM_VERSION = 1;

export interface NormalizeOptions {
  /**
   * ؤ → و dan ئ → ي (default `true`). Ejaan kursi hamzah tidak konsisten antarcetakan
   * (مسئول/مسؤول, شيئا/شيءا), jadi untuk pencarian keduanya disamakan dengan huruf kursinya.
   * Hamzah lepas (ء) dan hamzah di atas alif (أ → ا) tetap ditangani terpisah.
   */
  hamzaSeats?: boolean;
  /** Buang penanda catatan kaki `(١)`/`(12)` di badan teks (default `true`); menjadi pemisah. */
  dropFootnoteRefs?: boolean;
}

/** Hasil normalisasi: bentuk cocok + peta offset ke teks mentah. */
export interface Normalized {
  /** Token huruf/angka dipisah tepat satu spasi, tanpa spasi di awal atau akhir. */
  text: string;
  /**
   * `map[j]` = indeks UTF-16 di teks mentah asal karakter normal ke-`j`; panjangnya = `text.length`
   * dan tidak pernah menurun. Satu karakter mentah bisa menghasilkan beberapa karakter normal
   * (ligatur ﷺ); semuanya menunjuk ke indeks mentah yang sama.
   * Typed array: jangan dikirim dari Server Component ke klien (ADR-023).
   */
  map: Int32Array;
}

// Tanda yang dibuang tanpa jejak (tidak memutus kata):
// - U+0610–U+061A tanda kehormatan kecil, U+064B–U+065F harakat (termasuk hamzah atas/bawah),
//   U+0670 alif khanjariyah, U+06D6–U+06DC dan U+06DF–U+06E8 dan U+06EA–U+06ED tanda Qur'ani;
// - U+0640 tatweel, U+061C ALM, U+200B–U+200F lebar-nol/LRM/RLM, U+202A–U+202E, U+2060–U+2064,
//   U+2066–U+2069 kontrol arah, U+FEFF BOM;
// - semua tanda gabung lain (\p{Mn}, \p{Me}), supaya huruf Latin berdiakritik tidak terpecah.
// U+06DD (akhir ayat), U+06DE (rub' al-hizb), dan U+06E9 (sajdah) TIDAK di sini: ketiganya pemisah.
const DROP =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\p{Mn}\p{Me}]/u;

const WORD = /[\p{L}\p{N}]/u;

// Penyeragaman huruf. Alasannya: variasi ini tidak membedakan makna dalam pencarian, tetapi
// sangat tidak konsisten antarcetakan dan antarpengetik (أ/ا, ى/ي di akhir kata, ة/ه).
const LETTER_MAP: Readonly<Record<string, string>> = {
  "\u0622": "\u0627", // آ → ا
  "\u0623": "\u0627", // أ → ا
  "\u0625": "\u0627", // إ → ا
  "\u0671": "\u0627", // ٱ (wasla) → ا
  "\u0672": "\u0627", // ٲ → ا
  "\u0673": "\u0627", // ٳ → ا
  "\u0649": "\u064A", // ى → ي
  "\u06CC": "\u064A", // ی (Persia) → ي
  "\u06A9": "\u0643", // ک (Persia) → ك
  "\u0629": "\u0647", // ة → ه
};
const HAMZA_SEAT_MAP: Readonly<Record<string, string>> = {
  "\u0624": "\u0648", // ؤ → و
  "\u0626": "\u064A", // ئ → ي
};

// Ligatur formula kehormatan Unicode 14 yang TIDAK punya dekomposisi NFKC, sehingga harus
// diekspansi manual supaya bisa dicari sebagai kata (ditulis langsung dalam bentuk normal).
// Ligatur lama (ﷺ U+FDFA, ﷻ U+FDFB, ﷲ U+FDF2, lam-alif ﻻ, dll.) cukup lewat NFKC.
const EXPAND: Readonly<Record<string, string>> = {
  "\uFD40": "رحمه الله",
  "\uFD41": "رضي الله عنه",
  "\uFD42": "رضي الله عنها",
  "\uFD43": "رضي الله عنهم",
  "\uFD44": "رضي الله عنهما",
  "\uFD45": "رضي الله عنهن",
  "\uFD46": "صلي الله عليه واله",
  "\uFD47": "عليه السلام",
  "\uFD48": "عليهم السلام",
  "\uFD49": "عليهما السلام",
  "\uFD4A": "عليه الصلاه والسلام",
  "\uFD4B": "قدس سره",
  "\uFD4C": "صلي الله عليه واله وسلم",
  "\uFD4D": "عليها السلام",
  "\uFD4E": "تبارك وتعالي",
  "\uFD4F": "رحمهم الله",
  "\uFDCF": "سلامه علينا",
  "\uFDFD": "بسم الله الرحمن الرحيم",
  "\uFDFE": "سبحانه وتعالي",
  "\uFDFF": "عز وجل",
};

// Penanda catatan kaki: "(١)", "( ١٢ )", "(12)". Maksimal 4 digit supaya "(١٤٠٢)" tahun tetap ikut
// terbuang hanya bila memang berbentuk penanda; angka di luar kurung tidak tersentuh.
const FOOTNOTE_REF = /\(\s*[\u0660-\u0669\u06F0-\u06F90-9]{1,4}\s*\)/y;
// Tag HTML (sisa markup Shamela): "<span ...>", "</span>", "<hr>". "<" lain diperlakukan biasa.
const HTML_TAG = /<\/?[A-Za-z][^>]*>/y;

/** Blok *presentation forms* Arab (umumnya teks hasil salin dari PDF). */
const isPresentationForm = (code: number): boolean =>
  (code >= 0xfb50 && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff);

/** `true` bila karakter (satu unit UTF-16) dibuang tanpa jejak oleh normalisasi. */
export function isDroppedChar(ch: string): boolean {
  if (DROP.test(ch)) return true;
  const code = ch.charCodeAt(0);
  return isPresentationForm(code) && presentationExpansion(ch) === "";
}

const expansionCache = new Map<string, string>();

/**
 * Ekspansi satu karakter presentation form: tabel EXPAND, atau NFKC per karakter (bukan NFKC
 * seluruh string, supaya peta offset tetap per karakter mentah). Tanda yang dibuang ikut dihapus;
 * bentuk harakat terisolasi (U+FE70 = " ً") menjadi string kosong = dibuang tanpa jejak.
 */
function presentationExpansion(ch: string): string {
  let out = expansionCache.get(ch);
  if (out === undefined) {
    const nfkc = EXPAND[ch] ?? ch.normalize("NFKC");
    out = "";
    for (const c of nfkc) if (!DROP.test(c)) out += c;
    if (out.trim() === "") out = "";
    expansionCache.set(ch, out);
  }
  return out;
}

/** Seragamkan satu karakter: huruf (LETTER_MAP, kursi hamzah) dan angka Arab-India → ASCII. */
function foldChar(ch: string, hamzaSeats: boolean): string {
  const mapped = LETTER_MAP[ch] ?? (hamzaSeats ? HAMZA_SEAT_MAP[ch] : undefined);
  if (mapped !== undefined) return mapped;
  const code = ch.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return ch;
}

/**
 * Normalisasi teks Arab (mentah, boleh bervokal dan ber-HTML) menjadi bentuk cocok untuk FTS dan
 * verifikasi kutipan, beserta peta offset ke teks mentah.
 *
 * Urutan per karakter mentah: tag HTML dan penanda `(١)` → pemisah; harakat/tatweel/lebar-nol →
 * dibuang; presentation forms → NFKC/EXPAND; huruf diseragamkan; selain huruf/angka → pemisah.
 * Pemisah berturut-turut dikolaps menjadi satu spasi. Deterministik terhadap NORM_VERSION.
 */
export function normalizeArabic(raw: string, opts: NormalizeOptions = {}): Normalized {
  const hamzaSeats = opts.hamzaSeats ?? true;
  const dropRefs = opts.dropFootnoteRefs ?? true;
  let text = "";
  const map: number[] = [];
  let pendingSpace = false;
  let spaceAt = 0;

  const sep = (at: number): void => {
    if (!pendingSpace) {
      pendingSpace = true;
      spaceAt = at;
    }
  };
  const emitChar = (c: string, at: number): void => {
    if (!WORD.test(c)) {
      sep(at);
      return;
    }
    if (pendingSpace && text.length > 0) {
      text += " ";
      map.push(spaceAt);
    }
    pendingSpace = false;
    const lower = c.toLowerCase();
    for (let k = 0; k < lower.length; k++) {
      text += lower[k];
      map.push(at);
    }
  };

  let i = 0;
  while (i < raw.length) {
    const ch = raw[i] as string;
    const code = raw.charCodeAt(i);

    // Jalur cepat: huruf Arab dasar ء–ي (mayoritas teks), kecuali tatweel U+0640 yang dibuang.
    if (code >= 0x0621 && code <= 0x064a && code !== 0x0640) {
      emitChar(foldChar(ch, hamzaSeats), i);
      i++;
      continue;
    }
    if (code === 0x3c /* < */) {
      HTML_TAG.lastIndex = i;
      if (HTML_TAG.test(raw)) {
        sep(i);
        i = HTML_TAG.lastIndex;
        continue;
      }
    }
    if (dropRefs && code === 0x28 /* ( */) {
      FOOTNOTE_REF.lastIndex = i;
      if (FOOTNOTE_REF.test(raw)) {
        sep(i);
        i = FOOTNOTE_REF.lastIndex;
        continue;
      }
    }
    if (DROP.test(ch)) {
      i++;
      continue;
    }
    if (isPresentationForm(code)) {
      const exp = presentationExpansion(ch);
      if (exp.includes(" ")) {
        // Ekspansi berupa frasa (ﷺ): diberi batas kata di kedua sisi.
        sep(i);
        for (const c of exp) {
          if (c === " ") sep(i);
          else emitChar(foldChar(c, hamzaSeats), i);
        }
        sep(i);
      } else {
        // Satu huruf atau ligatur dalam kata (ﻻ → لا): tetap menyatu dengan kata di sekitarnya.
        for (const c of exp) emitChar(foldChar(c, hamzaSeats), i);
      }
      i++;
      continue;
    }
    emitChar(foldChar(ch, hamzaSeats), i);
    i++;
  }
  return { text, map: Int32Array.from(map) };
}

/**
 * Petakan span `[nStart, nEnd)` di bentuk normal ke span mentah `[rStart, rEnd)`.
 *
 * Span mentah mencakup seluruh karakter mentah dari huruf pertama sampai huruf terakhir, ditambah
 * harakat/tatweel yang menempel di huruf terakhir (الصَّبْرُ → sampai dhammah), supaya substring
 * yang disalin ke pengguna utuh. `nStart`/`nEnd` sebaiknya di batas token (bukan spasi).
 */
export function toRawSpan(
  raw: string,
  n: Normalized,
  nStart: number,
  nEnd: number,
): [rStart: number, rEnd: number] {
  if (
    !Number.isInteger(nStart) ||
    !Number.isInteger(nEnd) ||
    nStart < 0 ||
    nEnd > n.map.length ||
    nStart >= nEnd
  ) {
    throw new RangeError(`span normal tidak valid: [${nStart}, ${nEnd}) dari ${n.map.length}`);
  }
  const rStart = n.map[nStart] as number;
  let rEnd = (n.map[nEnd - 1] as number) + 1;
  while (rEnd < raw.length && isDroppedChar(raw[rEnd] as string)) rEnd++;
  return [rStart, rEnd];
}
