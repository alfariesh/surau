// Label status hadits dari istilah takhrij (X06, ADR-069): teks status dibuat KODE dari istilah
// yang tertulis di teks catatan kaki (`takhrijTerms`, @surau/text), bukan ringkasan model. Arti
// tiap istilah adalah daftar tetap di bawah (ditinjau ustadz bersama labelnya, T-24). Label ini
// indeks istilah, bukan penilaian Surau: takhrij bisa menyebut jalur sahih dan jalur lemah, atau
// menukil penilaian ulama lain; frasa Arab aslinya selalu ditampilkan dari DB lewat rentangnya.
import { TAKHRIJ_TERMS_VERSION, takhrijTerms } from "@surau/text";
import type { TakhrijTermKind } from "@surau/text";

/** Arti singkat setiap istilah (Latin, pendek: ikut teks status ≤ 120 karakter). */
export const TAKHRIJ_TERM_GLOSS: Readonly<Record<TakhrijTermKind, string>> = {
  muttafaq: "muttafaq 'alaih",
  bukhari: "riwayat al-Bukhari",
  muslim: "riwayat Muslim",
  sahih: "sahih",
  hasan: "hasan",
  hasan_sahih: "hasan sahih",
  jayyid: "sanad baik (jayyid)",
  la_bas: "la ba'sa bihi (dapat diterima)",
  gharib: "gharib",
  daif: "lemah",
  sangat_lemah: "sangat lemah",
  palsu: "palsu/batil",
  duafa: "disebut di kitab perawi lemah",
  la_asl: "tidak ada asalnya",
  lam_ajid: "tidak ditemukan penakhrij",
  mursal: "mursal",
  mawquf: "mauquf",
  muallaq: "mu'allaq (tanpa sanad)",
  sebagian: "sebagian lafaz saja",
  rujukan: "lihat takhrij di tempat lain",
};

/** Urutan baku jenis istilah (urutan `TAKHRIJ_TERM_GLOSS`; pilihan koreksi penilai, X07). */
export const TAKHRIJ_TERM_KINDS = Object.keys(TAKHRIJ_TERM_GLOSS) as readonly TakhrijTermKind[];

const POSITIVE: ReadonlySet<TakhrijTermKind> = new Set([
  "muttafaq",
  "sahih",
  "hasan",
  "hasan_sahih",
  "jayyid",
  "la_bas",
]);
const NEGATIVE: ReadonlySet<TakhrijTermKind> = new Set([
  "daif",
  "duafa",
  "sangat_lemah",
  "palsu",
  "la_asl",
  "lam_ajid",
]);

/** Istilah kelemahan, palsu, tanpa asal, atau tidak ditemukan (dasar tanda `weak`). */
export const isWeakTakhrijKind = (kind: TakhrijTermKind): boolean => NEGATIVE.has(kind);

/** Batas panjang teks status (skema eval `status`, `latin(120)`). */
export const TAKHRIJ_STATUS_MAX = 120;

export interface TakhrijLabelTerm {
  kind: TakhrijTermKind;
  /** Rentang mentah di teks catatan kaki. */
  char_start: number;
  char_end: number;
  gloss: string;
}

export interface TakhrijLabel {
  version: number;
  /**
   * `terms`: memuat istilah; `sources_only`: hanya menyebut sumber; `refers_back`: hanya merujuk
   * takhrij sebelumnya; `not_takhrij`: catatan penyunting atau teks yang tidak dikenali sebagai
   * takhrij.
   */
  kind: "terms" | "sources_only" | "refers_back" | "not_takhrij";
  /** Teks status Latin ringkas (≤ `TAKHRIJ_STATUS_MAX`), dibuat kode. */
  text: string;
  /** Ada istilah penilaian positif dan negatif sekaligus (jalur/lafaz berbeda). */
  mixed: boolean;
  /**
   * Memuat istilah kelemahan, palsu, tanpa asal, atau tidak ditemukan (docs/05 §4: diberi tanda
   * setiap kali dikutip). Dari istilah yang sama dengan label, jadi tanda dan label tidak bertentangan.
   */
  weak: boolean;
  /** Setiap kemunculan istilah, urut teks. */
  terms: TakhrijLabelTerm[];
}

const SOURCES_ONLY = "takhrij hanya menyebut sumber riwayat, tanpa istilah penilaian";
const REFERS_BACK = "takhrij merujuk ke takhrij di tempat lain";
const NOT_TAKHRIJ = "catatan kaki ini tidak memuat istilah takhrij yang dikenali";
/** Bagian yang disitasi tidak memuat istilah, padahal catatan kaki utuhnya memuat. */
export const TAKHRIJ_RANGE_WITHOUT_TERMS =
  "bagian takhrij yang dikutip tidak memuat istilah penilaian";
