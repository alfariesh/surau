// Geometri orb tahap Tanya (ADR-072): satu bentuk per tahap Jawab, titik-titik tinta dengan satu aksen
// Zaitun pada bagian yang "hidup" dan emas ornamen untuk kutipan yang sudah diperiksa. Gagasan orb titik
// diadaptasi dari thinking-orbs (Jakub Antalik, MIT); bentuk dan kodenya ditulis ulang untuk Surau.
// Fungsi murni (bentuk, t detik) → titik di koordinat satuan berpusat (−0,5..0,5), jari-jari dalam satuan
// lebar orb; disetel untuk orb 40–48 px. Komponen `TanyaOrb` yang mengecat dan memberi warna dari tema.

import type { JawabStage } from "../../lib/tanya/model";

export type OrbRole = "ink" | "accent" | "gold";
export type OrbShape = "hilal" | "sathr" | "himpun" | "khatam" | "untai" | "anyam" | "segel";
/** Keadaan orb: tahap Jawab, ditambah `rest` (siap, belum ada pertanyaan) dan `done` (jawaban selesai). */
export type OrbState = JawabStage | "rest" | "done";

export interface OrbDot {
  x: number;
  y: number;
  r: number;
  /** Opasitas 0..1. */
  a: number;
  role: OrbRole;
}

/** Keadaan → bentuk orb. `retry` (model lain) memakai anyaman dua helai. */
export const STAGE_SHAPE: Record<OrbState, OrbShape> = {
  rest: "hilal",
  done: "segel",
  route: "sathr",
  retrieve: "himpun",
  answer: "khatam",
  retry: "anyam",
  verify: "untai",
};

/** Urutan tahap untuk penanda "Tahap n dari 4"; `retry` mengulang langkah menyusun jawaban. */
export const STAGE_STEP: Record<JawabStage, number> = {
  route: 1,
  retrieve: 2,
  answer: 3,
  retry: 3,
  verify: 4,
};
export const STAGE_TOTAL = 4;

/** Waktu (detik) untuk bingkai diam saat `prefers-reduced-motion`: bentuk paling terbaca. */
export const REST_TIME: Record<OrbShape, number> = {
  hilal: 1.5,
  segel: 0,
  sathr: 1.4,
  himpun: 1.9,
  khatam: 2.6,
  untai: 0.45,
  anyam: 0,
};

const TAU = Math.PI * 2;
const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const frac = (x: number) => x - Math.floor(x);

type Path = (u: number) => [number, number];

