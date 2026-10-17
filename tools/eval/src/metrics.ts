// Metrik eval retrieval (docs/06-evaluasi.md): hit@k = porsi soal yang minimal satu lokasi
// benarnya muncul di k halaman teratas; MRR = rata-rata 1/peringkat lokasi benar pertama (0 bila
// tidak ada di DEPTH halaman yang diambil). Fungsi murni, tanpa D1.

/** Halaman yang diambil per soal (= batas `limit` searchText), jadi MRR di sini = MRR@50. */
export const DEPTH = 50;
export const KS = [1, 5, 10] as const;

/** Gerbang R2 (FASE.md, docs/06): lokasi benar ≥ 90% = hit@10 ≥ 0,9 atas set resmi. */
export const R2_GATE_HIT10 = 0.9;
/** Set resmi minimal 20 soal disetujui (T-12, FASE.md syarat R2). */
export const R2_MIN_OFFICIAL = 20;

/** Satu halaman hasil: ID halamannya dan node daftar isi paragraf yang cocok di halaman itu. */
export interface ResultPage {
  pageId: number;
  tocNodeIds: readonly number[];
}

/** Satu lokasi benar: halaman (rentang) dan/atau node daftar isi beserta turunannya. */
export interface GoldMatcher {
  label: string;
  pageIds: ReadonlySet<number>;
  tocNodeIds: ReadonlySet<number>;
}

export function matchesLocation(page: ResultPage, gold: GoldMatcher): boolean {
  return gold.pageIds.has(page.pageId) || page.tocNodeIds.some((id) => gold.tocNodeIds.has(id));
}

export interface Judgement {
  /** Peringkat (mulai 1) halaman pertama yang cocok dengan salah satu lokasi benar; null = tidak ada. */
  rank: number | null;
  /** Lokasi benar yang muncul di 10 teratas (untuk topik tersebar: berapa tempat yang terjangkau). */
  foundAt10: number;
}

export function judge(pages: readonly ResultPage[], golds: readonly GoldMatcher[]): Judgement {
  const rankIndex = pages.findIndex((p) => golds.some((g) => matchesLocation(p, g)));
  const top10 = pages.slice(0, 10);
  return {
    rank: rankIndex === -1 ? null : rankIndex + 1,
    foundAt10: golds.filter((g) => top10.some((p) => matchesLocation(p, g))).length,
  };
}

export interface Scores {
  n: number;
  hit1: number;
  hit5: number;
  hit10: number;
  mrr: number;
}

const hitAt = (rank: number | null, k: number) => rank !== null && rank <= k;

/** Agregat atas sekumpulan peringkat. Set kosong → semua 0 dengan n = 0 (ditampilkan "–"). */
export function aggregate(ranks: readonly (number | null)[]): Scores {
  const n = ranks.length;
  if (n === 0) return { n: 0, hit1: 0, hit5: 0, hit10: 0, mrr: 0 };
  const share = (k: number) => ranks.filter((r) => hitAt(r, k)).length / n;
  return {
    n,
    hit1: share(1),
    hit5: share(5),
    hit10: share(10),
    mrr: ranks.reduce<number>((s, r) => s + (r === null ? 0 : 1 / r), 0) / n,
  };
}

export function passesR2Gate(scores: Scores): boolean {
  return scores.n >= R2_MIN_OFFICIAL && scores.hit10 >= R2_GATE_HIT10;
}
