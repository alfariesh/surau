"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// Cerita simulasi landing (ADR-096): langkah 0..n diputar berulang (atas permintaan pemilik), dengan
// jeda `hold` di langkah terakhir sebelum mulai lagi, hanya selama elemen terlihat; keluar layar = berhenti,
// terlihat lagi = mulai dari awal. "Kurangi gerakan" atau tanpa IntersectionObserver: langsung langkah
// terakhir, diam.
export function useStory(
  ref: RefObject<HTMLElement | null>,
  durations: readonly number[],
  hold = 3500,
): { step: number } {
  const last = durations.length;
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };

  const play = useCallback(
    function run() {
      clear();
      setStep(0);
      let at = 0;
      durations.forEach((ms, i) => {
        at += ms;
        timers.current.push(window.setTimeout(() => setStep(i + 1), at));
      });
      timers.current.push(window.setTimeout(run, at + hold));
    },
    [durations, hold],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still =
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      // Keadaan akhir diam (lewat timer, bukan setState sinkron di effect).
      timers.current.push(window.setTimeout(() => setStep(last), 0));
      return clear;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) play();
        else clear();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [last, play, ref]);

  return { step };
}

/** Teks yang "diketik" selama `ms` sesudah `active` menyala; penuh bila `done`, kosong sebelum `active`. */
export function useTyped(text: string, active: boolean, done: boolean, ms = 1100): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (done || !active) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setN(Math.round(text.length * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, done, ms, text]);
  if (done) return text;
  return active ? text.slice(0, n) : "";
}