/** Garis tertutup lewat titik-titik → titik pada pecahan panjang `u` (0..1), jarak antartitik rata. */
function polyPath(pts: ReadonlyArray<readonly [number, number]>): Path {
  const len = pts.map((a, j) => {
    const b = pts[(j + 1) % pts.length]!;
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  const total = len.reduce((sum, l) => sum + l, 0);
  return (u) => {
    let rest = frac(u) * total;
    let j = 0;
    while (j < pts.length - 1 && rest > len[j]!) {
      rest -= len[j]!;
      j++;
    }
    const a = pts[j]!;
    const b = pts[(j + 1) % pts.length]!;
    const q = len[j] ? rest / len[j]! : 0;
    return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  };
}

// Sathr (baris): garis pindai menyapu baris-baris titik dari kanan ke kiri, seperti arah baca Arab;
// satu baris (bergantian per putaran) tetap menyala sesudah dilewati = bagian kitab yang dipilih.
function sathr(t: number): OrbDot[] {
  const rows = [1, 0.75, 1, 0.6];
  const period = 2.6;
  const scan = 0.32 - frac(t / period) * 0.64;
  const chosen = Math.floor(t / period) % rows.length;
  const dots: OrbDot[] = [];
  rows.forEach((len, i) => {
    const y = -0.18 + i * 0.12;
    for (let x = 0.24; x > 0.24 - 0.5 * len; x -= 0.085) {
      const glow = Math.exp(-(((x - scan) / 0.09) ** 2));
      const picked = i === chosen && x > scan;
      dots.push({
        x,
        y,
        r: 0.03 + glow * 0.012,
        a: picked ? 0.95 : 0.35 + glow * 0.65,
        role: picked || glow > 0.55 ? "accent" : "ink",
      });
    }
  });
  return dots;
}

// Himpun (kumpulkan): titik berserakan di lingkaran berkumpul menjadi blok paragraf rata kanan,
// lalu terurai lagi; titik yang sudah tiba menyala Zaitun.
function himpun(t: number): OrbDot[] {
  const n = 20;
  const cols = 5;
  const rows = n / cols;
  const f = frac(t / 3.4);
  const env = f < 0.45 ? f / 0.45 : f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25;
  const dots: OrbDot[] = [];
  for (let i = 0; i < n; i++) {
    const ang = i * 2.39996 + t * 0.15;
    const sx = Math.cos(ang) * 0.33;
    const sy = Math.sin(ang) * 0.33;
    const tx = 0.2 - (i % cols) * 0.1;
    const ty = (Math.floor(i / cols) - (rows - 1) / 2) * 0.11;
    const p = smooth(clamp01(env * 1.35 - (i / n) * 0.35));
    dots.push({
      x: sx + (tx - sx) * p,
      y: sy + (ty - sy) * p,
      r: 0.03,
      a: 0.35 + p * 0.6,
      role: p > 0.97 ? "accent" : "ink",
    });
  }
  return dots;
}

// Khatam: garis titik lingkaran → bintang delapan (dua persegi bertumpuk, girih/rub' al-hizb) → kembali,
// berputar pelan; "ujung pena" Zaitun berjalan di sepanjang garis, titik emas di pusat.
const STAR_OUTER = 0.3;
const STAR_INNER = STAR_OUTER * (Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8));
const STAR: Array<[number, number]> = Array.from({ length: 16 }, (_, j) => {
  const a = -Math.PI / 2 + (j * Math.PI) / 8;
  const r = j % 2 ? STAR_INNER : STAR_OUTER;
  return [Math.cos(a) * r, Math.sin(a) * r];
});
const STAR_LEN = STAR.map((a, j) => {
  const b = STAR[(j + 1) % 16]!;
  return Math.hypot(b[0] - a![0], b[1] - a![1]);
});
const STAR_TOTAL = STAR_LEN.reduce((s, l) => s + l, 0);

/** Titik pada keliling bintang di pecahan panjang `u` (0..1), mulai puncak, searah jarum jam. */
export function starPoint(u: number): [number, number] {
  let rest = frac(u) * STAR_TOTAL;
  let j = 0;
  while (j < 15 && rest > STAR_LEN[j]!) {
    rest -= STAR_LEN[j]!;
    j++;
  }
  const a = STAR[j]!;
  const b = STAR[(j + 1) % 16]!;
  const q = rest / STAR_LEN[j]!;
  return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
}

function khatam(t: number): OrbDot[] {
  const n = 24;
  const f = frac(t / 5);
  const m =
    f < 0.15
      ? 0
      : f < 0.4
        ? smooth((f - 0.15) / 0.25)
        : f < 0.85
          ? 1
          : 1 - smooth((f - 0.85) / 0.15);
  const rot = t * 0.25;
  const head = frac(t * 0.35);
  const dots: OrbDot[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const ca = -Math.PI / 2 + u * TAU;
    const [sx, sy] = starPoint(u);
    const px = Math.cos(ca) * 0.26 + (sx - Math.cos(ca) * 0.26) * m;
    const py = Math.sin(ca) * 0.26 + (sy - Math.sin(ca) * 0.26) * m;
    let dh = Math.abs(u - head);
    dh = Math.min(dh, 1 - dh);
    const pen = Math.exp(-((dh / 0.07) ** 2));
    dots.push({
      x: px * Math.cos(rot) - py * Math.sin(rot),
      y: px * Math.sin(rot) + py * Math.cos(rot),
      r: 0.028 + pen * 0.01,
      a: 0.4 + pen * 0.6,
      role: pen > 0.4 ? "accent" : "ink",
    });
  }
  dots.push({ x: 0, y: 0, r: 0.042 + 0.008 * Math.sin(t * 2), a: 0.9, role: "gold" });
  return dots;
}

// Untai (untaian): butir di lingkaran diperiksa satu per satu: butir yang sedang diperiksa membesar
// (Zaitun), yang sudah diperiksa menjadi emas; jeda sejenak saat penuh, lalu mulai lagi.
export const UNTAI_BEADS = 10;
const UNTAI_STEP = 0.3;
function untai(t: number): OrbDot[] {
  const cycle = UNTAI_BEADS + 3;
  const head = Math.floor(t / UNTAI_STEP) % cycle;
  const fr = frac(t / UNTAI_STEP);
  const dots: OrbDot[] = [];
  for (let i = 0; i < UNTAI_BEADS; i++) {
    const a = -Math.PI / 2 + (i / UNTAI_BEADS) * TAU;
    const done = i < head;
    const cur = i === head;
    dots.push({
      x: Math.cos(a) * 0.3,
      y: Math.sin(a) * 0.3,
      r: 0.05 * (cur ? 1.25 + 0.2 * Math.sin(fr * Math.PI) : 1),
      a: done ? 0.95 : cur ? 0.9 : 0.3,
      role: done ? "gold" : cur ? "accent" : "ink",
    });
  }
  return dots;
}

// Anyam (anyaman): dua helai, tinta dan Zaitun, saling menganyam di sekeliling lingkaran = jalur
// kedua (model lain). Helai yang "di depan" lebih besar dan pekat, dan dicat paling akhir.
function anyam(t: number): OrbDot[] {
  const n = 22;
  const dots: Array<OrbDot & { z: number }> = [];
  for (const [phase, role] of [
    [0, "ink"],
    [Math.PI, "accent"],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.5;
      const w = Math.sin(3 * a + phase + t * 1.6);
      const r = 0.26 + w * 0.05;
      dots.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        r: 0.028 * (1 + 0.35 * w),
        a: 0.4 + 0.5 * ((w + 1) / 2),
        role,
        z: w,
      });
    }
  }
  return dots.sort((p, q) => p.z - q.z).map(({ z: _z, ...d }) => d);
}

