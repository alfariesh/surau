"use client";

import { useEffect, useRef } from "react";

import type { OrbDot, OrbRole, OrbShape, OrbState } from "./orb-frames";
import { REST_TIME, STAGE_SHAPE, orbFrame } from "./orb-frames";

// Orb tahap Tanya (ADR-072): satu orb yang berganti bentuk per tahap Jawab, dengan peralihan silang
// (bentuk lama mengecil dan memudar, bentuk baru tumbuh). Kanvas 2D biasa. Warna dibaca dari variabel
// tema (`--foreground`, `--accent`, `--ornament-gold`), jadi ikut terang/gelap/sepia; dibaca ulang saat
// kelas tema di <html> berubah. Berhenti saat tidak terlihat atau tab tersembunyi; dengan
// `prefers-reduced-motion` hanya satu bingkai diam per bentuk. Dekoratif (aria-hidden): teks tahap di
// sebelahnya yang dibacakan.

const FADE = 0.45;
/** `enterFrom`: tahan bentuk awal selama transisi terbang (sama dengan `::view-transition-group(tanya-orb)`). */
const ENTER_HOLD = 0.55;

type Palette = Record<OrbRole, string>;

function readPalette(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const ink = v("--foreground") || css.color;
  return { ink, accent: v("--accent") || ink, gold: v("--ornament-gold") || ink };
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  dots: OrbDot[],
  size: number,
  palette: Palette,
  alpha: number,
  scale: number,
) {
  const c = size / 2;
  for (const d of dots) {
    ctx.globalAlpha = Math.min(1, Math.max(0, d.a * alpha));
    ctx.fillStyle = palette[d.role];
    ctx.beginPath();
    ctx.arc(
      c + d.x * size * scale,
      c + d.y * size * scale,
      Math.max(0.5, d.r * size * scale),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

export function TanyaOrb({
  stage,
  size = 40,
  enterFrom,
}: {
  stage: OrbState;
  size?: number;
  /** Mulai dari bentuk keadaan lain lalu beralih (mis. hilal yang "terbang" ke balasan pertama). */
  enterFrom?: OrbState;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const shape = STAGE_SHAPE[stage] ?? "sathr";
  // Peralihan dibaca tiap bingkai lewat ref, jadi pergantian tahap tidak memulai ulang loop.
  // Waktu tiap bentuk dihitung sejak tahapnya mulai, jadi Untai selalu mulai dari nol butir emas.
  const anim = useRef<{
    shape: OrbShape;
    since: number;
    prev: OrbShape | null;
    prevSince: number;
    prevAlpha: number;
  }>({
    shape: enterFrom ? (STAGE_SHAPE[enterFrom] ?? shape) : shape,
    since: -1,
    prev: null,
    prevSince: 0,
    prevAlpha: 1,
  });
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    const a = anim.current;
    if (a.shape === shape) return;
    const now = performance.now() / 1000;
    // Mount dengan `enterFrom` (since belum diisi): bentuk awal mulai sekarang dan bertahan selama
    // terbang, baru kemudian beralih.
    const entering = a.since < 0;
    // Berganti lagi di tengah peralihan: bentuk lama memudar dari opasitasnya saat itu, bukan dari penuh.
    a.prevAlpha = a.prev === null ? 1 : Math.min(1, Math.max(0, (now - a.since) / FADE));
    a.prev = a.shape;
    a.prevSince = entering ? now : a.since;
    a.shape = shape;
    a.since = now + (entering ? ENTER_HOLD : 0);
    redraw.current();
  }, [shape]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    let palette = readPalette(canvas);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    if (anim.current.since < 0) anim.current.since = performance.now() / 1000;

    const paint = (now: number) => {
      const a = anim.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const time = (s: OrbShape, since: number) =>
        reduced ? REST_TIME[s] : Math.max(0, now - since);
      const p = reduced || a.prev === null ? 1 : Math.min(1, Math.max(0, (now - a.since) / FADE));
      if (p < 1 && a.prev !== null) {
        const fade = a.prevAlpha * (1 - p);
        drawDots(
          ctx,
          orbFrame(a.prev, time(a.prev, a.prevSince)),
          size,
          palette,
          fade,
          1 - 0.15 * p,
        );
      }
      drawDots(ctx, orbFrame(a.shape, time(a.shape, a.since)), size, palette, p, 0.85 + 0.15 * p);
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let running = false;
    let visible = true;
    const loop = () => {
      paint(performance.now() / 1000);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    // Tanpa loop (gerak dikurangi, tak terlihat): langsung ke bentuk akhir, tanpa peralihan setengah jadi.
    redraw.current = () => {
      if (running) return;
      anim.current.prev = null;
      paint(performance.now() / 1000);
    };

    paint(performance.now() / 1000);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && document.visibilityState !== "hidden") start();
      else stop();
    });
    io.observe(canvas);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onMotion = () => {
      reduced = motion.matches;
      if (reduced) {
        stop();
        paint(performance.now() / 1000);
      } else if (visible && document.visibilityState !== "hidden") start();
    };
    motion.addEventListener("change", onMotion);
    // Tema (next-themes) memasang kelas di <html>: baca ulang warna saat berganti.
    const mo = new MutationObserver(() => {
      palette = readPalette(canvas);
      redraw.current();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      stop();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      redraw.current = () => {};
    };
  }, [size]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="shrink-0"
      data-orb-shape={shape}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
