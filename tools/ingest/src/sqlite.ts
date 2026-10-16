// Satu-satunya pintu akses SQLite di pipeline ingest (`node:sqlite`, Node 24).
// Sumber (Shamela) SELALU dibuka hanya-baca; DB keluaran hanya boleh ditulis di luar /Volumes,
// supaya drive Shamela milik pemilik tidak pernah tersentuh (CLAUDE.md aturan keras 7).
import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Akar drive data pemilik (huruf kecil; APFS tidak membedakan besar-kecil). Hanya boleh dibaca. */
export const PROTECTED_ROOT = "/volumes/";

/** Buka DB sumber hanya-baca. Gagal bila file tidak ada (tidak pernah membuat file baru). */
export function openReadOnly(path: string): DatabaseSync {
  return new DatabaseSync(path, { readOnly: true });
}

/**
 * Lempar error bila `path` (setelah symlink diurai) ada di bawah `/Volumes/`. Dipanggil sebelum
 * SETIAP hapus/tulis berkas keluaran, supaya drive sumber tidak pernah tersentuh.
 */
export function assertWritable(path: string): string {
  let abs = resolve(path);
  // Urai symlink pada leluhur terdekat yang sudah ada (berkasnya sendiri mungkin belum ada).
  let probe = abs;
  const rest: string[] = [];
  while (!existsSync(probe) && dirname(probe) !== probe) {
    rest.unshift(basename(probe));
    probe = dirname(probe);
  }
  if (existsSync(probe)) abs = join(realpathSync(probe), ...rest);
  if (`${abs.toLowerCase()}/`.startsWith(PROTECTED_ROOT)) {
    throw new Error(`Menolak menulis ke ${abs}: drive sumber hanya boleh dibaca`);
  }
  return abs;
}

/** Buka (atau buat) DB keluaran yang boleh ditulis. Menolak path di bawah `/Volumes/`. */
export function openWritable(path: string): DatabaseSync {
  return new DatabaseSync(assertWritable(path));
}
