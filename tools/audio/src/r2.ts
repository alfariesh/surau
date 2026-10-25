// Bucket R2 publik media (X17, ADR-097 butir 6): unggah lewat `wrangler r2 object put`, periksa lewat
// domain publik. Objek TIDAK PERNAH ditimpa atau dihapus: kunci memuat sidik isi berkas, dan sebelum
// mengunggah keberadaan objek dicek dulu (HEAD dengan query unik supaya tidak terbaca dari cache
// tepi). Objek yang sudah ada dengan ukuran berbeda = galat, bukan ditimpa.
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

import { ALIGNMENT_MIME, AUDIO_CACHE_CONTROL, AUDIO_MIME } from "@surau/core";
import type { AudioManifestTrack } from "@surau/core";

import { sha256Hex } from "./store.ts";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type Runner = (cmd: string, args: readonly string[], cwd: string) => Promise<CommandResult>;

export const nodeRunner: Runner = (cmd, args, cwd) =>
  new Promise((resolve) => {
    execFile(cmd, [...args], { cwd, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
      resolve({ code, stdout, stderr });
    });
  });

export interface MediaTarget {
  bucket: string;
  origin: string;
}

export interface RemoteHead {
  status: number;
  bytes: number | null;
  contentType: string | null;
  cacheControl: string | null;
}

/** HEAD objek publik; `fresh` = query unik supaya langsung ke R2, tidak dari cache tepi. */
export async function headObject(
  fetchFn: typeof fetch,
  origin: string,
  key: string,
  fresh: boolean,
): Promise<RemoteHead> {
  const url = `${origin}/${key}${fresh ? `?cek=${randomUUID()}` : ""}`;
  const res = await fetchFn(url, { method: "HEAD", signal: AbortSignal.timeout(30_000) });
  const length = res.headers.get("content-length");
  return {
    status: res.status,
    bytes: length === null ? null : Number(length),
    contentType: res.headers.get("content-type"),
    cacheControl: res.headers.get("cache-control"),
  };
}

export type UploadResult = "uploaded" | "exists" | "dry-run";

/**
 * Unggah satu berkas bila belum ada. `exists` bila objek dengan ukuran sama sudah ada (isinya
 * diperiksa `verify`); galat bila ukurannya beda, bila HEAD tidak jelas, atau wrangler gagal.
 */
export async function uploadObject(opts: {
  target: MediaTarget;
  key: string;
  file: string;
  bytes: number;
  repo: string;
  confirm: boolean;
  /** Bawaan audio/mpeg; timestamps (X18) application/json. */
  contentType?: string;
  fetchFn?: typeof fetch;
  run?: Runner;
}): Promise<UploadResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const run = opts.run ?? nodeRunner;
  const before = await headObject(fetchFn, opts.target.origin, opts.key, true);
  if (before.status === 200) {
    if (before.bytes !== opts.bytes) {
      throw new Error(
        `${opts.key} sudah ada di R2 dengan ukuran ${before.bytes} ≠ ${opts.bytes}; objek tidak pernah ditimpa`,
      );
    }
    return "exists";
  }
  if (before.status !== 404) {
    throw new Error(`HEAD ${opts.key} → ${before.status}; periksa domain media sebelum mengunggah`);
  }
  if (!opts.confirm) return "dry-run";
  const put = await run(
    "pnpm",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${opts.target.bucket}/${opts.key}`,
      "--file",
      opts.file,
      "--content-type",
      opts.contentType ?? AUDIO_MIME,
      "--cache-control",
      AUDIO_CACHE_CONTROL,
      "--remote",
    ],
    opts.repo,
  );
  if (put.code !== 0)
    throw new Error(`wrangler r2 object put gagal: ${put.stderr.trim().slice(-400)}`);
  const after = await headObject(fetchFn, opts.target.origin, opts.key, true);
  if (after.status !== 200 || after.bytes !== opts.bytes) {
    throw new Error(`${opts.key} belum terbaca sesudah diunggah (HEAD ${after.status})`);
  }
  return "uploaded";
}

export interface VerifyResult {
  key: string;
  ok: boolean;
  problems: string[];
}

/**
 * `pnpm audio verify` untuk satu track: HEAD jalur publik yang sama dengan pendengar (status, tipe,
 * ukuran, cache immutable), permintaan Range (pemutar bisa melompat), lalu sha256 isi = manifest.
 */
export async function verifyObject(
  fetchFn: typeof fetch,
  origin: string,
  track: Pick<AudioManifestTrack, "r2_key" | "bytes" | "sha256">,
): Promise<VerifyResult> {
  const problems: string[] = [];
  // Objek timestamps (X18): JSON kecil, tanpa uji Range; dibaca halaman lewat fetch lintas asal.
  const json = track.r2_key.endsWith(".align.json");
  const head = await headObject(fetchFn, origin, track.r2_key, false);
  if (head.status !== 200) {
    return { key: track.r2_key, ok: false, problems: [`HEAD ${head.status}`] };
  }
  const mime = json ? ALIGNMENT_MIME : AUDIO_MIME;
  if (!head.contentType?.startsWith(mime)) problems.push(`content-type ${head.contentType}`);
  if (head.bytes !== track.bytes) problems.push(`ukuran ${head.bytes} ≠ ${track.bytes}`);
  if (
    !head.cacheControl?.includes("immutable") ||
    !head.cacheControl.includes("max-age=31536000")
  ) {
    problems.push(`cache-control ${head.cacheControl}`);
  }
  const url = `${origin}/${track.r2_key}`;
  if (!json) {
    const range = await fetchFn(url, {
      headers: { range: "bytes=0-99" },
      signal: AbortSignal.timeout(30_000),
    });
    await range.arrayBuffer();
    if (range.status !== 206) problems.push(`Range → ${range.status} (bukan 206)`);
  }
  const full = await fetchFn(url, {
    // Origin situs: CORS bucket harus mengizinkan halaman Intisari membaca timestamps.
    ...(json ? { headers: { origin: "https://surau.org" } } : {}),
    signal: AbortSignal.timeout(120_000),
  });
  if (json && full.headers.get("access-control-allow-origin") === null)
    problems.push("CORS: access-control-allow-origin tidak ada");
  const body = new Uint8Array(await full.arrayBuffer());
  if (sha256Hex(body) !== track.sha256) problems.push("sha256 isi berbeda dengan manifest");
  return { key: track.r2_key, ok: problems.length === 0, problems };
}
