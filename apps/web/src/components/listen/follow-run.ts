// Logika sorotan kalimat audio Intisari (X18, ADR-102), dimuat malas oleh `ListenFollow` saat audio
// halaman ini dimuat pemutar:
// - timestamps per kalimat diambil dari objek `.align.json` (bucket media, immutable) dan
//   dipasangkan dengan target kalimat halaman (urutan sama, dijamin sha skrip saat ingest);
// - kalimat aktif disorot dengan CSS Custom Highlight API (`::highlight(surau-dengar)`): Range di
//   atas teks yang sudah ada, DOM dan teks tidak diubah (pola sorotan Cari);
// - halaman menggulir mengikuti kalimat aktif selama diputar, kecuali pembaca baru saja menggulir
//   sendiri (5 detik), dan tanpa animasi bila `prefers-reduced-motion`;
// - mengetuk teks yang dibacakan melompatkan audio ke awal kalimat itu (bukan di tautan, tombol, atau
//   saat memilih teks). Papan ketik tetap memakai kontrol pemutar (±15 dtk, bab).
// Browser tanpa Highlight API: gulir dan ketuk tetap jalan, tanpa sorotan.
import { rangesFor, textOffset } from "../../lib/text-ranges";

import { listen } from "./engine";
import type { FollowData, FollowTarget } from "./follow-targets";

export const FOLLOW_HIGHLIGHT = "surau-dengar";
/** Jeda sesudah pembaca menggulir sendiri sebelum halaman kembali mengikuti audio (ms). */
const USER_SCROLL_PAUSE_MS = 5000;
/** Atribut di <html> selama sorotan aktif (kursor penunjuk di teks yang bisa diketuk). */
const ACTIVE_ATTR = "data-listen-follow";
/** Run yang sedang memegang sorotan dan atribut: run lama yang berhenti belakangan tidak mencabutnya. */
let owner: object | null = null;

type Span = [number, number] | null;

/** `segments` objek timestamps (format 1) menjadi daftar datar, atau null bila bentuknya salah. */
export function flatSpans(json: unknown): Span[] | null {
  if (typeof json !== "object" || json === null) return null;
  const { format, segments } = json as { format?: unknown; segments?: unknown };
  if (format !== 1 || !Array.isArray(segments)) return null;
  const out: Span[] = [];
  for (const seg of segments) {
    if (!Array.isArray(seg)) return null;
    for (const s of seg) {
      if (s === null) out.push(null);
      else if (
        Array.isArray(s) &&
        s.length === 2 &&
        Number.isFinite(s[0]) &&
        Number.isFinite(s[1])
      ) {
        out.push([s[0] as number, s[1] as number]);
      } else return null;
    }
  }
  return out;
}

/**
 * Indeks kalimat yang sedang dibacakan pada `ms`: kalimat terakhir yang sudah mulai. Sesudah
 * kalimat selesai, sorotannya bertahan selama jeda menuju kalimat berikutnya (tidak berkedip).
 */
export function activeIndex(spans: readonly Span[], ms: number): number {
  let found = -1;
  for (const [i, s] of spans.entries()) {
    if (s === null) continue;
    if (s[0] > ms) break;
    found = i;
  }
  return found;
}

/** Indeks kalimat yang target-nya memuat posisi `pos` di field `say`, atau -1. */
export function targetAt(targets: readonly (FollowTarget | null)[], say: string, pos: number) {
  return targets.findIndex((t) => t !== null && t.say === say && t.start <= pos && pos < t.end);
}

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const p = doc.caretPositionFromPoint?.(x, y);
  if (p) return { node: p.offsetNode, offset: p.offset };
  const r = doc.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** Range halaman untuk satu target: dipotong per elemen `data-say` (paragraf berpindah `data-say-at`). */
function rangesOf(target: FollowTarget): Range[] {
  const out: Range[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(`[data-say="${target.say}"]`)) {
    const at = Number(el.dataset.sayAt ?? 0);
    const length = el.textContent?.length ?? 0;
    const start = Math.max(target.start, at) - at;
    const end = Math.min(target.end, at + length) - at;
    if (start < end) out.push(...rangesFor(el, [{ start, end }]));
  }
  return out;
}

