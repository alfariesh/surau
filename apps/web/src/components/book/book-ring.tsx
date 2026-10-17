"use client";

import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";

import NextLink from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Book } from "./book";

// Rak putar (BookRing): buku berdiri melingkar dengan punggung menghadap keluar; buku terdepan
// berputar menghadap pembaca dan maju, seperti ditarik dari rak. Diputar dengan seret (momentum +
// berhenti tepat di satu buku), gulir horizontal, panah (arah RTL: ← = berikutnya), atau Tab ke
// tautan buku. Klik buku di belakang memutarnya ke depan; klik buku terdepan membukanya. Animasi
// hanya berjalan saat bergerak (berhenti di luar layar / tab tersembunyi). Kurang dari 3 buku atau
// "kurangi gerakan" → rak datar biasa (deretan Book bertautan).
//
// Diadaptasi dari pola "circular carousel" (preset cylinder/orbit): bedanya buku adalah benda padat
// (tanpa potongan melengkung), memudar ke warna kertas, dan sampulnya CSS (tanpa memuat gambar).

export interface BookRingItem {
  key: string;
  href: string;
  /** Nama aksesibel tautan, mis. "Buka kitab Ihya' 'Ulum ad-Din". */
  label: string;
  /** Warna sampul (token/warna CSS). */
  color: string;
  title: ReactNode;
  subtitle?: ReactNode;
  spine?: ReactNode;
  illustration?: ReactNode;
  /** Keterangan di bawah rak saat buku ini di depan. */
  caption: ReactNode;
}

export interface BookRingProps {
  items: readonly BookRingItem[];
  /** Nama wilayah rak untuk pembaca layar. */
  label: string;
  /** "dari" untuk penghitung "3 dari 10" (pembaca layar). */
  ofLabel: string;
  bookWidth?: number;
  /** Detik antar-putaran otomatis (satu buku per langkah); 0 = diam. */
  interval?: number;
  className?: string;
}

