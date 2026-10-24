// Pemeriksaan umum keluaran LLM (S13). Aturan teks-arab: teks Arab buatan model tidak pernah tampil
// sebagai kutipan, jadi keluaran yang menyalin teks Arab panjang ditolak (istilah ditulis Latin).
import { footnoteMarkerDigits, stripMarkers } from "@surau/core";

// Pemeriksa teks murni dipindah ke @surau/core (X08, ADR-081) supaya web memakainya tanpa
// menarik @surau/llm; diekspor ulang di sini untuk pemanggil batch.
export { footnoteMarkerDigits, hasArabicLetters, hasMarkdown, stripMarkers } from "@surau/core";

/**
 * Kata berhuruf Arab berturut-turut yang masih diterima: 0. Prompt melarang huruf Arab sama sekali
 * dan aturan teks-arab 1 melarang teks Arab buatan model tampil, jadi satu kata pun ditolak (ulangan
 * murah). Placeholder ayat dan penanda catatan kaki tidak dihitung.
 */
export const MAX_ARABIC_RUN_WORDS = 0;

const ARABIC_LETTER = /(?=\p{L})\p{Script=Arabic}/u;

/** Jumlah kata berhuruf Arab berturut-turut terpanjang (placeholder dan penanda tidak dihitung). */
export function longestArabicRun(text: string): number {
  let best = 0;
  let run = 0;
  for (const token of stripMarkers(text).split(/\s+/)) {
    if (token === "") continue;
    run = ARABIC_LETTER.test(token) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Panjang teks tanpa placeholder, penanda, dan spasi berlebih (perkiraan token, pemecahan). */
export function contentLength(text: string): number {
  return stripMarkers(text).replace(/\s+/g, " ").trim().length;
}

/**
 * Panjang tanpa placeholder, penanda, harakat, dan spasi berlebih: dasar rasio panjang terjemahan.
 * Harakat tidak dihitung supaya judul berharakat penuh tidak tampak "dua kali lebih panjang".
 */
export function letterLength(text: string): number {
  return stripMarkers(text).replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().length;
}

/** Jarak (karakter) dari placeholder ayat yang diperiksa untuk transliterasi berdiakritik. */
export const REFILL_WINDOW = 80;
const DIACRITIC_TRANSLIT = /[āīūḥṣṭẓḍĀĪŪḤṢṬẒḌ]/;

/**
 * Tanda model menulis ulang isi kutipan ayat yang sudah diganti placeholder: transliterasi
 * berdiakritik (ā ī ū ḥ …) dekat placeholder (`wa huwa 'alā … qadīr ⟦QS …⟧`). Prompt memakai
 * transliterasi tanpa diakritik, jadi diakritik di situ = lafaz Arab yang dialihaksarakan utuh.
 * Tidak ditolak (uji batch S13, semuanya sah): "yakni/maksudnya …" sesudah placeholder (tafsiran
 * al-Ghazali sendiri, أي … di sumber), kutipan sesudah placeholder (ucapan berikutnya atau doa
 * sesudah ayat), dan transliterasi berdiakritik jauh dari placeholder (soal gaya).
 */
export function refillsAyah(text: string): boolean {
  for (const m of text.matchAll(/⟦QS [^⟧]*⟧/g)) {
    const at = m.index ?? 0;
    const near = text.slice(Math.max(0, at - REFILL_WINDOW), at + m[0].length + REFILL_WINDOW);
    if (DIACRITIC_TRANSLIT.test(near)) return true;
  }
  return false;
}

// Komentar/koreksi-diri model dalam bahasa Indonesia (batch S13: ±1,4% keluaran memuatnya walau
// dilarang prompt, mis. "Maaf, bagian di atas keliru. Berikut terjemahannya:", "Catatan: …", dua
// versi terjemahan, tag <teks>). Pola dibuat spesifik supaya kata biasa ("memberi maaf",
// "ditunggu-tunggu") tidak ikut.
const META_ID: readonly RegExp[] = [
  /catatan(?:\s+penerjemah)?\s*:/i,
  /\bberikut(?: ini)?(?: adalah)? (?:terjemah|versi|yang (?:benar|tepat)|perbaikan)/i,
  /<\/?(?:teks|sebelumnya|bagian)\b/i,
  /\b(?:glosarium|placeholders?)\b/i,
  /\bterjemahan ai\b/i,
  /\bversi (?:yang )?(?:benar|tepat|lain|akhir|perbaikan)\b/i,
  /(?:^|[.!?\n]\s*)(?:maaf|tunggu|sebentar|oke)\s*[,.:—–-]/i,
  /\b(?:perlu koreksi|koreksi\s*:|ralat\s*:)/i,
  /\bsaya (?:terjemahkan|ulangi|perbaiki|koreksi|tulis ulang|menerjemahkan)\b/i,
  /\bmari (?:saya |kita )?(?:terjemah|ulang|perbaiki|coba|lanjut)/i,
  /\blanjutkan (?:di bawah|terjemah)/i,
  /\[tidak[,\]]/i,
  /\bteks yang diberikan\b/i,
  /\((?:diterjemahkan|terjemahan) di bawah\)/i,
  /\b(?:teks|kalimat|paragraf) (?:ini|tersebut) (?:terpotong|tidak lengkap|tidak memuat)\b/i,
  /\bsesuai (?:instruksi|petunjuk)\b/i,
  /\b(?:sebenarnya|seharusnya) (?:bait|kalimat|teks) ini\b/i,
  /\b(?:maaf, saya|saya ulangi|terjemahan saya)\b/i,
  /\bcatatan (?:ini|singkat|penerjemah)\b/i,
  /\bterjemahan (?:yang )?(?:benar|tepat|lebih tepat)\b/i,
  /\bteks ini (?:berisi|memuat|hanya|tidak)\b/i,
  /\.\.\.\s*\(tidak(?: ada)?\)/i,
];

/**
 * Komentar model tentang pekerjaannya sendiri di dalam keluaran: tanda keluaran rusak, ditolak.
 * Pola Indonesia berlaku untuk kedua bahasa. Untuk keluaran bahasa Indonesia, frasa Inggris
 * semacam "let me", "I will", "wait —" di mana pun juga mencurigakan; untuk bahasa Inggris hanya
 * di awal kalimat ("here is" juga muncul wajar: "the text available here is only the heading").
 */
export function hasMetaCommentary(text: string, lang: "id" | "en" = "id"): boolean {
  if (META_ID.some((re) => re.test(text))) return true;
  if (lang === "id") {
    return /\b(?:let me|i will|i'll|i need to|i must|here is|here's|sorry|hmm|wait|the instruction|translat(?:e|ion)|prompt)\b/i.test(
      text,
    );
  }
  return /(?:^|[.!?]\s+)(?:let me|sorry|wait\s*[—–-]|here is (?:the|a|my) (?:summary|translation))/i.test(
    text,
  );
}

/** Kalimat pembuka/penutup basa-basi yang dilarang prompt. */
export function hasPreamble(text: string): boolean {
  return /^\s*(?:berikut(?: ini)?(?: adalah)? (?:terjemah|ringkas|intisari)|terjemahan\s*:|ringkasan\s*:|intisari\s*:|here is)/i.test(
    text,
  );
}

// ── Bahasa atribusi (teks-arab.md aturan 6, 7, 9; ADR-097) ───────────────────────────────────
// Satu sumber untuk validator Intisari (X15b) dan metrik eval Jawab (dulu di tools/eval). Heuristik
// pola, bukan jaminan semantik: yang lolos tetap dinilai manusia (T-31).

const FATWA =
  /\b(?:hukumnya\s+(?:adalah|ialah)|(?:saya|aku|kami)\s+(?:memfatwakan|mengharamkan|menghalalkan)|(?:aku|saya),?\s+al[- ]?ghazali|menurut\s+fatwa\s+(?:saya|kami)|(?:wajib|haram)\s+(?:bagi\s+)?(?:anda|kamu))\b/iu;

/** Hukum atau perintah atas nama Surau/pembaca ("Hukumnya adalah …"), atau "aku, al-Ghazali". */
export const hasFatwaLanguage = (text: string): boolean => FATWA.test(text);

/** Kata utuh (tidak menempel huruf, apostrof, atau tanda hubung): "kita" ≠ "kitab", "kami" ≠ "Kamis". */
const word = (alternatives: string) =>
  new RegExp(String.raw`(?<![\p{L}'’‘-])(?:${alternatives})(?![\p{L}'’‘-])`, "iu");

const FIRST_PERSON = word("aku|saya|daku|kami|kita");
const ADDRESS = word("anda|kamu|engkau|kau|dikau|kalian");

/**
 * Kata ganti orang pertama di narasi: tanda narator berbicara sebagai ulama (roleplay) atau sebagai
 * Surau ("kita harus …"). Narasi Intisari selalu orang ketiga, termasuk ucapan yang dinukil (kalimat
 * tidak langsung). Tidak dipakai untuk terjemahan kutipan, yang memang menerjemahkan "aku" penulis.
 */
export const hasFirstPerson = (text: string): boolean => FIRST_PERSON.test(text);

/** Menyapa pembaca ("Anda", "kamu"): nasihat atas nama Surau, bukan atribusi (docs/05 §12). */
export const addressesReader = (text: string): boolean => ADDRESS.test(text);

const HADITH_WORD = String.raw`(?:hadi(?:ts|th|t|s)|riwayat|sanad|atsar|khabar)(?:-(?:hadi(?:ts|th|t|s)|riwayat|atsar|khabar))?`;
// Ejaan Latin yang dipakai model untuk istilah derajat (diakritik sudah dibuang lebih dulu).
const STATUS_WORD = String.raw`sahih|shahih|shohih|hasan|da['‘’ʿ]?if|dha['‘’ʿ]?if|dho['‘’ʿ]?if|dlo['‘’ʿ]?if|lemah|palsu|maud(?:h|l)?u['‘’ʿ]?|mawdu['‘’ʿ]?|munkar|mungkar|matruk|mursal|mutawatir|gharib|syadz|batil|bathil`;
const HADITH_STATUS = new RegExp(
  String.raw`\b${HADITH_WORD}(?:nya)?(?:\s+(?:ini|itu|tersebut|tadi))?(?:\s+(?:yang|ber(?:status|derajat)|derajat(?:nya)?|dinilai|tergolong|termasuk|adalah|sangat|tidak|kurang|cukup))*\s+(?<status>${STATUS_WORD})(?![\p{L}'’‘])|\bber(?:status|derajat)\s+(?:sangat\s+|tidak\s+)?(?<status2>${STATUS_WORD})(?![\p{L}'’‘])`,
  "giu",
);
const STATUS_PHRASE = /\b(?:tidak\s+ada\s+asal(?:nya|-usulnya)|la\s+ashla\s+lahu)\b/iu;

/** Buang diakritik Latin (ḍaʿīf → daʿif) supaya ejaan transliterasi ilmiah ikut terdeteksi. */
const plainLatin = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "");

/**
 * Status hadits ditulis model ("hadis lemah", "sanadnya sahih", "hadis ini sangat lemah",
 * "berstatus palsu"). Status hanya dari teks takhrij yang ditampilkan kode (teks-arab.md aturan 6).
 * "Hasan" berhuruf kapital adalah nama orang ("riwayat Hasan al-Bashri"), bukan derajat.
 */
export function hasHadithStatus(text: string): boolean {
  const t = plainLatin(text);
  if (STATUS_PHRASE.test(t)) return true;
  for (const m of t.matchAll(HADITH_STATUS)) {
    const status = m.groups?.status ?? m.groups?.status2 ?? "";
    if (status !== "Hasan") return true;
  }
  return false;
}

const AYAH_PARAPHRASE =
  /\b(?:allah\s+(?:(?:swt\.?|ta['‘’]ala|subhanahu\s+wa\s+ta['‘’]ala|['‘’]?azza\s+wa\s+jalla)\s+)?berfirman|firman(?:-nya|\s+allah)(?:\s+(?:swt\.?|ta['‘’]ala))?(?:\s+yang)?\s*(?:[:"“«]|bahwa|artinya|menyatakan|menyebutkan|menegaskan|berbunyi)|(?:al-?qur['‘’]an|ayat(?:-ayat)?(?:\s+(?:ini|itu|tersebut|al-?qur['‘’]an))?|(?:surah|surat)\s+[\p{L}'’-]+(?:\s+ayat\s+\d+)?)(?:\s+yang)?\s+(?:menyatakan|menyebutkan|menegaskan|mengatakan|menjelaskan|memerintahkan|melarang|berbunyi|bermakna|berarti)|ayat(?:-ayat)?\s*[:"“«])/iu;

/**
 * Isi atau makna ayat ditulis model ("Allah berfirman …", "Al-Qur'an menyatakan …"). Ayat hanya
 * tampil sebagai teks Tanzil + terjemahan Kemenag (aturan 9); teks AI cukup menyebut bahwa penulis
 * berdalil dengan ayat.
 */
export const paraphrasesAyah = (text: string): boolean => AYAH_PARAPHRASE.test(text);

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const EXTENDED_INDIC = "۰۱۲۳۴۵۶۷۸۹";

function toAsciiDigits(d: string): string {
  // Digit Arab satu unit UTF-16 per karakter, jadi penggantian per karakter aman.
  return d.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) =>
    String(Math.max(ARABIC_INDIC.indexOf(c), EXTENDED_INDIC.indexOf(c))),
  );
}

/**
 * Model kadang menulis penanda catatan kaki "(٢)" sebagai "(2)". Untuk setiap penanda yang
 * diharapkan tetapi tidak ada dalam angka Arab, kemunculan pertama versi angka Latinnya dikembalikan
 * ke bentuk asli. Hanya penanda yang diharapkan yang disentuh; angka lain (tahun, nomor) dibiarkan.
 */
export function restoreFootnoteMarkers(text: string, expected: readonly string[]): string {
  const have = footnoteMarkerDigits(text);
  let out = text;
  for (const d of expected) {
    const i = have.indexOf(d);
    if (i !== -1) {
      have.splice(i, 1);
      continue;
    }
    const ascii = toAsciiDigits(d);
    if (ascii === d) continue;
    const sup = ascii.replace(/[0-9]/g, (c) => SUPERSCRIPT[Number(c)] ?? c);
    const latin = new RegExp(String.raw`\(\s*(?:${ascii}|${sup})\s*\)`);
    if (latin.test(out)) out = out.replace(latin, `(${d})`);
  }
  return out;
}
