// T-17 tahap 3 (X04): pengukuran mutu terjemahan AI tanpa bias, sesuai pra-registrasi
// `data/reports/ihya-9472-t17-tahap3.md`. Modul murni: strata, penarikan sampel (seed tetap), urutan
// tampil acak, interval Wilson, estimasi tertimbang, dan aturan keputusan. Halaman nilai dan
// berkas sampel dibuat t17-cli.ts.
import { z } from "zod";

import { mulberry32, samplePages } from "./qa-sample.ts";

/** Seed pra-registrasi (jangan diganti sesudah sampel terlihat). */
export const T17_SEED = 20261021;
/** Seed urutan tampil di halaman nilai. */
export const T17_ORDER_SEED = 20261121;
export const T17_PER_STRATUM = 20;

export const T17_STRATA = [
  { key: "pendek", min: 0, max: 99 },
  { key: "sedang", min: 100, max: 499 },
  { key: "panjang", min: 500, max: Number.POSITIVE_INFINITY },
] as const;
export type T17Stratum = (typeof T17_STRATA)[number]["key"];

export const T17_GRADES = ["B", "K", "S"] as const;
export type T17Grade = (typeof T17_GRADES)[number];

/** Kategori kesalahan (kode pendek, dipakai halaman nilai dan laporan). */
export const T17_CATEGORIES = {
  negasi: "makna terbalik/negasi",
  pelaku: "pelaku tertukar",
  istilah: "istilah fikih/tasawuf",
  hilang: "bagian hilang",
  tambahan: "tambahan yang tidak ada di teks",
  angka: "nama/angka/satuan",
  dalil: "ayat/hadits",
  lain: "lainnya",
} as const;
export type T17Category = keyof typeof T17_CATEGORIES;

export function stratumOf(arabicLength: number): T17Stratum {
  const s = T17_STRATA.find((x) => arabicLength >= x.min && arabicLength <= x.max);
  if (s === undefined) throw new RangeError(`panjang tidak sah: ${arabicLength}`);
  return s.key;
}

export interface T17Item {
  /** Nomor tampil (1…60, urutan acak). */
  no: number;
  /** passage.id */
  passage: number;
  stratum: T17Stratum;
}

