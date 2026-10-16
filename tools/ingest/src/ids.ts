// Peta ID yang di-commit (ADR-029 butir 3): kunci stabil → seq, tanpa teks kitab, di
// `data/ids/<kitab>-<id shamela>.json`. Alokasi ID MEMBACA peta ini: kunci yang sudah ada selalu
// mendapat seq yang sama, kunci baru mendapat seq setelah yang terbesar, dan seq tidak pernah dipakai
// ulang. Kunci yang tidak muncul lagi tetap disimpan (pemeriksaan "ID lama masih ada atau dialihkan"
// dikerjakan di S10). Sebelum rilis Fase 1 peta boleh dibuang dan dibangun ulang (`--reset-ids`).
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { z } from "zod";

import { assertWritable } from "./sqlite.ts";

const seqMap = z.record(z.string().min(1), z.number().int().positive());

export const idMapFile = z.strictObject({
  format: z.literal(1),
  /** `edition.id` pemilik peta ini. */
  edition: z.number().int().positive(),
  /** Kunci: `page.id` Shamela. */
  page: seqMap,
  /** Kunci: `t<title.id>` atau `patch:<id>`. */
  toc: seqMap,
  /** Kunci: `<page.id Shamela>:<kunci paragraf di halaman>` (lihat PassageDraft.key). */
  passage: seqMap,
});
export type IdMapFile = z.infer<typeof idMapFile>;
export type IdKind = "page" | "toc" | "passage";

export interface IdAllocator {
  /** seq untuk kunci ini (dialokasikan bila baru). */
  seq(kind: IdKind, key: string): number;
  /** Jumlah kunci baru per jenis sejak peta dibaca. */
  added: Record<IdKind, number>;
  /** Peta setelah alokasi (untuk ditulis kembali). */
  snapshot(): IdMapFile;
}

export function readIdMap(path: string, edition: number): IdMapFile {
  if (!existsSync(path)) return { format: 1, edition, page: {}, toc: {}, passage: {} };
  const map = idMapFile.parse(JSON.parse(readFileSync(path, "utf8")));
  if (map.edition !== edition)
    throw new Error(`${path}: milik edisi ${map.edition}, bukan ${edition}`);
  for (const kind of ["page", "toc", "passage"] as const) {
    const seen = new Set<number>();
    for (const [key, seq] of Object.entries(map[kind])) {
      if (seen.has(seq)) throw new Error(`${path}: seq ${kind} ${seq} dipakai dua kali (${key})`);
      seen.add(seq);
    }
  }
  return map;
}

export function createAllocator(map: IdMapFile): IdAllocator {
  const maps = {
    page: new Map(Object.entries(map.page)),
    toc: new Map(Object.entries(map.toc)),
    passage: new Map(Object.entries(map.passage)),
  };
  const largest = (m: Map<string, number>): number => {
    let top = 0;
    for (const v of m.values()) if (v > top) top = v;
    return top;
  };
  const max = {
    page: largest(maps.page),
    toc: largest(maps.toc),
    passage: largest(maps.passage),
  };
  const added = { page: 0, toc: 0, passage: 0 };
  return {
    seq(kind, key) {
      const found = maps[kind].get(key);
      if (found !== undefined) return found;
      const seq = ++max[kind];
      maps[kind].set(key, seq);
      added[kind]++;
      return seq;
    },
    added,
    snapshot: () => ({
      format: 1,
      edition: map.edition,
      page: Object.fromEntries(maps.page),
      toc: Object.fromEntries(maps.toc),
      passage: Object.fromEntries(maps.passage),
    }),
  };
}

/**
 * JSON satu entri per baris, terurut menurut seq, supaya diff git hanya menunjukkan entri yang
 * ditambahkan. Keluarannya deterministik untuk peta yang sama.
 */
export function formatIdMap(map: IdMapFile): string {
  const section = (name: IdKind): string => {
    const lines = Object.entries(map[name])
      .sort((a, b) => a[1] - b[1])
      .map(([key, seq]) => `    ${JSON.stringify(key)}: ${seq}`);
    return lines.length === 0 ? `  "${name}": {}` : `  "${name}": {\n${lines.join(",\n")}\n  }`;
  };
  return `{\n  "format": 1,\n  "edition": ${map.edition},\n${section("page")},\n${section("toc")},\n${section("passage")}\n}\n`;
}

export function writeIdMap(path: string, map: IdMapFile): void {
  writeFileSync(assertWritable(path), formatIdMap(map));
}
