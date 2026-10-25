// Gaya narator (X17b, ADR-101): tag audio eleven_v4 dari DAFTAR TETAP, dipilih kode menurut peran
// kalimat (`ScriptSegment.roles`: narasi / terjemahan kutipan / terjemahan syair), tidak pernah oleh
// model. Ekspresinya milik narator yang mengutip, bukan tokoh yang dikutip: tenang, khidmat, lembut;
// tanpa emosi kuat, tiruan suara, atau efek. Tag tidak mengubah kata yang dibacakan, jadi sha skrip
// tetap; gaya dicatat sebagai `style` di manifest dan ikut sidik permintaan (teks yang dikirim).
// Bawaan "polos" (tanpa tag) sampai uji dengar A/B (`pnpm audio sample --demo-gaya`) memutuskan lain.
import type { ScriptSegmentKind, SentenceRole } from "@surau/core";

export interface NarratorStyle {
  /** Nama + versi, dicatat di manifest (mis. `khidmat@1`). */
  id: string;
  /** Tag per peran; null = tanpa tag. */
  tags: Readonly<Record<SentenceRole, string>> | null;
  /**
   * Tag hangat untuk pembuka bagian dan kepala/judul gagasan (gaya variatif); kalimat baku
   * (label AI, anjuran, tanda takhrij) selalu bernada tenang `tags.narration`.
   */
  warm?: string;
}

/** Awalan kalimat baku buatan kode yang selalu dibacakan netral (bentuk sesudah normalisasi lisan). */
const NEUTRAL_PREFIXES = [
  "Intisari ini",
  "Dari kitab",
  "Anjuran yang ditulis",
  "Untuk kasus pribadi",
  "Gagasan ini bersandar",
  "Teks kitab di",
  "Sebuah riwayat di",
  "Sebait syair di",
  "Kutipan pilihan",
  "Penutup",
];

export const STYLES: Readonly<Record<string, NarratorStyle>> = {
  polos: { id: "polos", tags: null },
  khidmat: {
    id: "khidmat@1",
    tags: { narration: "[calm]", quote: "[thoughtful]", poetry: "[softly]" },
  },
  variatif: {
    id: "variatif@1",
    tags: { narration: "[calm]", quote: "[thoughtful]", poetry: "[softly]" },
    warm: "[warm]",
  },
};

/** Semua tag yang boleh sampai ke suara AI (selain itu `[ ]` tetap ditolak, aturan 11). */
export const STYLE_TAGS: ReadonlySet<string> = new Set(
  Object.values(STYLES).flatMap((s) => [
    ...(s.tags === null ? [] : Object.values(s.tags)),
    ...(s.warm === undefined ? [] : [s.warm]),
  ]),
);

/**
 * Kalimat bergaya: tag diletakkan di awal kalimat setiap kali peran BERUBAH (kalimat pertama segmen
 * bernarasi tanpa tag = nada dasar), supaya kutipan dan syair terdengar berbeda lalu kembali tenang.
 */
export function styledSentences(
  sentences: readonly string[],
  roles: readonly SentenceRole[],
  style: NarratorStyle,
  kind: ScriptSegmentKind = "point",
): string[] {
  if (style.tags === null) return [...sentences];
  const tags = style.tags;
  const warm = style.warm;
  let previous = tags.narration;
  return sentences.map((s, i) => {
    const role = roles[i] ?? "narration";
    let tag = tags[role];
    if (
      warm !== undefined &&
      role === "narration" &&
      !NEUTRAL_PREFIXES.some((p) => s.startsWith(p))
    ) {
      // Variatif: pembuka bagian dan kepala + judul gagasan bernada hangat.
      if ((kind === "intro" && i === 0) || (kind === "point" && i <= 1)) tag = warm;
    }
    const out = tag !== previous ? `${tag} ${s}` : s;
    previous = tag;
    return out;
  });
}

/** Teks tanpa tag gaya yang diizinkan (untuk pemeriksaan aturan 11 atas teks akhir). */
export const withoutStyleTags = (text: string): string =>
  text.replace(/\[[a-z ]+\]/gu, (tag) => (STYLE_TAGS.has(tag) ? " " : tag));

/** Teks demo A/B (buatan, tanpa huruf Arab): satu narasi, satu kutipan, satu syair, dua gaya. */
export function styleDemo(opening: string): string {
  const lines: { text: string; role: SentenceRole }[] = [
    { text: "Al-Ghazali menjelaskan bahwa niat menentukan nilai sebuah amal.", role: "narration" },
    {
      text: "Teks kitab di jilid satu, halaman dua ratus, yang terjemahan AI-nya:",
      role: "narration",
    },
    { text: "Contoh kutipan: ilmu adalah cahaya bagi hati yang bersih.", role: "quote" },
    {
      text: "Sebait syair di jilid tiga, halaman dua ratus empat, yang terjemahan AI-nya:",
      role: "narration",
    },
    { text: "Contoh syair: ilmu tanpa amal ibarat pohon tanpa buah.", role: "poetry" },
    { text: "Demikian penjelasan tentang niat.", role: "narration" },
  ];
  const texts = lines.map((l) => l.text);
  const roles = lines.map((l) => l.role);
  const khidmat = STYLES.khidmat as NarratorStyle;
  return [
    opening,
    "Versi A, tanpa gaya.",
    ...texts,
    "Versi B, gaya khidmat.",
    ...styledSentences(texts, roles, khidmat),
  ].join(" ");
}