const SHAPES: Record<OrbShape, (t: number) => OrbDot[]> = {
  hilal,
  sathr,
  himpun,
  khatam,
  untai,
  anyam,
  segel,
};

// Hilal (siap): garis titik bulan sabit muda yang "bernapas" pelan (sedikit menebal dan menipis),
// dengan kilau Zaitun yang menyusuri lengkung luarnya. Tanda awal: siap menerima pertanyaan.
const HILAL_R = 0.3;
const HILAL_r = 0.26;
function hilalPath(dx: number): Path {
  // Titik potong lingkaran luar (pusat 0,0) dan lingkaran dalam (pusat dx,0).
  const ix = (HILAL_R ** 2 - HILAL_r ** 2 + dx ** 2) / (2 * dx);
  const iy = Math.sqrt(Math.max(0, HILAL_R ** 2 - ix ** 2));
  const t0 = Math.atan2(iy, ix);
  const p0 = Math.atan2(iy, ix - dx);
  const pts: Array<[number, number]> = [];
  const steps = 48;
  // Lengkung luar: dari potongan atas memutar lewat sisi kiri ke potongan bawah.
  for (let i = 0; i <= steps; i++) {
    const a = t0 + ((TAU - 2 * t0) * i) / steps;
    pts.push([Math.cos(a) * HILAL_R, Math.sin(a) * HILAL_R]);
  }
  // Lengkung dalam: dari potongan bawah kembali ke atas, juga lewat sisi kiri.
  for (let i = 1; i < steps; i++) {
    const a = TAU - p0 - ((TAU - 2 * p0) * i) / steps;
    pts.push([dx + Math.cos(a) * HILAL_r, Math.sin(a) * HILAL_r]);
  }
  return polyPath(pts);
}

function hilal(t: number): OrbDot[] {
  const n = 30;
  const dx = 0.13 + 0.025 * Math.sin((t / 6) * TAU);
  const path = hilalPath(dx);
  const tilt = -0.45;
  const glowAt = 0.08 + 0.42 * (0.5 + 0.5 * Math.sin((t / 4) * TAU));
  const dots: OrbDot[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const [px, py] = path(u);
    const x = px + 0.06;
    const glow = Math.exp(-(((u - glowAt) / 0.09) ** 2));
    dots.push({
      x: x * Math.cos(tilt) - py * Math.sin(tilt),
      y: x * Math.sin(tilt) + py * Math.cos(tilt),
      r: 0.028 + glow * 0.01,
      a: 0.45 + glow * 0.55,
      role: glow > 0.45 ? "accent" : "ink",
    });
  }
  return dots;
}

// Segel (selesai): bintang delapan utuh dan diam dengan pusat emas; tanda tangan kecil di bawah jawaban.
function segel(_t: number): OrbDot[] {
  const n = 24;
  const dots: OrbDot[] = Array.from({ length: n }, (_, i) => {
    const [x, y] = starPoint(i / n);
    return { x, y, r: 0.03, a: 0.7, role: "ink" as const };
  });
  dots.push({ x: 0, y: 0, r: 0.05, a: 0.95, role: "gold" });
  return dots;
}

// Bentuk digambar di lingkaran ±0,35; diperbesar supaya mengisi kanvas kecil tanpa terpotong.
const SPREAD = 1.15;

/** Titik-titik satu bentuk pada waktu `t` (detik), dalam urutan cat. */
export function orbFrame(shape: OrbShape, t: number): OrbDot[] {
  return SHAPES[shape](t).map((d) => ({ ...d, x: d.x * SPREAD, y: d.y * SPREAD, r: d.r * SPREAD }));
}
