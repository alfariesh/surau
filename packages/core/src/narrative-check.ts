// Pemeriksa teks narasi berbahasa Indonesia buatan model (S13, X15b; dipindah dari @surau/llm di
// X23, pola X08/ADR-081) supaya pemeriksa draf konten (MCP `/redaksi`, CLI `konten`) memakainya
// tanpa menarik @surau/llm. @surau/llm mengekspor ulang semuanya untuk pemanggil batch.
// Heuristik pola, bukan jaminan semantik: yang lolos tetap dinilai (teks-arab.md aturan 6, 7, 9).
import { hasArabicLetters, hasMarkdown } from "./translation-text.ts";

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

/** Tanda placeholder ayat atau rujukan "QS n" yang tidak boleh ada di teks AI. */
const hasPlaceholder = (t: string): boolean => t.includes("⟦") || /\bQS\s*\d/u.test(t);

/**
 * Masalah satu teks narasi Intisari berbahasa Indonesia (abstrak, pembuka, penutup, judul dan isi
 * gagasan, pertanyaan); kosong = lolos.
 */
export function narrativeProblems(text: string): string[] {
  const t = text.trim();
  if (t === "") return ["empty"];
  const out: string[] = [];
  if (hasArabicLetters(t)) out.push("arabic");
  if (hasPlaceholder(t)) out.push("placeholder");
  if (hasMarkdown(t) || /^\s*[-*•]\s/mu.test(t)) out.push("markdown");
  if (/[\r\n]/u.test(t)) out.push("newline");
  // Tag atau kurung kurawal: masuk mentah ke prompt induk (<gagasan>, <kutipan>) dan ke halaman.
  if (/[<>{}]/u.test(t)) out.push("markup");
  if (hasPreamble(t)) out.push("preamble");
  if (hasMetaCommentary(t, "id")) out.push("meta");
  if (hasFatwaLanguage(t)) out.push("fatwa");
  if (addressesReader(t)) out.push("address");
  if (hasFirstPerson(t)) out.push("first_person");
  if (hasHadithStatus(t)) out.push("hadith_status");
  if (paraphrasesAyah(t)) out.push("ayah_paraphrase");
  return out;
}

/**
 * Masalah terjemahan kutipan tanpa batas panjang. Ia menerjemahkan kata penulis, jadi "aku"/"kami"
 * boleh; teks Arab, placeholder, Markdown, komentar model, dan isi ayat tetap tidak.
 */
export function quoteTranslationTextProblems(text: string): string[] {
  const t = text.trim();
  if (t === "") return ["empty"];
  const out: string[] = [];
  if (hasArabicLetters(t)) out.push("arabic");
  if (hasPlaceholder(t)) out.push("placeholder");
  if (hasMarkdown(t)) out.push("markdown");
  if (/[\r\n]/u.test(t)) out.push("newline");
  if (hasPreamble(t)) out.push("preamble");
  if (hasMetaCommentary(t, "id")) out.push("meta");
  if (paraphrasesAyah(t)) out.push("ayah_paraphrase");
  return out;
}
