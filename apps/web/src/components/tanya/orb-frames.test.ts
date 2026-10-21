import { describe, expect, it } from "vite-plus/test";

import type { JawabStage } from "../../lib/tanya/model";
import type { OrbShape } from "./orb-frames";
import {
  REST_TIME,
  STAGE_SHAPE,
  STAGE_STEP,
  STAGE_TOTAL,
  UNTAI_BEADS,
  orbFrame,
  starPoint,
} from "./orb-frames";

const STAGES: JawabStage[] = ["route", "retrieve", "answer", "retry", "verify"];
const SHAPES = Object.keys(REST_TIME) as OrbShape[];

describe("orb tahap Tanya", () => {
  it("setiap tahap punya bentuk dan nomor langkah", () => {
    for (const s of STAGES) {
      expect(SHAPES).toContain(STAGE_SHAPE[s]);
      expect(STAGE_STEP[s]).toBeGreaterThanOrEqual(1);
      expect(STAGE_STEP[s]).toBeLessThanOrEqual(STAGE_TOTAL);
    }
    expect(new Set(STAGES.map((s) => STAGE_SHAPE[s])).size).toBe(STAGES.length);
  });

  it("semua titik tetap di dalam kanvas, berjari-jari dan beropasitas sah", () => {
    for (const shape of SHAPES) {
      for (let t = 0; t < 12; t += 0.137) {
        const dots = orbFrame(shape, t);
        expect(dots.length).toBeGreaterThan(5);
        for (const d of dots) {
          expect(Number.isFinite(d.x) && Number.isFinite(d.y)).toBe(true);
          expect(Math.abs(d.x) + d.r).toBeLessThan(0.5);
          expect(Math.abs(d.y) + d.r).toBeLessThan(0.5);
          expect(d.r).toBeGreaterThan(0);
          expect(d.a).toBeGreaterThanOrEqual(0);
          expect(d.a).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("deterministik: waktu sama, bingkai sama", () => {
    for (const shape of SHAPES) expect(orbFrame(shape, 3.21)).toEqual(orbFrame(shape, 3.21));
  });

  it("khatam: keliling bintang delapan tertutup dan simetris", () => {
    const [x0, y0] = starPoint(0);
    const [x1, y1] = starPoint(1);
    expect(x0).toBeCloseTo(x1, 9);
    expect(y0).toBeCloseTo(y1, 9);
    expect(x0).toBeCloseTo(0, 9);
    expect(y0).toBeCloseTo(-0.3, 9);
    // setiap seperdelapan putaran jatuh di puncak (jari-jari luar), di antaranya lekuk dalam
    for (let k = 0; k < 8; k++) {
      const [x, y] = starPoint(k / 8);
      expect(Math.hypot(x, y)).toBeCloseTo(0.3, 9);
      const [ix, iy] = starPoint(k / 8 + 1 / 16);
      expect(Math.hypot(ix, iy)).toBeLessThan(0.3);
    }
  });

  it("untai: butir emas (sudah diperiksa) bertambah satu per satu", () => {
    const gold = (t: number) => orbFrame("untai", t).filter((d) => d.role === "gold").length;
    expect(gold(0.01)).toBe(0);
    expect(gold(0.31)).toBe(1);
    expect(gold(0.3 * UNTAI_BEADS + 0.01)).toBe(UNTAI_BEADS);
  });

  it("bingkai diam untai tidak terbaca 'sudah diperiksa'", () => {
    const gold = orbFrame("untai", REST_TIME.untai).filter((d) => d.role === "gold").length;
    expect(gold).toBeLessThanOrEqual(1);
  });

  it("bingkai diam (gerak dikurangi) memperlihatkan aksen", () => {
    for (const shape of SHAPES) {
      const roles = new Set(orbFrame(shape, REST_TIME[shape]).map((d) => d.role));
      expect(roles.has("accent") || roles.has("gold")).toBe(true);
    }
  });
});
