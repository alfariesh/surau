// Label status hadits dari istilah takhrij (X06, ADR-069; versi 2, ADR-108): teks status dibuat KODE dari istilah
// yang tertulis di teks catatan kaki (`takhrijTerms`, @surau/text), bukan ringkasan model. Arti
// tiap istilah adalah daftar tetap di bawah (ditinjau ustadz bersama labelnya, T-24). Label ini
// indeks istilah, bukan penilaian Surau: takhrij bisa menyebut jalur sahih dan jalur lemah, atau
// menukil penilaian ulama lain; frasa Arab aslinya selalu ditampilkan dari DB lewat rentangnya.
import { TAKHRIJ_TERMS_VERSION, takhrijTerms } from "@surau/text";
import type { TakhrijTermKind, TakhrijTerms } from "@surau/text";

/**
 * Arti setiap istilah (Latin, pendek: ikut teks status ≤ 120 karakter). Sejak ADR-111 berbentuk
 * predikat yang terbaca wajar di depan atribusi ("dinilai lemah, menurut takhrij al-'Iraqi"):
 * "dinilai" pasif karena takhrij juga menukil penilaian ulama lain, bukan selalu penilaian al-'Iraqi.
 */
export const TAKHRIJ_TERM_GLOSS: Readonly<Record<TakhrijTermKind, string>> = {
  muttafaq: "muttafaq 'alaih (al-Bukhari dan Muslim)",
  bukhari: "diriwayatkan al-Bukhari",
  muslim: "diriwayatkan Muslim",
  sahih: "dinilai sahih",
  hasan: "dinilai hasan",
  hasan_sahih: "dinilai hasan sahih",
  jayyid: "sanadnya dinilai baik (jayyid)",
  la_bas: "dinilai dapat diterima (la ba'sa bihi)",
  tsiqat: "perawi atau sanadnya dinilai tepercaya",
  gharib: "dinilai gharib",
  daif: "dinilai lemah",
  mukhtalaf: "sanad atau perawinya diperselisihkan",
  sangat_lemah: "dinilai sangat lemah",
  palsu: "dinilai palsu atau batil",
  duafa: "disebut di kitab perawi lemah",
  la_asl: "dinyatakan tidak ada asalnya",
  // Empat jenis "tidak ditemukan" yang tidak boleh tertukar (j028 x06, j029 x09, ADR-113): sanadnya
  // tidak ditemukan; hanya jalur marfu' yang tidak ditemukan (riwayat mauquf bisa ada); hanya lafaz
  // ini yang tidak ditemukan (lafaz lain bisa ada); hanya dari jalur/sumber yang disebut.
  lam_ajid: "tidak ditemukan sanadnya",
  lam_ajid_marfu: "tidak ditemukan sebagai sabda Nabi (marfu')",
  lam_ajid_lafaz: "tidak ditemukan dengan lafaz ini",
  lam_ajid_jalur: "tidak ditemukan dari jalur yang disebut",
  mursal: "diriwayatkan mursal",
  mawquf: "diriwayatkan mauquf",
  muallaq: "diriwayatkan mu'allaq (tanpa sanad)",
  sebagian: "sumbernya hanya memuat sebagian lafaz",
  dibantah: "memuat penilaian ulama lain yang dibantah",
  rujukan: "merujuk ke takhrij di tempat lain",
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
  "lam_ajid_marfu",
  "lam_ajid_lafaz",
  "lam_ajid_jalur",
]);

/** Istilah kelemahan, palsu, tanpa asal, atau tidak ditemukan (dasar tanda `weak`). */
export const isWeakTakhrijKind = (kind: TakhrijTermKind): boolean => NEGATIVE.has(kind);

/**
 * Istilah "sangat lemah, palsu, atau tidak ada asalnya" (docs/05 §4): riwayatnya tidak pernah jadi
 * kutipan pilihan Intisari (ADR-097) dan diberi tanda yang jelas setiap kali disebut, termasuk di
 * audio (ADR-100). Satu definisi untuk `readDigest` dan skrip audio.
 */
export const VERY_WEAK_TAKHRIJ_KINDS: ReadonlySet<string> = new Set([
  "sangat_lemah",
  "palsu",
  "la_asl",
]);

/**
 * Riwayat yang tidak boleh menjadi kutipan pilihan menurut istilah takhrijnya (docs/05 §12): sangat
 * lemah, palsu/batil, tidak ada asalnya, dan tidak ditemukan penakhrij (lam ajid, setara "tidak
 * diketahui asalnya"), termasuk tidak ditemukan sebagai sabda Nabi (`lam_ajid_marfu`, ADR-108) serta
 * tidak ditemukan dengan lafaz ini atau dari jalur yang disebut (ADR-113). Satu definisi untuk
 * validator Intisari batch (X15b) dan pemeriksa draf konten (X22).
 */
