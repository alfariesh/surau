// Mesin pemutar "Dengarkan" (X17): satu HTMLAudioElement untuk seluruh situs, dibuat saat pertama
// kali ditekan. `play()` dipanggil SINKRON di handler tekan (iOS hanya mengizinkan audio dari gestur
// pengguna), dengan `preload="none"` supaya tidak ada unduhan sebelum ditekan. Hidup di modul (bukan
// state React) sehingga tetap berjalan saat pembaca pindah halaman; komponen membaca lewat
// `useSyncExternalStore(listen.subscribe, listen.get)`. Modul ini sengaja kecil (masuk JS awal);
// tampilan pemutar dan Media Session dimuat terpisah (`mini-player.tsx`, next/dynamic).
import { RATES, clearCurrent, readListen, savePosition, savedPosition, saveRate } from "./store";
import { chapterAt, chapterTarget } from "./track";
import type { ListenTrack } from "./track";

export interface ListenState {
  track: ListenTrack | null;
  playing: boolean;
  /** Detik. */
  time: number;
  duration: number;
  rate: number;
  /** Indeks bab (-1 = pembuka). */
  chapter: number;
  error: boolean;
}

const INITIAL: ListenState = {
  track: null,
  playing: false,
  time: 0,
  duration: 0,
  rate: 1,
  chapter: -1,
  error: false,
};

let state = INITIAL;
let audio: HTMLAudioElement | null = null;
let pendingSeek: number | null = null;
let lastSaved = 0;
let restoring = false;
const listeners = new Set<() => void>();

function set(patch: Partial<ListenState>): void {
  state = { ...state, ...patch };
  if (state.track !== null) state = { ...state, chapter: chapterAt(state.track, state.time) };
  for (const l of listeners) l();
}

function persist(force = false): void {
  const track = state.track;
  if (track === null) return;
  if (!force && Math.abs(state.time - lastSaved) < 5) return;
  lastSaved = state.time;
  savePosition(track, state.time);
}

function element(): HTMLAudioElement {
  if (audio !== null) return audio;
  const el = new Audio();
  el.preload = "none";
  el.addEventListener("loadedmetadata", () => {
    if (pendingSeek !== null && pendingSeek > 0) el.currentTime = pendingSeek;
    pendingSeek = null;
    if (Number.isFinite(el.duration) && el.duration > 0) set({ duration: el.duration });
  });
  el.addEventListener("timeupdate", () => {
    set({ time: el.currentTime });
    persist();
  });
  el.addEventListener("play", () => set({ playing: true, error: false }));
  el.addEventListener("pause", () => {
    set({ playing: false });
    persist(true);
  });
  el.addEventListener("ended", () => {
    // Selesai didengar: berikutnya mulai dari awal, dan tidak dipulihkan sesudah muat ulang.
    set({ playing: false, time: 0 });
    persist(true);
    clearCurrent();
  });
  el.addEventListener("error", () => set({ playing: false, error: true }));
  audio = el;
  return el;
}

/** Siapkan track tanpa memutar (posisi tersimpan dipakai saat diputar). */
function load(track: ListenTrack, time: number): void {
  if (state.rate === INITIAL.rate) state = { ...state, rate: readListen().rate };
  set({ track, time, duration: track.duration, error: false });
  lastSaved = time;
}

function seek(t: number): void {
  const track = state.track;
  if (track === null) return;
  const to = Math.min(Math.max(0, t), state.duration || track.duration);
  if (audio !== null && audio.src !== "" && audio.readyState > 0) audio.currentTime = to;
  else pendingSeek = to;
  set({ time: to });
  persist(true);
}

export const listen = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: (): ListenState => state,
  getServer: (): ListenState => INITIAL,

  /** Putar track (dipanggil langsung di handler tekan). */
  play: (track: ListenTrack): void => {
    const el = element();
    const src = new URL(track.src, window.location.href).href;
    // Sesudah galat (luring, media tidak terjangkau), menekan lagi memuat ulang dari posisi terakhir.
    const failed = state.error || el.error !== null;
    if (state.track?.key !== track.key || el.src !== src || failed) {
      const same = state.track?.key === track.key;
      if (!same) persist(true);
      load(track, same ? state.time : savedPosition(track));
      pendingSeek = state.time;
      el.src = src;
    }
    el.playbackRate = state.rate;
    el.play().catch(() => set({ playing: false }));
  },
  toggle: (): void => {
    if (state.track === null) return;
    if (state.playing) audio?.pause();
    else listen.play(state.track);
  },
  pause: (): void => {
    audio?.pause();
  },
  seek,
  skip: (seconds: number): void => {
    seek(state.time + seconds);
  },
  chapter: (delta: 1 | -1): void => {
    if (state.track === null) return;
    const to = chapterTarget(state.track, state.time, delta);
    if (to !== null) seek(to);
  },
  setRate: (rate: number): void => {
    if (!RATES.includes(rate as (typeof RATES)[number])) return;
    if (audio !== null) audio.playbackRate = rate;
    saveRate(rate);
    set({ rate });
  },
  /** Kecepatan berikutnya dalam daftar (berputar). */
  nextRate: (): void => {
    const i = RATES.indexOf(state.rate as (typeof RATES)[number]);
    listen.setRate(RATES[(i + 1) % RATES.length] as number);
  },
  close: (): void => {
    audio?.pause();
    persist(true);
    clearCurrent();
    if (audio !== null) {
      audio.removeAttribute("src");
      audio.load();
    }
    state = INITIAL;
    for (const l of listeners) l();
  },
  /**
   * Pulihkan pemutar sesudah muat ulang (tanpa memutar): data track diambil lagi dari
   * `…/intisari/dengar.json`; bila audionya sudah berganti atau hilang, sesi tidak dipulihkan.
   */
  restore: async (): Promise<void> => {
    if (state.track !== null || restoring) return;
    const saved = readListen();
    const id = saved.current;
    if (id === null) return;
    const position = saved.positions[id];
    const [work, node] = id.split("/") as [string, string];
    restoring = true;
    try {
      const res = await fetch(`/kitab/${work}/bab/${node}/intisari/dengar.json`);
      if (!res.ok) {
        if (res.status === 404) clearCurrent();
        return;
      }
      const track = (await res.json()) as ListenTrack;
      // Selama menunggu, pemutar bisa saja sudah ditutup atau track lain diputar.
      if (state.track !== null || readListen().current !== id) return;
      if (position === undefined || position.key !== track.key) return;
      load(track, position.t);
    } catch {
      // Luring atau galat jaringan: pemutar tidak dipulihkan kali ini.
    } finally {
      restoring = false;
    }
  },
};
