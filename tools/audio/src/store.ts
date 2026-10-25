// Penyimpanan kerja audio (X17) di `data/build/audio/` (tidak masuk git):
//   segments/<kunci>.mp3 + .json   cache hasil TTS per sidik permintaan (teks sesudah leksikon, suara,
//                                  model, format): sintesis ulang tidak pernah ditagih dua kali
//   intents/<kunci>.json           tanda niat SEBELUM permintaan berbayar (pola ADR-061); dilepas
//                                  sesudah hasil tersimpan atau galat yang pasti belum tertagih
//   receipts.jsonl                 tanda terima setiap sintesis (biaya aktual = jumlah character_cost)
//   out/<node>.json + <node>-<sha12>.mp3   berkas rakitan siap unggah + metadata track manifest
//   out/<node>-<sha12>.align.json  timestamps per kalimat untuk sorotan teks (X18), bila ada
//   align-receipts.jsonl           tanda terima forced alignment (ditagih per durasi audio)
// Semua tulisan JSON atomik (berkas sementara lalu rename).
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { audioManifestTrack } from "@surau/core";
import { z } from "zod";

export interface AudioStore {
  root: string;
}

export const audioStore = (repo: string): AudioStore => ({ root: join(repo, "data/build/audio") });

export function writeAtomic(path: string, data: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

const sha256Hex = (data: string | Uint8Array): string =>
  createHash("sha256").update(data).digest("hex");
export { sha256Hex };

export interface SegmentRequest {
  provider: string;
  model: string;
  outputFormat: string;
  voiceId: string;
  languageCode: string;
  /** Teks persis yang dikirim (sesudah leksikon). */
  text: string;
}

/** Sidik permintaan TTS: semua yang menentukan bunyi (id stitching tidak, karena hanya intonasi). */
export const segmentKey = (r: SegmentRequest): string =>
  sha256Hex(
    JSON.stringify([r.provider, r.model, r.outputFormat, r.voiceId, r.languageCode, r.text]),
  );

export const segmentMeta = z.strictObject({
  key: z.string().regex(/^[0-9a-f]{64}$/u),
  provider: z.string(),
  model: z.string(),
  output_format: z.string(),
  voice_id: z.string(),
  language_code: z.string(),
  chars: z.number().int().nonnegative(),
  request_id: z.string().nullable(),
  character_cost: z.number().int().nonnegative().nullable(),
  /** Waktu per karakter teks yang dikirim (`--timestamps`, X18); null bila tidak diminta/tidak ada. */
  alignment: z
    .strictObject({
      characters: z.array(z.string()),
      character_start_times_seconds: z.array(z.number()),
      character_end_times_seconds: z.array(z.number()),
    })
    .nullable()
    .default(null),
  created_at: z.iso.datetime(),
});
export type SegmentMeta = z.infer<typeof segmentMeta>;

const segPath = (s: AudioStore, key: string, ext: "mp3" | "json") =>
  join(s.root, "segments", `${key}.${ext}`);

export function readSegment(
  s: AudioStore,
  key: string,
): { meta: SegmentMeta; audio: Uint8Array } | null {
  const json = segPath(s, key, "json");
  const mp3 = segPath(s, key, "mp3");
  if (!existsSync(json) || !existsSync(mp3)) return null;
  return {
    meta: segmentMeta.parse(JSON.parse(readFileSync(json, "utf8"))),
    audio: new Uint8Array(readFileSync(mp3)),
  };
}

/** Simpan hasil TTS: audio dulu, lalu metadata (metadata = penanda segmen lengkap). */
export function writeSegment(s: AudioStore, meta: SegmentMeta, audio: Uint8Array): void {
  writeAtomic(segPath(s, meta.key, "mp3"), audio);
  writeAtomic(
    segPath(s, meta.key, "json"),
    `${JSON.stringify(segmentMeta.parse(meta), null, 2)}\n`,
  );
}

export const intent = z.strictObject({
  key: z.string(),
  /** 0 = sampel uji dengar (bukan Intisari). */
  node_id: z.number().int().nonnegative(),
  segment: z.number().int().nonnegative(),
  chars: z.number().int().positive(),
  pid: z.number().int().positive(),
  started_at: z.iso.datetime(),
});
export type Intent = z.infer<typeof intent>;

const intentPath = (s: AudioStore, key: string) => join(s.root, "intents", `${key}.json`);

export function writeIntent(s: AudioStore, i: Intent): void {
  writeAtomic(intentPath(s, i.key), `${JSON.stringify(intent.parse(i), null, 2)}\n`);
}

export function removeIntent(s: AudioStore, key: string): void {
  rmSync(intentPath(s, key), { force: true });
}

export function listIntents(s: AudioStore): Intent[] {
  const dir = join(s.root, "intents");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => intent.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
}

/** Proses pengirim masih hidup (sinyal 0 tidak mengirim apa pun, hanya memeriksa). */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export const receipt = z.strictObject({
  key: z.string(),
  /** 0 = sampel uji dengar (bukan Intisari). */
  node_id: z.number().int().nonnegative(),
  provider: z.string(),
  model: z.string(),
  voice_id: z.string(),
  chars: z.number().int().nonnegative(),
  character_cost: z.number().int().nonnegative().nullable(),
  request_id: z.string().nullable(),
  at: z.iso.datetime(),
});
export type Receipt = z.infer<typeof receipt>;

export function appendReceipt(s: AudioStore, r: Receipt): void {
  mkdirSync(s.root, { recursive: true });
  appendFileSync(join(s.root, "receipts.jsonl"), `${JSON.stringify(receipt.parse(r))}\n`);
}

export function readReceipts(s: AudioStore): Receipt[] {
  const path = join(s.root, "receipts.jsonl");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => receipt.parse(JSON.parse(l)));
}