const TO_RAD = Math.PI / 180;
const SPRING = 118;
const SETTLE = 9;
const DRAG_THRESHOLD = 5;
const TILT = -9;
const PERSPECTIVE = 1500;
const DEPTH_FADE = 0.7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
const smooth = (t: number) => t * t * (3 - 2 * t);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function BookRing({
  items,
  label,
  ofLabel,
  bookWidth = 140,
  interval = 4,
  className,
}: BookRingProps) {
  const reduced = usePrefersReducedMotion();
  if (items.length < 3 || reduced) {
    return (
      <ul aria-label={label} className={className ? `book-shelf ${className}` : "book-shelf"}>
        {items.map((item) => (
          <li key={item.key}>
            <NextLink aria-label={item.label} className="book-shelf__link" href={item.href}>
              <Book
                color={item.color}
                direction="rtl"
                illustration={item.illustration}
                subtitle={item.subtitle}
                title={item.title}
                width={bookWidth}
              />
            </NextLink>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Ring
      bookWidth={bookWidth}
      className={className}
      items={items}
      label={label}
      ofLabel={ofLabel}
      interval={interval}
    />
  );
}

function Ring({
  items,
  label,
  ofLabel,
  bookWidth,
  interval,
  className,
}: Required<Omit<BookRingProps, "className">> & { className?: string }) {
  const count = items.length;
  const step = 360 / count;
  const W = bookWidth;
  const H = (W * 60) / 49;
  const depth = W * 0.29;
  // Lingkar: tiap buku butuh tebal + celah di keliling; jari-jari minimal ±lebar buku supaya
  // sampul yang tegak lurus keliling tidak saling tembus di tengah.
  const radius = Math.max((count * (depth + W * 0.16)) / (2 * Math.PI), W * 1.05);
  const pull = W * 0.9;

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const bookRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wakeRef = useRef<() => void>(() => {});
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const stateRef = useRef({
    angle: 0,
    velocity: 0,
    target: null as number | null,
    hover: false,
    drag: false,
    press: null as null | {
      id: number;
      x: number;
      y: number;
      angle: number;
      moved: boolean;
      samples: { t: number; a: number }[];
    },
    holdUntil: 0,
    suppressClick: false,
    fit: 1,
    last: 0,
  });

  const geometry = useRef({ step, radius, pull, count, interval });
  useLayoutEffect(() => {
    geometry.current = { step, radius, pull, count, interval };
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const ring = ringRef.current;
    if (!root || !stage || !ring) return undefined;
    const state = stateRef.current;
    let raf = 0;
    let visible = true;

    const nearest = (a: number) => Math.round(a / geometry.current.step) * geometry.current.step;

    const measure = () => {
      const g = geometry.current;
      const width = root.getBoundingClientRect().width;
      if (!width) return;
      const needed = 2 * (g.radius + W * 0.5) + W * 0.6;
      state.fit = Math.min(1, (width * 0.96) / needed);
      stage.style.transform = `scale(${state.fit})`;
    };

    const render = () => {
      const g = geometry.current;
      ring.style.transform = `translateZ(${-g.radius}px) rotateX(${TILT}deg) rotateY(${state.angle}deg)`;
      for (let i = 0; i < g.count; i++) {
        const el = bookRefs.current[i];
        if (!el) continue;
        // Buku berikutnya di kiri (sudut negatif): rak berputar ke kanan, arah baca Arab.
        const base = -i * g.step;
        const world = wrap(base + state.angle);
        // 1 = tepat di depan, 0 = sudah lewat satu langkah.
        const p = smooth(clamp(1 - Math.abs(world) / g.step, 0, 1));
        const turn = -90 * (1 - p) - world * p;
        el.style.transform = `rotateY(${base}deg) translateZ(${g.radius + p * g.pull}px) rotateY(${turn}deg)`;
        const facing = Math.cos(world * TO_RAD);
        el.style.setProperty("--ring-fade", (DEPTH_FADE * ((1 - facing) / 2) ** 1.2).toFixed(3));
        el.style.zIndex = String(Math.round(facing * 100) + 100);
      }
      const index = ((Math.round(state.angle / g.step) % g.count) + g.count) % g.count;
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    };

    // Putaran otomatis bertahap: setelah diam `interval` detik, maju satu buku lalu berhenti
    // tepat menghadap. Jeda ditunggu dengan timer (bukan rAF) supaya tidak menggambar saat diam.
    let stepTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleStep = (now: number) => {
      const g = geometry.current;
      clearTimeout(stepTimer);
      if (!g.interval) return;
      const wait = Math.max(g.interval * 1000, state.holdUntil - now);
      stepTimer = setTimeout(() => {
        if (state.hover || state.drag || state.target !== null) {
          scheduleStep(performance.now());
          return;
        }
        state.target = nearest(state.angle) + geometry.current.step;
        wake();
      }, wait);
    };

    const advance = (dt: number) => {
      if (state.drag) return true;
      if (state.target !== null) {
        const damping = 2 * Math.sqrt(SPRING);
        let left = dt;
        while (left > 0) {
          const h = Math.min(left, 1 / 240);
          state.velocity += (SPRING * (state.target - state.angle) - damping * state.velocity) * h;
          state.angle += state.velocity * h;
          left -= h;
        }
        if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
          state.angle = state.target;
          state.velocity = 0;
          state.target = null;
          return false;
        }
        return true;
      }
      // Sisa momentum (gulir/seret) melambat, lalu berhenti tepat di satu buku.
      state.velocity *= Math.exp(-dt / 0.6);
      state.angle += state.velocity * dt;
      if (Math.abs(state.velocity) < SETTLE) state.target = nearest(state.angle);
      return true;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
      state.last = now;
      const busy = advance(dt);
      render();
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else {
        state.last = 0;
        if (!busy) scheduleStep(now);
      }
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        state.last = 0;
      } else wake();
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const perPixel = 180 / (Math.PI * geometry.current.radius * state.fit);
      state.target = null;
      state.angle -= event.deltaX * perPixel;
      state.velocity = -event.deltaX * perPixel * 30;
      state.holdUntil = performance.now() + 1600;
      wake();
    };

    const resize = new ResizeObserver(() => {
      measure();
      wake();
    });
    resize.observe(root);
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        state.last = 0;
      }
    });
    io.observe(root);
    root.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("visibilitychange", onVisibility);

    measure();
    render();
    wake();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stepTimer);
      resize.disconnect();
      io.disconnect();
      root.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [W]);

  useEffect(() => {
    wakeRef.current();
  });

  const focusIndex = useCallback((index: number) => {
    const state = stateRef.current;
    let target = index * geometry.current.step;
    target += 360 * Math.round((state.angle - target) / 360);
    state.target = target;
    state.holdUntil = performance.now() + 3000;
    wakeRef.current();
  }, []);

  const stepBy = (delta: number) => {
    const state = stateRef.current;
    const g = geometry.current;
    const base = state.target ?? Math.round(state.angle / g.step) * g.step;
    state.target = base + delta * g.step;
    state.holdUntil = performance.now() + 3000;
    wakeRef.current();
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const state = stateRef.current;
    state.suppressClick = false;
    if (event.button !== 0) return;
    state.press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: state.angle,
      moved: false,
      samples: [{ t: performance.now(), a: state.angle }],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = stateRef.current;
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (!press.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2 && event.pointerType !== "mouse") {
        state.press = null;
        return;
      }
      press.moved = true;
      press.x = event.clientX;
      state.drag = true;
      state.target = null;
      state.velocity = 0;
      setDragging(true);
      try {
        rootRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // abaikan: pointer sudah dilepas
      }
    }
    const perPixel = 180 / (Math.PI * geometry.current.radius * state.fit);
    state.angle = press.angle + (event.clientX - press.x) * perPixel;
    const now = performance.now();
    press.samples.push({ t: now, a: state.angle });
    while (press.samples.length > 2 && now - press.samples[0]!.t > 110) press.samples.shift();
    wakeRef.current();
  };

  const release = (event: PointerEvent<HTMLElement>) => {
    const state = stateRef.current;
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    state.press = null;
    if (!press.moved) return;
    state.drag = false;
    setDragging(false);
    state.suppressClick = true;
    const first = press.samples[0]!;
    const last = press.samples[press.samples.length - 1]!;
    const span = (last.t - first.t) / 1000;
    const velocity = span > 0.008 ? clamp((last.a - first.a) / span, -1400, 1400) : 0;
    state.velocity = velocity;
    state.target = Math.round((state.angle + velocity * 0.45) / step) * step;
    state.holdUntil = performance.now() + 3000;
    wakeRef.current();
  };

  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    const state = stateRef.current;
    if (state.suppressClick) {
      state.suppressClick = false;
      event.preventDefault();
      return;
    }
    if (index !== activeRef.current) {
      event.preventDefault();
      focusIndex(index);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Arah RTL: buku berikutnya datang dari kiri.
    if (event.key === "ArrowLeft") stepBy(1);
    else if (event.key === "ArrowRight") stepBy(-1);
    else if (event.key === "Home") focusIndex(0);
    else if (event.key === "End") focusIndex(count - 1);
    else return;
    event.preventDefault();
  };

  const current = items[active] ?? items[0]!;

  return (
    // Seret/panah dipasang di wadah (delegasi): yang bisa difokus dan diklik tetap tautan bukunya.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={rootRef}
      aria-label={label}
      aria-roledescription="carousel"
      className={className ? `book-ring ${className}` : "book-ring"}
      data-dragging={dragging || undefined}
      onKeyDown={onKeyDown}
      onPointerCancel={release}
      onPointerDown={onPointerDown}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") stateRef.current.hover = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") stateRef.current.hover = false;
        wakeRef.current();
      }}
      onPointerMove={onPointerMove}
      onPointerUp={release}
    >
      <div className="book-ring__viewport" style={{ perspective: `${PERSPECTIVE}px` }}>
        <div ref={stageRef} className="book-ring__stage">
          <div aria-hidden="true" className="book-ring__floor" style={{ width: radius * 2.6 }} />
          <div ref={ringRef} className="book-ring__ring">
            {items.map((item, index) => (
              <div
                key={item.key}
                ref={(el) => {
                  bookRefs.current[index] = el;
                }}
                className="book-ring__slot"
              >
                <NextLink
                  aria-label={item.label}
                  className="book-ring__book"
                  draggable={false}
                  href={item.href}
                  style={{
                    width: W,
                    height: H,
                    left: -W / 2,
                    top: -H / 2,
                    transform: `translateZ(${depth / 2}px)`,
                  }}
                  onClick={(e) => onLinkClick(e, index)}
                  onFocus={() => focusIndex(index)}
                >
                  <Book
                    color={item.color}
                    direction="rtl"
                    illustration={item.illustration}
                    spine={item.spine}
                    subtitle={item.subtitle}
                    title={item.title}
                    width={W}
                  />
                </NextLink>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="book-ring__caption">
        <div key={active} className="book-ring__caption-text">
          {current.caption}
        </div>
        <span className="book-ring__counter">
          {String(active + 1).padStart(2, "0")}
          <span className="book-ring__counter-sep">/</span>
          {String(count).padStart(2, "0")}
        </span>
      </div>
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        {`${current.label}, ${active + 1} ${ofLabel} ${count}`}
      </p>
    </section>
  );
}