export const QUOTE_BANNED_TAKHRIJ_KINDS: ReadonlySet<string> = new Set([
  ...VERY_WEAK_TAKHRIJ_KINDS,
  "lam_ajid",
  "lam_ajid_marfu",
  "lam_ajid_lafaz",
  "lam_ajid_jalur",
]);

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

/**
 * Penakhrij yang istilahnya dikenali `takhrijTerms` (pola frasa al-'Iraqi untuk Ihya). Kitab lain
 * dengan penakhrij lain butuh aturan istilah sendiri, dan nama ini ikut jadi parameter.
 */
const TAKHRIJ_BY = "takhrij al-'Iraqi";
const SOURCES_ONLY = `${TAKHRIJ_BY} hanya menyebut sumber riwayatnya, tanpa istilah penilaian`;
const REFERS_BACK = `${TAKHRIJ_BY} merujuk ke takhrijnya di tempat lain`;
const SOURCES_REFERS_BACK = `${TAKHRIJ_BY} menyebut sumber riwayatnya dan merujuk ke takhrijnya di tempat lain`;
const NOT_TAKHRIJ = "catatan kaki ini tidak memuat istilah takhrij yang dikenali";
/** Bagian yang disitasi tidak memuat istilah, padahal catatan kaki utuhnya memuat. */
export const TAKHRIJ_RANGE_WITHOUT_TERMS =
  "bagian takhrij yang dikutip tidak memuat istilah penilaian";
const RANGE_WITHOUT_TERMS = TAKHRIJ_RANGE_WITHOUT_TERMS;
/** Atribusi di akhir tiap kelompok istilah: isi takhrij, atau jenis tambahan penilai. */
const BY_TAKHRIJ = `, menurut ${TAKHRIJ_BY}`;
const BY_REVIEWER = ", menurut peninjau";
const MIXED = " (berbeda per jalur)";
const MORE = "; dan lainnya";
/** Catatan kaki memuat takhrij beberapa hadits (penanda "(N)" internal, masalah ingest). */
const FIRST_OF_MANY = " (hadits pertama dari beberapa)";
const MANY = " (beberapa hadits)";

/**
 * Label status untuk satu teks catatan kaki (mentah, dari DB). Dengan `range` (bagian yang
 * disitasi), jenis takhrij dan batas lafaz tetap dinilai dari teks utuh, tetapi istilah dan teks
 * status hanya dari istilah di dalam bagian itu, supaya setiap istilah yang disebut punya frasa
 * Arab di potongan yang ditampilkan. Catatan kaki yang memuat takhrij beberapa hadits (segmen,
 * `takhrijTerms`) dilabeli dari segmen pertama, atau dari segmen yang beririsan dengan `range`.
 */
export function takhrijLabel(raw: string, range?: { start: number; end: number }): TakhrijLabel {
  const found = takhrijTerms(raw);
  const segs = takhrijSegmentsInScope(found, range);
  const inRange = (t: { start: number; end: number }) =>
    range === undefined || (t.start >= range.start && t.end <= range.end);
  const scoped = found.terms.filter((t) => segs.includes(t.segment));
  const picked = scoped.filter(inRange);
  const terms = picked.map((t) => ({
    kind: t.kind,
    char_start: t.start,
    char_end: t.end,
    gloss: TAKHRIJ_TERM_GLOSS[t.kind],
  }));
  const weak = terms.some((t) => NEGATIVE.has(t.kind));
  const base = { version: TAKHRIJ_TERMS_VERSION, mixed: false, weak, terms };
  if (!segs.some((s) => found.segments[s]!.takhrij))
    return { ...base, kind: "not_takhrij", text: NOT_TAKHRIJ };
  const status = takhrijStatus(
    picked.map((t) => t.kind),
    [],
    takhrijStatusContext(found, segs, range, (s) => picked.filter((t) => t.segment === s)),
  );
  if (status.kind !== "terms" && scoped.some((t) => !inRange(t) && t.kind !== "rujukan"))
    return { ...base, kind: "sources_only", text: RANGE_WITHOUT_TERMS };
  return { ...base, ...status };
}

/**
 * Segmen catatan kaki yang dilabeli: segmen pertama, atau yang beririsan dengan `range` (bagian
 * yang disitasi). Dipakai label kode dan label tinjauan supaya cakupannya sama.
 */
export function takhrijSegmentsInScope(
  found: TakhrijTerms,
  range?: { start: number; end: number },
): number[] {
  return found.segments
    .map((seg, s) => ({ seg, s }))
    .filter(({ seg, s }) =>
      range === undefined ? s === 0 : seg.start < range.end && range.start < seg.end,
    )
    .map(({ s }) => s);
}

