import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { audioObjectKey, audioManifestTrack } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { mergeTracks, readManifest, writeManifest } from "./manifest-file.ts";
import { uploadObject, verifyObject } from "./r2.ts";
import type { Runner } from "./r2.ts";
import { sha256Hex } from "./store.ts";
import { WORKS } from "./works.ts";

const BODY = Uint8Array.of(0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0xff, 0xfb);
const SHA = sha256Hex(BODY);
const KEY = audioObjectKey("ihya", "id", 100074, SHA);
const TARGET = { bucket: "surau-media", origin: "https://media.surau.org" };

/** fetch tiruan berdasarkan metode/Range; status HEAD bisa diubah per panggilan. */
function media(heads: number[], body = BODY, headers: Record<string, string> = {}) {
  const calls: { url: string; method: string; range: string | null }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const range = new Headers(init?.headers).get("range");
    calls.push({ url: input instanceof Request ? input.url : input.toString(), method, range });
    const base = {
      "content-type": "audio/mpeg",
      "cache-control": "public, max-age=31536000, immutable",
      ...headers,
    };
    if (method === "HEAD") {
      const status = heads.shift() ?? 200;
      return new Response(null, {
        status,
        headers: status === 200 ? { ...base, "content-length": String(body.length) } : {},
      });
    }
    if (range !== null) return new Response(body.slice(0, 2), { status: 206, headers: base });
    return new Response(body, { status: 200, headers: base });
  }) as typeof fetch;
  return { fn, calls };
}

const runner = () => {
  const runs: string[][] = [];
  const run: Runner = async (cmd, args) => {
    runs.push([cmd, ...args]);
    return { code: 0, stdout: "", stderr: "" };
  };
  return { run, runs };
};

const upload = (heads: number[], confirm: boolean, bytes = BODY.length) => {
  const m = media(heads);
  const r = runner();
  return {
    m,
    r,
    go: () =>
      uploadObject({
        target: TARGET,
        key: KEY,
        file: "/tmp/x.mp3",
        bytes,
        repo: "/repo",
        confirm,
        fetchFn: m.fn,
        run: r.run,
      }),
  };
};

describe("R2 media (tidak pernah menimpa)", () => {
  test("belum ada + --confirm: put dengan tipe audio dan cache immutable, lalu dicek ulang", async () => {
    const u = upload([404, 200], true);
    expect(await u.go()).toBe("uploaded");
    expect(u.r.runs[0]).toEqual([
      "pnpm",
      "wrangler",
      "r2",
      "object",
      "put",
      `surau-media/${KEY}`,
      "--file",
      "/tmp/x.mp3",
      "--content-type",
      "audio/mpeg",
      "--cache-control",
      "public, max-age=31536000, immutable",
      "--remote",
    ]);
    // HEAD sebelum/sesudah memakai query unik (tidak dari cache tepi).
    expect(u.m.calls.every((c) => /\?cek=/u.test(c.url))).toBe(true);
  });

  test("sudah ada ukuran sama → tidak diunggah; ukuran beda → galat; tanpa --confirm → periksa saja", async () => {
    const same = upload([200], true);
    expect(await same.go()).toBe("exists");
    expect(same.r.runs).toEqual([]);
    const differ = upload([200], true, BODY.length + 1);
    await expect(differ.go()).rejects.toThrow(/tidak pernah ditimpa/u);
    const dry = upload([404], false);
    expect(await dry.go()).toBe("dry-run");
    expect(dry.r.runs).toEqual([]);
    const odd = upload([403], true);
    await expect(odd.go()).rejects.toThrow(/HEAD/u);
  });

  test("verify: HEAD + Range 206 + sha256 isi; masalah dilaporkan satu per satu", async () => {
    const track = { r2_key: KEY, bytes: BODY.length, sha256: SHA };
    expect(await verifyObject(media([200]).fn, TARGET.origin, track)).toEqual({
      key: KEY,
      ok: true,
      problems: [],
    });
    const bad = await verifyObject(
      media([200], BODY, {
        "content-type": "application/octet-stream",
        "cache-control": "max-age=60",
      }).fn,
      TARGET.origin,
      { ...track, sha256: "0".repeat(64) },
    );
    expect(bad.ok).toBe(false);
    expect(bad.problems).toEqual([
      "content-type application/octet-stream",
      "cache-control max-age=60",
      "sha256 isi berbeda dengan manifest",
    ]);
    expect(await verifyObject(media([404]).fn, TARGET.origin, track)).toMatchObject({
      ok: false,
      problems: ["HEAD 404"],
    });
  });
});

