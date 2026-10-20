// Sidik teks paragraf yang di-commit (ADR-029 butir 3, ADR-059, #59): `passage.id` → 16 hex awal
// sha256(`text_raw`), di sebelah peta ID (`data/ids/<kitab>-<id shamela>.teks.json`). Tanpa teks
// kitab. Kunci paragraf di peta ID bersifat posisional (`<halaman>:b<baris>`), jadi peta ID saja
// tidak bisa mendeteksi paragraf yang bergeser: ID lama tetap ada tetapi menunjuk paragraf lain.
// Sidik ini menangkapnya. Berkas ada = korpus sudah pernah dibangun dan dirilis: `--reset-ids`
// ditolak, dan peta ID yang hilang adalah galat (bukan peta kosong). Sebaliknya, peta ID berisi
// paragraf tanpa sidik juga galat, supaya sidik yang terhapus tidak dibuat ulang diam-diam.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { z } from "zod";

import { assertWritable } from "./sqlite.ts";

export const fingerprintFile = z.strictObject({
  format: z.literal(1),
  /** `edition.id` pemilik sidik ini. */
  edition: z.number().int().positive(),
  /** Kunci: `passage.id`; nilai: 16 hex awal sha256(text_raw). */
  passage: z.record(z.string().regex(/^\d+$/), z.string().regex(/^[0-9a-f]{16}$/)),
});
export type FingerprintFile = z.infer<typeof fingerprintFile>;

/** `data/ids/ihya-9472.json` → `data/ids/ihya-9472.teks.json`. */
export function fingerprintPath(idsPath: string): string {
  if (!idsPath.endsWith(".json")) throw new Error(`Peta ID harus berakhiran .json: ${idsPath}`);
  return idsPath.replace(/\.json$/, ".teks.json");
}

export function readFingerprints(path: string, edition: number): FingerprintFile | null {
  if (!existsSync(path)) return null;
  const file = fingerprintFile.parse(JSON.parse(readFileSync(path, "utf8")));
  if (file.edition !== edition)
    throw new Error(`${path}: milik edisi ${file.edition}, bukan ${edition}`);
  return file;
}

const digest = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);

export function fingerprints(
  edition: number,
  passages: readonly { id: number; text_raw: string }[],
): FingerprintFile {
  return {
    format: 1,
    edition,
    passage: Object.fromEntries(passages.map((p) => [String(p.id), digest(p.text_raw)])),
  };
}

export interface FingerprintDiff {
  /** ID yang ada di sidik lama tetapi tidak ada lagi di build. */
  missing: number[];
  /** ID yang masih ada tetapi teksnya berbeda (paragraf bergeser, atau koreksi teks). */
  changed: number[];
}

export function compareFingerprints(old: FingerprintFile, next: FingerprintFile): FingerprintDiff {
  const missing: number[] = [];
  const changed: number[] = [];
  for (const [id, hash] of Object.entries(old.passage)) {
    const now = next.passage[id];
    if (now === undefined) missing.push(Number(id));
    else if (now !== hash) changed.push(Number(id));
  }
  const byNumber = (a: number, b: number) => a - b;
  return { missing: missing.sort(byNumber), changed: changed.sort(byNumber) };
}

export interface StabilityCheck {
  ok: boolean;
  /** Ringkasan satu baris untuk tabel invarian. */
  detail: string;
  /** Bagian laporan validasi berisi daftar LENGKAP ID hilang/berubah (kosong bila tidak ada). */
  report: string[];
}

/**
 * Bandingkan sidik rilis dengan build. ID hilang selalu gagal. ID berubah gagal kecuali tercantum
 * di `accepted` (koreksi teks yang disengaja, disebut satu per satu); ID di `accepted` yang tidak
 * berubah juga gagal, supaya daftar tidak basi.
 */
export function checkStability(
  released: FingerprintFile,
  next: FingerprintFile,
  accepted: readonly number[] = [],
): StabilityCheck {
  const { missing, changed } = compareFingerprints(released, next);
  const allowed = new Set(accepted);
  const rejected = changed.filter((id) => !allowed.has(id));
  const stale = [...allowed].filter((id) => !changed.includes(id)).sort((a, b) => a - b);
  const ok = missing.length === 0 && rejected.length === 0 && stale.length === 0;
  const total = Object.keys(released.passage).length;
  const parts = [
    missing.length > 0 ? `hilang ${missing.length}` : "",
    rejected.length > 0 ? `teks berubah ${rejected.length}` : "",
    changed.length > rejected.length ? `koreksi diterima ${changed.length - rejected.length}` : "",
    stale.length > 0 ? `diterima tetapi tidak berubah ${stale.length}` : "",
  ].filter((x) => x !== "");
  const list = (title: string, ids: number[]) =>
    ids.length === 0 ? [] : [`### ${title} (${ids.length})`, "", ids.join(", "), ""];
  const report =
    parts.length === 0
      ? []
      : [
          "## ID paragraf rilis (ADR-059)",
          "",
          'Paragraf bergeser juga tampil sebagai "teks berubah". Terima koreksi hanya per ID (`--terima-teks-berubah <id,…>`) setelah memeriksa setiap ID.',
          "",
          ...list("Hilang", missing),
          ...list("Teks berubah, belum diterima", rejected),
          ...list(
            "Koreksi diterima",
            changed.filter((id) => allowed.has(id)),
          ),
          ...list("Diterima tetapi tidak berubah", stale),
        ];
  return {
    ok,
    detail:
      parts.length === 0
        ? `${total} ID lama ada dengan teks sama`
        : `${parts.join("; ")} (daftar di bawah)`,
    report,
  };
}

/** Satu entri per baris, urut ID, supaya diff git hanya menunjukkan yang berubah. */
export function formatFingerprints(file: FingerprintFile): string {
  const lines = Object.entries(file.passage)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([id, hash]) => `    ${JSON.stringify(id)}: ${JSON.stringify(hash)}`);
  const passage = lines.length === 0 ? "{}" : `{\n${lines.join(",\n")}\n  }`;
  return `{\n  "format": 1,\n  "edition": ${file.edition},\n  "passage": ${passage}\n}\n`;
}

export function writeFingerprints(path: string, file: FingerprintFile): void {
  writeFileSync(assertWritable(path), formatFingerprints(file));
}
