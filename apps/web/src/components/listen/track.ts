// Data pemutar satu Intisari (X17): dibentuk server dari `DigestView.audio` (+ judul gagasan untuk
// bab), dikirim ke tombol Dengarkan dan `…/intisari/dengar.json`. Modul murni: aman diimpor server
// dan klien (tipe core hanya `import type`, jadi tidak ikut bundel klien).
import type { DigestView } from "@surau/core";

/** Domain kustom bucket R2 publik `surau-media` (ADR-097 butir 6; r2.dev dimatikan). */
export const MEDIA_ORIGIN = "https://media.surau.org";

export interface ListenChapter {
  point_ord: number;
  /** Detik mulai (bab = gagasan). */
  start: number;
  title: string;
}

export interface ListenTrack {
  /** `<karya>/<node>`: kunci posisi dengar. */
  id: string;
  /** Kunci objek R2: berubah bila audio dibuat ulang (posisi lama tidak dipakai lagi). */
  key: string;
  src: string;
  /** Judul Intisari (judul bagian). */
  title: string;
  workTitle: string;
  /** Halaman Intisari. */
  href: string;
  /** Detik. */
  duration: number;
  voice: { kind: "ai" | "human"; name: string };
  chapters: ListenChapter[];
}

export function listenTrack(
  view: DigestView,
  ctx: { work: string; title: string; href: string; mediaOrigin?: string },
): ListenTrack | null {
  const audio = view.audio;
  if (audio === null) return null;
  const titles = new Map(view.points.map((p) => [p.ord, p.title]));
  return {
    id: `${ctx.work}/${view.section.id}`,
    key: audio.r2_key,
    src: `${ctx.mediaOrigin ?? MEDIA_ORIGIN}/${audio.r2_key}`,
    title: ctx.title,
    workTitle: view.source.work.title_id ?? "",
    href: ctx.href,
    duration: audio.duration_ms / 1000,
    voice: { kind: audio.voice_kind, name: audio.voice_name },
    chapters: audio.chapters.map((c, i) => ({
      point_ord: c.point_ord,
      start: c.start_ms / 1000,
      title: titles.get(c.point_ord) ?? `Gagasan ${i + 1}`,
    })),
  };
}

/** Indeks bab pada detik `t`; -1 = pembuka (sebelum gagasan pertama). */
export function chapterAt(track: Pick<ListenTrack, "chapters">, t: number): number {
  let index = -1;
  for (const [i, c] of track.chapters.entries()) if (c.start <= t + 0.25) index = i;
  return index;
}

/**
 * Detik tujuan "bab berikut/sebelum": berikut = awal bab sesudahnya (atau tetap bila sudah bab
 * terakhir); sebelum = awal bab ini bila sudah lewat 3 detik, selain itu awal bab sebelumnya
 * (atau 0 = pembuka). Pola tombol "sebelumnya" pemutar musik.
 */
export function chapterTarget(
  track: Pick<ListenTrack, "chapters">,
  t: number,
  delta: 1 | -1,
): number | null {
  const i = chapterAt(track, t);
  if (delta === 1) return track.chapters[i + 1]?.start ?? null;
  const own = i >= 0 ? track.chapters[i]!.start : 0;
  if (t - own > 3) return own;
  return i - 1 >= 0 ? track.chapters[i - 1]!.start : 0;
}

/** "m:ss" atau "j:mm:ss". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