/** Mulai sorotan; mengembalikan fungsi berhenti, atau null bila timestamps tidak bisa dipakai. */
export async function startFollow(data: FollowData): Promise<(() => void) | null> {
  let spans: Span[] | null = null;
  let scriptSha: string | null = null;
  try {
    const res = await fetch(data.src);
    if (res.ok) {
      const json: unknown = await res.json();
      spans = flatSpans(json);
      const sha = (json as { script_sha256?: unknown }).script_sha256;
      scriptSha = typeof sha === "string" ? sha : null;
    }
  } catch {
    // Luring atau media tidak terjangkau: audio tetap jalan, tanpa sorotan.
  }
  if (spans === null || spans.length !== data.targets.length) return null;
  // Timestamps milik skrip lain (jumlah kalimat kebetulan sama) tidak dipakai.
  if (scriptSha !== null && scriptSha !== data.scriptSha) return null;
  const timed = spans;
  const highlights = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights : null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = -2;
  let userScrollAt = 0;
  const run = {};
  owner = run;
  document.documentElement.setAttribute(ACTIVE_ATTR, "");

  const follow = (ranges: readonly Range[]) => {
    const rect = ranges[0]?.getBoundingClientRect();
    if (rect === undefined || (rect.width === 0 && rect.height === 0)) return;
    if (Date.now() - userScrollAt < USER_SCROLL_PAUSE_MS) return;
    // Pita baca: di bawah kepala situs, di atas pemutar mini (fixed di bawah).
    const top = 96;
    const bottom = window.innerHeight - 160;
    if (rect.top >= top && rect.bottom <= bottom) return;
    window.scrollBy({
      top: rect.top - window.innerHeight * 0.33,
      behavior: reduced.matches ? "auto" : "smooth",
    });
  };

  const update = () => {
    const state = listen.get();
    if (state.track?.key !== data.trackKey || owner !== run) return;
    const index = activeIndex(timed, state.time * 1000);
    if (index === current) return;
    current = index;
    const target = index >= 0 ? data.targets[index] : null;
    const ranges = target ? rangesOf(target) : [];
    if (highlights !== null) {
      if (ranges.length > 0) highlights.set(FOLLOW_HIGHLIGHT, new Highlight(...ranges));
      else highlights.delete(FOLLOW_HIGHLIGHT);
    }
    if (state.playing && ranges.length > 0) follow(ranges);
  };

  const onUserScroll = () => {
    userScrollAt = Date.now();
  };
  const onKey = (e: KeyboardEvent) => {
    // Tombol yang sama di kontrol (putar, slider posisi) bukan gulir manual.
    if ((e.target as Element | null)?.closest?.("button, input, select, textarea, [role=slider]"))
      return;
    if (["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(e.key))
      userScrollAt = Date.now();
  };
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const el = (e.target as Element | null)?.closest<HTMLElement>("[data-say]");
    if (!el || (e.target as Element).closest("a, button, input, select, textarea, summary")) return;
    if (!(window.getSelection()?.isCollapsed ?? true)) return;
    const caret = caretAt(e.clientX, e.clientY);
    if (caret === null) return;
    const local = textOffset(el, caret.node, caret.offset);
    if (local === null) return;
    const index = targetAt(data.targets, el.dataset.say!, Number(el.dataset.sayAt ?? 0) + local);
    const span = index >= 0 ? timed[index] : null;
    if (!span || owner !== run) return;
    listen.seek(span[0] / 1000);
  };

  const unsubscribe = listen.subscribe(update);
  window.addEventListener("wheel", onUserScroll, { passive: true });
  window.addEventListener("touchmove", onUserScroll, { passive: true });
  window.addEventListener("keydown", onKey);
  document.addEventListener("click", onClick);
  update();
  return () => {
    unsubscribe();
    window.removeEventListener("wheel", onUserScroll);
    window.removeEventListener("touchmove", onUserScroll);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onClick);
    if (owner !== run) return;
    owner = null;
    document.documentElement.removeAttribute(ACTIVE_ATTR);
    highlights?.delete(FOLLOW_HIGHLIGHT);
  };
}
