"use client";

import { Button, Typography } from "@heroui/react";
import { useId, useSyncExternalStore } from "react";

import { listen as listenText } from "../../i18n/id/listen";
import { Pause, Play } from "../../icons";
import { listen } from "./engine";
import { savedPosition } from "./store";
import type { ListenTrack } from "./track";

const t = listenText;
const noopSubscribe = () => () => {};

/**
 * Tombol ▶ Dengarkan satu Intisari (X17). Menekan memanggil `listen.play` langsung di handler
 * (syarat iOS). Labelnya menyebut suara AI (docs/05 §12); "Lanjutkan" bila ada posisi tersimpan.
 */
export function PlayButton({ track }: { track: ListenTrack }) {
  const s = useSyncExternalStore(listen.subscribe, listen.get, listen.getServer);
  const saved = useSyncExternalStore(
    noopSubscribe,
    () => savedPosition(track),
    () => 0,
  );
  const mine = s.track?.key === track.key;
  const playing = mine && s.playing;
  const minutes = Math.max(1, Math.round(track.duration / 60));
  const action = playing ? t.pause : (mine ? s.time : saved) > 0 ? t.resume : t.play;
  const caption = useId();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {/* Nama tombol = teks yang terlihat (WCAG 2.5.3); label suara AI jadi deskripsinya. */}
      <Button
        aria-describedby={caption}
        data-listen-button={track.id}
        size="sm"
        variant="secondary"
        onPress={() => (mine ? listen.toggle() : listen.play(track))}
      >
        {playing ? (
          <Pause aria-hidden className="size-4" />
        ) : (
          <Play aria-hidden className="size-4" />
        )}
        {action} <span aria-hidden>·</span> {t.minutes(minutes)}
      </Button>
      <Typography color="muted" id={caption} type="body-xs">
        {t.voiceOf(track.voice.kind, track.voice.name)}
      </Typography>
    </span>
  );
}
