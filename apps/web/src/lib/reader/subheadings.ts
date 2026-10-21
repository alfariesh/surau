import { z } from "zod";

import raw from "../../../../../data/patches/ihya-9472-subjudul.json";

// Lapisan subjudul pembaca (X04 W4): daftar kurasi di `data/patches/ihya-9472-subjudul.json`,
// dibangun `pnpm subjudul` dari korpus + keputusan kurasi yang ditinjau per paragraf (tanpa teks
// Arab, hanya nomor jangkar #pN, offset, dan sidik). Dipakai server saat menyusun model halaman;
// setiap entri hanya berlaku bila sidik sha256 `text_raw` (dan terjemahannya, untuk bagian yang
// ditebalkan) masih sama, jadi korpus baru tidak pernah dipotong di offset yang sudah usang.

const sha = z.string().regex(/^[0-9a-f]{16}$/);
const mark = z.strictObject({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  sha,
});

const entry = z.union([
  z.strictObject({
    kind: z.literal("heading"),
    src: z.enum(["bayan", "kurasi"]),
    sha,
    of: z.number().int().positive().optional(),
  }),
  z.strictObject({
    kind: z.literal("lead"),
    end: z.number().int().positive(),
    sha,
    tr: mark.optional(),
  }),
  z.strictObject({
    kind: z.literal("tail"),
    start: z.number().int().positive(),
    sha,
    tr: mark.optional(),
    /** Subjudul akhir ini judul node daftar isi (butir daftar sebelumnya = `plain`, X04 bagian B). */
    node: z.number().int().positive().optional(),
  }),
  /** Teksnya sama dengan judul node, tetapi butir daftar pembuka: dirender sebagai teks biasa. */
  z.strictObject({ kind: z.literal("plain"), sha }),
]);
export type SubheadingEntry = z.infer<typeof entry>;

export const subheadingFile = z.strictObject({
  format: z.literal(1),
  edition: z.number().int().positive(),
  corpus: z.string(),
  entries: z.record(z.string().regex(/^\d+$/), entry),
});

const file = subheadingFile.parse(raw);
const entries = new Map(Object.entries(file.entries).map(([k, v]) => [Number(k), v]));

/** FNV-1a 32 bit (hex): sidik ringan isi daftar kurasi untuk kunci cache /api/halaman. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Sidik daftar kurasi yang sedang dipakai (berubah bila berkas JSON berubah). */
export const SUBHEADING_DIGEST = fnv1a(JSON.stringify(file));

/** Semua entri daftar kurasi edisi ini (kunci = nomor jangkar `#pN`); kosong untuk edisi lain. */
export function subheadingEntries(editionId: number): ReadonlyMap<number, SubheadingEntry> {
  return editionId === file.edition ? entries : new Map();
}

/** Entri subjudul paragraf `#p<seq>` edisi ini, atau `undefined`. */
export function subheadingOf(editionId: number, seq: number): SubheadingEntry | undefined {
  return editionId === file.edition ? entries.get(seq) : undefined;
}

/** SHA-256 (UTF-8) heksadesimal penuh, sama dengan `source_sha256` judul subjudul (ingest). */
export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 16 hex awal SHA-256 (UTF-8), sama dengan `data/ids/*.teks.json` dan `pnpm subjudul`. */
export async function sha16(text: string): Promise<string> {
  return (await sha256(text)).slice(0, 16);
}
