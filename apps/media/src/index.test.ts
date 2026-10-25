import { AUDIO_CACHE_CONTROL, AUDIO_MIME, audioObjectKey } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { MEDIA_CACHE_CONTROL, MEDIA_KEY, MEDIA_MIME, serveMedia } from "./index.ts";

const KEY = audioObjectKey("ihya", "id", 100003, "c82272e9b08d".padEnd(64, "0"));
const BYTES = new Uint8Array([0xff, 0xfb, 0x90, 0x64]);

// Bucket tiruan: hanya head/get yang dipakai Worker.
const bucket = {
  head: async (key: string) => (key === KEY ? { size: BYTES.length, httpEtag: '"e1"' } : null),
  get: async (key: string) =>
    key === KEY ? { size: BYTES.length, httpEtag: '"e1"', body: new Blob([BYTES]).stream() } : null,
} as unknown as R2Bucket;

const req = (path: string, method = "GET") =>
  new Request(`https://media.surau.org${path}`, { method });

describe("serveMedia (X17, ADR-103)", () => {
  test("pola kunci dan header sama dengan @surau/core", () => {
    expect(MEDIA_KEY.test(KEY)).toBe(true);
    expect(MEDIA_MIME).toBe(AUDIO_MIME);
    expect(MEDIA_CACHE_CONTROL).toBe(AUDIO_CACHE_CONTROL);
  });

  test("GET: isi berkas, tipe audio, cache immutable", async () => {
    const res = await serveMedia(req(`/${KEY}`), bucket);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("cache-control")).toBe(AUDIO_CACHE_CONTROL);
    expect(res.headers.get("etag")).toBe('"e1"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
  });

  test("HEAD: ukuran tanpa isi; query (pengecekan alat audio) diabaikan", async () => {
    const res = await serveMedia(req(`/${KEY}?cek=1`, "HEAD"), bucket);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe(String(BYTES.length));
    expect(await res.text()).toBe("");
  });

  test("kunci lain atau objek tidak ada: 404 tanpa cache", async () => {
    for (const path of [
      "/",
      "/favicon.ico",
      "/ihya/id/../x.mp3",
      `/${KEY.replace("100003", "1")}`,
    ]) {
      const res = await serveMedia(req(path), bucket);
      expect(res.status, path).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  test("R2 galat: 503 tanpa cache", async () => {
    const broken = {
      get: () => Promise.reject(new Error("r2")),
      head: () => Promise.reject(new Error("r2")),
    } as unknown as R2Bucket;
    const res = await serveMedia(req(`/${KEY}`), broken);
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("metode selain GET/HEAD: 405", async () => {
    const res = await serveMedia(req(`/${KEY}`, "PUT"), bucket);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });
});