/**
 * Konteks teks status dari segmen: menyebut sumber, "berbeda per jalur" hanya bila satu hadits
 * (segmen) memuat penilaian positif dan negatif, dan catatan bila catatan kaki memuat beberapa
 * hadits.
 */
export function takhrijStatusContext(
  found: TakhrijTerms,
  segs: readonly number[],
  range: { start: number; end: number } | undefined,
  kindsIn: (segment: number) => readonly { kind: TakhrijTermKind }[],
): StatusContext {
  const many = found.segments.length > 1;
  return {
    sources: segs.some((s) => found.segments[s]!.sources),
    mixed: segs.some((s) => isMixed(kindsIn(s).map((t) => t.kind))),
    tail: !many ? "" : range === undefined ? FIRST_OF_MANY : segs.length > 1 ? MANY : "",
  };
}

interface StatusContext {
  /** Takhrij menyebut sumber riwayat (teks rujukan menyebutnya juga). */
  sources?: boolean;
  /** Menimpa `mixed` dari daftar jenis (dihitung per hadits). */
  mixed?: boolean;
  /** Keterangan di akhir teks status. */
  tail?: string;
}

const isMixed = (all: readonly TakhrijTermKind[]) =>
  all.some((k) => POSITIVE.has(k)) && all.some((k) => NEGATIVE.has(k));

/**
 * Teks status dari jenis istilah (urut kemunculan; duplikat diabaikan), dibuat kode. Dipakai label
 * kode dan label koreksi penilai (X07), supaya keduanya disusun dengan aturan yang sama. `added` =
 * jenis yang DITETAPKAN penilai tanpa istilah baku di teks: disebut terpisah sebagai "…, menurut
 * peninjau", tidak pernah sebagai isi takhrij (bahasa atribusi, ADR-070; bunyi ADR-111).
 */
export function takhrijStatus(
  list: readonly TakhrijTermKind[],
  added: readonly TakhrijTermKind[] = [],
  ctx: StatusContext = {},
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
  const many = ctx.tail ?? "";
  if (kinds.length === 0 && extra.length === 0)
    return refersBack
      ? {
          kind: "refers_back",
          text: `${ctx.sources ? SOURCES_REFERS_BACK : REFERS_BACK}${many}`,
          mixed: false,
        }
      : { kind: "sources_only", text: `${SOURCES_ONLY}${many}`, mixed: false };
  const mixed = ctx.mixed ?? isMixed([...kinds, ...extra]);
  const items = [
    ...kinds.map((k) => ({ k, added: false })),
    ...extra.map((k) => ({ k, added: true })),
  ];
  // "X; Y, menurut takhrij al-'Iraqi; Z, menurut peninjau". Bila terpotong, "dan lainnya" masuk
  // kelompok terakhir hanya bila semua sisanya sekelompok, supaya atribusinya tidak keliru.
  const render = (n: number) => {
    const shown = items.slice(0, n);
    const rest = items.slice(n);
    const last = shown.at(-1)!.added;
    const inGroup = rest.length > 0 && rest.every((i) => i.added === last);
    const group = (added: boolean, by: string) => {
      const list = shown.filter((i) => i.added === added);
      if (list.length === 0) return [];
      const more = inGroup && added === last ? MORE : "";
      return [`${list.map((i) => TAKHRIJ_TERM_GLOSS[i.k]).join("; ")}${more}${by}`];
    };
    const body = [...group(false, BY_TAKHRIJ), ...group(true, BY_REVIEWER)].join("; ");
    if (rest.length === 0 || inGroup) return body;
    // Sisanya hanya jenis tambahan penilai, padahal belum ada yang tampil: atribusinya tetap disebut.
    return rest.every((i) => i.added) ? `${body}${MORE}${BY_REVIEWER}` : `${body}${MORE}`;
  };
  // Istilah pertama selalu masuk: bila ruangnya tidak cukup, keterangan "beberapa hadits" lalu
  // "berbeda per jalur" yang dipangkas lebih dulu. Istilah berikutnya hanya masuk bila teksnya
  // (dengan "dan lainnya" bila masih ada sisa) tetap ≤ batas.
  const tails = [`${mixed ? MIXED : ""}${many}`, mixed ? MIXED : "", ""];
  const tail = tails.find((x) => render(1).length + x.length <= TAKHRIJ_STATUS_MAX) ?? "";
  let n = 1;
  while (n < items.length && render(n + 1).length + tail.length <= TAKHRIJ_STATUS_MAX) n++;
  const text = render(n);
  return { kind: "terms", mixed, text: `${text}${tail}` };
}
