import { audioTrackRow } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import {
  audioManifest,
  audioManifestTrack,
  audioObjectKey,
  emptyAudioManifest,
  selectAudioTracks,
} from "./audio-manifest.ts";
import type { AudioManifestTrack } from "./audio-manifest.ts";
import {
  alignmentFits,
  alignmentJson,
  alignmentObjectKey,
  audioAlignment,
} from "./audio-alignment.ts";

const FILE = "f".repeat(64);
const SCRIPT = "e".repeat(64);

const track = (extra: Partial<AudioManifestTrack> = {}): AudioManifestTrack => {
  const sha256 = extra.sha256 ?? FILE;
  const node = extra.toc_node_id ?? 100074;
  return audioManifestTrack.parse({
    toc_node_id: node,
    lang: "id",
    voice_kind: "ai",
    r2_key: audioObjectKey("ihya", "id", node, sha256),
    sha256,
    bytes: 4096,
    duration_ms: 90_000,
    provider: "elevenlabs",
    voice_id: "voice-uji",
    voice_name: "Narator Uji",
    model: "eleven_v4",
    output_format: "mp3_44100_64",
    script_sha256: SCRIPT,
    script_version: 1,
    spoken_version: 1,
    lexicon_version: "0123456789ab",
    style: "polos",
    chapters: [
      { point_ord: 1, start_ms: 9_000 },
      { point_ord: 2, start_ms: 41_000 },
    ],
    characters: 1200,
    created_at: "2026-10-25T01:00:00.000Z",
    ...extra,
  });
};

describe("audio manifest (X17)", () => {
  test("kunci objek memuat karya, bahasa, node, dan sidik isi berkas", () => {
    expect(audioObjectKey("ihya", "id", 100074, FILE)).toBe("ihya/id/100074-ffffffffffff.mp3");
    expect(() => track({ r2_key: "ihya/id/100074-000000000000.mp3" })).toThrow(/sidik isi/u);
    expect(() => track({ r2_key: "ihya/id/100075-ffffffffffff.mp3" })).toThrow(/sidik isi/u);
  });

  test("model hanya untuk suara AI; bab urut dan di dalam durasi", () => {
    expect(() => track({ model: null })).toThrow(/model/u);
    expect(() => track({ voice_kind: "human" })).toThrow(/model/u);
    expect(track({ voice_kind: "human", model: null }).model).toBeNull();
    expect(() =>
      track({
        chapters: [
          { point_ord: 2, start_ms: 41_000 },
          { point_ord: 1, start_ms: 9_000 },
        ],
      }),
    ).toThrow(/urut/u);
    expect(() => track({ chapters: [{ point_ord: 1, start_ms: 90_000 }] })).toThrow(/durasi/u);
  });

  test("manifest kosong valid; asal media wajib https", () => {
    const empty = emptyAudioManifest("ihya", 1, "https://media.surau.org", "surau-media");
    expect(audioManifest.parse(empty)).toEqual(empty);
    expect(() => audioManifest.parse({ ...empty, media_origin: "http://media.surau.org" })).toThrow(
      /media_origin/u,
    );
  });

  test("hanya track dengan sha skrip yang cocok dimuat; terbaru menang per node", () => {
    const manifest = {
      ...emptyAudioManifest("ihya", 1, "https://media.surau.org", "surau-media"),
      tracks: [
        track(),
        track({ sha256: "a".repeat(64), created_at: "2026-10-26T00:00:00.000Z" }),
        track({ sha256: "b".repeat(64), created_at: "2026-10-24T00:00:00.000Z" }),
        track({ toc_node_id: 100075, sha256: "c".repeat(64), script_sha256: "d".repeat(64) }),
        track({ toc_node_id: 100076, sha256: "d".repeat(64) }),
      ],
    };
    const scripts = new Map([
      ["100074:id", SCRIPT],
      ["100075:id", "0".repeat(64)],
    ]);
    const { rows, dropped } = selectAudioTracks(manifest, scripts);
    expect(rows.map((r) => r.r2_key)).toEqual(["ihya/id/100074-aaaaaaaaaaaa.mp3"]);
    expect(dropped).toEqual([
      { r2_key: "ihya/id/100074-ffffffffffff.mp3", reason: "superseded" },
      { r2_key: "ihya/id/100074-bbbbbbbbbbbb.mp3", reason: "superseded" },
      { r2_key: "ihya/id/100075-cccccccccccc.mp3", reason: "stale_script" },
      { r2_key: "ihya/id/100076-dddddddddddd.mp3", reason: "no_digest" },
    ]);
    // Skrip gagal dibangun → gugur sebagai script_error; waktu dibandingkan sebagai waktu.
    const failed = selectAudioTracks(
      {
        ...manifest,
        tracks: [
          track({ sha256: "1".repeat(64), created_at: "2026-10-25T01:00:00.500Z" }),
          track({ sha256: "2".repeat(64), created_at: "2026-10-25T01:00:01Z" }),
          track({ toc_node_id: 100076, sha256: "3".repeat(64) }),
        ],
      },
      scripts,
      new Set(["100076:id"]),
    );
    expect(failed.rows.map((r) => r.r2_key)).toEqual(["ihya/id/100074-222222222222.mp3"]);
    expect(failed.dropped.map((d) => d.reason)).toEqual(["superseded", "script_error"]);
    // Baris lolos skema `audio_track` korpus (bab sebagai JSON, tanpa alignment).
    expect(audioTrackRow.parse(rows[0])).toEqual(rows[0]);
    expect(rows[0]).toMatchObject({ mime: "audio/mpeg", alignment_key: null });
  });
});