const RANGE_WITHOUT_TERMS = TAKHRIJ_RANGE_WITHOUT_TERMS;
const BY_REVIEWER = "menurut peninjau: ";
const MIXED = " (berbeda per jalur)";

/**
 * Label status untuk satu teks catatan kaki (mentah, dari DB). Dengan `range` (bagian yang
 * disitasi), jenis takhrij dan batas lafaz tetap dinilai dari teks utuh, tetapi istilah dan teks
 * status hanya dari istilah di dalam bagian itu, supaya setiap istilah yang disebut punya frasa
 * Arab di potongan yang ditampilkan.
 */
export function takhrijLabel(raw: string, range?: { start: number; end: number }): TakhrijLabel {
  const found = takhrijTerms(raw);
  const inRange = (t: { start: number; end: number }) =>
    range === undefined || (t.start >= range.start && t.end <= range.end);
  const terms = found.terms.filter(inRange).map((t) => ({
    kind: t.kind,
    char_start: t.start,
    char_end: t.end,
    gloss: TAKHRIJ_TERM_GLOSS[t.kind],
  }));
  const weak = terms.some((t) => NEGATIVE.has(t.kind));
  const base = { version: TAKHRIJ_TERMS_VERSION, mixed: false, weak, terms };
  if (found.kind !== "takhrij") return { ...base, kind: "not_takhrij", text: NOT_TAKHRIJ };
  const status = takhrijStatus(terms.map((t) => t.kind));
  if (status.kind !== "terms" && found.terms.some((t) => !inRange(t) && t.kind !== "rujukan"))
    return { ...base, kind: "sources_only", text: RANGE_WITHOUT_TERMS };
  return { ...base, ...status };
}

/**
 * Teks status dari jenis istilah (urut kemunculan; duplikat diabaikan), dibuat kode. Dipakai label
 * kode dan label koreksi penilai (X07), supaya keduanya disusun dengan aturan yang sama. `added` =
 * jenis yang DITETAPKAN penilai tanpa istilah baku di teks: disebut terpisah sebagai "menurut
 * peninjau: …", tidak pernah sebagai isi takhrij (bahasa atribusi, ADR-070).
 */
export function takhrijStatus(
  list: readonly TakhrijTermKind[],
  added: readonly TakhrijTermKind[] = [],
): {
  kind: "terms" | "sources_only" | "refers_back";
  text: string;
  mixed: boolean;
} {
  let kinds = [...new Set(list)];
  let extra = [...new Set(added)].filter((k) => !kinds.includes(k));
  // "muttafaq" sudah mencakup al-Bukhari dan Muslim; rujukan hanya disebut bila sendirian.
  if (kinds.includes("muttafaq") || extra.includes("muttafaq")) {
    kinds = kinds.filter((k) => k !== "bukhari" && k !== "muslim");
    extra = extra.filter((k) => k !== "bukhari" && k !== "muslim");
  }
  const refersBack = kinds.includes("rujukan");
  kinds = kinds.filter((k) => k !== "rujukan");
  extra = extra.filter((k) => k !== "rujukan");
  if (kinds.length === 0 && extra.length === 0)
    return refersBack
      ? { kind: "refers_back", text: REFERS_BACK, mixed: false }
      : { kind: "sources_only", text: SOURCES_ONLY, mixed: false };
  const all = [...kinds, ...extra];
  const mixed = all.some((k) => POSITIVE.has(k)) && all.some((k) => NEGATIVE.has(k));
  const tail = mixed ? MIXED : "";
  // Setiap istilah hanya masuk bila sisa ruang masih cukup untuk "; dan lainnya" sesudahnya.
  const more = "; dan lainnya";
  const items = [
    ...kinds.map((k, i) => ({ k, lead: i === 0 ? "takhrij menyebut: " : "; " })),
    ...extra.map((k, i) => ({
      k,
      lead: i > 0 ? "; " : kinds.length > 0 ? `; ${BY_REVIEWER}` : BY_REVIEWER,
    })),
  ];
  let text = "";
  for (const [i, { k, lead }] of items.entries()) {
    const next = `${text}${lead}${TAKHRIJ_TERM_GLOSS[k]}`;
    const reserve = i < items.length - 1 ? more.length : 0;
    if (next.length + tail.length + reserve > TAKHRIJ_STATUS_MAX) {
      text = i === 0 ? `${lead}${more}` : `${text}${more}`;
      break;
    }
    text = next;
  }
  return { kind: "terms", mixed, text: `${text}${tail}` };
}