describe("objek timestamps (X18)", () => {
  const JSON_BODY = new TextEncoder().encode('{"format":1}');
  const track = {
    r2_key: "ihya/id/100074-0123456789ab.align.json",
    bytes: JSON_BODY.length,
    sha256: sha256Hex(JSON_BODY),
  };
  const json = { "content-type": "application/json" };

  test("verify: JSON tanpa uji Range, CORS wajib untuk halaman", async () => {
    const ok = media([200], JSON_BODY, { ...json, "access-control-allow-origin": "*" });
    expect(await verifyObject(ok.fn, TARGET.origin, track)).toMatchObject({ ok: true });
    expect(ok.calls.some((c) => c.range !== null)).toBe(false);
    const noCors = await verifyObject(media([200], JSON_BODY, json).fn, TARGET.origin, track);
    expect(noCors.problems).toEqual(["CORS: access-control-allow-origin tidak ada"]);
  });

  test("unggah dengan tipe application/json", async () => {
    const r = runner();
    await uploadObject({
      target: TARGET,
      key: track.r2_key,
      file: "/tmp/x.align.json",
      bytes: track.bytes,
      repo: "/repo",
      confirm: true,
      contentType: "application/json",
      fetchFn: media([404, 200], JSON_BODY, json).fn,
      run: r.run,
    });
    expect(r.runs[0]).toContain("application/json");
  });
});

describe("berkas manifest", () => {
  test("tidak ada → manifest kosong; track baru ditambah, yang lama tidak diubah; urut node", () => {
    const repo = mkdtempSync(join(tmpdir(), "surau-manifest-"));
    try {
      const work = WORKS.ihya!;
      const empty = readManifest(repo, work);
      expect(empty).toMatchObject({
        work: "ihya",
        edition_id: 1,
        bucket: "surau-media",
        tracks: [],
      });
      const track = (node: number, sha: string) =>
        audioManifestTrack.parse({
          toc_node_id: node,
          lang: "id",
          voice_kind: "ai",
          r2_key: audioObjectKey("ihya", "id", node, sha),
          sha256: sha,
          bytes: 10,
          duration_ms: 5000,
          provider: "elevenlabs",
          voice_id: "v",
          voice_name: "N",
          model: "eleven_v4",
          output_format: "mp3_44100_64",
          script_sha256: "e".repeat(64),
          script_version: 1,
          spoken_version: 1,
          lexicon_version: "0123456789ab",
          chapters: [{ point_ord: 1, start_ms: 1000 }],
          characters: 100,
          created_at: "2026-10-25T01:00:00.000Z",
        });
      const a = track(100075, "a".repeat(64));
      const b = track(100074, "b".repeat(64));
      const first = mergeTracks(empty, [a, b]);
      expect(first.added).toHaveLength(2);
      writeManifest(repo, work, first.manifest);
      const again = mergeTracks(readManifest(repo, work), [a]);
      expect(again.added).toEqual([]);
      // Timestamps (X18) ditambahkan ke track yang sudah tercatat; objek audionya tetap.
      const alignment = {
        r2_key: "ihya/id/100075-cccccccccccc.align.json",
        sha256: "c".repeat(64),
        bytes: 99,
        method: "forced_alignment" as const,
      };
      const aligned = mergeTracks(readManifest(repo, work), [{ ...a, alignment }]);
      expect(aligned).toMatchObject({ added: [], aligned: [a.r2_key] });
      expect(aligned.manifest.tracks.find((t) => t.r2_key === a.r2_key)?.alignment).toEqual(
        alignment,
      );
      expect(mergeTracks(aligned.manifest, [a]).aligned).toEqual([]);
      expect(readManifest(repo, work).tracks.map((t) => t.toc_node_id)).toEqual([100074, 100075]);
      expect(() => readManifest(repo, { ...work, editionId: 2 })).toThrow(/milik/u);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
