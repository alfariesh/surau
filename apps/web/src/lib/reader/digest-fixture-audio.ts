import { AUDIO_ALIGNMENT_FORMAT, digestScript } from "@surau/core";
import type { AudioAlignment, DigestView } from "@surau/core";

import { followTargets } from "../../components/listen/follow-targets";
import type { FollowData } from "../../components/listen/follow-targets";
import type { ListenTrack } from "../../components/listen/track";

// Audio + timestamps BUATAN untuk pratinjau /dev/intisari (X18): audio sunyi `/dev/dengar/sunyi.mp3`
// dan waktu kalimat yang dihitung dari panjang kalimat skrip fixture, supaya sorotan kalimat,
// gulir, dan ketuk-untuk-lompat bisa dilihat dan diuji e2e tanpa ElevenLabs dan media.surau.org.
// Hanya di `next dev` dan Preview (`DEV_PAGES`), seperti halaman /dev/*.

/** Batas audio sunyi buatan (detik). */
const MAX_SECONDS = 300;
const START_MS = 400;
const GAP_SENTENCE_MS = 250;
const GAP_SEGMENT_MS = 700;

export interface FixtureListen {
  track: ListenTrack;
  follow: FollowData;
  alignment: AudioAlignment;
}

export async function fixtureListen(digest: DigestView, section: boolean): Promise<FixtureListen> {
  const script = await digestScript(digest);
  const chars = script.segments.reduce(
    (n, s) => n + s.sentences.reduce((m, x) => m + x.length, 0),
    0,
  );
  const gaps =
    START_MS +
    script.segments.reduce((n, s) => n + s.sentences.length * GAP_SENTENCE_MS + GAP_SEGMENT_MS, 0);
  // ±60 ms per karakter, diperkecil bila fixture lebih panjang dari audio sunyi maksimal.
  const perChar = Math.min(60, ((MAX_SECONDS - 2) * 1000 - gaps) / chars);
  let t = START_MS;
  const chapters: ListenTrack["chapters"] = [];
  const segments = script.segments.map((seg) => {
    if (seg.kind === "point" && seg.point_ord !== null) {
      const title = digest.points.find((p) => p.ord === seg.point_ord)?.title ?? "";
      chapters.push({ point_ord: seg.point_ord, start: t / 1000, title });
    }
    const spans = seg.sentences.map((s): [number, number] => {
      const span: [number, number] = [t, t + Math.round(s.length * perChar)];
      t = span[1] + GAP_SENTENCE_MS;
      return span;
    });
    t += GAP_SEGMENT_MS;
    return spans;
  });
  const seconds = Math.ceil(t / 1000) + 1;
  const node = digest.section.id;
  const key = `uji/id/${node}-${(section ? "b" : "a").repeat(12)}.mp3`;
  return {
    track: {
      id: `uji/${node}`,
      key,
      src: `/dev/dengar/sunyi.mp3?d=${seconds}`,
      title: section ? "Bab Uji" : "Kitab Uji",
      titleLang: "id",
      workTitle: "Kitab Uji",
      href: section ? "/dev/intisari?tier=section" : "/dev/intisari",
      duration: seconds,
      voice: { kind: "ai", name: "Narator Uji" },
      chapters,
    },
    follow: {
      trackKey: key,
      src: `/dev/intisari/sorotan.json${section ? "?tier=section" : ""}`,
      targets: followTargets(script),
    },
    alignment: {
      format: AUDIO_ALIGNMENT_FORMAT,
      audio_sha256: "0".repeat(64),
      script_sha256: script.sha256,
      method: "forced_alignment",
      segments,
    },
  };
}