/** Urutan acak berseed (Fisher–Yates mulberry32) atas salinan terurut naik. */
export function shuffled<T>(items: readonly T[], seed: number, key: (x: T) => number): T[] {
  const out = [...items].sort((a, b) => key(a) - key(b));
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Sampel lanjutan pra-registrasi (aturan keputusan 1, klarifikasi 2026-10-21): 13/14/13, seed 20261024 + k. */
export const T17_FOLLOWUP_SEED = 20261024;
export const T17_FOLLOWUP_PER_STRATUM = [13, 14, 13] as const;

/**
 * Tarik sampel berstrata (20 per strata, seed + indeks strata), lalu urutkan acak untuk tampil.
 * `exclude` = ID yang dikeluarkan dari populasi tarikan (sampel lanjutan: 20 ID pertama tiap strata,
 * ditambah sampel uji X21); `population` yang dilaporkan tetap seluruh populasi (bobot strata).
 */
export function drawT17Sample(
  population: readonly { passage: number; length: number }[],
  seed = T17_SEED,
  perStratum: number | readonly number[] = T17_PER_STRATUM,
  exclude: ReadonlySet<number> = new Set(),
): { items: T17Item[]; population: Record<T17Stratum, number> } {
  const byStratum = new Map<T17Stratum, number[]>(T17_STRATA.map((s) => [s.key, []]));
  for (const row of population) byStratum.get(stratumOf(row.length))!.push(row.passage);
  const picked: { passage: number; stratum: T17Stratum }[] = [];
  T17_STRATA.forEach((s, k) => {
    const n = typeof perStratum === "number" ? perStratum : (perStratum[k] as number);
    const pool = byStratum.get(s.key)!.filter((id) => !exclude.has(id));
    for (const passage of samplePages(pool, n, seed + k)) {
      picked.push({ passage, stratum: s.key });
    }
  });
  const order = shuffled(picked, T17_ORDER_SEED, (x) => x.passage);
  return {
    items: order.map((x, i) => ({ no: i + 1, ...x })),
    population: Object.fromEntries(
      T17_STRATA.map((s) => [s.key, byStratum.get(s.key)!.length]),
    ) as Record<T17Stratum, number>,
  };
}

/** Interval skor Wilson 95% untuk proporsi `p` dari `n` (n boleh pecahan: n efektif). */
export function wilson(p: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 1];
  const z2 = z * z;
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export interface T17GradeRow {
  no: number;
  grade: T17Grade;
  categories: T17Category[];
  note: string;
}

export interface T17Proportion {
  p: number;
  lo: number;
  hi: number;
}

export interface T17Report {
  graded: number;
  perStratum: Record<
    T17Stratum,
    { n: number; benar: T17Proportion; kurang: T17Proportion; salah: T17Proportion }
  >;
  weighted: { benar: T17Proportion; kurang: T17Proportion; salah: T17Proportion };
  categories: Record<T17Category, number>;
  decision: "lolos" | "lolos-belum-pasti" | "terarah" | "luas" | "belum-lengkap";
}

/** Laporan sesuai pra-registrasi: per strata, tertimbang bobot populasi, dan aturan keputusan. */
export function t17Report(
  items: readonly T17Item[],
  population: Record<T17Stratum, number>,
  grades: readonly T17GradeRow[],
): T17Report {
  const byNo = new Map(grades.map((g) => [g.no, g]));
  const total = T17_STRATA.reduce((sum, s) => sum + population[s.key], 0);
  const perStratum = {} as T17Report["perStratum"];
  const weightedParts = {
    benar: [] as number[][],
    kurang: [] as number[][],
    salah: [] as number[][],
  };
  for (const s of T17_STRATA) {
    const rows = items.filter((i) => i.stratum === s.key).flatMap((i) => byNo.get(i.no) ?? []);
    const n = rows.length;
    const share = (g: T17Grade) => (n === 0 ? 0 : rows.filter((r) => r.grade === g).length / n);
    const prop = (p: number): T17Proportion => {
      const [lo, hi] = wilson(p, n);
      return { p, lo, hi };
    };
    perStratum[s.key] = {
      n,
      benar: prop(share("B")),
      kurang: prop(share("K")),
      salah: prop(share("S")),
    };
    const w = population[s.key] / total;
    weightedParts.benar.push([w, share("B"), n]);
    weightedParts.kurang.push([w, share("K"), n]);
    weightedParts.salah.push([w, share("S"), n]);
  }
  const weighted = (parts: number[][]): T17Proportion => {
    const p = parts.reduce((sum, [w, q]) => sum + (w as number) * (q as number), 0);
    const variance = parts.reduce(
      (sum, [w, q, n]) =>
        sum +
        (n === 0 ? 0 : ((w as number) ** 2 * (q as number) * (1 - (q as number))) / (n as number)),
      0,
    );
    const graded = parts.reduce((sum, [, , n]) => sum + (n as number), 0);
    const nEff = variance === 0 ? graded : Math.min(graded, (p * (1 - p)) / variance);
    const [lo, hi] = wilson(p, nEff);
    return { p, lo, hi };
  };
  const report: T17Report["weighted"] = {
    benar: weighted(weightedParts.benar),
    kurang: weighted(weightedParts.kurang),
    salah: weighted(weightedParts.salah),
  };
  const categories = Object.fromEntries(
    Object.keys(T17_CATEGORIES).map((c) => [
      c,
      grades.filter((g) => g.categories.includes(c as T17Category)).length,
    ]),
  ) as Record<T17Category, number>;
  const graded = items.filter((i) => byNo.has(i.no)).length;
  let decision: T17Report["decision"];
  if (graded < items.length) decision = "belum-lengkap";
  else if (report.benar.p >= 0.8 && report.salah.p <= 0.1)
    decision = report.salah.hi > 0.1 ? "lolos-belum-pasti" : "lolos";
  else if (report.salah.p <= 0.15) decision = "terarah";
  else decision = "luas";
  return { graded, perStratum, weighted: report, categories, decision };
}

const GRADE_WORDS: Record<string, T17Grade> = {
  b: "B",
  benar: "B",
  k: "K",
  kurang: "K",
  s: "S",
  salah: "S",
};

/** Berkas JSON "Unduh hasil" halaman nilai (divalidasi Zod; baris yang tidak sah = galat). */
export const t17ResultFile = z.object({
  sample: z.string().regex(/^[0-9a-f]{12}$/),
  rater: z.string().max(120),
  grades: z.array(
    z.strictObject({
      no: z.number().int().positive(),
      grade: z.enum(T17_GRADES),
      categories: z.array(z.enum(Object.keys(T17_CATEGORIES) as [T17Category, ...T17Category[]])),
      note: z.string().max(2000),
    }),
  ),
});

/**
 * Kesepakatan dua penilai atas nomor yang dinilai keduanya: persentase sama dan kappa Cohen
 * (tiga kelas B/K/S). `null` bila tidak ada nomor bersama.
 */
export function t17Agreement(
  a: readonly T17GradeRow[],
  b: readonly T17GradeRow[],
): { n: number; agree: number; kappa: number | null } | null {
  const byNo = new Map(b.map((g) => [g.no, g.grade]));
  const pairs = a.flatMap((g) => {
    const other = byNo.get(g.no);
    return other === undefined ? [] : [[g.grade, other] as const];
  });
  const n = pairs.length;
  if (n === 0) return null;
  const agree = pairs.filter(([x, y]) => x === y).length / n;
  const expected = T17_GRADES.reduce((sum, g) => {
    const pa = pairs.filter(([x]) => x === g).length / n;
    const pb = pairs.filter(([, y]) => y === g).length / n;
    return sum + pa * pb;
  }, 0);
  const kappa = expected === 1 ? null : (agree - expected) / (1 - expected);
  return { n, agree, kappa };
}

/**
 * Hasil penilai: JSON dari tombol "Unduh hasil" halaman nilai, atau teks dari "Salin hasil"
 * (satu baris per nomor: `12 K istilah,hilang — catatan`).
 */
export function parseT17Grades(input: string): {
  rater: string;
  grades: T17GradeRow[];
  /** Sidik sampel dari berkas hasil (bila ada), untuk dicocokkan dengan daftar sampel. */
  sample?: string;
} {
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) {
    const v = t17ResultFile.parse(JSON.parse(trimmed));
    return { rater: v.rater, grades: v.grades, sample: v.sample };
  }
  let rater = "";
  let sample: string | undefined;
  const grades: T17GradeRow[] = [];
  for (const line of trimmed.split("\n")) {
    const who = /penilai:\s*(.+)$/i.exec(line);
    if (who) rater = who[1]!.trim();
    const tag = /sampel ([0-9a-f]{12})/.exec(line);
    if (tag) sample = tag[1];
    const m = /^\s*(\d+)\s+(benar|kurang|salah|b|k|s)\b\s*([a-z,]*)\s*(?:—\s*(.*))?$/i.exec(line);
    if (!m) continue;
    const categories = (m[3] ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter((c): c is T17Category => c in T17_CATEGORIES);
    grades.push({
      no: Number(m[1]),
      grade: GRADE_WORDS[m[2]!.toLowerCase()]!,
      categories,
      note: (m[4] ?? "").trim(),
    });
  }
  return { rater, grades, ...(sample === undefined ? {} : { sample }) };
}
