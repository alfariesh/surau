// File patch daftar isi (`data/patches/<kitab>-<id shamela>.yaml`, di-commit). Isinya hanya ID dan
// struktur, tanpa teks kitab: judul node baru TIDAK ditulis di patch, tetapi disalin dari teks
// halaman sumber (patch hanya memberi kata pembuka untuk menemukannya). Validasi ketat: kunci
// ganda, alias, tag tak dikenal, atau kunci asing membuat ingest gagal.
import { readFileSync } from "node:fs";

import { parseDocument } from "yaml";
import { z } from "zod";

const titleId = z.number().int().positive();
const patchId = z.string().regex(/^[a-z][a-z0-9-]*$/, "huruf kecil, angka, dan '-'");
/** Induk: `title.id` Shamela (angka) atau `id` node tambahan di patch yang sama (teks). */
const parentRef = z.union([titleId, patchId]);

export const tocPatch = z.strictObject({
  /** Kitab Shamela yang dipatch; dicek sama dengan sumber yang dibaca. */
  shamela_book: z.number().int().positive(),
  add: z
    .array(
      z.strictObject({
        /** Kunci stabil node baru (peta ID: `patch:<id>`). */
        id: patchId,
        parent: parentRef,
        /** `page.id` Shamela tempat judul berada. */
        page: z.number().int().positive(),
        /** Kata pembuka paragraf judul di halaman itu (dicocokkan setelah normalisasi). */
        heading: z.string().min(1).max(80),
      }),
    )
    .default([]),
  move: z
    .array(
      z.strictObject({
        titles: z.array(titleId).min(1),
        parent: parentRef,
      }),
    )
    .default([]),
});
export type TocPatch = z.infer<typeof tocPatch>;

/** Baca dan validasi file patch. Semua error dan peringatan YAML dianggap gagal. */
export function readTocPatch(path: string): TocPatch {
  const doc = parseDocument(readFileSync(path, "utf8"), {
    uniqueKeys: true,
    strict: true,
    stringKeys: true,
  });
  const problems = [...doc.errors, ...doc.warnings];
  if (problems.length > 0) {
    throw new Error(`${path}: ${problems.map((e) => e.message).join("\n")}`);
  }
  // Alias YAML (&a / *a) ditolak: patch harus bisa dibaca apa adanya.
  const parsed = tocPatch.safeParse(doc.toJS({ maxAliasCount: 0 }));
  if (!parsed.success) throw new Error(`${path}: ${z.prettifyError(parsed.error)}`);
  return parsed.data;
}
