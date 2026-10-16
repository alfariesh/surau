// Satu-satunya pintu akses SQLite di pipeline ingest (`node:sqlite`, Node 24).
// Sumber (Shamela) SELALU dibuka hanya-baca; DB keluaran hanya boleh ditulis di luar /Volumes,
// supaya drive Shamela milik pemilik tidak pernah tersentuh (CLAUDE.md aturan keras 7).
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Akar drive data pemilik. Apa pun di bawahnya hanya boleh dibaca. */
export const PROTECTED_ROOT = "/Volumes/";

/** Buka DB sumber hanya-baca. Gagal bila file tidak ada (tidak pernah membuat file baru). */
export function openReadOnly(path: string): DatabaseSync {
  return new DatabaseSync(path, { readOnly: true });
}

/** Buka (atau buat) DB keluaran yang boleh ditulis. Menolak path di bawah `/Volumes/`. */
export function openWritable(path: string): DatabaseSync {
  const abs = resolve(path);
  if (abs.startsWith(PROTECTED_ROOT)) {
    throw new Error(`Menolak menulis ke ${abs}: drive sumber hanya boleh dibaca`);
  }
  return new DatabaseSync(abs);
}
