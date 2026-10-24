import { notFound } from "next/navigation";

import { devPagesEnabled, getEnv } from "../../../../../lib/cloudflare";

// Audio sunyi BUATAN untuk halaman uji /dev/dengar dan e2e pemutar (X17): MPEG-2 Layer III 8 kbps
// 16 kHz mono, setiap bingkai 36 byte tanpa data audio (36 ms sunyi). Dibangkitkan di tempat, jadi
// tidak ada berkas biner di repo; mendukung Range supaya pemutar bisa melompat seperti dari R2.
// `?d=<detik>` (1–300). Hanya di `next dev` dan Preview (`DEV_PAGES`), seperti /dev/*.
export const dynamic = "force-dynamic";

const FRAME_BYTES = 36;
const FRAME_SECONDS = 576 / 16_000;
/** Header bingkai: sync, MPEG-2, Layer III tanpa CRC; 8 kbps, 16 kHz; mono. */
const HEADER = [0xff, 0xf3, 0x18, 0xc0];

export async function GET(request: Request): Promise<Response> {
  if (!devPagesEnabled(await getEnv())) notFound();
  const asked = Number(new URL(request.url).searchParams.get("d") ?? "90");
  const seconds = Number.isFinite(asked) ? Math.min(300, Math.max(1, Math.floor(asked))) : 90;
  const frames = Math.round(seconds / FRAME_SECONDS);
  const body = new Uint8Array(frames * FRAME_BYTES);
  for (let i = 0; i < frames; i++) body.set(HEADER, i * FRAME_BYTES);
  const headers = {
    "content-type": "audio/mpeg",
    "accept-ranges": "bytes",
    "cache-control": "no-store",
    "x-robots-tag": "noindex",
  };
  const range = /^bytes=(\d+)-(\d*)$/u.exec(request.headers.get("range") ?? "");
  if (range === null) {
    return new Response(body, { headers: { ...headers, "content-length": String(body.length) } });
  }
  const start = Number(range[1]);
  const end = range[2] === "" ? body.length - 1 : Math.min(Number(range[2]), body.length - 1);
  if (start > end) {
    return new Response(null, {
      status: 416,
      headers: { "content-range": `bytes */${body.length}` },
    });
  }
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "content-length": String(end - start + 1),
      "content-range": `bytes ${start}-${end}/${body.length}`,
    },
  });
}
