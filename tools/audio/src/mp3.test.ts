import { describe, expect, test } from "vite-plus/test";

import { id3v2 } from "./id3.ts";
import { Mp3Error, joinMp3, parseMp3, samplesToMs, silentFrames } from "./mp3.ts";
import type { Mp3Format } from "./mp3.ts";

/** Format keluaran ElevenLabs `mp3_44100_64` (MPEG-1 Layer III, mono). */
const FORMAT: Mp3Format = {
  version: 1,
  sampleRate: 44100,
  channels: 1,
  bitrate: 64,
  samplesPerFrame: 1152,
};

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/** "Audio" buatan sepanjang ±ms: bingkai sah (sunyi) dengan format keluaran TTS. */
const fakeAudio = (ms: number, format = FORMAT) => concat(silentFrames(format, ms));

/** Bingkai info Xing/Info seperti tulisan LAME di awal berkas. */
function infoFrame(tag: "Xing" | "Info"): Uint8Array {
  const frame = silentFrames(FORMAT, 30)[0]!.slice();
  frame.set(new TextEncoder().encode(tag), 4 + 17);
  return frame;
}

describe("mp3", () => {
  test("bingkai sunyi CBR: panjang 208/209 byte mengikuti rata-rata 64 kbps", () => {
    const frames = silentFrames(FORMAT, 10_000);
    expect(frames).toHaveLength(383); // 10 dtk ÷ 26,12 ms
    const sizes = new Set(frames.map((f) => f.length));
    expect([...sizes].sort((a, b) => a - b)).toEqual([208, 209]);
    const bytes = frames.reduce((n, f) => n + f.length, 0);
    const seconds = (frames.length * 1152) / 44100;
    expect((bytes * 8) / seconds / 1000).toBeCloseTo(64, 1);
  });

  test("urai: lewati ID3v2, ID3v1, APE, dan bingkai info; hitung sampel", () => {
    const tag = id3v2({
      title: "t",
      artist: "a",
      album: "b",
      language: "ind",
      date: "2026-10-25",
      copyright: "2026 Surau, CC BY-NC-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      sourceUrl: "https://surau.org/",
      comment: "c",
      extra: {},
      encoder: "e",
    });
    const id3v1 = new Uint8Array(128);
    id3v1.set(new TextEncoder().encode("TAG"));
    const ape = new Uint8Array(32);
    ape.set(new TextEncoder().encode("APETAGEX"));
    new DataView(ape.buffer).setUint32(12, 32, true);
    const audio = fakeAudio(1000);
    const stream = parseMp3(concat([tag, infoFrame("Info"), audio, ape, id3v1]));
    expect(stream.format).toEqual(FORMAT);
    expect(stream.frames).toHaveLength(38);
    expect(samplesToMs(stream.samples, 44100)).toBe(993);
    expect(parseMp3(concat([infoFrame("Xing"), audio])).frames).toHaveLength(38);
  });

  test("tolak data bukan MP3, bingkai terpotong, format/bitrate berubah, reservoir bocor", () => {
    expect(() => parseMp3(Uint8Array.of(1, 2, 3, 4, 5))).toThrow(Mp3Error);
    expect(() => parseMp3(fakeAudio(100).subarray(0, 300))).toThrow(/terpotong/u);
    expect(() => parseMp3(new Uint8Array(0))).toThrow(/tidak ada bingkai/u);
    const other = fakeAudio(100, { ...FORMAT, sampleRate: 48000 });
    expect(() => parseMp3(concat([fakeAudio(100), other]))).toThrow(/format bingkai berubah/u);
    const vbr = fakeAudio(100, { ...FORMAT, bitrate: 128 });
    expect(() => parseMp3(concat([fakeAudio(100), vbr]))).toThrow(/bitrate tidak tetap/u);
    const borrowed = fakeAudio(100).slice();
    borrowed[4] = 0x80; // main_data_begin ≠ 0 di bingkai audio pertama
    expect(() => parseMp3(borrowed)).toThrow(/meminjam/u);
  });

  test("sambung: jeda sunyi di antara bagian, awal bagian = jumlah sampel sebelumnya", () => {
    const a = parseMp3(fakeAudio(2000));
    const b = parseMp3(fakeAudio(3000));
    const joined = joinMp3([
      { stream: a, gapAfterMs: 900 },
      { stream: b, gapAfterMs: 0 },
    ]);
    const gap = silentFrames(FORMAT, 900).length * 1152;
    expect(joined.starts).toEqual([0, a.samples + gap]);
    expect(joined.samples).toBe(a.samples + gap + b.samples);
    // Hasilnya tetap MP3 CBR yang bisa diurai ulang dengan durasi yang sama.
    const again = parseMp3(joined.audio);
    expect(again.samples).toBe(joined.samples);
    expect(() =>
      joinMp3([
        { stream: a, gapAfterMs: 0 },
        { stream: parseMp3(fakeAudio(100, { ...FORMAT, bitrate: 96 })), gapAfterMs: 0 },
      ]),
    ).toThrow(/format antarsegmen/u);
    expect(() => joinMp3([])).toThrow(Mp3Error);
  });

  test("MPEG-2 stereo juga diurai dan diberi jeda dengan format yang sama", () => {
    const f2: Mp3Format = {
      version: 2,
      sampleRate: 22050,
      channels: 2,
      bitrate: 32,
      samplesPerFrame: 576,
    };
    const s = parseMp3(fakeAudio(500, f2));
    expect(s.format).toEqual(f2);
    expect(joinMp3([{ stream: s, gapAfterMs: 200 }]).samples).toBeGreaterThan(s.samples);
    expect(() => silentFrames({ ...f2, bitrate: 33 }, 100)).toThrow(/format/u);
  });
});