describe("timestamps per kalimat (X18)", () => {
  const ALIGN = {
    r2_key: "ihya/id/100074-aaaaaaaaaaaa.align.json",
    sha256: "a".repeat(64),
    bytes: 512,
    method: "forced_alignment" as const,
  };

  test("track lama tanpa alignment tetap valid (null); alignment_key ikut ke baris korpus", () => {
    expect(track().alignment).toBeNull();
    const t = track({ alignment: ALIGN });
    const { rows } = selectAudioTracks(
      { ...emptyAudioManifest("ihya", 1, "https://media.surau.org", "surau-media"), tracks: [t] },
      new Map([["100074:id", SCRIPT]]),
    );
    expect(rows[0]?.alignment_key).toBe(ALIGN.r2_key);
    expect(audioTrackRow.parse(rows[0])).toEqual(rows[0]);
  });

  test("objek timestamps harus di karya, bahasa, dan node yang sama", () => {
    expect(() =>
      track({ alignment: { ...ALIGN, r2_key: "ihya/id/100075-aaaaaaaaaaaa.align.json" } }),
    ).toThrow(/node yang sama/u);
    expect(() => track({ alignment: { ...ALIGN, r2_key: "ihya/id/100074-aaaa.json" } })).toThrow(
      /r2_key/u,
    );
  });

  test("objek: kunci bersidik isi, kalimat urut waktu, bentuk sejajar skrip", () => {
    expect(alignmentObjectKey("ihya", "id", 100074, "b".repeat(64))).toBe(
      "ihya/id/100074-bbbbbbbbbbbb.align.json",
    );
    const base = {
      format: 1,
      audio_sha256: FILE,
      script_sha256: SCRIPT,
      method: "tts_timestamps",
    } as const;
    const ok = audioAlignment.parse({
      ...base,
      segments: [[[0, 1200], null], [[1900, 4000]]],
    });
    expect(alignmentFits(ok, { segments: [{ sentences: ["a", "b"] }, { sentences: ["c"] }] })).toBe(
      true,
    );
    expect(alignmentFits(ok, { segments: [{ sentences: ["a"] }, { sentences: ["c"] }] })).toBe(
      false,
    );
    expect(() =>
      audioAlignment.parse({
        ...base,
        segments: [
          [
            [2000, 2500],
            [1000, 1500],
          ],
        ],
      }),
    ).toThrow(/urut/u);
    expect(() => audioAlignment.parse({ ...base, segments: [[[2000, 1000]]] })).toThrow(/akhir/u);
    expect(JSON.parse(alignmentJson(ok))).toEqual(ok);
  });
});
