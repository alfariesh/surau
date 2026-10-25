"use client";

import { Button, Typography } from "@heroui/react";
import NextLink from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { ArabicInline } from "../arabic";
import { listen as listenText } from "../../i18n/id/listen";
import {
  Cancel01,
  GoBackward15Sec,
  GoForward15Sec,
  Headphones,
  Next,
  Pause,
  Play,
  Previous,
} from "../../icons";
import { listen } from "./engine";
import type { ListenState } from "./engine";
import { formatClock } from "./track";

const t = listenText;

/**
 * Kontrol layar kunci / headset (Media Session): metadata berlabel suara AI, putar/jeda, ±15 dtk,
 * bab = gagasan (berikut/sebelum), lompat posisi, dan `setPositionState` untuk bilah waktu sistem.
 */
function useMediaSession(s: ListenState): void {
  const track = s.track;
  useEffect(() => {
    if (track === null || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: t.mediaTitle(track.title),
      artist: track.voice.kind === "ai" ? t.mediaArtist : t.mediaArtistHuman(track.voice.name),
      album: track.workTitle,
      artwork: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => listen.play(track)],
      ["pause", () => listen.pause()],
      ["seekbackward", (d) => listen.skip(-(d.seekOffset ?? 15))],
      ["seekforward", (d) => listen.skip(d.seekOffset ?? 15)],
      ["previoustrack", () => listen.chapter(-1)],
      ["nexttrack", () => listen.chapter(1)],
      ["seekto", (d) => d.seekTime !== undefined && listen.seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Aksi tidak didukung peramban ini.
      }
    }
    return () => {
      // Pemutar ditutup: kontrol layar kunci tidak menyisakan Intisari lama.
      ms.metadata = null;
      ms.playbackState = "none";
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // idem
        }
      }
    };
  }, [track]);
  useEffect(() => {
    if (track === null || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = s.playing ? "playing" : "paused";
    const duration = s.duration || track.duration;
    if (duration > 0 && "setPositionState" in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: s.rate,
        position: Math.min(s.time, duration),
      });
    }
  }, [track, s.playing, s.time, s.duration, s.rate]);
}

/** Pemutar mini global (X17): tampil sesudah Dengarkan ditekan, tetap ada saat pindah halaman. */
export function MiniPlayer() {
  const s = useSyncExternalStore(listen.subscribe, listen.get, listen.getServer);
  useMediaSession(s);
  const track = s.track;
  if (track === null) return null;
  const duration = s.duration || track.duration;
  const chapter = s.chapter < 0 ? t.intro : t.chapter(s.chapter + 1, track.chapters.length);
  const chapterTitle = s.chapter < 0 ? null : track.chapters[s.chapter]?.title;
  return (
    <section
      aria-label={t.player}
      className="bg-surface border-separator fixed inset-x-2 bottom-2 z-40 flex flex-col gap-2 rounded-2xl border p-3 shadow-lg md:right-4 md:left-auto md:w-md"
      data-listen-player=""
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-accent mt-0.5 shrink-0">
          <Headphones className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <NextLink className="text-foreground truncate text-sm font-medium" href={track.href}>
            {track.titleLang === "ar" ? <ArabicInline>{track.title}</ArabicInline> : track.title}
          </NextLink>
          <Typography className="truncate" color="muted" type="body-xs">
            <span data-listen-chapter="">{chapter}</span>
            {chapterTitle ? ` · ${chapterTitle}` : ""} ·{" "}
            {t.voiceOf(track.voice.kind, track.voice.name)}
          </Typography>
        </div>
        <Button
          isIconOnly
          aria-label={t.close}
          size="sm"
          variant="ghost"
          onPress={() => listen.close()}
        >
          <Cancel01 aria-hidden className="size-4" />
        </Button>
      </div>
      <input
        aria-label={t.progress}
        aria-valuetext={t.progressText(formatClock(s.time), formatClock(duration))}
        className="accent-accent w-full"
        max={Math.max(1, Math.floor(duration))}
        min={0}
        step={1}
        type="range"
        value={Math.floor(s.time)}
        onChange={(e) => listen.seek(Number(e.currentTarget.value))}
      />
      {s.error ? (
        <Typography className="text-danger" type="body-xs">
          {t.error}
        </Typography>
      ) : null}
      <div className="text-muted -mt-1 flex justify-between text-xs tabular-nums" aria-hidden>
        <span>{formatClock(s.time)}</span>
        <span>{formatClock(duration)}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          <Button
            isIconOnly
            aria-label={t.previous}
            size="sm"
            variant="ghost"
            onPress={() => listen.chapter(-1)}
          >
            <Previous aria-hidden className="size-4" />
          </Button>
          <Button
            isIconOnly
            aria-label={t.back15}
            size="sm"
            variant="ghost"
            onPress={() => listen.skip(-15)}
          >
            <GoBackward15Sec aria-hidden className="size-4" />
          </Button>
          <Button
            isIconOnly
            aria-label={s.playing ? t.pause : t.play}
            onPress={() => listen.toggle()}
          >
            {s.playing ? (
              <Pause aria-hidden className="size-5" />
            ) : (
              <Play aria-hidden className="size-5" />
            )}
          </Button>
          <Button
            isIconOnly
            aria-label={t.forward15}
            size="sm"
            variant="ghost"
            onPress={() => listen.skip(15)}
          >
            <GoForward15Sec aria-hidden className="size-4" />
          </Button>
          <Button
            isIconOnly
            aria-label={t.next}
            size="sm"
            variant="ghost"
            onPress={() => listen.chapter(1)}
          >
            <Next aria-hidden className="size-4" />
          </Button>
        </div>
        <Button
          aria-label={t.speed(s.rate)}
          className="tabular-nums"
          size="sm"
          variant="secondary"
          onPress={() => listen.nextRate()}
        >
          {t.speedShort(s.rate)}
        </Button>
      </div>
    </section>
  );
}