/** Karakter tertagih menurut tanda terima (header penyedia; panjang teks bila header tidak ada). */
export const billedChars = (receipts: readonly Receipt[]): number =>
  receipts.reduce((n, r) => n + (r.character_cost ?? r.chars), 0);

export const renderedTrack = z.strictObject({
  track: audioManifestTrack,
  /** Judul Indonesia bagian (untuk laporan dan ID3). */
  title: z.string(),
  /** Kunci segmen yang membentuk berkas, urut (rakit ulang dilewati bila sama). */
  segment_keys: z.array(z.string()),
  file: z.string(),
  /** Berkas timestamps (`out/…align.json`) bila `track.alignment` ada (X18). */
  alignment_file: z.string().nullable().default(null),
});
export type RenderedTrack = z.infer<typeof renderedTrack>;

const outMeta = (s: AudioStore, nodeId: number) => join(s.root, "out", `${nodeId}.json`);

export function readRendered(s: AudioStore, nodeId: number): RenderedTrack | null {
  const path = outMeta(s, nodeId);
  return existsSync(path) ? renderedTrack.parse(JSON.parse(readFileSync(path, "utf8"))) : null;
}

export function listRendered(s: AudioStore): RenderedTrack[] {
  const dir = join(s.root, "out");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d+\.json$/u.test(f))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
    .map((f) => renderedTrack.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
}

export function writeRendered(
  s: AudioStore,
  r: RenderedTrack,
  audio: Uint8Array,
  alignment: string | null = null,
): void {
  writeAtomic(join(s.root, r.file), audio);
  if (alignment !== null && r.alignment_file !== null)
    writeAtomic(join(s.root, r.alignment_file), alignment);
  writeRenderedMeta(s, r);
}

/** Metadata berkas rakitan saja (mis. sesudah timestamps ditambahkan; MP3 tidak disentuh). */
export function writeRenderedMeta(s: AudioStore, r: RenderedTrack): void {
  writeAtomic(
    outMeta(s, r.track.toc_node_id),
    `${JSON.stringify(renderedTrack.parse(r), null, 2)}\n`,
  );
}

export const alignReceipt = z.strictObject({
  node_id: z.number().int().nonnegative(),
  /** sha256 MP3 yang diselaraskan. */
  audio_sha256: z.string(),
  audio_ms: z.number().int().nonnegative(),
  chars: z.number().int().nonnegative(),
  aligner: z.string(),
  at: z.iso.datetime(),
});
export type AlignReceipt = z.infer<typeof alignReceipt>;

export function appendAlignReceipt(s: AudioStore, r: AlignReceipt): void {
  mkdirSync(s.root, { recursive: true });
  appendFileSync(
    join(s.root, "align-receipts.jsonl"),
    `${JSON.stringify(alignReceipt.parse(r))}\n`,
  );
}

export function readAlignReceipts(s: AudioStore): AlignReceipt[] {
  const path = join(s.root, "align-receipts.jsonl");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => alignReceipt.parse(JSON.parse(l)));
}
